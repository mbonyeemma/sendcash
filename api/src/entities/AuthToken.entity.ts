import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('auth_tokens')
export class AuthToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  user_id: string;

  @Column({ type: 'text' })
  refresh_token: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'created_on' })
  created_on: Date;
}
