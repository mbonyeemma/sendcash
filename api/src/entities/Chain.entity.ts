import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('chains')
export class Chain {
  @PrimaryColumn({ type: 'varchar', length: 16 })
  chain_code: string;

  @Column({ type: 'varchar', length: 32 })
  chain_name: string;

  @Column({ type: 'varchar', length: 8 })
  native_symbol: string;

  @Column({ type: 'text' })
  rpc_endpoint: string;

  @Column({ type: 'text' })
  wss_endpoint: string;

  @Column({ type: 'text' })
  explorer_url: string;

  @Column({ type: 'int' })
  min_deposit: number;
}
