import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('billers')
export class Biller {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  service_category_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  short_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string;

  @Column({ type: 'varchar', length: 5, default: 'UG' })
  country_code: string;

  @Column({ type: 'varchar', length: 5, default: 'UGX' })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1000 })
  min_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1000000 })
  max_amount: number;

  @Column({ type: 'varchar', length: 20, default: 'percentage' })
  commission_type: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  commission_rate: number;

  @Column({ type: 'tinyint', default: 1 })
  requires_customer_validation: number;

  @Column({ type: 'varchar', length: 100, default: 'Customer ID' })
  customer_id_label: string;

  @Column({ type: 'varchar', length: 100, default: 'Enter customer ID' })
  customer_id_placeholder: string;

  @Column({ type: 'tinyint', default: 1 })
  is_active: number;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;
}
