import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sia_deposit_transactions')
export class SiaDepositTransaction {
  @PrimaryGeneratedColumn({ name: 'tr_id' })
  tr_id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  trans_id: string;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 50 })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_on' })
  created_on: Date;

  @Column({ type: 'text' })
  response_body: string;
}
