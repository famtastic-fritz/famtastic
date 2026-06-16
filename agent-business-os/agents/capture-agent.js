'use strict';

/*
 * capture-agent — the front door into the pipeline store.
 *
 * Ingests a lead (from inbound /api/lead, an outbound reply, or a CLI/JSON feed),
 * dedupes by email, scores it, and parks it as `new` for the qualifier. Outbound
 * sourcing (the 50/day swarm) is a later hook — this is the ingestion seam that
 * everything downstream depends on.
 *
 * Programmatic: capture.ingest(leadObj) → { created, lead }
 * In production, the /api/lead webhook (or a poller of the Azure Table) calls this
 * to land inbound leads in the store.
 */

const store = require('./lib/store');
const { score } = require('./lib/score');

function ingest(input) {
  const db = store.load();
  db.leads = db.leads || [];

  const email = String((input && input.email) || '').trim().toLowerCase();
  if (!email) return { created: false, reason: 'no_email' };
  if (db.leads.some((l) => (l.email || '').toLowerCase() === email)) {
    return { created: false, reason: 'duplicate', email };
  }

  const s = score(input);
  const lead = {
    id: store.newId('lead'),
    name: input.name || '',
    email,
    revenue: input.revenue || 0,
    bottleneck: input.bottleneck || '',
    lift: input.lift || 0,
    start7: input.start7 || 'no',
    fitScore: s.fitScore,
    priority: s.priority,
    responseSlaMinutes: s.responseSlaMinutes,
    stage: 'capture',
    status: 'new',
    utm: input.utm || {},
    createdAt: new Date().toISOString(),
    firstContactAt: null
  };
  db.leads.push(lead);
  store.save(db);
  store.logEvent('capture-agent', 'lead_ingested', lead.id, { email, fitScore: s.fitScore, priority: s.priority });
  return { created: true, lead };
}

module.exports = { ingest };

// CLI: node capture-agent.js '<json>'   (a single lead object)
if (require.main === module) {
  let input = {};
  try { input = JSON.parse(process.argv[2] || '{}'); } catch (_) { console.error('capture: arg must be JSON'); process.exit(1); }
  const r = ingest(input);
  console.log('capture-agent:', JSON.stringify(r.created ? { created: true, id: r.lead.id, priority: r.lead.priority } : r));
}
