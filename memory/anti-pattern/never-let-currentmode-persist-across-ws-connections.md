---
schema_version: 0.2.0
canonical_id: anti-pattern/never-let-currentmode-persist-across-ws-connections
type: anti-pattern
title: "Never let currentMode persist across WS connections"
facets: ["websocket","classifier"]
confidence: 0.9
lifecycle: candidate
created_at: 2026-05-05T18:51:10.154Z
promoted_at: null
promoted_by: null
source_capture: brain-migration-2026-05-05
references: ["cowork-branch:claude/check-running-agents-tuSFO",".brain/anti-patterns.md"]
seen_count: 0
last_surfaced_at: null
auto_promoted: false
---

# Never let currentMode persist across WS connections

`currentMode` must reset to `build` on every new WebSocket connection. Persisting it across reconnects routes intents to the wrong handler.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
