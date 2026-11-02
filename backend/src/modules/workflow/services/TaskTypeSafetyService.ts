// src/modules/workflow/services/TaskTypeSafetyService.ts
// Panel typów zadań: przełącznik „Krytyczny dla bezpieczeństwa” (task_types.configuration.safetyCritical).
// Zmiana trafia do dziennika audytowego i przelicza wersje robocze procesów dotyczących tego typu.

import type { DataSource } from 'typeorm';
import { AppDataSource } from '../../../config/database';
import { TaskType } from '../../../entities/TaskType';
import { WorkflowError } from '../errors';
import { isTaskTypeSafetyCritical } from './safety';
import { WorkflowService } from './WorkflowService';
import { recordWorkflowAudit } from './workflowAudit';

type Store = Pick<DataSource, 'getRepository' | 'transaction' | 'query'>;

export interface AdminTaskTypeView {
  id: number;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  safetyCritical: boolean;
}

function view(taskType: TaskType): AdminTaskTypeView {
  return {
    id: taskType.id,
    name: taskType.name,
    code: taskType.code,
    description: taskType.description ?? null,
    active: taskType.active,
    safetyCritical: isTaskTypeSafetyCritical(taskType),
  };
}

export class TaskTypeSafetyService {
  constructor(
    private readonly dataSource: Store = AppDataSource,
    private readonly workflows: WorkflowService = new WorkflowService(dataSource),
  ) {}

  /** Wszystkie typy zadań (także nieaktywne) z ustawieniem „Krytyczny dla bezpieczeństwa”. */
  async list(): Promise<AdminTaskTypeView[]> {
    const taskTypes = await this.dataSource.getRepository(TaskType).find({ order: { name: 'ASC', id: 'ASC' } });
    return taskTypes.map(view);
  }

  async setSafetyCritical(id: number, body: unknown, actorId: number): Promise<{ taskType: AdminTaskTypeView; refreshedDrafts: number }> {
    const value = typeof body === 'object' && body !== null ? (body as Record<string, unknown>).safetyCritical : undefined;
    if (typeof value !== 'boolean') {
      throw new WorkflowError('VALIDATION_FAILED', 'Ustawienie „Krytyczny dla bezpieczeństwa” musi mieć wartość tak albo nie.');
    }
    return this.dataSource.transaction(async manager => {
      const repository = manager.getRepository(TaskType);
      const taskType = await repository.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!taskType) throw new WorkflowError('NOT_FOUND', 'Nie znaleziono typu zadania.');
      const configuration: Record<string, unknown> = typeof taskType.configuration === 'object' && taskType.configuration !== null
        && !Array.isArray(taskType.configuration) ? taskType.configuration : {};
      if (configuration.safetyCritical === value) return { taskType: view(taskType), refreshedDrafts: 0 };

      const before = isTaskTypeSafetyCritical(taskType);
      taskType.configuration = { ...configuration, safetyCritical: value };
      await repository.save(taskType);
      await recordWorkflowAudit(manager, 'TASK_TYPE_SAFETY_CRITICAL_CHANGED', actorId, 'task_type', {
        taskTypeId: taskType.id,
        code: taskType.code,
        name: taskType.name,
        before: { safetyCritical: before },
        after: { safetyCritical: value },
      });
      const refreshedDrafts = await this.workflows.refreshDraftsForTaskType(manager, taskType.id, actorId);
      return { taskType: view(taskType), refreshedDrafts };
    });
  }
}

export const taskTypeSafetyService = new TaskTypeSafetyService();
