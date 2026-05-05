#!/usr/bin/env node
/**
 * memory-promote.js — gated + auto-allowlist promoter.
 *
 * Reads either:
 *   - a capture packet (captures/inbox/<id>.json) in --review mode → writes
 *     a proposal to captures/review/<id>.proposal.json (one per packet)
 *   - a proposal (captures/review/<id>.proposal.json) in promote mode →
 *     writes canonical entries to memory/<type>/<id>.md, appends to
 *     .wolf/cerebrum.md and SITE-LEARNINGS.md, updates memory/INDEX.json
 *
 * Auto-promote rule (per memory/TAXONOMY.md):
 *   confidence >= 0.85 AND type in {vendor-fact, do-not-repeat, bug-pattern}
 *   AND canonical_id does not already exist
 *
 * Usage:
 *   node scripts/memory-promote.js review   <capture-id-or-path>
 *   node scripts/memory-promote.js promote  <proposal-id-or-path> [--auto] [--dry-run]
 *   node scripts/memory-promote.js list-auto-eligible <proposal-id-or-path>
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const INBOX  = path.join(REPO_ROOT, 'captures', 'inbox');
const REVIEW = path.join(REPO_ROOT, 'captures', 'review');
const MEMORY = path.join(REPO_ROOT, 'memory');
const INDEX  = path.join(MEMORY, 'INDEX.json');
const USAGE  = path.join(MEMORY, 'usage.jsonl');
const CEREBRUM = path.join(REPO_ROOT, '.wolf', 'cerebrum.md');
const SITE_LEARNINGS = path.join(REPO_ROOT, 'SITE-LEARNINGS.md');
const SCHEMA_VERSION = '0.2.0';

const AUTO_PROMOTE_TYPES = new Set(['vendor-fact', 'do-not-repeat', 'bug-pattern']);
const AUTO_PROMOTE_MIN_CONFIDENCE = 0.85;

function logUsage(event, memoryId, context = {}) {
  if (process.env.MEMORY_TELEMETRY === 'off') return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    memory_id: memoryId,
    event,
    context,
  }) + '\n';
  try { fs.appendFileSync(USAGE, line); } catch (_) {}
}

function resolvePath(idOrPath, dir, ext) {
  if (fs.existsSync(idOrPath)) return idOrPath;
  const candidates = [
    path.join(dir, idOrPath),
    path.join(dir, `${idOrPath}${ext}`),
    path.join(dir, `${idOrPath}.proposal.json`),
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error(`Could not resolve: ${idOrPath} in ${dir}`);
}

function autoPromoteEligible(entry) {
  if (entry.confidence < AUTO_PROMOTE_MIN_CONFIDENCE) return [false, `confidence ${entry.confidence} < ${AUTO_PROMOTE_MIN_CONFIDENCE}`];
  if (!AUTO_PROMOTE_TYPES.has(entry.type)) return [false, `type '${entry.type}' not in allowlist {${[...AUTO_PROMOTE_TYPES].join(', ')}}`];
  const canonPath = path.join(MEMORY, `${entry.canonical_id}.md`);
  if (fs.existsSync(canonPath)) return [false, `canonical_id already exists at ${canonPath}`];
  return [true, `confidence >= ${AUTO_PROMOTE_MIN_CONFIDENCE} AND type '${entry.type}' is in allowlist`];
}

function reviewCapture(capturePath) {
  const packet = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
  const proposedEntries = packet.extracted.map((ex, i) => {
    const canonicalId = ex.candidate_id || `${ex.type}/${packet.capture_id}-${i}`;
    const [eligible, reason] = autoPromoteEligible({
      confidence: ex.confidence,
      type: ex.type,
      canonical_id: canonicalId,
    });
    return {
      canonical_id: canonicalId,
      type: ex.type,
      title: ex.text,
      body: ex.rationale,
      facets: ex.facets || [],
      confidence: ex.confidence,
      lifecycle: 'active',
      source_capture: packet.capture_id,
      evidence: ex.evidence || [],
      auto_promote_eligible: eligible,
      auto_promote_reason: reason,
    };
  });

  const proposal = {
    schema_version: SCHEMA_VERSION,
    proposal_id: `prop_${packet.capture_id}`,
    from_capture: packet.capture_id,
    created_at: new Date().toISOString(),
    proposed_entries: proposedEntries,
    review_status: 'pending',
    approver: null,
    approved_at: null,
  };

  if (!fs.existsSync(REVIEW)) fs.mkdirSync(REVIEW, { recursive: true });
  const outPath = path.join(REVIEW, `${packet.capture_id}.proposal.json`);
  fs.writeFileSync(outPath, JSON.stringify(proposal, null, 2));
  logUsage('reviewed', null, { capture_id: packet.capture_id, proposal_id: proposal.proposal_id });

  console.log(`memory-promote review: wrote ${outPath}`);
  console.log(`  ${proposedEntries.length} proposed entries`);
  console.log(`  ${proposedEntries.filter(e => e.auto_promote_eligible).length} auto-promote eligible`);
  console.log(`  next: node scripts/memory-promote.js promote ${packet.capture_id} --auto`);
}

function frontmatter(entry, opts = {}) {
  return [
    '---',
    `schema_version: ${SCHEMA_VERSION}`,
    `canonical_id: ${entry.canonical_id}`,
    `type: ${entry.type}`,
    `title: ${JSON.stringify(entry.title)}`,
    `facets: [${entry.facets.map(f => JSON.stringify(f)).join(', ')}]`,
    `confidence: ${entry.confidence}`,
    `lifecycle: ${entry.lifecycle}`,
    `created_at: ${new Date().toISOString()}`,
    `promoted_at: ${new Date().toISOString()}`,
    `promoted_by: ${process.env.USER || 'unknown'}`,
    `source_capture: ${entry.source_capture}`,
    `references: []`,
    `seen_count: 0`,
    `last_surfaced_at: null`,
    `auto_promoted: ${opts.auto ? 'true' : 'false'}`,
    '---',
    '',
    `# ${entry.title}`,
    '',
    entry.body || '_(no body provided)_',
    '',
    '## Evidence',
    '',
    ...(entry.evidence || []).map(e => `- ${e}`),
    '',
    '## Backlinks',
    '',
    `- Capture: \`captures/inbox/${entry.source_capture}.json\``,
    '',
  ].join('\n');
}

function appendToCerebrum(entry, opts = {}) {
  if (!fs.existsSync(CEREBRUM)) return;
  const stamp = new Date().toISOString().slice(0, 10);
  const tag = opts.auto ? '(auto-promoted)' : '(human-promoted)';
  const block = [
    '',
    `### ${entry.canonical_id} — ${stamp} ${tag}`,
    '',
    `**Type:** \`${entry.type}\` | **Confidence:** ${entry.confidence} | **Facets:** ${entry.facets.join(', ') || '(none)'}`,
    '',
    entry.title,
    '',
    `_See \`memory/${entry.canonical_id}.md\` for body and evidence._`,
    '',
  ].join('\n');
  fs.appendFileSync(CEREBRUM, block);
}

function appendToSiteLearnings(entry) {
  if (!fs.existsSync(SITE_LEARNINGS)) return;
  const stamp = new Date().toISOString().slice(0, 10);
  const block = [
    '',
    `## Memory promotion (${stamp}) — ${entry.canonical_id}`,
    '',
    `**Type:** ${entry.type} | **Facets:** ${entry.facets.join(', ') || '(none)'}`,
    '',
    entry.title,
    '',
    `See \`memory/${entry.canonical_id}.md\`.`,
    '',
  ].join('\n');
  fs.appendFileSync(SITE_LEARNINGS, block);
}

function loadIndex() {
  if (!fs.existsSync(INDEX)) {
    return { schema_version: SCHEMA_VERSION, generated_at: new Date().toISOString(), entries: [] };
  }
  return JSON.parse(fs.readFileSync(INDEX, 'utf8'));
}

function saveIndex(idx) {
  idx.generated_at = new Date().toISOString();
  fs.writeFileSync(INDEX, JSON.stringify(idx, null, 2));
}

function indexUpsert(idx, entry) {
  const existing = idx.entries.findIndex(e => e.canonical_id === entry.canonical_id);
  const row = {
    canonical_id: entry.canonical_id,
    type: entry.type,
    title: entry.title,
    facets: entry.facets,
    lifecycle: entry.lifecycle,
    confidence: entry.confidence,
    path: `memory/${entry.canonical_id}.md`,
    seen_count: 0,
    last_surfaced_at: null,
  };
  if (existing >= 0) idx.entries[existing] = row;
  else idx.entries.push(row);
}

function promoteOne(entry, opts = {}) {
  const targetPath = path.join(MEMORY, `${entry.canonical_id}.md`);
  const targetDir = path.dirname(targetPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  if (opts.dryRun) {
    console.log(`(dry-run) would write ${targetPath}`);
    return { skipped: false, dryRun: true, path: targetPath };
  }

  fs.writeFileSync(targetPath, frontmatter(entry, opts));
  appendToCerebrum(entry, opts);
  if (entry.facets.includes('site-execution') || entry.type === 'learning') {
    appendToSiteLearnings(entry);
  }

  const idx = loadIndex();
  indexUpsert(idx, entry);
  saveIndex(idx);

  logUsage(opts.auto ? 'auto_promoted' : 'promoted', entry.canonical_id, {
    capture: entry.source_capture,
    type: entry.type,
  });

  return { skipped: false, dryRun: false, path: targetPath };
}

function promoteProposal(proposalPath, opts) {
  const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
  let promoted = 0, skipped = 0, gated = 0;
  const results = [];

  for (const entry of proposal.proposed_entries) {
    if (opts.auto && !entry.auto_promote_eligible) {
      gated++;
      results.push({ canonical_id: entry.canonical_id, status: 'gated', reason: entry.auto_promote_reason });
      continue;
    }
    const r = promoteOne(entry, { auto: opts.auto, dryRun: opts.dryRun });
    if (r.skipped) skipped++;
    else { promoted++; results.push({ canonical_id: entry.canonical_id, status: 'promoted', path: r.path, dryRun: r.dryRun }); }
  }

  if (!opts.dryRun) {
    proposal.review_status = (gated > 0 && promoted > 0) ? 'partially_approved' : (gated === 0 ? 'approved' : 'pending');
    proposal.approver = opts.auto ? 'auto-allowlist' : (process.env.USER || 'unknown');
    proposal.approved_at = new Date().toISOString();
    fs.writeFileSync(proposalPath, JSON.stringify(proposal, null, 2));
  }

  console.log(`memory-promote: promoted=${promoted} gated=${gated} skipped=${skipped}`);
  for (const r of results) {
    if (r.status === 'promoted') console.log(`  ✓ ${r.canonical_id} → ${r.path}${r.dryRun ? ' (dry-run)' : ''}`);
    else if (r.status === 'gated') console.log(`  ⊘ ${r.canonical_id} — gated: ${r.reason}`);
  }

  if (gated > 0 && opts.auto) {
    console.log(`\nGated entries need human approval. Re-run without --auto to promote interactively, or manually inspect ${proposalPath}.`);
  }
}

function listAutoEligible(proposalPath) {
  const proposal = JSON.parse(fs.readFileSync(proposalPath, 'utf8'));
  for (const e of proposal.proposed_entries) {
    const flag = e.auto_promote_eligible ? '✓' : '⊘';
    console.log(`${flag} ${e.canonical_id}  conf=${e.confidence}  type=${e.type}  — ${e.auto_promote_reason}`);
  }
}

function main() {
  const [, , cmd, target, ...flags] = process.argv;
  if (!cmd || !target) {
    console.error('Usage: memory-promote {review|promote|list-auto-eligible} <id-or-path> [--auto] [--dry-run]');
    process.exit(1);
  }
  const opts = {
    auto: flags.includes('--auto'),
    dryRun: flags.includes('--dry-run'),
  };

  if (cmd === 'review') {
    const p = resolvePath(target, INBOX, '.json');
    reviewCapture(p);
  } else if (cmd === 'promote') {
    const p = resolvePath(target, REVIEW, '.proposal.json');
    promoteProposal(p, opts);
  } else if (cmd === 'list-auto-eligible') {
    const p = resolvePath(target, REVIEW, '.proposal.json');
    listAutoEligible(p);
  } else {
    console.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }
}

main();
