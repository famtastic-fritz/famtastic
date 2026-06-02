'use strict';

/*
 * Agent Business OS — Stripe webhook (autonomous reconciliation).
 *
 * Anonymous POST /api/stripe-webhook. Stripe calls this the instant a payment
 * clears; we verify the signature, then mark the invoice collected, alert
 * Telegram, and (when configured) update the Azure Table row. This is what makes
 * money-in fully autonomous — no polling.
 *
 * Env (Azure app settings; the vault IDs in Credentials.md map to these at deploy):
 *   STRIPE_WEBHOOK_SECRET   signing secret (vault: payments/stripe.webhook_secret) — REQUIRED to verify
 *   STRIPE_WEBHOOK_TOLERANCE_SEC  timestamp tolerance (default 300)
 *   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID / TELEGRAM_THREAD_ID   alerts
 *   LEADS_TABLE_CONNECTION_STRING / LEADS_TABLE_NAME   mark the lead/deal collected
 */

const crypto = require('crypto');

const PAID_EVENTS = new Set([
  'invoice.paid',
  'invoice.payment_succeeded',
  'checkout.session.completed',
  'payment_intent.succeeded'
]);

module.exports = async function (context, req) {
  const respond = (status, body) => {
    context.res = { status, headers: { 'Content-Type': 'application/json' }, body };
  };

  if (!req || (req.method && req.method.toUpperCase() !== 'POST')) {
    return respond(405, { ok: false, error: 'method_not_allowed' });
  }

  const raw = typeof req.rawBody === 'string'
    ? req.rawBody
    : (req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {}));
  const sig = header(req, 'stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  // Verify the signature when a secret is configured. If it's set and the
  // signature is bad, reject — this endpoint moves the business to "paid".
  if (secret) {
    const ok = verifySignature(raw, sig, secret, parseInt(process.env.STRIPE_WEBHOOK_TOLERANCE_SEC || '300', 10));
    if (!ok) { context.log.warn('stripe webhook signature invalid'); return respond(400, { ok: false, error: 'bad_signature' }); }
  } else {
    context.log.warn('STRIPE_WEBHOOK_SECRET unset — processing event UNVERIFIED (configure before go-live)');
  }

  let event;
  try { event = JSON.parse(raw); } catch (_) { return respond(400, { ok: false, error: 'bad_json' }); }

  const type = event && event.type;
  if (!PAID_EVENTS.has(type)) {
    // Acknowledge everything else so Stripe doesn't retry.
    return respond(200, { received: true, ignored: type });
  }

  const obj = (event.data && event.data.object) || {};
  const lead = {
    invoiceId: obj.id || obj.invoice || null,
    email: obj.customer_email || (obj.customer_details && obj.customer_details.email) || null,
    amount: typeof obj.amount_paid === 'number' ? obj.amount_paid / 100
          : typeof obj.amount_total === 'number' ? obj.amount_total / 100
          : typeof obj.amount === 'number' ? obj.amount / 100 : null,
    currency: (obj.currency || 'usd').toUpperCase(),
    type
  };

  await markCollected(context, lead);
  await notifyTelegram(context, lead);

  return respond(200, { received: true, collected: lead.invoiceId });
};

function header(req, name) {
  if (!req.headers) return '';
  return req.headers[name] || req.headers[name.toLowerCase()] || '';
}

function verifySignature(raw, sigHeader, secret, toleranceSec) {
  if (!sigHeader) return false;
  const parts = {};
  String(sigHeader).split(',').forEach((kv) => {
    const i = kv.indexOf('=');
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  });
  const t = parts.t, v1 = parts.v1;
  if (!t || !v1) return false;
  if (toleranceSec > 0) {
    const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(t, 10));
    if (isNaN(age) || age > toleranceSec) return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${raw}`, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(v1, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function markCollected(context, lead) {
  const conn = process.env.LEADS_TABLE_CONNECTION_STRING;
  if (!conn || !lead.email) return;
  try {
    const { TableClient } = require('@azure/data-tables');
    const tableName = process.env.LEADS_TABLE_NAME || 'inboundleads';
    const client = TableClient.fromConnectionString(conn, tableName);
    // Best-effort: stamp a collection record. (Full deal-row lookup is Wave 3.)
    await client.createTable().catch(() => {});
    await client.createEntity({
      partitionKey: new Date().toISOString().slice(0, 10),
      rowKey: `paid-${lead.invoiceId || Date.now()}`,
      email: lead.email,
      invoiceId: lead.invoiceId || '',
      amount: lead.amount || 0,
      currency: lead.currency,
      stage: 'collections',
      status: 'collected',
      paidAt: new Date().toISOString()
    });
  } catch (err) {
    context.log.error('markCollected failed', err && err.message);
  }
}

async function notifyTelegram(context, lead) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  const amt = lead.amount != null ? `$${lead.amount} ${lead.currency}` : '(amount n/a)';
  const text = [
    `💰 Payment received — ${amt}`,
    lead.email ? `From: ${lead.email}` : null,
    lead.invoiceId ? `Invoice: ${lead.invoiceId}` : null,
    `Event: ${lead.type}`
  ].filter(Boolean).join('\n');
  try {
    const body = { chat_id: chatId, text };
    if (process.env.TELEGRAM_THREAD_ID) body.message_thread_id = Number(process.env.TELEGRAM_THREAD_ID);
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!r.ok) context.log.warn('telegram non-2xx', r.status);
  } catch (err) {
    context.log.warn('telegram notify failed', err && err.message);
  }
}
