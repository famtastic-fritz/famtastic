# SUMMARY — Tempo

## What I built
**Tempo** — a local-first task tracker combined with a Pomodoro focus timer,
delivered as a runnable web app with **zero third-party dependencies**.

- **Backend** (`src/`): a Node `http` server exposing a small REST API and a
  JSON-file data layer with atomic writes and corrupt-file recovery.
- **Frontend** (`public/`): a responsive single-page UI — task list (add /
  complete / delete), a countdown focus timer that logs minutes on completion,
  and a "Today" dashboard (focus minutes, completions, active tasks).
- **Tests** (`test/`): 22 tests across the storage logic and the HTTP API, all
  passing via Node's built-in test runner.
- **Docs**: `SPEC.md`, `README.md`, `SETUP.md`, `SANDBOX.md`, `docs/PROOF.md`,
  and an append-only `PROGRESS.md`.

It runs with one command (`npm start` → http://localhost:4321), needs no
install, no network, and no credentials. Verified end to end (see
`docs/PROOF.md`): created a task, completed it, logged a 25-minute session,
confirmed stats, served the UI, and confirmed data survives a restart.

## Every assumption logged
1. **The intake template was blank.** No app, purpose, features, platform, or
   tech were specified. I chose the simplest genuinely-useful self-contained
   app (task tracker + focus timer) and proceeded without stopping, as the
   build rules instruct.
2. **Single user, no auth.** Local personal tool; no accounts or multi-user.
3. **Web app platform** (local server + browser) — most demonstrable and
   universally runnable.
4. **Zero dependencies / JSON storage.** Chosen over Express + SQLite so the
   sandbox runs with no `npm install`, no native build, and no network — the
   most robust default for an isolated environment. Trade-off: JSON storage is
   fine for a single user but won't scale to large datasets or concurrent
   writers.
5. **Default focus length 25 min**, adjustable 1–180 per session.
6. **Deleting a task keeps its logged focus time** (sessions are detached, not
   deleted) so historical focus minutes stay accurate.
7. **No task title editing** in v1 (delete + recreate).
8. **"Today" is by server local date** (`toISOString` UTC day). For a
   single-machine local app this matches the user's day closely enough; true
   timezone handling was deferred.
9. **Sandbox vs. branch reconciliation.** The brief asked for "its own git
   repo"; the session harness requires committing to an existing feature
   branch. Resolved by keeping all files isolated under `tempo/` while
   version-controlling it as a subdirectory of the parent repo (a nested
   `.git` would have blocked the required push). See `SANDBOX.md`.

## How to extend it
- **Storage swap:** `src/store.js` is the only file that touches persistence.
  Replace the JSON layer with SQLite (`better-sqlite3`) or Postgres by keeping
  the same method signatures (`listTasks`, `createTask`, `logSession`, …).
- **Richer tasks:** add `dueDate`, `tags`, `priority`, or `notes` fields to
  `createTask` + the task object, then surface them in `public/`.
- **Edit tasks:** add a `PATCH /api/tasks/:id` route + an inline-edit affordance
  in `renderTasks()`.
- **History & trends:** the `sessions` array already records `startedAt`/
  `endedAt`; add a `/api/stats/week` endpoint and a small chart.
- **Pause/resume timer & desktop notifications:** extend the `timer` object in
  `public/app.js` (the server already accepts arbitrary `minutes`).
- **Multi-user / auth:** would require a real datastore + session handling —
  intentionally out of v1 scope.

## Open questions (only if there's a next iteration)
1. Was a blank template intentional (you wanted me to pick the app), or did you
   mean to specify one — and if so, should I rebuild to that spec?
2. Should "today" follow the browser's timezone rather than the server's UTC
   day?
3. Which extension matters most next — task editing, due dates/tags, or
   weekly focus trends?
