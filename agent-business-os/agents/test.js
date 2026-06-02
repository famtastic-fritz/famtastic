'use strict';

/* Self-contained lifecycle test for the agent runtimes. No network, no Stripe
 * (dry-run billing), no real brain (digest → temp dir). Run: node agents/test.js */

const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abos-test-'));
process.env.ABOS_STORE = path.join(tmp, 'pipeline.json');
process.env.ABOS_EVENTS = path.join(tmp, 'events.jsonl');
process.env.ABOS_DIGEST_DIR = path.join(tmp, 'digests');
process.env.ABOS_DUNNING_EVERY_HRS = '48';
process.env.ABOS_DUNNING_MAX = '3';
delete process.env.ABOS_LIVE_BILLING; // force dry-run (no Stripe)
delete process.env.TELEGRAM_BOT_TOKEN; // stdout-only alerts

const store = require('./lib/store');
const billing = require('./billing-agent');
const monitor = require('./monitor-agent');
const memo = require('./memo-agent');

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) { pass++; console.log('  ✓ ' + msg); } else { fail++; console.log('  ✗ ' + msg); } }
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

(async () => {
  // Seed: one won deal + one new lead already past its 15-min SLA.
  store.save({
    version: 1,
    leads: [{ id: 'lead_1', email: 'a@b.co', responseSlaMinutes: 15, createdAt: daysAgo(1), firstContactAt: null, status: 'new' }],
    deals: [{ id: 'deal_1', email: 'a@b.co', name: 'A B', amount: 3500, currency: 'USD', description: 'Sprint', status: 'won' }],
    invoices: []
  });

  console.log('1) billing issues an invoice for the won deal');
  let s = await billing.run();
  let db = store.load();
  ok(s.issued === 1, 'one invoice issued');
  ok(db.invoices.length === 1 && db.invoices[0].status === 'manual_pending', 'invoice manual_pending (dry-run, no Stripe key)');
  ok(db.deals[0].status === 'invoiced', 'deal moved to invoiced');

  console.log('2) monitor flags the SLA breach and writes health.json');
  let h = await monitor.run();
  ok(h.alerts.slaBreaches === 1, 'one SLA breach detected');
  ok(h.status === 'warn', 'status warn');
  ok(fs.existsSync(path.join(tmp, 'health.json')), 'health.json written');
  ok(h.kpis.cashToday === 0, 'cash today $0 before payment');

  console.log('3) invoice goes overdue → first dunning reminder');
  db = store.load();
  db.invoices[0].dueAt = daysAgo(1);
  db.invoices[0].sentAt = daysAgo(3);
  store.save(db);
  s = await billing.run();
  db = store.load();
  ok(db.invoices[0].status === 'overdue', 'invoice marked overdue');
  ok(db.invoices[0].remindersSent === 1, 'one dunning reminder sent');

  console.log('4) after max reminders → escalation');
  db = store.load();
  db.invoices[0].remindersSent = 3;
  db.invoices[0].lastReminderAt = daysAgo(3);
  store.save(db);
  s = await billing.run();
  db = store.load();
  ok(s.escalated === 1 && db.invoices[0].escalated === true, 'invoice escalated for a human');

  console.log('5) payment lands (webhook/manual sync) → deal collected');
  db = store.load();
  db.invoices[0].status = 'paid';
  db.invoices[0].paidAt = new Date().toISOString();
  store.save(db);
  s = await billing.run();
  db = store.load();
  ok(s.collected === 1 && db.deals[0].status === 'collected', 'deal closed as collected');

  console.log('6) monitor now reports cash today = $3500');
  // sdr-agent would have contacted the seeded lead by now — clear the SLA breach.
  db = store.load();
  db.leads[0].firstContactAt = new Date().toISOString();
  store.save(db);
  h = await monitor.run();
  ok(h.kpis.cashToday === 3500, 'cash today $3500 after payment');
  ok(h.alerts.escalatedInvoices === 0, 'paid invoice no longer alerts as escalated');
  ok(h.status === 'ok', 'status back to ok');

  console.log('7) memo writes a daily digest into the brain');
  const out = memo.run();
  ok(fs.existsSync(out), 'digest file created');
  ok(/Daily Digest/.test(fs.readFileSync(out, 'utf8')), 'digest has expected content');

  console.log('8) idempotency — a second billing run is a no-op');
  s = await billing.run();
  ok(s.issued === 0 && s.reminded === 0 && s.escalated === 0, 'no duplicate work on re-run');

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
