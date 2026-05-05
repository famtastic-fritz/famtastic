---
schema_version: 0.2.0
canonical_id: anti-pattern/never-expose-raw-api-keys-via-get-api-settings
type: anti-pattern
title: "Never expose raw API keys via GET /api/settings"
facets: ["security","settings"]
confidence: 0.95
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

# Never expose raw API keys via GET /api/settings

`GET /api/settings` must funnel through `safeSettings()` which redacts secrets. Returning raw keys leaks credentials to anything that can hit the endpoint.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
