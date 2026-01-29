import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('blockchain_transactions')
export class BlockchainTransaction {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: number;

  @Column({ type: 'varchar', length: 20 })
  asset_code: string;

  @Column({ type: 'varchar', length: 100 })
  contract_address: string;

  @Column({ type: 'decimal', precision: 36, scale: 18, nullable: true })
  fee: number;

  @Column({ type: 'varchar', length: 100 })
  from_address: string;

  @Column({ type: 'varchar', length: 100 })
  to_address: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  hash: string;

  @Column({ type: 'datetime' })
  date: Date;

  @Column({ type: 'tinyint' })
  confirmation: number;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
