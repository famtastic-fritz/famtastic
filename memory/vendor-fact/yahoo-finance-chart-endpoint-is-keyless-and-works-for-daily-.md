---
schema_version: 0.2.0
canonical_id: vendor-fact/yahoo-finance-chart-endpoint-is-keyless-and-works-for-daily-
type: vendor-fact
title: "Yahoo Finance chart endpoint is keyless and works for daily OHLCV"
facets: ["finance-data", "keyless-api", "yahoo-finance", "freetier"]
confidence: 0.95
lifecycle: active
created_at: 2026-06-18T02:12:29.744Z
promoted_at: 2026-06-18T02:12:29.745Z
promoted_by: famtasticfritz
source_capture: cap_closeout_financial-agents_2026-06-17_f692
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: true
---

# Yahoo Finance chart endpoint is keyless and works for daily OHLCV

https://query1.finance.yahoo.com/v8/finance/chart/<SYMBOL>?period1=<unix>&period2=<unix>&interval=1d returns JSON with timestamp + indicators.quote[0].{open,high,low,close,volume} arrays. No API key, no auth, no cookie. The download endpoint (v7/finance/download) requires login; the chart endpoint does not. Works for SPY, QQQ, AAPL, NVDA, TSLA, BTC-USD as of 2026-06-17. Rate limits unknown but a single 6-symbol basket fetch is fine. Yahoo may add a crumb-cookie wall later — keep the cache fallback.

## Evidence

- closeout:financial-agents:2026-06-17T22:15:00.000Z
- scripts/finance-agents/data.js
- scripts/finance-agents/agents.js
- scripts/finance-agents/run.js
- scripts/finance-agents/results/2026-06-16-leaderboard.json
- scripts/finance-agents/results/2026-06-16-report.md
- plans/financial-agents/plan.json
- tasks/tasks.jsonl

## Backlinks

- Capture: `captures/inbox/cap_closeout_financial-agents_2026-06-17_f692.json`
