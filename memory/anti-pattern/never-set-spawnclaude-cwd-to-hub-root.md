---
schema_version: 0.2.0
canonical_id: anti-pattern/never-set-spawnclaude-cwd-to-hub-root
type: anti-pattern
title: "Never set spawnClaude cwd to HUB_ROOT"
facets: ["spawnclaude","build"]
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

# Never set spawnClaude cwd to HUB_ROOT

When `spawnClaude` runs with cwd=HUB_ROOT, the project CLAUDE.md is read and triggers OpenWolf instructions that `--tools ""` cannot execute, producing 0-byte output. Use `os.tmpdir()` as cwd instead.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
