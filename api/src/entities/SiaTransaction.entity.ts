import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sia_transactions')
export class SiaTransaction {
  @PrimaryGeneratedColumn({ name: 'txn_id' })
  txn_id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  trans_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  chain_txn_hash: string;

  @Column({ type: 'varchar', length: 20 })
  trans_type: string;

  @Column({ type: 'varchar', length: 100 })
  tnx_from: string;

  @Column({ type: 'varchar', length: 100 })
  tnx_to: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'txn_sent_on' })
  txn_sent_on: Date;

  @Column({ type: 'timestamp', nullable: true, name: 'txn_settled_on' })
  txn_settled_on: Date;

  @Column({ type: 'varchar', length: 30 })
  txn_status: string;

  @Column({ type: 'varchar', length: 100 })
  txn_inititated_by_user_id: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  fiat_amount: string;

  @Column({ type: 'varchar', length: 5, nullable: true })
  fiat_currency: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  sia_tokens: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  fiat_trans_id: string;
}
