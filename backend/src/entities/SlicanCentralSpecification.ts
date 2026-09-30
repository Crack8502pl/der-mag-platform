import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WarehouseStock } from './WarehouseStock';

@Entity('slican_central_specifications')
export class SlicanCentralSpecification {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'warehouse_stock_id', type: 'int', unique: true }) warehouseStockId: number;
  @ManyToOne(() => WarehouseStock, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_stock_id' }) warehouseStock: WarehouseStock;
  @Column({ name: 'model_name', length: 50 }) modelName: string;
  @Column({ name: 'max_sip_voip_subscribers', type: 'int' }) maxSipVoipSubscribers: number;
  @Column({ name: 'max_dph_ip_devices', type: 'int' }) maxDphIpDevices: number;
  @Column({ name: 'max_audio_ip_devices', type: 'int' }) maxAudioIpDevices: number;
  @Column({ name: 'max_ivr_channels', type: 'int' }) maxIvrChannels: number;
  @Column({ name: 'max_conference_channels', type: 'int' }) maxConferenceChannels: number;
  @Column({ name: 'max_all_accounts', type: 'int', nullable: true }) maxAllAccounts: number | null;
  @Column({ name: 'max_cts_phones_up0_ip', type: 'int', nullable: true }) maxCtsPhonesUp0Ip: number | null;
  @Column({ name: 'max_concurrent_voice_calls', type: 'int', nullable: true }) maxConcurrentVoiceCalls: number | null;
  @Column({ name: 'max_concurrent_video_calls', type: 'int', nullable: true }) maxConcurrentVideoCalls: number | null;
  @Column({ name: 'max_webcti_messengercti_accounts', type: 'int', nullable: true }) maxWebctiMessengerctiAccounts: number | null;
  @Column({ type: 'int', default: 10 }) priority: number;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
