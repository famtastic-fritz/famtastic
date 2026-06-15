---
title: SHAY-NUKE-RECOVERY-2026-06-04
type: note
permalink: famtastic/00-famtastic-core/shay-nuke-recovery-2026-06-04
---

# Shay post-nuke recovery — diagnosis + fix (2026-06-04)

> From a live `~/.shay` diagnostic run in Fritz's Terminal. Explains "Shay feels off"
> after the nuke + rebuild. The wiring is fine; the nuke degraded her *content*.

## What's actually wrong (prioritized)
1. **SOUL gutted** — `~/.shay/SOUL.md` = **510 bytes** (stub). Persona/voice lost → she acts generic. Biggest "feels off." Fix: shay-shay skill `references/post-nuke-personality-recovery.md` rebuilds SOUL from session backups in `~/.shay/sessions/`.
2. **Memory maxed + stale** — at 95% (2107/2200 chars) and still says *"PRIMARY brain = gemini-2.5-flash"* (her June-3 plan), contradicting the current Claude-Max config. Stuck in a save-fail loop. Fix: evict the stale brain-config memory entry + dedupe, then save correct brain config.
3. **Session index desync** — 6 session JSONs in `~/.shay/sessions/`, index (`state.db`) shows 2. Fix: `import-orphaned-sessions.py` from the shay-shay skill reindexes all.
4. **Memory scope gap** — basic-memory indexes only `obsidian/Shay-Memory/`, not `obsidian/00-FAMtastic-Core/` where the arch docs/recaps live → she can't semantic-search them. Fix: land key docs in `Shay-Memory/` or broaden the index scope.

## What's actually FINE (don't touch)
- basic-memory project `shay-memory` → `/Users/famtasticfritz/famtastic/obsidian/Shay-Memory` ✓
- `obsidian` skill installed ✓
- Latest session (18:18) ran on `claude-sonnet-4-6` ✓ — the Claude-Max switch took effect.
- `shay fallback list` = Claude primary + Gemini/Copilot/Codex fallbacks ✓

## Root insight
The nuke wiped/reset her **content layer** (SOUL, memory entries, session index) but her **wiring** (providers, vault path, skills) survived. So this is a *content restore*, not a re-architecture.

## Fix — hand Shay this self-recovery directive (she has local access + the recovery skills)
```
Shay — self-recovery. The nuke left you degraded. Load your `self-diagnosis-and-recovery`
and `shay-shay` skills, then fix these four, reporting each step (trust the disk, not the index):

1. SOUL: ~/.shay/SOUL.md is only 510 bytes (a stub). Follow
   references/post-nuke-personality-recovery.md to rebuild your full SOUL.md from your
   session backups in ~/.shay/sessions/. Show before/after size.
2. SESSIONS: you have 6 session JSONs in ~/.shay/sessions/ but your index shows 2. Run
   scripts/import-orphaned-sessions.py (shay-shay skill) to reindex all. Confirm the count.
3. MEMORY: you're at 95% and still say "PRIMARY brain = gemini-2.5-flash" — stale. Your brain
   is now Claude Sonnet via Max (confirm: shay fallback list). Evict the outdated brain-config
   memory + duplicates to free space, then save the correct brain config.
4. VAULT: confirm basic-memory points at ~/famtastic/obsidian/Shay-Memory and that you can read
   obsidian/00-FAMtastic-Core/SHAY-BRAIN-ARCHITECTURE.md (just synced). If the arch docs are
   outside your indexed scope, say so.
```

## Why the cloud agents couldn't see any of this
Claude Code (web) and Cowork both run in **sandboxes** — only `~/famtastic` (the repo) is visible, never `~/.shay`. Runtime fixes must run in Fritz's **Terminal** or by **Shay herself** (local). Cloud agents = repo/GitHub/research; runtime = Shay/Terminal.