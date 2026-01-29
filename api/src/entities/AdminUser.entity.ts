import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('admin_user')
export class AdminUser {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'varchar', length: 150, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  full_name: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;
}
