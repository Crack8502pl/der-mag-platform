// src/entities/Brigade.ts
// Encja brygady (zespół pracowników)

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { BrigadeMember } from './BrigadeMember';
import { ServiceTask } from './ServiceTask';

@Entity('brigades')
export class Brigade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, length: 20 })
  code: string; // Numer rejestracyjny samochodu np. "WA12345"

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @OneToMany(() => BrigadeMember, (member) => member.brigade)
  members: BrigadeMember[];

  @OneToMany(() => ServiceTask, (task) => task.brigade)
  serviceTasks: ServiceTask[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
