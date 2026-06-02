// STAGE 1 — CONCEPT. Decide what to make, by ROI.
//
// Explore/exploit bandit over a niche portfolio: ~explore_ratio of slots go
// to new/under-tested niches, the rest are weighted by learned performance
// (updated by the feedback stage). Topics are generated deterministically so
// ticks are reproducible, and deduped by content hash so we never remake the
// same video.

import { append, read } from "../lib/ledger.mjs";
import { rng, weightedPick, shortId, dayKey, nowIso, clamp } from "../lib/util.mjs";

const CONCEPTS = "concepts";
const PERF = "performance";

const ANGLES = [
  "the mistake most people make with",
  "3 things nobody tells you about",
  "the fastest way to get started with",
  "why you're doing", // + niche + " wrong"
  "the 1 habit that changed",
  "what I wish I knew about",
  "the truth about",
  "how to actually master",
];
const HOOK_STYLES = ["curiosity", "stakes", "contrarian", "listicle", "story"];

// Learned niche weights: average performance score per niche (0..1),
// defaulting to a neutral prior so unseen niches still get a shot.
export function nicheWeights(seedNiches, opts = {}) {
  const perf = read(PERF, opts);
  const byNiche = new Map();
  for (const n of seedNiches) byNiche.set(n, { sum: 0.5, count: 1 }); // prior
  for (const p of perf) {
    if (!p.niche) continue;
    if (!byNiche.has(p.niche)) byNiche.set(p.niche, { sum: 0, count: 0 });
    const e = byNiche.get(p.niche);
    e.sum += p.score ?? 0;
    e.count += 1;
  }
  const weights = {};
  for (const [n, e] of byNiche) weights[n] = e.sum / Math.max(1, e.count);
  return weights;
}

function topicFor(niche, next) {
  const angle = ANGLES[Math.floor(next() * ANGLES.length)];
  const topic = angle.endsWith("wrong")
    ? `why you're doing ${niche} wrong`
    : `${angle} ${niche}`;
  const hook = HOOK_STYLES[Math.floor(next() * HOOK_STYLES.length)];
  return { topic, hook };
}

// Predicted ROI: learned niche performance, nudged by hook style and novelty,
// minus a small production-cost penalty. Range ~0..1.
function predictRoi(nicheWeight, hook, isExplore) {
  const hookBonus = { contrarian: 0.08, curiosity: 0.06, story: 0.04, listicle: 0.03, stakes: 0.05 }[hook] || 0;
  const explorePenalty = isExplore ? -0.05 : 0;
  return clamp(nicheWeight + hookBonus + explorePenalty, 0, 1);
}

export function runConcept(config, opts = {}) {
  const seed = `${dayKey()}|${read(CONCEPTS, opts).length}`;
  const next = rng(seed);
  const weights = nicheWeights(config.seed_niches, opts);
  const existing = new Set(read(CONCEPTS, opts).map((c) => c.fingerprint));

  const niches = Object.keys(weights);
  const exploitItems = niches.map((n) => ({ value: n, weight: weights[n] }));

  const selected = [];
  let guard = 0;
  while (selected.length < (config.videos_per_tick || 3) && guard++ < 100) {
    const isExplore = next() < (config.explore_ratio ?? 0.2);
    const niche = isExplore
      ? niches[Math.floor(next() * niches.length)]
      : weightedPick(exploitItems, next);
    const { topic, hook } = topicFor(niche, next);
    const fingerprint = shortId("fp", niche, topic).slice(3);
    if (existing.has(fingerprint)) continue; // dedupe
    existing.add(fingerprint);

    const concept = {
      id: shortId("cpt", niche, topic, nowIso(), selected.length),
      niche,
      topic,
      hook_style: hook,
      mode: isExplore ? "explore" : "exploit",
      predicted_roi: round(predictRoi(weights[niche], hook, isExplore)),
      fingerprint,
      status: "proposed",
      created_at: nowIso(),
    };
    append(CONCEPTS, concept, { ...opts, mirror: true });
    selected.push(concept);
  }
  return selected;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}
