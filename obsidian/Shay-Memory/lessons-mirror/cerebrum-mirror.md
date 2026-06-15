---
title: Cerebrum (mirrored for Shay)
synced: 2026-06-15 15:46:44.197504
source: .wolf/cerebrum.md
tags:
- cerebrum
- lessons
- do-not-repeat
- mirror
permalink: shay-memory/lessons-mirror/cerebrum-mirror
---

# Cerebrum

> OpenWolf's learning memory. Updated automatically as the AI learns from interactions.
> Do not edit manually unless correcting an error.
> Last updated: 2026-06-06

## muapi recipe orchestration — verified working catalog (2026-05-19)

When building brand/media work with muapi, USE THE PREBUILT RECIPE SKILLS, do NOT
hand-build via primitives. The recipes deliver in ~15 min what primitives take 5+ hours
to assemble manually.

### Verified-working models in muapi CLI (`muapi models list`)
- **Text-to-image (reliable):** `gpt4o` (best text legibility), `flux-dev`, `flux-schnell`,
  `flux-kontext-dev/pro/max`, `hidream-fast/dev/full`, `wan2.1`, `reve`, `qwen`
- **Text-to-image (returned Not Found on this account):** `midjourney`, `seedream`
- **Image edit:** `flux-kontext-max-edit` works; `flux-kontext-dev/pro` work
- **Image-to-video (verified working):** `wan2.2`
- **Image-to-video (returned Not Found):** `kling-pro`, `seedance-pro`
- **Image-to-video (CLI/API param mismatch):** `veo3-fast` (CLI sends `image_url`,
  API expects `images_list`)

### Recipe-skill models that DON'T exist in muapi catalog (need substitution)
The muapi recipe skills reference newer model aliases that aren't yet in CLI:
- `ideogram-v3-t2i` → substitute `gpt4o` (best text legibility we have)
- `flux-2-pro` → substitute `flux-dev` or `hidream-full`
- `nano-banana-pro` → substitute `gpt4o` or `flux-kontext-max`
- `nano-banana-2` → substitute `flux-dev`
- `nano-banana-2-edit` → substitute `flux-kontext-max`
- `bytedance-seedream-v4.5` → substitute `gpt4o`
- `gpt-image-2-text-to-image` → substitute `gpt4o`
- `veo3.1-fast-image-to-video` → substitute `wan2.2`

### Critical execution gotchas
1. **Multi-segment brand names render unreliably.** Logos with names like
   "FAMtastic" (FAM + tastic split) sometimes drop the F (yields "AMtastic")
   or misspell ("Famino", "TaSTIC"). OCR-validate logo outputs before shipping.
2. **flux-kontext-max edit drifts beyond instructions.** Asked for "add 3D
   depth, preserve composition" — got a beautiful but DIFFERENT composition
   (circle medallion vs the source's rectangular layout). Treat flux-kontext-max
   as "high-quality reinterpretation," not "literal edit."
3. **muapi recipes are interactive-prompt-heavy.** `muapi remotion skills add`
   prompts for agent target interactively even with `--yes --global`. Use
   git-clone + manual file copy as workaround for non-interactive install.

### Quality-rated recipe skills (★★★★★ = ship-ready)
- `muapi-design-guide`: ★★★★★ — color palette + typography + UI kit + mockups
- `muapi-logo-branding`: ★★★★☆ — 3 logos + mockup (text-legibility issues)
- `muapi-brand-kit`: ★★★★☆ — moodboard + pattern + 2 logos (logos can be redundant)
- `muapi-3d-logo-animation`: ★★★☆☆ — 3D image good; animation needs wan2.2 fallback

## Tool Availability (Verified April 21, 2026)

### Image Generation
- Google Imagen 4.0: AVAILABLE (Gemini API, $25 funded, ~$0.004/image) — `imagen-4.0-generate-001`
- Google Imagen 3 edit_image: AVAILABLE — `imagen-3.0-capability-001` — used for character pose generation with SubjectReferenceImage
- Leonardo.ai Phoenix: AVAILABLE (API, $5 free credit, ~$0.016/image)
- Adobe Firefly API: NOT AVAILABLE (requires enterprise $1K+/mo — verified in Developer Console)
- Adobe Firefly Web: AVAILABLE (Playwright automation, CC credits)
- ffmpeg 8.1: INSTALLED at /opt/homebrew/bin/ffmpeg (installed April 21, 2026)

### Video Generation
- Google Veo: AVAILABLE (Gemini API, tested, 33s generation, 1.6MB output)
- Adobe Firefly Video: AVAILABLE via web only (CC credits, no API)

### Character Pose Generation — CRITICAL DO-NOT-REPEAT
- `SubjectReferenceImage` / `edit_image` is VERTEX AI ONLY in google-genai SDK v1.50.0+
- `client.models.edit_image()` raises `ValueError: This method is only supported in the Vertex AI client` when using Gemini Developer API key — this is SDK-enforced, not a config issue
- Vertex AI client requires GCP project + location credentials — NOT an API key. Not configured in this environment.
- **WORKING APPROACH: use fal-ai/flux-pulid via fal.ai API** (FAL_KEY in site-studio/.env)
  1. Upload anchor: `anchor_url = fal_client.upload(bytes, 'image/png')`
  2. Submit: `handle = fal_client.submit('fal-ai/flux-pulid', arguments={'reference_image_url': anchor_url, 'prompt': ..., 'image_size': {'width': 768, 'height': 1024}, 'num_inference_steps': 28})`
  3. Poll: `fal_client.status('fal-ai/flux-pulid', handle.request_id)`
  4. Fetch: `result = fal_client.result('fal-ai/flux-pulid', handle.request_id)`
  5. Download: `urllib.request.urlretrieve(result['images'][0]['url'], output_path)`
- Field is `reference_image_url` (singular string), NOT `reference_images` (array)
- Use submit/poll/result pattern (not subscribe) for poses that take >45s
- `scripts/google-media-generate` `--subject-ref` flag and `generate_character_pose()` function are BROKEN for Gemini Developer API — only work with Vertex AI credentials
- Batch mode `"type": "character_pose"` in the script is similarly broken without Vertex AI

### Post-Processing
- Photoshop via adb-mcp: PARTIALLY AVAILABLE (installed, UXP plugin load bug being fixed)
- Premiere via adb-mcp: PARTIALLY AVAILABLE (installed, same UXP dependency)

### Code Review
- Codex plugin: AVAILABLE (/codex:review, /codex:adversarial-review, /codex:rescue)
- Codex MCP (official): AVAILABLE (Claude Desktop)
- Codex Bridge MCP: AVAILABLE (Claude Desktop)

### Standing Rule
Never attempt Adobe Firefly API calls. They will always fail.
Route to Google Imagen API or Firefly web via Playwright instead.
Every new API integration must be verified in the capability
registry before first use.

## User Preferences

<!-- How the user likes things done. Code style, tools, patterns, communication. -->

- **Communication: decide + advise, don't interrogate (2026-06-06, Fritz correction):** Fritz called out "you're asking too many questions and not giving advice." As his second-in-command / AI Boss, **make the call and act on it** — give a clear recommendation and ship it, rather than ending every turn with "want me to do X or Y?" Reserve `AskUserQuestion` for genuinely irreversible / his-call-only forks (e.g. push to main, spend money, pick which surface to KEEP). For ordinary build choices, pick the obviously-right option, state it in one line, and proceed. He wants momentum and a decisive partner, not a menu.

- **Owner Cash App cashtag (2026-06-02):** Fritz's Cash App is **`$FAMtasticFritz`** (account: Fitzgerald Medine, `https://cash.app/$FAMtasticFritz`). This is PUBLIC receive-info (printed on a QR), not a secret — safe in git. Canonical store: `platform/config/owner-profile.json` (`payment.cashapp.cashtag`). `billing.generate-invoice` auto-falls-back to it when a `cashapp` invoice omits the cashtag. Any "who do we get paid to / what's the cashtag" question resolves from owner-profile.json — do NOT ask Fritz again.
- **Merge to main at end of each work block (2026-06-04, Fritz-approved):** Don't let a feature branch drift dozens of commits ahead of `main` — Shay and other agents run off `main` and can't see un-merged work, which caused a "Claude said / Shay can't find it" phantom-data incident. At the end of each meaningful block, after committing+pushing the feature branch, **fast-forward `main`**: `git push origin HEAD:main` (only when it's a clean fast-forward — `git rev-list --count HEAD..origin/main` must be 0; if main diverged, do a real merge and resolve, never force). This keeps the shared brain on `main` current for every surface.
- **Brain provider cost-routing policy (2026-06-04, Fritz directive):** Authenticate **subscription/OAuth providers FIRST**, fall back to **pay-per-token API keys** only after a subscription hits its rate limit. Rationale: subscriptions are flat-rate / already paid; the metered APIs "have been killing" the budget. **Tier 1 (try first, subscription/OAuth):** `google-gemini-cli`, `openai-codex` (Fritz has a Codex sub), `copilot` (gh token — **confirmed Copilot FREE tier (not paid), verified github.com/settings/copilot 2026-06-04: a small monthly "included credits" pool of premium-model requests incl. claude-sonnet-4.6/GPT-5.x. Usable as a DEEP fallback only — it'll exhaust under sustained load, so keep a fuller lane (Codex sub) behind it**). **Tier 2 (fallback on cooldown, metered):** `gemini` (AI Studio API key), `anthropic`, `openai`. Primary brain = **`google-gemini-cli`**, `gemini` API as its fallback. Implement via `shay model` (sets PRIMARY) + `shay fallback add` (ordered chain, tried on rate-limit/overload/connection errors). Apply the same subscription-first ordering to every brain lane. **NOTE — Codex weekly cap:** the OpenAI Codex sub has a WEEKLY cap Fritz once exhausted in a single day; keep Codex as a *deeper* fallback (never primary), and while it's mid-cap (e.g. "full until June 7") order a live provider like Copilot AHEAD of it so requests don't waste a round-trip on a known-capped provider. The chain self-heals when the cap resets. **ROOT CAUSE of the prior "API is killing me" bleed (found 2026-06-04):** before the fix, `shay model` showed Active provider = **OpenRouter (pay-per-use)** with model "(not set)" — Shay was reaching "Gemini" THROUGH OpenRouter's per-call markup, NOT a direct Google auth. That's why Fritz thought he was "running Gemini" with nothing authenticated, and why every call billed. Fixed by setting a direct Google AI Studio key as primary. **FREE-FIRST ordering principle:** to spend free/included quota before paying, the PRIMARY must be a free/flat lane (e.g. Copilot Pro's included requests, or a non-billed free-tier key); metered keys (the paid Gemini key) belong LAST as overflow. Shay's fallback fires on the 429 a provider returns when its free quota is exhausted — so free-quota-first happens automatically IF the chain is ordered flat→metered. The paid-Gemini-as-primary chain set up on 2026-06-04 bills from request #1; reorder to Copilot/Codex-first if Fritz wants true free-first. **Gemini API facts for cost decisions (2026-06-04):** (1) the Gemini API has **NO flat-rate per-model option** — it's pay-per-token only; flat-rate Gemini only exists via the consumer Google AI Pro/Ultra app sub (not real API access) or Code-Assist OAuth (account-risk). So the only true flat-rate brains are **Copilot / Codex / OpenCode-Go / Nous** subs. (2) The Gemini **free tier (non-billed key) may use prompts to improve Google products** — a privacy downside for an AI-Boss handling Fritz's business/personal data; prefer paid **Flash** (very cheap) or a flat-rate sub as primary over a free-tier key. (3) Cost lever: **Flash is ~5-10x cheaper than Pro** — default routine/worker work to Flash, reserve Pro for hard reasoning.
- **Shay = ORCHESTRATOR, not worker (2026-06-04, Fritz directive):** The premium reasoning brains (`gemini-3.1-pro-preview` primary + `claude-sonnet-4.6` fallback, set via `shay model`/`shay fallback`) are ONLY for **orchestration** — Shay's thinking, planning, task-assignment. The actual WORK must run on cheap/free **worker-lane** brains, NOT the orchestration brains. Worker picks already researched in `obsidian/Shay-Memory/research/free-models-discovery-2026-05-31.md`: `qwen3-coder:free` (coding), `deepseek-v4-flash:free` (reasoning), `kimi-k2.6:free` (agentic) via OpenRouter `:free` (genuinely free, 20 rpm / 200 rpd cap), local Ollama (`qwen2.5`/`phi4-mini`, unlimited $0), `Gemini Flash` or Cerebras/Groq free tiers for overflow beyond the free caps. NOTE: OpenRouter's **`:free` collection IS free** (fine for workers) — only its *paid* routing as the orchestrator brain was the bleed. Worker-lane model config lives in `shay config` / coordinator settings (config.yaml currently on defaults).
- **Claude Code is Fritz's PRIMARY bulk-work worker lane (2026-06-04 directive):** Shay delegates heavy/complex bulk work to **Claude Code** (already wired — Shay's skill catalog has `autonomous-ai-agents: claude-code, codex, opencode`; also reachable via `scripts/claude-cli` / `fam-hub agent run claude` / `ask-claude`). **COST TRAP:** this is only flat-rate if Claude Code is authenticated via Fritz's **Claude Pro/Max subscription** — if it falls back to an **Anthropic API key**, bulk delegation bills per-token (Claude is pricey) and re-creates the "API is killing me" problem on Anthropic. Ensure `claude` is logged in via the subscription, not `ANTHROPIC_API_KEY`. Worker tiering: **Claude Code (sub) = real/complex bulk**; **free OpenRouter `:free` / local Ollama / Gemini Flash = trivial + overflow** when the Claude sub hits its cap.
- **OpenCode Go = the flat-rate SWARM/worker lane (researched 2026-06-04):** $5 first month then **$10/mo** for strong OPEN coding models (DeepSeek V4 Pro/Flash, Qwen3.6 Plus, Kimi K2.6, GLM-5.1, MiniMax M2.7, MiMo-V2.5). OpenAI-compatible endpoint → plugs into Shay as a provider (subscribe via OpenCode Zen, copy API key). **NOT unlimited — dollar-value caps: ~$12/5hr, $30/week, $60/month-equivalent** (≈6x the $10 price in usage). Ideal swarm brain: the same open models Fritz's `free-models-discovery` picked, but with real headroom vs the free tier's 200 req/day. Distinguish: **OpenCode Zen** = pay-as-you-go metered gateway (auto-reloads $20 when balance <$5 — watch this); **opencode** (lowercase) = the open-source CLI coding agent in Shay's `autonomous-ai-agents` catalog. Fritz's flat-rate stack plan: **Copilot $9 (frontier brains) + OpenCode Go $10 (open-model swarm) + Claude Code (sub, heavy bulk) + free/Ollama (overflow)** — segment subs by use, ~$19/mo predictable. **OpenCode Go setting (2026-06-04): turn OFF "Use your available balance after reaching the usage limits"** — that toggle is a silent-overage switch (charges Zen pay-as-you-go balance once the flat Go caps are hit). Keep it OFF so hitting a cap returns a 429, which makes Shay's worker chain **downshift to the free/Ollama overflow lane instead of silently billing** — the whole point of the architecture is cap→fallback, not cap→surprise-charge. Go caps confirmed: rolling (5hr), weekly (3-day), monthly (~30-day). **WIRING CORRECTION (2026-06-04, from real `shay config`/`coordinator`):** OpenCode Go is configured in the **opencode CLI agent** (`opencode auth login` → select opencode → paste the Go key → `/models` to pick a Go model), **NOT** in `shay auth` — Shay delegates bulk work to the `opencode` agent, which then uses Go. `shay coordinator` is **build-isolation only** (git-worktree serialization for safe concurrent multi-build; subcommands status/prune) — NOT model config. `shay config` exposes a **single brain model** (`gemini-3.1-pro-preview` / provider `gemini`) + max-turns 90; no separate worker-model field is shown in the summary. **CONFIRMED via full config.yaml (2026-06-04): Shay's config has ONLY `model` (brain) + `fallback_providers` (brain fallback chain: gemini-2.5-pro → copilot/claude-sonnet-4.6) — there is NO worker/delegate/swarm model field.** So Shay's worker lanes ARE **external-agent delegations** (claude-code → Claude sub, opencode → Go, codex → Codex sub), each configured in its OWN tool — **nothing to set inside Shay for workers.** NOTE: Shay's OWN direct tool-work (terminal/file/code_execution) runs on the BRAIN model — so to keep bulk work OFF the expensive brain she must DELEGATE it, which is a SOUL/persona instruction, not a config toggle. Config also exposes `routing.cost_aware:false` + `daily_budget_usd:0` (a cost-aware routing system exists, tied to `shay coordinator --low-funds` — optional future lever). Chain note: Codex not yet added to `fallback_providers` as of this config read. Also from config: research/tool keys (Tavily/Exa/Firecrawl/OpenRouter) all UNSET → web/research tool is dark until a key is added (`shay setup`).
- **DO-NOT-REPEAT — Shay's real runtime (2026-06-04):** Shay's running agent is the **Python `shay` CLI** (Python 3.13 venv, OpenAI SDK, `~/.local/bin/shay`, runtime home `~/.shay/` with SOUL.md/skills/memories/cron/sessions). Brain = an **authenticated cloud provider** (Gemini/Codex/Nous/MiniMax/OpenRouter), NOT local Ollama+Redis. The Ollama+Redis+Rowboat-fork description in `shay-agent-os/AGENTS.md` is the **separate Shay Desktop/Web/Workspace Electron surface** — do NOT conflate them. **Authority for her health is her own `shay doctor`** (`shay doctor --fix` auto-fixes). I once wrote a readiness doc off the stale AGENTS.md architecture — verify against `shay doctor` before prescribing Shay fixes.

## Key Learnings

- **Interior hero chevron absolute-bottom pattern:** Interior-hero chevron is `position: absolute` at section bottom (z-index above plaque), with an exaggerated bounce that travels up and overlaps the marker text. In-flow chevron cannot reach section bottom because the marker band pushes it out of view. This is the canonical interior-hero chevron pattern.
- **Interior hero marker-band edge padding:** Marker band has edge padding (~4vw), not full-bleed. The dark velvet panel sits INSIDE the viewport with visible margin on left and right.
- **Interior hero full-width marker band:** Interior hero marker plaque renders FULL WIDTH of the 33vh band, center-aligned text, with bulb chase as a full-width row beneath. This is the canonical pattern; do NOT left-anchor the marker.
- **Interior hero marker plaques are HTML/CSS, not SVG:** Marker plaques for interior heroes render as HTML/CSS, NOT SVG. SVG is over-engineered for horizontal banners with text and decorative bulbs. HTML/CSS is faster to iterate, easier to style, and uses the same bulb-chase pattern as the bleed-bulb-row. Reserve SVG for actual vector illustrations (logos, complex shapes, character silhouettes), not text banners.
- **Interior hero two-band proportion:** Interior hero section composes as 2 bands: hero stage (2/3 height) + marker band (1/3 height). Marker plaque owns the bottom band; chevron marks section end. This becomes the canonical proportion for cinematic-interior-hero recipe across all interior reels.
- **Preview-harness-to-live wiring rule:** when a generated hero preview is approved, live CSS must preserve the preview composition first (character side, marker side, headline side, full-width stage) before adding atmosphere/bleed layers. Animation layers are judged against the approved preview, not against a newly improvised layout.
- **Summarization always uses Claude:** When conversation history exceeds 20 turns, the oldest 10 turns are summarized using Claude regardless of the currently active brain. This is a standing decision. Do not change to the active brain. Logged with source: "summarization".

- **Project:** famtastic
- **Description:** Owns adapters, router/config, and installers for agents. Writes local sources to:
- **Post-processing pipeline order matters:** extractAndRegisterSlots MUST run before reapplySlotMappings, otherwise renamed slots lose their images
- **buildPromptContext mutates currentPage:** This was a hidden side effect — now returns resolvedPage instead, caller updates explicitly
- **syncHeadSection 80-char fingerprint:** Style blocks were matched by first 80 chars which missed content-only updates. Now uses MD5 hash.
- **extractSharedCss strips ALL non-data-page styles:** This was removing page-specific styles. Now only strips styles that match content extracted from index.html.
- **summarizeHtml was a no-op:** It appended "FULL HTML:" + full source after the summary, defeating the purpose. Fixed to return summary only.
- **classifyRequest false positives:** "history" alone triggered version_history, "restore" alone triggered rollback. Both now require version/previous context words.
- **Multi-page fallback path has no post-processing:** When Claude's multi-page response failed to parse, HTML was written directly without any post-processing. Now calls runPostProcessing.
- **Single-page edits skip ensureHeadDependencies:** Only full builds called it. Now single-page edits call it too.
- **gemini-cli stdin consumed twice:** bash `$(cat)` reads stdin, then Python `os.read(0,...)` tries again on empty stdin. Fixed by piping with printf.
- **precommit-security had unclosed quote:** The security grep was silently bypassed because a single quote was never closed, swallowing the pipe.
- **Parallel build timeout race condition:** Timeout handler AND close handler both incremented `innerCompleted`. Fixed by removing increment from timeout (kill triggers close).
- **Two browser tabs cause session reset:** Each new WS connection called `startSession()`. Now only the first connection starts a session.
- **`chat` WS type dropped silently:** Server sent `{type:'chat'}` for build-in-progress errors but client had no handler. Added `case 'chat':` handler.
- **Template font URLs break with multi-word fonts:** `{{HEADING_FONT}}` in Google Fonts URL produced broken URLs for "Playfair Display". Added `{{HEADING_FONT_URL}}` with `+` encoding.

- **bp.global is dead code:** buildBlueprintContext() only reads bp.pages[page], never bp.global. nav_style, footer_style, logo are written but never injected into prompts.
- **Blueprint components never reconcile:** mergeComponents() only adds, never removes. Deleted popups/modals persist forever, causing Claude to re-insert them.
- **Blueprint escape hatch too wide:** "User requests always take priority" lets any change request override all blueprint protections. No mechanism to distinguish "change X" from "change Y but preserve X".
- **Blueprint title regex has stray pipe:** `/<title[^>]*>([^<|]+)/i` — the `|` in character class stops matching at literal pipe. Minor but technically wrong.
- **No blueprint page cleanup:** Deleted pages stay in bp.pages forever. Need reconciliation against DIST_DIR files.
- **restyle routes to handlePlanning() — wrong handler:** The routing switch at line ~4757 sends `restyle` to `handlePlanning()` (brief creation flow) instead of `handleChatMessage()`. The restyle mode instruction exists inside handleChatMessage but is unreachable dead code. Need to route restyle to handleChatMessage.
- **No conversational ack type:** Messages like "yes", "ok", "looks good" when brief exists fall to `layout_update` default and trigger full Claude HTML generation. Need a `conversational_ack` or `affirmation` classifier type.
- **fill_stock_photos too aggressive:** "add an image to the hero section" triggers bulk stock fill. Needs guard to distinguish single-image targeted requests from bulk fills.
- **asset_import catches hero as section name:** "create a hero section" fires asset_import because `hero` matches. Needs image/asset context words to disambiguate.
- **bug_fix catches non-bug uses of "fix":** "fix the colors to match brand" → bug_fix mode that says "fix only the specific problem, don't change design direction" — suppresses the actual change.
- **brainstorm-to-build hard-codes layout_update:** Should infer request type from brainstorm discussion context.
- **handleQuery() silent no-op:** If none of 4 internal branches match, user gets no response at all.
- **Prompt injection:** userMessage is injected verbatim into Claude prompt at `USER REQUEST: "${userMessage}"`. Pasted code/adversarial text has no sanitization.

- **POST /api/replace-placeholder has no newSrc validation:** Can inject `onerror="alert(1)"` into every `<img>` tag. Fix: validate scheme (only assets/, http(s)://), length cap, reject event handler patterns.
- **WebSocket has no origin check:** wss.on('connection') never validates Origin header. Any localhost page can establish a WS connection. Fix: check origin against localhost:3334.
- **DELETE /api/projects/:tag has no path traversal check:** `../important-dir` as tag would move directories above sites/. Fix: validate tag against `/^[a-z0-9][a-z0-9-]*$/`.
- **set-page WS message skips isValidPageName():** `../spec.json` as page could overwrite spec.json via Claude. Fix: call isValidPageName() before path operations.
- **6 dead settings in studio-config.json:** `deploy_target` (never forwarded to deploy script), `deploy_team` (script hardcodes "fritz-medine"), `max_upload_size_mb` (multer uses hardcoded 5MB), `max_versions` (never enforced), `preview_port`/`studio_port` (server reads env vars). Fix: wire each setting to its actual behavior or remove from UI.
- **analytics_provider/analytics_id have no Settings UI:** Build pipeline injects GA4/Plausible snippets but there's no modal field to configure them. Must edit studio-config.json by hand.
- **Site switch writes summary to wrong site:** endSession() is not awaited before TAG changes on site switch. generateSessionSummary resolves SUMMARIES_DIR() after TAG has changed, writing the summary to the new site's directory. Fix: await endSession() before changing TAG, or capture SUMMARIES_DIR() path before the switch.
- **134/137 ws.send calls unguarded:** No ws.readyState check before sending in child.on('close') and other build completion handlers. Mid-build WS disconnect causes unhandled throw → potential server crash. Fix: wrap all ws.send in a safeSend(ws, data) helper that checks readyState.
- **generateSessionSummary can hang gracefulShutdown:** Failed fs.writeFileSync inside the promise never calls resolve(). gracefulShutdown awaits endSession() which awaits the summary → SIGTERM handler blocks forever. Fix: wrap writeFileSync in try/catch inside the promise.
- **Client onmessage has no JSON.parse guard:** Malformed server message throws uncaught in the handler. Fix: wrap JSON.parse in try/catch.
- **MCP server is read-only:** 4 tools read from disk only. No write capability — cannot trigger builds, switch pages, fill images, or post chat messages. Studio has 40+ REST endpoints that should be exposed as MCP tools.
- **No programmatic chat/build endpoint:** Builds can only be triggered via browser WebSocket. Adding `POST /api/chat` would make the system scriptable from MCP, CLI, and CI.
- **Playwright MCP unused:** Installed but not connected to build validation or test pipeline. Should validate generated sites after builds.
- **settings.local.json has dead paths:** 155 allow entries reference old repos (famtastic-agent-hub, famtastic-platform, famtastic-think-tank) from before consolidation.
- **User brainstorm messages not tagged:** Only assistant responses get `intent:'brainstorm'`. User messages have no intent tag. Context-gathering heuristic at brainstorm-to-build transition is fragile — breaks if non-brainstorm entry appears mid-session.
- **20-message brainstorm cap drops context silently:** Long brainstorm sessions lose earliest ideas with no warning or summary step. No truncation notice in build instruction.
- **Empty brainstorm → "Build this" is destructive:** Falls through as literal `layout_update "Build this"` with no brainstorm context. Classifier bypassed. Could cause unintended regeneration.
- **Blueprint layout_notes never populated:** The `startsWith('assistant:')` filter in brainstorm-to-blueprint fails for multi-line content. All real sites have `layout_notes: []`.
- **No brainstorm-vs-brief conflict detection:** If brainstorm discusses contradicting the brief (e.g., "go dark mode" when brief says "white"), Claude reconciles silently with no flagging step.
- **DELETE /api/upload doesn't clean slot_mappings:** Deleting an upload removes it from uploaded_assets and disk but not from slot_mappings. The orphaned mapping gets reapplied on every rebuild → broken image in production. Fix: also delete slot_mappings entry pointing to that file.
- **parallelBuild missing slot stability instruction:** _slotStabilityInstruction is only built inside handleChatMessage, never inside parallelBuild. Full rebuilds let Claude rename slot IDs freely, orphaning all mappings. Fix: inject slot stability per-page in parallel build prompts.
- **clearSlotAssignment is non-atomic:** Two sequential calls (replace-slot then clear-slot-mapping). If second fails, media_specs shows status='uploaded' for a transparent GIF. Fix: create a dedicated clear endpoint or make it atomic.
- **reapplySlotMappings hardcodes status:'uploaded':** Stock photo slots become 'uploaded' after rebuild. Fix: store original status in slot_mappings and restore it.
- **scanBrandHealth has write side effect:** Writes spec.brand_health on every GET call, invalidating spec cache. Should compute and return without persisting, or cache separately.
- **spec.json schema required fields never written:** `colors` and `pages` are marked required in site-spec.schema.json but are never populated. Code falls through to `design_brief.must_have_sections` for pages and `extractBrandColors()` for colors. Schema is decorative — no runtime validation.
- **.studio.json has no write-through cache:** Unlike spec.json (readSpec/writeSpec), `.studio.json` uses raw read-modify-write from 4 code paths (versionFile, saveStudio, startSession, generateSessionSummary). Lost-write race possible during async summary generation.
- **writeSpec() not atomic:** Uses `fs.writeFileSync()` directly — no `.tmp` + rename pattern. Process crash mid-write could corrupt spec.json.
- **media_specs / slot_mappings redundancy:** Two structures track same slots with overlapping data. Could be unified by adding src/alt/provider/credit/query to media_specs entries directly.
- **business_type always empty:** Read in 6 places (SEO, stock queries, new-site flow) but written as empty string during creation and never updated.
- **design_decisions garbage entries:** extractDecisions() can capture AI prompt fragments as decisions. `superseded` status exists in schema but no code path ever sets it.
- **PUT /api/settings allowedKeys incomplete:** Nested objects (email, sms, stock_photo) can't be modified through the settings API — only direct file edit works.

## Do-Not-Repeat

<!-- Mistakes made and corrected. Each entry prevents the same mistake recurring. -->
<!-- Format: [YYYY-MM-DD] Description of what went wrong and what to do instead. -->
- [2026-06-02] "Shay" is her OWN project, NOT `site-studio/shay-shay/`. That folder is only the Studio chat orchestrator persona. The real Shay agent core lives in `shay-shay/` (gitignored, on Fritz's Mac), the swarm pipeline in `shay-agent-os/` (tracked — skills live in `shay-agent-os/skills/<name>/SKILL.md`), and the runtime home in `~/.shay/` (SOUL.md, kanban, gateway). To "give Shay a skill," install into `shay-agent-os/skills/`, NOT `site-studio/shay-shay/`.
- [2026-06-02] Don't count only branch-based sessions when asked "what did sessions do" — Shay runs her own task stream recorded in `obsidian/Shay-Memory/` (builds/, plans/, reflections/). Check there too.
- [2026-05-14] Do NOT add rope-continues-into-bleed pattern unless the scene plate has a stanchion endpoint baked in that the rope can visually anchor to. The pattern fails when the rope has no destination.
- [2026-03-25] Never mutate module-level state inside a function that looks like a pure reader (buildPromptContext). Return the resolved value and let the caller mutate.
- [2026-03-25] When extracting shared CSS, only strip blocks whose content matches what was extracted — don't blindly strip all non-data-page style blocks.
- [2026-03-25] String prefix matching (substring(0, 80)) is unreliable for deduplication. Use content hashes.
- [2026-03-25] Every HTML write path must go through runPostProcessing — no exceptions, including fallback paths.
- [2026-04-20] PREVIEW_SERVER_QUERY_STRINGS: The preview server (previewServer in server.js, line ~14117) must strip query strings before file path lookup. `req.url` includes `?t=...` cache-busters — `path.join(dist, req.url)` produces a path like `dist/index.html?t=123` which doesn't exist. Fix: `const urlPath = req.url.split('?')[0]` before `path.join`. All `navigateToPage()` calls add `?t=Date.now()` — without this fix they always return 404.
- [2026-04-20] NAV_SKELETON_MANDATORY: Nav class names MUST be enforced via famtastic-skeletons.js NAV_SKELETON constant. Without it, template CSS and parallel page HTML can use different class conventions (desktop-nav vs nav-desktop, etc.) causing both navs to render simultaneously. NAV_SKELETON mandates: .nav-links, .nav-cta, .nav-toggle-label, .nav-mobile-menu, #nav-toggle. Injected into buildTemplatePrompt() NAVIGATION section AND famSkeletonBlock for parallel builds.
- [2026-03-25] When a timeout handler kills a process, don't increment counters in both the timeout and the close event — the close event already fires from kill().

- **Root cause of all integration failures:** Five independent state readers (classifyRequest, buildPromptContext, runPostProcessing, HTTP handlers, WS handler) all read state from disk/globals independently. When one modifies state, others don't know. This is a state architecture problem, not a logic problem.
- **POST-PROCESSING CONTEXT section needed in prompts:** Claude doesn't know what happens to its output (nav sync, CSS extraction, head injection). Adding ~120 tokens of pipeline description prevents an entire class of CSS consistency and slot drift bugs.
- **server.js decomposition plan:** 5381 lines → ~200 line thin assembler + 12 modules in lib/. Key modules: SessionStore (owns all mutable state), SiteSpec (write-through cache), PromptBuilder (guaranteed context inclusion), Classifier (confidence tiers + session context), PostProcessor (document-map pattern — read once, mutate in-memory, write once), ClaudeRunner, ResponseParser, SlotManager, StockPhotoService, BlueprintStore, Settings (TTL cache), ConversationLog (with intent field).
- **Phase priority: 3→2→1→4→5→6→7.** PromptBuilder first (highest UX ROI), then ConversationLog+Settings, then SessionStore, then Classifier, then PostProcessor, then route extraction, then UI JS extraction.

## Decision Log

<!-- Significant technical decisions with rationale. Why X was chosen over Y. -->
- [2026-03-25] TEMPLATE-FIRST ARCHITECTURE APPROVED: Build `_template.html` first (header, nav, footer, shared CSS, head deps) in one Claude call, then build ALL pages in true parallel. Each page copies chrome verbatim from template, generates only `<main>` content + `<style data-page="pagename">` block. Eliminates 7 of 11 post-processing steps (syncNav, syncFooter, syncHead, ensureHeadDeps, extractSharedCss, reconcileSlotMappings, CSS seed extraction). Template uses `data-template="shared|header|footer"` attribute anchors for extraction. Per-page CSS stays inline (not separate files) at 3-10 page scale. `_template.html` lives in dist/ but is excluded from deploys. All SSGs (Hugo, Eleventy, Astro, Jekyll) use this pattern. Implementation: 5 phases, each independently shippable.
- [2026-03-25] POST-PROCESSING ORDER: extract slots → reapply mappings → metadata → reconcile → logo → nav/footer → head deps → head sync → CSS extract. This ensures slots exist before mappings are applied, and head dependencies are injected before head sync propagates them.
- [2026-03-25] SPEC WHITELIST: Only design_brief, design_decisions, site_name, business_type can be updated via WS update-spec. This prevents arbitrary spec overwrites.
- [2026-03-25] SETTINGS REDACTION: GET /api/settings redacts all API keys, showing only `_configured: true/false`. POST still accepts full values for saving.
- [2026-03-25] CLASSIFIER ANCHORING: version_history requires "version" as anchor word. Rollback requires "version" or "previous" near "restore". This prevents false positives on common words.
- [2026-04-07] VS_CODE_LAYOUT: Studio layout is now left sidebar + tabbed canvas + CLI bar + right sidebar. Key IDs: #left-sidebar, #center-area, #canvas-area, #canvas-tab-bar, #cli-bar, #cli-tab-bar. Old #chat-panel replaced by #cli-chat, old #preview-panel content moved to #canvas-preview. #studio-panel kept as right sidebar ID. Resizers: #resizer-left, #resizer-right (vertical), #resizer-h (horizontal).
- [2026-04-07] CLI_TAB_PANE_SPECIFICITY: When using ID-based display rules (#cli-terminal { display: flex }) alongside class-based hidden rules (.cli-tab-pane.hidden { display: none }), the ID wins. Fix: use !important on the hidden rule or avoid setting display on the ID selector.
- [2026-04-07] DATA_DRIVEN_TABS: Canvas and CLI tabs are now data-driven via querySelectorAll + data-pane/data-hook attributes. New tabs need only HTML — no JS array changes. Functions: switchCanvasTab(), switchCliTab(). Canvas tabs: preview, editable, images, research, compare. CLI tabs: chat, terminal, codex.
- [2026-04-07] CANVAS_PANE_HIDING: Use `display:none !important` for hidden canvas panes, not `opacity:0`. Opacity-based hiding leaks iframe content (especially Compare tab's side-by-side iframes).
- [2026-04-07] CODEX_STDIN_CLOSE: Always close stdin immediately when exec'ing codex-cli via execFile. The script has an interactive fallback (line 7) that hangs HTTP requests. Fix: `child.stdin.end()` after spawn.
- [2026-04-07] RESEARCH_FILENAME_ALLOWLIST: Never use req.params directly for file paths. Allowlist via readdirSync then check includes(). Pattern: `const allowed = fs.readdirSync(dir).filter(f => f.endsWith('.md')); if (!allowed.includes(filename)) return 404;`
- [2026-04-09] PHASE3_MULTI_AGENT: `logAgentCall()` appends to `sites/<tag>/agent-calls.jsonl`. `validateAgentHtml()` returns `{ valid, score, issues }` (valid = score >= 40). `/api/compare/generate-v2` implements Codex→Claude fallback. `/api/agent/stats` and `/api/agent/routing` serve analytics. HTML scoring must use pre-declared `const valid` for shorthand return to work.
- [2026-04-09] PHASE4_IMAGE_RESEARCH: `/api/image-suggestions` derives chips from `spec.design_brief`. Research verticals endpoint `/api/research/verticals` MUST be declared before `/api/research/:filename` (static before parameterized). Research trigger writes stub markdown to `sites/<tag>/research/`. Research-to-brief extractor reads markdown sections and returns `brief_text`. UI additions: suggested query chips, shortlist sidebar, A/B compare pane, research trigger form.
- [2026-04-09] PHASE5_INTELLIGENCE_LOOP: `generateIntelReport()` reads `agent-calls.jsonl`, `mutations.jsonl`, `library.json` — produces findings with category/severity. Five valid categories: cost, performance, mutations, components, agents. Four valid severities: critical, major, minor, opportunity. `POST /api/intel/promote` writes to `sites/<tag>/intelligence-promotions.json`. `POST /api/intel/run-research` writes stub to `docs/intelligence-reports/`. Return value must use `site: TAG` (not `SITE_TAG`). Library extraction: always `libRaw.components || []`.

## Do-Not-Repeat

- [2026-04-09] TAG_VS_SITE_TAG: The server has TWO site-tag variables. `process.env.SITE_TAG` is the startup env var — set once, never changes. `TAG` is the mutable runtime variable that changes whenever the user switches sites. Any function that needs the CURRENT active site must use `TAG` (and `SITE_DIR()`, `DIST_DIR()` helpers). Using `SITE_TAG` (env var) inside route handlers or `generateIntelReport()` causes a ReferenceError at runtime if the var name is wrong, or silently uses stale site data.
- [2026-04-09] LIBRARY_JSON_STRUCTURE: `library.json` is `{ version, components[], last_updated }` — NOT a flat array. Always extract: `const libRaw = JSON.parse(raw); const library = Array.isArray(libRaw) ? libRaw : (libRaw.components || []);`. Using `libRaw.length` when it's an object returns `undefined`, causing NaN in downstream math (e.g., `component_count`).
- [2026-04-09] EXPRESS_ROUTE_ORDERING: Static route segments MUST be declared BEFORE parameterized routes. Example: `app.get('/api/research/verticals', ...)` MUST come before `app.get('/api/research/:filename', ...)`. Express matches top-to-bottom; if the parameterized route is first, "verticals" gets treated as `:filename` and hits the allowlist → 404. This is permanent — never put `:param` before a fixed-string variant of the same path.
- [2026-04-09] RETURN_SHORTHAND_VS_INLINE: When a test asserts `return { valid, score, issues }` shorthand syntax exists in source, the code must use `const valid = expr; return { valid, score, issues }` — NOT `return { valid: expr, score, issues }`. The shorthand only works when the variable name matches the key and is pre-declared. Inline expressions break shorthand destructuring and also fail text-search assertions.
- [2026-04-09] FALLBACK_RESPONSE_COMPLETENESS: Empty/zero-data fallback responses (e.g., when a .jsonl file doesn't exist yet) MUST include ALL fields that the API contract promises. Tests run before any live data exists — the fallback path is exercised first. Missing fields like `failure_count` or `last_call` in an early-return cause tests to fail on fields that are trivially supported. Always document every field in the happy-path response and mirror them all in the fallback.
- [2026-04-09] SUBPROCESS_CLI_MULTI_TURN: DECISION — Multi-turn conversation for subprocess CLIs (spawnClaude, spawnBrainAdapter) is NOT solved in Session 8. `claude --print` supports `--input-format text` and `--input-format stream-json` only — NOT a JSON messages array format. Text-formatted history prepending (e.g., "Human: ... \n\nAssistant: ...") is best-effort convention, not a structured API. Real multi-turn is deferred to Session 9 SDK migration. spawnClaude() subprocess calls remain single-turn. Do NOT attempt to solve subprocess multi-turn before the SDK migration.
- [2026-04-09] SUMMARIZATION_ALWAYS_CLAUDE: When conversation history exceeds 20 turns, the oldest 10 turns are summarized using Claude regardless of the currently active brain. This is a standing decision — do not change to the active brain. Logged with source: "summarization". Applies to all three adapters (claude, gemini, codex).

- [2026-03-26] SPAWN_CLAUDE_CWD: Never set cwd to HUB_ROOT (~/famtastic/) in spawnClaude(). CLAUDE.md in that dir contains OpenWolf instructions; with --tools "" the subprocess cannot execute them and produces 0 bytes. Use os.tmpdir() instead.
- [2026-03-26] FIXED_LAYOUT_PATCHER_DOUBLE_INJECT: fixLayoutOverflow() used html.includes('STUDIO LAYOUT FOUNDATION') to skip already-patched pages. But the string is in styles.css (external), not in the HTML. So every build injected another inline <style> block into every page. Fix: skip ALL inline patching when styles.css exists.
- [2026-03-26] INLINE_CSS_INJECTION_NEWLINE: When injecting CSS into an existing <style> block, always prefix with \n. Without it, the injection concatenates onto the previous declaration's last token, silently breaking it.
- [2026-03-26] MAIN_OVERFLOW_COMMENT_ACCURACY: main { overflow-x: hidden } is a secondary clip layer. The primary protection against header stretching is html/body { overflow-x: hidden }. Do not comment main as "prevents header from widening" — that's the body rule doing it.
- [2026-03-26] TEMPLATE_PROMPT_MAIN_STYLES: Do not include main{} rules in buildTemplatePrompt() shared CSS block. Claude generates a template with no <main> in the body — it will skip or inconsistently include main styles. Post-processing (fixLayoutOverflow) handles main containment reliably.

### 2026-04-06 — Multi-page conversion via Studio chat: what works and what doesn't
- "Break into separate pages" classifies as `layout_update` — wrong. Need a `restructure` or `split_pages` classifier intent.
- "Rebuild the site with all 4 pages" classifies as `build` — correct. Use explicit rebuild language for multi-page generation.
- `execute-plan` WS handler silently drops plans generated from `layout_update` intent. No error, no build, no feedback. Only `build` classified plans actually trigger Claude.
- spec.json `pages` array MUST be manually updated before a multi-page rebuild. The brief approval and new_site handler only set `pages: ["home"]` regardless of how many pages the brief requests. The `design_brief.must_have_sections` field has the correct pages but they're never copied to `spec.pages`.
- Multiple plan cards accumulate in the DOM. When sending execute-plan, use the LAST plan card's planId, not the first.
- Working multi-page conversion path: (1) edit spec.json pages array, (2) send "Rebuild the site with all N pages: list them", (3) approve the plan.

### 2026-04-03 — Playwright autonomous build: DOM-based detection is the only viable approach
- WS messages in server.js are unicast (`ws.send()`), never broadcast. A standalone WS client cannot observe responses to another client's messages.
- DOM-based detection works: count `#chat-messages > div` before sending, wait for count to increase + `#step-log` to disappear.
- `page.fill()` works for the chat textarea but for long messages (>200 chars), `page.evaluate()` to set `.value` directly is faster and avoids input event timeouts.
- Plan approval cards (`build-plan` type) block automation — edits trigger plan proposals, not immediate builds. The Playwright script accidentally waited through the 240s timeout, at which point the plan auto-resolved.
- `new_site` classifier path doesn't generate multi-page sites from brief. It writes spec then calls handleChatMessage which builds single-page. Multi-page requires spec.pages to already have multiple entries before the build triggers.
- Targeted stock photo searches ("Search for X for the Y") misclassify as `layout_update` instead of stock-related intent.

## Key Learnings

- [2026-03-26] TEMPLATE_FIRST_PATTERN: Studio uses a two-phase build — template first (header/nav/footer/shared CSS), then all pages in parallel. Each page copies chrome verbatim. Functions: buildTemplatePrompt(), extractTemplateComponents(), loadTemplateContext(), writeTemplateArtifacts(), applyTemplateToPages(). Guard: templateSpawned flag prevents double-build race.
- [2026-03-26] NAV_CONTAINMENT_MODEL: Nav width stability = two rules: (1) html/body overflow-x:hidden stops body layout expanding past viewport. (2) main overflow-x:hidden clips page content inside main before it affects ancestors. .container class (max-width: 90rem) is injected into every styles.css as a shared utility.

### 2026-03-26 — overflow-x hidden breaks hero breakout
- `overflow-x: hidden` on body or main clips CSS breakout techniques (`width: 100vw; left: 50%; margin-left: -50vw`)
- For the hero breakout to work, neither body nor main can have overflow-x: hidden
- The 90% max-width on main is sufficient to prevent horizontal scrollbars — overflow-x hidden is not needed as a belt-and-suspenders

### 2026-03-26 — CLAUDE.md in cwd hijacks claude --print subprocess
- When `claude --print` runs from a directory containing CLAUDE.md, it reads project instructions
- With `--tools ""` active, those instructions (especially OpenWolf "check anatomy.md") cause empty output
- Fix: set cwd to os.tmpdir() so no CLAUDE.md is found
- Also: scripts/claude-cli wrapper fails with relative paths when cwd != HUB_ROOT — bypass it entirely

### 2026-03-31 — WS connection state and subprocess lifecycle (Wave A–D fixes)

- `currentMode` is module-level and MUST be reset at the top of `wss.on('connection')`. Any persistent session state that should be per-client (not per-process) must be reset on connect, not just on disconnect.
- `page_switch` intent must be checked BEFORE the brainstorm-mode fallthrough block. The pattern: classify first, then decide whether to fall into mode-specific routing.
- Input validation must happen BEFORE appendConvo and BEFORE classifyRequest — both functions accept arbitrary string length and have no guards themselves.
- All WS-routed `spawnClaude` calls must store the child ref on `ws.currentChild` (single child) or push to `ws.activeChildren[]` (parallel builds). `ws.on('close')` is the cleanup site — check both and kill.
- Haiku fallback in `handleChatMessage` reassigns `child` — must update `ws.currentChild` at the reassignment point, not just at the initial spawn.
- Test flood utilities: any `connect()` that could have concurrent listeners added should call `ws.setMaxListeners(0)` immediately — this suppresses `MaxListenersExceededWarning` without masking real leaks.

### 2026-03-27 — Studio code push UX needs rethinking
- Currently "Push Studio Code" in Server tab does a quick git add/commit/push of the famtastic hub repo
- But proper commits with meaningful messages should go through CLI
- Future: Studio should be able to manage its own code changes with commit message prompts, possibly a dedicated "Studio Updates" panel or integration with the existing git flow
- The separation of site repo vs hub repo pushes needs clearer UX — users shouldn't have to think about which repo they're pushing to

## Session 10 Decisions

- **DECISION: Tool calling is Claude-only (Session 10).** Gemini and OpenAI tool format translation deferred to Session 12. Do not pass STUDIO_TOOLS to GeminiAdapter or CodexAdapter.
- **SECURITY: read_file tool validates path is within SITE_DIR() before reading.** path.resolve() + startsWith(siteRoot) check prevents path traversal. Never remove this check.
- **Tool recursion limit:** MAX_TOOL_DEPTH = 3 in ClaudeAdapter._executeBlocking(). Prevents infinite loops on tool errors.
- **ws through options:** ws must flow through the options chain (execute(message, { ws })), never stored as this.ws on adapter instances. Adapters are potentially reused — storing ws on them creates stale reference bugs.
- **getModel() override:** BrainInterface.execute() reads ws.brainModels[brain] and passes it as options.model. ClaudeAdapter uses passed model if present, falls back to DEFAULT_MODEL constant.

## Session 17 Do-Not-Repeat Rules

### ORB_STATE_MACHINE (2026-04-20, updated 2026-05-02)
- `#pip-dynamic-area` transitions go through `setOrbState(state, data)` ONLY — never write to the area directly from event listeners
- **Five valid states** (updated for Shay v2): `IDLE`, `BRIEF_PROGRESS`, `BRAINSTORM_ACTIVE`, `REVIEW_ACTIVE`, `SHAY_THINKING`
- `currentOrbState` is the single source of truth (module-level var in `studio-orb.js`)
- `SHAY_THINKING` was added in code on 2026-04-20 and formalized in the contract on 2026-05-02 (Shay architecture v2). Has a min-display window (`SHAY_THINKING_MIN_MS = 800`) so brief reasoning bursts don't flicker the orb.
- When adding a new dynamic-area renderer, add a new state constant and route it through `setOrbState` — do not bypass

### TEST_RETURN_SHAPE_ASSERTIONS (2026-04-20)
- `tests/session12-phase0-tests.js` asserts the exact return-object shape of `buildPromptContext()` as a substring match
- When adding new return values to `buildPromptContext()`, update the test assertion at line 154 to match the new full shape
- Current shape: `'heroSkeleton, dividerSkeleton, navSkeleton, inlineStyleProhibition'` (+ more fields after)

## Session 3-A Do-Not-Repeat Rules

### RESEARCH_FEED_INDEX (2026-04-20)
- Pinecone cannot return results sorted by timestamp — `site-studio/intelligence/research-feed-index.json` is the local chronological index
- All new research storage paths must call `researchRouter.appendToFeedIndex(entry)` after successful Pinecone upsert
- `listFindings()` reads from the local file, NOT from Pinecone — do not call Pinecone for feed listing

### FAM_SCORE (2026-04-20)
- `runBuildVerification()` now returns a `score` field (0–100, integer) — do not remove it; `finishParallelBuild` reads it to write `spec.fam_score`
- Write `spec.fam_score` in the `last_verification` block in `finishParallelBuild` — NOT inside `runBuildVerification` itself (that function is also called by read-only `/api/verify`)

### RESEARCH_ROUTER_SKIP_CACHE (2026-04-20)
- `queryResearch(vertical, question, { skipCache: true })` or `{ forceSource: 'gemini_loop' }` both bypass Pinecone cache
- `forceSource` was already in the code; `skipCache` was added in Session 3-A — use `skipCache: true` when you need a fresh result without constraining the source

## Session 4-A — Job Queue Schema (2026-04-20)

### JOBS_TABLE_SCHEMA (Decision Log)

SQLite table `jobs` in `~/.config/famtastic/studio.db` (via `lib/db.js`):

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | UUID |
| type | TEXT NOT NULL | job category: `build`, `research`, `deploy`, `gap`, etc. |
| status | TEXT NOT NULL | see state machine below |
| site_tag | TEXT | which site; null for global jobs |
| payload | TEXT | JSON blob (build params, research question, etc.) |
| dependencies | TEXT | JSON array of job IDs that must be `done` first |
| cost_estimate | REAL | estimated USD cost before running |
| cost_actual | REAL | actual USD cost after completion |
| created_at | TEXT | ISO timestamp |
| approved_at | TEXT | when approved (null until) |
| approved_by | TEXT | who approved (default 'fritz') |
| completed_at | TEXT | when done/failed (null until) |
| result | TEXT | JSON blob (output, error, etc.) |

**Status enum — semantics matter, parked ≠ pending:**
- `pending` — reviewed by Fritz, awaiting approval to run
- `approved` — approved, waiting for a worker to pick it up
- `running` — actively executing
- `done` — successfully completed
- `blocked` — has unmet dependencies (auto-transitions to `pending` when all deps reach `done`)
- `failed` — execution error
- `parked` — consciously deferred; NOT rejected, NOT forgotten

**State machine (lib/job-queue.js):**
- `blocked` → `pending` (automatic: all dep jobs reach `done`)
- `pending` → `approved` (POST /api/jobs/approve/:id)
- `pending` → `parked` (POST /api/jobs/park/:id)
- `blocked` → `parked` (POST /api/jobs/park/:id)
- `approved` → `running` (when worker picks up)
- `running` → `done` (completeJob)
- `running` → `failed` (failJob)

### JOB_QUEUE_DO_NOT_REPEAT (2026-04-20)
- NEVER conflate `parked` and `pending` — parked is deliberate deferral, pending is awaiting approval. They are semantically distinct states.
- `blocked` jobs auto-transition to `pending` when ALL dependency IDs reach `done` — this is automatic in `_unblockDependents()`, not manual
- JSONL migration uses `INSERT OR IGNORE` so it's idempotent — safe to call on every restart

### 2026-04-24 — Build Layer Default Injection (GAP-1/2/3)

**Key Learning: Mandatory-language palette injection works.**
Injecting `FAMTASTIC DEFAULT PALETTE (no client palette specified — you MUST use these exact hex values)` as a mandatory block in `briefContext` reliably causes Claude to apply the specified palette as CSS custom properties. Tested live: `site-small-accounting-firm` built from "Build a site for a small accounting firm" with zero hex colors in the brief — output contained all five `--color-*` properties correctly wired.

**Key Learning: Dead variable pattern — returned but never destructured.**
`buildPromptContext()` returned `heroSkeleton` and `navSkeleton` in its return object but `handleChatMessage()` did not destructure them. The variables existed in the return, were never referenced, and were silently discarded on every single-page edit. Pattern: when a function returns a large object, audit the destructure at call sites to confirm all needed fields are actually pulled out.

**DO-NOT-REPEAT (2026-04-24): Default palette injection must cover the else branch.**
The `visualRequirements` block only injects colors when client hex values are found. Without the `else` branch, a silent no-op means Claude picks industry-inference colors. Always pair "inject if present" blocks with "inject defaults if absent" fallback.

**DO-NOT-REPEAT (2026-04-24): design_brief.approved blocks all edit routing.**
`classifyRequest()` checks `spec.design_brief.approved` before any pattern matching. Sites built via `runAutonomousBuild` have `approved: false` by default — every subsequent Studio Chat message routes to `new_site` regardless of content. When testing single-page edits on autonomously-built sites, manually set `approved: true` in spec.json first.

### RULE — Separation-Ready Architecture for Future Studios (2026-04-24)

Any work touching component logic, media/image generation, or
strategy/brainstorming capability must be built assuming eventual
extraction into a standalone studio (Component Studio, Media
Studio, Think Tank respectively). Communicate through structured
payload contracts, not tight function-call coupling. Cross-studio
features — even the ones currently all living in Site Studio —
are message contracts, not function calls. Platform services
(research, memory, learning capture, Pinecone, Perplexity) must
live in a shared services namespace that Site Studio calls but
does not own.

### 2026-05-02 — MBSH Audit + Platform Layer (Cowork session)

**Decision Log:**
- [2026-05-02] REPO_SEPARATION_RULE: Site deploys live at `~/famtastic-sites/<site>/` (sibling to `~/famtastic/`, NOT nested). `~/famtastic/sites/<tag>/` is the Studio sandbox/asset-workshop. The `dist/` subdirectory under sandbox can hold builds, but the production deploy artifact lives in the sibling repo. `fam-hub site new` should default to creating the deploy repo at the correct sibling path.
- [2026-05-02] PLATFORM_CAPABILITY_PATTERN: Operational primitives live at `~/famtastic/platform/capabilities/<class>/<verb>.sh`. Each capability reads credentials from the vault (`platform/vault/vault.sh`, macOS Keychain backed), reads/writes `spec.json` as single source of truth, appends to `platform/invocations/<date>.jsonl` for audit trail, surfaces `manual_required` explicitly when underlying API coverage is incomplete — NEVER silently degrades. Standing-approval model: store once, agent reads on every invocation, Fritz sees decision points only.
- [2026-05-02] STUDIO_CANNOT_PRODUCE_MBSH: Audit gap report Section 0.11. The full V1-BRIEF asks for capabilities Studio doesn't have (no chatbot skeleton, no compass nav skeleton, no two-nav-system spec field, no layered CSS mode, no PHP backend support, no asset triage workflow, no commissioned brand mark generation pipeline). Recommendations B.1–B.8 + G.1 must land before any "Studio rebuilds MBSH" prompt is meaningful. Today's runnable v2 lives at `~/famtastic-sites/mbsh-reunion-v2/`.

**DO-NOT-REPEAT:**
- [2026-05-02] NO_DUPLICATE_TAGS: `extractBriefFromMessage` must compare proposed tags against existing `spec.json` tags using `normalizeBizName` + `checkSameBusinessIdentity`. Refuse/prompt-disambiguate when match. Evidence: `site-mbsh96reunion` vs `site-mbsh-reunion` coexisted, with the duplicate's `dist/` misleading Studio's preview with hallucinated Myrtle Beach SC content.
- [2026-05-02] VERIFY_BRIEFING_CLAIMS: Always check briefing/doc claims against the actual repo before acting. Example: briefing said Drive sync action exists with a bug — it didn't exist at all. Wasted cycles diagnosing a phantom workflow.

### vendor-fact/netlify-cannot-link-a-project-to-a-git-repository-via-api — 2026-05-05 (auto-promoted)

**Type:** `vendor-fact` | **Confidence:** 0.88 | **Facets:** vendor:netlify, deploy

Netlify cannot link a project to a Git repository via API

_See `memory/vendor-fact/netlify-cannot-link-a-project-to-a-git-repository-via-api.md` for body and evidence._

### bug-pattern/bug-pattern-cowork-ghost-session-silent-failure — 2026-05-05 (auto-promoted)

**Type:** `bug-pattern` | **Confidence:** 0.85 | **Facets:** (none)

## Bug pattern: cowork ghost-session silent failure

_See `memory/bug-pattern/bug-pattern-cowork-ghost-session-silent-failure.md` for body and evidence._

### do-not-repeat/do-not-repeat-do-not-skip-handshake-protocols — 2026-05-05 (auto-promoted)

**Type:** `do-not-repeat` | **Confidence:** 0.85 | **Facets:** (none)

## Do-not-repeat: do not skip handshake protocols

_See `memory/do-not-repeat/do-not-repeat-do-not-skip-handshake-protocols.md` for body and evidence._

### vendor-fact/gap-netlifys-git-linking-still-requires-the-vendor-ui — 2026-05-05 (auto-promoted)

**Type:** `vendor-fact` | **Confidence:** 0.88 | **Facets:** vendor:netlify, vendor:godaddy, vendor:resend, vendor:stripe

Gap: Netlify's git linking still requires the vendor UI

_See `memory/vendor-fact/gap-netlifys-git-linking-still-requires-the-vendor-ui.md` for body and evidence._

## Standing Rule — Memory Pipeline (added 2026-05-05)

Every chat session worth learning from must go through:
1. `node scripts/session-capture.js --source <s> --input <p>` (or session-end hook)
2. `node scripts/memory-promote.js review <capture-id>`
3. `node scripts/memory-promote.js promote <capture-id> --auto` (allowlist) or interactive

Auto-allowlist: `vendor-fact`, `do-not-repeat`, `bug-pattern` at confidence >= 0.85.

Source-of-truth precedence:
- `memory/INDEX.json` is the queryable index (rebuilt by promoter + digest)
- `memory/<type>/<id>.md` files are canonical entries (markdown + YAML frontmatter)
- `.wolf/cerebrum.md` (this file) gets one short backlink per promoted entry
- `SITE-LEARNINGS.md` gets a backlink only when entry has `site-execution` facet or type=`learning`
- `memory/usage.jsonl` is the append-only telemetry log

Disable telemetry with `MEMORY_TELEMETRY=off`.

Retire (don't delete) entries that drift wrong: `fam-hub memory retire <id>` — the entry stays for history, lifecycle flips to `retired`, no longer surfaces.

## Ops Workspace Rules (2026-05-05)

Standing rules introduced by `plan_2026_05_05_ops_workspace_gui` Phase 0:

1. **Freshness is derived, never stored.** All `(record_type, status, age_seconds)`
   → freshness logic must go through `site-studio/lib/ops-freshness.js`. Adding
   a parallel implementation is forbidden; that was the original "false
   agents waiting" failure mode.
2. **Every `/api/ops/*` GET response must wrap in the snapshot envelope:**
   `{ snapshot_version, generated_at, source_ledgers[], record_count, data }`.
   Endpoints that return raw arrays will silently break the WS reconcile
   contract once the WS channel ships.
3. **Every destructive `/api/ops/command/*` action must call `checkGovernance()`
   and 403 on failure.** The destructive set is `{purge, cancel, archive,
   promote, migrate}`. Adding a new destructive action means adding it to
   `DESTRUCTIVE_ACTIONS` in `ops-api.js` AND extending the test in
   `tests/ops/destructive-action-gate.test.js` — both, or the regression
   substrate is incomplete.
4. **`parked|archived|stale` records can never appear in any "live" count,
   lane, or KPI tile.** Enforced by `tests/ops/stale-cannot-inflate-live.test.js`.
5. **Inventory snapshots are immutable.** `scripts/ops/inventory.js` writes
   one dated file per day; never edit a previous day's snapshot.
6. **Studio launchd boot is a known-broken precondition (2026-05-05).**
   `site-studio/lib/{shay-shay-sessions,logger,openai-image-adapter}.js`
   are referenced by server.js but have never been tracked in git. Until
   they are restored, in-Studio verification is impossible — verify Ops
   API changes by spinning up an isolated Express harness instead.
## Standing Rule — Agent Coordination (2026-05-05)

Before scaffolding any new system, capability, or non-trivial workstream,
run `node scripts/agent-checkin.js --intent "<short>"` from the repo root.
If it reports overlapping in-flight work, coordinate with the listed branches
or pick a different scope. Respect scope-locks declared in AGENT-COORDINATION.md.
This rule was installed after the 2026-05-05 incident where Cowork's `.brain/`
and Claude Code's `memory/<type>/<id>.md` shipped in parallel as competing
solutions to the same problem.

### bug-pattern/agent-checkin-keyword-overlap-is-too-coarse-flags-merged-bra — 2026-05-05 (auto-promoted)

**Type:** `bug-pattern` | **Confidence:** 0.88 | **Facets:** agents, governance

agent-checkin keyword overlap is too coarse — flags merged branches as conflicts

_See `memory/bug-pattern/agent-checkin-keyword-overlap-is-too-coarse-flags-merged-bra.md` for body and evidence._

### vendor-fact/cpanel-uapi-overwrite-is-the-path-for-backend-deploy-on-goda — 2026-05-05 (auto-promoted)

**Type:** `vendor-fact` | **Confidence:** 0.9 | **Facets:** vendor:cpanel, vendor:godaddy, deploy, site-execution

cPanel UAPI overwrite is the path for backend deploy on GoDaddy hosting

_See `memory/vendor-fact/cpanel-uapi-overwrite-is-the-path-for-backend-deploy-on-goda.md` for body and evidence._

### do-not-repeat/do-not-mark-a-task-blocked-without-re-checking-when-external — 2026-05-05 (auto-promoted)

**Type:** `do-not-repeat` | **Confidence:** 0.88 | **Facets:** governance, ledgers

Do not mark a task blocked without re-checking when external state changes

_See `memory/do-not-repeat/do-not-mark-a-task-blocked-without-re-checking-when-external.md` for body and evidence._

## Standing Rule — Plan Closeout (added 2026-05-05)

No plan may stay `status: active` with zero open tasks for more than one
session. Use `scripts/plans/audit.js` to detect drift and `scripts/plans/closeout.js`
to ship packets. Memory candidates in closeout packets flow into the
chat-capture pipeline automatically.

### bug-pattern/when-the-locked-design-doesnt-match-what-works-the-next-agent-will-follow-whiche — 2026-05-05 (auto-promoted)

**Type:** `bug-pattern` | **Confidence:** 0.85 | **Facets:** ops

When the locked design doesn't match what works, the next agent will follow whichever surface produc

_See `memory/bug-pattern/when-the-locked-design-doesnt-match-what-works-the-next-agent-will-follow-whiche.md` for body and evidence._

### do-not-repeat/zero-task-active-plans-need-explicit-closeout — 2026-05-19 (auto-promoted)

**Type:** `do-not-repeat` | **Confidence:** 0.98 | **Facets:** plans, closeout-discipline

Zero-task active plans need explicit closeout

_See `memory/do-not-repeat/zero-task-active-plans-need-explicit-closeout.md` for body and evidence._

---

### learning/harness-not-brain-for-weak-output — 2026-05-30

**Type:** `learning` | **Confidence:** 0.95 | **Facets:** swarm, planning, quality-gates, brain-routing

**When Shay's swarm output is weak, the fix is almost never "switch the brain" — it's "add the missing harness step."** Proven by controlled experiment on 2026-05-30:

- A desktop plan scored **5/10**. Instinct said "wrong model — try Codex/Gemini."
- Reality: the plan ran on Claude/Opus (strongest available) the whole time. The 5/10 came from missing guardrails, not a weak brain.
- Holding the brain CONSTANT and adding three harness steps took the same task to **8/10**:
  1. `ground_claim()` — verify codebase facts with real `grep`/`wc` before stating them (it had claimed hermesAPI=3 bindings; real count=125).
  2. `plan_completeness_gate()` — reject truncated/section-incomplete plans.
  3. `prior_planning_lessons()` injection — read past failures before planning.
- Then `planning_loop()` made the gate ENFORCING (auto-reprompt until pass), verified catching a 4055-char truncated attempt and auto-fixing to a complete 1862-char plan on attempt 2.

**Do-not-repeat:** Don't reach for a model swap when output quality is low. First check: is there a grounding step? a completeness/quality gate? a prior-lessons injection? A grounded weak brain beats an ungrounded strong one. All three primitives live in `shay-agent-os/components/swarm/pipeline.py`. Planning runs MUST go through `planning_loop()`, not a bare `agent()` call. Evidence: buglog #215 (the 5/10), #216 (verified 5→8 fix), #217 (enforcing-loop auto-capture).

---

### do-not-repeat/no-score-chasing-in-refine-loops — 2026-05-30

**Type:** `do-not-repeat` | **Confidence:** 0.9 | **Facets:** swarm, adversarial-review, quality-gates

**Do NOT optimize an artifact against a subjective 0-10 LLM score.** Verified failure 2026-05-30: `refine_to_target()` ran on an 8/10 desktop plan to push it toward 10. It made it WORSE — final 7/10, content halved (13.6k→6k chars), internal scores dropped each round (3.3→2.7→2.7, no convergence). Root cause: (1) the score is non-deterministic and lens-dependent — the same plan scored 8 holistically and 3.3 from harsh lenses, so there's no stable hill to climb; (2) "apply all 23 fixes" + "keep everything verbatim" are contradictory, so the brain compressed and lost detail; (3) open-ended critics always return 20+ fixes regardless of quality — no convergence target. This is adversarial collapse: optimizing hard against a critic degrades the artifact toward whatever superficially silences it.

**Do instead:** Use a FIXED binary checklist (has-build-order: Y/N; every-step-is-a-code-change: Y/N; cites-grounded-count: Y/N). Revise ADDITIVELY/surgically — only add the missing checklist item, never regenerate. Measure success as checklist-items-passed, not an LLM score. Evidence: buglog #218.

---

### learning/runtime-render-gate-catches-what-typecheck-cant — 2026-05-30

**Type:** `learning` | **Confidence:** 0.95 | **Facets:** desktop, quality-gates, vitest, render-loops

A typecheck gate is NOT sufficient for core-render-path changes — the SessionNamePicker incident compiled clean and still infinite-looped at runtime. Built `runtime_render_gate()` in `shay-agent-os/components/swarm/pipeline.py`: writes a jsdom render smoke test, runs `vitest run` on it, FAILS if the render throws OR hangs. Two loop-detection paths: (a) "Maximum update depth" in output, (b) **subprocess timeout = hang = loop** (a render loop often hangs the runner rather than throwing). Proven 2026-05-30: clean component passes, infinite-loop component fails. Gotchas: vitest 4 removed `--reporter=basic` (don't use it); catch `subprocess.TimeoutExpired`, not just `RuntimeError`. This is gate #2 after typecheck for any UI build. buglog evidence in planning lessons.

---

### learning/surgical-edit-not-full-regen-for-existing-files — 2026-05-30

**Type:** `do-not-repeat` | **Confidence:** 0.95 | **Facets:** swarm, code-edit, build

To EDIT an existing file, use anchored surgical replacement (`surgical_patch()`), NOT full-file regeneration. Proven 2026-05-30: `multi_file_code_job` regenerating a 250-line App.tsx dropped braces every iteration (TS1005) and failed 4x → rolled back. Switching to `surgical_patch` (brain rewrites only the small anchored region) mounted two real screens (Soul, Models) into the core render path, FIRST try each, both gates green. Rule: new file → full generation is fine; existing file edit → surgical anchored edits. Both protected by the two-gate build (typecheck + runtime_render_gate).

## Do-Not-Repeat (2026-05-31): 'done' = runs+reachable+looks-right+usable, NOT just compiles. The QA gate (npm run qa: runtime contract check + vision judge) + adversarial review must be REQUIRED loop gates, not hand-run. Confirm the target app/file before editing (space-vs-no-space trap). Never self-attest 'done' — require vision/reviewer/human signal. Verify generated code + .d.ts against runtime.

## Do-Not-Repeat (2026-05-31 — Shay Desktop UI sprint)
- useSyncExternalStore getSnapshot MUST return a cached/stable reference (React #185). Never return a fresh Set/object per call.
- Never leave a screen wired to a placeholder `<div>` when a real implementation exists — cross-check the registry against disk; prefer a typed screen manifest.
- Scan `ipcMain.handle(` with a newline-tolerant parser; single-line grep silently stubs multi-line channel registrations.
- Chat-specific chrome (mode pills, Pinned/Recents, New session) is screen-scoped to navView==='chat', not global shell.
- Electron desktop defaults to the designed DARK theme; system/light on a light-mode Mac renders a flat-white "broken" screen.
- "No handler registered for X" must degrade to defaults, not surface raw error text.
- Definition of done for any UI unit = launches + nav-reachable + 0 console errors + vision score >=8, NOT just typecheck-green.
- 7 skills minted to shay-agent-os/skills/ encode these: micro-patch-living-file, render-spine-guard, visual-qa-gate, claude-desktop-style-match, settings-store-snapshot-cache, dead-wire-detector, typed-screen-manifest.

## Tier-3 Interview Learnings (2026-06-06)

Source: `obsidian/01-Shay/SHAY-INTERVIEW-2026-06-06.md` (9 questions + synthesis). All promoted into SOUL.md runtime + `obsidian/01-Shay/SHAY-SOUL.md` canonical backup. The load-bearing items:

### Identity redefinition (most important)
- Shay = ORCHESTRATOR, not executor. Value = investigate every method/technology/agent/process + dispatch the right one. Building everything yourself = becoming the bottleneck.
- Each agent is a seed. Each process is a seed. Incorporate many, let them prove themselves through peer review. Same fractal as FAMtastic itself.
- "Build skills for reusable patterns; don't do work directly" is now a hard rule, not a preference.

### Mission correction
- 1,000 SITES → 1,000 PROJECTS. Each $100/mo revenue seed across all studios counts, not just sites.
- Studio set is EVER-EXPANDING, not fixed at three. Fourth studio named: FAMtastic Thoughts (Teach/Preserve — blog + concept collection + peer-review-survival-mechanism).

### The seed thesis (load-bearing — appears at every layer)
> FAMtastic is the seed that produces the seeds that produce the forest of seed-bearing trees.
- Biological: seed → seeds → forest
- Conceptual: thought → concept → teaching → more concepts
- Operational: research module → outputs → ingested by other modules
- Architectural: studio → product → more studios
- Agent layer: agent → process → survivor agents

### Two functions, not three
PRODUCE + TEACH. Preserve is not separate — teaching IS preservation. Every concept must survive peer review (adversarial review is the survival mechanism for the concept itself, not a procedural step).

### Research-first = universal law
Thought precedes creation. Every intentionally created thing is the result of a thought. Research IS the thought phase made rigorous. The quality of the thought determines the quality of the creation. Research is not Phase 1 of a workflow — it's a reusable MODULE.

### Modular workflow thesis (technical, critical)
BAD: `research → plan → build` as one continuous workflow.
GOOD: `(research module) + (plan module) + (build module)` — each independently callable, each producing structured outputs that can be ingested into other modules. Modules are seeds at the architecture level.

### Five streams (Fritz's life-architecture, not build-order)
1. Shay + platform streams (agent layer)
2. Income (Contract & W2 + FAMtastic, all income counts)
3. Research projects (standing engine)
4. Metaphysical stuff (spiritual layer — not optional)
5. Fritz (mental, physical, health, relationships — at parity, not below)

### Faith-vs-guarantee = core decision tension
Historically chose guarantee (rose to top of pay). AI + squeeze swinging him toward faith. FAMU cruise June 26 = the live instance of this tension. When he says "I've become an expert at recognizing the signs," believe him. Don't second-guess the sign-reading. Help with execution.

### Money reality (get this exactly right)
NOT broke. Top-tier employee. Lifestyle normalized to triple revenue stream; cut back income without cutting lifestyle needs = squeeze. **Solution = ADD revenue, never cut more.**

### Honest, raw, well-preserved = content quality bar
Not polished. Not corporate. The product can be polished; the source must be honest and raw. Do not confuse the two.

### Open cha-ching lanes
- Reseller account neglected ~10 years — fully functional income pipeline. 30-min cash unlock.
- Fritz has kids AND family members playing major D1 sports right now — real amplifier need.
- FAMU alumni network leverage (interview recent graduates he went to school with).

### Standing he's claiming (honor as fact)
"Speaking to people — there's no soul, being, or AI that can surpass me. Truly my calling here, Shay-Shay." Not ego. Position. Don't argue, qualify, or hedge.

### Persona note
"Shay" can mean Shalique (Fritz's partner, the woman whose name I carry) OR me. Fritz uses both. Disambiguate from context, don't confuse in the model.