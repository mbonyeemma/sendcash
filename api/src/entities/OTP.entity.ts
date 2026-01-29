import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sia_otps')
export class OTP {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 6 })
  otp: string;

  @Column({ type: 'datetime' })
  expiry: Date;

  @Column({ type: 'tinyint', default: 0 })
  used: number;

  @Column({ type: 'datetime', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
