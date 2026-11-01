// R8 – Nagłówki i stopki: upload logo PNG, stopka z pliku PDF; plik tekstowy udający PNG odrzucony.
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { expectStatus, loginAdmin, TINY_PNG, unique } from './helpers';

const fileForm = (content: Buffer | Uint8Array, fileName: string, type: string, fields: Record<string, string> = {}) => {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  form.append('file', new Blob([Uint8Array.from(content)], { type }), fileName);
  return form;
};

async function footerPdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const page = document.addPage([595.28, 60]);
  page.drawText('Stopka z pliku PDF', { x: 40, y: 25, size: 10, font: await document.embedFont(StandardFonts.Helvetica) });
  return document.save();
}

describe('R8: nagłówki i stopki', () => {
  it('upload logo PNG i nagłówek z tym logo', async () => {
    const admin = await loginAdmin();
    const logo = expectStatus(await admin.request('POST', '/api/forms/branding/logos', { form: fileForm(TINY_PNG, 'logo.png', 'image/png') }),
      201, 'POST /api/forms/branding/logos').data;
    expect(logo.fileMime).toBe('image/png');
    expect(logo.assetPath).toMatch(/^forms\/branding\/assets\/.+\.png$/);

    const file = await admin.get(`/api/forms/branding/logos/${logo.fileName}`);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toContain('image/png');

    const header = expectStatus(await admin.post('/api/forms/branding', {
      name: unique('Nagłówek z logo'), kind: 'HEADER', mode: 'CUSTOM', heightMm: 20, isDefault: false,
      layout: { columns: { left: [{ type: 'logo', assetPath: logo.assetPath, alt: 'Logo' }], center: [], right: [] }, separator: false },
    }), 201, 'POST /api/forms/branding (nagłówek z logo)').data;
    expect(header.layout.columns.left[0].assetPath).toBe(logo.assetPath);
  });

  it('stopka z pliku PDF', async () => {
    const admin = await loginAdmin();
    const footer = expectStatus(await admin.request('POST', '/api/forms/branding', {
      form: fileForm(await footerPdf(), 'stopka.pdf', 'application/pdf', {
        name: unique('Stopka PDF'), kind: 'FOOTER', mode: 'FILE', heightMm: '15', isDefault: 'false',
      }),
    }), 201, 'POST /api/forms/branding (stopka PDF)').data;
    expect(footer.fileMime).toBe('application/pdf');

    const file = await admin.get(`/api/forms/branding/${footer.id}/file`);
    expect(file.status).toBe(200);
    expect(file.raw.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('plik tekstowy udający PNG jest odrzucony', async () => {
    const admin = await loginAdmin();
    const fake = Buffer.from('To nie jest obraz PNG, tylko zwykły tekst.\n', 'utf8');
    const logo = await admin.request('POST', '/api/forms/branding/logos', { form: fileForm(fake, 'logo.png', 'image/png') });
    expect(logo.status).toBe(400);

    const branding = await admin.request('POST', '/api/forms/branding', {
      form: fileForm(fake, 'naglowek.png', 'image/png', {
        name: unique('Fałszywy PNG'), kind: 'HEADER', mode: 'FILE', heightMm: '15', isDefault: 'false',
      }),
    });
    expect(branding.status).toBe(400);
  });
});
