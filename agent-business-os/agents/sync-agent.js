'use strict';

/*
 * sync-agent — bridges the deployed Azure functions to the local pipeline.
 *
 * The functions (/api/lead, /api/stripe-webhook) write to Azure Table; the
 * agents read ops/pipeline.json. This pulls the gap closed automatically so the
 * loop is fully no-touch:
 *   • inbound lead rows  → capture.ingest (dedupes by email)
 *   • payment rows       → flip the matching local invoice to `paid`
 *                          (match by Stripe invoice id, else by email→open deal)
 *
 * Source of entities:
 *   • ABOS_SYNC_FIXTURE=<path>            read a JSON array (tests / dry runs)
 *   • else LEADS_TABLE_CONNECTION_STRING  read live Azure Table
 *   • else                                no-op (returns { skipped: true })
 *
 * Idempotent: re-running never double-ingests or double-pays (dedupe by email,
 * by Stripe invoice id, and by paymentRef = the webhook row key).
 */

const fs = require('fs');
const store = require('./lib/store');
const capture = require('./capture-agent');
const { vaultRead } = require('./lib/money');

async function loadEntities() {
  if (process.env.ABOS_SYNC_FIXTURE) {
    try { return JSON.parse(fs.readFileSync(process.env.ABOS_SYNC_FIXTURE, 'utf8')); }
    catch (_) { return []; }
  }
  // Connection from env, else the vault (keeps the secret out of plists/cron).
  const conn = process.env.LEADS_TABLE_CONNECTION_STRING || vaultRead('payments/leads_table_connection_string');
  if (!conn) return null;
  try {
    const { TableClient } = require('@azure/data-tables');
    const client = TableClient.fromConnectionString(conn, process.env.LEADS_TABLE_NAME || 'inboundleads');
    const out = [];
    for await (const e of client.listEntities()) out.push(e);
    return out;
  } catch (err) {
    console.log('sync: table read failed ' + (err && err.message));
    return null;
  }
}

function isPayment(e) {
  return e && (e.status === 'collected' || e.paidAt || (e.rowKey && String(e.rowKey).startsWith('paid-')));
}
function isLead(e) {
  return e && e.email && !isPayment(e) && (e.formType === 'qualification' || e.stage === 'inbound' || e.fitScore != null);
}

async function run() {
  const entities = await loadEntities();
  if (entities === null) return { skipped: true };

  const summary = { ingested: 0, paid: 0 };

  // 1) inbound leads → capture (handles its own dedupe + save)
  for (const e of entities.filter(isLead)) {
    const r = capture.ingest({
      name: e.name, email: e.email, revenue: e.revenue, bottleneck: e.bottleneck,
      lift: e.lift || e.desiredLift, start7: e.start7, utm: safeUtm(e.utm)
    });
    if (r.created) summary.ingested++;
  }

  // 2) payments → flip the matching local invoice to paid
  const db = store.load();
  db.invoices = db.invoices || [];
  for (const e of entities.filter(isPayment)) {
    const ref = e.rowKey || `pay-${e.invoiceId || e.email}`;
    if (db.invoices.some((i) => i.paymentRef === ref)) continue; // already synced

    let inv = e.invoiceId && db.invoices.find((i) => i.stripeInvoiceId && i.stripeInvoiceId === e.invoiceId);
    if (!inv && e.email) {
      // No Stripe-id match → attach to an open deal for this email.
      const deal = db.deals.find((d) => (d.email || '').toLowerCase() === String(e.email).toLowerCase()
        && ['open', 'won', 'invoiced'].includes(d.status));
      if (deal) inv = db.invoices.find((i) => i.dealId === deal.id);
      if (deal && !inv) {
        inv = {
          id: store.newId('inv'), dealId: deal.id, email: deal.email,
          amount: Number(e.amount) || deal.amount || 0, currency: deal.currency || 'USD',
          status: 'manual_pending', hostedUrl: '', stripeInvoiceId: e.invoiceId || '',
          cashAppUrl: '', sentAt: new Date().toISOString(), dueAt: new Date().toISOString(),
          remindersSent: 0, paidAt: null
        };
        db.invoices.push(inv);
      }
    }
    if (!inv) continue; // no local match — leave for a human (e.g. Cash App)

    inv.status = 'paid';
    inv.paidAt = e.paidAt || new Date().toISOString();
    inv.paymentRef = ref;
    summary.paid++;
    store.logEvent('sync-agent', 'payment_synced', inv.id, { ref, amount: inv.amount });
  }
  store.save(db);
  return summary;
}

function safeUtm(u) { if (!u) return {}; if (typeof u === 'object') return u; try { return JSON.parse(u); } catch (_) { return {}; } }

module.exports = { run };

if (require.main === module) {
  run().then((s) => console.log('sync-agent:', JSON.stringify(s))).catch((e) => { console.error(e); process.exit(1); });
}
