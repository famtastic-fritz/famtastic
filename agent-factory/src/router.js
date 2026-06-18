// Model routing + cost ledger. Picks the cheapest CAPABLE model per task:
// cheap/free tier for triage & simple work, stronger tiers only when the task's
// estimated complexity crosses the configured thresholds. Tracks running cost.
import { loadModels, costLog } from './util.js';

// Heuristic complexity estimate in 0..1 from task type + payload size/flags.
export function estimateComplexity(task) {
  const base = {
    prospect: 0.35,
    analyze: 0.55,
    propose: 0.7,
    triage: 0.1,
    classify: 0.15,
    summarize: 0.3,
    'build-frontend': 0.85,
    'build-cms': 0.9,
    'build-tutor': 0.65,
    'build-3d': 0.8,
    assemble: 0.4,
    report: 0.25,
  }[task.type] ?? 0.4;

  let score = base;
  const p = task.payload || {};
  if (p.high_stakes) score += 0.15;
  if (p.complexity) score = p.complexity; // explicit override
  const size = JSON.stringify(p).length;
  score += Math.min(0.15, size / 8000); // bigger payloads -> a bit harder
  if (task.attempts > 1) score += 0.1 * (task.attempts - 1); // escalate on retries
  return Math.max(0, Math.min(1, score));
}

export function pickModel(task, cfg) {
  const models = loadModels();
  const c = estimateComplexity(task);
  let tier = 1;
  if (c >= cfg.routing.escalate_to_tier3_at) tier = 3;
  else if (c >= cfg.routing.escalate_to_tier2_at) tier = 2;

  // candidates at the chosen tier
  let candidates = models.filter(m => m.tier === tier);
  // tier-1: optionally prefer the free stub model to maximize throughput-per-dollar
  if (tier === 1 && cfg.routing.prefer_free_stub) {
    const free = candidates.filter(m => m.input_per_m === 0 && m.output_per_m === 0);
    if (free.length) candidates = free;
  }
  if (!candidates.length) candidates = models.filter(m => m.tier <= tier);
  // cheapest by blended price
  candidates.sort((a, b) =>
    (a.input_per_m + a.output_per_m) - (b.input_per_m + b.output_per_m));
  const chosen = candidates[0];
  return { model: chosen, tier, complexity: Number(c.toFixed(3)) };
}

export function priceOf(modelId) {
  return loadModels().find(m => m.id === modelId);
}

// Compute USD cost from token usage and log it to COSTS.log (modeled, not charged).
export function charge({ task, model, usage, latency_ms, mode }) {
  const m = priceOf(model.id) || model;
  const cost =
    (usage.input_tokens / 1e6) * m.input_per_m +
    (usage.output_tokens / 1e6) * m.output_per_m;
  costLog({
    task_id: task.id, type: task.type, model: model.id, tier: model.tier,
    input_tokens: usage.input_tokens, output_tokens: usage.output_tokens,
    cost_usd: Number(cost.toFixed(6)), latency_ms, mode,
  });
  return Number(cost.toFixed(6));
}

export default { estimateComplexity, pickModel, charge, priceOf };
