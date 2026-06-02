## 2026-06-02 — Owner Cash App cashtag wired into the brain + billing defaults

Recorded Fritz's real Cash App cashtag **`$FAMtasticFritz`** (Fitzgerald Medine) as a first-class fact. New canonical config `platform/config/owner-profile.json` holds the public payment handle (cashtag is receive-info, not a secret — lives in git). `billing.generate-invoice` now auto-falls-back to it when a `cashapp` invoice omits the cashtag (verified: explicit, fallback, and no-payment-block paths all pass). Also recorded in `.wolf/cerebrum.md` (User Preferences), `SITE-LEARNINGS.md`, and the billing README so every agent/session resolves "where do we get paid" without asking again. Replaced the old `$FritzMedine` placeholder in the example with the real cashtag.

## 2026-06-02 — Money rails: Cash App billing, credential skill, Resend go-live runbook, security alert

Pushed toward Fritz's "real money today" goal and surfaced the honest blockers. (1) **Cash App billing**: `billing.generate-invoice` now honors an optional `payment` block — Cash App invoices render "Pay $X to $cashtag" + a `cash.app` link (with the honest caveat that the amount-prefill path isn't officially supported; use an official Cash App Payment Link via `method:link` when the amount must be locked). Backward compatible. New `examples/sample-engagement-cashapp.json` ($100 deposit, placeholder cashtag). (2) **register-credential skill** (`.claude/skills/register-credential/`, user-invocable) + `platform/capabilities/vault/register-credential.sh` (allowlisted vault-write, secret read from env/stdin not argv, never echoed) + `vault.register-credential` registry record (now 24 capabilities). (3) **Resend go-live runbook** (`docs/runbooks/RESEND-REACH-GO-LIVE.md`) — exact on-Mac steps to bring the Reach Fabric email channel live and send a real ping. (4) **Security alert** (`docs/SECURITY-CREDENTIAL-EXPOSURE-2026-06-02.md`) — recon found all production secrets in plaintext in a Google Doc ("FAMtastic API's"); doc lists exposed credential classes + rotation checklist (no values). (5) **Fast-cash playbook** (`docs/shay-fritz-ready/FAST-CASH-TODAY.md`) — ranked same-day $100 plays; #1 is collecting on already-owed work. HONEST CONSTRAINTS recorded: this cloud sandbox's network is firewalled (can't send mail / hit any external API — sends run on Fritz's Mac), and a real Cash App payment needs a real client + Fritz's $cashtag, which no automation can conjure.

## 2026-06-02 — Reach Fabric + Companion App PWA + financial agents ($10 leaderboard)

Built three runnable pieces toward the omnipresent-assistant + companion-app priorities. (1) **Reach Fabric** (`lib/reach-fabric/`): one `sendReach({message,title,urgency,channels})` that walks channels by urgency/availability with guaranteed console fallback and a JSONL audit line per send; adapters for console (always live), email (Resend), telegram, sms (Twilio), push (Web Push/VAPID) — missing creds → `isAvailable()=false`, never throws. Capability `reach.send` + `platform/capabilities/reach/send.sh`; selftest passes. (2) **Companion App** (`companion-app/`): an installable, offline-capable PWA — Chat view with a pluggable `CHAT_ENDPOINT` (mock until the Shay gateway is wired) plus a Today tab rendering `command-center/state.json`; verified serving 200s locally. Open on phone via LAN IP, Add to Home Screen. (3) **Financial agents** (`scripts/finance-agents/`): 6 strategy agents (momentum, mean-reversion, SMA trend-follow, buy-&-hold SPY baseline, equal-weight, volatility-breakout) that report a $10-stake leaderboard from a keyless Stooq feed. A brain grep confirmed **no prior financial code existed**. IMPORTANT: in the cloud container the Stooq feed is firewalled (HTTP 403), so the committed leaderboard uses **labeled SAMPLE/synthetic data** (winner: mean-reversion $10→$10.26) — on an open network `run.js` pulls real data automatically; no real market numbers were fabricated. Registered `financial-agents` plan; marked tasks done with proofs; advanced `shay-omnipresent-assistant`, `fritz-companion-app`, `financial-agents`. Live execution (Alpaca paper) is gated on broker creds. Board: 12 plans, audit clean.

## 2026-06-02 — Command Center / Mission Control v1 + Shay billing & work-ops capabilities

Built the workshop dashboard Fritz asked for. New generator `scripts/command-center/build-command-center.js` (no deps) reads the live ledgers (plans/registry.json, tasks/runs/proofs jsonl, agents/catalog.json, platform/registry/capabilities.json, sites) and emits `command-center/{index.html, briefing.md, state.json}` — a mobile-first dashboard with KPI tiles, a "Needs you now" list, a plan-health doughnut and an autonomy×profit quadrant, plus a Virtual-Fritz briefing. Scoring (stage/momentum/autonomy/profit) is heuristic and tunable in the generator's SCORING block. It surfaced the real state: the 8 prior active plans were all stalled at checkpoints with 0 open tasks. Also scaffolded two Shay capabilities under `platform/capabilities/` — `billing.*` (working invoice generation; send blocked on a payment-provider decision) and `work.*` (Jira/standup drafting with a hard human-approval-before-send gate) — registered all six in `platform/registry/capabilities.json`, and wrote `docs/shay-fritz-ready/ROADMAP.md`. Registered `mission-control-command-center` as a tracked plan with 5 open tasks; plan audit clean. Deferred: fam-hub command + cron, Studio /api/ops surfacing, phone delivery of the briefing, and the credential/provider decisions that unblock the capability send paths. Follow-up same day (Fritz direction): taught the generator to track **Fritz priority** as distinct from profit (⭐ KPI tile, card badge, "Your priorities" briefing section, priority-first sort via a `priority`/`fritz_priority` field); registered two high-priority product plans — `shay-omnipresent-assistant` (turn Shay into a manager-grade assistant with a virtual body, reachable everywhere — phone/web/voice/watch/AR glasses; research-first) and `fritz-companion-app` (a pocket clone of how Fritz talks to his second-in-command) — each with 4 open tasks (now in motion). Kicked off a background landscape-research workstream writing `docs/shay-fritz-ready/VIRTUAL-ASSISTANT-LANDSCAPE.md`.

## 2026-05-29 — Shay "default to Gemini" permanently fixed: Claude Code weekly cap diagnosed + context bloat cut

Corrected the earlier "subscription depleted" diagnosis. Claude works in Desktop/web on the same account; Shay specifically hits the Claude Code rolling **weekly** usage cap (separate from chat). Burned by per-call context bloat (~55k input tokens/call, dominated by a 22.6k-token skills prompt injecting all 160 skills) and a secondary `model=default` 404 bug. Shipped three changes that hold permanently: (a) added `skills.max_count: 40` + `always_include` config and a `_apply_skill_count_cap` helper in `agent/prompt_builder.py` — verified skills block drops 22,600 → 1,274 tokens; (b) added `tools.include` allowlist on `mcp_servers.basic-memory` (27 → 7 useful tools, total roster 35 → 19); (c) fixed `agent/plugin_llm.py:586` to never send the literal string `"default"` as a model name. Net per-call savings ~24.5k tokens (~55k → ~30k). Existing 99% prompt-cache hit rate preserved. Plan at `~/.claude/plans/no-dude-this-is-zesty-minsky.md`, buglog #210.

## 2026-05-29 — Shay memory architecture rebuilt: cognee retired for basic-memory + Smart Connections

Replaced the finicky cognee vault-brain with an all-local split stack (autonomous /goal run). Diagnosed cognee as non-functional — it defaults to OpenAI embeddings (no key present) and needs flaky local LLM graph-extraction. Installed `basic-memory` (uv tool) as Shay's write+recall layer, scoped to `~/famtastic/obsidian/Shay-Memory` (deliberately NOT the whole vault, since its sync mutates frontmatter); it uses local FastEmbed `bge-small-en-v1.5` (no API key) and verified end-to-end — wrote a note, reindexed, semantic search returned it at score 0.65. Placed Smart Connections 4.5.0 + Visualizer 1.0.27 plugin files into the Obsidian vault and enabled them (human visual brain; needs one GUI step — open Obsidian, disable Restricted Mode, let it index). Retired cognee (commented out in `~/.shay/config.yaml`, preserved in backups); after gateway restart only `obsidian` + `basic-memory` (27 tools) load. Deferred: `smart-connections-mcp` (agent reuse of SC embeddings) — its third-party npm build was blocked by the security classifier and is redundant given basic-memory's own search; needs explicit build approval if wanted.

## 2026-05-29 — Shay brain "keeps switching": subscription drain diagnosed + bulk-routing leak closed

Diagnosed why Shay's interactive brain kept falling back to Gemini: the Claude Max subscription (OAuth via `CLAUDE_CODE_OAUTH_TOKEN` — the only Anthropic credential present; no `ANTHROPIC_API_KEY` exists) was depleted, returning HTTP 400 "out of extra usage" on every call. Confirmed it never switched to API billing — same token worked yesterday with 200s, zero 401s today. Proximate cause: switching the default to Opus 4 plus overnight batch/swarm work all running on the Max brain. Closed the bulk-routing leak: every bulk driver shelled out `shay -z` with no `--provider`/`--model`, inheriting the Claude default. Routed research/synthesis/orchestrator/cron jobs to Gemini (`overnight_ops.py`, `rerun-cited.py`, `mbsh-swarm-launch.py`, 3 agent cron jobs in `~/.shay/cron/jobs.json`), the raw swarm spawner (`shay-agent-os/launch-agent.py`) to local Ollama hermes3, and repointed cognee MCP off Claude. Hard-gated the `ANTHROPIC_API_KEY` fallback in `shay-shay/agent/anthropic_adapter.py` behind `SHAY_ALLOW_ANTHROPIC_API_KEY` so subscription→API billing can never happen silently. Deferred/unverified: cognee still needs a local embedding model + gateway restart to actually function (pre-existing gap); local-Ollama oneshot rendering not smoke-tested.

### 2026-05-29 - NCS Redesign Opportunity & Business Plan

**Context:** Following the successful `muapi url-to-design` generation for the National CAD Standard V7 site, demonstrating high-quality, rapid mockups.

**Decisions Made:**
*   **Business Model:** Productized service targeting standards orgs, associations, gov agencies, nonprofits.
*   **Pricing:** Tiered model (Mockup Pitch, Full Redesign & Build Package, Maintenance Retainer).
*   **Branding:** Standalone brand under the FAMtastic umbrella.
*   **Go-to-Market:** "Mockup-first, sell-the-vision" approach. Identify prospects, generate `muapi` mockups for their sites, lead with visual pitch in outreach, secure deposit, then build.

**Exact Next Steps:**

1.  **Fritz Action:** Provide GoDaddy domain inventory (domain, status, expiry) for evaluation against new business concept.
    *   **Owner:** Fritz
    *   **Deadline:** EOD Today (2026-05-29)
2.  **Claude Code Action:** Upon receiving domain inventory, identify suitable domains for the standalone redesign brand.
    *   **Owner:** Claude Code
    *   **Deadline:** Immediate upon receipt of #1.
3.  **Claude Code Action:** Research and compile a list of 5-10 initial prospects (standards orgs, associations, gov agencies, nonprofits with dated sites).
    *   **Owner:** Claude Code
    *   **Deadline:** EOD Tomorrow (2026-05-30)
4.  **Claude Code Action:** (Once #3 is complete) Generate `muapi` mockups for 2-3 top prospects' key pages.
    *   **Owner:** Claude Code
    *   **Deadline:** End of Week (2026-05-31)

**New Ideas Surfaced:**
*   `muapi` as an "AI-powered sales engineer" for pre-sales.
*   The potential for a "nominal fee" for the initial mockup to qualify leads.

**What to Build or Validate First:**
*   **Validate:** The effectiveness of the "mockup-first" cold outreach. This is the critical sales hypothesis.
*   **Build:** The internal workflow for taking an approved mockup from `muapi` to a full-fledged design system and code implementation. This will be needed post-sale.

---
