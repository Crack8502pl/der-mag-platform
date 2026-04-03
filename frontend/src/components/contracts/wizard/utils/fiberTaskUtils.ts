// src/components/contracts/wizard/utils/fiberTaskUtils.ts
// Shared utilities for mapping wizard task data to fiber endpoint shapes.

import type { TaskDetail } from '../types/wizard.types';
import type { FiberEndpoint } from '../../../../types/fiber.types';

/**
 * Parse a wizard kilometraż string in "XXX,XXX" format (e.g. "123,456") to a
 * numeric km value (e.g. 123.456). Returns undefined for falsy / non-numeric input.
 */
export const parseWizardKilometraz = (value?: string): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Map a wizard TaskDetail to the availableEndpoints shape expected by WizardFiberModal.
 * Handles comma-separated kilometraż and guards against non-numeric GPS values.
 */
export const taskDetailToAvailableEndpoint = (d: TaskDetail): {
  nazwa: string;
  typ: FiberEndpoint['typ'];
  kilometraz?: number;
  gps?: { lat: number; lng: number };
} => {
  const parsedKilometraz = parseWizardKilometraz(d.kilometraz);
  const latitude = d.gpsLatitude ? Number(d.gpsLatitude) : undefined;
  const longitude = d.gpsLongitude ? Number(d.gpsLongitude) : undefined;

  return {
    nazwa: d.nazwa || (d.kilometraz ? `km ${d.kilometraz}` : d.taskType),
    typ: (d.taskType === 'NASTAWNIA' ? 'NASTAWNIA'
      : d.taskType === 'SKP' ? 'SKP'
      : d.taskType?.includes('PRZEJAZD') ? 'PRZEJAZD'
      : 'LCS') as FiberEndpoint['typ'],
    kilometraz: parsedKilometraz,
    gps: Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { lat: latitude as number, lng: longitude as number }
      : undefined,
  };
};
