import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sweep_transactions')
export class SweepTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  chain: string;

  @Column({ type: 'varchar', length: 255 })
  from_address: string;

  @Column({ type: 'varchar', length: 255 })
  to_address: string;

  @Column({ type: 'decimal', precision: 24, scale: 8 })
  amount: number;

  @Column({ type: 'varchar', length: 10 })
  token: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transaction_hash: string;

  @Column({ type: 'varchar', length: 20, default: 'COMPLETED' })
  status: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
