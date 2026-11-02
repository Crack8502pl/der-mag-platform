// src/modules/workflow/keys.ts
// Klucze techniczne (definicji procesu i etapów) tworzone z nazw – użytkownik ich nie wpisuje.

export const DEFINITION_KEY_MAX_LENGTH = 80;
export const STEP_KEY_MAX_LENGTH = 100;

/** „Montaż i odbiór SSP” → „montaz_i_odbior_ssp”. */
export function keyFromName(name: string, fallback: string, maxLength: number): string {
  const key = name
    .replace(/[Łł]/g, letter => (letter === 'Ł' ? 'L' : 'l'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, maxLength)
    .replace(/_+$/g, '');
  return key || fallback;
}

/** Pierwszy wolny klucz: `klucz`, `klucz_2`, `klucz_3`, … (z zachowaniem limitu długości). */
export function uniqueKey(base: string, taken: ReadonlySet<string>, maxLength: number): string {
  if (!taken.has(base)) return base;
  for (let suffix = 2; ; suffix += 1) {
    const ending = `_${suffix}`;
    const candidate = `${base.slice(0, maxLength - ending.length)}${ending}`;
    if (!taken.has(candidate)) return candidate;
  }
}
