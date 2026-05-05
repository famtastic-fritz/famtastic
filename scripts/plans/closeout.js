#!/usr/bin/env node
/**
 * scripts/plans/closeout.js — write a closeout/checkpoint packet for a plan.
 *
 * Per plans/CLOSEOUT-SCHEMA.md.
 *
 * Usage:
 *   node scripts/plans/closeout.js apply <packet-json-path>
 *     - validates the packet, writes to plans/<plan-id>/closeouts/<date>-<verdict>.json,
 *       updates registry status if verdict is terminal,
 *       constructs a v0.2 capture packet from memory_candidates[],
 *       runs memory-promote review + auto-promote on it
 *
 *   node scripts/plans/closeout.js validate <packet-json-path>
 *     - schema check only, no writes
 *
 *   node scripts/plans/closeout.js list <plan-id>
 *     - list closeouts for a plan
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO, 'plans', 'registry.json');
const INBOX = path.join(REPO, 'captures', 'inbox');

const SCHEMA_VERSION = '1.0';
const VALID_VERDICTS = ['completed', 'needs_tasking', 'parked', 'superseded', 'checkpoint_complete'];
const TERMINAL_VERDICTS = new Set(['completed', 'superseded', 'parked']);

function validate(packet) {
  const errs = [];
  if (packet.schema_version !== SCHEMA_VERSION) errs.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (!packet.plan_id) errs.push('plan_id required');
  if (!VALID_VERDICTS.includes(packet.verdict)) errs.push(`verdict must be one of ${VALID_VERDICTS.join('|')}`);
  if (!packet.verdict_at) errs.push('verdict_at required (ISO timestamp)');
  if (!packet.verdict_by) errs.push('verdict_by required');
  if (packet.verdict === 'checkpoint_complete' && !packet.phase) errs.push('phase required for checkpoint_complete');
  if (packet.verdict === 'completed' && !(packet.proved && packet.proved.length)) errs.push('proved[] required for completed');
  if (packet.verdict === 'superseded' && !(packet.moved_to && packet.moved_to.length)) errs.push('moved_to[] required for superseded');
  if (packet.verdict === 'needs_tasking' && !(packet.next_task_ids && packet.next_task_ids.length)) errs.push('next_task_ids[] required for needs_tasking');
  for (const f of ['fixed','added','proved','remaining_work','moved_to','evidence','memory_candidates','next_task_ids']) {
    if (packet[f] !== undefined && !Array.isArray(packet[f])) errs.push(`${f} must be an array`);
  }
  return errs;
}

function loadRegistry() { return JSON.parse(fs.readFileSync(REGISTRY, 'utf8')); }
function saveRegistry(r) { fs.writeFileSync(REGISTRY, JSON.stringify(r, null, 2) + '\n'); }

function applyTerminal(planId, verdict) {
  // Remove from active_parent_ids if verdict is terminal
  const r = loadRegistry();
  const before = r.active_parent_ids?.length || 0;
  r.active_parent_ids = (r.active_parent_ids || []).filter(id => id !== planId);
  const after = r.active_parent_ids.length;
  if (after < before) {
    r.terminated_parent_ids = r.terminated_parent_ids || {};
    r.terminated_parent_ids[planId] = { verdict, terminated_at: new Date().toISOString() };
    saveRegistry(r);
    console.log(`registry: removed ${planId} from active_parent_ids (verdict: ${verdict})`);
  }
}

function constructCapture(packet) {
  if (!packet.memory_candidates || !packet.memory_candidates.length) return null;
  const id = `cap_closeout_${packet.plan_id}_${packet.verdict_at.slice(0,10)}_${crypto.randomBytes(2).toString('hex')}`;
  const extracted = packet.memory_candidates.map((m, i) => ({
    extract_id: `x_${i+1}`,
    type: m.type,
    text: m.title,
    rationale: m.body || m.title,
    evidence: [`closeout:${packet.plan_id}:${packet.verdict_at}`, ...(packet.evidence || []).map(e => e.ref || e)],
    facets: m.facets || [],
    confidence: m.confidence ?? 0.85,
    candidate_id: `${m.type}/${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`,
  }));
  const cap = {
    schema_version: '0.2.0',
    capture_id: id,
    created_at: new Date().toISOString(),
    source: {
      surface: 'closeout',
      session_id: null,
      adapter: 'scripts/plans/closeout.js',
      adapter_version: SCHEMA_VERSION,
      input_path: `plans/${packet.plan_id}/closeouts/${packet.verdict_at.slice(0,10)}-${packet.verdict}.json`,
      timestamp_range: { start: packet.verdict_at, end: packet.verdict_at },
    },
    summary: `Closeout packet for ${packet.plan_id} (verdict: ${packet.verdict}). ${extracted.length} memory candidates.`,
    extracted,
    status: 'pending_review',
    needs_review: true,
    open_gaps: packet.remaining_work || [],
  };
  if (!fs.existsSync(INBOX)) fs.mkdirSync(INBOX, { recursive: true });
  const capPath = path.join(INBOX, `${id}.json`);
  fs.writeFileSync(capPath, JSON.stringify(cap, null, 2));
  return id;
}

function apply(packetPath) {
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
  const errs = validate(packet);
  if (errs.length) {
    console.error('Invalid packet:'); errs.forEach(e => console.error('  -', e));
    process.exit(1);
  }

  const date = packet.verdict_at.slice(0, 10);
  const planDir = path.join(REPO, 'plans', packet.plan_id);
  const closeoutDir = path.join(planDir, 'closeouts');
  if (!fs.existsSync(planDir)) fs.mkdirSync(planDir, { recursive: true });
  if (!fs.existsSync(closeoutDir)) fs.mkdirSync(closeoutDir, { recursive: true });

  const phase = packet.phase ? `-${packet.phase}` : '';
  const out = path.join(closeoutDir, `${date}-${packet.verdict}${phase}.json`);
  fs.writeFileSync(out, JSON.stringify(packet, null, 2));
  console.log(`closeout: wrote ${out}`);

  if (TERMINAL_VERDICTS.has(packet.verdict)) {
    applyTerminal(packet.plan_id, packet.verdict);
  }

  const capId = constructCapture(packet);
  if (capId) {
    console.log(`closeout: captured ${capId} (memory_candidates fed to chat-capture pipeline)`);
    const review = spawnSync('node', ['scripts/memory-promote.js', 'review', capId], { cwd: REPO, encoding: 'utf8' });
    if (review.status === 0) {
      console.log(review.stdout.split('\n').slice(-3).join('\n'));
      const promote = spawnSync('node', ['scripts/memory-promote.js', 'promote', capId, '--auto'], { cwd: REPO, encoding: 'utf8' });
      if (promote.status === 0) console.log(promote.stdout.split('\n').filter(l => l.includes('promoted=')).join('\n'));
    }
  }
}

function list(planId) {
  const dir = path.join(REPO, 'plans', planId, 'closeouts');
  if (!fs.existsSync(dir)) { console.log('no closeouts'); return; }
  for (const f of fs.readdirSync(dir).sort()) {
    const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    console.log(`  ${f}  verdict=${p.verdict}  by=${p.verdict_by}`);
  }
}

const [,, cmd, arg] = process.argv;
if (cmd === 'apply') apply(arg);
else if (cmd === 'validate') {
  const p = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const errs = validate(p);
  if (errs.length) { console.error('invalid'); errs.forEach(e => console.error('  -', e)); process.exit(1); }
  console.log('valid');
} else if (cmd === 'list') list(arg);
else { console.error('Usage: closeout {apply|validate|list} <path-or-plan-id>'); process.exit(1); }
