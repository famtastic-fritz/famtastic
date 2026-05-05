---
schema_version: 0.2.0
canonical_id: anti-pattern/never-add-a-css-or-js-file-without-linking-it-in-index-html
type: anti-pattern
title: "Never add a css or js file without linking it in index.html"
facets: ["studio-ui"]
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

# Never add a css or js file without linking it in index.html

When adding a new file under `site-studio/public/css/` or `js/`, immediately add the corresponding `<link>` or `<script>` tag in `index.html`. Unlinked files are invisible to the browser and cause confusing debugging sessions.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
