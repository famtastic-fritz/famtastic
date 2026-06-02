#!/usr/bin/env node
/**
 * scripts/plans/audit-all.js — the single unified drift entry point.
 *
 * Runs BOTH the famtastic flat-file plan audit (audit.js) and the Shay-universe
 * audit (audit-shay.js: kanban + shay-plans + ADOPT-NOW recs), then reports a
 * merged verdict. This is the command the CLAUDE.md Plan Closeout Rule should
 * point at so a session-end check covers both universes.
 *
 * Exit-code contract (identical to audit.js): 0 = clean, 2 = drift in EITHER
 * universe — so CI/cron treat all three audits the same.
 *
 * Usage:
 *   node scripts/plans/audit-all.js          # human report, exit 0/2
 *   node scripts/plans/audit-all.js --json    # machine envelope, exit 0/2
 */

"use strict";

const famAudit = require("./audit.js");
const shay = require("./audit-shay.js");

function famDirty(r) {
  return r.drift.length + r.conflicts.length + r.orphans.length;
}

function main() {
  const json = process.argv.includes("--json");

  const fam = famAudit.audit();
  const sh = shay.run();
  const famD = famDirty(fam);
  const shayD = shay.dirtyCount(sh);
  const dirty = famD + shayD;

  if (json) {
    console.log(
      JSON.stringify(
        {
          snapshot_version: 1,
          generated_at: new Date().toISOString(),
          source_ledgers: [
            "famtastic-registry",
            "famtastic-tasks",
            "kanban",
            "shay-plans",
            "capability-map",
            "git",
          ],
          record_count: sh.nodeCount,
          data: {
            // Unified drift list across both universes, for downstream tools
            // (the cron reconciler + dashboard) to consume.
            drift: [
              ...fam.drift.map((d) => ({ universe: "famtastic", ...d })),
              ...sh.owedPlanNoTask.map((d) => ({ universe: "shay", ...d })),
              ...sh.adoptNowNeverTasked.map((d) => ({ universe: "shay", ...d })),
            ],
            stale: sh.builtButTriage,
            conflicts: fam.conflicts,
            orphans: fam.orphans,
            famtastic: fam,
            shay: sh,
          },
          dirty,
        },
        null,
        2
      )
    );
  } else {
    console.log("################  UNIFIED DRIFT AUDIT (audit-all)  ################");
    console.log();
    console.log("--- famtastic flat-file universe (audit.js) ---");
    console.log(`  drift=${fam.drift.length} conflicts=${fam.conflicts.length} orphans=${fam.orphans.length}`);
    for (const d of fam.drift) console.log(`    ⚠ plan ${d.id} — zero open tasks`);
    for (const c of fam.conflicts) console.log(`    ✕ ${c.id}: registry=active closeout=${c.closeout_verdict}`);
    console.log();
    console.log("--- Shay universe (audit-shay.js) ---");
    console.log(`  owed-plan-no-task=${sh.owedPlanNoTask.length} adopt-now-untasked=${sh.adoptNowNeverTasked.length} built-but-triage=${sh.builtButTriage.length}`);
    for (const d of sh.owedPlanNoTask) console.log(`    ⚠ ${d.plan} — ${d.reason}`);
    for (const d of sh.adoptNowNeverTasked) console.log(`    ⚠ ADOPT-NOW untasked: ${d.item}`);
    for (const d of sh.builtButTriage) console.log(`    ◌ built-but-triage: ${d.title} [${d.board}] → ${d.suggestion}`);
    console.log();
    console.log(`UNIFIED VERDICT: ${dirty === 0 ? "✅ clean (both universes)" : `🔴 ${dirty} drift item(s) — fam=${famD} shay=${shayD}`}`);
  }
  return dirty === 0 ? 0 : 2;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { main };
