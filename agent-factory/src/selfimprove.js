// Bounded self-improvement. After each batch it compares measured performance to
// targets and adjusts ONLY config/factory-config.json values, each clamped to the
// declared _bounds. It never edits core source. Findings go to LEARNINGS.md.
import { saveConfig, ts } from './util.js';
import { appendInside } from './safepath.js';

function getBound(cfg, dotted) {
  return cfg._bounds[dotted];
}
function clamp(v, b) { return b ? Math.max(b.min, Math.min(b.max, v)) : v; }
function getNested(o, dotted) { return dotted.split('.').reduce((a, k) => a?.[k], o); }
function setNested(o, dotted, v) {
  const ks = dotted.split('.'); const last = ks.pop();
  ks.reduce((a, k) => a[k], o)[last] = v;
}

export function improve({ cfg, stats, queueDepth }) {
  const changes = [];
  const findings = [];
  const t = cfg.targets;

  const successRate = stats.processed ? stats.succeeded / stats.processed : 1;
  const avgCost = stats.processed ? stats.cost_usd / stats.processed : 0;
  const avgLatency = stats.avg_latency_ms || 0;

  const adjust = (dotted, newVal, why) => {
    const b = getBound(cfg, dotted);
    const clamped = clamp(newVal, b);
    const old = getNested(cfg, dotted);
    if (clamped !== old) {
      setNested(cfg, dotted, clamped);
      changes.push({ param: dotted, from: old, to: clamped, why });
    }
  };

  // 1. Reliability first: low success -> fewer concurrent workers + escalate sooner.
  if (successRate < t.min_success_rate) {
    findings.push(`Success ${(successRate*100).toFixed(0)}% < target ${(t.min_success_rate*100)}%; reducing concurrency and escalating models sooner.`);
    adjust('concurrency', cfg.concurrency - 1, 'low success rate');
    adjust('routing.escalate_to_tier2_at', cfg.routing.escalate_to_tier2_at - 0.05, 'use stronger models sooner');
  }

  // 2. Cost control: over budget -> prefer cheaper models (raise escalate thresholds).
  if (avgCost > t.max_avg_cost_usd) {
    findings.push(`Avg cost $${avgCost.toFixed(4)} > target $${t.max_avg_cost_usd}; raising escalation thresholds to favor cheaper tiers.`);
    adjust('routing.escalate_to_tier2_at', cfg.routing.escalate_to_tier2_at + 0.05, 'over cost budget');
    adjust('routing.escalate_to_tier3_at', cfg.routing.escalate_to_tier3_at + 0.05, 'over cost budget');
  }

  // 3. Latency / throughput: slow batch but healthy success -> add a worker.
  if (avgLatency > t.max_avg_latency_ms && successRate >= t.min_success_rate) {
    findings.push(`Avg latency ${avgLatency.toFixed(0)}ms > target ${t.max_avg_latency_ms}ms; adding a worker for parallelism.`);
    adjust('concurrency', cfg.concurrency + 1, 'reduce wall-clock latency');
  }

  // 4. Healthy + backlog -> scale up throughput.
  if (successRate >= t.min_success_rate && avgCost <= t.max_avg_cost_usd && queueDepth > cfg.batch_size) {
    findings.push(`Healthy with backlog of ${queueDepth}; scaling batch size and concurrency up for throughput.`);
    adjust('batch_size', cfg.batch_size + 2, 'drain backlog faster');
    adjust('concurrency', cfg.concurrency + 1, 'drain backlog faster');
  }

  // 5. Healthy + empty queue + over-provisioned -> tighten cadence (cheaper idling).
  if (queueDepth === 0 && cfg.concurrency > 2) {
    findings.push('Queue empty; trimming concurrency back toward baseline.');
    adjust('concurrency', cfg.concurrency - 1, 'no backlog');
  }

  if (findings.length === 0) findings.push('Within all targets; no parameter changes.');

  cfg.version += 1;
  saveConfig(cfg);

  // Append a dated entry to LEARNINGS.md
  const entry =
    `\n## ${ts()} — batch #${stats.n}\n` +
    `- processed: ${stats.processed} · succeeded: ${stats.succeeded} · failed: ${stats.failed}\n` +
    `- success rate: ${(successRate*100).toFixed(1)}% · avg cost: $${avgCost.toFixed(4)} · avg latency: ${avgLatency.toFixed(0)}ms · batch cost: $${stats.cost_usd.toFixed(4)}\n` +
    `- queue depth after: ${queueDepth}\n` +
    findings.map(f => `- finding: ${f}`).join('\n') + '\n' +
    (changes.length
      ? changes.map(c => `- tuned **${c.param}**: ${c.from} → ${c.to} (${c.why})`).join('\n') + '\n'
      : '- no config changes\n');
  appendInside('LEARNINGS.md', entry);

  return { changes, findings, metrics: { successRate, avgCost, avgLatency } };
}
