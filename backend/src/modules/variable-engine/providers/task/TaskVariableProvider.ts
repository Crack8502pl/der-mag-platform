/**
 * Variable Engine – TaskVariableProvider (PR-6 scope)
 *
 * Resolves `task.*` variable expressions by delegating to an injected
 * `ITaskDataService`.
 *
 * ## Supported expressions
 *
 * | Expression            | Type   | Description                                         |
 * |-----------------------|--------|-----------------------------------------------------|
 * | `task.number`         | string | Task number / identifier.                           |
 * | `task.status`         | string | Current task status (e.g. `"open"`, `"done"`).      |
 * | `task.title`          | string | Task title / short description.                     |
 * | `task.priority`       | string | Priority level (e.g. `"high"`, `"critical"`).       |
 * | `task.assignee.name`  | string | Full name of the assigned person.                   |
 * | `task.due.date`       | string | Due date as an ISO 8601 string.                     |
 * | `task.progress`       | number | Completion progress (integer, 0–100).               |
 *
 * ## Soft-fail
 *
 * Returns `undefined` for unrecognised field names, when `entityId` is
 * missing/invalid, or when the data service returns no data.  Never throws.
 *
 * ## DI
 *
 * Inject a concrete `ITaskDataService` via the constructor.
 */

import { AbstractVariableProvider } from '../AbstractVariableProvider';
import type { VariableContext, VariableValue } from '../../contracts';
import type { ITaskDataService, TaskData } from './ITaskDataService';
import { DataFetchDeduplicator } from '../DataFetchDeduplicator';

/** All field paths exposed under the `task` namespace. */
type TaskField =
  | 'number'
  | 'status'
  | 'title'
  | 'priority'
  | 'assignee.name'
  | 'due.date'
  | 'progress';

const SUPPORTED_FIELDS: ReadonlySet<string> = new Set<TaskField>([
  'number',
  'status',
  'title',
  'priority',
  'assignee.name',
  'due.date',
  'progress',
]);

export class TaskVariableProvider extends AbstractVariableProvider {
  readonly namespaces = ['task'] as const;

  private readonly taskService: ITaskDataService;
  private readonly deduplicator = new DataFetchDeduplicator<TaskData>();

  /**
   * @param taskService – Injected task data service (DI, not static singleton).
   */
  constructor(taskService: ITaskDataService) {
    super();
    this.taskService = taskService;
  }

  async resolve(expression: string, context: VariableContext): Promise<VariableValue> {
    const field = this.extractField(expression);

    if (!SUPPORTED_FIELDS.has(field)) {
      return undefined;
    }

    const entityId = this.parseEntityId(context.entityId);
    if (entityId === undefined) {
      return undefined;
    }

    const entityType = context.entityType ?? '';
    const entityKey = `${entityId}:${entityType}`;
    const data = await this.deduplicator.fetch(entityKey, () =>
      this.taskService.getTaskData(entityId, entityType)
    );

    if (data === undefined) {
      return undefined;
    }

    return this.pick(field as TaskField, data);
  }

  // ─── Field picker ─────────────────────────────────────────────────────────

  private pick(field: TaskField, data: TaskData): VariableValue {
    switch (field) {
      case 'number':
        return data.number;
      case 'status':
        return data.status;
      case 'title':
        return data.title;
      case 'priority':
        return data.priority;
      case 'assignee.name':
        return data.assigneeName;
      case 'due.date':
        return data.dueDate;
      case 'progress':
        return data.progress;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  // parseEntityId is inherited from AbstractVariableProvider.
}
