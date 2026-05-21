# Parallel Studio → MBSH V2 Controller

**Branch:** `research/studio-intelligence-foundation-20260508`
**Status:** active controller
**Purpose:** Define how the next FAMtastic Studio continuation runs as a
parallel subagent workflow, not a single serial task. The end condition is
a **local MBSH V2 visual/layout/functionality refinement proof run** with
proof packet, run ledger, learning capture, and zero production deploy.

## 1. Lead orchestrator role

The `studio-orchestrator` subagent owns the run end-to-end:

- reads the current state (latest run reports, RUN_STATUS, controller, this file)
- dispatches Lanes A–F **in parallel** via single-message multi-Agent calls
- collects each lane's structured return summary
- arbitrates cross-lane file conflicts (see §3)
- triggers the Integration lane after A–F all return non-blocked
- triggers the Proof / QA lane only after Integration confirms clean state
- writes the final report from the template at
  `PARALLEL-STUDIO-TO-MBSH-V2-RUN-REPORT-TEMPLATE.md`

The orchestrator never writes feature code. It writes status updates and
the final report only.

## 2. Parallel lane model

Six feature lanes run in parallel:

| Lane | Agent | Owns |
|---|---|---|
| A | `studio-operator-ui-agent` | Operator UI hardening (`/operator.html`) |
| B | `studio-action-layer-agent` | Safe POST action layer (`/api/intelligence/actions/*`) |
| C | `component-studio-agent` | Component inventory + check-existing + slot contract |
| D | `media-library-agent` | Media registry contract + read route |
| E | `shay-guide-training-agent` | Shay readback modes + learning summary + next-action view |
| F | `visual-refinement-agent` | Local before/after refinement plumbing |

Then two serialized lanes:

| Lane | Agent | Owns |
|---|---|---|
| Integration | `studio-orchestrator` | merge, conflict resolve, route/data consistency |
| Proof / QA | `proof-qa-agent` | tests, smokes, MBSH V2 refinement proof run |

## 3. File ownership boundaries

Lanes share **no** write surface. The integration lane resolves any overlap.

| File / directory | Owner | Notes |
|---|---|---|
| `site-studio/public/operator.html` | A (structural shell), B/C/D/E/F (additive nodes only inside their zones) | Lane A holds the spine; others insert within their named panel scope |
| `site-studio/public/css/operator.css` | A | additive only from B–F via class names |
| `site-studio/public/js/operator.js` | A (shell + render loop), B (action wiring), E (readback) | C and D append render functions; D may not edit Lane A's render orchestrator |
| `site-studio/server/intelligence-reader.js` | (locked) | extend only via new sibling files |
| `site-studio/server/intelligence-routes.js` | (locked) | read-only |
| `site-studio/server/intelligence-writer.js` | B | extend only if a missing safe API is needed |
| `site-studio/server/intelligence-actions.js` | B (new) | |
| `site-studio/server/component-inventory.js` | C (new) | |
| `site-studio/server/component-routes.js` | C (new) | |
| `site-studio/server/media-registry.js` | D (new) | |
| `site-studio/server/media-routes.js` | D (new) | |
| `site-studio/server/visual-refinement.js` | F (new) | |
| `site-studio/server/visual-refinement-routes.js` | F (new) | |
| `site-studio/server.js` | B/C/D/F may add **at most one** `app.use(...)` line each; orchestrator may merge them | total new mount lines ≤ 4 |
| `RUN_STATUS.md` | orchestrator + proof | append-only |
| `PARALLEL-STUDIO-TO-MBSH-V2-RUN-REPORT.md` | orchestrator | final write |
| `sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-001/*` | proof | written **only** through the Action Layer |
| `sites/site-mbsh-reunion/.refinement/<runId>/` | F (created); proof (populated) | gitignored working copy |

Forbidden for every lane:

- `.wolf/anatomy.md`
- `site-studio/lib/fam-motion.js`, `lib/fam-shapes.css`,
  `lib/character-branding.js` (CLAUDE.md protected)
- `site-studio/lib/famtastic-skeletons.js` (read-only for C)
- production deploy / DNS / payment surfaces
- shipping company site code
- FAMtastic logo/site code
- direct mutation of `sites/*/dist/*.html`

## 4. Merge / integration sequence

1. Orchestrator dispatches Lanes A–F in parallel (single message,
   multiple Agent tool uses).
2. Each lane returns:
   - files changed (with `git diff --stat`)
   - lane-local proof
   - non-blocker list
   - blocker list (empty for the run to continue)
3. Orchestrator pulls the worktree state, runs `git status` and
   `git diff --check`.
4. If two lanes touched a shared file, orchestrator opens it, applies the
   ownership rule from §3, and re-asks the affected lane for a focused
   patch (no full rerun).
5. Orchestrator updates `server.js`'s mount block once, consolidating
   any new `app.use(...)` lines from B/C/D/F.
6. Integration completes when:
   - `git diff --check` is clean
   - `npm test` parity holds (≥ 71 vitest tests pass)
   - server module loads cleanly
   - Operator Workspace still loads (DOM smoke)
7. Orchestrator dispatches the Proof / QA lane.

## 5. Proof requirements per lane

Each lane MUST return:

- **Lane A**: DOM smoke output (six zones, route consumption count, console
  error count) + `git diff --stat`.
- **Lane B**: list of new POST routes, payload schemas, validation
  rejection examples, tmp-dir ledger smoke output.
- **Lane C**: inventory route 200 with ≥6 entries; check-existing near-match
  example; surgical insertion contract object.
- **Lane D**: registry contract documented; route 200 even with empty
  registry; DOM smoke confirming Media panel reads from route.
- **Lane E**: text snapshots of all four readback modes; learning grouping
  example; "no run selected" graceful fallback.
- **Lane F**: working-copy lifecycle (copy → edit → diff → discard);
  denylist rejection example; `visual_diff` proof entry shape.
- **Integration**: clean `git diff --check`, `git diff --stat` summary,
  `npm test` parity, server module load OK, Operator DOM smoke OK, total
  new `app.use(...)` lines ≤ 4.
- **Proof / QA**: full check matrix (see proof-qa-agent.md), MBSH V2
  refinement proof run with verdict, attached proof packet entries.

## 6. Hard blocker rules

Stop the run and route to Fritz on any of:

- projected cost above `$50`
- required secret/API key missing with no local fallback
- DNS / payment / production deploy / destructive action required
- repo write/build impossible
- safety/security issue
- repeated validation failure after documented retry/fix attempts
- major backend growth in `site-studio/server.js` without modularization path

A lane that hits a hard blocker:
1. logs the blocker in its return summary
2. does NOT attempt a retry beyond two passes
3. surfaces the blocker to the orchestrator, which halts the run

## 7. Non-blocker logging rules

Each lane appends non-blockers to its return summary in the shape:

```
{
  "kind": "convention | pattern | tooling | content | feature",
  "note": "short human description"
}
```

The orchestrator forwards every non-blocker into:

- `RUN_STATUS.md` (append at end of run)
- `non_blockers[]` of the MBSH V2 refinement proof packet
- `Non-blockers:` section of the final report

Non-blockers do NOT stop the run.

## 8. Final end condition

The run is **complete** when:

- Lanes A–F all returned with non-blocker-only outcomes
- Integration confirms `git diff --check` clean and Operator still loads
- A real Run Ledger exists at
  `sites/site-mbsh-reunion/intelligence/runs/mbsh-v2-refinement-001/ledger.json`
  with verdict `pass`
- A real Proof Packet sits next to it with at least:
  - 1 `route_smoke` entry per `/api/intelligence/*` GET
  - 1 `route_smoke` per new POST route
  - 1 `test_run` (vitest)
  - 1 `module_load` (server.js)
  - 1 `visual_diff` entry from Lane F's working-copy refinement
  - 1 `console_log_scan` entry confirming 0 console errors (favicon 404 OK)
- A `learning-candidates.json` file exists with at least 2 candidates
  captured during the run
- The final report `PARALLEL-STUDIO-TO-MBSH-V2-RUN-REPORT.md` exists and
  answers all 18 numbered questions in the template

The run is **NOT** complete just because lanes A–F finished. The MBSH V2
refinement proof run is the meaningful end condition.

## 9. What this run does NOT do

- does not deploy MBSH V2 to production
- does not modify any file under `sites/site-mbsh-reunion/dist/` directly
  (refinement is via the gitignored `.refinement/<runId>/` working copy)
- does not call any paid LLM/image/video provider without Fritz approval
- does not start shipping company or FAMtastic logo/site work
- does not touch `.wolf/anatomy.md`
