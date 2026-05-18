import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type WebhookProvider = 'slack' | 'teams';
export type WebhookEventType =
  | 'stock_critical'
  | 'stock_low'
  | 'stock_digest'
  | 'contract_created'
  | 'contract_approved'
  | 'contract_cancelled'
  | 'contract_deadline'
  | 'prefabrication_completed'
  | 'brigade_task_assigned'
  | 'import_completed'
  | 'all';

@Entity('webhook_configs')
export class WebhookConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 20 })
  provider: WebhookProvider;

  @Column({ name: 'webhook_url', type: 'varchar', length: 500 })
  webhookUrl: string;

  @Column({ name: 'event_type', type: 'varchar', length: 50 })
  eventType: WebhookEventType;

  @Column({ name: 'channel_name', type: 'varchar', length: 100, nullable: true })
  channelName: string | null;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
