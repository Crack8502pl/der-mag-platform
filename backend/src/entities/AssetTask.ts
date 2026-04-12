// src/entities/AssetTask.ts
// Encja relacji wiele-do-wielu między zasobami (Asset) a zadaniami (SubsystemTask)

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Asset, AssetTaskRole } from './Asset';
import { SubsystemTask } from './SubsystemTask';

@Entity('asset_tasks')
@Index(['assetId'])
@Index(['taskId'])
@Index(['taskRole'])
@Index(['assetId', 'taskId'], { unique: true })
export class AssetTask {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Asset, asset => asset.assetTasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ name: 'asset_id', type: 'int' })
  assetId: number;

  @ManyToOne(() => SubsystemTask, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: SubsystemTask;

  @Column({ name: 'task_id', type: 'int' })
  taskId: number;

  @Column({ name: 'task_role', type: 'varchar', length: 50 })
  taskRole: AssetTaskRole; // installation, warranty_service, repair, maintenance, decommission

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
