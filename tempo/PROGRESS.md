# PROGRESS

Append-only log of build phases.

## Phase 1 — SPEC + Sandbox
- Created `tempo/` sandbox with `src/ public/ test/ data/`.
- Wrote `SANDBOX.md` (isolation guarantees) and `SPEC.md` (v1 scope).
- Intake template was blank → chose **Tempo** (task list + Pomodoro focus
  timer, web app, zero deps). Decision logged in SPEC.md.
- Added `package.json` (scripts only, no deps) and `.gitignore`.

## Phase 2-3 — Scaffold + Build
- `src/store.js`: JSON persistence, atomic writes, corrupt-file recovery,
  task CRUD, session logging, today-stats.
- `src/server.js`: zero-dep `http` server, REST API (`/api/health|stats|tasks|sessions`),
  static file serving with path-traversal guard. `createApp/createServer` are
  injectable with a Store for tests.
- `public/`: responsive single-page UI (tasks, focus timer, today dashboard),
  vanilla JS + CSS, dark theme, toast notifications.

## Phase 4 — Test
- `test/store.test.js` (14) + `test/api.test.js` (8) → 22 tests, all passing.
- Fixed `npm test` script: `node --test test/*.test.js` (directory arg was
  being treated as a module path).
- Covered: CRUD, validation, done/undone, delete-detaches-sessions, stats
  day-filtering, persistence across instances, corrupt-file recovery, HTTP
  status codes, invalid JSON, path-traversal block, static serving.
