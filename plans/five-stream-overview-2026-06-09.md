# FAMtastic Five-Stream Overview — 2026-06-09

**Status:** Active planning document
**Streams:** shay-platform | income | research | metaphysical | fritz

---

## 1. SHAY + PLATFORM (Infrastructure, Agent Layer, Codebase)

| # | Item | Status | Next Move | Stream |
|---|------|--------|-----------|--------|
| 1 | **Ph9 Live Cutover** — switch flip to new codebase | Shovel-ready. Fritz gates. Claude Code fixed Ollama brain, 11 models loaded, anatomy-based systems built on `shay-platform-build` branch. | Schedule cutover window with Fritz | shay-platform |
| 2 | **Ollama Brain** — local model routing | FIXED. 11 models pulled. GLM-5.1 primary, OpenCodeGo squeeze lane confirmed. | Monitor for model drift | shay-platform |
| 3 | **Site Studio refactor** — strip monolith to modular lifecycle-only | Pending. Current JS is monolithic. Needs clean separation. | Break into skill-sized modules per modular-workflow thesis | shay-platform |
| 4 | **Kanban DB** — 5-stream junction table | Schema built but empty (0-byte shay.db). | Seed with active tasks | shay-platform |
| 5 | **Thinking-logs capture** | Not built. Fritz's standing request. | Design + wire into Shay runtime | shay-platform |
| 6 | **Shay Desktop (Electron)** | Built and installed. Not connected to new codebase yet. | Post-Ph9 integration | shay-platform |
| 7 | **Shay Desktop (Swift)** | Built as SSH workbench. Separate from Electron app. | Evaluate which one lives post-Ph9 | shay-platform |
| 8 | **CAPABILITY ENHANCEMENT: Multi-brain dispatch skill** — two proven lanes: (A) Claude Code agent swarms for deep, observable, thorough research (the gold standard — Agent View gives Fritz real-time visibility into what each agent is doing, priceless for oversight); (B) Gemini Pro for fast one-pass research+mockup iteration (Fishing Lines 6-8 proved this out). Shay's job = dispatch the RIGHT brain for the task. Deep research → Claude Code swarm. Fast visual exploration → Gemini. Productize both as callable skills. | Lane A: proven (Claude Code swarms). Lane B: proven (Fishing Lines 6-8). Neither productized as a Shay skill yet. | Create `deep-research-swarm` skill (Claude Code) + `gemini-research-mockup` skill → wire both into Shay dispatch planner → Fritz picks the lane or Shay recommends based on task | shay-platform |

## 2. INCOME (Revenue Pipelines, Customers, Cash)

| # | Item | Status | Next Move | Stream |
|---|------|--------|-----------|--------|
| 1 | **URGENT: famtasticthoughts.com** — expires June 29 | Domain transfer/renewal needed NOW | Transfer to GoDaddy reseller or renew immediately | income |
| 2 | **LINE 1: FAMtasticDesigns.com** — e-commerce + PayPal | Stack not chosen. Drupal is default but must NOT be defaulted. | Stack eval (Drupal vs Astro vs Next.js vs others) then build | income |
| 3 | **LINE 2: FAMtasticThoughts.com** — blog/deals/content, promotes Designs | Domain expiring. Content engine not built. | Renew domain, plan subfolder structure, wire content engine | income→research |
| 4 | **LINE 3: FAMtasticHosting.com** — reseller face lift | GoDaddy reseller auth works. Product pages toggling live. STRATEGIC RULE: customers route through famtasticdesigns.com, NOT store.famtastichosting.com. | Face-lift storefront, wire checkout → Designs | income |
| 5 | **JJ BA Transport** — pipeline proof + personal promise | Repo exists, no task docs, embarrassingly basic output, never pushed live. Friend from the Y. Word on the line. | Full pipeline run: domain → design → staging → client review → deploy → payment. Make it FIRE. | income+fritz |
| 6 | **MBSH reunion** — site live, needs finalization | Live at mbsh96reunion.com. Design updates pending, Hi-Tide Harry assets needed, promo not started. | Schedule design review, source hero assets, start promo | income |
| 7 | **FAMU cruise June 26** — brand launch event | Hard deadline 17 days out. NOT revenue — advertising venue. Minimum viable presence. | Define minimum viable: simple platform, basic info, business workflows | income |
| 8 | **GoDaddy reseller** — wholesale hosting backend | Auth confirmed. VPS4 Self-Managed Linux = $4.19/mo wholesale. API /v1/orders works. | Use as backend ONLY. Never customer-facing. | income |
| 9 | **Tool/subscription discovery audit** — money left on table | Not started. | Audit all paid subscriptions for waste or leverage | income+fritz |
| 10 | **FAMtastic Platform dashboard** — tracking, reports, analytics | Concept. Would live on famtasticinc.com. | Define MVP scope post-Ph9 | income+shay-platform |

## 3. RESEARCH (Standing Engine, Tool Investigation, Stack Eval)

| # | Item | Status | Next Move | Stream |
|---|------|--------|-----------|--------|
| 1 | **Stack evaluation** — Drupal vs alternatives for Designs + Thoughts | Not started. Drupal is comfort zone but must evaluate per use case. | Research module: compare Drupal, Astro, Next.js, Remix, others | research |
| 2 | **External repo adoption** — Fritz's repos into FAMtastic flow | Not started. | Inventory all repos, classify: adopt, archive, or drop | research |
| 3 | **arena.ai** — free prototyping leverage | Not started. | Investigate: capabilities, free tier, mapping to our pipeline | research |
| 4 | **Content engine** — bug logs + SITE-LEARNINGS → blog posts on Thoughts | Concept only. | Design module: research → content pipeline, cha-ching output | research+income |

## 4. METAPHYSICAL (Spiritual Layer, Not Optional)

| # | Item | Status | Next Move | Stream |
|---|------|--------|-----------|--------|
| 1 | **FAMtastic Thoughts studio** — Teach/Preserve | Defined in Tier-3 interview. Concept collection + adversarial peer review as survival mechanism. | Define first content to go live alongside domain renewal | metaphysical |
| 2 | **Faith-vs-guarantee tension** — core decision framework | Identified as Fritz's core tension. FAMtastic IS the faith path. | Ongoing framing — informs every income decision | metaphysical |

## 5. FRITZ (Mental, Physical, Health, Relationships — Load-Bearing)

| # | Item | Status | Next Move | Stream |
|---|------|--------|-----------|--------|
| 1 | **JJ BA** — personal relationship at stake | A friend Fritz bragged to. Basic output. Never delivered. | Priority pipeline test. Deliver something FIRE. | fritz+income |
| 2 | **MBSH committee** — relationship management | Promised them a site. Live but needs love. | Don't let it sit stale — design review, then promote | fritz |
| 3 | **AMA job** — primary income source | No Shay access to Teams/email. Hard gap. | Microsoft Graph API = fix path (same tenant covers email + Teams + calendar) | fritz |
| 4 | **Cognitive load protection** — Prime Directive | Multiple fires burning. Domain expiring. Friend waiting. Platform cutover pending. Cruise in 17 days. | This document IS the load reduction — see all at once, pick next move | fritz |

---

## PRIORITY STACK

1. **famtasticthoughts.com renewal/transfer** — expires June 29. Lose domain = lose content engine before it starts. 30-minute task.
2. **JJ BA Transport** — personal promise, relationship on the line, AND pipeline proof test. Two birds, one site.
3. **FAMU cruise June 26** — hard deadline, 17 days. Minimum viable presence.
4. **Shay Ph9 cutover** — shovel-ready. Fritz gates the timing.
5. **FAMtasticDesigns stack eval + build** — the real e-commerce revenue line.
6. **Everything else** — research modules, content engine, discovery audit.

---

## CROSS-STREAM DEPENDENCIES

- famtasticthoughts.com → blocks Thoughts studio, blocks content engine, blocks LINE 2
- JJ BA → proves the full pipeline (domain → design → deploy → payment), feeds Designs template
- Ph9 cutover → unblocks platform dashboard, thinking-logs, kanban seeding
- Stack eval → blocks LINE 1 (Designs) build
- GoDaddy reseller → feeds all three lines as wholesale backend

---

*Generated by Shay-Shay. Captured in memory as FIVE-STREAM STATUS (2026-06-09).*
*Three Lines Pipeline detail: ~/famtastic/plans/three-lines-pipeline-2026-06-09.md*