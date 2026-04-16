# DEEP DISCOVERY — FAMtastic Site Studio
## Date: 2026-04-16
## Mission: 12-thread research sweep to find new signal, surface blind spots, and identify what must change now

---

## THREAD 1: SURGICAL EDITING & INCREMENTAL BUILDS

### What exists / state of the art

The HTML surgical editing problem has three mature layers available in 2026:

**Parsing layer**: Cheerio (jQuery-like server-side DOM, wraps parse5) is the industry standard for Node.js HTML manipulation. It uses parse5 as its default HTML parser (W3C-compliant) with optional htmlparser2 (SAX-based, event-driven, faster for large docs). For read-modify-write HTML operations, this is the correct stack. `node-html-parser` is faster but less spec-compliant. parse5 alone is preferred when you need a real DOM tree rather than jQuery-style selectors.

**AST/code transformation layer**: jscodeshift (Facebook's codemod toolkit) and tree-sitter are the production standards for JavaScript code. Tree-sitter does incremental parsing — when a user edits a file, it updates only the affected subtree, not the whole document. The Aider repo map pattern uses tree-sitter to extract symbol definitions, build dependency graphs, and dynamically fit content within token budgets — giving AI structural awareness without burning context on irrelevant code.

**Incremental build layer**: Vite, esbuild, and Rspack handle module-level incremental builds for JS/TS. None of these apply directly to HTML editing, but their approach (invalidate only what changed, rebuild only affected outputs) is the mental model for what FAMtastic needs.

### Best implementations and why they work

**Aider's repository map** is the most relevant pattern: tree-sitter parses source files into ASTs, extracts class/function signatures and call relationships, builds a PageRank-style dependency graph, then dynamically fits a token-budget-aware "map" of the whole codebase into every context window. Agents get structural awareness without reading every file. This is directly applicable to FAMtastic — instead of sending entire HTML files to Claude, send a structural map of what sections exist and which need editing.

**Cheerio for surgical edits**: Select the exact DOM node by class, id, data attribute, or CSS path. Replace its innerHTML. Re-serialize. This is already how FAMtastic's `surgical_edit` path works conceptually, but the execution is text-replacement, not DOM-aware. Upgrading to a cheerio-based surgical engine would allow FAMtastic to replace exactly `.fam-hero-layer--content h1` without risking touching adjacent nodes.

### What FAMtastic is missing

FAMtastic's current surgical edit path does text manipulation, not DOM manipulation. This means:
- A content update that touches the hero H1 can accidentally corrupt surrounding elements if the regex or string match is loose
- There is no ability to query "what sections does this page have?" without reading the whole file
- Token waste: Claude sees full HTML files (often 600–1,200 lines) when it only needs to see the targeted section

FAMtastic also has no "structural index" — a lightweight summary of each page's DOM sections that can be used to route edit requests without loading the full file.

### The opportunity

Build a **DOM-aware surgical editor** using cheerio + parse5 with the following contract:
1. On every build, serialize a structural index: `{ page, sections: [{ selector, role, token_estimate }] }` into `spec.json`
2. On `content_update` and `surgical_edit` intents, load the structural index, select only the affected section by its BEM role, send *just that section* to Claude
3. Replace only the targeted node in the DOM and re-serialize
4. Route to `runPostProcessing()` as normal

This reduces context per surgical edit from ~800 tokens (full page) to ~80–150 tokens (targeted section). At 1,000 sites with 3+ pages each, this is the difference between $0.02 and $0.002 per edit.

### Priority: IMMEDIATE

The token savings are real and the cheerio stack is already in the Node.js ecosystem. This is a 2-session implementation, not a rewrite.

---

## THREAD 2: TWO-BRAIN / MULTI-AGENT ARCHITECTURES

### What exists / state of the art

The supervisor-worker (hub-and-spoke) pattern is the dominant architecture in production multi-agent systems in 2026. Gartner documented a 1,445% surge in multi-agent inquiries from Q1 2024 to Q2 2025. Production deployments at Uber (code migrations), LinkedIn (NL-to-SQL at 95% accuracy), and Klarna (85M users, 80% faster support resolution) confirm this pattern works at scale. Production latency runs 2–5 seconds per task delegation cycle.

**Google's Agent2Agent (A2A) protocol**: Announced April 2025, contributed to Linux Foundation June 2025, version 0.3 released July 2025 with gRPC support, signed security cards, and 150+ supporting organizations. A2A defines:
- **Agent Cards**: JSON capability manifests that agents advertise (like an OpenAPI spec, but for agent capabilities)
- **Task lifecycle**: A structured `task` object with states (submitted, working, completed, failed) and streaming support
- **Transport**: HTTP/HTTPS + JSON-RPC 2.0, OAuth 2.0, API Keys, mTLS for security

**Model Context Protocol (MCP)**: Now at November 2025 spec. Donated to Agentic AI Foundation (AAIF) under Linux Foundation December 2025. Tens of thousands of MCP servers. 2026 roadmap priorities: Streamable HTTP (run MCP servers as remote services, not local processes), Tasks primitive (retry semantics, expiry policies). Registry has 2,000+ entries at 407% growth from initial batch.

**Leading frameworks**: LangGraph (supervisor pattern native), AutoGen (group chat with selector), CrewAI (manager mode), OpenAI Agents SDK.

### Best implementations and why they work

The most effective architecture for FAMtastic's use case is **specialist routing**: a supervisor agent that understands intent and routes to specialist workers, rather than a single monolithic agent trying to do everything. The supervisor maintains state and conversation context; workers are stateless and specialized.

**Kiro's spec-driven pattern** (AWS, launched July 2025, announced full autonomous operation at re:Invent December 2025): natural language → Requirements.md (acceptance criteria) → Design.md (architecture decisions) → implementation tasks → code. Agents can operate autonomously "for days." Native MCP integration, steering files for per-project agent behavior.

### What FAMtastic is missing

FAMtastic's current "multi-agent" setup is serial prompt-chaining, not true agent coordination. Claude generates, Gemini brainstorms, GPT-4o handles code — but they don't share state, can't call each other, and each starts from scratch. There is no shared working memory between model calls.

The bigger gap: there is no **persistent companion agent** — an entity that knows this specific site's history, past decisions, brand voice, what was tried and failed, and what the owner's preferences are across sessions. This is not a technical limitation; it's an architectural choice that hasn't been made yet.

### The opportunity

Two concrete moves:

**Move 1 — Implement a true site memory layer using Mem0**: Mem0 (the leading AI memory framework in 2026) supports vector memory + graph memory (Mem0g). The JavaScript MCP server shipped June 2025. An embedded graph backend (Kuzu, added September 2025) requires no separate server process. Per-site memory would let FAMtastic's Studio companion say: "Last time you built this section, you preferred condensed CTAs. Should I do the same?" This is architecturally a 3-file addition to the current system.

**Move 2 — Adopt A2A Agent Cards for model routing**: Instead of a hardcoded routing table (`if brainstorm, use Gemini`), publish agent cards for each model adapter. The supervisor reads capability cards and routes dynamically. This makes adding new model adapters a configuration change, not a code change.

### Priority: Move 1 IMMEDIATE, Move 2 NEAR-TERM

---

## THREAD 3: SCALING TO 1,000 SITES — ONE PERSON

### What exists / state of the art

Solo-founded startups surged from 23.7% (2019) to 36.3% (mid-2025). The infrastructure enabling this: serverless architectures, managed databases, complete solopreneur stacks running $3,000–$12,000/year (95–98% reduction vs. traditional staffing). At Anthropic's Code with Claude conference, Dario Amodei gave 70–80% confidence that the first billion-dollar one-person company would appear in 2026.

**What actually breaks when scaling from 10 to 100 to 1,000 sites** (from practitioner research):

- At 10 sites: manageable manually, no automation needed, personal tracking works
- At 50 sites: tracking revenue per site becomes the first pain point; you lose track of which sites are performing
- At 100 sites: content staleness becomes the bottleneck — sites that ranked well begin to decay without fresh signals
- At 200 sites: the renewal decision problem emerges (20–30% of sites aren't worth renewing; identifying them requires data you probably don't have)
- At 1,000 sites: the operational model must be nearly fully automated — human touch only on exceptions

**The documented math**: at 200 sites averaging $10/month = $2,000/month. The path to $100,000/month at $100/site requires 1,000 sites. This is achievable but requires that the per-site revenue floor be maintained, which requires ongoing maintenance and content freshness — not just initial generation.

### What FAMtastic is missing

FAMtastic has no Mission Control dashboard. There is no view showing all sites, their revenue status, their last build date, their health metrics, or flagging which sites are decaying. There is no automated signal that says "site-altitude hasn't been updated in 60 days and its traffic proxy metrics suggest it's aging out."

There is also no **site lifecycle model** — FAMtastic treats all sites as always in "active build" state. A real 1,000-site operation needs: Seed → Active Build → Live → Monitoring → Renewal Decision → Archive/Retire.

### The opportunity

**Mission Control as the next major feature after the intelligence loop**: A simple dashboard (even a CLI output or a separate HTML page served by the Studio server) showing:
- All sites with tag, deployed URL, last build, build count, status
- Revenue tracking: which sites have an assigned monetization model and what it is
- Decay signals: days since last update, placeholder images still present
- Action queue: sites flagged for refresh, sites pending deployment

The intelligence loop (already partially built) is the input layer. Mission Control is the output layer. Together they create the 1,000-site operating model.

### Priority: NEAR-TERM (blocks achieving the $100k/month goal)

---

## THREAD 4: REVENUE GENERATION — BEYOND STATIC SITES

### What exists / state of the art

**Monetization models that work for AI-generated sites in 2026:**

1. **Lead generation / rank-and-rent**: Build, rank, sell leads. $500–$2,000/month per site in documented cases for home services, legal, insurance, financial, trades verticals. $50–$100 per qualified lead. The infrastructure: build the site → rank it → forward calls/forms to a local business → charge flat monthly fee OR pay-per-lead. Early adopters using AI-powered inbound call qualification report 44% more answered calls. This is the highest-probability model for FAMtastic's $100/month per site target.

2. **Affiliate**: Still works but eroding in 2026 due to AI search displacing traditional organic discovery. Best niches: finance, insurance, software (20% recurring commissions, 60-day cookie windows at top quartile). Median payout 20% as of January 2026. Not a reliable primary stream.

3. **Micro-SaaS**: $79–$149/month sweet spot for pricing. Need 68–102 customers for $10k MRR. 50% of solo micro-SaaS products plateau at $1k–$10k MRR (lifestyle business range). 5% exceed $100k MRR. AI-powered content tools (repurposing, meeting notes, email writers) are the hottest paying niche at $19–$99/month.

4. **Dynamic/full-stack sites**: Base44 (acquired by Wix for $80M after 6 months, 250k users, profitable at $189k profit in May 2025) demonstrated the appetite for chat-to-full-stack. **Cloudflare Durable Objects Facets** (beta, April 2026) allow each AI-generated app to have its own isolated SQLite database in a Dynamic Worker — removing the need for a separate database service per site. This is the architecture for non-static FAMtastic sites.

**Payment processing for solo operators in 2026:**
- LemonSqueezy acquired by Stripe July 2024, roadmap uncertain — alternatives emerging
- Paddle: 5% + $0.50, Merchant of Record (handles global VAT, chargebacks, subscriptions)
- Polar: developer-friendly, tax-included
- Gumroad: simplest, no setup, creator-first
- Stripe announced its own MoR in private beta 2026 (additional 3.5% fee on top of standard)

**App stores**: Apple Developer $99/year, Google Play $25 one-time. Apple takes 30% (15% under $1M/year through Small Business Program). iOS users spend 2.5x more than Android ($1.08 vs $0.43 per user average). Solo developers are 42% of the iOS developer community.

### What FAMtastic is missing

FAMtastic has no revenue instrumentation at all. Sites are built and deployed, but there is no model for what monetization approach matches each vertical, no template for adding lead capture forms, no connection to payment processing, and no tracking of whether a deployed site is generating revenue.

The rank-and-rent / lead generation model is the most FAMtastic-compatible because it doesn't require building backend systems — it just requires the site to rank and convert. But FAMtastic's current output doesn't include: structured contact forms with tracking, call tracking number placeholders, local business schema markup, or the AEO signals that make AI search cite the site.

### The opportunity

**Vertical-aware monetization templates**: When a new site is briefed (e.g., "rooftop bar"), the system should automatically propose: "This vertical typically monetizes via reservations and events. I recommend adding: OpenTable integration slot, private events inquiry form, and a local business schema block." This is one classifier intent away from being real.

**Cloudflare Durable Objects for dynamic sites**: For verticals that need user accounts, reservation systems, or lead tracking, the Durable Objects Facets architecture lets each FAMtastic site get its own database at near-zero operational cost. This removes the last major blocker to non-static sites.

### Priority: Lead gen templates IMMEDIATE, dynamic backends NEAR-TERM

---

## THREAD 5: AI-POWERED LOGO AND BRAND GENERATION

### What exists / state of the art

**Current tools ranked for 2026:**
- **Adobe Firefly Text-to-Vector (Vector Model 2)**: The only tool producing *genuine, editable* vector paths with anchor points in native SVG/AI format. Requires Adobe subscription and design knowledge to fully utilize.
- **Looka**: Strongest overall for most use cases. $65 for vectors (SVG + EPS), complete brand kit (logo + cards + social templates + brand guidelines). $96/year subscription gives ongoing access.
- **Brandmark**: $35–$195 one-time, vectors included, unlimited edits post-purchase. Neural network trained specifically for logos; strong industry-appropriate designs that feel custom rather than generic.
- **Recraft**: API available, SVG output, AI vectorizer tool with programmatic access.
- **vtracer** (open source): Raster-to-vector conversion, produces SVG from PNG/JPG, no external service required.
- **Vectorizer.AI**: Sub-pixel precision tracing, full-color, fully automatic.

**Brand identity generation pipeline (2025 state):**
- Pomelli uses "Business DNA" technology to extract brand identity from a website (colors, fonts, tone of voice, visual style) automatically
- Figma's AI brand guidelines generator transforms positioning input into color, type, layout, imagery, and voice rules, connecting to existing design systems
- Luma (new shadcn/ui tool, March 2026): AI brand identity generator that builds structured, scalable identity systems from positioning inputs
- Khroma: AI color palette generator for designers
- AI typography systems suggest typeface combinations with reasoning about brand personality

**Key stat**: Companies adopting AI-assisted brand design in 2025 reported 40–60% shorter design timelines and 73% fewer brand guideline violations.

**Raster-to-vector pipeline that's API-accessible**: Recraft (API + MCP server), Vectorizer.AI, SVGMaker (API + MCP). These can be called programmatically during a FAMtastic build.

### What FAMtastic is missing

FAMtastic generates logos via Claude text-to-SVG, which produces good structural SVGs but not production-quality brand marks. The current pipeline:
1. Claude emits SVG markup in `<!-- LOGO_FULL -->` delimiters
2. `extractLogoSVGs()` saves to `assets/logo-*.svg`
3. No brand system is built — no color token export, no typography spec, no brand voice document

There is no connection to external AI logo tools. There is no programmatic raster-to-vector upgrade path for sites where the client supplies a raster logo. There is no brand guidelines document generated per site.

### The opportunity

**Brand DNA file per site**: After a successful build, generate a `brand.json` file per site containing: primary/secondary/accent hex values, font families (with CDN links), tone of voice keywords, logo file paths, and brand voice example phrases. This file becomes the ground truth for all future builds of that site — no more color drift or typography inconsistency between sessions.

**Recraft API integration for logo upgrade path**: When a user supplies a PNG logo, pipe it through the Recraft vectorizer API to get a clean SVG. Add this as an `upload_logo` intent in the classifier.

### Priority: brand.json IMMEDIATE (small change, high leverage), Recraft integration NEAR-TERM

---

## THREAD 6: SMART ASSISTANTS AND TUTORIAL SYSTEMS

### What exists / state of the art

**In-product guidance tools in 2026:**
- Pendo: $25k–$50k/year, AI guide creation from prompts, contextual tooltips, guide branching, weeks to implement. Full analytics + feedback + in-app guidance in one platform.
- Appcues: $3k–$24k/year, no-code, drag-and-drop builder, teams publish first flows in under a day. Focused narrowly on onboarding flows.
- Tandem (newer): AI execution layer on top of traditional Digital Adoption Platforms. Key finding: traditional product tours fail — only 5% of users complete multi-step walkthroughs.

**Key 2025–2026 research findings:**
- The Clippy failure pattern is well-documented: interrupting the user at the wrong moment, offering help that isn't contextual, being unable to learn that the user has already mastered what you're showing them. The fix is behavioral triggering (show guidance only when a confusion signal fires) rather than time-based triggering.
- Progressive autonomy as UX pattern: start the agent in supervised mode, increase authority as user builds trust. The "Autonomy Dial" pattern — a user-controlled slider for agent independence — is emerging in production tools.
- The **Action Audit + Undo** pattern is the single highest trust-building UX mechanism available. Every agent action must be reversible, and the log must be visible and persistent.
- Jakob Nielsen's 2025 review finding: "Useful AI Sells" — the tools winning are the ones that reduce friction on the user's primary task, not the ones with the most features.

**What makes a tutorial feel intelligent vs. annoying:**
- Intelligent: triggered by confusion signals (repeated hover on same element, abandonment of a flow, error state), dismissable permanently, learns from dismissal
- Annoying: time-based, dismissable-but-recurring, not context-aware, cannot be turned off globally

### What FAMtastic is missing

FAMtastic's Studio has no onboarding layer at all. New users see the chat panel and have no guidance. There is no contextual help when the classifier fails to understand an intent, no "did you mean?" fallback, and no tutorial system for the complex multi-step flows (site briefing → build → review → deploy).

The bigger miss: FAMtastic has no **Pip companion** — the "Studio Companion Pip" is listed as priority #4 in the STUDIO-COMPARISON.md decision matrix. Pip should be an always-present entity that knows the current site, can explain what's happening in plain language, suggests next actions, and can be asked questions mid-build.

### The opportunity

**Conversational acknowledgment intent**: The current system lacks a `conversational_ack` classifier type. Messages like "looks good," "great job," "thanks" currently trigger Claude generation calls. Adding `conversational_ack` as a zero-cost handler that returns a canned acknowledgment would eliminate a real category of wasted API calls and is one of the most leveraged micro-improvements available.

**Pip as a sidebar persona**: Pip doesn't need to be a separate agent to start. It can be a panel mode that wraps the existing Studio chat with: current site summary, build status, suggested next action, and a "what should I do next?" prompt. The underlying API calls are the same; the UX framing changes the experience from "chat window" to "intelligent companion."

### Priority: conversational_ack IMMEDIATE (2 lines of classifier code), Pip persona NEAR-TERM

---

## THREAD 7: UX PATTERNS FOR AI-POWERED BUILDERS

### What exists / state of the art

**The landscape in 2026:**
- "Vibe coding" coined by Andrej Karpathy in February 2025. Named Word of the Year by Collins Dictionary 2025. 92% of US developers have adopted vibe coding practices. 60% of all new code written in 2026 is AI-generated. 3–5x productivity gains widely reported.
- Global AI coding market hit $8.5 billion. Idea-to-prototype timelines compressed from weeks to hours.

**UX innovations from the leading tools:**

**Lovable**: Visual Editor allowing direct WYSIWYG tweaks without prompting or writing code. Ships full-stack fastest. Built from the ground up for non-technical users — the UX is consistently rated the most intuitive of any AI builder.

**Bolt.new**: Browser-based, chat interface plus full codebase access side by side. Best developer control among AI builders. No code required but full codebase is always available if you want it.

**v0 (Vercel)**: Produces cleanest React component code. Most design-quality focused of the group.

**Cursor**: VS Code-based, power users and experienced developers, deepest IDE integration. $29.3B valuation as of 2026.

**Kiro (AWS)**: Spec-driven — natural language → Requirements.md → Design.md → implementation tasks. Steering files for per-project agent behavior. "Can work for days at a time" autonomously. Native MCP integration. Open-sourced at github.com/kirodotdev/Kiro.

**Key UX research findings from 2025–2026:**
- Progressive autonomy is the foundational pattern: supervised mode → gradual trust → higher autonomy. Users must be active participants in defining the agent relationship.
- Transparency requirement: users need to see not just *what* the agent did but *why* and *what's coming next*
- The Action Audit + prominent Undo is the single highest trust-building mechanism
- "Nobody wants to see the prompt" — successful AI builder UX hides prompt complexity behind natural language, and exposes only the result

**What the market missed until 2025**: The transition from "AI suggests" → "AI executes" → "AI operates" requires a fundamentally different UX contract at each level. Most tools are stuck at level 1 or 2. Level 3 (AI operates) requires audit trails, rollback, and oversight dashboards that feel native, not bolted on.

### What FAMtastic is missing

FAMtastic is a chat interface connected to a build system — it has no progressive autonomy model. Every message triggers the same pipeline regardless of stakes. There is no concept of "supervised mode" vs. "trust mode" vs. "autonomous mode." There is no build history UI, no rollback from the UI, and no audit log visible to the user.

The restyle intent routing to dead code is the most important UX trust-breaker in the system. The user asks for a restyle, the system appears to process it, but nothing changes. This is worse than an error message — it is a silent failure, and silent failures erode trust faster than any other failure mode.

### The opportunity

**Build history as first-class UI**: Show the last 5 builds for the current site in the sidebar. Each entry shows timestamp, intent type, what changed (files modified, pages rebuilt), and a rollback button. This converts the existing git-per-site flow into a visible safety net the user can actually use and trust.

**Restyle intent fix**: Restyle is what users want when they've built a site and want to "try a different look" without losing content. This deserves its own first-class intent with a prompt that says: preserve all content, regenerate only visual design tokens (colors, typography, spacing, hero style). The current dead code path must be replaced before trust in the visual layer can be established.

### Priority: Restyle intent fix IMMEDIATE, build history UI NEAR-TERM

---

## THREAD 8: COMMUNICATION PIPELINES BETWEEN SESSIONS

### What exists / state of the art

**Memory architecture in production AI systems (2026):**

Four types of agent memory, all now in production use:
1. **Working/in-context**: The current conversation. Stateless across sessions.
2. **Episodic**: Interaction-specific events with temporal markers. "Last Tuesday you built the hero with a dark background."
3. **Semantic**: Factual knowledge, definitions, entity relationships. "Rooftop bars typically have reservation flows."
4. **Procedural**: Patterns and skills. "When this user builds CTAs, they consistently prefer single-line condensed formats."

**Mem0** is the leading framework. Key developments through 2025–2026:
- JavaScript MCP server shipped June 2025
- Mem0g (graph-enhanced variant): directed labeled knowledge graph alongside vector store. Entity extractor identifies nodes; relations generator infers labeled edges. 68.4% LLM score vs 66.9% for vector-only on multi-hop questions. Latency cost: 2.59s p95 vs 1.44s for vector-only.
- Kuzu embedded graph database added as backend September 2025 — no separate server process required (unlike Neo4j). This is the zero-ops option.
- OpenMemory Cloud (hosted variant) shipped June 2025

**MemRL** (January 2026): reinforcement learning integrated into memory management — agents learn which memories to retain vs. discard over time.

**Cross-session context for coding agents** (February 2026 engineering analysis): automated embedding pipeline captures context within a session, converts to vector embeddings, reinjects on session resume. Works, but significant limitations remain for long-lived projects. Organizations report measurable gains in user retention when agents recall previous interactions.

**Market size**: AI agent memory market estimated at $6.27 billion in 2025 (Mordor Intelligence).

### What FAMtastic is missing

FAMtastic's cross-session memory is the `.wolf/` system (anatomy.md, cerebrum.md, buglog.json) plus the intelligence loop. This is better than most tools — but it is human-curated, not automated. The system does not automatically remember:
- That Fritz prefers condensed CTAs
- That the last three builds for a specific site all drifted toward dark hero backgrounds
- That a specific vertical (e.g., rooftop bars) consistently needs a reservation widget integration
- Which component from the library was used on which site and what happened to it

The `famtastic-dna.md` file captures build patterns at the ecosystem level. But per-site memory — what happened on THIS site, what the owner prefers for THIS site — is missing.

### The opportunity

**Mem0 + Kuzu per-site memory store**: Each site gets a small embedded graph database (Kuzu, no separate server). On every build, key decisions are written to the graph: `(hero_style:dark) -[preferred_on]-> (site-altitude)`. On next session start, FAMtastic queries the graph: "What does this site's history tell me?" and injects the summary into the build prompt context.

This is what `famtastic-dna.md` does at the ecosystem level — replicate it at the per-site level with a proper graph structure rather than a growing flat text file.

**Context compression**: When a site has 20+ builds, compress the history into a rolling summary. This prevents context rot and keeps the per-site memory file at a stable token cost regardless of site age.

### Priority: NEAR-TERM (Mem0 MCP server integration is the fastest path — connect to existing Studio infrastructure)

---

## THREAD 9: COMPONENT SCALING AND MARKETPLACE MODELS

### What exists / state of the art

**Shadcn/ui evolution (2025–2026):**
- March 2026: "Luma" and shadcn/cli v4 released
- February 2026: Blocks for Radix and Base UI, Unified Radix UI Package
- December 2025: `npx shadcn create` — customize component libraries (icons, base color, theme, fonts) and publish your own version to a remote registry
- Remote registry support: pull components from remote registries, auto-detect your library variant, apply correct transformations
- Migration command for radix-ui consolidation: automatically updates all imports

**The shadcn model insight**: Components are *owned*, not imported as a dependency. You copy the component source into your project. No version lock. No surprise breaking changes. This is why shadcn/ui won over Material UI and Chakra — it solved the dependency hell of traditional component libraries while preserving full customizability.

**Framer vs Webflow**: No automated component import/export between platforms in 2025–2026. Migration is always a manual rebuild. Framer's 2026 Import Engine improves Figma-to-Framer import accuracy but doesn't address cross-platform portability. Neither platform supports full self-hosted HTML export.

**Component marketplace patterns:**
- Components grow intelligently when each has a clear single responsibility and is battle-tested in production
- Junk accumulates when components are created one-off for a project and never abstracted
- Version compatibility is solved by the ownership model (shadcn) or by explicit semver + peer dependency ranges (Material UI)

### What FAMtastic is missing

FAMtastic has a `library.json` component store that grows with each build. The current model has no:
- Component versioning (a component updated in session 9 silently overwrites the session 7 version, with no record of the change)
- Component usage tracking (which sites use which components, and which version)
- Component quality signals (was this component well-received? did it cause build failures?)
- Component discovery UI (no way to search, filter, or browse components in the Studio)

The library grows as a flat array without structure. There is no way to say "show me all hero variants" or "show me the version of this component that was used for the Groove Theory build."

### The opportunity

**Adopt the shadcn ownership model for FAMtastic components**: When a component is selected for a site build, copy it into that site's asset directory rather than referencing from the shared library. The shared library remains the catalog and source of truth; per-site copies are the actual deployed versions. This prevents regression when the shared library changes.

**Component taxonomy via tags**: Add a `tags` field to each library component (`["hero", "video", "full-bleed"]`). Enable filtering in the Studio UI. This is a 30-minute schema change with outsized UX impact.

**Component lineage**: When a site build uses a component, log `{ component_id, site_tag, build_date, score }` in the site's `spec.json`. Now you can answer "which sites use the Video Hero Section?" and "which version of it performed best?"

### Priority: Component tags IMMEDIATE, lineage tracking NEAR-TERM

---

## THREAD 10: WHAT DOESN'T EXIST YET — MARKET GAPS

### What exists / state of the art

**AI site builder market**: Projected $6.3B in 2026, $25B by 2035 (25% CAGR). Top competitors: Wix AI (with Base44 acquisition), Squarespace AI, Framer AI, Webflow AI, Lovable, Bolt.new, v0.

**What every current builder does:**
- Text prompt → static or React/Next.js site
- Some full-stack capabilities (Lovable, Base44/Wix)
- Drag-and-drop visual editing post-generation
- Hosting included or easy export to Vercel/Netlify

**What none of them do:**

1. **Vertical-specific intelligence at build time**: No builder has a knowledge base of what works for "rooftop bars" vs. "HVAC contractors" vs. "personal injury lawyers." They generate generically and hope the result is appropriate.

2. **Revenue model matching**: No builder asks "how is this going to make money?" and then builds the site with that monetization model baked in from the start — correct forms, tracking infrastructure, schema markup, CTA hierarchy, conversion architecture.

3. **LLM visibility by design**: Sites built by AI builders are typically invisible to AI search because they lack AEO structure, llms.txt, proper schema markup, and the third-party citation signals that get sites recommended by ChatGPT and Perplexity. None of the major builders generate these automatically as part of the base template.

4. **Site lifecycle management**: Every builder treats launch as the end. There is no tool that monitors a site after launch, detects performance decay, and automatically proposes refresh actions.

5. **Lead routing infrastructure**: No AI site builder generates lead capture with call tracking, form routing to CRM, or pay-per-lead infrastructure baked in. Lead gen SaaS is a $500M+ adjacent market that sits completely separate from site building today.

6. **One-person portfolio operating model**: No tool is designed from the ground up for a single person managing a portfolio of 100+ income-generating sites. Every tool assumes either one site (consumer) or an agency managing client sites (enterprise). The middle — a solo operator running a portfolio — is unserved.

### The opportunity

The gap is not "better design" or "faster generation." The gap is **revenue architecture by default**. FAMtastic can be the first builder where every site is built with a monetization model in mind, where the output is not just a website but a revenue-generating asset with the correct infrastructure built in from prompt to deploy.

This is FAMtastic's genuine differentiation: not a prettier AI builder, but the first **digital asset factory for income-generating sites**. Every other builder is a creative tool. FAMtastic can be a business-building tool.

### Priority: This is the strategic frame — revenue architecture framing should inform every feature decision going forward

---

## THREAD 11: CUTTING-EDGE TOOLS AND INTEGRATIONS

### What exists / state of the art

**MCP ecosystem (2026):**
- Tens of thousands of servers, curated at mcp.so and the MCP Registry (2,000+ entries, 407% growth from initial batch)
- Key MCP servers directly relevant to FAMtastic's stack: GitHub (automating engineering processes), Context7 (version-specific documentation for LLMs), Playwright (browser automation for testing), SVGMaker (vector generation + editing API + MCP server), Lighthouse (performance auditing per-site)
- 2026 roadmap: Streamable HTTP transport (run MCP servers as remote services without a local process), improved Tasks primitive lifecycle management

**Significant tool releases in the last 6 months (Oct 2025 – April 2026):**

**Cloudflare Durable Objects Facets** (April 2026, beta): Per-AI-app isolated SQLite databases in Dynamic Workers. Each app gets its own database with zero idle cost via hibernation. The architecture for stateful FAMtastic sites that need reservation systems, lead tracking, or user accounts — without a separate database service per site.

**Cloudflare Project Think** (2026): Complete agent stack on Workers — per-agent isolation via Durable Objects, SQLite, sandboxed code execution via Dynamic Workers, web automation, native MCP support, LLM connectivity via Workers AI. This is the infrastructure layer for running FAMtastic's build agents on Cloudflare rather than localhost.

**Kiro** (AWS, July 2025, fully open-sourced at github.com/kirodotdev/Kiro): Spec-driven IDE, autonomous operation "for days," native MCP, steering files for per-project behavior. The spec-driven approach (natural language → Requirements.md → Design.md → tasks) is directly applicable to FAMtastic's build planning phase.

**Mem0 JavaScript MCP server** (June 2025): Drop-in memory layer for AI agents. No external server required when using Kuzu as the graph backend (added September 2025).

**A2A Protocol v0.3** (July 2025): gRPC support, signed Agent Cards for security, 150+ supporting organizations, Linux Foundation governance. The inter-agent communication standard is now stable and production-ready.

**MemRL** (January 2026): Reinforcement learning for agent memory self-evolution — agents learn which memories to keep vs. discard based on outcome signals.

**Adobe Firefly Text-to-Vector / Vector Model 2**: The first tool producing genuine production-grade SVG with editable anchor points from text prompts.

**Recraft API + MCP server**: Programmatic SVG generation and raster-to-vector conversion accessible via API and MCP.

**shadcn/ui cli v4 + Luma** (March 2026): Custom component library creator with remote registry support.

### Tools FAMtastic should be using but isn't

- **context7 MCP**: Would eliminate the stale documentation problem — Claude's training data has a cutoff; Context7 provides version-specific, current documentation for any library at build time
- **svgmaker MCP**: Programmatic vector generation and editing during the logo extraction phase
- **Mem0 JavaScript MCP**: Per-site memory without a separate server process (Kuzu embedded backend)
- **Recraft API**: Raster-to-vector upgrade path when users supply PNG logos

### Priority: Mem0 MCP and Context7 MCP IMMEDIATE, Cloudflare Durable Objects NEAR-TERM

---

## THREAD 12: PATTERNS NOBODY IS RECOGNIZING YET

### What exists / state of the art

**Signal 1 — LLM Visibility is the new SEO, and AI-generated sites are the worst offenders.**

Total web search usage (search engines + LLMs combined) increased 26% worldwide. ChatGPT owns 84.2% of AI referrals, growing 3.26x year-over-year. AI-driven visitors convert at **4.4x the rate** of standard organic visitors and spend 68% more time on site — because they arrive already further along in their decision process.

But the citation drivers are not what most people assume. Backlinks and organic traffic have a weak correlation with AI citations. What actually drives LLM citation: structured content that explains things clearly with visible hierarchy, freshness signals (44.2% of all LLM citations come from the first 30% of text), Organization/FAQ/HowTo schema markup, and third-party profile coverage. Sites with profiles on Trustpilot, G2, Yelp, and industry directories have 3x higher probability of being cited by ChatGPT. `llms.txt` has 844,000 adopters but is used by LLMs in only 0.1% of AI visits — it is not the answer.

**Signal 2 — The "vibe-coded but not production-ready" gap is real and growing.**

92% of developers use vibe coding, but the tools consistently produce code that works as a demo and fails in production. The gap is security, observability, consistency, and maintainability. Kiro's spec-driven approach is the attempt to bridge this. FAMtastic already has a version of this bridge: build verification, the 5-check system, the post-processing pipeline, and the BEM vocabulary enforcement via skeletons. This is an underappreciated competitive advantage — FAMtastic generates sites that are structurally sound, not just visually impressive.

**Signal 3 — The solo founder exit opportunity exists in two forms.**

Base44: solo founder, 8 employees, 6 months, $80M exit to Wix (250k users, profitable). The buyer was buying proven product-market fit and a user base, not just technology. FAMtastic at 1,000 sites with documented revenue represents a different kind of asset — not a tool, but an income-generating portfolio. Portfolio exits (selling individual sites via Empire Flippers, Flippa, Motion Invest) are a parallel path to SaaS exit that requires no fundraising and no acquisition.

**Signal 4 — The rank-and-rent model is systematically underserved by tooling.**

Rank-and-rent operators (build → rank → lease to local business for $500–$2,000/month) use generic WordPress + Rank Math + CallRail. There is no tool built specifically for this workflow end-to-end: build the site, add call tracking infrastructure, connect to a CRM for lead routing, generate the deal memo for the handoff to the local business. FAMtastic could own this niche entirely.

**Signal 5 — Vertical AI is winning where horizontal AI is stalling.**

Multiple VCs published "vertical AI playbook" analyses in 2025 (a16z, Contrary Research, White Star Capital). The thesis: horizontal AI tools are commoditizing rapidly. Vertical AI that deeply understands a domain's vocabulary, workflows, and data wins. FAMtastic's vertical knowledge database (rooftop bars, lawn care, etc.) is the start of this — but it's external research data, not built into the generation behavior. The sites that win in "rooftop bar" local search are not the prettiest ones — they're the ones with the most domain-credible content, correct local schema, and operational authenticity signals.

**Signal 6 — The monolith will become the moat, not the liability.**

Counter-intuitively, FAMtastic's 12,200-line server.js — widely seen as technical debt — is actually a concentration advantage at this stage. Every feature is in one place. Context switching cost is zero. Deployability is trivial. The solo builders that will fail at scale are the ones that distributed their architecture too early before knowing which components actually needed to scale independently. Stay monolithic until the pain is real and specific, then extract exactly the piece that hurts.

### What would an AI-native site builder look like?

Every current builder retrofitted AI onto existing patterns (template-based, drag-and-drop, CMS-first). An AI-native builder designed from scratch in 2026 would look like:

- **Intent first, not template first**: The user describes a revenue goal ("I want to generate leads for a plumber in Phoenix"), not a design goal ("I want a blue site"). The builder works backward from the revenue model to the site architecture.
- **Site = asset, not document**: Every site has an associated revenue model, lifecycle stage, and performance metrics built in from zero, not added later.
- **Memory-first architecture**: The builder accumulates knowledge across every site it builds. Build 500 rooftop bar sites and the 501st is demonstrably better than the first. This is FAMtastic's compounding advantage — if the memory layer is built correctly, every build makes future builds better.
- **LLM-visible by default**: Every generated site ships with proper schema markup, a fresh content signal (date-stamped sections), AEO structure in the copy, and a third-party profile checklist in the deployment guide. Not as an add-on — as part of the base template.
- **Lifecycle-aware**: The builder monitors sites after launch and proposes updates. Sites are not finished at deploy — they enter a growth phase, a maintenance phase, or eventually a sunset phase. The tool knows which phase a site is in.

---

## SYNTHESIS — THE 10 THINGS FRITZ NEEDS TO KNOW

These are the findings that would change decisions being made right now. Not the obvious ones.

### 1. The revenue model should be the brief, not the vertical.

Every builder asks "what kind of business?" FAMtastic should ask "how is this going to make money?" The answer changes the entire site architecture: a rooftop bar that monetizes via reservations needs a different conversion flow than one that monetizes via private event bookings. Restructure the site briefing to capture monetization intent first. This one change makes every generated site more valuable by default — and it's a classifier change plus a prompt addition, not a rewrite.

### 2. LLM visibility is not SEO, and your sites are currently invisible to AI search.

AI-driven visitors convert at 4.4x organic rates and spend 68% more time on site. But AI builders generate sites that are structurally invisible to LLM crawlers. The fix is not `llms.txt` (0.1% actual usage). The fix is: AEO copy patterns in the hero and about sections, FAQ schema, Organization schema, local business schema for local verticals, and a third-party profile checklist in the deployment guide. These should be baked into every FAMtastic template, not added manually after the fact.

### 3. The rank-and-rent model is the fastest path to $100/month per site — and no tool is built for it.

$500–$2,000/month per site is documented for rank-and-rent in home services, legal, financial, and trades verticals. The infrastructure is: site + local SEO + call tracking number + lead routing to local business. FAMtastic can already build the site. The missing pieces are call tracking number placeholder (a Twilio slot in the template), a simple lead routing form, and a deal memo generator for the handoff. This is a 2-session addition that unlocks the most proven per-site revenue model in the market.

### 4. Cheerio-based surgical edits would cut per-edit token costs by approximately 90%.

The current surgical edit path sends full HTML files to Claude — typically 600–1,200 lines. A DOM-aware surgical editor using cheerio would send only the targeted section (80–150 tokens vs. 800+). At 1,000 sites with frequent content edits, this is not an optimization — it is the difference between a viable unit economics model and an increasingly expensive one as the portfolio scales.

### 5. Per-site memory via Mem0 + Kuzu is architecturally a 3-file addition, not a rewrite.

Mem0's JavaScript MCP server is live. Kuzu (embedded graph database, no separate server process) is the backend. Per-site memory would let FAMtastic remember: this site's preferred color temperature, that Fritz preferred single-line CTAs last time, that the hero on this site has been rebuilt three times with the same dark style each time. The memory layer that compounds with every build — and it connects to the existing Studio infrastructure via MCP.

### 6. The monolith is not the enemy. Do not distribute before the pain demands it.

Base44's solo founder built an $80M exit with 8 employees and 250k users on a fully-integrated product. Vertical integration and single-file deployability is a competitive advantage when you are one person. FAMtastic's 12,200-line server.js is only a liability when specific functions are bottlenecks — and none are bottlenecks yet. Every session spent splitting the file is a session not spent on revenue-generating features. Wait until the specific pain point is real, then extract exactly that piece.

### 7. The conversational_ack intent is a micro-fix with macro implications.

"Looks good," "thanks," "great job" currently trigger full Claude API calls. This is zero-value spend that, at scale, adds up. The fix is a classifier pattern match that returns a canned response without touching the API — probably 2 lines of code. This is the kind of detail that separates a tool that works economically at 10 sites from one that works at 1,000. It also models the right architectural principle: not every message is a generation task.

### 8. Cloudflare Durable Objects Facets (April 2026, beta) removes the last architectural blocker to non-static FAMtastic sites.

Each AI-generated app can now have its own isolated SQLite database in a Cloudflare Worker, with zero idle cost via hibernation. This means FAMtastic can generate reservation systems, lead capture with persistent storage, member areas, and lightweight e-commerce — all on the same infrastructure. Non-static sites are no longer a different architecture. They are a routing choice within the existing deployment model.

### 9. Mission Control is the feature that unlocks the 1,000-site operational model.

You cannot operate 1,000 sites without visibility into which are live, which are decaying, which are generating revenue, and which need attention. This doesn't need to be complex: a single-page report generated by `fam-hub admin status` showing all sites with their key metrics is the minimum viable version. The intelligence loop is already computing much of this data. The display layer is what's missing, and without it, the goal of 1,000 sites is operationally unachievable for one person.

### 10. The restyle intent dead code path is a trust-breaker that should be fixed before any new visual features ship.

A user who asks for a restyle, sees the system process it, and observes no change has learned that FAMtastic cannot be trusted with certain requests. Silent failures erode trust faster than error messages. A user who sees an error message knows what happened. A user who sees nothing learns to not trust the system. Fix the restyle path before shipping any new feature that touches the visual layer — it is the highest-priority trust debt in the system.

---

## WHAT WASN'T ASKED — BLIND SPOTS

These emerged from the research and were not in the original 12 research threads. This section is non-optional.

### Blind Spot 1: AI-generated sites are becoming the primary target of Google's quality suppression, and FAMtastic's design vocabulary is its defense.

AI builders are creating sites at scale, and Google's helpful content updates (2024–2025 refinements) specifically target thin AI-generated content. Sites that look and read like generic AI output are being actively suppressed in search rankings. FAMtastic's differentiation — vertical intelligence, custom BEM component vocabulary, genuine brand character, the Groove Theory 13-point checklist — is not just aesthetic preference. It is, without FAMtastic having designed it this way, an algorithmic survival mechanism. The sites that pass FAMtastic's build verification are structurally distinct from generic AI output. This should be made explicit in how FAMtastic is positioned: not "AI site builder" but "AI site builder that generates sites Google doesn't suppress."

### Blind Spot 2: The "site handoff / deal memo" transaction has no tooling anywhere in the market.

The rank-and-rent model requires a transaction between the site owner and the local business: agree on price, duration, lead volume, what happens if the business stops paying, and who owns the phone number and leads. This entire workflow is conducted verbally, via email, and on handshake today. No tool generates this deal memo automatically. A FAMtastic "site listing" feature — a generated one-page summary saying "here's the site, here's the niche, here's the estimated lead volume, here's the proposed monthly fee, here are the terms" — would be a unique capability that no other builder has, and it closes the loop from build to revenue.

### Blind Spot 3: The spec.json non-atomic write is a data integrity risk that grows non-linearly with site count.

The known gap (spec.json write not atomic — no .tmp+rename pattern) is low-risk at 5 sites. At 1,000 sites with concurrent or rapid-sequential builds, a corrupted spec.json from a crashed mid-write is a production incident that requires manual recovery. The fix is 4 lines of code (write to `spec.json.tmp`, then `fs.renameSync` to `spec.json` — atomic on POSIX filesystems). This should be implemented before scaling, not after the first corruption incident.

### Blind Spot 4: The per-site git repo model doesn't scale past 50 sites without hygiene tooling.

Each FAMtastic site gets its own git repo with dev/staging/main branches. At 50 sites, you have 150 branches across 50 repos. At 1,000 sites, this is 3,000 branches across 1,000 repos. There is currently no tooling to answer: "Which sites have uncommitted changes?", "Which sites are on a detached HEAD?", "Which sites haven't been pushed to remote in 30 days?", "Which sites have diverged from main?" This is a Mission Control sub-problem, but it is specifically a git hygiene problem that needs its own `fam-hub admin git-status --all` command before it becomes unmanageable.

### Blind Spot 5: The 5-check build verification system is a quality gate but not a quality signal — and this distinction matters at scale.

The current 5-check system tells you whether a build passed or failed. It doesn't tell you: how close was this build to failing? which check fails most often across all sites? which site has the most recurring quality failures? Converting the binary pass/fail into a scored output per check (the "FAMtastic Score" referenced as priority #5 in the decision matrix) would create the feedback loop needed to improve prompt quality over time. At 1,000 sites, aggregate build quality data is the input to making every future build better. Without scoring, the 5-check system never learns.

### Blind Spot 6: FAMtastic's compounding advantage is real but requires deliberate activation.

Memory-first architecture means build 500 rooftop bar sites and the 501st is demonstrably better than the first. But this compounding only happens if the memory layer is designed to capture and use the signal from every build — not just read it back, but actually influence future prompts. The `famtastic-dna.md` auto-update (Session 12 Phase 3) is the first layer. Mem0 per-site memory is the second layer. The third layer — which doesn't exist yet — is a feedback loop from build quality scores back to prompt refinement. This is the flywheel that makes FAMtastic progressively more valuable the longer it runs and the more sites it builds. It should be named, designed for, and treated as a first-class architectural priority, not an emergent side effect.

---

*Research conducted April 16, 2026. All 12 threads based on live web searches across: Databricks, Google Developers Blog, Cloudflare Blog, Mem0.ai, a16z, Contrary Research, TechCrunch, InfoQ, Smashing Magazine, DEV Community, Previsible, Empire Flippers, Ippei.com, UXmatters, UX Magazine, and multiple tool documentation sites including Aider, Kiro, Mem0, Shadcn/ui, A2A Protocol, and MCP.*
