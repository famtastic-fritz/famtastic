# Autopilot — Autonomous Faceless Video Business: Rollout Plan

> **Goal:** a self-running content factory that goes from *concept → collection →
> advertising → revenue → learning* with **zero human involvement** in the loop.
> You set credentials once; after that it researches, produces, publishes,
> measures, learns, and reallocates its own budget.
>
> **Operator inputs (locked 2026-06-02):** publish to YouTube Shorts + TikTok +
> Instagram Reels · monetize via affiliate + ad/creator revenue + productized
> client service + build-and-flip · **hard cap ~$5/day** on paid APIs ·
> auto-discover niches by ROI.

---

## 0. The one honest dependency

A tool cannot *legally* publish to platforms you don't own. **The only thing
that requires you** is a one-time credential handshake (below). Until those
exist, every stage runs and the publishing stage produces **ready-to-post
bundles** (MP4 + title + description + hashtags + thumbnail + schedule) in a
queue. The moment credentials are present, the same pipeline goes live —
no code change, no involvement.

**One-time setup (the entire list of things only you can do):**

| # | What | Why | Where it plugs in |
|---|------|-----|-------------------|
| 1 | `OPENAI_API_KEY` (fund ~$5/day) | Scripts + voiceover quality; without it, key-free fallback | vault → producer |
| 2 | YouTube Data API OAuth (your channel) | Auto-upload Shorts | vault → `publisher-youtube` |
| 3 | TikTok Content Posting API app token | Auto-post (or draft-assist if unapproved) | vault → `publisher-tiktok` |
| 4 | Instagram Graph API (Business acct + FB app) | Auto-publish Reels | vault → `publisher-instagram` |
| 5 | Affiliate program IDs (Amazon Associates, etc.) | Description links that pay | vault → `affiliate-matcher` |

Everything below this line is fully autonomous and built by the agent.

---

## 1. Operating model — the five-stage loop

```
        ┌─────────────────────────────────────────────────────────────┐
        │                     AUTOPILOT ORCHESTRATOR                    │
        │        (scheduled tick · budget governor · job queue)         │
        └─────────────────────────────────────────────────────────────┘
            │            │            │            │            │
            ▼            ▼            ▼            ▼            ▼
        CONCEPT  →  COLLECTION  →  ADVERTISING  →  FEEDBACK  →  MONETIZE
        (ideate)    (produce)      (publish)       (measure)    (earn)
            ▲                                          │
            └──────────────  learning loop  ───────────┘
```

### Stage 1 — CONCEPT (auto-discover by ROI)
Decide *what to make* using an explore/exploit bandit over niches.
- **`concept-scout` agent** researches trending + high-buyer-intent topics
  (web search, keyword signals, what's already winning on the channels).
- Scores each candidate: predicted retention × monetizability × novelty,
  minus production cost. Dedupes against everything ever produced.
- Maintains a **niche portfolio** with per-niche performance weights. ~80% of
  daily slots go to proven niches (exploit), ~20% to new bets (explore).
- **Output:** `concepts.jsonl` backlog records → the day's selected batch.

### Stage 2 — COLLECTION (produce the inventory)
Turn concepts into finished, sellable assets — this is where `remotion/`'s
faceless generator does the work.
- **`producer` agent** runs the pipeline per concept: script → voiceover →
  b-roll/background → render MP4. Mostly deterministic code; LLM only for
  script + metadata. **Every call is metered against the $5/day governor.**
- **`editor-qa` agent** auto-evaluates each render (caption legibility, length,
  audio presence, no dead frames) → pass/fail; failures re-queue or downgrade.
- **`seo-packager` agent** writes platform-specific titles, descriptions,
  hashtags, and a thumbnail spec (rendered as a Remotion still).
- **`affiliate-matcher`** injects the best offer link(s) into the description.
- **Output:** `inventory.jsonl` records, status `ready` → MP4 + metadata bundle
  per platform under `autopilot/out/<concept-id>/`.

### Stage 3 — ADVERTISING / DISTRIBUTION (publish + position)
"Advertising" = both *distributing* the videos and *positioning* them to win
the click (hook/title/thumbnail) and to sell (CTA/links).
- **`scheduler` agent** picks optimal post times per platform from performance
  history; spaces posts to look human and respect rate limits.
- **`publisher-{youtube,tiktok,instagram}` adapters** upload via official APIs.
  Credential-gated: **dry-run → staged bundle** until creds exist, then live.
- **`growth` agent** (conservative, ToS-aware) handles first-comment pinning
  with the affiliate link and basic reply triage. *No fake engagement, no
  black-hat — official APIs only.*
- **Output:** `published.jsonl` with platform post IDs + permalink.

### Stage 4 — FEEDBACK (measure + learn)
Close the ROI loop so Concept gets smarter every day.
- **`analyst` agent** pulls views / watch-time / CTR / revenue from platform
  analytics APIs, attributes to concept + niche + hook style.
- Updates the **bandit weights** and writes durable learnings into the existing
  FAMtastic memory pipeline (so insights survive across sessions).
- **Reallocates the $5/day budget** toward winning niches/formats automatically.
- **Output:** `performance.jsonl` + memory entries + updated niche weights.

### Stage 5 — MONETIZE (the four money models, run in parallel)
- **Affiliate:** maintain an offer catalog; match + inject; track click→sale.
- **Ad/creator revenue:** passive once channels cross monetization thresholds;
  analyst tracks progress toward them.
- **Productized client service:** `client-upsell` agent detects FAMtastic site
  clients (from `sites/`), auto-produces branded promo videos in their colors,
  and drafts a delivery+offer email → your outbox. (Lowest-friction real cash.)
- **Build-and-flip:** analyst tracks each channel's growth toward sale-ready
  metrics and flags candidates.

---

## 2. Autonomy & safety (how it runs unattended without blowing up)

1. **Budget governor (hard).** Every paid action requests budget from a daily
   ledger; over cap → the action degrades to the key-free path or defers to
   tomorrow. Cap = $5/day, configurable. Reuses the jobs table cost tracking.
2. **Idempotency + dedupe.** Concept hashes and content fingerprints prevent
   re-making or re-posting the same thing.
3. **Governance gate on irreversible/outward actions.** Publishing, emailing,
   and spending pass through a `checkGovernance()`-style gate with per-action
   policy (auto-approve within limits, else hold).
4. **Circuit breaker / kill switch.** A single `autopilot/STOP` flag (or N
   consecutive failures, or budget anomaly) halts all outward actions; internal
   production can continue into the staged queue.
5. **Dry-run first.** Publishing/email default to dry-run until credentials +
   an explicit `live: true` policy flag are set. Nothing reaches the public by
   accident.
6. **Platform-ToS discipline.** Official APIs only; respect rate limits; no
   engagement faking, no scraping logins. Some platforms gate auto-posting
   behind app review — those degrade to draft/assist mode, documented honestly.
7. **Full audit trail.** Every decision and action appends to dated `.jsonl`
   ledgers; nothing mutates silently.

---

## 3. Agent roster (reuses the existing Claude/Gemini/Ollama adapter pattern)

Cheap models for high-volume reasoning, premium only where it moves revenue.

| Agent | Job | Default brain | Cost posture |
|-------|-----|---------------|--------------|
| `orchestrator` | Conduct the loop, enqueue jobs, enforce budget | code + Haiku | minimal |
| `concept-scout` | Niche/topic discovery, ROI scoring, bandit | Gemini/Haiku | cheap, high-volume |
| `producer` | Run faceless pipeline per concept | code + (LLM script) | metered |
| `editor-qa` | Auto-evaluate renders | code + Haiku | cheap |
| `seo-packager` | Titles/desc/hashtags/thumbnail spec | Haiku | cheap |
| `affiliate-matcher` | Offer catalog match + link injection | code | ~free |
| `scheduler` | Optimal post timing | code | free |
| `publisher-*` | Upload to YT/TikTok/IG | code (API) | free |
| `analyst` | Pull metrics, attribute, learn, reallocate | Haiku | cheap |
| `growth` | First-comment + reply triage (ToS-safe) | Haiku | cheap |
| `client-upsell` | Auto promo videos + draft emails for site clients | code + Haiku | metered |

---

## 4. Delivery phases (each independently shippable & testable)

- **Phase 0 — Foundation (no creds needed):** ledgers, daily **budget
  governor**, **orchestrator** + agent-runner, governance gate, dry-run mode,
  `autopilot tick` CLI, cron/launchd installer, tests. *Runs end-to-end in
  simulation.*
- **Phase 1 — Concept engine:** discovery + ROI bandit + niche portfolio +
  backlog ledger.
- **Phase 2 — Collection engine:** wire `producer` to the faceless generator +
  `editor-qa` + `seo-packager` + thumbnails + `inventory.jsonl`.
- **Phase 3 — Advertising:** publisher adapters (dry-run → live), scheduler,
  staged-bundle output.
- **Phase 4 — Feedback loop:** analytics ingestion (stubbed → live per creds) +
  learning into memory + budget reallocation.
- **Phase 5 — Monetization:** affiliate catalog, `client-upsell`, flip tracking.
- **Phase 6 — Hardening:** circuit breakers, post-evaluation, dashboard/status,
  alerting.

**What gets built first (tonight):** Phase 0 + a runnable slice of Phases 1–3 in
dry-run, so `autopilot tick` already does concept → produce → stage-publish →
simulate-feedback with real artifacts and the budget governor live.

---

## 5. Reuse map — what we build on (grounded in codebase recon)

We extend existing FAMtastic infra instead of duplicating it:

| Need | Reused component | How the autopilot uses it |
|------|------------------|---------------------------|
| Media/render | `remotion/` faceless generator (built 2026-06-02) | `stages/collection.mjs` calls `generateVideoSpec()`; `lib/render.mjs` runs the Remotion CLI |
| Audit ledgers | `lib/famtastic/data-center/index.js` → `appendLedgerRecord()` (pure CJS, secret-redacting) | `lib/interop.mjs` mirrors every event into `autopilot-*` ledgers |
| Run health | `lib/famtastic/autopilot/index.js` → `evaluateRunHealth()` | `orchestrator.mjs` flags stuck/looping ticks |
| Credentials | `platform/vault/vault.sh` (Linux `~/.config/famtastic/vault.d/`) | `lib/vault.mjs` resolves env → vault for keys/tokens |
| Memory/learning | `scripts/session-capture.js` + `scripts/memory-promote.js`, `memory/INDEX.json` | feedback emits `learnings` (memory candidates) for promotion |
| Job dispatch (optional) | `site-studio/lib/job-queue.js` + `lib/db.js` (SQLite) | render/publish can be dispatched as jobs; **not hard-depended on** (needs `better-sqlite3`), so autopilot uses JSONL ledgers to stay runnable everywhere |
| Plans/closeout | `plans/`, `scripts/plans/{audit,closeout}.js`, `registry.json` | this build is registered as a plan with a closeout packet |
| Media routing (future) | `media-studio/lib/index.js` → `buildMuapiPlan()`, model-aliases | for AI b-roll/thumbnail generation in a later phase |
| Coordination | `scripts/agent-checkin.js`, `AGENT-COORDINATION.md` | multi-agent overlap detection (currently paused per CLAUDE.md) |

**What's already built (this session):** Phase 0 foundation + runnable Phases
1–3 + Phase 4 feedback in dry-run/simulation. `node autopilot/cli.mjs tick`
runs the full loop with the budget governor, governance gate, kill switch,
ledgers, and learning loop all live. 7 tests pass.
