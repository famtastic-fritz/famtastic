# SANDBOX.md — Containment Contract

This directory (`./agent-factory/`) is a **self-contained sandbox**. The agent
factory built here is a meta-system that spawns, manages, and retires worker
agents on its own. To keep that autonomy safe, the following rules are
**hard constraints** on the running system.

## Containment rules (enforced by design)

1. **Nothing outside `./agent-factory/` may be created, modified, or deleted by
   the running factory.** All processes, schedules, queues, databases, logs,
   minted worker code, and spawned agents live entirely inside this folder.
   - All filesystem paths are derived from `core.ROOT` (the directory of the
     code), never from absolute system paths.
   - Spawned workers inherit the same root and write only under it.

2. **No real system cron / launchd / systemd is ever touched.** Self-scheduling
   is an *in-process* loop (`scheduler.py`). When the orchestrator stops, all
   schedules stop with it. There is no persistent OS-level job.

3. **No live external spend, no money movement, no real credentials.** The model
   layer (`models.py`) is an OpenRouter-style router that **stubs** every call
   unless a real `OPENROUTER_API_KEY` is present in `.env`. Even with a key the
   default `FACTORY_LIVE=0` keeps calls mocked. Costs are *estimated* from token
   counts and written to `COSTS.log` — no transaction ever leaves this machine.

4. **No unbounded self-modification.** The self-improvement loop
   (`self_improve.py`) tunes a fixed set of numeric parameters in `config.json`
   within declared min/max bounds. It never rewrites core logic. Every change is
   logged to `LEARNINGS.md` and to the config's `tuning_history`.

5. **Process containment.** Workers are short-lived subprocesses spawned by the
   orchestrator. They are tracked, monitored, and reaped. The orchestrator never
   spawns anything it does not track, and retires idle/finished workers.

## Builder's note (the repo, not the runtime)

The *running factory* honors rule 1 absolutely. The *builder* (the engineer who
assembled this sandbox) committed the source into two places intentionally:

- **The factory's own isolated git repo** — its git-dir lives at
  `~/.agent-factory-gitdir` (outside this tree), so `agent-factory/.git` is just
  a pointer file. This is the sandbox's own version history ("its own git repo").
- **The parent `famtastic` feature branch** — for delivery/review. The parent
  `.gitignore` skips the factory's `.venv`, runtime DB/state, the inner-repo
  pointer, and minted worker files, so only source is delivered.

Committing source for review is not a runtime action and does not violate rule 1.
