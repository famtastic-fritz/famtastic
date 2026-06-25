import { publicRuntimeConfig } from '../lib/config.js';

const missing = ['PAYPAL_CLIENT_ID', 'PAYPAL_SECRET'].filter(key => !process.env[key]);

if (missing.length) {
  console.error(JSON.stringify({
    ok: false,
    ready: false,
    issue: 'missing-paypal-credentials',
    missing,
  }, null, 2));
  process.exit(1);
}

const runtime = publicRuntimeConfig();
const paymentMode = runtime.paypalClientId ? 'paypal' : 'mock';

if (paymentMode === 'mock') {
  console.error(JSON.stringify({
    ok: false,
    ready: false,
    issue: 'payment-mode-mock',
    paypalEnv: runtime.paypalEnv,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  ready: true,
  paypalEnv: runtime.paypalEnv,
  paypalClientIdPresent: true,
}, null, 2));
