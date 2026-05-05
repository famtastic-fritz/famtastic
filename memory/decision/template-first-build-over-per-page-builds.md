---
schema_version: 0.2.0
canonical_id: decision/template-first-build-over-per-page-builds
type: decision
title: "Template-first build over per-page builds"
facets: ["build","architecture"]
confidence: 0.9
lifecycle: candidate
created_at: 2026-05-05T18:51:10.154Z
promoted_at: null
promoted_by: null
source_capture: brain-migration-2026-05-05
references: ["cowork-branch:claude/check-running-agents-tuSFO",".brain/patterns.md"]
seen_count: 0
last_surfaced_at: null
auto_promoted: false
---

# Template-first build over per-page builds

Build the template (header/nav/footer/shared CSS) first, then spawn pages in parallel with template context injected. Eliminates nav drift and is faster than per-page builds. Validated on the-best-lawn-care.

## Source

Migrated from `.brain/patterns.md` (cowork branch).
