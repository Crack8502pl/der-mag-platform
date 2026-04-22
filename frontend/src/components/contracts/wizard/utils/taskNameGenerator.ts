// src/components/contracts/wizard/utils/taskNameGenerator.ts
// Real-time task name generation based on filled fields

import type { TaskDetail } from '../types/wizard.types';

/**
 * Generate task name in real-time based on filled fields.
 * The `nazwa` field is read-only and auto-generated from these fields.
 */
export const generateTaskName = (
  taskType: string,
  detail: TaskDetail,
  liniaKolejowa?: string
): string => {
  const lk = detail.liniaKolejowa || liniaKolejowa || '';
  const prefix = lk ? `${lk} | ` : '';

  switch (taskType) {
    case 'PRZEJAZD_KAT_A':
    case 'PRZEJAZD_KAT_B':
      if (!detail.kilometraz || !detail.kategoria) {
        return `${prefix}(Brak danych)`;
      }
      return `${prefix}${detail.kilometraz} | ${detail.kategoria}`;

    case 'SKP':
      if (!detail.kilometraz) {
        return `${prefix}SKP (Brak kilometrażu)`;
      }
      return `${prefix}${detail.kilometraz} | SKP`;

    case 'NASTAWNIA': {
      const parts: string[] = [];
      if (detail.kilometraz) parts.push(detail.kilometraz);
      parts.push('ND');
      if (detail.nazwaNastawnii) parts.push(detail.nazwaNastawnii);
      if (detail.miejscowosc) parts.push(detail.miejscowosc);
      return `${prefix}${parts.join(' | ')}`;
    }

    case 'LCS': {
      const parts: string[] = [];
      if (detail.kilometraz) parts.push(detail.kilometraz);
      parts.push('LCS');
      if (detail.nazwaLCS) parts.push(detail.nazwaLCS);
      if (detail.miejscowosc) parts.push(detail.miejscowosc);
      return `${prefix}${parts.join(' | ')}`;
    }

    case 'CUID': {
      const parts: string[] = ['CUID'];
      if (detail.nazwaLCS) parts.push(detail.nazwaLCS);
      if (detail.miejscowosc) parts.push(detail.miejscowosc);
      return lk ? `${lk} | ${parts.join(' | ')}` : parts.join(' | ');
    }

    default:
      return detail.nazwa || taskType;
  }
};
