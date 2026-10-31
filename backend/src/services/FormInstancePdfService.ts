import fs from 'fs/promises';
import path from 'path';
import fontkit from '@pdf-lib/fontkit';
import {
  PDFDocument, PDFPage, PDFFont, PDFImage, rgb, degrees,
} from 'pdf-lib';
import { DataSource } from 'typeorm';
import { AppDataSource } from '../config/database';
import { FormApproval } from '../entities/FormApproval';
import { FormFieldDefinition } from '../entities/FormFieldDefinition';
import { FormFieldValue } from '../entities/FormFieldValue';
import { FormInstance } from '../entities/FormInstance';
import { FormSection } from '../entities/FormSection';
import { FormTemplateVersion } from '../entities/FormTemplateVersion';
import { FormApprovalDecision, FormInstanceStatus, FormJsonObject, FormJsonValue } from '../entities/FormTypes';
import { User } from '../entities/User';
import { FormDomainError } from '../errors/FormDomainError';
import { FormBrandingSnapshot, FormHeaderFooterService } from './FormHeaderFooterService';
import { FormDataSourceResolver } from './FormDataSourceResolver';
import { FormInstanceAccessGuard } from './FormInstanceService';
import { evaluateFormCondition } from './FormRules';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const POINTS_PER_MM = 72 / 25.4;
const SIDE_MARGIN = 42;
const CONTENT_SIZE = 10;
const LINE_HEIGHT = 14;
const DARK = rgb(0.12, 0.16, 0.2);
const MUTED = rgb(0.35, 0.39, 0.43);
const BORDER = rgb(0.76, 0.79, 0.82);
const FAIL_COLOR = rgb(0.72, 0.1, 0.1);

interface PdfSnapshot {
  instance: FormInstance;
  version: FormTemplateVersion;
  sections: FormSection[];
  fields: FormFieldDefinition[];
  values: FormFieldValue[];
  approvals: FormApproval[];
  users: Pick<User, 'id' | 'firstName' | 'lastName'>[];
  variables: Map<string, FormJsonValue>;
}

interface RenderPage {
  page: PDFPage;
  y: number;
}

const isJsonObject = (value: FormJsonValue): value is FormJsonObject =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function valueToText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Tak' : 'Nie';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '—';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(valueToText).join(', ');
  return JSON.stringify(value);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const character of word) {
        const next = line + character;
        if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
          lines.push(line);
          line = character;
        } else {
          line = next;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [''];
}

export class FormInstancePdfService {
  private readonly branding: FormHeaderFooterService;

  constructor(private readonly dataSource: DataSource = AppDataSource) {
    this.branding = new FormHeaderFooterService(dataSource);
  }

  async generate(instanceId: number, accessGuard?: FormInstanceAccessGuard): Promise<Buffer> {
    const snapshot = await this.loadSnapshot(instanceId, accessGuard);
    const document = await PDFDocument.create();
    document.registerFontkit(fontkit);
    const [regularBytes, boldBytes] = await Promise.all([
      fs.readFile(path.join(__dirname, '../assets/fonts/NotoSans-Regular.ttf')),
      fs.readFile(path.join(__dirname, '../assets/fonts/NotoSans-Bold.ttf')),
    ]);
    const regular = await document.embedFont(regularBytes, { subset: true });
    const bold = await document.embedFont(boldBytes, { subset: true });
    const header = await this.loadBranding(snapshot.version, 'HEADER');
    const footer = await this.loadBranding(snapshot.version, 'FOOTER');
    const valuesByFieldId = new Map(snapshot.values.map(value => [value.fieldDefinitionId, value.value]));
    const responses = Object.fromEntries(snapshot.fields.map(field => [
      field.key, valuesByFieldId.get(field.id) ?? null,
    ]));
    const topLimit = PAGE_HEIGHT - ((header?.snapshot.heightMm ?? 0) * POINTS_PER_MM) - 24;
    const bottomLimit = 24 + ((footer?.snapshot.heightMm ?? 0) * POINTS_PER_MM);
    const renderPages: RenderPage[] = [];
    const newPage = (): RenderPage => {
      const current = { page: document.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: topLimit };
      renderPages.push(current);
      return current;
    };
    let current = newPage();

    const ensureSpace = (height: number) => {
      if (current.y - height < bottomLimit) current = newPage();
    };
    const writeLines = (
      text: string,
      font: PDFFont,
      size = CONTENT_SIZE,
      color = DARK,
      indent = 0,
      maxWidth = PAGE_WIDTH - SIDE_MARGIN * 2 - indent,
    ) => {
      const lines = wrapText(text, font, size, maxWidth);
      const lineHeight = Math.max(LINE_HEIGHT, size * 1.35);
      for (const line of lines) {
        ensureSpace(lineHeight);
        current.page.drawText(line, { x: SIDE_MARGIN + indent, y: current.y - size, size, font, color });
        current.y -= lineHeight;
      }
    };
    const space = (amount = 7) => {
      current.y -= amount;
      ensureSpace(1);
    };

    writeLines(snapshot.version.title, bold, 18);
    if (snapshot.version.description) writeLines(snapshot.version.description, regular);
    writeLines(`Instancja #${snapshot.instance.id} · status: ${snapshot.instance.status}`, regular, 9, MUTED);
    writeLines(`Utworzono: ${snapshot.instance.createdAt.toLocaleString('pl-PL')}`, regular, 9, MUTED);
    if (snapshot.instance.submittedAt) {
      writeLines(`Wysłano do akceptacji: ${snapshot.instance.submittedAt.toLocaleString('pl-PL')}`, regular, 9, MUTED);
    }
    space(9);

    for (const section of snapshot.sections) {
      if (section.conditions?.visibleWhen !== undefined &&
        !evaluateFormCondition(section.conditions, 'visibleWhen', responses)) continue;
      const sectionFields = snapshot.fields
        .filter(field => field.sectionId === section.id && (field.conditions?.visibleWhen === undefined ||
          evaluateFormCondition(field.conditions, 'visibleWhen', responses)))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
      if (!sectionFields.length) continue;
      ensureSpace(32);
      writeLines(section.title, bold, 13);
      if (section.description) writeLines(section.description, regular, 9, MUTED);
      space(4);
      for (const field of sectionFields) {
        const value = valuesByFieldId.get(field.id);
        ensureSpace(32);
        writeLines(field.label, bold, 10);
        if (field.fieldType.toUpperCase() === 'BOM_TABLE') {
          this.drawBomTable(() => current, page => { current = page; }, value, regular, bold, newPage, bottomLimit);
        } else {
          const text = valueToText(value);
          const isFail = field.fieldType.toUpperCase() === 'PASS_FAIL' && value === 'FAIL';
          writeLines(text, isFail ? bold : regular, CONTENT_SIZE, isFail ? FAIL_COLOR : DARK, 8);
        }
        space(7);
      }
      space(8);
    }

    ensureSpace(100);
    writeLines('Akceptacja', bold, 13);
    const lastApproval = snapshot.approvals.at(-1);
    const approver = lastApproval
      ? snapshot.users.find(user => user.id === lastApproval.decidedById)
      : undefined;
    writeLines(`Status: ${snapshot.instance.status === FormInstanceStatus.APPROVED ? 'Zatwierdzony' : 'Do zatwierdzenia'}`, regular);
    writeLines(`Kto: ${approver ? `${approver.firstName} ${approver.lastName}`.trim() : '—'}`, regular);
    writeLines(`Kiedy: ${lastApproval?.decidedAt.toLocaleString('pl-PL') ?? '—'}`, regular);
    writeLines(`Decyzja: ${lastApproval?.decision === FormApprovalDecision.APPROVED
      ? 'Zatwierdzono'
      : lastApproval?.decision === FormApprovalDecision.REJECTED ? 'Odrzucono' : '—'}`, regular);
    writeLines(`Komentarz: ${lastApproval?.comment ?? '—'}`, regular);

    const totalPages = renderPages.length;
    for (const [index, rendered] of renderPages.entries()) {
      if (snapshot.instance.status !== FormInstanceStatus.APPROVED) {
        rendered.page.drawText('PROJEKT', {
          x: 110,
          y: PAGE_HEIGHT / 2 - 30,
          size: 64,
          font: bold,
          color: rgb(0.55, 0.12, 0.12),
          opacity: 0.12,
          rotate: degrees(32),
        });
      }
      await this.drawBranding(document, rendered.page, header, 'HEADER', index + 1, totalPages, snapshot.variables, regular);
      await this.drawBranding(document, rendered.page, footer, 'FOOTER', index + 1, totalPages, snapshot.variables, regular);
    }
    return Buffer.from(await document.save());
  }

  private async loadSnapshot(instanceId: number, accessGuard?: FormInstanceAccessGuard): Promise<PdfSnapshot> {
    return this.dataSource.transaction('REPEATABLE READ', async manager => {
      const instance = await manager.getRepository(FormInstance).findOne({
        where: { id: instanceId }, lock: { mode: 'pessimistic_read' },
      });
      if (!instance) throw new FormDomainError('INSTANCE_NOT_FOUND', `Form instance ${instanceId} was not found`);
      await accessGuard?.(manager, instance);
      const [version, sections, fields, values, approvals] = await Promise.all([
        manager.getRepository(FormTemplateVersion).findOne({ where: { id: instance.templateVersionId } }),
        manager.getRepository(FormSection).find({
          where: { templateVersionId: instance.templateVersionId }, order: { sortOrder: 'ASC', id: 'ASC' },
        }),
        manager.getRepository(FormFieldDefinition).find({
          where: { templateVersionId: instance.templateVersionId }, order: { sortOrder: 'ASC', id: 'ASC' },
        }),
        manager.getRepository(FormFieldValue).find({
          where: { instanceId }, order: { id: 'ASC' },
        }),
        manager.getRepository(FormApproval).find({
          where: { instanceId }, order: { round: 'ASC', stepOrder: 'ASC', decidedAt: 'ASC', id: 'ASC' },
        }),
      ]);
      if (!version) throw new FormDomainError('VERSION_NOT_FOUND', `Form version ${instance.templateVersionId} was not found`);
      const users = approvals.length
        ? await manager.getRepository(User).find({
          select: { id: true, firstName: true, lastName: true },
          where: approvals.map(approval => ({ id: approval.decidedById })),
        })
        : [];
      const sources = new Set<string>();
      for (const branding of [version.headerSnapshot, version.footerSnapshot]) {
        if (branding?.mode !== 'CUSTOM') continue;
        if (!FormHeaderFooterService.validateLayout(branding.layout)) {
          throw new FormDomainError('INVALID_DEFINITION', 'Nieprawidłowy snapshot układu brandingu.');
        }
        for (const column of Object.values(branding.layout.columns)) {
          for (const item of column) {
            if (item.type === 'variable' && item.source) sources.add(item.source);
          }
        }
      }
      const resolver = new FormDataSourceResolver(manager);
      const variables = new Map(await Promise.all([...sources].map(async source => [
        source,
        await resolver.resolve(source, {
          taskId: instance.taskId, contractId: instance.contractId,
          userId: instance.assignedUserId ?? instance.createdById,
        }),
      ] as const)));
      return { instance, version, sections, fields, values, approvals, users, variables };
    });
  }

  private async loadBranding(
    version: FormTemplateVersion,
    kind: 'HEADER' | 'FOOTER',
  ): Promise<{ snapshot: FormBrandingSnapshot; file?: Buffer } | undefined> {
    const snapshot = await this.branding.getVersionBranding(version, kind);
    if (!snapshot) return undefined;
    if (snapshot.mode === 'FILE' && snapshot.filePath) {
      const fileName = path.basename(snapshot.filePath);
      const stored = await this.branding.getSnapshotFile(fileName);
      return { snapshot, file: await fs.readFile(stored.path) };
    }
    return { snapshot };
  }

  private drawBomTable(
    getCurrent: () => RenderPage,
    setCurrent: (page: RenderPage) => void,
    value: FormJsonValue | undefined,
    regular: PDFFont,
    bold: PDFFont,
    newPage: () => RenderPage,
    bottomLimit: number,
  ): void {
    const rows = Array.isArray(value)
      ? value.filter((row): row is FormJsonObject => isJsonObject(row))
      : [];
    if (!rows.length) {
      let page = getCurrent();
      if (page.y - LINE_HEIGHT < bottomLimit) {
        page = newPage();
        setCurrent(page);
      }
      page.page.drawText('Brak pozycji BOM.', { x: SIDE_MARGIN + 8, y: page.y - CONTENT_SIZE, size: CONTENT_SIZE, font: regular, color: MUTED });
      page.y -= LINE_HEIGHT;
      return;
    }
    const widths = [160, 36, 52, 64, 52, PAGE_WIDTH - SIDE_MARGIN * 2 - 364];
    const labels = ['Materiał', 'Jedn.', 'Plan.', 'Zamont.', 'Status', 'Uwagi'];
    const drawRow = (wrapped: string[][], font: PDFFont) => {
      const rowHeight = Math.max(...wrapped.map(lines => lines.length)) * 11 + 6;
      const page = getCurrent();
      const top = page.y;
      page.page.drawRectangle({
        x: SIDE_MARGIN,
        y: top - rowHeight,
        width: PAGE_WIDTH - SIDE_MARGIN * 2,
        height: rowHeight,
        borderColor: BORDER,
        borderWidth: 0.5,
      });
      let x = SIDE_MARGIN;
      wrapped.forEach((lines, index) => {
        lines.forEach((line, lineIndex) => page.page.drawText(line, {
          x: x + 4,
          y: top - 12 - (lineIndex * 11),
          size: 8,
          font,
          color: DARK,
        }));
        x += widths[index];
      });
      page.y -= rowHeight;
    };
    const header = labels.map((cell, index) => wrapText(cell, bold, 8, widths[index] - 8));
    const headerHeight = Math.max(...header.map(lines => lines.length)) * 11 + 6;
    const continueTable = () => {
      setCurrent(newPage());
      drawRow(header, bold);
    };
    if (getCurrent().y - headerHeight - 17 < bottomLimit) setCurrent(newPage());
    drawRow(header, bold);
    for (const row of rows) {
      const wrapped = [
        valueToText(row.name),
        valueToText(row.unit),
        valueToText(row.plannedQty),
        valueToText(row.installedQty),
        row.installed === true ? 'Tak' : 'Nie',
        valueToText(row.note),
      ].map((cell, index) => wrapText(cell, regular, 8, widths[index] - 8));
      let offset = 0;
      const lineCount = Math.max(...wrapped.map(lines => lines.length));
      while (offset < lineCount) {
        let available = Math.floor((getCurrent().y - bottomLimit - 6) / 11);
        if (available < 1) {
          continueTable();
          available = Math.floor((getCurrent().y - bottomLimit - 6) / 11);
        }
        const count = Math.min(available, lineCount - offset);
        drawRow(wrapped.map(lines => {
          const segment = lines.slice(offset, offset + count);
          return segment.length ? segment : [''];
        }), regular);
        offset += count;
        if (offset < lineCount) continueTable();
      }
    }
  }

  private async drawBranding(
    document: PDFDocument,
    page: PDFPage,
    branding: { snapshot: FormBrandingSnapshot; file?: Buffer } | undefined,
    kind: 'HEADER' | 'FOOTER',
    pageNumber: number,
    totalPages: number,
    variables: Map<string, FormJsonValue | undefined>,
    font: PDFFont,
  ): Promise<void> {
    if (!branding) return;
    const { snapshot, file } = branding;
    const height = snapshot.heightMm * POINTS_PER_MM;
    const y = kind === 'HEADER' ? PAGE_HEIGHT - height : 0;
    if (snapshot.mode === 'FILE' && file) {
      if (snapshot.fileMime === 'application/pdf') {
        const source = await PDFDocument.load(file);
        const sourcePage = source.getPage(0);
        const { width, height: sourceHeight } = sourcePage.getSize();
        const cropHeight = Math.min(sourceHeight, (height / PAGE_WIDTH) * width);
        const box = kind === 'HEADER'
          ? { left: 0, bottom: sourceHeight - cropHeight, right: width, top: sourceHeight }
          : { left: 0, bottom: 0, right: width, top: cropHeight };
        const embeddedPage = await document.embedPage(sourcePage, box);
        page.drawPage(embeddedPage, { x: 0, y, width: PAGE_WIDTH, height });
      } else {
        const image = snapshot.fileMime === 'image/png'
          ? await document.embedPng(file)
          : await document.embedJpg(file);
        const scaled = image.scaleToFit(PAGE_WIDTH, height);
        page.drawImage(image, {
          x: (PAGE_WIDTH - scaled.width) / 2,
          y: y + (height - scaled.height) / 2,
          width: scaled.width,
          height: scaled.height,
        });
      }
      return;
    }
    if (snapshot.mode !== 'CUSTOM' || !FormHeaderFooterService.validateLayout(snapshot.layout)) {
      throw new FormDomainError('INVALID_DEFINITION', 'Nieprawidłowy snapshot układu brandingu.');
    }
    const columns = snapshot.layout.columns;
    const columnWidth = (PAGE_WIDTH - SIDE_MARGIN * 2) / 3;
    for (const [index, columnName] of (['left', 'center', 'right'] as const).entries()) {
      const items = columns[columnName];
      if (!Array.isArray(items)) continue;
      const x = SIDE_MARGIN + index * columnWidth;
      const elements: Array<{ lines?: string[]; image?: PDFImage; width: number; height: number }> = [];
      for (const item of items) {
        let text = '';
        if (item.type === 'text' && typeof item.text === 'string') text = item.text;
        if (item.type === 'variable' && typeof item.source === 'string') {
          text = valueToText(variables.get(item.source));
        }
        if (item.type === 'pageNumber') text = `Strona ${pageNumber} z ${totalPages}`;
        if (item.type === 'printDate') text = new Date().toLocaleDateString('pl-PL');
        if (item.type === 'logo' && typeof item.assetPath === 'string') {
          const stored = await this.branding.getLogoFile(path.basename(item.assetPath));
          const bytes = await fs.readFile(stored.path);
          const image: PDFImage = stored.mime === 'image/png'
            ? await document.embedPng(bytes)
            : await document.embedJpg(bytes);
          const scaled = image.scaleToFit(columnWidth - 8, Math.min(height - 8, 36));
          elements.push({ image, width: scaled.width, height: scaled.height });
          continue;
        }
        if (text) {
          const lines = wrapText(text, font, 8, columnWidth - 8);
          elements.push({ lines, width: columnWidth - 8, height: lines.length * 11 });
        }
      }
      const totalHeight = elements.reduce((sum, element) => sum + element.height + 3, 0);
      const scale = Math.min(1, (height - 8) / Math.max(1, totalHeight));
      let cursor = y + height - 4;
      const align = (width: number) => columnName === 'right'
        ? x + columnWidth - 4 - width
        : columnName === 'center' ? x + (columnWidth - width) / 2 : x + 4;
      for (const element of elements) {
        if (element.image) {
          page.drawImage(element.image, {
            x: align(element.width * scale), y: cursor - element.height * scale,
            width: element.width * scale, height: element.height * scale,
          });
        } else if (element.lines) {
          for (const [lineIndex, line] of element.lines.entries()) {
            page.drawText(line, {
              x: align(font.widthOfTextAtSize(line, 8 * scale)),
              y: cursor - (8 + lineIndex * 11) * scale,
              size: 8 * scale, font, color: DARK,
            });
          }
        }
        cursor -= (element.height + 3) * scale;
      }
    }
    if (snapshot.layout.separator === true) {
      const separatorY = kind === 'HEADER' ? y : height;
      page.drawLine({
        start: { x: SIDE_MARGIN, y: separatorY },
        end: { x: PAGE_WIDTH - SIDE_MARGIN, y: separatorY },
        color: BORDER,
        thickness: 0.5,
      });
    }
  }
}

export default FormInstancePdfService;
