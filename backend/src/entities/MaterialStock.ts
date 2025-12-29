// src/entities/MaterialStock.ts
// Encja stanu magazynowego materiałów

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum StockSource {
  MANUAL = 'manual',
  CSV_IMPORT = 'csv_import',
  EXCEL_IMPORT = 'excel_import',
  SYMFONIA_API = 'symfonia_api'
}

@Entity('material_stocks')
@Index(['partNumber'], { unique: true })
export class MaterialStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'part_number', length: 100 })
  partNumber: string; // Numer katalogowy / Indeks

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'quantity_available', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityAvailable: number;

  @Column({ name: 'quantity_reserved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityReserved: number;

  @Column({ length: 20, default: 'szt' })
  unit: string;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ length: 3, default: 'PLN' })
  currency: string;

  @Column({ name: 'warehouse_location', length: 100, nullable: true })
  warehouseLocation: string;

  @Column({ length: 100, nullable: true })
  supplier: string;

  @Column({ name: 'min_stock_level', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minStockLevel: number;

  @Column({ name: 'symfonia_id', length: 100, nullable: true })
  symfoniaId: string;

  @Column({ name: 'symfonia_index', length: 100, nullable: true })
  symfoniaIndex: string;

  @Column({ name: 'barcode', length: 100, nullable: true })
  barcode: string;

  @Column({ name: 'ean_code', length: 20, nullable: true })
  eanCode: string;

  @Column({
    type: 'enum',
    enum: StockSource,
    default: StockSource.MANUAL
  })
  source: StockSource;

  @Column({ name: 'last_import_at', nullable: true })
  lastImportAt: Date;

  @Column({ name: 'last_import_file', length: 255, nullable: true })
  lastImportFile: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
