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

export const normalizeTaskData = (
  task: TaskDetail,
  index: number,
  liniaKolejowa?: string
): NormalizedTaskData => {
  const stableId = task.taskWizardId || task.id?.toString() || `task-${index}`;

  const formattedKilometraz = task.kilometraz
    ? formatKilometrazDisplay(task.kilometraz)
    : undefined;
  const kilometrazNumeric = task.kilometraz
    ? parseWizardKilometraz(task.kilometraz)
    : undefined;

  const normalizedTask: TaskDetail = formattedKilometraz
    ? { ...task, kilometraz: formattedKilometraz }
    : task;

  const label = generateTaskName(task.taskType, normalizedTask, liniaKolejowa);

  return {
    id: stableId,
    label,
    kilometraz: formattedKilometraz,
    kilometrazNumeric,
    type: task.taskType,
    isExisting: !!task.id,
  };
};
