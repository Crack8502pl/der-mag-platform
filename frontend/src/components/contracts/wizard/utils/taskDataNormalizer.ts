import type { TaskDetail } from '../types/wizard.types';
import { parseWizardKilometraz } from './fiberTaskUtils';
import { formatKilometrazDisplay } from './validation';

export interface NormalizedTaskData {
  id: string;
  label: string;
  kilometraz?: string;
  kilometrazNumeric?: number;
  type: TaskDetail['taskType'];
  isExisting: boolean;
}

export const normalizeTaskData = (
  task: TaskDetail,
  index: number,
  liniaKolejowa?: string
): NormalizedTaskData => {
  const stableId = task.taskWizardId || task.id?.toString() || `task-${index}`;

  let formattedKilometraz: string | undefined;
  let kilometrazNumeric: number | undefined;

  if (task.kilometraz) {
    kilometrazNumeric = parseWizardKilometraz(task.kilometraz);
    formattedKilometraz = formatKilometrazDisplay(task.kilometraz);
  }

  const label = generateTaskLabel(task, formattedKilometraz, liniaKolejowa);

  return {
    id: stableId,
    label,
    kilometraz: formattedKilometraz,
    kilometrazNumeric,
    type: task.taskType,
    isExisting: !!task.id,
  };
};

const generateTaskLabel = (
  task: TaskDetail,
  formattedKm?: string,
  liniaKolejowa?: string
): string => {
  const lk = task.liniaKolejowa || liniaKolejowa || '';
  const prefix = lk ? `${lk} | ` : '';

  switch (task.taskType) {
    case 'PRZEJAZD_KAT_A':
    case 'PRZEJAZD_KAT_B':
      if (!formattedKm || !task.kategoria) {
        return `${prefix}(Brak danych)`;
      }
      return `${prefix}${formattedKm} | ${task.kategoria}`;

    case 'SKP':
      if (!formattedKm) {
        return `${prefix}SKP (brak kilometrażu)`;
      }
      return `${prefix}SKP ${formattedKm}`;

    case 'NASTAWNIA':
      return `${prefix}${task.miejscowosc || task.nazwa || 'Nastawnia'}`;

    case 'LCS':
      return `${prefix}${task.miejscowosc || task.nazwa || 'LCS'}`;

    case 'CUID':
      return `${prefix}CUID ${task.miejscowosc || task.nazwa || ''}`.trim();

    default:
      return task.nazwa || task.taskType || 'Zadanie';
  }
};
