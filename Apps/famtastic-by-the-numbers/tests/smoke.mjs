import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4174';
const EXPECTED_PRICE_CENTS = Number(process.env.EXPECTED_PRICE_CENTS || 2);
const EXPECTED_SUPPORT_EMAIL = process.env.EXPECTED_SUPPORT_EMAIL || 'hello@famtasticdesigns.com';
const EXPECTED_PRODUCT_NAME = process.env.EXPECTED_PRODUCT_NAME || 'FAMtastic By the Numbers Premium Unlock';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

async function fillChart(page, {
  fullName,
  birthDate,
  email,
  partnerName,
  partnerBirthDate,
}) {
  await page.locator('input[name="fullName"]').fill(fullName);
  await page.locator('input[name="birthDate"]').fill(birthDate);
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="partnerName"]').fill(partnerName);
  await page.locator('input[name="partnerBirthDate"]').fill(partnerBirthDate);
  await page.getByRole('button', { name: 'Generate chart' }).click();
}

async function fetchJson(path, init) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

try {
  const health = await fetchJson('/api/health');
  if (!health.ok) throw new Error(`Health check failed: ${health.status} ${JSON.stringify(health.data)}`);
  if (health.data.persistenceMode !== 'mysql') {
    throw new Error(`Closeout smoke requires persistenceMode=mysql. Saw ${health.data.persistenceMode}.`);
  }
  if (Number(health.data.premiumPriceCents) !== EXPECTED_PRICE_CENTS) {
    throw new Error(`Expected premiumPriceCents=${EXPECTED_PRICE_CENTS}. Saw ${health.data.premiumPriceCents}.`);
  }

  const config = await fetchJson('/api/config');
  if (!config.ok) throw new Error(`Config check failed: ${config.status} ${JSON.stringify(config.data)}`);
  if (Number(config.data.premium?.priceCents) !== EXPECTED_PRICE_CENTS) {
    throw new Error(`Expected config premium price ${EXPECTED_PRICE_CENTS}. Saw ${config.data.premium?.priceCents}.`);
  }
  if (config.data.supportEmail !== EXPECTED_SUPPORT_EMAIL) {
    throw new Error(`Expected support email ${EXPECTED_SUPPORT_EMAIL}. Saw ${config.data.supportEmail}.`);
  }
  if (config.data.premium?.productName !== EXPECTED_PRODUCT_NAME) {
    throw new Error(`Expected product name ${EXPECTED_PRODUCT_NAME}. Saw ${config.data.premium?.productName}.`);
  }

  await page.goto(BASE_URL, { waitUntil: 'networkidle' });

  await fillChart(page, {
    fullName: 'Fritz Medine',
    birthDate: '1984-07-11',
    email: 'fritz@example.com',
    partnerName: 'Shalique',
    partnerBirthDate: '1988-09-22',
  });

  await page.getByText("Fritz's chart").waitFor();
  await page.getByRole('button', { name: /Unlock premium/i }).click();
  await page.getByText(/Premium unlocked for fritz@example.com/i).waitFor();
  await page.locator('#premiumExperience').waitFor();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText(/Premium already active for fritz@example.com/i).waitFor();

  const status = await fetchJson('/api/purchase/status?email=fritz%40example.com');
  if (!status.ok || !status.data.unlocked) {
    throw new Error(`Purchase status did not confirm unlocked mysql state: ${status.status} ${JSON.stringify(status.data)}`);
  }
  if (!status.data.unlock?.paypal_order_id?.startsWith('MOCK-')) {
    throw new Error(`Expected mysql-backed mock purchase record. Saw ${JSON.stringify(status.data.unlock)}`);
  }

  await page.getByRole('button', { name: /Restore purchase/i }).click();
  await page.getByText(/Premium restored for fritz@example.com/i).waitFor();

  const body = await page.textContent('body');
  if (!body.includes('Deep profile') || !body.includes('Compatibility deep dive') || !body.includes('Year map')) {
    throw new Error('Expected premium unlock content missing from rendered output.');
  }

  const returnEmail = 'return-proof@example.com';
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await fillChart(page, {
    fullName: 'Return Proof',
    birthDate: '1990-01-03',
    email: returnEmail,
    partnerName: 'Partner Proof',
    partnerBirthDate: '1991-02-04',
  });
  await page.locator('#resultsArea').waitFor();
  await page.locator('#reportTitle').waitFor();

  const createOrder = await fetchJson('/api/paypal/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: returnEmail,
      chartInput: {
        fullName: 'Return Proof',
        birthDate: '1990-01-03',
        email: returnEmail,
        partnerName: 'Partner Proof',
        partnerBirthDate: '1991-02-04',
      },
    }),
  });

  if (!createOrder.ok) {
    throw new Error(`Create order failed during closeout smoke: ${createOrder.status} ${JSON.stringify(createOrder.data)}`);
  }
  if (!createOrder.data.paypalOrderId || !createOrder.data.approvalUrl) {
    throw new Error(`Create order did not return expected PayPal fields: ${JSON.stringify(createOrder.data)}`);
  }

  await page.evaluate(orderId => {
    localStorage.setItem('famtastic-by-the-numbers:pending-order-id', orderId);
  }, createOrder.data.paypalOrderId);

  await page.goto(`${BASE_URL}/?paypalReturn=1&token=${encodeURIComponent(createOrder.data.paypalOrderId)}&PayerID=MOCKPAYER`, { waitUntil: 'networkidle' });
  await page.locator('#premiumExperience').waitFor();

  const returnStatus = await fetchJson('/api/purchase/status?email=return-proof%40example.com');
  if (!returnStatus.ok || !returnStatus.data.unlocked) {
    throw new Error(`Return-proof email did not persist in mysql after PayPal return lane: ${returnStatus.status} ${JSON.stringify(returnStatus.data)}`);
  }

  console.log(`PASS: closeout smoke passed at ${BASE_URL} with mysql persistence and price ${EXPECTED_PRICE_CENTS} cents.`);
} finally {
  await browser.close();
}
