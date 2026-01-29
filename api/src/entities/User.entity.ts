import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sia_users')
export class User {
  @PrimaryGeneratedColumn({ name: 'us_id' })
  us_id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  user_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  full_name: string;

  @Column({ type: 'int', default: 0 })
  is_merchant: number;

  @Column({ type: 'tinyint', default: 0 })
  is_validator: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 100 })
  password: string;

  @Column({ type: 'varchar', length: 70, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  avatar: string;

  @Column({ type: 'text', nullable: true })
  fcm_token: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_on' })
  created_on: Date;

  @Column({ type: 'text', nullable: true })
  favorites: string;

  @Column({ type: 'int', nullable: true })
  auth_code: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  referer: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  txn_hash: string;

  @Column({ type: 'tinyint', default: 0 })
  email_verified: number;

  @Column({ type: 'varchar', length: 20 })
  country_code: string;

  @Column({ type: 'varchar', length: 3, default: 'UGX' })
  currency: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  wallet_pin: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone_number: string;

  @Column({ type: 'varchar', length: 130, nullable: true })
  google_id: string;
}
