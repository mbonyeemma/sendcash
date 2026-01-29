import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sia_fees')
export class Fee {
  @PrimaryGeneratedColumn({ name: 'fee_id' })
  fee_id: number;

  @Column({ type: 'varchar', length: 25, unique: true })
  operation: string;

  @Column({ type: 'varchar', length: 11 })
  fee_amount: string;

  @Column({ type: 'varchar', length: 10 })
  status: string;
}
