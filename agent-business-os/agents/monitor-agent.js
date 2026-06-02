'use strict';

/*
 * monitor-agent — the always-on nervous system.
 *
 * Computes the KPIs from the pipeline store (cash/day is the headline), checks
 * SLA breaches and overdue invoices, writes a health snapshot to ops/health.json,
 * and alerts at tiered severity. Read-only against the pipeline (never mutates
 * leads/deals/invoices) so it's safe to run as often as you like.
 */

const fs = require('fs');
const path = require('path');
const store = require('./lib/store');
const { notify } = require('./lib/notify');

const CASH_TARGET = parseFloat(process.env.ABOS_CASH_TARGET || '0'); // daily $ target; 0 = no target alert
const sum = (arr, f) => arr.reduce((a, x) => a + (Number(f(x)) || 0), 0);
const minsSince = (iso) => (Date.now() - new Date(iso).getTime()) / 6e4;
const sameDay = (iso, ref) => iso && new Date(iso).toISOString().slice(0, 10) === ref;
const within = (iso, days) => iso && (Date.now() - new Date(iso).getTime()) <= days * 864e5;

async function run() {
  const db = store.load();
  const health = compute(db);

  const hp = path.join(path.dirname(store.storePath()), 'health.json');
  fs.mkdirSync(path.dirname(hp), { recursive: true });
  fs.writeFileSync(hp, JSON.stringify(health, null, 2));
  store.logEvent('monitor-agent', 'health_snapshot', null, health.kpis);

  // Alerts
  const k = health.kpis, a = health.alerts;
  const headline = `cash today $${k.cashToday} (7d $${k.cashTrailing7}) · pipeline $${k.openPipeline} · ${k.deals} deals · ${k.invoices} invoices`;
  if (a.escalatedInvoices) await notify('critical', `${a.escalatedInvoices} invoice(s) escalated. ${headline}`);
  if (a.slaBreaches) await notify('warn', `${a.slaBreaches} lead(s) past response SLA. ${headline}`);
  if (a.overdueInvoices) await notify('warn', `${a.overdueInvoices} invoice(s) overdue. ${headline}`);
  if (CASH_TARGET > 0 && k.cashToday < CASH_TARGET) await notify('info', `Cash today $${k.cashToday} below target $${CASH_TARGET}.`);
  await notify('info', `monitor: ${headline} [${health.status}]`);

  return health;
}

// Pure KPI computation — no side effects, shared with the memo agent.
function compute(db) {
  const leads = db.leads || [], deals = db.deals || [], invoices = db.invoices || [];
  const today = new Date().toISOString().slice(0, 10);

  const paid = invoices.filter((i) => i.status === 'paid' && i.paidAt);
  const cashToday = sum(paid.filter((i) => sameDay(i.paidAt, today)), (i) => i.amount);
  const cashTrailing7 = sum(paid.filter((i) => within(i.paidAt, 7)), (i) => i.amount);
  const openPipeline = sum(deals.filter((d) => ['open', 'won', 'invoiced'].includes(d.status)), (d) => d.amount);

  const slaBreaches = leads.filter((l) =>
    !l.firstContactAt && l.responseSlaMinutes && minsSince(l.createdAt) > l.responseSlaMinutes
  );
  // Only alert on currently-actionable invoices — a paid invoice is not an alert,
  // even if it was escalated before payment landed.
  const overdue = invoices.filter((i) => i.status === 'overdue');
  const escalated = invoices.filter((i) => i.escalated && i.status !== 'paid');
  const byStatus = (arr) => arr.reduce((m, x) => { m[x.status] = (m[x.status] || 0) + 1; return m; }, {});

  const health = {
    generatedAt: new Date().toISOString(),
    kpis: {
      cashToday, cashTrailing7, cashTarget: CASH_TARGET,
      openPipeline,
      leads: leads.length,
      deals: deals.length, dealsByStatus: byStatus(deals),
      invoices: invoices.length, invoicesByStatus: byStatus(invoices)
    },
    alerts: {
      slaBreaches: slaBreaches.length,
      overdueInvoices: overdue.length,
      escalatedInvoices: escalated.length
    },
    status: 'ok'
  };
  if (escalated.length > 0) health.status = 'critical';
  else if (slaBreaches.length > 0 || overdue.length > 0) health.status = 'warn';
  return health;
}

module.exports = { run, compute };

if (require.main === module) {
  run().then((h) => console.log('monitor-agent:', JSON.stringify(h.kpis), h.status)).catch((e) => { console.error(e); process.exit(1); });
}
