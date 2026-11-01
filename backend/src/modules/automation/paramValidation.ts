// src/modules/automation/paramValidation.ts
// Walidacja parametrów klocka (brak wymaganych, zły typ, nieznana zmienna).

import type { AutomationAction, AutomationParamDefinition, AutomationParams } from './contracts';
import { findUnknownVariables } from './variables';

const MAX_TEXT_LENGTH = 500;
const MAX_LONG_TEXT_LENGTH = 10_000;

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

const isPositiveInteger = (value: unknown): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

function validateValue(param: AutomationParamDefinition, value: unknown): string[] {
  const label = `„${param.label}”`;
  switch (param.type) {
    case 'text':
    case 'longText': {
      if (typeof value !== 'string') return [`Pole ${label} musi być tekstem.`];
      const max = param.type === 'text' ? MAX_TEXT_LENGTH : MAX_LONG_TEXT_LENGTH;
      if (value.length > max) return [`Pole ${label} może mieć maksymalnie ${max} znaków.`];
      return findUnknownVariables(value).map(variable => `Pole ${label} zawiera nieznaną zmienną {${variable}}.`);
    }
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? [] : [`Pole ${label} musi być liczbą.`];
    case 'boolean':
      return typeof value === 'boolean' ? [] : [`Pole ${label} musi być wartością tak/nie.`];
    case 'select':
      if (typeof value !== 'string') return [`Pole ${label} wymaga wyboru z listy.`];
      if (param.options && !param.options.some(option => option.value === value)) {
        return [`Pole ${label}: wybrana wartość nie jest dostępna na liście.`];
      }
      return [];
    case 'user':
    case 'role':
    case 'taskType':
      return isPositiveInteger(value) ? [] : [`Pole ${label} wymaga wyboru pozycji z listy.`];
    case 'functionGroup':
    case 'emailTemplate':
      return typeof value === 'string' && value.trim() !== '' ? [] : [`Pole ${label} wymaga wyboru pozycji z listy.`];
  }
}

/** Zwraca komunikaty PL; pusta lista = parametry poprawne. */
export function validateActionParams(action: AutomationAction, params: unknown): string[] {
  if (typeof params !== 'object' || params === null || Array.isArray(params)) {
    return ['Parametry kroku muszą być obiektem.'];
  }
  const values = params as AutomationParams;
  const errors: string[] = [];
  const known = new Set(action.params.map(param => param.key));
  for (const key of Object.keys(values)) {
    if (!known.has(key)) errors.push(`Nieznany parametr „${key}”.`);
  }
  for (const param of action.params) {
    const value = values[param.key];
    if (isEmpty(value)) {
      if (param.required) errors.push(`Pole „${param.label}” jest wymagane.`);
      continue;
    }
    errors.push(...validateValue(param, value));
  }
  if (!errors.length && action.validate) errors.push(...action.validate(values));
  return errors;
}
