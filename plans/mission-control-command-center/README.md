# Mission Control / Command Center

One place to see everything in flight, scored and ranked, on your phone.

## What it is

`scripts/command-center/build-command-center.js` reads the live ledgers in this
repo and emits three artifacts under `command-center/`:

- **`index.html`** — a self-contained, mobile-first dashboard. KPI tiles, a
  "Needs you now" list, a plan-health doughnut, and an **autonomy × profit**
  quadrant (top-right = let it run). Charts via Chart.js CDN.
- **`briefing.md`** — the "Virtual Fritz" daily read: what needs you first, the
  most profitable next move, and the most autonomous win.
- **`state.json`** — the full computed snapshot for other surfaces (Studio Ops,
  Shay Desk) to consume.

## Run it

```bash
node scripts/command-center/build-command-center.js
```

## Data sources (read-only)

`plans/registry.json`, `tasks/tasks.jsonl`, `runs/runs.jsonl`,
`proofs/proof-ledger.jsonl`, `agents/catalog.json`,
`platform/registry/capabilities.json`, and the `sites/` directories.

## Scoring (tunable)

Edit the `SCORING` block at the top of the generator.

- **Stage** — `in_progress` / `checkpoint` / `checkpoint_stale` / `needs_tasking`
  / `blocked_external` / `stale` / `completed`, derived from open tasks, the
  latest closeout verdict, blocker text, and momentum.
- **Momentum** — days since the latest closeout/registry update.
- **Autonomy (0–100)** — how much can proceed without Fritz: auto-approval,
  an assigned runner, and no external (creds/access/money) blocker raise it.
- **Profit (0–100)** — revenue-proximity by tag/role; site-execution and
  deploy/release work rank highest, platform substrate is mid, governance low.

## Related

- `docs/shay-fritz-ready/ROADMAP.md` — how each capability Shay needs maps onto
  this scorer.
- `platform/capabilities/billing/` and `platform/capabilities/work/` — the
  invoice and work-ops capabilities this plan tracks toward autonomy.
