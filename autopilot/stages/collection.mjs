// STAGE 2 — COLLECTION. Turn concepts into finished, sellable bundles.
//
// Per concept: budget-gate the paid steps, run the faceless generator to a
// render-ready spec, auto-evaluate it (QA), package platform metadata + SEO +
// affiliate links + thumbnail spec, optionally render the MP4, and record an
// inventory entry. Everything degrades gracefully: no keys → free path; no
// Chromium → spec staged as "ready_to_render".

import fs from "node:fs";
import path from "node:path";
import { append } from "../lib/ledger.mjs";
import { requestSpend } from "../lib/budget.mjs";
import { hasCredsFor } from "../lib/vault.mjs";
import { matchOffers } from "../lib/affiliate.mjs";
import { renderSpec } from "../lib/render.mjs";
import { outDir, REMOTION_ROOT } from "../lib/paths.mjs";
import { nowIso } from "../lib/util.mjs";
import { generateVideoSpec } from "../../remotion/src/pipeline/index.mjs";

const INVENTORY = "inventory";

const HASHTAGS = {
  "personal finance": ["#money", "#finance", "#investing", "#wealth"],
  productivity: ["#productivity", "#focus", "#habits"],
  "tech tips": ["#tech", "#ai", "#tips"],
  "health habits": ["#health", "#habits", "#wellness"],
  "history facts": ["#history", "#facts", "#didyouknow"],
  psychology: ["#psychology", "#mindset"],
  "side hustles": ["#sidehustle", "#money", "#business"],
  "cooking hacks": ["#cooking", "#food", "#kitchenhacks"],
};

export function qaCheck(spec) {
  const issues = [];
  if (!spec.scenes?.length) issues.push("no scenes");
  if ((spec.totalDurationInFrames || 0) < spec.meta.fps * 5) issues.push("too short (<5s)");
  if ((spec.meta.estimatedSeconds || 0) > 90) issues.push("too long (>90s)");
  if (spec.scenes?.some((s) => !s.words?.length)) issues.push("empty caption scene");
  return { pass: issues.length === 0, issues };
}

export function buildMetadata(concept, spec, offers) {
  const base = concept.topic.replace(/\b\w/g, (c) => c.toUpperCase());
  const tags = HASHTAGS[concept.niche] || ["#shorts"];
  const linkLines = offers.map((o) => `${o.title}: ${o.url}`).join("\n");
  const description =
    `${base}\n\n${spec.scenes.map((s) => s.text).join(" ")}\n\n` +
    `${linkLines}\n\n${tags.join(" ")} #shorts #reels #fyp`;
  return {
    youtube: { title: `${base} #shorts`.slice(0, 100), description, tags: tags.map((t) => t.replace("#", "")) },
    tiktok: { caption: `${base} ${tags.join(" ")} #fyp`.slice(0, 150), link_in_bio: offers[0]?.url },
    instagram: { caption: `${base}\n\n${tags.join(" ")} #reels`, link_in_bio: offers[0]?.url },
  };
}

// Run collection over a batch of concepts. Async because the faceless
// generator (script + optional TTS) is async.
export async function runCollection(concepts, config, opts = {}) {
  let rendered = 0;
  const items = [];

  for (const concept of concepts) {
    const dir = path.join(outDir(opts.root), concept.id);
    fs.mkdirSync(dir, { recursive: true });

    // Budget-gate the paid steps (they only cost money when keys are present).
    const costs = config.cost_estimates_usd || {};
    const wantPaid = hasCredsFor("openai") || hasCredsFor("elevenlabs");
    const estCost = wantPaid ? (costs.script_llm || 0) + (costs.voiceover || 0) : 0;
    const grant = requestSpend(estCost, `produce:${concept.id}`, config, opts);
    const offers = matchOffers(concept.niche, concept.topic, 1);

    let spec, specPath;
    try {
      ({ spec, specPath } = await generateVideoSpec(concept.topic, {
        format: config.format,
        scenes: config.scenes,
        fps: config.fps,
        specDir: dir,
        slug: concept.id,
      }));
    } catch (err) {
      append(INVENTORY, { concept_id: concept.id, status: "failed", reason: err.message, created_at: nowIso() }, { ...opts, mirror: true });
      items.push({ ...concept, status: "failed", reason: err.message });
      continue;
    }

    const qa = qaCheck(spec);
    const metadata = buildMetadata(concept, spec, offers);
    fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(metadata, null, 2));

    // Optional render, bounded by render_cap_per_tick + budget.
    let videoPath = null;
    let status = "ready_to_render";
    if (config.render && qa.pass && rendered < (config.render_cap_per_tick ?? 0)) {
      const rgrant = requestSpend(costs.render || 0, `render:${concept.id}`, config, opts);
      if (rgrant.granted) {
        const outRel = path.relative(REMOTION_ROOT, path.join(dir, "video.mp4"));
        const r = renderSpec(specPath, outRel);
        if (r.ok) {
          videoPath = r.out;
          status = "ready";
          rendered++;
        }
      }
    }

    const record = {
      concept_id: concept.id,
      niche: concept.niche,
      topic: concept.topic,
      predicted_roi: concept.predicted_roi,
      spec_path: specPath,
      video_path: videoPath,
      thumbnail_frame: Math.floor((spec.totalDurationInFrames || 30) * 0.25),
      offers: offers.map((o) => o.id),
      qa,
      cost_usd: grant.granted ? grant.amount : 0,
      script_source: spec.voice?.provider === "none" ? "template" : spec.voice?.provider,
      status,
      created_at: nowIso(),
    };
    append(INVENTORY, record, { ...opts, mirror: true });
    items.push({ ...concept, ...record });
  }
  return items;
}
