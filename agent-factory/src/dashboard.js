// Observability: generates dashboard.html and a terminal readout from live state.
import queue from './queue.js';
import * as agents from './agents.js';
import { writeInside } from './safepath.js';
import { loadConfig } from './util.js';
import llm from './llm.js';

export function snapshot() {
  const counts = queue.counts();
  const totals = queue.totals();
  const batches = queue.allBatches();
  const cfg = loadConfig();
  const active = agents.list().filter(a => a.status !== 'retired');
  const successRate = totals.done + totals.failed
    ? totals.done / (totals.done + totals.failed) : 0;
  return { counts, totals, batches, cfg, active, successRate, mode: llm.isLive() ? 'live' : 'stub' };
}

export function terminal() {
  const s = snapshot();
  const bar = (n, max = 20) => '█'.repeat(Math.min(max, n)) + '·'.repeat(Math.max(0, max - n));
  const lines = [];
  lines.push('\x1b[1m╔══════════════════ AGENT FACTORY — STATUS ══════════════════╗\x1b[0m');
  lines.push(`  model mode : ${s.mode === 'live' ? '\x1b[32mLIVE\x1b[0m' : '\x1b[33mSTUB (offline, no spend)\x1b[0m'}`);
  lines.push(`  queue      : ${bar(s.counts.queued)} ${s.counts.queued} queued`);
  lines.push(`  running    : ${s.counts.running}   done: ${s.counts.done}   failed: ${s.counts.failed}`);
  lines.push(`  active agts: ${s.active.length}  [${s.active.map(a => a.name).join(', ') || '—'}]`);
  lines.push(`  throughput : ${s.totals.done} tasks completed across ${s.batches.length} batch(es)`);
  lines.push(`  success    : ${(s.successRate * 100).toFixed(1)}%`);
  lines.push(`  total cost : \x1b[36m$${(s.totals.cost || 0).toFixed(5)}\x1b[0m (modeled)`);
  lines.push(`  avg latency: ${(s.totals.lat || 0).toFixed(0)}ms`);
  lines.push(`  config     : conc=${s.cfg.concurrency} batch=${s.cfg.batch_size} t2@${s.cfg.routing.escalate_to_tier2_at} t3@${s.cfg.routing.escalate_to_tier3_at}`);
  lines.push('\x1b[1m╚════════════════════════════════════════════════════════════╝\x1b[0m');
  return lines.join('\n');
}

export function writeHtml() {
  const s = snapshot();
  const rows = s.batches.map(b => `<tr><td>${b.n}</td><td>${b.processed}</td><td>${b.succeeded}</td>
    <td>${b.failed}</td><td>$${(b.cost_usd||0).toFixed(5)}</td><td>${(b.avg_latency_ms||0).toFixed(0)}ms</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="5">
<title>Agent Factory — Dashboard</title>
<style>
:root{--bg:#0b1020;--card:#141b30;--ink:#e8eef7;--mut:#8ea2c0;--acc:#46c2ff;--ok:#4ade80;--warn:#fbbf24}
*{box-sizing:border-box}body{font:15px/1.5 system-ui;margin:0;background:var(--bg);color:var(--ink)}
header{padding:22px 28px;border-bottom:1px solid #22304d;display:flex;align-items:center;gap:16px}
h1{font-size:20px;margin:0}.mode{padding:3px 10px;border-radius:20px;font-size:12px;font-weight:700}
.live{background:#0f3d2a;color:var(--ok)}.stub{background:#3d340f;color:var(--warn)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;padding:24px 28px}
.card{background:var(--card);border:1px solid #22304d;border-radius:14px;padding:18px}
.k{color:var(--mut);font-size:12px;text-transform:uppercase;letter-spacing:.05em}
.v{font-size:30px;font-weight:700;margin-top:6px}.v.acc{color:var(--acc)}.v.ok{color:var(--ok)}
table{width:calc(100% - 56px);margin:0 28px 28px;border-collapse:collapse;background:var(--card);border-radius:14px;overflow:hidden}
th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #22304d;font-size:14px}
th{color:var(--mut);font-size:12px;text-transform:uppercase}
.agents{padding:0 28px 28px}.chip{display:inline-block;background:#1b2745;border:1px solid #2c3e63;border-radius:8px;padding:6px 12px;margin:4px 6px 0 0;font-size:13px}
small{color:var(--mut)}
</style></head><body>
<header><h1>⚙️ Agent Factory</h1>
<span class="mode ${s.mode==='live'?'live':'stub'}">${s.mode==='live'?'LIVE MODELS':'STUB · OFFLINE · NO SPEND'}</span>
<small>auto-refresh 5s · generated ${new Date().toISOString()}</small></header>
<div class="grid">
  <div class="card"><div class="k">Queue depth</div><div class="v acc">${s.counts.queued}</div></div>
  <div class="card"><div class="k">Running</div><div class="v">${s.counts.running}</div></div>
  <div class="card"><div class="k">Completed</div><div class="v ok">${s.counts.done}</div></div>
  <div class="card"><div class="k">Failed</div><div class="v">${s.counts.failed}</div></div>
  <div class="card"><div class="k">Active agents</div><div class="v">${s.active.length}</div></div>
  <div class="card"><div class="k">Success rate</div><div class="v ok">${(s.successRate*100).toFixed(1)}%</div></div>
  <div class="card"><div class="k">Total cost (modeled)</div><div class="v acc">$${(s.totals.cost||0).toFixed(5)}</div></div>
  <div class="card"><div class="k">Avg latency</div><div class="v">${(s.totals.lat||0).toFixed(0)}ms</div></div>
  <div class="card"><div class="k">Concurrency</div><div class="v">${s.cfg.concurrency}</div></div>
  <div class="card"><div class="k">Batch size</div><div class="v">${s.cfg.batch_size}</div></div>
</div>
<div class="agents"><div class="k">Active worker agents</div><div>
${s.active.map(a=>`<span class="chip">${a.name} <small>· ${a.tasks_done} done · ${a.status}</small></span>`).join('') || '<small>none</small>'}
</div></div>
<table><thead><tr><th>Batch</th><th>Processed</th><th>Succeeded</th><th>Failed</th><th>Cost</th><th>Avg latency</th></tr></thead>
<tbody>${rows || '<tr><td colspan="6"><small>no batches yet</small></td></tr>'}</tbody></table>
</body></html>`;
  return writeInside('dashboard.html', html);
}

export default { snapshot, terminal, writeHtml };
