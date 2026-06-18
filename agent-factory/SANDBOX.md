# SANDBOX CONTRACT

This directory (`agent-factory/`) is a **self-contained sandbox**. Everything the
Agent Factory does — processes, schedules, data, logs, spawned worker agents,
configuration — lives entirely inside this folder.

## Hard rules

1. **Nothing outside `agent-factory/` may be created, modified, or deleted** by
   any component of this system. The orchestrator, workers, scheduler, and
   self-improvement loop only ever read/write paths under this directory.
2. **No real external spend.** There is no money movement of any kind. All model
   calls go through a router that, by default, runs a deterministic **offline
   stub** (`src/llm.py`). A real key is only used if the operator fills `.env`
   and explicitly opts in (`AGENT_FACTORY_LIVE=1`).
3. **No real system cron / launchd / systemd.** Scheduling is an **in-process
   loop** inside the orchestrator. The host crontab is never touched.
4. **No credentials are committed.** `.env` is git-ignored; only `.env.example`
   is tracked.
5. **Bounded self-modification.** The self-improvement loop only tunes values in
   `config.json` (within documented min/max clamps). It never rewrites core
   source code.

## What lives where

```
agent-factory/
  SANDBOX.md          <- this file (the contract)
  SETUP.md            <- how to configure real keys / live mode later
  SUMMARY.md          <- written at the very end: what was built + how to extend
  README.md           <- quickstart
  config.json         <- the ONLY file the self-improvement loop mutates
  .env.example        <- template for keys (copy to .env; .env is git-ignored)
  .gitignore
  run.sh              <- convenience entrypoints
  src/
    queue_db.py       <- SQLite task queue (enqueue / atomic claim / complete)
    seed.py           <- injects sample tasks (derived from awesome-trading-agents)
    llm.py            <- OpenRouter-style model layer; offline stub by default
    router.py         <- cost-aware model routing + escalation + cost ledger
    worker.py         <- worker agent: claim 1 task, route, run, report, exit
    worker_template.py<- template the orchestrator uses to MINT new workers
    orchestrator.py   <- long-running supervisor + in-process scheduler + SI loop
    dashboard.py      <- terminal readout + static dashboard.html
  workers/            <- worker variants MINTED at runtime from the template
  data/               <- factory.db (SQLite) + runtime state json  (git-ignored)
  logs/               <- ORCHESTRATOR.log, COSTS.log               (git-ignored)
  tasks/              <- seed_tasks.json
  tests/              <- smoke test
  LEARNINGS.md        <- written by the self-improvement loop each batch
```

## Git isolation note (logged assumption)

The brief asks for "its own git repo." This sandbox is being delivered inside the
existing `famtastic` monorepo on branch `claude/agent-factory-orchestrator-t605wf`
so that it is reviewable through the normal PR flow. A nested `.git` would be
ignored by the parent remote and the files would never reach review, so we do
**not** create a nested repository. Instead the folder is fully self-contained and
can be lifted into a standalone repo at any time with:

```
git subtree split --prefix=agent-factory -b agent-factory-standalone
```

This preserves the *spirit* of the requirement (total self-containment + isolated
runtime via `.venv/`) while keeping the work reviewable. Logged here per the
"pick the lowest-risk option at any fork, log it, continue" directive.
