import { APP_CONFIG } from './config.js';

const BASE = APP_CONFIG.paypal.env === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const PAYPAL_ID_RE = /^[A-Z0-9-]{1,40}$/;
const HAS_REAL_PAYPAL = Boolean(APP_CONFIG.paypal.clientId && APP_CONFIG.paypal.secret);

export function getPaymentMode() {
  return HAS_REAL_PAYPAL ? APP_CONFIG.paypal.env : 'mock';
}

export function assertValidPayPalOrderId(id) {
  if (!PAYPAL_ID_RE.test(id)) {
    throw new Error(`Invalid PayPal order ID format: "${id}"`);
  }
}

async function getAccessToken() {
  if (!HAS_REAL_PAYPAL) {
    throw new Error('PayPal credentials missing');
  }
  const credentials = Buffer.from(`${APP_CONFIG.paypal.clientId}:${APP_CONFIG.paypal.secret}`).toString('base64');
  const response = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) {
    throw new Error(`PayPal auth failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return data.access_token;
}

export async function createPayPalOrder(totalCents, options = {}) {
  if (!HAS_REAL_PAYPAL) {
    const mockId = `MOCK-${Date.now()}`;
    const returnUrl = options.returnUrl || '';
    const cancelUrl = options.cancelUrl || returnUrl || '';
    return {
      id: mockId,
      approvalUrl: returnUrl ? `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}token=${encodeURIComponent(mockId)}&PayerID=MOCKPAYER` : null,
      cancelUrl: cancelUrl || null,
      mode: 'mock',
      raw: { id: mockId, status: 'CREATED', mock: true },
    };
  }
  const token = await getAccessToken();
  const value = (totalCents / 100).toFixed(2);
  const response = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      application_context: {
        return_url: options.returnUrl,
        cancel_url: options.cancelUrl || options.returnUrl,
        user_action: 'PAY_NOW',
      },
      purchase_units: [
        {
          amount: {
            currency_code: APP_CONFIG.premium.currency,
            value,
          },
          description: APP_CONFIG.premium.productName,
          custom_id: String(totalCents),
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`PayPal create order failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const approvalUrl = data.links?.find(link => link.rel === 'approve')?.href ?? null;
  const cancelUrl = data.links?.find(link => link.rel === 'cancel')?.href ?? options.cancelUrl ?? null;
  return {
    id: data.id,
    approvalUrl,
    cancelUrl,
    mode: APP_CONFIG.paypal.env,
    raw: data,
  };
}

export async function capturePayPalOrder(paypalOrderId) {
  assertValidPayPalOrderId(paypalOrderId);
  if (!HAS_REAL_PAYPAL) {
    return {
      paypalOrderId,
      status: 'COMPLETED',
      payerEmail: null,
      amountCaptured: (APP_CONFIG.premium.priceCents / 100).toFixed(2),
      currency: APP_CONFIG.premium.currency,
      raw: { id: paypalOrderId, status: 'COMPLETED', mock: true },
    };
  }
  const token = await getAccessToken();
  const response = await fetch(`${BASE}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error(`PayPal capture failed: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  const captured = data.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    paypalOrderId: data.id,
    status: data.status,
    payerEmail: data.payer?.email_address ?? null,
    amountCaptured: captured?.amount?.value ?? '0.00',
    currency: captured?.amount?.currency_code ?? APP_CONFIG.premium.currency,
    raw: data,
  };
}
