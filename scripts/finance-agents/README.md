# finance-agents — paper-trading simulation

A self-contained, zero-dependency (Node.js built-ins only) harness that runs
several distinct trading "agents" over recent daily market data and reports, for
each one: **if it started today with $10, how much would it have at the close?**

> **This is PAPER / SIMULATION on historical daily session data.** It is **not**
> connected to any brokerage and executes **no real orders**. A single session's
> result is **noise, not skill** — this is a measurement harness meant to be run
> repeatedly so agents build a track record over time.

## Run it

```bash
node scripts/finance-agents/run.js            # try live data, fall back to cache/sample
node scripts/finance-agents/run.js --offline  # skip the network, use cache/sample only
```

It prints a leaderboard and writes:

- `results/<date>-leaderboard.json` — machine-readable results
- `results/<date>-report.md` — human-readable report

## The agents (`agents.js`)

All agents decide using only data **up to the prior session** (no lookahead),
then the latest session's *actual* move is applied to whatever they picked.

1. **Momentum** — buy yesterday's strongest mover (strength persists).
2. **Mean-Reversion** — buy yesterday's biggest loser (oversold bounce).
3. **Trend-Follow (SMA10/20)** — long the strongest confirmed uptrend
   (price > SMA10 > SMA20); else cash.
4. **Buy-&-Hold SPY (baseline)** — always 100% SPY.
5. **Equal-Weight Basket** — $10 split evenly across all names.
6. **Volatility-Breakout** — long the name that closed above its 20-day high
   by the widest margin; else cash.

## Data source + provenance (`data.js`)

- **Primary (keyless):** [Yahoo Finance chart API](https://query1.finance.yahoo.com/v8/finance/chart/) —
  `https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?period1=<unix>&period2=<unix>&interval=1d`.
  No API key required. Returns JSON with timestamp + OHLCV arrays. ~95-day lookback window.
- **Basket:** SPY, QQQ, AAPL, NVDA, TSLA, BTC-USD.
- **Cache:** successful fetches are written to `.cache/<SYMBOL>.json`.
- **Offline fallback:** if the network is blocked and there's no cache, the
  harness loads bundled fixtures in `sample-data/`. **These are clearly-labeled
  SYNTHETIC SAMPLE prices — not real market data.** The run prints the data
  source loudly and the report flags sample data with a warning banner. Every
  series records its own `source` (`LIVE` / `CACHE` / `SAMPLE`).
- **History:** an earlier version used Stooq daily CSV. Stooq added a JavaScript
  proof-of-work browser-verification wall (Jun 2026) and is no longer reachable
  from non-browser clients. Removed; Yahoo chart is the new primary.

The run always prints the **data source** and the **exact date of the latest
session** used.

## Honest caveats

- **One session is noise.** Picking "today's winner" tells you almost nothing
  about a strategy's edge. The value is in running this daily and aggregating.
- **No costs modeled.** No spreads, slippage, fees, or fractional-share limits.
- **No risk management.** Position sizing is naïve (all-in on one pick, or
  equal weight). This is a strategy comparison, not a portfolio system.
- **Daily close-to-close only.** Intraday paths are ignored.
- **Sample data is fake.** When you see the SAMPLE banner, the numbers exist
  only to prove the harness runs.

## Going live later (manual_required)

To turn this into real paper trading you would swap `data.js` for a broker/data
API and add an execution layer:

- **Alpaca paper trading** (`https://paper-api.alpaca.markets`) — free paper
  accounts, REST + websockets, real fills against live quotes. Requires API
  keys (manual setup) and a positions/orders ledger.
- Add slippage/fee modeling, fractional-share handling, and a persistent
  portfolio state so agents compound across sessions instead of restarting at
  $10 each day.

This wiring is **manual_required** — it needs credentials and a deliberate
decision to connect to a live (paper) brokerage.

## Related open-source worth knowing (not adopted here)

- [virattt/ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) — multi-agent
  LLM hedge-fund simulator (Buffett/Munger-style agents).
- [TauricResearch/TradingAgents](https://github.com/tauricresearch/tradingagents)
  — multi-agent LLM trading framework.
- [microsoft/qlib](https://github.com/microsoft/qlib) — AI-oriented quant
  research platform.
- [freqtrade](https://github.com/freqtrade/freqtrade) — open-source crypto
  trading bot with backtesting.
- [backtrader](https://github.com/mementum/backtrader) — Python backtesting
  framework.
