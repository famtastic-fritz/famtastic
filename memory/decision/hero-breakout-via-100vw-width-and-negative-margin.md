---
schema_version: 0.2.0
canonical_id: decision/hero-breakout-via-100vw-width-and-negative-margin
type: decision
title: "Hero breakout via 100vw width and negative margin"
facets: ["css","hero"]
confidence: 0.85
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

# Hero breakout via 100vw width and negative margin

Hero sections use `width: 100vw` with negative horizontal margin to break out of the constrained main column. Requires that `html`/`body` do NOT have `overflow-x: hidden`.

## Source

Migrated from `.brain/patterns.md` (cowork branch).
