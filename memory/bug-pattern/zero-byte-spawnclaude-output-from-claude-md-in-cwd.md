---
schema_version: 0.2.0
canonical_id: bug-pattern/zero-byte-spawnclaude-output-from-claude-md-in-cwd
type: bug-pattern
title: "Zero-byte spawnClaude output from CLAUDE.md in cwd"
facets: ["spawnclaude","build"]
confidence: 0.95
lifecycle: candidate
created_at: 2026-05-05T18:51:10.154Z
promoted_at: null
promoted_by: null
source_capture: brain-migration-2026-05-05
references: ["cowork-branch:claude/check-running-agents-tuSFO",".brain/bugs.md"]
seen_count: 0
last_surfaced_at: null
auto_promoted: false
---

# Zero-byte spawnClaude output from CLAUDE.md in cwd

**Symptom:** spawnClaude returns 0-byte output.

**Root cause:** CLAUDE.md in cwd triggers OpenWolf instructions that `--tools ""` cannot execute.

**Fix:** Set cwd to `os.tmpdir()`. (2026-03-26)

## Source

Migrated from `.brain/bugs.md` (cowork branch).
