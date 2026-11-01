// src/modules/automation/errors.ts

export type AutomationErrorCode =
  | 'VALIDATION_FAILED'
  | 'ACTION_FORBIDDEN'
  | 'OWNER_NOT_FOUND'
  | 'CHAIN_NOT_FOUND'
  | 'CHAIN_IMMUTABLE'
  | 'TASK_NOT_FOUND';

const STATUS_BY_CODE: Record<AutomationErrorCode, number> = {
  VALIDATION_FAILED: 400,
  ACTION_FORBIDDEN: 403,
  OWNER_NOT_FOUND: 404,
  CHAIN_NOT_FOUND: 404,
  TASK_NOT_FOUND: 404,
  CHAIN_IMMUTABLE: 409,
};

export class AutomationError extends Error {
  readonly status: number;

  constructor(
    readonly code: AutomationErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AutomationError';
    this.status = STATUS_BY_CODE[code];
  }
}
