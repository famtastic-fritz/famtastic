---
schema_version: 0.2.0
canonical_id: bug-pattern/nav-width-shifts-across-pages-from-wide-content
type: bug-pattern
title: "Nav width shifts across pages from wide content"
facets: ["css","nav","layout"]
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

# Nav width shifts across pages from wide content

**Symptom:** Nav width shifts page to page.

**Root cause:** Wide content stretches body layout width.

**Fix:** `main { max-width: 90% }`. (2026-03-26)

## Source

Migrated from `.brain/bugs.md` (cowork branch).
