---
schema_version: 0.2.0
canonical_id: decision/use-printf-not-echo-for-claude-prompts
type: decision
title: "Use printf not echo for Claude prompts"
facets: ["shell","prompting"]
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

# Use printf not echo for Claude prompts

`printf '%s'` preserves backslash sequences; `echo` does not. All shell call sites that send prompt text to Claude must use printf.

## Source

Migrated from `.brain/patterns.md` (cowork branch).
