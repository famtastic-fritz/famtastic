# Scan B — hermes-webui v0.51 hookpoint scout

**Upstream:** https://github.com/nesquena/hermes-webui
**Cloned to:** `_refs/hermes-webui-v0.51`
**Commit SHA:** `1fcd81e38e271a2ecf167c6b0a18d62febb45a2e` (Merge #3310, release stage-batch7)
**Version per CHANGELOG:** `v0.51.195` (2026-06-01) — newest tag in repo, matches request
**Date:** 2026-06-01

## Architecture snapshot

- **Stack — frontend:** pure vanilla JS + HTML + CSS, no bundler, no framework. Modules in `static/`: `boot.js`, `messages.js`, `sessions.js`, `workspace.js`, `panels.js`, `ui.js`, `commands.js`, `terminal.js`, `onboarding.js`. ESLint runtime-guard is the only dev tooling (`package.json` says: "NOT a build step — the app remains pure Python + vanilla JS").
- **Stack — backend:** Python 3.11+, stdlib `http.server.ThreadingHTTPServer` with a single `BaseHTTPRequestHandler` subclass. No Flask/FastAPI. Entry point is `server.py` (608 lines, thin shell). All business logic in `api/*.py` (~50k LOC across ~45 modules; `api/routes.py` alone is ~14k lines, `api/streaming.py` ~7k, `api/config.py` ~5k).
- **Process model:** single Python process. Server binds default `127.0.0.1:8787`. State lives on disk at `~/.hermes/webui/` (overridable via `HERMES_WEBUI_STATE_DIR`). Per-request profile context via TLS + cookies. Sessions are persisted to JSON/sqlite.
- **Native backend (what it talks to out of the box):** the **Hermes agent** itself — imported in-process as Python modules `hermes_cli`, `hermes_cli.kanban_db`, `hermes_cli.runtime_provider`, `hermes_state.SessionDB`, `hermes_constants`. The WebUI literally `from hermes_cli import kanban_db as kb`. There is no native LLM client in webui itself — the in-process Hermes runtime owns providers, models, tool execution.
- **Auth/CSP:** optional password + signed cookies, passkeys/WebAuthn, CSP report-only. Test-network isolation env var `HERMES_WEBUI_TEST_NETWORK_BLOCK`.

## Native backend interface

- **Routing:** if/elif chains on `parsed.path` inside five top-level dispatchers in `api/routes.py`: `handle_get` (line 4175), `handle_post` (5430), `handle_patch` (7212), `handle_delete` (7230), `handle_put` (7248). ~194 distinct `parsed.path ==` route comparisons + several `parsed.path.startswith()` namespaces (`/api/kanban/`, `/extensions/`, `/session/static/`, `/static/`).
- **Streaming:** SSE (Server-Sent Events) via `Connection: close`. Live chat at `GET /api/chat/stream`. Gateway SSE at `GET /api/sessions/gateway/stream`. Session events at `GET /api/sessions/events`. Approval/clarify streams at `/api/approval/stream`, `/api/clarify/stream`.
- **No WebSocket. No IPC. No GraphQL.** All HTTP/1.1, JSON bodies, plus SSE for streaming and multipart for uploads (`/api/upload`).

### Key endpoints catalogued (Shay-relevant subset)

| Method | Path | Owner module / handler |
|---|---|---|
| POST | `/api/chat/start` | `_handle_chat_start` (routes.py:10029) — primary new-turn entry |
| POST | `/api/chat` | `_handle_chat_sync` (routes.py:10200) — sync turn |
| POST | `/api/chat/steer` | `_handle_chat_steer` (streaming.py:6653) |
| POST | `/api/chat/cancel` | routes.py:5073 |
| GET | `/api/chat/stream` | SSE stream (routes.py:5086 → streaming.py) |
| GET | `/api/chat/stream/status` | routes.py:5060 |
| POST | `/api/terminal/{start,input,resize,close}` | routes.py:6263–6272 → `api/terminal.py` |
| GET | `/api/terminal/output` | routes.py:5089 |
| GET | `/api/skills`, `/api/skills/usage`, `/api/skills/content` | routes.py:5196,5202,5238 → reads `_active_skills_dir()` |
| POST | `/api/skills/save`, `/api/skills/delete`, `/api/skills/toggle` | routes.py:6414–6420 |
| GET | `/api/memory` | `_handle_memory_read` (routes.py:9420) |
| POST | `/api/memory/write` | `_handle_memory_write` (routes.py:12792) |
| GET/POST/PATCH/DELETE | `/api/kanban/*` | `api/kanban_bridge.py` (1255 lines) — delegates to `hermes_cli.kanban_db` |
| GET | `/api/gateway/status` | routes.py:5294 — gateway alive/identity-map probe |
| GET | `/api/sessions/gateway/stream` | gateway SSE bridge |
| GET | `/api/skills/...`, `/api/sessions`, `/api/projects`, `/api/profiles`, `/api/personalities`, `/api/providers`, `/api/models`, `/api/crons/*` | full management surface |
| GET | `/api/system/health`, `/api/health/agent`, `/health` | health probes |
| Static | `/extensions/*`, `/static/*` | extension/asset serving |

## Integration hookpoints (Shay-adapter targets)

The v0.51 repo provides **three pre-built indirection layers** that are *exactly* what you want for a Shay backend swap. These are not patches we'd add — they ship native, default-off, and selected by env var. This is a massive upgrade over v0.11 (which had none).

### Hookpoint 1 — `HERMES_WEBUI_CHAT_BACKEND` (chat-backend selector)

- **File:** `api/gateway_chat.py:36–55` (`webui_chat_backend_mode`, `webui_gateway_chat_enabled`)
- **Env:** `HERMES_WEBUI_CHAT_BACKEND=gateway` switches **browser-originated chat turns** away from the in-process WebUI runtime to an external Hermes-API-server-style HTTP gateway at `HERMES_WEBUI_GATEWAY_BASE_URL` (default `http://127.0.0.1:8642`), authed by `HERMES_WEBUI_GATEWAY_API_KEY` or `API_SERVER_KEY`.
- **Native behavior:** forwards the chat request to that gateway URL and bridges its events back through the same SSE stream the browser already consumes.
- **Shay adapter:** stand up a tiny HTTP server at `http://127.0.0.1:8642` (or any URL) speaking the gateway-chat protocol (look like Hermes API server). On `POST /chat`, call `shay-cli chat <msg>` (or the gateway IPC) and stream tokens/events back. **No webui code change.** Set env var, point at Shay gateway.
- **Risk:** **low** — pure config flip. Needs us to learn the gateway wire protocol (a handful of HTTP+SSE events: start, token, tool_call, done, error). The protocol is exercised by `api/gateway_chat.py` (~440 lines) and a `_gateway_*` family in routes.

### Hookpoint 2 — `HERMES_WEBUI_RUNTIME_ADAPTER` (run-execution adapter)

- **File:** `api/runtime_adapter.py:18–28` plus the wiring at `routes.py:10086–10120` inside `_handle_chat_start`.
- **Modes:**
  - `legacy-direct` (default) — in-process Hermes agent
  - `legacy-journal` — same path + writes a run-journal audit trail (Slice 1)
  - `runner-local` — selects the runner-client boundary (Slice 4)
- **Protocol:** `StartRunRequest` / `RunStartResult` / `RunEventStream` dataclasses; `build_runtime_adapter()` factory picks an implementation.
- **Shay adapter:** implement the `RuntimeAdapter` protocol (start_run / observe / status / cancel / approval / clarify / queue / goal) as a thin shim that calls into shay-agent-os swarm dispatcher. Register it via `build_runtime_adapter`. Sessions, SSE plumbing, cancellation, approval/clarify queues — **all stay in webui's hands**, we just translate run requests.
- **Risk:** **medium** — clean protocol but the adapter contract has ~8 methods. Reference impl is the in-tree `LegacyJournalRuntimeAdapter`.

### Hookpoint 3 — `HERMES_WEBUI_RUNNER_BASE_URL` (runner-client HTTP boundary)

- **File:** `api/runner_client.py` (~400 lines, just added in v0.51.188, 2026-05-31).
- **Env:** `HERMES_WEBUI_RUNNER_BASE_URL` + `HERMES_WEBUI_RUNNER_API_KEY`.
- **Behavior:** when set, the `runner-local` adapter delegates the entire run to a **supervised external runner** over a small JSON-HTTP transport. WebUI process no longer owns the agent run at all — it's just a UI + SSE bridge.
- **Shay adapter:** the cleanest, newest, default-off seam. Stand up a Shay "runner" HTTP service exposing the runner-client endpoints. WebUI calls Shay → Shay drives `shay-cli` / swarm / gateway → Shay streams events back. WebUI never imports Hermes Python modules in this mode.
- **Risk:** **low–medium**. This is the future-proof option. RFC: `hermes-run-adapter-contract` (tracked in repo issue #1925). Slice 4c/4d landed last week.

### Hookpoint 4 — `HERMES_WEBUI_EXTENSION_DIR` (frontend extension surface)

- **File:** `api/extensions.py` (~280 lines).
- **Env:** `HERMES_WEBUI_EXTENSION_DIR`, `HERMES_WEBUI_EXTENSION_SCRIPT_URLS`, `HERMES_WEBUI_EXTENSION_STYLESHEET_URLS`.
- **Behavior:** sandboxed same-origin static serving at `/extensions/*`; injects up to 32 `<script>` / `<link>` tags into every page render. Default-off.
- **Shay adapter:** drop Shay-branded JS/CSS (Shay panels, hi-tide chrome, shay-side-bar) into a directory, point the env at it. **No HTML edits.** Good for "Shay-flavored chrome" over upstream webui.
- **Risk:** **low** — pure addition of static assets.

### Hookpoint 5 — Skills / Memory / Kanban directories (file-backed)

- **Files:** `api/kanban_bridge.py` (delegates *every* kanban op to `hermes_cli.kanban_db`), skills handlers read `_active_skills_dir()` (per-profile, defaults under `HERMES_HOME`), memory read/write are file-system ops under the active hermes home.
- **Shay adapter:** point `HERMES_HOME` (or active profile's home) at a directory laid out like Shay's `~/.shay/` so kanban, skills, memory all read from Shay's state. `hermes_cli.kanban_db` would need to be Shay-compatible (or shimmed). This is the *file-shim* route — works for read-only mirroring without touching webui code.
- **Risk:** **medium** — depends on whether `hermes_cli.kanban_db` schema overlaps with `kanban_db.py` in shay-agent-os. If schemas drift, need a sync daemon or a `hermes_cli` stub package on PYTHONPATH.

### Hookpoint 6 — Terminal API (xterm passthrough)

- **File:** `api/terminal.py` (410 lines).
- **Endpoints:** `POST /api/terminal/{start,input,resize,close}`, `GET /api/terminal/output`.
- **Shay adapter:** trivial. Point the spawned PTY at `shay-cli` or any wrapper. Likely zero code change — terminal is already command-agnostic.
- **Risk:** **low**.

## Adapter strategy recommendation

**Recommended: shim via Hookpoints 1 + 3 + 4.** The repo *natively* supports backend-swap and frontend-extension via env vars. No fork. No patches.

1. **Frontend (Shay chrome):** Hookpoint 4 — drop Shay's panels/assistant/sidebar into `HERMES_WEBUI_EXTENSION_DIR=~/.shay/webui-extension/`. Upstream webui stays pristine.
2. **Backend (Shay brain):** start with Hookpoint 1 (`HERMES_WEBUI_CHAT_BACKEND=gateway` pointing at a Shay-gateway adapter at e.g. `http://127.0.0.1:8642`). It's the smallest first step — only chat turns reroute; everything else (sessions, kanban, skills, memory) continues to read from `HERMES_HOME` files.
3. **State (Shay kanban/skills/memory):** point `HERMES_HOME` at a Shay-aligned directory and provide a `hermes_cli` shim package on the venv that re-exports `kanban_db` mapping into shay-agent-os's `kanban_db.py`. Otherwise stand up a sync daemon.
4. **Long term:** migrate to Hookpoint 3 (`HERMES_WEBUI_RUNNER_BASE_URL`) once the Shay runner is stable — that fully retires the in-process Hermes runtime from the WebUI's process and makes the WebUI a pure UI/SSE shell over Shay.

**Light patch only needed if:** (a) `hermes_cli.kanban_db` schema is fundamentally incompatible with Shay's kanban (then add a thin shim module — not a webui edit); (b) Shay wants to add custom endpoints under `/api/shay/*` (add a single dispatch branch in `routes.py` or — cleaner — handle it via an `/extensions/` proxy script and keep all custom backend on a sidecar Shay process).

**Fork: NOT needed.** v0.51 was deliberately designed for this. The RFC `hermes-run-adapter-contract` and the three adapter env vars are explicit invitations.

## Diff from v0.11 (the reference port baseline)

v0.11 is **~40 minor versions and ~3,300 PRs back**. Headline changes likely to break or improve the legacy port pattern:

- **Backend pluggability is new.** v0.51 has `runtime_adapter.py`, `runner_client.py`, `gateway_chat.py` — none existed in v0.11. The legacy port's brain-hookup was certainly a **direct patch** of chat handlers (the only way in v0.11). Re-applying that pattern is *unnecessary* in v0.51 — use the native env-var seams.
- **Profiles + multi-home.** `api/profiles.py` (1492 lines), per-request profile cookies, profile-scoped Hermes homes. The legacy port likely assumed a single state dir; v0.51 expects a profile registry.
- **Routes.py exploded** from likely a few hundred lines to ~14,000. Patches that touched individual route blocks will not apply.
- **SSE event vocabulary widened.** Approval queue, clarify queue, gateway events, cron events, terminal output streaming, journal/audit events. A legacy SSE consumer will see new event types.
- **Frontend modular split.** v0.11 likely had monolithic JS; v0.51 has `boot/messages/sessions/workspace/panels/commands/onboarding/ui/i18n/icons/terminal/sw`. Any legacy patch into a single bundle no longer maps cleanly.
- **Onboarding wizard.** First-run overlay (`onboarding.py` 1046 lines, `static/onboarding.js`). Skipping or replacing it is a UX consideration for "Shay Web."
- **Kanban bridge in-tree** (`api/kanban_bridge.py`, 1255 lines). The legacy port likely had to hand-wire kanban; v0.51 has it natively against `hermes_cli.kanban_db`.
- **Auth, passkeys, oauth, signed cookies** all hardened. Don't try to recreate v0.11's auth assumptions.
- **Extensions surface** (`api/extensions.py`) is new. v0.11 ports likely modified `index.html`; v0.51 lets you inject without editing.
- **Cron API, providers API, updates API, agent_health, system_health, recovery, lineage, journal, compression_anchor** are all new modules.

**Net:** the legacy port pattern (patch chat handlers to call shay-cli) is **obsolete**. The v0.51 idiom is **configure env vars + ship sidecar services**.

## Open questions

1. **Gateway-chat wire protocol** — what exact JSON shape does `api/gateway_chat.py` send/expect? (Worth reading the full module + the gateway-side reference; tests in `tests/` likely document.)
2. **RuntimeAdapter contract surface** — does the protocol require ownership of approval/clarify queues, or does the host webui keep them and pass callbacks? `runtime_adapter.py` line 11–13 says it "intentionally does not own AIAgent instances, cancellation flags, approval callbacks, clarify callbacks" — so callbacks are passed in. Good for Shay.
3. **`hermes_cli` package availability** — webui `import`s `hermes_cli` at runtime. If Shay Web is a fresh venv without the Hermes agent installed, does webui boot? `bootstrap.py` (492 lines) "optional agent install" suggests yes-with-degraded mode, but the in-process chat path will fail without it. Hookpoint 1 or 3 sidesteps this.
4. **Kanban schema compatibility** — is shay-agent-os's `kanban_db.py` API-compatible with `hermes_cli.kanban_db`? If yes, a thin re-export shim package solves all kanban routes for free. If no, sync daemon or fork-the-bridge.
5. **Extension CSP** — extension scripts run under the same CSP-report-only policy. Confirm Shay's chrome doesn't need eval/inline.
6. **Profile-vs-Shay-identity** — does Shay want one Hermes profile per Shay env, or a single profile? `api/profiles.py` is opinionated.
7. **Is there an upstream "Shay Web" reference?** Nothing named `shay`, `agent-os`, or `famtastic` appears in v0.51 — confirmed clean upstream.
