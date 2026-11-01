// R7 – PDF formularza: A4, nagłówek i stopka na każdej stronie, „Strona X z Y”, „PROJEKT” przed
// akceptacją, osadzone czcionki, widoczny tekst z polskimi znakami po wyrenderowaniu (pdftoppm + OCR).
// Wymaga poppler-utils oraz tesseract-ocr z językiem pol.
// Pliki PDF i PNG trafiają do REGRESSION_ARTIFACTS_DIR (artefakt CI przy błędzie).
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import sharp from 'sharp';
import baseline from './baseline.json';
import { createFormScenario, expectStatus, FormScenario } from './helpers';

const artifactsDir = path.resolve(process.env.REGRESSION_ARTIFACTS_DIR || path.join(os.tmpdir(), 'regression-artifacts'), 'r07');

// Asynchronicznie: synchroniczne wywołanie blokuje pętlę zdarzeń, a wtedy klient HTTP może użyć
// połączenia keep-alive zamkniętego już przez serwer („other side closed”).
const execFileAsync = promisify(execFile);
// OMP_THREAD_LIMIT=1: wielowątkowy tesseract drastycznie zwalnia przy obciążonym procesorze.
const run = async (command: string, args: string[]): Promise<string> =>
  (await execFileAsync(command, args, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, OMP_THREAD_LIMIT: '1' },
  })).stdout;

async function downloadPdf(scenario: FormScenario, name: string): Promise<string> {
  const response = await scenario.admin.get(`/api/forms/instances/${scenario.instanceId}/pdf`);
  expect(response.status).toBe(200);
  expect(response.headers.get('content-type')).toContain('application/pdf');
  expect(response.raw.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  const file = path.join(artifactsDir, name);
  fs.writeFileSync(file, response.raw);
  return file;
}

async function pageCount(pdf: string): Promise<number> {
  const match = (await run('pdfinfo', [pdf])).match(/^Pages:\s+(\d+)/m);
  if (!match) throw new Error('pdfinfo nie podał liczby stron');
  return Number(match[1]);
}

const pageText = (pdf: string, page: number): Promise<string> =>
  run('pdftotext', ['-raw', '-f', String(page), '-l', String(page), pdf, '-']);

/** Udział ciemnych pikseli (jasność < 128) w górnych 60% obrazu. */
async function darkPixelRatio(png: string): Promise<number> {
  const { data, info } = await sharp(png).greyscale().raw().toBuffer({ resolveWithObject: true });
  const rows = Math.floor(info.height * 0.6);
  let dark = 0;
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels] < 128) dark += 1;
    }
  }
  return dark / (rows * info.width);
}

describe('R7: PDF formularza', () => {
  let scenario: FormScenario;
  let pdf: string;
  let pages: number;

  beforeAll(async () => {
    fs.mkdirSync(artifactsDir, { recursive: true });
    scenario = await createFormScenario();
    pdf = await downloadPdf(scenario, 'formularz.pdf');
    pages = await pageCount(pdf);
  });

  it('GET /api/forms/instances/:id/pdf = 200, A4, kilka stron', async () => {
    expect(pages).toBeGreaterThanOrEqual(2);
    const info = await run('pdfinfo', ['-f', '1', '-l', String(pages), pdf]);
    const sizes = [...info.matchAll(/^Page\s+\d+ size:\s+(.+)$/gm)].map(match => match[1]);
    expect(sizes).toHaveLength(pages);
    for (const size of sizes) expect(size).toMatch(/^595\.\d+ x 841\.\d+ pts \(A4\)/);
  });

  it('nagłówek, stopka, „Strona X z Y” i „PROJEKT” na każdej stronie', async () => {
    for (let page = 1; page <= pages; page += 1) {
      const text = await pageText(pdf, page);
      expect({ page, header: text.includes(scenario.headerText) }).toEqual({ page, header: true });
      expect({ page, footer: text.includes(scenario.footerText) }).toEqual({ page, footer: true });
      expect({ page, number: text.includes(`Strona ${page} z ${pages}`) }).toEqual({ page, number: true });
      expect({ page, draft: text.includes('PROJEKT') }).toEqual({ page, draft: true });
    }
  });

  it('a) pdffonts: każda czcionka jest osadzona (emb = yes)', async () => {
    const rows = (await run('pdffonts', [pdf])).split('\n').slice(2).filter(line => line.trim());
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      // Kolumny od końca: emb sub uni object ID (gen) – nazwa i typ mogą zawierać spacje.
      const columns = row.trim().split(/\s+/);
      expect({ font: columns[0], emb: columns[columns.length - 5] }).toEqual({ font: columns[0], emb: 'yes' });
    }
  });

  it('b) strona 1 w 50 dpi: udział ciemnych pikseli w górnych 60% nie mniejszy niż próg', async () => {
    await run('pdftoppm', ['-r', '50', '-f', '1', '-l', '1', '-singlefile', '-png', pdf, path.join(artifactsDir, 'strona1-50dpi')]);
    const ratio = await darkPixelRatio(path.join(artifactsDir, 'strona1-50dpi.png'));
    fs.writeFileSync(path.join(artifactsDir, 'dark-pixel-ratio.txt'), `${ratio}\n`);
    expect(ratio).toBeGreaterThanOrEqual(baseline.pdfDarkPixelRatioMin);
  });

  it('c) OCR (tesseract, pol) strony 1 w 150 dpi znajduje „Dane zadania” i „Materiały”', async () => {
    await run('pdftoppm', ['-r', '150', '-f', '1', '-l', '1', '-singlefile', '-png', pdf, path.join(artifactsDir, 'strona1-150dpi')]);
    const text = await run('tesseract', [path.join(artifactsDir, 'strona1-150dpi.png'), '-', '-l', 'pol']);
    fs.writeFileSync(path.join(artifactsDir, 'ocr-strona1.txt'), text);
    expect(text).toContain('Dane zadania');
    expect(text).toContain('Materiały');
  }, 120000);

  it('po akceptacji PDF nie ma znaku „PROJEKT”', async () => {
    const { admin, instanceId } = scenario;
    expectStatus(await admin.put(`/api/forms/instances/${instanceId}/values`, { responses: { wynik: 'PASS' } }), 200, 'zapis PASS');
    expectStatus(await admin.post(`/api/forms/instances/${instanceId}/complete`, {}), 200, 'POST /complete');
    expectStatus(await admin.post(`/api/forms/instances/${instanceId}/approve`, {}), 200, 'POST /approve');
    const approved = await downloadPdf(scenario, 'formularz-zaakceptowany.pdf');
    const approvedPages = await pageCount(approved);
    for (let page = 1; page <= approvedPages; page += 1) {
      expect({ page, draft: (await pageText(approved, page)).includes('PROJEKT') }).toEqual({ page, draft: false });
    }
  });
});
