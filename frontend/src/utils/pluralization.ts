// src/utils/pluralization.ts
// Polish pluralization helpers

export const pluralize = (count: number, singular: string, few: string, many: string): string => {
  if (count === 1) {
    return singular;
  }

  const abs = Math.abs(count);
  const lastTwo = abs % 100;
  const lastOne = abs % 10;

  // Numbers ending in 12-14 always use "many" (wiele)
  if (lastTwo >= 12 && lastTwo <= 14) {
    return many;
  }

  // Numbers ending in 2-4 use "few" (kilka)
  if (lastOne >= 2 && lastOne <= 4) {
    return few;
  }

  return many;
};

export const pluralizeTemplates = (count: number): string => {
  return pluralize(count, 'szablon', 'szablony', 'szablonów');
};
