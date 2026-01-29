import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sia_tr_log')
export class SiaTrLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  data: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  date: Date;
}
