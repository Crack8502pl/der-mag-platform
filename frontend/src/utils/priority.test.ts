// src/utils/priority.test.ts
import { getPriorityDisplay } from './priority';

describe('getPriorityDisplay', () => {
  it('priority 0 → "⚪ Brak znaczenia"', () => {
    expect(getPriorityDisplay(0)).toBe('⚪ Brak znaczenia');
  });

  it('priority 1 → "💤 Znikomy"', () => {
    expect(getPriorityDisplay(1)).toBe('💤 Znikomy');
  });

  it('priority 2 → "⬇️ Bardzo niski"', () => {
    expect(getPriorityDisplay(2)).toBe('⬇️ Bardzo niski');
  });

  it('priority 3 → "🕓 Niski"', () => {
    expect(getPriorityDisplay(3)).toBe('🕓 Niski');
  });

  it('priority 4 → "📎 Lekki"', () => {
    expect(getPriorityDisplay(4)).toBe('📎 Lekki');
  });

  it('priority 5 → "⚖️ Normalny"', () => {
    expect(getPriorityDisplay(5)).toBe('⚖️ Normalny');
  });

  it('priority 6 → "📌 Podwyższony"', () => {
    expect(getPriorityDisplay(6)).toBe('📌 Podwyższony');
  });

  it('priority 7 → "⚠️ Wysoki"', () => {
    expect(getPriorityDisplay(7)).toBe('⚠️ Wysoki');
  });

  it('priority 8 → "🔥 Bardzo wysoki"', () => {
    expect(getPriorityDisplay(8)).toBe('🔥 Bardzo wysoki');
  });

  it('priority 9 → "🚨 Krytyczny"', () => {
    expect(getPriorityDisplay(9)).toBe('🚨 Krytyczny');
  });

  it('priority 10 → "💣 Natychmiastowy"', () => {
    expect(getPriorityDisplay(10)).toBe('💣 Natychmiastowy');
  });

  it('nieznana wartość numeryczna → "⚖️ {n}"', () => {
    expect(getPriorityDisplay(42)).toBe('⚖️ 42');
  });

  it('priority undefined → "⚖️ Normalny"', () => {
    expect(getPriorityDisplay(undefined)).toBe('⚖️ Normalny');
  });

  it('obejmuje wszystkie wartości 0-10', () => {
    for (let i = 0; i <= 10; i++) {
      const result = getPriorityDisplay(i);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
