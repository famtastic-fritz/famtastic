# SANDBOX — Containment Contract

This directory (`agent-factory/`) is a **fully self-contained sandbox**. It is an
autonomous, self-managing multi-agent "agent factory." The following rules are
non-negotiable and are the reason this system is safe to run unattended.

## Hard boundaries

1. **Nothing outside `agent-factory/` may be modified.** Every process, schedule,
   database, log, spawned worker, and generated artifact lives inside this folder.
   Read-only access to the parent repo is permitted (e.g. the system audit handler
   reads `../.wolf/buglog.json` if present) but the factory **never writes** outside
   `agent-factory/`.
2. **No real external spend. Ever.** There is no money movement of any kind. The
   model layer is an OpenRouter-style router that **stubs every call** when no API
   key is present. Costs are *estimates* tracked in a local ledger — they are never
   charged anywhere.
3. **No real credentials are committed.** Anywhere a real key would be required, the
   value is read from `.env` (which the user fills in later) or mocked. See `SETUP.md`.
4. **The real system crontab is never touched.** All scheduling happens in-process
   inside the orchestrator (`src/scheduler.py`). Killing the orchestrator process
   stops all scheduling.
5. **Bounded self-improvement.** The self-improvement loop only tunes values in
   `config.json` within hard min/max guardrails. It never rewrites core code.

## Isolated git

This sandbox has its **own git history**, stored in `.sandbox-git/` (a separate
git-dir so it does not collide with the parent repository's `.git`). Commit to it with:

```bash
git --git-dir=agent-factory/.sandbox-git --work-tree=agent-factory <cmd>
```

`.sandbox-git/`, `.venv/`, `data/*.db`, and `__pycache__/` are git-ignored.

## Isolated runtime

Python 3.11+, **standard library only** — no pip install required, runs fully
offline. An optional venv can be created (`python3 -m venv .venv`) but is not needed.

## How to run

```bash
cd agent-factory
python3 run_demo.py        # seed tasks, run orchestrator, spawn workers, self-improve, dashboard
```

See `SETUP.md` for wiring real models and real task sources later.
