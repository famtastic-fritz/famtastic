import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4174';
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

try {
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

  const createData = await page.evaluate(async () => {
    const response = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'return-proof@example.com',
        chartInput: {
          fullName: 'Return Proof',
          birthDate: '1990-01-03',
          email: 'return-proof@example.com',
          partnerName: 'Partner Proof',
          partnerBirthDate: '1991-02-04',
        },
      }),
    });
    const data = await response.json();
    return { ok: response.ok, status: response.status, data };
  });

  if (!createData.ok) throw new Error(`Create order failed: ${createData.status} ${JSON.stringify(createData.data)}`);
  if (!createData.data.paypalOrderId) throw new Error('Create order returned without paypalOrderId.');
  if (!createData.data.approvalUrl) throw new Error('Create order returned without approvalUrl.');

  await page.evaluate(orderId => {
    localStorage.setItem('famtastic-by-the-numbers:pending-order-id', orderId);
  }, createData.data.paypalOrderId);

  await page.goto(`${BASE_URL}/?paypalReturn=1&token=${encodeURIComponent(createData.data.paypalOrderId)}&PayerID=MOCKPAYER`, { waitUntil: 'networkidle' });
  await page.getByText(/PayPal order: MOCK-/i).waitFor();
  await page.locator('#premiumExperience').waitFor();

  const returnBody = await page.textContent('body');
  if (!returnBody.includes('Premium already active for return-proof@example.com') && !returnBody.includes('Premium unlocked for return-proof@example.com')) {
    throw new Error('PayPal return proof did not leave the return-proof email in an unlocked state.');
  }

  console.log(`PASS: local proof mode passed at ${BASE_URL}`);
} finally {
  await browser.close();
}
