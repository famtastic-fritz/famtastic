#!/usr/bin/env node
/**
 * scripts/plans/audit-shay.js — read-only drift audit for the SHAY universe
 * (kanban boards + ~/.shay/plans + ADOPT-NOW vault recs), the half audit.js
 * cannot see. Same exit-code contract as audit.js: 0 = clean, 2 = drift.
 *
 * Runs the three detectors from lib/trace-graph.js:
 *   1. owed-plan-no-task       (the W5 / Agent-OS-port class)
 *   2. ADOPT-NOW-never-tasked  (the silently-dropped-adopt class)
 *   3. built-but-triage        (the stale-card / built-not-closed class)
 *
 * Usage:
 *   node scripts/plans/audit-shay.js          # human report, exit 0/2
 *   node scripts/plans/audit-shay.js --json    # machine envelope, exit 0/2
 */

"use strict";

const tg = require("./lib/trace-graph.js");

function run() {
  const r = tg.reconcile();
  return {
    owedPlanNoTask: r.owedPlanNoTask,
    adoptNowNeverTasked: r.adoptNowNeverTasked,
    builtButTriage: r.builtButTriage,
    nodeCount: r.graph.nodes.length,
    edgeCount: r.graph.edges.length,
  };
}

function dirtyCount(r) {
  // Built-but-triage is a PROPOSAL (proposes, not disposes) — it counts toward
  // drift so audit-all exits non-zero and the card backlog cannot hide, but it
  // is surfaced as a suggestion, never an auto-mutation.
  return (
    r.owedPlanNoTask.length +
    r.adoptNowNeverTasked.length +
    r.builtButTriage.length
  );
}

function fmt(r) {
  console.log("=== SHAY DRIFT AUDIT (kanban + shay-plans + ADOPT-NOW recs) ===");
  console.log();
  console.log(`Trace graph: ${r.nodeCount} nodes, ${r.edgeCount} edges`);
  console.log();
  console.log(`Detector 1 — owed plan with no fulfilling build task: ${r.owedPlanNoTask.length}`);
  for (const d of r.owedPlanNoTask) console.log(`  ⚠ ${d.plan} — ${d.reason} (${d.title})`);
  console.log();
  console.log(`Detector 2 — ADOPT-NOW capability never tasked: ${r.adoptNowNeverTasked.length}`);
  for (const d of r.adoptNowNeverTasked) console.log(`  ⚠ ${d.item} [${d.category}]`);
  console.log();
  console.log(`Detector 3 — built-but-triage (proposes \`shay kanban complete\`): ${r.builtButTriage.length}`);
  for (const d of r.builtButTriage)
    console.log(`  ◌ ${d.title}  [${d.board}/${d.status}]  evidence: ${d.evidence}\n      → ${d.suggestion}`);
  console.log();
  const dirty = dirtyCount(r);
  console.log(`Verdict: ${dirty === 0 ? "✅ clean" : `🔴 ${dirty} drift item(s)`}`);
}

function main() {
  const json = process.argv.includes("--json");
  const r = run();
  const dirty = dirtyCount(r);
  if (json) {
    console.log(
      JSON.stringify(
        {
          snapshot_version: 1,
          generated_at: new Date().toISOString(),
          source_ledgers: ["kanban", "shay-plans", "capability-map", "git"],
          record_count: r.nodeCount,
          data: {
            drift: [...r.owedPlanNoTask, ...r.adoptNowNeverTasked],
            stale: r.builtButTriage,
            owedPlanNoTask: r.owedPlanNoTask,
            adoptNowNeverTasked: r.adoptNowNeverTasked,
            builtButTriage: r.builtButTriage,
          },
          dirty,
        },
        null,
        2
      )
    );
  } else {
    fmt(r);
  }
  return dirty === 0 ? 0 : 2;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { run, dirtyCount };
