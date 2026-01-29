import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('payment_types')
export class PaymentType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  type: string;

  @Column({ type: 'varchar', length: 10 })
  country: string;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 50 })
  operation: string;

  @Column({ type: 'int' })
  fee: number;

  @Column({ type: 'varchar', length: 20, default: 'FLAT' })
  fee_type: string;

  @Column({ type: 'int' })
  min_amount: number;

  @Column({ type: 'int', default: 1000000 })
  max_amount: number;

  @Column({ type: 'varchar', length: 10, default: 'active' })
  status: string;
}
