// src/utils/pluralization.ts
// Polish pluralization helpers

export const pluralize = (count: number, singular: string, few: string, many: string): string => {
  if (count === 1) {
    return singular;
  }
  
  if (count >= 2 && count <= 4) {
    return few;
  }
  
  return many;
};

export const pluralizeTemplates = (count: number): string => {
  return pluralize(count, 'szablon', 'szablony', 'szablonów');
};
