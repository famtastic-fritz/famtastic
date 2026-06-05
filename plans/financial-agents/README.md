# Financial Agents — Market Watch & $10 Leaderboard ⭐ (Fritz priority)

Several strategy agents watch the markets, each makes a prediction, and we score
them the way Fritz asked: **start each agent with $10, how much did it make this
session?**

## Reality check (read this)

- **Net-new.** A grep of the FAMtastic brain found *no* prior financial/trading
  code — every "trading/stock/crypto" hit was about stock photos or the job
  queue. So nothing was "already built"; this is built from scratch.
- **Paper, not live.** It simulates on real recent market data. It does NOT place
  real trades. Going live needs a broker account + API keys (Alpaca paper API is
  the recommended first step) — that's a Fritz decision, intentionally gated.
- **One day is noise.** A single session's result tells you the pipeline works,
  not that an agent has edge. The point is to run it daily and watch over time.

## Run it

```bash
node scripts/finance-agents/run.js
```

Writes a dated leaderboard to `scripts/finance-agents/results/` (JSON + a readable
report) showing each agent's prediction, its pick, and `$10 → $X.XX`.

## The agents (strategies)

Momentum, mean-reversion, trend-follow (SMA crossover), buy-and-hold SPY
(baseline), equal-weight basket, and a volatility-breakout — each a distinct,
inspectable rule over recent price history.
