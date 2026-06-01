---
title: Correct Kanban Setup for Efficient Multi-Agent Swarm
date: 2026-05-31
status: research
tags:
- kanban
- shay
- multi-agent
- swarm
- profiles
- worker-lanes
permalink: shay-memory/research/kanban-setup-correct-2026-05-31
---

# Correct Kanban Setup for an Efficient Multi-Agent Swarm

## TL;DR — why every card shows `@default`

A **worker lane is literally a Shay-Shay profile**. The dispatcher routes a
card by matching `task.assignee` against a profile that exists *on disk* under
`~/.shay/profiles/<name>/config.yaml`. We only have one profile (`default`,
`google/gemini-2.5-flash`), so every card is assigned `@default` and there is
exactly one lane. There is **no parallelism across roles** until we create more
profiles. Boards (`default`, `agentos`, `deskbuild`, `research`) already exist,
but boards are isolated *queues*, not lanes — they do not create worker
parallelism by themselves.

To get a real swarm: create one profile per role, assign cards to those profile
names, and run the gateway dispatcher with a concurrency cap. That's the whole
trick.

---

## 1. How it's MEANT to be configured (canonical model)

Sources:
- Doc: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-tutorial
- Doc: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-worker-lanes
- Local: `/Users/famtasticfritz/.shay/hermes-agent/website/docs/user-guide/features/kanban-worker-lanes.md`
- Local: `/Users/famtasticfritz/.shay/hermes-agent/website/docs/user-guide/features/kanban-tutorial.md`

### The hierarchy (worker-lanes.md lines 12–21)
```
Shay-Shay Kanban  =  canonical task lifecycle + audit trail (SQLite is the truth)
Worker lane       =  implementation executor for ONE assigned card
Reviewer          =  human / human-proxy that gates "done"
GitHub PR         =  optional upstreamable artifact for code lanes
```
The board owns lifecycle truth (`ready → running → blocked/done/archived`).
Lanes only execute; everything flows back through the `kanban_*` tools.

### A lane = a profile (worker-lanes.md lines 23–47, 79–85)
A lane must provide three things:
1. **An assignee string** — the dispatcher matches `task.assignee` against a
   Shay-Shay profile name (default lane shape) or a registered non-spawnable
   identifier (plugin lane shape).
2. **A spawn mechanism** — for profile lanes, the dispatcher's `_default_spawn`
   runs `shay -p <assignee> chat -q <prompt>` inside the task's pinned
   workspace, passing context via env vars: `SHAY_KANBAN_TASK`,
   `SHAY_KANBAN_DB`, `SHAY_KANBAN_BOARD`, `SHAY_KANBAN_WORKSPACE`,
   `SHAY_KANBAN_WORKSPACES_ROOT`, `SHAY_KANBAN_RUN_ID`, `SHAY_KANBAN_CLAIM_LOCK`,
   `SHAY_PROFILE`, `SHAY_TENANT`.
3. **A lifecycle terminator** — every run must end in exactly one of
   `kanban_complete(...)`, `kanban_block(...)`, or a process exit (treated as
   crash/gave_up/timed_out).

There is **no fixed roster** — the system assumes nothing about profile names.
The orchestrator discovers them via `shay profile list`
(worker-lanes.md lines 83–85; kanban-orchestrator SKILL "Step 0").

### Spawn-skip guard — confirmed in code
`/Users/famtasticfritz/famtastic/shay-shay/shay_cli/kanban_db.py` lines
3770–3795: a ready task whose assignee is **not a real profile on disk** is NOT
spawned. It is bucketed as `skipped_nonspawnable` and left in `ready` (so an
operator can fix it; never silently executed). `profile_exists()` is the gate.
This is exactly why a typo'd or non-existent assignee just sits forever.

`list_profiles_on_disk()` (kanban_db.py lines 4662–4694) enumerates assignees:
the implicit `default` when `~/.shay/` exists, plus every
`~/.shay/profiles/<name>/config.yaml`. **Right now that returns just
`["default"]`** — confirmed by `shay profile list` (only `◆default`).

### How parallelism actually happens (tutorial.md lines 107–142, "Fleet farming")
You create independent cards assigned to different profiles, then:
```bash
shay gateway start
```
The gateway hosts the **embedded dispatcher** that picks up *all* profiles'
ready tasks on the same `kanban.db`. With N assignee pools and independent
(unlinked) cards, the dispatcher fans them out and the queue drains in
parallel. Dependencies (`--parent`) gate promotion: a child stays in `todo`
until every parent is `done`, then auto-promotes to `ready`.

### Concurrency cap (kanban_db.py lines 3670–3772; kanban.py 147, 468)
`max_spawn` is a **live concurrency cap**, not a per-tick budget — running
workers count against it. So `--max 4` = "at most 4 workers running at once."
- Gateway tick interval: 60s default (`kanban.dispatch_interval_seconds: 60`).
- Nudge a tick immediately from the dashboard "Nudge dispatcher" button, or
  `shay kanban dispatch [--max N]` / `shay kanban daemon --interval S --max N`.

Our current `~/.shay/config.yaml` (lines 448–451):
```yaml
kanban:
  dispatch_in_gateway: true
  dispatch_interval_seconds: 60
  failure_limit: 2
```
There is **no `max_spawn` set**, so concurrency is currently unbounded by
config (limited only by how many distinct ready assignees resolve to real
profiles — currently one).

### Failure handling the dispatcher gives us for free (worker-lanes.md 99–107)
- Stale-claim TTL = 15 min (`DEFAULT_CLAIM_TTL_SECONDS`, kanban_db.py:101); a
  live slow worker gets its claim *extended*, only dead PIDs are reclaimed.
- Circuit breaker: after `failure_limit` consecutive failures (ours = 2) the
  task auto-blocks with `gave_up`.
- Crash detection via `kill(pid,0)`; `task.max_runtime_seconds` hard cap
  (`--max-runtime` on create).
- Stranded-task detection (default 30 min) surfaces in `shay kanban diagnostics`
  — catches typo'd assignees / deleted profiles / down pools.

### Dashboard "Lanes by profile" (tutorial.md lines 27–38)
The dashboard (`shay dashboard` → http://127.0.0.1:9119) defaults to "Lanes by
profile" ON, sub-grouping the In Progress column by assignee. With one profile
it shows one lane — which is exactly what we see. The desktop renders the same
model: `shay-desktop-electron/src/renderer/src/screens/Kanban/Kanban.tsx`
pulls `profileOptions` from `listProfiles()` and a per-card `assignee` field;
with one profile the dropdown only offers `default`.

---

## 2. Why we only see `@default`, and exactly how to fix it

**Root cause:** only the `default` profile exists on disk. A lane IS a profile;
one profile = one lane = no role parallelism. Boards being present
(`default/agentos/deskbuild/research`) does not change this — each board still
only has `default` as a spawnable assignee.

### Create additional worker profiles (= lanes)
`shay profile create` confirmed flags:
```
shay profile create <name> [--clone | --clone-all | --clone-from SOURCE]
                           [--no-alias] [--no-skills]
```
`--clone` copies config.yaml + .env + SOUL.md from the active profile;
`--clone-from` clones from a named source. Profile names must be lowercase
alphanumeric.

Concrete commands to stand up three worker profiles cloned from `default`:
```bash
shay profile create researcher  --clone-from default
shay profile create builder     --clone-from default
shay profile create reviewer    --clone-from default
# verify they now resolve as lanes:
shay profile list                 # should show default + the three new ones
```
After this, `list_profiles_on_disk()` returns four names, the dispatcher will
spawn `shay -p researcher`, `shay -p builder`, etc., and the dashboard/desktop
assignee dropdown offers all four. Tune each profile's model/skills/env with
`shay profile show <name>` and by editing
`~/.shay/profiles/<name>/config.yaml`.

> Note: the worker process for a profile auto-loads the `kanban-worker` skill +
> the `KANBAN_GUIDANCE` system-prompt block — no extra wiring needed
> (worker-lanes.md line 83).

### Assign cards to those profiles
```bash
shay kanban --board research create "Survey AI-OS prior art" \
    --assignee researcher --priority 2 \
    --body "..." 
```
(`shay kanban create` flags: `--assignee --parent --workspace --tenant
--priority --triage --max-runtime --body`.)

### Run the swarm
```bash
shay gateway start          # embedded dispatcher, picks up all profiles
# OR run the dispatcher standalone with an explicit concurrency cap:
shay kanban daemon --interval 60 --max 6
```
Set a sane cap so you don't spawn unbounded workers. Recommended: add to
`~/.shay/config.yaml` under `kanban:` and/or pass `--max` to the daemon. (The
gateway path reads config; the standalone daemon takes `--max`.)

---

## 3. Recommended topology for our 3 lanes (research / agentos / deskbuild)

There are two orthogonal axes; do not conflate them:
- **Boards** = isolated queues (workers physically can't see other boards'
  tasks). We already have `research`, `agentos`, `deskbuild`, `default`.
- **Profiles/lanes** = parallel executors *within* whatever board the gateway
  is pointed at.

### Recommended model: one board per domain + a shared specialist profile fleet
Keep the three domain boards as the work queues. Create a small reusable
specialist fleet (profiles) and assign cards on each board to the specialist
that fits the lane. The same profile fleet serves all three boards.

Profile fleet to create:
```bash
shay profile create orchestrator --clone-from default --no-skills   # routing only
shay profile create researcher   --clone-from default
shay profile create builder      --clone-from default
shay profile create reviewer     --clone-from default
```
- `orchestrator` — decomposes a goal into child cards and assigns them; give it
  `kanban` tools but strip terminal/file/code/web (see §4). Its job is
  `kanban_create` + `kanban_link` fan-out, then step back.
- `researcher` — research/discovery cards (web + write-up). Good default model
  can be the fast Gemini; bump to a stronger model for hard synthesis.
- `builder` — implementation cards (terminal/file/code, git worktrees).
- `reviewer` — gates "done" via the `review-required:` block convention.

Per-board assignment intent:
| Board | Typical lanes | Assignees |
|---|---|---|
| `research` | parallel discovery + synthesis | `researcher` (xN, unlinked) → `reviewer` (parent-linked) |
| `agentos` | spec → build → review pipeline | `orchestrator` decomposes; `builder` implements; `reviewer` gates |
| `deskbuild` | feature build + QA | `builder` (xN parallel where independent) → `reviewer` |

### Throughput rules (from kanban-orchestrator SKILL.md)
- **Leave independent cards UNLINKED** so the dispatcher fans them out in
  parallel. Only add `--parent` for true data dependencies.
- One card per workstream; do not bundle unrelated work into one implementer
  card ("Split multi-lane requests before creating cards").
- Synthesis/review cards get `parents=[...]` so they auto-promote only when all
  inputs are `done`.
- Run multiple `researcher`/`builder` cards concurrently — same profile,
  multiple cards, dispatcher spawns multiple workers up to `--max`.

### Concurrency
Pick a `--max` that matches model rate limits. Given the $100 Codex/Anthropic
caps and the always-available Gemini Flash + Ollama floor noted in project
memory, start conservative: `shay kanban daemon --interval 60 --max 4` (or set
`kanban.max_spawn` in config), then raise once you confirm rate headroom.

### Operating loop
1. `shay kanban boards switch <slug>` (or `--board <slug>` per command).
2. Create cards, assigning the right profile; link only real dependencies.
3. `shay gateway start` (or `shay kanban daemon --max N`).
4. Watch `shay dashboard` ("Lanes by profile" on) or
   `shay kanban watch --kinds completed,gave_up,timed_out`.
5. Unblock review-required cards: `shay kanban unblock <id>`.
6. `shay kanban diagnostics` to catch stranded/typo'd-assignee cards.

---

## 4. Orchestrator / worker skill conventions to follow

Sources: `~/.shay/skills/devops/kanban-orchestrator/SKILL.md`,
`~/.shay/skills/devops/kanban-worker/SKILL.md` (identical copies under
`~/.shay/hermes-agent/skills/devops/`).

**Orchestrator profile (kanban-orchestrator):**
- Step 0: discover real profiles (`shay profile list`) before planning — never
  invent profile names; unknown assignees are silently dropped (left in
  `ready`/`skipped_nonspawnable`).
- Restricted toolset: include `kanban`, exclude terminal/file/code/web. "Route,
  don't execute." Decompose → route → summarize.
- Fan out independent lanes; link only true dependencies; show the task graph
  to the user before creating cards. Use `kanban_create(... parents=[...])`.

**Worker profile (kanban-worker):**
- Lifecycle is auto-injected (`KANBAN_GUIDANCE`); the skill auto-loads via
  `--skills kanban-worker`. Loop: orient (`kanban_show()`) → work →
  `kanban_heartbeat(note=...)` → terminate.
- Terminate with exactly one of `kanban_complete(summary=, metadata=)` or
  `kanban_block(reason=)`.
- **review-required convention** for code: `kanban_comment` the structured
  metadata (changed_files, tests_run, diff_path/PR url, decisions) FIRST, then
  `kanban_block(reason="review-required: ...")`. Use `kanban_complete` only for
  genuinely terminal tasks (typo fix, docs, research write-up where the artifact
  IS the output).
- Structured `summary`/`metadata` is the handoff channel: downstream workers
  read parents' most-recent-completed-run summary+metadata via `kanban_show()`.
  No bulk-close of multiple tasks with one summary (guarded).
- Workspace kinds: `scratch` (tmp, GC'd), `dir:<path>` (shared persistent),
  `worktree` (git worktree — `git worktree add` if `.git` missing, commit there).
- Tenant isolation: if `$SHAY_TENANT` set, prefix persisted memory with the
  tenant to avoid cross-tenant leakage.

**External CLI lanes (Codex / Claude Code / OpenCode):** NOT a paved path
(worker-lanes.md lines 91–97). `spawn_fn` is pluggable on `dispatch_once`, but
wrapping exit codes into `kanban_complete/block`, mapping sandbox/workspace
conventions, and auth are per-integration design work. For now, keep workers as
Shay-Shay profile lanes; if you must drive an external CLI, the cleaner interim
is a Shay-Shay profile whose worker *shells out* to that CLI from inside its
own run rather than registering a non-spawnable assignee.

---

## File / URL citations
- Tutorial doc: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-tutorial
- Worker-lanes doc: https://hermes-agent.nousresearch.com/docs/user-guide/features/kanban-worker-lanes
- `/Users/famtasticfritz/.shay/hermes-agent/website/docs/user-guide/features/kanban-tutorial.md`
- `/Users/famtasticfritz/.shay/hermes-agent/website/docs/user-guide/features/kanban-worker-lanes.md`
- `/Users/famtasticfritz/famtastic/shay-shay/shay_cli/kanban_db.py` (spawn guard 3770–3795; `list_profiles_on_disk` 4662–4694; `max_spawn` 3670–3772; TTL :101)
- `/Users/famtasticfritz/famtastic/shay-shay/shay_cli/kanban.py` (gateway dispatcher 147; `--max` 468; daemon)
- `~/.shay/config.yaml` (kanban block lines 448–451)
- `~/.shay/skills/devops/kanban-orchestrator/SKILL.md`
- `~/.shay/skills/devops/kanban-worker/SKILL.md`
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/screens/Kanban/Kanban.tsx`
- `/Users/famtasticfritz/famtastic/shay-desktop/Sources/HermesDesktop/Views/Kanban/KanbanView.swift`