---
title: SITE-LEARNINGS
type: note
permalink: shay-memory/repo-docs/site-learnings
---

<!-- mirrored 2026-06-15T15:16:44.100926 from ~/famtastic/SITE-LEARNINGS.md -->

# FAMtastic Ecosystem — Site Learnings

## Shay capability matrix — ChatGPT Pro planning reminder + guardrail audit nuance (2026-06-15)

Updated the Shay capability-truth surfaces in `~/famtastic/shay-shay/` so ChatGPT Pro is now represented explicitly as `chatgpt-pro-planning-lane` instead of remaining an implicit/manual habit. The matrix record lives in `shay_cli/intelligence_seed.py` with status `documented_only`: it is available now because Fritz has ChatGPT Pro capacity, but it is not a live Shay tool surface (`installed/configured/live = false`) and must be treated as an external manual lane. The policy was then refined to match Fritz's correction: this is an optional reminder lane for major planning/architecture work, not a forced routing rule. Shay should surface it when the scope is big, but keep the current route unless Fritz actually chooses the ChatGPT Pro lane.

Routing/decision logic was updated in both `shay_cli/capabilities_cmd.py::build_decision()` and `shay_cli/intelligence_cmd.py::route_task()`. Explicit ChatGPT planning asks now resolve to `chatgpt-pro-manual` with status `documented_only`, while generic major-planning asks get a reminder-only suggestion instead of a hard route change; both paths still say the same honest thing about adoption: ChatGPT-Web-authored guardrail, approval, or autonomy logic is draft material that needs a guard-rails audit and rewrite before it becomes Shay runtime policy. Verification coverage was updated in `tests/test_capabilities_cmd.py` and `tests/test_intelligence_layer.py`, and the provider brief now prints `ChatGPT Pro planning lane: documented_only (manual external lane; optional reminder for major planning)` so the cost-saving lane stays visible without turning into control theater.

## FAMtastic Hosting — local QA fix wave: DB runtime restored, cart/auth verified (2026-06-13)

Restored the local FAMtastic Hosting commerce/auth stack in `~/famtastic/sites/site-famtastic-hosting/` after QA found every write path failing behind a missing local MySQL runtime and an Astro env-loading mismatch. Local MySQL now runs in Docker (`famtastic-hosting-mysql`) with schema/seed applied from `db/schema.sql` and `db/seed.sql`; direct MySQL proofs confirmed `cart_items`, `users`, and `sessions` writes before re-testing the app layer. The actual app fix was in `src/lib/db/pool.ts`: the pool now loads `.env` explicitly via `dotenv.config()` so Astro server routes can see `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, and `MYSQL_PASSWORD` during local dev instead of dying on `Missing environment variable: MYSQL_HOST`.

Verified live on local Astro dev (`npm run dev -- --host 127.0.0.1 --port 4321`): `POST /api/cart/add` now returns 200 and persists cart rows; `GET /api/cart` reflects the added item; `POST /api/auth/register` returns 201 and creates a user; `POST /api/auth/login` returns 200 and lands on `/dashboard`; browser proof confirmed Hosting page `+ ADD TO CART` updates the cart badge/drawer and dashboard sign-in/sign-out work end-to-end. `src/components/auth/LoginForm.svelte` was also corrected to stop advertising a fake `/dashboard/forgot-password` route — the dead link was replaced with honest support copy because no recovery route/page exists yet.

Known gaps after this wave: local dev now depends on the Docker MySQL container being up before testing write paths; GoDaddy shopper creation still logs `Not Found` during registration and continues without `godaddy_shopper_id`; there is still no real forgot-password/reset-password flow; dashboard nav still emits existing Svelte a11y warnings (`DashboardNav.svelte` role issues) that do not block auth/cart function.

## FAMtastic Hosting — canonical repo + GoDaddy deploy preflight (2026-06-11)

The canonical local repo for `famtastichosting.com` is `~/famtastic/sites/site-famtastic-hosting/` tracking `git@github.com:famtastic-fritz/famtastic-hosting.git`. A duplicate local checkout exists at `~/famtastic/famtastic-hosting/`; that sibling is not deploy truth and should be treated as drift unless deliberately resynced. Lesson: before any GoDaddy/cPanel deploy, prove repo truth first — `pwd`, `git remote -v`, `git status --short --branch`, `git fetch origin`, and `git rev-list --left-right --count origin/main...HEAD`.

This matters because the live hosting deploy is SSR-aware and stateful: `deploy.sh` builds locally, rsyncs `dist/client/` to the Apache docroot, rsyncs the SSR runtime to `/site/dist/`, syncs `package*.json`, `.env`, `scripts/migrate-db.js`, and `start.sh`, runs `npm ci --omit=dev` server-side, rewrites Astro `file://` paths under `dist/server/*.mjs`, and restarts Node on `127.0.0.1:3001` behind `proxy.php`. If you deploy from the wrong local checkout, GoDaddy debugging becomes fake debugging — you're chasing repo-path ambiguity instead of the server.

## Brain Sync Contract + session-to-brain tying (2026-06-02)

The Obsidian brain is `obsidian/` on `main` (vault with smart-connections plugin;
`Shay-Memory/` holds 202+ notes — builds, plans, reflections, research). Sessions must
leave a trace there tied to their id. Enforcement: `scripts/brain/session-checkpoint.js`
(dependency-free, never throws) is wired into `.claude/settings.json` hooks —
**SessionStart** creates `obsidian/05-Captures/sessions/<date>/SESSION-<short-id>.md`
(frontmatter: `session_id` from `CLAUDE_CODE_SESSION_ID`, `branch`, `start_sha`, timestamps);
**PreCompact** appends a checkpoint line (this is the "periodic" guarantee — long sessions
compact); **Stop** appends the git delta (commits in `start_sha..HEAD`) and marks the note
ended. The agent still writes the "What this session did" substance per the contract in
`CLAUDE.md` ("Brain Sync Contract"). Convergence rule: if a branch predates `obsidian/` on
main, merge `origin/main` before brain work or notes hit add/add conflicts.

**Why it exists:** a 48h audit found four 2026-06-02 Claude Code sessions siloed — three
branched from a 2026-05-29 base (before the vault landed 05-30), wrote only to per-branch
`SITE-LEARNINGS`/`CHANGELOG`/`.wolf`, and none merged to main, so the brain got zero of that
day's Claude Code work. Shay (on `main`) writes cleanly to `obsidian/Shay-Memory/` — the model
to match. Full reconciliation in `obsidian/05-Captures/sessions/2026-06-02/INDEX.md`.

## humanize-writing skill (2026-06-02)

Installed from `github.com/aaaronmiller/humanize-writing` (commit 4b59839) to BOTH
`.claude/skills/humanize-writing/` (Claude Code) and `shay-agent-os/skills/humanize-writing/`
(Shay). It's a standing prose-output filter — strips AI tells, normalizes burstiness/sentence
rhythm, calibrates voice; auto-activates for any written output over ~3 paragraphs. **Must load
every file in `references/` before applying.** Registered in
`obsidian/06-Capabilities/Agent-Capability-Matrix.md`, `docs/capability-registry.md`, and
Shay's `shay-agent-os/AGENTS.md` (standing output filter). NOTE: Shay ≠ `site-studio/shay-shay/`
(that's the Studio chat persona); her real home is `shay-agent-os/` + `~/.shay/`.

## Autonomous content engine (2026-06-02)

`scripts/content-engine/` — Fritz's chosen hands-off revenue path (he explicitly does not want to be involved). A quality-gated SEO/affiliate content site generator that runs on a cron. Pieces: `config.json` (niche, long-tail keywords, monetization, quality gate, deploy target), `lib.js` (helpers + graceful BrainInterface loader), `generate-article.js` (one article per keyword, production path = `site-studio/lib/brain-interface.js` `BrainInterface.execute()`, **deterministic template fallback when network/LLM unavailable** — never crashes), `assemble-site.js` (articles/*.md → static `dist/`: per-article HTML + index + sitemap.xml + robots.txt), `run.js` (orchestrator → `results/<date>.json`, idempotent/cron-safe — skips existing articles), `publish.sh` (honest deploy stub: prints the exact `netlify deploy`/GH-Pages command + crontab line; deploy runs on Fritz's Mac with a vaulted token).

Quality gate is REAL (rejected a filler test article with 6 reasons): min 700 words, ≥3 H2, FTC disclosure required, FAQ required, ≤4% filler-phrase ratio, banned-phrase list — built to survive Google's "scaled content abuse" policy. Niche = **backyard chicken keeping** (chosen from `NICHE-AND-MONETIZATION.md`: non-YMYL, durable demand, Amazon + display-ad fit; stay on gear/husbandry NOT vet diagnosis). Generated output (`articles/`, `dist/`, `results/`) is **gitignored** — regenerated on Fritz's Mac with the real LLM; the engine code is the deliverable. Proof: ran offline → 9 articles, all gate-PASS, 10-page site, disclosure + `rel="nofollow sponsored"` links verified.

**Honest gaps (do-not-misstate):** revenue is a months-long compounding ranking game (~$0 early); ad/affiliate networks pay to a BANK account, not Cash App (so the `$FAMtasticFritz` cashtag does NOT apply here); and the Amazon Associates / ad-network accounts + domain are one-time steps that are legally Fritz-only — an agent cannot create a monetization account as him. Tracked on the board as plan `autonomous-content-engine`.

## Money rails: Cash App billing + credential skill + Resend runbook + security (2026-06-02)

**Owner payment identity (brain fact, 2026-06-02)** — Fritz's Cash App cashtag is **`$FAMtasticFritz`** (Fitzgerald Medine, `https://cash.app/$FAMtasticFritz`). Stored canonically at **`platform/config/owner-profile.json`** (`payment.cashapp.cashtag`) — public receive-info, committed to git (not the vault). `generate-invoice.sh` reads it via the `OWNER_PROFILE` env var and auto-fills it when a `cashapp` invoice omits `cashtag`. This is the single source of truth for "where does FAMtastic get paid."

**Cash App billing** — `platform/capabilities/billing/generate-invoice.sh` gained an optional `payment` block in `invoice-spec.schema.json`: `{ method: "cashapp"|"link"|"manual", cashtag (^\$[A-Za-z][A-Za-z0-9_]{0,19}$), link, instructions }`. `cashapp` renders a pay line + `https://cash.app/<cashtag>/<amount>` + a bare-profile fallback; `link` renders a provided hosted URL; absent/`manual` keeps the legacy `**Payment:**` line (byte-for-byte backward compatible — old specs just gain `"payment": null`). **Honest caveat (do-not-misstate):** the `cash.app/$cashtag/<amount>` amount-prefill is NOT an officially documented Cash App feature — only `https://cash.app/$cashtag` is official. For a locked amount, create an in-app Cash App Payment Link and use `method:"link"`. Example: `examples/sample-engagement-cashapp.json`.

**register-credential skill** — `.claude/skills/register-credential/SKILL.md` (user-invocable) is the one sanctioned way to vault a secret and verify the dependent capability. Backed by `platform/capabilities/vault/register-credential.sh`: a friendly-name→canonical-vault-key allowlist (resend→`studio.resend.api_key`, godaddy, netlify, telegram, twilio, jira, github, cpanel, reach-*), reads the secret from `CRED_VALUE` env or stdin (NEVER argv, to avoid shell-history leakage), **never echoes the value**, writes a value-free audit line to `platform/invocations/`. Registered as `vault.register-credential` (registry now 24). NOTE: not yet wired into the `platform vault` dispatcher subcommand — invoke by direct path (documented in the skill + runbook); one-line follow-up to add the subcommand.

**Resend go-live runbook** — `docs/runbooks/RESEND-REACH-GO-LIVE.md`: exact on-Mac steps (`printf '%s' '<key>' | ./platform/capabilities/vault/register-credential.sh resend`, then `node lib/reach-fabric/selftest.js`, then `./platform/capabilities/reach/send.sh "..." --channels=email`). Explains why it CANNOT run from the cloud sandbox: the vault is macOS-Keychain-backed (local), and the sandbox network is firewalled — `curl https://api.resend.com` returns 403, same as every external provider/data API. **This firewall is a standing environment fact for cloud sessions: no real outbound email/SMS/market-data/payment from here; those run on Fritz's machine.**

**Security exposure** — recon for the Resend key found ALL production secrets in plaintext in the Drive doc "FAMtastic API's" (Resend, Anthropic, OpenAI, OpenRouter, GitHub PAT, Netlify, GoDaddy/cPanel, MySQL pw, Gemini, Pinecone, Perplexity, fal.ai, ElevenLabs, Unsplash pw). Logged at `docs/SECURITY-CREDENTIAL-EXPOSURE-2026-06-02.md` (classes + rotation checklist, no values). No secrets are committed to git. **Fast-cash playbook** at `docs/shay-fritz-ready/FAST-CASH-TODAY.md` (ranked same-day $100 plays; #1 = collect on already-owed work, frictionless Cash App pay line).

## Reach Fabric + Companion App PWA + financial agents (2026-06-02)

**Reach Fabric** — `lib/reach-fabric/` is the channel-agnostic outbound bus the landscape research called for. `index.js` exports `sendReach({message,title,urgency,channels})`: it resolves channel order (explicit `channels` pin, else the urgency policy in `config.js` for low/normal/high/critical), tries each *available* adapter in turn, stops at first success, always appends `console` as the terminal fallback, and writes a JSONL audit line to `platform/invocations/<date>.jsonl`. Returns `{ delivered_via, attempts[], fellback, manual_required, audit_written }`. Adapters live in `lib/reach-fabric/adapters/` and each exports `{ name, isAvailable(), send() }`: `console` (always), `email` (Resend via `RESEND_API_KEY`, default sender `studio@send.mbsh96reunion.com`), `telegram` (`TELEGRAM_BOT_TOKEN`+`TELEGRAM_CHAT_ID`), `sms` (Twilio `TWILIO_*`+`REACH_SMS_TO`), `push` (Web Push/VAPID, lazy-requires optional `web-push`). Adapters return reason strings instead of throwing when creds are absent, so the fallback chain always completes. CLI: `lib/reach-fabric/cli.js`; capability shim `platform/capabilities/reach/send.sh` (`platform reach send "<msg>" [--title=] [--urgency=] [--channels=]`) hydrates vaulted reach secrets into env and falls back to `studio.resend.api_key`. Registered as `reach.send` (registry now 23 capabilities). `selftest.js` strips creds and asserts console fallback + audit line — passing. Live today: console always; email+telegram the moment their env vars exist. manual_required: sms (Twilio number), push (pair the companion app + VAPID keypair + `web-push`).

**Companion App PWA** — `companion-app/` is a no-build, dependency-free installable PWA: the pocket version of talking to your second-in-command. `index.html` has a Chat view (streaming-reveal bubbles, persisted to `localStorage`) and a Today view; `app.js` resolves a pluggable `CHAT_ENDPOINT` (`window.SHAY_ENDPOINT` → `<meta name="shay-endpoint">` → built-in mock that labels itself "(mock — no backend wired)"), POSTs `{message, history}`, and renders `reply`/`text`/`message`/`content`. The Today tab fetches `./state.json` (a copy of `command-center/state.json` — re-copy/symlink when the dashboard regenerates) and renders KPIs + "Needs you now" + ⭐ priorities, with "Ask Shay →" deep-links. `manifest.webmanifest` (standalone, theme `#0b0e14`, SVG + 512 PNG maskable icon under `icons/`) + `sw.js` (cache-first app shell, network-first `state.json`) make it installable + offline. Run: `cd companion-app && python3 -m http.server 8099`, open `http://<LAN-IP>:8099/` on the phone, Add to Home Screen. Verified serving 200s for shell/manifest/sw/icons/state.json.

**Financial agents** — `scripts/finance-agents/` is greenfield (a brain grep found zero prior financial/trading code — all "trading/stock/crypto" hits were stock photos / job queue / UI "portfolio"). `data.js` fetches keyless **Stooq** daily CSV (`https://stooq.com/q/d/l/?s=<sym>&i=d`) with a `.cache/` write-through (gitignored) and a labeled SAMPLE fallback under `sample-data/`. `agents.js` defines 6 pure-function strategy agents (momentum, mean-reversion, SMA10/20 trend-follow, buy-&-hold SPY baseline, equal-weight basket, volatility-breakout), each emitting a prediction + a $10-stake outcome for the latest session. `run.js` prints a leaderboard and writes `results/<date>-leaderboard.json` + `<date>-report.md`. **Environment gotcha (do-not-misread):** in this cloud container Stooq is firewalled (HTTP 403, "host not in allowlist") even with the sandbox disabled, so the run falls back to SAMPLE data and labels it loudly (`"isSampleData": true`, console + report banner). The committed `results/2026-05-29-*` are therefore SYNTHETIC, not real market prices — on Fritz's open network `node scripts/finance-agents/run.js` pulls real Stooq data automatically. One session is noise; the harness is built to run daily and aggregate. Live brokerage (Alpaca paper API) is manual_required, gated on broker creds. OSS to know later: `virattt/ai-hedge-fund`, `TauricResearch/TradingAgents`, `microsoft/qlib`, `freqtrade`, `backtrader`.

## Command Center / Mission Control + Shay billing & work-ops capabilities (2026-06-02)

Shipped the workshop dashboard / Mission Control v1 and two new Shay platform capabilities.

**Command Center generator** — `scripts/command-center/build-command-center.js` (no external deps, run from repo root). Read-only aggregator over the live ledgers: `plans/registry.json` (active = `active_parent_ids` minus `terminated_parent_ids`, matching `scripts/plans/audit.js`), `tasks/tasks.jsonl`, `runs/runs.jsonl`, `proofs/proof-ledger.jsonl`, `agents/catalog.json`, `platform/registry/capabilities.json`, and the `sites/` + `../famtastic-sites/` directories. Per-plan it reads the latest closeout packet from `plans/<id>/closeouts/` and computes: **stage** (`in_progress`/`checkpoint`/`checkpoint_stale`/`needs_tasking`/`blocked_external`/`stale`/`completed`), **momentum** (days since latest closeout/registry update), **autonomy** (0–100: auto-approval + assigned runner + no external blocker raise it), and **profit** (0–100: revenue-proximity by tag/role). Emits `command-center/{index.html, briefing.md, state.json}`. `index.html` is self-contained, mobile-first, Chart.js via CDN (plan-health doughnut + autonomy×profit scatter). `briefing.md` is the "Virtual Fritz" daily read (needs-you / most-profitable / most-autonomous). `state.json` is the machine snapshot for Studio Ops / Shay Desk to consume. Scoring lives in the `SCORING` constant at the top of the generator and is meant to be tuned. Tracked as plan `mission-control-command-center` (5 open tasks). Command-center output files ARE committed (the deliverable); the dashboard treats the new plan as the only one in motion.

**Shay billing capability** — `platform/capabilities/billing/` follows the `platform/capabilities/<class>/<verb>.sh` pattern (resolves PLATFORM_ROOT/HUB_ROOT, `set -euo pipefail`, appends audit lines to `platform/invocations/<date>.jsonl`, surfaces `manual_required` explicitly, no external API calls). `generate-invoice.sh` (status `v1-no-send`) does real end-to-end invoice math (line totals, flat/percent discount, tax on discounted base, derived invoice number `FAM-<YYYYMM>-<slug>`, issue/due dates) and writes `<num>.json` + `<num>.md` + upserts `platform/billing/ledger.jsonl`. `list-invoices.sh` (`v1`) and `mark-paid.sh` (`v1-manual-confirm`, draft|sent→paid) round out the state machine. Input contract: `invoice-spec.schema.json`; sample at `examples/sample-engagement.json` ($397/mo care plan for Tony's Barber Shop). Send/PDF/payable-link are `manual_required` until a payment provider (PayPal vs Stripe vs GoDaddy) is chosen — `reads_from_vault` is intentionally empty. Runtime output under `platform/billing/` is gitignored.

**Shay work-ops capability** — `platform/capabilities/work/` lets Shay draft Jira ticket replies and team standups with a **hard human-approval-before-send gate** (auto-send disabled in code; `outbox send` is intentionally inert). `draft-ticket-reply.sh` and `draft-standup.sh` (both `v1-draft-only`) do real deterministic drafting — `draft-standup.sh` reads `runs/runs.jsonl` + `tasks/tasks.jsonl` when no input JSON is given — writing to `outbox/<draft_id>.json`. `outbox.sh` runs the `draft→approved` state machine. Schemas under `schemas/`, samples under `examples/`. Send is `manual_required` pending vaulted `jira.api_token`/`jira.base_url`/`jira.email` (+ optional `slack.webhook`). Drafting is deterministic (no LLM call) — an LLM rewrite pass is the natural v2. Runtime drafts (`outbox/*.json`) are gitignored; `.gitkeep` is tracked.

**Registry** — all six new capability records merged into `platform/registry/capabilities.json` (now 22 capabilities). **Roadmap** — `docs/shay-fritz-ready/ROADMAP.md` ranks Shay's Fritz-readiness gaps by autonomy×profit (payment-provider decision first, then invoicing, then two-way digest / phone companion).

**Fritz-priority tracking (same-day follow-up)** — the generator now reads a `fritz_priority`/`priority: "high"` field on a plan record or its registry label and treats *Fritz's stated priority* as a first-class signal distinct from the profit heuristic: a ⭐ KPI tile, a ⭐ card badge with a gold accent, a "Your priorities" section at the top of `briefing.md`, and priority-first ordering in both the cards and the needs-you list. Two high-priority product plans were registered (`shay-omnipresent-assistant`, `fritz-companion-app`) with 4 open tasks each, so the board finally shows work in motion. A background research workstream writes `docs/shay-fritz-ready/VIRTUAL-ASSISTANT-LANDSCAPE.md` (omnipresent-assistant landscape: products, OSS building blocks, reach/notification fabric, virtual-body options, recommended build-on stack).

## Agent OS — Software Design Document & Architecture Foundation (2026-05-27)

Created a comprehensive Software Design Document for the Agent OS multi-agent orchestration system. The SDD lives at `~/famtastic/docs/AGENT-OS-SDD.md` (26KB, 12 sections). Rowboat (14.6K stars) is the intended fork base. ECC (affaan-m/ECC hackathon winner) was deep-researched for architectural patterns — buddy consensus, inter-agent Telegram bus, agent taxonomy — but has zero source code, so it serves as pattern reference only.

**Architectural decisions captured:** Redis-backed message bus (replace Rowboat's default messaging), functional agent naming (no emojis/animals), trust mode spectrum (`paranoid` → `cautious` → `trusted` → `godmode`) with buddy consensus via NAND gate, `/goal` loop engine (judge model, turn budget, fail-open defaults), swarm execution with configurable parallelism and backpressure, heartbeat protocol (30s intervals, dead agent detection at 90s), and reporter agent for human narration.

**Agent taxonomy defined:** Orchestrator tier (plan/delegate/verify/reporter) using Claude 4 / Kimi k1 / Codex, Worker tier (cheap/code/reasoning/local/vision/web) using Qwen 1.5B / Phi-4-mini / Hermes 3B / DeepSeek-R1, and Studio Bridge agents (site/media/component) calling fam-hub APIs.

**Model registry includes cost-per-1M tokens and capability tiers.** Qwen 2.5 1.5B and Phi-4-mini 3.8B are primary free local workers via Ollama. Kimi k1 at $0.60/M is the reasoning orchestrator. Codex at $1.50/M is the code worker. Claude 4 Opus at $15.00/M is reserved for planning/verification only.

**Implementation phases:** Phase 0 (fork Rowboat + Redis + Ollama workers), Phase 1 (orchestration + trust modes + heartbeat + dashboard shell), Phase 2 (studio bridges + revenue agents + cost tracking), Phase 3 (500-agent scaling + advanced routing + notifications).

**Known gaps recorded:** Kimi API key not yet acquired; Claude Code auth intermittent; no notification system built; Redis not yet running; ECC has no source code; Open WebUI still uninstalled but now explicitly deprioritized in favor of custom dashboard.

**Related artifacts:** `~/famtastic/docs/AGENT-OS-SDD.md`, `~/famtastic/obsidian/Projects/Agent-OS-Handoff-2026-05-27.md`, `~/.shay/session-checkpoints/agent-os-session-20260527-174734.json`.

## FAMtastic Hosting — Auth + Dashboard System (2026-06-10)

All 7 integration tasks completed in a single autonomous run. Status upgraded from `ready_for_integration_phase` to `production_ready`.

**Files built:**
- `api/server.py` — FastAPI server on port 8643, CORS for dashboard on 5174
- `api/routes/agents.py`, `tasks.py`, `events.py`, `trust.py` — REST endpoints
- `api/websocket.py` — WebSocket event broadcaster
- `bridges/site_bridge.py`, `media_bridge.py`, `component_bridge.py`, `base_bridge.py` — Studio bridge stubs with graceful fallback
- `reporter/heartbeat.py`, `status_reporter.py`, `blocker_detector.py` — Health monitoring, stale-worker detection, escalation
- `cron/autonomous-run.yaml`, `cron/run-autonomous-check.sh` — Cron configuration every 5 minutes
- `tests/e2e/test_goal_loop.py`, `test_error_recovery.py`, `test_trust_mode.py` — 14 E2E tests
- `components/dashboard/src/hooks/useDashboardStore.ts` — Added `syncTrustMode()`, `setTrustModeRemote()`, `fetchAgents()`, `fetchTasks()`, `checkApiHealth()`
- `components/dashboard/src/App.tsx` — Added `ApiPoller` component for 5s polling loop
- `components/dashboard/src/components/Sidebar.tsx` — Trust mode selector wired to `/api/trust`, shows API connection indicator

**Test results:** 20/20 pass (14 E2E + 6 unit/integration). Tested: goal decomposition with Ollama subgoals, async goal polling, trust mode gates (paranoid blocks, godmode allows, cautious triggers), error recovery retry/escalation, message bus pub/sub, worker pool task submission.

**Blockers resolved:** `test_swarm.py::test_trust_mode` failed because system `~/.shay/trust-mode.json` had `level: trusted` persistently. Fixed test to use an isolated temp config via `TrustMode(config_path=...)`. Queue order test `test_message_bus` failed because previously seeded Redis keys polluted the test; flushing `swarm:queue:test_queue` and `swarm:state:test_key` resolved.

**Known gaps (updated):** Studio bridges are stubs — actual `fam-hub site`, media generation API, and Component Studio integration pending. WebSocket event stream not yet consumed by dashboard (only polled REST). Worker pool hardcoded to 3 workers; scaling to 500 needs architecture work. Dashboard `ActivityPanel` is not yet real-time via WS. `launchd` plist for cron is documented but not activated.

**How to run:**
```bash
# API server
cd ~/famtastic/shay-agent-os && python3 api/server.py
# Dashboard dev
cd components/dashboard && npm run dev
# Tests
python3 -m pytest components/swarm/test_swarm.py tests/e2e/ -v
# Heartbeat once
python3 -m reporter.heartbeat --once
```

## Final pre-Phase-2 consolidation and archive cleanup (2026-05-21)

The active plan of record for the next work cycle is `plans/PHASE2-VISUAL-WORKFLOWS-BRAND-SYSTEMS.md`. A final pre-Phase-2 cleanup harvested broader pre-Shay-Shay worktree material into `docs/archive/pre-shay-shay/full-snapshots/` instead of merging stale app/UI work wholesale. The archive includes the convergence dossier docs/process and studio-execution research snapshot, experimental agent/bootstrap skills from the adoring-merkle Claude worktree, and temporary Site Studio stubs from great-gauss as reference-only evidence.

Phase 2A now has concrete starting inputs tracked in main: `brand/FAMTASTIC-BRAND-MARK.md` records the current FAMtastic brand mark manifesto/production rules, and `remotion/` contains the current FAMtastic logo motion composition source and recipes. Bulk MuAPI logo/media WIPs from the epic-mclean worktree were preserved in the local cleanup archive and indexed by `docs/archive/pre-shay-shay/local-artifact-manifests/epic-mclean-muapi-logo-outputs.md` rather than committed as large binary output. Local nested repos/probes such as `shay-shay/`, `shay-desktop*/`, `_tool-probes/`, and generated Remotion output are intentionally ignored by the hub repo; useful conclusions must be promoted into docs, Data Center records, plans, or separate repos before they count as incorporated.

## Post-evaluation contract and Phase 1 opportunity forecast (2026-05-21)

Added the shared post-evaluation substrate at `lib/famtastic/post-eval/index.js`. It exports `buildPostEval()`, `recordPostEval()`, `listPostEvalRecords()`, `extractPhaseOneOpportunitySeeds()`, and `renderPostEvalReport()`. Post-eval records write sanitized JSON to `data-center/post-eval/<evaluation_id>.json`, Markdown reports to `data-center/reports/post-eval/<evaluation_id>.md`, and ledger rows to `data-center/ledgers/post-eval.jsonl`; `lib/famtastic/data-center/index.js` now treats `post-eval/` and `schemas/post-eval-record.schema.json` as first-class Data Center structure.

`Mission Control` now reads post-eval records via `lib/famtastic/mission-control/index.js` and exposes `summary.post_eval`, `post_eval[]`, opportunity counts, and high-priority counts. `scripts/mission-control-report.js` renders post-eval counts and recent post-eval records in the CLI status view. `scripts/post-eval-phase1.js` runs the Phase 1 foundation post-evaluation and Phase 2 opportunity forecast against the real closeout, Phase 2 plan, and live Perplexity research proofs.

The live Phase 1 post-eval produced `data-center/reports/post-eval/posteval_phase1_20260521.md` and identified 15 opportunities, including: mandatory post-eval closeout for all studio jobs, research-first post-eval skill/workflow, Media Studio brand/logo workflow skill, Site Studio build/edit/enhance workflow skill, FAMtastic logo/brand prompt recipe, research-backed asset prompt enhancer, component decomposition before generation, cross-studio request/response broker, visual workflow prototype surface, and Second Brain promotion rules. Verification lives in `tests/post-eval-tests.js`, expanded `tests/mission-control-tests.js`, and expanded `tests/data-center-tests.js`.

## Wave 7 Site Studio quality-flow hook (2026-05-21)

Added the shared Site Studio quality-flow module at `lib/famtastic/site-quality-flow/index.js`. It exports `extractPlatformNeeds()`, `buildCrossStudioContract()`, and `buildSiteQualityFlowContext()`. The module turns a site spec/user message into research, Media Studio, and Component Studio needs, then emits a prompt-ready `SITE QUALITY FLOW` block that encodes the platform contract: research first, search/reuse before generate, route specialized needs to the owning studio, return structured results to the caller, record proof in Data Center, and save reusable output back to the owning studio.

`site-studio/server.js::buildPromptContext()` now calls `buildSiteQualityFlowContext({ hubRoot: HUB_ROOT, spec, userMessage, requestType, maxComponentCandidates: 3 })` and appends `siteQualityFlow.promptBlock` to `briefContext`. This means Site Studio build prompts now include build-time media requests (hero image, gallery assets, video/motion, logo/brand assets), component reuse requests (slideshow/gallery/carousel, hero, testimonials, pricing), Component Studio search-before-build candidates from `buildComponentReuseContext()`, and dry-run Media Studio planning language that explicitly says not to invent missing/generated assets.

Verification lives in `tests/site-quality-flow-tests.js` and `site-studio/tests/site-quality-flow-integration.test.js`. Focused proof passed `node tests/site-quality-flow-tests.js` and `cd site-studio && npm test -- --run tests/site-quality-flow-integration.test.js`. This is still a prompt/context contract and backend hook, not the full cross-studio request broker or polished Site Studio workflow UI.

## Phase 2 direction: Visual Workflows & Brand Systems (2026-05-21)

Phase 2 should start with product-value workflows, not Mission Control first. The agreed order is: Media Studio through FAMtastic logo/brand creation, Site Studio useful build/edit/enhance workflow, Component Studio from real repeated site/media needs, Mission Control visual orchestration, Data Center/Research Center/Second Brain visual UI, and Shay Desk Office tab integration. The FAMtastic logo/brand system is the anchor artifact because it exercises Media Studio, research-shaped prompting, DESIGN.md/tokens, Site Studio visual direction, Component Studio style rules, and Shay/FAMtastic identity in one concrete workflow.

## Wave 6 Component Studio wrapper foundation (2026-05-21)

Added the first search-before-build Component Studio substrate. `lib/famtastic/component-studio/index.js` exports `loadComponentCatalog()`, `searchComponents()`, `buildComponentReuseContext()`, `createComponentProofJob()`, and `appendComponentLedgerRecord()`. The catalog loader preserves `components/library.json` as the canonical index but also scans `components/*/component.json`, so manifest-only components are discoverable even when the registry is stale.

Component search is deterministic and local for this wave: keyword/type/group scoring over component IDs, names, descriptions, slots, fields, tags, and usage count. `buildComponentReuseContext()` emits a build-prompt-ready block that tells Site Studio to reuse existing components before generating new ones and preserve `data-component-ref`, `data-field-id`, slots, CSS variables, dependencies, and provenance. `scripts/component-studio-search.js` is the CLI proof/search surface and can create zero-site-write proof jobs with `--create-proof`.

Component reuse proofs write Data Center jobs with `kind: component_reuse`, `job.json`, `events.jsonl`, `report.md`, and `outputs/component-reuse-proof.json`, plus sanitized ledger rows in `data-center/ledgers/component-reuse.jsonl`. Mission Control now excludes `component_reuse` jobs from research jobs and exposes `summary.component_reuse` plus a `component_reuse` array. Verification lives in `tests/component-studio-tests.js`; focused proof reran `tests/mission-control-tests.js`, `tests/media-studio-wrapper-tests.js`, `node scripts/component-studio-search.js --query 'cinematic hero with video background and CTA' --type hero --json`, `node scripts/plans/audit.js`, and `git diff --check`. Known gaps: build prompt injection is deferred to Wave 7; registry drift remains (9 manifests found, 6 `library.json` entries); no visual Component Studio UI exists yet; search is not semantic/vector-backed.

## Wave 5 Media Studio wrapper foundation (2026-05-21)

Added the first bounded Media Studio substrate without spending provider credits. `media-studio/model-aliases.json` seeds MuAPI model intent routes and fallbacks (`hero-image`/`text-to-image` → `flux-dev -> flux-kontext-max -> gpt4o`, `image-to-video` → `wan2.2 -> wan2.1-i2v` with the prior `veo3-fast` mismatch note). `media-studio/lib/index.js` exports `resolveModelAlias()`, `buildMuapiPlan()`, `createMediaJob()`, and `appendAssetLedgerRecord()`; all paths default to dry-run and use prompt hashes for dedup/proof.

`createMediaJob()` writes Data Center jobs with `kind: media_generation`, `job.json`, `events.jsonl`, `report.md`, and `outputs/generation-proof.json`. Media asset lifecycle rows go through the existing sanitized Data Center ledger path at `data-center/ledgers/media-assets.jsonl`, so secret-looking keys/values are redacted before persistence. `scripts/media-studio-plan.js` is the local CLI planner; it supports `--json` and `--create-job`, but `--spend` intentionally throws because paid media generation remains gated by Fritz approval.

Mission Control now includes media generation visibility. `lib/famtastic/mission-control/index.js` filters Data Center jobs with `kind: media_generation`, reports `summary.media_generations`, and returns a `media_generations` array while preserving generic proof discovery from `jobs/*/outputs/*`. Verification lives in `tests/media-studio-wrapper-tests.js`; focused proof also reran `tests/mission-control-tests.js`, `tests/data-center-tests.js`, and `git diff --check`. Live zero-spend proof job: `data-center/jobs/media-20260521150816-wave-5-dry-run-hero-proof/`. Known gaps: actual MuAPI generation is not wired; OCR/text validation and composition-preservation guard are proof fields only; Remotion render execution remains next-step composition wiring; there is still no Media Studio visual UI.

## Wave 4 Mission Control reader/projection (2026-05-20)

Added the first bounded Mission Control / visual observability slice as a reader over the existing Data Center rather than a new store. `lib/famtastic/mission-control/index.js` now exports `buildMissionControlSnapshot(options)`, which reads `data-center/jobs/*/job.json`, `data-center/witness/*.jsonl`, `data-center/claims/*.json`, `data-center/decisions/*.json`, `data-center/ledgers/*.jsonl`, Data Center job `outputs/`, and the raw `captures/inbox/` count/sample. It derives research job counts, latest witness pass/fail state, claim/decision summaries, needs-Fritz items, stale/blocked items, proof artifacts, and raw capture inbox counts without writing derived state back to the Data Center.

Added `scripts/mission-control-report.js` as the local report surface. It supports human terminal output plus `--json`, `--root`, `--hub-root`, and `--stale-after-hours` for deterministic tests and future Desktop/Mission Control consumers. `tests/mission-control-tests.js` uses a temp Data Center fixture to prove jobs, witness checks, claims, decisions, needs-Fritz events, stale/blocked projection, proof discovery, raw capture preservation, argument parsing, and human rendering.

Wave 4 also registered Data Center claim `claim_a3b0cb120202f00c` and decision `decision_cce22f61a71f6dac` to document the reader-only design choice. Proof and status live at `shay-shay/observations/SHAY-WAVE4-MISSION-CONTROL-PROOF-2026-05-20.md` and `shay-shay/observations/SHAY-WAVE4-STATUS-2026-05-20.md`; the spec packet lives at `specs/004-mission-control-observability/`. Known gaps preserved/opened: no Desktop/cockpit UI yet; live autopilot summaries are not included until real run-event ingestion reaches the Data Center; proof discovery currently starts with Data Center job outputs and proof-like Data Center ledger rows rather than every older root proof ledger.

## Wave 3 data-center ingestion and knowledge layer foundation (2026-05-20)

Extended the existing Data Center in place rather than creating a parallel knowledge store. `lib/famtastic/data-center/index.js` now adds local source, claim, and decision primitives on top of the Wave 1/2 job/ledger/witness substrate. Raw capture remains exactly where Fritz corrected it should remain: `captures/inbox/` and `captures/review/` are the raw capture box, and Wave 3 ingests from those folders into `data-center/sources/*.json` plus a compact `data-center/sources/index.json` for idempotent rescans.

Source records now carry `source_id`, `kind`, `path`, `relative_path`, `title`, `summary`, `excerpt`, `hash`, timestamps, queue, byte size, and provenance. Claim records link to one or more source IDs and include `confidence`, `status`, `tags`, and provenance. Decision records link to sources, claims, and specs with `rationale` and `status`. All of these reuse the existing redaction path so secret-bearing keys and token-like values are removed before persistence, including excerpts/summaries derived from raw files.

Added `scripts/data-center-ingest.js` as the bounded local ingestion path. It supports `--dry-run` and `--json`, scans the raw capture box only, and writes no source records during dry runs. Focused proof lives in `tests/data-center-tests.js` and `tests/data-center-ingest-tests.js`, covering ingestion idempotency, redaction, and source/claim/decision linkage. Known gaps preserved: no graph/second-brain projection for claims and decisions yet; no promotion workflow on top of the primitives yet; and non-capture evidence lanes such as repo docs and research outputs are future ingestion expansions rather than part of this bounded slice.

## Wave 2 witness ledger and autopilot foundation (2026-05-19)

Extended the existing Data Center foundation instead of creating a parallel observability store. `lib/famtastic/data-center/index.js` now provisions `data-center/witness/` and `schemas/capability-witness.schema.json`, and exports `appendWitnessRecord()` plus `readWitnessRecords()`. Witness records are append-only JSONL files keyed by capability and include `capability`, `status`, `durationMs`, `issuedAt`, `platform`, `os`, bounded `metadata`, and optional `baseline`; the records reuse the same secret-redaction path as general ledger writes, so witness metadata does not need its own sanitization branch.

Added `scripts/witness-check.js` as the bounded local registration path for existing capability proofs. The current checks are `data-center-smoke`, `second-brain-export-smoke`, and `research-router-metadata-test`. The last one intentionally reuses the real Site Studio regression command (`npm test -- --run tests/research-router.test.js` in `site-studio/`) rather than cloning its assertions into another harness. Running `node scripts/witness-check.js --json` appends witness rows under `data-center/witness/*.jsonl` and carries forward previous status/duration into a simple baseline delta when earlier witness rows exist.

Added `lib/famtastic/autopilot/index.js` for Mercury-inspired wave-run health classification. The current implementation is intentionally deterministic and local: it consumes recent step/tool/event summaries and classifies `productive`, `suspicious`, or `stuck` based on three fixed metrics only: success rate, action diversity, and repeated-action streak. It does not stop or alter external processes; it is a status signal for later Mission Control/Desktop surfacing. Tests in `tests/autopilot-tests.js` prove the three required verdicts, and `tests/witness-check-tests.js` proves witness registration/baseline behavior without network calls.

Known gaps opened/preserved: witness history is local JSONL only and has no visual Mission Control surface yet; baseline comparison is currently last-run only, not trend-aware; autopilot input is still bounded synthetic/local event summaries rather than live Shay/Desktop/tool traces; and no automatic remediation or lane-skipping behavior exists yet because this wave is status-only by design.

## Research Data Center foundation and second-brain proof (2026-05-19)

Implemented the first research-first foundation slice: `site-studio/lib/research-router.js` now handles `skipCache` and `forceSource` without the old `cached is not defined` failure, and `queryResearch()` preserves provider `meta` so Perplexity citations/search results/usage can flow to downstream proof. `site-studio/lib/research-registry.js::queryPerplexity()` now reads `PERPLEXITY_API_KEY` or `PPLX_API_KEY` from process env and stores response metadata (`citations`, `search_results`, `usage`, `cost`/`usage_cost`, request id, model, status code) under `meta` without printing or persisting secrets. Regression coverage lives at `site-studio/tests/research-router.test.js`.

Added the local FAMtastic Data Center substrate at `lib/famtastic/data-center/index.js` with `ensureDataCenter()`, `createResearchJob()`, `appendLedgerRecord()`, `listCaptureInbox()`, and `sanitizeRecord()`. The default root is `~/famtastic/data-center/`, with folders `sources/`, `jobs/`, `ledgers/`, `claims/`, `citations/`, `decisions/`, `artifacts/`, `graphs/`, `reports/`, `schemas/`, `cache/`, and `exports/`; each job gets `uploads/`, `workspace/`, `outputs/`, `sources/`, `events.jsonl`, and `report.md`. `appendLedgerRecord()` writes sanitized JSONL and redacts secret-looking keys/values; coverage is in `tests/data-center-tests.js`.

Added `scripts/research-job.js`, which loads `~/.shay/.env` locally, calls the shared `lib/famtastic/research` proxy, creates a Data Center job, writes `research-events.jsonl`, and emits `outputs/research-proof.json` plus `report.md`. Live proof jobs created `data-center/jobs/research-20260519225124-perplexity-metadata-preservation-proof/`, `data-center/jobs/research-20260519225143-swarm-worker-a-research-synthesis-structure/`, and `data-center/jobs/research-20260519225150-swarm-worker-b-research-shaped-sdd/`; together they proved Perplexity metadata capture and a bounded 2-worker research swarm with cited outputs.

Added the first second-brain projection layer at `lib/famtastic/second-brain/index.js`, exporting Data Center research jobs to Markdown notes under `second-brain/Research/` and Obsidian canvas-style graph files under `second-brain/Canvases/`. Coverage is in `tests/second-brain-tests.js`. Created the first research-shaped SDD packet at `specs/001-research-data-center-foundation/` with `capture.md`, `research.md`, `sources.md`, `claims.md`, `spec.md`, `plan.md`, `tasks.md`, `proof.md`, `decision-log.md`, and `learn.md`.

Known gaps preserved/opened: Data Center ingestion only lists the existing capture inbox so far and does not yet promote captures into claims/decisions automatically; `lib/famtastic/research/index.js` still proxies Site Studio instead of owning research natively; Mission Control visual panels are not built yet; Perplexity cost is returned nested at `usage.cost` in tested responses and should be normalized in a follow-up; the broad `site-studio/tests/unit.test.js` suite currently fails before execution because `site-studio/public/js/shay-bridge-client.js` is missing, unrelated to this research slice.

## Shay long-run capability discovery: research proof, Media Studio, Component Studio, visual workflows (2026-05-19)

Long-run capability discovery artifacts were written under `~/famtastic/shay-shay/observations/`: `SHAY-LONG-RUN-CAPABILITY-REPORT-2026-05-19.md`, `SHAY-SOURCE-TAGGED-CAPABILITY-MAP-2026-05-19.md`, `SHAY-IMPLEMENTATION-PLAN-AFTER-CAPABILITY-DISCOVERY-2026-05-19.md`, `SHAY-CAPABILITY-INSTALL-EVAL-LEDGER-2026-05-19.md`, and heartbeat file `SHAY-LONG-RUN-STATUS-2026-05-19.md`. This pass intentionally treats Shay as broader ambient intelligence/orchestration and treats Site Studio, Media Studio, and Component Studio as FAMtastic ecosystem studios that Shay can coordinate, observe, research for, and learn from.

Research proof: Perplexity itself was live-verified via process environment only, with no key printed or persisted. A tiny `sonar` request to `https://api.perplexity.ai/chat/completions` returned HTTP 200 with response keys `choices`, `citations`, `created`, `id`, `model`, `object`, `search_results`, and `usage`; usage included `completion_tokens`, `cost`, `prompt_tokens`, `search_context_size`, and `total_tokens`. Follow-up implementation fixed `site-studio/lib/research-registry.js::queryPerplexity()` so it now accepts `PERPLEXITY_API_KEY` or `PPLX_API_KEY`, preserves `citations`, `search_results`, `usage`, `cost`/`usage_cost`, request id, model, and status code under `meta`, and never prints the key.

Research router fix: `site-studio/lib/research-router.js::queryResearch()` previously had a real `ReferenceError: cached is not defined` bug when `skipCache:true` or `forceSource` bypassed the cache branch. The fix hoists `cached` to function scope, returns `stale:false` for fresh cache hits, preserves `result.meta`, and is covered by `site-studio/tests/research-router.test.js` for `skipCache`, `forceSource`, and Perplexity metadata. `lib/famtastic/research/index.js` remains a scaffold/proxy into Site Studio, and `scripts/intelligence-loop` is still a cross-site pending-review aggregator, not the full data collector/research loop.

Media Studio recommendation: keep `muapi` CLI as the primary agent-accessible provider bridge, keep the installed `/Users/famtasticfritz/skills/muapi-*` recipe skills as recipe corpus through a wrapper, adapt the `image-and-video-gen` skill's provider/cost/verification rules, and use `~/famtastic/remotion/` as the deterministic composition/render layer. Skip Open Generative AI GUI for now because the downloaded DMG is redundant with the CLI/MCP path for agent workflows. The first Media Studio wrapper slice should add `media-studio/lib/muapi-wrapper.js`, `model-aliases.json`, `asset-ledger.js`, and `scripts/probe-models.js`, with model health/fallback, OCR/text validation, brand-context injection, asset/cost ledgers, and preview metadata.

Component Studio recommendation: use `~/src/open-design/packages/registry-protocol` as the starter architecture, Open Design's 4-layer token/design-system model and `craft/animation-discipline.md` as the contract/rulebook, and existing `~/famtastic/components/<component>/component.json` files as seed content to migrate. Component Studio should be a schema-first Lego factory with typed slots, versioning, preview proof, reduced-motion support, provenance, search-before-build, and cross-studio handoff; shadcn/Magic UI/21st.dev/ReactBits/Aceternity patterns are inspiration, not raw architecture.

Visual workflow recommendation: enable/spike `agents-observe` for immediate Claude Code worker visibility when Docker is running, but build a Shay-native run/workflow schema first (`run`, `agent`, `step`, `tool_call`, `artifact`, `decision`, `cost`, `blocker`, `review`, `learning`, `adjustment`). Langflow and Dify remain isolated spikes; AutoGen Studio is blocked by the host Python 3.9/toolchain, and Microsoft Agent Framework DevUI was not proven as a standalone local UI.

Known gaps added/preserved: Pinecone was not live-proven in this pass; shared research is still proxied through Site Studio; Media Studio has no wrapper implementation; Component Studio lacks architecture/typed-slot schema; no Shay-native cockpit/run schema exists yet; FAMTASTIC-STATE.md still needs a later full regeneration to reflect these discovery artifacts and updated known gaps.

## Shay-Shay intelligence ledger substrate (2026-05-19)

Shay-Shay now has the first local substrate for the continuous intelligence loop Fritz requested: `~/famtastic/shay-shay/agent/intelligence_ledger.py`. It provides a profile-aware append-only JSONL event ledger at `get_shay_home() / "intelligence/events.jsonl"`, so default `~/.shay` and profile homes such as `~/.shay/profiles/<name>` remain isolated. The module exposes `append_event()`, `read_events()`, `summarize_events()`, `intelligence_home()`, `events_path()`, and `is_enabled()`; writes default on and can be disabled with `SHAY_INTELLIGENCE_ENABLED=0|false|no|off|disabled`.

The ledger currently stores sanitized event records only when code explicitly calls `append_event()`; it is not yet wired into the main `run_agent.py` loop, memory manager, kanban, goals, gateway, desktop API, or cron briefings. Event records include `id`, `ts`, `type`, `source`, `session_id`, `task_id`, `summary`, and sanitized `metadata`; obvious secret-bearing metadata keys (`api_key`, `token`, `secret`, `password`, `credential`, `authorization`) and long token-looking string values are redacted before disk write. Tests live at `~/famtastic/shay-shay/tests/agent/test_intelligence_ledger.py` and cover profile-scoped paths, append/read/filter/limit behavior, disabled mode, corrupt-row tolerance, redaction basics, and summary counts.

Known gap: this is Wave 1 foundation only. The next intelligence-loop work is to hook selected lifecycle events into the ledger, add an analyzer/report command, create concise briefing output, and expose the latest status to Shay Desktop after the shape is proven.

## Shay Desktop Electron install and lineage correction (2026-05-19)

The primary Shay Desktop lineage is the Electron + React + TypeScript app from `https://github.com/fathah/hermes-desktop`, cloned at `~/famtastic/shay-desktop-electron/`. This is the repo matching Fritz's screenshot: Chat, Sessions, Profiles, Office, Models, Providers, Skills, Persona/Soul, Memory, Tools, Schedules, Gateway, Settings, and Kanban. The app was rebranded and installed as `/Applications/Shay Desktop.app` with `CFBundleName=Shay Desktop`, `CFBundleIdentifier=com.famtastic.shaydesktop`, executable `Shay Desktop`, and Electron `userData` under `~/Library/Application Support/shay-desktop`. It is ad-hoc signed and `codesign --verify --deep --strict /Applications/Shay\ Desktop.app` passes.

Electron rebrand/adaptation files include `package.json`/`package-lock.json` (`name=shay-desktop`, FAMtastic metadata), `electron-builder.yml` (`productName=Shay Desktop`, `appId=com.famtastic.shaydesktop`, `executableName=shay-desktop`, notarization disabled for local build), `dev-app-update.yml`, `src/main/index.ts` (`app.name`, app user model id, `app.setPath('userData', .../shay-desktop)`, GitHub menu links, notifications), `src/main/installer.ts` (compatibility exports still named `HERMES_*` but resolving `SHAY_HOME`/`~/.shay`, `SHAY_REPO`/`~/famtastic/shay-shay`, `.venv/bin/shay`, and FAMtastic local-install messaging), `src/main/cronjobs.ts` (cron cwd uses `HERMES_REPO` compatibility alias), `src/main/utils.ts` (profile homes under `~/.shay/profiles/<name>`), English i18n files under `src/shared/i18n/locales/en/`, and temporary dark-glass `SS` icons at `build/icon.*`, `resources/icon.png`, and `src/renderer/src/assets/hermes.png`.

Verification for the installed Electron app: `npm run typecheck` passes, `npm run test` passes 435 tests across 33 files, `CSC_IDENTITY_AUTO_DISCOVERY=false npm run build:unpack` builds `dist/mac-arm64/Shay Desktop.app`, `/Applications/Shay Desktop.app` launches as process `/Applications/Shay Desktop.app/Contents/MacOS/Shay Desktop`, the helper processes use `--user-data-dir=/Users/famtasticfritz/Library/Application Support/shay-desktop`, and the local Shay CLI behind it reports `Shay-Shay v0.13.0 (2026.5.7)` from `~/famtastic/shay-shay/.venv/bin/shay`. The original `/Applications/Hermes Agent.app` is still present and running from the upstream Electron lineage with separate `hermes-desktop` userData; the new Shay Desktop install does not overwrite it.

Known gaps for the Electron app: many internal TypeScript symbols, IPC/API names, tests, and non-English/upstream docs still use `Hermes` naming for compatibility; the renderer asset filename remains `hermes.png` even though the pixels are the temporary Shay `SS` icon; the app still expects the Hermes-compatible local API server shape at `http://127.0.0.1:8642` and needs deeper verification against Shay-Shay's current gateway/API behavior screen by screen; Office/Claw3D was not yet started or verified beyond source/build coverage; no production notarized DMG was created; and the placeholder `SS` icon should be replaced once the real FAMtastic/Shay logo exists.

The earlier `~/famtastic/shay-desktop/` clone is a different native Swift/macOS repo from `dodo-reach/hermes-desktop`. Treat it as a useful Shay SSH workbench/control surface, not the primary Shay Desktop lineage. It provides connection profiles plus Overview/Files/Sessions/Workflows/Cron Jobs/Kanban/Usage/Skills/Terminal surfaces over SSH and remains installed as `/Applications/ShayDesktop.app`; it does not contain the Chat/Office/Models/Providers/Persona/Memory/Gateway shell. Its seed `Local Shay` profile lives at `~/Library/Application Support/ShayDesktop/connections.json`; Swift date fields there must be numeric seconds since Apple's `2001-01-01T00:00:00Z` reference date, not ISO-8601 strings, or launch shows `Local storage error`. Known Swift-workbench gaps: `swift test --parallel` fails before running tests because this CLT test environment cannot import Swift's `Testing` module, and internal Swift module/executable names still use `HermesDesktop` even though bundle/product branding says Shay Desktop.

## Shay-Shay upstream Hermes security-wave integration (2026-05-19)

Shay-Shay lives at `~/famtastic/shay-shay/` as a rebranded fork of Hermes Agent, with `shay`, `SHAY_*`, and `~/.shay` as the protected product/runtime boundary. The first upstream-port wave from Hermes `v2026.5.16` was intentionally selective rather than a direct merge: security and dependency hardening were adapted while preserving Shay naming and runtime paths.

Ported/adapted files: `agent/anthropic_adapter.py` separates OAuth PKCE `code_verifier` from independent `oauth_state` and validates returned state before token exchange; `model_tools.py` adds `_sanitize_tool_error()` and routes exception-path errors through it; `tools/registry.py` sanitizes registry dispatch exception strings; `tools/url_safety.py` blocks non-HTTP(S) and missing-scheme URLs; `tools/approval.py` extends dangerous-command detection for macOS `/private/{etc,var,tmp,home}` mirrors, `killall` force/regex sweeps, and `find -execdir rm`; `pyproject.toml` and `uv.lock` raise dependency floors for `anthropic`, `aiohttp`, and `cryptography`. Tests added/extended at `tests/test_sanitize_tool_error.py`, `tests/tools/test_url_safety.py`, and `tests/tools/test_approval.py`.

Known gap: this Shay-Shay repo currently lacks `pytest` in `.venv`, so targeted tests were validated through `py_compile` and direct Python assertions rather than the pytest runner; install/sync the dev extra before relying on full unit-test execution.

## muapi-orchestrated brand-package generation — rebuild experiment (2026-05-19)

After spending 30+ rounds manually building the FAMtastic brand mark via
primitive muapi calls + Python compositing, ran the same brand exercise
through muapi's **prebuilt recipe skills** to measure flow quality and
limitations. Results inform Media Studio's wrapper architecture.

### Recipes executed (in order)
1. `muapi-logo-branding` — 3 logo concepts in parallel + 1 application mockup
2. `muapi-brand-kit` — Logo A + Logo B + moodboard + pattern (parallel)
3. `muapi-3d-logo-animation` — 2D→3D image edit, then image-to-video animation
4. `muapi-design-guide` — palette card + typography pairing + UI kit + real-world mockup (parallel)

**Total time:** ~15 minutes for ~16 outputs, vs. 5+ hours and 30+ rounds for
the manual approach. Order-of-magnitude improvement.

### Highest-quality outputs (use as proof-of-concept references)
- **3D medallion (flux-kontext-max edit of Logo 1):** Premium cast-metal
  circular medallion with FAM letters inset in proper colors + green burst
  behind. Genuinely premium brand mark quality. URL:
  `https://cdn.muapi.ai/outputs/a0a0a7fe513544f7b3de345425ea5151.jpg`
- **Color palette card (gpt4o):** Agency-quality design-guide page with
  the FAMtastic wordmark + 5 hex swatches labeled (PRIMARY #1A3FAA,
  SECONDARY #F2C40D, ACCENT #D62828, HIGHLIGHT #0F6B3C, BACKGROUND #FFFFFF +
  text #1A1A1A). Ready to ship as page 1 of a brand book.
- **Typography pairing sheet (gpt4o):** Editorial typography reference
  with Heading/Subheading/Body/Caption levels, sample text "Manifesting
  the Extraordinary from the Ordinary." Magazine-quality layout.
- **UI components kit (gpt4o):** Figma-style component documentation
  with brand-colored buttons, inputs, cards, badges, icons. Usable as
  the basis of a real design system.
- **5-second animated logo (wan2.2 image-to-video):** Polished cinematic
  reveal of the 3D medallion. URL:
  `https://cdn.muapi.ai/outputs/83355157a8cc49c3ae5b93ea429e7aaf.mp4`

### Limitations discovered (the real constraints)

1. **Model availability mismatch:** Recipe skills reference newer model
   names (`ideogram-v3-t2i`, `flux-2-pro`, `nano-banana-pro`,
   `nano-banana-2`, `bytedance-seedream-v4.5`, `gpt-image-2-text-to-image`,
   `veo3.1-fast-image-to-video`) that are NOT in muapi's current CLI
   catalog. Substitution required.
2. **Models returning "Not Found":** `midjourney`, `seedream`,
   `kling-pro`, `seedance-pro` all returned `{"detail":"Not Found"}` —
   either not enabled on the account, or wrong endpoint paths in CLI.
   `gpt4o`, `flux-dev`, `flux-kontext-max`, `wan2.2` all worked
   reliably.
3. **veo3-fast image-to-video CLI/API mismatch:** CLI sends `image_url`,
   API expects `images_list`. Use `wan2.2` for i2v instead.
4. **Multi-segment text rendering is unreliable:** Brand names like
   "FAMtastic" (FAM + tastic) sometimes drop the F ("AMtastic") or
   misspell ("TaSTIC", "Famino"). Single-word brands render more
   reliably.
5. **flux-kontext-max image edit drifts beyond the instruction:** Asked
   for "add 3D depth, preserve composition" — got a beautiful circular
   medallion crop that dropped "tastic" entirely. Composition not
   preserved as instructed.
6. **No deterministic recipe substitution:** When a recipe's specified
   model isn't available, the executing agent has to manually map
   substitutes. Recipes need a fallback chain in their spec.

### Implications for Media Studio's wrapper

The wrapper layer Media Studio needs to add on top of raw muapi recipes:

1. **Model-fallback chain per call** — recipe specifies primary +
   fallback models; wrapper tries each until one returns success
2. **OCR validation gate** — after generating a logo with brand-name
   text, OCR the output and verify the name renders correctly; re-run
   if not
3. **Composition-preservation guard** — when using image edit, capture
   the source's content bounding box and reject outputs that drift too
   far from it (or composite the edit back into the source frame)
4. **Recipe template overrides** — the muapi recipe skill prompts are
   generic; Media Studio's wrapper should inject FAMtastic-specific
   brand context (manifesto excerpts, per-letter color rules,
   composition rules) into every recipe invocation automatically
5. **Asset-categorization output** — wrapper organizes outputs by
   category (logo concept / mockup / palette / typography / UI / video)
   for retrieval, not flat dump
6. **Recipe-cost ledger** — record per-run cost (~40-120 credits per
   recipe) so users see budget impact before launching a campaign
7. **Curated final-assembly** — pick the best outputs across recipes
   into a clean deliverable package, prune the misses

### Flow quality assessment (★★★★★ = production-ready)

| Recipe | Quality | Notes |
|---|---|---|
| `muapi-logo-branding` | ★★★★☆ | Good structure; some text issues |
| `muapi-brand-kit` | ★★★★☆ | Moodboard + pattern useful; logos redundant after Step 1 |
| `muapi-3d-logo-animation` | ★★★☆☆ | 3D image excellent; video needs `wan2.2` not `veo3-fast` |
| `muapi-design-guide` | ★★★★★ | Palette card + typography sheet are agency-quality |

**Overall verdict:** muapi recipes deliver a complete brand package in
~15 minutes for ~$10-20 of credits. Manual primitive-by-primitive build
took 5+ hours and resulted in equivalent output quality. Recipes are
the right starting point; wrapper adds brand-specific context + quality
gates + curation.

**Hermes pass (gap → solution mapping):** Every limitation observed
during this experiment has been mapped to a concrete proposed solution
with sized effort and verification criteria at
`~/famtastic/media-studio/SOLUTIONS-BACKLOG.md`. 16 backlog items totaling
~30 hours of focused work to reach Media Studio V1.

## FAMtastic Remotion engine — Media Studio foundation (2026-05-19)

`~/famtastic/remotion/` is the FAMtastic shared animation & rendering engine.
It is the foundation layer of the future **Media Studio**. Built on
[Remotion](https://www.remotion.dev) (free for ≤3-person teams). All studios
in the FAMtastic ecosystem will consume compositions from this package.

### Architecture (the contract)

Generation = **muapi** (text-to-image, text-to-video, music, voiceover,
transcription, edit). Composition = **Remotion** (assemble, animate,
caption, render, embed). No overlap, no double-pay.

```
~/famtastic/
├── brand/                        # brand-mark manifesto + source PNG layers
├── remotion/                     # shared animation engine (NEW)
│   ├── src/FAMtasticLogo.tsx     # primary brand-mark composition (shipped)
│   ├── src/Root.tsx              # composition registry (3 entries)
│   ├── public/brand/             # transparent PNG layers (burst, FAM, tastic)
│   ├── RECIPES.md                # composition catalog + future-build roadmap
│   └── README.md                 # architecture + integration docs
├── site-studio/                  # will import compositions (next)
├── (future) media-studio/        # the eventual studio server + UI
└── .claude/skills/remotion-best-practices/
                                   # 1 SKILL.md + 36 rule files — AI agent
                                   # auto-loads these when working on Remotion
```

### Shipped today

- **3 compositions** registered: `FAMtasticLogo-Luminous`,
  `FAMtasticLogo-Dark`, `FAMtasticLogo-Square` — all in
  `src/FAMtasticLogo.tsx`.
- **9 Remotion packages** installed: core + `@remotion/player`,
  `@remotion/captions`, `@remotion/transitions`, `@remotion/google-fonts`,
  `@remotion/shapes`, `@remotion/animation-utils`, `@remotion/media-utils`,
  `@remotion/preload`.
- **`remotion-best-practices` skill** copied to
  `~/famtastic/.claude/skills/` — gives any Claude Code session in the
  monorepo deep Remotion knowledge automatically.
- **`launch.json`** entry `famtastic-remotion` runs `npm run dev` at
  `localhost:3000`.

### npm scripts on the package

- `dev` — Remotion Studio at `localhost:3000`
- `build` — bundle for production
- `render:luminous` / `render:dark` / `render:square` — render named MP4s
- `render:still` — render a still PNG at frame 60
- `lint` — eslint + tsc

### Integration contract (how studios call it)

Studios bundle once, then call `selectComposition` + `renderMedia` with
their own `inputProps` (brand colors, content, format preset). Full code
example in `~/famtastic/remotion/README.md`.

### Recipe catalog (the build roadmap)

`~/famtastic/remotion/RECIPES.md` is the canonical catalog of every
composition and integration pattern Media Studio is being built toward:
- Phase 2 — composition library (LowerThird, TitleCard, SocialReel,
  IntroOutro, KineticType, ProductShowcase)
- Phase 3 — Studio integration patterns (captions overlay, music sync,
  voiceover sync, AI-clip wrapping, multi-format batch, brand context
  injection)
- Phase 4 — embedded live experiences (`<Player>` embed in
  Site-Studio-built sites, per-visitor personalization)
- Phase 5 — AI media pipelines ("make me a 30s ad" end-to-end, social
  variant factory, Site-Studio-triggered hero videos)

Update RECIPES.md when a recipe is added/shipped/retired.

### Critical rules (do not break)

1. **Single contiguous brand mark** — every composition must lead with the
   FAMtastic signature lock-up (FAM letters + burst + "tastic"). Hard-coded,
   not optional. See `~/famtastic/brand/FAMTASTIC-BRAND-MARK.md`.
2. **muapi for generation, Remotion for composition** — do NOT install
   `@remotion/openai-whisper`; muapi already transcribes inside AI-Clipping.
3. **Compositions are the moat** — invest engineering time in compositions
   first, Studio server/UI second. Each composition is reusable forever.
4. **Sequence frame offsets are auto-applied** — when wrapping a component
   in `<Sequence from={N}>`, `useCurrentFrame()` inside is already 0 at
   sequence start. Do NOT subtract N again (caught this bug 2026-05-19
   during initial install; tastic was invisible because of double-offset).
5. **Brand assets via `staticFile()`** — never import PNGs as ES modules;
   use `staticFile("brand/<name>.png")` so they load in both Studio dev
   and bundled production renders.

### Known Gaps opened

- No `media-studio/` server yet — Remotion is callable only via CLI today.
  The server wrapper is Phase 3 of the build (per RECIPES.md).
- No automated tests on compositions yet — visual regression should be
  added before composition library scales past 5 entries.
- `FAMtasticLogo` motion-warp FAM still doesn't have a dramatically taller
  A — flux-kontext softened the directive. Manual SVG re-author would fix.
- "tastic" composition uses Arial Rounded Bold as placeholder typography
  — needs replacement with the actual FAMtastic-DNA typeface choice once
  determined.
- No CI hook to run `npm run lint` in `~/famtastic/remotion/` yet.

## MBSH RSVP Phase 3.4 marker-band surgical fixes (2026-05-14)

`~/famtastic-sites/mbsh-reunion/frontend/rsvp.html` keeps the RSVP `.hero-stage` sealed; the hero-stage markup hash stayed unchanged during Phase 3.4. The changes are limited to `.marker-band` and children: the band now uses visible 4vw left/right padding instead of a full-bleed velvet panel, the existing HTML/CSS `.marker-plaque` carries a prominent `.marker-bulbs-top` crown of 20 glowing `.marker-bulb` nodes, and the `.chevron.layer--chevron.scroll-teaser` remains a direct `.marker-band` child with `data-scroll-target="#rsvp-form"` and two SVG paths.

`frontend/css/premiere.css` now treats the interior-hero chevron as `position: absolute` at the marker-band/section bottom (`bottom: 1.5rem`, `z-index: 20`) with `chevronBounce` traveling upward over the marker text area. In-flow chevrons cannot reliably reach the section bottom because the marker band content pushes them out of the intended zone; the absolute bottom chevron is the canonical interior-hero pattern. Mobile marker containment is marker-only: at phone widths the top crown drops to 10 visible bulbs, the bottom `.bleed-bulb-row` holds 12, and `.marker-line-1` / `.marker-line-2` use tighter sizes/spacing so the text does not clip.

Known gap: RSVP Phase 3.4 is complete locally and awaiting Fritz inspection before staging. The HTML/CSS marker-plaque recipe and absolute chevron pattern are canonical for future interior reels, but they have not been cloned to Tickets/Through the Years/In Memory/Capsule/Playlist yet. Mobile-throttled Lighthouse remains under 85 due to the broader existing CSS/font payload; desktop Lighthouse remains above threshold.

## MBSH RSVP Phase 3.3 simplification (2026-05-14)

`~/famtastic-sites/mbsh-reunion/frontend/rsvp.html` now keeps the RSVP cinematic interior hero as a two-band first viewport, but the lower `.marker-band` uses a plain HTML/CSS `.marker-plaque` instead of an SVG object. The plaque contains `.marker-corner` diamond spans, `.marker-bulbs-top` with 20 `.marker-bulb` nodes, `.marker-line-1`, and `.marker-line-2`; `frontend/css/premiere.css` owns the typography (`JetBrains Mono` scene line and `Playfair Display` title), burgundy/brass plaque treatment, marker bulb chase, mobile 10-bulb top reduction, and bottom `.bleed-bulb-row` with 20 desktop / 12 mobile bulbs.

The rope extension experiment has been removed. The baked-in velvet ropes and Harry's hand-on-stanchion pose carry the “opening the path” story better than a separate SVG bridge without a believable endpoint. Do not recreate a rope-continues-into-bleed layer unless the actual scene plate includes an anchor/stanchion destination for it.

Known gap: RSVP Phase 3.3 is complete locally and awaiting Fritz inspection before staging. The HTML/CSS marker-plaque recipe is canonical for future interior reels, but it has not been cloned to Tickets/Through the Years/In Memory/Capsule/Playlist yet. Mobile-throttled Lighthouse is still under 85 due to the broader existing CSS/font payload, while desktop local Lighthouse remains above threshold.

## MBSH RSVP Phase 3.2 marker-band refinement (2026-05-14)

`~/famtastic-sites/mbsh-reunion/frontend/rsvp.html` now treats the RSVP marker band as a full-width cinematic chapter strip instead of a left-anchored plaque area. Phase 3.2 briefly tested a full-section rope bridge and SVG marker, but Phase 3.3 superseded both: the rope layer is removed and the marker is now an HTML/CSS plaque with centered `SCENE II · INT. AUDITORIUM — NIGHT` and `LOCK YOUR SEAT` text plus 20 top bulbs.

`frontend/css/premiere.css` owns the Phase 3.2 composition rules: `.marker-band` is a single-column plaque/bulbs/chevron grid, `.marker-plaque` fills the band width as HTML/CSS, `.marker-bulbs-top` animates the plaque bulbs, and `.bleed-bulb-row` spreads 20 bulbs across the band with 12 shown on phone widths, `.layer--headline` is center/right aligned, and `.chevron` uses a visible double-chevron `chevronBounce` instead of a subtle pulse. RSVP head loading now aligns the scene-image preload with the CSS LCP background and async-loads the heavy font/premiere stylesheets; desktop Lighthouse remains above threshold, but mobile-throttled npx Lighthouse still reports below 85 because of the broader existing CSS/font payload.

Known gap: Phase 3.2 is complete locally and awaiting Fritz inspection before staging. The full-width marker-band recipe is now canonical for future interior reels, but it has not been cloned to Tickets/Through the Years/In Memory/Capsule/Playlist yet.

## MBSH RSVP Phase 4 additive layer polish (2026-05-14)

After Fritz approved the corrected Preview-B live base, RSVP received a local-only three-layer polish pass without staging push. `~/famtastic-sites/mbsh-reunion/frontend/rsvp.html` now adds Phase 4-only atmosphere nodes inside `.layer--atmosphere`: `.atmosphere-sconce`, `.atmosphere-camera-flash`, and `.atmosphere-painting-wash`; the rope glint was removed in Phase 3.3 with the rope concept. `frontend/css/premiere.css` owns the additive motion and interaction rules under the "RSVP Phase 4" block: `sconceFlicker`, `cameraFlashPop`, `paintingWashDrift`, refined `lampBreath`, `bleedBulbChase`, `rsvpChevronPulse`, guest-list form top treatment, and mobile simplification that hides the kicker and keeps the title readable on 390px screens.

The important implementation lesson is that decorative bridge/spill overlays must not be boxed partial-width elements when they sit over photographic hero art. The attempted `.bleed-light-spill` element produced a visible lower-right rectangular artifact in browser proof, so Phase 4 disables that element (`display: none`) and lets the form-section/background gradients carry the warm spill instead. Local verification for Phase 4 included desktop browser visual proof, 390×844 headless mobile screenshot proof, clean browser console, `node --check frontend/js/premiere.js`, `node --check frontend/js/rsvp.js`, and `git diff --check`.

Known gap: RSVP Phase 4 is complete locally and awaiting Fritz inspection before any staging push. The broader MBSH interior-page rollout is still pending; this pass intentionally touched RSVP only and did not clone the Phase 4 layer recipe to Tickets/Through the Years/In Memory/Capsule/Playlist.

## MBSH RSVP Phase 3 hero wire + bleed pattern (2026-05-14)

The live RSVP page in `~/famtastic-sites/mbsh-reunion/frontend/rsvp.html` now uses the approved Variant B 3D Harry direction for the production RSVP hero. The live hero is a static HTML layered composition (`section.reel-hero.reel-hero--rsvp.interior-hero`) using optimized web derivatives of `frontend/assets/heroes/rsvp/01-environment.png` and `frontend/assets/heroes/rsvp/02b-harry-3d-render-transparent.png`, while preserving `data-source-asset` pointers to the approved PNG inputs. the earlier SVG marker/rope assets were superseded in Phase 3.3 by the HTML/CSS marker and no-rope composition.

The rope-continues-into-bleed bridge from the initial Phase 3 wire was removed in Phase 3.3 because it had no convincing endpoint. `frontend/css/premiere.css` owns the first-pass atmosphere loops (`tungstenPulse`, `dustRise`, `lampBreath`, `bleedBulbChase`, `spillBreath`, `rsvpChevronPulse`) plus reduced-motion/mobile simplification; `frontend/js/premiere.js` keeps RSVP page-scoped behavior by skipping the old full-page `.premiere-stage` overlay on RSVP so Lighthouse does not count decorative backdrop as LCP. Local verification for Phase 3/Preview-B correction passed with no browser console errors, SVG/XML parse checks, `node --check frontend/js/premiere.js`, `node --check frontend/js/rsvp.js`, `git diff --check`, browser visual proof of the full-width Preview-B layout, and chevron scroll to `#rsvp-form`. Desktop Lighthouse Performance is 98 after optimized RSVP assets/footer mark; mobile-throttled npx Lighthouse remains 75 because the existing 206KB `frontend/css/premiere.css` payload is render-blocking, so mobile performance cleanup is a separate known gap before staging if Fritz wants the Lighthouse gate strict on mobile.

Known gap: Phase 3 is complete locally and still awaiting Fritz inspection before any staging push. The hero uses optimized WebP derivatives for performance, but the approved full-source PNGs remain in place; future polish should focus on the HTML/CSS plaque and baked-in scene plate, not a separate rope endpoint.

## MBSH RSVP Phase 2 hero composition (2026-05-14)
\n## Vendor/platform research packet for orchestration routing (2026-06-11)\n\nAdded a dedicated vendor/platform research packet under `docs/famtastic-designs/` to turn first-party OpenAI, Anthropic, Google/Gemini, and AWS/Bedrock docs into operational leverage for Shay and FAMtastic. New docs: `vendor-capability-matrix.md`, `cloud-offload-and-agent-engineering-notes.md`, `native-feature-experiments.md`, `famtastic-thoughts-topic-seeds-from-vendor-research.md`, and `platform-credits-and-underused-benefits.md`.\n\nThe key architecture conclusion is lane-based routing instead of provider loyalty: Anthropic currently looks strongest for long-running orchestration mechanics (prompt caching, compaction, programmatic tool calling, managed agents), OpenAI for code-first hosted tools/evals/background/batch/flex flows, Google for Agent Studio app prototyping plus managed retrieval/observability/runtime surfaces, and AWS/Bedrock for governed batch/prompt/eval infrastructure and Anthropic-on-AWS decision branches.\n\nThis research should drive three immediate Shay changes: a cloud-offload decision module, a cacheability classifier before dispatch, and a dedicated async-economics router that decides sync vs background vs batch before premium inference is spent. It also opened a new product/content lane: FAMtastic Thoughts should teach modular agent engineering (routing, evals, caching, retrieval, studio-to-production) instead of generic model comparisons.\n\nKnown gaps / honesty notes: pricing and free-credit coverage were only partially confirmed from extracted first-party pages during this pass; live account verification is still needed for exact OpenAI/Anthropic/AWS credit availability. Google’s `$300` free-trial credit is confirmed generally, but surfaced docs indicate Gemini API/AI Studio billing may not map cleanly to that same credit pool, so that must be validated directly before assuming coverage.\n
## Mythos Foundation Plan — FAMtastic Designs MVP architecture (2026-06-11)

`docs/famtastic-designs/mythos-foundation-plan.md` is the approved-pending-review architecture for the FAMtastic Designs revenue engine. Key decisions captured there: Proof Engine v1 reuses the fam-hub site factory as its generation backend behind a swappable `generate_proof()` boundary (Fritz-confirmed); hosted data plane defaults to GoDaddy MySQL + PHP API following the proven mbsh-reunion backend pattern (db.php/resend.php/rate-limit.php) with a half-day migration seam to Postgres; orchestration plane extends `~/.config/famtastic/studio.db`; outreach exits only through the `pipeline/lib/sender.py` choke point behind 7 hard gates; routing is subscription-first (Claude Code flat-rate for builds) then Haiku/Batch/structured-outputs, Opus only for architecture and escalations.

Note for future sessions: `docs/famtastic-designs/foundation-findings.md`, `infrastructure-inputs.md`, and `interviews/chatgpt-foundation-interview-2026-06-11.md` exist on **origin/main but NOT in the local working tree** — read them via `git show origin/main:docs/famtastic-designs/<file>` until local main is reconciled.

Known gap: the 10 child docs the plan mandates (design.md, pages.md, backend.md, agents.md, workflows.md, email-system.md, campaigns.md, roadmap.md, vendor-capability-matrix.md, native-feature-experiments.md) are not yet generated — blocked on Fritz's plan review. Note also that this session's vendor-capability-matrix recommendation overlaps the 2026-06-11 vendor research packet entries above; reconcile naming when generating child docs.

## Foundation plan v2.1 + agents.md (2026-06-11, post-CJ-review patch)

The plan was patched in place per `docs/famtastic-designs/mythos-plan-patch-prompt-2026-06-11.md` (pre-patch version preserved at commit 12f1bbe). Standing decisions now baked in: the factory is a generation worker behind the ProofRequest/ProofArtifact contract and never the orchestration brain; primary outreach geography is Port St. Lucie/Treasure Coast/Palm Beach (NOT Atlanta — Fritz is Treasure Coast-based); Church Connect is the signature campaign; Fritz review is calibration-first (first 5 sends per campaign, then exceptions only); no outreach sends until the full claim path (proof → claim → pay/book → confirmation → onboarding → admin status → notification) passes QA. `agents.md` defines the AgentTaskLog schema that makes the swarm trackable — any new engine code must write those rows.

## FAMtastic Designs planning doc set complete (2026-06-11)

The full planning set now exists under docs/famtastic-designs/: foundation plan v2.1, agents.md, workflows.md (WF-01..WF-16 — claim-path QA WF-07 is a global send-blocker), campaigns.md (Church Connect signature; 45-day committee-lag window protects it from premature kill), backend.md (two-plane architecture: GoDaddy MySQL/PHP hosted plane + studio.db orchestration plane, one-writing-plane-per-field ownership rule, EmailEvent and AgentTaskLog insert-only at grant level), email-system.md, design.md (all hex/type tokens ASSUMED pending logo workstream), pages.md (/p/ slugs = 16-char base62 resolving the §11 vs §25 entropy tension), roadmap.md, review-packet-2026-06-11.md (contains the exact next review prompt). Known gap: everything is spec, zero implementation; Sprint Day 1 starts after the consolidated review.

## Shay runtime-truth split + bookmark intelligence estate (2026-06-14)

The Shay operator stress-test against `~/famtastic/shay-shay-intelligence-layer-v1-20260614` exposed a load-bearing truth split: `uv run shay ...` inside a worktree executes that worktree's code, but the live launchd gateway and `~/.local/bin/shay` can still point at the separate main checkout (`~/famtastic/shay-shay`). Future Shay audits must explicitly separate working-tree truth, committed-branch truth, and live-runtime truth instead of saying a capability is simply “implemented” or “live”.

The same stress-test also confirmed that GitHub bookmark intelligence is already an active local asset, not a future idea. Live surfaces now include `shay cron list` jobs `github-bookmarks-daily-ingest` and `github-bookmarks-morning-action-plan`, plus vault artifacts under `~/famtastic/obsidian/Shay-Memory/research/` such as `github-bookmarks-index-latest.json` and `github-bookmarks-report-latest.md`. Known gaps: capability-awareness docs were still citing several missing authority files as if they existed on the branch, and the current venv lacked `pytest`, so operator validation currently leans on direct CLI/runtime probes more than repo test execution.

## Travel/event price-intelligence research pattern (2026-06-14)

Canonical artifact: `research/famu-rattler-cruise-2026-price-brief.md`. This run reinforced a load-bearing research rule for travel/event pricing: preserve source hierarchy instead of flattening it. Official/group pages, public itinerary pages, occupancy-filtered OTA pages, and event-pass pages answer different questions, so the brief must keep “cheapest verified public price floor” separate from “exact 3/4-person bookable quote” instead of overwriting one with the other.

Operational lesson: when 3rd/4th guest pricing is pushed behind a manual quote wall, stop pretending the browser alone can finish the job. Save the strongest verified public baseline, then hand off a concrete booking-details checklist for the next session: per-guest breakdown, taxes/fees, deposit, cabin category, event-pass inclusion, and direct-vs-group comparison. This keeps the research honest and prevents next-session restart drift.