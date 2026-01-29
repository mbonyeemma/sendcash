import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('biller_category_items')
export class BillerCategoryItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 30 })
  biller_id: string;

  @Column({ type: 'int' })
  record_id: number;

  @Column({ type: 'varchar', length: 50 })
  categoryname: string;

  @Column({ type: 'varchar', length: 50 })
  biller_name: string;

  @Column({ type: 'varchar', length: 50 })
  paycode: string;

  @Column({ type: 'varchar', length: 10 })
  currencySymbol: string;

  @Column({ type: 'varchar', length: 5, default: 'no' })
  hasPaymentItems: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  serviceDescription: string;

  @Column({ type: 'varchar', length: 10 })
  status: string;

  @Column({ type: 'int' })
  rank: number;

  @Column({ type: 'int', default: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 100, default: '1' })
  custom_views: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  image: string;
}
