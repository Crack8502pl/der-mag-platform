const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const LIKE_SPECIAL_CHARS = /[\\%_]/g;

export const safeLike = (value: string): string =>
  `%${value.replace(LIKE_SPECIAL_CHARS, '\\$&')}%`;

export const assertSafeIdentifier = (value: string): string => {
  if (!SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new Error('Unsafe SQL identifier');
  }

  return value;
};
