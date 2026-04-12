// src/entities/AssetStatusHistory.ts
// Encja historii zmian statusu zasobu (audit trail)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Asset, AssetStatus } from './Asset';
import { User } from './User';

@Entity('asset_status_history')
@Index(['assetId'])
@Index(['changedAt'])
export class AssetStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Asset, asset => asset.statusHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'asset_id', type: 'int' })
  assetId: number;

  @Column({ name: 'old_status', type: 'varchar', length: 50, nullable: true })
  oldStatus: AssetStatus | null;

  @Column({ name: 'new_status', type: 'varchar', length: 50 })
  newStatus: AssetStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by' })
  changedByUser: User | null;

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy: number | null;

  @CreateDateColumn({ name: 'changed_at' })
  changedAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string | null;
}
