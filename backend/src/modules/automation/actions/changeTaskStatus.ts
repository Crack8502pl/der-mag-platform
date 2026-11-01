// Klocek: zmień status zadania.

import { AppDataSource } from '../../../config/database';
import { Task } from '../../../entities/Task';
import { TaskService } from '../../../services/TaskService';
import type { AutomationAction } from '../contracts';

/** Statusy zadań występujące w systemie (por. TaskSyncService). */
export const TASK_STATUS_OPTIONS = [
  { value: 'created', label: 'Utworzone' },
  { value: 'assigned', label: 'Przypisane' },
  { value: 'in_progress', label: 'W realizacji' },
  { value: 'configured', label: 'Skonfigurowane' },
  { value: 'ready_for_completion', label: 'Gotowe do kompletacji' },
  { value: 'completed', label: 'Zakończone' },
  { value: 'cancelled', label: 'Anulowane' },
];

export const changeTaskStatusAction: AutomationAction = {
  key: 'change_task_status',
  label: 'Zmień status zadania',
  description: 'Ustawia wybrany status zadania, którego dotyczy zdarzenie.',
  category: 'Zadania',
  params: [
    { key: 'status', label: 'Nowy status', type: 'select', required: true, options: TASK_STATUS_OPTIONS },
  ],
  requiredPermission: { module: 'tasks', action: 'update' },
  supportsDryRun: true,
  async run(ctx, params, { dryRun }) {
    if (ctx.taskId == null) {
      return { status: 'SKIPPED', message: 'Zdarzenie nie dotyczy zadania – status nie został zmieniony.', output: {} };
    }
    const task = await AppDataSource.getRepository(Task).findOne({ where: { id: ctx.taskId } });
    if (!task) return { status: 'FAILED', message: 'Nie znaleziono zadania.', output: {} };
    const target = String(params.status);
    const output = { taskNumber: task.taskNumber, from: task.status, to: target };
    if (task.status === target) {
      return { status: 'SKIPPED', message: `Zadanie ${task.taskNumber} ma już ten status.`, output };
    }
    if (dryRun) {
      return { status: 'OK', message: `Tryb testowy: status zadania ${task.taskNumber} zmieniłby się na „${target}”.`, output };
    }
    const userId = ctx.chainAuthorId ?? ctx.actorId;
    if (userId == null) return { status: 'FAILED', message: 'Brak autora zmiany statusu.', output };
    await TaskService.updateTaskStatus(task.taskNumber, target, userId);
    return { status: 'OK', message: `Zmieniono status zadania ${task.taskNumber} na „${target}”.`, output };
  },
};
