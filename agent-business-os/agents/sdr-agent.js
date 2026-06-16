'use strict';

/*
 * sdr-agent — conversion: follow-up + opening deals.
 *
 * For each `qualified` lead not yet contacted: record outreach (sets
 * firstContactAt → clears the SLA clock) and advance to `conversion`. For hot
 * leads in conversion without a deal: open a deal (proposal sent, status `open`).
 *
 * Guardrail: the sdr NEVER marks a deal `won` — closing is a human/close signal
 * (`run.js win <dealId>`). It only opens the opportunity. The actual outreach
 * send (Resend email / LLM-drafted copy) is the hook at `outreach_sent`; today
 * it advances state deterministically so the pipeline is exercisable end-to-end.
 */

const store = require('./lib/store');

const DEFAULT_AMOUNT = parseFloat(process.env.ABOS_DEFAULT_DEAL_AMOUNT || '3500');
const DEFAULT_DESC = process.env.ABOS_DEFAULT_OFFER || 'ABOS Performance Sprint — setup';
// Fully-autonomous mode: a qualified hot inbound is itself the close trigger, so
// the deal is marked `won` and billing sends the hosted pay page immediately —
// no human `win`. Tradeoff: some invoiced leads won't pay; dunning + lapse handle
// that, and you only ever COLLECT when they actually pay. Money-out stays gated.
// (Read at call time, not module load, so the env can be set per run.)

async function run() {
  const AUTO_CLOSE = process.env.ABOS_AUTO_CLOSE === '1';
  const db = store.load();
  db.leads = db.leads || [];
  db.deals = db.deals || [];
  const summary = { contacted: 0, dealsOpened: 0 };

  for (const lead of db.leads) {
    // 1) first-touch qualified leads
    if (lead.status === 'qualified' && !lead.firstContactAt) {
      lead.firstContactAt = new Date().toISOString();
      lead.stage = 'conversion';
      summary.contacted++;
      store.logEvent('sdr-agent', 'outreach_sent', lead.id, { priority: lead.priority });
    }

    // 2) open a deal for hot leads in conversion that don't have one yet
    const isHotInConversion = lead.priority === 'hot' && lead.stage === 'conversion';
    const hasDeal = db.deals.some((d) => d.leadId === lead.id);
    if (isHotInConversion && !hasDeal) {
      const deal = {
        id: store.newId('deal'),
        leadId: lead.id,
        email: lead.email,
        name: lead.name || '',
        amount: DEFAULT_AMOUNT,
        currency: 'USD',
        description: DEFAULT_DESC,
        status: 'open',
        openedAt: new Date().toISOString()
      };
      if (AUTO_CLOSE) {
        deal.status = 'won';
        deal.wonAt = new Date().toISOString();
        deal.autoClosed = true;
        summary.autoClosed = (summary.autoClosed || 0) + 1;
        store.logEvent('sdr-agent', 'deal_autoclosed', deal.id, { leadId: lead.id, amount: deal.amount });
      }
      db.deals.push(deal);
      lead.status = 'converted';
      summary.dealsOpened++;
      store.logEvent('sdr-agent', 'deal_opened', deal.id, { leadId: lead.id, amount: deal.amount });
    }
  }

  store.save(db);
  return summary;
}

module.exports = { run };

if (require.main === module) {
  run().then((s) => console.log('sdr-agent:', JSON.stringify(s))).catch((e) => { console.error(e); process.exit(1); });
}
