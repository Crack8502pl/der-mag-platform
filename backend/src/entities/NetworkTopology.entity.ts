// src/entities/NetworkTopology.entity.ts
// Entity topologii sieciowej dla modułu Network Topology Builder

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Contract } from './Contract';

export interface TopologyNode {
  id: string;
  nodeType: string;      // NodeType
  sourceType: string;    // NodeSourceType: 'task' | 'external' | 'auxiliary'
  label: string;
  position: { x: number; y: number };
  kilometre?: number;
  isActive?: boolean;    // dla auxiliary nodes
  taskId?: number;
  metadata?: Record<string, any>;
}

export interface TopologyConnection {
  id: string;
  source: string;
  target: string;
  technology: string;    // 'FIBER' | 'LAN'
  distance?: number;
  notes?: string;
}

@Entity('network_topologies')
@Index(['contractId', 'subsystemIndex'])
export class NetworkTopology {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ name: 'contract_id', type: 'int' })
  contractId: number;

  @ManyToOne(() => Contract, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contract_id' })
  contract: Contract;

  @Column({ name: 'subsystem_index', type: 'int' })
  subsystemIndex: number;

  @Column({ name: 'subsystem_type', type: 'varchar', length: 100 })
  subsystemType: string;

  @Column({ type: 'jsonb', default: [] })
  nodes: TopologyNode[];

  @Column({ type: 'jsonb', default: [] })
  connections: TopologyConnection[];

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
