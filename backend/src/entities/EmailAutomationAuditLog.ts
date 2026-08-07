import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('email_automation_audit_log')
export class EmailAutomationAuditLog {
  @PrimaryColumn({ type: 'uuid', default: () => 'gen_random_uuid()' })
  id: string;

  @Column({ name: 'actor_admin_id', type: 'int', nullable: true })
  actorAdminId: number | null;

  @Column({ name: 'target_type', type: 'varchar', length: 20 })
  targetType: 'system' | 'user';

  @Column({ name: 'target_id', type: 'int', nullable: true })
  targetId: number | null;

  @Column({ type: 'varchar', length: 100 })
  field: string;

  @Column({ name: 'old_value', type: 'varchar', length: 255, nullable: true })
  oldValue: string | null;

  @Column({ name: 'new_value', type: 'varchar', length: 255, nullable: true })
  newValue: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
