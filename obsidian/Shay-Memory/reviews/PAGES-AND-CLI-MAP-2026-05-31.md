---
title: PAGES-AND-CLI-MAP-2026-05-31
type: note
permalink: shay-memory/reviews/pages-and-cli-map-2026-05-31
---

# Shay Desktop — Pages & CLI Coverage Map

**Date:** 2026-05-31
**Scope:** READ-ONLY design + architecture review of `shay-desktop-electron`. No files modified, app not launched (live build/QA loop in progress).
**Method:** Static read of `src/renderer/src/screens/*`, `src/renderer/src/shell/*`, `src/main/*`, `src/preload/*`, plus `~/.local/bin/shay --help` and sub-helps.

---

## TL;DR — the three things to fix before parity talk

1. **Two screens are silently dead-wired.** `App.tsx`'s `screenRegistry` maps `kanban` and `gateway` to **inline `<div>Kanban</div>` / `<div>Gateway</div>` placeholders** (App.tsx lines 247–248, 264, 267) — while **fully-built components exist and are not imported**: `Kanban/Kanban.tsx` (991 lines, full board API) and `Gateway/Gateway.tsx` (260 lines, real start/stop + platform toggles). This is the "2 known stubs," and the fix is a one-line import swap each. There is also a *third* implementation of each as `index.tsx` (read-only views) creating triple-redundancy.
2. **The nav lists 19 screens; the CLI exposes ~45 capabilities.** Roughly half the CLI surface has no GUI home. Biggest gaps: `auth`/credential pool (partial), `mcp` server management (read-only), `pairing`, `webhook`, `insights`, `curator`, `hooks`, `plugins`, `checkpoints`, `backup/import`, `profile` lifecycle.
3. **The screen-routing architecture is a hand-maintained string map, not a registry.** There is no `ScreenId` type, no central screen manifest. Nav lives in `Sidebar.tsx` `SCREENS[]`; routing lives in `App.tsx` `screenRegistry{}`; the two are duplicated by hand and already drifted (that drift is exactly how kanban/gateway got stubbed). This is the structural blocker to "a screen per command."

---

# PART A — Page-by-page breakdown

State legend: **WIRED** = calls real `window.hermesAPI.*` with a matching `ipcMain.handle` in `src/main`; **STUB** = placeholder rendered instead of the real component; **PARTIAL** = real backend but read-only or thin.

| # | Screen | Purpose | Controls / options exposed | State |
|---|--------|---------|----------------------------|-------|
| 1 | **Chat** | Primary agent conversation surface (streaming, tools, attachments). | Send message, abort, model picker, toolset toggles, attach files (drag/stage), slash commands, reads soul/memory for context. ~20 API calls inc. `sendMessage`, `onChatChunk/Done/Error/ToolProgress/Usage`, `listModels`, `getToolsets`, `stageAttachment`. | **WIRED** (richest screen) |
| 2 | **Sessions** | Browse / search session history. | List cached sessions, full-text search, sync cache, resume (lifts `currentSessionId`). `listCachedSessions`, `searchSessions`, `syncSessionCache`. | **WIRED** (no rename/delete/export/prune in UI — see Part C) |
| 3 | **Agents** | Manage profiles (isolated Shay instances). | Create / delete profile, set active profile, list. `createProfile`, `deleteProfile`, `listProfiles`, `setActiveProfile`. | **WIRED** (no export/import/alias/rename — CLI has them) |
| 4 | **AgentMonitor** | Live heartbeat view of running agents. | Read-only; polls `isRemoteMode()` every 5s and synthesizes a single "gateway" heartbeat row. No real multi-agent telemetry source. | **PARTIAL / near-placeholder** — only one synthetic row from a connectivity probe |
| 5 | **Kanban** | Multi-profile collaboration board. | *Real component* (`Kanban.tsx`): create board/task, complete/block/unblock/archive/reclaim/specify, switch board, dispatch-once, list boards/tasks, select folder. | **STUB ACTIVE** — registry renders `<div>Kanban</div>`; real 991-line component not imported. (Also a 3rd read-only `index.tsx` swarm view exists.) |
| 6 | **Schedules** | Cron job management. | Create / list / pause / resume / remove / trigger cron jobs. `createCronJob`, `listCronJobs`, `pauseCronJob`, `resumeCronJob`, `removeCronJob`, `triggerCronJob`. | **WIRED** |
| 7 | **Studio** | FAMtastic Site Studio control (launchd-managed server + preview). | Start/stop, set port + preview port, view logs, open external, status poll. `siteStudioStart/Stop/Status/SetPort/SetPreviewPort/GetLogs`, `openExternal`. | **WIRED** (registry imports `Studio/Studio.tsx`, the real one — NOT the unused `Studio/index.tsx` "pipeline runner") |
| 8 | **Tools** | Enable/disable toolsets per platform. | List toolsets, toggle enabled, list MCP servers. `getToolsets`, `setToolsetEnabled`, `listMcpServers`. | **WIRED** |
| 9 | **Skills** | Search / install / manage skills. | List bundled + installed, view content, install, uninstall. `listBundledSkills`, `listInstalledSkills`, `getSkillContent`, `installSkill`, `uninstallSkill`. | **WIRED** (no curator controls, no configure) |
| 10 | **Memory** | Configure memory provider + edit entries. | Read memory, add/update/remove entries, discover providers, write user profile, get/set env + config, open external. Full CRUD. | **WIRED** (rich) |
| 11 | **Soul** | Edit the agent's SOUL.md persona. | Read / write / reset soul. `readSoul`, `writeSoul`, `resetSoul`. | **WIRED** |
| 12 | **Models** | Manage model catalog. | Add / update / remove model, list, set env (keys). `addModel`, `updateModel`, `removeModel`, `listModels`, `setEnv`. | **WIRED** |
| 13 | **Providers** | Provider config + pooled credentials. | Get/set config, model config, credential pool (`getCredentialPool`/`setCredentialPool`), env, add model. | **WIRED** (covers part of CLI `auth`) |
| 14 | **Gateway** | Messaging gateway (Telegram/Discord/WhatsApp) control. | *Real component* (`Gateway.tsx`): start/stop gateway, status, per-platform enable toggle, env config. `gatewayStatus`, `startGateway`, `stopGateway`, `getPlatformEnabled`, `setPlatformEnabled`, `getEnv`, `setEnv`. | **STUB ACTIVE** — registry renders `<div>Gateway</div>`; real component not imported. (3rd `index.tsx` MCP-list variant also exists.) |
| 15 | **Office** | OpenClaw 3D / "claw3d" workspace control. | Setup, start-all / stop-all, status, set port + ws url, view logs, setup progress event, open external. `claw3d*` family. | **WIRED** |
| 16 | **CaptureInbox** | View captured inbox items. | Read-only list; reads `inbox` key out of `readMemory()`. No add/triage/clear actions. | **PARTIAL** (real data source, view-only) |
| 17 | **Logs** | View app/hermes logs + run doctor. | `getConfig`, `getHermesVersion`, `isRemoteMode`, `isSshTunnelActive`, `runHermesDoctor`, `verifyInstall`. | **WIRED** |
| 18 | **Diagnostics** | Health/connectivity diagnostics. | Real diagnostics domain (`window.shay.diagnostics`) + doctor/verify. | **WIRED** |
| 19 | **Settings** | App + connection + maintenance settings. | Connection mode (local/remote/ssh), SSH config + test, locale, version/update, backup/dump/import, claw migrate, doctor, devtools, privacy, tts, connectors, account, plugins domains. Very broad. `window.shay.*` domains + many `hermesAPI.*`. | **WIRED** (de-facto catch-all for many CLI commands) |

**Non-nav screens (flow, not in `SCREENS[]`):** Splash, Welcome, Install, Setup — install/onboarding flow driven by `App.tsx` state machine, not the nav. All WIRED.

---

# PART B — CLI → GUI coverage map

CLI top-level set from `shay --help`. GUI screen = the `screenRegistry` ref that covers it. Status: **full / partial / stub / missing**.

| CLI command | Sub-surface | GUI screen | Status | Notes |
|-------------|-------------|------------|--------|-------|
| `chat` | interactive | **Chat** | full | Richest, fully wired. |
| `model` | select default | **Models** / **Providers** | full | Add/update/remove + set default. |
| `fallback` | add/remove/list chain | **Providers** (partial) / NONE | partial | Fallback *chain* ordering UI not clearly exposed. |
| `gateway` | run/start/stop/status/install/setup | **Gateway** (real comp exists) | **stub** | Real comp built but registry wires a `<div>` placeholder. install/uninstall/migrate-legacy not in UI. |
| `setup` | wizard | **Setup** flow | full | Onboarding flow. |
| `slack` | manifest | NONE | missing | No Slack manifest generator in GUI. |
| `whatsapp` | setup | **Gateway** (platform toggle) | partial | Toggle yes, guided setup no. |
| `login`/`logout` | provider auth | **Providers** / **Settings** | partial | Covered via credential pool + connection settings. |
| `auth` | pooled creds add/list/remove/reset | **Providers** (`get/setCredentialPool`) | partial | Read/set pool, but no per-credential add/remove/reset/exhaustion UI. |
| `status` | component status | **Diagnostics** / **Logs** / **StatusBar** | full | Status bar + diagnostics. |
| `cron` | job mgmt | **Schedules** | full | Full CRUD + trigger. |
| `webhook` | subscribe/list/remove/test | NONE | missing | No webhook subscription UI. |
| `kanban` | board/tasks | **Kanban** (real comp exists) | **stub** | Real 991-line comp not imported; `<div>` placeholder active. |
| `hooks` | list/test/revoke/doctor | NONE | missing | Shell-hook allowlist not surfaced. |
| `doctor` | config check | **Logs** / **Diagnostics** (`runHermesDoctor`) | full | Wired. |
| `dump` | support summary | **Settings** (`runHermesDump`) | full | Wired. |
| `debug` | upload logs | **Settings** / **Logs** | partial | Log view yes; upload flow unclear. |
| `backup` | zip home | **Settings** (`runHermesBackup`) | full | Wired. |
| `checkpoints` | status/prune/clear | NONE | missing | No checkpoint store UI. |
| `import` | restore backup | **Settings** (`runHermesImport`) | full | Wired. |
| `config` | view/edit | **Settings** + most screens (`get/setConfig`) | full | Config surfaced piecemeal across screens. |
| `pairing` | list/approve/revoke | NONE | missing | DM pairing approval not in GUI. |
| `skills` | search/install/configure | **Skills** | partial | Install/uninstall/view yes; *configure* + search-hub no. |
| `plugins` | install/update/remove/list | **Settings** (`window.shay.plugins`) | partial | Plugins domain exists; dedicated screen no. |
| `curator` | status/run/pause/pin | NONE | missing | Skill-curator controls absent. |
| `memory` | setup/status/off/reset | **Memory** | full | Rich CRUD + provider config. |
| `tools` | list/enable/disable | **Tools** | full | Wired. |
| `computer-use` | install/status | NONE (Settings devtools?) | missing | cua-driver install/status not surfaced. |
| `mcp` | add/remove/list/test/login | **Tools** (list only) / **Gateway** `index` (unused) | partial | Read-only list; no add/remove/test/login. |
| `sessions` | list/export/delete/prune/rename | **Sessions** | partial | List + search + resume; no rename/export/delete/prune/stats. |
| `insights` | usage analytics | NONE | missing | No analytics/usage screen at all. |
| `claw` | OpenClaw migrate | **Settings** (`runClawMigrate`) / **Office** | full | Migrate wired; Office runs claw3d. |
| `version` | show version | **Settings** / **Logs** | full | Wired. |
| `update` | self-update | **Settings** (`runHermesUpdate`) | full | Wired. |
| `uninstall` | uninstall | NONE | missing | (Reasonably CLI-only.) |
| `acp` | ACP server | NONE | missing | Headless protocol — CLI-appropriate. |
| `profile` | list/use/create/delete/export/import/alias | **Agents** | partial | Create/delete/setActive yes; export/import/alias/rename/info no. |
| `dashboard` | web UI | (the desktop app itself) | n/a | Desktop app supersedes the web dashboard. |
| `logs` | view/filter | **Logs** | full | Wired. |
| `completion` | shell completion | NONE | n/a | CLI-only by nature. |

---

# PART C — The gap to "GUI for everything the CLI can do"

## C1. CLI capabilities with NO GUI screen (ranked by value)

| Rank | Capability | Why it matters | Effort |
|------|-----------|----------------|--------|
| 1 | **`insights`** (usage/cost/tool analytics) | A Claude-Desktop-class app is expected to show token spend, cost, and activity trends. Highest perceived-value gap; pure read-only screen over existing session data. | M |
| 2 | **`mcp` full management** (add/remove/test/login) | MCP is the extensibility story. Currently read-only list only. Belongs next to Tools. | M |
| 3 | **`pairing`** (approve/revoke DM users) | Security-sensitive: who can talk to the agent over Telegram/Discord. No GUI = invisible access control. | S |
| 4 | **`webhook`** (subscribe/list/test) | Event-driven activation; power-user feature with no surface. | M |
| 5 | **`auth` pooled-credential lifecycle** | Providers screen reads the pool but can't add/remove/reset individual creds or clear exhaustion. | S |
| 6 | **`curator`** (skill maintenance status/pin) | Skills screen has no view into the background curator that prunes/archives skills. | S |
| 7 | **`hooks`** (list/test/revoke shell hooks) | Security-sensitive allowlist with no GUI. | S |
| 8 | **`checkpoints`** (status/prune/clear) | Disk-usage + rollback history management. | S |
| 9 | **`computer-use`** install/status | macOS cua-driver state; small status card. | S |
| 10 | **`slack` manifest / `whatsapp` guided setup** | Onboarding friction for messaging platforms. | M |
| 11 | **`profile` export/import/alias/rename** | Agents screen covers core lifecycle but not portability. | S |

## C2. GUI screens that are stubs needing a real backend (ranked by value)

| Rank | Screen | Problem | Fix |
|------|--------|---------|-----|
| 1 | **Kanban** | Registry renders `<div>Kanban</div>`; the real, fully-API-wired `Kanban/Kanban.tsx` (991 lines) is never imported. | Import `Kanban/Kanban.tsx` into `App.tsx`, delete inline stub + redundant `index.tsx`. **~1 line.** |
| 2 | **Gateway** | Registry renders `<div>Gateway</div>`; real `Gateway/Gateway.tsx` (260 lines, start/stop/platform toggles) never imported. | Same one-line swap; reconcile the 3 implementations. |
| 3 | **AgentMonitor** | Not a placeholder div, but synthesizes a single fake "gateway" heartbeat from an `isRemoteMode()` probe — no real agent telemetry source. | Needs a real heartbeat/telemetry backend channel before it's meaningful. |
| 4 | **CaptureInbox** | View-only; reads `inbox` out of memory but offers no triage/add/clear actions. | Add capture actions or fold into Memory. |

**Note on redundancy:** Kanban, Gateway, and Studio each have BOTH a `Foo.tsx` and a `Foo/index.tsx` with *different* implementations. Studio is correctly disambiguated (App imports `Studio/Studio.tsx`, the real launchd one; `Studio/index.tsx` "pipeline runner" is dead). Kanban/Gateway are mis-wired to neither — they hit the App.tsx inline div. This triple-redundancy is dead code that should be cleaned to one implementation each.

---

# PART D — Architecture & UI assessment

## D1. Routing / screen architecture — is it sound for full CLI parity?

**Verdict: functional but structurally fragile. It will not scale to "a screen per command" without refactoring.**

How it works today:
- **Nav definition:** hand-written `SCREENS[]` array in `Sidebar.tsx` (ref/label/icon).
- **Routing:** hand-written `screenRegistry: Record<string, ReactNode>` object literal *inside the `MainShell` function body* in `App.tsx`.
- **Navigation state:** `useNavStore` (zustand) pushes `{kind:'view', ref}` entries; `App.tsx` reads the last `view` entry and indexes the registry; falls back to `chat`.
- **Preload:** domain-split (`auth-domain`, `capture-domain`, `sessions-domain`, etc.) under `src/preload/`, with `generated-bindings.ts` — the preload layer is the *healthiest* part of the architecture.

Problems:
1. **No single source of truth.** A screen requires editing two disconnected lists (`SCREENS[]` and `screenRegistry{}`) that share string keys by convention only. **This drift already shipped the kanban/gateway stub bug** — exactly the failure mode this structure invites.
2. **No `ScreenId` type.** Refs are bare strings (`"kanban"`, `"gateway"`). A typo or a missing registry entry silently falls back to chat or renders a stub. Nothing fails at compile time.
3. **Registry built inside a component render.** `screenRegistry` is reconstructed every `MainShell` render and embeds local chat state — it cannot be lazy-loaded, code-split, or unit-tested in isolation.
4. **No lazy loading.** Every screen is statically imported at the top of `App.tsx`. As parity grows to ~45 screens this bloats the initial bundle.

**Recommended structural change — a real screen manifest:**
```
src/renderer/src/screens/manifest.ts
  export type ScreenId = 'chat' | 'sessions' | ... ;  // union
  export const SCREENS: ScreenDef[] = [{
    id, label, icon, group, component: lazy(() => import('./Kanban/Kanban')),
    cli?: 'kanban',          // <-- the CLI command it fronts (parity tracking)
    status: 'full'|'partial'|'stub'|'missing',
  }];
```
Then `Sidebar` maps the manifest for nav and `App` maps it for routing — **one list, typed ids, `React.lazy` per screen, and a `cli:` field that makes the parity matrix self-documenting** (you could literally generate Part B from it). Adding a screen-per-command becomes: append one manifest entry. This single change converts the kanban/gateway class of bug from "ships silently" to "won't compile."

The **preload-domain architecture is sound** and should be the template: it's already split per concern with generated bindings, and 86 `ipcMain.handle` entries back the renderer calls. Parity work is mostly renderer-side (new screens over existing handlers) plus a handful of new handlers (insights, pairing, webhook, hooks, curator).

## D2. UI / IA verdict — does the shell match a Claude-Desktop-class app?

**Shell quality: yes, the bones are there.** `AppShell` is a proper three-column layout (Sidebar / main / RightPanel) with TopBar, ChatTabsRow, and a unified StatusBar. The sidebar has Claude/Cursor-class polish: two-stage collapse (expanded → icons → hidden with hover-peek), drag-reorderable pinned sessions, recents, custom user sections, per-section `FeatureBoundary` error isolation, and full keyboard + aria-live a11y. This is genuinely desktop-app-grade.

**IA verdict — chat as one screen among many: mostly right, with one inconsistency.**
- The model is correct for the app's ambition: chat is the hero, but Shay is a *control plane* for an agent platform (gateway, cron, profiles, skills, memory, providers), so a flat screen-nav alongside chat is the right IA.
- **Inconsistency to fix:** the `ScreenNav` list is rendered with **inline styles and single-letter placeholder icon chips** (`s.label[0]` in a rounded square) rather than the real `Icon` component used elsewhere in the sidebar — even though `SCREENS[]` already specifies real icon names (`message-circle`, `columns`, etc.). This is the one spot that looks unfinished against the otherwise-polished shell. Wiring the real `<Icon>` is cosmetic but high-visibility.
- **Grouping:** 19 flat nav items (heading toward ~45) needs grouping. Suggest sections: *Converse* (Chat, Sessions, Agents), *Automate* (Schedules, Kanban, Agent Monitor, Webhooks), *Capabilities* (Tools, Skills, MCP, Memory, Soul), *Models & Access* (Models, Providers, Auth, Pairing), *Channels* (Gateway, Office, Studio), *System* (Insights, Logs, Diagnostics, Settings). The manifest's `group` field (D1) drives this for free.

**Bottom line:** The shell is Claude-Desktop-class; the *routing layer* and *parity coverage* are not yet. The fastest, highest-leverage morning move is the two one-line stub fixes (Kanban, Gateway) — they make already-built, fully-wired screens instantly live — followed by adopting a typed screen manifest so the next 25 screens can't drift the way these two did.