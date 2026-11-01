// Klucz funkcji (UPPER_SNAKE_CASE) tworzony z jej nazwy

const POLISH_CHARS: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
};

/** Tworzy klucz funkcji (UPPER_SNAKE_CASE) z jej nazwy. */
export const keyFromName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => POLISH_CHARS[ch] || ch)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/^[0-9_]+/, '')
    .toUpperCase()
    .slice(0, 100);
