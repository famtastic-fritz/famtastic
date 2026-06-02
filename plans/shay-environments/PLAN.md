# Plan: Shay's Environments — multi-harness rollout

**Status:** active
**Started:** 2026-06-01
**Owner / overseer:** Claude (this session) — orchestration only; concrete work delegated to other sessions
**Supersedes:** earlier "Hermes → Shay rebrand" framing (too narrow — this is bigger)

## The frame

Shay has one brain (`shay-shay`, `shay-agent-os`, `shay-cli`, `.shay`) and today only one place to live: **Shay Desktop (legacy)**. The goal is to grow her from **1 environment to 3, then 4**, by standing up additional harnesses that all point at the same brain.

| # | Environment | Origin | Role |
|---|-------------|--------|------|
| 1 | **Shay Desktop (legacy)** | Hermes desktop + hermes-webui v0.11.0 port | Frozen reference — holds all brain-hookup work |
| 2 | **Shay Web** | Fresh install of hermes-webui v0.51.195 | Browser-based harness |
| 3 | **Shay Workspace** | Fresh install of hermes-workspace v2.3.0 | Workspace/command-center harness |
| 4 | **Shay Companion** | Greenfield (mobile/phone) | Pocket harness — eventually |

## The four parts

### Part 1 — Shay Desktop (legacy) — DONE. FROZEN.

The Electron app at `shay-desktop-electron/`. Started from Hermes desktop, overlaid with hermes-webui v0.11.0 port. Holds the brain hookup work that the other environments will lift:

- shay-cli integration
- `kanban_db.py` integration
- Gateway / brain client wiring
- Gates, run-router, executor types
- Plan-tracker, build-tracker
- Swarm pipeline (synthesize_sections, fan_out, reviewer≠author)
- Memory / anti-drift reconciler

**Rule: no more work happens here.** Reference implementation. Bug-fix exceptions get explicit user approval and are tracked separately from this plan.

### Part 2 — Stand up Shay Web + Shay Workspace (NEXT)

**Sub-plan:** [`PART-2-SUBPLAN.md`](PART-2-SUBPLAN.md) — synthesis of scans A/B/C (under `scans/`), written 2026-06-01.

**Reframed by the hookpoint research:** the original framing ("lift the adapter pattern from legacy") was **obsolete** — upstream hermes-webui v0.51 ships a native runtime-adapter seam (`HERMES_WEBUI_CHAT_BACKEND=gateway`), and hermes-workspace v2.3 is a zero-fork client of `hermes-agent` configurable via `HERMES_API_URL` / `HERMES_DASHBOARD_URL` / `HERMES_HOME`. All three environments share `127.0.0.1:8642` as the OpenAI-compat gateway port.

**Build the gateway, not the adapters.** The bulk of Part 2 work is **brain-side gap-fill** on the shay gateway, not per-environment integration:

| Bucket | Work | Sessions |
|--------|------|----------|
| **Prep** | Answer 4 critical open questions (dashboard surface enumeration, OpenAI compliance level, bearer-token source, kanban_db compatibility) | ~0.25 |
| **II.a** | Complete shay-gateway `/v1/tasks` 501 stubs | 1 |
| **II.b** | Stand up `shay-dashboard` at `:9119` for workspace | 1–2 |
| **II.c** | `hermes_cli` stub package for webui (or migrate to runner-client mode) | 0.5–1 |
| **2a** | Install + configure Shay Web (env-var only, zero patches) | 0.5 |
| **2b** | Install + configure Shay Workspace (env-var only, zero patches) | 0.5 |
| **2c** | Three-environment side-by-side verification | 0.5 |

**Total revised: ~3–5 sessions.** Bulk is brain-side, not harness-side.

**Acceptance for Part 2:** Three environments running, all wearing Hermes branding, all talking to one Shay brain at `127.0.0.1:8642` + `127.0.0.1:9119`. Side-by-side proof: chat from one shows up in the others; kanban/skills/memory mutations propagate.

### Part 3 — Visible rebrand across all environments

Once all three are running and brain-connected, apply the **Shay** brand layer:

- Pick the family naming convention (Shay Desktop / Shay Web / Shay Workspace / Shay Companion — or variant)
- Pick the brand mark (use `muapi-logo-branding` recipe per standing memory rule)
- Apply across all three environments via the right mechanism per environment (Electron resources, Web UI assets, Workspace skin)
- Categorize visible (Tier A) vs. internal identifier (Tier B — deferred)
- Handle bundle IDs / install paths / repo names with explicit migration notes

**Sizing:** previously scoped in the discarded rebrand plan; reopens after Part 2 lands so scope is grounded in what's actually rebrandable in each environment.

**Acceptance for Part 3:** Three Shay-branded environments, one Shay brain.

### Part 4 — Shay Companion (mobile) — EVENTUALLY

Greenfield mobile/phone harness. Not scoped yet. Reopens after Part 3 ships.

## Orchestration model

This session (Claude as overseer) holds the master plan. Other sessions execute concrete tasks. Per delegation:

- I write a self-contained briefing (the other session does not have our conversation)
- The session does the work and reports back with evidence (file paths, command output, screenshots, file diffs)
- I gate the result and update the plan + task list before the next delegation

Fritz can swap sessions freely. This file + the task list are the source of truth.

## Must NOT (guardrails)

- Do NOT modify anything in Shay Desktop (legacy) — `shay-desktop-electron/`, `shay-shay/`, `shay-agent-os/` — without explicit user approval as a Part 1 exception
- Do NOT touch gate logic, run-router, executor types, `kanban_db.py`, plan-tracker
- Do NOT delete `_refs/hermes-webui/` v0.11.0 (Part 1 reference snapshot)
- Do NOT touch the archived Swift `shay-desktop/`
- Do NOT start Part 3 (rebrand) before Part 2 is verified — we don't know what's rebrandable per environment until they're running
- Do NOT fork upstream unless adapter-only proves insufficient (per environment, decided in Part 2 sub-plan)

## Risks

- **v0.11 → v0.51 hookpoint drift.** Integration locations may have moved. Mitigation: Part 2 sub-plan starts with a hookpoint map before any code work.
- **Three apps, one brain, shared session state.** Concurrency on `kanban_db`, gateway sockets, `.shay/` home. May need locking or a coordination layer. Surface in Part 2 sub-plan.
- **Bundle ID / install path collisions** if Part 3 renames things. Surface in Part 3 sub-plan after Part 2 lands.
- **Brand-mark design is a creative pass, not a rename.** Use `muapi-logo-branding` recipe. Surface in Part 3.
- **Companion (Part 4) might require a different brain interface** (mobile networking, async, push notifications). Out of scope until Part 3 lands.

## Next concrete step

Before any environment work, write the **Part 2 sub-plan**: a hookpoint map identifying where in `shay-desktop-electron/` legacy talks to the brain, plus a corresponding scan of upstream hermes-webui v0.51 and hermes-workspace v2.3 to find the equivalent hookpoints. Research-only, read-only, ~1 session.

Delegation candidate. Briefing prepared on request.
