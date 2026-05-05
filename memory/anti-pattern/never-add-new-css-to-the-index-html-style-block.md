---
schema_version: 0.2.0
canonical_id: anti-pattern/never-add-new-css-to-the-index-html-style-block
type: anti-pattern
title: "Never add new CSS to the index.html style block"
facets: ["studio-ui","css"]
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

# Never add new CSS to the index.html style block

New CSS must go into the appropriate file under `site-studio/public/css/`. The inline `<style>` block in `index.html` is known tech debt; do not add to it.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
