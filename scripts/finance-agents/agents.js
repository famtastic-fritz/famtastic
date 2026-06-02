'use strict';

/**
 * agents.js — strategy agents for the paper-trading sim.
 *
 * Each agent is a PURE function of price history. It receives a snapshot
 * shaped like:
 *   {
 *     asOf:    '2026-05-29',                 // the session being traded
 *     series:  [{ display, kind, bars, ... }],
 *     priorBars(display) -> bars strictly BEFORE asOf  (decision info)
 *     sessionMove(display) -> { prevClose, close, ret }  (the realized result)
 *   }
 *
 * No agent may peek at asOf's close when DECIDING — decisions use only data
 * up to the prior session. The realized return of asOf is then applied to
 * whatever the agent picked, turning $10 into $X.
 *
 * Each agent returns:
 *   { name, prediction, picks:[{symbol, weight}], notes }
 * The runner computes the dollar outcome from picks + sessionMove.
 */

function pct(x) {
  return `${(x * 100).toFixed(2)}%`;
}

function sma(bars, n) {
  if (bars.length < n) return null;
  const slice = bars.slice(-n);
  return slice.reduce((a, b) => a + b.close, 0) / n;
}

function lastRet(bars) {
  // return of the most recent completed bar in the slice
  if (bars.length < 2) return 0;
  const a = bars[bars.length - 2].close;
  const b = bars[bars.length - 1].close;
  return (b - a) / a;
}

function stdev(vals) {
  if (vals.length < 2) return 0;
  const m = vals.reduce((a, b) => a + b, 0) / vals.length;
  const v = vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1);
  return Math.sqrt(v);
}

// ---------------------------------------------------------------------------
// AGENT 1 — Momentum: ride yesterday's strongest mover into today.
// ---------------------------------------------------------------------------
function momentumAgent(snap) {
  const ranked = snap.series
    .map((s) => ({ sym: s.display, r: lastRet(snap.priorBars(s.display)) }))
    .sort((a, b) => b.r - a.r);
  const top = ranked[0];
  return {
    name: 'Momentum',
    prediction: `Strength persists: ${top.sym} led yesterday (${pct(top.r)}), so it keeps running today.`,
    picks: [{ symbol: top.sym, weight: 1 }],
    notes: `Bought prior session's top performer ${top.sym}.`,
  };
}

// ---------------------------------------------------------------------------
// AGENT 2 — Mean-reversion: buy yesterday's biggest loser (snap-back bet).
// ---------------------------------------------------------------------------
function meanReversionAgent(snap) {
  const ranked = snap.series
    .map((s) => ({ sym: s.display, r: lastRet(snap.priorBars(s.display)) }))
    .sort((a, b) => a.r - b.r);
  const worst = ranked[0];
  return {
    name: 'Mean-Reversion',
    prediction: `Oversold bounce: ${worst.sym} got hit hardest yesterday (${pct(worst.r)}), so it rebounds today.`,
    picks: [{ symbol: worst.sym, weight: 1 }],
    notes: `Bought prior session's biggest loser ${worst.sym}.`,
  };
}

// ---------------------------------------------------------------------------
// AGENT 3 — Trend-follow: SMA crossover (price above SMA-10 above SMA-20).
//   Goes long the basket member with the strongest confirmed uptrend.
//   If none qualify, sits in cash (no move).
// ---------------------------------------------------------------------------
function trendFollowAgent(snap) {
  const candidates = [];
  for (const s of snap.series) {
    const bars = snap.priorBars(s.display);
    const fast = sma(bars, 10);
    const slow = sma(bars, 20);
    if (fast == null || slow == null) continue;
    const price = bars[bars.length - 1].close;
    if (price > fast && fast > slow) {
      candidates.push({ sym: s.display, edge: (fast - slow) / slow });
    }
  }
  candidates.sort((a, b) => b.edge - a.edge);
  if (!candidates.length) {
    return {
      name: 'Trend-Follow (SMA10/20)',
      prediction: 'No confirmed uptrend (price>SMA10>SMA20) in basket. Staying in cash today.',
      picks: [],
      notes: 'Cash — no qualifying crossover.',
    };
  }
  const pick = candidates[0];
  return {
    name: 'Trend-Follow (SMA10/20)',
    prediction: `${pick.sym} is in a confirmed uptrend (price>SMA10>SMA20). Riding the trend today.`,
    picks: [{ symbol: pick.sym, weight: 1 }],
    notes: `Long ${pick.sym}; ${candidates.length} member(s) qualified.`,
  };
}

// ---------------------------------------------------------------------------
// AGENT 4 — Buy-and-Hold SPY: the baseline. Always 100% SPY.
// ---------------------------------------------------------------------------
function buyHoldSpyAgent(snap) {
  const hasSpy = snap.series.some((s) => s.display === 'SPY');
  const sym = hasSpy ? 'SPY' : snap.series[0].display;
  return {
    name: 'Buy-&-Hold SPY (baseline)',
    prediction: `Stay invested in the broad market (${sym}); time in market beats timing it.`,
    picks: [{ symbol: sym, weight: 1 }],
    notes: `Passive 100% ${sym}.`,
  };
}

// ---------------------------------------------------------------------------
// AGENT 5 — Equal-Weight Basket: spread the $10 evenly across everything.
// ---------------------------------------------------------------------------
function equalWeightAgent(snap) {
  const n = snap.series.length;
  const w = 1 / n;
  return {
    name: 'Equal-Weight Basket',
    prediction: `Diversify: hold all ${n} names equally; no single bet, just the basket's drift.`,
    picks: snap.series.map((s) => ({ symbol: s.display, weight: w })),
    notes: `1/${n} in each of ${snap.series.map((s) => s.display).join(', ')}.`,
  };
}

// ---------------------------------------------------------------------------
// AGENT 6 — Volatility-Breakout: long the member whose prior close broke above
//   its recent (20-bar) high by the widest margin; else cash.
// ---------------------------------------------------------------------------
function volatilityBreakoutAgent(snap) {
  const candidates = [];
  for (const s of snap.series) {
    const bars = snap.priorBars(s.display);
    if (bars.length < 21) continue;
    const window = bars.slice(-21, -1); // 20 bars before the latest prior bar
    const priorHigh = Math.max(...window.map((b) => b.high));
    const lastClose = bars[bars.length - 1].close;
    if (lastClose > priorHigh) {
      candidates.push({ sym: s.display, margin: (lastClose - priorHigh) / priorHigh });
    }
  }
  candidates.sort((a, b) => b.margin - a.margin);
  if (!candidates.length) {
    return {
      name: 'Volatility-Breakout',
      prediction: 'No fresh 20-bar breakout closes in the basket. Staying in cash today.',
      picks: [],
      notes: 'Cash — no breakout.',
    };
  }
  const pick = candidates[0];
  return {
    name: 'Volatility-Breakout',
    prediction: `${pick.sym} closed above its 20-day high (+${pct(pick.margin)} over the breakout level). Chasing the breakout today.`,
    picks: [{ symbol: pick.sym, weight: 1 }],
    notes: `Long breakout ${pick.sym}.`,
  };
}

const AGENTS = [
  momentumAgent,
  meanReversionAgent,
  trendFollowAgent,
  buyHoldSpyAgent,
  equalWeightAgent,
  volatilityBreakoutAgent,
];

module.exports = { AGENTS, helpers: { sma, lastRet, stdev, pct } };
