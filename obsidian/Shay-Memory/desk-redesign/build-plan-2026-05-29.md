---
title: Shay Desktop — Unified Build Plan
date: 2026-05-29
tags:
- shay
- desktop
- build-plan
- redesign
- phase-2-plan
phase: 2-gap-and-plan
sources:
- spec-2026-05-29.md
- snapshot-2026-05-29.md
permalink: shay-memory/desk-redesign/build-plan-2026-05-29
---

## Executive plan

Shay Desktop today is a flat two-column Electron shell with one mega-Layout, no shared primitives, plaintext secrets, and a renderer that reads `state.db` directly and regex-parses `config.yaml`. The unified build sequence is: (1) lay state + theming + keychain foundation, (2) ship the shared primitive library, (3) refactor to a three-column AppShell with TopBar + StatusBar, (4) build out chat-core (typed blocks, virtualization, InteractiveBlock), (5) wire sidebar + bottom-row slot framework + composer + media row, (6) stand up right-panel + tasks + notifications, (7) explode Settings into sub-pages and land Admin/MCP/Auth, then (8) polish a11y, motion, and performance. Each phase consumes primitives and IPC namespaces shipped in earlier phases — no UI work begins before its prerequisite primitive exists.

Top three risks: **(a) schema coupling to `~/.shay/state.db`** — mitigated by moving all writes to new Hermes RPC and a Desk-owned overlay sqlite, with read-only state.db kept as offline cache only; **(b) plaintext secrets + unenforced `API_SERVER_KEY`** — mitigated by shipping safeStorage migration and loopback Bearer enforcement before any new Account/MCP-login UI lights up; **(c) OAuth surface explosion** — mitigated by scoping Phase 1 to Anthropic PKCE + Nous device-auth only and deferring per-connector flows behind "Connect via browser" CTAs.

## Build phases (ordered)

### Phase 0 — Primitives & foundation
**Scope.** Zustand store skeleton with all slices stubbed (`sessions, tabs, slots, panels, notifications, tasks, mode, model, customize, connection, sidebar, composer, attachments, chat, nav, settings`). Theme + density + focus + motion tokens migrated into CSS vars. Lucide icon registry. Keyboard shortcuts manifest with `tinykeys`. Top-level + per-feature error boundaries. Keychain (`safeStorage`) migration of `desktop.json` + `auth.json` plaintext. Auto-generated `API_SERVER_KEY` with loopback Bearer enforcement (coordinated gateway PR behind `SHAY_REQUIRE_BEARER=1`). IPC namespacing refactor — 128 flat handlers split into `domains/auth, mcp, logs, tasks, notifications, sessions, settings, keychain, capture, panels`. Consolidated `settings.get/set(group, patch)` replaces 25 ad-hoc handlers.

**Dependencies.** Coordinated PR in `shay-shay` for `SHAY_REQUIRE_BEARER` gateway change.

**Acceptance.** Zustand slices compile and are wired to a no-op selector test. Plaintext secrets file no longer present after first launch on a migrated install (`schema_version: 2` in `desktop.json`). All renderer→gateway HTTP carries `Authorization: Bearer`. `window.hermesAPI` exposes namespaced channels. Linux without `safeStorage` surfaces a visible "secrets unprotected" pill, never silently writes plaintext. Focus ring visible on every interactive element via `:focus-visible`. Reduce-motion preference collapses durations to 0ms.

### Phase 1 — Chat core
**Scope.** Typed SSE event taxonomy in gateway (`tool_call_start/delta/result`, `thinking_start/delta/end`, `ask_user`, `run_this`, `usage_tick`, `chapter_mark`) with backward-compatible aliases for `tool.progress`. `src/main/sse-parser.ts` parses both. `ChatMessage.blocks: Block[]` typed union in `shared/messages.ts`. `<InteractiveBlock>` and `<PanelChrome>` shared chrome primitives. `<BlockRenderer>` plus block variants (`ProseBlock`, `ToolCallBlock`, `CodeBlock`, `FileDiffBlock`, `ThinkingBlock`, `TerminalBlock`, `AskUserBlock`, `RunThisBlock`, `MediaBlock`). `APPROVAL_RE` regex deleted; replaced by `<AskUserBlock>` driven by the `ask_user` SSE event. Virtualization with `react-virtuoso` (preferred over `@tanstack/react-virtual` for variable-height streaming). `<CollapsibleWrapper>` with smart-collapse defaults. SSE backpressure (16ms coalescing buffer, 250ms throttle on `usage_tick`). Monotonic seq numbers on push channels with renderer gap-detection.

**Dependencies.** Phase 0 IPC namespacing + error boundaries.

**Acceptance.** Long sessions (10k+ messages) scroll at 60fps. Tool-call blocks collapse to one-liner by default and expand on click. AskUser approvals are first-class typed events with audit-trail rows written to `tool_approvals` sqlite. Gap-detected push channel triggers automatic `*.snapshot()` resync. Old `tool.progress` consumers still parse correctly during the alias window.

### Phase 2 — Sidebar + Top bar
**Scope.** `shell/Layout.tsx` three-column resizable grid (`react-resizable-panels`) replacing the current two-column `<aside>`/`.content` shell. `<TopBar>` with back/forward, global search, project chip, session-name dropdown, elapsed timer, pin, split, overflow. `<CommandPalette>` (cmdk) for ⌘K fuzzy search over sessions + projects + chapters. `<Sidebar>` with `<ModeTabs>` (Chat/Cowork/Code), `<SidebarPrimaryActions>`, Pinned + Recents sections, Custom sections (drag-reorderable via dnd-kit), `<ProfileMenuButton>` popover. Two-stage collapse (expanded → icons → hidden) with hover-peek overlay. `~/.shay/desktop/sessions-overlay.db` and `sidebar.json` persistence. Sessions write RPC stood up in gateway (`PATCH /v1/sessions/{id}`, `POST .../fork`, `DELETE`, `GET .../search?fuzzy=1`) plus new `project_id`/`brain_id`/`mode` columns. `<ChatTabsRow>` with horizontal `SplitPane`. Lightweight history stack in `nav` slice powering ◀ ▶. `messages` and `currentSessionId` lifted out of Layout into stores.

**Dependencies.** Phase 0 (Zustand, primitives), Phase 1 (typed messages so the right-rail stub knows what to subscribe to). Gateway PR for sessions write endpoints.

**Acceptance.** Three columns resize and persist widths per profile. Sidebar collapse cycles via chevron click and persists. ⌘K opens palette, fuzzy-matches sessions across projects in under 100ms on a 5k-session DB. Session rename/pin/archive routes through Hermes RPC + overlay db — `state.db` is never written to from renderer. Session-name dropdown shows pinned + recents + search inline. TopBar elapsed timer ticks without layout reflow.

### Phase 3 — Right panel + tasks + notifications
**Scope.** `<RightPanel>` with `<PanelTabsRow>`, vertical `SplitPane`, panel variants (`PreviewPanel`, `DiffPanel`, `TerminalPanel`, `FilesPanel`, `PlanPanel`, `BackgroundTasksPanel`, `CustomPanel`). Auto-switching subscriber on chat block events (tool_call:shell → Terminal, file_diff → Diff, artifact → Preview, plan → Plan), each gated by per-category Settings toggle. `<TaskTrayStrip>` with counters (🔴 running, ⚠ input-needed, ✓ done). Task aggregator in gateway (`GET /v1/tasks`, `/v1/tasks/stream` SSE, pause/resume/cancel endpoints). Notifications inbox backed by sqlite, OS Notification API + `app.setBadgeCount`, DND scheduler, per-category rules. `<StatusBar>` unified pill bar (Connection, Gateway, Update, Service health, in-app notification pulse). Pop-out BrowserWindow factory in `domains/panels/popout.ts` sharing `hardenAttachedWebContents` allowlist. Section 1 bottom-row `<SlotStrip>` (Slots A–F) with dnd-kit reorder + persistence. Slot E `<ContextIndicator>` extracted from UsageBadge. Slot F `<ModelPill>` composite. Slot D `<ModeDropdown>` mirroring sidebar mode (single source of truth). Slot B `<PlusMenuButton>` with refactored `commands/registry.ts`. Slot A `<PinnedActions>` swap menu. Slot C `<MicButton>` UI shell (no voice backend yet). Composer migrated to TipTap with `<TriggerPopover>` primitive for `/`, `@`, `!` sigils. `<MediaRow>` extracted from ChatInput (hidden when empty), `<AttachmentChip>` with ✎ ⓘ ⤴ actions, `<InspectPanel>`, `<ReusePicker>`, `<AnnotateModal>`, `<CaptureToolbar>` UI shell. `<InChatSearchOverlay>` (⌘F), `<ScrollToBottomPill>`, `<SelectionQuoteAction>`, message ContextMenu (Branch, Bookmark, Copy as, Pop out). Capture permissions in `security.ts` + Info.plist entries.

**Dependencies.** Phases 0–2. Gateway PR for `/v1/tasks*` SSE endpoints. Coordinated security review of pop-out window factory.

**Acceptance.** Tool-call from chat auto-focuses Terminal panel; toggle off in Settings stops auto-switch. TaskTray counters update from gateway SSE within 250ms. OS notification fires on task complete and is silenced during DND. StatusBar Connection pill flips to "degraded" within 2s of gateway pulse loss. Slots reorder by drag and persist per profile. Composer renders inline ``` blocks live, supports paste-files, drag-drop, `/@!` popovers. Media row slides in on first attachment, slides out when emptied. Pop-out window inherits hardened webContents allowlist (verified by security audit).

### Phase 4 — Settings
**Scope.** `<SettingsShell>` with left rail + sub-page routing replacing the 1079-LOC mega-file. Panels: General, Account, Privacy, Billing, Usage, Capabilities, Connectors, Claude Code, Cowork, Chrome, Desktop (General/Extensions/Developer), Appearance, Shortcuts (editor with TreeTable of `{id, scope, defaultKey, currentKey}`), Notifications (per-category matrix + DND schedule editor), Language, Voice. `<ConnectionForm>` extracted from Welcome/Settings duplication. Existing settings migrated into appropriate panels. New panels stubbed first, then wired. Single `getSettings(group)`/`setSettings(group, patch)` IPC consumed everywhere.

**Dependencies.** Phase 0 settings consolidation IPC. Primitives library (Modal, Tabs, Tree, ContextMenu).

**Acceptance.** Each sub-page renders independently and respects per-feature error boundary. Shortcut editor captures key combos and persists per-row + global reset. Settings import/export round-trips with `schemaVersion` and runs migrations on import. Zero direct writes to `desktop.json` outside `settingsStore`.

### Phase 5 — Admin / MCP / Auth
**Scope.** Plugins panel (wrap `shay plugins`). MCP panel — regex parse deleted, replaced by `mcp.*` IPC namespace backed by `mcp_config.py` single-writer with file lock; add server form, per-row Test/Configure/Re-login/Restart/Remove, live status pills. Logs panel with filter chips + virtualized live tail + search + export (`GET /v1/logs/tail` SSE in gateway). Diagnostics panel (`diagnostics.doctor/dump/debugShare`). Backup/Restore panel. Update channel panel (electron-updater for Desk binary, `shay update` for CLI/gateway — explicitly labeled). Hooks, Curator, Webhook/Pairing, ACP, Computer-use sub-panels. Auth subsystem: loopback OAuth host on random `127.0.0.1` port + `shay://oauth-callback` protocol backup, PKCE (Anthropic, Spotify, claude.ai setup-token), device-auth (Nous, OpenAI Codex), AccountPanel sign-in. Per-MCP-server OAuth via `mcp.login(name)` delegating to `domains/auth/`. Tool-approval audit table in `tool_approvals` sqlite.

**Dependencies.** Phase 0 keychain + Bearer enforcement. Phase 4 SettingsShell. Gateway PRs for `/v1/mcp/*`, `/v1/logs/tail`, `/v1/auth/oauth/*`, `/v1/auth/stream`.

**Acceptance.** MCP server add/test/login flows end-to-end without touching `config.yaml` via regex. Logs panel streams live tail from gateway without spawning a CLI child from renderer. Anthropic OAuth sign-in completes via loopback callback. Per-connector flows (Gmail/Drive/Slack/etc.) surface as "Connect via browser" CTAs deferred to a later phase. Diagnostics "Copy report" produces a structured JSON that includes version, OS, network, auth, last error.

### Phase 6 — Polish
**Scope.** A11y pass per primitive and per surface (focus traps, `aria-live` regions, keyboard alternatives for every drag interaction). Motion pass honoring `prefers-reduced-motion`. Virtualization audit (Sidebar Recents >50, BackgroundTasksPanel, LogsScreen 5k-line cap with paged tail). Crash reporter (electron.crashReporter local file sink, opt-in upload in Privacy). Reconnect handling — `useChatIPC` queues outbound messages on disconnect, replays on reconnect. Voice subsystem backend (Slot C mic, voice memo capture). Per-connector OAuth flows (deferred from Phase 5). Documentation pass on `shell/`, `primitives/`, `features/`, `stores/` boundaries to prevent regression.

**Dependencies.** All prior phases.

**Acceptance.** Lighthouse-equivalent a11y audit passes on every primary surface. No animation runs when `prefers-reduced-motion`. Renderer crash in one panel does not nuke the rest (verified by injected boundary fault). Disconnect/reconnect round-trip preserves queued message order. Per-connector OAuth flows light up Connectors panel rows from "Disconnected" to "Connected" with metadata.

---

## UI Build Plan

### 1. Design system / shared primitives

These primitives are the bedrock — every section depends on at least one of them, and the gap findings repeatedly flag their absence (snapshot §2: "No shared modal/dialog primitive"). Build these first; everything downstream is cheaper after they land.

| Primitive | Status | Source / Refactor target |
|---|---|---|
| **`<Modal>` / `<Dialog>`** | NEW | Refactor away ad-hoc overlays in `screens/Agents/Agents.tsx`, `screens/Models/Models.tsx`, `screens/Kanban/Kanban.tsx`, `screens/Schedules/Schedules.tsx`, `screens/Skills/Skills.tsx`. Compose on top of Radix UI Dialog primitive (a11y, focus trap, ESC, portal, scroll-lock). Variants: `confirm`, `form`, `viewer`. |
| **`<Popover>`** | NEW | Replaces the bespoke `.slash-menu` outside-click logic in `screens/Chat/ChatInput.tsx` + the inline ModelPicker dropdown in `screens/Chat/ModelPicker.tsx`. Radix Popover base. Powers `/`, `@`, `!` menus, session switcher dropdown, profile menu, model pill expansion. |
| **`<Tooltip>`** | NEW | Required for icon-only sidebar mode (Section 7 two-stage collapse) and every icon button across slots. Radix Tooltip, 500ms open delay, 0ms close. |
| **`<Toast>`** | NEW | Toast region anchored bottom-right. Used by save confirmations, copy-as feedback, notification "delivered" trail. Sonner or Radix Toast. |
| **`<Tabs>`** | NEW | Used by right-panel tab strip (Section 6), chat-tabs row (Section 5), Settings sub-pages (Section 8). Radix Tabs with custom chrome wrapper that adds `pin / close / +` affordances. |
| **`<Tree>`** | NEW | Used by Files panel (Section 6), Customize → keyboard shortcuts editor, MCP server → exposed tools list. Build on `react-arborist` or roll a flat tree with virtualization. |
| **`<ContextMenu>`** | NEW | Right-click affordance on chat messages (Section 4 branch/fork), session rows (Section 5 / 7 Recents), tabs (Section 5 "Open in split"), media chips (Section 3). Radix ContextMenu base. |
| **`<TopBar>`** | NEW | Net-new shell row above content area. Hosts ◀ ▶, 🔍, project chip, session-name dropdown, elapsed timer, 📌, ⤢, ⋮. Refactor away `screens/Chat/ChatHeader.tsx` (UsageBadge→Slot E, fast-mode→Slot F, title→TopBar, new-chat→Slot A swap, clear→overflow). |
| **`<StatusBar>`** | NEW | Net-new bottom-edge strip (above bottom-row input). Hosts Connection status (replaces `components/VerifyWarningBanner.tsx`), Gateway pill (refactor from `screens/Gateway/Gateway.tsx` 10s poll), update widget (refactor from `Layout.tsx` sidebar footer), Service health, in-app notification pulse. |
| **`<StatusPill>`** | NEW | Atomic dot+label component: `connected / running / paused / error / unknown`. Used everywhere — MCP rows, Brains menu, Connection, Tasks tray. |
| **`<LayoutGrid>` (AppShell)** | Refactor | From `screens/Layout/Layout.tsx`. Three-column resizable grid + persistent TopBar + StatusBar (see §2). |
| **Theme tokens** | Refactor | From `components/ThemeProvider.tsx` (currently light/dark/system only). Expand to CSS-var palette (`--color-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--space-*`). Add accent, font-family, motion-pref tokens. |
| **Density tokens** | NEW | `--density: comfortable | compact`. Drives row heights, padding, font-size step. Persisted per profile. |
| **Focus ring** | NEW | Global `:focus-visible` token (`--ring-color`, `--ring-width`). Replaces zero existing focus styling. |
| **Keyboard shortcuts manifest** | NEW | `src/renderer/src/shortcuts/manifest.ts` — declarative `[{ id, defaultKey, scope, handler }]`. Replaces menu-IPC-only `onMenuNewChat` / `onMenuSearchSessions`. Uses `tinykeys`. Editable from Settings → Shortcuts. |
| **`<InteractiveBlock>`** (reusable chrome) | NEW | Critical cross-section primitive. Header bar (title + pop-out / send-to-right / pin / collapse / copy buttons) + capped-height body with show-more. Variants: `terminal`, `ask-user` (replaces `MessageRow.tsx` APPROVAL_RE regex), `run-this`, `tool-call`, `code`, `file-diff`, `panel-content` (Section 6 panels reuse the same chrome). |
| **`<PanelChrome>`** | NEW | Thin alias of InteractiveBlock for right-panel tabs (Section 6) — same buttons, different default layout (fills container). |
| **`<DnDProvider>`** | NEW | Single dnd-kit setup. Used by Slot A/B/E/F reorder, media chip reorder, panel-tab reorder, sidebar-section reorder, fallback-chain editor. Building once prevents five divergent implementations. |
| **Global state store** | NEW | Zustand (or Jotai). Slices: `sessions`, `tabs`, `slots`, `panels`, `notifications`, `tasks`, `mode`, `model`, `customize`, `connection`. Replaces lifted `useState` in `Layout.tsx`. Snapshot §4.5 flags this explicitly. |

---

### 2. Layout primitives

**Current state** (`src/renderer/src/screens/Layout/Layout.tsx`): two-column shell — `<aside class="sidebar">` (flat 15-item nav + active profile + update widget) + `.content` (hand-rolled `display:none` switcher across `visitedViews`, lifts chat `messages` and `currentSessionId` as `useState`).

**Target shell composition**:

```
<AppShell>
  <TopBar/>                         ← Section 5 (NEW)
  <Body>
    <Sidebar/>                      ← Section 7 (refactor of <aside>)
      ├─ <ModeTabs/>                  Chat | Cowork | Code
      ├─ <SidebarPrimaryActions/>     + New session
      ├─ <SidebarSection id="pinned"/>
      ├─ <SidebarSection id="recents"/>
      ├─ <SidebarSection id="custom-*"/>  (drag-reorderable)
      ├─ <SidebarSection id="routines"/>
      ├─ <SidebarSection id="customize"/>
      ├─ <SidebarSection id="more"/>
      └─ <ProfileMenuButton/>         (popover host)
    <ContentColumn>
      <ChatTabsRow/>                  ← Section 5 (NEW, when >1 tab)
      <SplitPane orientation="horizontal">
        <ChatPane/>                   ← Section 4 (refactor)
        <ChatPane/>                   ← only if split
      </SplitPane>
      <MediaRow/>                     ← Section 3 (NEW, hidden when empty)
      <BottomRow/>                    ← Section 1 (NEW slot framework)
    </ContentColumn>
    <RightPanel/>                    ← Section 6 (NEW, resizable)
      ├─ <PanelTabsRow/>
      ├─ <SplitPane orientation="vertical">
      │    <PanelHost panelId={...}/>
      │    <PanelHost panelId={...}/>  (only if split)
      │  </SplitPane>
      └─ <TaskTrayStrip/>             persistent bottom of RightPanel
  </Body>
  <StatusBar/>                       ← cross-cutting (NEW)
</AppShell>
```

**Resizable columns**: `react-resizable-panels` (or roll on top of CSS grid + pointer-events). Persisted ratios in Zustand `customize` slice → `~/.shay/desktop.json` (new `layout` key).

**Routing / history**: Lightweight history stack in Zustand (push on view/session/panel change) backing TopBar ◀ ▶. Avoid `react-router` — overkill for 4 navigable surfaces.

**Refactor checklist for Layout.tsx**:
- Strip `paneStyle` / `visitedViews` `display:none` toggle → `<ContentColumn>` renders the active route.
- Lift `messages` / `currentSessionId` out → `sessions` Zustand slice (per-tab keyed).
- Move auto-update IPC subscribers → `<StatusBar>`.
- Move `<RemoteNotice>` gating → per-panel/per-screen guard (still keep).

---

### 3. Section-by-section UX plan

#### Section 1 — Bottom row (slot framework)

**Component tree**:
```
<BottomRow>
  <SlotStrip onReorder=…>
    <Slot id="A"><PinnedActions/></Slot>      // up to 3 buttons + ▾ swap menu
    <Slot id="B"><PlusMenuButton/></Slot>     // + → Popover with [Attach, Skill, MCP tool, Snippet, Routine, Chapter, Slash…]
    <Slot id="C"><MicButton/></Slot>          // press-to-talk / toggle / voice-mode
    <Slot id="D"><ModeDropdown/></Slot>       // mirrors sidebar ModeTabs
    <Slot id="E"><ContextIndicator/></Slot>   // tokens used / total + %
    <Slot id="F"><ModelPill/></Slot>          // provider · model · thinking · $/turn
  </SlotStrip>
  <ComposerArea>
    <ChatInput/>                              // existing, slimmed
    <SendStopButton/>
  </ComposerArea>
</BottomRow>
```

**State shape (Zustand `slots` slice)**:
```ts
{
  order: ['A','B','C','D','E','F'],       // user-reorderable
  visibility: { A:true, B:true, ... },     // user-toggleable
  pinnedA: ['accept-edits', 'plan-mode'],  // up to 3
  mode: 'chat' | 'cowork' | 'code',
  thinking: 'low' | 'med' | 'high' | 'ultra',
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama',
  model: string,
}
```

**Interactions**:
- Drag slot → reorder (dnd-kit horizontal sortable).
- Right-click slot → hide / configure / reset.
- Slot A click → primary action; ▾ → Popover swap menu (Accept edits, Plan mode, /compact, /clear, restore checkpoint, switch brain, custom slash).
- Slot B + → Popover with categorized list (file, skill, MCP tool, snippet, routine, chapter mark, slash command catalog). Single source of truth: refactor `slashCommands.ts` into `src/renderer/src/commands/registry.ts` consumed by both `/` trigger and + menu.
- Slot C: tap = push-to-talk hold; double-tap = dictation toggle; long-press = open voice-mode HUD.
- Slot D dropdown = same options as sidebar ModeTabs (single source via `mode` slice).
- Slot E: hover → breakdown (input/output/cache). Click → opens Settings → Usage.
- Slot F: click → popover with 4 sub-controls (provider switcher, model dropdown, thinking 4-step, live $/turn readout). Streams $ from `hermes.ts:466-501` SSE usage block.

**Accessibility**: Each slot is a `role="toolbar"` with `aria-label`. Drag has keyboard alternative (`Cmd+↑/↓` to reorder when slot focused, announced via `aria-live`). Slot F popover is `role="dialog"` with focus trap.

**Animation/feedback**: Slot-A button press → 80ms scale 0.96 bounce. Send→Stop swap → 120ms cross-fade. Thinking-budget step → color shift (green→amber→orange→red).

#### Section 2 — Text editor entry row

**Component tree**:
```
<ChatInput>
  <RichComposer/>           // TipTap-based for inline ``` rendering
  <TriggerPopover trigger="/" source={slashCmdRegistry}/>
  <TriggerPopover trigger="@" source={mentionRegistry}/>
  <TriggerPopover trigger="!" source={shellPreviewProvider}/>
  <HistoryNavigator/>       // ↑/↓ on empty
</ChatInput>
```

**Decision: TipTap** for the composer. Rationale: inline ``` live-render, future @-mention nodes, OS-native spell-check (TipTap inherits contentEditable spell-check), Shift+Enter newline, paste-files, drag-drop overlay all supported. Migration cost real but unavoidable.

**State** (`composer` slice): `text`, `attachments`, `triggers: { open, sigil, query, position }`, `history: { index, snapshots }`.

**Interactions**:
- Sigil-triggered popover: single `<TriggerPopover>` primitive with pluggable source. `triggerChar → SourceProvider` map: `/` → slash registry, `@` → file/skill/agent/MCP, `!` → shell preview.
- Hover-Edit on user messages → fills composer with text + branch marker (blocked on backend fork primitive — render UI now, show "branching pending backend" toast).
- ⌘F → in-chat search overlay (Section 4 owns).

**Accessibility**: `role="textbox" aria-multiline="true"`. Popovers announce match count via `aria-live="polite"`. Edit-history navigation announces "history N of M".

**Animation**: Composer expands smoothly (max-height with `field-sizing: content` polyfill via TipTap autoresize). Trigger popover fades 80ms.

#### Section 3 — Media row

**Component tree**:
```
<MediaRow hidden={attachments.length === 0}>
  <CaptureToolbar tools={enabledCaptureTools}/>      // 📸 📹 🎥 🎙
  <ChipStrip onReorder=…>
    <AttachmentChip ✎ ✕ ⓘ ⤴ />
    ...
  </ChipStrip>
</MediaRow>

<AnnotateModal/>          // image canvas + arrow/box/blur/crop/highlight
<InspectPanel/>           // OCR / transcript / summary / raw + send-mode toggle
<ReusePicker/>             // recent attachments grid
```

**State** (`attachments` slice): `staged: Attachment[]` (per-tab), `recent: Attachment[]` (persistent), `inspectOpenFor: id | null`, `annotateOpenFor: id | null`.

**Attachment shape extension** (`src/shared/attachments.ts`):
```ts
{ id, kind: 'image'|'pdf'|'audio'|'video'|'url'|'code'|'file',
  sendMode: 'smart' | 'raw',
  smartPayload?: { ocr?, transcript?, summary?, excerpt? },
  annotations?: AnnotationSidecar,
  originId?: string }  // for ⤴ Reuse
```

**Interactions**:
- Drag chip → reorder (dnd-kit horizontal).
- ✎ Annotate → modal with canvas overlay (Fabric.js or roll on top of HTML canvas).
- ⓘ Inspect → side panel showing what Shay will send + toggle raw/smart.
- ⤴ Reuse → picker over `recent` (sqlite-backed history table).
- Capture tools live in `<CaptureToolbar>` AND in Slot B + menu when row is empty (both read `customize.captureTools` from store).

**Accessibility**: Chip = `role="listitem"` with `aria-label="Image: foo.png"`. Action buttons keyboard-navigable. Drag has keyboard alt (`Cmd+←/→`).

**Animation**: Row slides down 150ms on first chip, slides up on empty. Chip add → 120ms pop. Annotate modal → 200ms scale+fade.

#### Section 4 — Chat window

**Component tree**:
```
<ChatPane>
  <ChatMessages virtualized>
    <MessageRow>
      <MessageHeader/>           // role + time + actions (hover)
      <BlockRenderer block={...}/>
        ├─ <ProseBlock/>          // markdown
        ├─ <ToolCallBlock/>       // collapsed one-liner ▸
        ├─ <CodeBlock/>           // toolbar: copy/run/save/open/diff
        ├─ <FileDiffBlock/>       // inline/side-by-side + per-hunk
        ├─ <ThinkingBlock/>       // hidden by default
        ├─ <TerminalBlock/>       // InteractiveBlock variant
        ├─ <AskUserBlock/>        // InteractiveBlock variant (was APPROVAL_RE)
        ├─ <RunThisBlock/>        // InteractiveBlock variant
        └─ <MediaBlock/>
      <CollapsibleWrapper maxLines={50}/>
    </MessageRow>
    <ChapterMarker/>              // gutter
  </ChatMessages>
  <ScrollToBottomPill/>           // ↓ new, when scrolled up
  <InChatSearchOverlay/>          // ⌘F
  <SelectionQuoteAction/>         // floating "Reply with quote"
</ChatPane>
```

**Critical refactor**: `ChatMessage` type promoted from flat `content: string` to `blocks: Block[]` with typed kinds. Backend SSE must emit structured events; current `hermes.tool.progress` (hermes.ts:417) folds into `tool_call` block on assistant message.

**State** (`chat` slice, keyed by tab id): `messages`, `streaming`, `scrollState: { atBottom, lastNewIdx }`, `searchOverlay: { open, query, matches, activeMatchIdx }`, `bookmarks: Set<msgId>`.

**Interactions**:
- Long messages (>50 lines) auto-collapse with gradient mask + "show more". Smart-collapse defaults by block type (prose: full, tool: collapsed one-liner, code>30: collapsed, thinking: hidden).
- ⌘F → in-chat overlay (input + prev/next + match highlight via mark.js or custom range walker).
- Selection → floating action button "Reply with quote" → calls `ChatInputHandle.setText('> ' + selected + '\n\n')`.
- Right-click message → ContextMenu (Branch from here, Bookmark, Copy as → markdown/plain/JSON, Pop out).
- Pop-out → new BrowserWindow with same preload bridge + `hardenAttachedWebContents` allowlist (security.ts review required).

**Accessibility**: Messages in `role="log" aria-live="polite"`. Block expand/collapse via Enter/Space when focused. New-message pill announced via `aria-live`.

**Animation**: New message slide-up 200ms. Tool-call expand → 180ms reveal. Thinking block reveal → 150ms fade. Code-block copy → checkmark 1s.

**Virtualization**: Replace memoized-only MessageList with `@tanstack/react-virtual` to handle long sessions. Critical given block-typing increases subtree depth.

#### Section 5 — Top bar

**Component tree**:
```
<TopBar>
  <NavCluster><BackBtn/><ForwardBtn/></NavCluster>
  <GlobalSearchButton/>                 // 🔍 → opens CommandPalette
  <ProjectChip onClick=openProjectPicker/>
  <SessionNameDropdown>
    <InlineEditable title/>
    <SessionSwitcherPopover>
      <PinnedList/>
      <RecentsList/>
      <SearchInput/>
      <NewSessionAction/>
      <FoldersTagsRow/>
    </SessionSwitcherPopover>
  </SessionNameDropdown>
  <ElapsedTimer/>                       // ⏱ from started_at, 1s tick
  <PinToggle/>                          // 📌
  <SplitToggle/>                        // ⤢
  <OverflowMenu/>                       // ⋮ archive/export/delete/rename/duplicate
</TopBar>

<CommandPalette portal>                  // ⌘K, fuzzy over sessions+projects+chapters
```

**State** (`tabs` slice): `tabs: Tab[]`, `activeTabId`, `splitMode: 'single' | 'horizontal'`, `secondTabId?`. `nav` slice: history stack with cursor.

**Interactions**:
- Click session name → opens SessionSwitcherPopover.
- ⌘K → CommandPalette (cmdk lib). Fuzzy over `sessions` (via extended `search-sessions` IPC accepting `{ scope, fuzzy }`) + profiles + chapters.
- ⌘⇧] / ⌘⇧[ → cycle tabs (registered in keyboard manifest).
- Right-click tab → ContextMenu → "Open in split" sets `splitMode: 'horizontal'` + `secondTabId`.
- Project chip click → opens picker; selection creates NEW session bound to chosen profile.

**Accessibility**: TopBar = `role="banner"`. Session-name button has `aria-haspopup="dialog"`. Tab strip = `role="tablist"`.

**Animation**: Elapsed timer rolls without re-layout (use `font-variant-numeric: tabular-nums`). Tab open → 120ms slide-in. Palette → fade+scale 150ms.

**Schema strategy**: NEVER write to `~/.shay/state.db`. New `~/.shay/desktop/sessions-overlay.db` (better-sqlite3 read-write) keyed by `session_id`: `{ pinned, archived, tags[], custom_title }`. Joined at read time. Survives Shay schema migrations.

#### Section 6 — Right panel + tasks + notifications

**Component tree**:
```
<RightPanel resizable persistedWidth>
  <SplitPane orientation="vertical">
    <PanelHost>
      <PanelTabsRow>
        <PanelTab id="preview"/>  <PanelTab id="diff"/>  ...
        <AddPanelButton/>           // + Custom
      </PanelTabsRow>
      <PanelChrome popOut pin collapse close>
        <PanelContent panelId={active}>
          <PreviewPanel/> | <DiffPanel/> | <TerminalPanel/>
          | <FilesPanel/> | <TasksPanel/> | <PlanPanel/> | <CustomPanel/>
        </PanelContent>
      </PanelChrome>
    </PanelHost>
    <PanelHost/>                    // only if vertical-split
  </SplitPane>
  <TaskTrayStrip>
    <TrayCounter icon="🔴" count={running}/>
    <TrayCounter icon="⚠"  count={inputNeeded}/>
    <TrayCounter icon="✓"  count={done}/>
    <ExpandToggle/>
  </TaskTrayStrip>
</RightPanel>
```

**State** (`panels` slice): `tabs: PanelTab[]`, `activeTabId`, `splitRatio`, `pinned: Set<id>`. (`tasks` slice): `running[]`, `done[]`, `failed[]`, `inputNeeded[]`. (`notifications` slice): `inbox: Notification[]`, `unread`, `dnd: { enabled, schedule }`, `categoryRules`.

**Auto-switching rules** (subscribed to chat events):
- `tool_call:shell` → focus Terminal panel.
- `file_diff` emitted → focus Diff panel.
- `artifact` emitted → focus Preview panel.
- `plan` started → focus Plan panel.
Each rule has a per-category Settings toggle.

**Interactions**:
- Drag tab → reorder. Drag tab between panes (top/bottom split) → move.
- Pop-out → new BrowserWindow rendering `<PanelContent>` standalone. Manual only — no auto-pop.
- "Send-to-right" in chat InteractiveBlock → mounts a fresh tab in active PanelHost with that content.
- TaskTrayStrip click → expands into Tasks panel automatically.
- Notifications: OS Notification API + `app.setBadgeCount` (mac/win), respects DND schedule. Click → deep-link to source via `nav` slice.

**Accessibility**: Tab strip = `role="tablist"`. PanelChrome buttons all `aria-label`-ed. TaskTrayStrip = `role="status" aria-live="polite"` for count changes.

**Animation**: Panel switch → 120ms cross-fade. Tasks count increment → 200ms pulse. Notification toast → 300ms slide-in from right.

#### Section 7 — Left sidebar

**Component tree**:
```
<Sidebar mode={expanded|icons|hidden}>
  <SidebarBrand/>
  <ModeTabs/>                       // Chat | Cowork | Code
  <PrimaryAction icon="+" label="New session" onClick=openNewSessionPicker/>
  <SidebarSection id="pinned" reorderable>
    {pinnedSessions.map(<SessionRow contextMenu/>)}
  </SidebarSection>
  <SidebarSection id="recents">
    {recentSessions.map(<SessionRow contextMenu/>)}
  </SidebarSection>
  <SidebarSection id="custom-*" reorderable removable>
    <CustomSectionContent provider={'basic-memory'|'mcp'|'vault'|...}/>
  </SidebarSection>
  <SidebarSection id="routines"/>
  <SidebarSection id="customize"/>
  <SidebarSection id="more">
    <MoreMenu items={[Plugins, MCP Registry, Skills, Logs, Help, About]}/>
  </SidebarSection>
  <SidebarFooter>
    <ProfileMenuButton popover>
      <AccountRow/>
      <BrainsAndMCPRow/>           // live status dots
      <ThemeQuickSwitch/>
      <LockAndSignoutRow/>
    </ProfileMenuButton>
  </SidebarFooter>
</Sidebar>
```

**State** (`sidebar` slice): `mode: 'expanded'|'icons'|'hidden'`, `sectionOrder: string[]`, `sectionVisibility`, `customSections: CustomSectionConfig[]`. Persisted in `~/.shay/desktop/sidebar.json`.

**Interactions**:
- Chevron click → cycles expanded → icons. Double-click → hidden. Hover left edge in hidden mode → peek overlay.
- Drag section header → reorder (dnd-kit vertical). `+ section` button at bottom → wizard (pick provider, configure source).
- Session row right-click → ContextMenu (rename / archive / delete / pin) — all routed to `sessions-overlay.db`.
- ModeTabs writes `mode` slice → Slot D dropdown mirrors. Single source of truth.

**Accessibility**: Sidebar = `role="navigation"`. Mode tabs = `role="tablist"`. Icon-only mode: every nav item has `<Tooltip>` for label.

**Animation**: Width transition 200ms cubic-bezier. Hover-peek overlay slides in 150ms. Section reorder ghost via dnd-kit defaults.

#### Section 8 — Settings page

**Component tree** (replaces `screens/Settings/Settings.tsx` 1079 LOC mega-file):
```
<SettingsShell>
  <SettingsSidebar categories={...}/>      // left rail of sub-pages
  <SettingsContent>
    <Routes>
      /general → <GeneralPanel/>
      /account → <AccountPanel/>
      /privacy → <PrivacyPanel/>
      /billing → <BillingPanel/>
      /usage → <UsagePanel/>
      /capabilities → <CapabilitiesPanel/>
      /connectors → <ConnectorsPanel/>
      /claude-code → <ClaudeCodePanel/>
      /cowork → <CoworkPanel/>
      /chrome → <ChromePanel/>
      /desktop/general → <DesktopGeneralPanel/>
      /desktop/extensions → <ExtensionsPanel/>
      /desktop/developer → <DeveloperPanel/>
      /appearance → <AppearancePanel/>
      /shortcuts → <ShortcutsPanel/>
      /notifications → <NotificationsPanel/>
      /language → <LanguagePanel/>
      /voice → <VoicePanel/>
      /admin/plugins → <PluginsPanel/>
      /admin/mcp → <MCPPanel/>
      /admin/logs → <LogsPanel/>
      /admin/diagnostics → <DiagnosticsPanel/>
      /admin/backup → <BackupRestorePanel/>
      /admin/update → <UpdateChannelPanel/>
    </Routes>
  </SettingsContent>
</SettingsShell>
```

**State** (`settings` slice): grouped by panel. Single IPC contract `getSettings(group)` / `setSettings(group, patch)` replaces the 25 ad-hoc handlers.

**Shared primitives reused**: `<ConnectionForm>` (extracted from Welcome.tsx + Settings.tsx duplication), `<ConfirmDialog>` (every destructive action), `<StatusPill>` (MCP rows, Brains, Connectors).

**Notable sub-panels**:
- **Shortcuts**: TreeTable of `{id, scope, defaultKey, currentKey}`. Click cell → capture key combo. Reset to default per row + global.
- **Notifications**: per-category matrix (toggles for OS banner, dock badge, in-app pulse, sound). DND schedule = weekday × time-range editor.
- **Appearance**: theme, accent (color swatches), font family, density, motion-reduce. All write CSS vars.
- **MCP** (admin): list with status pills + per-row [Test, Configure tools, Re-login, Restart, Remove]. + Add server form (transport: stdio|http, env vars, auth).
- **Plugins**: installed list + marketplace tab. Card view with enable toggle, version, permissions.
- **Logs**: filter chips (level, source) + virtualized live tail + search + export.
- **Diagnostics**: snapshot grid (version, OS, network, auth, last error) + "Copy report" + "Submit to support".

**Accessibility**: Settings shell = `role="main"` with `<SettingsSidebar role="navigation">`. Each panel announces title via `<h1>`. Form fields use proper `<label for>`.

**Animation**: Panel switch → instant (no animation — feels snappier for config). Save confirmation → toast slide-in.

#### Section 9 — Admin / Dev surfaces

Mostly folded into Settings § (Plugins / MCP / Logs / Diagnostics / Backup / Update). Additional surfaces:

- **Hooks panel** (under Settings → Capabilities or Developer): list + test + revoke + doctor.
- **Curator panel** (under Skills tab or Settings → Privacy): status/run/pause/pin/prune/backup/rollback.
- **Webhook / Pairing** (adjacent to Gateway screen): kept as Gateway tab.
- **ACP toggle** (Settings → Developer): on/off + status pill.
- **Computer-use install** (Settings → Capabilities): install/upgrade button + status.

**Security upgrades blocking admin landing**:
1. `safeStorage` wrap of all writes in `src/main/config.ts:34-53, 704-747` + one-time plaintext→encrypted migration with version flag in `desktop.json`.
2. `API_SERVER_KEY` loopback enforcement (coordinated with `gateway/platforms/api_server.py:3372-3382` change). Auto-generated per-install, stored encrypted.
3. Auth screen using shay `auth add/list/remove/login/logout` IPC bridge. OAuth callbacks via custom `shay://` protocol handler.

---

### 4. Visual language

**Typography scale** (CSS vars, modular `1.25` ratio):
```
--font-2xs: 11px   // captions, status pill labels
--font-xs:  12px   // metadata, secondary chrome
--font-sm:  13px   // body, default UI text
--font-md:  14px   // emphasized body
--font-lg:  16px   // panel titles
--font-xl:  20px   // section headings
--font-2xl: 24px   // page titles
--font-family-ui:   'Inter', -apple-system, system-ui, sans-serif
--font-family-mono: 'JetBrains Mono', 'SF Mono', Menlo, monospace
--font-weight-regular: 400
--font-weight-medium:  500
--font-weight-semibold: 600
--line-height-tight: 1.25
--line-height-body:  1.5
--line-height-loose: 1.7
```

**Color tokens** (semantic, not raw hex — set per theme):
```
--color-bg-base         // app background
--color-bg-surface      // sidebar, top bar, right panel
--color-bg-elevated     // popover, modal
--color-bg-overlay      // backdrop
--color-bg-input        // composer, form fields
--color-bg-hover
--color-bg-active

--color-fg-default
--color-fg-muted
--color-fg-subtle
--color-fg-inverse

--color-border-default
--color-border-strong
--color-border-focus

--color-accent          // brand / primary action
--color-accent-hover
--color-accent-fg

--color-success  / --color-success-bg
--color-warning  / --color-warning-bg
--color-danger   / --color-danger-bg
--color-info     / --color-info-bg

--color-syntax-keyword  // code highlight tokens
--color-syntax-string
--color-syntax-comment
--color-syntax-fn
--color-syntax-num
```

**Light theme** anchor: warm-white `#FAFAF9` base, near-black `#171717` fg, accent oklch-derived (default Anthropic clay `#CC785C`).
**Dark theme** anchor: near-black `#0A0A0A` base, off-white `#EDEDED` fg, accent same hue lighter chroma.
**System**: `prefers-color-scheme` listener via `nativeTheme`.

Accent is user-pickable (Settings → Appearance) — re-derives all `--color-accent-*` tokens via oklch.

**Iconography**:
- Lucide icons (consistent stroke, tree-shakeable, MIT). 16px default in chrome, 20px in chat actions, 14px in dense pills.
- Custom marks only for: Shay brand glyph, mode-tab indicators (Chat/Cowork/Code).
- Stroke width: 1.5px at 16px, 1.75px at ≥20px.
- Status icons follow semantic color (success-green dot, warning-amber, danger-red, info-blue, muted-gray).

**Motion**:
- Standard timing: `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 300ms`.
- Easing: `--ease-standard: cubic-bezier(0.4, 0, 0.2, 1)` (most), `--ease-emphasized: cubic-bezier(0.2, 0, 0, 1)` (entrances), `--ease-decelerate: cubic-bezier(0, 0, 0.2, 1)` (slide-ins).
- **Reduce-motion**: `@media (prefers-reduced-motion)` collapses all durations to 0ms except focus transitions; respect Settings → Appearance override.
- Hover states: instant color shift (no transition).
- Focus ring: 2px outline, `--color-border-focus`, 2px offset.
- Loading: pulse animation on placeholders (`infinite alternate`, 1.4s). Spinner only when ETA unknown.

---

### 5. Build sequence (UI)

Strictly ordered. Each step unblocks downstream work.

**Phase 0 — Foundation (1-2 weeks)**
1. Adopt Zustand. Stub slices: `sessions, tabs, slots, panels, notifications, tasks, mode, model, customize, connection, sidebar, composer, attachments, chat, nav, settings`.
2. Theme tokens + density tokens in `ThemeProvider.tsx`. Migrate all existing inline styles to CSS vars. Light/dark/system intact, accent + density NEW.
3. Focus ring + global `:focus-visible` style.
4. Lucide icon registry + sizing tokens.
5. Keyboard shortcuts manifest (`tinykeys` + Settings stub). Migrate `onMenuNewChat` / `onMenuSearchSessions` off menu-IPC.

**Phase 1 — Shared primitives (2-3 weeks)**
6. `<Modal>` / `<Dialog>` (Radix) — refactor 5+ ad-hoc overlays.
7. `<Popover>` (Radix) — refactor slash menu + ModelPicker dropdown to use it.
8. `<Tooltip>` (Radix).
9. `<Toast>` region.
10. `<ContextMenu>` (Radix).
11. `<Tabs>` with custom chrome.
12. `<DnDProvider>` (dnd-kit) — single setup module.
13. `<StatusPill>` atom.
14. `<InteractiveBlock>` / `<PanelChrome>` chrome — header bar + capped body + show-more.

**Phase 2 — Shell refactor (1-2 weeks)**
15. Extract `<TopBar>` skeleton (no functionality yet, just slot). Move ChatHeader title + new-chat into it.
16. Extract `<StatusBar>` skeleton. Move auto-update widget + verify-warning into it.
17. `AppShell` three-column layout grid (resizable, persisted widths). `RightPanel` empty container.
18. Lift `messages`/`currentSessionId` out of `Layout.tsx` → `sessions`/`chat` slices.
19. Lightweight history stack in `nav` slice. TopBar ◀ ▶ wired.

**Phase 3 — Section 7 sidebar (1-2 weeks)** — unblocks navigation for all other features
20. `<ModeTabs>` + `<SidebarSection>` framework.
21. Two-stage collapse (expanded/icons/hidden) with hover-peek.
22. `<SidebarPrimaryActions>` + New Session picker modal.
23. Pinned + Recents sections backed by `~/.shay/desktop/sessions-overlay.db` (new better-sqlite3 read-write store).
24. `<ProfileMenuButton>` popover + 4 menu rows (Account stub, Brains/MCP, Theme switch, Lock/Signout stub).
25. Move old NAV_ITEMS targets into More menu or Custom sections.

**Phase 4 — Section 1 bottom row (2 weeks)**
26. `<SlotStrip>` framework + dnd-kit reorder + persistence.
27. Slot E: extract `<ContextIndicator>` from UsageBadge.
28. Slot F: expand ModelPicker → composite `<ModelPill>` (provider + model + thinking + $/turn). Thinking-budget replaces fast-mode.
29. Slot D: `<ModeDropdown>` mirroring sidebar.
30. Slot B: `<PlusMenuButton>` + popover. Refactor `slashCommands.ts` → `commands/registry.ts`. File picker folds in.
31. Slot A: `<PinnedActions>` with swap menu (Accept edits, Plan mode, /compact, /clear, restore checkpoint, switch brain).
32. Slot C: `<MicButton>` skeleton (UI only — voice subsystem deferred).

**Phase 5 — Section 2 composer (2 weeks)**
33. Migrate `<ChatInput>` to TipTap. Preserve paste-files, drag-drop overlay, history navigation.
34. `<TriggerPopover>` primitive. Wire `/`, `@`, `!` sigils.
35. Cross-session fuzzy search overlay (Fuse.js layered on FTS).

**Phase 6 — Section 4 chat window (3 weeks)**
36. Typed `ChatMessage.blocks: Block[]` refactor. Coordinate SSE event shape with Hermes gateway.
37. `<BlockRenderer>` + all block variants. Replace APPROVAL_RE with `<AskUserBlock>`.
38. `<CollapsibleWrapper>` + smart-collapse defaults.
39. Virtualization with `@tanstack/react-virtual`.
40. `<ScrollToBottomPill>`.
41. `<InChatSearchOverlay>` (⌘F).
42. `<SelectionQuoteAction>`.
43. Message ContextMenu (Branch, Bookmark, Copy as, Pop out). Pop-out BrowserWindow factory.

**Phase 7 — Section 3 media row (2 weeks)**
44. Extract `<MediaRow>` from ChatInput. Hidden-when-empty.
45. Per-chip actions (`<AttachmentChip>` extended with ✎ ⓘ ⤴).
46. `<InspectPanel>`, `<ReusePicker>` (sqlite history table).
47. `<AnnotateModal>` (canvas-based, lightweight).
48. `<CaptureToolbar>` (UI only — capture backends deferred per platform).
49. Per-chip drag-reorder.

**Phase 8 — Section 5 top bar (2 weeks)**
50. `<SessionNameDropdown>` + `<SessionSwitcherPopover>` (Pinned/Recents/Search/New/Tags).
51. Inline rename via overlay DB.
52. `<CommandPalette>` (cmdk) — fuzzy over sessions+profiles+chapters.
53. Elapsed timer, pin toggle, split toggle, overflow menu.
54. `<ChatTabsRow>` + SplitPane horizontal.
55. Tab ContextMenu "Open in split".

**Phase 9 — Section 6 right panel (3 weeks)**
56. `<RightPanel>` + `<PanelTabsRow>` + `<SplitPane>` vertical.
57. `<PreviewPanel>`, `<DiffPanel>`, `<TerminalPanel>` (pty deferred — UI shell first), `<FilesPanel>`, `<PlanPanel>`, `<CustomPanel>`.
58. Auto-switching subscriber on chat events.
59. `<TasksPanel>` + `<TaskTrayStrip>` + task aggregator in main (Kanban + cron + /v1/runs SSE).
60. Notifications inbox + OS Notification + DND scheduler + per-category settings.
61. Pop-out BrowserWindow factory (shared with chat block pop-out).

**Phase 10 — Section 8 Settings refactor (2-3 weeks)**
62. `<SettingsShell>` + `<SettingsSidebar>` + sub-page routing.
63. Extract `<ConnectionForm>` from Welcome/Settings duplication.
64. Migrate existing settings into General / Appearance / Language / Connection / Diagnostics panels.
65. NEW panels (stubs first, then wire): Account, Privacy, Billing, Usage, Capabilities, Connectors, Shortcuts (editor), Notifications, Voice.
66. Single `getSettings(group)` / `setSettings(group, patch)` IPC replaces 25 handlers.

**Phase 11 — Section 9 Admin (3 weeks)**
67. Plugins panel (wrap `shay plugins`).
68. MCP panel — replace regex parse with `mcp_config.py` IPC. Add server form, per-server actions.
69. Logs panel with live tail.
70. Diagnostics panel.
71. Backup / Restore panel.
72. Update channel panel.
73. Hooks, Curator, Webhook, ACP, Computer-use sub-panels.
74. `safeStorage` migration + `API_SERVER_KEY` loopback hardening (coordinated gateway PR).
75. Auth screen with OAuth flows.

**Continuous (every phase)**: a11y audit per primitive landing, reduce-motion respect, RemoteNotice coverage decision per surface, ssh-remote.ts parity decision per new admin surface.

---

## Architecture Build Plan

### 1. File / folder structure

The current renderer is a flat screens/ tree with mega-files (Settings.tsx 1079 LOC, Kanban.tsx 996 LOC, ssh-remote.ts 1467 LOC) and no shared primitives. The proposed layout introduces a `shell/` boundary (TopBar, Sidebar, RightPanel, StatusBar, Layout), a `primitives/` library (Modal, Popover, Menu, PanelChrome, InteractiveBlock, ConnectionForm), a `features/` tree (one folder per Section 1–9 surface), and per-domain `stores/` (Zustand slices). The main process gets a `domains/` reorganization so the 128-handler `index.ts` becomes a thin router over `auth/`, `mcp/`, `logs/`, `tasks/`, `notifications/`, `sessions/`, `settings/` modules.

```
src/
  renderer/src/
    shell/
      Layout.tsx                  # 3-column shell (replaces screens/Layout/Layout.tsx)
      TopBar/
        TopBar.tsx                # Section 5 — global; replaces ChatHeader
        SessionSwitcher.tsx       # dropdown + recents + pinned
        ProjectChip.tsx
        CommandPalette.tsx        # ⌘K (cross-section: 5, 2)
        BackForward.tsx
      Sidebar/
        Sidebar.tsx               # Section 7 — replaces flat NAV_ITEMS
        ModeTabs.tsx              # Chat / Cowork / Code
        PinnedSection.tsx
        RecentsSection.tsx
        CustomSections/
          CustomSectionHost.tsx
          providers/              # basic-memory, vault, mcp, static
        ProfileMenu.tsx           # bottom popover (Account / Brains / Theme / Lock)
        SidebarCollapse.tsx       # two-stage collapse
      RightPanel/
        RightPanel.tsx            # Section 6 host
        PanelTabs.tsx             # reorderable, pinnable, closable, +custom
        VerticalSplit.tsx
        PanelChrome.tsx           # shared header (pop-out, pin, close, collapse)
        panels/
          PreviewPanel.tsx
          DiffPanel.tsx
          TerminalPanel.tsx
          FilesPanel.tsx
          PlanPanel.tsx
          BackgroundTasksPanel.tsx
          CustomPanel.tsx
        TaskTray.tsx              # bottom strip: 🔴3 ⚠1 ✓12
      StatusBar.tsx               # unified pill bar (Gateway / Update / Verify / Usage)

    primitives/
      Modal.tsx                   # cross-cutting first build
      Popover.tsx
      Menu.tsx                    # right-click + ⋯ menus
      MentionPopover.tsx          # /, @, ! shared chrome (Section 2)
      InteractiveBlock.tsx        # cross-cutting (Section 4 + 6)
      CollapsibleBlock.tsx        # ~50 line auto-collapse
      DragHandle.tsx              # dnd-kit wrapper
      ConnectionForm.tsx          # shared by Welcome + Settings
      IconButton.tsx + Tooltip.tsx
      Sortable/                   # dnd-kit primitives reused everywhere

    features/
      chat/                       # Section 4 — rebuilt from screens/Chat/*
        Chat.tsx
        MessageList.tsx           # virtualized
        MessageRow.tsx            # typed block dispatcher
        blocks/
          ProseBlock.tsx
          ToolCallBlock.tsx       # replaces APPROVAL_RE + TypingIndicator
          CodeBlock.tsx           # run/save/open/diff toolbar
          FileDiffBlock.tsx       # per-hunk accept/reject
          ThinkingBlock.tsx
          TerminalBlock.tsx       # InteractiveBlock instance
          AskUserBlock.tsx        # InteractiveBlock instance
          RunThisBlock.tsx        # InteractiveBlock instance
          MediaBlock.tsx
        hooks/
          useChatIPC.ts
          useChatActions.ts
          useChatScroll.ts        # exposes isAtBottom + ↓ pill
          useInChatSearch.ts      # ⌘F overlay
        ChapterGutter.tsx
      composer/                   # Section 1 + 2 + 3
        ChatInput.tsx             # textarea only
        BottomRow.tsx             # Slot A–F host
        slots/
          SlotA_Pinned.tsx
          SlotB_PlusMenu.tsx
          SlotC_Voice.tsx
          SlotD_Mode.tsx
          SlotE_Context.tsx       # extracted UsageBadge
          SlotF_ModelPill.tsx     # provider + model + thinking + $/turn
        SlashCommands.ts          # shared by inline / and SlotB
        MentionSources.ts         # @ files/skills/agents/mcp
        MediaRow.tsx              # Section 3 — hidden when empty
        AttachmentChip.tsx        # + ✎ ⓘ ⤴ actions
        InspectPanel.tsx
        AnnotatorModal.tsx
        capture/
          ScreenshotCapture.tsx
          ScreenRecord.tsx
          WebcamCapture.tsx
          VoiceMemo.tsx
      settings/                   # Section 8 — split of 1079-LOC mega
        SettingsShell.tsx         # left rail + right pane
        panels/
          GeneralPanel.tsx
          AccountPanel.tsx
          PrivacyPanel.tsx
          BillingPanel.tsx
          UsagePanel.tsx
          CapabilitiesPanel.tsx
          ConnectorsPanel.tsx
          ClaudeCodePanel.tsx
          CoworkPanel.tsx
          ChromePanel.tsx
          DesktopApp/{General,Extensions,Developer}.tsx
          ThemesPanel.tsx
          ShortcutsPanel.tsx
          NotificationsPanel.tsx
          LanguagePanel.tsx
          VoiceAudioPanel.tsx
      admin/                      # Section 9 power-user surfaces
        Plugins/PluginsScreen.tsx
        Mcp/McpScreen.tsx         # add/test/configure/login/serve
        Logs/LogsScreen.tsx       # tail + filter chips
        Diagnostics/DiagnosticsScreen.tsx  # doctor/dump/debug-share
        Backup/BackupScreen.tsx
        Update/UpdateChannelScreen.tsx
        Hooks/HooksScreen.tsx
        Webhooks/WebhooksScreen.tsx
        Pairings/PairingsScreen.tsx
        Checkpoints/CheckpointsScreen.tsx
        Acp/AcpScreen.tsx
      notifications/
        NotificationsCenter.tsx
      tasks/
        BackgroundTasksCenter.tsx
      keymap/
        KeymapProvider.tsx        # tinykeys
        defaults.ts
      router/
        Router.tsx                # lightweight history stack (◀ ▶)

    stores/                       # Zustand slices (see §2)
      sessionStore.ts
      tabsStore.ts                # multi-tab + split
      modelStore.ts
      modeStore.ts
      settingsStore.ts
      tasksStore.ts
      notificationsStore.ts
      mcpStore.ts
      authStore.ts
      sidebarStore.ts             # collapse, custom sections, pinned order
      panelStore.ts               # right-panel layout + auto-switch
      attachmentsStore.ts
      usageStore.ts

  preload/
    index.ts                      # extend window.hermesAPI namespaces
    askpass.ts                    # keep

  shared/
    attachments.ts                # extend with sendMode + smartPayload + originId
    messages.ts                   # NEW — typed ChatMessage block union
    panels.ts                     # NEW — Panel + PanelKind types
    tasks.ts                      # NEW — BackgroundTask types
    notifications.ts              # NEW
    mcp.ts                        # NEW — MCP server + tool types
    auth.ts                       # NEW — credential pool + OAuth flow types
    settings-schema.ts            # NEW — versioned settings schema
    keymap.ts                     # NEW

  main/
    index.ts                      # thin router; mounts domain modules
    domains/
      auth/                       # wraps shay auth + OAuth flows
        index.ts
        oauth-loopback.ts         # PKCE callback host
        device-auth.ts
      mcp/                        # replaces regex parse in installer.ts
        index.ts
        config-rw.ts              # atomic config.yaml writes
        probe.ts                  # live status poller
      logs/
        index.ts                  # spawns shay logs --follow
        stream.ts                 # SSE-style to renderer
      tasks/
        index.ts                  # aggregates kanban + cron + /v1/runs
        aggregator.ts
      notifications/
        index.ts                  # Electron Notification + DND scheduler
        store.ts                  # sqlite-backed inbox
      sessions/
        read.ts                   # current read-only path
        overlay.ts                # NEW Desk-side sidecar for pin/rename/tags/chapters
        write-rpc.ts              # delegates real writes to Hermes RPC (no direct state.db writes)
      settings/
        index.ts                  # getSettings(group)/setSettings(group,patch)
        migrate.ts                # plaintext → safeStorage migration
      panels/
        popout.ts                 # BrowserWindow factory for pop-outs
      capture/
        screenshot.ts             # desktopCapturer
        screenrecord.ts
        voice.ts
      smart-attachments/
        ocr.ts pdf.ts whisper.ts readability.ts code-excerpt.ts
      keychain/
        index.ts                  # electron.safeStorage wrapper + linux fallback
    hermes.ts                     # add typed SSE event parsing (tool_call, thinking, ask_user, run_this)
    sse-parser.ts                 # extend with custom event taxonomy
    ssh-remote.ts                 # extend per-domain branches
    security.ts                   # extend setPermissionRequestHandler for mic/screen
```

Notable moves:
- `screens/Chat/ChatHeader.tsx` → deleted; responsibilities split across `TopBar`, `SlotE_Context`, `SlotF_ModelPill`.
- `screens/Settings/Settings.tsx` (1079 LOC) → exploded into `features/settings/panels/*`.
- `screens/Studio`, `screens/Office`, `screens/Kanban` retained as deep-link screens but no longer top-level sidebar nav; they become Custom Section / Background-tasks consumers.
- `screens/Sessions/Sessions.tsx` → demoted to a "full grid" fallback; primary path is `Sidebar/RecentsSection.tsx` + `TopBar/SessionSwitcher.tsx` sharing a `useSessionsList` hook.

### 2. State management

**Decision: Zustand** with slice-per-domain stores, `subscribeWithSelector` middleware for cross-slice reactions, and `persist` middleware where applicable. Rejected alternatives:
- React Context + lifted useState (current state): proven inadequate — `Layout.tsx` already owns `messages`, `currentSessionId`, `activeProfile`, `visitedViews`, `remoteMode`. Adding multi-tab + split + right-panel + tasks + notifications + sidebar collapse + custom sections would push it past 1500 LOC.
- Redux Toolkit: heavier ceremony than this codebase has built up to; no async-thunk story matches the existing IPC-promise pattern as cleanly as Zustand actions.
- Jotai: atom-per-field model fragments well-bounded domains (sessions, MCP) into noise.

**Slice ownership**:

| Slice | Owns | Subscribers | Persistence |
|---|---|---|---|
| `sessionStore` | active session id, per-session message arrays, scroll position | Chat, TopBar switcher, Sidebar Recents | none (rebuilt from Hermes RPC) |
| `tabsStore` | tab list, active tab, split pane layout, per-tab session binding | TopBar tabs, Chat shell | session-scoped JSON in `~/.shay/desktop/tabs.json` |
| `modelStore` | provider, model, thinking budget (Low/Med/High/Ultra), fallback chain | SlotF, Settings/General | desktop.json |
| `modeStore` | current mode (Chat/Cowork/Code), per-mode defaults | SlotD, Sidebar ModeTabs | desktop.json |
| `settingsStore` | full versioned settings tree, dirty flag | every Settings panel, ThemeProvider, KeymapProvider | `desktop.json` + safeStorage for secrets |
| `tasksStore` | background tasks list (running/done/failed), per-task progress | TaskTray, BackgroundTasksPanel, NotificationsCenter | mirror of sqlite in main; renderer is read-mostly |
| `notificationsStore` | notification inbox, unread counts, DND state | StatusBar bell, NotificationsCenter, ProfileMenu | sqlite-backed, hydrated on launch |
| `mcpStore` | server list, per-server live status, exposed tools, errors | McpScreen, ProfileMenu Brains row, SlotB +menu | hydrated from main; writes go through RPC |
| `authStore` | identity, plan tier, credential-pool metadata (NEVER raw secrets), OAuth flow state | AccountPanel, Sidebar ProfileMenu, ConnectorsPanel | metadata only; secrets only in safeStorage main-side |
| `sidebarStore` | collapse mode (expanded/icons/hidden), section order, custom-section configs, pinned ids | Sidebar, ProfileMenu | `~/.shay/desktop/sidebar.json` |
| `panelStore` | right-panel tabs, split ratio, active panel, auto-switch rules | RightPanel, BottomRow Slot A "send-to-right" | `~/.shay/desktop/panels.json` (per profile) |
| `attachmentsStore` | per-session staged attachments, send mode flags, recent history index | MediaRow, AttachmentChip, ChatInput, InspectPanel | main-side sqlite for "recent attachments" |
| `usageStore` | rolling token + $/turn stream from Hermes SSE | SlotE context indicator, UsagePanel | none |

**Rules**:
1. No slice imports another. Cross-slice reactions live in `stores/effects/*.ts` that use `subscribeWithSelector`.
2. Slices never own IPC promises directly. They expose actions that call `window.hermesAPI.<namespace>.<method>()`.
3. Main process owns canonical state for `tasksStore`, `notificationsStore`, `mcpStore`. Renderer slices are hydrated on launch and patched via push events.
4. `settingsStore` is the only slice allowed to write to `desktop.json` (single writer). All other slices route through it for persistence to avoid the current Settings/Welcome race.
5. `attachmentsStore` is per-session-scoped; tab/split switches swap the active session id and the same store yields the right list.

### 3. IPC contracts

Existing `window.hermesAPI.*` has ~128 flat handlers. Reorganize into namespaces; ADD the following new channels (return types are Promise unless marked `(event)`):

**`hermesAPI.auth.*`**
- `auth.list(): Promise<{ provider, label, expiresAt? }[]>`
- `auth.add(input: { provider, method: 'oauth'|'apiKey'|'deviceCode', payload }): Promise<{ id }>`
- `auth.remove(id): Promise<void>`
- `auth.status(): Promise<{ identity?, plan?, signedInAt? }>`
- `auth.startOAuth(provider): Promise<{ flowId, verificationUrl, userCode? }>` — kicks PKCE / device-auth in main
- `auth.cancelOAuth(flowId): Promise<void>`
- `auth.onOAuthEvent((event)): { flowId, kind: 'pending'|'success'|'error', message? }` — push channel
- `auth.signOut(scope: 'this'|'everywhere'): Promise<void>`

**`hermesAPI.mcp.*`**
- `mcp.list(): Promise<McpServer[]>`
- `mcp.add(input: McpServerInput): Promise<McpServer>`
- `mcp.remove(name): Promise<void>`
- `mcp.test(name): Promise<{ ok, tools: ToolDescriptor[], error? }>`
- `mcp.configureTools(name, enabled: string[]): Promise<void>`
- `mcp.login(name): Promise<{ flowId }>` (OAuth)
- `mcp.setEnabled(name, enabled: boolean): Promise<void>`
- `mcp.serve(action: 'start'|'stop'|'status'): Promise<{ running, port? }>`
- `mcp.onStatusChange((event)): McpStatusEvent[]` — batched live probe

**`hermesAPI.logs.*`**
- `logs.tail(filters: { level?, component?, session? }): Promise<{ subscriptionId }>` — spawns `shay logs --follow` child
- `logs.stop(subscriptionId): Promise<void>`
- `logs.onChunk((event)): { subscriptionId, lines: LogLine[] }`
- `logs.snapshot({ lines, level?, component?, since? }): Promise<LogLine[]>`
- `logs.export({ filters, format: 'json'|'txt' }): Promise<string>` (file path)

**`hermesAPI.diagnostics.*`**
- `diagnostics.doctor({ fix?: boolean }): Promise<DoctorReport>`
- `diagnostics.dump({ showKeys?: boolean }): Promise<DumpReport>`
- `diagnostics.debugShare({ expireDays?: number }): Promise<{ url, deleteToken }>`
- `diagnostics.debugDelete(deleteToken): Promise<void>`
- `diagnostics.status({ deep?: boolean }): Promise<StatusReport>`
- `diagnostics.serviceHealth(): Promise<{ anthropic: 'ok'|'degraded'|'down', incidents: [] }>`

**`hermesAPI.tasks.*`**
- `tasks.list({ status? }): Promise<BackgroundTask[]>`
- `tasks.get(id): Promise<BackgroundTask>`
- `tasks.pause(id): Promise<void>` / `tasks.resume(id)` / `tasks.cancel(id)`
- `tasks.setNotifyOnComplete(id, enabled: boolean): Promise<void>`
- `tasks.onUpdate((event)): TaskUpdate` — push channel aggregating kanban + cron + `/v1/runs` SSE

**`hermesAPI.notifications.*`**
- `notifications.list({ unreadOnly?, limit?, cursor? }): Promise<{ items, nextCursor }>`
- `notifications.markRead(ids: string[]): Promise<void>` / `markAllRead()`
- `notifications.dismiss(ids): Promise<void>`
- `notifications.setRules(rules: NotificationRules): Promise<void>`
- `notifications.getRules(): Promise<NotificationRules>`
- `notifications.setDnd({ schedule, until? }): Promise<void>`
- `notifications.onIncoming((event)): NotificationItem`

**`hermesAPI.keychain.*`** (main-only escrow)
- `keychain.isAvailable(): Promise<{ available, backend: 'safeStorage'|'plaintext-fallback' }>`
- `keychain.set(scope, key, value): Promise<void>` — value never returned to renderer
- `keychain.has(scope, key): Promise<boolean>`
- `keychain.remove(scope, key): Promise<void>`
- `keychain.migratePlaintext(): Promise<{ migrated: number, skipped: number }>`

**`hermesAPI.sessions.*` (extend)**
- `sessions.rename(id, title): Promise<void>` — routes via Hermes RPC, not direct sqlite
- `sessions.pin(id, pinned: boolean): Promise<void>` — Desk overlay
- `sessions.tag(id, tags: string[]): Promise<void>` — Desk overlay
- `sessions.archive(id): Promise<void>`
- `sessions.delete(id): Promise<void>`
- `sessions.fork(fromMessageId): Promise<{ newSessionId }>` — needs Hermes endpoint
- `sessions.search({ query, scope: { projectId?, brainId?, mode? }, fuzzy?: boolean }): Promise<SearchHit[]>`
- `sessions.chaptersFor(id): Promise<Chapter[]>` — overlay-backed
- `sessions.markChapter(sessionId, beforeMessageId, title): Promise<void>`

**`hermesAPI.attachments.*`** (extend)
- `attachments.recent({ limit, cursor? }): Promise<AttachmentRef[]>`
- `attachments.inspect(id): Promise<{ raw, smart: { ocr?, transcript?, summary? } }>`
- `attachments.setSendMode(id, mode: 'raw'|'smart'): Promise<void>`
- `attachments.annotate(id, ops: AnnotationOp[]): Promise<{ newId }>`

**`hermesAPI.capture.*`**
- `capture.screenshot({ mode: 'region'|'window'|'full' }): Promise<AttachmentRef>`
- `capture.screenRecord.start({ withAudio }): Promise<{ id }>` / `.stop(id)` / `.cancel(id)`
- `capture.webcam.photo() / .video.start() / .video.stop()`
- `capture.voice.start() / .stop()`

**`hermesAPI.plugins.*`**
- `plugins.list(): Promise<Plugin[]>`
- `plugins.install(spec): Promise<Plugin>` / `update(name)` / `remove(name)`
- `plugins.setEnabled(name, enabled)`

**`hermesAPI.settings.*` (consolidates 25 scattered handlers)**
- `settings.get(group): Promise<SettingsGroup>`
- `settings.set(group, patch): Promise<void>`
- `settings.export(): Promise<string>` (json with schemaVersion)
- `settings.import(json): Promise<{ migrated, conflicts: [] }>`
- `settings.reset({ scope }): Promise<void>`

**`hermesAPI.shell.*`** (renderer keymap)
- `shell.popOut({ kind, payload }): Promise<{ windowId }>` — BrowserWindow factory
- `shell.openExternal(url): Promise<void>`

**`hermesAPI.chat.events.*`** (extend SSE typed event surface — see §4)
- existing `tool.progress` → typed `tool_call_start`, `tool_call_delta`, `tool_call_result`
- new `thinking_delta`, `ask_user`, `run_this`, `chapter_mark`, `usage_tick` (incremental $/turn)

### 4. Backend extensions in shay-shay (Python)

**SSE event taxonomy upgrade** (`gateway/platforms/api_server.py` around line 3338-3361 `/v1/runs` stream):
- Today the stream is mostly OpenAI-shaped `delta.content`. Add custom event kinds (named `event:` lines) parseable by `src/main/sse-parser.ts`:
  - `tool_call_start { id, name, args_preview, ts }`
  - `tool_call_delta { id, partial_output }`
  - `tool_call_result { id, status, output_summary, output_full_ref }`
  - `thinking_start / thinking_delta / thinking_end`
  - `ask_user { id, prompt, options[], default }` — replaces APPROVAL_RE regex
  - `run_this { id, command, cwd, why }`
  - `usage_tick { input_tokens, output_tokens, est_cost_usd }`
  - `chapter_mark { title, before_msg_id }`

**Logs streaming endpoint**
- `GET /v1/logs/tail?level=&component=&session=&follow=1` — chunked text/event-stream wrapping `shay logs --follow` for cross-process consumption. Lets Desk avoid spawning the CLI directly.

**Tasks lifecycle aggregator**
- `GET /v1/tasks` — JSON list across Kanban + cron + `/v1/runs`.
- `GET /v1/tasks/stream` — SSE: `task_created`, `task_progress`, `task_completed`, `task_failed`, `task_input_needed`.
- `POST /v1/tasks/{id}/{pause|resume|cancel}`.
- `POST /v1/tasks/{id}/notify` (per-task notify-on-complete).

**MCP lifecycle endpoints**
- `GET /v1/mcp/servers`, `POST /v1/mcp/servers`, `DELETE /v1/mcp/servers/{name}`.
- `POST /v1/mcp/servers/{name}/test` → `{ ok, tools, error }`.
- `POST /v1/mcp/servers/{name}/login` → starts OAuth, returns flow_id; flow events via `/v1/auth/stream`.
- `GET /v1/mcp/servers/{name}/tools` and `PATCH` for enable subset.
- `POST /v1/mcp/serve` (start/stop/status).
- Single writer to `~/.shay/<profile>/config.yaml` via `shay_cli/mcp_config.py` with file-lock — replaces Desk's regex parse and concurrent-write hazard.

**Auth-OAuth flow surface**
- `POST /v1/auth/oauth/start { provider }` → `{ flow_id, verification_url, user_code? }`.
- `GET /v1/auth/stream?flow_id=` — SSE: `pending`, `prompted`, `success`, `error`.
- `POST /v1/auth/devicecode/start` (Nous), `POST /v1/auth/pkce/start` (Spotify, claude.ai setup-token).
- `POST /v1/auth/{provider}/logout` and `POST /v1/auth/logout-everywhere`.

**Sessions write RPC** (replaces direct state.db writes from Desk)
- `PATCH /v1/sessions/{id}` (title, archived).
- `POST /v1/sessions/{id}/fork?from_message=...` → `{ new_session_id }`.
- `DELETE /v1/sessions/{id}`.
- `GET /v1/sessions/search?scope=…&fuzzy=1` — adds fuzzy ranking layer over `messages_fts`.
- New optional `sessions.project_id`, `sessions.brain_id`, `sessions.mode` columns + migration — required for scoped history.

**Diagnostics, doctor, dump, debug-share, status-deep** — already exist as CLI; expose as HTTP for Desk to consume without spawning a child.

**Loopback Bearer enforcement** — change `api_server.py:3372-3382` to require `Authorization: Bearer` always (see §5).

**Service health** — `GET /v1/service/health` (proxies status.anthropic.com) so renderer doesn't reach out directly.

### 5. Security hardening

**Credential storage migration (`src/main/keychain/index.ts`)**
- All secrets currently in `~/.shay/desktop.json` and `~/.shay/auth.json` plaintext (`src/main/config.ts:34-53` and `:704-747`) move under `electron.safeStorage.encryptString` with a sidecar `*.enc` file.
- One-time migration runner: `domains/settings/migrate.ts` on first launch detects plaintext, re-encrypts, writes `schema_version: 2` to `desktop.json`, and hard-refuses to downgrade.
- Linux fallback: probe `safeStorage.isEncryptionAvailable()`; if false, surface a Settings/Privacy warning banner and fall back to `keytar` (preferred) or refuse to store new secrets at rest with a visible "secrets unprotected" pill. NEVER silently downgrade to plaintext for new writes.
- Renderer never receives raw secrets. `keychain.has()` and metadata-only fields (label, expiresAt) are exposed; reads happen exclusively in main process when constructing outbound requests.

**`API_SERVER_KEY` enforcement on loopback (CSRF gate)**
- Today `gateway/platforms/api_server.py:3372-3382` only enforces Bearer on non-loopback. Change condition to always require Bearer; remove loopback exemption.
- Desk autogenerates a 32-byte random key on first launch (`crypto.randomBytes`), stores under `keychain.set('gateway','api_server_key', …)`, and passes via env to `startGateway` in `src/main/hermes.ts:874-880`.
- All renderer→gateway HTTP calls add `Authorization: Bearer ${key}` (currently set only in remote mode at `hermes.ts:61-72`).
- Coordinated rollout: ship the gateway change behind a `SHAY_REQUIRE_BEARER=1` env first; flip to default-on once Desk Phase-1 ships.

**OAuth flow handling (`src/main/domains/auth/`)**
- Replace CLI subprocess approach with main-process loopback HTTP server bound to a random high port on `127.0.0.1`. Register a `shay://oauth-callback` custom protocol via `app.setAsDefaultProtocolClient` as a backup.
- PKCE (Spotify, claude.ai setup-token): `oauth-loopback.ts` issues challenge, opens browser via `shell.openExternal`, awaits callback on loopback, exchanges code, stores tokens via keychain.
- Device-authorization (Nous): `device-auth.ts` polls `/oauth/token` per spec; emits `pending/success/error` events to renderer through `auth.onOAuthEvent`.
- OpenAI Codex login: same pattern.
- Per-MCP-server OAuth (HTTP+OAuth servers) flows through `mcp.login(name)` which delegates to the same `domains/auth/` subsystem.

**Tool-approval audit trail**
- Replace `MessageRow.tsx APPROVAL_RE` regex with structured `ask_user` SSE event (see §4).
- Approval responses logged into a new `tool_approvals` sqlite table (`src/main/domains/sessions/overlay.ts` — Desk-side, not Hermes-owned): `{ id, session_id, message_id, tool, args_hash, decision, decided_at, decided_by }`.
- Diagnostics panel exposes "export approval audit" honoring privacy panel toggle.

**Permission scoping (`src/main/security.ts`)**
- Extend `setPermissionRequestHandler` to gate microphone (Slot C voice, voice memo), screen capture (screenshot, screen record), camera (webcam capture) with per-source allow + remember-choice persisted to settingsStore.
- macOS Info.plist entries: `NSMicrophoneUsageDescription`, `NSCameraUsageDescription`, `NSScreenCaptureUsageDescription`. Ship before any capture UI is visible.

**Pop-out window hardening**
- New BrowserWindow instances in `domains/panels/popout.ts` inherit `hardenAttachedWebContents` allowlist from `security.ts:77` automatically by passing `webPreferences` through a single factory; explicit allowlist of preload bridge subset (no `keychain.*` exposure in pop-outs).

### 6. Schema decoupling

The current Desk reads `~/.shay/state.db` via `better-sqlite3` read-only (`src/main/sessions.ts`), decodes the `\x00json:` sentinel, and regex-parses `~/.shay/<profile>/config.yaml` for MCP servers (`src/main/installer.ts:1186-1242`). Both couple Desk to Shay's internals.

**Replace direct state.db reads** with a versioned `hermes-rpc` contract:
```
interface HermesSessionsRPC {
  list(filter: { limit, cursor, projectId?, brainId?, mode? }): Promise<SessionRow[]>
  get(id): Promise<SessionDetail>
  messages(id, range): Promise<MessageRow[]>
  search(query, scope, fuzzy): Promise<SearchHit[]>
  rename(id, title): Promise<void>
  fork(fromMessageId): Promise<{ newSessionId }>
  archive(id): Promise<void>
  delete(id): Promise<void>
  // No more sentinel decoding renderer-side.
}
```
Implemented over HTTP endpoints listed in §4. Desk keeps `better-sqlite3` only as a **fallback cache reader** for offline launch, never as primary truth.

**Desk-owned overlay store** (`src/main/domains/sessions/overlay.ts`) for fields Shay doesn't own:
- `desk_session_overlay { session_id PK, pinned bool, tags TEXT[], starred_messages TEXT[], chapters JSON, ui_color, last_panel_layout JSON }`
- Stored at `~/.shay/desktop/overlay.sqlite`.
- Rationale: avoids fighting Shay migrations for Desk-cosmetic state; lets Shay evolve `sessions` freely.

**MCP server contract**
```
interface McpServer {
  name: string
  transport: 'stdio' | 'http' | 'sse'
  command?: string
  args?: string[]
  url?: string
  env?: Record<string,string>
  auth?: { kind: 'none'|'header'|'oauth'; tokenRef?: string }
  enabled: boolean
  tools?: ToolDescriptor[]            // populated by mcp.test
  status?: 'unknown'|'ok'|'error'|'auth_required'
  lastError?: string
  lastProbedAt?: string
}
```
All reads/writes go through `mcp_config.py` (single writer, file-locked). Regex parse in `installer.ts` is deleted.

**Settings schema versioning** (`src/shared/settings-schema.ts`)
- All settings under a single `SettingsTree` with `schemaVersion`. Import/export embeds version; main runs migrations on `settings.import()`.
- Forbids per-key writes from arbitrary screens — only `settings.set(group, patch)` allowed. Removes the 25 ad-hoc handlers.

**Chapter source**
- Decision: Desk-owned overlay (not riding `checkpoints.py`). Chapters are UI annotations on message ranges; checkpoints are functional state snapshots. Different lifecycles.

**Profile binding per session**
- New `desk_session_overlay.profile_id`. `Project chip → new session` writes this on session create. Top-bar reads it to display the current chip.

### 7. Performance + reliability

**Chat virtualization**
- Replace memo-only `MessageList.tsx` with `react-virtuoso` (recommended over react-window for variable-height streaming content). Wraps `MessageRow.tsx`. Critical because typed blocks turn each message into a multi-subtree render.
- Per-block auto-collapse (`primitives/CollapsibleBlock.tsx` with `IntersectionObserver` + line-clamp measurement) keeps DOM cost bounded for long messages.

**SSE backpressure**
- `src/main/sse-parser.ts` currently emits every chunk. Add coalescing buffer (16ms tick / max 32KB) before forwarding to renderer to prevent React reconciliation thrash during fast streams.
- `usage_tick` events throttled to ≥250ms in main before reaching `usageStore`.
- Renderer subscribes via single channel per session id; switching tabs releases prior subscription deterministically.

**Big-list rendering budget**
- Sidebar Recents virtualized after 50 items.
- Sessions browser keeps date-group buckets but virtualizes within each bucket.
- BackgroundTasksPanel virtualized.
- LogsScreen always virtualized + windowed tail (keeps last N=5000 lines max in renderer; older paged on demand).

**Error boundaries strategy**
- Top-level boundary at `shell/Layout.tsx` (full-app crash screen with "copy diagnostic report" → `diagnostics.dump`).
- Per-feature boundary around `RightPanel`, `Chat`, `Sidebar`, each Settings panel, each pop-out window. Renderer crash in one panel does not nuke the rest.
- Each boundary auto-reports to `notifications.onIncoming` with category `system_error` (respects DND but always lands in inbox).

**Crash reporting**
- Wire `electron.crashReporter` to a local file sink by default; opt-in upload toggle in Privacy panel. Renderer-side errors caught by boundaries serialized via `diagnostics.recordCrash(payload)` IPC.

**Update channel**
- Single canonical path: `electron-updater` for Desk binary, `shay update` only for the Shay CLI/gateway. UI explicitly labels the two. Interlock: while a remote SSH session is active, defer Desk auto-install to next launch.

**IPC reliability**
- Every push channel (`tasks.onUpdate`, `notifications.onIncoming`, `logs.onChunk`, `mcp.onStatusChange`, `auth.onOAuthEvent`, `chat.events.*`) carries a monotonic seq number. Renderer detects gaps and requests `*.snapshot()` resync. Avoids drift after sleep/wake.

**Reconnect handling**
- `useChatIPC` listens for gateway pulse; on disconnect, surfaces a status-bar pill + queues outbound messages locally; on reconnect, replays.

### 8. Build sequence (architecture)

Ordered so each step unblocks the next; UI feature work after step 6.

1. **State foundation**: introduce Zustand, define `settingsStore` + `sessionStore` first, migrate `Layout.tsx` lifted state into stores. Add error boundaries.
2. **Primitive library**: ship `Modal`, `Popover`, `Menu`, `Tooltip`, `IconButton`, `Sortable` (dnd-kit), `ConnectionForm`. No feature code allowed to build inline overlays after this lands.
3. **Keychain + safeStorage migration**: `domains/keychain` + `domains/settings/migrate.ts`. Re-encrypt existing plaintext. Add isAvailable probe and Privacy warning if false.
4. **API_SERVER_KEY hardening**: gateway change (PR to shay-shay) + Desk auto-gen + Bearer-always on local. Coordinated release.
5. **IPC namespacing + settings consolidation**: refactor `src/main/index.ts` 128-handler flat list into `domains/*/index.ts` modules with namespaced `window.hermesAPI`. Land `settings.get/set(group)` replacing per-field handlers.
6. **Typed SSE event surface**: ship gateway custom event kinds (§4) + extend `sse-parser.ts` + typed `ChatMessage` block union in `shared/messages.ts`. Required before any Section 4 / Section 6 block UI is real.
7. **Sessions RPC + overlay store**: stand up Hermes write endpoints (rename/fork/archive/delete/search-with-scope) + Desk overlay sqlite (pin/tags/chapters/profile binding). Sessions cease to write to state.db.
8. **MCP CRUD via `mcp_config.py`**: delete regex parse, ship `mcp.*` IPC namespace + status poller.
9. **Auth subsystem**: loopback OAuth host + device-auth + PKCE flows. AccountPanel stubs lit up.
10. **Logs + tasks + notifications backbones**: SSE channels in gateway, main-side aggregators, renderer stores. Status-bar pill primitive lands.
11. **Three-column shell + router**: replace `Layout.tsx` two-column with `shell/Layout.tsx` (TopBar + Sidebar + Content + RightPanel + StatusBar). Lightweight history stack for ◀ ▶.
12. **Chat virtualization + InteractiveBlock**: virtuoso into MessageList; ship `InteractiveBlock` primitive used by Terminal / AskUser / RunThis blocks. Replace `APPROVAL_RE` with `AskUserBlock`.
13. **Capture + permission scaffolding**: `security.ts` permission handlers; Info.plist entries; `domains/capture/*` IPC. Only after this does Section 3 capture UI / Slot C voice ship.
14. **UI feature work (Sections 1–8)**: now safe to build BottomRow slots, MediaRow, right-panel tabs, sidebar redesign, Settings sub-pages, admin screens. Each feature consumes existing primitives, stores, and IPC.

### 9. Risks & mitigations

1. **Schema coupling to `~/.shay/state.db` is the single biggest fragility** (Sections 2/4/5/7 all depend on it). Mitigation: freeze Desk's direct-write ambitions before Phase 1. All writes go through new Hermes RPC (§4); Desk keeps a sidecar overlay sqlite for UI-only fields. Coordinated PR in shay-shay adds the write endpoints + schema columns (project_id/brain_id/mode) before Desk consumes them. Fall-back read of state.db remains read-only and gated by a schema-version probe; mismatch surfaces a Diagnostics warning rather than crashing the switcher.

2. **Plaintext secrets + unenforced API_SERVER_KEY** are real security holes called out across Sections 8/9 and the snapshot's cross-cutting findings. Mitigation: ship Steps 3–4 of the build sequence before any new Account/Connectors/MCP-login UI. One-time encrypted migration with `schema_version: 2` write-lock prevents older Desk builds from clobbering encryption. Loopback Bearer enforcement ships behind `SHAY_REQUIRE_BEARER=1` first, flips to default in the same release that auto-generates the key. Linux-no-keyring case yields a visible "secrets unprotected" status pill — never silent.

3. **No global state library means every new cross-cut explodes Layout.tsx**. Mitigation: Zustand is Step 1 of the build sequence. Adopt a hard rule: any new feature PR that lifts state to `Layout.tsx` is rejected; it must land in a slice. Provide a codemod for existing lifted state.

4. **SSE event taxonomy upgrade is coordinated across two repos**. Mitigation: ship the new event kinds in the gateway with backward-compatible aliases (old `tool.progress` still emitted alongside `tool_call_*`). `src/main/sse-parser.ts` parses both for one release; flip to typed-only in the release after. Avoids hard cutover with mixed-version installs.

5. **Auth + OAuth surface is a feature explosion that can derail the timeline**. Mitigation: explicitly scope Phase 1 to (a) safeStorage migration of existing pooled creds, (b) Anthropic OAuth via PKCE for the AccountPanel sign-in, (c) Nous device-auth. Defer per-connector Gmail/Drive/Slack/etc OAuth to Phase 2 — surface them as "Connect" CTAs that open browser to claude.ai/connectors and read status back, rather than running our own OAuth host for each. Removes 8+ provider-specific flows from the critical path while still lighting up the Settings/Connectors panel skeleton.

---

## CLI ↔ Desktop parity scoreboard (preliminary)

Coverage scale: 1 = absent, 2 = stubbed/partial, 3 = functional but rough, 4 = solid, 5 = matches or exceeds CLI. Targets are post-Phase-6.

| Capability category | Today | Target | Gating phases | Notes |
|---|---|---|---|---|
| Auth / OAuth (`shay auth add/list/remove/login/logout`) | 1 | 4 | P0 (keychain), P5 (loopback host, PKCE, device-auth) | Per-connector flows deferred to post-Phase-6; Anthropic + Nous in scope |
| MCP server CRUD (`shay mcp add/remove/test/login/serve`) | 2 | 5 | P0 (IPC), P5 (`mcp_config.py` writer + status poller) | Regex parse in `installer.ts` deleted; live status pills |
| Sessions read (`shay sessions list/show`) | 3 | 4 | P2 (overlay + scoped search RPC) | Direct state.db read demoted to offline fallback |
| Sessions write (rename/fork/archive/delete/tag/pin/chapters) | 1 | 4 | P2 (Hermes RPC + overlay) | Pin/tags/chapters/profile-binding owned by Desk overlay |
| Cross-session search (`shay sessions search`) | 2 | 4 | P2 (fuzzy + scope), P3 (CommandPalette ⌘K) | Fuzzy ranking layered over `messages_fts` |
| Tool execution / approvals (`shay run`) | 2 | 4 | P1 (typed `ask_user` SSE), P3 (InteractiveBlock variants) | APPROVAL_RE regex replaced with structured event + audit table |
| Logs (`shay logs --follow`) | 1 | 4 | P5 (gateway `/v1/logs/tail` + Logs panel) | Renderer never spawns CLI child |
| Tasks / runs (`shay runs`, kanban, cron) | 2 | 4 | P3 (aggregator + TaskTray + Tasks panel) | Single SSE channel aggregates kanban + cron + `/v1/runs` |
| Notifications | 1 | 4 | P3 (inbox + OS Notification + DND) | Per-category rules + dock badge |
| Diagnostics (`shay doctor/dump/debug-share/status`) | 2 | 4 | P5 (Diagnostics panel + HTTP exposure) | "Copy report" + opt-in upload |
| Plugins (`shay plugins`) | 1 | 4 | P5 (Plugins panel) | Marketplace tab deferred to P6 |
| Settings / config | 3 | 5 | P0 (consolidation), P4 (Settings sub-pages) | 25 ad-hoc handlers replaced with `settings.get/set(group)` |
| Shortcuts / keymap | 1 | 4 | P0 (`tinykeys` manifest), P4 (editor) | All shortcuts editable per-row + global reset |
| Theming (light/dark/system) | 3 | 5 | P0 (token expansion), P4 (Appearance panel) | + accent, font, density, motion |
| Voice / speech (`shay voice`) | 1 | 3 | P3 (UI shell), P6 (backend) | Capture permissions land before UI exposed |
| Capture (screenshot / record / webcam) | 1 | 3 | P3 (UI shell + `domains/capture/*`) | macOS Info.plist entries shipped first |
| Attachments smart/raw + annotate + reuse | 1 | 4 | P3 (MediaRow + InspectPanel + AnnotateModal) | Recent-attachments sqlite history |
| Multi-tab + split chat | 1 | 4 | P2 (tabs + horizontal split), P3 (right-panel vertical split) | Per-tab session binding |
| Right-panel surfaces (Preview/Diff/Terminal/Files/Plan/Tasks) | 1 | 4 | P3 (RightPanel + auto-switch) | pty/Terminal backend deferred to P6 |
| Hooks / Curator / Webhooks / ACP / Computer-use | 1 | 3 | P5 (sub-panels) | Hooks doctor + Curator status surfaced in Settings |
| Backup / Restore | 1 | 3 | P5 (Backup panel) | Per-profile export/import |
| Update channels (Desk + CLI) | 2 | 4 | P5 (Update channel panel) | electron-updater for Desk, `shay update` for CLI — clearly labeled |
| Remote SSH (ssh-remote.ts parity) | 3 | 4 | Continuous per-surface | Each new admin surface decides RemoteNotice gate |

---

## Cross-cutting decisions

**State management — Zustand (not Context, not Redux, not Jotai).** Slice-per-domain (`sessions, tabs, slots, panels, notifications, tasks, mode, model, customize, connection, sidebar, composer, attachments, chat, nav, settings, mcp, auth, usage`), `subscribeWithSelector` middleware for cross-slice reactions, `persist` middleware where applicable. No slice imports another — cross-slice reactions live in `stores/effects/*.ts`. Main process owns canonical state for `tasksStore`, `notificationsStore`, `mcpStore`; renderer hydrates on launch and patches via push events. `settingsStore` is the sole writer to `desktop.json`. Rejected: Context+useState (proven inadequate by current Layout.tsx), Redux Toolkit (ceremony mismatch with IPC-promise pattern), Jotai (atom-per-field fragments well-bounded domains).

**Virtualization — `react-virtuoso` (not `@tanstack/react-virtual`, not `react-window`).** Tie-break: variable-height streaming content with typed multi-subtree blocks is virtuoso's home turf; `@tanstack/react-virtual` requires manual height measurement that fights streaming reflow. Used in `MessageList`, Sidebar Recents (>50), BackgroundTasksPanel, LogsScreen (5k-line cap). The earlier UI Build Plan reference to `@tanstack/react-virtual` is superseded by this decision — virtuoso wins.

**Animation — CSS transitions + Radix data-state attributes (not Framer Motion).** Standard timings (`--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 300ms`) and easings exposed as CSS vars; `@media (prefers-reduced-motion)` collapses durations to 0ms except focus transitions. Radix primitives drive open/close states via `data-state` attribute, eliminating runtime JS animation cost. Framer Motion reserved for the AnnotateModal canvas overlay only if needed.

**Design tokens — CSS variables (not Tailwind theme, not CSS-in-JS).** All visual properties expressed as semantic tokens (`--color-bg-base`, `--color-fg-default`, `--color-accent`, `--space-*`, `--radius-*`, `--shadow-*`, `--font-*`, `--motion-*`, `--ring-*`, `--density`). `ThemeProvider.tsx` swaps the token set on theme change; accent re-derives via oklch. Tailwind retained for utility classes consuming these vars (`bg-[var(--color-bg-base)]` pattern) but theme palette is var-driven, not tailwind-config-driven, so theme switching is a single root-class flip with no rebuild.

**Drag-and-drop — single `dnd-kit` setup (not react-dnd, not native HTML5 DnD).** One `<DnDProvider>` mount in AppShell powers slot reorder (Slots A–F), media chip reorder, panel-tab reorder, sidebar-section reorder, fallback-chain editor. Building once prevents five divergent implementations. Keyboard alternatives (`Cmd+↑/↓`, `Cmd+←/→`) are mandatory per surface — accessibility is not optional.

**Composer — TipTap (not Slate, not contentEditable from scratch, not Lexical).** Tie-break: inline ``` live-render, future @-mention nodes, OS-native spell-check via contentEditable inheritance, Shift+Enter newline, paste-files, drag-drop overlay, autoresize via `field-sizing: content` polyfill — all first-class. Migration cost is real but the alternative (continuing to extend the raw textarea) caps the entire Section 2 design.

**Routing — lightweight history stack in Zustand `nav` slice (not `react-router`).** Four navigable surfaces don't justify react-router's footprint; TopBar ◀ ▶ wires to push/pop on a stack of `{kind, payload}` entries. Settings sub-page routing piggybacks on the same mechanism with `/settings/...` shape entries.

**Primitives base — Radix UI (not Headless UI, not Reach UI).** Dialog, Popover, Tooltip, Tabs, ContextMenu, Toast all share Radix's `data-state` animation model, focus-trap quality, and a11y rigor. cmdk (also from the Radix ecosystem) powers CommandPalette. Sonner reserved as fallback for Toast if Radix Toast's queueing proves insufficient.

**Icons — Lucide (not Heroicons, not Phosphor, not custom SVG sheet).** Consistent stroke (1.5px@16, 1.75px@≥20), tree-shakeable, MIT, large library. Custom marks reserved for Shay brand glyph and mode-tab indicators.

**Keyboard shortcuts — `tinykeys` (not `mousetrap`, not `react-hotkeys-hook`).** Manifest-driven (`src/renderer/src/shortcuts/manifest.ts`), per-scope registration, editable from Settings → Shortcuts. Replaces menu-IPC-only shortcuts.

**Sessions schema strategy — Hermes RPC for writes + Desk overlay sqlite for UI-only fields.** No direct writes to `~/.shay/state.db` from Desk, ever. Reads gated by schema-version probe with Diagnostics warning on mismatch. Overlay at `~/.shay/desktop/overlay.sqlite` owns pin/tags/chapters/starred-messages/profile-binding. Chapters explicitly NOT riding `checkpoints.py` — different lifecycles.

**Secrets — `electron.safeStorage` with `keytar` fallback on Linux-no-keyring; never silent plaintext.** Renderer never receives raw secrets. One-time migration at first launch writes `schema_version: 2` and hard-refuses downgrade. Linux without keyring surfaces a visible "secrets unprotected" status pill.

**SSE event taxonomy — typed kinds with backward-compatible aliases for one release.** Gateway emits both `tool.progress` (old) and `tool_call_*` (new) for one release window; `sse-parser.ts` parses both; flip to typed-only in the release after. Coordinated with Hermes/shay-shay PR.