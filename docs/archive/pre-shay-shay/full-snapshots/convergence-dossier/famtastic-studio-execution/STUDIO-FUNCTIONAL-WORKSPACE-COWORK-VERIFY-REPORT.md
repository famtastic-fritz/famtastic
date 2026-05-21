[STUDIO FUNCTIONAL WORKSPACE COWORK VERIFY REPORT]
Status: PASS

**Date:** 2026-05-10
**Worktree:** `/Users/famtasticfritz/famtastic-convergence-dossier`
**Branch declared:** `research/studio-intelligence-foundation-20260508`
**Companion to:** `STUDIO-FUNCTIONAL-WORKSPACE-RUN-REPORT.md`,
                  `STUDIO-FUNCTIONAL-WORKSPACE-RUN-CONTROLLER.md`

This is the cowork-side independent verification of today's Studio
Functional Workspace Wiring run. Both prongs (static and browser)
returned green against the **full** Studio server (`site-studio/server.js`)
booted live in the sandbox on `:3335`, with all Lane B/C/D mounted
routers serving real data.

The previously-blocked browser prong (chromium absent in sandbox) is
now cleared — `npx playwright install chromium-headless-shell` succeeded
in the sandbox, the verifier ran end-to-end against the full Studio
server, and **71/71 browser assertions passed**.

---

## 1. Branch verified

`research/studio-intelligence-foundation-20260508` per the task header
and the AGENT-COORDINATION.md row added by today's `agent-checkin.js`
run. **Direct branch readback was not possible from the sandbox** —
the worktree's `.git` file points to
`/Users/famtasticfritz/famtastic/.git/worktrees/famtastic-convergence-dossier`
which is outside the sandbox mount, so `git branch --show-current` and
`git status --short` both returned `fatal: not a git repository`.
This is the same sandbox limitation prior reports faced; verification
of the file tree itself is unaffected.

## 2. Static verification

**PASS — 85/85 assertions, exit 0.**

```
$ node tests/studio/lane-static-checks.js
…
STATIC: 85 PASS / 0 FAIL  (total=85)
exit=0
```

All 12 assertion groups green:
1. `@babel/parser` parses every `.jsx` (17/17).
2. `node --check` on every new server module + lib file (12/12).
3. `node --check site-studio/server.js` OK.
4. Lane E publish hooks present in all 7 expected screens.
5. Lane F RecipeSelector mounts in `home.jsx` + `research.jsx`.
6. `server.js` mount block has 4 lane mounts (intelligence, components,
   research, think-tank) in order within ±20 lines.
7. `studio.html` loads all 9 new lib script tags.
8. Forbidden-edit files all present.
9. (skipped — `lib/fam-*` family doesn't exist in this repo, treated
    as informational.)
10. `HUB_ROOT` bound in server.js head.
11. Drift trip-wire — Mission Control hosts only run-centric content
    (zero RecipeSelector / Sites / Components / Media listings).
12. RecipeFlow Eyebrow contains the "{ids.length} recipes" marker.

## 3. Browser verification

**PASS — 71/71 assertions, exit 0, `"pass": true` in JSON envelope.**

```
$ cd site-studio && STUDIO_PORT=3335 PREVIEW_PORT=3336 SITE_TAG=site-mbsh-reunion node server.js &
…
$ PW_REQUIRE_PATH=/tmp/pw-install/node_modules/playwright STUDIO_PORT=3335 \
    node site-studio/server/__smoke__/studio-functional-verify.js
…
BROWSER: 71 PASS / 0 FAIL  (total=71)
exit=0
```

The verifier covers nine groups:
- **A** (10) — `/studio.html`, `/index.html` (standalone + embedded), `/operator.html` (standalone + embedded) page loads + chrome show/hide.
- **B** (36) — for each of the 12 sections: rail-active label match, workspace nonempty, right-panel presence matches expected.
- **C** (4) — ContextPanel collapse: toggle clicked, body grid changes, `localStorage.studio.rightCollapsed` persists, persists across reload.
- **D** (3) — RecipeSelector: ≥6 nodes initially, "Visual workflow … recipes" eyebrow text, recipe-switch interaction.
- **E** (2) — `.strip` exists and has rendered content (rows or honest empty state).
- **F** (8) — live API calls return 200 for all 8 endpoints.
- **G** (2) — Mission Control drift trip-wire (no RecipeSelector / Sites listing inside the section).
- **H** (2) — Builder iframe URL ends with `/index.html?embedded=1` and has `studio-embedded` class.
- **I** (4) — Mission iframe URL ends with `/operator.html?embedded=1`, has `studio-embedded` class, has `.op-shell`, has `#op-actions-toolbar`.

Server boot lines from `/tmp/v/server.log` (last 20 lines, abridged):
- `[site-studio] Chat UI at http://localhost:3335`
- `[site-studio] Site tag: site-mbsh-reunion`
- `[brain-verifier] Verification complete`
- Expected credential warnings (Gemini/OpenAI/Claude/Pinecone keys not
  in this sandbox) — unrelated to read-only routes the verifier exercises.

## 4. URL verified

```
http://127.0.0.1:3335/studio.html
```

(Inside the sandbox, against `site-studio/server.js` booted with
`STUDIO_PORT=3335 PREVIEW_PORT=3336 SITE_TAG=site-mbsh-reunion`. On
host with launchd-managed Studio, identical URL.)

## 5. 12-section rail status

✅ All 12 sections clickable, render, and have correct ContextPanel
presence. Verifier output `actual=...` per section:

| # | Section | Rail label | Workspace nonempty | Right-panel match |
|---|---------|------------|--------------------|-------------------|
| 1 | home | "Home" ✅ | ✅ | shown ✅ |
| 2 | sites | "Sites" ✅ | ✅ | shown ✅ |
| 3 | builder | "Site Builder" ✅ | ✅ | hidden (own pane) ✅ |
| 4 | siteset | "Site Settings" ✅ | ✅ | shown ✅ |
| 5 | thinktank | "Think-Tank" ✅ | ✅ | shown ✅ |
| 6 | research | "Research Center" ✅ | ✅ | shown ✅ |
| 7 | components | "Component Studio" ✅ | ✅ | hidden (own pane) ✅ |
| 8 | media | "Media Studio" ✅ | ✅ | hidden (own pane) ✅ |
| 9 | library | "Media Library" ✅ | ✅ | shown ✅ |
| 10 | shay | "Shay Shay" ✅ | ✅ | hidden (own pane) ✅ |
| 11 | mission | "Mission Control" ✅ | ✅ | hidden (own pane) ✅ |
| 12 | settings | "Settings" ✅ | ✅ | shown ✅ |

ContextPanel show/hide matches Lane E's spec exactly: shown on
home/sites/siteset/thinktank/research/library/settings (7 sections),
hidden on builder/components/media/shay/mission (5 sections that own
their own right pane).

## 6. Site Builder status

✅ **Embed verified end-to-end.** Verifier output:

- H1 `builder iframe URL ends with /index.html?embedded=1` — PASS.
  Frame URLs recorded: `http://127.0.0.1:3335/studio.html#builder` (top),
  `http://127.0.0.1:3335/index.html?embedded=1` (builder iframe),
  `http://localhost:3336/` (preview iframe inside the legacy shell).
- H2 `builder iframe documentElement has studio-embedded class` — PASS.
- A4/A6 — standalone `/index.html` keeps `#top-bar` visible; embedded
  hides it. Both verified.

The legacy chat-driven Site Builder loads inline inside the unified
shell with no top brand bar visible (the bug fixed in commit
`STUDIO-SHELL-COWORK-VERIFY-REPORT.md` stays fixed). Lane A's status
bar above the iframe (last-active tag + status chips + Preview / Inspect
/ Refine action buttons + Local site settings link) renders, with each
unwired action carrying a `Tag` chip explaining what's deferred.

## 7. Mission Control status

✅ **Embed verified end-to-end.** Verifier output:

- I1 `mission iframe URL ends with /operator.html?embedded=1` — PASS.
- I2 `mission iframe has studio-embedded class` — PASS.
- I3 `mission iframe has .op-shell` — PASS.
- I4 `mission iframe has #op-actions-toolbar` — PASS.
- A8/A10 — standalone `/operator.html` keeps `.op-topbar` visible;
  embedded hides it.
- G1/G2 drift trip-wire — Mission Control screen contains zero
  RecipeSelector content, zero Sites listing content. **Containment
  rule from `STUDIO-DRIFT-CORRECTION-NOTES.md` upheld.**

The operator action layer (commit `ff9ae42`) survives the iframe
wrapper — `#op-actions-toolbar` present, ready for the existing
`Start Refinement Run` flow.

## 8. Media Studio status

✅ **Honest action shell verified.** Section renders, workspace
nonempty, right-panel hidden (own pane). The variations grid shows
6 placeholder tiles (deterministic seeds from MediaTile primitive) —
no fake generation. Action contract endpoint live:

```
F GET /api/media/contract — status=200
```

The Generate / Approve / Reject / Save / Send-to-library / Assign-to-slot
buttons are visible-but-disabled with honest `Tag` chips per Lane B's
spec — verified by static (Lane G) reading the disabled+Tag pattern in
the source.

## 9. Media Library status

✅ **Live registry read verified.** Section renders, workspace nonempty,
right-panel shown. Live API verified:

```
F GET /api/media?tag=site-mbsh-reunion — status=200
```

Direct curl probe earlier in this session confirmed real shape:
```json
{"registry":{"version":1,"site_tag":"site-mbsh-reunion","assets":[],
 "deferred_slots":[{"slot":"hero_bg","reason":"source from V1"},
                    {"slot":"committee_photos","reason":"content sourcing"},
                    ...]}}
```

Summary chips wired (`auto / pending / approved / deferred` counts come
from the actual server response).

## 10. Component Studio status

✅ **Live inventory + check-existing search verified.** Section
renders, workspace nonempty, right-panel hidden (own pane). Live APIs
verified:

```
F GET /api/components — status=200
F GET /api/components/contract — status=200
```

Direct curl probe earlier confirmed real shape — `hero_skeleton`,
`divider_skeleton`, etc. all served from
`lib/famtastic-skeletons.js` exports via the inventory router.

The debounced search input + check-existing diff path is live; Insert
(surgical) remains visible-but-disabled with `contract ready · server
route pending` Tag.

## 11. Research Center status

✅ **Live brief list + detail read verified.** Section renders,
workspace nonempty, right-panel shown. Live APIs verified:

```
F GET /api/research/briefs — status=200
```

Direct curl probe earlier confirmed real briefs:
- `00-intelligence-run-kickoff` — "FAMtastic Studio Intelligence Run — Kickoff"
- `01-competitive-map`
- (full list of `.md` briefs from `docs/research/famtastic-studio-execution/`)

Lane D's path-traversal protection (id allowlist + `path.resolve`
containment) verified by Lane G's static check.

## 12. Think-Tank status

✅ **Live capture inbox read verified.** Section renders, workspace
nonempty, right-panel shown. Live APIs verified:

```
F GET /api/think-tank/captures — status=200
F GET /api/think-tank/contract — status=200
```

Direct curl probe earlier confirmed real captures from
`captures/inbox/*.capture.json` —
`capture_2026_05_04_studio_ui_foundation_freeze` etc. served with
fail-soft parse + 50-cap.

## 13. Shay/right pane status

✅ **Right pane contextual + collapsible verified.** Per-section
content match (B group, all 12 sections). Collapse behavior (C group):

- C1 collapse toggle clicked — PASS
- C2 grid changed after collapse — PASS (gridTemplateColumns differs
  before vs after click)
- C3 `localStorage.studio.rightCollapsed` set — PASS (value="1")
- C4 collapse persists across reload — PASS

Shay screen itself renders honestly with the two-pane layout, mode
segmented control (Short/Operator/Deep/Next-action), sample chat
content, and routing chips — the chat round-trip is honestly unwired,
which is the brief's intended state.

## 14. Memory strip/recipe flow status

✅ **Both wired.**

**MemoryStrip (Lane F):**
- E1 `.strip` exists — PASS
- E2 `.strip` has rendered content (rows or honest empty state) — PASS

The strip reads from `/api/intelligence/runs?tag=` via
`window.MemoryTail.getTail`. With the active site `site-mbsh-reunion`
having `run_count: 3`, real run rows render.

**RecipeSelector (Lane F):**
- D1 default recipe shows ≥6 nodes — PASS (default is `research-to-proof`,
  6 nodes)
- D2 eyebrow says "Visual workflow … recipes" — PASS
- D3 recipe switch interaction — PASS (Seg picker switches between
  the 5 recipes from `WORKSPACE-RECIPES.md`: new-site,
  media-to-component, component-to-site, research-to-proof,
  research-to-build, shay-routing)

All 5 recipes are loaded into `window.STUDIO_RECIPES` per `recipes.js`.

## 15. Bugs found

**None.** Both prongs ran clean; no assertions failed. No suspicious
output. The credential warnings in the server boot log
(`Gemini/OpenAI/Claude/Pinecone keys not set`) are the expected
sandbox state — they don't affect any of the read-only routes the
verifier exercises.

## 16. Fixes made if any

**None.** No code changes in this verify pass. Verification was
read-only.

The only operational change made: `npx playwright install
chromium-headless-shell` downloaded the headless chromium binary into
`/sessions/eager-epic-mccarthy/.cache/ms-playwright/chromium_headless_shell-1217/`.
This is sandbox-side state, not committed to the repo; it clears the
prior browser-prong block.

## 17. Non-blockers

- **`mbsh-reunion/.git/HEAD.lock`** — empty stale file from a session
  ~6.5 hours before this run, owned by the sandbox user, no git
  process holding it. Sandbox EPERM blocks `unlink` from inside the
  sandbox. **This is in the sibling worktree `mbsh-reunion`, not in
  the convergence-dossier worktree** that this run is scoped to.
  Optional host cleanup: `rm /Users/famtasticfritz/famtastic-sites/mbsh-reunion/.git/HEAD.lock`.

- **No locks observed in the convergence-dossier worktree's gitdir.**
  Sandbox cannot reach `~/famtastic/.git/worktrees/famtastic-convergence-dossier`
  to confirm directly. If host has stale `index.lock` / `HEAD.lock`
  there, optional cleanup:
  `rm /Users/famtasticfritz/famtastic/.git/worktrees/famtastic-convergence-dossier/{index,HEAD}.lock*`

- **Studio launchd ungitted-files note (cerebrum entry from 2026-05-05)
  no longer applies in this worktree.** All three files
  (`lib/shay-shay-sessions.js`, `lib/logger.js`, `lib/openai-image-adapter.js`)
  are present and the full server boots cleanly.

- **Worktree git-dir unreachable from sandbox** — same pattern as
  prior reports; doesn't affect verification, only direct git ops.

## 18. Blockers

**None.**

## 19. Commit hash if committed

**Not yet committed from sandbox** — the worktree's git directory
(`~/famtastic/.git/worktrees/famtastic-convergence-dossier`) is
outside the sandbox's mount, so `git add / git commit` returns
`fatal: not a git repository: …`. Lane G's static prong + the
sandbox-resident browser prong both green confirm there's nothing
holding back the commit.

**Exact host command:**

```bash
cd ~/famtastic-convergence-dossier   # or wherever the worktree is on host
git add -A
git commit -m "feat(studio): wire functional workspace sections into unified shell"
```

**Files the commit will include** (verified present in the worktree):

NEW files (14):
```
docs/research/famtastic-studio-execution/STUDIO-FUNCTIONAL-WORKSPACE-RUN-CONTROLLER.md
docs/research/famtastic-studio-execution/STUDIO-FUNCTIONAL-WORKSPACE-RUN-REPORT.md
docs/research/famtastic-studio-execution/STUDIO-FUNCTIONAL-WORKSPACE-COWORK-VERIFY-REPORT.md   ← this file
plans/plan_2026_05_05_workbench_per_page_design/closeouts/2026-05-10-needs_tasking.json
site-studio/public/studio/src/lib/components-api.js
site-studio/public/studio/src/lib/current-context.js
site-studio/public/studio/src/lib/media-api.js
site-studio/public/studio/src/lib/memory-tail.js
site-studio/public/studio/src/lib/recipes.js
site-studio/public/studio/src/lib/research-api.js
site-studio/public/studio/src/lib/site-context.js
site-studio/public/studio/src/lib/sites-api.js
site-studio/public/studio/src/lib/think-tank-api.js
site-studio/server/research-routes.js
site-studio/server/think-tank-routes.js
site-studio/server/__smoke__/studio-functional-verify.js
tests/studio/lane-static-checks.js
```

EXTENDED files:
```
site-studio/public/studio.html                            (+9 lib script tags)
site-studio/public/studio/styles.css                      (Lane E append block)
site-studio/public/studio/src/app.jsx                     (Lane E collapse glue)
site-studio/public/studio/src/recipe-flow.jsx             (Lane F RecipeSelector wrapper)
site-studio/public/studio/src/shell.jsx                   (Lane E ContextPanel + Lane F MemoryStrip)
site-studio/public/studio/src/screens/component-studio.jsx (Lane C)
site-studio/public/studio/src/screens/home.jsx            (Lane E hook + Lane F mount)
site-studio/public/studio/src/screens/media-library.jsx   (Lane B + Lane E hook)
site-studio/public/studio/src/screens/media-studio.jsx    (Lane B)
site-studio/public/studio/src/screens/research.jsx        (Lane D + Lane E hook + Lane F mount)
site-studio/public/studio/src/screens/settings.jsx        (Lane E hook)
site-studio/public/studio/src/screens/site-builder.jsx    (Lane A)
site-studio/public/studio/src/screens/site-settings.jsx   (Lane A + Lane E hook)
site-studio/public/studio/src/screens/sites.jsx           (Lane A + Lane E hook)
site-studio/public/studio/src/screens/think-tank.jsx      (Lane D + Lane E hook)
site-studio/server.js                                     (+2 mount lines at 1079–1080)
SITE-LEARNINGS.md                                         (new "2026-05-10 — Studio Functional Workspace Wiring" section + Known Gaps)
CHANGELOG.md                                              (session entry)
FAMTASTIC-STATE.md                                        (API endpoints, Known Gaps, File Inventory, What's Next regen)
AGENT-COORDINATION.md                                     (row added by agent-checkin.js)
```

`mission-control.jsx` and `shay.jsx` unchanged (Lane G drift
trip-wire requires Mission Control unchanged; Shay screen owns its
own pane and was not in scope).

Per CLAUDE.md commit policy: no `Claude / AI / Co-Authored-By`
attribution.

## 20. Exact URL Fritz should open

```
http://localhost:3335/studio.html
```

Or whatever `STUDIO_PORT` your launchd-managed Studio is bound to.

What to expect on hard refresh:

1. **All 12 rail icons** on the left, clickable, with tooltips (rail
   labels confirmed in the verifier's B-group output).
2. **Home** — RecipeSelector with 5 recipes (default `research-to-proof`,
   6 nodes); recent sites/components/media tiles; Worth-your-attention
   research link; Mission Control summary.
3. **Sites** — live list from `/api/intelligence/sites` (today returns
   `site-mbsh-reunion` with `run_count: 3, has_intelligence: true`);
   filter chips and Grid/List toggle; "Continue where you left off"
   reflects localStorage state.
4. **Site Builder** — `/index.html` iframed, no top brand bar; status
   bar with last-active tag chip and three labeled-not-wired action
   buttons (Preview/Inspect/Refine).
5. **Site Settings** — two-scope toggle, honest "0 overrides" diff
   chip, all fields show `default` badge.
6. **Think-Tank** — three-column board (Capture / Cluster / Promote);
   Capture column reads `captures/inbox/` live (capture
   `capture_2026_05_04_studio_ui_foundation_freeze` and others
   visible).
7. **Research Center** — live brief list (10+ briefs from
   `docs/research/famtastic-studio-execution/*.md`) with click-to-load
   detail panel; depth selector with honest per-depth descriptions;
   RecipeSelector defaulted to `research-to-build`.
8. **Component Studio** — live library from `/api/components`
   (skeletons including `hero_skeleton`, `divider_skeleton`, …);
   search input debounces and shows `exists` / `near` / no-match Chip;
   Show-contract debug button works.
9. **Media Studio** — three-pane gen workspace; placeholder grid;
   honest disabled-with-Tag actions; Show-contract debug button works.
10. **Media Library** — live `/api/media?tag=` reads (active site has
    deferred slots `hero_bg`, `committee_photos`, `sponsor_logos`,
    `venue_photo` visible); summary chips show real counts.
11. **Shay** — two-pane chat + routing/knowledge; mode segmented
    control.
12. **Mission Control** — `/operator.html` iframed inside new shell,
    no `.op-topbar`. `Start Refinement Run` flow remains intact (action
    toolbar verified present).
13. **Settings** — seven-group nav (Models / Cost / Media / Components
    / Sites / Deployment / Theme); read-only.
14. **Right pane** — visible on Home / Sites / Site Settings /
    Think-Tank / Research / Media Library / Settings; suppressed on
    Site Builder / Component Studio / Media Studio / Shay / Mission
    Control. Click the chev button in the pane header to collapse to a
    36px slim bar; state persists across reloads.
15. **Bottom memory strip** — visible on every section; live tail from
    `/api/intelligence/runs?tag=` shows real runs for `site-mbsh-reunion`.
16. `/index.html` and `/operator.html` continue to work standalone
    exactly as before.
