// MONETIZATION — client upsell. The fastest-money path: you already build
// sites for local businesses; almost none of them make social video. This
// agent detects those clients, auto-produces a branded promo in their own
// colors, and drafts a delivery + offer email — all staged, ready to send.
//
// Discovery scans the Studio sandbox (sites/) and the sibling deploy repo
// (../famtastic-sites/). Brand is extracted from each spec.json. Email is
// staged (dry-run) until a sender + provider credentials exist.

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { append } from "../lib/ledger.mjs";
import { requestSpend } from "../lib/budget.mjs";
import { hasCredsFor } from "../lib/vault.mjs";
import { checkGovernance } from "../lib/governance.mjs";
import { outDir, HUB_ROOT } from "../lib/paths.mjs";
import { nowIso } from "../lib/util.mjs";
import { generateVideoSpec } from "../../remotion/src/pipeline/index.mjs";
import { renderSpec } from "../lib/render.mjs";

const CLIENTS = "clients";

const SITE_ROOTS = [
  path.join(HUB_ROOT, "sites"),
  path.join(HUB_ROOT, "..", "famtastic-sites"),
  path.join(os.homedir(), "famtastic-sites"),
];

// Default accent per vertical when the spec has no usable brand color.
const VERTICAL_ACCENT = {
  reunion: "#C8102E",
  pizza: "#e11d48",
  restaurant: "#ea580c",
  barber: "#1e293b",
  "barber shop": "#1e293b",
  florist: "#db2777",
  flowers: "#db2777",
  transport: "#2563eb",
  bakery: "#b45309",
  accounting: "#0f766e",
  coffee: "#6f4e37",
};

// A promo angle per vertical (becomes the faceless topic). With an OpenAI key
// the script is tailored; offline it's the templated structure around this.
function promoTopic(brand) {
  const n = brand.name;
  const v = (brand.vertical || "").toLowerCase();
  if (v.includes("reunion")) return `${n} — save the date and RSVP now`;
  if (v.includes("pizza") || v.includes("restaurant")) return `why ${n} is the local favorite`;
  if (v.includes("barber")) return `the cleanest cuts in town at ${n}`;
  if (v.includes("flower") || v.includes("florist")) return `same-day flowers from ${n}`;
  if (v.includes("transport")) return `reliable, on-time rides with ${n}`;
  if (v.includes("bakery")) return `fresh every morning at ${n}`;
  if (v.includes("coffee")) return `your new favorite cup at ${n}`;
  if (v.includes("account")) return `stress-free books with ${n}`;
  return `what makes ${n} worth visiting`;
}

export function discoverClients() {
  const found = [];
  const seen = new Set();
  for (const rootDir of SITE_ROOTS) {
    if (!fs.existsSync(rootDir)) continue;
    for (const entry of fs.readdirSync(rootDir)) {
      const dir = path.join(rootDir, entry);
      const specPath = path.join(dir, "spec.json");
      if (!fs.existsSync(specPath)) continue;
      let spec;
      try {
        spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
      } catch {
        continue;
      }
      const tag = spec.tag || entry;
      if (seen.has(tag)) continue;
      seen.add(tag);
      found.push({ tag, dir, spec });
    }
  }
  return found;
}

export function extractBrand(spec) {
  const name = spec.site_name || spec.tag || "your business";
  const vertical = spec.business_type || "";
  const db = spec.design_brief || {};
  const tone = Array.isArray(db.tone) ? db.tone.join(", ") : db.tone || "";

  // Pull hex colors from the visual/brand sections, drop near-black/white/gray,
  // and take the first vivid one as the accent.
  const blob = JSON.stringify({
    vd: db.visual_direction,
    sf: spec.style_fingerprint,
    bm: spec.brand_mark,
    cb: spec.character_branding,
  });
  const hexes = [...new Set((blob.match(/#[0-9a-fA-F]{6}\b/g) || []).map((h) => h.toUpperCase()))];
  const accent =
    hexes.find(isVivid) ||
    VERTICAL_ACCENT[(vertical || "").toLowerCase()] ||
    "#34d399";

  return { name, vertical, tone, accent, url: spec.deployed_url || null };
}

function isVivid(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (max + min) / 2;
  if (lum < 28 || lum > 232) return false; // too dark / too light
  if (max - min < 40) return false; // too gray
  return true;
}

function draftEmail(brand, config, samplePath) {
  const from = config.client_from_email || process.env.CLIENT_FROM_EMAIL || "you@yourstudio.com";
  const offer = config.client_offer || "5 branded short videos a month for $250";
  const siteLine = brand.url ? `the site we built you (${brand.url})` : "the site we built you";
  return {
    from,
    subject: `Made you a free video for ${brand.name} 🎬`,
    body:
      `Hi,\n\n` +
      `Quick one — I put together a short, branded promo video for ${brand.name} ` +
      `(same look and colors as ${siteLine}). It's the kind of clip that does well on ` +
      `Instagram Reels, TikTok, and YouTube Shorts, where most local businesses aren't posting.\n\n` +
      `Sample attached: ${samplePath}\n\n` +
      `If you like it, I can run this for you on autopilot — ${offer}, posted consistently ` +
      `so you actually show up in the feed. No work on your end.\n\n` +
      `Want me to send a few more this week?\n\n` +
      `— Sent from ${from}\n`,
  };
}

export async function runClientUpsell(config, opts = {}) {
  const clients = discoverClients().slice(0, config.client_limit || 10);
  const baseDir = path.join(outDir(opts.root), "clients");
  fs.mkdirSync(baseDir, { recursive: true });

  let rendered = 0;
  const items = [];
  for (const { tag, spec } of clients) {
    const brand = extractBrand(spec);
    const dir = path.join(baseDir, tag);
    fs.mkdirSync(dir, { recursive: true });

    // Budget-gate the paid steps (free path if no keys).
    const costs = config.cost_estimates_usd || {};
    const wantPaid = hasCredsFor("openai") || hasCredsFor("elevenlabs");
    const estCost = wantPaid ? (costs.script_llm || 0) + (costs.voiceover || 0) : 0;
    requestSpend(estCost, `client-promo:${tag}`, config, opts);

    let spec2, specPath;
    try {
      ({ spec: spec2, specPath } = await generateVideoSpec(promoTopic(brand), {
        format: config.format || "vertical",
        scenes: 4,
        fps: config.fps,
        accent: brand.accent,
        specDir: dir,
        slug: tag,
      }));
    } catch (err) {
      append(CLIENTS, { tag, status: "failed", reason: err.message, created_at: nowIso() }, { ...opts, mirror: true });
      items.push({ tag, status: "failed", reason: err.message });
      continue;
    }

    // Optional render, bounded.
    let videoPath = null;
    if (config.render && rendered < (config.render_cap_per_tick ?? 0)) {
      const rgrant = requestSpend(costs.render || 0, `client-render:${tag}`, config, opts);
      if (rgrant.granted) {
        const r = renderSpec(specPath, path.relative(path.join(HUB_ROOT, "remotion"), path.join(dir, "promo.mp4")));
        if (r.ok) {
          videoPath = r.out;
          rendered++;
        }
      }
    }

    // Draft + stage the offer email (governance: email is outward → dry-run).
    const sampleRef = videoPath || specPath;
    const email = draftEmail(brand, config, sampleRef);
    const gov = checkGovernance({ kind: "email" }, { config, root: opts.root });
    const emailStatus = gov.mode === "live" ? "would_send" : "staged";
    fs.writeFileSync(
      path.join(dir, "email.txt"),
      `To: <${tag} contact>\nFrom: ${email.from}\nSubject: ${email.subject}\n\n${email.body}`,
    );

    const record = {
      tag,
      name: brand.name,
      vertical: brand.vertical,
      accent: brand.accent,
      site_url: brand.url,
      promo_topic: promoTopic(brand),
      spec_path: specPath,
      video_path: videoPath,
      email_status: emailStatus,
      email_subject: email.subject,
      status: "ready",
      created_at: nowIso(),
    };
    append(CLIENTS, record, { ...opts, mirror: true });
    items.push(record);
  }
  return items;
}
