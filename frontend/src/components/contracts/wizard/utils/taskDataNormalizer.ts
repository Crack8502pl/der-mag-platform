import type { TaskDetail } from '../types/wizard.types';
import { parseWizardKilometraz } from './fiberTaskUtils';
import { generateTaskName } from './taskNameGenerator';
import { formatKilometrazDisplay } from './validation';

export interface NormalizedTaskData {
  id: string;
  label: string;
  kilometrazNumeric?: number;
}

export const normalizeTaskData = (
  task: TaskDetail,
  fallbackIndex: number,
  liniaKolejowa?: string
): NormalizedTaskData => {
  const formattedKilometraz = task.kilometraz ? formatKilometrazDisplay(task.kilometraz) : undefined;
  const normalizedTask = formattedKilometraz ? { ...task, kilometraz: formattedKilometraz } : task;
  const label = generateTaskName(task.taskType, normalizedTask, liniaKolejowa);

  return {
    id: String(task.taskWizardId ?? task.id ?? `task-${fallbackIndex}`),
    label: label || task.nazwa || task.taskType || `Zadanie ${fallbackIndex + 1}`,
    kilometrazNumeric: parseWizardKilometraz(formattedKilometraz ?? task.kilometraz),
  };
};
