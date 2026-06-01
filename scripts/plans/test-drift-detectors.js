#!/usr/bin/env node
/**
 * scripts/plans/test-drift-detectors.js — self-test gate for the anti-drift
 * reconciler. Runs the three detectors against live data and asserts each
 * known drift class is reproduced from cold data:
 *   D1 — the Agent-OS W5 / Shay-OS-port plan is flagged owed-with-no-build-task
 *   D2 — genuinely-dropped ADOPT-NOW items (rlm-rs, graphify, autoloop) flagged
 *   D3 — at least one stale built-but-triage deskbuild card (incl. W-Models)
 *
 * Exit 0 = all gates pass; exit 1 = a detector regressed.
 */

"use strict";

const tg = require("./lib/trace-graph.js");

function assert(name, cond) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  return cond;
}

const r = tg.reconcile();

const d1 = assert(
  "D1 owed-plan-no-task flags the Shay-OS port plan (W5)",
  r.owedPlanNoTask.some((d) => /port plan|shay-os|\bW5\b/i.test(d.title))
);

const items = r.adoptNowNeverTasked.map((d) => d.item.toLowerCase());
const d2 = assert(
  "D2 ADOPT-NOW-never-tasked flags rlm-rs / graphify / autoloop",
  ["rlm-rs", "graphify", "autoloop"].every((k) =>
    items.some((i) => i.includes(k))
  )
);

const d3 = assert(
  "D3 built-but-triage flags >=1 stale deskbuild card (incl. W-Models)",
  r.builtButTriage.length >= 1 &&
    r.builtButTriage.some((d) => /W-Models|Model registry/i.test(d.title))
);

const ok = d1 && d2 && d3;
console.log(ok ? "\nALL GATES PASS" : "\nGATE FAILURE");
process.exit(ok ? 0 : 1);
