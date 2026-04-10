# FAMtastic Site Studio — Complete Build Prompt
## Phase 0: Codex Remediation → Phase 1: UX Audit → Phase 2: Integration → Phase 3: Session 5 → Phase 4: Session 6 → Phase 5: Final Report

---

## MANDATORY ORIENTATION — READ BEFORE ANYTHING ELSE

Complete this checklist before writing a single line of code or opening a browser:

1. Read `FAMTASTIC-STATE.md` — canonical source of truth
2. Read `CHANGELOG.md` — most recent changes
3. Read `.wolf/cerebrum.md` — architectural decisions and do-not-repeat rules
4. Read `.wolf/anatomy.md` — file inventory
5. Read `.wolf/buglog.json` — bug history and root causes
6. Run `CLAUDE.md` integrity check — verify not zero bytes, not overwritten. Stop if overwritten.

**Commit policy:** All commits read as human-written. No AI, Claude, automation, or tool names in commit messages.

**Scope rule:** Complete each phase fully before starting the next. Stop gates are mandatory. Do not combine phases. Do not run ahead.

---

## WHAT YOU ARE BUILDING AND WHY — FULL CONTEXT

You are working on **FAMtastic Site Studio** — a chat-driven website builder running on Node.js/Express at `http://localhost:3334`. This is not a generic web app. Understanding what it's supposed to be is essential before auditing or building anything.

### The FAMtastic Definition
FAMtastic (adj.): Fearless deviation from established norms with a bold and unapologetic commitment to stand apart on purpose, applying mastery of craft to the point that the results are the proof, and manifesting the extraordinary from the ordinary.

Everything in this system exists to produce proof of that definition. Sites built here are not templates. They are distinct, bold, income-generating properties.

### What the System Does
FAMtastic Site Studio is a factory for building websites at scale — the goal is 1,000 income-generating sites. The developer types a brief in chat, the system builds a complete multi-page website, deploys it to Netlify, and learns from every build to make the next one better.

**Three work modes:**
- **Create** — write a brief, approve a plan, build a site
- **Ship** — deploy to Netlify, verify live, track status
- **Grow** — edit content, update components, improve over time

### The User
Fritz is the sole developer and only user. He values speed, reliability, and full visibility into what the system is doing. He does not need hand-holding. He needs a system that gets out of his way and tells him clearly when something goes wrong.

### What Has Been Built (Sessions 1–4, 189/189 tests passing)
- Build lock with cancel mechanism and disk persistence
- Intent classifier routing briefs vs commands
- Component library with read/write parity
- SEO pipeline baked into every build
- Background removal via `scripts/rembg-worker.py` and `POST /api/remove-background`
- `lib/fam-motion.js` — 6 IntersectionObserver animations (DO NOT MODIFY)
- `lib/fam-shapes.css` — starburst, wave, diagonal, blob (DO NOT MODIFY)
- `lib/character-branding.js` — character placement pipeline (DO NOT MODIFY)
- 5 endpoints: CDN inject/remove/list, fam-asset inject, character branding CRUD

### Sites Built So Far
- Site #2: Guy's Classy Shoes
- Site #3: Readings by Maria
- Site #4: Street Family Reunion
- Site #5: Auntie Gale's Garage Sales (14 phases, mascot, video, carousel, live)

### Confirmed Connected Tool Stack
| Tool | Status | Purpose |
|---|---|---|
| Playwright MCP | ✅ Connected | All testing |
| GitHub MCP | ✅ Connected | Version control |
| Magic MCP (@21st-dev/magic) | ✅ Connected | UI component generation via `/ui` |
| ps-mcp (Photoshop + Firefly) | ✅ Working | Image gen via Firefly, post-processing |
| pr-mcp (Premiere Pro) | ✅ Working | Video editing |
| Google Imagen 4.0 | ✅ Active | Character/scene generation |
| Google Veo 2.0 | ✅ Active | Video generation |
| Leonardo.ai | ✅ Active | Style-locked generation, Motion v3 |
| PixelPanda API | ✅ Evaluation | BG removal fallback, product photography |
| Pixelixe MCP | ✅ Evaluation | Brand kits, OG images |
| rembg (local Python) | ✅ Live | Primary BG removal — already implemented |
| Netlify | ✅ Active | Deployment |

**Photoshop/Firefly:** The ps-mcp bridge gives direct Firefly access through Photoshop — Generative Fill, text-to-image, Generative Expand — all via ps-mcp using CC credits. No separate Firefly API needed.

**Imagen deprecation:** Before any Imagen API call, verify the model string is not on the deprecated list. Migration deadline June 24, 2026. If the current string matches any `imagegeneration@00x` or `imagen-3.0-*` pattern, migrate to `gemini-2.5-flash-image` and flag it in the phase report.

---

## REPORTING REQUIREMENT — MANDATORY FOR EVERY PHASE

At the end of each phase, before committing, produce a phase report at `docs/phase-[N]-report.md`:

```
# Phase [N] Report — [Date]

## What Was Fixed / Built / Audited
  [Summary of what this phase accomplished]

## Test Results
  Total: X/Y passed
  Failed tests: [list each with root cause]

## What Worked First Try
  [Features that implemented and tested cleanly]

## What Required Rework
  [Each item: what failed, root cause, what changed to fix it]

## Deviations from This Prompt
  [Any place implementation differed from spec, and why]

## Suggestions from Claude Code
  [Any improvements or alternatives identified]
  [Flag each: accepted / deferred / rejected — with reason]

## New Gaps Discovered
  [Description, severity, suggested fix]

## Cost Tracking
  [Any API calls: provider, operation, cost, result]
```

Phase report is required. Do not close a phase without it.

---

## PHASE 0 — CODEX REMEDIATION
**Fix critical architectural issues identified in Codex adversarial review before building anything new.**

A Codex adversarial review flagged these issues as blocking shipment. They must be resolved before the UX audit, before Sessions 5 and 6, before anything. Building new features on top of these broken foundations makes everything worse.

**Phase 0 produces zero new features. It only fixes what is broken.**

---

### Fix 0A — [HIGH] Build Cancellation Must Actually Stop the Build

**The problem (server.js:4308-4323):**
`POST /api/build/cancel` drops `buildInProgress` and broadcasts `build_cancelled`, but never kills the active Claude/build subprocesses. The actual work continues after cancellation. A user can press cancel, start a new build, and end up with two builds writing to the same site simultaneously. The cancel button implies rollback safety the backend does not provide. This is worse than no cancel button.

**What to fix:**

1. **Introduce a run ID system.** Every build gets a unique `runId` (UUID) at the moment it starts. The run ID is stored in `.studio.json` alongside `buildInProgress`. Every subprocess spawned during that build is tagged with the run ID.

2. **Track all child processes per run.** Maintain a `Map<runId, Set<ChildProcess>>` in memory. Every `spawn()` or `exec()` call during a build registers its process in this map.

3. **Cancel terminates all processes for that run.** `POST /api/build/cancel` receives the `runId`, looks up all child processes registered to it, calls `process.kill('SIGTERM')` on each, waits for confirmation, then clears the lock. If any process doesn't terminate within 5 seconds, escalate to `SIGKILL`.

4. **Lock is not released until terminal state confirmed.** The build lock must not clear until either: (a) all child processes exit, or (b) SIGKILL escalation completes. No premature lock release.

5. **New builds are rejected until cancellation is confirmed terminal.** If a cancel is in progress, a new build attempt returns: `"Cancellation in progress — wait for confirmation before starting a new build."` Not a silent rejection — a clear message with an estimated wait.

6. **Emit `build_cancelled_confirmed` WebSocket event** only after all processes are verified terminated, not immediately on cancel request.

**Acceptance criteria:**
- Start a build, click cancel, immediately attempt a new build → second build is rejected with clear message
- Start a build, click cancel → all spawned subprocesses terminate within 10 seconds
- `build_cancelled_confirmed` WebSocket event only fires after process termination is verified
- `.studio.json` shows `buildInProgress: false` and `activeRunId: null` after confirmed cancellation

---

### Fix 0B — [HIGH] WebSocket Disconnect Must Not Release the Global Build Lock

**The problem (server.js:8098-8114):**
On WebSocket close, the server unconditionally calls `setBuildInProgress(false)` whenever any build is active. One browser tab refreshing or losing network connection can unlock the site for everyone while a build is still running. This is a concrete race condition in normal everyday use.

**What to fix:**

1. **Lock ownership is tied to run ID, not WebSocket connection.** The lock belongs to a run, not a session. Disconnecting a WebSocket does not own the lock and cannot release it.

2. **On WebSocket disconnect:** do NOT call `setBuildInProgress(false)`. Instead: if a build is in progress for this run, log the disconnect, mark the run as `connectionLost`, and continue the build. The build completes or times out on its own terms.

3. **On WebSocket reconnect:** if a build is in progress, immediately emit the current build state to the reconnecting client so they see where things are without needing to refresh.

4. **Only the run's own terminal state releases the lock:** completion, explicit cancellation (Fix 0A), or timeout (existing 10-minute auto-clear).

**Acceptance criteria:**
- Build in progress → disconnect WebSocket (simulate tab close) → build continues uninterrupted
- `.studio.json` still shows `buildInProgress: true` after disconnect
- Reconnecting client immediately receives current build status
- Lock only clears when build actually finishes or is cancelled via Fix 0A

---

### Fix 0C — [HIGH] Build Lock Must Be a Real Job Record, Not a Global Boolean

**The problem (server.js:194-220):**
The lock is a process-global boolean with a fixed 10-minute auto-clear. Any valid build longer than 10 minutes silently loses exclusivity while still executing. There is no durable notion of who owns a build or whether work is still running. This does not scale beyond a single short build.

**What to fix:**

1. **Replace the boolean with a build record.** `.studio.json` stores:
```json
{
  "activeBuild": {
    "runId": "uuid",
    "siteId": "site-name",
    "startedAt": "ISO timestamp",
    "lastHeartbeat": "ISO timestamp",
    "status": "running" | "cancelling" | "completed" | "failed" | "timed_out",
    "phase": "planning" | "building" | "deploying",
    "pagesCompleted": 0,
    "pagesTotal": 5
  }
}
```

2. **Heartbeat system.** Every 30 seconds during a build, update `lastHeartbeat` in `.studio.json`. If `lastHeartbeat` is more than 2 minutes stale and status is still `running`, the build is considered zombie and the lock auto-clears with log entry: `"BUILD_ZOMBIE — no heartbeat for 2min, lock cleared"`. The 2-minute zombie threshold replaces the 10-minute blanket timeout.

3. **Build progress is visible.** The Studio UI reads `pagesCompleted` and `pagesTotal` from the build record and shows a progress indicator: `"Building page 3 of 5..."`. This is the progress indicator that was missing and that the UX audit will flag.

4. **Build history.** After each build completes (success or failure), move the build record to a `buildHistory` array in `.studio.json` (keep last 20). This gives Fritz a log of what ran, when, and what happened.

5. **On server startup:** if `activeBuild.status` is `running` and `lastHeartbeat` is stale, auto-clear and log: `"BUILD_STALE — server restarted with stale build record, cleared"`.

**Acceptance criteria:**
- Start a 3-page build → Studio shows "Building page X of 3" in real time
- Kill server mid-build → restart → stale build record cleared on startup with log entry
- Build runs for 3 minutes without issue → heartbeat updated every 30 seconds → no auto-clear
- `buildHistory` contains last build record after completion
- `GET /api/build/status` returns current build record as JSON

---

### Fix 0D — [MEDIUM] Classifier Must Not Default Ambiguous Input to a Mutating Path

**The problem (server.js:5000-5018):**
`classifyRequest()` is an ordered regex ladder with a default return of `layout_update`. An unmatched or misphrased request routes into a mutating path rather than asking for clarification. As the command space grows with Sessions 5 and 6 adding image generation and scroll animation commands, this ladder becomes an increasingly dangerous single point of failure.

**What to fix:**

1. **Change the default intent to `clarify`.** If no classifier matches with sufficient confidence, return `intent: "clarify"` instead of `layout_update`.

2. **`clarify` intent is non-destructive.** Studio responds: `"I'm not sure what you'd like to do. Did you mean to [top 2 likely intents]? Or describe what you want and I'll help."` Nothing is mutated.

3. **Add confidence threshold.** Each classifier match has a confidence score (already added in Session 1). If the top match is below 0.6 confidence, route to `clarify` even if a match was found.

4. **Explicit confirmation for destructive actions.** For `build`, `rebuild`, `layout_update`, and `restructure` intents — if the command is ambiguous (confidence 0.6–0.8), ask for confirmation before executing: `"This will rebuild the site. Confirm?"` Only execute on explicit confirmation (yes/confirm/do it).

5. **Update regression test file** at `tests/classifier-regression.json` — add 10 new cases covering ambiguous input, low-confidence matches, and the new `clarify` default.

**Acceptance criteria:**
- Gibberish input → routes to `clarify`, no mutation
- Slightly misphrased build command (confidence 0.65) → asks for confirmation before building
- All 30 regression test cases pass (20 existing + 10 new)
- `clarify` intent response is conversational and helpful, not robotic

---

### Fix 0E — [MEDIUM] FAM Asset Injection Must Not Create Version Skew

**The problem (server.js:1518-1550):**
`/api/inject-fam-asset` copies `fam-motion.js` and `fam-shapes.css` directly into each site's `dist` folder, then skips reinjection once the tag exists. Each deployed site becomes its own forked copy of the library. Any future bugfix requires visiting every site artifact individually. Session 6 adds `fam-scroll.js` — if it follows the same pattern, the problem doubles.

**What to fix:**

1. **Versioned asset manifest.** Create `site-studio/public/fam-assets/manifest.json`:
```json
{
  "version": "1.0.0",
  "assets": {
    "fam-motion.js": { "path": "/fam-assets/fam-motion.js", "hash": "sha256:..." },
    "fam-shapes.css": { "path": "/fam-assets/fam-shapes.css", "hash": "sha256:..." },
    "fam-scroll.js": { "path": "/fam-assets/fam-scroll.js", "hash": "sha256:..." }
  }
}
```

2. **Sites reference the Studio-served assets, not local copies.** Instead of copying files into each site's `dist`, inject a CDN-style reference to the Studio server or a stable hosted URL. For local development: `<script src="http://localhost:3334/fam-assets/fam-motion.js">`. For production: copy to a single shared location or serve from Studio.

3. **If local copy is required for deployment isolation:** copy on build, but track the version that was copied in the site's `spec.json` under `fam_assets_version`. When assets are updated, `GET /api/fam-assets/check-updates` returns which deployed sites are on old versions.

4. **`fam-scroll.js` (Session 6) must follow this pattern from day one.** Do not inject it as a local copy using the old approach.

5. **Migration:** For existing sites (Auntie Gale etc.), record their current asset version in `spec.json` without modifying their deployed files.

**Acceptance criteria:**
- New site build → `spec.json` records `fam_assets_version: "1.0.0"`
- `GET /api/fam-assets/check-updates` → returns list of sites with stale asset versions
- `fam-scroll.js` injection in Session 6 uses versioned manifest approach, not file copy
- Existing site specs updated with version record, deployed files untouched

---

### Phase 0 Playwright Tests

```
TEST GROUP: Build Cancellation (Fix 0A)
  test_cancel_terminates_subprocesses
    - Start a build
    - Click cancel
    - Assert all child processes terminate within 10 seconds
    - Assert build_cancelled_confirmed WS event fires AFTER process termination
    - Assert .studio.json: buildInProgress false, activeRunId null

  test_new_build_rejected_during_cancellation
    - Start a build
    - Click cancel (do not wait for confirmation)
    - Immediately attempt new build via chat
    - Assert rejected with clear message about cancellation in progress
    - Assert first build's processes still terminating

  test_cancel_confirmed_before_lock_released
    - Start build, cancel
    - Assert lock not released until all processes terminated
    - Assert UI shows cancelling state between cancel click and confirmation

TEST GROUP: WebSocket Disconnect (Fix 0B)
  test_disconnect_does_not_release_lock
    - Start a build
    - Simulate WebSocket disconnect (close browser tab via Playwright)
    - Assert .studio.json still shows buildInProgress: true
    - Assert build continues (check build output files are still being written)

  test_reconnect_receives_build_state
    - Start a build
    - Disconnect WebSocket
    - Reconnect
    - Assert client immediately receives current build status
    - Assert no manual refresh required

TEST GROUP: Build Record System (Fix 0C)
  test_build_record_written_to_studio_json
    - Start a build
    - Read .studio.json
    - Assert activeBuild object present with: runId, siteId, startedAt, status, phase

  test_build_progress_shown_in_ui
    - Start a 3-page build
    - Assert Studio UI shows "Building page X of 3" updating in real time
    - Screenshot at page 1, 2, 3

  test_heartbeat_updates
    - Start a build
    - Wait 35 seconds
    - Read .studio.json
    - Assert lastHeartbeat updated within last 35 seconds

  test_zombie_detection_clears_stale_build
    - Manually write stale activeBuild record (lastHeartbeat 3 minutes ago, status running)
    - Restart server
    - Assert stale record cleared on startup with log entry

  test_build_history_recorded
    - Complete a build
    - Read .studio.json
    - Assert buildHistory array contains the completed build record
    - Assert status is "completed"

  test_build_status_endpoint
    - GET /api/build/status
    - Assert returns current build record as JSON
    - Assert correct schema

TEST GROUP: Classifier Safety (Fix 0D)
  test_gibberish_routes_to_clarify
    - Submit: "xkjdhfkjshdf banana purple"
    - Assert intent classified as "clarify"
    - Assert no mutation to any file
    - Assert helpful response asking what was meant

  test_low_confidence_asks_for_confirmation
    - Submit mildly ambiguous command (confidence should score 0.65)
    - Assert system asks for confirmation before executing
    - Assert no action taken until confirmation received
    - Confirm → assert action executes

  test_all_30_regression_cases
    - Load tests/classifier-regression.json
    - Run all 30 cases (20 existing + 10 new)
    - Assert 100% pass rate

TEST GROUP: Asset Versioning (Fix 0E)
  test_new_build_records_asset_version
    - Build a new site
    - Read spec.json
    - Assert fam_assets_version field present and matches manifest.json version

  test_check_updates_endpoint
    - GET /api/fam-assets/check-updates
    - Assert returns list of sites and their asset versions
    - Assert identifies any sites on stale versions

  test_existing_sites_have_version_recorded
    - Read spec.json for Auntie Gale
    - Assert fam_assets_version present
    - Assert deployed files untouched
```

**STOP AFTER PHASE 0 TESTS ALL PASS. Commit. Do not proceed to Phase 1 until all Phase 0 tests are green.**

---

## PHASE 1 — UX AUDIT
**Observe and report only. Do not fix anything discovered here. Do not modify any code, configs, or files except `docs/phase-1-audit-report.md` and `screenshots/audit/`.**

Bugs found during observation go in the report. Do not fix them. The report is the deliverable.

### Setup
1. Start Studio server at `http://localhost:3334`
2. Verify it loads without errors
3. Create `screenshots/audit/` directory
4. Open `docs/phase-1-audit-report.md` for writing

### What to Evaluate

**1. First Impression (60 seconds)**
Load Studio fresh. Screenshot the initial state.
- Is it immediately clear what this tool does?
- Where does a user start?
- What is the dominant visual element — is it the right one?
- Does anything look broken, incomplete, or confusing on first load?

**2. User Flow — Create Mode**
Use this exact test brief:
> "Build a 3-page website for a fictional vintage record shop called Vinyl Vault. Bold colors, music-themed. Pages: Home, Shop, Contact."

Screenshot every step. Map: brief → classifier → plan → approval → build → output. Note every moment of confusion, unexpected behavior, missing feedback, or unclear state.

**3. User Flow — Edit Mode**
With an existing site loaded, attempt:
- 5 different edit commands via chat
- Insert a component from the library
- Change a page's color scheme
- Add a CDN library
- Place a character in a specific section

Screenshot each attempt and result. Did it work? Was the result visible? Was feedback clear?

**4. User Flow — Ship Mode**
- Attempt to deploy
- Check deploy status visibility
- Check Netlify URL accessibility after deploy
- Screenshot the full deploy flow

**5. Navigation and Information Architecture**
- How many tabs/panels exist?
- Is the tab structure logical for Create/Ship/Grow?
- Anything important that's hard to find?
- Any dead ends — places you can't get back from?

**6. Chat Interface**
- Is input always visible and accessible?
- Is system feedback clear and timely?
- Do error messages explain what went wrong and what to do?
- Is there any state where chat becomes unresponsive without explanation?
- Can you tell what mode you're in?
- Is any output technically correct but confusing to read?

**7. Build Status and Feedback**
- Is build progress clearly communicated? (Phase 0 Fix 0C added a progress indicator — does it work?)
- Is cancel button visible and accessible?
- Is result clearly shown on completion?
- Are errors clear and actionable on failure?

**8. Component Library Panel**
- Easy to find?
- Browse and search working?
- Is it clear how to insert a component?
- Does "used in N sites" display correctly?

**9. Console and Network Errors**
Capture all JavaScript console errors and failed network requests during all flows above.

**10. Accessibility Basics**
- Tab through main interface — does focus order make sense?
- Visible focus states on interactive elements?
- Sufficient contrast for main text?
- Error messages announced or just visual?

**11. FAMtastic Alignment Check**
Most important section. Evaluate Studio against the FAMtastic definition:
- Does the Studio itself feel FAMtastic?
- Is anything generic, boring, or template-feeling?
- Does it convey that it produces bold, distinctive work?
- If a visitor saw this tool, would they understand what makes the sites it builds special?
- What three things would most change the Studio's own identity to match the FAMtastic standard?
- Score: X/10

### Audit Report Format

```markdown
# FAMtastic Studio UX Audit Report
## Date: [date]
## Studio Version: [from package.json or FAMTASTIC-STATE.md]

## EXECUTIVE SUMMARY
3-5 sentences. Overall state. Top 3 critical issues. Single highest-leverage improvement.

## USER FLOW MAPS
### Create Flow
[Step-by-step map with screenshot references]
[⚠️ friction points] [🐛 bugs] [❌ missing features]

### Edit Flow
[Same format]

### Ship Flow
[Same format]

## FINDINGS

### Critical (blocks core workflow)
| # | Finding | Screenshot | Affects Flow |

### High (significant friction, workaround exists)
| # | Finding | Screenshot | Affects Flow |

### Medium (friction but minor)
| # | Finding | Screenshot | Affects Flow |

### Low (polish, nice-to-have)
| # | Finding | Screenshot | Affects Flow |

## CONSOLE ERRORS
[Every JS error with context of when it occurred]

## NETWORK FAILURES
[Every failed request with status code and endpoint]

## FAMTASTIC ALIGNMENT ASSESSMENT
Score: X/10
[Honest assessment]
[Three specific things that would most improve it]

## ACCESSIBILITY FINDINGS

## COMPONENT LIBRARY EVALUATION

## CHAT INTERFACE EVALUATION

## RECOMMENDATIONS RANKED BY IMPACT
1. [Highest impact]
2. [Second highest]
...

## WHAT SHOULD NOT CHANGE
[Things working well — preserve these]
```

**STOP AFTER AUDIT REPORT IS COMPLETE AND WRITTEN. Do not proceed to Phase 2 until `docs/phase-1-audit-report.md` exists.**

---

## PHASE 2 — AUDIT-TO-SESSION INTEGRATION

Read `docs/phase-1-audit-report.md` fully. Produce `docs/phase-2-integration-plan.md`.

For each Critical and High finding:
- Does it affect how Session 5 (Image Studio) should be designed?
- Does it affect how Session 6 (Scroll Animations) should be applied?
- Should it be fixed before Sessions 5 and 6? (Fix it now as a pre-session fix — the only code changes allowed in Phase 2)
- Or does it belong in Session 7?

For FAMtastic Alignment findings:
- Do the three suggested improvements affect Image Studio design?
- Should the Image Studio tab have a distinctive FAMtastic visual treatment?

```markdown
# Audit-to-Session Integration Plan
## Date: [date]

## PRE-SESSION FIXES APPLIED
[Critical bugs fixed before Sessions 5/6]
[What was fixed, which file, why it couldn't wait]

## SESSION 5 DESIGN ADJUSTMENTS
[Audit findings that change Image Studio design]
[Finding reference → how it changes the design]

## SESSION 6 DESIGN ADJUSTMENTS
[Audit findings that change scroll animation application]

## DEFERRED TO SESSION 7
[Priority-ordered findings that don't affect Sessions 5/6]

## FINDINGS THAT SESSIONS 5/6 NATURALLY RESOLVE
[Gaps that new features will close]
```

**STOP AFTER INTEGRATION PLAN IS COMPLETE. Do not begin Session 5 until `docs/phase-2-integration-plan.md` exists.**

---

## PHASE 3 — SESSION 5: IMAGE STUDIO SCREEN

**Before building:** Read `docs/phase-2-integration-plan.md` and apply any Session 5 design adjustments.

**DO NOT TOUCH:**
- `scripts/rembg-worker.py` — BG removal is live. PixelPanda is additional, not replacement.
- `lib/fam-motion.js` — do not modify
- `lib/fam-shapes.css` — do not modify
- `lib/character-branding.js` — do not modify

**Goal:** A dedicated Image Studio interface. Every image-related capability — generation, post-processing, brand assets — is visible, controllable, and routable from inside Studio. No more generating images through code calls with no visibility.

**Use Magic MCP (`/ui` command) to generate all UI components. Do not hand-code UI that Magic MCP can generate.**

---

### 5A — Provider Registry

Create `site-studio/lib/provider-registry.js`:

```javascript
const PROVIDER_REGISTRY = {

  imagen: {
    name: "Google Imagen 4.0",
    type: "generation",
    status: "active",
    model: "imagen-4.0-generate-001",
    deprecationCheck: true,
    deprecationDeadline: "2026-06-24",
    capabilities: ["text-to-image", "transparent-background", "batch", "seed-lock", "reference-images"],
    outputFormats: ["png", "jpg", "webp"],
    aspectRatios: ["1:1", "4:3", "3:4", "16:9", "9:16"],
    maxBatch: 4,
    costPerImage: 0.004,
    defaultParams: {
      promptRewriting: true,
      safetyFilter: "block_medium_and_above",
      transparentBackground: false
    },
    bestFor: ["characters", "scenes", "heroes", "consistent-sets"],
    notFor: ["animated-stills", "style-reference-heavy"]
  },

  leonardo: {
    name: "Leonardo.ai",
    type: "generation",
    status: "active",
    capabilities: ["text-to-image", "image-to-image", "style-reference", "character-reference", "motion-v3", "custom-models", "text-in-image"],
    models: {
      phoenix: { id: "de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3", bestFor: "photorealistic, high coherence" },
      kinoXL: { id: "aa77f04e-3eec-4034-9c07-d0f619684628", bestFor: "cinematic, wide shots" },
      lightningXL: { id: "b24e16ff-06e3-43eb-8d33-4416c2d75876", bestFor: "fast iteration" },
      animeXL: { id: "e71a1c2f-4f80-4800-934f-2c68979d1b55", bestFor: "anime/mascot style" }
    },
    presetStyles: ["ANIME","CREATIVE","DYNAMIC","ENVIRONMENT","GENERAL","ILLUSTRATION","PHOTOGRAPHY","RAYTRACED","RENDER_3D","SKETCH_BW","SKETCH_COLOR","NONE"],
    costPerImage: 0.016,
    videoSupport: true,
    bestFor: ["animating-stills", "style-lock", "cinematic", "character-reference"],
    notFor: ["speed-critical"]
  },

  firefly: {
    name: "Adobe Firefly (via Photoshop MCP)",
    type: "generation",
    status: "active",
    accessMethod: "ps-mcp",
    capabilities: ["text-to-image", "generative-fill", "generative-expand", "style-reference", "custom-models", "c2pa-provenance"],
    costMethod: "cc-credits",
    bestFor: ["brand-consistency", "style-reference", "c2pa-required"]
  },

  pixelpanda: {
    name: "PixelPanda",
    type: "processing",
    status: "evaluation",
    evaluationNote: "Active evaluation — $10 credit. Not permanent infrastructure.",
    capabilities: ["background-removal","upscale-2x","upscale-4x","text-removal","image-to-image","product-photography","ugc-video","batch-processing"],
    creditCosts: { backgroundRemoval: 1, upscale: 1, textRemoval: 1, imageToImage: 2, productPhoto: 1, ugcVideo: "5 per 10 seconds" },
    bestFor: ["bg-removal-fallback", "product-photography", "quick-upscale"],
    removalChecklist: [
      "Delete PixelPanda block from lib/image-pipeline.js",
      "Remove API key from secrets",
      "Remove all provider:pixelpanda telemetry entries",
      "Remove from provider-registry.js",
      "Search codebase for 'pixelpanda' — zero results required"
    ]
  },

  rembg: {
    name: "rembg (local Python)",
    type: "processing",
    status: "active",
    accessMethod: "POST /api/remove-background",
    capabilities: ["background-removal", "batch-processing"],
    costMethod: "free-local",
    note: "Primary BG removal — already implemented. Do not modify."
  },

  photoshop: {
    name: "Adobe Photoshop + Firefly (via ps-mcp)",
    type: "processing",
    status: "active",
    accessMethod: "ps-mcp",
    capabilities: ["layer-manipulation","background-removal-sensei","color-grading","batch-actions","content-aware-fill","generative-fill-firefly","resize-export","format-conversion"],
    costMethod: "cc-included",
    note: "Firefly generative fill accessible through this connection."
  },

  pixelixe: {
    name: "Pixelixe",
    type: "brand-assets",
    status: "evaluation",
    evaluationNote: "Active evaluation — $12/month 6-month commitment. 2 of 4 assets on first test. Not in critical path.",
    capabilities: ["brand-kit","og-images","social-cards","banners","badges","variant-generation"],
    assetSizes: { ogImage: "1200x630", socialSquare: "1080x1080", banner: "1500x500" },
    removalChecklist: [
      "Delete lib/pixelixe-client.js",
      "Remove MCP OAuth connection",
      "Remove all pixelixe telemetry entries",
      "Revert OG image step to static template",
      "Search codebase for 'pixelixe' — zero results required",
      "Cancel subscription before month 7"
    ]
  },

  veo: {
    name: "Google Veo 2.0",
    type: "video-generation",
    status: "active",
    capabilities: ["text-to-video", "image-to-video"],
    costMethod: "per-second",
    bestFor: ["hero-backgrounds", "scene-animation"]
  },

  premiere: {
    name: "Adobe Premiere Pro (via pr-mcp)",
    type: "video-processing",
    status: "active",
    accessMethod: "pr-mcp",
    capabilities: ["video-editing", "video-assembly", "export"],
    costMethod: "cc-included"
  }

}

module.exports = { PROVIDER_REGISTRY }
```

Add endpoints:
- `GET /api/providers` — returns PROVIDER_REGISTRY as JSON
- `GET /api/model-config` — returns current model config

---

### 5B — Model Configuration Layer

Create `site-studio/config/model-config.json`:

```json
{
  "site_generation": {
    "provider": "claude",
    "model": "claude-sonnet-4-6",
    "fallback": "claude-haiku-4-5"
  },
  "image_generation": {
    "provider": "imagen",
    "model": "imagen-4.0-generate-001",
    "fallback": "leonardo-phoenix",
    "deprecation_check_required": true,
    "deprecation_deadline": "2026-06-24"
  },
  "image_generation_cinematic": {
    "provider": "leonardo",
    "model": "kino-xl",
    "fallback": "phoenix"
  },
  "image_generation_style_reference": {
    "provider": "firefly",
    "model": "firefly-image-3",
    "access": "ps-mcp"
  },
  "background_removal_primary": {
    "provider": "rembg",
    "model": "local",
    "fallback": "pixelpanda"
  },
  "video_generation": {
    "provider": "veo",
    "model": "veo-2.0",
    "fallback": "leonardo-motion-v3"
  },
  "brand_assets": {
    "provider": "pixelixe",
    "model": "latest",
    "status": "evaluation",
    "fallback": "static-template"
  },
  "ui_components": {
    "provider": "magic-mcp",
    "model": "latest"
  },
  "gsap": {
    "licenseKeyEnvVar": "GSAP_LICENSE_KEY",
    "note": "Commercial license required. Never commit the key."
  }
}
```

Create `lib/model-config.js` — utility with `getModel(task)` and `getFallback(task)`. Every API call reads from this config. No hardcoded model strings anywhere in the codebase.

Every telemetry entry must include model name from this config.

**⚠️ DEPRECATION CHECK:** Before first Imagen API call, verify `imagen-4.0-generate-001` is not on the deprecated list. Flag in phase report if migration needed.

---

### 5C — Image Studio UI Screen

Dedicated tab in Studio. Three zones: Generate / Process / Library.

**Use Magic MCP `/ui` commands:**
- `/ui create a provider selector card grid — each card shows provider name, status badge (active/evaluation/deprecated), cost per image, and best-for tags. Selecting a card expands provider-specific options below.`
- `/ui create an image output grid with thumbnails, filename, provider badge, and action buttons: Download, Send to Process, Send to Library, Open in Photoshop`
- `/ui create an image library panel with filter bar (by site, type, provider, date), thumbnail grid with metadata, and a slide-in detail panel on image click`

**ZONE 1 — GENERATE**
- Provider selector (card-style, reads from provider-registry.js)
- Prompt input with character count
- Style preset selector (populated per selected provider from registry)
- Aspect ratio selector
- Image count (1–4)
- Seed input (optional)
- Transparent background toggle — defaults ON for character/mascot slots
- Advanced options panel (collapsible, all params per provider from registry)
- Cost estimate shown before confirming
- Generate button
- Output grid — images appear as they complete with: Download, Send to Process, Send to Library, Open in Photoshop

Provider-specific option sets:
- Imagen: aspect ratio, seed, prompt rewriting toggle, safety filter level
- Leonardo: model selector (Phoenix/Kino/Lightning/Anime), preset style, alchemy, image guidance upload, strength type, character reference
- Firefly (ps-mcp): style reference upload, custom model selector, variant count
- PixelPanda Product: product image upload, AI model ID, scene prompt

**ZONE 2 — PROCESS**
- Drop zone (drag from Zone 1, Zone 3, or local file)
- Image preview with dimensions, format, file size
- Operation buttons (each shows provider, cost, estimated time):
  - Remove Background → rembg (free, local) + PixelPanda fallback
  - Upscale 2x → PixelPanda (1 credit)
  - Upscale 4x → PixelPanda (1 credit)
  - Remove Text → PixelPanda (1 credit)
  - Image→Image Transform → PixelPanda (2 credits) + prompt input
  - Open in Photoshop → ps-mcp
  - Color Grade → Photoshop via ps-mcp
  - Generative Fill → Firefly via ps-mcp + mask + prompt
- Before/after preview
- Accept → sends to Zone 3
- Provider indicator always shows which tool handled it and cost

**ZONE 3 — LIBRARY**
- Filter bar: by site, type, provider, date
- Image grid with thumbnails and metadata
- Image detail panel: full size, all metadata, cost breakdown, action buttons
- Drag-to-canvas support
- Send to page slot: page → section → image assigned
- Cost dashboard: this session, all time, by provider

---

### 5D — Contextual Image Slot Editor

When user clicks any image element in canvas, right panel slides in:
- Current image preview, slot name, dimensions
- Replace → opens Zone 1 pre-configured for slot type:
  - Hero: 16:9, transparent OFF
  - Character/mascot: transparent ON, character style preset
  - Product: PixelPanda product mode
  - OG image: Pixelixe brand kit mode
- Quick actions: Remove BG, Upscale, Open in Photoshop, Generate Variant
- Slot metadata: provider, cost, generation date, model used

Canvas emits `slot:selected` event on image click. Image Studio listens and populates. Must work without opening the full Image Studio tab.

---

### 5E — Telemetry

Every operation logs to `media-telemetry.js`:
```javascript
{
  timestamp, session_id, site_name,
  operation, provider, model,
  prompt, input_image, output_path,
  cost, credits_used, processing_time_ms,
  result: "success" | "failed" | "fallback-used",
  fallback_provider
}
```

`GET /api/telemetry/summary` — breakdown by provider, session, site.

---

### Session 5 Playwright Tests

```
TEST GROUP: Provider Registry
  test_provider_registry_endpoint
    - GET /api/providers
    - Assert all 9 providers present
    - Assert required fields: name, type, status, capabilities, bestFor
    - Assert deprecation flag on imagen

  test_model_config_endpoint
    - GET /api/model-config
    - Assert all task keys present
    - Assert no missing model strings

TEST GROUP: Image Studio Tab
  test_image_studio_tab_exists
    - Load http://localhost:3334
    - Assert Image Studio tab visible
    - Click, assert three zones: Generate, Process, Library
    - Screenshot

  test_provider_selector_renders
    - Assert all active providers shown as cards
    - Assert each card: name, status badge, cost indicator
    - Click Imagen → Imagen options appear
    - Click Leonardo → model selector appears
    - Screenshot each

  test_generate_with_imagen
    - Select Imagen, enter prompt, enable transparent BG, count 2
    - Assert cost estimate shown before generation
    - Click Generate
    - Assert 2 images in grid within 60 seconds
    - Assert telemetry: correct provider and model
    - Screenshot

  test_generate_with_leonardo
    - Select Leonardo, Phoenix model, ILLUSTRATION style
    - Generate, assert image appears
    - Assert telemetry: provider leonardo, model phoenix
    - Screenshot

  test_transparent_bg_default_on_character_slot
    - Open contextual slot editor by clicking character/mascot slot
    - Assert transparent BG toggle is ON by default
    - Assert prompt field pre-populated with character style suffix

TEST GROUP: Process Zone
  test_bg_removal_routes_to_rembg
    - Drop test PNG into Process zone
    - Click Remove Background
    - Assert rembg called (free, local)
    - Assert transparent PNG result
    - Assert telemetry: provider rembg, cost free
    - Screenshot before/after

  test_bg_removal_fallback_to_pixelpanda
    - Mock rembg to return 500
    - Drop image, click Remove Background
    - Assert PixelPanda fallback triggered
    - Assert telemetry: result fallback-used, fallback_provider pixelpanda
    - Assert user notified of fallback

  test_upscale_2x
    - Drop small PNG, click Upscale 2x
    - Assert result is 2x original dimensions
    - Assert telemetry: credits_used 1
    - Screenshot

  test_open_in_photoshop
    - Drop image, click Open in Photoshop
    - Assert ps-mcp command sent
    - Assert confirmation shown
    - Assert telemetry logged

TEST GROUP: Library Zone
  test_library_shows_images
    - Generate 2 images
    - Navigate to Library
    - Assert both images with metadata
    - Screenshot

  test_library_filters
    - Filter by provider → correct filtering
    - Filter by type → correct filtering

  test_send_to_page_slot
    - Click image, click Send to page slot
    - Select page and section
    - Assert image assigned
    - Assert page preview updates

TEST GROUP: Contextual Slot Editor
  test_slot_editor_opens_on_click
    - Click image in canvas
    - Assert right panel opens
    - Assert current image, slot name, dimensions, quick actions
    - Screenshot

  test_slot_replace_opens_generator
    - Click image, click Replace
    - Assert generator opens pre-configured for slot type
    - Assert transparent BG ON for character slot
    - Screenshot

TEST GROUP: Telemetry
  test_all_operations_logged
    - Perform: 1 generation, 1 bg removal, 1 upscale
    - GET /api/telemetry/summary
    - Assert 3 entries with all required fields

  test_cost_summary_by_provider
    - Assert breakdown by provider
    - Assert total cost calculated correctly
```

**STOP AFTER SESSION 5 TESTS ALL PASS. Commit. Do not proceed to Phase 4.**

---

## PHASE 4 — SESSION 6: FAMTASTIC SCROLL ANIMATION SYSTEM

**Before building:** Read `docs/phase-2-integration-plan.md` and apply any Session 6 design adjustments.

**DO NOT MODIFY `lib/fam-motion.js`.** Create `lib/fam-scroll.js` as a new file only.

**Goal:** Scroll-driven animations that make FAMtastic sites feel alive. Characters interact on scroll. Backgrounds stay fixed or parallax. Sections pin while animations play.

**GSAP License:** Commercial license required ($150/year). Get the Club GreenSock license before writing a single line. Key goes in `GSAP_LICENSE_KEY` environment variable. Never commit it. If license is not in place, stop and flag it in the phase report — do not implement GSAP without it.

---

### 6A — Background Treatment System

CSS utilities in `lib/fam-shapes.css` (additive only, no modifications to existing rules):

```css
.fam-bg-fixed {
  background-attachment: fixed;
  background-size: cover;
  background-position: center;
}
```

Apply via: `data-fam-bg="fixed"`

Parallax via GSAP ScrollTrigger `scrub: true`. Default speed 30% of scroll. Configurable: `data-fam-parallax-speed="0.3"`

Multi-layer parallax:
- `data-fam-parallax-layer="1"` — 20% scroll speed (background)
- `data-fam-parallax-layer="2"` — 50% scroll speed (mid)
- `data-fam-parallax-layer="3"` — 100% scroll speed (foreground, normal)

---

### 6B — Section Pinning

`data-fam-pin="true"` with optional `data-fam-pin-duration="200"` (% of viewport height).

Section stays fixed while animations play. Unpins after scroll distance equals pin duration.

---

### 6C — Character Animation Presets

```javascript
FAM_SCROLL_PRESETS = {
  "walk-in-right": {
    from: { x: "100vw", opacity: 0 },
    to: { x: 0, opacity: 1 },
    start: "top 80%", end: "top 30%", scrub: 1.5
  },
  "walk-in-left": {
    from: { x: "-100vw", opacity: 0 },
    to: { x: 0, opacity: 1 },
    start: "top 80%", end: "top 30%", scrub: 1.5
  },
  "walk-toward": {
    // Two characters converge. Requires data-fam-meet-partner="[id]"
    scrub: true, pin: true, pinDuration: "300%"
  },
  "wave-at": { keyframes: "fam-wave", trigger: "onEnter", repeat: 2 },
  "peek-and-hide": {
    from: { y: "100%", opacity: 0 },
    to: { y: 0, opacity: 1 },
    hideOn: "leave", duration: 0.6, ease: "back.out(1.7)"
  },
  "float": { yoyo: true, repeat: -1, y: "-20px", duration: 2, ease: "power1.inOut" },
  "spin-on-scroll": { rotation: 360, scrub: true },
  "scale-on-scroll": {
    from: { scale: 0.5, opacity: 0 },
    to: { scale: 1, opacity: 1 }, scrub: 1
  }
}
```

**Character meet interaction:**

```html
<section data-fam-pin="true" data-fam-pin-duration="300">
  <img src="buddy-wave.png"
       data-fam-scroll="walk-in-right"
       data-fam-meet-partner="character-b" />
  <img src="character-b-wave.png"
       id="character-b"
       data-fam-scroll="walk-in-left" />
</section>
```

Timeline: 0% both off-screen → 50% at center + wave-at fires → 80% exiting → 100% section unpins.

`fam-scroll.js` detects `data-fam-meet-partner` and auto-wires the interaction timeline.

---

### 6D — fam-scroll.js Architecture

```javascript
// lib/fam-scroll.js
// GSAP ScrollTrigger — additive scroll system
// DO NOT MODIFY lib/fam-motion.js — separate systems

class FamScroll {
  constructor() {
    this.initialized = false
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  async init() {
    if (this.reducedMotion) return // Always respect prefers-reduced-motion
    // Load GSAP + ScrollTrigger via versioned asset manifest (Fix 0E pattern)
    // Register plugin
    // Scan DOM for data-fam-scroll, data-fam-pin, data-fam-bg, data-fam-parallax
    // Initialize all found elements
    // Wire character interaction timelines
  }

  initBackgrounds() {}
  initPinnedSections() {}
  initCharacterAnimations() {}
  buildMeetTimeline(characterA, characterB, section) {}

  destroy() {
    ScrollTrigger.getAll().forEach(t => t.kill())
  }
}

export default new FamScroll()
```

**Asset injection follows Fix 0E versioned manifest pattern.** Do not copy `fam-scroll.js` directly into site dist folders. Reference via versioned manifest.

---

### 6E — Template Integration

Every generated page:
```html
<script src="/js/fam-motion.js" defer></script>
<script src="/js/fam-scroll.js" defer></script>
```

**FAMtastic mode auto-defaults** (when `mode: "famtastic"` in brief):
- Hero: `data-fam-bg="parallax"` on background
- First character section: `data-fam-pin="true"` + character entrance
- 2+ characters in same section: auto-wire meet interaction
- Stats section: `data-fam-scroll="scale-on-scroll"` on stat cards
- Footer character: `data-fam-scroll="float"`

**Standard mode:** included but no auto-defaults. Opt-in via data attributes only.

---

### 6F — Studio Chat Commands

Add to classifier:
- `"make the background fixed on the hero"` → `data-fam-bg="fixed"` on hero background
- `"add parallax to the [section] background"` → parallax with default speed
- `"make [character] walk in from the right on scroll"` → `walk-in-right` preset
- `"make [char-a] and [char-b] walk toward each other"` → meet interaction timeline
- `"pin the [section] section while the animation plays"` → pin with default duration
- `"make [character] wave when scrolled to"` → `wave-at` preset

These commands must be added to `tests/classifier-regression.json` as additional test cases.

---

### Session 6 Playwright Tests

```
TEST GROUP: Background Treatments
  test_fixed_background
    - Page with data-fam-bg="fixed" on hero
    - Assert CSS background-attachment: fixed
    - Scroll, assert background does not move
    - Screenshot at 0px and 500px scroll

  test_parallax_background
    - Page with data-fam-bg="parallax"
    - Scroll, assert background Y changes at different rate
    - Screenshot at multiple scroll positions

  test_multi_layer_parallax
    - Three elements with parallax-layer 1, 2, 3
    - Assert each moves at different rate
    - Screenshot depth effect

TEST GROUP: Section Pinning
  test_section_pins
    - Section with data-fam-pin="true" data-fam-pin-duration="200"
    - Scroll to section, assert it stays fixed
    - Assert unpins after correct scroll distance
    - Screenshot mid-pin

TEST GROUP: Character Animations
  test_walk_in_right
    - Character with data-fam-scroll="walk-in-right"
    - Scroll into view
    - Assert starts off-screen right, animates to x:0
    - Screenshot at 0%, 50%, 100% of animation

  test_walk_in_left
    - Same from left, assert correct directionality

  test_character_meet_interaction
    - Pinned section, two characters with meet-partner wired
    - Screenshot at: 0% (off-screen), 50% (center + wave), 80% (exiting), 100% (unpinned)
    - Assert all four states correct

  test_wave_at
    - Character with data-fam-scroll="wave-at"
    - Scroll to element
    - Assert wave animation plays on enter, plays exactly 2 times

  test_float
    - Character with data-fam-scroll="float"
    - Assert continuous while in viewport
    - Scroll away, assert pauses

  test_peek_and_hide
    - data-fam-scroll="peek-and-hide"
    - Scroll to: assert peeks from bottom
    - Scroll away: assert hides

TEST GROUP: Studio Chat Commands
  test_chat_fixed_background
    - Chat: "make the background fixed on the hero"
    - Assert data-fam-bg="fixed" added
    - Screenshot

  test_chat_walk_in
    - Chat: "make Buddy walk in from the right on scroll"
    - Assert data-fam-scroll="walk-in-right" added to Buddy
    - Screenshot

  test_chat_meet_interaction
    - Chat: "make Buddy and the cat character walk toward each other"
    - Assert both characters get correct attributes
    - Assert data-fam-meet-partner wired
    - Assert surrounding section gets data-fam-pin="true"

TEST GROUP: Performance and Accessibility
  test_reduced_motion_respected
    - page.emulateMedia({ reducedMotion: 'reduce' })
    - Assert no GSAP animations initialized
    - Assert all content immediately visible

  test_lighthouse_score
    - Run Lighthouse on animated page
    - Assert Performance >= 85
    - Assert no new a11y violations
    - Log full report in phase report

  test_scroll_triggers_cleaned_up
    - Navigate away from animated page
    - Assert ScrollTrigger.getAll().length === 0

  test_asset_version_recorded
    - Build new site with Session 6 assets
    - Read spec.json
    - Assert fam_assets_version includes fam-scroll.js version
    - Assert fam-scroll.js NOT copied as local file (uses manifest pattern)
```

**STOP AFTER SESSION 6 TESTS ALL PASS. Commit. Proceed to Phase 5.**

---

## PHASE 5 — CONSOLIDATED FINAL REPORT

Produce `docs/master-report.md`:

```markdown
# FAMtastic Studio — Complete Session Report
## Date: [date]
## Phases: 0 (Codex Remediation) + UX Audit + Session 5 + Session 6

---

## PHASE 0 — CODEX REMEDIATION SUMMARY
  Fixes applied: [list all 5]
  Tests: X/Y passed
  Any fixes that required deviation from the spec (with reason)
  New gaps discovered during remediation

## PHASE 1 — UX AUDIT SUMMARY
  Top 3 critical findings
  FAMtastic alignment score: X/10
  Key quote from audit that best describes the system's current state

## PHASE 2 — INTEGRATION SUMMARY
  Pre-session fixes applied
  How audit changed Session 5 design
  How audit changed Session 6 design
  Count of findings deferred to Session 7

## PHASE 3 — SESSION 5 RESULTS
  Tests: X/Y passed
  What worked first try
  What required rework (root cause for each)
  Deviations from prompt (with reason)
  Suggestions made (accepted / deferred / rejected with reason)
  New gaps discovered
  Cost tracking: all API calls with provider, operation, cost, result
  Imagen deprecation status: safe or needs migration

## PHASE 4 — SESSION 6 RESULTS
  Tests: X/Y passed
  GSAP license confirmed: yes/no
  What worked first try
  What required rework (root cause)
  Deviations from prompt
  Suggestions made (accepted / deferred / rejected)
  New gaps discovered
  Lighthouse before/after scores
  Asset manifest version after Session 6

## SESSION 7 RECOMMENDED SCOPE
  Priority-ordered list based on:
  - Audit findings deferred from Phase 2
  - New gaps from Sessions 5 and 6
  - Medium-severity Codex findings not yet addressed:
    - SEO canonical/sitemap environment gating
    - Character branding wired into rebuild deterministically
    - rembg timeout and queue system

## UPDATED CAPABILITY MAP
  Full list of what Studio can now do
  Provider registry: all providers and their current status
  Component library count
  Asset manifest version
  Total cost tracking (all time, by provider)

## FAMTASTIC DNA COMPLIANCE
  Does the Studio itself embody the FAMtastic standard?
  Score before audit: [from Phase 1]
  Score after Sessions 5 and 6: [re-evaluate]
  What would move it to 10/10?

## WHAT MUST NOT CHANGE
  Systems that are working well and should be preserved
```

After the master report is written, update `FAMTASTIC-STATE.md` with the full current system state.

---

## THIRD-PARTY INTEGRATIONS — EVALUATION STATUS

> All integration code must be removable. No dead code if a tool is dropped. Standing rule.

### PixelPanda — ACTIVE EVALUATION
$10 credit. rembg is primary. PixelPanda is fallback + product photography.
Removal: delete image-pipeline.js PixelPanda block, remove API key, remove telemetry, search "pixelpanda" — zero results required.

### Pixelixe — ACTIVE EVALUATION
$12/month, 6-month commitment. Not in critical path. Run next brand kit test on next site build. Log in `tests/integrations/pixelixe-eval.json`.
Removal: delete pixelixe-client.js, remove OAuth, remove telemetry, revert OG to static template, search "pixelixe" — zero results required, cancel before month 7.

---

## EXECUTION ORDER

```
Read orientation files → CLAUDE.md integrity check
  ↓
Phase 0: Codex Remediation
  → Fix 0A: Cancel terminates subprocesses
  → Fix 0B: Disconnect does not release lock
  → Fix 0C: Build record replaces boolean
  → Fix 0D: Classifier defaults to clarify
  → Fix 0E: Asset versioning manifest
  → Phase 0 Playwright tests — ALL must pass
  → docs/phase-0-report.md written
  → Commit
  ↓
Phase 1: UX Audit
  → Navigate Studio, screenshot everything
  → docs/phase-1-audit-report.md written
  → STOP — confirm report complete
  ↓
Phase 2: Integration Planning
  → Read audit report
  → docs/phase-2-integration-plan.md written
  → Pre-session critical fixes applied
  → STOP — confirm integration doc complete
  ↓
Phase 3: Session 5 — Image Studio
  → Apply Session 5 design adjustments from Phase 2
  → Build provider registry, model config, Image Studio UI (Magic MCP)
  → Session 5 Playwright tests — ALL must pass
  → docs/phase-3-report.md written
  → Commit
  ↓
Phase 4: Session 6 — Scroll Animations
  → Confirm GSAP license in place (STOP if not)
  → Apply Session 6 design adjustments from Phase 2
  → Build fam-scroll.js (additive — do not touch fam-motion.js)
  → Session 6 Playwright tests — ALL must pass
  → docs/phase-4-report.md written
  → Commit
  ↓
Phase 5: Final Report
  → docs/master-report.md written
  → FAMTASTIC-STATE.md updated
  → Final commit
```

**Do not skip phases. Do not combine phases. If a Playwright test fails, fix it before proceeding. If a test cannot pass due to a legitimate architectural constraint, document it in the phase report with root cause and proposed resolution — never silently skip.**
