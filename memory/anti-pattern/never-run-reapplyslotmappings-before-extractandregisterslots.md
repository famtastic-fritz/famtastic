---
schema_version: 0.2.0
canonical_id: anti-pattern/never-run-reapplyslotmappings-before-extractandregisterslots
type: anti-pattern
title: "Never run reapplySlotMappings before extractAndRegisterSlots"
facets: ["slots","build"]
confidence: 0.9
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

# Never run reapplySlotMappings before extractAndRegisterSlots

Slot mappings can only be applied after slots have been extracted and registered. Calling `reapplySlotMappings` first means the targets do not yet exist.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
