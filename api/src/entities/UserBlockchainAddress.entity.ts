import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_blockchain_addresses')
export class UserBlockchainAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  chain: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'text', nullable: true })
  private_key: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', name: 'updated_at' })
  updated_at: Date;
}
