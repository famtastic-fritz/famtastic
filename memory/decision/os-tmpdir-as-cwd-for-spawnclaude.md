---
schema_version: 0.2.0
canonical_id: decision/os-tmpdir-as-cwd-for-spawnclaude
type: decision
title: "os.tmpdir() as cwd for spawnClaude"
facets: ["spawnclaude","build"]
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

# os.tmpdir() as cwd for spawnClaude

Always run `spawnClaude` with cwd set to `os.tmpdir()` to avoid the project CLAUDE.md being read during a `--tools ""` invocation.

## Source

Migrated from `.brain/patterns.md` (cowork branch).
