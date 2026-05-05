---
schema_version: 0.2.0
canonical_id: anti-pattern/never-increment-innercompleted-in-both-timeout-and-close-handlers
type: anti-pattern
title: "Never increment innerCompleted in both timeout and close handlers"
facets: ["concurrency","spawnclaude"]
confidence: 0.85
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

# Never increment innerCompleted in both timeout and close handlers

`kill()` triggers the close event, which already handles completion. Incrementing `innerCompleted` in the timeout handler too causes double-counting.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
