---
schema_version: 0.2.0
canonical_id: anti-pattern/never-use-echo-for-claude-prompts-use-printf
type: anti-pattern
title: "Never use echo for Claude prompts — use printf"
facets: ["shell","prompting"]
confidence: 0.92
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

# Never use echo for Claude prompts — use printf

`echo` corrupts backslash sequences in Claude prompts. Always use `printf '%s'` instead so the prompt arrives byte-for-byte intact.

## Source

Migrated from `.brain/anti-patterns.md` (cowork branch).
