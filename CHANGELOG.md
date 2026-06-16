## 2026-06-02 — Autopilot: client-upsell agent (fastest-money monetization path)

Added the client-upsell agent (`autopilot/stages/client-upsell.mjs`) — the lowest-friction revenue path, since FAMtastic already builds sites for local businesses that don't make social video. `discoverClients()` scans `sites/` and the sibling `../famtastic-sites/` for `spec.json`; `extractBrand()` pulls name, vertical, tone, and a vivid accent color (hex-mined from visual_direction/style_fingerprint/brand_mark, filtered against near-black/white/gray, with per-vertical fallbacks); `runClientUpsell()` generates a branded promo via the faceless generator in the client's own accent, optionally renders the MP4, and drafts + stages a personalized offer email (`email.txt`). Email is governance-gated (dry-run/staged until a sender + provider creds exist). New CLI command `node autopilot/cli.mjs clients [--render]`; new config keys `client_limit`, `client_offer`, `client_from_email`. Verified against the real `site-mbsh-reunion` client: detected it, extracted accent `#C8102E`, generated a branded promo spec, rendered a real MP4, and staged the offer email. Tests now 9 (added two `extractBrand` cases). Updated plan `plan_2026_06_02_autopilot_faceless` (ws_money_agents: client-upsell done; build-and-flip still todo). Deferred: live email send (needs Resend/SMTP creds + a real from-address), and the build-and-flip channel-tracking agent.

## 2026-06-02 — Autopilot: autonomous faceless-video business (concept→collection→advertising→feedback)

Built `autopilot/` — a self-running content factory on top of the faceless video generator, designed to run unattended with no human in the loop. Five-stage loop: Concept (`stages/concept.mjs`, explore/exploit niche bandit + ROI scoring + dedupe) → Collection (`stages/collection.mjs`, calls the faceless `generateVideoSpec`, QA, SEO metadata, affiliate links, optional MP4 render) → Advertising (`stages/advertising.mjs` + `publishers.mjs`, scheduler + YouTube/TikTok/Instagram adapters, dry-run staged bundles → live when creds present) → Feedback (`stages/feedback.mjs`, simulated-or-real metrics → niche-weight learning → projected revenue + memory candidates). Conducted by `orchestrator.mjs`, driven by `cli.mjs` (`tick`/`status`/`report`/`stop`/`resume`/`config`). Autonomy guardrails: hard $5/day budget governor (`lib/budget.mjs`), governance gate with kill switch and dry-run-unless-live+creds (`lib/governance.mjs`), JSONL audit ledgers mirrored to the data-center (`lib/ledger.mjs` + `lib/interop.mjs`), credential vault lookup (`lib/vault.mjs`), and reused `evaluateRunHealth`. Reuses FAMtastic infra per recon (data-center ledgers, autopilot health, vault, memory/plans); uses JSONL instead of the SQLite job queue since `better-sqlite3` isn't installed. Cron/launchd installer at `install-cron.sh`. Verified: 7 unit tests pass, full `tick` runs end-to-end (3 concepts → 3 specs → 9 staged posts → feedback), and a real 4.1MB MP4 rendered through the autopilot via the Playwright headless_shell. Operator inputs locked: YT+TikTok+IG, all four money models, $5/day, auto-discover niches. Docs: `autopilot/ROLLOUT-PLAN.md` + `autopilot/README.md`. Deferred (known gaps): live platform upload calls are stubbed integration points (need account credentials), analytics are simulated until API creds, no AI b-roll/thumbnail gen yet, no client-upsell/build-and-flip agents yet.

## 2026-06-02 — Faceless video generator added to the Remotion engine

Built a faceless short-form video generator on the existing `remotion/` engine (FAMtastic's take on the SamurAIGPT AI-Faceless-Video-Generator, swapping the GPU-bound SadTalker talking-head for the monetizable captioned-b-roll format). New pipeline: `remotion/src/pipeline/{core,script,tts,index}.mjs` turns a topic into a render-ready `video-spec.json` — script via OpenAI with a real templated fallback, voiceover via OpenAI/ElevenLabs with a built-in MP3 duration parser, and a pure/deterministic `buildSpec()`. New Remotion composition `FacelessVideo` (`src/faceless/*.tsx`) renders any length/format via `calculateMetadata`, with word-by-word karaoke captions, Ken Burns backgrounds, progress bar, and brand chip. CLI at `bin/faceless.mjs` (`node bin/faceless.mjs "<topic>" [--format --scenes --render]`). The whole thing runs with zero API keys (templated script + silent video + estimated timing). Verified: 13 pipeline unit tests pass, `tsc` clean, demo spec generates (5 scenes / ~32s), and a real MP4 renders here against the Playwright Chromium (Remotion's own Chromium download host is blocked by this sandbox's network allowlist — works normally off-sandbox). Docs in `remotion/FACELESS.md` and `remotion/MONETIZATION.md`. Deferred: stock-footage/B-roll image sourcing (backgrounds are gradients unless a per-scene image is supplied), background music bed, and a Studio/web UI front-end — all logged as known gaps.

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
