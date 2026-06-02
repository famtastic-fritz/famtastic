'use strict';
/**
 * Pipeline activity collector — reads the shared JSONL stores the agents write
 * (leads, outreach, follow-ups, inbound, responses) and summarizes the funnel.
 *
 * This is how the Command Center monitors the autonomous business: not just
 * "is the agent alive" (process-health) but "is it producing work" — leads
 * found, outreach sent vs. drafted, replies handled, deals advancing.
 */
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DATA = path.join(REPO_ROOT, 'pipeline', 'data');

function readJsonl(file) {
  const abs = path.join(DATA, file);
  const byId = new Map();
  const noId = [];
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch { return []; }
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t);
      if (o.id) byId.set(o.id, o); // latest write wins (status updates append)
      else noId.push(o);
    } catch { /* skip */ }
  }
  return [...byId.values(), ...noId];
}

function countBy(arr, key) {
  const out = {};
  for (const x of arr) {
    const k = x[key] || 'unknown';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function collect() {
  const leads = readJsonl('leads.jsonl');
  const outreach = readJsonl('outreach.jsonl');
  const followups = readJsonl('followups.jsonl');
  const inbound = readJsonl('inbound.jsonl');
  const responses = readJsonl('responses.jsonl');

  const sentReal = (arr) => arr.filter((x) => x.sent === true).length;
  const drafted = (arr) => arr.filter((x) => x.status === 'draft_dry_run').length;
  const blocked = (arr) => arr.filter((x) => x.status === 'blocked_kill_switch').length;

  return {
    funnel: {
      leads: leads.length,
      contacted: leads.filter((l) => l.status === 'contacted').length,
      replied: leads.filter((l) => l.status === 'replied').length,
      won: leads.filter((l) => l.status === 'won').length,
      dead: leads.filter((l) => l.status === 'dead').length
    },
    leadsBySource: countBy(leads, 'source'),
    outreach: { total: outreach.length, sent: sentReal(outreach), drafted: drafted(outreach), blocked: blocked(outreach) },
    followups: { total: followups.length, sent: sentReal(followups), drafted: drafted(followups) },
    inbound: { total: inbound.length, unhandled: inbound.filter((x) => !x.handled).length },
    responses: { total: responses.length, sent: sentReal(responses), drafted: drafted(responses) },
    topLeads: [...leads]
      .filter((l) => typeof l.score === 'number')
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 8)
      .map((l) => ({ title: l.title || l.id, score: l.score, budget: l.budget || null, status: l.status, source: l.source }))
  };
}

module.exports = { collect };
