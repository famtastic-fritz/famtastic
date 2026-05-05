---
schema_version: 0.2.0
canonical_id: anti-pattern/no-overflow-x-hidden-on-html-or-body
type: anti-pattern
title: "Never set overflow-x: hidden on html or body"
facets: ["css", "hero", "layout"]
confidence: 0.9
lifecycle: candidate
created_at: 2026-05-05T00:00:00.000Z
promoted_at: null
promoted_by: null
source_capture: brain-migration-2026-05-05
references: ["cowork-branch:claude/check-running-agents-tuSFO", ".brain/anti-patterns.md"]
seen_count: 0
last_surfaced_at: null
auto_promoted: false
---

# Never set overflow-x: hidden on html or body

Setting `overflow-x: hidden` on `html` or `body` clips hero breakout sections that intentionally extend past the page width. Use container-level overflow controls instead.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
