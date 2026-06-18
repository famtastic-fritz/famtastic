# SPEC — Tempo v1

## Origin / ambiguity resolution
The intake template arrived **blank** (no app name, purpose, features, or
platform were filled in). Per the build rules ("resolve any ambiguity by
choosing the simplest sensible interpretation and log it; assume and proceed"),
I selected a small, genuinely useful, fully self-contained app and proceeded
without stopping. Every assumption is logged here and in `SUMMARY.md`.

## What Tempo is
**Tempo** is a local-first personal productivity app: a task list combined with
a Pomodoro-style focus timer. You add tasks, run a focus session against a task,
and Tempo logs how much focused time you spent and what you completed today.

- **One-line purpose:** Track your tasks and the focused time you spend on them.
- **Who uses it:** A single individual on their own machine (no auth, no
  multi-user). 
- **Platform:** Web app (local server + browser UI).

## v1 core features (must-have)
1. **Task management (CRUD):** create, list, complete/uncomplete, and delete
   tasks. Tasks persist across restarts.
2. **Focus timer:** start a countdown focus session (default 25 min, configurable
   per request) optionally attached to a task. When a session finishes it is
   logged as focused minutes. Sessions persist.
3. **Today dashboard:** show tasks completed today and total focused minutes
   today, plus active/total task counts.

## Tech decisions (logged)
- **Runtime:** Node.js (>= 18). Verified on v22.
- **Server:** Node built-in `http` module — no Express, no framework.
- **Storage:** single JSON file at `data/tempo.json`. Simple, transparent,
  zero native dependencies. (Chosen over SQLite to avoid native build steps and
  guarantee the sandbox runs with no install and no network.)
- **Frontend:** one static HTML page + vanilla CSS + vanilla JS (`fetch`).
- **Tests:** Node built-in `node:test` + `node:assert`.
- **Dependencies:** none. `npm start` / `npm test` work with no `npm install`.

## Data model
- **Task:** `{ id, title, done, createdAt, completedAt|null }`
- **Session:** `{ id, taskId|null, minutes, startedAt, endedAt }`
- Storage file shape: `{ version, tasks: [], sessions: [] }`

## Out of scope for v1 (logged)
- Authentication / multiple users / accounts.
- Cloud sync, hosting, or any external/paid service.
- Recurring tasks, due dates, tags, projects, sub-tasks.
- Notifications / sound / OS integration.
- Editing a task's title after creation (delete + recreate instead).
- Mobile-native build (the web UI is responsive but there is no app store build).

## Success criteria
- `npm start` boots a server with no install step; the UI loads in a browser.
- All CRUD + timer + dashboard flows work end to end against the API.
- `npm test` passes (storage logic + HTTP API).
- App restart preserves data.
