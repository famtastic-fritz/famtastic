# FAMtastic — Total Ask Plan

**Date:** 2026-05-02
**Author:** Cowork session 01 (Shay v2 audit + briefing synthesis)
**Status:** PROPOSAL — pending Fritz review
**Companion docs:**
- `docs/shay-architecture-v2-proposal.md` (the surface architecture)
- `docs/captures/2026-05-02_cowork-session-01.md` (first knowledge-capture artifact)

---

## North Star (canonical, not up for revision)

**FAMtastic standard:** Fearless deviation from established norms with a bold and unapologetic commitment to stand apart on purpose, applying mastery of craft to the point that the results are the proof, and manifesting the extraordinary from the ordinary.

**Empire structure:**
- **Layer 1** — Portfolio of 1,000 income-generating digital products at $100/mo each.
- **Layer 2** — FAMtastic Studio ecosystem. The factory that builds + manages the portfolio, growing smarter through real production use. Site Studio is the seed; future Studios (Media, Brand, Component, Think Tank, etc.) are siblings.
- **Layer 3** — Future SaaS once the platform is validated at scale.

**The compounding rule:** Site #1,000 must benefit from everything learned building sites #1–#999. Anything that doesn't compound is leakage.

**Solution hierarchy (every recommendation gets named on this scale):**
1. **Efficiency** (highest)
2. **Automation** (runs without Fritz)
3. **Revenue potential** ($100/mo product, marketing, site income)
4. **"It works"** (red flag unless under time pressure)

---

## The total ask, in one sentence

A self-improving FAMtastic ecosystem of standalone Studios that share one persistent learning Shay, capture every breakthrough into a compounding knowledge base, and produce 1,000 income-generating products — built with plan-then-approve everywhere, observable everywhere, modifiable by Shay everywhere.

---

## Architecture in 4 layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 4 — KNOWLEDGE CAPTURE FLYWHEEL                           │
│  Reads chats, sessions, conversation.jsonl, summaries           │
│  Writes to .wolf/cerebrum.md, .wolf/buglog.json,                │
│  gaps.jsonl, FAMTASTIC-STATE.md, captures/                      │
│  Plan-then-approve. Grows session by session.                   │
└─────────────────────────────────────────────────────────────────┘
                                ↑
                        (feeds learnings)
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3 — SHAY (ONE IDENTITY, TWO CONTEXTS)                    │
│  Shay-Shay (light)  ↔  Shay's Workshop (deep)                   │
│  Page-context aware across every Studio.                        │
│  Routes intent, runs jobs, captures gaps, learns.               │
└─────────────────────────────────────────────────────────────────┘
                                ↑
                       (registered with)
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2 — STUDIOS (SIBLINGS, NOT MODULES)                      │
│  Site Studio (seed) │ Media Studio │ Brand Studio │ ...         │
│  Each: own tools, own functions, own context awareness.         │
│  Shared services they all call: research, memory, learning,     │
│  capability manifest, job queue, Shay routing.                  │
└─────────────────────────────────────────────────────────────────┘
                                ↑
                       (operate against)
                                ↑
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1 — CANONICAL STATE                                      │
│  ~/famtastic/ — single source of truth                          │
│  FAMTASTIC-STATE.md, CHANGELOG.md, .wolf/*, sites/<tag>/*       │
│  Never overridden by Drive, project knowledge, or memory.       │
└─────────────────────────────────────────────────────────────────┘
```

**Cross-cutting principles applied at every layer:**
- Plan-then-approve for every action that changes something
- Observable: every event emits, can be inspected and traced
- Workflow-as-data: no "stages live in the developer's head"
- Separation-ready: every component built assuming it might be extracted
- Compounding: every interaction feeds the learning loop

---

## The chunks

### Chunk A — Capture Flywheel (FOUNDATIONAL — start now, grows forever)

**Why first:** Per the briefing, every conversation that ends without capture is leakage. This is the meta-tool that makes everything else compound.

**MVP (Iteration 1):**
- Capture script: reads designated input sources (Cowork session transcripts, exported Web chats, Studio conversation.jsonl)
- Extracts: design decisions, breakthroughs, gaps, lessons, contradictions, recurring patterns
- Outputs structured proposals organized by destination (cerebrum.md / buglog.json / gaps.jsonl / FAMTASTIC-STATE.md / captures/)
- Plan-then-approve: produces a proposal doc, Fritz reviews and approves before anything writes to canonical files
- First input: this very Cowork session (manual capture as proof — automation comes Iteration 2)

**Iteration 2:**
- Per-session digest auto-generated at end of every Cowork session
- Per-Web-chat ingestion via export (Fritz pastes JSON or markdown export)
- First-pass automated extraction; Fritz reviews

**Iteration 3+:**
- Pattern detection across captures (3+ similar items → propose promotion to standing rule)
- Web search integration (Bright Data MCP if installed) — Shay can research a captured gap and report
- Memory inspector UI in the Workshop tool rail
- "Why did Shay suggest this?" attribution (every suggestion traces back to the capture that influenced it)

**Lives in:** `lib/famtastic/capture/` (ecosystem service, not Site-Studio-specific)

---

### Chunk B — Shay v2 Completion (running track)

What's done this session (iteration 0):
- Architecture v2 doc + 3 mockups
- 6→2 surface consolidation
- Composer reflow fix, MutationObserver quieted, layer isolation
- Workshop rename + tighten
- Page-context registry (browser-side)
- Handoff contract module + auto-rendered Workshop banner
- 5-state orb officially documented
- Architecture-critical naming (input IDs, shell IDs)

Remaining (estimated 20–32 hours bare-min, 45–76 hours with polish):

**Iteration 2 — Workshop tool rail + workbench (8–12h):**
- Cowork-style sidebar with tool registration API
- Workbench layout (active artifact in center)
- Docked chat alongside the bench
- Job queue panel wired to lib/job-queue.js
- 1–2 starter tools (memory inspector + cost tracker)

**Iteration 3 — Real Media Studio context awareness (6–10h):**
- Find Media Studio pages in studio-screens.js
- Add ShayContextRegistry.register() for each
- Server-side prompt assembly so Shay USES page_context (currently passes it but doesn't inject)
- "Take to Workshop" button in Shay-Shay's UI (currently console-only)

**Iteration 4 — Show-Me-How routine engine (6–10h):**
- Spotlight overlay (highlights any DOM element with a callout)
- Step counter UI panel
- Routine engine (programmatic UI navigation)
- Routine library: 5–10 common flows ("change domain", "deploy to staging", etc.)

**Iteration 5 — Visual reasoning + polish (6–10h):**
- Multimodal: Shay returns thumbnails inline ("which is warmest" answers WITH the image)
- 3–4 more Workshop tools (brain selector, capability viewer, marketplace, gap log)
- Brand color rework
- Orb animation/personality work (the deferred "make her real" pass)

---

### Chunk C — Ecosystem Substrate (parallel design track)

Each future Studio is its own product. The substrate makes "its own product" cheap to build.

**Iteration 2:** Studio registration API
- Each Studio declares itself: `FAMtasticEcosystem.registerStudio({ id, name, capabilities, tools, routes })`
- Shay knows which Studios exist + what each can do at session start
- Capability manifest extends to per-Studio entries

**Iteration 3:** Cross-Studio handoffs
- Handoff contract supports `destination_surface: "media_studio.workshop"` not just `"workshop"`
- Workshop tool rail filters tools by which Studio is active
- Memory namespaced: per-site / per-Studio / per-ecosystem

**Iteration 4:** Shared services namespace
- `lib/famtastic/research/` — research router (Pinecone, Gemini Loop, web)
- `lib/famtastic/memory/` — Mem0 + Kuzu integration when ready
- `lib/famtastic/learning/` — capture promotions, pattern detection
- `lib/famtastic/jobs/` — already exists (lib/job-queue.js)
- Each Studio imports; nothing duplicated

**Iteration 5+:** Spawn second Studio
- Pick Media Studio (already partly wired with media-shay-dock)
- Move Media-Studio-specific code out of studio-screens.js into its own surface
- Validate the substrate: same Shay, same handoffs, same tools, different page_ids

---

### Chunk D — Infrastructure wins (one-shots that unblock other work)

Ordered by leverage:

**D1. Drive sync fix** (briefing item 13, ~3–5h)
- Add delete-before-upload logic to the GitHub Action
- Diff what's in Drive vs. ~/famtastic/, produce stale-doc report
- Closes the long-standing "project knowledge is stale" issue
- Pre-req for Layer 4 (capture tool needs to push captures to Web project knowledge)

**D2. Workflow-as-data refactor** (briefing item 6 + breakthrough, ~12–20h, phased)
- Phase 1 — instrument existing imperative parallelBuild() with event emission (low risk)
- Phase 2 — define declarative pipeline data structure (parallel, no churn)
- Phase 3 — migrate stage by stage from imperative → declarative
- Unlocks: pipeline visualizer, A/B testing, Shay-proposed pipeline edits, history, audit-against-intent

**D3. Pipeline visualizer** (briefing items 10–12, ~10–15h, requires D2 phase 1)
- 7 functions: inspect, trace, reorder, swap, compare, propose, history
- Built atop workflow-as-data
- Lives in the Workshop tool rail (proves the rail extensibility)

**D4. Three site workflows** (briefing context, ~8–12h)
- `new_site_from_brief` — already works
- `adapt_existing_site` — first-class support (different state, permissions, config-discovery)
- `rebuild_from_brief` — first-class support (recreating from existing brief)

**D5. Long-context fixes** (briefing breakthrough, ~6–10h per fix)
- Prompt caching (for bloat-from-injection)
- Structured stage handoffs (for bloat-from-accumulation)
- Sub-agents with isolated context (for bloat-from-monolithic)
- Stop using Opus 1M as a band-aid

---

### Chunk E — The 18 evaluation tests (parallel, mostly low-risk artifacts)

These aren't features but they produce real artifacts and surface real gaps. Run as a side-track, mostly during iterations where Cowork has slack.

| # | Item | Difficulty | Notes |
|---|---|---|---|
| 1 | Sanity check — site #1 + Netlify URL | Easy | Trust-builder |
| 2 | Sanity check — node-pty version | Easy | Precision check |
| 3 | Trivial visual tweak | Easy | Already done implicitly via Shay v2 work |
| 4 | Cross-file edit (HTML + CSS) | Easy | Already done via Phase 2 + 3 |
| 5 | Pipeline-vs-architecture audit | Medium | Pre-req for D2 |
| 6 | Diagnose long-context breakage | Medium | Feeds D5 |
| 7 | Recurring bug patterns from sessions/changelog | Medium | Feeds A (capture tool) |
| 8 | Reverse-engineer one site → Studio prompt | Medium | Tests prompt comprehension |
| 9 | Run that prompt back through Studio | Medium | Verdict on Studio drift |
| 10 | Static pipeline diagram from server.js | Medium | Baseline for D3 |
| 11 | Instrumentation plan | Hard | Pre-req for D2 phase 1 |
| 12 | Pipeline visualizer mockup | Hard | Already partly via this session's mockups |
| 13 | Drive sync fix | Medium | = D1 |
| 14 | Drive diff report | Easy | Side-output of D1 |
| 15 | Full audit harness | Hard | The Cowork pattern proof |
| 16 | Custom skills + sub-agents recommendation | Medium | Feeds A (capture tool's research function) |
| 17 | Three-surfaces audit | Medium | Already done this session (the audit subagent) |
| 18 | Three-week retrospective | Medium | Feeds A |

Items 3, 4, 12, 17 are essentially done. Items 13/14 (Drive sync) are highest immediate ROI. Items 15/16/18 are the "is Cowork a permanent layer" tests.

---

## Iteration cadence

**Per session:**
1. Read context (CLAUDE.md, .wolf/cerebrum.md Do-Not-Repeat, FAMTASTIC-STATE.md, this plan)
2. Pick next chunk + iteration from the queue
3. Plan card: what we're building, expected token weight, time estimate
4. Execute
5. Capture: knowledge capture tool runs on the session (or manual capture if tool isn't ready yet)
6. Approve / merge artifacts
7. Update task list + this plan

**Per iteration target:** ship something visible at end of every session. Even small. The user sees a running, growing product, not a multi-week silent build.

**Per chunk:** estimate 1–4 iterations. Track in this plan.

---

## What's already shipped (Iteration 0, this session)

- `docs/shay-architecture-v2-proposal.md` — full architecture doc
- `docs/mockups/mockup-{a,b,c}.html` — three visual targets
- 6→2 Shay surface consolidation
- Composer reflow fix (kills "chat moves" feeling)
- MutationObserver quieted (orb stops dancing on every chat append)
- CSS isolation context (z-index races resolved)
- Workshop rename + tighten (no more full-width stretch, no extra cards)
- Page-context registry module (browser-side)
- Handoff contract module + auto-rendered Workshop banner
- 5-state orb formalized in `.wolf/cerebrum.md`
- Architecture-critical IDs renamed (composer inputs, Workshop shell)

This is roughly 6–8 hours of work. No commits yet — Fritz reviews and commits manually.

---

## Open questions (for groups 2–N as needed)

- For capture tool: where do raw input sources live? Need a designated drop folder (`~/famtastic/imports/` or similar)?
- For Drive sync: in scope this sprint or queued for later?
- For pipeline visualizer: does it live in the Workshop tool rail, or as its own Studio tab?
- For long-context fixes: which one first — caching, handoffs, or sub-agents?
- For the third-pillar workflow: when do we hand off to Claude Code vs. me execute? (Briefing says: text/CSS/<50 lines → me; server.js / classifier / >50 lines → Code prompt I draft.)
- For commits: keep doing manual commits (you), or invest in fixing my git access (probably not worth it given sandbox limits)?

---

## What I need (access / info)

Things that would dramatically improve plan quality:

1. **Web chat exports** — Fritz pastes the relevant Claude Web project chats (or exports to `~/famtastic/imports/web-chats/`). Without these I'm planning blind on half the history.
2. **Studio's existing conversation.jsonl** — I've seen the file paths but haven't ingested. The capture tool's first real test = mining these.
3. **Other Studios coming online** — names, rough timing, what each does. So I plan substrate for them.
4. **Time budget per session** — am I working against API or your subscription? Affects whether I lean on Opus or stay on Sonnet.
5. **Approval cadence** — every change waits for approval, or only changes that touch server.js / classifier / >50 lines?

---

## The pattern this plan honors

**Plan-then-approve.** Every chunk produces a proposal first. You approve before code lands.
**Compound.** Every iteration feeds the capture tool. Captures feed cerebrum. Cerebrum feeds future Shay routing. The flywheel never sleeps.
**Separation-ready.** Every shared service goes in `lib/famtastic/*` from day one. Studios import. Nothing tightly coupled.
**Observable.** Every event emits. Every job is queued. Every memory is attributable.
**FAMtastic.** The standard isn't "good enough." It's "the results are the proof." Apply on every recommendation.

---

*Plan document: 2026-05-02*
*Next action: Fritz reads, edits, approves. We pick Iteration 2's first chunk and ship.*
