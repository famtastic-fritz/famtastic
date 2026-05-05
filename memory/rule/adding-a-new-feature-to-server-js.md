---
schema_version: 0.2.0
canonical_id: rule/adding-a-new-feature-to-server-js
type: rule
title: "Adding a new feature to server.js"
facets: ["process","procedure"]
confidence: 0.85
lifecycle: candidate
created_at: 2026-05-05T18:51:10.154Z
promoted_at: null
promoted_by: null
source_capture: brain-migration-2026-05-05
references: ["cowork-branch:claude/check-running-agents-tuSFO",".brain/procedures.md"]
seen_count: 0
last_surfaced_at: null
auto_promoted: false
---

# Adding a new feature to server.js

1. Check `.wolf/buglog.json` for related past bugs before starting
2. Check `.wolf/cerebrum.md` Do-Not-Repeat section
3. Implement with error handling and null safety (follow existing patterns)
4. Export any pure functions for unit testing
5. Add unit tests before committing
6. Update `SITE-LEARNINGS.md` and `CHANGELOG.md`
7. Regenerate `FAMTASTIC-STATE.md` if architecture changed

## Source

Migrated from `.brain/procedures.md` (cowork branch).
