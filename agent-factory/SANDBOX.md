# SANDBOX — Isolation Contract

This directory (`agent-factory/`) is a **self-contained sandbox**. Everything the
system does — processes, schedules, data, logs, spawned worker agents, and the
generated demo project — lives entirely inside this folder.

## Hard rules

1. **Nothing outside `agent-factory/` may be created, modified, or deleted** by
   the orchestrator, the workers, the scheduler, or the self-improvement loop.
   All file IO is rooted at the directory containing this file (`ROOT`), and the
   code refuses to write to any path that resolves outside `ROOT`
   (`src/safepath.js` enforces this).
2. **No real external spend.** The model layer (`src/llm.js`) is OpenRouter-style
   but runs in **stub mode** unless `OPENROUTER_API_KEY` is present in `.env`.
   With no key it never makes a network call and never costs money. Costs in
   `logs/COSTS.log` are *modeled* estimates, not real charges.
3. **No real system cron / launchd / crontab.** Scheduling is an **in-process
   loop** inside the orchestrator (`src/orchestrator.js`). Nothing is registered
   with the host OS. Killing the orchestrator process stops all scheduling.
4. **No money movement of any kind.** No payment APIs, no billing, no transfers.
5. **Bounded self-modification.** The self-improvement loop only edits
   `config/factory-config.json` (numeric tuning within documented min/max bounds).
   It never rewrites core source files.
6. **Spawned agents are local child processes** (`node src/worker.js ...`). They
   are short-lived, take one task, report a result + modeled cost, and exit.

## On the "own git repo" requirement

The original brief asked for a nested git repo. In this environment the work must
be delivered on the branch `claude/agent-factory-ncs7-demo-6txdy8` of the parent
`famtastic` repository, and a nested `.git` would break that push path. **Decision
(lowest-risk, logged here):** isolation is enforced by the *write-boundary* above
(`safepath.js`), not by a separate `.git`. Version control uses the parent repo's
designated branch. To run this as a truly standalone repo elsewhere, just
`cp -r agent-factory /somewhere && cd /somewhere && git init`.

## What lives where

```
agent-factory/
  SANDBOX.md SETUP.md SUMMARY.md README.md LEARNINGS.md
  config/        factory-config.json (tunable), models.json (model catalog+pricing)
  src/           orchestrator, queue, router, llm, worker, scheduler, skills/, ...
  bin/           seed.js, run.js, status.js, demo.js
  data/          factory.db (SQLite, gitignored), runtime state
  logs/          ORCHESTRATOR.log, COSTS.log
  assets/ncs7/   source assets for the NCS7 demo (the "proof" project)
  projects/ncs7/ assembled/built demo output produced by the factory
  docs/          discovery / audit / proposal artifacts the factory generates
```
