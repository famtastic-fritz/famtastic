'use strict';

/*
 * billing-agent — money-in, autonomous.
 *
 * On each run it:
 *   1. issues an invoice for every `won` deal that doesn't have one yet
 *      (Stripe when live + keyed, else a manual-pending invoice carrying a Cash
 *      App link), and moves the deal to `invoiced`;
 *   2. marks `sent`/`manual_pending` invoices `overdue` once past due, sends a
 *      dunning reminder (capped), and escalates after the cap;
 *   3. on a `paid` invoice (flipped by the Stripe webhook → store sync, or the
 *      `mark-paid` CLI), moves the deal to `collected` and stops dunning.
 *
 * Money-out (refunds/payouts) is NOT implemented here — that line is human-gated.
 * Idempotent: safe to run on any cadence.
 */

const store = require('./lib/store');
const money = require('./lib/money');
const { notify } = require('./lib/notify');

const TERMS_DAYS = parseInt(process.env.ABOS_INVOICE_TERMS_DAYS || '7', 10);
const DUNNING_MAX = parseInt(process.env.ABOS_DUNNING_MAX || '3', 10);
const DUNNING_EVERY_HRS = parseInt(process.env.ABOS_DUNNING_EVERY_HRS || '48', 10);

function hoursSince(iso) { return (Date.now() - new Date(iso).getTime()) / 36e5; }

async function run() {
  const db = store.load();
  db.invoices = db.invoices || [];
  const summary = { issued: 0, overdue: 0, reminded: 0, escalated: 0, collected: 0 };

  // 1) issue invoices for won deals
  for (const deal of db.deals) {
    if (deal.status !== 'won') continue;
    if (db.invoices.some((i) => i.dealId === deal.id)) continue;

    const amount = Number(deal.amount) || 0;
    const dueAt = new Date(Date.now() + TERMS_DAYS * 864e5).toISOString();
    const inv = {
      id: store.newId('inv'),
      dealId: deal.id,
      email: deal.email,
      amount,
      currency: deal.currency || 'USD',
      status: 'manual_pending',
      hostedUrl: '',
      cashAppUrl: money.cashAppLink(amount),
      sentAt: new Date().toISOString(),
      dueAt,
      remindersSent: 0,
      paidAt: null
    };

    const res = money.sendStripeInvoice(deal.email, amount, deal.description, TERMS_DAYS);
    if (res.ok) { inv.status = 'sent'; inv.hostedUrl = res.hostedUrl; }

    db.invoices.push(inv);
    deal.status = 'invoiced';
    summary.issued++;
    store.logEvent('billing-agent', 'invoice_issued', inv.id, { dealId: deal.id, amount, mode: res.ok ? 'stripe' : res.reason });
    await notify('info', `Invoice ${inv.id} issued to ${deal.email} for $${amount} (${res.ok ? 'Stripe sent' : 'manual-pending: ' + res.reason})`);
  }

  // 2) overdue + dunning  /  3) collected
  for (const inv of db.invoices) {
    if (inv.status === 'paid') {
      const deal = db.deals.find((d) => d.id === inv.dealId);
      if (deal && deal.status !== 'collected') {
        deal.status = 'collected';
        summary.collected++;
        store.logEvent('billing-agent', 'deal_collected', deal.id, { invoiceId: inv.id, amount: inv.amount });
        await notify('info', `Collected $${inv.amount} on ${inv.id} — deal ${deal.id} closed.`);
      }
      continue;
    }

    const active = inv.status === 'sent' || inv.status === 'manual_pending' || inv.status === 'overdue';
    if (!active) continue;
    if (hoursSince(inv.dueAt) <= 0) continue; // not due yet

    if (inv.status !== 'overdue') { inv.status = 'overdue'; summary.overdue++; store.logEvent('billing-agent', 'invoice_overdue', inv.id, { dealId: inv.dealId }); }

    const lastTouch = inv.lastReminderAt || inv.sentAt;
    if (hoursSince(lastTouch) < DUNNING_EVERY_HRS) continue;

    if (inv.remindersSent < DUNNING_MAX) {
      inv.remindersSent++;
      inv.lastReminderAt = new Date().toISOString();
      summary.reminded++;
      store.logEvent('billing-agent', 'dunning_reminder', inv.id, { n: inv.remindersSent });
      await notify('warn', `Dunning reminder ${inv.remindersSent}/${DUNNING_MAX} for ${inv.id} (${inv.email}, $${inv.amount} overdue).`);
    } else if (!inv.escalated) {
      inv.escalated = true;
      summary.escalated++;
      store.logEvent('billing-agent', 'dunning_escalated', inv.id, {});
      await notify('critical', `Invoice ${inv.id} (${inv.email}, $${inv.amount}) unpaid after ${DUNNING_MAX} reminders — needs a human.`);
    }
  }

  store.save(db);
  return summary;
}

module.exports = { run };

if (require.main === module) {
  run().then((s) => console.log('billing-agent:', JSON.stringify(s))).catch((e) => { console.error(e); process.exit(1); });
}
