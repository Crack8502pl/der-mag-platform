// src/modules/workflow/services/safety.ts
// Proces jest krytyczny dla bezpieczeństwa, gdy którykolwiek z jego typów zadań ma configuration.safetyCritical = true.

import { In, type EntityManager } from 'typeorm';
import { TaskType } from '../../../entities/TaskType';
import type { WorkflowSubjectType } from '../contracts';

export function isTaskTypeSafetyCritical(taskType: Pick<TaskType, 'configuration'>): boolean {
  const configuration: unknown = taskType.configuration;
  return typeof configuration === 'object' && configuration !== null && !Array.isArray(configuration)
    && (configuration as Record<string, unknown>).safetyCritical === true;
}

export async function computeSafetyCritical(
  manager: Pick<EntityManager, 'getRepository'>,
  subjectType: WorkflowSubjectType,
  taskTypeIds: number[],
): Promise<boolean> {
  if (subjectType !== 'TASK' || taskTypeIds.length === 0) return false;
  const taskTypes = await manager.getRepository(TaskType).find({ where: { id: In(taskTypeIds) } });
  return taskTypes.some(isTaskTypeSafetyCritical);
}
