---
schema_version: 0.2.0
canonical_id: decision/slot-based-image-identity-using-data-slot-id
type: decision
title: "Slot-based image identity using data-slot-id"
facets: ["slots","images"]
confidence: 0.95
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

# Slot-based image identity using data-slot-id

Image identity persists across regenerations only when carried by `data-slot-id`/`data-slot-status`/`data-slot-role` attributes. Position-based or filename-based identity does not survive HTML regeneration.

## Source

Migrated from `.brain/patterns.md` (cowork branch).
