// src/entities/WarehouseStock.ts
// Encja główna tabeli warehouse_stock

import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Generated
} from 'typeorm';
import { User } from './User';

export enum MaterialType {
  CONSUMABLE = 'consumable',
  DEVICE = 'device',
  TOOL = 'tool',
  COMPONENT = 'component'
}

export enum StockStatus {
  ACTIVE = 'ACTIVE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
  ORDERED = 'ORDERED'
}

@Entity('warehouse_stock')
@Index(['catalogNumber'], { unique: true })
export class WarehouseStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'uuid' })
  @Generated('uuid')
  uuid: string;

  // Identyfikacja materiału
  @Column({ name: 'catalog_number', length: 200, unique: true })
  catalogNumber: string;

  @Column({ name: 'material_name', length: 500 })
  materialName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 200, nullable: true })
  category: string;

  @Column({ length: 200, nullable: true })
  subcategory: string;

  @Column({
    name: 'material_type',
    type: 'varchar',
    length: 50,
    default: MaterialType.CONSUMABLE
  })
  materialType: MaterialType;

  // Ilości i jednostki
  @Column({ length: 50, default: 'szt' })
  unit: string;

  @Column({ name: 'quantity_in_stock', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityInStock: number;

  @Column({ name: 'quantity_reserved', type: 'decimal', precision: 10, scale: 2, default: 0 })
  quantityReserved: number;

  @Column({ name: 'quantity_available', type: 'decimal', precision: 10, scale: 2, generatedType: 'STORED', asExpression: 'quantity_in_stock - quantity_reserved' })
  quantityAvailable: number;

  // Poziomy zapasów
  @Column({ name: 'min_stock_level', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minStockLevel: number;

  @Column({ name: 'max_stock_level', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxStockLevel: number;

  @Column({ name: 'reorder_point', type: 'decimal', precision: 10, scale: 2, nullable: true })
  reorderPoint: number;

  // Lokalizacja magazynowa
  @Column({ name: 'warehouse_location', length: 500, nullable: true })
  warehouseLocation: string;

  @Column({ name: 'storage_zone', length: 100, nullable: true })
  storageZone: string;

  // Dane dostawcy i producenta
  @Column({ length: 500, nullable: true })
  supplier: string;

  @Column({ name: 'supplier_catalog_number', length: 200, nullable: true })
  supplierCatalogNumber: string;

  @Column({ length: 500, nullable: true })
  manufacturer: string;

  @Column({ name: 'part_number', length: 200, nullable: true })
  partNumber: string;

  // Ceny
  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  unitPrice: number;

  @Column({ name: 'purchase_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  purchasePrice: number;

  @Column({ name: 'last_purchase_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  lastPurchasePrice: number;

  @Column({ name: 'average_price', type: 'decimal', precision: 10, scale: 2, nullable: true })
  averagePrice: number;

  @Column({ length: 10, default: 'PLN' })
  currency: string;

  // Flagi kontrolne
  @Column({ name: 'is_serialized', default: false })
  isSerialized: boolean;

  @Column({ name: 'is_batch_tracked', default: false })
  isBatchTracked: boolean;

  @Column({ name: 'requires_ip_address', default: false })
  requiresIpAddress: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_hazardous', default: false })
  isHazardous: boolean;

  @Column({ name: 'requires_certification', default: false })
  requiresCertification: boolean;

  // Kategoria urządzenia
  @Column({ name: 'device_category', length: 100, nullable: true })
  deviceCategory: string;

  // Dane techniczne (JSONB)
  @Column({ name: 'technical_specs', type: 'jsonb', default: {} })
  technicalSpecs: any;

  // Daty
  @Column({ name: 'last_purchase_date', type: 'timestamp', nullable: true })
  lastPurchaseDate: Date;

  @Column({ name: 'last_stock_check_date', type: 'timestamp', nullable: true })
  lastStockCheckDate: Date;

  @Column({ name: 'expiry_date', type: 'timestamp', nullable: true })
  expiryDate: Date;

  // Status
  @Column({
    type: 'varchar',
    length: 50,
    default: StockStatus.ACTIVE
  })
  status: StockStatus;

  // Dokumenty i multimedia
  @Column({ name: 'image_url', length: 500, nullable: true })
  imageUrl: string;

  @Column({ name: 'datasheet_url', length: 500, nullable: true })
  datasheetUrl: string;

  @Column({ type: 'jsonb', default: [] })
  documents: any[];

  // Notatki
  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'internal_notes', type: 'text', nullable: true })
  internalNotes: string;

  // Audyt
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', nullable: true })
  createdById: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;

  @Column({ name: 'updated_by', nullable: true })
  updatedById: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
