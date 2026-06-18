# SUMMARY — Agent Factory

## What I built
A sandboxed, self-managing multi-agent system inside `agent-factory/` — a
meta-orchestrator that spawns, routes, monitors, retires, and improves a fleet
of worker agents to clear a task queue cost-effectively, with zero external
spend and zero touch outside its own folder. It runs **fully offline on the
Python standard library** (no `pip install`, no keys, no network).

It was proven by running the requested **first job**: build the complete
go-to-market → sell → collect pipeline for selling *FAMtastic Designs* as a
productized service. The factory processed that job autonomously and produced
six ready-to-use business deliverables plus four supporting artifacts.

## Proof of the run (one `python3 run.py`)
- **10 tasks seeded → 10 done, 0 failed (100% success).**
- **10 worker agents minted, spawned as subprocesses, and retired** (all
  one-shot; `agents/` is empty after the run — they cleaned themselves up).
- **Model routing worked across all three tiers:** triage tasks → `llama-3.1-8b`
  ($0.000008 each), mid tasks → `gpt-4.1-mini`, complex business tasks →
  `claude-sonnet-4.6`. Cheapest-capable-first, escalation on low confidence.
- **Cost ledger:** total **$0.0587** estimated across the batch (`logs/COSTS.log`).
- **Self-improvement ran after every wave** and tuned config within bounds:
  concurrency `2 → 4`, complexity threshold `0.55 → 0.30`, scheduler cadence
  adapting to backlog (see `LEARNINGS.md`).
- **Observability:** terminal readout + live `dashboard/index.html`.
- **Every decision logged** to `logs/ORCHESTRATOR.log` (68 entries).

Artifacts to inspect: `deliverables/*.md`, `logs/ORCHESTRATOR.log`,
`logs/COSTS.log`, `LEARNINGS.md`, `dashboard/index.html`, `data/factory.db`.

## How the self-management works
1. **Supervise** (`orchestrator.py`): each wave it reads queue depth, decides how
   many workers to spawn (`min(concurrency_max, pending)`), and logs the decision
   — including how much idle capacity it *didn't* spin up (retired capacity).
2. **Mint** (`worker_template.py` → `agents/worker_*.py`): workers are generated
   from a template on demand, so the orchestrator creates new agents
   programmatically. Each is thin: claim one task, process via `factory_lib`,
   print a JSON result, exit.
3. **Route + cost-control** (`router.py` + `models.py`): every task is routed to
   the cheapest model whose tier clears its complexity, escalating one tier only
   when triage confidence is low. Each call is costed into `logs/COSTS.log`.
4. **Self-schedule** (`scheduler.py`): an in-process loop sets its own cadence
   from queue depth — surge when deep, back off when drained. **The OS crontab
   is never touched.**
5. **Self-improve** (`self_improve.py`): after each wave it reviews success rate,
   cost/task, latency, and backlog, then nudges a small allow-list of config
   knobs within hard clamps, logging before/after to `LEARNINGS.md`. It cannot
   edit core code or exceed safety ceilings.
6. **Monitor + recover**: dead/timed-out workers have their tasks requeued
   (`requeue_stale`); finished one-shot workers are retired and their files
   deleted.
7. **Observe** (`dashboard.py`): refreshes a static dashboard each wave.

## Assumptions logged (every fork took the lowest-risk option)
1. **Single repo, not a nested git repo.** A nested `.git` would hide the
   deliverables from review on the required feature branch, so the sandbox is a
   self-contained subtree on `claude/agent-factory-orchestrator-flvu43`.
   Isolation is enforced at **runtime** by `factory_paths.assert_inside` instead.
   (Also in `SANDBOX.md`.)
2. **Python stdlib only.** Chosen over Node for a truly zero-install, offline
   run (sqlite3, subprocess, threading, http all in the stdlib).
3. **Offline model layer.** No key present → calls are stubbed; the deliverable
   generators are the "model output." Cost accounting is identical to a live run.
4. **Live calls are double-guarded.** Even with a key + `live_calls:true`,
   `router.call_model` does not perform a network request — the real POST is
   documented but commented out in `SETUP.md` so nothing can spend by accident.
5. **No money movement.** PayPal/GoDaddy details are used only as *text* in the
   generated business docs. The factory never charges, invoices, or transfers.
6. **I deliberately did NOT modify repo-level docs** (SITE-LEARNINGS, CHANGELOG,
   FAMTASTIC-STATE, `.wolf/*`) despite the repo's documentation rules, because
   the sandbox contract ("nothing outside this folder may be modified") is the
   explicit, overriding instruction for this task. All docs live in-sandbox.
7. **One-shot workers** over long-lived ones: cheapest, crash-safe unit;
   "retire idle" is expressed as not minting unneeded workers + deleting finished
   ones, all logged.
8. **Greedy tuning policy (known limitation):** the self-improvement loop lowers
   the complexity threshold whenever cost is under target, so it walks to the
   safe floor (0.30). It's clamped and harmless, but a future version should add
   hysteresis / a cost-vs-quality objective rather than a one-directional nudge.

## How to extend it
- **Real models:** set `OPENROUTER_API_KEY` + `FACTORY_LIVE_CALLS=true` in
  `.env`, flip `live_calls:true` in `config.json`, and un-comment the POST in
  `router.call_model` (snippet in `SETUP.md`). Routing/cost code is unchanged.
- **Real task sources:** every entry point is `queue_db.add_task(...)`. Wire a
  webhook, a CSV/Sheets importer, the FAMtastic site studio's build events, or an
  inbox poller to it. Set `complexity` (0..1) per task to drive routing.
- **Real deliverables:** replace the generators in `deliverables.py` with live
  model prompts (the dispatch table maps task type → handler).
- **Run forever:** `python3 orchestrator.py --daemon` keeps the in-process
  scheduler alive, draining the queue and idling when empty.
- **Smarter self-improvement:** extend `SAFE_BOUNDS` + the policy in
  `self_improve.run_pass`; bounds keep it safe by construction.

---

## Three questions (only things that change the NEXT iteration)
1. **Live model wiring:** do you want me to actually enable the OpenRouter POST
   (real spend, behind a per-batch budget cap) in the next iteration, or keep it
   stubbed until you've added your key yourself?
2. **Real task source:** which inbound should feed the queue first — Upwork/job
   scraping, an email-reply poller, or the FAMtastic site-studio build events?
   That decides the first real ingestion adapter I build.
3. **Payment rail depth:** should the next iteration generate *real* PayPal
   invoice drafts via the PayPal API (still no auto-charge — drafts only for your
   approval), or keep payment strictly as document templates as it is now?
