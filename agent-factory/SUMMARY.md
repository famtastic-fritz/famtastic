# SUMMARY — Agent Factory

## What I built
A fully self-contained, self-managing multi-agent "agent factory" in `agent-factory/`,
its own isolated git repo (`.sandbox-git/`), Python 3 stdlib only, runs end-to-end
**offline with no dependencies and no spend**. Every required component is present and
proven by a real run:

| Component | File(s) | Proven by |
|-----------|---------|-----------|
| **Orchestrator** (long-running supervisor) | `src/orchestrator.py` | spawned 21 worker subprocesses across 2 batches; every decision in `logs/ORCHESTRATOR.log` |
| **Task queue** (SQLite, atomic claim) | `src/queue.py`, `src/db.py` | 21 tasks queued → claimed → completed, 0 failed |
| **Worker agents** (template, spawnable) | `src/worker.py`, `src/handlers.py` | real OS subprocesses, one task each, report result + cost, exit |
| **Self-scheduling** (in-process, no system cron) | `src/scheduler.py` | cadence shrank as queue deepened (`scheduler_tick` log lines) |
| **Model routing / cost control** | `src/router.py`, `src/ledger.py` | 3 tiers routed by complexity; `logs/COSTS.log`; hard per-run spend cap |
| **Self-improvement loop** | `src/improve.py` | tuned `max_concurrency` 2→4, `escalate_threshold` 0.67→0.77, `batch_size` 6→10; `LEARNINGS.md` |
| **Observability** | `src/dashboard.py` | terminal readout + `dashboard/status.html` |

Re-run anytime: `python3 run_demo.py` · tests: `python3 tests/test_smoke.py` (5/5 pass).

## How the self-management works
1. **It decides its own fleet size.** Each tick the orchestrator reads queue depth and
   spawns workers up to `max_concurrency` (`scale_decision` log). Workers process one
   task and exit; idle/finished ones are reaped (`retire_worker`) — the fleet breathes
   with demand.
2. **It sets its own cadence.** `scheduler.next_tick_seconds()` polls aggressively when
   the queue is deep and backs off when it's shallow — entirely in-process, never the
   real crontab.
3. **It spends as little as possible.** The router sends each task to the *cheapest
   capable* tier by complexity score; cheap-haiku handled 12 of 21 calls for <1.5% of
   cost. A running ledger optimizes throughput-per-dollar (25 → 45 tasks/$ across the run).
4. **It improves itself, bounded.** After each batch it reviews success rate, cost, and
   latency, then nudges *config values only* (never code) within hard guardrails, and
   writes a dated `LEARNINGS.md` entry. Because reliability was 100%, it safely raised
   concurrency, pushed more work onto the cheap tier, and grew batch size.

## The first job (the "proof" task), built into the sandbox
The factory's seeded first job is a real business package for selling **FAMtastic
Designs**, produced as artifacts in `deliverables/`:
- `business-model.md` — model + 7-stage pipeline (conception → marketing → campaigning →
  contacting → selling → fulfillment → **PayPal collection**), GoDaddy email, unit economics.
- `claude-code-prompt-builder.md` + runnable `prompt_builder.py` — the reusable 9-slot builder.
- `shay-shay-v2-spec.md` — Shay-Shay rebuilt from scratch; **unoverridable Prime Directive
  (nothing supersedes Fritz; graceful refusal + notify)**; 4-tier memory + research recall.
- `agent-inspiration-synthesis.md` — best-of-8 (Hermes, Open Jarvis + 6) → adopted patterns.
- `odysseus-optimization.md` — Odysseus as local execution/memory substrate for Shay-Shay v2.
- `system-improvement-audit.md` — bug-log/commit/complaint audit → improvements (reads the
  parent `.wolf/buglog.json` read-only when present).

## Assumptions logged (lowest-risk fork taken at each)
1. **Language = Python stdlib** (sqlite3/subprocess/http) for true zero-dep offline runs.
2. **Nested isolated git** via a separate `.sandbox-git` git-dir so the sandbox has its
   own history without colliding with the parent repo's `.git`.
3. **The six deliverables are encoded as the factory's first queued job**, so building
   the proof *and* proving the factory are the same act — the factory generated them.
4. **All paid/credentialed surfaces are mocked** (LLM, PayPal, GoDaddy) and the LLM live
   path is intentionally *not wired* so the sandbox cannot make a real call. See `SETUP.md`.
5. **Self-improvement tunes `config.json` only**, within `config_guardrails`; committed
   `config.json` is the baseline seed — running the factory evolves a working copy of it.
6. **Agent-inspiration specifics** are summarized from general knowledge; validate against
   current upstream docs before implementing (noted in the deliverable).
7. **System audit** reads the parent bug log read-only if reachable, else uses documented
   assumptions — it never writes outside the sandbox.

## How you extend it
- **Real models:** `.env` ← `OPENROUTER_API_KEY`, set `FACTORY_LIVE=1`, implement the
  marked HTTP call in `src/router.complete()` (spend cap stays enforced).
- **Real task sources:** replace `seed_tasks.py` with an adapter that calls
  `queue.add(kind, payload, complexity, priority)` from a form/CRM/inbox/marketplace.
- **Real payments/email:** add a billing handler (PayPal) and a send handler (GoDaddy)
  using the keys in `.env`; wire them as new task kinds in `src/handlers.py`.
- **New work types:** add a handler to `src/handlers.REGISTRY` — the orchestrator,
  router, ledger, and dashboard pick it up with no other change.

---

## Three questions (only ones that change the next iteration)
1. **Live model layer:** when we go live, is OpenRouter the model gateway you want, or
   should the router target the Anthropic API (latest Claude) directly for the build/design
   tier and keep a cheap local/Odysseus tier for triage?
2. **First real task source:** for the FAMtastic Designs business, what should feed the
   queue first — inbound leads from a site form, an existing CRM/list, or outbound
   campaign replies — so I build that one adapter next?
3. **Autonomy ceiling:** how far should the orchestrator self-tune before requiring your
   sign-off — e.g. is auto-raising concurrency and routing thresholds fine, but anything
   that would enable real spend or real outbound email must hit a Fritz [GATE]?
