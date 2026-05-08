# Studio Tools and Processes Matrix

**Parent:** `STUDIO-PLATFORM-REFRESH-V2.md`
**Companion:** `MBSH-AS-STUDIO-BUILD-AUDIT.md` (the capability table) · `CONTROL-SURFACE-RECONCILIATION.md` (the seven surfaces).
**Purpose:** the inventory. Every tool, screen, registry, agent, MCP, gate, and process the platform should have, classified by status and ownership. The reading order is: pick a row, follow it back to the audit, follow it forward to a workstream.

---

## 1. How to read this matrix

Columns:

- **Item** — the named tool / screen / registry / agent / MCP / gate / process.
- **Type** — what kind of artifact it is.
- **Status** — exists / partial / doc-only / manual / missing.
- **Owner surface** — where it lives (Sites, Brainstorm, Plans, Components, Media, Research, Admin, or "substrate").
- **Authority** — what document defines it.
- **MBSH evidence** — where in the recent build it was needed or used.
- **Refresh-v2 priority** — Tier 1 (next), Tier 2 (after Tier 1 lands), Tier 3 (post-launch backlog).

Status legend (matches `MBSH-AS-STUDIO-BUILD-AUDIT.md`):
🟢 exists · 🟡 partial · 📄 doc only · ✋ manual · ❌ missing

---

## 2. Screens / Workspaces (the visible layer)

| Item | Type | Status | Owner | Authority | MBSH evidence | Tier |
|---|---|---|---|---|---|---|
| Mission Control | screen (Sites default) | 🟡 partial | Sites | Reconciliation §2.2 | Used implicitly via `index.html` legacy | 1 |
| Sites portfolio + single-site overview | workspace | 🟢 exists | Sites | UI-Foundation §4.1 | The MBSH single-site detail | 1 |
| Page editor with preview | workspace | 🟡 partial | Sites | UI-Foundation §4.1 | Manual edits to MBSH HTML | 2 |
| Build mode / Recipe Composer | workspace | 📄 doc only | Sites | FRDB §11 | The implicit MBSH recipe | 2 |
| Theme Contract screen | workspace | 📄 doc only | Sites | FRDB §11 | `PREMIERE-DESIGN-MAP-2026-05-07.md` | 2 |
| Page Purpose Map screen | workspace | 📄 doc only | Sites | FRDB §11 | Hand-authored across docs | 2 |
| Scene Board | workspace | 📄 doc only | Sites | FRDB §11 | Implicit in section archetypes | 3 |
| Asset Board | workspace | 📄 doc only | Media | FRDB §11 | Manual rembg + cache-bust workflow | 2 |
| Character Board | workspace | 📄 doc only | Components or Media | FRDB §11 + V2-Learnings §1 | HARRY_SCENE_MAP + placement rule | 2 |
| Build Ledger panel | per-site panel | 📄 doc only | Sites | Reconciliation §2.6 + FRDB §11 | `MBSH-PREMIERE-BUILD-LEDGER.md` | 1 |
| Preview Board | workspace | 🟡 partial | Sites | FRDB §11 | Headless preview probes | 2 |
| QA Board | workspace | 📄 doc only | Sites or Admin | FRDB §11 + §16 | The pre-prod audit | 2 |
| Deploy Center | workspace | 🟡 partial | Admin | UI-Foundation §4.7 | Netlify CLI + manual smoke | 1 |
| Learning Board | workspace | 📄 doc only | Research | FRDB §19 | `V2-LEARNINGS-AND-PATTERNS.md` | 2 |
| Brainstorm inbox + detail | workspace | 🟡 partial | Brainstorm | UI-Foundation §4.2 | (not used in MBSH) | 3 |
| Plans active list + detail | workspace | 🟢 exists | Plans | UI-Foundation §4.3 | Used throughout MBSH | 1 |
| Components grid + detail | workspace | ❌ missing | Components | UI-Foundation §4.4 | Pattern only documented in V2 | 2 |
| Media Studio (prompt-first) | workspace | 🟡 partial | Media | UI-Foundation §4.5 + Refresh §D | Manual + scripted flows | 1 |
| Logo Lab | sub-workspace | 📄 doc only | Media | Refresh §D | brand-mark-foil hand-generated | 2 |
| Hero Image mode | sub-workspace | 📄 doc only | Media | Refresh §D | (used pre-existing assets) | 2 |
| Video Lab readiness | sub-workspace | 📄 doc only | Media | Refresh §D | (no video gen invoked) | 3 |
| Background Video pipeline (still→i2v→loop) | sub-workspace | 📄 doc only | Media | Refresh §D | (used existing dancefloor MP4) | 3 |
| Asset Library | sub-workspace | 🟡 partial | Media | UI-Foundation §4.5 | `frontend/assets/...` per site | 2 |
| Brand Kit | sub-workspace | 🟡 partial | Media | UI-Foundation §4.5 | Per-site brand assets | 2 |
| Adobe Handoff panel | sub-workspace | ✋ manual | Media | API-Cost-Governance §10 | Manual finishing | 3 |
| Component Studio (HTML/CSS/JS sandbox v0) | workspace | ❌ missing | Components | Refresh §E | Pattern-only via MBSH builds | 2 |
| Research workspace | workspace | 🟡 partial | Research | UI-Foundation §4.6 | Pinecone connected, no UI flow | 2 |
| Capability Manifest screen | workspace (Admin) | 🟡 partial | Admin | UI-Foundation §4.7 | `lib/capability-manifest.js` | 1 |
| Approvals queue (Approval Center) | workspace (Admin) | 📄 doc only | Admin | Reconciliation §2.5 | `hard_stop_conditions` registered, page missing | 1 |
| Worker queue / Jobs tab | workspace (Admin) | 🟡 partial | Admin | `plan_2026_05_05_ops_workspace_gui` | Existing `index.html` mountpoint | 1 |
| Cost summary | workspace (Admin) | ❌ missing | Admin | API-Cost §4.5 | Netlify build-credit silent failure | 1 |
| Provider health | workspace (Admin) | ❌ missing | Admin | API-Cost §4.3 | Gemini key expiration found by failure | 1 |
| Deploy targets | workspace (Admin) | 🟡 partial | Admin | UI-Foundation §4.7 | MBSH staging + production projects | 1 |
| System health overview | workspace (Admin) | 🟡 partial | Admin | UI-Foundation §4.7 | Studio launchd setup | 2 |
| Shay Desk | screen (Triage) | 📄 doc only | Shay (ambient) | Reconciliation §2.4 + Refresh §F | Reached through Shay, not nav | 2 |
| Shay Bubble (per-page contextual) | ambient | 🟡 partial | (ambient) | UI-Foundation R3 | Sees workbench context | 2 |
| Shay orb / avatar / themed presence | ambient | 📄 doc only | (ambient) | Refresh §F | Future direction | 3 |

---

## 3. Registries (the canonical lists)

| Registry | Status | Owner surface | Authority | Notes |
|---|---|---|---|---|
| Plan registry (`plans/registry.json`) | 🟢 exists | Plans | UI-Foundation §4.3 | 8 active parents; Platform Refresh v2 should umbrella them |
| Task registry (`tasks/tasks.jsonl`) | 🟢 exists | Plans (substrate) | plan-task-run-intelligence | |
| Run registry | 🟢 exists | Plans (substrate) | plan-task-run-intelligence | |
| Proof registry | 🟢 exists | Plans (substrate) | plan-task-run-intelligence | |
| Capability registry | 🟢 exists (manifest) | Admin | `lib/capability-manifest.js` + `studio-capabilities.json` | Extend to media, video, agents, MCPs, monthly cost |
| Component registry | ❌ missing | Components | UI-Foundation §4.4 | The library MBSH never had |
| Recipe registry | ❌ missing | Sites or Plans | FRDB §12 | base_type + modules + lanes |
| Skill registry | ❌ missing | Plans / Components | FRDB §12 | Initial candidates listed in FRDB §13 |
| Agent registry | ❌ missing | Plans | FRDB §12 | Initial candidates in FRDB §14 |
| Prompt registry | ❌ missing | Media + Components | FRDB §6 | Prompts as objects, not strings |
| QA gate registry | ❌ missing | Sites or Admin | FRDB §16 | All gates defined in `MBSH-AS-STUDIO-BUILD-AUDIT.md` Tier-1 column |
| Pattern registry | ❌ missing | Components or Research | FRDB §12 | Section archetypes, footer treatments, etc. |
| Learning registry | 🟡 partial | Research | FRDB §19 | `V2-LEARNINGS-AND-PATTERNS.md` is the seed |
| Backlog registry | 🟡 partial | Plans | FRDB §19 | V2 backlog is per-site today |
| Decision registry | 🟢 exists per-site | Sites | MBSH `DECISION-LOG.md` pattern | Cross-site decision registry missing |
| Capture / Memory store | 🟢 exists | (substrate) | `captures/` + `memory/<type>/` | Intake working; retrieval missing |
| Site-promotion ladder schema | 📄 doc only | Sites + Admin | `plan_2026_05_05_platform_site_promotion` | dev/staging/main, release tags, rollback |
| Smoke-test registry | ❌ missing | Sites + Admin | API-Cost §10 + MBSH P12 | The 12-item launch checklist needs to be reusable |

---

## 4. Agents (the named expert critics + workers)

| Agent | Status | Use case | When invoked |
|---|---|---|---|
| Creative Director | 📄 doc only | Theme + page composition critique | Audit pass, design review |
| UX Flow Specialist | 📄 doc only | Where-am-I / what-do-I-do-next checks | Audit pass |
| Visual QA Critic | 📄 doc only | Image quality, asset integrity, scene fit | Audit pass, post-asset-gen |
| Character Director | 📄 doc only | Character pose, placement, in-scene logic | Audit pass, post-asset-gen |
| Asset Director | 📄 doc only | Asset alpha, compression, library consistency | Asset Board QA |
| Accessibility Agent | 📄 doc only | a11y, reduced-motion, keyboard | QA gate |
| Performance Agent | 📄 doc only | Lighthouse, image weight, LCP | QA gate |
| Deployment Manager | 📄 doc only | Pre-deploy fingerprint + smoke checklist | Pre-staging-push, pre-prod merge |
| Learning Loop Curator | 📄 doc only | Extract closeouts → registry | Post-run |
| Research Strategist | 📄 doc only | Brief enhancement, opportunity, positioning | Pre-recipe |
| Conversion Strategist | 📄 doc only | CTA, form readability, funnel sanity | QA gate |
| Brief Enhancer | 📄 doc only | Vague → researched | Pre-recipe |
| Section Archetype Classifier | 📄 doc only | data-mode tagger | Build pass |
| Asset Alpha / Quality Auditor | 📄 doc only | Asset background + edge check | QA gate |
| Form Readability Auditor | 📄 doc only | Label + input + placeholder + iOS | QA gate |
| Footer Treatment Generator | 📄 doc only | Final Reel pattern | Build pass |
| Production Readiness Auditor | 📄 doc only | 7-lens audit | Pre-prod gate |
| Component Replacement Planner | 📄 doc only | Slot ops, swap proposals | Build pass |
| Prompt Critic / Regenerator | 📄 doc only | Regeneration with delta capture | Asset Board |

(Existing infrastructure: Claude Code, Codex, Cowork as agent surfaces with `AGENT-COORDINATION.md` scope-locks. The list above is *expert agents*, distinct from agent surfaces.)

---

## 5. MCPs / connectors (the platform's hands)

| MCP | Status | Purpose |
|---|---|---|
| Netlify MCP | 🟡 partial | deploy status, logs, limits, site IDs, rollback, build-minute monitoring |
| GitHub MCP | 🟡 partial | branches, PRs, commits, diffs, files, release tags, scope-lock check |
| Browser QA MCP | 🟡 partial | screenshots, console logs, click tests, mobile viewports (Claude Preview is partial) |
| Image Pipeline MCP | ❌ missing | generate, remove background (rembg), alpha check, compress, contact sheet |
| API Capability MCP | 🟡 partial | test Gemini/OpenAI/Firefly keys, quotas, model availability, fallback status (manifest is the seed) |
| Content/CMS MCP | ❌ missing | edit config, dates, venue, ticket status, playlist ID, memorial names, social links |
| Research MCP | ❌ missing | Perplexity / web search / competitor scan / SEO research |
| Local Build MCP | 🟡 partial | dev server, build, lint, minify, inspect large files, smoke tests |
| Adobe / adb-mcp | 📄 doc-confirmed-untested | Photoshop desktop automation |
| Capability Truth Layer probe MCP | ❌ missing | unified probe runner that updates the Truth Layer |
| Cost telemetry MCP | ❌ missing | per-call recording → `tasks/provider-calls.jsonl` |

---

## 6. QA gates (automated guardrails)

Every gate is the same shape: `{ name, scope (per-pass / pre-staging / pre-prod), inputs, pass criteria, fail action }`. Listed here in priority order:

| Gate | Scope | Status | Tier |
|---|---|---|---|
| Theme consistency | per-pass | 📄 doc only | 2 |
| Page purpose | per-pass | 📄 doc only | 2 |
| Section archetype (every section has data-mode) | per-pass | 📄 doc only | 1 |
| Character placement (medallion=center / in-scene=left / chat=right) | per-pass | 📄 doc only | 1 |
| Asset alpha / dirty background | post-asset-gen | 📄 doc only | 1 |
| Form readability (labels readable + inputs ≥16px + placeholders softer) | per-pass | 📄 doc only | 1 |
| Footer treatment (no default-grid CMS footer) | per-pass | 📄 doc only | 1 |
| Mobile viewport (375 × 812 walk) | pre-staging | 📄 doc only | 1 |
| Capability check (every required capability is `working`) | pre-pass | 🟡 partial | 1 |
| Preview freshness (cache busted, latest commit live) | pre-staging | ✋ manual | 1 |
| Deployment readiness (rollback recipe + smoke list ready) | pre-prod | ✋ manual | 1 |
| Production smoke (12-item) | post-prod | ✋ manual | 1 |
| Learning capture (V2 doc updated; closeouts present) | post-run | ✋ manual | 1 |
| FX overlay opacity ≤ 0.15 | per-pass | ❌ missing | 2 |
| iOS auto-zoom guard (input ≥ 16px) | per-pass | ❌ missing | 1 |
| Console-error guard | per-pass | ❌ missing | 1 |
| Broken-image / link guard | per-pass | ❌ missing | 1 |
| Empty-stub / dead-link guard | per-pass | ❌ missing | 1 |
| Cost-threshold guard (per-call estimate, soft, hard) | pre-call | 📄 doc only | 1 |
| Build-credit guard (Netlify minute monitoring) | pre-deploy | ❌ missing | 1 |

Tier-1 gates are the floor for any new build under Platform Refresh v2.

---

## 7. Processes (the unwritten rules made explicit)

| Process | Status | Authority |
|---|---|---|
| Pass closeout authoring (intent → outcome → proof → deferred → next) | 🟡 pattern (per-site, hand-authored) | MBSH `PASS-N-CLOSEOUT.md` |
| Resume contract (RUN-STATE + closeouts + decisions + coverage) | 🟡 pattern | MBSH `RUN-STATE.md` |
| Decision log (R-numbered with default + accepted + rationale) | 🟡 pattern | MBSH `DECISION-LOG.md` |
| Coverage matrix (per-pass capability coverage) | 🟡 pattern | MBSH `COVERAGE-MATRIX.md` |
| Failure log + deferred assets | 🟡 pattern | MBSH `FAILURE-LOG.md` + `DEFERRED-ASSETS.md` |
| Pre-flight scope-lock check (`scripts/agent-checkin.js`) | 🟢 exists | `AGENT-COORDINATION.md` |
| Capture intake (`fam-hub capture extract`) | 🟢 exists | FAMTASTIC-STATUS |
| Capture promotion to canonical memory | ❌ missing | `plan_2026_05_05_chat_capture_learn_optimize` |
| Promote local pattern → registry entry | ❌ missing | FRDB §12 |
| Status-packet regeneration (FAMTASTIC-STATUS.md from registry) | ✋ manual | plan-task-run |
| Production deploy approval (Approval Center → Fritz) | 🟡 partial (manual today) | governance.hard_stop_conditions |
| Rollback proof (commit pinned + recipe documented) | ✋ manual | MBSH launch report |
| Per-run cost report | ❌ missing | API-Cost §4.4 |
| Monthly cost summary | ❌ missing | API-Cost §4.5 |
| Smoke-test execution (12-item curl pattern) | ✋ manual | MBSH launch |
| Learning extraction (post-launch V2 doc) | ✋ manual | MBSH `V2-LEARNINGS-AND-PATTERNS.md` |
| Site Assistant FAQ refinement loop | ❌ missing | Refresh §G + V2 §10 |

---

## 8. Tier 1 lock (the next build's floor)

These items must be either 🟢 or 🟡-with-handler-and-proof before Platform Refresh v2 declares the next build "Studio-driven, not hand-built":

1. Mission Control (port from legacy `index.html` into Sites domain)
2. Capability Truth Layer extension (media, video, agents, MCPs, monthly cost)
3. Build Trace phase 2 (stage/event matching, missing-stage detection)
4. Build Ledger scaffold (per-site directory template)
5. Approval Center (the page, drawing from existing hard_stop_conditions)
6. Cost telemetry (`tasks/provider-calls.jsonl` + per-run cost report + monthly summary)
7. Provider health probe + cost-aware routing
8. Tier-1 QA gates wired into the build pass:
   - Section archetype gate
   - Character placement gate
   - Asset alpha gate
   - Form readability gate (incl. iOS 16px + placeholder + label readable)
   - Footer treatment gate
   - Mobile viewport gate
   - Console-error / broken-image / dead-link gates
   - Cost threshold gate + build-credit guard
9. Smoke-test registry (the 12-item pattern as a runnable checklist per site)
10. Recipe registry seed (cinematic / event / portfolio / shipping templates derived from MBSH + the FRDB shipping example)

Until those land, the next build is still a hand-built run (which is fine — the autonomous build operating model handles it). Once they land, the build is Studio-driven.

---

## 9. Tier 2 (after Tier 1)

- Component Studio v0 (the sandbox)
- Component registry + grid + detail
- Skill registry + initial skills (Section Archetype Classifier, Asset Alpha Auditor, Form Readability Auditor, Footer Treatment Generator)
- Agent registry + initial agents (Creative Director, UX Specialist, Visual QA, Character Director, Asset Director, Conversion Strategist)
- Prompt registry (prompts as objects with research basis + composition + critique loop)
- Pattern registry (Section archetypes, Final Reel footer, Billboard slideshow, Where-Next reel cards)
- Learning Board (research domain) + retrieval/apply/verify
- Theme Contract / Page Purpose Map / Scene Board / Asset Board / Character Board screens
- Recipe Composer screen
- Brand Kit + Asset Library proper UI
- Logo Lab sub-workspace
- Hero Image sub-workspace
- Adobe Handoff panel
- Shay Desk page

---

## 10. Tier 3 (post-launch backlog)

- Video Lab readiness (still → i2v → loop)
- Background Video pipeline
- Brainstorm inbox UI deepening
- Editor-with-Chat for non-Studio editors (capture promote, brief editor)
- Workshop / Sandbox enhancements (multi-pane state inspector, runner)
- Shay orb / avatar / themed presence
- Public-site assistant character creation tool (generalize Hi-Tide Harry → other mascots)
- Cross-site decision registry
- Monthly improvement engine (competitor checks, seasonal content, SEO opportunities)

---

## 11. What this matrix locks

- A single named inventory for every tool, screen, registry, agent, MCP, gate, and process.
- A single status vocabulary (🟢 🟡 📄 ✋ ❌) that maps cleanly to the Capability Truth Layer.
- Three tiers (1 / 2 / 3) that name the order of work without over-committing.
- A clear floor (Tier 1) that defines when the next build is Studio-driven instead of hand-built.

If a new ask doesn't fit into one row of this matrix, it's either a renamed duplicate or genuinely new — and if new, it has to earn its row by matching an existing column shape.
