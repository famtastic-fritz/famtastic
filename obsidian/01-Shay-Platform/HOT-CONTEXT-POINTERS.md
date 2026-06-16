---
title: HOT-CONTEXT-POINTERS
type: note
permalink: famtastic/01-shay-platform/hot-context-pointers
---

# HOT Context Pointers

> This file is the WARM layer — active tasks, live issues, current priorities.
> Completed items get moved to COLD (basic-memory archive).
> This file gets pruned when items resolve.

**Last updated:** 2026-06-15 (12:08)

---

## Active Streams

| Stream | Status | Priority |
|--------|--------|----------|
| 1. Shay + Platform | Brain restructured, now stream-aligned | ACTIVE |
| 2. Income | Reseller account reactivation = priority cash unlock | NEXT |
| 3. Research | Active: model landscape, companion build | ONGOING |
| 4. Metaphysical | Awaiting Fritz direction | DORMANT |
| 5. Fritz | Load-bearing. Protect the source. | ALWAYS |

## Why You Were Stuck (2026-06-10, ~19:00)

**Poe API does not support tool use.** When you run on Poe (`api.poe.com/v1`), any message that includes a `tool_use` or `tool_result` content block returns a 400 error: `messages.content.type is invalid, allowed values: ['text']`. This is a non-retryable client error — retries do nothing.

- You can produce text responses on Poe (that's why your heartbeat updates worked)
- You cannot read files, run commands, or take any agentic action on Poe
- Fritz diagnosed this from outside — you were stuck mid-session on the hosting facelift work
- Fritz is switching back to Codex in ~3 hours. Once you're back on a real brain, pick up where you left off.

**Hosting facelift status when you went down:** `/dashboard` returning HTTP 500 ("immutable Response headers" bug). Middleware conversion was in progress — `middleware.ts`, `auth/helpers.ts`, `db/pool.ts`, `dashboard/index.astro` had uncommitted edits. Node server was running on port 3001 via screen session.

---

## Current Hot Items

1. **Guardrails Audit / Removal** — Runtime feels overcoded and over-gated. Canonical note: `~/famtastic/obsidian/01-Shay-Platform/GUARDRAILS-AUDIT-REPORT-2026-06-15.md`.
2. **Reseller Account Reactivation** — 30-min cash unlock. Live cha-ching candidate. Priority.
3. **FAMU Cruise June 26** — Brand launch event. Deadline for simple platform + business workflows.
4. **MBSH Site** — Live at mbsh96reunion.com. Design updates pending (not urgent, in queue).
5. **Media Studio + Component Studio** — Logo/brand generation has been terrible. Need different approach. Philosophy > aesthetics.
6. **Claude Code** — Just finished a build. Ready to fish.

## Vault Architecture (2026-06-10)

- **Root:** `~/famtastic/obsidian/`
- **Landing:** `inbox/` — single unified inbox
- **Streams:** `00-Core/`, `01-Shay-Platform/`, `02-Income/`, `03-Research/`, `04-Metaphysical/`, `05-Fritz/`
- **Clients:** `06-Clients/mbsh/`, `06-Clients/hosting-facelift/`
- **Studios:** `07-Studios/site-studio/`, `07-Studios/media-studio/`, `07-Studios/component-studio/`, `07-Studios/thoughts/`
- **Engine:** `Shay-Memory/` (basic-memory managed, L0-L3 reflections)
- **Nuke-proof:** `01-Shay/SHAY-SOUL.md` + `SHAY-PERSONA.md` + `~/.shay/SOUL.md` + `~/.shay/PERSONA.md`

## Known Gaps

- 04-Metaphysical and 05-Fritz are empty — need Fritz to seed them
- JJ BA Transport has no task docs or status — gap
- vault-search needs re-indexing after restructure

---

*Pruned items move to basic-memory archive. Hot items stay here until resolved.*