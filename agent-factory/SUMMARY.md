# SUMMARY — Agent Factory + NCS7 Proof

> **Fidelity pass (update):** The site was crawled (real sitemap + content
> reconstructed via the public index since the live site 403s automated fetchers and
> sandbox egress is allow-listed) and the recreation was made faithful: the real
> **NCS** and **NIBS** logos are recreated as SVG and shown in the header/footer; the
> real pages (Home, About, NCS Content, Order, Downloads & FAQ, Contact) and real
> content (the **8 UDS modules**, AIA·CSI·NIBS founders, Single/Site/Enterprise
> licensing) drive the site. A **page-by-page comparison** is in
> `docs/ncs7/04-page-by-page-comparison.md` and a **live backend transcript** in
> `docs/ncs7/05-backend-proof.md`. The broken `cad3d` link was replaced with an
> **in-app 3D viewer** (`#/viewer`, global-THREE, no ES modules) that works when
> served, on static hosts, and in the single-file build. A self-contained
> double-click demo is built at `assets/ncs7/ncs7-standalone.html` via
> `node assets/ncs7/build-standalone.js`.


A sandboxed, self-managing multi-agent system that pulls work from a queue, spawns
and retires worker agents on its own, routes each task to the cheapest capable
model, tracks cost, and tunes its own configuration between batches. It was then
pointed at a real business case — modernizing the National CAD Standard NCS7 site —
which it took from prospecting through a built, runnable demo.

Everything lives inside `agent-factory/`. It runs end-to-end **offline with zero
spend** (deterministic model stub) and **zero `npm install`** (Node built-ins +
`node:sqlite`, browser libs vendored locally).

---

## 1. What I built

### The factory (the meta-system)
| Component | File | What it does |
|---|---|---|
| **Orchestrator** | `src/orchestrator.js` | Long-running supervisor. Claims tasks, decides how many/what kind of workers to mint, routes each task, spawns workers as child processes, monitors them, retires idle ones, records batch stats, runs the self-improvement pass, and **schedules itself** (in-process cadence that adapts to queue depth — no OS cron). |
| **Task queue** | `src/queue.js` | SQLite (`node:sqlite`) queue + batch/exec records. WAL mode so many workers read while the orchestrator writes. |
| **Seed** | `bin/seed.js` | Injects sample tasks immediately — the NCS7 pipeline plus a burst of bulk tasks. |
| **Worker agents** | `src/worker.js` + `src/agents.js` | Workers are minted from a **template** on demand (`agents.mint`). Each spawned worker takes ONE task, runs its skill, reports result + modeled cost, and exits. Families: `analyst`, `builder`, `integrator`, `triager`. |
| **Skills** | `src/skills/*` | The actual work: `prospect`, `analyze`, `propose`, `build-*`, `assemble`, and a generic handler for high-throughput types. |
| **Model routing / cost** | `src/router.js`, `src/llm.js` | Estimates per-task complexity, picks the cheapest capable tier (free stub → Sonnet → Opus), and writes a running cost ledger to `logs/COSTS.log`. `llm.js` is OpenRouter-style: live with a key, deterministic offline stub otherwise. |
| **Self-improvement** | `src/selfimprove.js` | After each batch, compares success/cost/latency to targets and adjusts **only** `config/factory-config.json`, each value clamped to declared `_bounds`. Findings logged to `LEARNINGS.md`. Never edits core code. |
| **Observability** | `src/dashboard.js`, `bin/status.js` | `dashboard.html` (auto-refresh) + a terminal readout: active agents, queue depth, throughput, success rate, total cost. |
| **Sandbox guard** | `src/safepath.js` | Refuses any file path that resolves outside `agent-factory/`. |

### The NCS7 proof (the deliverable the factory produced/assembled)
- **Discovery / audit / proposal** — real artifacts in `docs/ncs7/` (`01-discovery.md`,
  `02-audit.md`, `03-proposal.md`), produced by the `prospect`/`analyze`/`propose` skills.
- **React + 3D frontend** — `assets/ncs7/frontend/` recreates the NCS7 site as a
  content-driven React SPA with a Three.js immersive layer (blueprint wireframe planes,
  particle building-lattice, scroll/mouse-reactive grid). No build step; libs vendored.
- **Simple customizable CMS** — `assets/ncs7/cms/server.js` (Node built-ins only):
  page CRUD, **page templates → instantiate new pages**, update existing pages, product
  (CAD-standard) CRUD, content API, stub login, plus an admin UI at `/admin`.
- **AI CMS tutor** — `assets/ncs7/tutor/` + `POST /api/tutor`: an in-product assistant
  that teaches the owner how to run the CMS. Offline retrieval over a 24-entry knowledge
  base now; a real LLM plugs into the same endpoint later.
- **Bonus 3D CAD presentation** — `assets/ncs7/cad3d/`: a CAD drawing exploded into
  stacked floors + discipline layers in Three.js with orbit + explode controls.

---

## 2. How the self-management actually works

**It decides its own workforce.** Each batch the orchestrator looks at the claimed
tasks, maps each to a worker *family*, and mints workers from the template up to the
current concurrency. Idle workers past `idle_worker_ttl_ms` are retired. (In the proof
run it minted up to 10 workers under load and retired down to a handful when drained.)

**It schedules itself.** No system cron. The loop sleeps between batches for an
interval that *shrinks under backlog and grows when idle* (`nextInterval`).

**It spends as little as possible.** `router.estimateComplexity` scores each task;
simple work (triage/classify/summarize/report/prospect/assemble) stays on the free
tier, mid work (analyze, build-tutor) escalates to Sonnet, hard work (propose,
build-frontend/cms/3d) escalates to Opus. Proof run: **24 tier-1 / 2 tier-2 / 4 tier-3**.

**It improves between batches.** It measures success/cost/latency and tunes config
within bounds: scale up under healthy backlog, pull back when drained, escalate models
sooner if reliability dips, favor cheaper tiers if over budget. Proof run tuning:
`batch_size 6→8→10`, `concurrency 2→3→4`, then trimmed to `3` as the queue emptied —
all recorded in `LEARNINGS.md`.

**It is bounded and honest.** Self-modification touches only configuration, never code
(`safepath.js` + the `_bounds` contract). Costs are *modeled* estimates; with no API
key nothing is ever charged and no network call is made.

---

## 3. Proof it runs (captured)

`node bin/demo.js` (reset → seed → run to drain → dashboard):
- **30 tasks processed, 0 failed, 100% success**, 4 batches, total modeled cost ~**$0.012**.
- Workers minted and retired across batches; routing spread across all three tiers.
- Self-improvement adjusted `batch_size`/`concurrency` live (see `LEARNINGS.md`).
- The assembled output `projects/ncs7/build/` was verified to **run**: the CMS server
  served `/`, `/api/content` (6 products), `/admin`, `/cad3d/`, and the vendored
  `three.min.js` — all `200`.
- Demo assets validated: every `.js` passes `node --check`, every `.json` parses, and
  `app.js` JSX compiles under Babel.

Artifacts of the run: `logs/ORCHESTRATOR.log` (every decision), `logs/COSTS.log`
(per-task cost), `LEARNINGS.md` (tuning), `dashboard.html` (status).

> One bug was found and fixed during the run: concurrent worker processes hit
> SQLite `database is locked`. Fix: WAL mode + `busy_timeout` in `src/queue.js`.
> After the fix, the re-run had **0 failures**.

---

## 4. Every assumption logged

**Factory**
- *Own git repo vs. delivery branch:* nested `.git` would break the required push to
  `claude/agent-factory-ncs7-demo-6txdy8`; isolation is enforced by the write-boundary
  (`safepath.js`) instead. Documented in `SANDBOX.md`.
- *SQLite via `node:sqlite`* (experimental, Node 22+) to stay dependency-free.
- *Costs are modeled*, not charged; prices live in `config/models.json`.
- *Stub model is deterministic* — the point is the orchestration, not generation quality.
  Real output quality arrives with a real key.
- *Self-tuning is config-only*, clamped to `_bounds`; core code is never rewritten.

**NCS7 demo (backend assumptions derived from the frontend — for the client to confirm)**
- *Content store:* JSON files now (`content/pages/templates/products.json`), swappable
  to a DB later; the frontend reads `GET /api/content` with a static fallback so it
  never hard-fails.
- *Pages model:* `{slug, title, template, blocks[]}`; templates define the block schema
  so "create page from template" is fill-in-the-blanks for a non-technical owner.
- *Products model:* a CAD-standard chapter = a sellable item `{id,title,summary,price,…}`.
- *Auth:* stubbed (any non-empty creds) → JWT/sessions + roles later.
- *Tutor:* offline retrieval over `knowledge.json` now → same `POST /api/tutor`
  endpoint accepts a real LLM key later with no frontend change.
- *Payments:* out of scope in the sandbox (no money movement) → Stripe on product/
  subscription later.
- *3D CAD:* a generated sample drawing now (no real PDF provided) → pdf.js ingestion of
  a real uploaded PDF later, documented in `assets/ncs7/cad3d`.
- *Browser libs vendored locally* (React, ReactDOM, Babel standalone, Three.js r160)
  because the container blocks public CDNs and the demo must run offline. Google Fonts
  is the only remaining external ref and degrades to system fonts.

---

## 5. How to extend it

**Real models.** Put `OPENROUTER_API_KEY` in `.env`. `src/llm.js` switches from stub to
live automatically; update prices in `config/models.json`. Router, queue, workers, and
the self-improvement loop are model-agnostic — nothing else changes.

**Real task sources.** Anything that can insert a row can feed the factory:
`queue.enqueue({type, payload, priority})`. Wire a webhook, a CRM export, an email
scraper, or the `prospect` skill's own candidate output (it emits look-alike prospects,
so the motion that "found NCS7" can run continuously to fill the pipeline). See
`bin/seed.js` for the shape.

**New skills.** Add a handler in `src/skills/`, register it in `src/skills/index.js`,
and give it a complexity baseline in `router.estimateComplexity`. The orchestrator will
mint and route to it with no other changes.

**The NCS7 demo for a real client.** Run `node assets/ncs7/cms/server.js` and open the
printed URL; admin at `/admin` (stub login). Migrate their real chapters into
`products.json`/`content.json`, add auth + Stripe, plug a real LLM into the tutor, and
feed real PDFs into the CAD 3D pipeline. See `assets/ncs7/README.md`.

---

## File map (quick)
```
agent-factory/
  SANDBOX.md SETUP.md SUMMARY.md README.md LEARNINGS.md
  config/{factory-config,models}.json
  src/{orchestrator,queue,router,llm,worker,agents,selfimprove,dashboard,safepath,util}.js
  src/skills/{prospect,analyze,propose,build,assemble,generic,index,_lib}.js
  bin/{seed,run,status,demo}.js
  docs/ncs7/{01-discovery,02-audit,03-proposal}.md   ← business deliverables
  assets/ncs7/{frontend,cms,tutor,cad3d}/            ← the runnable demo
  logs/{ORCHESTRATOR,COSTS}.log  data/factory.db  dashboard.html  (generated)
  projects/ncs7/build/                               ← factory-assembled demo (generated)
```
