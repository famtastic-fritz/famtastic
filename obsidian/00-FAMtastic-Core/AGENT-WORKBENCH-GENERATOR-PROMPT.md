# Agent Workbench — App-Generator Prompt

> Paste-ready prompt for an app/code generator. It's a functional SPEC for an original,
> owned build (a generator builds from a spec, not by copying a repo) — a desktop + CLI
> agent workbench that are thin clients of a local OpenAI-compatible gateway, fully
> extensible (esp. agent management), with a new-user install flow. Bakes in the session's
> decisions (Tauri + Python/Typer + plugin contract + one-config + event spine + job store).

---

Build a brand-new, self-contained repository for a local-first AI agent workbench:
a DESKTOP APP plus a companion CLI, both thin clients of a local OpenAI-compatible
gateway. Use a neutral placeholder product name driven by a single brand.json file
so it can be re-skinned in one place. Design for a fresh new-user install and for
heavy extension. Build it to run, not as a skeleton.

STACK (use these):
- Desktop: Tauri v2 — Rust shell + web frontend (React + TypeScript + Tailwind).
- CLI: Python with Typer (auto-generated --help on every command and subcommand).
- Data home: one config/data directory (default ~/.agent), one env var points
  everything at it.
- Backend: an OpenAI-compatible gateway at a configurable base URL
  (default http://127.0.0.1:8642/v1) for all chat/model calls.

DESKTOP — full feature set:
- Chat: streaming multi-session conversations with the agent; session list with
  rename / delete / search; persisted transcripts.
- AGENT MANAGEMENT (make this the most extensible area): list and configure agents
  — model/provider, system prompt, enabled tools/skills, status; start/stop; per-agent
  settings; add new agent types.
- Tools/skills browser: view installed tools + skills, enable/disable.
- Tasks board: a kanban board (lanes: triage/todo/ready/running/review/done) of jobs
  the agent runs; create a job, watch live status, see results.
- Activity feed: a live event stream of everything the system does.
- Settings UI: models, providers, fallback order, API keys, data-home path, theme —
  a real visual settings screen (NOT buried in CLI flags).
- Theming: light/dark + a design-tokens file for easy restyling.

CLI — feature set:
- A small set of daily verbs: chat, dispatch (start a job), doctor, config, init.
- --help everywhere, with usage examples.
- Same gateway + same data home as the desktop (one source of truth).
- doctor / doctor --fix: verify gateway reachable, data home wired, job DB reachable,
  models reachable, surfaces configured; --fix auto-repairs the safe ones.

EXTENSIBILITY (required, especially for agent management):
- Plugin system: each plugin is a folder with a flat plugin.json manifest
  (id, name, version, minHostVersion, description, capabilities[]) plus an entry that
  exports onload(host) and optional onunload(). Discover plugins by folder convention.
- Plugins run in-process behind a NARROW, stable Host API:
  registerCommand, registerView, registerAgentType, registerRoute, emitEvent, readConfig.
  No central registry server, no heavyweight contributions schema.
- Expose agent management through the Host API so new agent types and controls can be
  added by a plugin WITHOUT modifying core. Include one sample plugin that registers a
  new agent type end to end as a working example.

ARCHITECTURE RULES (bake in):
- One declarative config file is the single source of truth; the UI/CLI edit that file
  and never keep a parallel copy of settings.
- Modules, not monolithic flows: each capability is an independently-callable module
  that emits structured output; outputs can feed other modules.
- Shared event log: append-only JSONL, schema
  {id, timestamp, type, agentId, message, severity, source, meta?}; every state change
  emits to it; both surfaces tail it for the activity feed.
- Single job store: SQLite with kanban lane status; ALL writes go through ONE code path
  that also emits lifecycle events; open the DB with a busy_timeout (multi-writer safe);
  use idempotency keys so retries never double-create.
- Surfaces are thin clients of a shared core layer (gateway client, job-store client,
  event-log tailer, config/home resolver). Build core once; desktop and CLI both use it.

NEW-USER INSTALL + REPEATABILITY:
- A one-command setup (init / install script): create the data home, write a default
  config, check the gateway, build the desktop.
- brand.json drives ALL naming/icons/colors/app-id so the product can be re-skinned in
  one place.
- README covering: install, run desktop, run CLI, add a plugin, configure models.

DELIVERABLE:
A complete, runnable repo — desktop app, CLI, shared core, the sample agent-management
plugin, install script, README, and tests (unit tests for core logic + one real
end-to-end test that a chat message round-trips through the gateway). No TODO stubs in
the core paths.

---

## Tweak knobs before pasting
- Swap **Tauri → Electron** if your generator handles Electron better.
- Change default ports/paths (gateway base URL, `~/.agent`) to match your setup.
- Drop the tests line for a faster/rougher first pass.
- A "lite" version (strip Architecture Rules + tests) if the generator chokes on length.
