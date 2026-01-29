import { AppDataSource } from '../data-source';
import { Country } from '../entities/Country.entity';

const DEFAULT_COUNTRIES = [
  { country_id: 254, name: 'KENYA', has_payouts: 'no', status: 'active' },
  { country_id: 256, name: 'UGANDA', has_payouts: 'no', status: 'active' },
];

export async function seedCountries(): Promise<void> {
  const repo = AppDataSource.getRepository(Country);
  for (const row of DEFAULT_COUNTRIES) {
    const existing = await repo.findOne({ where: { country_id: row.country_id } });
    if (!existing) {
      await repo.save(repo.create(row));
      console.log(`Seeded country: ${row.name} (${row.country_id})`);
    }
  }
}
