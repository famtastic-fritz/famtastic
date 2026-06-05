# Hands-Off Income Research — Repo Analysis (agent 1 of 3)
> Overnight swarm, 2026-06-05. Raw. Synthesized into FRITZ-HANDS-OFF-INCOME-PLAY.md once all 3 land.

## The 4 repos — what's usable for a passive, store-distributed business

### 1. `ognjengt/founder-skills` (Claude Code skills for founders)
20+ slash-command skills (PRD, GTM, pricing, marketing copy) + a `FOUNDER_CONTEXT.md` pattern. **Verdict:** internal tooling, not sellable as-is (MIT, anyone installs it). **Steal:** the FOUNDER_CONTEXT pattern → a per-site brand/voice/audience context file wired into Site Studio.

### 2. `anthropics/knowledge-work-plugins` (19.2k★, official) — MOST STRATEGIC
Anthropic's official plugin format: **skills + commands + MCP connectors**, file-based (markdown+JSON), distributed via `claude.com/plugins` (Cowork) and `claude plugin marketplace add <github-repo>` (CLI). The `small-business` plugin wires QuickBooks/Stripe/HubSpot. **Verdict: the plugin format IS Fritz's product-packaging format.** Repackage Site Studio / content engine / Shay skills as installable Claude plugins. GitHub is effectively the marketplace today (like npm). Caveat: Anthropic hasn't opened *monetized* third-party plugin submission yet — watch, don't bank on it.

### 3. `AbsolutelySkilled/AbsolutelySkilled` (3 skills, MIT)
Standout = **Absolute UI**: 25 concrete design-reference guides (typography/color/Tailwind/a11y) — the kind that's usually a $500 Notion template. **Verdict:** drop into Site Studio's build prompt to sharpen output (zero pipeline change). `npx skills` CLI = a real free distribution channel for Fritz to publish his own pack.

### 4. `boshu2/agentops` (82 skills, CDLC control plane)
Run-packets + knowledge flywheel + multi-model `/council` gates + `/evolve` (fitness-scored autonomous improvement) + `/crank` (wave execution). **Verdict: Fritz already built a better, tuned version** (plans, OpenWolf, brain sync, Shay routing). **Steal:** `/evolve` (wire a GOALS.yaml fitness spec to the content engine so it generates what moves traffic/affiliate-clicks, fully autonomous) + `/council` (a 2nd-model judge as a Site Studio quality gate).

## The meta-pattern (the real opening)
**The Claude skills/plugin ecosystem is the "App Store of 2024-25" — early, underserved, free to publish to.** Fritz's unfair advantage: he has *working production infrastructure* (Site Studio, content engine, Shay) that none of these repo authors have. Be the first serious publisher in this channel with a product that actually *does* something.

## Tier-1 passive plays this unlocks
1. **Package Site Studio as a Claude plugin** (`/site-studio:build`) — free plugin = funnel; a **Gumroad/Stripe premium template library** = the product.
2. **FAMtastic Founder Skills Pack** (vertical skills: local-biz site audit, SEO brief, affiliate planner) — free pack drives template/site sales.
3. **Sell the FAMtastic design system** (fam-hero-layered, BEM vocab, dividers) as a paid Tailwind/HTML component pack on Gumroad/Lemon Squeezy — the `famtastic-dna.md` doc IS the product brief.

**Skip:** agentops as a product (already built better); founder-skills as-is (MIT); `claude.com/plugins` as a revenue channel *today* (no monetized submission yet).
