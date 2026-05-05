---
schema_version: 0.2.0
canonical_id: anti-pattern/never-add-new-app-logic-as-inline-script-in-index-html
type: anti-pattern
title: "Never add new app logic as inline script in index.html"
facets: ["studio-ui","js"]
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

# Never add new app logic as inline script in index.html

New app-logic JavaScript belongs in `site-studio/public/js/`. Do not add inline `<script>` blocks to `index.html`.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
