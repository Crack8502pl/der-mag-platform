// src/types/EmailTypes.ts
// Typy i interfejsy dla systemu emaili

/**
 * Załącznik do emaila
 */
export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

/**
 * Opcje wysyłki emaila
 */
export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  context: Record<string, any>;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
}

/**
 * Enum dostępnych szablonów emaili
 */
export enum EmailTemplate {
  TASK_CREATED = 'task-created',
  TASK_ASSIGNED = 'task-assigned',
  TASK_COMPLETED = 'task-completed',
  TASK_OVERDUE = 'task-overdue',
  USER_WELCOME = 'user-welcome',
  PASSWORD_RESET = 'password-reset',
  PASSWORD_CHANGED = 'password-changed',
  BRIGADE_TASK_ASSIGNED = 'brigade-task-assigned',
  BRIGADE_TASK_REMOVED = 'brigade-task-removed',
  BRIGADE_TASK_CHANGED = 'brigade-task-changed',
  BRIGADE_TASK_PRIORITY_CHANGED = 'brigade-task-priority-changed',
  BRIGADE_MEMBER_ADDED_WITH_TASKS = 'brigade-member-added',
  BRIGADE_MEMBER_REMOVED_WITH_TASKS = 'brigade-member-removed',
}

/**
 * Kontekst dla emaili związanych z zadaniami
 */
export interface TaskEmailContext {
  taskNumber: string;
  taskName: string;
  taskType: string;
  assignedTo?: string;
  assignedBy?: string;
  createdBy: string;
  location?: string;
  status?: string;
  url: string;
  priority?: number;
  dueDate?: string;
}

/**
 * Kontekst dla emaila powitalnego użytkownika
 */
export interface UserWelcomeEmailContext {
  username: string;
  firstName: string;
  loginUrl: string;
  supportEmail?: string;
}

/**
 * Kontekst dla emaila resetu hasła
 */
export interface PasswordResetEmailContext {
  username: string;
  firstName: string;
  resetUrl: string;
  expiresIn?: string;
}

/**
 * Kontekst dla emaila zmiany hasła
 */
export interface PasswordChangedEmailContext {
  username: string;
  firstName: string;
  newPassword: string;
  loginUrl: string;
  supportEmail?: string;
}

/**
 * Statystyki kolejki emaili
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}
