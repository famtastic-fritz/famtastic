// site-studio/server/intelligence-writer.js
//
// Slice 4 implementation. Server-side append/replace writes for run ledgers,
// proof packets, and learning candidates. All writes are atomic (write tmp
// + rename) to avoid torn reads from the Slice 3 reader.
//
// Public API:
//   startRun(siteDir, { runId, recipeId, intent, brief })
//   appendLedgerPass(siteDir, runId, pass)
//   setLedgerStatus(siteDir, runId, status)
//   recordCost(siteDir, runId, costDelta)
//   recordBlocker(siteDir, runId, blocker)
//   recordNonBlocker(siteDir, runId, note)
//   attachProofPacket(siteDir, runId, packet)
//   addLearningCandidate(siteDir, runId, candidate)
//   setNextAction(siteDir, runId, action)
//   finalizeRun(siteDir, runId, verdict)
//
// Cost cap of $50 is enforced cumulatively. Status enum:
//   running | blocked | failed | complete
// Verdict enum:
//   pass | fail | blocked | parked

'use strict';

const fs = require('fs');
const path = require('path');
const { intelligenceDir, isSafeId } = require('./intelligence-reader');

const STATUS_ENUM = new Set(['running', 'blocked', 'failed', 'complete']);
const VERDICT_ENUM = new Set(['pass', 'fail', 'blocked', 'parked']);
const COST_CAP_USD = 50;

function runDir(siteDir, runId) {
  if (!isSafeId(runId)) throw new Error('invalid run_id');
  return path.join(intelligenceDir(siteDir), 'runs', runId);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function atomicWriteJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, filePath);
}

function readJsonOr(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function ledgerPath(siteDir, runId) {
  return path.join(runDir(siteDir, runId), 'ledger.json');
}

function proofPath(siteDir, runId) {
  return path.join(runDir(siteDir, runId), 'proof-packet.json');
}

function learningPath(siteDir, runId) {
  return path.join(runDir(siteDir, runId), 'learning-candidates.json');
}

function startRun(siteDir, { runId, recipeId = null, intent = null, brief = null } = {}) {
  if (!isSafeId(runId)) throw new Error('invalid run_id');
  const file = ledgerPath(siteDir, runId);
  if (fs.existsSync(file)) throw new Error('run already exists');
  const ledger = {
    run_id: runId,
    site_tag: path.basename(siteDir),
    recipe_id: recipeId,
    intent,
    brief_ref: brief && brief.title ? brief.title : null,
    status: 'running',
    verdict: null,
    started_at: new Date().toISOString(),
    finished_at: null,
    cost: { usd: 0, tokens: 0, by_provider: {} },
    passes: [],
    blockers: [],
    non_blockers: [],
    next_action: null,
  };
  atomicWriteJson(file, ledger);
  return ledger;
}

function loadLedger(siteDir, runId) {
  const file = ledgerPath(siteDir, runId);
  const ledger = readJsonOr(file, null);
  if (!ledger) throw new Error('run not found');
  return { ledger, file };
}

function assertMutable(ledger) {
  if (ledger.status === 'complete' || ledger.status === 'failed') {
    throw new Error(`run is terminal (${ledger.status})`);
  }
}

function appendLedgerPass(siteDir, runId, pass) {
  if (!pass || typeof pass !== 'object') throw new Error('pass required');
  const { ledger, file } = loadLedger(siteDir, runId);
  assertMutable(ledger);
  ledger.passes.push({
    pass_id: pass.pass_id || `pass-${ledger.passes.length + 1}`,
    label: pass.label || null,
    at: new Date().toISOString(),
    ok: pass.ok !== false,
    notes: pass.notes || null,
  });
  atomicWriteJson(file, ledger);
  return ledger;
}

function setLedgerStatus(siteDir, runId, status) {
  if (!STATUS_ENUM.has(status)) throw new Error(`invalid status: ${status}`);
  const { ledger, file } = loadLedger(siteDir, runId);
  ledger.status = status;
  atomicWriteJson(file, ledger);
  return ledger;
}

function recordCost(siteDir, runId, costDelta) {
  if (!costDelta || typeof costDelta !== 'object') throw new Error('costDelta required');
  const usdDelta = Number(costDelta.usd || 0);
  const tokensDelta = Number(costDelta.tokens || 0);
  if (usdDelta < 0 || tokensDelta < 0) throw new Error('cost cannot be negative');
  const provider = costDelta.provider || 'unknown';
  const { ledger, file } = loadLedger(siteDir, runId);
  ledger.cost.usd = Number((ledger.cost.usd + usdDelta).toFixed(4));
  ledger.cost.tokens += tokensDelta;
  ledger.cost.by_provider[provider] = Number(((ledger.cost.by_provider[provider] || 0) + usdDelta).toFixed(4));
  if (ledger.cost.usd >= COST_CAP_USD && ledger.status === 'running') {
    ledger.status = 'blocked';
    ledger.blockers.push({ kind: 'cost_cap_exceeded', at: new Date().toISOString(), usd: ledger.cost.usd });
  }
  atomicWriteJson(file, ledger);
  return ledger;
}

function recordBlocker(siteDir, runId, blocker) {
  if (!blocker || !blocker.kind) throw new Error('blocker.kind required');
  const { ledger, file } = loadLedger(siteDir, runId);
  ledger.blockers.push({ ...blocker, at: blocker.at || new Date().toISOString() });
  if (ledger.status === 'running') ledger.status = 'blocked';
  atomicWriteJson(file, ledger);
  return ledger;
}

function recordNonBlocker(siteDir, runId, note) {
  if (!note) throw new Error('note required');
  const { ledger, file } = loadLedger(siteDir, runId);
  ledger.non_blockers.push({
    note: typeof note === 'string' ? note : (note.note || ''),
    kind: (typeof note === 'object' && note.kind) || 'observation',
    at: new Date().toISOString(),
  });
  atomicWriteJson(file, ledger);
  return ledger;
}

function attachProofPacket(siteDir, runId, packet) {
  if (!packet || typeof packet !== 'object') throw new Error('packet required');
  const file = proofPath(siteDir, runId);
  const existing = readJsonOr(file, { run_id: runId, packets: [] });
  existing.run_id = runId;
  if (!Array.isArray(existing.packets)) existing.packets = [];
  existing.packets.push({
    pass_id: packet.pass_id || `packet-${existing.packets.length + 1}`,
    at: new Date().toISOString(),
    proofs: Array.isArray(packet.proofs) ? packet.proofs : [],
    blockers: Array.isArray(packet.blockers) ? packet.blockers : [],
    non_blockers: Array.isArray(packet.non_blockers) ? packet.non_blockers : [],
  });
  atomicWriteJson(file, existing);
  return existing;
}

function addLearningCandidate(siteDir, runId, candidate) {
  if (!candidate || !candidate.summary) throw new Error('candidate.summary required');
  const file = learningPath(siteDir, runId);
  const existing = readJsonOr(file, { run_id: runId, candidates: [] });
  existing.run_id = runId;
  if (!Array.isArray(existing.candidates)) existing.candidates = [];
  existing.candidates.push({
    id: candidate.id || `lc-${existing.candidates.length + 1}`,
    from_run: runId,
    kind: candidate.kind || 'observation',
    summary: candidate.summary,
    evidence: Array.isArray(candidate.evidence) ? candidate.evidence : [],
    promote_target: candidate.promote_target || null,
    at: new Date().toISOString(),
  });
  atomicWriteJson(file, existing);
  return existing;
}

function setNextAction(siteDir, runId, action) {
  if (typeof action !== 'string' || !action.trim()) throw new Error('action string required');
  const { ledger, file } = loadLedger(siteDir, runId);
  ledger.next_action = action.trim();
  atomicWriteJson(file, ledger);
  return ledger;
}

function finalizeRun(siteDir, runId, verdict) {
  if (!VERDICT_ENUM.has(verdict)) throw new Error(`invalid verdict: ${verdict}`);
  const { ledger, file } = loadLedger(siteDir, runId);
  ledger.verdict = verdict;
  ledger.status = (verdict === 'pass') ? 'complete' : (verdict === 'fail' ? 'failed' : 'blocked');
  ledger.finished_at = new Date().toISOString();
  atomicWriteJson(file, ledger);
  return ledger;
}

module.exports = {
  startRun,
  appendLedgerPass,
  setLedgerStatus,
  recordCost,
  recordBlocker,
  recordNonBlocker,
  attachProofPacket,
  addLearningCandidate,
  setNextAction,
  finalizeRun,
  COST_CAP_USD,
};
