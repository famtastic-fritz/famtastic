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
const capture = require('./capture-agent');
const sync = require('./sync-agent');
const qualifier = require('./qualifier-agent');
const sdr = require('./sdr-agent');
const billing = require('./billing-agent');
const monitor = require('./monitor-agent');
const memo = require('./memo-agent');
const growth = require('./growth-agent');

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

  console.log('9) capture ingests a raw hot lead (scored on intake)');
  let r = capture.ingest({ name: 'Pat Cruz', email: 'pat@hot.io', revenue: 80000, bottleneck: 'close_rate', lift: 50000, start7: 'yes' });
  ok(r.created && r.lead.priority === 'hot' && r.lead.fitScore >= 75, 'lead ingested and scored hot');
  ok(!capture.ingest({ email: 'pat@hot.io' }).created, 'duplicate email is rejected');

  console.log('10) qualifier routes it to qualified');
  let qs = await qualifier.run();
  db = store.load();
  let pat = db.leads.find((l) => l.email === 'pat@hot.io');
  ok(qs.qualified >= 1 && pat.status === 'qualified' && pat.stage === 'decision', 'lead qualified + routed');

  console.log('11) sdr contacts the lead and opens a deal');
  let ss = await sdr.run();
  db = store.load();
  pat = db.leads.find((l) => l.email === 'pat@hot.io');
  let patDeal = db.deals.find((d) => d.leadId === pat.id);
  ok(ss.contacted >= 1 && !!pat.firstContactAt, 'lead contacted (SLA clock cleared)');
  ok(ss.dealsOpened >= 1 && patDeal && patDeal.status === 'open', 'deal opened (status open, not won)');
  ok(pat.status === 'converted', 'lead marked converted');

  console.log('12) sdr never fabricates a win — closing stays a human signal');
  await sdr.run();
  db = store.load();
  ok(db.deals.find((d) => d.leadId === pat.id).status === 'open', 'deal still open after re-run (no auto-win)');

  console.log('13) sync-agent auto-ingests a live lead and auto-reconciles a payment');
  // A local invoice carrying a Stripe id (as billing would record in live mode).
  db = store.load();
  db.deals.push({ id: 'deal_sync', email: 'win@sync.io', name: 'Win Sync', amount: 5000, currency: 'USD', status: 'invoiced' });
  db.invoices.push({ id: 'inv_sync', dealId: 'deal_sync', email: 'win@sync.io', amount: 5000, currency: 'USD', status: 'sent', stripeInvoiceId: 'in_LIVE123', remindersSent: 0, paidAt: null, dueAt: daysAgo(-1) });
  store.save(db);
  // The Azure Table rows the deployed functions would have written.
  const fixture = path.join(tmp, 'table.json');
  fs.writeFileSync(fixture, JSON.stringify([
    { formType: 'qualification', name: 'New Inbound', email: 'fresh@inbound.io', revenue: 70000, bottleneck: 'lead_volume', lift: 40000, start7: 'yes' },
    { rowKey: 'paid-in_LIVE123', status: 'collected', invoiceId: 'in_LIVE123', email: 'win@sync.io', amount: 5000, paidAt: new Date().toISOString() }
  ]));
  process.env.ABOS_SYNC_FIXTURE = fixture;
  const sy = await sync.run();
  db = store.load();
  ok(sy.ingested === 1 && db.leads.some((l) => l.email === 'fresh@inbound.io'), 'inbound lead auto-ingested from the table');
  ok(sy.paid === 1 && db.invoices.find((i) => i.id === 'inv_sync').status === 'paid', 'payment auto-reconciled by Stripe invoice id');
  const sy2 = await sync.run();
  ok(sy2.ingested === 0 && sy2.paid === 0, 'sync is idempotent (no double ingest/pay)');
  delete process.env.ABOS_SYNC_FIXTURE;

  console.log('14) auto-close mode removes the human win');
  process.env.ABOS_AUTO_CLOSE = '1';
  capture.ingest({ name: 'Auto Close', email: 'auto@close.io', revenue: 90000, bottleneck: 'close_rate', lift: 60000, start7: 'yes' });
  await qualifier.run();
  const ac = await sdr.run();
  db = store.load();
  const acDeal = db.deals.find((d) => d.email === 'auto@close.io');
  ok(ac.autoClosed >= 1 && acDeal && acDeal.status === 'won', 'hot deal auto-closed to won without a human');
  delete process.env.ABOS_AUTO_CLOSE;

  console.log('15) growth-agent builds a capped, idempotent outreach worklist');
  const prospects = path.join(tmp, 'prospects.json');
  fs.writeFileSync(prospects, JSON.stringify([
    { id: 'g1', name: 'A One', company: 'Co1', email: 'a@one.io', channel: 'email', segment: 'agencies' },
    { id: 'g2', name: 'B Two', channel: 'linkedin', handle: 'in/btwo', segment: 'consultants' },
    { id: 'g3', name: 'C Three', channel: 'referral', segment: 'local service' }
  ]));
  process.env.ABOS_PROSPECTS = prospects;
  process.env.ABOS_WORKLIST_DIR = tmp;
  process.env.ABOS_OUTREACH_CAP = '2';
  const g1 = growth.run();
  ok(g1.worklisted === 2 && g1.remaining === 1, 'first run queues the cap (2), 1 remaining');
  ok(fs.existsSync(g1.file) && /Outreach worklist/.test(fs.readFileSync(g1.file, 'utf8')), 'worklist file written with copy');
  const g2 = growth.run();
  ok(g2.worklisted === 1 && g2.remaining === 0, 'second run queues the rest (no repeats)');
  const g3 = growth.run();
  ok(g3.worklisted === 0, 'third run is a no-op (all touched)');

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} passed, ${fail} failed`);
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
