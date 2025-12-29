// src/entities/Pallet.ts
// Encja palety

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, OneToMany, Index } from 'typeorm';
import { CompletionOrder } from './CompletionOrder';
import { CompletionItem } from './CompletionItem';

export enum PalletStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  SHIPPED = 'SHIPPED'
}

@Entity('pallets')
@Index(['palletNumber'], { unique: true })
export class Pallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'pallet_number', type: 'varchar', length: 20, unique: true })
  palletNumber: string; // auto-generated

  @ManyToOne(() => CompletionOrder, order => order.pallets)
  @JoinColumn({ name: 'completion_order_id' })
  completionOrder: CompletionOrder;

  @Column({ name: 'completion_order_id' })
  completionOrderId: number;

  @OneToMany(() => CompletionItem, item => item.pallet)
  items: CompletionItem[];

  @Column({
    type: 'varchar',
    length: 20,
    default: PalletStatus.OPEN
  })
  status: PalletStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date;
}
