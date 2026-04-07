// src/entities/HoneypotLog.ts
// Encja logów honeypota - przechowuje informacje o wykrytych skanowaniach

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

// Poziomy zagrożeń
export enum ThreatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('honeypot_logs')
@Index(['ip'])
@Index(['detectedScanner'])
@Index(['createdAt'])
@Index(['threatLevel'])
export class HoneypotLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 45 })
  ip: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ type: 'varchar', length: 10 })
  method: string;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'jsonb', nullable: true })
  headers: Record<string, string> | null;

  @Column({ name: 'detected_scanner', type: 'varchar', length: 50, nullable: true })
  detectedScanner: string | null;

  @Column({ name: 'honeypot_type', type: 'varchar', length: 50, nullable: true })
  honeypotType: string | null;

  @Column({ name: 'query_params', type: 'text', nullable: true })
  queryParams: string | null;

  @Column({ name: 'request_body', type: 'text', nullable: true })
  requestBody: string | null;

  @Column({
    name: 'threat_level',
    type: 'enum',
    enum: ThreatLevel,
    enumName: 'threat_level_enum',
    default: ThreatLevel.LOW,
  })
  threatLevel: ThreatLevel;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'boolean', default: false })
  reviewed: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}
