import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sia_notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  message_type: string;

  @Column({ type: 'varchar', length: 50 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 10, default: 'unread' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
