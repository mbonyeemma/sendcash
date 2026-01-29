import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('thirdparty_logs')
export class ThirdpartyLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  operation: string;

  @Column({ type: 'varchar', length: 100 })
  reference: string;

  @Column({ type: 'varchar', length: 50 })
  accountNo: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  ref: string;

  @Column({ type: 'text', nullable: true })
  payload: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
