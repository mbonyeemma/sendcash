import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('biller_categories')
export class BillerCategory {
  @PrimaryGeneratedColumn({ name: 'categoryid' })
  categoryid: number;

  @Column({ type: 'varchar', length: 50 })
  categoryname: string;

  @Column({ type: 'text' })
  image: string;

  @Column({ type: 'varchar', length: 4, default: 'UGX' })
  currency: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  service_name: string;

  @Column({ type: 'varchar', length: 10 })
  status: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category_code: string;
}
