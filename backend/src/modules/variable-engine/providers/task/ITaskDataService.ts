/**
 * Variable Engine – ITaskDataService (PR-6 scope)
 *
 * DI contract for any service that can answer task-domain queries
 * for a given entity.
 *
 * ## Unit conventions
 *
 * - Progress is expressed as an integer percentage (0–100).
 * - Dates are ISO 8601 strings (e.g. `"2024-01-15"`).
 * - Status and priority are domain-defined strings.
 */

/** Snapshot of task-domain data for one entity. */
export interface TaskData {
  /** Unique task number / identifier string. */
  readonly number: string;
  /** Current task status (e.g. `"open"`, `"in_progress"`, `"done"`). */
  readonly status: string;
  /** Task title / short description. */
  readonly title: string;
  /** Task priority level (e.g. `"low"`, `"medium"`, `"high"`, `"critical"`). */
  readonly priority: string;
  /** Full name of the person the task is assigned to. */
  readonly assigneeName: string;
  /** Due date as an ISO 8601 string. */
  readonly dueDate: string;
  /** Completion progress expressed as an integer percentage (0–100). */
  readonly progress: number;
}

export interface ITaskDataService {
  /**
   * Return task-domain data for the given entity, or `undefined` when the
   * entity does not exist or has no task data.
   *
   * Implementations MUST NOT throw – return `undefined` on error.
   *
   * @param entityId   – Numeric identifier of the entity (e.g. task ID).
   * @param entityType – Domain type (e.g. `'task'`, `'contract'`).
   */
  getTaskData(entityId: number, entityType: string): Promise<TaskData | undefined>;
}
