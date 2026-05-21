# FAMtastic Studio — Platform IA & Functional Map

**Date:** 2026-05-10
**Branch:** `research/studio-intelligence-foundation-20260508`
**Status:** Spec/mapping only — no code changes in this pass
**Phase:** 2 of 5 (drift-correction realignment)

This document is the canonical platform-level information architecture for FAMtastic Studio. It supersedes the design template's 9-item rail — per the platform spec, the rail is **12 items**.

It is also the explicit correction to the recent drift in which Mission Control was treated as the whole Studio. **Mission Control is one section among twelve.**

---

## Canonical platform navigation (12 items)

```
1.  Home
2.  Sites
3.  Site Builder
4.  Site Settings
5.  Think-Tank / Brainstorm
6.  Research Center
7.  Component Studio
8.  Media Studio
9.  Media Library
10. Shay Shay
11. Mission Control
12. Settings
```

This rail order should match the platform spec. The design template (see `docs/design/famtastic-studio/DESIGN-INGEST-REPORT.md`, Risk 1) ships with 9 items because Site Builder, Site Settings, and Media Library are nested under Sites and Media Studio. **The implementation must promote those three to top-level rail entries** while preserving the design's contextual sub-tabs as in-screen navigation.

Suggested rail icon mapping (from `src/icons.jsx`):

| # | Section | Icon |
|---|---|---|
| 1 | Home | `home` |
| 2 | Sites | `sites` |
| 3 | Site Builder | `edit` (or new `builder`) |
| 4 | Site Settings | `settings` (variant) — distinguish from platform Settings |
| 5 | Think-Tank | `brain` |
| 6 | Research Center | `research` |
| 7 | Component Studio | `components` |
| 8 | Media Studio | `media` |
| 9 | Media Library | `layers` |
| 10 | Shay Shay | `shay` |
| 11 | Mission Control | `mission` |
| 12 | Settings | `settings` |

Site Builder and Site Settings must visually telegraph *active site context* in the Topbar (via existing `crumb`); Site Settings and Settings must be visually distinguishable to avoid two "settings" buttons looking identical.

---

## Section-by-section functional map

For each section: **Purpose · Subpages · User jobs · Existing repo functionality · Missing functionality · Inputs · Outputs · Connected sections · Proof · Build-next**.

---

### 1. Home

**Purpose.** Single command center Fritz lands on. Surfaces "what should I do next?" — running builds, pending approvals, worth-your-attention research, recent sites, recent media — and routes one click into any deeper section.

**Subpages.** None (single screen). Layout has lanes for: Most-likely-next, Pending approval, Worth your attention, Recent sites, Recent media, Mission Control summary, "How the work flows" map link.

**User jobs.**
- See live state in <5s: builds running, blockers, today's spend.
- Resume the most likely next action without remembering where it is.
- Approve/reject pending media or component promotions inline.
- Promote a research opportunity to a site task.
- Jump to any section.

**Existing repo functionality.**
- `site-studio/public/workbench-foundation.html` — partial dashboard.
- `site-studio/public/index.html` — chat-first home (different model).
- `site-studio/lib/ops-api.js` — real-time job/run state.
- `site-studio/lib/cost-monitor.js` — today's spend.

**Missing functionality.**
- A composed Home that blends ops-api + intelligence-runs + memory-strip + research-briefs into one card grid.
- Recent-sites tile fed from `/api/intelligence/sites`.
- Recent-media tile fed from a real Media Library API (doesn't exist yet).
- "How the work flows" map (Phase 3 recipe-map artifact).

**Inputs.** Read-only across the board: jobs, runs, briefs, sites list, media tail, capture inbox.
**Outputs.** Routing actions only (no writes from Home).
**Connected sections.** All 11 others.
**Proof.** Smoke that with seeded fixture state, every Home card renders an honest summary number/string and no card silently shows "0" when state would say otherwise.
**Build next.** Wire the existing `ops-api`, `intelligence-routes`, and `memory.js` into a single `/home` endpoint. Then build `home.html` from the design's `home.jsx`.

---

### 2. Sites

**Purpose.** Top-level list of every Studio-managed site. Entry point for Build-new-site, Continue-existing, Preview, Inspect, Refine, and per-site Dashboard.

**Subpages (in-screen).**
- Sites list (grid + list view, filter by Live/Building/Design/Research).
- Site card → Dashboard (summary of pages, components, media, deploys, runs).
- Continue → Site Builder (with site context loaded).
- Settings shortcut → Site Settings (with site context loaded).
- Preview → in-Studio iframe of latest deploy.

**User jobs.**
- Build a new site (from description, from research finding, from imported existing).
- Continue an existing build where it left off.
- Preview the latest deploy.
- Inspect site internals (pages, components, slot fill, deploy log).
- Hand off to Site Builder, Mission Control, or Site Settings without losing site context.

**Existing repo functionality.**
- `GET /api/intelligence/sites` → `[{ tag, title, vertical, has_intelligence, run_count }]`.
- `sites/site-mbsh-reunion/intelligence/...` (per-site brain).
- `~/famtastic-sites/<repo>` for actual site code (e.g. `mbsh-reunion`).
- Studio's `SITE_TAG` + `SITE_DIR()` runtime resolution.

**Missing functionality.**
- A real Sites Dashboard UI (currently no page).
- "Import existing" wizard.
- Per-site previews wired to deploy URL or local dev preview port.
- Per-site deploy history pulled from Netlify/Vercel.

**Inputs.** Sites list; per-site brief, capability-truth, run summary, deploy state.
**Outputs.** Routing into Site Builder / Site Settings / Mission Control with `?tag=<site-tag>`.
**Connected sections.** Site Builder, Site Settings, Mission Control, Component Studio (which components are in this site), Media Library (which assets), Research (which briefs informed the build).
**Proof.** Sites list returns the same set as `fs.readdir(SITES_ROOT)` filtered by `isSafeTag`. Each card shows a freshness timestamp and a verifiable deploy chip.
**Build next.** Sites Dashboard UI + per-site dashboard endpoint.

---

### 3. Site Builder

**Purpose.** Where a site is built and refined through chat, plan/page/section/slot model, preview, and inspector.

**Subpages (in-screen tabs).** Structure · Pages · Versions · Verify.

**User jobs.**
- Drive site construction via chat with Shay/Studio.
- Approve a plan before any code is written.
- Build a single page or section on demand (e.g. "Build /shop").
- Inspect any element on the preview.
- Edit copy, refine visually, regenerate, save a version.
- Run Verify (lighthouse-style or capability-truth-style checks).

**Existing repo functionality.**
- `site-studio/public/index.html` — current chat-driven shell.
- `site-studio/server.js` chat + plan-mode flows.
- `site-studio/lib/studio-actions.js` — tool dispatch for build actions.
- `site-studio/lib/surgical-editor.js` — element-level edits.
- `site-studio/lib/famtastic-skeletons.js` — page/section/slot templates.
- `site-studio/lib/build-trace.js` — what each build did, evidence trail.

**Missing functionality.**
- Plan-card UI matching the design's "Approve plan" CTA.
- Versions tab with diff (we have build trace; we don't have a version chooser UI).
- Verify tab as a first-class panel (today it's ad-hoc).
- Inspector that round-trips selection → edit → re-render.

**Inputs.** Site tag, brief, capability-truth, current build state, plan, page tree, component slots, version history.
**Outputs.** Plan approvals, code/content writes via studio-actions, version commits.
**Connected sections.** Sites (parent context), Component Studio (when a slot needs a component), Media Studio + Library (when a slot needs an asset), Mission Control (every action becomes a run), Shay (steers the build).
**Proof.** Every Builder action produces a `runs/<run-id>/ledger.json` entry and a build-trace entry, viewable in Mission Control.
**Build next.** Promote `index.html` chat + preview into the Builder layout from the design template (preserve current behavior, change shell only).

---

### 4. Site Settings

**Purpose.** Two-scope settings UI: **platform defaults** (apply to all new sites) vs **this site** (overrides for the active site only). Show diff vs platform.

**Subpages (in-screen segmented control).** Platform defaults · This site.

**User jobs.**
- Set/override per-site model choice (builder, operator readback).
- Set/override deploy target (Netlify, Vercel, S3, Manual).
- Set/override media defaults (provider, default ratio).
- See exactly which fields override the platform default, side-by-side.
- Reset overrides to platform defaults.

**Existing repo functionality.**
- `site-studio/lib/model-config.json` — global model defaults.
- `site-studio/studio-config.json` — runtime config keys.
- `sites/<tag>/intelligence/intelligence-brief.json` — per-site brief.
- Per-site `.env` and `netlify.toml` in actual site repos.

**Missing functionality.**
- A per-site overrides file (e.g. `sites/<tag>/site-settings.json`) — does not exist yet.
- A diff renderer between platform and site.
- Apply/reset workflow.

**Inputs.** Platform defaults JSON; per-site overrides JSON.
**Outputs.** Writes to per-site overrides JSON.
**Connected sections.** Sites (context), Settings (parent for platform defaults), Site Builder (uses these defaults), Mission Control (cost limits, approvals).
**Proof.** Diff renderer shows zero changes when a setting matches platform; non-zero with a clear "this-site override" chip when it doesn't.
**Build next.** Define per-site overrides schema, build the diff renderer.

---

### 5. Think-Tank / Brainstorm

**Purpose.** Where ideas live before they're work. Capture is frictionless; clustering and promotion route ideas to the right destination (Research, Site, Component, Media task).

**Subpages (in-screen tabs).** Board · Stream · Mind-map.

**User jobs.**
- Capture an idea in <2s ("quick add").
- Link a source URL or screenshot to an idea.
- Cluster ideas; let Shay propose clusters.
- Promote a single idea to: Research brief, Site task, Component spec, Media generation prompt.

**Existing repo functionality.**
- `captures/inbox/*.capture.json` — capture system.
- `captures/review/*.proposal.json` — Shay-proposed promotions.
- `fam-hub idea` CLI.
- `memory/` directory of materialized ideas/notes.

**Missing functionality.**
- Web UI matching the design board (today only CLI + JSON files).
- Promote-to-X dialog wired to create the downstream artifact (research brief, site task, etc.).
- Cluster/Mind-map views.

**Inputs.** Manual capture (text, link, screenshot); Shay-proposed clusters.
**Outputs.** Capture JSON; promotions create entries in Research / Sites / Components / Media.
**Connected sections.** Research Center (most-common promotion target), Sites (site task), Component Studio (component spec), Media Studio (media prompt).
**Proof.** Every promotion creates a downstream artifact with a `from_capture: <capture-id>` link, and the capture stays in the inbox until promoted or archived.
**Build next.** Read-only Board view from `captures/inbox` + Promote-to-Research as the first promotion path.

---

### 6. Research Center

**Purpose.** Evidence-first research on competitors, patterns, opportunities, and gaps. Adjustable depth (Fast / Standard / Deep / Expert). Output: briefs that can be promoted to build tasks.

**Subpages (in-screen).** New brief · Recent briefs · Source library · Pattern library · Opportunity / gap analysis.

**User jobs.**
- Run a new brief at the right depth.
- See sources Shay used (and add/remove).
- Browse the pattern library.
- Promote a finding to a site/component/media task.
- Export a brief for sharing.

**Existing repo functionality.**
- `docs/research/famtastic-studio-execution/01-competitive-map.md`, `02-pattern-library.md`, `03-gap-and-opportunity-map.md`, `04-agent-skill-map.md` — seeded research artifacts.
- `site-studio/lib/research-router.js` and `research-registry.js` — dispatcher and registry.
- `site-studio/intelligence/` — phase-tagged research dossiers.
- Visual recipe / workflow maps live in `docs/process/FAMTASTIC-STUDIO-WORKFLOW-MAP.md` (text only today).

**Missing functionality.**
- Web UI for the Research Center.
- "Promote findings" CTA wired into Sites/Components/Media.
- Visual recipe/workflow map renderer (Phase 3 deliverable).

**Inputs.** Topic prompt, depth, source allowlist/denylist.
**Outputs.** A brief artifact (markdown + metadata), source-library entries, pattern-library entries, opportunity entries.
**Connected sections.** Think-Tank (origin), Sites (downstream build), Component Studio (component opportunity), Media Studio (visual reference research), Mission Control (long briefs become runs).
**Proof.** Every brief carries source URLs and capture timestamps; "promote findings" creates a downstream task with a `from_brief: <brief-id>` field.
**Build next.** Read-only briefs index + brief detail page; Promote → Site task as first action.

---

### 7. Component Studio

**Purpose.** Reusable component library (search-before-create), chat-driven new-component builder, props/slots/variants, test states, mutation history, surgical insertion into a site slot.

**Subpages (in-screen tabs).** Preview · Props/slots · Variants · Test states · History.

**User jobs.**
- Search the library before creating; default to reuse.
- Create a new component via chat (Harry/Shay).
- Define props, slots, variants, test states.
- Insert a component into a site slot (surgical).
- Promote a v0.x to a locked stable version.
- See mutation history per component.

**Existing repo functionality.**
- `components/library.json` — registry.
- `components/<name>/` — per-component source.
- `site-studio/lib/famtastic-skeletons.js` — page/section/slot templates.
- `site-studio/lib/surgical-editor.js` — slot replacement.
- Surgical replacement is real and tested.

**Missing functionality.**
- Component Studio UI — currently no Studio page.
- Prop/slot/variant editor.
- Component-level chat (the design's "Ask Harry…").
- "Insert into site / slot" picker.

**Inputs.** Component search query; new-component spec; slot target (site + page + slot id).
**Outputs.** New/edited component files; library registry update; insertion into a site's slot; mutation entry in history.
**Connected sections.** Sites + Site Builder (insertion target), Media Library (asset needs), Research (component opportunity).
**Proof.** Every insertion writes a build-trace entry citing component+version+slot, and the resulting page/section is verified to render (browser smoke).
**Build next.** Read-only component library view + insertion dialog. Editor and chat come later.

---

### 8. Media Studio

**Purpose.** Text-to-image / asset generation through chat. Provider/ratio/variation controls, Shay-assisted prompt enhancement, approve/reject/save-to-library flow.

**Subpages (in-screen).** Three-pane workspace: prompt pane · grid · inspector.

**User jobs.**
- Compose a prompt with Shay.
- Choose provider (Firefly, Imagen, Mid-J, Local) and ratio.
- Generate N variations.
- Approve, reject, or save to library per asset.
- Send approved assets to Media Library and assign to a component/site slot.

**Existing repo functionality.**
- `site-studio/lib/openai-image-adapter.js`, `lib/adapters/` — provider adapters.
- `site-studio/lib/media-telemetry.js` — usage/cost log.
- `site-studio/lib/cost-monitor.js` — spend cap enforcement.

**Missing functionality.**
- Media Studio UI — no current page.
- Variations grid with approve/reject inline.
- Send-to-library write path.
- Slot-assignment dialog ("which component slot needs this?").

**Inputs.** Prompt, provider, ratio, variations count, optional reference assets.
**Outputs.** Generated assets (binary + metadata), library entries (provenance/cost/approval), slot assignments.
**Connected sections.** Media Library (registry), Component Studio (assets fill slots), Sites (slot in a page), Shay (prompt assistance).
**Proof.** Every generation writes a media-telemetry entry; every approval writes a library entry citing prompt, provider, cost, approval state, and slot if assigned.
**Build next.** Wire the existing image-adapter to a `/api/media/generate` endpoint; build the three-pane Studio UI.

---

### 9. Media Library

**Purpose.** Searchable registry of every uploaded/generated asset with prompt, source, provider, cost, approval state, variants, placement (which site/page/slot), and compatibility (which components can take it).

**Subpages (in-screen).** Tile registry · Inspector (right pane).

**User jobs.**
- Search by prompt, slot, site, provider.
- See provenance for an asset.
- See and create variants of an asset.
- Find compatible components for an asset.
- Upload a new asset directly.
- See the "missing / deferred" set (slots with no asset yet).

**Existing repo functionality.**
- `site-studio/public/img/` — physical assets.
- `docs/process/FAMTASTIC-MEDIA-LIBRARY-ASSET-REGISTRY-SPEC.md` — schema spec.

**Missing functionality.**
- A real registry index (the spec exists, the data file does not).
- Library UI.
- Variants management and "compatible components" lookup.

**Inputs.** Asset upload; generated assets from Media Studio.
**Outputs.** Registry entries; placement updates when assets get assigned to slots.
**Connected sections.** Media Studio (origin), Component Studio (slot fitting), Sites (placement).
**Proof.** Library count = file count under `public/img/` + uploaded; every entry has a non-null `provenance.kind` (uploaded | generated) and `approval.status`.
**Build next.** Materialize the registry index from existing files; build the library tile UI.

---

### 10. Shay Shay

**Purpose.** Workspace for talking to Shay outside any other section. Chat, readback (Short / Operator / Deep / Next-action), explain-current-screen, route-this-thread-to-X.

**Subpages (in-screen).** Two-pane: chat · routing/knowledge panel.

**User jobs.**
- Ask Shay anything.
- Get a readback at the right depth.
- Have Shay explain the current screen and what's actionable.
- Route the active thread to the right section (e.g. "Take this to Research" → opens Research with context preloaded).
- See which knowledge sources Shay auto-loaded.

**Existing repo functionality.**
- `site-studio/lib/shay-shay-sessions.js` — session persistence.
- `site-studio/lib/brain-injector.js`, `brain-interface.js` — Shay's context plumbing.
- Mockups: `site-studio/public/_mockup-a-shay-on-media.html`, `_mockup-b-shays-workshop.html`.

**Missing functionality.**
- A real Shay screen wired to brain + sessions + readback modes.
- "Explain current screen" hook (needs every screen to publish a small `currentContext` for Shay to read).
- Route-to-X transitions.

**Inputs.** Chat text; current screen context; auto-loaded knowledge sources.
**Outputs.** Replies; routing actions; suggested next actions.
**Connected sections.** All others (Shay routes to them).
**Proof.** "Explain current screen" returns a non-empty summary that names the active section, active item (run/site/component/media), and at least one next-action chip.
**Build next.** Adapt one of the existing mockups to read from `shay-shay-sessions.js` and wire `currentContext` from the active screen.

---

### 11. Mission Control

**Purpose.** Operator workspace. Honest view of what's running. **One section among twelve** — not the whole Studio.

**Subpages (in-screen).** Intelligence brief · Capability truth · System status · Run ledger · Proof packet · Cost / approvals · Blockers · Learning candidates · Visual flow.

**User jobs.**
- See every active run with a one-line status.
- Drill into a run's proof packet.
- Approve a cost-gated step.
- Resolve or snooze a blocker.
- Promote a learning candidate to memory.
- See a visual flow of the active run.

**Existing repo functionality (most complete section in the repo).**
- `site-studio/public/operator.html` — live UI.
- `site-studio/server/intelligence-routes.js` — `GET /api/intelligence/{sites,brief,capability-truth,runs,runs/:runId}`.
- `site-studio/server/intelligence-actions.js` — POST routes for `/runs/start`, `/runs/:id/passes`, `/cost`, `/blockers`, `/non-blockers`, `/proof`, `/learning`, `/next-action`, `/finalize`.
- `site-studio/server/intelligence-writer.js` — atomic ledger writes; `$50` cost cap.
- `site-studio/lib/ops-api.js` — Ops API surface (jobs/runs/tasks/plans/proofs/gaps/memory/reviews/debt/needsMe).

**Missing functionality.**
- Visual flow renderer (text-only today).
- Cost approval gate UI (today returns 428 server-side; UI doesn't render the prompt yet).
- Promote-learning-candidate flow.

**Inputs.** Operator actions (start, append pass, record cost, blockers, non-blockers, finalize).
**Outputs.** Atomic writes to per-run ledger, proof packets, learning candidates, ops events.
**Connected sections.** Site Builder (every Builder action becomes a run here), Component Studio (component creation as a run), Media Studio (generation as a run), Research (long briefs as runs), Settings (cost cap, approval thresholds).
**Proof.** Every run has `ledger.json` + `proof-packet.json`; ledger status is one of `running | blocked | failed | complete`; cost-cap >= $25 returns 428 confirmation_required.
**Build next.** Land the design's `mission-control.jsx` shell on top of the existing `operator.html`. Add visual-flow renderer (Phase 3 recipe map). Wire cost-approval UI.

---

### 12. Settings

**Purpose.** Platform-wide settings: model/provider choices, cost approvals, media/component/site/deployment defaults, theme.

**Subpages (in-screen left nav).** Models & providers · Cost & approvals · Media defaults · Component defaults · Site defaults · Deployment · Theme & workspace.

**User jobs.**
- Set default builder/operator/research models.
- Set the platform spend cap and approval thresholds.
- Set default media provider, ratio, variation count.
- Set default component reuse policy.
- Set default deploy target.
- Switch theme (the design template is the theme).

**Existing repo functionality.**
- `site-studio/lib/model-config.json` — model defaults.
- `site-studio/studio-config.json` — runtime config.
- `site-studio/lib/cost-monitor.js` — cap.

**Missing functionality.**
- Settings UI.
- Theme switcher (single theme today; design adds tokens we'd swap to).
- Per-section default editors (media, component, site, deployment).

**Inputs.** Existing config files.
**Outputs.** Config writes (atomic, with audit log).
**Connected sections.** Site Settings (overrides), Media Studio (uses media defaults), Component Studio (uses reuse policy), Mission Control (cost cap), all others (model defaults).
**Proof.** Setting changes are persisted, observable in next session, and Mission Control reflects new caps immediately.
**Build next.** Read-only Settings view from existing config; theme apply (load design tokens). Editing comes after.

---

## Cross-cutting concerns

### Routing & state
- The new shell needs a real router (URL hash at minimum). Each section is a top-level route; sub-tabs are `?sub=`.
- Active site/run/asset context should travel via URL params so Topbar breadcrumb is honest.

### Proof discipline (every section)
- Every visible number, status, or list must have a proof source the user can drill into.
- The Capability-Truth chip pattern from the design's ContextPanel ("verified · 6 shipped" / "partial · 3/8 sites" / "not yet capable") should be applied per section to prevent re-drift into vapor.

### What is real now vs placeholder
| Section | Today's state |
|---|---|
| Home | placeholder (multiple ad-hoc shells) |
| Sites | placeholder (data exists, no UI) |
| Site Builder | **partial** (real chat shell + preview, missing plan-card/versions/verify UI) |
| Site Settings | placeholder (config exists, no UI, no per-site overrides file) |
| Think-Tank | placeholder (CLI + JSON only) |
| Research Center | placeholder (artifacts + dispatcher exist, no UI) |
| Component Studio | placeholder (registry + surgical edits exist, no UI) |
| Media Studio | placeholder (adapters + telemetry exist, no UI) |
| Media Library | placeholder (assets on disk, no registry index) |
| Shay Shay | placeholder (sessions + brain plumbing, mockups only) |
| Mission Control | **real** (operator.html + intelligence-routes/actions/writer fully wired) |
| Settings | placeholder (config exists, no UI) |

### Mission Control containment rule
**Mission Control is one tile in the rail and one route in the app.** It must not host content from other sections (a Sites tile, a Components tile, a Media tile). The drift correction in `STUDIO-DRIFT-CORRECTION-NOTES.md` codifies this.

---

## Open questions for Fritz (do not block this pass)

1. **Should MBSH appear in the Sites list?** I see two paths: (a) yes — list it pulled from `~/famtastic-sites/mbsh-reunion/` with a "live" chip; (b) no — Sites only shows Studio-internal sites, MBSH lives outside. The IA assumes (a) but you flagged "ignore Q3 for now." Logging here as decision-needed.
2. **Site Settings overrides file location.** Two options: `sites/<tag>/site-settings.json` or `sites/<tag>/intelligence/site-settings.json`. Recommend the former so it stays adjacent to what users edit.
3. **Theme switcher scope.** Do we keep the existing `operator.css` tokens alongside the new design's tokens, or rename existing operator tokens to the new family? Recommend the latter once Mission Control is folded into the new shell.

---

## Acceptance — Phase 2

- [x] All 12 nav sections documented.
- [x] Each section has Purpose / Subpages / User jobs / Existing functionality / Missing functionality / Inputs / Outputs / Connected sections / Proof / Build-next.
- [x] Sites section explicitly covers: build new, continue, preview, inspect, edit/refine, dashboard, local settings, platform defaults.
- [x] Site Builder section covers: prompt/chat-driven building, page/section/slot model, preview/inspect/refine.
- [x] Think-Tank covers: capture, board, promote.
- [x] Research Center covers: source library, competitor research, pattern library, opportunity/gap, briefs, visual recipes, depth (Fast/Standard/Deep/Expert).
- [x] Component Studio covers: library, builder, chat, preview/test, props/slots/variants, media needs, insertion, surgical replacement, history.
- [x] Media Studio covers: chat-driven generation, prompt enhancer, variations, Shay review, approve/reject/save, send to library, slot assignment.
- [x] Media Library covers: assets, prompt/source/provider/cost, approval, variants, placement, compatible components.
- [x] Shay covers: chat, readback, explain-current-screen, routing, next-action.
- [x] Mission Control covers: brief, capability truth, run ledger, proof packet, cost/approval, blockers, learning, visual flow — and is **explicitly bounded as one section**.
- [x] Settings covers: platform settings, model/provider, cost, media/component/site/deploy defaults, theme.
- [x] Drift correction stated: Mission Control ⊊ Studio.
