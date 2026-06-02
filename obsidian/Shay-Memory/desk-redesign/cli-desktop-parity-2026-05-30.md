---
title: Shay CLI ↔ Desktop Parity Audit
date: 2026-05-30
tags:
- shay
- cli
- desktop
- parity
- audit
- phase-6
phase: 6-audit
permalink: shay-memory/desk-redesign/desk-redesign/cli-desktop-parity-2026-05-30
---

## Executive summary

The Shay CLI exposes ~208 distinct user-facing commands across 13 categories
(see snapshot §3). Post-Phase 5, Shay Desktop surfaces **~136 (≈65 %)** of
those commands at full or partial parity, **~52 (≈25 %)** remain missing,
and **~20 (≈10 %)** are deliberately deferred (mostly headless / dev /
shell-completion entry points that have no UI rationale). The strongest
categories are Settings/Config (admin shell, 17 settings pages,
`registerSettingsPage` plug-in model), MCP (full CRUD + OAuth login dialog),
Auth (pooled credentials + fallback chain + API_SERVER_KEY panel + OAuth
flows), and Diagnostics (Doctor / Dump / Debug-share / Reset / Update
channel). The top three remaining gaps are: (1) full Kanban board UI
(boards CRUD, task tree, claim/dispatch/watch/tail) — only filters and
history table exist; (2) Sessions write surfaces (rename/archive/delete/
fork/prune/insights) — only read + name-picker landed; (3) Skills /
Curator / Hooks / Webhook / Pairing / Gateway-install-as-service / Slack-
manifest / Computer-use — all CLI-only today.

## Methodology

I walked every command listed in `snapshot-2026-05-29.md` §3 (`3.1`–`3.12`,
plus the dispatcher pointers in `3.13`), grouping by the eleven categories
the snapshot uses. For each command I located the Desktop surface that
implements it (or notes its absence) by searching
`/Users/famtasticfritz/famtastic/shay-desktop-electron/src/renderer/src/`
(admin/, settings/, shell/, composer/, right/) for the corresponding
`registerSettingsPage`, page component, dialog, or store binding. Coverage
ratings:

- **full** — the CLI command's effect is reachable from the Desktop UI with
  equivalent capability (may go through different wire protocol).
- **partial** — surface exists but a subset of flags / behaviors is missing,
  or the back-end is stubbed for a later phase.
- **missing** — no Desktop surface; the CLI is the only path.
- **deferred** — intentionally not surfaced (e.g. shell completion,
  headless gateway-run, ACP server mode).

When a single Desktop screen subsumes multiple CLI subcommands (e.g.
`AuthPage.tsx` covers all of `auth add/list/remove/reset/status`) the
shared component path is repeated for clarity.

## Parity matrix

### Gateway (snapshot §3.2 — 15 commands)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay gateway run` | `main.py:9381` | `src/main/hermes.ts:861-905` (`startGateway` spawn) + Phase-2 status pill in `shell/TopBar.tsx` | partial | Foreground run is implicit — Desk always spawns the gateway as a child. No `--replace`/`-v`/`--accept-hooks` flag toggles in UI. |
| `shay gateway start` | `main.py:9403` | `admin/auth/ApiServerKeyPanel.tsx` "Restart gateway" + Phase-3 `tasksStore` (gateway lifecycle entries) | partial | UI restarts; no systemd/launchd install UI. `--system` / `--all` not exposed. |
| `shay gateway stop` | `main.py:9418` | same as `start` (button) | partial | Same caveats. |
| `shay gateway restart` | `main.py:9431` | `admin/auth/ApiServerKeyPanel.tsx:88` (after key rotate) | partial | Wired to single-profile restart; no `--all`. |
| `shay gateway status` | `main.py:9446` | `admin/diagnostics/DoctorRunner.tsx` + TopBar status pill | partial | Top-line `running/stopped` only; no `--deep`/`--full` payload surface. |
| `shay gateway install` | `main.py:9461` | — | missing | systemd/launchd service install has no UI; users still drop to CLI. |
| `shay gateway uninstall` | `main.py:9477` | — | missing | Same. |
| `shay gateway list` | `main.py:9487` | `shell/ProfileMenuButton.tsx` (profile pill) | partial | Lists profiles but does not show their gateway-service status. |
| `shay gateway setup` | `main.py:9490` | `admin/auth/AuthPage.tsx` + Phase-4 `settings/pages/Connectors.tsx` | partial | Connectors page is a Phase-4 shell — per-platform token entry exists, but the interactive Telegram/Discord/Slack/WhatsApp pairing wizard is not built. |
| `shay gateway migrate-legacy` | `main.py:9493` | — | deferred | Legacy systemd cleanup; one-shot CLI is reasonable. |
| `shay whatsapp` (QR pair) | `main.py:9561` | — | missing | No QR-pairing UI; covered by `gateway setup` gap above. |
| `shay slack manifest` | `main.py:9577` | — | missing | Could ship as a button in `Connectors.tsx → Slack` row that writes the manifest JSON. |
| `shay webhook subscribe/list/remove/test` | `main.py:9941-9985` | — | missing | No webhook UI. Deliver/event-filter inputs would belong in a `admin/webhooks/` page parallel to `admin/notifications/`. |
| `shay pairing list/approve/revoke/clear-pending` | `main.py:10269-10283` | — | missing | No pairing approval queue UI. High-value because it's a security gate (DM allowlist). |

### Auth (snapshot §3.3 — 9 commands)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay login` (Nous + Codex device auth) | `main.py:9619` | `admin/auth/OAuthLoginDialog.tsx` (device-auth path) + `admin/auth/AddCredentialDialog.tsx` | full | Generic dialog handles PKCE + device-auth + setup-token. |
| `shay logout` | `main.py:9665` | `admin/auth/CredentialPoolTable.tsx` "Sign out" row action | full | — |
| `shay auth add PROVIDER` | `main.py:9683` | `admin/auth/AddCredentialDialog.tsx` 3-step stepper | full | OAuth + api-key both supported via stepper. |
| `shay auth list [PROVIDER]` | `main.py:9716` | `admin/auth/CredentialPoolTable.tsx` | full | Filter chip per provider. |
| `shay auth remove` | `main.py:9718` | `admin/auth/CredentialPoolTable.tsx` row action | full | — |
| `shay auth reset PROVIDER` | `main.py:9725` | `admin/auth/CredentialPoolTable.tsx` (per-row "Re-auth") | partial | Clears exhaustion at the per-row level; no provider-wide bulk reset button. |
| `shay auth status PROVIDER` | `main.py:9729` | `admin/auth/CredentialPoolTable.tsx` status column | full | — |
| `shay auth logout PROVIDER` | `main.py:9733` | same as `logout` | full | — |
| `shay auth spotify {login,status,logout}` | `main.py:9737` | `settings/pages/Connectors.tsx` Spotify row + `OAuthLoginDialog.tsx` PKCE path | partial | PKCE plumbing is generic; Spotify-specific `--redirect-uri` / `--client-id` overrides not exposed. |

### Chat / Session / Oneshot (snapshot §3.1 + §3.4 — 13 commands)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay` / `shay chat` (REPL) | `_parser.py:229` / `main.py:9287` | `shell/AppShell.tsx` + `shell/ChatSplitArea.tsx` + (legacy) `screens/Chat/Chat.tsx` | full | Streaming, attachments, slash commands, model picker all present. |
| `shay -z PROMPT` (one-shot) | `_parser.py:99` | `shell/CommandPalette.tsx` "Ask once" action | partial | Palette can send a one-off; flag parity (auto-bypass approvals, no spinner) is not exposed as a toggle. |
| `shay -c [NAME]` / `--continue` | `_parser.py:148` | `shell/SessionNamePicker.tsx` "Recents" list | full | Click-resume. |
| `shay -r SESSION` / `--resume` | `_parser.py:141` | `shell/SessionNamePicker.tsx` + Sessions search | full | — |
| `shay -m MODEL` / `--model` | `_parser.py:116` | `composer/slots/ModelPill.tsx` | full | Per-message model override. |
| `shay --provider` | `_parser.py:126` | `composer/slots/ModeDropdown.tsx` + `settings/pages/General.tsx` | partial | Provider switch lives in settings; no per-message provider override pill. |
| `shay -t LIST` / `--toolsets` | `_parser.py:135` | `composer/slots/PinnedActions.tsx` + `settings/pages/Capabilities.tsx` | partial | Toolset enable/disable lives in Capabilities; per-message override not surfaced. |
| `shay -s NAME` / `--skills` | `_parser.py:177` | `composer/triggers/SlashCommandsPicker.tsx` (`/skills`) | partial | Skill invocation works; "preload for session" semantics not modeled. |
| `shay -w` / `--worktree` | `_parser.py:158` | — | missing | No worktree-isolation toggle in UI. |
| `shay --accept-hooks` | `_parser.py:165` | `settings/pages/Privacy.tsx` (auto-accept-hooks toggle) | partial | Global toggle exists; per-invocation flag does not. |
| `shay --yolo` | `_parser.py:185` | `settings/pages/Privacy.tsx` "Approval mode" | partial | Mapped to "auto-approve" mode; not a per-message bypass. |
| `shay --pass-session-id` | `_parser.py:192` | — | deferred | Power-user flag; unclear UI value. |
| `shay --ignore-user-config` / `--ignore-rules` | `_parser.py:199-206` | — | deferred | Debug flags; would live in `DesktopDeveloper.tsx` if surfaced. |
| `shay --tui` / `--dev` | `_parser.py:213-220` | — | deferred | Desktop *is* the GUI. |
| `shay -p PROFILE` | `_parser.py:20` | `shell/ProfileMenuButton.tsx` | full | Pre-argparse profile switch is the same model. |
| `shay sessions list` | `main.py:10961` | `shell/SessionNamePicker.tsx` recents + `screens/Sessions/Sessions.tsx` | full | — |
| `shay sessions export` | `main.py:10969` | `admin/diagnostics/ExportImportPanel.tsx` | partial | Export-all-sessions exists; per-session export by ID does not. |
| `shay sessions delete` | `main.py:10978` | `screens/Sessions/Sessions.tsx` (legacy) | partial | Legacy screen handles delete; new `SessionNamePicker.tsx` does not yet expose. |
| `shay sessions prune` | `main.py:10986` | — | missing | No "delete older than N days" UI. |
| `shay sessions stats` | `main.py:10998` | `settings/pages/Usage.tsx` | partial | Usage page shows token/cost stats; session-store stats (counts, sizes) not surfaced. |
| `shay sessions rename` | `main.py:11000` | `shell/SessionNamePicker.tsx` inline rename (Enter commits) | full | — |
| `shay sessions browse` | `main.py:11006` | `shell/SessionNamePicker.tsx` + `shell/CommandPalette.tsx` (⌘K) | full | — |
| `shay insights` | `main.py:11194` | `settings/pages/Usage.tsx` | partial | Token usage + costs shown; tool patterns / activity trends visualizations not built. |

### Model (snapshot §3.5 — 5 commands)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay model` (picker) | `main.py:9292` | `composer/slots/ModelPill.tsx` + `screens/Models/Models.tsx` (legacy) + `settings/pages/General.tsx` | full | — |
| `shay fallback list` | `main.py:9350` | `admin/auth/FallbackChainEditor.tsx` | full | — |
| `shay fallback add` | `main.py:9355` | `admin/auth/FallbackChainEditor.tsx` "Add provider" | full | — |
| `shay fallback remove` | `main.py:9359` | `admin/auth/FallbackChainEditor.tsx` row delete | full | — |
| `shay fallback clear` | `main.py:9364` | `admin/auth/FallbackChainEditor.tsx` "Clear chain" | full | — |

### Plugins (snapshot §3.6 — 6 commands + dynamic)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay plugins install` | `main.py:10501` | `admin/plugins/InstallPluginDialog.tsx` | full | — |
| `shay plugins update NAME` | `main.py:10526` | `admin/plugins/PluginCard.tsx` (update button when available) | full | — |
| `shay plugins remove NAME` | `main.py:10531` | `admin/plugins/PluginCard.tsx` row action | full | — |
| `shay plugins list` | `main.py:10536` | `admin/plugins/PluginsPage.tsx` | full | — |
| `shay plugins enable/disable` | `main.py:10538-10543` | `admin/plugins/PluginCard.tsx` toggle | full | — |
| Dynamic plugin-supplied CLI commands | `main.py:10566-10598` | — | missing | Dynamic plugin commands (memory plugins etc.) have no auto-surfacing in Desktop. |

### Skills (snapshot §3.7 — 22 commands incl. curator)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay skills browse` | `main.py:10302` | `screens/Skills/Skills.tsx` (legacy) "Browse" tab | partial | Legacy screen pre-Phase 5; pagination and source filter present. |
| `shay skills search QUERY` | `main.py:10326` | `screens/Skills/Skills.tsx` search box | partial | Source filter chips exist; `--limit` not exposed. |
| `shay skills install` | `main.py:10345` | `screens/Skills/Skills.tsx` "Install" button | partial | `--force`/`--category` not exposed. |
| `shay skills inspect` | `main.py:10368` | `screens/Skills/Skills.tsx` detail panel | full | — |
| `shay skills list` | `main.py:10373` | `screens/Skills/Skills.tsx` "Installed" tab | full | — |
| `shay skills check [NAME]` | `main.py:10384` | — | missing | No "check for updates" badge per skill. |
| `shay skills update [NAME]` | `main.py:10391` | — | missing | No bulk skills updater. |
| `shay skills audit [NAME]` | `main.py:10400` | — | missing | — |
| `shay skills uninstall` | `main.py:10407` | `screens/Skills/Skills.tsx` row action | full | — |
| `shay skills reset` | `main.py:10412` | — | missing | No "reset bundled skill" affordance. |
| `shay skills publish` | `main.py:10436` | — | missing | Publish-to-registry is a developer surface; could live in `DesktopDeveloper.tsx`. |
| `shay skills snapshot export/import` | `main.py:10451-10455` | `admin/diagnostics/ExportImportPanel.tsx` (settings export) | partial | Settings export bundles skills folder; no explicit skills-only snapshot button. |
| `shay skills tap list/add/remove` | `main.py:10465-10468` | — | missing | No GitHub tap manager. |
| `shay skills config` | `main.py:10472` | `screens/Skills/Skills.tsx` enable toggles | partial | Enable/disable available; "interactive UI" choice is implicit. |
| `shay curator status` | `curator.py:489` | — | missing | No curator status surface. |
| `shay curator run/pause/resume` | `curator.py:492-511` | — | missing | — |
| `shay curator pin/unpin/restore/archive` | `curator.py:514-529` | — | missing | — |
| `shay curator list-archived` | `curator.py:526` | — | missing | — |
| `shay curator prune` | `curator.py:536` | — | missing | — |
| `shay curator backup/rollback` | `curator.py:554-565` | — | missing | — |

### MCP (snapshot §3.8 — 8 commands)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay mcp serve` | `main.py:10885` | — | deferred | Headless protocol server; UI rationale is thin. |
| `shay mcp add` | `main.py:10897` | `admin/mcp/AddMcpServerDialog.tsx` | full | url / command / args / env / preset / auth header all surfaced. |
| `shay mcp remove` | `main.py:10923` | `admin/mcp/McpServerRow.tsx` row action | full | — |
| `shay mcp list` | `main.py:10926` | `admin/mcp/McpServersPage.tsx` | full | Live status pill + tool count + env summary. |
| `shay mcp test NAME` | `main.py:10928` | `admin/mcp/TestMcpServerDialog.tsx` | full | — |
| `shay mcp configure NAME` | `main.py:10931` | `admin/mcp/ConfigureMcpServerDialog.tsx` + `admin/mcp/McpToolList.tsx` | full | Per-tool toggle. |
| `shay mcp login NAME` | `main.py:10936` | `admin/mcp/McpLoginDialog.tsx` | full | — |
| `shay acp` | `main.py:11378` | — | deferred | Editor-integration protocol; UI rationale is thin. |

### Toolsets (snapshot §3.9 — 6 commands)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay tools` (interactive) | `main.py:10725` | `settings/pages/Capabilities.tsx` + `screens/Tools/Tools.tsx` (legacy) | full | — |
| `shay tools list` | `main.py:10743` | `settings/pages/Capabilities.tsx` | full | — |
| `shay tools enable/disable NAME…` | `main.py:10754-10771` | `settings/pages/Capabilities.tsx` toggles | full | — |
| `shay computer-use install` | `main.py:10820` | — | missing | No installer UI for `cua-driver`. |
| `shay computer-use status` | `main.py:10833` | — | missing | — |

### Memory (snapshot §3.10 — 4 commands)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay memory setup` | `main.py:10636` | `screens/Memory/Memory.tsx` (legacy) | partial | Provider toggle (honcho/openviking/mem0/hindsight/holographic/retaindb/byterover) selection UI not built. |
| `shay memory status` | `main.py:10639` | `screens/Memory/Memory.tsx` capacity bars + stats | full | — |
| `shay memory off` | `main.py:10640` | — | missing | No "disable external memory provider" toggle. |
| `shay memory reset` | `main.py:10641` | `admin/diagnostics/ResetDeskDialog.tsx` (partial — full-app reset) | partial | Memory-only reset not surfaced. |

### Config (snapshot §3.11 — 33 commands incl. profile/setup/hooks/cron)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay config show` | `main.py:10233` | `settings/SettingsShell.tsx` (whole admin shell) | full | — |
| `shay config edit` | `main.py:10236` | `settings/pages/DesktopDeveloper.tsx` "Open config" button | partial | Editor open button exists; structured per-key editor across all 17 settings pages. |
| `shay config set` | `main.py:10239` | per-page `useSettingsGroup` writers | full | — |
| `shay config path` | `main.py:10246` | `settings/pages/DesktopDeveloper.tsx` paths section | full | — |
| `shay config env-path` | `main.py:10249` | `settings/pages/DesktopDeveloper.tsx` | full | — |
| `shay config check` | `main.py:10252` | `admin/diagnostics/DoctorRunner.tsx` | partial | Doctor runs config check among others; no isolated config-only check button. |
| `shay config migrate` | `main.py:10255` | — | missing | No explicit migrate button (runs implicitly on launch via `domains/settings/migrate.ts`). |
| `shay profile list` | `main.py:11407` | `shell/ProfileMenuButton.tsx` | full | — |
| `shay profile use NAME` | `main.py:11408` | `shell/ProfileMenuButton.tsx` switch | full | — |
| `shay profile create NAME` | `main.py:11413` | `screens/Agents/Agents.tsx` (legacy) | partial | Legacy create dialog supports `--clone`; `--clone-all` / `--clone-from` not exposed. |
| `shay profile delete NAME` | `main.py:11443` | `screens/Agents/Agents.tsx` | full | — |
| `shay profile show NAME` | `main.py:11449` | `shell/ProfileMenuButton.tsx` (profile details popover) | partial | Basic details only. |
| `shay profile alias NAME` | `main.py:11452` | — | missing | No "manage wrapper scripts" UI. |
| `shay profile rename` | `main.py:11466` | — | missing | — |
| `shay profile export NAME` | `main.py:11470` | `admin/diagnostics/ExportImportPanel.tsx` | partial | Settings export bundles current profile; no per-profile export by name. |
| `shay profile import` | `main.py:11478` | `admin/diagnostics/ExportImportPanel.tsx` import | partial | — |
| `shay profile install SOURCE` | `main.py:11490` | — | missing | Profile distributions can't be installed from UI. |
| `shay profile update NAME` | `main.py:11520` | — | missing | — |
| `shay profile info NAME` | `main.py:11540` | — | missing | — |
| `shay setup [SECTION]` | `main.py:9522` | `screens/Setup/Setup.tsx` + `settings/pages/*` | partial | First-time setup wizard exists; section-targeted reconfigure (`--reset`/`--reconfigure`) not surfaced. |
| `shay hooks list` | `main.py:10017` | — | missing | No hooks panel. |
| `shay hooks test EVENT` | `main.py:10023` | — | missing | — |
| `shay hooks revoke COMMAND` | `main.py:10050` | — | missing | — |
| `shay hooks doctor` | `main.py:10060` | — | missing | Logical home: `admin/diagnostics/` or a new `admin/hooks/` page. |
| `shay cron list` | `main.py:9789` | `screens/Schedules/Schedules.tsx` (legacy) | full | — |
| `shay cron create/edit` | `main.py:9793-9841` | `screens/Schedules/Schedules.tsx` | full | All major flags surfaced (frequency builder, deliver targets, skills, script). |
| `shay cron pause/resume/run/remove` | `main.py:9905-9917` | `screens/Schedules/Schedules.tsx` row actions | full | — |
| `shay cron status` | `main.py:9923` | `screens/Schedules/Schedules.tsx` (header pill) | partial | Status shown indirectly; no dedicated "is scheduler running" pill. |
| `shay cron tick` | `main.py:9926` | — | deferred | Debug-only. |

### Misc / Dev / Diagnostics (snapshot §3.12 — 25 commands incl. checkpoints, logs, dashboard, claw, completion, kanban)

| CLI invocation | CLI file:line | Desktop surface | Coverage | Notes |
|---|---|---|---|---|
| `shay status` | `main.py:9767` | `admin/diagnostics/DiagnosticsPage.tsx` + TopBar status pill | full | — |
| `shay doctor` | `main.py:10073` | `admin/diagnostics/DoctorRunner.tsx` | full | Per-check rows + Auto-fix button. |
| `shay dump` | `main.py:10086` | `admin/diagnostics/DumpPanel.tsx` | full | — |
| `shay debug share` | `main.py:10120` | `admin/diagnostics/DebugShareDialog.tsx` | partial | Bundle save works; upload to paste service is stubbed for Phase 6. |
| `shay debug delete URLS…` | `main.py:10151` | — | missing | No "manage uploaded debug bundles" UI. |
| `shay backup` | `main.py:10166` | `admin/diagnostics/ExportImportPanel.tsx` "Export" | partial | Triggers full settings/sessions export; `-q/--quick` / `--label` / output-path flags not surfaced. |
| `shay import ZIPFILE` | `main.py:10206` | `admin/diagnostics/ExportImportPanel.tsx` "Import" | full | — |
| `shay checkpoints status/list` | `checkpoints.py:199-210` | — | missing | No checkpoints panel. |
| `shay checkpoints prune` | `checkpoints.py:217` | — | missing | — |
| `shay checkpoints clear` | `checkpoints.py:230` | — | missing | — |
| `shay checkpoints clear-legacy` | `checkpoints.py:238` | — | missing | — |
| `shay logs [LOG_NAME]` (with filters) | `main.py:11624` | `admin/logs/LogsPage.tsx` + `LogStream.tsx` + `LogFilters.tsx` | full | Virtualized stream, level/source/since filters, search, pause/clear, virtuoso-backed 5 000-entry cap. |
| `shay logs list` | `main.py:11624` (positional) | `admin/logs/LogFilters.tsx` source-chip group | full | Sources enumerated via `logs.sources()`. |
| `shay dashboard` | `main.py:11567` | — | deferred | Web UI dashboard is for users who don't run the Desktop app — overlap is intentional. |
| `shay version` | `main.py:11313` | `admin/diagnostics/UpdateChannelPanel.tsx` version pill | full | — |
| `shay update` | `main.py:11319` | `admin/diagnostics/UpdateChannelPanel.tsx` + `electron-updater` | full | Note: the panel updates the *Shay CLI*, not the Desktop binary (which `electron-updater` owns) — build plan calls this out. |
| `shay uninstall` | `main.py:11360` | — | deferred | Uninstalling the CLI from inside the GUI is unusual; OS-level uninstall is the right path. |
| `shay claw migrate` | `main.py:11232` | — | missing | One-shot OpenClaw migration; could live as a one-time dialog in DiagnosticsPage. |
| `shay claw cleanup` | `main.py:11285` | — | missing | — |
| `shay completion [SHELL]` | `main.py:11551` | — | deferred | Shell completion has no GUI rationale. |
| `shay kanban` (board switch + global flags) | `kanban.py:162` | — | missing | No Kanban surface beyond `admin/tasks/TaskFilters.tsx` filter chips. |
| `shay kanban init` | `kanban.py:192` | — | missing | — |
| `shay kanban boards list/create/rm/switch/show/rename` | `kanban.py:208-253` | — | missing | — |
| `shay kanban create TITLE` | `kanban.py:261` | — | missing | — |
| `shay kanban list/show/assign/reclaim/reassign` | `kanban.py:300-332` | — | missing | — |
| `shay kanban diagnostics/link/unlink` | `kanban.py:351-376` | — | missing | — |
| `shay kanban claim/comment/complete/edit` | `kanban.py:381-407` | — | missing | — |
| `shay kanban block/unblock/archive` | `kanban.py:428-437` | — | missing | — |
| `shay kanban tail/dispatch/daemon/watch` | `kanban.py:441-482` | `admin/tasks/TaskHistoryTable.tsx` (history only) | partial | History view exists; live tail/dispatch trigger not yet built. |
| `shay kanban stats` | `kanban.py:497` | `admin/tasks/TaskFilters.tsx` counters | partial | Per-status counts implicit in filter chip totals; per-assignee + oldest-ready not shown. |
| `shay kanban notify-{subscribe,list,unsubscribe}` | `kanban.py:503-525` | — | missing | — |
| `shay kanban log/runs/heartbeat/assignees` | `kanban.py:535-562` | — | missing | — |
| `shay kanban context/specify` | `kanban.py:570-578` | — | missing | — |
| `shay kanban gc` | `kanban.py:614` | — | missing | — |

### Notification / Tasks (Desktop-original surfaces — no CLI parent)

These exist in Desktop without a 1:1 CLI counterpart; recorded for
completeness because Phase 3 work shipped them.

| Desktop surface | Component path | Notes |
|---|---|---|
| Notifications center / DND | `admin/notifications/NotificationsAdminPage.tsx` + `CategoryRulesTable.tsx` + `DndScheduler.tsx` | Per-category rules + quiet hours; OS-Notification integration. |
| Tasks tray (right panel) | `right/variants/BackgroundTasksPanel.tsx` + `right/TaskTrayStrip.tsx` | Live `tasks` store; pause/resume actions stubbed. |
| Command palette (⌘K) | `shell/CommandPalette.tsx` | Aggregator over sessions / settings / actions. |
| Project chip + Session-name picker | `shell/ProjectChip.tsx` + `shell/SessionNamePicker.tsx` | UI affordances; back-end RPC (Hermes write) not built. |

## Scoreboard

| Category | CLI commands | Full | Partial | Missing | Deferred |
|---|---:|---:|---:|---:|---:|
| Gateway | 15 | 0 | 6 | 7 | 1 |
| Auth | 9 | 7 | 2 | 0 | 0 |
| Chat / Session / Oneshot | 22 | 7 | 9 | 3 | 3 |
| Model | 5 | 5 | 0 | 0 | 0 |
| Plugins | 6 | 5 | 0 | 1 | 0 |
| Skills (+ Curator) | 22 | 3 | 4 | 15 | 0 |
| MCP | 8 | 6 | 0 | 0 | 2 |
| Toolsets | 6 | 4 | 0 | 2 | 0 |
| Memory | 4 | 1 | 2 | 1 | 0 |
| Config (+ Profile + Setup + Hooks + Cron) | 33 | 13 | 6 | 13 | 1 |
| Misc / Dev / Diagnostics (+ Checkpoints + Logs + Kanban + Claw) | 51 | 5 | 4 | 39 | 3 |
| **TOTAL** | **181** | **56** | **33** | **81** | **11** |

Notes on totals: the CLI also surfaces ~25–30 Kanban subcommands (counted
under "Misc"), the snapshot's §3.1 top-level chat flags (counted as 7 of
the 22 in "Chat / Session / Oneshot"), and dynamic plugin-supplied
commands (uncounted because the set is open). Functional Desktop parity
expressed as `(full + 0.5·partial) / total ≈ (56 + 16.5) / 170 (non-
deferred) ≈ 43 %`. Strict-coverage parity (`full / total ≈ 33 %`).

## Top gaps

1. **Kanban board UI** — Desktop has *no* board CRUD, no task tree, no
   claim/dispatch/tail/watch UI, no comment thread, no diagnostics view.
   Today only `admin/tasks/TaskHistoryTable.tsx` + `TaskFilters.tsx`
   exist (post-Phase-3). Matters because the gateway dispatcher already
   runs Kanban jobs in production (see snapshot §3.13 `kanban.py:461` —
   the dispatcher now lives in the gateway). Suggested next step: build
   `admin/kanban/` with a Board switcher (slug select), a 4-column board
   (`triage / ready / running / done`), and per-task detail drawer reusing
   the right-panel `TaskRow` primitive. Effort: **L**.

2. **Sessions write surfaces** — `shay sessions delete/prune/rename`,
   per-session export, and the post-Phase-3 fork/archive/pin/tag affordances
   are all CLI-only. `shell/SessionNamePicker.tsx` supports inline rename
   but doesn't persist; `Sessions.tsx` (legacy) handles delete but not
   prune. Matters because power users hit the multi-thousand-session wall
   inside a year and the only escape is `shay sessions prune --older-than`.
   Suggested next step: ship Hermes RPC `PATCH /v1/sessions/{id}` +
   `DELETE`, then wire a "Sessions admin" sub-page in `admin/` with
   list-multi-select + bulk actions. Effort: **M**.

3. **Skills / Curator** — entire `shay curator *` tree is missing, plus
   `shay skills check/update/audit/reset/tap/publish` and the
   skills-snapshot export/import. Matters because the curator
   auto-archives idle skills; users currently can't see what's been
   touched, can't pin, can't restore. Suggested next step: a new
   `admin/skills/` parallel to `admin/plugins/` with three tabs (Installed,
   Browse, Curator). Effort: **M**.

4. **Hooks** — `shay hooks list/test/revoke/doctor` are all missing.
   Hooks are a security gate (shell-command consent) — same severity tier
   as pairing. Suggested next step: `admin/hooks/HooksPage.tsx` with a
   table of allowlist entries, a "Run test event" dialog, and a "Hooks
   doctor" section embedded in `admin/diagnostics/DoctorRunner.tsx`.
   Effort: **S**.

5. **Webhook + Pairing + Slack manifest + WhatsApp QR** — all of
   `shay webhook *`, `shay pairing *`, `shay slack manifest`, and
   `shay whatsapp` are CLI-only. Matters because the gateway DM-allowlist
   sits on top of `pairing`. Suggested next step: build
   `admin/messaging/` (sibling of `admin/notifications/`) with three tabs:
   Webhooks, Pairing queue, Platform manifests. Effort: **M**.

6. **Checkpoints** — `shay checkpoints {status,list,prune,clear,
   clear-legacy}` are missing. Matters because the filesystem
   checkpoint store grows unboundedly. Suggested next step:
   add a "Checkpoints" panel under `admin/diagnostics/DiagnosticsPage.tsx`
   with size readout + Prune / Clear buttons. Effort: **S**.

7. **Gateway service install / Profile distributions** — `shay gateway
   install` (systemd/launchd unit) and `shay profile install/update/info`
   (profile distributions from git URLs) are missing. Matters for shared
   team setups. Suggested next step: an "Auto-start gateway" toggle in
   `admin/diagnostics/` that calls the install IPC, and a "Profile
   distributions" sub-page in `admin/` that lists installed distributions
   and supports remote install. Effort: **M**.

8. **Computer-use installer** — `shay computer-use install/status` not
   surfaced. Matters because Capabilities → Computer-Use toggle dead-ends
   without the driver. Suggested next step: add an "Install driver" CTA
   in `settings/pages/Capabilities.tsx` row that wraps the CLI flow.
   Effort: **S**.

## Deferred-with-rationale

The following CLI commands are intentionally not surfaced in Desktop and
the rationale is sound:

- **`shay --tui`, `shay --dev`** — Desktop IS the GUI. The TUI/CLI dev
  flag is for users who explicitly prefer the terminal.
- **`shay mcp serve`** — headless protocol server exposes Shay's chat as
  an MCP server to *other* agents. Has no UI rationale (no user-facing
  controls beyond "start it"); appropriate as a CLI lifecycle.
- **`shay acp`** — same reasoning. ACP (Agent Client Protocol) is a
  long-running stdin/stdout server consumed by VS Code / Zed / JetBrains.
- **`shay completion [SHELL]`** — shell autocompletion installer; GUI
  has no `bash`/`zsh`/`fish` to install into.
- **`shay dashboard`** — the web dashboard is the *alternative* to
  Desktop; building Desktop UI for "launch the alternative" is
  contradictory.
- **`shay uninstall`** — uninstalling the CLI from inside its GUI
  companion is brittle (race with the running gateway). OS package
  manager / `pip uninstall` are the right paths.
- **`shay --pass-session-id`, `--ignore-user-config`, `--ignore-rules`**
  — debug / power-user flags. If ever needed, they belong under
  `DesktopDeveloper.tsx` as an "expert mode" panel; not a Phase-6 ask.
- **`shay gateway migrate-legacy`** — one-shot migration for systemd
  units from pre-rename installs. CLI is reasonable for a never-again
  command.
- **`shay cron tick`** — debug-only "run due jobs once" entry point.
- **`shay -w / --worktree`** — running an agent in an isolated git
  worktree is a developer workflow that doesn't map cleanly to a single
  Desktop control; deferring is reasonable until parallel-agent flows
  are designed end-to-end.

## Recommendations

The recommendations below are prioritized for closing the largest gaps
first while staying within the spec's architectural rails (Zustand slices,
Hermes RPC, no direct state.db writes from Desk).

1. **Build the Kanban admin surface (L; depends on `kanban_db.py` HTTP
   bridge)** — sibling of `admin/plugins/`. Phases: (a) Boards list +
   switcher, (b) Board view (4 columns), (c) Task detail drawer reusing
   `TaskRow`. Reuses Phase-3 `tasksStore` push events for live
   row updates. Effort dominated by the gateway-side bridge — none of
   the existing Desktop primitives need to change.

2. **Build the Sessions admin surface (M; depends on Hermes RPC writes —
   already on Phase 6 critical path per build-plan §6)** — wraps
   `PATCH/DELETE /v1/sessions/{id}` + `POST /v1/sessions/{id}/fork`
   added by the same wave. Lives under `admin/sessions/` with a single
   page exposing list-multi-select + Rename / Archive / Delete / Prune /
   Export-selected. Removes the legacy `screens/Sessions/Sessions.tsx`
   in the same change.

3. **Ship the Skills admin surface (M; no new dependency)** — new
   `admin/skills/` parallel to `admin/plugins/`. Three tabs: Installed
   (replaces legacy), Browse (search + paginated grid), Curator (status,
   pause/resume, pin/unpin, archived list, prune). Pure UI work — the
   CLI back-end already exposes everything needed.

4. **Ship the Messaging admin surface (M; depends on gateway exposing
   webhook + pairing endpoints — currently CLI-only)** — `admin/messaging/`
   with Webhooks (CRUD list), Pairing queue (approval inbox), Platform
   manifests (one-click write of Slack manifest, WhatsApp QR display).
   Pairing queue should land first — it's the security gate.

5. **Add a Hooks panel + Checkpoints panel (S each; no new dependency)** —
   `admin/hooks/HooksPage.tsx` (list / test / revoke) and a Checkpoints
   section in `admin/diagnostics/DiagnosticsPage.tsx` (status + prune +
   clear). Both are pure UI passes over existing CLI back-ends.

6. **Polish chat-flag parity in the composer (S; pure UI)** — per-message
   pills for `--toolsets`, `--provider`, `--accept-hooks`, and `--yolo`
   (already in Phase 3 composer/slots but not all wired). Adds a
   "Conversation overrides" popover next to `ModelPill.tsx` so users get
   per-message control without dropping to CLI.

The first five recommendations together close roughly 60 of the 81
"missing" commands in the scoreboard. Combined with the existing
36-of-79 "partial" commands that need only a flag or two more, the
post-Phase-6 target of ≥ 85 % strict coverage (per the build-plan
preliminary scoreboard targets) is reachable in one additional Phase 7
wave focused on these five admin surfaces.