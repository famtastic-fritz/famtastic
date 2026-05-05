#!/usr/bin/env node
/**
 * memory-digest.js — weekly digest + auto-promote-to-candidate.
 *
 * Reads memory/usage.jsonl, memory/INDEX.json, captures/inbox/ to compute:
 *   - New entries this week
 *   - Promotion candidates (capture pattern seen 3+ times across distinct sessions
 *     → auto-promote to lifecycle=candidate, NOT active)
 *   - Stale entries (no surfaced event in 60d, lifecycle still active — flag, do not auto-retire)
 *   - Auto-promotions from prior week (for retroactive review)
 *   - Recommendations
 *
 * Output: ~/PENDING-REVIEW.md (shared surface with intelligence loop)
 *
 * Per chat-capture-learn-optimize plan, ws_digest_optimizer.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const REPO_ROOT = path.resolve(__dirname, '..');
const MEMORY = path.join(REPO_ROOT, 'memory');
const INDEX = path.join(MEMORY, 'INDEX.json');
const USAGE = path.join(MEMORY, 'usage.jsonl');
const INBOX = path.join(REPO_ROOT, 'captures', 'inbox');
const REVIEW_DIR = path.join(REPO_ROOT, 'captures', 'review');
const PENDING_REVIEW = path.join(os.homedir(), 'PENDING-REVIEW.md');

const SCHEMA_VERSION = '0.2.0';
const STALE_DAYS = 60;
const RECURRENCE_THRESHOLD = 3;
const AUTO_CANDIDATE_TYPES = new Set(['vendor-fact', 'rule', 'do-not-repeat', 'bug-pattern', 'anti-pattern']);

function readJsonl(p) {
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(l => {
    try { return JSON.parse(l); } catch (_) { return null; }
  }).filter(Boolean);
}

function loadIndex() {
  if (!fs.existsSync(INDEX)) return { entries: [] };
  try { return JSON.parse(fs.readFileSync(INDEX, 'utf8')); }
  catch (_) { return { entries: [] }; }
}

function saveIndex(idx) {
  idx.generated_at = new Date().toISOString();
  fs.writeFileSync(INDEX, JSON.stringify(idx, null, 2));
}

function daysAgo(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function listCaptures() {
  if (!fs.existsSync(INBOX)) return [];
  return fs.readdirSync(INBOX).filter(f => f.endsWith('.json')).map(f => {
    try { return JSON.parse(fs.readFileSync(path.join(INBOX, f), 'utf8')); }
    catch (_) { return null; }
  }).filter(Boolean);
}

function recurrenceCandidates(captures, idx) {
  // Group extracted items across captures by candidate_id
  const counts = new Map(); // candidate_id → { count, sessions:Set, samples:[] }
  for (const cap of captures) {
    const session = cap.source?.session_id || cap.capture_id;
    for (const ex of (cap.extracted || [])) {
      if (!ex.candidate_id) continue;
      if (!AUTO_CANDIDATE_TYPES.has(ex.type)) continue;
      if (!counts.has(ex.candidate_id)) counts.set(ex.candidate_id, { count: 0, sessions: new Set(), samples: [], type: ex.type, facets: ex.facets || [], last: ex });
      const c = counts.get(ex.candidate_id);
      c.count++;
      c.sessions.add(session);
      if (c.samples.length < 3) c.samples.push(ex.text);
      c.last = ex;
    }
  }

  const existing = new Set(idx.entries.map(e => e.canonical_id));
  const promotable = [];
  for (const [id, info] of counts) {
    if (info.sessions.size < RECURRENCE_THRESHOLD) continue;
    if (existing.has(id)) continue;
    promotable.push({ canonical_id: id, type: info.type, facets: info.facets, recurrence: info.sessions.size, samples: info.samples, last: info.last });
  }
  return promotable;
}

function autoPromoteToCandidate(promotable) {
  if (!promotable.length) return [];
  const idx = loadIndex();
  const promoted = [];
  for (const p of promotable) {
    const targetPath = path.join(MEMORY, `${p.canonical_id}.md`);
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    if (fs.existsSync(targetPath)) continue;

    const fm = [
      '---',
      `schema_version: ${SCHEMA_VERSION}`,
      `canonical_id: ${p.canonical_id}`,
      `type: ${p.type}`,
      `title: ${JSON.stringify(p.last?.text || p.canonical_id)}`,
      `facets: [${p.facets.map(f => JSON.stringify(f)).join(', ')}]`,
      `confidence: ${(p.last?.confidence || 0.7)}`,
      `lifecycle: candidate`,
      `created_at: ${new Date().toISOString()}`,
      `promoted_at: ${new Date().toISOString()}`,
      `promoted_by: memory-digest.js (auto-candidate)`,
      `source_capture: digest-recurrence`,
      `references: []`,
      `seen_count: 0`,
      `last_surfaced_at: null`,
      `auto_promoted: true`,
      `recurrence_count: ${p.recurrence}`,
      '---',
      '',
      `# ${p.last?.text || p.canonical_id}`,
      '',
      `Auto-promoted to **candidate** by weekly digest because this pattern was seen across ${p.recurrence} distinct sessions. Promote to \`active\` requires human approval.`,
      '',
      '## Sample evidence',
      '',
      ...p.samples.map(s => `- ${s}`),
      '',
    ].join('\n');

    fs.writeFileSync(targetPath, fm);
    idx.entries.push({
      canonical_id: p.canonical_id,
      type: p.type,
      title: p.last?.text || p.canonical_id,
      facets: p.facets,
      lifecycle: 'candidate',
      confidence: p.last?.confidence || 0.7,
      path: `memory/${p.canonical_id}.md`,
      seen_count: 0,
      last_surfaced_at: null,
    });
    promoted.push(p);

    // Telemetry
    try {
      fs.appendFileSync(USAGE, JSON.stringify({
        ts: new Date().toISOString(),
        memory_id: p.canonical_id,
        event: 'auto_promoted',
        context: { lifecycle: 'candidate', source: 'memory-digest', recurrence: p.recurrence },
      }) + '\n');
    } catch (_) {}
  }
  saveIndex(idx);
  return promoted;
}

function staleEntries(idx, usage) {
  const lastSurfaced = new Map();
  const promotedAt = new Map();
  for (const ev of usage) {
    if (ev.event === 'surfaced') {
      const prev = lastSurfaced.get(ev.memory_id);
      if (!prev || ev.ts > prev) lastSurfaced.set(ev.memory_id, ev.ts);
    } else if (ev.event === 'promoted' || ev.event === 'auto_promoted') {
      promotedAt.set(ev.memory_id, ev.ts);
    }
  }
  const stale = [];
  for (const e of idx.entries) {
    if (e.lifecycle !== 'active') continue;
    const last = lastSurfaced.get(e.canonical_id) || e.last_surfaced_at;
    const promoted = promotedAt.get(e.canonical_id);
    // Don't flag as stale if the entry itself is younger than STALE_DAYS
    if (promoted && daysAgo(promoted) <= STALE_DAYS) continue;
    if (daysAgo(last) > STALE_DAYS) {
      stale.push({ ...e, last_surfaced_at: last || null });
    }
  }
  return stale;
}

function newThisWeek(idx, usage) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return usage.filter(ev =>
    (ev.event === 'promoted' || ev.event === 'auto_promoted') &&
    new Date(ev.ts).getTime() >= since
  );
}

function autoPromotionsLastWeek(usage) {
  const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return usage.filter(ev => ev.event === 'auto_promoted' && new Date(ev.ts).getTime() >= since);
}

function buildMarkdown({ promoted, newEntries, autoLastWeek, stale }) {
  const stamp = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Memory Digest — ${stamp}`,
    '',
    `Generated by \`scripts/memory-digest.js\`. Append-only artifact at \`${PENDING_REVIEW}\` (shared with intelligence loop).`,
    '',
    '## New entries this week',
    '',
    newEntries.length
      ? newEntries.map(e => `- ${e.event === 'auto_promoted' ? '🤖' : '👤'} \`${e.memory_id}\` (${e.context?.type || '?'}) at ${e.ts}`).join('\n')
      : '_None._',
    '',
    '## Auto-promotions from the prior week (please review retroactively)',
    '',
    autoLastWeek.length
      ? autoLastWeek.map(e => `- 🤖 \`${e.memory_id}\` — context: \`${JSON.stringify(e.context || {})}\``).join('\n')
      : '_None._',
    '',
    `## High-recurrence promotion candidates (auto-promoted to \`lifecycle: candidate\`, NOT active)`,
    '',
    promoted.length
      ? promoted.map(p => `- 🌱 \`${p.canonical_id}\` (${p.type}) — seen across ${p.recurrence} sessions. Review and promote to \`active\` if it should be enforced.`).join('\n')
      : '_No new candidates this week._',
    '',
    `## Stale entries (no \`surfaced\` event in ${STALE_DAYS} days — flagged, NOT auto-retired)`,
    '',
    stale.length
      ? stale.map(s => `- 🕯 \`${s.canonical_id}\` — last surfaced: ${s.last_surfaced_at || 'never'}. Consider \`fam-hub memory retire\` if obsolete.`).join('\n')
      : '_None._',
    '',
    '---',
    '_End of memory digest._',
    '',
  ];
  return lines.join('\n');
}

function main() {
  const idx = loadIndex();
  const usage = readJsonl(USAGE);
  const captures = listCaptures();

  const candidates = recurrenceCandidates(captures, idx);
  const promoted = autoPromoteToCandidate(candidates);
  const newEntries = newThisWeek(idx, usage);
  const autoLastWeek = autoPromotionsLastWeek(usage);
  const stale = staleEntries(idx, usage);

  const md = buildMarkdown({ promoted, newEntries, autoLastWeek, stale });

  // Append to PENDING-REVIEW (shared surface)
  const header = fs.existsSync(PENDING_REVIEW) ? '\n\n---\n\n' : '';
  fs.appendFileSync(PENDING_REVIEW, header + md);
  console.log(`memory-digest: appended to ${PENDING_REVIEW}`);
  console.log(`  promoted_to_candidate=${promoted.length}  new_this_week=${newEntries.length}  auto_last_week=${autoLastWeek.length}  stale=${stale.length}`);
}

if (require.main === module) main();
module.exports = { recurrenceCandidates, staleEntries };
