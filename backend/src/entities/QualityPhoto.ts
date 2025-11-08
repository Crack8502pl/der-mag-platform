// src/entities/QualityPhoto.ts
// Encja zdjęcia kontroli jakości

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Task } from './Task';
import { TaskActivity } from './TaskActivity';
import { User } from './User';

@Entity('quality_photos')
@Index(['taskId', 'status'])
export class QualityPhoto {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, task => task.photos)
  @JoinColumn({ name: 'task_id' })
  task: Task;

  @Column({ name: 'task_id' })
  taskId: number;

  @ManyToOne(() => TaskActivity, { nullable: true })
  @JoinColumn({ name: 'activity_id' })
  activity: TaskActivity;

  @Column({ name: 'activity_id', nullable: true })
  activityId?: number;

  @Column({ name: 'file_path', type: 'varchar', length: 500 })
  filePath: string;

  @Column({ name: 'thumbnail_path', type: 'varchar', length: 500, nullable: true })
  thumbnailPath: string;

  @Column({ name: 'original_name', type: 'varchar', length: 255 })
  originalName: string;

  @Column({ name: 'file_size', type: 'int' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 50 })
  mimeType: string;

  @Column({ type: 'int', nullable: true })
  width: number;

  @Column({ type: 'int', nullable: true })
  height: number;

  @Column({ name: 'gps_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  gpsLatitude: number;

  @Column({ name: 'gps_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  gpsLongitude: number;

  @Column({ name: 'photo_date', type: 'timestamp', nullable: true })
  photoDate: Date;

  @Column({ type: 'jsonb', default: {} })
  exifData: Record<string, any>;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by' })
  uploadedById: number;

  @Column({ length: 50, default: 'pending' })
  status: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User;

  @Column({ name: 'approved_by', nullable: true })
  approvedById: number;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
