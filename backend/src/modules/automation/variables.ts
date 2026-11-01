// src/modules/automation/variables.ts
// Zmienne w polach tekstowych: {task.number}, {contract.number}, {user.name} itd.
// Dozwolone są wyłącznie źródła danych z FormDataSourceResolver / variable-engine (formDataSources.ts).

import type { EntityManager } from 'typeorm';
import { getFormDataSource } from '../variable-engine/formDataSources';
import { FormDataSourceResolver } from '../../services/FormDataSourceResolver';
import type { AutomationContext } from './contracts';

const VARIABLE_PATTERN = /\{([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+)\}/g;

export function extractVariables(text: string): string[] {
  return [...new Set([...text.matchAll(VARIABLE_PATTERN)].map(match => match[1]))];
}

/** Zwraca listę nieznanych zmiennych użytych w tekście. */
export function findUnknownVariables(text: string): string[] {
  return extractVariables(text).filter(variable => !getFormDataSource(variable));
}

/** Zastępuje zmienne wartościami z przedmiotu zdarzenia; brak wartości = pusty tekst. */
export async function renderVariables(text: string, ctx: AutomationContext, manager: EntityManager): Promise<string> {
  const variables = extractVariables(text);
  if (!variables.length) return text;
  const resolver = new FormDataSourceResolver(manager);
  const values = new Map<string, string>();
  for (const variable of variables) {
    const value = await resolver.resolve(variable, {
      taskId: ctx.taskId,
      contractId: ctx.contractId,
      userId: ctx.actorId,
    });
    values.set(variable, value === null || value === undefined ? '' : String(value));
  }
  return text.replace(VARIABLE_PATTERN, (_match, variable: string) => values.get(variable) ?? '');
}
