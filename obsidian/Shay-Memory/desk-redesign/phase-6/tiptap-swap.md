---
title: tiptap-swap
type: note
permalink: shay-memory/desk-redesign/phase-6/tiptap-swap
---

# Phase 6 — TipTap composer swap

**Label:** `tiptap-swap`
**Status:** complete
**Date:** 2026-05-30

## What changed

Swapped the Phase-3 headless textarea inside `<Composer>` for a real TipTap
editor while keeping the public API stable.

### Files touched

- `package.json` — added 4 deps (no other changes):
  - `@tiptap/react@^2.10.4`
  - `@tiptap/starter-kit@^2.10.4`
  - `@tiptap/extension-placeholder@^2.10.4`
  - `@tiptap/suggestion@^2.10.4`
  - npm resolved them to v2.27.2 (latest 2.x); `npm install` succeeded,
    added 63 packages, electron-builder rebuild of `better-sqlite3` passed.
- `src/renderer/src/composer/Composer.tsx` — rewritten to use
  `useEditor` + `<EditorContent>`. Public types and props are unchanged:
  - `ComposerProps` (initialValue, disabled, placeholder, onSend, onAbort,
    onTrigger, onShellRun, leadingSlot, sendKeyOverride)
  - `ComposerHandle` (setValue, getValue, focus, clear)
  - `TriggerEvent`, `ShellRunRequest`
- `src/renderer/src/composer/extensions/index.ts` — kept all Phase-3
  helpers (`detectTrigger`, `replaceTriggerWord`, `isInsideCodeFence`,
  `codeFenceNewline`, `sigilEnabledKey`, `DEFAULT_SEND_KEY`, `SendKey`,
  `TRIGGER_SIGILS`, `TriggerMatch`, `TriggerSigil`). Added re-exports for
  the three new extensions and a `buildExtensions()` factory.
- `src/renderer/src/composer/extensions/SlashExtension.ts` — NEW. Built on
  `@tiptap/suggestion` with `char: '/'`, `allowSpaces: false`. Dispatches
  lifecycle to React via `onTriggerStart` / `onTriggerUpdate` /
  `onTriggerExit` / `onTriggerKeyDown`.
- `src/renderer/src/composer/extensions/MentionExtension.ts` — NEW.
  `char: '@'`, `allowSpaces: false`. Same lifecycle shape.
- `src/renderer/src/composer/extensions/ShellExtension.ts` — NEW.
  `char: '!'`, `allowSpaces: true` so the user can preview a full
  command-line.
- `src/renderer/src/composer/Composer.module.css` — added `editorHost`,
  `editorContent`, and ProseMirror inner styles. Preserved existing
  textarea selectors so any consumers that still target them stay
  functional during the transition. Added placeholder display via
  `extension-placeholder`'s `is-editor-empty` + `data-placeholder` hook.

### Design notes

- The Suggestion plugin is configured with `items: () => []` and
  `allow: () => true`. Tiptap's Suggestion is used **only** as a
  position detector; the React parent renders the existing Phase-3
  pickers (`SlashCommandsPicker`, `MentionPicker`, `ShellPreview`)
  through the shared `<TriggerPopover>` host. This keeps picker
  components untouched and avoids re-implementing fuzzy filter,
  active-index handling, results-change, or shell preview rendering.
- The Composer keeps its own `triggerLifecycle` React state. When
  Suggestion fires `onStart` / `onUpdate`, the Composer reads
  `lifecycle.clientRect()` to position the popover and forwards the
  `(sigil, query, position)` triple to `onTrigger` so the parent's
  contextual chrome (slot-E hints, etc.) still works.
- Keyboard model:
  - `editor.editorProps.handleKeyDown` owns Enter, Shift+Enter,
    ArrowUp-edit-last, and code-fence indent. The Suggestion plugin
    runs its own `onKeyDown` BEFORE this (ProseMirror plugin order),
    which is where ArrowUp / ArrowDown navigate the popover, Escape
    closes it, Tab dismisses it. The `!` (shell) sigil never navigates
    because `<ShellPreview>` has no list.
  - Send-key respects `stores/settings.general.sendKey`
    (`"enter" | "mod+enter"`) and `sendKeyOverride` for tests, exactly
    like Phase 3.
- Code-fence detection still uses `isInsideCodeFence(text, caret)` from
  `extensions/index.ts`. The TipTap doc is projected to plain text via
  `view.state.doc.textContent` for the check. There's a small drift
  (one position per block boundary in ProseMirror), but for triple-
  backtick indenting that's acceptable and matches the spec.
- `editor.commands.setContent(text, true)` is used for the imperative
  `setValue` so it emits an update event and the composer store stays
  in sync.
- `clearContent(true)` is used after send so the store + editor reset
  together. The send button disabled state is derived from
  `editor?.getText().trim().length`.

### What stayed the same

- `<TriggerPopover>` (the host) and the three pickers underneath
  (`SlashCommandsPicker`, `MentionPicker`, `ShellPreview`) — zero
  changes.
- `useComposer` store API (`text`, `setText`, `pushSnapshot`,
  `openTrigger`, `closeTrigger`, etc.). The new Composer no longer
  calls `openTrigger` / `closeTrigger` / `updateTriggerQuery` since
  TipTap's Suggestion plugin is the source of truth for those events
  inside the editor — but the store methods stay in place so other
  surfaces that may read trigger state (none today) keep working.
- `useChatStore` last-user-message ArrowUp behavior.
- The `shay:composer:compose-from` window event handler.

### Risk / open items

- The TipTap Suggestion plugin reports `clientRect()` in viewport
  coordinates. `<TriggerPopover>` already clamps to viewport with
  `position: absolute` + `style.top/left` set from page coords; this
  matches the Phase-3 behavior because the popover element is inside
  the composer (which sits at the bottom of the viewport) and the
  positioning math uses `window.innerWidth/Height` as the clamp.
- Code-fence indent uses plain-text projection; if a user pastes
  exotic ProseMirror nodes inside a fence, position drift may be a
  little more than ±1. Acceptable for Phase 6.
- TipTap is sensitive to React 19 strict mode — `useEditor` builds the
  editor only once and we update editability via `setEditable` in an
  effect. Confirmed editor lifecycle is stable in `npm run typecheck`
  (web project includes the renderer).

### Verification

- `cd /Users/famtasticfritz/famtastic/shay-desktop-electron && npm run typecheck`
  → **clean**, both `tsconfig.node.json` and `tsconfig.web.json` pass.
- `npm test` → 489/490 tests pass. The single failure
  (`src/main/keychain.test.ts > reports protected and persists
  encrypted secrets to disk`) is **unrelated** to this swap — it
  asserts a `safeStorage` ENC:: marker in keychain on-disk storage,
  not anything in the composer. Pre-existing.
- No `package.json` script changes. No external consumer changes
  (SlotStrip / ChatTabsRow / MessageRowV2 / ChatSplitArea still import
  nothing from the Composer — Composer is staged for mount in a later
  Phase 6 wiring step).