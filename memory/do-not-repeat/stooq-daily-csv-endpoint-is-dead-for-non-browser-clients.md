---
schema_version: 0.2.0
canonical_id: do-not-repeat/stooq-daily-csv-endpoint-is-dead-for-non-browser-clients
type: do-not-repeat
title: "Stooq daily CSV endpoint is dead for non-browser clients"
facets: ["stooq", "browser-wall", "proof-of-work", "finance-data", "blocker"]
confidence: 0.97
lifecycle: active
created_at: 2026-06-18T02:12:29.761Z
promoted_at: 2026-06-18T02:12:29.761Z
promoted_by: famtasticfritz
source_capture: cap_closeout_financial-agents_2026-06-17_f692
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: true
---

# Stooq daily CSV endpoint is dead for non-browser clients

As of mid-2026, stooq.com/q/d/l/?s=<sym>&i=d returns an HTML page with a JavaScript proof-of-work challenge (SHA-256 leading-zero-nonce) instead of CSV. Plain Node fetch / curl cannot pass the wall — it requires executing JS in a browser to obtain a session cookie. Same wall on stooq.pl. Do not rely on Stooq for any non-browser data ingestion. Use Yahoo Finance chart endpoint or another keyless source instead.

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
