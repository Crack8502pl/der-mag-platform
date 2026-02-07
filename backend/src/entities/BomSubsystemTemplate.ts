// src/entities/BomSubsystemTemplate.ts
// Entity for BOM subsystem templates

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';
import { BomSubsystemTemplateItem } from './BomSubsystemTemplateItem';

export enum SubsystemType {
  SMOKIP_A = 'SMOKIP_A',
  SMOKIP_B = 'SMOKIP_B',
  SKD = 'SKD',
  SSWIN = 'SSWIN',
  CCTV = 'CCTV',
  SMW = 'SMW',
  SDIP = 'SDIP',
  SUG = 'SUG',
  SSP = 'SSP',
  LAN = 'LAN',
  OTK = 'OTK',
  ZASILANIE = 'ZASILANIE'
}

@Entity('bom_subsystem_templates')
@Index(['subsystemType'])
@Index(['taskVariant'])
@Index(['subsystemType', 'taskVariant', 'version'], { unique: true })
export class BomSubsystemTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'template_name', type: 'varchar', length: 200 })
  templateName: string;

  @Column({
    name: 'subsystem_type',
    type: 'varchar',
    length: 50
  })
  subsystemType: SubsystemType;

  @Column({ name: 'task_variant', type: 'varchar', length: 50, nullable: true })
  taskVariant: string | null;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

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

  @OneToMany(() => BomSubsystemTemplateItem, item => item.template, {
    cascade: true
  })
  items: BomSubsystemTemplateItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
