---
schema_version: 0.2.0
canonical_id: bug-pattern/session-summaries-write-to-wrong-site-after-switch
type: bug-pattern
title: "Session summaries write to wrong site after switch"
facets: ["session","tag"]
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

# Session summaries write to wrong site after switch

**Symptom:** Session summaries land under the previous site after a site switch.

**Root cause:** `endSession()` not awaited before TAG change.

**Fix:** `await endSession()` in switch-site and new-site flows. (2026-03-30)

## Source

Migrated from `.brain/bugs.md` (cowork branch).
