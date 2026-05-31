const SAFE_IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const LIKE_SPECIAL_CHARS = /[\\%_]/g;

/**
 * Escapes LIKE wildcard characters and wraps the value in `%...%` for substring search.
 * Use with `... LIKE :param ESCAPE '\\'` or `... ILIKE :param ESCAPE '\\'`.
 */
export const safeLike = (value: string): string =>
  `%${value.replace(LIKE_SPECIAL_CHARS, '\\$&')}%`;

/**
 * Allows only simple SQL identifiers such as table or column names.
 * Rejects metacharacters and identifiers that do not start with a letter or underscore.
 */
export const assertSafeIdentifier = (value: string): string => {
  if (!SAFE_IDENTIFIER_PATTERN.test(value)) {
    throw new Error('Unsafe SQL identifier');
  }

  return value;
};
