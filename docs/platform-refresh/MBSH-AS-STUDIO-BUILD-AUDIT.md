# MBSH as Studio Build Audit

**Parent:** `STUDIO-PLATFORM-REFRESH-V2.md`
**Purpose:** reverse-engineer the MBSH Premiere build (P0 → P13 + audit + Final Reel hotfix) and list **every Studio capability** that would have been needed to do it through FAMtastic Studio. Classify each as already exists / partial / documented only / manual today / missing / should become reusable component / should become QA gate / should become registry entry / should become Studio screen.

This is the canonical reverse-engineering. If the next build (shipping company test, MBSH V2 iteration, anything new) needs to know what Studio has to carry, this is the table.

---

## 1. The MBSH build, in one paragraph

A Class of '96 reunion site for Miami Beach Senior High, briefed as "black-tie cinematic premiere" with one mascot (Hi-Tide Harry) across seven pages (Home, RSVP, Tickets, Through-the-Years, Memorial, Time Capsule, Playlist). It shipped through fourteen guarded-autonomous passes (P0 architecture → P13 hotfix), an audit, a Final Reel footer hotfix, and a 12-item production smoke test. Live at `https://mbsh96reunion.com` as of 2026-05-08. The build introduced the section archetype system (Scene/Sequence/Tease), centered medallion menu, billboard slideshow note, page-aware Where-Next reel cards, Final Reel footer scene, FX overlay calibration, asset alpha pipeline, form readability standard, site-assistant FAQ + fallback collector, and a V2 learnings doc.

It is the strongest available proof of what Studio actually has to do.

---

## 2. The capability table

Status legend:
- 🟢 **exists** — handler + proof in repo today
- 🟡 **partial** — partially wired, not full path
- 📄 **doc only** — written down, not built
- ✋ **manual** — Fritz or an agent does it by hand each time
- ❌ **missing** — neither built nor documented as a Studio capability
- ♻️ **→ reusable component** — should be promoted to a reusable component
- 🔍 **→ QA gate** — should become an automated QA gate
- 📚 **→ registry entry** — should land in a registry (recipe, prompt, skill, agent, pattern)
- 🖥 **→ Studio screen** — should become a named screen/tool

Multiple labels can apply.

| # | Capability | Where it appeared in MBSH | Status today | Should become |
|---|---|---|---|---|
| **A. Intake / Strategy** | | | | |
| 1 | Brief intake (per-site brief structure) | V1 brief lived in scattered docs, premiere brief at `MBSH-PREMIERE-BUILD-LEDGER.md` | 🟡 partial · ✋ manual | 🖥 Project Intake screen · 📚 brief registry |
| 2 | Brief enhancer (vague → researched) | Premiere theme came from Fritz's verbal "black-tie cinematic" expanded by Claude over multiple turns | ✋ manual | 🖥 Brief Enhancer screen · 📚 enhancement skill |
| 3 | Research / strategy / positioning | None for V1; cinematic positioning was authored, not researched | ❌ missing | 🖥 Research screen · 📚 research skill registry |
| 4 | Recipe selection (build_type + capability_modules + polish_level) | Implicit "premiere/cinematic + character + interest-only commerce + iterative" | 📄 doc only (FRDB blueprint) | 🖥 Recipe Composer · 📚 recipe registry |
| 5 | Theme contract | `PREMIERE-DESIGN-MAP-2026-05-07.md` + V2/V3 plan | ✋ manual · 📄 doc only | 🖥 Theme Contract screen · 📚 theme registry |
| 6 | Page purpose map (per-page intent) | Hand-authored across the design map | ✋ manual | 🖥 Page Purpose Map screen |
| **B. Architecture** | | | | |
| 7 | Section archetype system (Scene / Sequence / Tease) | Invented in P11 of MBSH | 📄 doc only (`V2-LEARNINGS-AND-PATTERNS.md`) | ♻️ reusable component · 🔍 QA gate · 📚 pattern registry |
| 8 | Centered medallion + filmstrip drawer menu | P11 | 📄 doc only · ♻️ reusable component candidate | ♻️ component · 📚 pattern registry |
| 9 | Billboard slideshow note pattern | P10 | 📄 doc only | ♻️ component |
| 10 | Page-aware Where-Next reel cards | P9 | 📄 doc only | ♻️ component · 📚 pattern registry |
| 11 | Final Reel footer scene | P12 | 📄 doc only | ♻️ component · 🔍 QA gate ("footer is a scene, not a CMS grid") |
| 12 | Section auto-tagger (data-mode heuristic + override map) | P11 (`tagSectionModes`) | 📄 doc only | ♻️ component · 📚 skill |
| 13 | Snap policy (proximity, not mandatory) | P11 | 📄 doc only | 📚 pattern registry |
| **C. Visual / Asset Pipeline** | | | | |
| 14 | Media generation routing (image → provider) | `studio-capabilities.json` routing rules + `lib/capability-manifest.js` | 🟢 exists | (none — already real) |
| 15 | Hero still / branded story | Routed via `hero_still_branded_story` rule | 🟢 exists | (none) |
| 16 | Mascot pose generation (multi-pose, identity-locked) | Routed via `multi_pose_character_set` rule (OpenAI Responses) | 🟢 exists · ✋ manual reference-image step | 🔍 QA gate (alpha + identity proof) |
| 17 | Asset alpha / background cleanup (rembg) | MBSH P12 audit found 4 RGB-mode poses; rembg fixed them | ✋ manual (one-off `pip3 install rembg` script) | 🔍 QA gate · 🖥 Asset Board |
| 18 | Brand-mark / logo system (foil seal) | `assets/premiere/brand-mark-foil.png` hand-generated | ✋ manual · 📄 doc only | 🖥 Logo Lab · 📚 logo registry |
| 19 | Hero video (background loop, image-to-video → loop) | Used pre-existing dancefloor MP4; no i2v generation in build | ❌ missing for new video; 🟡 partial routing config | 🖥 Video Lab readiness · 📚 video pipeline |
| 20 | Atmospheric background loop (Leonardo image-to-video) | Configured in routing rules but not invoked in MBSH | 🟡 partial | 🖥 Video Lab · 🔍 cost gate |
| 21 | Adobe / Firefly polish handoff | `photoshop_finishing` capability marked DOCS-CONFIRMED-UNTESTED | 📄 doc only · ✋ manual | 🖥 Adobe Handoff panel · 🔍 capability proof gate |
| 22 | Asset compression / image optimization | Manual / per-asset | ✋ manual | 🔍 QA gate |
| **D. Character / Assistant** | | | | |
| 23 | Character placement rule (medallion=center, in-scene=left, chat=right) | P13 hotfix | 📄 doc only | 🔍 QA gate · 📚 pattern registry |
| 24 | Per-page Harry pose map (HARRY_SCENE_MAP) | P9 | 📄 doc only · ♻️ reusable | ♻️ component · 📚 site-assistant config schema |
| 25 | In-scene character injection (Scene-only routing) | P11 | 📄 doc only | ♻️ component |
| 26 | Chat assistant bubble (FAQ matcher + fallback collector) | `chatbot.js` with 8 FAQ patterns + email fallback | 🟢 exists (per-site) | ♻️ Site Assistant Component · 📚 pattern registry |
| 27 | Site-assistant FAQ refinement loop (unanswered → improve) | None | ❌ missing | 📚 skill · 🔍 capture/promote pipeline |
| 28 | Reduced-motion / a11y respect across motion features | P0 baseline + per-pass | 🟢 exists per-site | 🔍 QA gate |
| **E. Forms / Content** | | | | |
| 29 | Form readability standard (16px input, cream-on-glass, italic placeholder) | P11 + P13 | 📄 doc only | 🔍 QA gate · 📚 pattern registry |
| 30 | iOS auto-zoom guard (input ≥ 16px) | P11 | 📄 doc only | 🔍 QA gate |
| 31 | Honeypot + form_loaded_at anti-bot helper | Existed pre-Premiere | 🟢 exists | (none — already shared) |
| 32 | Site config (date, venue, prices, status, API base) | `frontend/config/site-config.json` | 🟢 exists per-site · ✋ manual edit | 🖥 Settings (per-site) |
| 33 | Form-on-dark-scene theming (cream / glassy panel) | P13 generalized site-wide | 📄 doc only | 🔍 QA gate |
| **F. Build / QA / Audit** | | | | |
| 34 | Guarded-autonomous build pass (Pn with stop conditions) | 13 passes | 📄 doc only (`MBSH-PREMIERE-BUILD-LEDGER.md`) | 📚 build-pass schema · 🖥 Build Mode |
| 35 | Coverage matrix (per-pass capability coverage) | `COVERAGE-MATRIX.md` | 📄 doc only | ♻️ pattern · 🖥 Build Ledger panel |
| 36 | Decision log (R1 → R25 with default + accepted + rationale) | `DECISION-LOG.md` | 📄 doc only | ♻️ pattern · 📚 decision-log schema |
| 37 | Failure log (gaps, fallbacks, asset issues) | `FAILURE-LOG.md` + `DEFERRED-ASSETS.md` | 📄 doc only | ♻️ pattern |
| 38 | Pass closeout (intent → outcome → proof → deferred → next) | `closeouts/PASS-N-CLOSEOUT.md` | 📄 doc only | ♻️ pattern · 🖥 Build Ledger |
| 39 | Run state (resume contract) | `RUN-STATE.md` | 📄 doc only | ♻️ pattern · 📚 run schema |
| 40 | Pre-prod audit (7-lens expert review simulated) | `AUDIT-2026-05-07.md` | ✋ manual · 📄 doc only | 📚 agent registry (Creative Director / UX Specialist / Visual QA / etc.) · 🔍 QA gate suite |
| 41 | Mobile viewport QA (375 × 812 walk every page) | Manual via headless preview | ✋ manual | 🔍 QA gate · 📚 Browser QA MCP |
| 42 | Performance QA (Lighthouse mobile a11y/perf) | P6 closeout | ✋ manual | 🔍 QA gate |
| 43 | Console-error guard | P12 + P13 verifications | ✋ manual | 🔍 QA gate · 📚 Browser QA MCP |
| 44 | Broken-image / link guard | Audit pass | ✋ manual | 🔍 QA gate |
| 45 | Empty-stub / dead-link guard | Audit pass | ✋ manual | 🔍 QA gate |
| **G. Deploy / Promote** | | | | |
| 46 | Staging branch + Netlify staging project | `feat/premiere-theme` → `staging` → `mbsh-reunion-staging` | 🟢 exists | 📚 site-promotion ladder schema |
| 47 | Production main + Netlify production project (custom domain) | `main` → `loquacious-valkyrie-37d5f8` → `mbsh96reunion.com` | 🟢 exists per-site | 📚 site-promotion schema |
| 48 | Promote (staging → main) with no-ff merge + commit message contract | Manual `git merge --no-ff` | ✋ manual | 🖥 Deploy Center · 🔍 deploy-readiness gate |
| 49 | Production smoke test (12-item checklist) | Run by hand at launch | ✋ manual · 📄 doc only | 🔍 QA gate · 📚 smoke-test registry |
| 50 | Rollback proof (commit pinned + recipe documented) | Documented in launch report | ✋ manual · 📄 doc only | 🔍 deploy-readiness gate |
| 51 | Build credit / Netlify minute monitoring | Hit "skipped due to credit" silently; user upgraded plan mid-run | ❌ missing | 🔍 cost-gate · 🖥 Ops |
| 52 | Per-deploy fingerprint verification (curl markers) | Run by hand | ✋ manual | 🔍 QA gate |
| **H. Cost / API Governance** | | | | |
| 53 | Per-provider auth status (OpenAI, Anthropic, Gemini, Leonardo, ElevenLabs, Adobe, Pinecone, Netlify) | `capability-manifest.js` probes | 🟡 partial | 🖥 Capability Manifest screen · 🔍 cost-gate |
| 54 | Cost estimate before generation | None | ❌ missing | 🔍 cost-gate · 🖥 Ops |
| 55 | Usage meter / running cost | None | ❌ missing | 🖥 Ops · 📚 cost-telemetry schema |
| 56 | Provider health (rate-limit / quota / outage) | None | ❌ missing | 🖥 Ops |
| 57 | Per-run cost report | None | ❌ missing | 🖥 Build Ledger panel · 🖥 Ops |
| 58 | Monthly cost summary | None | ❌ missing | 🖥 Ops |
| 59 | Cheap lane / premium lane selection | None | ❌ missing | 🖥 Recipe Composer · 📚 routing rule |
| 60 | Approval gate before costly media/video/API | Hard-stop in registry config exists; no UI | 🟡 partial · ✋ manual | 🖥 Approval Center · 🔍 cost-gate |
| **I. Intelligence / Learning** | | | | |
| 61 | Learning capture (post-pass) | `closeouts/PASS-N` files | 📄 doc only | ♻️ pattern · 🔍 capture pipeline |
| 62 | V2 backlog | `V2-LEARNINGS-AND-PATTERNS.md` § 9 (10 items) | 📄 doc only | 📚 backlog registry · 🖥 Learning Board |
| 63 | Learning extraction (post-launch) | Hand-written V2 doc | ✋ manual | 📚 skill (Learning Extractor) · 🖥 Learning Board |
| 64 | Learning retrieval (before next plan) | None | ❌ missing | 🔍 capture-retrieve-apply pipeline |
| 65 | Learning application (during build) | None | ❌ missing | 🔍 capture-retrieve-apply pipeline |
| 66 | Learning verification (did the learning improve the result?) | None | ❌ missing | 🔍 verification gate |
| 67 | Pattern promotion (one-off → registry entry) | None | ❌ missing | 📚 promotion schema |
| **J. Coordination / Substrate** | | | | |
| 68 | Plan / Task / Run / Proof ledgers | `plans/registry.json` + `tasks/tasks.jsonl` + run records | 🟢 exists | (none — already real) |
| 69 | Capture intake (`fam-hub capture extract`) | Live | 🟢 exists | (none) |
| 70 | Memory / decisions store | `memory/<type>/` + `decisions.jsonl` | 🟢 exists | (none — but retrieval is missing, see #64) |
| 71 | Agent coordination (scope locks, pre-flight check-in) | `AGENT-COORDINATION.md` + `scripts/agent-checkin.js` | 🟢 exists | (none) |
| 72 | Workflow stage catalog | Workflow-as-data phase 1 | 🟡 partial | 📚 stage registry |
| 73 | Build Trace | `/api/trace`, phase-1 visualizer | 🟡 partial | 🖥 Build Inspector · `build-intent-fulfillment-trace` |
| 74 | Build Ledger (per-site narrative) | `docs/sites/<site>/...` (MBSH was the proof) | 📄 doc only · ✋ manual | 🖥 Sites domain panel · 📚 ledger schema |

---

## 3. Tally

- 🟢 **exists**: 9 capabilities (intake-adjacent + ledger substrate + media routing config + form helpers + per-site site-config + git/Netlify wiring + agent coordination + capture intake + memory store)
- 🟡 **partial**: 9 capabilities (theme contract is partial in docs · video routing partial · capability manifest partial · workflow stage catalog · build trace · provider auth · cost approval gate)
- 📄 **doc only**: 25 capabilities (the entire pattern stack — section archetypes, billboard, Where-Next, Final Reel footer, character placement, form readability, build-pass schema, decision/coverage/closeout/run-state patterns, V2 backlog, learning extraction)
- ✋ **manual**: 21 capabilities (intake, brief enhancement, theme contract, asset alpha cleanup, audit, mobile viewport QA, performance QA, console error guard, broken-image guard, deploy promote, smoke test, rollback proof, deploy fingerprint verify, learning extraction)
- ❌ **missing**: 14 capabilities (research/strategy, hero video generation invoked, FAQ refinement loop, build credit monitoring, cost estimate, usage meter, provider health, per-run cost, monthly cost, cheap/premium lane, learning retrieve/apply/verify, pattern promotion)

**The shape**: Studio's *substrate* is largely there (ledgers, capture, memory, agent coordination, capability seed). What is mostly *missing* or *manual* is the **production conversion layer** — the screens, gates, registries, and skills that would turn a hand-built MBSH-style run into a Studio-driven run.

---

## 4. Top promotion targets (what Platform Refresh v2 should attack first)

Ranked by leverage (how many future builds benefit) × proximity (how close it already is):

1. **Capability Truth Layer extension** (#53–60) — every other surface depends on it. Already seeded.
2. **Section archetype system** (#7) → component + QA gate. Stops every future cinematic site from re-discovering it.
3. **Final Reel footer** (#11) → component + QA gate. Stops the default-grid footer regression.
4. **Asset alpha pipeline** (#17) → QA gate. Caught two RGB-mode regressions on MBSH; will catch more.
5. **Form readability standard** (#29 + #33) → QA gate. The black-on-near-black form bug ate a half-day of audit.
6. **FX overlay opacity guard** (drift from 0.08 to 0.55) → QA gate (assert opacity ≤ 0.15).
7. **Pre-prod audit suite** (#40) → agent registry (Creative Director, UX Specialist, Visual QA Critic, Character Director, Asset Director, Accessibility Agent, Performance Agent).
8. **Build Ledger scaffold** (#34, #38, #39, #74) → Studio screen + per-site directory template.
9. **Smoke test registry** (#49) → registry + 🔍 gate. Today MBSH had a 12-item curl checklist; that should be reusable.
10. **Cost estimate before generation** (#54) → first-class governance.

---

## 5. Where MBSH proves the model already works

Even with most of the production-conversion layer manual, MBSH still shipped because:

- The **substrate exists** (ledgers, capture, memory, agent coordination).
- **Patterns get written down** (V2 doc, closeouts, decision log).
- **Hard-stop conditions** in `registry.json` actually held the line on production deploy and parallel-write conflicts.
- **The Capability Manifest** caught a real Gemini key expiration mid-run and forced a key rotation.
- **Agent coordination** (scope locks) prevented the kind of parallel-implementation collision that hit `.brain/` vs `memory/` on 2026-05-05.

The MBSH build is not proof that Studio is finished. It is proof that the *foundations are right* and the next move is to convert the manual production layer into screens, gates, registries, and skills — the Platform Refresh v2 thesis.
