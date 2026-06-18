# ⏱️ Tempo

A local-first **task tracker + Pomodoro focus timer**. Add tasks, run focus
sessions against them, and see how much focused time you logged today.

- **Zero dependencies** — runs on the Node.js standard library alone.
- **No install step, no network, no accounts.** Your data stays in a local
  JSON file (`data/tempo.json`).

> Proof it runs end to end (live API transcript + restart persistence + tests):
> see [`docs/PROOF.md`](docs/PROOF.md).

## Requirements
- Node.js **18+** (tested on 22).

## Run it

```bash
cd tempo
npm start
```

Then open **http://localhost:4321** in your browser.

Pick a different port with the `PORT` env var:

```bash
PORT=8080 npm start
```

## Use it
1. **Add tasks** in the Tasks panel (type, press Enter).
2. **Check them off** when done — completions count toward "Today".
3. **Run a focus session**: choose a length (default 25 min), optionally pick a
   task to work on, and press **Start**. When the countdown hits zero the
   session is logged automatically and your focus minutes update. **Stop**
   cancels without logging.
4. The **Today** panel shows focus minutes, tasks completed, and active tasks.

## Test

```bash
npm test
```

Runs 22 tests (storage logic + HTTP API) via Node's built-in test runner.

## How it works
- `src/store.js` — JSON-file data layer (CRUD, sessions, stats, atomic writes,
  corrupt-file recovery).
- `src/server.js` — `http`-module server: REST API + static file serving.
- `public/` — the single-page UI (vanilla HTML/CSS/JS).

### API
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | liveness check |
| GET | `/api/stats` | today's focus minutes, completions, active/total counts |
| GET | `/api/tasks` | list tasks (newest first) |
| POST | `/api/tasks` | create `{ title }` |
| GET | `/api/tasks/:id` | get one task |
| PUT | `/api/tasks/:id/done` | set `{ done }` |
| DELETE | `/api/tasks/:id` | delete a task |
| GET | `/api/sessions` | list logged focus sessions |
| POST | `/api/sessions` | log `{ minutes, taskId? }` |

## Extending it
See `SUMMARY.md` for logged assumptions and concrete extension ideas
(due dates, tags, weekly stats, SQLite storage, multi-user/auth).

## Scope
See `SPEC.md` for the full v1 scope and what was intentionally left out.
