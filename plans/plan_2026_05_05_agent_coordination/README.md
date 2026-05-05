# Agent Coordination + brain→memory migration

**Status:** active · **Created:** 2026-05-05 · **Owner:** Fritz

## Why this plan exists

On 2026-05-05 the same problem (cross-session memory) was solved twice in
parallel by two agent surfaces:

- **Cowork** built `.brain/` (INDEX, anti-patterns, bugs, patterns, procedures)
- **Claude Code** built `memory/<type>/<id>.md` with the v0.2.0 capture/promote
  pipeline

Neither knew the other was working on it. The duplication only became visible
after both branches existed. This plan ships:

1. A **coordination doc** (`AGENT-COORDINATION.md`) that lists every active
   branch, its owning surface, intent, and scope-locks.
2. A **pre-flight script** (`scripts/agent-checkin.js`) that any agent runs
   before non-trivial work to detect overlap with in-flight branches.
3. A **migration** of cowork's `.brain/` entries into the canonical `memory/`
   store as `lifecycle: candidate` so the human can promote them after review.
4. A **rule** added to `CLAUDE.md` and `AGENTS.md` that requires running the
   check-in script before scaffolding new systems.

## What landed

- `AGENT-COORDINATION.md` — single source of truth for active branches
- `scripts/agent-checkin.js` — pre-flight overlap detector (exits 2 on conflict)
- 30 new `memory/<type>/*.md` entries migrated from `.brain/` (lifecycle: candidate)
- `memory/INDEX.json` extended with the new entries
- `CLAUDE.md` + `AGENTS.md` carry the agent-coordination rule

## What is deferred

- Per-surface branch naming convention (need >1 collision to lock a convention)
- Auto-pruning AGENT-COORDINATION.md rows when branches merge (manual for now)
- Integrating check-in into a pre-commit hook (intentional friction kept human-driven)

## How to use the check-in script

```bash
node scripts/agent-checkin.js --intent "scaffold new dashboard widget"
```

If the script exits **0**, your branch is logged in AGENT-COORDINATION.md and
you can proceed. If it exits **2**, a table of overlapping branches is printed
— read those branches before continuing. See AGENT-COORDINATION.md for the
conflict-resolution protocol.
