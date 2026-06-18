# SANDBOX — Hard Boundaries

This directory (`deal-engine/`) is a **self-contained sandbox**. Everything the
system does — code, processes, schedules, databases, logs, spawned worker agents,
and generated artifacts — lives entirely inside this folder.

## Inviolable rules

1. **Nothing outside `deal-engine/` may be created, modified, or deleted** by any
   process in this system. The orchestrator, workers, scheduler, and self-improvement
   loop all operate with paths rooted at this directory (`ENGINE_ROOT`).
2. **No real external spend, ever.** There is no money movement. Model calls are
   routed through a cost-aware router that runs in **stub/offline mode by default**.
   A real API key is only consumed if the operator fills `.env` themselves (see
   `SETUP.md`), and even then there is no payment, billing, or PayPal automation —
   only LLM inference cost *estimates* recorded in a ledger.
3. **No real system crontab is touched.** All scheduling is an in-process loop
   inside the orchestrator. The system manages its own cadence internally.
4. **No credentials are hard-coded.** Where a real key would be needed it is read
   from `.env` (operator-filled) or mocked. Missing keys never block a run.
5. **Self-improvement is bounded.** The loop tunes values in `config.json` only
   (concurrency, routing thresholds, batch cadence). It never rewrites core code.

## Note on "its own git repo"

The original brief asked for `deal-engine/` to have its own git repo. The
session harness requires work to land on the famtastic feature branch
`claude/deal-engine-travel-deals-g9wyge` so it is reviewable. A nested `.git`
would be invisible to that review. **Lowest-risk resolution (logged):** this lives
as a fully self-contained module committed to the famtastic branch. It has no
dependencies on the parent repo and can be lifted into a standalone repository at
any time with:

```bash
git subtree split --prefix=deal-engine -b deal-engine-standalone
```

## Isolation

- Runtime: Python 3 standard library only (no third-party packages required).
- Optional virtualenv: `python3 -m venv deal-engine/.venv` (see `SETUP.md`).
- Data lives in `deal-engine/data/` (gitignored). Logs in `deal-engine/logs/`.
- All paths are derived from `dealengine/paths.py:ENGINE_ROOT` — the module refuses
  to write above its own root.
