// ORCHESTRATOR — long-running supervisor. Reads the queue, decides how many/what
// kind of worker agents are needed, mints + spawns them as child processes,
// monitors them, retires idle ones, records batch stats, runs a self-improvement
// pass, and re-schedules itself based on queue depth. Every decision is logged.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import queue from './queue.js';
import * as agents from './agents.js';
import router from './router.js';
import { loadConfig, orchLog } from './util.js';
import { ROOT } from './safepath.js';
import { improve } from './selfimprove.js';
import dashboard from './dashboard.js';

const WORKER = path.join(ROOT, 'src', 'worker.js');

// Run async fn over items with a bounded pool (concurrency).
async function runPool(items, size, fn) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.max(1, size) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return results;
}

// Spawn one worker child process for a task; resolve with its parsed JSON report.
function spawnWorker({ task, model, tier, agentName }) {
  return new Promise((resolve) => {
    const child = spawn('node', [
      WORKER, '--task', task.id, '--model', model.id, '--tier', String(tier), '--agent', agentName,
    ], { cwd: ROOT });
    let out = '', err = '';
    child.stdout.on('data', d => out += d);
    child.stderr.on('data', d => err += d);
    child.on('close', (code) => {
      let report;
      try { report = JSON.parse(out.trim().split('\n').pop()); }
      catch { report = { ok: false, error: `unparseable worker output (code ${code}): ${err || out}` }; }
      resolve({ report, code, pid: child.pid });
    });
  });
}

// Ensure the orchestrator has at least one (idle) worker for each needed family.
function provisionWorkers(claimed, cfg) {
  const byFamily = {};
  for (const t of claimed) {
    const fam = agents.familyFor(t.type);
    (byFamily[fam] ||= new Set()).add(t.type);
  }
  const pool = {}; // family -> [agentDef,...]
  for (const fam of Object.keys(byFamily)) {
    let existing = agents.list().filter(a => a.status !== 'retired' && a.handles.some(h => byFamily[fam].has(h)));
    // mint up to concurrency workers per family so spawns map to distinct agents
    const want = Math.min(cfg.concurrency, byFamily[fam].size + 1);
    while (existing.length < want) {
      const def = agents.mint(fam, [...byFamily[fam]]);
      orchLog(`minted worker`, { agent: def.name, family: fam, handles: def.handles });
      existing.push(def);
    }
    pool[fam] = existing;
  }
  return pool;
}

export async function runBatch() {
  const cfg = loadConfig();
  const batchNo = queue.nextBatchNumber();
  const started_at = new Date().toISOString();
  const claimed = queue.claim(cfg.batch_size, batchNo);

  if (claimed.length === 0) {
    orchLog(`batch #${batchNo}: queue empty, nothing to do`);
    return { processed: 0, batchNo };
  }
  orchLog(`batch #${batchNo}: claimed ${claimed.length} task(s)`, {
    types: claimed.map(t => t.type),
  });

  const pool = provisionWorkers(claimed, cfg);
  const rr = {}; // round-robin index per family

  // Route every task first (decision logged), then execute with bounded concurrency.
  const planned = claimed.map(task => {
    const { model, tier, complexity } = router.pickModel(task, cfg);
    const fam = agents.familyFor(task.type);
    const fleet = pool[fam];
    rr[fam] = (rr[fam] ?? -1) + 1;
    const agentDef = fleet[rr[fam] % fleet.length];
    orchLog(`route`, { task: task.id, type: task.type, complexity, tier, model: model.id, agent: agentDef.name });
    return { task, model, tier, agentName: agentDef.name };
  });

  let cost = 0, succeeded = 0, failed = 0, latSum = 0, latN = 0;
  await runPool(planned, cfg.concurrency, async (p) => {
    agents.touch(p.agentName, { status: 'busy' });
    const { report } = await spawnWorker(p);
    if (report.ok) {
      queue.complete(p.task.id, {
        result: { summary: report.summary, artifacts: report.artifacts, metrics: report.metrics },
        model: report.model, tier: report.tier, cost_usd: report.cost_usd, latency_ms: report.latency_ms,
      });
      cost += report.cost_usd || 0; succeeded++; latSum += report.latency_ms || 0; latN++;
      const def = agents.list().find(a => a.name === p.agentName);
      agents.touch(p.agentName, { status: 'idle', tasks_done: (def?.tasks_done || 0) + 1, last_used_at: new Date().toISOString() });
      orchLog(`done`, { task: p.task.id, agent: p.agentName, cost_usd: report.cost_usd, latency_ms: report.latency_ms, summary: report.summary });
    } else {
      const disp = queue.fail(p.task.id, report.error, { requeue: true, maxAttempts: cfg.retry.max_attempts });
      failed++;
      agents.touch(p.agentName, { status: 'idle' });
      orchLog(`FAILED (${disp})`, { task: p.task.id, agent: p.agentName, error: String(report.error).slice(0, 240) });
    }
  });

  const finished_at = new Date().toISOString();
  const stats = {
    n: batchNo, started_at, finished_at,
    processed: planned.length, succeeded, failed,
    cost_usd: Number(cost.toFixed(6)), avg_latency_ms: latN ? latSum / latN : 0,
  };
  queue.recordBatch(batchNo, stats);

  // Retire idle workers past TTL.
  const retired = agents.retireIdle(cfg.idle_worker_ttl_ms);
  if (retired) orchLog(`retired ${retired} idle worker(s)`);

  // Self-improvement pass (tunes config within bounds).
  const depthAfter = queue.depth();
  const imp = improve({ cfg, stats, queueDepth: depthAfter });
  orchLog(`self-improvement`, { findings: imp.findings.length, changes: imp.changes.map(c => `${c.param}:${c.from}->${c.to}`) });

  dashboard.writeHtml();
  orchLog(`batch #${batchNo} complete`, {
    processed: stats.processed, succeeded, failed, batch_cost_usd: stats.cost_usd, queue_depth: depthAfter,
  });
  return { ...stats, batchNo, queueDepth: depthAfter, improvement: imp };
}

// In-process scheduler: cadence adapts to queue depth (no OS cron involved).
function nextInterval(cfg) {
  const d = queue.depth();
  if (d === 0) return cfg.scheduler_base_interval_ms * 3;   // back off when idle
  if (d > cfg.batch_size * 2) return Math.max(800, cfg.scheduler_base_interval_ms / 2); // speed up under load
  return cfg.scheduler_base_interval_ms;
}

export async function runForever({ maxBatches = Infinity, stopWhenDrained = false } = {}) {
  orchLog('orchestrator starting', { mode: process.env.OPENROUTER_API_KEY ? 'live' : 'stub', maxBatches });
  let n = 0, emptyStreak = 0;
  while (n < maxBatches) {
    const r = await runBatch();
    if (r.processed > 0) { n++; emptyStreak = 0; }
    else { emptyStreak++; }
    if (stopWhenDrained && r.processed === 0) {
      orchLog('queue drained, stopping (stopWhenDrained)');
      break;
    }
    if (n >= maxBatches) break;
    const cfg = loadConfig();
    const wait = nextInterval(cfg);
    orchLog(`scheduler sleeping ${wait}ms (queue depth ${queue.depth()})`);
    await new Promise(res => setTimeout(res, wait));
    if (emptyStreak > 5 && !Number.isFinite(maxBatches)) {
      orchLog('idle for 5 cycles; continuing to wait for new tasks');
      emptyStreak = 0;
    }
  }
  orchLog('orchestrator loop ended', { batches_processed: n });
  return n;
}

export default { runBatch, runForever };
