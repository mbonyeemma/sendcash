import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('sia_wallets')
export class Wallet {
  @PrimaryColumn({ type: 'char', length: 36 })
  id: string;

  @Column({ type: 'char', length: 36, unique: true })
  user_id: string;

  @Column({ type: 'varchar', length: 50 })
  chain: string;

  @Column({ type: 'varchar', length: 255 })
  publicKey: string;

  @Column({ type: 'varchar', length: 255 })
  secret: string;

  @Column({ type: 'text', nullable: true })
  mnemonic: string;

  @Column({ type: 'timestamp', nullable: true, default: () => 'CURRENT_TIMESTAMP', name: 'created_at' })
  created_at: Date;
}
