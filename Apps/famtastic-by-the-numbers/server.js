import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { APP_CONFIG, publicRuntimeConfig } from './lib/config.js';
import { createPayPalOrder, capturePayPalOrder, assertValidPayPalOrderId, getPaymentMode } from './lib/paypal.js';
import { saveCheckoutSession, getPendingCheckoutSession, recordSuccessfulPurchase, getActiveUnlockByEmail, getPersistenceMode } from './lib/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    app: 'famtastic-by-the-numbers',
    premiumPriceCents: APP_CONFIG.premium.priceCents,
    paymentMode: getPaymentMode(),
    persistenceMode: getPersistenceMode(),
  });
});

app.get('/api/config', (_req, res) => {
  res.json({ ...publicRuntimeConfig(), paymentMode: getPaymentMode(), persistenceMode: getPersistenceMode() });
});

app.get('/api/purchase/status', async (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const unlock = await getActiveUnlockByEmail(email);
    res.json({ unlocked: Boolean(unlock), unlock: unlock || null });
  } catch (error) {
    console.error('[purchase/status]', error);
    res.status(500).json({ error: 'Failed to read purchase status' });
  }
});

app.post('/api/purchase/restore', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const unlock = await getActiveUnlockByEmail(email);
    if (!unlock) return res.status(404).json({ unlocked: false, error: 'No active unlock found for that email' });
    res.json({ unlocked: true, unlock });
  } catch (error) {
    console.error('[purchase/restore]', error);
    res.status(500).json({ error: 'Failed to restore purchase' });
  }
});

app.post('/api/paypal/create-order', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const chartInput = req.body?.chartInput;
  if (!email) return res.status(400).json({ error: 'Email required' });
  if (!chartInput || typeof chartInput !== 'object') return res.status(400).json({ error: 'chartInput required' });
  try {
    const origin = `${req.protocol}://${req.get('host')}`;
    const returnUrl = `${origin}/?paypalReturn=1`;
    const cancelUrl = `${origin}/?paypalCancel=1`;
    const order = await createPayPalOrder(APP_CONFIG.premium.priceCents, { returnUrl, cancelUrl });
    const paypalOrderId = order.id;
    await saveCheckoutSession({
      paypalOrderId,
      email,
      chartInput,
      subtotalCents: APP_CONFIG.premium.priceCents,
    });
    res.json({
      paypalOrderId,
      paymentMode: getPaymentMode(),
      approvalUrl: order.approvalUrl,
      cancelUrl: order.cancelUrl,
    });
  } catch (error) {
    console.error('[paypal/create-order]', error);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

app.post('/api/paypal/capture-order', async (req, res) => {
  const paypalOrderId = String(req.body?.paypalOrderId || '').trim();
  if (!paypalOrderId) return res.status(400).json({ error: 'paypalOrderId required' });
  try {
    assertValidPayPalOrderId(paypalOrderId);
  } catch {
    return res.status(400).json({ error: 'Invalid paypalOrderId format' });
  }

  try {
    const checkout = await getPendingCheckoutSession(paypalOrderId);
    if (!checkout) return res.status(409).json({ error: 'Checkout session not found or already used' });

    const capture = await capturePayPalOrder(paypalOrderId);
    if (capture.status !== 'COMPLETED') {
      return res.status(502).json({ error: `Payment not completed: ${capture.status}` });
    }

    const capturedCents = Math.round(parseFloat(capture.amountCaptured) * 100);
    if (Math.abs(capturedCents - Number(checkout.subtotal_cents)) > 1) {
      return res.status(409).json({ error: 'Payment amount mismatch — contact support' });
    }

    const unlock = await recordSuccessfulPurchase({
      paypalOrderId,
      payerEmail: capture.payerEmail || checkout.email,
      amountCents: capturedCents,
      currency: capture.currency,
      capturePayload: capture.raw,
    });

    res.json({
      success: true,
      paypalOrderId,
      paymentMode: getPaymentMode(),
      unlocked: true,
      unlock,
    });
  } catch (error) {
    console.error('[paypal/capture-order]', error);
    res.status(500).json({ error: 'Payment capture failed' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(APP_CONFIG.port, () => {
  console.log(`FAMtastic By the Numbers listening on http://127.0.0.1:${APP_CONFIG.port}`);
});
