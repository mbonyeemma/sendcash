import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_referrals')
export class UserReferral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  referrer_user_id: string;

  @Column({ type: 'varchar', length: 36 })
  referred_user_id: string;

  @Column({ type: 'varchar', length: 20 })
  referral_code: string;

  @Column({ type: 'tinyint', default: 1 })
  is_active: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  commission_earned: number;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'referred_at' })
  referred_at: Date;
}
