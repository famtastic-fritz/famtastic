---
title: session-lessons-2026-05-31b
type: note
permalink: shay-memory/learnings/session-lessons-2026-05-31b
---

# Session lessons (2026-05-31 build/orchestration arc)
1. Two-level nav IA (icon rail + per-domain secondary nav); typed manifest = single source of truth.
2. Kanban worker lane = a profile; one profile = no parallelism → create specialist lanes.
3. Local-brain whole-file rewrite truncates >250-line files; npm build is the backstop gate.
4. Desktop must DO what CLI does → reusable DetailDrawer/CliVerbPanel template.
5. Verify the packaged real window, not dev build/vision text; kill zombie instances.
6. Free tiers are capped (OpenRouter :free 200/day shared); spread lanes across providers.
## STANDING DECISION (Fritz, 2026-06-01): approvals.mode = auto, permanently
Manual command-approval is redundant friction. Safety comes from the LAYERED DEFENSE:
adversarial review (plans) + gate check (typecheck/build/pytest) + Watcher W (evidence-based
completion + false-done override). Per-command manual approval adds nothing those cover and
stalls autonomous work. KEEP approvals.mode=auto. Do NOT revert to manual. The ONLY approval
floor that remains is the catastrophic-command allowlist (sudo / delete-root / kill-process /
recursive-delete) — a last-resort guard, not "manual mode". This was the root cause of the
overnight protocol-violations/blocks (workers stalling on manual approval of gate commands).

## CROSS-SURFACE MEMORY SILO (found via Fritz's cross-session test, 2026-06-01)
Cross-SESSION memory works within a surface, but cross-SURFACE does NOT. Disjoint stores:
Shay gateway = ~/.shay/memories/ ; Claude Code = ~/.claude/projects/<proj>/memory/ ; vault =
obsidian/Shay-Memory/. A fact seeded in one is invisible to the others (proved: hermes-stale
fact seeded into Shay's MEMORY.md was unseen by a Claude Code chat reading its own store).
Dual-writing by hand = symptom, not fix. REAL FIX: a memory-sync layer — one canonical source
(the vault) mirrored into every surface's store (like the lessons-sync job, but for user-profile
memory + facts). Write-once-visible-everywhere. This is the DATA complement to AGENT-CONTEXT
(which unifies orientation, not memory data). NEXT-PHASE item.
