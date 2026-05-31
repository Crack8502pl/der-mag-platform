import { assertSafeIdentifier, safeLike } from '../../../src/utils/queryBuilder';

describe('queryBuilder utils', () => {
  describe('safeLike', () => {
    it('returns wrapped text for normal input', () => {
      expect(safeLike('normal text')).toBe('%normal text%');
    });

    it('escapes percent characters', () => {
      expect(safeLike('50%')).toBe('%50\\%%');
    });

    it('escapes underscore characters', () => {
      expect(safeLike('_test_')).toBe('%\\_test\\_%');
    });

    it('treats SQL punctuation as plain LIKE text', () => {
      expect(safeLike("'; DROP TABLE")).toBe("%'; DROP TABLE%");
    });
  });

  describe('assertSafeIdentifier', () => {
    it('allows plain identifiers', () => {
      expect(assertSafeIdentifier('users')).toBe('users');
    });

    it('allows snake_case identifiers', () => {
      expect(assertSafeIdentifier('column_name')).toBe('column_name');
    });

    it('rejects SQL metacharacters', () => {
      expect(() => assertSafeIdentifier('users; DROP TABLE')).toThrow('Unsafe SQL identifier');
    });

    it('rejects identifiers starting with digits', () => {
      expect(() => assertSafeIdentifier('123abc')).toThrow('Unsafe SQL identifier');
    });

    it('rejects empty identifiers', () => {
      expect(() => assertSafeIdentifier('')).toThrow('Unsafe SQL identifier');
    });
  });
});
