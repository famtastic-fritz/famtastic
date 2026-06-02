#!/usr/bin/env node
// autopilot — the autonomous faceless-video business runner.
//
//   node autopilot/cli.mjs tick       run one full loop (concept→…→feedback)
//   node autopilot/cli.mjs status      show ledgers, budget, recent runs
//   node autopilot/cli.mjs report      summarize performance + learnings
//   node autopilot/cli.mjs stop        set the kill switch (halts outward actions)
//   node autopilot/cli.mjs resume      clear the kill switch
//   node autopilot/cli.mjs config      print effective config
//
// Flags: --render (force render), --live (attempt live publish), --videos N
// Designed to be cron/launchd-driven; see autopilot/install-cron.sh.

import fs from "node:fs";
import { tick } from "./orchestrator.mjs";
import { loadConfig, stopFlagPath, AUTOPILOT_ROOT } from "./lib/paths.mjs";
import { read } from "./lib/ledger.mjs";
import { spentToday, remainingToday } from "./lib/budget.mjs";

function parseFlags(argv) {
  const f = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--render") f.render = true;
    else if (argv[i] === "--live") f.live = true;
    else if (argv[i] === "--videos") f.videos_per_tick = Number(argv[++i]);
  }
  return f;
}

async function main() {
  const [cmd = "status", ...rest] = process.argv.slice(2);
  const config = { ...loadConfig(), ...parseFlags(rest) };

  if (cmd === "tick") {
    console.log("🚀 autopilot tick — running concept → collection → advertising → feedback\n");
    const summary = await tick(config);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status === "halted") {
      console.log("\n⏸  halted — STOP flag is set. Run `resume` to clear it.");
    } else {
      console.log(
        `\n✅ tick complete · ${summary.produced} produced · ${summary.staged} staged · ` +
          `$${summary.spent_today_usd}/${config.spend_cap_usd_per_day} spent · health=${summary.health}`,
      );
    }
    return;
  }

  if (cmd === "stop") {
    fs.writeFileSync(stopFlagPath(), `stopped at ${new Date().toISOString()}\n`);
    console.log("🛑 kill switch SET — outward actions halted. `resume` to clear.");
    return;
  }
  if (cmd === "resume") {
    const p = stopFlagPath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
    console.log("▶  kill switch cleared.");
    return;
  }

  if (cmd === "config") {
    console.log(JSON.stringify(config, null, 2));
    return;
  }

  if (cmd === "report") {
    const perf = read("performance");
    const learn = read("learnings");
    const byNiche = {};
    for (const p of perf) {
      byNiche[p.niche] ??= { n: 0, score: 0, revenue: 0, views: 0 };
      byNiche[p.niche].n++;
      byNiche[p.niche].score += p.score;
      byNiche[p.niche].revenue += p.revenue_usd;
      byNiche[p.niche].views += p.views;
    }
    console.log("📊 PERFORMANCE BY NICHE (sorted by avg score)\n");
    Object.entries(byNiche)
      .map(([niche, v]) => ({ niche, avg: v.score / v.n, ...v }))
      .sort((a, b) => b.avg - a.avg)
      .forEach((r) =>
        console.log(`  ${r.avg.toFixed(2)}  ${r.niche.padEnd(18)} ${r.n} posts · ${r.views} views · $${r.revenue.toFixed(2)}`),
      );
    console.log(`\n💡 LEARNINGS (${learn.length})`);
    learn.slice(-10).forEach((l) => console.log(`  [${l.kind}] ${l.body}`));
    return;
  }

  // default: status
  const runs = read("runs");
  const last = runs[runs.length - 1];
  console.log("🤖 AUTOPILOT STATUS\n");
  console.log(`  root            : ${AUTOPILOT_ROOT}`);
  console.log(`  kill switch     : ${fs.existsSync(stopFlagPath()) ? "🛑 STOPPED" : "▶ running-enabled"}`);
  console.log(`  live publishing : ${config.live ? "ON" : "OFF (dry-run / staging)"}`);
  console.log(`  spend today     : $${spentToday()} / $${config.spend_cap_usd_per_day} (── $${remainingToday(config)} left)`);
  console.log(`  concepts        : ${read("concepts").length}`);
  console.log(`  inventory       : ${read("inventory").length}`);
  console.log(`  published       : ${read("published").length}`);
  console.log(`  runs            : ${runs.length}`);
  if (last) console.log(`  last run        : ${last.at} · ${last.status} · health=${last.health || "?"}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
