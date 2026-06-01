# Part 2 Sub-plan — Hookpoint map + revised work shape

**Date:** 2026-06-01
**Source scans:** [A — legacy hookpoints](scans/A-legacy-hookpoints.md) · [B — webui v0.51](scans/B-webui-v0.51-hookpoints.md) · [C — workspace v2.3](scans/C-workspace-v2.3-hookpoints.md)
**Status:** synthesis complete · ready for Part 2a + 2b decomposition

---

## Headline

The three environments **share a wire protocol and a default port**. Standing up Shay Web and Shay Workspace is **not an adapter port** — it's a configuration exercise plus brain-side gap-fill on the shay gateway.

**Build the gateway, not the adapters.**

| Environment | Speaks to gateway via | Default port | Code patches needed |
|-------------|------------------------|--------------|---------------------|
| **Shay Desktop (legacy)** | direct HTTP+SSE to `LOCAL_API_URL` | `127.0.0.1:8642` | none (already wired) |
| **Shay Web** (webui v0.51) | `HERMES_WEBUI_CHAT_BACKEND=gateway` + `HERMES_WEBUI_GATEWAY_BASE_URL` | `127.0.0.1:8642` | **none** (native env-var seam) |
| **Shay Workspace** (v2.3) | `HERMES_API_URL` + `HERMES_DASHBOARD_URL` | `127.0.0.1:8642` (gateway) + `:9119` (dashboard) | **none** (zero-fork client by design) |

All three are wired around `127.0.0.1:8642` as the OpenAI-compat chat gateway. The shay gateway (already spawned by legacy via `HERMES_PYTHON shay gateway`) **is** the integration surface.

---

## The architectural reality

### Legacy's brain access is already CLI + HTTP + filesystem — not Electron-specific

Scan A confirmed: **17 hookpoints, zero direct Python imports.** All brain access goes through:
1. `shay <subcommand>` CLI spawn (chat, kanban, cron, skills, auth, security, insights, profiles, doctor, update, **gateway itself**)
2. HTTP+SSE to local gateway at `127.0.0.1:8642` (chat completions + tasks stream)
3. Direct file/SQLite reads of `$SHAY_HOME` (state.db, build-ledger.db, gateway.pid, configs, SOUL/MEMORY)

No `kanban_db.py` import. No `brain_client`. No `run-router` or executor types referenced. **The Electron app's brain integration is, structurally, portable to any harness that can do HTTP + spawn + file reads.**

### v0.51 webui shipped a runtime-adapter seam in slices 1/4

Scan B confirmed: hermes-webui v0.51 deliberately added **three native, default-off, env-var-selected backend-swap seams** (none of which existed in v0.11):

- `HERMES_WEBUI_CHAT_BACKEND=gateway` — reroute chat to external HTTP gateway at `HERMES_WEBUI_GATEWAY_BASE_URL` (default `http://127.0.0.1:8642`)
- `HERMES_WEBUI_RUNTIME_ADAPTER={legacy-direct, legacy-journal, runner-local}` — selectable run-execution path
- `HERMES_WEBUI_RUNNER_BASE_URL` — runner-client HTTP boundary (landed in v0.51.188 last week)
- `HERMES_WEBUI_EXTENSION_DIR` — frontend chrome injection

**Verified:** `tests/test_runtime_adapter_seam.py` is a 600+ line contract test enforcing this surface. Hookpoint is intentional and documented in RFC `hermes-run-adapter-contract`.

### v2.3 workspace is already a zero-fork client of `hermes-agent`

Scan C confirmed: the workspace was explicitly refactored to be a configurable client of the `hermes-agent` FastAPI backend. From `src/server/claude-api.ts`:

> *"HTTP client for the Hermes Agent FastAPI backend (default: http://127.0.0.1:8642). Replaces legacy WebSocket connection for the Hermes Workspace fork."*

All backend resolution flows through two env vars + one filesystem root:

- `HERMES_API_URL` → gateway (default `127.0.0.1:8642`)
- `HERMES_DASHBOARD_URL` → dashboard (default `127.0.0.1:9119`)
- `HERMES_HOME` → filesystem root (default `~/.hermes`)
- `HERMES_CLI_BIN` → optional shellout binary for swarm/cron/MCP

---

## What Part 2 actually decomposes into

The original plan said "1–2 focused sessions per environment to lift and re-apply the adapter pattern from legacy." That's **wrong** — there's no adapter to lift because both upstreams ship config seams natively. The actual work shape is:

### Bucket I — Per-environment install + config (small)

For **Shay Web (Part 2a)** — estimated **~0.5 session**:
1. Fresh install of upstream hermes-webui v0.51 in a Shay-owned venv
2. Set `HERMES_WEBUI_CHAT_BACKEND=gateway` + `HERMES_WEBUI_GATEWAY_BASE_URL=http://127.0.0.1:8642`
3. Set `HERMES_HOME=<shay-data-dir>` (probably profile-scoped)
4. Drop a placeholder `HERMES_WEBUI_EXTENSION_DIR` (Shay chrome comes in Part 3)
5. Smoke test: chat goes to the shay gateway, kanban/skills/memory routes return real data

For **Shay Workspace (Part 2b)** — estimated **~0.5 session**:
1. Fresh install of upstream hermes-workspace v2.3
2. Set `HERMES_API_URL=http://127.0.0.1:8642` (explicit, even though it's the default)
3. Set `HERMES_DASHBOARD_URL=http://127.0.0.1:9119`
4. Set `HERMES_HOME=<shay-data-dir>`
5. Smoke test: chat goes to shay gateway; dashboard-served screens (sessions/skills/config) load

### Bucket II — Brain-side gap-fill (this is the bulk of the work)

Both upstream apps assume the shay gateway implements surfaces that **today are 501 stubs or absent**. This is shared work — building it once benefits all three environments.

#### II.a — Complete the `/v1/tasks` surface on shay gateway

Scan A flagged that `/v1/tasks`, `/v1/desk/sessions/*`, `/v1/desk/mcp/*`, `/v1/desk/plugins/*` are **mostly 501 stubs** today (`gateway/desk_tasks_routes.py` in `shay-shay`). Legacy speaks the contract; gateway hasn't implemented it. webui v0.51 and workspace v2.3 will both call `/v1/tasks` (and the latter's dashboard variant), so this needs to land.

Estimated: **1 session**.

#### II.b — Stand up a `shay-dashboard` at port 9119

Workspace v2.3 probes a separate dashboard service at `:9119` for sessions, skills, config, cron, env, and analytics endpoints (`ensureGatewayProbed()` in `gateway-capabilities.ts`). Today, no such service exists on the Shay side. Options:

- **(a)** Implement `shay-dashboard` as a sibling FastAPI service that proxies to/wraps Shay's data layer
- **(b)** Extend the existing shay gateway to also serve dashboard routes (single service, two URL prefixes)
- **(c)** Cohabit with the existing site-studio sidecar (HP-19) which already listens on a dynamic port

Recommend **(b)** — single gateway, two URL prefixes — to minimize moving parts. Estimated **1–2 sessions**, depends on dashboard surface depth (full enumeration of `dashboardFetch(` calls in workspace's `src/server/` is a follow-up scout).

#### II.c — Decide `hermes_cli` package availability for webui

webui v0.51 `import`s `hermes_cli` at runtime for kanban/skills/memory in-process paths. Without it on the venv, `bootstrap.py`'s "optional agent install" lets the server boot in degraded mode — but the in-process kanban/skills/memory routes fail.

Three resolutions, each with different effort:

- **(1) Ship a `hermes_cli` stub package** that re-exports Shay's equivalents (kanban_db, profiles, etc.). Cleanest for v1.
- **(2) Use Hookpoint 3 (`HERMES_WEBUI_RUNNER_BASE_URL`)** to retire all in-process Hermes imports from webui — webui becomes pure UI/SSE shell. Requires implementing the runner-client protocol Shay-side.
- **(3) Mount `shay-shay/shay_cli/` as the `hermes_cli` package via PYTHONPATH symlink** — fastest, but couples webui's import to Shay's internal module layout.

Recommend **(1)** for v1, plan **(2)** as the longer-term retirement path. Estimated **0.5–1 session** for stub package.

### Bucket III — Part 2c verification (small)

All three environments running simultaneously, all writing to one gateway, all reading from one `$SHAY_HOME`. Concrete proof:

- Kick a chat from Shay Web → it shows up in legacy Desktop's session log → and in workspace's session list
- Create a kanban task from workspace → it appears in Desktop's Kanban screen → and in webui's kanban UI
- A skill toggle from webui → reflected in workspace's skills page

Estimated **~0.5 session**.

### Revised total sizing

**Original estimate (per old PLAN.md):** 1–2 sessions per environment = 2–4 sessions
**Revised estimate (per this sub-plan):** ~3–5 sessions total

| Bucket | Work | Sessions |
|--------|------|----------|
| I.a | Shay Web install + config (Part 2a) | 0.5 |
| I.b | Shay Workspace install + config (Part 2b) | 0.5 |
| II.a | Gateway `/v1/tasks` 501 completion | 1 |
| II.b | shay-dashboard at 9119 | 1–2 |
| II.c | `hermes_cli` stub package | 0.5–1 |
| III | Three-environment verification (Part 2c) | 0.5 |

Bulk of effort is **brain-side, not harness-side.** That's an important reframe.

---

## Risks + open questions

### Risks (known)

- **Kanban cwd hack in legacy.** `runKanban()` pins `cwd = $HERMES_HOME/hermes-agent` (kanban.ts:121). If the new environments don't create that dir, legacy kanban will break silently. Fix: either keep creating the dir, or update the cwd resolution to be flexible.
- **Two gateway-port assumptions in legacy.** Chat path uses `8642`; diagnostics probes `8765`. Diagnostics already has a TODO to read from profile config. Surface as a Part 2 cleanup OR park as Part 1 exception.
- **Master-plan filename hardcoded with a date** (`MASTER-PLAN-2026-05-31.md`, plan-tracker.ts:HP-17). Override via `$SHAY_PLAN_FILE` only. Probably fine for now; flag for Part 3.
- **`shay-agent-os` PATH discovery is fragile** (HP-14). No fallback to a known install dir. Surface as cleanup; not Part 2 blocker.
- **Anti-drift trace dir detected but not consumed** (HP-17). Orthogonal — not a Part 2 concern.
- **Bundle-ID collision risk** if Part 3 rebrands install paths. Out of scope here; flagged for Part 3.

### Open questions (need answers before Part 2b ships)

1. **Dashboard surface enumeration.** What's the full set of endpoints workspace probes on `:9119`? Grep `dashboardFetch(` across `src/server/` in `_refs/hermes-workspace-v2.3/`. Needed to scope II.b precisely.
2. **OpenAI-compat compliance level.** Does workspace require strict OpenAI-spec streaming (`data: {choices:[{delta:...}]}`), or does it accept Shay's gateway extended shape? Check `claude-api.ts streamChat` + `openai-compat-api.ts`.
3. **Bearer-token sourcing.** `BEARER_TOKEN` in workspace `gateway-capabilities.ts` — env-injected or local-anonymous? Shim must match.
4. **hermes_cli kanban_db API compatibility.** Does shay-agent-os's `kanban_db.py` have the same surface as `hermes_cli.kanban_db`? Determines whether II.c stub is trivial re-exports or a translation layer.
5. **Profile model.** Both upstreams have a profile concept (webui `api/profiles.py`, workspace `api/profiles/*`). Is the model "one profile per environment" or "shared profiles across environments"? Surface for design before Part 2c.
6. **Auto-update channels.** Workspace ships `electron-updater` and `HERMES_INSTALL_SCRIPT`. For "Shay Workspace" installs we want either disabled auto-update or a Shay-controlled feed. Park for Part 3.
7. **HermesWorld surface in workspace.** Reservation/marketing pages (`src/routes/hermes-world.tsx`) — leave native, or strip from build? Cosmetic; defer to Part 3.

---

## Recommended Part 2 task decomposition (updates to task list)

Replace the current single tasks `#3 Part 2a` and `#4 Part 2b` with this sequenced flow:

1. **Part 2-prep — answer the 4 critical open questions** (dashboard surface enumeration, OpenAI compliance level, bearer-token source, kanban_db compatibility). Research-only, ~1 hour. Blocks the bucket-II work.
2. **Part 2-II.a — Complete `/v1/tasks` 501 stubs on shay gateway.** Brain-side. Blocked by prep.
3. **Part 2-II.b — Stand up shay-dashboard at :9119.** Brain-side. Can run in parallel with II.a.
4. **Part 2-II.c — `hermes_cli` stub package for Shay Web.** Brain-side. Can run in parallel with II.a/b.
5. **Part 2a — Install + configure Shay Web.** Blocked by II.a + II.c. ~0.5 session.
6. **Part 2b — Install + configure Shay Workspace.** Blocked by II.a + II.b. ~0.5 session.
7. **Part 2c — Three-environment proof.** Blocked by 2a + 2b. ~0.5 session.

---

---

## CORRECTION 2026-06-01 (post-launch discovery) — II.b rescoped 10×

A user question — "what does the workspace install say about the dashboard?" — surfaced what the README of `_refs/hermes-workspace-v2.3/README.md` says plainly:

> *"v2 — zero-fork. Runs on vanilla `NousResearch/hermes-agent` installed via Nous's own installer. ... `hermes dashboard` running (default `http://127.0.0.1:9119`) for zero-fork installs. The dashboard provides config, sessions, skills, and jobs APIs."*

Workspace doesn't expect us to build a dashboard from scratch. It expects an upstream `hermes dashboard` binary to be running on :9119. **And Shay already has its equivalent** — `shay dashboard` is a real CLI command, listed in `shay --help`:

```
shay dashboard              Start web UI dashboard (port 9119)
shay dashboard --stop       Stop running dashboard processes
shay dashboard --status     List running dashboard processes
```

The implementation lives at `shay_cli/web_server.py` (4,425 lines, FastAPI). Most of the 40 workspace-expected routes are already there:

- `/api/status`, `/api/sessions(/{id})(/messages)(/search)`, `/api/config(/defaults)(/schema)`, `/api/model/{info,options,auxiliary,set}`, `/api/env(/reveal)`, `/api/providers/oauth/*`, `/api/logs`, `/api/cron/jobs/*` (full CRUD + pause/resume/trigger), `/api/profiles`, `/api/gateway/restart`, `/api/shay/update`, `/api/actions/{name}/status`

**Revised II.b shape (rescoped from "build from scratch" to "verify + gap-fill"):**

1. Inventory workspace's exact request paths from `PART-2-PREP-X-FINDINGS.md`
2. Diff against `web_server.py`'s actual routes
3. Build the genuine gap list (probably 3–10 endpoints out of 40)
4. Add only what's missing
5. Confirm `shay dashboard`'s auth scheme matches workspace's `Authorization: Bearer` expectation

**Revised sizing:** ~1–2 hours, NOT 1–2 sessions. **10× scope reduction.**

**Side correction:** I had told II.b's agent to use aiohttp following II.a's pattern. That was wrong — `web_server.py` is FastAPI, a separate service from the aiohttp gateway at :8642. Two different services, two different runtimes — that's correct architecture, and Shay already has it. The agent was killed before any code landed.

**Revised Part 2 total sizing:**

| Bucket | Original | After prep | After II.b discovery | Note |
|--------|----------|-----------|----------------------|------|
| Prep | 0.25 | ✅ done | ✅ done | |
| II.a `/v1/tasks` | 1 | 1 | ✅ done (commit `85bd560`) | |
| II.b shay-dashboard | 1–2 | 1–2 | **~0.2 (gap-fill only)** | shay dashboard already exists |
| II.c hermes_cli stub | 0.5–1 | 0.1 | ✅ done | |
| 2a Shay Web install | 0.5 | 0.5 | 0.5 | unchanged |
| 2b Shay Workspace install | 0.5 | 0.5 | 0.5 | unchanged |
| 2c verification | 0.5 | 0.5 | 0.5 | unchanged |
| **Total remaining** | — | — | **~1.7 sessions** | |

---

## Prep findings (Q1–Q4 answered) — appended 2026-06-01

Two prep scouts (Agent X + Agent Y) answered all four open questions. Full reports at `PART-2-PREP-X-FINDINGS.md` and `PART-2-PREP-Y-FINDINGS.md`. Spot-checked against actual source.

### Q1 — Dashboard surface (II.b sizing)

**Answer:** ~40 distinct paths across 13 feature areas (Sessions, Skills, Config, Cron, Env, Analytics, Logs, Status, Model, Tools, OAuth, Profiles, MCP, Conductor, Kanban-plugin). Canonical contract: `src/server/claude-dashboard-api.ts`. **~60% are read-only GETs over data Shay already has.** Heavy lifts: Sessions schema parity, Cron CRUD, Env CRUD, Conductor spawn semantics.

**II.b sizing confirmed: 1–2 sessions.** Medium scope — no rescope needed.

### Q2 — OpenAI-compat compliance (II.a + Workspace integration)

**Answer: extended-tolerant.** Both consumers index only `choices[0].delta.content` (+ optional reasoning/usage) and silently ignore unknown fields. `JSON.parse` wrapped in swallowed try/catch on both sides.

**Highest-stakes finding (caught the silent-failure trap):** if Shay emits anything other than canonical `data: {"choices":[{"delta":{"content":"..."}}]}\n\n` + `data: [DONE]\n\n`, the user sees an empty turn with no error. Both consumers fail silently.

**What Shay's gateway MUST emit on `/v1/chat/completions`:**
1. `data: {"choices":[{"delta":{"content":"<token>"}}]}\n\n` — core OpenAI delta (required)
2. `data: [DONE]\n\n` — terminator (required)
3. Optional `usage` block on final chunk: `{"usage":{"prompt_tokens":N,"completion_tokens":N}}` — WebUI consumes; Workspace ignores on this path
4. (Recommended for tool visibility) `event: hermes.tool.progress\ndata: {"tool":"...","label":"...","status":"running|completed","toolCallId":"..."}\n\n`

**What Shay must NOT emit** (would be silently dropped): Anthropic-native event names (`message_start`, `content_block_delta`), vLLM-style `{"text":"...","stop":false}`, or any top-level field that diverges from `/api/chat/start` response shape (per RFC Slice 4e/4f).

**New obligation revealed:** Workspace has **two** chat paths — `openai-compat` (above) and `claude-enhanced` at `POST /api/sessions/{sid}/chat/stream` (Hermes-Agent SSE: `event: assistant.delta`, `event: assistant.completed`). Workspace **prefers `claude-enhanced` when sessionId is available**. Without `/api/sessions/.../chat/stream`, Workspace falls back to `openai-compat` (works, but the richer session flow is dormant).

→ **Decision for v1:** ship `/v1/chat/completions` only. Workspace's openai-compat fallback is sufficient for Part 2 acceptance. Add `/api/sessions/{sid}/chat/stream` as a follow-up (Part 2.5 or later) once core works.

**Load-bearing reference:** in-tree RFC at `_refs/hermes-webui-v0.51/docs/rfcs/hermes-run-adapter-contract.md` (61KB, revised 2026-05-23) — defines the 14-event runtime-adapter family (but those are for Hookpoint 3 `runner-local` mode, default-off, out of scope for v1).

### Q3 — Bearer token (auth surface)

**Answer:** `Authorization: Bearer <token>` only; optional (omitted when env empty).

| Consumer | Env var(s) checked |
|----------|---------------------|
| Workspace | `HERMES_API_TOKEN` → `CLAUDE_API_TOKEN` → `~/.codex/auth.json` fallback |
| WebUI | `HERMES_WEBUI_GATEWAY_API_KEY` (must equal gateway-side `API_SERVER_KEY`) |
| Shay gateway (legacy) | `API_SERVER_KEY` (per scan A) |

**Verdict: zero translation needed.** Legacy Shay Desktop's `API_SERVER_KEY` is already the canonical server-side env var that both new consumers are designed to match. Set the same value on the gateway and any consumer that needs auth, and it works.

**Recommendation:** support `requireBearer`-on-loopback toggle (already in scope per scan A) — anonymous local-only by default; bearer required when remotely exposed.

### Q4 — kanban_db compatibility (II.c sizing)

**Answer: re-export shim viable.** All 37 symbols webui imports (including private `_append_event`, `_end_run`, `_normalize_board_slug`, and `DEFAULT_BOARD`) exist in `shay-shay/shay_cli/kanban_db.py` with matching or superset signatures.

**II.c sizing collapsed:** from "0.5–1 session" to **~30 minutes**. Stub is `~10 lines`: `from shay_cli.kanban_db import *` + explicit private re-exports.

### Net effect on Part 2 sizing

| Bucket | Original | After prep | Note |
|--------|----------|-----------|------|
| Prep | 0.25 | ✅ done | answered all 4 questions |
| II.a `/v1/tasks` 501 stubs | 1 | 1 | unchanged |
| II.b shay-dashboard :9119 | 1–2 | 1–2 | confirmed medium |
| II.c hermes_cli stub | 0.5–1 | **~0.1** | re-export shim |
| 2a Shay Web install | 0.5 | 0.5 | unchanged |
| 2b Shay Workspace install | 0.5 | 0.5 | unchanged |
| 2c verification | 0.5 | 0.5 | unchanged |
| **Total** | **3–5** | **~3–4** | savings from II.c |

Possible follow-up (Part 2.5): `/api/sessions/{sid}/chat/stream` for Workspace's preferred chat path. **Defer.**

---

## What this means for the master plan

Part 2's shape is fundamentally different from what `PLAN.md` describes:

- The "lift the adapter pattern" framing is obsolete (no patches needed — upstream ships seams)
- The bulk of Part 2 work is **brain-side gateway gap-fill**, not per-environment integration
- The shay gateway becomes the load-bearing integration boundary — investing here pays off across all three environments
- Part 3 (rebrand) scope unchanged, but now better-grounded — we know each environment has a clean extension surface (webui `HERMES_WEBUI_EXTENSION_DIR`, workspace `electron-builder.config.cjs` + injected chrome, legacy via direct edits)

PLAN.md will be updated to reflect this in the same commit as this sub-plan landing.
