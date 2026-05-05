---
schema_version: 0.2.0
canonical_id: bug-pattern/currentmode-persists-across-ws-reconnects
type: bug-pattern
title: "currentMode persists across WS reconnects"
facets: ["websocket","classifier"]
confidence: 0.9
lifecycle: candidate
created_at: 2026-05-05T18:51:10.154Z
promoted_at: null
promoted_by: null
source_capture: brain-migration-2026-05-05
references: ["cowork-branch:claude/check-running-agents-tuSFO",".brain/bugs.md"]
seen_count: 0
last_surfaced_at: null
auto_promoted: false
---

# currentMode persists across WS reconnects

**Symptom:** Mode set in a previous WS session leaks into a new connection.

**Root cause:** Not reset on new connection.

**Fix:** `currentMode = 'build'` inside `wss.on('connection')`. (2026-03-31)

## Source

Migrated from `.brain/bugs.md` (cowork branch).
