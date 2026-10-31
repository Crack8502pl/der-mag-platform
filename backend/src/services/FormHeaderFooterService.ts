import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { DataSource, EntityManager } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FormHeaderFooter, FormBrandingKind, FormBrandingMode } from '../entities/FormHeaderFooter';
import { FormJsonObject } from '../entities/FormTypes';
import { FormTemplateVersion } from '../entities/FormTemplateVersion';
import { FormDomainError } from '../errors/FormDomainError';
import { FORM_DATA_SOURCES } from '../modules/variable-engine/formDataSources';
import { FormAuditService } from './FormAuditService';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 40_000_000;
const allowedMime = new Set(['image/png', 'image/jpeg', 'application/pdf']);
const imageMime = new Set(['image/png', 'image/jpeg']);
const sourceExpressions = new Set(FORM_DATA_SOURCES.map(source => source.expression));

export interface FormBrandingElement {
  type: 'text' | 'logo' | 'variable' | 'pageNumber' | 'printDate';
  text?: string;
  assetPath?: string;
  alt?: string;
  source?: string;
}

export interface FormBrandingLayout {
  columns: {
    left: FormBrandingElement[];
    center: FormBrandingElement[];
    right: FormBrandingElement[];
  };
  separator: boolean;
}

export interface FormBrandingSnapshot {
  id: number;
  name: string;
  kind: FormBrandingKind;
  mode: FormBrandingMode;
  heightMm: number;
  filePath: string | null;
  fileMime: string | null;
  layout: FormJsonObject | null;
}

export interface FormBrandingInput {
  name: string;
  kind: FormBrandingKind;
  mode: FormBrandingMode;
  heightMm: number;
  isDefault: boolean;
  layout?: FormJsonObject;
}

export class FormHeaderFooterService {
  constructor(private readonly dataSource: DataSource = AppDataSource) {}

  async list(): Promise<FormHeaderFooter[]> {
    return this.dataSource.getRepository(FormHeaderFooter).find({
      order: { kind: 'ASC', isDefault: 'DESC', name: 'ASC', id: 'ASC' },
    });
  }

  async create(input: FormBrandingInput, actorId: number, file?: Express.Multer.File): Promise<FormHeaderFooter> {
    this.validateInput(input, file, true);
    if (input.mode === 'CUSTOM') await this.validateLayoutAssets(input.layout!);
    const detected = file ? await this.validateFile(file) : undefined;
    const savedPath = detected ? await this.storeFile(file!.buffer, detected.mime, 'library') : null;
    try {
      return await this.dataSource.transaction(async manager => {
        if (input.isDefault) await this.clearDefault(manager, input.kind);
        const repository = manager.getRepository(FormHeaderFooter);
        const item = await repository.save(repository.create({
          name: input.name.trim(),
          kind: input.kind,
          mode: input.mode,
          isDefault: input.isDefault,
          heightMm: input.heightMm,
          filePath: savedPath,
          fileMime: detected?.mime ?? null,
          layout: input.mode === 'CUSTOM' ? input.layout! : null,
          createdById: actorId,
        }));
        await FormAuditService.record(manager, 'FORM_BRANDING_CREATED', actorId, 'form_template', item.id, [
          { field: 'name', previousValue: null, newValue: item.name },
          { field: 'kind', previousValue: null, newValue: item.kind },
        ]);
        return item;
      });
    } catch (error) {
      if (savedPath) await this.removeFile(savedPath);
      throw error;
    }
  }

  async update(
    id: number,
    input: FormBrandingInput,
    actorId: number,
    file?: Express.Multer.File,
  ): Promise<FormHeaderFooter> {
    const existing = await this.dataSource.getRepository(FormHeaderFooter).findOne({ where: { id } });
    if (!existing) throw new FormDomainError('VERSION_NOT_FOUND', 'Nagłówek lub stopka nie istnieje.');
    if (existing.kind !== input.kind || existing.mode !== input.mode) {
      throw new FormDomainError('INVALID_DEFINITION', 'Rodzaju i sposobu utworzenia nie można zmienić.');
    }
    this.validateInput(input, file, false);
    if (input.mode === 'CUSTOM') await this.validateLayoutAssets(input.layout!);
    const detected = file ? await this.validateFile(file) : undefined;
    const savedPath = detected ? await this.storeFile(file!.buffer, detected.mime, 'library') : null;
    try {
      return await this.dataSource.transaction(async manager => {
        const repository = manager.getRepository(FormHeaderFooter);
        const item = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!item) throw new FormDomainError('VERSION_NOT_FOUND', 'Nagłówek lub stopka nie istnieje.');
        if (input.isDefault) await this.clearDefault(manager, input.kind, id);
        const previous = { name: item.name, heightMm: Number(item.heightMm), isDefault: item.isDefault };
        item.name = input.name.trim();
        item.heightMm = input.heightMm;
        item.isDefault = input.isDefault;
        if (item.mode === 'CUSTOM') item.layout = input.layout!;
        if (savedPath) {
          item.filePath = savedPath;
          item.fileMime = detected!.mime;
        }
        const saved = await repository.save(item);
        await FormAuditService.record(manager, 'FORM_BRANDING_UPDATED', actorId, 'form_template', id, [
          { field: 'branding', previousValue: previous, newValue: { name: saved.name, heightMm: saved.heightMm, isDefault: saved.isDefault } },
        ]);
        return saved;
      });
    } catch (error) {
      if (savedPath) await this.removeFile(savedPath);
      throw error;
    }
  }

  async delete(id: number, actorId: number): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const repository = manager.getRepository(FormHeaderFooter);
      const item = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!item) throw new FormDomainError('VERSION_NOT_FOUND', 'Nagłówek lub stopka nie istnieje.');
      item.isDefault = false;
      await repository.save(item);
      await repository.softRemove(item);
      await FormAuditService.record(manager, 'FORM_BRANDING_DELETED', actorId, 'form_template', id, [
        { field: 'deletedAt', previousValue: null, newValue: new Date().toISOString() },
      ]);
    });
  }

  async uploadLogo(file: Express.Multer.File): Promise<{ assetPath: string; fileMime: string; fileName: string }> {
    const detected = await this.validateFile(file, true);
    const assetPath = await this.storeFile(file.buffer, detected.mime, 'assets');
    return { assetPath, fileMime: detected.mime, fileName: path.basename(assetPath) };
  }

  async getVersionBranding(version: FormTemplateVersion, kind: FormBrandingKind): Promise<FormBrandingSnapshot | null> {
    const snapshot = kind === 'HEADER' ? version.headerSnapshot : version.footerSnapshot;
    if (version.status === 'PUBLISHED') {
      return snapshot ? snapshot as unknown as FormBrandingSnapshot : null;
    }
    const selectedId = kind === 'HEADER' ? version.headerId : version.footerId;
    const repository = this.dataSource.getRepository(FormHeaderFooter);
    const item = selectedId
      ? await repository.findOne({ where: { id: selectedId }, withDeleted: true })
      : await repository.findOne({ where: { kind, isDefault: true } });
    return item ? this.toSnapshot(item) : null;
  }

  async resolveForPublication(
    manager: EntityManager,
    kind: FormBrandingKind,
    selectedId: number | null,
    existingSnapshot: FormJsonObject | null,
  ): Promise<{ id: number | null; snapshot: FormJsonObject | null }> {
    let item: FormHeaderFooter | null = null;
    if (selectedId !== null) {
      item = await manager.getRepository(FormHeaderFooter).findOne({ where: { id: selectedId }, withDeleted: true });
      if (!item || item.kind !== kind) {
        throw new FormDomainError('INVALID_DEFINITION', `Wybrany ${kind === 'HEADER' ? 'nagłówek' : 'stopka'} nie istnieje.`);
      }
      if (item.deletedAt && existingSnapshot) return { id: item.id, snapshot: existingSnapshot };
      if (item.deletedAt) {
        throw new FormDomainError('INVALID_DEFINITION', 'Usunięty element brandingu nie ma snapshotu do publikacji.');
      }
    } else {
      item = await manager.getRepository(FormHeaderFooter).findOne({ where: { kind, isDefault: true } });
    }
    return item
      ? { id: item.id, snapshot: this.toSnapshot(item) as unknown as FormJsonObject }
      : { id: null, snapshot: null };
  }

  async getStoredFile(id: number): Promise<{ path: string; mime: string }> {
    const item = await this.dataSource.getRepository(FormHeaderFooter).findOne({ where: { id }, withDeleted: true });
    if (!item?.filePath || !item.fileMime) throw new FormDomainError('VERSION_NOT_FOUND', 'Plik brandingu nie istnieje.');
    return { path: await this.resolveStoredPath(item.filePath), mime: item.fileMime };
  }

  async getSnapshotFile(fileName: string): Promise<{ path: string; mime: string }> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpe?g|pdf)$/.test(fileName)) {
      throw new FormDomainError('VERSION_NOT_FOUND', 'Plik brandingu nie istnieje.');
    }
    const relative = `forms/branding/library/${fileName}`;
    const mime = fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
    return { path: await this.resolveStoredPath(relative), mime };
  }

  async getLogoFile(fileName: string): Promise<{ path: string; mime: string }> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpe?g)$/.test(fileName)) {
      throw new FormDomainError('VERSION_NOT_FOUND', 'Logo nie istnieje.');
    }
    const relative = `forms/branding/assets/${fileName}`;
    const filePath = await this.resolveStoredPath(relative);
    const mime = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return { path: filePath, mime };
  }

  static validateLayout(value: unknown): value is FormBrandingLayout {
    if (!isRecord(value) || !isRecord(value.columns) ||
      typeof value.separator !== 'boolean' ||
      Object.keys(value).some(key => !['columns', 'separator'].includes(key)) ||
      Object.keys(value.columns).some(key => !['left', 'center', 'right'].includes(key))) return false;
    for (const column of ['left', 'center', 'right']) {
      const items = value.columns[column];
      if (!Array.isArray(items) || items.length > 10) return false;
      for (const item of items) {
        if (!isRecord(item) || !['text', 'logo', 'variable', 'pageNumber', 'printDate'].includes(String(item.type))) return false;
        switch (item.type) {
          case 'text':
            if (Object.keys(item).some(key => !['type', 'text'].includes(key)) ||
              typeof item.text !== 'string' || item.text.trim().length === 0 || item.text.length > 250) return false;
            break;
          case 'logo':
            if (Object.keys(item).some(key => !['type', 'assetPath', 'alt'].includes(key)) ||
              typeof item.assetPath !== 'string' ||
            !/^forms\/branding\/assets\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpe?g)$/.test(item.assetPath) ||
              typeof item.alt !== 'string' || item.alt.length > 150) return false;
            break;
          case 'variable':
            if (Object.keys(item).some(key => !['type', 'source'].includes(key)) ||
              typeof item.source !== 'string' || !sourceExpressions.has(item.source)) return false;
            break;
          case 'pageNumber':
          case 'printDate':
            if (Object.keys(item).some(key => key !== 'type')) return false;
        }
      }
    }
    return true;
  }

  private validateInput(input: FormBrandingInput, file: Express.Multer.File | undefined, creating: boolean): void {
    if (
      typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.trim().length > 150 ||
      !['HEADER', 'FOOTER'].includes(input.kind) ||
      !['FILE', 'CUSTOM'].includes(input.mode) ||
      !Number.isFinite(input.heightMm) || input.heightMm < 5 || input.heightMm > 100 ||
      typeof input.isDefault !== 'boolean'
    ) {
      throw new FormDomainError('INVALID_DEFINITION', 'Dane nagłówka lub stopki są nieprawidłowe.');
    }
    if (input.mode === 'FILE') {
      if (input.layout !== undefined) throw new FormDomainError('INVALID_DEFINITION', 'Element z pliku nie może mieć własnego układu.');
      if (creating && !file) throw new FormDomainError('INVALID_DEFINITION', 'Wybierz plik nagłówka lub stopki.');
    } else {
      if (file) throw new FormDomainError('INVALID_DEFINITION', 'Własny układ nie przyjmuje pliku tła.');
      if (!FormHeaderFooterService.validateLayout(input.layout)) {
        throw new FormDomainError('INVALID_DEFINITION', 'Układ zawiera nieprawidłowy element.');
      }
    }
  }

  private async validateFile(file: Express.Multer.File, logoOnly = false): Promise<{ mime: string }> {
    if (!file?.buffer?.length || file.size > MAX_FILE_SIZE || file.buffer.length > MAX_FILE_SIZE) {
      throw new FormDomainError('INVALID_DEFINITION', 'Plik musi mieć maksymalnie 5 MB.');
    }
    const bytes = file.buffer;
    const mime = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? 'image/png'
      : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
        ? 'image/jpeg'
        : bytes.subarray(0, 5).toString('ascii') === '%PDF-'
          ? 'application/pdf'
          : '';
    if (!allowedMime.has(mime) || (logoOnly && !imageMime.has(mime))) {
      throw new FormDomainError('INVALID_DEFINITION', 'Dozwolone są pliki PNG, JPG lub PDF; logo musi być obrazem.');
    }
    if (mime === 'application/pdf') {
      let document: PDFDocument;
      try {
        document = await PDFDocument.load(bytes);
      } catch {
        throw new FormDomainError('INVALID_DEFINITION', 'Nie można odczytać pliku PDF.');
      }
      if (document.getPageCount() < 1) throw new FormDomainError('INVALID_DEFINITION', 'PDF nie zawiera stron.');
    } else {
      const metadata = await sharp(bytes).metadata().catch(() => {
        throw new FormDomainError('INVALID_DEFINITION', 'Nie można odczytać obrazu.');
      });
      if (
        metadata.format !== (mime === 'image/png' ? 'png' : 'jpeg') ||
        !metadata.width || !metadata.height || metadata.width > 20000 || metadata.height > 20000 ||
        metadata.width * metadata.height > MAX_IMAGE_PIXELS
      ) {
        throw new FormDomainError('INVALID_DEFINITION', 'Nie można odczytać obrazu lub jego wymiary są nieprawidłowe.');
      }
    }
    return { mime };
  }

  private async storeFile(buffer: Buffer, mime: string, folder: 'library' | 'assets'): Promise<string> {
    const extension = mime === 'image/png' ? '.png' : mime === 'image/jpeg' ? '.jpg' : '.pdf';
    const fileName = `${randomUUID()}${extension}`;
    const relative = path.posix.join('forms', 'branding', folder, fileName);
    const fullPath = path.join(this.uploadRoot(), ...relative.split('/'));
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer, { flag: 'wx', mode: 0o640 });
    return relative;
  }

  private async resolveStoredPath(relative: string): Promise<string> {
    if (!relative.startsWith('forms/branding/')) throw new FormDomainError('INVALID_DEFINITION', 'Nieprawidłowa ścieżka pliku brandingu.');
    const root = path.resolve(this.uploadRoot(), 'forms', 'branding');
    const fullPath = path.resolve(this.uploadRoot(), relative);
    if (!fullPath.startsWith(`${root}${path.sep}`)) throw new FormDomainError('INVALID_DEFINITION', 'Nieprawidłowa ścieżka pliku brandingu.');
    try {
      await fs.access(fullPath);
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') {
        throw new FormDomainError('VERSION_NOT_FOUND', 'Plik brandingu nie istnieje.');
      }
      throw error;
    }
    return fullPath;
  }

  private async removeFile(relative: string): Promise<void> {
    const fullPath = path.join(this.uploadRoot(), ...relative.split('/'));
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return;
      throw error;
    }
  }

  private async validateLayoutAssets(value: FormJsonObject): Promise<void> {
    if (!FormHeaderFooterService.validateLayout(value)) {
      throw new FormDomainError('INVALID_DEFINITION', 'Układ zawiera nieprawidłowy element.');
    }
    const layout = value;
    for (const column of Object.values(layout.columns)) {
      for (const item of column) {
        if (item.type === 'logo') await this.resolveStoredPath(item.assetPath!);
      }
    }
  }

  private uploadRoot(): string {
    return path.resolve(process.env.UPLOAD_DIR || './uploads');
  }

  private async clearDefault(manager: EntityManager, kind: FormBrandingKind, exceptId?: number): Promise<void> {
    await manager.query(
      `UPDATE form_header_footers SET is_default = FALSE
       WHERE kind = $1 AND is_default = TRUE AND deleted_at IS NULL AND ($2::int IS NULL OR id <> $2)`,
      [kind, exceptId ?? null],
    );
  }

  private toSnapshot(item: FormHeaderFooter): FormBrandingSnapshot {
    return {
      id: item.id,
      name: item.name,
      kind: item.kind,
      mode: item.mode,
      heightMm: Number(item.heightMm),
      filePath: item.filePath,
      fileMime: item.fileMime,
      layout: item.layout,
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
