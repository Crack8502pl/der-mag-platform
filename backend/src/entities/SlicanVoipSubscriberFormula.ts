import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('slican_voip_subscriber_formula')
export class SlicanVoipSubscriberFormula {
  @PrimaryColumn({ type: 'int', default: 1 }) id: number;
  @Column({ name: 'dph_ip_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1 }) dphIpMultiplier: number;
  @Column({ name: 'audio_ip_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1 }) audioIpMultiplier: number;
  @Column({ name: 'cts220_ip_multiplier', type: 'decimal', precision: 5, scale: 2, default: 1 }) cts220IpMultiplier: number;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
