// src/entities/CompletionItem.ts
// Encja pozycji kompletacji

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CompletionOrder } from './CompletionOrder';
import { WorkflowGeneratedBomItem } from './WorkflowGeneratedBomItem';
import { Pallet } from './Pallet';

export enum CompletionItemStatus {
  PENDING = 'PENDING',
  SCANNED = 'SCANNED',
  MISSING = 'MISSING',
  PARTIAL = 'PARTIAL'
}

@Entity('completion_items')
export class CompletionItem {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => CompletionOrder, order => order.items)
  @JoinColumn({ name: 'completion_order_id' })
  completionOrder: CompletionOrder;

  @Column({ name: 'completion_order_id' })
  completionOrderId: number;

  @ManyToOne(() => WorkflowGeneratedBomItem)
  @JoinColumn({ name: 'bom_item_id' })
  bomItem: WorkflowGeneratedBomItem;

  @Column({ name: 'bom_item_id' })
  bomItemId: number;

  @Column({ name: 'generated_bom_item_id', nullable: true })
  generatedBomItemId: number;

  @Column({ name: 'expected_quantity', type: 'int', default: 0 })
  expectedQuantity: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: CompletionItemStatus.PENDING
  })
  status: CompletionItemStatus;

  @Column({ name: 'scanned_barcode', type: 'varchar', length: 200, nullable: true })
  scannedBarcode: string;

  @Column({ name: 'serial_number', type: 'varchar', length: 100, nullable: true })
  serialNumber: string;

  @ManyToOne(() => Pallet, pallet => pallet.items, { nullable: true })
  @JoinColumn({ name: 'pallet_id' })
  pallet: Pallet;

  @Column({ name: 'pallet_id', nullable: true })
  palletId: number;

  @Column({ name: 'scanned_quantity', type: 'int', default: 0 })
  scannedQuantity: number;

  @Column({ name: 'scanned_by', type: 'int', nullable: true })
  scannedBy: number; // user id

  @Column({ name: 'scanned_at', type: 'timestamp', nullable: true })
  scannedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
