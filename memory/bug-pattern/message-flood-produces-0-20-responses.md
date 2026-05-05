---
schema_version: 0.2.0
canonical_id: bug-pattern/message-flood-produces-0-20-responses
type: bug-pattern
title: "Message flood produces 0/20 responses"
facets: ["websocket","concurrency"]
confidence: 0.88
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

# Message flood produces 0/20 responses

**Symptom:** Rapid-fire messages produce zero successful responses out of N attempts.

**Root cause:** No in-flight guard.

**Fix:** Per-connection in-flight flag prevents concurrent classifier calls. (2026-03-31)

## Source

Migrated from `.brain/bugs.md` (cowork branch).
