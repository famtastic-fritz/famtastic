# SETUP — Running it & wiring real integrations later

## Run it now (offline, zero setup)
No pip install, no credentials. Python 3.8+ standard library only.

```bash
cd agent-factory
python3 run_demo.py        # full proof: seed -> orchestrate -> route -> cost -> self-improve -> dashboard
python3 tests/test_smoke.py   # 5 assertions covering the whole loop
```

Individual pieces:
```bash
python3 seed_tasks.py --burst 20            # add work to the queue
python3 -m src.orchestrator --max-batches 3 # run the supervisor over whatever is queued
python3 -c "from src import dashboard; dashboard.render_terminal(); dashboard.write_html()"
open dashboard/status.html                  # static dashboard (no server)
```

## What is mocked / stubbed in the sandbox
Everything that would cost money or need a real credential is mocked, and documented here:

| Capability | Sandbox behavior | How to make it real |
|------------|------------------|---------------------|
| LLM calls (OpenRouter-style) | **Stubbed** in `src/router.py`. Deterministic mock text, realistic token counts, cost *estimated* into the ledger. No network. | Fill `OPENROUTER_API_KEY` in `.env`, set `FACTORY_LIVE=1`, then implement the real HTTP call at the marked spot in `src/router.complete()`. The hard per-run cap `FACTORY_MAX_RUN_USD` stays in force. |
| PayPal payment collection | Mocked — invoice/webhook flow is described in `deliverables/business-model.md` (Stage 7) but never calls PayPal. | Add `PAYPAL_CLIENT_ID/SECRET` to `.env`; add a billing handler that creates a real invoice and a webhook listener that marks the deal paid. |
| GoDaddy email / sending | Mocked — campaign/contact stages log sends as if delivered. | Add `GODADDY_*` to `.env`; add a send handler. Warm the domain first. |

## Wiring real model calls
1. `cp .env.example .env` and set `OPENROUTER_API_KEY` + `FACTORY_LIVE=1`.
2. In `src/router.complete()`, replace the `_stub(...)` return under the
   `live_enabled()` branch with a real `requests`/`urllib` POST to OpenRouter,
   keeping the spend-cap guard. The price table and tiering already exist.
3. Costs flow into the ledger automatically — no other change needed.

## Wiring a real task source
`seed_tasks.py` is the only thing that knows where tasks come from. Replace it
(or add alongside) an adapter that pulls from your real source — a web form, a
CRM, an inbox, a marketplace — and calls `queue.add(kind, payload, complexity, priority)`.
The orchestrator does not care where tasks originate.

## Running the supervisor as a long-lived process
`python3 -m src.orchestrator` is the supervisor. To run it continuously, loop it
or wrap it in a process manager **inside the sandbox** — but never install it into
the real system crontab (see SANDBOX.md). Its own in-process scheduler
(`src/scheduler.py`) already sets cadence by queue depth.
