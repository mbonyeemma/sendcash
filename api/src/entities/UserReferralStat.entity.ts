import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_referral_stats')
export class UserReferralStat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  referral_code: string;

  @Column({ type: 'int', default: 0 })
  total_referrals: number;

  @Column({ type: 'int', default: 0 })
  active_referrals: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total_commission: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  this_month_commission: number;

  @Column({ type: 'int', default: 0 })
  total_wins: number;

  @Column({ type: 'int', nullable: true })
  global_rank: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accuracy_percentage: number;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;
}
