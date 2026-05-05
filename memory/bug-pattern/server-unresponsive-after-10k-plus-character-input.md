---
schema_version: 0.2.0
canonical_id: bug-pattern/server-unresponsive-after-10k-plus-character-input
type: bug-pattern
title: "Server unresponsive after 10K-plus character input"
facets: ["classifier","limits"]
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

# Server unresponsive after 10K-plus character input

**Symptom:** Server stops responding after a very large user message.

**Root cause:** No length cap before classifier.

**Fix:** Early return when `msg.content.length > 10000`. (2026-03-31)

## Source

Migrated from `.brain/bugs.md` (cowork branch).
