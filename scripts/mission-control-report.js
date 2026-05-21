#!/usr/bin/env node
'use strict';

const path = require('path');
const { buildMissionControlSnapshot } = require('../lib/famtastic/mission-control');

function parseArgs(argv) {
  const args = {
    json: false,
    root: null,
    hubRoot: null,
    staleAfterHours: 48,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--json') args.json = true;
    else if (arg === '--root') { args.root = next; i += 1; }
    else if (arg === '--hub-root') { args.hubRoot = next; i += 1; }
    else if (arg === '--stale-after-hours') { args.staleAfterHours = Number(next); i += 1; }
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function plural(value, label) {
  return `${value} ${label}${value === 1 ? '' : 's'}`;
}

function renderSection(title, items, format, empty = 'none') {
  const lines = [`\n${title}:`];
  if (!items.length) {
    lines.push(`- ${empty}`);
    return lines;
  }
  for (const item of items.slice(0, 12)) lines.push(`- ${format(item)}`);
  if (items.length > 12) lines.push(`- … ${items.length - 12} more`);
  return lines;
}

function renderText(snapshot) {
  const s = snapshot.summary;
  const lines = [
    'Mission Control — Data Center Status/Proof Reader',
    `Generated: ${snapshot.generated_at}`,
    `Data Center: ${snapshot.data_center.root}`,
    `Canonical store: ${snapshot.data_center.canonical ? 'Data Center only' : 'unknown'}`,
    '',
    `Research jobs: ${s.research_jobs.total} (${plural(s.research_jobs.blocked, 'blocked')}, ${plural(s.research_jobs.stale, 'stale')})`,
    `Witness checks: ${s.witness_checks.total} (${plural(s.witness_checks.passing, 'passing')}, ${plural(s.witness_checks.failing, 'failing')}, ${plural(s.witness_checks.stale, 'stale')})`,
    `Claims: ${s.claims.total}`,
    `Decisions: ${s.decisions.total}`,
    `Needs Fritz: ${s.needs_fritz.total}`,
    `Stale/blocked: ${s.stale_or_blocked.total}`,
    `Proofs: ${s.proofs.total}`,
    `Post-evals: ${s.post_eval.total} (${plural(s.post_eval.opportunities, 'opportunity')}, ${plural(s.post_eval.high_priority, 'high-priority')})`,
    `Raw capture inbox files: ${snapshot.raw_capture_inbox.total}`,
  ];

  lines.push(...renderSection('Needs Fritz', snapshot.needs_fritz, item => `${item.kind} ${item.id || ''}${item.reason ? ` — ${item.reason}` : ''}`));
  lines.push(...renderSection('Stale or blocked', snapshot.stale_or_blocked, item => `${item.kind} ${item.id} (${item.status || 'unknown'})${item.is_stale ? ' stale' : ''}${item.is_blocked ? ' blocked' : ''}`));
  lines.push(...renderSection('Research jobs', snapshot.research_jobs, job => `${job.id} — ${job.status}${job.is_stale ? ' stale' : ''}${job.is_blocked ? ' blocked' : ''}`));
  lines.push(...renderSection('Witness checks', snapshot.witness_checks, check => `${check.capability} — ${check.status}${check.is_stale ? ' stale' : ''}`));
  lines.push(...renderSection('Claims', snapshot.claims, claim => `${claim.claim_id} — ${claim.status}: ${claim.statement.slice(0, 100)}`));
  lines.push(...renderSection('Decisions', snapshot.decisions, decision => `${decision.decision_id} — ${decision.status}: ${decision.title}`));
  lines.push(...renderSection('Post-evals', snapshot.post_eval, item => `${item.evaluation_id} — ${item.run?.title || 'post-eval'} (${item.opportunities.length} opportunities)`));
  lines.push(...renderSection('Proofs', snapshot.proofs, proof => `${proof.kind} ${proof.id} — ${proof.path || proof.status}`));

  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv);
  const snapshot = buildMissionControlSnapshot({
    root: args.root ? path.resolve(args.root) : undefined,
    hubRoot: args.hubRoot ? path.resolve(args.hubRoot) : undefined,
    staleAfterHours: args.staleAfterHours,
  });

  if (args.json) {
    console.log(JSON.stringify(snapshot, null, 2));
    return;
  }
  console.log(renderText(snapshot));
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { parseArgs, renderText };
