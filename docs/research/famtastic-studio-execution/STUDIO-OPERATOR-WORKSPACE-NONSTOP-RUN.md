# Studio Operator Workspace — Non-Stop Run Plan

**Branch:** `research/studio-intelligence-foundation-20260508`
**Date:** 2026-05-08
**Status:** active

## Goal

Ship a redesigned Studio operator surface (the "Operator Workspace") that
consumes the Slice 3/4 intelligence substrate, renders the eight requested
zones, and proves out the operator flow that ends at MBSH V2 refinement
readiness — without expanding `site-studio/server.js`.

## Constraints honored

- Existing Studio chat/terminal UI in `index.html` stays untouched.
- New surface ships at `/operator.html` (served from existing static mount).
- All new server logic lives in `site-studio/server/` modules; `server.js`
  diff is ≤ 1 new `app.use(...)` line OR zero (extend the existing
  intelligence router instead).
- No paid/cloud calls, no DNS/payment/deploy, no destructive actions.
- MBSH V2 is shown as a refinement target on already-built production —
  not a fresh build.

## Architecture

| Layer | Files | Notes |
|---|---|---|
| UI shell | `public/operator.html` | single page, hash routing, no framework |
| Styles | `public/css/operator.css` | scoped to operator workspace |
| App logic | `public/js/operator.js` | fetches `/api/intelligence/*`, renders zones |
| Server (read) | `server/intelligence-routes.js` (extended) | adds `/sites` and `?tag=` override |
| Server (read) | `server/intelligence-reader.js` (extended) | adds `listSites()` |

Net `server.js` diff: **0 lines** (intelligence router already mounted).

## Stage sequence

1. Shell + zones + selectors + status bar
2. Intelligence (Brief, Recipe, Research summary, V2 readiness summary)
3. Control (Capability Truth, Run Ledger, Proof Packet, Cost/Approval, Blockers)
4. Creation (Component Studio, Media Library, Design System/Critics, Gap Tracking)
5. Guide (Shay Desk + Readback modes, Learning Candidates, Training hook)
6. Visual Map / Flow
7. Workflow integration smoke (operator flow end-to-end)
8. MBSH V2 refinement readiness gate panel

## Validation gates

- B1 vitest run: ≥ 71 tests pass (no new regressions)
- B2 server module load: clean
- Reader/writer smoke: cost cap, traversal rejection
- Operator route smoke: `/api/intelligence/sites`, `/brief?tag=…`,
  `/capability-truth?tag=…`, `/runs?tag=…`, `/runs/:runId?tag=…`
- DOM smoke: `/operator.html` loads, all 8 zones present, all 4 intelligence
  routes consumed at least once
- `git diff --check` clean

## Stop policy

Per `UNATTENDED-RUN-CONTROLLER.md`. No new behaviors add to the stop list.
