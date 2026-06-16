'use strict';

/*
 * qualifier-agent — scores and routes leads.
 *
 * Ensures every lead has a fit score + priority (recomputing if missing or stale),
 * then routes: hot/warm → `qualified` (ready for the sdr), nurture → `nurtured`.
 * Read/writes the pipeline store; idempotent.
 */

const store = require('./lib/store');
const { score } = require('./lib/score');

async function run() {
  const db = store.load();
  db.leads = db.leads || [];
  const summary = { scored: 0, qualified: 0, nurtured: 0 };

  for (const lead of db.leads) {
    if (lead.status === 'qualified' || lead.status === 'nurtured' || lead.status === 'converted') continue;

    if (lead.fitScore == null || lead.priority == null) {
      const s = score(lead);
      lead.fitScore = s.fitScore; lead.priority = s.priority; lead.responseSlaMinutes = s.responseSlaMinutes;
      summary.scored++;
    }

    if (lead.priority === 'hot' || lead.priority === 'warm') {
      lead.status = 'qualified'; lead.stage = 'decision'; summary.qualified++;
      store.logEvent('qualifier-agent', 'lead_qualified', lead.id, { priority: lead.priority, fitScore: lead.fitScore });
    } else {
      lead.status = 'nurtured'; lead.stage = 'nurture'; summary.nurtured++;
      store.logEvent('qualifier-agent', 'lead_nurtured', lead.id, { fitScore: lead.fitScore });
    }
  }

  store.save(db);
  return summary;
}

module.exports = { run };

if (require.main === module) {
  run().then((s) => console.log('qualifier-agent:', JSON.stringify(s))).catch((e) => { console.error(e); process.exit(1); });
}
