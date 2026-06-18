# SUMMARY.md — Agent Factory

A self-managing, sandboxed **agent factory**: a meta-system that spawns,
manages, and retires worker agents on its own to process high volumes of tasks
cheaply. Everything lives in `./agent-factory/`, runs on stdlib Python with no
external dependencies, and executes **fully offline with zero spend** by default.

## What I built

Seven components, each committed separately, all wired together and **proven
running** (see `proof/` and the run output below):

1. **Orchestrator** (`orchestrator.py`) — a long-running supervisor. It reads
   the queue, decides how many workers to run (`config.concurrency`) and what
   *kinds* to mint (from the kinds of pending tasks), spawns each as a tracked
   subprocess, monitors them to completion, reaps them, and retires worker kinds
   whose backlog is gone. Every decision is written to `logs/ORCHESTRATOR.log`.
2. **Task queue** (`task_queue.py`) — SQLite in WAL mode with an **atomic
   claim** (`UPDATE…WHERE id IN (SELECT…LIMIT 1)`) so concurrent worker
   subprocesses never double-grab a task. `seed_tasks.py` injects 12 varied
   sample tasks (+ optional synthetic overflow) so there's work immediately.
3. **Worker agents** (`worker_template.py` + `factory.py`) — workers are
   **minted from a template** at runtime: `factory.mint_worker(kind)` substitutes
   placeholders and writes a runnable module into `workers/`. Each worker takes
   one task, routes it, records result + cost, and exits. This is what lets the
   orchestrator create new kinds of agents *programmatically*.
4. **Self-scheduling** (`scheduler.py`) — an **in-process** recurring-job
   scheduler. It drives draining, self-improvement, dashboard refresh, and
   cadence adaptation. It **never touches the real OS crontab** — when the
   orchestrator stops, all schedules stop. Cadence is adaptive: the drain
   interval tightens when the queue is deep, relaxes when it's shallow.
5. **Model routing / cost control** (`router.py` + `models.py`) — three priced
   tiers (`triage-cheap`, `worker-mid`, `worker-strong`). The router **always
   triages with the cheap model first**, then escalates to the strong model only
   when estimated complexity clears `routing.complexity_threshold`. Every call's
   estimated cost is appended to `COSTS.log` and rolled up in the DB. Optimizes
   throughput-per-dollar — most tasks never touch the expensive tier.
6. **Self-improvement loop** (`self_improve.py`) — after each batch it reviews
   success rate, average cost, latency, and queue pressure, then **tunes a fixed
   set of numeric knobs** (`concurrency`, `routing.complexity_threshold`,
   `poll_interval_seconds`), each clamped to declared bounds. It appends a
   human-readable entry to `LEARNINGS.md` and a machine-readable one to
   `config.json → tuning_history`. It **never edits code** (bounded by design).
7. **Observability** (`dashboard.py`) — a terminal readout and a static,
   auto-refreshing `dashboard/index.html` showing active agents, queue depth,
   throughput-per-dollar, spend by model, self-tuned knobs, and scheduler state.

## How the self-management works (the loop)

```
read queue ─▶ decide capacity & kinds ─▶ mint missing worker kinds ─▶
spawn subprocess workers ─▶ each worker triages cheap, escalates only if hard ─▶
record result + cost ─▶ reap finished, retire idle kinds ─▶
when batch drains: review metrics ─▶ tune config within bounds ─▶ adopt ─▶
adapt scheduler cadence to new queue depth ─▶ repeat
```

The system decides **what agents it needs** (kinds, from pending task types),
**how many** (concurrency knob it tunes itself), **when to run** (in-process
scheduler whose cadence it adapts to queue depth), and **which model per task**
(cheapest capable, escalate only when complex). It improves over time by tuning
config between batches — bounded, logged, no unbounded self-modification.

## Proof it runs

`python orchestrator.py --seed 8 --demo` (captured in `proof/demo-run.txt`):

- **20 tasks processed, 0 failed** (100% success).
- **20 worker subprocesses** spawned, monitored, and reaped (well over the
  ≥2 required); **5 worker kinds** minted from the template, then retired when
  idle.
- **Routing worked:** 13 tasks stayed on `worker-mid`, only 7 hard tasks
  escalated to `worker-strong`. Total estimated spend **$0.041245**
  (~485 tasks/$).
- **One self-improvement pass** ran and adjusted config: lowered the escalation
  threshold `0.55→0.52` (cost well under target, buy more quality) and relaxed
  poll `2→3s` (queue drained). Recorded in `LEARNINGS.md` and `tuning_history`.

`python orchestrator.py --serve --seconds 6` additionally proved the in-process
scheduler firing its four jobs (drain, improve, dashboard, adapt_cadence) on
their own cadence — self-scheduling with no OS cron.

## Assumptions logged (every fork, lowest-risk option taken)

- **Language: stdlib Python 3.11.** No pip/network needed → runs anywhere
  offline. (Node was also available; Python's `sqlite3` + `subprocess` made the
  queue + spawning trivial with zero deps.)
- **Queue: single local SQLite file** in WAL mode. Sufficient for one-host high
  throughput; not a distributed broker (see extension notes).
- **Workers are subprocesses, one task each, short-lived.** Cleanest containment
  and the most honest "spawn/retire" semantics. They claim → run → exit.
- **Models are stubbed by default**, with deterministic prompt-derived token
  counts so costs are reproducible. Real calls require BOTH a key AND
  `FACTORY_LIVE=1` — a deliberate double safety against accidental spend.
- **Prices in `models.MODELS` are illustrative** OpenRouter-ish numbers, not a
  live price feed. Edit to match your provider.
- **Self-improvement tunes only three numeric knobs within bounds.** No code is
  ever rewritten. This keeps "improve over time" safe and reviewable.
- **Self-scheduling is in-process only.** The real system crontab/launchd is
  never touched (SANDBOX.md rule 2).
- **The factory's own git repo** has its git-dir at `~/.agent-factory-gitdir`
  (outside the tree) so `agent-factory/.git` is just a pointer; this let me also
  deliver the source on the parent `famtastic` feature branch for review without
  a nested-submodule mess. The *running* factory still writes nothing outside
  `./agent-factory/`.
- **Demo drains in a single batch** because all seeded tasks are pending at
  start; the second-batch branch only triggers if work remains. Serve mode is
  where multi-batch adaptation plays out continuously.

## How to extend it

- **Real models:** `cp .env.example .env`, set `OPENROUTER_API_KEY` and
  `FACTORY_LIVE=1`. Adjust the tier→slug map and prices in `models.py`. The
  `_real_call()` stdlib implementation is already there. (See `SETUP.md` §5.)
- **Real task sources:** call `task_queue.enqueue(kind, prompt, priority)` from a
  webhook, file watcher, message-bus consumer, or inbox poller. The orchestrator
  consumes whatever is `pending`. (See `SETUP.md` §6.)
- **New worker behaviors:** edit `worker_template.py` (logic shared by all minted
  workers) or specialize per-kind by branching on `WORKER_KIND` inside it. Add
  kinds to `factory.SPECIALTY` and `router.KIND_DIFFICULTY`.
- **New tuning knobs:** add a numeric field + bounds to `config.json` and a rule
  in `self_improve.review_and_tune()` (keep it clamped).
- **Scale out:** swap `task_queue`'s SQLite for Redis/Postgres and the
  subprocess spawn for containers/serverless — the orchestrator's claim/spawn/
  reap interface stays the same.

---

## Three questions for the next iteration

1. **Real model layer:** should the next iteration wire live OpenRouter calls
   behind a hard per-run dollar cap (e.g. abort the batch at $X), or stay fully
   stubbed until you've reviewed the routing policy on your real task mix?
2. **Task source:** what's the first *real* producer you want connected —
   a webhook/API endpoint, a watched inbox/folder, or a message queue — so I can
   build that adapter next instead of the synthetic seeder?
3. **Quality signal:** right now success = "worker exited cleanly." Do you want a
   real verification step (an LLM-judge or rule check that grades each result and
   feeds the success rate), so self-improvement tunes on *quality*, not just
   completion?
