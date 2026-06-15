---
title: SHAY-COMPANION-V2-PUNCHLIST
type: note
permalink: famtastic/01-shay/shay-companion-v2-punchlist
---

# Shay Companion — v2 Punch-List (Fritz feedback, 2026-06-05)

> MVP is live on Fritz's Android over Tailscale and he's "happy for the most part." These are the
> fixes for the next companion build pass. Source: Fritz hands-on + Shay's documented MVP gaps.

## Fritz's hands-on feedback (2026-06-05)
1. **Brief metrics aren't tappable** — "6/15 agents up", "275 asks waiting", etc. display but clicking
   does nothing. → make each Brief stat drill down to a detail view (agent roster, the actual asks list, etc.).
2. **"275 Asks waiting" is inflated** — caused by the known bug: `/api/daily-brief` appends a `daily_brief`
   ask on **every load** (no TTL/dedupe). Collapse to real asks: dedupe + TTL on daily-brief asks; then the
   count is honest and the list is clickable/useful.

## Carried-over MVP gaps (Shay's honest list)
3. **Stale job status** — completed jobs still show "running" with a Cancel button (the overnight run showed
   "running" 4h after it finished). Add TTL/status-reconcile so done → done.
4. **Chat is request/response, not SSE streaming** — breathing-dots cover the wait; upgrade to streaming.
5. **Autonomy modes / notification budget / quiet hours are client-side prefs only** — labelled, not yet
   server-enforced. Wire them to the gateway.

## Priority for v2
Dedupe/TTL (fixes #2 **and** #3 in one pass — both are stale-state/dedupe bugs) → tappable Brief metrics (#1)
→ then streaming (#4) and server-enforced prefs (#5). All small; none are rebuilds.

> Overall verdict from Fritz: "for the most part I'm happy with the app." MVP succeeded; this is polish.