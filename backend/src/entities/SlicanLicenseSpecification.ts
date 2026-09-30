import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WarehouseStock } from './WarehouseStock';

@Entity('slican_license_specifications')
export class SlicanLicenseSpecification {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'warehouse_stock_id', type: 'int', unique: true }) warehouseStockId: number;
  @ManyToOne(() => WarehouseStock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_stock_id' }) warehouseStock: WarehouseStock;
  @Column({ name: 'license_type', length: 50 }) licenseType: string;
  @Column({ name: 'package_size', type: 'int' }) packageSize: number;
  @Column({ name: 'demand_field', length: 50 }) demandField: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ type: 'int', default: 10 }) priority: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
