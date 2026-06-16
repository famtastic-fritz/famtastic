// STAGE 3 — ADVERTISING / DISTRIBUTION. Schedule + publish to each platform.
//
// Publishing passes through the governance gate. With config.live=false or no
// platform credentials it runs in dry-run: a complete "staged bundle" is
// written (everything a human or the live adapter would need to post), and a
// `published` record is logged with status "staged". The instant credentials
// + live=true are present, the SAME path flips to real API uploads — no code
// change.

import fs from "node:fs";
import path from "node:path";
import { append } from "../lib/ledger.mjs";
import { checkGovernance } from "../lib/governance.mjs";
import { outDir } from "../lib/paths.mjs";
import { nowIso } from "../lib/util.mjs";
import { publishers } from "./publishers.mjs";

const PUBLISHED = "published";

// Best-time heuristics (local hours). The scheduler spaces posts so the feed
// looks human and respects per-platform rate limits.
const BEST_HOURS = { youtube: [15, 18, 20], tiktok: [11, 17, 21], instagram: [12, 19] };

function nextSlot(platform, index) {
  const hours = BEST_HOURS[platform] || [12];
  const hour = hours[index % hours.length];
  const d = new Date();
  d.setMinutes(0, 0, 0);
  if (d.getHours() >= hour) d.setDate(d.getDate() + 1); // push to tomorrow
  d.setHours(hour);
  d.setMinutes((index * 17) % 60); // jitter
  return d.toISOString();
}

export function runAdvertising(inventoryItems, config, opts = {}) {
  const records = [];
  let i = 0;

  for (const item of inventoryItems) {
    if (item.status === "failed") continue;
    const dir = path.join(outDir(opts.root), item.concept_id);
    fs.mkdirSync(dir, { recursive: true });
    const metaPath = path.join(dir, "metadata.json");
    const metadata = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, "utf8")) : {};

    for (const platform of config.platforms || []) {
      const gov = checkGovernance({ kind: "publish", platform }, { config, root: opts.root });
      const scheduled_at = nextSlot(platform, i++);
      const bundle = {
        concept_id: item.concept_id,
        platform,
        scheduled_at,
        video_path: item.video_path,
        spec_path: item.spec_path,
        metadata: metadata[platform] || {},
        offers: item.offers,
      };

      const pub = publishers[platform] || publishers.default;
      const result = pub(bundle, gov, dir);

      const record = {
        concept_id: item.concept_id,
        niche: item.niche,
        platform,
        mode: gov.mode,
        status: result.status, // "staged" | "published" | "skipped"
        scheduled_at,
        permalink: result.permalink || null,
        reason: gov.reason,
        created_at: nowIso(),
      };
      append(PUBLISHED, record, { ...opts, mirror: true });
      records.push(record);
    }
  }
  return records;
}
