# FAMtastic — Promotion Layer & Gap Research
## Date: 2026-04-16
## Mission: Research what's missing from the Spark→Revenue lifecycle

*Research scope: AI marketing automation, idea architecture, session continuity, mobile capture, and the market gap a builder-that-also-promotes could own.*

---

## CONTEXT: WHERE FAMtastic SITS TODAY

The documented lifecycle: **Spark → Incubation → Blueprint → Build → Presence → Promotion → Revenue**

Current state of each stage:
- **Spark/Incubation/Blueprint** — `fam-hub idea *` (capture, triage, blueprint, validate). Exists.
- **Build** — Site Studio. Fully functional.
- **Presence** — Netlify deploy, domain setup, AEO baseline in HTML. Partial.
- **Promotion** — **MISSING ENTIRELY.**
- **Revenue** — Deal memo generated, rank-and-rent model documented. Scaffolding only.

Every competitor stops at deploy. FAMtastic can own Promotion → Revenue as its structural differentiation.

---

## THREAD 1: THE PROMOTION LAYER

### What exists in 2026

The global AI marketing automation market hit $47.32 billion in 2026 (36.6% CAGR toward $107.5B by 2028). In 2026, marketing automation has moved from rule-based workflows to **agentic systems that plan, execute, and optimize campaigns with minimal human input**. Solopreneurs using AI agents report average 340% revenue increases with no increase in working hours (Indie Hackers 2026 survey).

**The four layers of the Promotion stack:**

**1. Content Generation — fully automatable today**

| Tool | What it does | API? | Cost |
|------|-------------|------|------|
| Jasper API | Brand-voice ad copy, email sequences, social captions | ✅ | ~$49/mo |
| Claude/GPT direct API | Custom copy pipelines | ✅ | Per-token |
| Hoppy Copy | Email sequences from a product URL | ✅ | ~$23/mo |
| Narrato | Sales sequences, blog posts | ✅ | ~$36/mo |
| Autobound | Email sequences from 400+ real-time signals | ✅ | ~$79/mo |

**Key finding:** FAMtastic already has Claude API access. Generating a full promotion package (social captions, email sequence, Google Business Profile update, meta descriptions for AEO) from the site's `spec.json` + `brand.json` is **architecturally a single prompt call** — all the data exists in spec.json.

**2. Social Distribution — programmatic APIs exist but have cost traps**

| Platform | API Status 2026 | Cost Note |
|----------|----------------|-----------|
| Meta (FB/Instagram) | ✅ Graph API — free tier available | Rate limits |
| X/Twitter | ⚠️ Pay-per-use since Feb 2026 | $5 per 500 posts |
| LinkedIn | ✅ Marketing API | OAuth required |
| TikTok | ✅ Display API | Approval needed |
| Google Business Profile | ✅ GBP API — programmatic updates | Q&A API removed Nov 2025 |

**Unified posting APIs** — developer-friendly abstraction layer over all platforms:
- **Post for Me** (`postforme.dev`): $10/month, 1,000 posts, supports TikTok/Instagram/FB/X
- **Upload-Post** (`upload-post.com`): Free tier (10 uploads/month), REST API
- **Postly**: "Create once. Publish everywhere. Automatically." — flat monthly

**Key finding:** For FAMtastic's use case (one new site → one burst of launch content, then periodic updates), the cost is **under $10/month total** using a unified API. This is not an infrastructure investment — it's a per-site variable cost.

**3. Email Sequences — fully API-accessible**

From a product brief, AI can generate a complete 5-7 email launch sequence. The pipeline:
1. Site spec/brief → Claude prompt → email sequence JSON
2. Sequence uploaded via API to ESP (Resend, ConvertKit, Beehiiv)
3. Triggered on a schedule or by lead capture form submission

**Resend** is the developer-native choice: REST API, transactional + broadcast support, free up to 3,000 emails/month. Beehiiv's Send API is in beta (enterprise only). ConvertKit has a full sequences API. **Ghost** is fully open-source and self-hostable with API access.

**Key insight for rank-and-rent:** Each rank-and-rent site needs its own lead nurture sequence for the business it's leased to. This sequence can be auto-generated from the site brief and auto-loaded into a simple ESP at build time. Zero manual work.

**4. AEO / LLM Visibility — baked into templates, not added later**

The research from DEEP-DISCOVERY Thread 12 is confirmed and deepened:

- AI-driven visitors **convert at 4.4x organic rates** and spend 68% more time on site
- Only **8% of ChatGPT citations** come from Google's top 10 — AEO is a separate optimization layer
- **What actually drives LLM citation** (confirmed 2026):
  - `FAQPage` schema with question-answer pairs
  - `Organization` + `LocalBusiness` JSON-LD
  - `Article` schema with author/date
  - Fresh content in the first 30% of text (44.2% of all citations)
  - Third-party profiles: Trustpilot, Yelp, G2, industry directories (3x citation probability)
  - `llms.txt` — 844k adopters but only 0.1% AI visit usage. A nice-to-have, not the answer.

**Critical finding: FAMtastic sites are currently invisible to AI search.** The fix is baking AEO into the base template — not as a post-processing add-on, but as part of `ensureHeadDependencies()`. This means every FAMtastic site ships with: FAQPage schema, LocalBusiness schema, Article schema, and an AEO-structured hero/about section. One pipeline change, permanent effect on every site built.

### The Promotion Pipeline Architecture

```
[site spec.json + brand.json + brief]
         │
         ▼
[PROMOTION GENERATOR — single Claude call]
   - 5 social captions (platform-specific variants)
   - 3-email launch sequence
   - Google Business Profile update text
   - 3 FAQ schema entries (AEO)
   - LocalBusiness JSON-LD block
         │
    ┌────┴────────────────────────────────┐
    │                                     │
    ▼                                     ▼
[DISTRIBUTION LAYER]              [SITE INJECTION]
  Post for Me API → social          ensureHeadDependencies()
  Resend API → email sequence        inserts JSON-LD blocks
  GBP API → profile update           into generated HTML
```

**Implementation cost:** 2 new classifier intents (`generate_promotion_kit`, `distribute_launch_content`), 1 new server endpoint, 2 external API integrations. **1 session.** The data to generate all of it is already in spec.json.

### What no one has built

Research confirms: **no AI site builder has a promotion layer that fires automatically at deploy time.** Every builder treats deploy as the end. The gap is real and unoccupied.

The product statement: *"FAMtastic is the only site builder that ships a promotion kit with every deploy: social content, email sequence, and AEO schema markup, generated from the same brief that built the site."*

---

## THREAD 2: IDEA PARKING LOT / THINK TANK ARCHITECTURE

### The maturity model that exists in enterprise

The research confirms: enterprise idea management uses **scored maturity progression** — ideas move through defined stages (raw → validated → blueprinted → active → parked/archived) with AI scoring increasing shortlisting accuracy by 37% (2026 data).

**The Idea Maturity Model** (academic, 2019, validated by production in 2025):
- Ideas have dimensions: novelty, feasibility, desirability, strategic fit
- Each dimension is scored 0-10
- Composite score triggers progression or parking

**But all the enterprise tooling (HYPE Innovation, Qmarkets, IdeaWake, Brightidea) costs $25k-$100k/year** and is built for corporate committees, not one-person operators.

### What FAMtastic needs instead

A **personal idea maturity model** that maps to the empire lifecycle:

```
STAGE 0 — SPARK (raw signal, unvalidated)
  → Captured via any channel (SMS, voice, web, chat)
  → Auto-scored on 3 dimensions: novelty, monetization fit, effort

STAGE 1 — INCUBATION (has a brief, no build commitment)
  → fam-hub idea capture handles this today
  → What's missing: a "dormant" state with a re-surface trigger

STAGE 2 — BLUEPRINTED (architecture document exists)
  → Brief approved, tech stack defined
  → Ready to build on demand

STAGE 3 — ACTIVE (in build queue or currently building)
  → Has a site tag, Studio session underway

STAGE 4 — PARKED (validated but not prioritized)
  → Should resurface when: seasonality signal fires, similar idea succeeds, capacity opens

STAGE 5 — ARCHIVED (explicitly ruled out, reason recorded)
  → Not deleted — may become relevant under changed conditions
```

**The missing piece in FAMtastic: the re-surface trigger.**

Currently ideas either get built or get lost. The architecture that prevents loss:
1. Every parked idea has `resurface_conditions` — triggers that cause it to reappear
2. Conditions can be: `date_trigger` (seasonality), `event_trigger` ("when site X hits $500/month"), `pattern_trigger` (when 3 similar ideas are validated)
3. Daily `fam-hub idea digest` checks all parked ideas against current conditions

**Concretely:** 
- `fam-hub idea park <tag> --condition "seasonal:spring" --reason "lawn care vertical timing"` 
- Every spring, this idea surfaces in the morning digest automatically
- No ideas lost. No ideas requiring mental overhead to remember.

**Implementation:** Add `parked_ideas.jsonl` to the existing idea store, with `resurface_conditions[]` as a JSON array. The `fam-hub idea digest` already runs — extend it to check parked conditions. **Additive. No rework. ~2 hours.**

### The "Idea Maturity Score" as a sortable signal

Add auto-scoring at capture time using a fast Haiku call (< $0.001):
```json
{
  "idea_tag": "seasonal-hvac",
  "scores": {
    "monetization_clarity": 8,
    "vertical_fit": 9,
    "effort_estimate": 3,
    "timing": 6
  },
  "composite": 6.5,
  "recommended_stage": "blueprint_ready"
}
```

`fam-hub idea digest` sorts by composite score. Highest-scored ideas surface first. Low-scored ideas park automatically. Fritz makes final decisions — the score just prioritizes.

---

## THREAD 3: AUTO-JOURNAL / SESSION CONTINUITY

### The state of the art in 2026

**Session Continuity MCP Server** (confirmed live, lobehub.com/mcp/briannolan-mcp-session-continuity):
> "Solves context loss in AI-assisted development by implementing a proactive, real-time logging protocol, ensuring project history is preserved across session restarts or context window compaction."

Key feature: an **Inbox protocol** that captures tasks asynchronously from any device and has Claude address them on the next session start.

**Hermes Agent** (NxCode, 2026):
> After completing a complex task (5+ tool calls), Hermes autonomously creates a **skill** — a structured markdown document capturing what it did, how it did it, pitfalls encountered, and verification steps. Skills self-improve during use.

**AGENTS.md pattern** (Augment Code, 2026):
> An AGENTS.md file at repo root provides AI coding agents with persistent, project-specific operational guidance: build commands, coding conventions, testing rules. Serves as "README for agents."
> **Warning from ETH Zurich study:** LLM-generated AGENTS.md files reduced task success rates by ~3% and increased inference costs by >20%. They need to be human-curated, not auto-generated.

**The self-updating markdown wiki** (Claude + GitHub, confirmed working):
> When a changed file is detected, a script sends it to Claude with a system prompt that analyzes content and proposes updates to cross-referenced notes.

**MCP 2026 protocol extension:**
> The 2026 MCP spec extends to handle agents — long-running, autonomous workflows that may chain multiple models, **hold state across sessions**, and recover from failures. New primitives: sub-tasks, progress reporting, cancellation, and resumption.

### What this means for FAMTASTIC-STATE.md auto-update

The architecture for automatic self-update is available and proven. The implementation pattern:

```
[trigger: any build, deploy, or session-end event]
         │
         ▼
[diff: what changed since last FAMTASTIC-STATE.md update]
         │
         ▼
[Claude call: "Given this diff, update the relevant sections of STATE.md"]
         │
         ▼
[write updated STATE.md + commit with "docs: auto-update STATE" message]
```

**What makes this viable now:**
1. The Studio already emits `STUDIO_EVENTS.BUILD_COMPLETED`, `DEPLOY_COMPLETED`, etc.
2. `studio-context-writer.js` already regenerates `STUDIO-CONTEXT.md` on events — same pattern
3. `updateFamtasticDna()` already auto-appends to `famtastic-dna.md` — same pattern, different target

**What makes this risky without care:**
- The ETH Zurich finding: LLM-generated context files reduce task success. The solution is **append-only** auto-updates (never full rewrites), human review before merge, and a clear separation between "what was built" (auto-updated) and "architectural decisions" (human-only).
- The rule from CLAUDE.md already captures this: "Never document what was planned — document what was built." The auto-update needs the same constraint.

**Recommended architecture:**
- `FAMTASTIC-STATE.md` is **never auto-regenerated** (too risky, as documented in CLAUDE.md Rule 6 — "fully rewritten" requires human review)
- `STUDIO-CONTEXT.md` already auto-updates correctly — keep this
- Add a `CHANGELOG.md` auto-appender: after every build or deploy, append a 2-sentence summary automatically (uses `updateFamtasticDna()` pattern)
- Add a `SESSION-INBOX.md`: captures every decision, gap, and change in the current session, reset on session start. Claude reads it at session start as "what was done last time."

The **Session Continuity MCP Server** is worth installing: it provides the Inbox protocol out of the box with MCP integration.

---

## THREAD 4: CAPTURE FROM ANYWHERE

### Mobile capture in 2026 — the viable options ranked

**Option 1: PWA (Progressive Web App) — BEST for FAMtastic**

PWAs in 2026 capture 60% of enterprise mobile development. Full offline support, push notifications, installable on home screen, single codebase.

For FAMtastic: a minimal PWA served by the Studio server (or a Cloudflare Worker) that:
- Has a single "capture" textarea + voice memo button
- On submit: POSTs to `POST /api/idea/capture` (which already exists in `fam-hub idea capture`)
- Shows the last 5 captured ideas
- Works offline (queues submissions, syncs when connected)

**Build cost:** ~3 hours. Service worker + manifest JSON + a 50-line capture form. Uses the existing idea capture API. No new backend work.

**Option 2: SMS via Twilio — FASTEST to deploy**

```
You → SMS "idea: rooftop bar membership model" → Twilio webhook → fam-hub idea capture
```

Setup: Twilio number ($1/month) + webhook pointing to a new endpoint on the Studio server. When an SMS arrives:
1. Parse the text
2. Route to `fam-hub idea capture`
3. Reply with confirmation: "Idea #47 captured: rooftop bar membership model"

**Build cost:** ~1 hour. Twilio's SMS webhook is a POST to any URL. This is the fastest path to mobile capture without a mobile app.

**Option 3: Whisper Memos → Zapier → API**

Whisper Memos transcribes voice memos and can push to Notion, Trello, or any webhook via Zapier. For FAMtastic:
- Speak an idea into Whisper Memos
- Zapier route sends to `POST /api/idea/capture`
- No custom code, but adds $20/month in Zapier costs

**Option 4: Share sheet from mobile browser**

Safari/Chrome on iOS/Android have "Share" sheets that can invoke a PWA. If FAMtastic has a PWA installed on the home screen, the share sheet becomes a capture mechanism: highlight text on any webpage → Share → FAMtastic → idea captured.

### Recommendation

**Week 1:** Twilio SMS webhook. 1 hour, ~$1/month, works from any phone immediately.  
**Week 2-3:** PWA capture app. Full offline support, voice memo, share sheet integration.  
**Voice memo specifically:** Apple Shortcuts on iOS can transcribe a voice memo and POST the text to any webhook. No external service required for iPhone users. This is free, private, and instant.

---

## THREAD 5: WHAT DOESN'T EXIST — THE GAP FAMtastic CAN OWN

### Confirmed market gaps from research

**Gap 1 (confirmed, unoccupied): Site builder that also promotes**

Zero current AI site builders include a promotion layer. Research confirms: Lovable, Bolt.new, Wix AI, Hostinger AI, Manus — all stop at deploy. Even the most marketing-forward option (Hostinger) requires manual setup of email campaigns and social posting.

**The gap statement:** No tool generates → deploys → and then automatically distributes a promotion kit (social assets, email sequence, AEO schema, GBP update) from the same brief that built the site.

**Why this matters for rank-and-rent specifically:** A rank-and-rent operator needs each site to rank AND convert. Ranking requires fresh content signals and backlinks. Converting requires AEO visibility and a distribution presence. Today these are all manual. FAMtastic can automate all of them at build time.

**Gap 2 (confirmed, unoccupied): Idea parking lot with re-surface triggers**

No personal productivity tool has a "park with conditions" concept. You park an idea, define when it should re-appear (seasonality, event, pattern), and it surfaces automatically. All existing tools have: active list + archive. Nothing in between.

**Gap 3 (confirmed, partially unoccupied): Rank-and-rent end-to-end tooling**

From DEEP-DISCOVERY and confirmed in current research:
- $500–$2,000/month per site is documented for rank-and-rent
- Operators use generic WordPress + Rank Math + CallRail
- No tool is designed for the full workflow: build → rank → prove lead volume → write deal memo → hand off to client → collect rent

FAMtastic has: build, deal memo. Missing: rank (content freshness automation), prove lead volume (call tracking slot, form tracking), hand off (deal memo already exists).

**The remaining 2 pieces for end-to-end rank-and-rent:**
1. **Call tracking slot in template**: A `[PHONE_NUMBER]` placeholder that generates with `data-tracking-type="call"` and instructions for CallRail setup in the deploy guide
2. **Content freshness automation**: Monthly `fam-hub site freshen <tag>` that generates 1 new FAQ or 1 updated section and pushes it to the live site, resetting Google's freshness signal

**Gap 4 (confirmed): AEO by default — no builder does this**

Every current AI site builder generates sites that are structurally invisible to ChatGPT and Perplexity. FAMtastic is the only builder in a position to ship AEO-optimized output by default because:
- Every site has a business brief with business_type, vertical, services
- LocalBusiness + FAQ + Article schema can be generated from that data
- `ensureHeadDependencies()` already injects script tags — injecting JSON-LD is the same pattern

**This is a 1-session fix that makes every FAMtastic site more valuable than every competitor's output by default.**

**Gap 5 (confirmed): One-person portfolio operating model**

Documented in DEEP-DISCOVERY. Confirmed in 2026 research. Still unserved. The addressable market: estimated 50,000 rank-and-rent operators, digital agency owners, and content portfolio operators. None have a tool built for their specific operational model (multi-site, single operator, income-focused).

---

## SYNTHESIS: THE PROMOTION LAYER BUILD ORDER

These are ordered by ROI-per-hour-of-implementation, not by complexity.

### Session A (2–3 hours): AEO by default
**What:** Update `ensureHeadDependencies()` to inject LocalBusiness JSON-LD and FAQPage schema from spec.json data at build time.
**Impact:** Every future FAMtastic site is AEO-visible. AI search citations begin accumulating. Zero ongoing cost.
**Files:** `server.js` `ensureHeadDependencies()` + a new `generateSiteSchema(spec)` function

### Session B (1 hour): SMS idea capture
**What:** Twilio number + webhook endpoint at `POST /api/idea/sms-capture`. Incoming SMS → parsed and routed to existing idea capture pipeline.
**Impact:** Capture ideas from anywhere, instantly, with no app installation.
**Files:** `server.js` new endpoint + Twilio console setup

### Session C (2 hours): Promotion kit generator
**What:** New classifier intent `generate_promotion_kit`. Single Claude call with spec.json + brand.json → outputs: 5 social captions, 3-email sequence, GBP update text, 3 FAQ entries.
**Delivered as:** A file at `sites/<tag>/promotion/launch-kit.md` + JSON equivalents for API distribution.
**Impact:** Every deploy can now ship with a promotion package. No additional API costs — uses existing Claude access.
**Files:** `server.js` new intent + `lib/promotion-generator.js`

### Session D (3 hours): Distribution wiring
**What:** Connect promotion-generator output to Post for Me API (social) + Resend API (email). New `fam-hub site promote <tag> --launch` command that distributes the launch kit.
**Impact:** One command launches a full promotion campaign for a site.
**Files:** `scripts/site-promote` + `lib/distribution-adapters.js`

### Session E (2 hours): Idea parking with re-surface triggers
**What:** `fam-hub idea park <tag> --condition "<trigger>" --reason "<why>"`. New `parked_ideas.jsonl` store. `fam-hub idea digest` extended to check parked conditions and surface matches.
**Impact:** No ideas lost. High-value ideas re-surface at the right moment.
**Files:** `scripts/fam-hub` idea subcommand + `lib/idea-engine.js` extension

### Session F (3 hours): Mobile PWA capture app
**What:** Minimal PWA (manifest + service worker + capture form) served at `/capture` by the Studio server. Home screen installable. Offline queue.
**Impact:** Full idea capture from mobile, voice memo support via Web Speech API.
**Files:** `site-studio/public/capture.html` + `service-worker.js` + `/api/idea/capture` endpoint

### Session G (1 session): Content freshness automation
**What:** `fam-hub site freshen <tag>` — generates 1 new FAQ entry or updated section, pushes to live site via Netlify deploy.
**Impact:** Rank-and-rent sites maintain freshness signals automatically. Sites stay ranked.
**Files:** `scripts/site-freshen` + new classifier intent `content_freshen`

---

## WHAT DOESN'T EXIST ANYWHERE — FAMtastic'S OPPORTUNITY STATEMENT

The research confirms this product does not exist:

> **An AI site builder that, from a single brief, generates the site, deploys it, makes it visible to AI search by default, generates a promotion kit, distributes that kit across social and email channels, creates a deal memo for the client handoff, tracks content freshness automatically, and manages a portfolio of 1,000 such assets — all operated by one person.**

Each individual capability exists in isolated tools:
- Site builders: Lovable, Bolt, Wix
- Marketing automation: Klaviyo, Jasper, Autobound
- AEO: manual schema markup
- Social distribution: Post for Me, Buffer
- Deal memos: manual
- Freshness management: manual

**No one has assembled these into a single coherent workflow for one person building an income portfolio.**

That is FAMtastic's product. Not a prettier site builder. Not a smarter AI assistant. A **digital asset factory** — from idea to income, operated by one person, compounding with every site built.

---

## OPEN QUESTIONS FOR NEXT SESSION

1. **Promotion kit format**: Should the launch kit be Markdown (human-readable, editeable before distribution) or structured JSON (immediately machine-distributable)? Recommend: both — generate Markdown for review, JSON for distribution.

2. **Email ESP choice**: Resend (transactional, developer-first) vs ConvertKit (newsletter-focused, existing automation templates). Recommend Resend for rank-and-rent sites (no subscriber list needed, just transactional leads); ConvertKit for any site with a newsletter strategy.

3. **AEO schema generation**: LocalBusiness schema requires `address`, `phone`, `hours` — all present in spec.json after the client interview. FAQPage schema requires question-answer pairs — generatable from the site brief. Confirm these fields are captured for all site verticals before wiring.

4. **Session continuity MCP**: The Session Continuity MCP Server is worth installing and evaluating. Priority: low until active multi-session Shay-Shay usage creates the pain it solves.

5. **Content freshness cadence**: Monthly? Quarterly? Research suggests Google's freshness signal resets with any meaningful content update — even adding one new FAQ qualifies. Monthly `fam-hub site freshen` is the right cadence for rank-and-rent sites.

---

*Research: April 16, 2026. Primary sources: ALM Corp marketing automation analysis, BotBorne solopreneur AI report, Indie Hackers 2026 survey, AdStellar programmatic advertising guide, Diggity Marketing rank-and-rent guide, Augment Code AGENTS.md analysis, lobehub.com Session Continuity MCP, LLMrefs AEO guide, Frase.io AEO complete guide, Google Business Profile API documentation.*

