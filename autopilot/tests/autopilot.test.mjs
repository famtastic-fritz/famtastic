// Autopilot tests — deterministic pieces + a full dry-run tick.
// Run: node --test autopilot/tests/autopilot.test.mjs
// Uses throwaway temp roots so it never touches real autopilot state.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { requestSpend, spentToday, remainingToday } from "../lib/budget.mjs";
import { checkGovernance, isStopped } from "../lib/governance.mjs";
import { runConcept } from "../stages/concept.mjs";
import { runFeedback } from "../stages/feedback.mjs";
import { extractBrand, extractClientEmail } from "../stages/client-upsell.mjs";
import { buildPayload, sendEmail, hasEmailCreds } from "../lib/email.mjs";
import { tick } from "../orchestrator.mjs";
import { read } from "../lib/ledger.mjs";

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "autopilot-test-"));
}

const CONFIG = {
  spend_cap_usd_per_day: 5,
  platforms: ["youtube", "tiktok", "instagram"],
  niche_strategy: "auto_roi",
  videos_per_tick: 3,
  explore_ratio: 0.2,
  live: false,
  render: false,
  render_cap_per_tick: 0,
  format: "vertical",
  fps: 30,
  scenes: 5,
  seed_niches: ["personal finance", "productivity", "tech tips", "health habits"],
  cost_estimates_usd: { script_llm: 0.01, voiceover: 0.02, render: 0 },
};

test("budget governor: free actions always granted, paid within cap, denied over cap", () => {
  const root = tmpRoot();
  assert.equal(spentToday({ root }), 0);
  assert.equal(requestSpend(0, "free", CONFIG, { root }).granted, true);
  const g1 = requestSpend(3, "a", CONFIG, { root });
  assert.equal(g1.granted, true);
  assert.equal(spentToday({ root }), 3);
  const g2 = requestSpend(3, "b", CONFIG, { root }); // would exceed $5 cap
  assert.equal(g2.granted, false);
  assert.match(g2.reason, /cap exceeded/);
  assert.equal(remainingToday(CONFIG, { root }), 2);
});

test("governance: STOP flag blocks; dry-run when not live; internal always live", () => {
  const root = tmpRoot();
  assert.equal(isStopped(root), false);
  // outward publish with live=false -> dry-run
  const pub = checkGovernance({ kind: "publish", platform: "youtube" }, { config: CONFIG, root });
  assert.equal(pub.mode, "dry-run");
  // internal action -> live
  const internal = checkGovernance({ kind: "produce" }, { config: CONFIG, root });
  assert.equal(internal.mode, "live");
  // STOP -> blocked
  fs.writeFileSync(path.join(root, "STOP"), "x");
  const blocked = checkGovernance({ kind: "publish", platform: "youtube" }, { config: CONFIG, root });
  assert.equal(blocked.mode, "blocked");
  assert.equal(blocked.allowed, false);
});

test("governance: live mode requires live flag AND credentials", () => {
  const root = tmpRoot();
  const liveCfg = { ...CONFIG, live: true };
  // No creds in test env -> still dry-run even with live=true
  const r = checkGovernance({ kind: "publish", platform: "tiktok" }, { config: liveCfg, root });
  assert.equal(r.mode, "dry-run");
  assert.match(r.reason, /no credentials/);
});

test("concept: produces N deduped concepts with predicted ROI", () => {
  const root = tmpRoot();
  const concepts = runConcept(CONFIG, { root });
  assert.equal(concepts.length, 3);
  const fps = concepts.map((c) => c.fingerprint);
  assert.equal(new Set(fps).size, fps.length, "no duplicate fingerprints within a tick");
  for (const c of concepts) {
    assert.ok(CONFIG.seed_niches.includes(c.niche));
    assert.ok(c.predicted_roi >= 0 && c.predicted_roi <= 1);
    assert.ok(["explore", "exploit"].includes(c.mode));
  }
  // A second call dedupes against the first (persisted fingerprints).
  const more = runConcept(CONFIG, { root });
  const all = new Set([...fps, ...more.map((c) => c.fingerprint)]);
  assert.equal(all.size, fps.length + more.length, "cross-tick dedupe holds");
});

test("feedback: simulated metrics are deterministic and update performance ledger", () => {
  const root = tmpRoot();
  const published = [
    { concept_id: "cpt_x", niche: "tech tips", platform: "youtube", status: "staged" },
  ];
  const a = runFeedback(published, CONFIG, { root });
  const b = runFeedback(published, CONFIG, { root });
  assert.equal(a.performance[0].score, b.performance[0].score, "deterministic score");
  assert.equal(a.performance[0].simulated, true);
  assert.ok(read("performance", { root }).length >= 2);
});

test("orchestrator: a full dry-run tick produces inventory + staged posts", async () => {
  const root = tmpRoot();
  const summary = await tick(CONFIG, { root });
  assert.equal(summary.status, "complete");
  assert.equal(summary.produced, 3);
  assert.equal(summary.staged, 9); // 3 videos x 3 platforms
  assert.equal(summary.published_live, 0); // dry-run
  assert.equal(summary.spent_today_usd, 0); // free path, no keys
  assert.ok(["productive", "suspicious", "stuck"].includes(summary.health));
  assert.ok(read("concepts", { root }).length === 3);
  assert.ok(read("inventory", { root }).length === 3);
  assert.ok(read("published", { root }).length === 9);
});

test("client-upsell: extractBrand pulls name, vertical, and a vivid accent", () => {
  const spec = {
    site_name: "Tony's Barber Shop",
    business_type: "barber",
    deployed_url: "https://tonys.example.com",
    design_brief: { tone: ["clean", "classic"], visual_direction: { palette: "#0A0A0A and #1E40AF accents on #FFFFFF" } },
  };
  const brand = extractBrand(spec);
  assert.equal(brand.name, "Tony's Barber Shop");
  assert.equal(brand.vertical, "barber");
  assert.equal(brand.url, "https://tonys.example.com");
  assert.equal(brand.accent, "#1E40AF", "picks the vivid color, not black/white");
});

test("client-upsell: extractBrand falls back to a vertical default accent", () => {
  const brand = extractBrand({ site_name: "Bloom", business_type: "florist", design_brief: {} });
  assert.equal(brand.accent, "#db2777"); // florist default
});

test("email: buildPayload normalizes to[] + text, reply_to optional", () => {
  const p = buildPayload({ from: "a@x.com", to: "b@y.com", subject: "hi", body: "yo" });
  assert.deepEqual(p.to, ["b@y.com"]);
  assert.equal(p.text, "yo");
  assert.equal("reply_to" in p, false);
  const p2 = buildPayload({ from: "a@x.com", to: ["b@y.com"], subject: "s", body: "b", reply_to: "r@z.com" });
  assert.equal(p2.reply_to, "r@z.com");
});

test("email: sendEmail without a key never throws and reports not sent", async () => {
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  const r = await sendEmail({ from: "a@x.com", to: "b@y.com", subject: "s", body: "b" });
  assert.equal(r.sent, false);
  assert.match(r.reason, /resend key/);
  if (saved !== undefined) process.env.RESEND_API_KEY = saved;
});

test("email: hasEmailCreds reflects the environment", () => {
  const saved = process.env.RESEND_API_KEY;
  delete process.env.RESEND_API_KEY;
  assert.equal(hasEmailCreds(), false);
  process.env.RESEND_API_KEY = "re_test";
  assert.equal(hasEmailCreds(), true);
  if (saved === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = saved;
});

test("client-upsell: extractClientEmail finds config override, spec email, or null", () => {
  assert.equal(
    extractClientEmail({}, "site-x", { client_contacts: { "site-x": "boss@x.com" } }),
    "boss@x.com",
  );
  assert.equal(extractClientEmail({ contact: { email: "hi@biz.com" } }, "site-y"), "hi@biz.com");
  assert.equal(extractClientEmail({ design_brief: { goal: "reach owner at sales@cafe.io today" } }, "site-z"), "sales@cafe.io");
  assert.equal(extractClientEmail({ tag: "nope" }, "site-q"), null);
});

test("orchestrator: STOP halts the tick before any work", async () => {
  const root = tmpRoot();
  fs.writeFileSync(path.join(root, "STOP"), "x");
  const summary = await tick(CONFIG, { root });
  assert.equal(summary.status, "halted");
  assert.equal(read("concepts", { root }).length, 0);
});
