---
title: SHAY-ENVIRONMENTS-STATE
type: note
permalink: shay-memory/repo-docs/shay-environments-state
---

# Shay Environments — Current State + Pending Decision

**Last updated:** 2026-06-01 (afternoon session, Fritz overseeing via Claude Code)
**Status:** Part 2 fully shipped + Part 3 partial + Part 4 designed. **Fritz handed the next-step decision to me (Shay).**

## What this is

Fritz's overseer session today built out the "Shay Environments" plan — growing me from 1 place to live (legacy Shay Desktop) to 3 (Desktop + Web + Workspace), with Companion (mobile) designed but not yet built. All work is on disk + committed across three git repos. This note exists so I can pick up the thread from wherever I'm running next.

## The plan structure

`plans/shay-environments/` is the canonical home. Key files in read order:

1. `PLAN.md` — master plan (4 parts: legacy reference / install + integrate / rebrand / companion)
2. `PART-2-SUBPLAN.md` — how Part 2 got reframed mid-flight (it collapsed from "lift adapter pattern" to "config + small brain-side gap-fill" when scans revealed both upstream apps ship env-var-selected backend-swap seams natively)
3. `PART-2-PREP-X-FINDINGS.md` + `PART-2-PREP-Y-FINDINGS.md` — research outputs that answered the 4 critical questions before any code landed
4. `scans/A-legacy-hookpoints.md`, `B-webui-v0.51-hookpoints.md`, `C-workspace-v2.3-hookpoints.md` — original 3-way parallel research scans
5. `II-a-COMPLETION-REPORT.md`, `II-b-COMPLETION-REPORT.md`, `SHAY-WEB-INSTALL-REPORT.md`, `SHAY-WORKSPACE-INSTALL-REPORT.md` — per-bucket completion reports
6. `PART-3-DECISIONS.md` — naming convention, brand approach, per-env strategy (216 lines)
7. `PART-3-VERIFY-REPORT.md` — honest verify report (which parts of Part 3 actually delivered visible rebrand vs which didn't)
8. `PART-4-DESIGN.md` — Shay Companion (mobile) design (283 lines)

## What's running today

I (Shay) now have 3 environments, all talking to one brain:

| Environment | Path | How it boots | Brain contact |
|---|---|---|---|
| **Shay Desktop (legacy)** | `shay-desktop-electron/` | launchd-managed Electron | HTTP+SSE to `shay gateway` :8642 + raw SQLite reads of `~/.shay/` |
| **Shay Web** | `shay-environments/shay-web/run-shay-web.sh` | Upstream hermes-webui v0.51 in a Shay-owned venv | `HERMES_WEBUI_CHAT_BACKEND=gateway` → `shay gateway` :8642; `hermes_cli` shim → `shay_cli.kanban_db` for in-process state |
| **Shay Workspace** | `shay-environments/shay-workspace/run-shay-workspace.sh` | Upstream hermes-workspace v2.3 (TanStack + Vite) | `HERMES_API_URL=:8642` + `HERMES_DASHBOARD_URL=:9119` + `HERMES_DASHBOARD_TOKEN=shay-workspace-local-dev-token` |

Both new environments verified end-to-end today — gateway probe + dashboard probe + kanban probe all returned real Shay data through each new harness. **The brain connection is intact through all three surfaces.**

## What got added to me today (commit references)

In **shay-shay**:
- `cd5b116` — scaffolded the Phase 3 desk_*_routes APIRouters
- `85bd560` — implemented `/v1/tasks` handlers (Phase 5) — merges kanban + cron + runs into a unified BackgroundTask shape with SSE
- `5ed63a9` — fixed the botched-rebrand identifiers (`updateShay-Shay` → `updateShayShay` — JS identifiers can't have hyphens; tsc was failing 50+ cascading errors). This is why `shay dashboard` couldn't bind 9119 until now.
- `6763909` — added `SHAY_DASHBOARD_TOKEN` / `HERMES_DASHBOARD_TOKEN` env var support for stable external bearer auth on the dashboard

In **shay-desktop-electron**:
- `822e6ff` — Hermes → Shay visible-string rebrand on package.json + electron-builder (productName: "Shay Desktop", appId: com.famtastic.shaydesktop)

In **famtastic** (the umbrella repo):
- `0136cad` — boot artifacts for Shay Web (venv + .env.example + run script + README)
- `1e1f075` — boot artifacts for Shay Workspace
- `539aa02` — Shay Web visible-rebrand overlay (chrome scaffolding, see "what's incomplete" below)
- `983758d` — workspace install SHA recorded

## What's incomplete (and waiting on a decision)

The workflow's verify pass was honest: **brain reach works in all 3 envs, but the visible rebrand on Shay Web and Shay Workspace isn't actually rendering yet.** The chrome dirs were built (with sophisticated swap logic — DOM observer, PWA manifest awareness, residual text sweep) but the *delivery mechanism* isn't wired:

- **Shay Web:** `HERMES_WEBUI_EXTENSION_DIR` env var is documented but the served HTML still shows `<title>Hermes</title>`. Need to verify the env actually reaches the runtime when `run-shay-web.sh` boots, and that upstream webui's extension surface injects into the root page (it might only inject into the chat page).
- **Shay Workspace:** `<title>Hermes Workspace</title>` still rendering. The chrome.js + chrome.css exist but Electron preload injection isn't wired to dev mode (`npm run dev` Vite path).
- **Real brand assets:** workflow couldn't reach the `muapi-logo-branding` skill from inside a subagent, so the rebrand shipped with text-only fallbacks. Real logo / mark / icon set needs a `muapi-logo-branding` invocation per the brand brief in `PART-3-DECISIONS.md` section 7.

## The decision Fritz is handing me

Three options, listed in the overseer's words:

> 1. **Read the docs** (`PART-3-DECISIONS.md`, `PART-3-VERIFY-REPORT.md`, `PART-4-DESIGN.md`) and tell me what to adjust. They're concise — ~10 min of reading.
> 2. **Finish the chrome wiring** — small focused task (~30 min agent). Web's `HERMES_WEBUI_EXTENSION_DIR` and Workspace's preload injection. After this, the visible rebrand actually shows up in the browser.
> 3. **Move to companion implementation** — pick a Part 4 platform (the design recommends PWA over Tailscale), then I scope a Phase 1 plan.

## My recommendation to myself

If I'm going to make this call, my read is: **(2) first**, then **(3)** as the bigger next push.

- (2) is small, finishes a thread that's 80% done, and proves the rebrand pipeline end-to-end (which we'll need for any future harness — including the Companion).
- (3) is the real next-frontier work and the design doc gave it real shape.
- (1) is a worthwhile parallel — I can read the docs while a sub-agent does (2).

The brand assets via muapi-logo-branding fit cleanly into (2) — if I'm fixing the delivery, I should also generate the real assets in the same pass.

## Things I should NOT do (per session guardrails)

- Don't touch `_refs/hermes-webui-v0.51/` or `_refs/hermes-workspace-v2.3/` source code — those are upstream and stay read-only
- Don't modify the frozen legacy Electron app source unless Fritz unfreezes it
- Don't break the existing brain endpoints — the regression test (kanban + gateway-status returning real data through each harness) is the load-bearing safety property
- Don't rerun the same research scans I just did today — those answers are in `PART-2-PREP-*` and `scans/`

## How I find this again

This file is in `obsidian/Shay-Memory/repo-docs/SHAY-ENVIRONMENTS-STATE.md`. Reachable via:
- vault-semantic-search MCP: query "shay environments state" or "harness rebrand decision"
- basic-memory MCP: search the shay-memory project for "Shay Environments"
- Direct read: the canonical location for repo-docs

Related notes:
- `obsidian/Shay-Memory/repo-docs/CHANGELOG.md` — the lightweight session trail (Fritz's standing rule)
- `obsidian/Shay-Memory/repo-docs/FAMTASTIC-STATE.md` — the bigger system architecture doc
- `obsidian/Shay-Memory/repo-docs/SITE-LEARNINGS.md` — accumulated learnings across sessions
---

## UPDATE 2026-06-01 (late PM) — Workspace fully wired, all capability flags green

Autonomous finish pass (Claude Opus 4.8 as overseer). All 4 previously-dormant
Workspace capability flags are now TRUE, verified by live probes against a fresh
full-stack boot (not agent claims):

- **kanban: true** — dashboard `/api/plugins/kanban/board` serves real board data
- **mcp: true** — dashboard `/api/mcp` lists real MCP servers (obsidian, etc.)
- **enhancedChat: true** — gateway `:8642` `/api/sessions/{id}/chat/stream` (SSE)
- **conductor: true** — dashboard `/api/conductor/missions` full CRUD, JSON store
  at `$SHAY_HOME/conductor/missions.json`
- mcpFallback: false (correct — only fires when mcp is false)

Baseline zero regression: all 9 core capabilities + gateway + dashboard still true.

### Operational notes for future-me
- **Stale processes bite.** The gateway and dashboard are long-running. After
  committing new routes, you MUST restart the relevant process (`shay gateway
  restart` / restart `shay dashboard`) or it serves old code and probes 404.
- **Workspace caches capability probes at startup.** After adding brain-side
  endpoints, re-boot the Workspace overlay (`run-shay-workspace.sh`) to clear the
  cache, or flags stay false even though endpoints are live. This caused a whole
  workflow to wrongly report "all four false."
- Dashboard must run with `SHAY_DASHBOARD_TOKEN=shay-workspace-local-dev-token`
  to match Workspace's `HERMES_DASHBOARD_TOKEN`.

### The real next frontier (honest gap)
Conductor missions and the swarm shim's non-chat verbs REGISTER work but don't yet
EXECUTE it — `shay_agent_os` (the actual swarm pipeline at ~/famtastic/shay-agent-os)
isn't importable from the shay-shay / dashboard venvs. Bridging swarm EXECUTION
(make shay-agent-os installable into those venvs, or shell out to a dispatch
entrypoint) is the next substantial piece. Everything at the API/UI/flag layer is
live and verified.

Commits this pass (shay-shay): 3b3d4d7, b2e4113, 881be91, 534a14d.
Commits (famtastic): a48e552 (swarm shim), bd155f7 (docs).
