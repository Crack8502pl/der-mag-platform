// src/entities/User.ts
// Encja użytkownika systemu

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, BeforeInsert, BeforeUpdate, OneToMany } from 'typeorm';
import { Role } from './Role';
import { TaskAssignment } from './TaskAssignment';
import bcrypt from 'bcrypt';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true, length: 50 })
  username: string;

  @Column({ type: 'varchar', unique: true, length: 100 })
  email: string;

  @Column({ type: 'text', name: 'password_hash', select: false })
  password: string;

  @Column({ type: 'varchar', name: 'first_name', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', name: 'last_name', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ name: 'employee_code', type: 'varchar', length: 5, unique: true, nullable: true })
  employeeCode: string | null;

  @ManyToOne(() => Role, role => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ type: 'int', name: 'role_id' })
  roleId: number;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date;

  @Column({ type: 'boolean', name: 'force_password_change', default: true })
  forcePasswordChange: boolean;

  @Column({ name: 'password_changed_at', type: 'timestamp', nullable: true })
  passwordChangedAt: Date;

  @OneToMany(() => TaskAssignment, assignment => assignment.user)
  taskAssignments: TaskAssignment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'deletion_reason', type: 'varchar', length: 500, nullable: true })
  deletionReason: string | null;

  // Hashowanie hasła przed zapisem
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  // Metoda do weryfikacji hasła
  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }

  // Getter dla pełnego imienia
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
