import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column({ name: 'original_name' })
  originalName: string;

  @Column({ name: 'file_path' })
  filePath: string;

  @Column({ name: 'thumbnail_path', nullable: true })
  thumbnailPath: string | null;

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string | null;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize: number | null;

  @Column({ name: 'album_id', type: 'int', nullable: true })
  albumId: number | null;

  @Column({ name: 'contract_id', type: 'int', nullable: true })
  contractId: number | null;

  @Column({ name: 'task_id', type: 'int', nullable: true })
  taskId: number | null;

  @Column({ type: 'decimal', nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', nullable: true })
  longitude: number | null;

  @Column({ name: 'approval_status', default: 'pending' })
  approvalStatus: string;

  @Column({ name: 'approved_by_id', type: 'int', nullable: true })
  approvedById: number | null;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'uploaded_by_id', type: 'int', nullable: true })
  uploadedById: number | null;

  @Column({ nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
