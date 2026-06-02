---
title: build-tracker-design-2026-05-31
type: note
permalink: shay-memory/research/build-tracker-design-2026-05-31
tags: [memory/l2, observability, improvement-loop]
---

# Build Tracker — capture everything, see patterns, get better (Fritz directive, 2026-05-31)

## Reuse-before-generate: the data already exists (mostly)
- **`task_runs`** table (per kanban board DB) already records per run: `task_id`, `profile`
  (the brain/lane), `status`/`outcome`, `worker_pid`, `started_at` + `ended_at` (→ DURATION),
  `summary`, `error`, and a `metadata` JSON that already carries **`tests_run`, `tests_passed`,
  `changed_files`, `decisions`**. (Confirmed live: run #2 logged changed_files + decisions.)
- **`cost_telemetry.py` (B1)** + the `sessions` table already record **`estimated_cost_usd`,
  `billing_provider`, `model`, token columns** per call.
So we do NOT build a new capture system. We BUILD the aggregation + surface + the few missing fields.

## What's missing (the actual build)
1. **Join + aggregate** task_runs ⨝ sessions(cost) into per-build + rolled-up metrics.
2. **Capture escalation-rung-to-success** (new metadata field from H3): which rung resolved it.
3. **A queryable summary** — `shay builds` CLI + a desktop surface.
4. **The improvement loop** — surface trends + flag regressions, feed the learning loop.

## Metrics to surface (the "how do we get better" view)
- **By brain/lane:** success rate, protocol-violation rate, avg/p50/p95 runtime, $ per build.
  (This is exactly the insight that justified gemini→Claude: Flash's protocol-violation rate.)
- **Failure-mode breakdown:** protocol-violation vs gate-fail vs timeout vs crash.
- **Retries & rungs:** how many climbs/rungs to success; which rung most often resolves.
- **Gate health:** tests_run vs tests_passed; "done but tests_run=0" (the bypass smell — flag it!).
- **Throughput & cost:** builds/day, $/build, tokens/build, files-changed/build.
- **Regression flags:** runtime or failure-rate creeping up vs the trailing average.

## Surfaces
- **Backend (buildable now, low risk):** aggregation module + `shay builds [--since] [--by brain]`
  CLI summary, reading task_runs across boards + sessions cost. Reuse task_runs/cost_telemetry.
- **Desktop (after B3):** a "Build Tracker"/Analytics screen (mirrors the Hermes Agent ANALYTICS
  surface) showing the rolled-up metrics + per-build drilldown.

## The improvement loop (why it matters)
Tracker → weekly/nightly digest of trends + regressions → feeds the curator + the planning
grounding (so plans are made from measured reality, not vibes) + a low-funds/cost view. The
"done but tests_run=0" flag would have auto-caught the B3 gate-bypass. Measurement closes the
loop that human-eye supervision is doing manually today.

## REFINEMENT (Fritz, 2026-05-31): durable, searchable, permanent record of EVERY build
DURABILITY RISK confirmed: task_runs is per-board; kanban GC prunes events+logs at 30 days
and boards can be deleted (kanban.db goes with them). So task_runs is NOT a forever-record.

### Storage — how & where (decided)
- **Durable ledger:** a dedicated append-only `~/.shay/build-ledger.db` (SQLite), separate from
  any board, NEVER GC'd. A capture step mirrors each completed run into it BEFORE board GC can
  erase it. This is the system of record.
- **Brain mirror:** a per-build summary note (or rolling log) in the vault under
  Shay-Memory/builds/ so every build is in the brain + Obsidian-searchable + shaped for the
  future graph backend.

### What each build record captures (the full picture)
build_id · task_id/title · board · brain/lane · started/ended · **duration** · outcome ·
**loop_run_count / rungs_climbed** (how many times the loop ran + which escalation rungs) ·
**issue/error signature** (normalized so identical failures group) · gate results (tests_run,
tests_passed, the done-but-tests_run=0 bypass flag) · changed_files · decisions · cost_usd +
tokens (from cost_telemetry) · the full **escalation trail** (rung-by-rung what was tried).

### What it looks like + how to examine/search
- `shay builds list [--since] [--by brain] [--outcome]` — table view.
- `shay builds show <build_id>` — full drilldown incl. escalation trail + diff of changed_files.
- `shay builds search <query>` — full-text over summaries/errors + filters (brain, outcome,
  error-signature, date range, file touched). "Show me every build that touched pipeline.py and
  failed" must be answerable.
- Rolled-up metrics + regression flags (per the base design).
- Desktop "Build Tracker"/Analytics screen (after B3) reads the ledger.

### Permanence rule
From now on, EVERY run → one immutable ledger row + brain note. Append-only. The ledger is the
durable truth; boards are ephemeral. (Capture is collision-free: the tracker READS task_runs and
WRITES only its own ledger.db + vault notes.)
