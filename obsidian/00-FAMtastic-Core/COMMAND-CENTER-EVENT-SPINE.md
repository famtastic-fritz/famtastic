# Command Center — the Event Spine (built 2026-06-05)

> One board, one truth. This is the architecture + status for Shay's command center:
> the place Fritz sees activity from EVERY surface (Shay's swarm + external Claude
> Code / Codex / Gemini sessions) without picking a single surface to live in.
> Built on this branch; ready for the Mac/Shay session to run and extend.

## The decision (answered, verified against code)

Fritz asked Shay two questions; the answers were verified by reading the repo, not assumed:

1. **"Is there a Web UI / Workspace dashboard already, or greenfield?"**
   → **Not greenfield.** A real three-pane command center already exists at
   `shay-agent-os/components/dashboard/` (React + Zustand + Tailwind + lucide).
   It has the Sidebar (agents), ActivityPanel (event feed), Workspace + CommandBar,
   and a trust-mode toggle. It fetches from a real FastAPI backend on **:8643**.
   The **Shay Web** (hermes-webui) and **Shay Workspace** (hermes-workspace) surfaces
   are *chat canvases*, NOT the command center — don't conflate them.
   The one real gap was that `/api/events` was a **stub returning `[]`**.

2. **"Event feed: just Shay, or the whole fleet?"**
   → **The fleet.** The dashboard's data model is already fleet-wide
   (`Agent.role`, `ActivityEvent.agentId`, per-agent counts). External agents
   (Claude Code/Codex/Gemini) already leave a trace as **session notes** under
   `obsidian/05-Captures/sessions/`, so fleet-wide needs no new instrumentation
   in those tools — just a bridge that folds notes + git into the spine.

## What got built this session

### 1. The spine — `shay-agent-os/api/event_log.py`
Append-only JSONL at `~/.shay/events.jsonl` (override `$SHAY_EVENTS_LOG` /
`$SHAY_HOME` for tests + the cloud container that has no `~/.shay`). Multi-writer
safe via `fcntl.flock`. Schema matches the dashboard's `ActivityEvent` 1:1:
`{ id, timestamp, type, agentId, message, severity, source, meta? }`.
- `emit(...)` — best-effort append (never crashes a task path), returns the event.
- `read_tail(limit, newest_first)` — backlog for GET.
- `read_since(offset) -> (new_offset, events)` — whole-line incremental read; the
  WS follower's primitive. Handles truncation/rotation (offset past EOF → restart).
- Convenience: `task_start/task_complete/task_fail/system`.
- Tests: `shay-agent-os/tests/test_event_log.py` (run
  `SHAY_EVENTS_LOG=/tmp/t.jsonl python3 tests/test_event_log.py`) — **passing**.

### 2. The endpoint — `shay-agent-os/api/routes/events.py`
- `GET /api/events?limit=N` → newest-first events from the spine + message-bus
  health (channels/listeners/queue) folded in. **No longer a stub.**
- `POST /api/events` → any surface appends `{type,message,severity,agentId,source}`;
  also live-broadcasts to WS clients.

### 3. Live stream — `shay-agent-os/api/server.py`
A background `_event_follower()` (started in `lifespan`) polls the spine via
`read_since` every 1s and pushes new lines to all `/ws/events` clients (portable,
works regardless of which process wrote the line). Emits a `system` event on boot.
Light emitters added: `/api/heartbeat`, task submit, goal start.

### 4. Dashboard wiring — `components/dashboard/`
- `useDashboardStore.ts`: `fetchEvents()` (loads backlog) + `connectEventStream()`
  (WS subscribe, prepend each event, auto-reconnect w/ backoff, ignores `ack` frames).
- `App.tsx`: on mount, load backlog then open the stream; agents/tasks still poll 5s,
  the **feed is push**. Typecheck (`tsc -b`) + `vite build` both green; `dist/` rebuilt.

### 5. Fleet bridge — `scripts/brain/fleet-events-bridge.js`
Folds external-agent activity into the SAME spine. Reads session-note frontmatter
(`session_id/short_id/agent/branch/status`) + git commits, emits normalized events,
idempotent via `~/.shay/fleet-bridge-cursor.json` (session mtimes + last sha).
Read-only on the vault, append-only on the spine. Tested: 78 events first run,
0 on re-run. **Run on a cron (every ~2 min) or on demand:** `node scripts/brain/fleet-events-bridge.js`.

### 6. Phone ↔ dashboard bridge — `shay-phone/server.py`
The phone (:8787) was a **separate island** with its own data (asks/jobs/brief) and
NEVER touched the spine. Now it reads + writes the SAME `~/.shay/events.jsonl`:
- **Write:** `emit_event()` fires from every phone write-action — `dispatch_job`,
  `create_ask`, `answer_ask`, `answer_interview`, `job_progress/complete/cancel`.
  So *start a job on the phone → the dashboard's live feed shows it* (proven
  cross-process: phone writes, agent-os `event_log.read_tail()` reads them,
  tagged `source:"phone"`).
- **Read:** `GET /api/feed?limit=N` (+ `read_feed()`) returns the same events the
  dashboard streams, so the phone can render the identical activity feed.

## Fritz's spec (2026-06-05) — "phone = a window into the one system"
> "phone as an interface of my workspace/UI/dashboard. check crons + kanban, if Shay
> has a question I answer on my phone, if I start a job from my phone it reflects
> everywhere." → **One backend, many windows.** Not three apps; one system, mirrored.

The reality found: there are **4** overlapping front-ends/backends — `command-center/`
(Node hub + `agents-registry.json`, revenue/process/ideas), `shay-agent-os` React
dashboard (:8643, agents/tasks/events/trust), `shay-phone` (:8787, asks/jobs/brief/
chat/capture), and a stale `companion-app/`. They each held a *private truth* (e.g.
phone's "6/15 agents" comes from `agents-registry.json`; the dashboard's agent count
comes from the live orchestrator — they can't agree). The spine is the convergence
substrate; the work below makes them one system.

## Per-surface rendering (Shay had this right)
- **Web UI / Workspace (rich):** the three-pane dashboard, real-time via WS. ✅ done.
- **Phone (rich-ish window):** now bridged to the spine both ways (✅ feed in/out);
  still needs a feed TAB in `shay-phone/web/index.html` + crons/kanban sections.
- **Telegram (push channel, not a canvas):** push on state-changes, `/board /jobs
  /feed` text snapshots, morning digest. **← still to build.**

## Status / what's left (honest)
- [x] Spine, endpoint, WS follower, dashboard wiring, fleet bridge — built + gated.
- [x] **Phone bridged to the spine** — emits on all write-actions + `/api/feed` read.
- [ ] **Phone UI:** add an Activity/Feed tab to `web/index.html` that polls `/api/feed`
      (the backend half is done; the rendering half remains).
- [ ] **One agents truth:** dashboard + phone must read agents from the SAME source.
      Today: dashboard=live orchestrator, phone=`command-center/data/agents-registry.json`.
      Pick one (recommend: orchestrator emits heartbeats into the registry, or both read
      a unified `/api/state`) so the counts finally agree.
- [ ] **Crons:** no surface shows them. Add a collector (read `crontab -l` + the
      `shay-agent-os/cron` + `scripts/*cron*` definitions) → `/api/crons` on both.
- [ ] **Kanban:** not built as a live board (only research notes exist). Decide store
      (kanban.db / JSON lanes), expose `/api/kanban`, render on dashboard + phone, and
      emit lane-moves to the spine.
- [ ] Install the fleet bridge on a cron on the Mac (so external sessions show live).
- [ ] Worker-pool completion emitters (agent-os side emits on submit/goal-start only).
- [ ] Telegram alerting layer + `/board /jobs /feed` + daily digest.
- [ ] `~/.shay/events.jsonl` rotation before it grows unbounded.

## Run it (Mac)
```bash
# backend (serves dashboard data + WS on :8643)
cd ~/famtastic/shay-agent-os && python3 -m api.server      # or however api.server is launched
# dashboard dev
cd components/dashboard && npm run dev                       # vite :5174
# fleet bridge (one-shot; add to cron for live fleet view)
node ~/famtastic/scripts/brain/fleet-events-bridge.js
```
