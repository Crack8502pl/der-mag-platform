import type { TaskDetail } from '../types/wizard.types';
import { parseWizardKilometraz } from './fiberTaskUtils';
import { formatKilometrazDisplay } from './validation';
import { generateTaskName } from './taskNameGenerator';

export interface NormalizedTaskData {
  id: string;
  label: string;
  kilometraz?: string;
  kilometrazNumeric?: number;
  type: TaskDetail['taskType'];
  isExisting: boolean;
}

const generateTaskLabel = (
  task: TaskDetail,
  liniaKolejowa?: string
): string => {
  const generated = generateTaskName(task.taskType, task, liniaKolejowa);
  if (generated && generated.trim().length > 0) {
    return generated;
  }
  return task.nazwa || task.taskType || 'Zadanie';
};

export const normalizeTaskData = (
  task: TaskDetail,
  index: number,
  liniaKolejowa?: string
): NormalizedTaskData => {
  const stableId = task.taskWizardId || (task.id !== undefined ? String(task.id) : `task-${index}`);

  let formattedKilometraz: string | undefined;
  let kilometrazNumeric: number | undefined;

  if (task.kilometraz) {
    formattedKilometraz = formatKilometrazDisplay(task.kilometraz);
    kilometrazNumeric = parseWizardKilometraz(task.kilometraz);
  }

  const taskForLabel = formattedKilometraz
    ? { ...task, kilometraz: formattedKilometraz }
    : task;
  const label = generateTaskLabel(taskForLabel, liniaKolejowa);

  return {
    id: stableId,
    label,
    kilometraz: formattedKilometraz,
    kilometrazNumeric,
    type: task.taskType,
    isExisting: !!task.id,
  };
};
