// Platform publisher adapters. Each adapter has the SAME shape:
//   publish(bundle, gov, dir) -> { status, permalink? }
//
// In gov.mode === "dry-run" the adapter writes a staged bundle file (the exact
// payload a live upload would send) and returns status "staged". In "live"
// mode it would call the platform's official API. The live calls are left as
// explicit, documented integration points keyed on credentials that don't
// exist yet — so the system can never accidentally post. Wire them when you
// connect accounts (see autopilot/README.md → credential handshake).

import fs from "node:fs";
import path from "node:path";

function stage(bundle, dir) {
  const file = path.join(dir, `${bundle.platform}.staged.json`);
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2));
  return { status: "staged", staged_file: file };
}

function makeAdapter(platform, liveUpload) {
  return (bundle, gov, dir) => {
    if (gov.mode === "blocked") return { status: "skipped" };
    if (gov.mode === "dry-run") return stage(bundle, dir);
    // gov.mode === "live": credentials are present and config.live is true.
    try {
      return liveUpload(bundle);
    } catch (err) {
      // Never let a publish failure crash the tick; fall back to staging.
      stage(bundle, dir);
      return { status: "staged", error: err.message };
    }
  };
}

// --- Live upload integration points (wired when accounts are connected) ---
// Each throws until implemented; in dry-run they are never reached.
function youtubeUpload() {
  // TODO(live): POST to YouTube Data API v3 videos.insert with bundle.video_path
  // + bundle.metadata.{title,description,tags}. Auth: OAuth token from vault.
  throw new Error("youtube live upload not yet wired (connect channel)");
}
function tiktokUpload() {
  // TODO(live): TikTok Content Posting API /v2/post/publish/video/init.
  throw new Error("tiktok live upload not yet wired (app approval required)");
}
function instagramUpload() {
  // TODO(live): IG Graph API media (container) + media_publish. Business acct.
  throw new Error("instagram live upload not yet wired (connect business acct)");
}

export const publishers = {
  youtube: makeAdapter("youtube", youtubeUpload),
  tiktok: makeAdapter("tiktok", tiktokUpload),
  instagram: makeAdapter("instagram", instagramUpload),
  default: makeAdapter("default", () => {
    throw new Error("no live adapter");
  }),
};
