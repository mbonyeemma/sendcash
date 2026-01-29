import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  from_currency: string;

  @Column({ type: 'varchar', length: 10 })
  to_currency: string;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  rate: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  markup: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  amount: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;
}
