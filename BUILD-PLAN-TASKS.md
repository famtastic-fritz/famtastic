# FAMtastic Site Studio — Build Plan v2 Task Tracker

**Plan name:** Revised Build Plan v2
**Created:** 2026-03-31
**Status:** In Progress
**Current tier:** Tier 1 (Build Now)

---

## How to use this file

Any session can pick up where the last one left off by reading this file.
Each task has a status, dependencies, affected files, and verification criteria.
Update the status and notes after completing each task. Commit this file with
every wave completion so the next session has current state.

**Statuses:** `[ ]` pending | `[~]` in progress | `[x]` done | `[!]` blocked

---

## Tier 1 — Build Now

### Phase 0 — Foundation (4-6 hours total)

#### Wave 0-A — Tab and Label Rename
- **Status:** `[ ]`
- **Dependencies:** None
- **Files:** `site-studio/public/index.html` only
- **Risk:** Low (cosmetic only)
- **Verification:**
  - [ ] All 8 tab labels show new names in browser
  - [ ] `npm test` passes (56+ tests)
  - [ ] `git diff --name-only` shows only index.html
  - [ ] grep confirms no original tab names in visible UI text
- **Rename map:**
  - Assets → Media, Blueprint → Structure, Deploy → Publish, Design → Style
  - History → Activity, Metrics → Insights, Verify → Review, Server → Hosting
  - Brand Health → Site Health, Deploy to Staging → Publish to Staging
  - Deploy to Production → Publish to Production, Push to Repo → Save to Repo
  - Run Verification → Run Review, Verified → Looks Good
  - N Issues → N Things to Fix, Unchecked → Not Reviewed Yet
- **Notes:**

#### Wave 0-B — Session Status Bar
- **Status:** `[ ]`
- **Dependencies:** None (parallel with 0-A and 0-C)
- **Files:** `site-studio/server.js`, `site-studio/public/index.html`, `site-studio/tests/unit.test.js`
- **Risk:** Low
- **Sub-tasks:**
  - [ ] Part 1: server.js — token tracking vars, calculateSessionCost(), getContextPercentage(), broadcastSessionStatus(), context warning at 80%
  - [ ] Part 2: index.html — status bar HTML/CSS, session-status WS handler, duration timer
  - [ ] Part 3: unit tests — 6 new tests (3 cost calc + 3 context percentage)
- **Verification:**
  - [ ] Status bar visible at bottom of Studio
  - [ ] Cost updates after each Claude call
  - [ ] Context bar shows correct color
  - [ ] `npm test` passes (56 → 62 tests)
- **Notes:**

#### Wave 0-C — Brain Foundation
- **Status:** `[ ]`
- **Dependencies:** None (parallel with 0-A and 0-B)
- **Files:** `.brain/INDEX.md`, `.brain/patterns.md`, `.brain/procedures.md`, `.brain/bugs.md`, `.brain/anti-patterns.md`, `.brain/site-log.jsonl`, `site-studio/server.js`, `SITE-LEARNINGS.md`, `CHANGELOG.md`
- **Risk:** Low
- **Sub-tasks:**
  - [ ] Step 1: Create .brain/ directory with 6 files
  - [ ] Step 2: Add loadBrainContext() to server.js
  - [ ] Step 3: Inject brain context into buildPromptContext()
  - [ ] Step 4: Add logSiteBuild() — fire-and-forget in finishParallelBuild()
  - [ ] Step 5: Documentation updates
- **Verification:**
  - [ ] `ls -la .brain/` shows 6 files
  - [ ] Brain loads into session (test with console.log, then remove)
  - [ ] `npm test` passes (62 tests)
  - [ ] After a site build, new line appears in .brain/site-log.jsonl
- **Notes:**

**Phase 0 checkpoint:** `git tag phase-0-complete` — all 62 tests pass

---

### Phase 1 — UX Shell (6-8 hours total)

#### Wave 1-A — Three-Mode Navigation Shell
- **Status:** `[ ]`
- **Dependencies:** Phase 0 complete (needs renamed tab labels from 0-A)
- **Files:** `site-studio/public/index.html`
- **Risk:** Medium
- **Verification:**
  - [ ] Three mode buttons visible (Create / Ship / Grow)
  - [ ] Each mode shows only its tabs
  - [ ] Mode persists on refresh (localStorage)
  - [ ] `npm test` passes (62 tests)
- **Notes:**

#### Wave 1-B — Three-Panel Layout
- **Status:** `[ ]`
- **Dependencies:** Wave 1-A complete
- **Files:** `site-studio/public/index.html`
- **Risk:** Medium
- **Sub-tasks:**
  - [ ] Map existing div hierarchy before restructuring
  - [ ] Restructure HTML into panel-left / panel-center / panel-right
  - [ ] Implement drag-to-resize with localStorage persistence
  - [ ] Mobile responsive stacking below 1024px
  - [ ] Verify all existing interactions work in new layout
- **Verification:**
  - [ ] Three distinct visual zones (chat / workspace / preview)
  - [ ] All existing functionality works
  - [ ] Panel resize works with drag handle
  - [ ] Widths persist on refresh
  - [ ] Mobile stacks correctly below 1024px
  - [ ] `npm test` passes (62 tests)
- **Notes:**

#### Wave 1-C — Plan > Confirm > Execute
- **Status:** `[ ]`
- **Dependencies:** Wave 1-B complete
- **Files:** `site-studio/server.js`, `site-studio/public/index.html`, `site-studio/tests/unit.test.js`
- **Risk:** Medium
- **Sub-tasks:**
  - [ ] Part 1: server.js — generatePlan(), execute-plan handler, routeToHandler(), plan_mode setting
  - [ ] Part 2: index.html — plan card renderer, approve/cancel functions, Plan Mode toggle
  - [ ] Part 3: unit tests — plan generation and stale entry cleanup
- **Verification:**
  - [ ] Plan card appears before layout_update/major_revision/restyle/build
  - [ ] Editing textarea changes the instruction
  - [ ] Approve starts build, Cancel stops it
  - [ ] Plan Mode toggle in settings works
  - [ ] `npm test` passes (62 → 66 tests)
- **Notes:**

**Phase 1 checkpoint:** `git tag phase-1-ux-stable`

---

## Tier 2 — Build After Stabilization

### Phase 1.5 — Embedded Terminal (4-6 hours)

- **Status:** `[ ]`
- **Dependencies:** Phase 1 tagged + at least 1 site built with new layout
- **Files:** `site-studio/server.js`, `site-studio/public/index.html`, `site-studio/package.json`
- **Risk:** Medium-high (native compilation)
- **Sub-tasks:**
  - [ ] Step 1: Install node-pty, xterm, verify native compilation
  - [ ] Step 2: Terminal backend (PTY lifecycle, inject/resize endpoints, WS upgrade)
  - [ ] Step 3: Terminal UI tab (xterm.js, createTerminal, startClaudeSession, sendToTerminal)
- **Verification:**
  - [ ] Terminal tab works, `ls` shows famtastic directory
  - [ ] "Start Claude" launches claude interactive session
  - [ ] "Send to Terminal" from plan card works
  - [ ] `npm test` passes (66 tests)
- **Notes:**

**Phase 1.5 checkpoint:** `git tag phase-1-terminal-complete`

### Phase 2-A — SQLite Session Storage (3-4 hours)

- **Status:** `[ ]`
- **Dependencies:** Phase 1.5 tagged + at least 2 real sites built
- **Files:** `site-studio/lib/db.js` (new), `site-studio/server.js`, `site-studio/public/index.html`, `site-studio/tests/unit.test.js`, `site-studio/package.json`
- **Risk:** Low
- **Sub-tasks:**
  - [ ] Install better-sqlite3
  - [ ] Create lib/db.js with schema, session ops, build logging, analytics queries
  - [ ] Wire db.js into server.js (startSession, token updates, endSession, finishParallelBuild)
  - [ ] Add API endpoints (GET /api/session-history, GET /api/portfolio-stats)
  - [ ] Update Insights tab with portfolio stats
  - [ ] Unit tests (6 new using in-memory DB)
- **Verification:**
  - [ ] Records exist in ~/.config/famtastic/studio.db after session
  - [ ] `npm test` passes (66 → 72 tests)
- **Notes:**

**Phase 2-A checkpoint:** `git tag phase-2a-complete`
**HARD GATE:** Build 5+ sites before proceeding to Tier 3

---

## Tier 3 — Future Roadmap (earn your way in)

### Phase 2-B — Vector Knowledge Base
- **Status:** `[ ]` (unlock: 5+ sites built, 10+ site-log entries)

### Phase 2-C — Automatic Knowledge Extraction
- **Status:** `[ ]` (unlock: Phase 2-B + 50+ vector entries)

### Phase 2-D — Gemini Research Automation
- **Status:** `[ ]` (unlock: core stable 1+ month)

### Phase 3 — Model/CLI Version Intelligence
- **Status:** `[ ]` (unlock: Phase 2-A stable)

### Phase 4 — Extension System (Skills)
- **Status:** `[ ]` (unlock: 10+ sites built)

### Phase 5 — Portfolio Scale
- **Status:** `[ ]` (unlock: 20+ sites with revenue data)

---

## Side Quest: Claude Code --print inside FAMtastic

- **Status:** `[ ]`
- **Goal:** Investigate whether Claude Code can run `--print` commands inside the famtastic ecosystem, headless vs non-headless approaches
- **Notes:**

---

## Test Count Targets

| Checkpoint | Expected Tests |
|---|---|
| Starting baseline | 56 |
| Phase 0 complete | 62 |
| Phase 1 complete | 66 |
| Phase 2-A complete | 72 |

---

## Session Log

| Date | Session | Completed | Notes |
|---|---|---|---|
| 2026-03-31 | Initial | Created tracker, starting Phase 0 | Waves 0-A, 0-B, 0-C launching in parallel |
