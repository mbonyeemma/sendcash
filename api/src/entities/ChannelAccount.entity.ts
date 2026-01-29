import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('channel_accounts')
export class ChannelAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 70 })
  private_key: string;

  @Column({ type: 'varchar', length: 90 })
  public_key: string;

  @Column({ type: 'varchar', length: 20, default: 'free' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;
}
