# SANDBOX — Hard Isolation Contract

This directory (`agent-factory/`) is a **self-contained sandbox**. The rule is
simple and absolute:

> **Nothing outside `agent-factory/` may be modified by this system — ever.**

Every process, schedule, database, log, spawned worker agent, deliverable, and
piece of configuration lives **inside this folder**. The agent factory has no
authority — and is written to have no ability — to reach outside it.

## What "isolated" means here, concretely

| Concern            | How it stays inside the sandbox                                            |
|--------------------|---------------------------------------------------------------------------|
| Code               | All `.py` files live in `agent-factory/`.                                  |
| State / queue      | SQLite DB at `agent-factory/data/factory.db`.                             |
| Logs               | `agent-factory/logs/ORCHESTRATOR.log`, `agent-factory/logs/COSTS.log`.    |
| Scheduling         | In-process scheduler thread. **The real OS crontab is never touched.**     |
| Spawned agents     | Minted into `agent-factory/agents/`, run as local subprocesses.            |
| Deliverables       | Written to `agent-factory/deliverables/`.                                  |
| Dashboard          | `agent-factory/dashboard/index.html` (static) + terminal readout.         |
| Secrets            | Read from `agent-factory/.env` only (you create it; `.env.example` shows it).|

All paths in the code are resolved **relative to this file's directory** via a
single `ROOT` constant in `factory_paths.py`. There is no `os.chdir`, no
absolute path outside `ROOT`, and no write target computed outside `ROOT`.
`factory_paths.assert_inside(path)` is called before every write and raises if a
path escapes the sandbox — a runtime guardrail, not just a convention.

## No live spend, no money movement

- No real API keys are committed. The model layer (`router.py`) uses an
  **OpenRouter-style** interface but **stubs every call** when no key is present,
  so the whole system runs end-to-end **offline**.
- Even when a key *is* present, the default config keeps `live_calls: false` so
  nothing is spent until you explicitly opt in (see `SETUP.md`).
- The cost ledger (`logs/COSTS.log`) tracks **estimated** dollars only. No
  charge, payment, or transfer is ever executed by this system.
- The PayPal integration (`paypal.py`) can create **DRAFT invoices only**. A
  draft is an unsent document — PayPal does not notify or charge anyone for it.
  The module contains **no send/capture/payout/refund/subscription code at all**;
  the only thing it can ever leave behind is a draft sitting in your account,
  waiting for *you* to review and send manually. It is stubbed offline by default
  and only touches PayPal when credentials + two opt-in flags are set, and
  defaults to the PayPal **sandbox** host even then.

## Self-scheduling stays inside the process

The orchestrator runs its own internal scheduler loop (`scheduler.py`) on a
background thread. It adapts its own cadence based on queue depth. It does **not**
write to `/etc/crontab`, `crontab -e`, `launchd`, `systemd`, or any OS scheduler.
When the process exits, all scheduling stops. Nothing is left running on the host.

## Bounded self-improvement

The self-improvement loop (`self_improve.py`) may only adjust **values in
`config.json`** within hard-coded safe bounds. It cannot rewrite core code,
cannot raise concurrency above `max_concurrency_ceiling`, and cannot disable the
budget caps. Every change is logged to `LEARNINGS.md` with before/after values.

## Git isolation — logged assumption

The original brief said "create `./agent-factory/` with its own git repo." A
nested `.git` would make the parent repository treat this folder as an empty
gitlink, which would make the deliverables **invisible to review** on the
required feature branch. To keep the work reviewable, this sandbox is committed
as a **self-contained subtree on the dedicated feature branch**
(`claude/agent-factory-orchestrator-flvu43`) instead of a nested repo. Isolation
is enforced at **runtime** (the `assert_inside` guardrail above), which is the
property that actually matters, rather than by a second `.git` directory. This
trade-off is logged here and in `SUMMARY.md`.
