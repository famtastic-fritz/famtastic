---
title: rightpanel
type: note
permalink: shay-memory/desk-redesign/phase-3/rightpanel
---

# Phase 3 — RightPanel (rightpanel label)

Date: 2026-05-29
Owner: Phase 3 subagent (label `rightpanel`)
Status: shipped — TypeScript strict passes (`npm run typecheck`).

## Files created (ownership)

Renderer (`src/renderer/src/right/`):
- `RightPanel.tsx` — composition root. Reads `panels.{tabs, activeTabId,
  pinned, split, splitRatio, autoSwitch}`, renders a `<PanelTabsRow>` on
  top and a single pane or a vertical `react-resizable-panels` `PanelGroup`
  with two panes underneath. Each pane wraps its variant body in a
  `<FeatureBoundary scope="panel">` so a crash inside one variant never
  nukes the surface. Resizer uses the existing `chat-split-resizer` class
  (vertical re-use). Pop-out is routed through `window.api.panels.popOut`
  on the preload (graceful no-op + console warn when unavailable).
- `PanelTabsRow.tsx` — chrome-style tabs strip backed by `dnd-kit/sortable`.
  "+" tail button toggles a popover listing the seven panel variants
  (Preview, Diff, Terminal, Files, Plan, Background tasks, Custom).
  Right-click context menu: Pin / Unpin, Pop out, Split below, Close.
  Reuses unscoped `chat-tabs-*` / `chat-tab-*` class vocabulary from
  `ChatTabsRow.module.css` so no new stylesheet is owned by this label.
- `PanelTab.tsx` — single sortable tab. Mirrors `<ChatTab>` shape (pin
  badge → title → close), participates in the same DnD sortable context.
- `PanelHeader.tsx` — thin wrapper around the existing `<PanelChrome>`
  primitive (Phase 1). All variants funnel `pin / pop-out / close`
  callbacks through this header.
- `variants/PreviewPanel.tsx` — sandbox `<iframe sandbox="" referrerPolicy="no-referrer">`
  placeholder. Accepts a `src` prop for future artifact embedding.
- `variants/DiffPanel.tsx`, `TerminalPanel.tsx`, `FilesPanel.tsx`,
  `PlanPanel.tsx`, `CustomPanel.tsx` — minimal shells with a labelled
  body that documents which later phase will populate.
- `variants/BackgroundTasksPanel.tsx` — renders a live read from the
  `tasks` store: status icon per row, title, optional progress %, status
  pill. Empty state when the store is clear. Uses `selectTaskCounters`
  for the subtitle.
- `variants/index.ts` — barrel + `variantForKind(kind)` resolver. Unknown
  kinds fall back to `CustomPanel`.
- `usePanelAutoSwitch.ts` — hook that subscribes to `useChatStore` and
  `useTabsStore`. On every change it derives the last block of the
  currently active chat tab. Block-kind → panel-kind mapping:
  - `tool_call` (when `data.tool === "shell"`) → `terminal`
  - `terminal` → `terminal`
  - `file_diff` → `diff`
  - `media` → `preview`
  - `prose` with `data.type === "plan"` → `plan`
  Each rule is gated by `panels.autoSwitchEnabled[kind]`. The hook
  *focuses* an existing tab of the matching kind — it never spawns
  one. A `lastSeenRef` of `(tabId, blockId)` makes the switch
  idempotent across re-renders. The hook is itself master-gated by
  `panels.autoSwitch` via the `enabled` option.
- `index.ts` — public barrel.

Main (`src/main/domains/`):
- `panels-popout.ts` — `openPanelWindow({ tabId, ... })` factory.
  Creates a hardened `BrowserWindow` (`sandbox: true`, `contextIsolation:
  true`, no `webviewTag`), runs the same `hardenAttachedWebContents`
  allowlist applied to webviews, and loads the renderer with a
  `?popout=<tabId>` query string. Helper `readPopoutTabId(location.search)`
  is exported for the renderer to detect popout mode (the AppShell can
  use this in a later step to render only the variant). Does not modify
  `src/main/index.ts` — wiring is left to a subsequent integration step
  per the additive-refactor constraint.

## Constraints honored

- No files outside ownership were modified.
- `package.json` untouched.
- Reused Phase 0/1/2 modules: `PanelChrome` (chat/PanelChrome), `Icon`
  (components/icons), `FeatureBoundary` (components/boundaries), `panels`
  / `chat` / `tabs` / `tasks` stores, `hardenAttachedWebContents`
  (main/security).
- No new CSS file was authored — the right panel reuses the unscoped
  `chat-tabs-row`, `chat-tabs-strip`, `chat-tab*`, `chat-split-resizer`
  classes from `ChatTabsRow.module.css` and the `panel*` classes from
  `InteractiveBlock.module.css` (via PanelChrome). Variant-specific
  layout uses inline `style={}` reading CSS vars from `tokens.css`.
- `npm run typecheck` (node + web) passes clean.

## Known follow-ups (out of label scope)

- AppShell needs to mount `<RightPanel />` into the `rightPanel` slot
  (Phase 2 left it as `ReactNode` slot — not in this label's ownership).
- The popout IPC channel is currently a `notImplemented` stub in
  `src/main/domains/panels.ts`. `openPanelWindow` from
  `panels-popout.ts` is ready to plug in but the actual `ipcMain.handle`
  rewrite is owned by a sibling label.
- A second pane has its own implicit tab strip in the build plan; this
  label ships a single shared strip whose Split-below action moves a
  tab into the lower pane. Per-pane tab strips can land additively.
- The `plan` auto-switch rule probes `data.type === "plan"` on prose
  blocks because the `BlockKind` union does not yet have a dedicated
  `plan` literal — a later phase that introduces the plan block type
  can simplify the hook by matching on `kind === "plan"`.