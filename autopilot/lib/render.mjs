// Render helper — turns a faceless spec into an MP4 via the Remotion CLI.
// Auto-detects a usable headless Chromium (Remotion's own, or the Playwright
// headless_shell that ships in this environment). Returns { ok, out, reason }.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { REMOTION_ROOT } from "./paths.mjs";

const CANDIDATE_BROWSERS = [
  "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
];

export function findBrowser() {
  // Prefer an explicit headless_shell; glob the pw-browsers dir for any version.
  for (const c of CANDIDATE_BROWSERS) if (fs.existsSync(c)) return c;
  const pw = "/opt/pw-browsers";
  try {
    for (const d of fs.readdirSync(pw)) {
      if (d.startsWith("chromium_headless_shell")) {
        const p = path.join(pw, d, "chrome-linux", "headless_shell");
        if (fs.existsSync(p)) return p;
      }
    }
  } catch {
    /* not present */
  }
  return null; // let Remotion try its own download (works off-sandbox)
}

export function renderSpec(specPath, outPath, { composition = "FacelessVideo" } = {}) {
  if (!fs.existsSync(path.join(REMOTION_ROOT, "node_modules"))) {
    return { ok: false, out: null, reason: "remotion deps not installed (run: cd remotion && npm install)" };
  }
  const args = ["remotion", "render", composition, outPath, `--props=${specPath}`, "--concurrency=2"];
  const browser = findBrowser();
  if (browser) args.push(`--browser-executable=${browser}`);
  const res = spawnSync("npx", args, { cwd: REMOTION_ROOT, encoding: "utf8" });
  if (res.status === 0 && fs.existsSync(path.join(REMOTION_ROOT, outPath))) {
    return { ok: true, out: path.join(REMOTION_ROOT, outPath), reason: "rendered" };
  }
  return {
    ok: false,
    out: null,
    reason: (res.stderr || res.stdout || "render failed").split("\n").filter(Boolean).pop(),
  };
}
