'use strict';
/**
 * FAMtastic Command Center — single source of truth.
 *
 * Zero external dependencies (Node built-in http + crypto), so it runs as a
 * rock-solid launchd service alongside Studio. Serves:
 *   GET  /                     dashboard (public/index.html)
 *   GET  /api/status           one aggregated snapshot (health + income + ideas + kill switch)
 *   GET  /api/processes        live agent health
 *   GET  /api/income           revenue ledger + aggregates
 *   GET  /api/ideas            de-noised, scored idea backlog
 *   POST /api/income/manual    log a real deal by hand {amount, source, customer, description}
 *   GET  /api/kill-switch      current autonomous-send state
 *   POST /api/kill-switch      {engaged: bool, by?: string} — halt/resume autonomous sending
 *   POST /webhooks/stripe      verified Stripe payment events -> ledger
 *   POST /webhooks/paypal      PayPal payment events -> ledger
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const processHealth = require('./collectors/process-health');
const income = require('./collectors/income-ledger');
const ideas = require('./collectors/ideas');

const PORT = Number(process.env.COMMAND_CENTER_PORT || 7878);
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const REGISTRY_PATH = path.join(DATA_DIR, 'agents-registry.json');
const KILL_SWITCH_PATH = path.join(DATA_DIR, 'kill-switch.json');

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

function nowSec() {
  return Date.now() / 1000;
}

function loadRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return { agents: [] };
  }
}

/* ---------- kill switch (the guardrail for fully-autonomous send) ---------- */
function readKillSwitch() {
  try {
    return JSON.parse(fs.readFileSync(KILL_SWITCH_PATH, 'utf8'));
  } catch {
    return { engaged: false, ts: null, by: null };
  }
}
function writeKillSwitch(engaged, by) {
  const state = { engaged: !!engaged, ts: nowSec(), by: by || 'dashboard' };
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(KILL_SWITCH_PATH, JSON.stringify(state, null, 2));
  return state;
}

/* ---------- helpers ---------- */
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', () => resolve(Buffer.alloc(0)));
  });
}

function serveStatic(res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  rel = rel.split('?')[0];
  const abs = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!abs.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('forbidden');
  }
  fs.readFile(abs, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    const ext = path.extname(abs);
    const type =
      ext === '.html' ? 'text/html'
      : ext === '.js' ? 'text/javascript'
      : ext === '.css' ? 'text/css'
      : ext === '.json' ? 'application/json'
      : 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(data);
  });
}

/* ---------- Stripe signature verification (no SDK) ---------- */
function verifyStripe(rawBody, sigHeader, secret) {
  if (!secret || !sigHeader) return { ok: false, reason: 'no secret/signature' };
  const parts = Object.fromEntries(
    sigHeader.split(',').map((kv) => kv.split('=').map((s) => s.trim()))
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return { ok: false, reason: 'malformed signature' };
  const signedPayload = `${t}.${rawBody.toString('utf8')}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  let ok = false;
  try {
    ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  } catch {
    ok = false;
  }
  // tolerance: 5 min
  if (ok && Math.abs(nowSec() - Number(t)) > 300) return { ok: false, reason: 'timestamp out of tolerance' };
  return { ok, reason: ok ? null : 'signature mismatch' };
}

function stripeEventToLedger(evt) {
  const obj = evt?.data?.object || {};
  const type = evt?.type || '';
  let amount_cents = null;
  let customer = null;
  let description = null;

  if (type === 'checkout.session.completed') {
    amount_cents = obj.amount_total;
    customer = obj.customer_details?.email || obj.customer_email || null;
    description = obj.id;
  } else if (type === 'payment_intent.succeeded') {
    amount_cents = obj.amount_received ?? obj.amount;
    customer = obj.receipt_email || null;
    description = obj.description || obj.id;
  } else if (type === 'charge.succeeded') {
    amount_cents = obj.amount;
    customer = obj.billing_details?.email || obj.receipt_email || null;
    description = obj.description || obj.id;
  } else {
    return null; // non-payment event, ignore
  }
  if (!amount_cents) return null;
  return {
    id: `stripe_${evt.id}`,
    ts: evt.created || nowSec(),
    source: 'stripe',
    amount_cents,
    currency: (obj.currency || 'usd').toLowerCase(),
    customer,
    description,
    verified: true
  };
}

/* ---------- aggregated snapshot ---------- */
async function buildStatus() {
  const registry = loadRegistry();
  const now = nowSec();
  const health = await processHealth.collect(registry, now);
  const inc = income.collect(now);
  const idea = ideas.collect();
  const kill = readKillSwitch();
  const alerts = [];
  for (const a of health.agents) {
    if (a.status === 'hung') alerts.push({ level: 'critical', msg: `${a.label} is HUNG (PID alive, heartbeat stale)` });
    if (a.status === 'down') alerts.push({ level: 'warn', msg: `${a.label} is DOWN` });
    if (a.status === 'stale') alerts.push({ level: 'warn', msg: `${a.label} crashed (stale heartbeat, no process)` });
  }
  if (kill.engaged) alerts.push({ level: 'critical', msg: 'KILL SWITCH ENGAGED — autonomous sending halted' });
  if (inc.unverifiedCount > 0) alerts.push({ level: 'warn', msg: `${inc.unverifiedCount} unverified income event(s)` });

  return { ts: now, health, income: inc, ideas: idea, killSwitch: kill, alerts };
}

/* ---------- request router ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const p = url.pathname;
  const method = req.method;

  try {
    if (method === 'GET' && p === '/api/status') return sendJSON(res, 200, await buildStatus());
    if (method === 'GET' && p === '/api/processes') return sendJSON(res, 200, await processHealth.collect(loadRegistry(), nowSec()));
    if (method === 'GET' && p === '/api/income') return sendJSON(res, 200, income.collect(nowSec()));
    if (method === 'GET' && p === '/api/ideas') return sendJSON(res, 200, ideas.collect());

    if (method === 'GET' && p === '/api/kill-switch') return sendJSON(res, 200, readKillSwitch());
    if (method === 'POST' && p === '/api/kill-switch') {
      const body = await readBody(req);
      let parsed = {};
      try { parsed = JSON.parse(body.toString('utf8') || '{}'); } catch {}
      return sendJSON(res, 200, writeKillSwitch(parsed.engaged, parsed.by));
    }

    if (method === 'POST' && p === '/api/income/manual') {
      const body = await readBody(req);
      let parsed = {};
      try { parsed = JSON.parse(body.toString('utf8') || '{}'); } catch {}
      const amount = Number(parsed.amount);
      if (!amount || amount <= 0) return sendJSON(res, 400, { ok: false, error: 'amount (dollars) required' });
      const evt = {
        id: `manual_${Date.now()}_${Math.round(amount * 100)}`,
        ts: nowSec(),
        source: 'manual',
        amount_cents: Math.round(amount * 100),
        currency: (parsed.currency || 'usd').toLowerCase(),
        customer: parsed.customer || null,
        description: parsed.description || 'manual entry',
        verified: true
      };
      const r = income.append(evt);
      return sendJSON(res, 200, { ok: true, event: evt, duplicate: r.duplicate });
    }

    if (method === 'POST' && p === '/webhooks/stripe') {
      const raw = await readBody(req);
      const sig = req.headers['stripe-signature'];
      const v = verifyStripe(raw, sig, STRIPE_WEBHOOK_SECRET);
      if (!v.ok) return sendJSON(res, 400, { ok: false, error: `stripe verification failed: ${v.reason}` });
      let evt;
      try { evt = JSON.parse(raw.toString('utf8')); } catch { return sendJSON(res, 400, { ok: false, error: 'bad json' }); }
      const ledgerEvt = stripeEventToLedger(evt);
      if (ledgerEvt) income.append(ledgerEvt);
      return sendJSON(res, 200, { received: true, recorded: !!ledgerEvt });
    }

    if (method === 'POST' && p === '/webhooks/paypal') {
      // PayPal webhook verification requires a round-trip to PayPal's verify API
      // with the configured webhook id. Without creds we record the event but
      // mark it unverified so the dashboard flags it honestly.
      const raw = await readBody(req);
      let evt;
      try { evt = JSON.parse(raw.toString('utf8')); } catch { return sendJSON(res, 400, { ok: false, error: 'bad json' }); }
      const r = evt?.resource || {};
      const amt = r?.amount?.value || r?.seller_receivable_breakdown?.gross_amount?.value;
      if (amt) {
        income.append({
          id: `paypal_${evt.id || r.id || Date.now()}`,
          ts: nowSec(),
          source: 'paypal',
          amount_cents: Math.round(Number(amt) * 100),
          currency: (r?.amount?.currency_code || 'usd').toLowerCase(),
          customer: r?.payer?.email_address || null,
          description: evt.event_type || r.id || 'paypal',
          verified: false
        });
      }
      return sendJSON(res, 200, { received: true, recorded: !!amt, note: 'recorded unverified — configure PayPal verify creds' });
    }

    if (method === 'GET' && p === '/healthz') return sendJSON(res, 200, { ok: true, ts: nowSec() });

    if (method === 'GET') return serveStatic(res, p);

    res.writeHead(404);
    res.end('not found');
  } catch (err) {
    sendJSON(res, 500, { ok: false, error: String(err && err.message || err) });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[command-center] listening on http://localhost:${PORT} (pid ${process.pid})`);
});
