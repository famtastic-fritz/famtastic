// STAGE 4 — FEEDBACK. Measure performance, learn, reallocate.
//
// Real metrics come from each platform's analytics API once connected. Until
// then, metrics are SIMULATED deterministically from the concept's predicted
// ROI (plus seeded noise) so the learning loop actually exercises end-to-end:
// performance updates niche weights, which change what Concept makes next, and
// strong/weak niches emit durable learnings.

import { append, read } from "../lib/ledger.mjs";
import { hasCredsFor } from "../lib/vault.mjs";
import { rng, clamp, nowIso } from "../lib/util.mjs";

const PERF = "performance";
const LEARN = "learnings";

// Simulate a plausible metric set from predicted ROI. Deterministic per
// (concept, platform) so reruns are stable.
function simulateMetrics(concept_id, platform, predictedRoi) {
  const next = rng(`${concept_id}|${platform}`);
  const base = predictedRoi ?? 0.4;
  const views = Math.round(200 + next() * 8000 * (0.5 + base));
  const watch_pct = clamp(0.3 + base * 0.5 + (next() - 0.5) * 0.2, 0.1, 0.95);
  const ctr = clamp(0.02 + base * 0.08 + (next() - 0.5) * 0.03, 0.005, 0.2);
  const revenue_usd = round(views * ctr * 0.04); // crude affiliate EPC proxy
  // Composite score (0..1): retention-weighted, ctr-weighted, view-scaled.
  const score = clamp(watch_pct * 0.5 + ctr * 2 + Math.min(1, views / 10000) * 0.2, 0, 1);
  return { views, watch_pct: round(watch_pct), ctr: round(ctr), revenue_usd, score: round(score) };
}

export function runFeedback(publishedRecords, config, opts = {}) {
  const haveAnalytics = config.platforms?.some((p) => hasCredsFor(p));
  const perfRows = [];

  // Attribute by concept (avoid double-counting across platforms: average).
  const byConcept = new Map();
  for (const rec of publishedRecords) {
    if (rec.status === "skipped") continue;
    const m = simulateMetrics(rec.concept_id, rec.platform, conceptRoi(rec.concept_id, opts));
    const row = {
      concept_id: rec.concept_id,
      niche: rec.niche,
      platform: rec.platform,
      ...m,
      simulated: !haveAnalytics,
      created_at: nowIso(),
    };
    append(PERF, row, { ...opts, mirror: true });
    perfRows.push(row);
    if (!byConcept.has(rec.niche)) byConcept.set(rec.niche, []);
    byConcept.get(rec.niche).push(m.score);
  }

  // Emit learnings for niches that clearly over/under-perform — these are the
  // candidates that flow into the FAMtastic memory pipeline.
  const learnings = [];
  for (const [niche, scores] of byConcept) {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg >= 0.6) {
      learnings.push(learning(niche, avg, "winner", `Niche "${niche}" is performing well (avg ${avg.toFixed(2)}) — increase allocation.`));
    } else if (avg <= 0.3) {
      learnings.push(learning(niche, avg, "loser", `Niche "${niche}" is underperforming (avg ${avg.toFixed(2)}) — reduce or retire.`));
    }
  }
  for (const l of learnings) append(LEARN, l, { ...opts, mirror: true });

  const totalRevenue = round(perfRows.reduce((s, r) => s + r.revenue_usd, 0));
  return { performance: perfRows, learnings, totalRevenue, simulated: !haveAnalytics };
}

function conceptRoi(concept_id, opts) {
  const c = read("concepts", opts).find((x) => x.id === concept_id);
  return c?.predicted_roi ?? 0.4;
}

function learning(niche, avg, kind, body) {
  return {
    type: "learning",
    title: `niche-performance:${niche}:${kind}`,
    niche,
    avg_score: round(avg),
    kind,
    body,
    facets: ["autopilot", "niche-roi", `niche:${niche}`],
    confidence: 0.7,
    created_at: nowIso(),
  };
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
