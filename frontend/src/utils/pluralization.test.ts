// src/utils/pluralization.test.ts
import { pluralize, pluralizeTemplates } from './pluralization';

describe('pluralize', () => {
  it('count === 1 → singular', () => {
    expect(pluralize(1, 'szablon', 'szablony', 'szablonów')).toBe('szablon');
  });

  it('count === 2 → few', () => {
    expect(pluralize(2, 'szablon', 'szablony', 'szablonów')).toBe('szablony');
  });

  it('count === 3 → few', () => {
    expect(pluralize(3, 'szablon', 'szablony', 'szablonów')).toBe('szablony');
  });

  it('count === 4 → few', () => {
    expect(pluralize(4, 'szablon', 'szablony', 'szablonów')).toBe('szablony');
  });

  it('count === 0 → many', () => {
    expect(pluralize(0, 'szablon', 'szablony', 'szablonów')).toBe('szablonów');
  });

  it('count === 5 → many', () => {
    expect(pluralize(5, 'szablon', 'szablony', 'szablonów')).toBe('szablonów');
  });

  it('count === 10 → many', () => {
    expect(pluralize(10, 'szablon', 'szablony', 'szablonów')).toBe('szablonów');
  });

  it('count === 21 → many (końcówka 1, ale nie 1)', () => {
    expect(pluralize(21, 'szablon', 'szablony', 'szablonów')).toBe('szablonów');
  });

  it('polskie wartości graniczne: 12 → many', () => {
    expect(pluralize(12, 'szablon', 'szablony', 'szablonów')).toBe('szablonów');
  });

  it('polskie wartości graniczne: 13 → many', () => {
    expect(pluralize(13, 'szablon', 'szablony', 'szablonów')).toBe('szablonów');
  });

  it('polskie wartości graniczne: 14 → many', () => {
    expect(pluralize(14, 'szablon', 'szablony', 'szablonów')).toBe('szablonów');
  });

  it('polskie wartości graniczne: 22 → few', () => {
    expect(pluralize(22, 'szablon', 'szablony', 'szablonów')).toBe('szablony');
  });

  it('polskie wartości graniczne: 23 → few', () => {
    expect(pluralize(23, 'szablon', 'szablony', 'szablonów')).toBe('szablony');
  });

  it('polskie wartości graniczne: 24 → few', () => {
    expect(pluralize(24, 'szablon', 'szablony', 'szablonów')).toBe('szablony');
  });

  it('obsługuje inne formy (elementy)', () => {
    expect(pluralize(1, 'element', 'elementy', 'elementów')).toBe('element');
    expect(pluralize(3, 'element', 'elementy', 'elementów')).toBe('elementy');
    expect(pluralize(11, 'element', 'elementy', 'elementów')).toBe('elementów');
  });
});

describe('pluralizeTemplates', () => {
  it('pluralizeTemplates(1) → "szablon"', () => {
    expect(pluralizeTemplates(1)).toBe('szablon');
  });

  it('pluralizeTemplates(3) → "szablony"', () => {
    expect(pluralizeTemplates(3)).toBe('szablony');
  });

  it('pluralizeTemplates(5) → "szablonów"', () => {
    expect(pluralizeTemplates(5)).toBe('szablonów');
  });
});
