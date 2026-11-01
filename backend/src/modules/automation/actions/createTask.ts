// Klocek: utwórz zadanie (z opcjonalnym przypisaniem i terminem w dniach).

import { AppDataSource } from '../../../config/database';
import { Task } from '../../../entities/Task';
import { TaskAssignment } from '../../../entities/TaskAssignment';
import { TaskType } from '../../../entities/TaskType';
import { User } from '../../../entities/User';
import { TaskService } from '../../../services/TaskService';
import type { AutomationAction } from '../contracts';

const DAY_MS = 24 * 60 * 60 * 1000;

function plannedEndDate(dueDays: unknown): string | undefined {
  if (dueDays === undefined || dueDays === null || dueDays === '') return undefined;
  return new Date(Date.now() + Number(dueDays) * DAY_MS).toISOString().slice(0, 10);
}

export const createTaskAction: AutomationAction = {
  key: 'create_task',
  label: 'Utwórz zadanie',
  description: 'Tworzy nowe zadanie wybranego typu, opcjonalnie przypisuje osobę i ustawia termin.',
  category: 'Zadania',
  params: [
    { key: 'taskType', label: 'Typ zadania', type: 'taskType', required: true },
    { key: 'title', label: 'Tytuł', type: 'text', required: true },
    { key: 'assignee', label: 'Przypisz do', type: 'user', required: false },
    { key: 'dueDays', label: 'Termin (liczba dni od dziś)', type: 'number', required: false },
  ],
  requiredPermission: { module: 'tasks', action: 'create' },
  supportsDryRun: true,
  validate(params) {
    return params.dueDays !== undefined && params.dueDays !== null && Number(params.dueDays) < 0
      ? ['Termin nie może być ujemną liczbą dni.']
      : [];
  },
  async run(ctx, params, { dryRun }) {
    const taskType = await AppDataSource.getRepository(TaskType).findOne({ where: { id: Number(params.taskType), active: true } });
    if (!taskType) return { status: 'FAILED', message: 'Wybrany typ zadania nie istnieje lub jest nieaktywny.', output: {} };
    const assigneeId = params.assignee !== undefined && params.assignee !== null ? Number(params.assignee) : null;
    if (assigneeId !== null) {
      const assignee = await AppDataSource.getRepository(User).findOne({ where: { id: assigneeId, active: true } });
      if (!assignee) return { status: 'FAILED', message: 'Wybrana osoba nie istnieje lub jest nieaktywna.', output: {} };
    }
    const title = String(params.title);
    const dueDate = plannedEndDate(params.dueDays);
    const output: Record<string, unknown> = { title, taskType: taskType.name, plannedEndDate: dueDate ?? null };
    if (dryRun) {
      return { status: 'OK', message: `Tryb testowy: zostałoby utworzone zadanie „${title}”.`, output };
    }

    const sourceTask = ctx.taskId != null ? await AppDataSource.getRepository(Task).findOne({ where: { id: ctx.taskId } }) : null;
    const task = await TaskService.createTask({
      title,
      taskTypeId: taskType.id,
      contractId: sourceTask?.contractId ?? ctx.contractId ?? undefined,
      plannedEndDate: dueDate,
    } as Parameters<typeof TaskService.createTask>[0]);
    if (assigneeId !== null) {
      const assignedById = ctx.chainAuthorId ?? ctx.actorId;
      if (assignedById == null) {
        return { status: 'FAILED', message: 'Nie można przypisać zadania – brak autora przypisania.', output: { ...output, taskNumber: task.taskNumber } };
      }
      const assignments = AppDataSource.getRepository(TaskAssignment);
      await assignments.save(assignments.create({ taskId: task.id, userId: assigneeId, assignedById, role: 'assigned' }));
      await AppDataSource.getRepository(Task).update({ id: task.id, status: 'created' }, { status: 'assigned' });
    }
    return { status: 'OK', message: `Utworzono zadanie ${task.taskNumber}.`, output: { ...output, taskId: task.id, taskNumber: task.taskNumber } };
  },
};
