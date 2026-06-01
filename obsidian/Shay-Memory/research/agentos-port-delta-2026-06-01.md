---
title: agentos-port-delta-2026-06-01
type: note
permalink: shay-memory/research/agentos-port-delta-2026-06-01
tags: [agentos, port, delta, w5, kanban]
---

# Agent-OS Port Delta — what's actually missing (Z1, 2026-06-01)

Reconciles the hermes-webui feature inventory in
`research/agentos-port-plan-2026-05-31.md` (§1–2) against the **8 existing
agentos-domain screens** in `shay-desktop-electron` as of commit `dfd3eda`.
This is the TRUE delta — only features the desktop does NOT already cover.

## Method
- Source of truth for existing screens: `src/renderer/src/screens/manifest.ts`
  (`SCREENS` filtered to `domain: "agentos"`) + the actual screen components.
- Each plan feature area mapped to an existing screen, then graded:
  **HAVE** (covered), **PARTIAL** (present but below the plan's bar), or
  **MISSING** (no native screen).

## Existing agentos screens (8, from manifest)
`kanban` (Kanban.tsx) · `tools` (Tools.tsx) · `gateway` (Gateway.tsx) ·
`capture` (CaptureInbox) · `insights` (Insights.tsx) · `inbox` (Inbox.tsx) ·
`office` (Office.tsx) · `studio` (Studio.tsx).

Note: several hermes-webui areas live in OTHER desktop domains, not agentos:
Chat/Sessions → **chat** domain; Skills/Soul/Models/Providers/Schedules →
**agents** domain; Settings/Memory/Logs/Config → **system** domain. Per the
plan these are "conceptual overlap, not direct reuse" — they already exist
natively, so they are HAVE, not part of the agentos port delta.

## Feature-area reconciliation

| hermes-webui area | maps to | grade | notes |
|---|---|---|---|
| Chat (panelChat) | chat/Chat | HAVE | full native chat + composer |
| Session history/search (sessionList) | chat/Sessions | HAVE | native sessions screen |
| Scheduled jobs / cron (panelTasks) | agents/Schedules | HAVE | native cron screen |
| Kanban board (panelKanban) | agentos/kanban | **PARTIAL** | see Kanban delta below |
| Todos (panelTodos) | — | **MISSING** | no session-todo list screen |
| Skills (panelSkills) | agents/Skills | HAVE | native skills screen |
| Personal memory (panelMemory) | system/Memory | HAVE | native memory screen |
| Workspaces (panelWorkspaces) | — | **MISSING** | no workspace add/switch UI |
| Agent profiles (panelProfiles) | agents/Agents | HAVE | native profiles screen |
| Logs (panelLogs) | system/Logs | HAVE | native log viewer |
| Insights (panelInsights) | agentos/insights | HAVE | native insights screen |
| Settings (panelSettings) | system/Settings + Config | HAVE | native settings + config inspector |
| Overlays: Approval / Clarify cards | chat composer | PARTIAL | not audited here; chat-domain concern, out of agentos scope |
| Banners: update/reconnect/offline/health | app shell | PARTIAL | not an agentos screen; tracked elsewhere |

## The delta (what to actually build for Z2)

### 1. Kanban polish — PARTIAL → Hermes v0.11.0 bar (PRIMARY Z2 target)
The existing `Kanban.tsx` (991 lines) is already strong: 6 columns
(triage/todo/ready/running/blocked/done), board switcher, drag-and-drop moves,
Dispatch + Refresh + New-task controls, task-detail modal, priority/assignee/
tenant/age pills, light polling. **Gaps vs the Hermes Agent v0.11.0 acceptance
bar:**
- **Column flow naming:** has `running`; bar wants the explicit
  `TRIAGE → TODO → READY → IN-PROGRESS → BLOCKED → DONE` 6-column flow (relabel
  `running` → `IN-PROGRESS`; ensure all 6 render even when empty).
- **Lanes-by-profile grouping:** current board is a flat column set; bar wants
  optional grouping of tasks into swim-lanes by `profile`.
- **Filters:** current screen has board chips + a profile prop but **no
  in-screen filter bar** — bar wants search box + tenant filter + assignee
  filter + show-archived toggle.
- **Nudge-Dispatcher control:** has `Dispatch` (one pass); bar wants a distinct
  **Nudge** action alongside Refresh.
- **Rich cards:** has prio/assignee/tenant/age pills; bar wants the fuller card
  vocabulary — **id chip**, **tags** (P2 / project / "0-of-1" progress),
  **@assignee**, **dependency count**, **timestamp** — laid out as a chip row.
- **Theme:** bar wants the **teal theme + serif section headers + a
  system-status footer**; current screen uses the generic schedules styling and
  has no footer.

### 2. Todos screen — MISSING (LOW priority)
hermes-webui `panelTodos` is a simple per-session todo list. No native
equivalent. Small build; lowest value of the delta (Kanban already covers
durable task tracking). Build only if it earns its place.

### 3. Workspaces screen — MISSING (LOW priority)
hermes-webui `panelWorkspaces` adds/switches operational workspaces. The
desktop's nearest concept is **profiles** (agents/Agents) + the Kanban **board
switcher**, which together cover most of the intent. A dedicated workspace
add/switch screen is genuinely absent but largely redundant given profiles +
boards. Defer unless Fritz wants explicit workspace semantics.

## Verdict
Of 13 hermes-webui areas, **9 are HAVE** (native, in agentos or an adjacent
domain), **2 are PARTIAL but out of agentos scope** (chat overlays, app-shell
banners), and the real agentos delta is **3 items**:
1. **Kanban → v0.11.0 bar** (PARTIAL, the meaty + primary Z2 work),
2. **Todos** (MISSING, low value),
3. **Workspaces** (MISSING, low value, mostly covered by profiles + boards).

Z2 should prioritize the Kanban upgrade; Todos/Workspaces are optional natives
that should only be built if they clear a value bar, not for inventory parity.
