# TESTING — verify the Agent Factory locally

Everything here is **offline, sandboxed, and isolated**. The factory imports
nothing from FAMtastic Site Studio, touches no ports, no launchd, no
`studio-config.json`, and writes only inside `agency-factory-side-work/`. Running these
tests cannot affect Studio or any other session's work.

## Safest way to pull it without disturbing another session
Use a **separate git worktree** so your current checkout (and whatever another
session is editing) is left completely untouched:

```bash
cd ~/famtastic
git fetch origin claude/agent-factory-orchestrator-flvu43
git worktree add ../famtastic-agency-factory-side-work claude/agent-factory-orchestrator-flvu43
cd ../famtastic-agency-factory-side-work/agency-factory-side-work
./demo.sh smoke
```

This checks the branch out into `~/famtastic-agency-factory-side-work/` — a separate folder
— so your main `~/famtastic` working tree, and the Studio session running from
it, never change. When done: `git worktree remove ../famtastic-agency-factory-side-work`.

(If you don't care about the other session, a plain `git checkout` of the branch
also works — this branch only *adds* `agency-factory-side-work/`, it modifies no Studio
files.)

## The scenario runner
```bash
./demo.sh <scenario>
```

| Scenario | What it proves | Needs keys? |
|----------|----------------|-------------|
| `smoke` | Full bounded run: seed → spawn workers → route → cost ledger → self-improve → dashboard | no |
| `autonomy` | Persistent daemon picks up tasks injected **live**, then stops cleanly | no |
| `burst` | 20 tasks: concurrency scales up, cadence tightens, self-improvement reacts | no |
| `routing` | A trivial→expert spread routes to cheap→premium models (see the cost split) | no |
| `paypal` | Creates DRAFT PayPal invoices (stub) + shows the exact API request body | no |
| `resilience` | A failing task fails cleanly; an orphaned (dead-worker) task is requeued and finishes | no |
| `status` | Print the dashboard for current state | no |
| `clean` | Reset all runtime state for a fresh run | no |

Run several in a row; each `reset_state` starts clean (except `smoke`, which
resets itself inside `run.py`).

## What to look at after a run
- `logs/ORCHESTRATOR.log` — every decision (mint, assign, done, retire, scale, stop).
- `logs/COSTS.log` — per-task model + estimated cost, with running total.
- `LEARNINGS.md` — what the self-improvement loop changed and why.
- `deliverables/` — the actual work products (business docs, invoice drafts).
- `dashboard/index.html` — live status (auto-refreshes).

## Expected results (offline)
- `smoke`: ~12 tasks done, 100% success, total cost well under $0.10.
- `routing`: trivial→`llama-3.1-8b`, mid→`gpt-4.1-mini`, hard→`claude-sonnet-4.6`.
- `resilience`: success_rate drops below 100% (the fault task fails on purpose);
  the orphaned task ends `done`, not stuck in `claimed`.
- `paypal`: two `deliverables/invoices/*.json` drafts, mode `STUB`, never sent.

## Going live later (optional, your keys)
See `SETUP.md`. Two independent switches, both off by default and both guarded:
- Real model calls: `OPENROUTER_API_KEY` + `FACTORY_LIVE_CALLS=true` + `config.live_calls`.
- Real PayPal **drafts** (never sent): `PAYPAL_CLIENT_ID/SECRET` + `FACTORY_LIVE_PAYPAL=true` + `config.paypal_live`, starting on `PAYPAL_ENV=sandbox`.

## Feeding it from Site Studio later
The only ingress is `queue_db.add_task(type, title, payload, priority, complexity)`.
When the other session's Studio changes settle, a Studio build event can call
that one function to enqueue work — no other coupling is needed, and it stays in
this sandbox.
