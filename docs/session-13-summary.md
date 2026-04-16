# Session 13 Summary — 2026-04-16
## FAMtastic Site Studio — Trust Debt Fixes + Surgical Editor + Revenue-First Brief

**Session type:** Studio development (code changes, no site builds)  
**Tests added:** 53 (14 + 21 + 18)  
**Cumulative tests:** ~1,236  
**Commits:** 4 (3 code + 1 docs)  
**Claude API calls during development:** 0 (all code + test work)

---

## What Was Built

### Phase 0 — Three Immediate Trust Debt Fixes

**1. conversational_ack intent**  
Short affirmations ("ok", "looks good", "thanks", "perfect", etc.) previously triggered full Claude API calls — zero-value spend. Added `ACK_PATTERNS` regex in `classifyRequest()` returning a new `conversational_ack` intent. Both routing locations (routeToHandler + main WS switch) now return an instant `getAckResponse()` string with no API call. The response is contextual: if no brief exists, it suggests starting one; if pages exist, it suggests refinement or deploy.

**2. Atomic spec.json writes**  
`writeSpec()` previously used `fs.writeFileSync(SPEC_FILE(), ...)` directly — a mid-write crash would corrupt spec.json. Changed to write `spec.json.tmp` then `fs.renameSync()` to final path (POSIX atomic). New site creation path also atomic. This is low-risk at 5 sites, critical risk at 1,000.

**3. Restyle intent routing**  
`restyle` was grouped with `new_site`/`major_revision` in both routing locations, sending it to `handlePlanning()` — a brief creation flow. The actual restyle execution code already existed inside `handleChatMessage` but was unreachable dead code. Fixed: both routing locations now call `handleChatMessage(ws, userMessage, 'restyle', spec)`. Stale dead-code comment removed. Silent no-ops are the worst failure mode — worse than error messages because users blame themselves.

### Phase 1 — DOM-aware Surgical Editor

New module `site-studio/lib/surgical-editor.js` (~200 lines, pure functions, zero side effects):

- `buildStructuralIndex(html, page)` — scans `data-section-id`, `data-fam-section`, `data-field-id`, `data-slot-id` elements, returns a lightweight descriptor. Run after every build, stored in `spec.structural_index[page]`.
- `extractSection(html, selector)` — returns only the targeted node's outer HTML. ~80–150 tokens vs 600–1,200 for the full page. ~90% reduction.
- `surgicalEdit(html, selector, newContent)` — cheerio DOM replacement. Touches only the targeted node. Returns full HTML.
- `trySurgicalEdit(html, selector, newContent)` — null on selector miss (safe fallback to full-page generation).

Wired into `runPostProcessing()` as Step 9 (non-fatal, wrapped in try/catch). The structural index is now populated after every build. **The routing wiring — using this index to intercept `content_update` before sending full HTML to Claude — is Phase 1 continuation work.**

### Phase 2 — Revenue-first Brief Interview

The insight from DEEP-DISCOVERY.md: every AI site builder asks "what kind of business?" No builder asks "how will this make money?" The answer changes the entire site architecture. Added `q_revenue` as the **second question** in the client interview (after business description, before customer). 

Seven canonical revenue models with `suggestion_chips` for the UI:
- `rank_and_rent`, `lead_gen` → lead form + call tracking slot + LocalBusiness schema
- `reservations` → booking widget slot + Event schema
- `ecommerce` → product grid + cart slot + Product schema  
- `affiliate` → comparison table + FAQ schema
- `not_sure` / `stub` → basic contact form + data-field-id seeded CTAs

`getRevenueBuildHints(model)` is injected into every build prompt as a `REVENUE ARCHITECTURE` block when a non-stub model is captured. This means rank-and-rent sites now include lead capture forms and call tracking slots by default — without Fritz having to ask.

`fam-hub site deal-memo <tag>` generates a markdown deal memo for the rank-and-rent handoff transaction (site info, vertical, geography, estimated lead volume, proposed monthly fee, basic terms). No tool exists anywhere in the market for this workflow.

---

## What Was Deferred

**Phase 3 — FAMtastic.com build**: requires an interactive Studio session with live preview. Cannot be executed in code-only mode. Pre-loaded brief is ready in `docs/session-next-report.md`. Run `fam-hub site new famtastic-com` and paste the Phase 3 spec to start it.

---

## New Documents Created

- `docs/DEEP-DISCOVERY.md` — 12-thread deep research sweep (generated before session start)
- `docs/session-next-report.md` — Phase 0–3 report with cost tracking
- `docs/STUDIO-ARCHITECTURE.md` — Deep architecture reference (request lifecycle, state model, build pipeline, surgical editor, prompt assembly)
- `docs/session-13-summary.md` — This file

## Documents Updated

- `FAMTASTIC-STATE.md` — Full regeneration (Session 13 additions, corrected gaps, updated test count, new files in inventory)
- `CHANGELOG.md` — Session 13 entry appended
- `SITE-LEARNINGS.md` — Session 13 section appended with all three fix patterns + new gaps

---

## Gaps Opened This Session

1. **Surgical editor routing not wired into content_update** — The `extractSection` + `surgicalEdit` path exists but `handleChatMessage` still sends full HTML for content_update intents. Phase 1 continuation.
2. **Revenue model suggestion chips not in Studio UI** — `suggestion_chips` exported from client-interview.js but the Studio chat panel doesn't render them as clickable chips yet.
3. **deal-memo geography defaults to placeholder** — When interview was skipped, `geography` field is `[AREA]`. Should fall back to `spec.design_brief` geography.

---

## Gaps Closed This Session

| Gap | Status |
|-----|--------|
| `spec.json` write not atomic | **Closed** — `.tmp` + `renameSync` |
| `conversational_ack` missing | **Closed** — zero-cost handler |
| Restyle dead code routing | **Closed** — routes to `handleChatMessage` |

---

## Key Decisions Made

1. **Do not decompose server.js** — The monolith is the moat at this scale. Every session spent splitting is a session not spent on revenue. Decision confirmed by DEEP-DISCOVERY.md research (Base44: $80M exit on a monolith with 8 employees).

2. **Revenue model before vertical in every brief** — The research finding that no other builder does this, and that it fundamentally changes site architecture, warrants changing the interview question order.

3. **DEEP-DISCOVERY.md as standing reference** — The 12-thread research sweep surfaces findings that should inform feature decisions: LLM visibility gap, rank-and-rent tooling gap, Cloudflare Durable Objects for dynamic sites, Mem0+Kuzu for per-site memory, compounding advantage flywheel.
