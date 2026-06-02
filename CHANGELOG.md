## 2026-06-02 — Agent Business OS: concept→collections rollout plan + payments capability

Wrote the autonomous operating plan into the collective brain (`obsidian/Agent-Business-OS/Rollout-Plan.md`): the six-stage spine (concept→capture→decision→conversion→fulfillment→collections), the three-clock operating loop on the existing job queue, an eight-agent virtual roster (capture/qualifier/sdr/delivery/billing + orchestrator/monitor/memo) with per-agent triggers and autonomy flags, the monitoring/alerting design, founder control-plane gates, and a 5-wave build order. Scaffolded a `payments` platform capability (`platform/capabilities/payments/`: `payment-link.sh` builds a Cash App `$cashtag` link from the vault — no money moves; `reconcile.sh` surfaces `manual_required` for Cash App and defers to Stripe webhooks; README). Established the secure credential model: money secrets live in the Keychain vault (`payments/cashapp.cashtag`, `payments/stripe.*`), the brain holds only a reference (`Credentials.md`) — because `obsidian/` is git-tracked and a pasted secret would leak. Verified the scripts (no-cashtag→manual_required, stored→link, bad amount→error, reconcile→manual_required); test secret removed, audit ledger gitignored. Deferred and surfaced as explicit decisions: payment rail (Cash App vs Stripe), credential storage location, and how far billing automation goes before a human gate — no money movement or live credentials until those are answered.

## 2026-06-02 — Agent Business OS: lead backend + booking hook wired

Connected the qualification form to a real backend. Added `agent-business-os/api/lead/` — an Azure Static Web Apps function (anonymous `POST /api/lead`) that validates name/email/bottleneck, scores fit 0–100 into hot/warm/nurture with a 15/60/240-min SLA, drops spam via a `company_website` honeypot, then fail-soft persists to Azure Table and forwards to webhook + Telegram (all optional env vars; returns 200 even with none set). Wired the front end via `dist/assets/js/config.js` (`ABOS_LEAD_ENDPOINT=/api/lead`, plus an `ABOS_BOOKING_URL` hook that points every "Book Strategy Call" CTA at a Cal.com/Calendly link when set); the form keeps a `localStorage` fallback. Shipped deploy scaffolding: `staticwebapp.config.json` + a gated GitHub Actions workflow (`ABOS_DEPLOY_ENABLED` var + `AZURE_STATIC_WEB_APPS_API_TOKEN_ABOS` secret). Verified the function with a mock-context harness (valid-hot→200/fit100, missing-email→400, honeypot→200, GET→405, raw-string body→200). Still deferred: create the Azure resource + secret, set a real booking URL and lead env vars, point DNS.

## 2026-06-02 — Agent Business OS landing site built (zero-human-business concept)

Started a business front door overnight: built `agent-business-os/`, a single-page FAMtastic landing site for **Agent Business OS** ("Your business runs itself. You run your business."), adapted from the zero-human-business concept at `github.com/IAMGODIAM/zero-human-business-landing` (canonical `agentbusinessos.com`). Hand-authored to DNA standards — layered `fam-hero-layered` hero, `NAV_SKELETON` nav, real SVG dividers, multi-part logo SVGs, zero inline styles — with all source content faithfully carried over: four agent layers (Capture/Decision/Conversion/Fulfillment), 30-day rollout, live ROI calculator, tiered pricing ($2,500 / $3,500+$1,500mo / custom), qualification funnel, and FAQ. Lead form posts to `window.ABOS_LEAD_ENDPOINT` and falls back to `localStorage` until a backend is wired. Validated structurally (JS syntax, asset resolution, DNA invariants); not visually screenshotted (no browser engine in this container) and not yet deployed. Deferred: connect a live lead/booking backend and point DNS. Fixed one bug en route — a form field named `name` collided with `HTMLFormElement.name` (.wolf buglog bug-185).

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
