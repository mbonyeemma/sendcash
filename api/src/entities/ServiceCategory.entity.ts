import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('service_categories')
export class ServiceCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  color: string;

  @Column({ type: 'tinyint', default: 1 })
  is_active: number;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;
}
