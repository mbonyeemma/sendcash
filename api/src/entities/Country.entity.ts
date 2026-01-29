import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('countries')
export class Country {
  @PrimaryColumn({ type: 'int' })
  country_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 3, default: 'no' })
  has_payouts: string;

  @Column({ type: 'varchar', length: 10, default: 'active' })
  status: string;
}
