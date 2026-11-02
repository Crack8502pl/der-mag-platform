// src/modules/workflow/errors.ts

import type { WorkflowProblem } from './contracts';

export type WorkflowErrorCode =
  | 'VALIDATION_FAILED'
  | 'DEFINITION_INVALID'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VERSION_IMMUTABLE'
  | 'CONFLICT';

const STATUS_BY_CODE: Record<WorkflowErrorCode, number> = {
  VALIDATION_FAILED: 400,
  DEFINITION_INVALID: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VERSION_IMMUTABLE: 409,
  CONFLICT: 409,
};

export class WorkflowError extends Error {
  readonly status: number;

  constructor(
    readonly code: WorkflowErrorCode,
    message: string,
    readonly issues?: WorkflowProblem[],
  ) {
    super(message);
    this.name = 'WorkflowError';
    this.status = STATUS_BY_CODE[code];
  }
}
