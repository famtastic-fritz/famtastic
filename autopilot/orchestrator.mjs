// The conductor. One tick = one pass of the full loop:
//   concept → collection → advertising → feedback
// with the kill switch, budget governor, audit ledger, and run-health check
// all active. Designed to be called on a schedule (cron/launchd) and to be
// safe to run unattended.

import { runConcept } from "./stages/concept.mjs";
import { runCollection } from "./stages/collection.mjs";
import { runAdvertising } from "./stages/advertising.mjs";
import { runFeedback } from "./stages/feedback.mjs";
import { append } from "./lib/ledger.mjs";
import { isStopped } from "./lib/governance.mjs";
import { remainingToday, spentToday } from "./lib/budget.mjs";
import { evaluateRunHealth } from "./lib/interop.mjs";
import { shortId, nowIso } from "./lib/util.mjs";

export async function tick(config, opts = {}) {
  const run_id = shortId("run", nowIso(), Math.random());
  const events = [];
  const ev = (action, ok, extra = {}) => events.push({ action, ok, ...extra });

  if (isStopped(opts.root)) {
    const rec = { run_id, status: "halted", reason: "STOP flag set", at: nowIso() };
    append("runs", rec, opts);
    return rec;
  }

  let concepts = [];
  let inventory = [];
  let published = [];
  let feedback = { performance: [], learnings: [], totalRevenue: 0 };

  try {
    concepts = runConcept(config, opts);
    ev("concept", concepts.length > 0, { count: concepts.length });
  } catch (err) {
    ev("concept", false, { error: err.message });
  }

  try {
    inventory = await runCollection(concepts, config, opts);
    ev("collection", inventory.some((i) => i.status !== "failed"), {
      produced: inventory.filter((i) => i.status !== "failed").length,
      failed: inventory.filter((i) => i.status === "failed").length,
    });
  } catch (err) {
    ev("collection", false, { error: err.message });
  }

  try {
    published = runAdvertising(inventory, config, opts);
    ev("advertising", published.length > 0, {
      staged: published.filter((p) => p.status === "staged").length,
      live: published.filter((p) => p.status === "published").length,
    });
  } catch (err) {
    ev("advertising", false, { error: err.message });
  }

  try {
    feedback = runFeedback(published, config, opts);
    ev("feedback", feedback.performance.length > 0, {
      learnings: feedback.learnings.length,
      revenue: feedback.totalRevenue,
    });
  } catch (err) {
    ev("feedback", false, { error: err.message });
  }

  const health = evaluateRunHealth(events, { windowSize: 8 });
  const summary = {
    run_id,
    status: "complete",
    at: nowIso(),
    concepts: concepts.length,
    produced: inventory.filter((i) => i.status !== "failed").length,
    staged: published.filter((p) => p.status === "staged").length,
    published_live: published.filter((p) => p.status === "published").length,
    learnings: feedback.learnings.length,
    projected_revenue_usd: feedback.totalRevenue,
    simulated_metrics: feedback.simulated,
    spent_today_usd: spentToday(opts),
    budget_remaining_usd: remainingToday(config, opts),
    health: health.status,
    events,
  };
  append("runs", summary, { ...opts, mirror: true });
  return summary;
}
