import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('wl_transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  trans_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  user_id: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  dr_wallet_id: string;

  @Column({ type: 'varchar', length: 40 })
  cr_wallet_id: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  trans_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  op_type: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ref_id: string;

  @Column({ type: 'varchar', length: 30, default: 'PENDING' })
  status: string;

  @Column({ type: 'varchar', length: 30 })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  asset_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  running_balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  running_balance_dr: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method: string;

  @Column({ type: 'varchar', length: 30 })
  asset: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  fee: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  provider_fee: number;

  @Column({ type: 'varchar', length: 40, nullable: true })
  narration: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  account_number: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  account_name: string;

  @Column({ type: 'varchar', length: 70, nullable: true })
  address_id: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_on', nullable: true })
  created_on: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  external_reference: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  hash: string;
}
