import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 90 })
  operation: string;

  @Column({ type: 'text', nullable: true })
  data: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
