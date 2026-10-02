import { EntityManager } from 'typeorm';

export interface FormAuditChange {
  field: string;
  previousValue: unknown;
  newValue: unknown;
}

export class FormAuditService {
  static async record(
    manager: EntityManager,
    eventType: string,
    actorId: number,
    targetType: 'form_template' | 'form_template_version' | 'form_instance' | 'form_field_value' | 'form_approval',
    targetId: number,
    changes: FormAuditChange[] = [],
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await manager.query(
      `INSERT INTO audit_logs (event_type, user_id, details, created_at)
       VALUES ($1, $2, $3::jsonb, NOW())`,
      [
        eventType,
        actorId,
        JSON.stringify({ targetType, targetId, changes, ...metadata }),
      ],
    );
  }
}
