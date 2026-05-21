# Slice 2 — Server Modularization First Safe Extraction (Plan + Proof)

**Status:** plan complete, no behavior changed
**Date:** 2026-05-08
**Branch:** `research/studio-intelligence-foundation-20260508`
**Scope:** docs only. No edits to `site-studio/server.js`.

## 1. Why this slice

`site-studio/server.js` is 20,150 lines. Slice 3+ will need to surface the
Slice 1 contracts (Intelligence Brief, Run Ledger, Proof Packet, etc.) inside
Studio. Adding any of that behavior straight into `server.js` is exactly the
"major backend growth" the controller stops on. Slice 2 establishes the safe
extraction contract so later slices can land read paths in a sibling module
instead.

## 2. Baseline commands (must pass before any extraction lands)

Run from repo root unless noted.

| # | Check | Command | Pass criteria |
|---|---|---|---|
| B1 | Studio test suite | `cd site-studio && npm test` | exits 0 |
| B2 | Server module loads | `cd site-studio && node -e "require('./server.js'); setTimeout(()=>process.exit(0),250)"` | no throw, exits 0 |
| B3 | Server boots | `launchctl list \| grep famtastic` | `com.famtastic.studio` present, PID > 0 |
| B4 | Health route | `curl -fsS http://127.0.0.1:4173/api/health` | HTTP 200, JSON parses |
| B5 | Spec route | `curl -fsS http://127.0.0.1:4173/api/spec` | HTTP 200, JSON parses |
| B6 | Studio state route | `curl -fsS http://127.0.0.1:4173/api/studio-state` | HTTP 200, JSON parses |
| B7 | Pages list | `curl -fsS http://127.0.0.1:4173/api/pages` | HTTP 200, JSON parses |
| B8 | Static asset reachable | `curl -fsS -o /dev/null -w '%{http_code}' http://127.0.0.1:4173/` | 200 |
| B9 | WebSocket reachable | `node -e "const W=require('ws');const s=new W('ws://127.0.0.1:4173');s.on('open',()=>{console.log('ok');s.close()});s.on('error',e=>{console.error(e.message);process.exit(1)})"` | prints `ok` |

> Studio is launchd-managed. Never start it manually. Use
> `launchctl stop com.famtastic.studio` to recycle if needed.

## 3. Route smoke checklist (covers extracted helper safety)

Smoke set used both before and after each extraction. All must remain identical.

```text
GET  /api/health
GET  /api/config
GET  /api/spec
GET  /api/site-info
GET  /api/pages
GET  /api/templates
GET  /api/studio-state
GET  /api/server-info
GET  /api/session-history
GET  /api/portfolio-stats
GET  /api/history
GET  /api/assets
GET  /api/uploads
GET  /api/character-branding
GET  /api/cdn-injections
GET  /api/versions
GET  /api/deploy-info
GET  /api/logs/tail
```

Capture each as `proof/route-<name>.before.json` and `.after.json` under
`docs/research/famtastic-studio-execution/slice-2-server-modularization/proof/`
when the first real extraction runs. (Slice 2 is plan-only; proof dir is
created empty so Slice 3+ can populate it.)

## 4. First extraction target

**Module:** `site-studio/server/validators.js`

**Why this is the safest first move:**

- pure functions, no I/O, no app/express coupling
- already isolated by function boundary in current `server.js`
- no callers outside this file rely on private internals
- failure surface is small: bad import = boot failure caught by B2/B3
- enables Slice 3 to introduce a sibling module pattern with zero risk

**Functions to extract (verbatim signatures):**

| Source line | Function | Notes |
|---|---|---|
| `server.js:284` | `isValidPageName(name)` | string predicate |
| `server.js:416` | `sanitizeSvg(svgContent)` | string transform |
| `server.js:10976` | `validateAgentHtml(html, page)` | string predicate |

**Extraction recipe:**

1. Create `site-studio/server/validators.js` exporting the three functions
   verbatim. No refactor, no rename, no behavior change.
2. Replace the three function declarations in `server.js` with:
   `const { isValidPageName, sanitizeSvg, validateAgentHtml } = require('./server/validators');`
3. Run B1 → B9 plus the route smoke checklist. Diff before/after JSON.
4. Land as a single commit prefixed `refactor(studio):` — separate from any
   feature work.

## 5. Stop / non-stop rules for this track

Stop and escalate if any of these are true during extraction:

- B1 fails with a new error
- any route in §3 changes status code or response shape
- WebSocket B9 fails to connect
- Studio launchd entry exits with non-zero code repeatedly (>3 in 60s)
- import cycle between `server.js` and `server/validators.js`

Continue automatically if:

- all checks pass
- diff is purely structural (function moved, no logic edited)

## 6. What this slice does NOT do

- does not extract any route
- does not change WebSocket wiring
- does not touch agent runner, build pipeline, or Shay code
- does not introduce new dependencies
- does not run paid/cloud APIs

Future slices will sequence Phase 1 → Phase 4 from
`server-modularization-plan.md`. This file is the contract for Phase 1
step 1 only.

## 7. Proof artifacts produced by this slice

- this plan document
- `proof/` directory placeholder (populated when Phase 1 step 1 actually runs)
- updated `RUN_STATUS.md` entry
