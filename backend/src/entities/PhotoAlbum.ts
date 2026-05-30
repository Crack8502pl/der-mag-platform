// UWAGA: tsx (esbuild) nie emituje decorator metadata.
// Każdy @Column() na polu string/boolean MUSI mieć jawny type:
// Zobacz: User.ts jako wzorzec i docs/ENTITIES.md
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('photo_albums')
export class PhotoAlbum {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ name: 'contract_id', type: 'int', nullable: true })
  contractId: number | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
