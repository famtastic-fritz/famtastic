'use strict';

/**
 * run.js — runs every strategy agent for the latest available session and
 * prints a leaderboard of "$10 -> $X" outcomes.
 *
 * IMPORTANT: This is a PAPER / SIMULATION harness on HISTORICAL daily session
 * data. It is NOT connected to any brokerage and executes NO real trades.
 * A single session's result is NOISE, not skill — this exists to measure
 * agents repeatably over many sessions.
 *
 * Usage:  node scripts/finance-agents/run.js [--offline]
 *   --offline   skip the live network fetch and use cache/sample only.
 */

const fs = require('fs');
const path = require('path');
const { loadBasket } = require('./data');
const { AGENTS } = require('./agents');

const STAKE = 10; // dollars per agent
const RESULTS_DIR = path.join(__dirname, 'results');

function buildSnapshot(basket) {
  const { asOf, series } = basket;

  const priorBars = (display) => {
    const s = series.find((x) => x.display === display);
    if (!s) return [];
    return s.bars.filter((b) => b.date < asOf);
  };

  const sessionMove = (display) => {
    const s = series.find((x) => x.display === display);
    if (!s) return { prevClose: null, close: null, ret: 0 };
    const idx = s.bars.findIndex((b) => b.date === asOf);
    if (idx <= 0) return { prevClose: null, close: null, ret: 0 };
    const prevClose = s.bars[idx - 1].close;
    const close = s.bars[idx].close;
    return { prevClose, close, ret: (close - prevClose) / prevClose };
  };

  return { asOf, series, priorBars, sessionMove };
}

function evaluateAgent(agent, snap) {
  const decision = agent(snap);
  // Weighted realized return across picks; empty picks = cash = 0% move.
  let weighted = 0;
  let totalW = 0;
  const legs = [];
  for (const p of decision.picks) {
    const mv = snap.sessionMove(p.symbol);
    weighted += p.weight * mv.ret;
    totalW += p.weight;
    legs.push({ symbol: p.symbol, weight: p.weight, ret: mv.ret, prevClose: mv.prevClose, close: mv.close });
  }
  const ret = totalW > 0 ? weighted : 0; // weights sum to 1 by construction; cash => 0
  const endValue = STAKE * (1 + ret);
  const pickLabel = decision.picks.length
    ? decision.picks.map((p) => (decision.picks.length > 1 ? p.symbol : p.symbol)).join('+')
    : 'CASH';
  return {
    name: decision.name,
    prediction: decision.prediction,
    notes: decision.notes,
    pick: pickLabel,
    legs,
    ret,
    endValue,
  };
}

function fmtMoney(x) {
  return `$${x.toFixed(2)}`;
}

function fmtPct(x) {
  const s = (x * 100).toFixed(2);
  return `${x >= 0 ? '+' : ''}${s}%`;
}

async function main() {
  const offline = process.argv.includes('--offline');
  const basket = await loadBasket({ preferLive: !offline });
  const snap = buildSnapshot(basket);

  if (!snap.asOf) {
    throw new Error('Could not determine a common latest session across the basket.');
  }

  // Prior session date (what "yesterday" was) for context.
  const spy = basket.series[0];
  const idx = spy.bars.findIndex((b) => b.date === snap.asOf);
  const priorDate = idx > 0 ? spy.bars[idx - 1].date : '(n/a)';

  const results = AGENTS.map((a) => evaluateAgent(a, snap)).sort((x, y) => y.endValue - x.endValue);

  const isSample = basket.dataSource === 'SAMPLE' || basket.dataSource === 'MIXED';
  const banner = isSample
    ? '!!! SAMPLE / SYNTHETIC DATA — these are NOT real market prices !!!'
    : `DATA SOURCE: ${basket.dataSource} (Yahoo Finance chart API) — real historical market data`;

  // ---- Console output ----
  console.log('');
  console.log('============================================================');
  console.log(' FAMtastic Finance Agents — PAPER-TRADING SIMULATION');
  console.log(' (historical single-session backtest; NO live brokerage)');
  console.log('============================================================');
  console.log(banner);
  console.log(`Data source label : ${basket.dataSource}`);
  console.log(`Latest session    : ${snap.asOf}  (prior session: ${priorDate})`);
  console.log(`Basket            : ${basket.series.map((s) => s.display).join(', ')}`);
  console.log(`Per-series source : ${basket.series.map((s) => `${s.display}=${s.source.split(':')[0]}`).join(' ')}`);
  console.log(`Stake per agent   : ${fmtMoney(STAKE)}`);
  console.log('------------------------------------------------------------');
  console.log(' Session moves (prevClose -> close):');
  for (const s of basket.series) {
    const mv = snap.sessionMove(s.display);
    console.log(`   ${s.display.padEnd(8)} ${mv.prevClose?.toFixed(2)} -> ${mv.close?.toFixed(2)}  (${fmtPct(mv.ret)})`);
  }
  console.log('------------------------------------------------------------');
  console.log(' LEADERBOARD (best -> worst):');
  console.log('');
  results.forEach((r, i) => {
    const rank = `${i + 1}.`.padEnd(3);
    console.log(`${rank}${r.name}`);
    console.log(`    pick: ${r.pick.padEnd(14)} ${fmtMoney(STAKE)} -> ${fmtMoney(r.endValue)}  (${fmtPct(r.ret)})`);
    console.log(`    "${r.prediction}"`);
  });
  console.log('------------------------------------------------------------');
  const winner = results[0];
  console.log(` WINNER TODAY: ${winner.name} — ${fmtMoney(STAKE)} -> ${fmtMoney(winner.endValue)} (${fmtPct(winner.ret)})`);
  console.log('============================================================');
  console.log('Reminder: one session is noise. Run daily to measure agents over time.');
  console.log('');

  // ---- Write artifacts ----
  if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const jsonPath = path.join(RESULTS_DIR, `${snap.asOf}-leaderboard.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    simulation: true,
    liveBrokerage: false,
    dataSource: basket.dataSource,
    isSampleData: isSample,
    session: snap.asOf,
    priorSession: priorDate,
    stake: STAKE,
    basket: basket.series.map((s) => ({ display: s.display, source: s.source, kind: s.kind })),
    sessionMoves: basket.series.map((s) => {
      const mv = snap.sessionMove(s.display);
      return { symbol: s.display, prevClose: mv.prevClose, close: mv.close, ret: mv.ret };
    }),
    leaderboard: results.map((r, i) => ({
      rank: i + 1,
      agent: r.name,
      prediction: r.prediction,
      pick: r.pick,
      legs: r.legs,
      returnPct: r.ret,
      startValue: STAKE,
      endValue: Number(r.endValue.toFixed(4)),
    })),
    winner: { agent: winner.name, endValue: Number(winner.endValue.toFixed(4)), returnPct: winner.ret },
  };
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  const mdPath = path.join(RESULTS_DIR, `${snap.asOf}-report.md`);
  const md = renderReport(payload);
  fs.writeFileSync(mdPath, md);

  console.log(`Wrote ${path.relative(process.cwd(), jsonPath)}`);
  console.log(`Wrote ${path.relative(process.cwd(), mdPath)}`);
}

function renderReport(p) {
  const lines = [];
  lines.push(`# Finance Agents — Paper-Trading Leaderboard (${p.session})`);
  lines.push('');
  lines.push('> **PAPER / SIMULATION.** Historical single-session backtest. No live brokerage,');
  lines.push('> no real orders. A single session is **noise, not skill**.');
  lines.push('');
  if (p.isSampleData) {
    lines.push('> ⚠️ **SAMPLE / SYNTHETIC DATA** — these are NOT real market prices. The live');
    lines.push('> Yahoo fetch was unavailable (network blocked / no cache), so bundled synthetic');
    lines.push('> fixtures were used. Numbers below are illustrative of the harness only.');
    lines.push('');
  }
  lines.push(`- **Data source:** ${p.dataSource} (Yahoo Finance chart API when live)`);
  lines.push(`- **Session traded:** ${p.session} (prior session: ${p.priorSession})`);
  lines.push(`- **Stake per agent:** $${p.stake.toFixed(2)}`);
  lines.push(`- **Generated:** ${p.generatedAt}`);
  lines.push('');
  lines.push('## Session moves');
  lines.push('');
  lines.push('| Symbol | Prev close | Close | Move |');
  lines.push('|---|---:|---:|---:|');
  for (const m of p.sessionMoves) {
    lines.push(`| ${m.symbol} | ${m.prevClose?.toFixed(2)} | ${m.close?.toFixed(2)} | ${fmtPct(m.ret)} |`);
  }
  lines.push('');
  lines.push('## Leaderboard');
  lines.push('');
  lines.push('| # | Agent | Pick | $10 → | Return |');
  lines.push('|---|---|---|---:|---:|');
  for (const r of p.leaderboard) {
    lines.push(`| ${r.rank} | ${r.agent} | ${r.pick} | $${r.endValue.toFixed(2)} | ${fmtPct(r.returnPct)} |`);
  }
  lines.push('');
  lines.push(`**Winner today:** ${p.winner.agent} — $10.00 → $${p.winner.endValue.toFixed(2)} (${fmtPct(p.winner.returnPct)})`);
  lines.push('');
  lines.push('## Predictions / rationale');
  lines.push('');
  for (const r of p.leaderboard) {
    lines.push(`- **${r.agent}** (${r.pick}): ${r.prediction}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('_This is a measurement harness. Re-run daily to build a track record; one day proves nothing._');
  lines.push('');
  return lines.join('\n');
}

main().catch((err) => {
  console.error('finance-agents run failed:', err);
  process.exit(1);
});
