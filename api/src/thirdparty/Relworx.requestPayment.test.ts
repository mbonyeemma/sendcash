

import Relworx from './Relworx';

async function main() {
  console.log('\n--- Relworx.requestPayment test ---\n');

  const mm = new Relworx();
  const accountNo = process.env.RELWORX_BUSINESS_ACCOUNT || 'RELC55DA3FF80';
  const reference = 'O' + Math.random().toString(36).slice(2, 12).toUpperCase();
  const msisdn = '+256787719618';
  const currency = 'UGX';
  const amount = 5000;
  const description = 'Buy RLUSD';

  console.log('Calling requestPayment(%s, %s, %s, %s, %s, %s)\n', accountNo, reference, msisdn, currency, amount, description);

  const result = await mm.requestPayment(accountNo, reference, msisdn, currency, amount, description);

  console.log('\n--- requestPayment result ---');
  console.log('status:', result.status);
  console.log('message:', result.message);
  console.log('data:', result.data);
  console.log('internal_reference:', result.internal_reference);
  console.log('\n--- done ---\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
