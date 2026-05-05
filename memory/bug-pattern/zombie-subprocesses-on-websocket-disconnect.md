---
schema_version: 0.2.0
canonical_id: bug-pattern/zombie-subprocesses-on-websocket-disconnect
type: bug-pattern
title: "Zombie subprocesses on WebSocket disconnect"
facets: ["spawnclaude","websocket"]
confidence: 0.92
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

# Zombie subprocesses on WebSocket disconnect

**Symptom:** Claude subprocesses linger after the WS client disconnects.

**Root cause:** Child reference not accessible to `ws.on('close')`.

**Fix:** Store child as `ws.currentChild`, kill on close. (2026-03-31)

## Source

Migrated from `.brain/bugs.md` (cowork branch).
