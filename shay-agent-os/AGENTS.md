# AGENTS.md — Shay Agent OS Cross-Agent Context

Last updated: 2026-05-27 by Agent C (dashboard shell)

## System Architecture

Shay Agent OS is a multi-agent orchestration platform built on a fork of Rowboat (Electron + React 19 + Vite 7 + TailwindCSS v4). It runs local LLMs via Ollama and uses Redis for message passing between agents.

```
~/famtastic/shay-agent-os/
├── rowboat-base/          # Forked Rowboat (Electron app, renderer, shared, core, preload)
├── components/
│   └── dashboard/         # React dashboard shell (Vite + React 19 + Tailwind v4)
├── skills/                # Agent skill definitions
├── state/
│   └── build-state.json   # Build coordination state
├── logs/                  # Agent execution logs
└── AGENTS.md              # This file
```

## Component Locations

### Dashboard Shell
- **Path**: `~/famtastic/shay-agent-os/components/dashboard/`
- **Stack**: Vite 6, React 19, TailwindCSS v4, Zustand, Lucide React
- **Entry**: `src/main.tsx` → `src/App.tsx`
- **Key Components**:
  - `src/components/Sidebar.tsx` — Left pane: agent list (orchestrators + workers), status indicators, trust mode selector
  - `src/components/Workspace.tsx` — Center pane: goal input, active tasks, results display
  - `src/components/ActivityPanel.tsx` — Right pane: activity feed (logs, heartbeats, errors), system metrics
  - `src/components/CommandBar.tsx` — Bottom bar: accepts `/goal`, `/subgoal`, `/trust`, `/status` commands
  - `src/hooks/useDashboardStore.ts` — Zustand store for agents, tasks, events, metrics, trust mode
- **Build**: `cd components/dashboard && npm install && npm run build`
- **Dev**: `cd components/dashboard && npm run dev` (port 5174)

### Rowboat Base
- **Path**: `~/famtastic/shay-agent-os/rowboat-base/`
- **Renderer**: `apps/x/apps/renderer/src/` — Main Electron React app
- **Shared**: `apps/x/packages/shared/` — Shared types and utilities
- **Core**: `apps/x/packages/core/` — Core business logic
- **Build**: `cd apps/x && npm run deps` (builds shared, core, preload)

## API Endpoints

Currently the dashboard is a standalone UI shell. Integration endpoints TBD:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | List all agents with status |
| `/api/agents/:id/heartbeat` | POST | Agent heartbeat ping |
| `/api/tasks` | GET/POST | List or create tasks |
| `/api/tasks/:id` | PATCH | Update task status |
| `/api/events` | GET/POST | Stream or log events |
| `/api/metrics` | GET | System metrics snapshot |
| `/api/trust` | GET/PUT | Get or set trust mode |

Planned transport: WebSocket for real-time events, HTTP REST for commands.

## Config Files

| File | Purpose |
|------|---------|
| `components/dashboard/package.json` | Dashboard dependencies and scripts |
| `components/dashboard/vite.config.ts` | Vite build config with Tailwind v4 |
| `components/dashboard/tsconfig.json` | TypeScript config |
| `state/build-state.json` | Cross-agent build coordination |
| `rowboat-base/apps/x/package.json` | Rowboat workspace config |

## Trust Mode Rules

The dashboard supports three trust modes, enforced at the orchestrator level:

1. **supervised** (default): All agent actions require human approval. The orchestrator queues actions and waits for explicit go-ahead before delegating to workers.
2. **autonomous**: Agents act independently within their scope. The orchestrator delegates without blocking. Human can intervene or override.
3. **locked**: All agent activity is paused. No new tasks are started. Running tasks may be gracefully stopped or left to complete depending on policy.

Trust mode is stored in `useDashboardStore` and should be synchronized with the orchestrator via `/api/trust`.

## How to Resume a Failed Build

1. **Check build-state.json**: `cat ~/famtastic/shay-agent-os/state/build-state.json`
2. **Identify failed component**: Look for `"status": "failed"` or `"status": "in_progress"` with old timestamp.
3. **Read the component log**: `cat ~/famtastic/shay-agent-os/logs/agent-<LETTER>-<COMPONENT>.log`
4. **Fix the issue**: Navigate to the component directory and address the error.
5. **Rebuild**:
   - Dashboard: `cd components/dashboard && npm install && npm run build`
   - Rowboat deps: `cd rowboat-base/apps/x && npm run deps`
   - Rowboat renderer: `cd rowboat-base/apps/x/apps/renderer && npm run build`
6. **Update state**: Edit `state/build-state.json` to mark component `"status": "complete"`.
7. **Log the recovery**: Append to the component log with timestamp and resolution.

## Agent Coordination Notes

- Agent check-in is **paused by default** per repo AGENTS.md. Do not run `node scripts/agent-checkin.js` unless Fritz explicitly requests multi-agent coordination.
- Use lightweight human-readable notes in plans/captures instead.
- No plan may stay `status: active` with zero open tasks for more than one session. Run `node scripts/plans/audit.js` at session end.

## Local LLM Models (Ollama)

| Model | Size | Role |
|-------|------|------|
| `hermes3:latest` | 4.7 GB | General reasoning |
| `qwen2.5:1.5b` | 986 MB | Fast worker tasks |
| `phi4-mini:latest` | 2.5 GB | Review / analysis |

Redis is installed via Homebrew and running as `homebrew.mxcl.redis`.

## Quick Commands

```bash
# Dashboard dev server
cd ~/famtastic/shay-agent-os/components/dashboard && npm run dev

# Dashboard production build
cd ~/famtastic/shay-agent-os/components/dashboard && npm run build

# Check Redis
redis-cli ping

# Check Ollama
ollama list

# View logs
ls ~/famtastic/shay-agent-os/logs/
```
