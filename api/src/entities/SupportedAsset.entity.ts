import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('supported_assets')
export class SupportedAsset {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 32 })
  asset_code: string;

  @Column({ type: 'varchar', length: 64 })
  contract_address: string;

  @Column({ type: 'varchar', length: 16 })
  chain_code: string;

  @Column({ type: 'varchar', length: 255 })
  icon: string;
}
