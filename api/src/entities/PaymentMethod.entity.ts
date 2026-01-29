import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  payment_method_id: string;

  @Column({ type: 'varchar', length: 255 })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  type: string;

  @Column({ type: 'varchar', length: 3, nullable: true })
  currency: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone_number: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  country_code: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  network: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  account_name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  bank_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bank_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  account_number: string;

  @Column({ type: 'text', nullable: true })
  bank_address: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bank_phone_number: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  bank_country: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;
}
