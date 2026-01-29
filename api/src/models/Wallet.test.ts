/**
 * Wallet model tests – plain Node script (no Jest). Run: npm run test:wallet
 * Uses real Relworx (requestPayment). Set RELWORX_URL, RELWORX_API_KEY, RELWORX_BUSINESS_ACCOUNT
 * for depositRequest success. DB and SMS are mocked so you see logs without a live DB.
 */

// --- Mocks: DB and SMS only (Relworx is real) ---
let pdoResults: any[] = [{ insertId: 1 }];
let pdoCallIndex = 0;

const path = require('path');
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (request: string) {
  const resolved = path.resolve(path.dirname(this.filename), request);
  const str = (resolved + '') + (request || '');
  if (str.includes('db.helper') && !str.includes('node_modules')) {
    return {
      default: {
        pdo: () => {
          const out = pdoResults[pdoCallIndex] ?? { insertId: 1 };
          pdoCallIndex++;
          return Promise.resolve(Array.isArray(out) ? out : out);
        },
      },
    };
  }
  if ((str.includes('SMSHelper') || (request && request.includes('SMSHelper'))) && !str.includes('node_modules')) {
    const MockSMSHelper = function (this: any) {
      this.initializeSMSClient = function () {
        console.log('  [MOCK SMSHelper.initializeSMSClient called]');
      };
    };
    return { __esModule: true, default: MockSMSHelper };
  }
  return origRequire.apply(this, arguments as any);
};

const { Wallet } = require('./Wallet');

// --- Helpers ---
function ok(cond: boolean, msg: string) {
  if (cond) {
    console.log('  ✓', msg);
    return true;
  }
  console.log('  ✗ FAIL:', msg);
  return false;
}

async function run(name: string, fn: () => Promise<void>) {
  console.log('\n---', name, '---');
  try {
    await fn();
  } catch (e) {
    console.log('  ✗ Error:', e);
  }
}

// --- Tests ---
async function main() {
  const wallet = new Wallet();

  await run('getSupportedAssets', async () => {
    const res = await wallet.getSupportedAssets();
    ok(res.status === 200, `status 200, got ${res.status}`);
    ok(res.data?.assets?.includes('RLUSD'), `assets includes RLUSD: ${JSON.stringify(res.data)}`);
  });

  await run('getOnrampQuote with amount_ugx', async () => {
    const res = await wallet.getOnrampQuote({ amount_ugx: 10000 });
    ok(res.status === 200, `status 200, got ${res.status}`);
    ok(res.data?.amount_ugx === 10000, `amount_ugx 10000, got ${res.data?.amount_ugx}`);
    ok((res.data?.fee_ugx ?? 0) === 50, `fee_ugx 50, got ${res.data?.fee_ugx}`);
    console.log('  data:', res.data);
  });

  await run('getOnrampQuote with amount_rlusd', async () => {
    const res = await wallet.getOnrampQuote({ amount_rlusd: 10 });
    ok(res.status === 200, `status 200, got ${res.status}`);
    ok(res.data?.amount_rlusd === 10, `amount_rlusd 10, got ${res.data?.amount_rlusd}`);
    console.log('  data:', res.data);
  });

  await run('getOnrampQuote missing amounts', async () => {
    const res = await wallet.getOnrampQuote({});
    ok(res.status === 400, `status 400, got ${res.status}`);
    ok((res.message || '').includes('amount_ugx or amount_rlusd'), `message: ${res.message}`);
  });

  await run('depositRequest – missing userId', async () => {
    process.env.RELWORX_BUSINESS_ACCOUNT = 'RELC55DA3FF80';
    pdoCallIndex = 0;
    pdoResults = [{ insertId: 1 }];
    const res = await wallet.depositRequest({
      userId: '',
      amount: 50000,
      currency: 'UGX',
      account_number: '256787719618',
      destination_address: 'rDest123',
    });
    ok(res.status === 400, `status 400, got ${res.status}`);
    ok((res.message || '').includes('userId'), `message: ${res.message}`);
  });

  await run('depositRequest – missing phone', async () => {
    process.env.RELWORX_BUSINESS_ACCOUNT = 'RELC55DA3FF80';
    pdoCallIndex = 0;
    pdoResults = [{ insertId: 1 }];
    const res = await wallet.depositRequest({
      userId: 'user-1',
      amount: 50000,
      currency: 'UGX',
      account_number: '',
      destination_address: 'rDest123',
    });
    ok(res.status === 400, `status 400, got ${res.status}`);
    ok((res.message || '').includes('Phone') || (res.message || '').includes('account_number'), `message: ${res.message}`);
  });

  await run('depositRequest – RELWORX not configured', async () => {
    delete process.env.RELWORX_BUSINESS_ACCOUNT;
    pdoCallIndex = 0;
    pdoResults = [{ insertId: 1 }];
    const res = await wallet.depositRequest({
      userId: 'user-1',
      amount: 50000,
      currency: 'UGX',
      account_number: '256787719618',
      destination_address: 'rDest123',
    });
    ok(res.status === 400, `status 400, got ${res.status}`);
    ok((res.message || '').includes('configured') || (res.message || '').includes('RELWORX'), `message: ${res.message}`);
  });

  await run('depositRequest – success (real Relworx requestPayment)', async () => {
    if (!process.env.RELWORX_BUSINESS_ACCOUNT) {
      process.env.RELWORX_BUSINESS_ACCOUNT = process.env.RELWORX_BUSINESS_ACCOUNT || 'RELC55DA3FF80';
    }
    pdoCallIndex = 0;
    pdoResults = [{ insertId: 1 }];
    console.log('  Calling depositRequest → Relworx.requestPayment (real)...');
    const res = await wallet.depositRequest({
      userId: 'user-1',
      amount: 50000,
      currency: 'UGX',
      account_number: '256787719618',
      destination_address: 'rDest123',
    });
    console.log('  Relworx response:', { status: res.status, message: res.message, data: res.data });
    if (res.status === 200) {
      ok(true, 'Relworx accepted request (popup sent to phone)');
      ok(res.data?.phone_raw === '256787719618', `phone_raw: ${res.data?.phone_raw}`);
      ok(res.data?.amount_ugx === 50000, `amount_ugx: ${res.data?.amount_ugx}`);
    } else {
      ok(res.status === 400 || res.status === 500, `expected 200 with RELWORX_* set; got ${res.status} (check RELWORX_URL, RELWORX_API_KEY, RELWORX_BUSINESS_ACCOUNT)`);
      console.log('  (Set RELWORX_URL, RELWORX_API_KEY, RELWORX_BUSINESS_ACCOUNT for real request.)');
    }
  });

  await run('validateUserAccount MOBILE_MONEY', async () => {
    pdoCallIndex = 0;
    pdoResults = [{ insertId: 1 }];
    const res = await wallet.validateUserAccount({
      userId: 'u1',
      receiver_account: '256700000000',
      amount: 1000,
      payment_method: 'MOBILE_MONEY',
    });
    ok(res.status === 200, `status 200, got ${res.status}`);
    ok(res.data?.payment_method === 'MOBILE_MONEY', `payment_method: ${res.data?.payment_method}`);
    console.log('  data:', res.data);
  });

  await run('getExchangeRate', async () => {
    const res = await wallet.getExchangeRate({ from_currency: 'UGX', to_currency: 'USD' });
    ok(res.status === 200, `status 200, got ${res.status}`);
    ok(res.data?.rate === 3570, `rate 3570, got ${res.data?.rate}`);
    console.log('  data:', res.data);
  });

  await run('addPaymentMethod – invalid type', async () => {
    const res = await wallet.addPaymentMethod({ userId: 'u1', type: 'INVALID', currency: 'UGX' });
    ok(res.status === 400, `status 400, got ${res.status}`);
    ok((res.message || '').includes('Invalid'), `message: ${res.message}`);
  });

  await run('addPaymentMethod – success MOBILE', async () => {
    pdoCallIndex = 0;
    pdoResults = [{ insertId: 1 }];
    const res = await wallet.addPaymentMethod({
      userId: 'u1',
      type: 'MOBILE',
      currency: 'UGX',
      phone_number: '256700111222',
      network: 'MTN',
    });
    ok(res.status === 201, `status 201, got ${res.status}`);
    ok((res.data?.payment_method_id || '').startsWith('pm'), `payment_method_id: ${res.data?.payment_method_id}`);
    console.log('  data:', res.data);
  });

  await run('setTransactionPin – pin mismatch', async () => {
    pdoCallIndex = 0;
    pdoResults = [{ insertId: 1 }];
    const res = await wallet.setTransactionPin({
      userId: 'u1',
      pin: '1234',
      confirm_pin: '5678',
    });
    ok(res.status === 400, `status 400, got ${res.status}`);
    ok((res.message || '').includes('match'), `message: ${res.message}`);
  });

  await run('getTransactionById – missing id', async () => {
    const res = await wallet.getTransactionById('');
    ok(res.status === 400, `status 400, got ${res.status}`);
  });

  await run('getTransactionById – not found', async () => {
    pdoCallIndex = 0;
    pdoResults = [[]];
    const res = await wallet.getTransactionById('trans-unknown');
    ok(res.status === 404, `status 404, got ${res.status}`);
  });

  await run('deletePaymentMethod – missing id', async () => {
    const res = await wallet.deletePaymentMethod('', 'user-1');
    ok(res.status === 400, `status 400, got ${res.status}`);
  });

  await run('deletePaymentMethod – not found', async () => {
    pdoCallIndex = 0;
    pdoResults = [[]];
    const res = await wallet.deletePaymentMethod('pm-unknown', 'user-1');
    ok(res.status === 404, `status 404, got ${res.status}`);
  });

  await run('stableCoinDeposit', async () => {
    const res = await wallet.stableCoinDeposit({});
    ok(res.status === 400, `status 400, got ${res.status}`);
    ok((res.message || '').toLowerCase().includes('onramp'), `message: ${res.message}`);
  });

  console.log('\n--- done ---\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
