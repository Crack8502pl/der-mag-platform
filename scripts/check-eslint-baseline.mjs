#!/usr/bin/env node
// R9: liczba błędów ESLint frontendu nie może rosnąć (docs/etap-2/REGRESJA.md).
// Porównuje bieżącą liczbę błędów z frontend/.eslint-baseline:
//   więcej  → błąd (napraw nowe błędy),
//   mniej   → błąd z prośbą o zapisanie nowej, niższej liczby w tym samym PR
//             (`node scripts/check-eslint-baseline.mjs --update`),
//   równo   → OK.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = join(root, 'frontend');
const baselineFile = join(frontend, '.eslint-baseline');
const update = process.argv.includes('--update');

const workdir = mkdtempSync(join(tmpdir(), 'eslint-baseline-'));
const report = join(workdir, 'eslint.json');
try {
  const result = spawnSync('npx', ['--no-install', 'eslint', '.', '--format', 'json', '--output-file', report], {
    cwd: frontend,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  // ESLint: 0 = brak błędów, 1 = są błędy lintowania, 2 = błąd konfiguracji lub uruchomienia.
  if (result.error || (result.status !== 0 && result.status !== 1)) {
    console.error('Nie udało się uruchomić ESLint we frontendzie.', result.error ?? `kod wyjścia ${result.status}`);
    process.exit(2);
  }

  const files = JSON.parse(readFileSync(report, 'utf8'));
  const errors = files.reduce((sum, file) => sum + file.errorCount, 0);

  if (update) {
    writeFileSync(baselineFile, `${errors}\n`);
    console.log(`Zapisano ${errors} jako liczbę błędów ESLint w frontend/.eslint-baseline.`);
    process.exit(0);
  }

  const baseline = Number.parseInt(readFileSync(baselineFile, 'utf8').trim(), 10);
  if (!Number.isInteger(baseline) || baseline < 0) {
    console.error('Plik frontend/.eslint-baseline musi zawierać jedną nieujemną liczbę całkowitą.');
    process.exit(2);
  }

  console.log(`Błędy ESLint frontendu: ${errors} (wzorzec: ${baseline}).`);
  if (errors > baseline) {
    console.error(`Przybyło błędów ESLint: ${errors - baseline}. Popraw je przed scaleniem PR (cd frontend && npm run lint).`);
    process.exit(1);
  }
  if (errors < baseline) {
    console.error(
      `Ubyło błędów ESLint (${baseline - errors}) – świetnie! Zapisz nową liczbę w tym samym PR: ` +
      'node scripts/check-eslint-baseline.mjs --update',
    );
    process.exit(1);
  }
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
