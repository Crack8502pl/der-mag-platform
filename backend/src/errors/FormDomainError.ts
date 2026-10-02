export type FormDomainErrorCode =
  | 'TEMPLATE_NOT_FOUND'
  | 'VERSION_NOT_FOUND'
  | 'INSTANCE_NOT_FOUND'
  | 'VERSION_NOT_DRAFT'
  | 'VERSION_NOT_PUBLISHED'
  | 'DRAFT_ALREADY_EXISTS'
  | 'INVALID_DEFINITION'
  | 'INVALID_RESPONSES'
  | 'INVALID_INSTANCE_STATUS'
  | 'REJECTION_COMMENT_REQUIRED';

export class FormDomainError extends Error {
  constructor(
    public readonly code: FormDomainErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'FormDomainError';
  }
}
