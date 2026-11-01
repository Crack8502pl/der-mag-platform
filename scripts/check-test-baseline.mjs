#!/usr/bin/env node
// R10: liczba testów backendu i frontendu nie maleje (docs/etap-2/REGRESJA.md).
// Użycie:
//   node scripts/check-test-baseline.mjs --backend <jest.json> --frontend <vitest.json> [--base-ref <git ref>]
// Raporty pochodzą z `jest --json --outputFile=…` i `vitest run --reporter=json --outputFile=…`.
// Wzorzec: backend/tests/regression/baseline.json (pola backendTests, frontendTests).
// Z --base-ref sprawdzamy też, że baseline.json zmienia się tylko w górę względem wskazanej gałęzi.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = 'backend/tests/regression/baseline.json';
const monotonicKeys = ['backendTests', 'frontendTests', 'pdfDarkPixelRatioMin'];

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

const backendReport = argument('--backend');
const frontendReport = argument('--frontend');
const baseRef = argument('--base-ref');
if (!backendReport || !frontendReport) {
  console.error('Podaj raporty: --backend <jest.json> --frontend <vitest.json>');
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(join(root, baselinePath), 'utf8'));
const failures = [];

for (const [label, file, key] of [
  ['backend', backendReport, 'backendTests'],
  ['frontend', frontendReport, 'frontendTests'],
]) {
  const report = JSON.parse(readFileSync(resolve(file), 'utf8'));
  const total = report.numTotalTests;
  const failed = report.numFailedTests;
  const expected = baseline[key];
  if (!Number.isInteger(total) || !Number.isInteger(expected)) {
    failures.push(`${label}: brak liczby testów w raporcie lub w ${baselinePath} (${key}).`);
    continue;
  }
  console.log(`Testy ${label}: ${total} (wzorzec: ${expected}), nieudane: ${failed}.`);
  if (failed > 0) failures.push(`${label}: ${failed} nieudanych testów.`);
  if (total < expected) failures.push(`${label}: ubyło testów – ${total} < ${expected}.`);
  if (total > expected) {
    console.log(`  Przybyło testów ${label} (${total - expected}). Możesz podnieść ${key} w ${baselinePath}.`);
  }
}

if (baseRef) {
  let previous = null;
  try {
    previous = JSON.parse(execFileSync('git', ['show', `${baseRef}:${baselinePath}`], {
      cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }));
  } catch {
    console.log(`Brak ${baselinePath} w ${baseRef} – pomijam sprawdzenie zmian wzorca.`);
  }
  if (previous) {
    for (const key of monotonicKeys) {
      if (typeof previous[key] === 'number' && !(baseline[key] >= previous[key])) {
        failures.push(`${baselinePath}: ${key} obniżono z ${previous[key]} do ${baseline[key]} – wolno tylko w górę.`);
      }
    }
  }
}

if (failures.length) {
  for (const failure of failures) console.error(`BŁĄD: ${failure}`);
  process.exit(1);
}
console.log('R10: liczba testów nie zmalała.');
