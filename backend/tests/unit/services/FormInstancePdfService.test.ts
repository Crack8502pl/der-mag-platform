import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { inflateSync } from 'zlib';
import { PDFDict, PDFDocument, PDFName, PDFRawStream, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import { DataSource, EntityManager } from 'typeorm';
import { FormApproval } from '../../../src/entities/FormApproval';
import { FormFieldDefinition } from '../../../src/entities/FormFieldDefinition';
import { FormFieldValue } from '../../../src/entities/FormFieldValue';
import { FormInstance } from '../../../src/entities/FormInstance';
import { FormSection } from '../../../src/entities/FormSection';
import { FormTemplateVersion } from '../../../src/entities/FormTemplateVersion';
import { FormApprovalDecision, FormInstanceStatus, FormVersionStatus } from '../../../src/entities/FormTypes';
import { User } from '../../../src/entities/User';
import { FormDataSourceResolver } from '../../../src/services/FormDataSourceResolver';
import { FormInstancePdfService } from '../../../src/services/FormInstancePdfService';
import { FormDomainError } from '../../../src/errors/FormDomainError';

jest.mock('../../../src/config/database', () => ({ AppDataSource: {} }));
jest.mock('../../../src/services/FormDataSourceResolver');

interface ExtractedPage {
  text: string;
  fonts: Record<string, string>;
}

function extractPages(pdf: Buffer): ExtractedPage[] {
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `
    import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const task = getDocument({ data: new Uint8Array(Buffer.concat(chunks)), verbosity: 0 });
    const document = await task.promise;
    const pages = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const content = await page.getTextContent();
      pages.push({
        text: content.items.filter(item => 'str' in item).map(item => item.str).join(' ').replace(/\\s+/g, ' '),
        fonts: Object.fromEntries(content.items.filter(item => 'str' in item)
          .map(item => [item.str, item.fontName])),
      });
    }
    await task.destroy();
    process.stdout.write(JSON.stringify(pages));
  `], { cwd: path.resolve(__dirname, '../../..'), input: pdf, maxBuffer: 10 * 1024 * 1024 });
  return JSON.parse(output.toString()) as ExtractedPage[];
}

function fixture() {
  const instance: FormInstance = Object.assign(new FormInstance(), {
    id: 44, templateVersionId: 12, status: FormInstanceStatus.DRAFT,
    taskId: 5, contractId: null, assignedUserId: 7, createdById: 7,
    createdAt: new Date('2026-10-31T12:00:00Z'), submittedAt: null,
  });
  const version: FormTemplateVersion = Object.assign(new FormTemplateVersion(), {
    id: 12, title: 'Zażółć gęślą jaźń', description: 'Protokół instalacji',
    status: FormVersionStatus.PUBLISHED,
    headerSnapshot: {
      id: 1, name: 'Firmowy', kind: 'HEADER', mode: 'CUSTOM', heightMm: 20,
      filePath: null, fileMime: null,
      layout: {
        columns: {
          left: [{ type: 'text', text: 'Nagłówek firmowy' }],
          center: [{ type: 'variable', source: 'task.number' }],
          right: [{ type: 'printDate' }],
        }, separator: true,
      },
    },
    footerSnapshot: {
      id: 2, name: 'Stopka', kind: 'FOOTER', mode: 'CUSTOM', heightMm: 15,
      filePath: null, fileMime: null,
      layout: { columns: { left: [{ type: 'pageNumber' }], center: [], right: [] }, separator: true },
    },
  });
  const sections = [Object.assign(new FormSection(), {
    id: 1, title: 'Kontrola', sortOrder: 0, conditions: {},
  })];
  const fields: FormFieldDefinition[] = [
    Object.assign(new FormFieldDefinition(), {
      id: 1, sectionId: 1, key: 'result', label: 'Wynik', fieldType: 'PASS_FAIL',
      sortOrder: 0, options: {}, conditions: {},
    }),
    Object.assign(new FormFieldDefinition(), {
      id: 2, sectionId: 1, key: 'note', label: 'Uwagi', fieldType: 'TEXTAREA',
      sortOrder: 1, options: {}, conditions: {},
    }),
  ];
  const values: FormFieldValue[] = [
    Object.assign(new FormFieldValue(), { fieldDefinitionId: 1, value: 'FAIL' }),
    Object.assign(new FormFieldValue(), { fieldDefinitionId: 2, value: 'Zażółć gęślą jaźń' }),
  ];
  const approvals: FormApproval[] = [];
  const users = [Object.assign(new User(), { id: 7, firstName: 'Anna', lastName: 'Żółć' })];
  const repositories = new Map<unknown, unknown>([
    [FormInstance, { findOne: jest.fn(async () => instance) }],
    [FormTemplateVersion, { findOne: jest.fn(async () => version) }],
    [FormSection, { find: jest.fn(async () => sections) }],
    [FormFieldDefinition, { find: jest.fn(async () => fields) }],
    [FormFieldValue, { find: jest.fn(async () => values) }],
    [FormApproval, { find: jest.fn(async () => approvals) }],
    [User, { find: jest.fn(async () => users) }],
  ]);
  const manager = { getRepository: jest.fn((entity: unknown) => repositories.get(entity)) };
  const transaction = jest.fn(async (_isolation: string, action: (manager: EntityManager) => Promise<unknown>) =>
    action(manager as unknown as EntityManager));
  const dataSource = { transaction, getRepository: manager.getRepository } as unknown as DataSource;
  return { service: new FormInstancePdfService(dataSource), instance, version, sections, fields, values, approvals, repositories, transaction };
}

describe('FormInstancePdfService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(FormDataSourceResolver.prototype.resolve).mockResolvedValue('TSK-5');
  });

  it('creates exactly three A4 pages with Polish text, branding and DRAFT watermark on each page', async () => {
    const { service, values } = fixture();
    values[1].value = Array.from({ length: 100 }, (_, index) => `Wiersz ${index + 1}: Zażółć gęślą jaźń`).join('\n');
    const pdf = await service.generate(44);
    const document = await PDFDocument.load(pdf);
    expect(document.getPageCount()).toBe(3);
    for (const page of document.getPages()) {
      expect(page.getWidth()).toBeCloseTo(595.28);
      expect(page.getHeight()).toBeCloseTo(841.89);
    }
    const pages = extractPages(pdf);
    pages.forEach((page, index) => {
      expect(page.text).toContain('Nagłówek firmowy');
      expect(page.text).toContain('TSK-5');
      expect(page.text).toContain(`Strona ${index + 1} z 3`);
      expect(page.text).toContain('PROJEKT');
    });
    expect(pages[0].text).toContain('Utworzono: 31.10.2026, 13:00');
    expect(pages.map(page => page.text).join(' ')).toContain('Zażółć gęślą jaźń');
    expect(pages[0].fonts.FAIL).not.toBe(pages[0].fonts['Wiersz 1: Zażółć gęślą jaźń']);
    expect(FormDataSourceResolver.prototype.resolve).toHaveBeenCalledWith('task.number', {
      taskId: 5, contractId: null, userId: 7,
    });
  });

  it('prints approval identity, time, decision and comment without a watermark for APPROVED', async () => {
    const { service, instance, approvals } = fixture();
    instance.status = FormInstanceStatus.APPROVED;
    instance.submittedAt = new Date('2026-10-31T12:05:00Z');
    approvals.push(Object.assign(new FormApproval(), {
      decidedById: 7, decidedAt: new Date('2026-10-31T12:10:00Z'),
      decision: FormApprovalDecision.APPROVED, comment: 'Zażółć gęślą jaźń',
    }));
    const [page] = extractPages(await service.generate(44));
    expect(page.text).not.toContain('PROJEKT');
    expect(page.text).toContain('Kto: Anna Żółć');
    expect(page.text).toContain('Kiedy: 31.10.2026, 13:10');
    expect(page.text).toContain('Decyzja: Zatwierdzono');
    expect(page.text).toContain('Komentarz: Zażółć gęślą jaźń');
  });

  it('splits oversized BOM rows and repeats the table headings without losing the final note', async () => {
    const { service, fields, values } = fixture();
    fields[1].fieldType = 'BOM_TABLE';
    values[1].value = [{
      name: 'Przewód', unit: 'm', plannedQty: 100, installedQty: 90, installed: true,
      note: `${'Opis montażu '.repeat(1000)}KONIEC UWAG`,
    }];
    const pages = extractPages(await service.generate(44));
    expect(pages.length).toBeGreaterThanOrEqual(3);
    const tablePages = pages.filter(page => page.text.includes('Opis montażu'));
    tablePages.forEach(page => expect(page.text).toContain('Materiał'));
    expect(pages.map(page => page.text).join(' ')).toContain('KONIEC UWAG');
    expect(pages.map(page => page.text).join(' ')).toContain('Przewód');
  });

  it('embeds full FontFile2 programs instead of subsets', async () => {
    const { service } = fixture();
    const document = await PDFDocument.load(await service.generate(44));
    const descriptors = document.context.enumerateIndirectObjects()
      .map(([, object]) => object)
      .filter((object): object is PDFDict => object instanceof PDFDict &&
        object.get(PDFName.of('Type'))?.toString() === '/FontDescriptor');
    const fontSizes = descriptors.flatMap(descriptor => {
      const reference = descriptor.get(PDFName.of('FontFile2'));
      if (!reference) return [];
      const stream = document.context.lookup(reference);
      if (!(stream instanceof PDFRawStream)) return [];
      const contents = Buffer.from(stream.getContents());
      const filter = stream.dict.get(PDFName.of('Filter'))?.toString();
      return [filter === '/FlateDecode' ? inflateSync(contents).length : contents.length];
    });

    expect(fontSizes.length).toBeGreaterThan(0);
    expect(fontSizes.every(size => size > 500_000)).toBe(true);
  });

  it('prints partial BOM installation as a warning', async () => {
    const { service, fields, values } = fixture();
    fields[1].fieldType = 'BOM_TABLE';
    values[1].value = [{
      bomItemId: 31, name: 'Kamera', unit: 'szt.', plannedQty: 3,
      installedQty: 1, installed: false, note: '',
    }];

    const [page] = extractPages(await service.generate(44));
    expect(page.text).toContain('Ostrzeżenie: częściowy montaż');
  });

  it('respects visibility conditions and prints rejected approval details', async () => {
    const { service, fields, approvals } = fixture();
    fields[1].conditions = { visibleWhen: { field: 'result', operator: 'equals', value: 'PASS' } };
    approvals.push(Object.assign(new FormApproval(), {
      decidedById: 7, decidedAt: new Date(), decision: FormApprovalDecision.REJECTED, comment: 'Poprawić',
    }));
    const [page] = extractPages(await service.generate(44));
    expect(page.text).not.toContain('Uwagi');
    expect(page.text).toContain('Decyzja: Odrzucono');
    expect(page.text).toContain('PROJEKT');
  });

  it('checks the access guard within the locked snapshot transaction and does not render unauthorized forms', async () => {
    const { service, transaction } = fixture();
    const guard = jest.fn().mockRejectedValue(new FormDomainError('INSTANCE_NOT_FOUND', 'Denied'));
    await expect(service.generate(44, guard)).rejects.toMatchObject({ code: 'INSTANCE_NOT_FOUND' });
    expect(guard).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ id: 44 }));
    expect(transaction).toHaveBeenCalledWith('REPEATABLE READ', expect.any(Function));
    expect(FormDataSourceResolver.prototype.resolve).not.toHaveBeenCalled();
  });

  it('rejects missing instances and missing versions', async () => {
    const first = fixture();
    first.repositories.set(FormInstance, { findOne: async () => null });
    await expect(first.service.generate(44)).rejects.toMatchObject({ code: 'INSTANCE_NOT_FOUND' });
    const second = fixture();
    second.repositories.set(FormTemplateVersion, { findOne: async () => null });
    await expect(second.service.generate(44)).rejects.toMatchObject({ code: 'VERSION_NOT_FOUND' });
  });

  it('embeds the first PDF page as header and footer strips on every output page', async () => {
    const previous = process.env.UPLOAD_DIR;
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'form-pdf-'));
    process.env.UPLOAD_DIR = root;
    try {
      const source = await PDFDocument.create();
      const font = await source.embedFont(StandardFonts.Helvetica);
      const page = source.addPage([595.28, 841.89]);
      page.drawText('LETTERHEAD', { x: 42, y: 810, size: 10, font });
      page.drawText('LETTERFOOT', { x: 42, y: 20, size: 10, font });
      source.addPage().drawText('SECOND PAGE MUST NOT APPEAR', { font });
      const filePath = 'forms/branding/library/12345678-1234-4234-9234-123456789abc.pdf';
      await fs.mkdir(path.dirname(path.join(root, filePath)), { recursive: true });
      await fs.writeFile(path.join(root, filePath), await source.save());
      const { service, version, values } = fixture();
      for (const branding of [version.headerSnapshot, version.footerSnapshot]) {
        if (!branding) throw new Error('Missing test snapshot');
        branding.mode = 'FILE';
        branding.filePath = filePath;
        branding.fileMime = 'application/pdf';
        branding.layout = null;
      }
      values[1].value = 'Treść\n'.repeat(100);
      const pages = extractPages(await service.generate(44));
      expect(pages.length).toBeGreaterThanOrEqual(3);
      pages.forEach(output => {
        expect(output.text).toContain('LETTERHEAD');
        expect(output.text).toContain('LETTERFOOT');
        expect(output.text).not.toContain('SECOND PAGE MUST NOT APPEAR');
      });
    } finally {
      if (previous === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = previous;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it('embeds PNG letterhead and JPEG custom logos', async () => {
    const previous = process.env.UPLOAD_DIR;
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'form-pdf-images-'));
    process.env.UPLOAD_DIR = root;
    try {
      const pngPath = 'forms/branding/library/12345678-1234-4234-9234-123456789abc.png';
      const logoPath = 'forms/branding/assets/12345678-1234-4234-9234-123456789abc.jpg';
      await fs.mkdir(path.dirname(path.join(root, pngPath)), { recursive: true });
      await fs.mkdir(path.dirname(path.join(root, logoPath)), { recursive: true });
      const image = sharp({ create: { width: 100, height: 20, channels: 3, background: '#ff0000' } });
      await fs.writeFile(path.join(root, pngPath), await image.clone().png().toBuffer());
      await fs.writeFile(path.join(root, logoPath), await image.clone().jpeg().toBuffer());
      const { service, version } = fixture();
      if (!version.headerSnapshot || !version.footerSnapshot) throw new Error('Missing test snapshot');
      version.headerSnapshot = {
        ...version.headerSnapshot, mode: 'FILE', filePath: pngPath, fileMime: 'image/png', layout: null,
      };
      version.footerSnapshot.layout = {
        columns: { left: [{ type: 'logo', assetPath: logoPath, alt: 'Logo' }], center: [], right: [] },
        separator: false,
      };
      const pdf = await PDFDocument.load(await service.generate(44));
      expect(pdf.getPageCount()).toBe(1);
      expect(pdf.context.enumerateIndirectObjects().filter(([, object]) =>
        object.toString().includes('/Subtype /Image')).length).toBeGreaterThanOrEqual(2);
    } finally {
      if (previous === undefined) delete process.env.UPLOAD_DIR;
      else process.env.UPLOAD_DIR = previous;
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
