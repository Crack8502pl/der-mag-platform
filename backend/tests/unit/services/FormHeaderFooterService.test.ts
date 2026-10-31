import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { DataSource } from 'typeorm';
import { FormHeaderFooter } from '../../../src/entities/FormHeaderFooter';
import { FormHeaderFooterService } from '../../../src/services/FormHeaderFooterService';

jest.mock('../../../src/config/database', () => ({ AppDataSource: {} }));

describe('FormHeaderFooterService', () => {
  let uploadRoot: string;
  let previousUploadDir: string | undefined;

  beforeEach(async () => {
    previousUploadDir = process.env.UPLOAD_DIR;
    uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'form-branding-'));
    process.env.UPLOAD_DIR = uploadRoot;
  });

  afterEach(async () => {
    if (previousUploadDir === undefined) delete process.env.UPLOAD_DIR;
    else process.env.UPLOAD_DIR = previousUploadDir;
    await fs.rm(uploadRoot, { recursive: true, force: true });
  });

  const dataSourceWithRepository = (repository: Record<string, jest.Mock>) => {
    const manager = {
      getRepository: jest.fn(() => repository),
      query: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      getRepository: jest.fn(() => repository),
      transaction: jest.fn((callback: (manager: unknown) => unknown) => callback(manager)),
    };
    return { dataSource: dataSource as unknown as DataSource, manager };
  };

  it('accepts only approved variable sources and supported layout elements', () => {
    expect(FormHeaderFooterService.validateLayout({
      columns: {
        left: [{ type: 'variable', source: 'task.number' }],
        center: [{ type: 'text', text: 'Kontrola' }],
        right: [{ type: 'pageNumber' }, { type: 'printDate' }],
      },
      separator: true,
    })).toBe(true);

    expect(FormHeaderFooterService.validateLayout({
      columns: { left: [{ type: 'variable', source: 'task.secret' }], center: [], right: [] },
      separator: false,
    })).toBe(false);
    expect(FormHeaderFooterService.validateLayout({
      columns: { left: [{ type: 'text', text: '<script>alert(1)</script>' }], center: [], right: [] },
      separator: false,
    })).toBe(true);
  });

  it('inspects PNG bytes, saves the file under the branding directory, and preserves its snapshot path', async () => {
    const repository = {
      create: jest.fn(value => value),
      save: jest.fn(async value => ({ ...value, id: 21, deletedAt: null })),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    const { dataSource, manager } = dataSourceWithRepository(repository);
    const service = new FormHeaderFooterService(dataSource);
    const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ff0000' } }).png().toBuffer();
    const file = {
      buffer, size: buffer.length, originalname: 'header.png', mimetype: 'application/pdf',
    } as Express.Multer.File;

    const saved = await service.create({
      name: 'Nagłówek firmowy', kind: 'HEADER', mode: 'FILE', heightMm: 20, isDefault: false,
    }, 7, file);

    expect(saved.fileMime).toBe('image/png');
    expect(saved.filePath).toMatch(/^forms\/branding\/library\/[0-9a-f-]+\.png$/);
    expect(await fs.readFile(path.join(uploadRoot, saved.filePath!))).toEqual(buffer);
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO audit_logs'),
      expect.arrayContaining(['FORM_BRANDING_CREATED', 7, expect.any(String)]),
    );
    const resolved = await service.getSnapshotFile(path.basename(saved.filePath!));
    expect(resolved.mime).toBe('image/png');
    expect(resolved.path).toBe(path.join(uploadRoot, saved.filePath!));
  });

  it('rejects a file with forged image metadata before writing it', async () => {
    const repository = {
      create: jest.fn(value => value),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    const { dataSource } = dataSourceWithRepository(repository);
    const service = new FormHeaderFooterService(dataSource);
    const file = {
      buffer: Buffer.from('not an image'),
      size: 12,
      originalname: 'header.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(service.create({
      name: 'Nieprawidłowy plik', kind: 'HEADER', mode: 'FILE', heightMm: 20, isDefault: false,
    }, 7, file)).rejects.toMatchObject({ code: 'INVALID_DEFINITION' });
    expect(repository.save).not.toHaveBeenCalled();
    await expect(fs.readdir(path.join(uploadRoot, 'forms'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects files exceeding the 5 MB upload limit', async () => {
    const repository = {
      create: jest.fn(value => value),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    const { dataSource } = dataSourceWithRepository(repository);
    const file = {
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
      size: 5 * 1024 * 1024 + 1,
      originalname: 'oversized.png',
      mimetype: 'image/png',
    } as Express.Multer.File;

    await expect(new FormHeaderFooterService(dataSource).create({
      name: 'Za duży plik', kind: 'HEADER', mode: 'FILE', heightMm: 20, isDefault: false,
    }, 7, file)).rejects.toMatchObject({ code: 'INVALID_DEFINITION' });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('preserves a published snapshot when its source entry is later soft-deleted', async () => {
    const snapshot = {
      id: 21, name: 'Poprzedni nagłówek', kind: 'HEADER', mode: 'CUSTOM',
      heightMm: 20, filePath: null, fileMime: null,
      layout: { columns: { left: [], center: [], right: [] }, separator: true },
    };
    const repository = {
      findOne: jest.fn().mockResolvedValue({
        id: 21, kind: 'HEADER', deletedAt: new Date(), name: 'Zmieniona nazwa',
      }),
    };
    const manager = { getRepository: jest.fn(() => repository) };
    const service = new FormHeaderFooterService({} as DataSource);

    await expect(service.resolveForPublication(manager as any, 'HEADER', 21, snapshot as any))
      .resolves.toEqual({ id: 21, snapshot });
  });

  it('does not apply newly configured defaults to published versions without snapshots', async () => {
    const repository = { findOne: jest.fn() };
    const dataSource = { getRepository: jest.fn(() => repository) };
    const service = new FormHeaderFooterService(dataSource as unknown as DataSource);

    await expect(service.getVersionBranding({
      status: 'PUBLISHED', headerSnapshot: null, headerId: null,
    } as any, 'HEADER')).resolves.toBeNull();
    expect(repository.findOne).not.toHaveBeenCalled();
  });

  it('resolves the active default element when publishing without an explicit selection', async () => {
    const item = {
      id: 21, name: 'Domyślny', kind: 'HEADER', mode: 'CUSTOM', isDefault: true,
      heightMm: 20, filePath: null, fileMime: null,
      layout: { columns: { left: [], center: [], right: [] }, separator: true },
      deletedAt: null,
    } as unknown as FormHeaderFooter;
    const repository = { findOne: jest.fn().mockResolvedValue(item) };
    const manager = { getRepository: jest.fn(() => repository) };
    const service = new FormHeaderFooterService({} as DataSource);

    await expect(service.resolveForPublication(manager as any, 'HEADER', null, null)).resolves.toEqual({
      id: 21,
      snapshot: expect.objectContaining({ id: 21, name: 'Domyślny', kind: 'HEADER' }),
    });
    expect(repository.findOne).toHaveBeenCalledWith({ where: { kind: 'HEADER', isDefault: true } });
  });
});
