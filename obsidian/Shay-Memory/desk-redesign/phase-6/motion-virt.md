---
title: motion-virt
type: note
permalink: shay-memory/desk-redesign/phase-6/motion-virt
---

# Phase 6 — motion-virt

Motion polish + virtualization perf budgets for the Shay Desktop redesign.

## Scope delivered

Additive changes only — no existing public API touched, no package.json
edits, strict TS still passes (only pre-existing unrelated i18n error
remains).

### 1. `src/renderer/src/lib/perf-budget.ts` (new)

Dev-only render budget helper.

- `markBudget(label, ms)` — register a per-label budget (default 16ms).
- `getBudget(label)` — read the current budget.
- `measureRender(label, fn)` — wraps a synchronous fn, warns via
  `console.warn("[perf-budget] <label> exceeded budget: …")` when the
  span exceeds the registered budget. Returns `fn()` untouched.
- Vite's `import.meta.env.DEV` swap makes the whole module a no-op
  pass-through in production — `measureRender` collapses to `fn()`,
  `markBudget` returns immediately.
- `__resetBudgetsForTests()` test helper for vitest if/when tests need
  it.

### 2. `src/renderer/src/styles/motion.ts` (extended)

Added new public aliases beside the existing `MOTION_DURATION` /
`MOTION_EASING` (which the rest of the codebase still uses):

- `DURATION` — t-shirt sizing: `xs=120ms, sm=200ms, md=300ms, lg=500ms`
  re-exported from the existing tokens. New `DurationKey` type.
- `EASING` — short names: `standard, decelerate, accelerate, sharp`
  (sharp = the spec's `emphasized` curve). New `EasingKey` type.

The existing `useReducedMotion()` + `useMotionDuration()` hooks are
unchanged and continue to honour `prefers-reduced-motion` and the
`[data-motion="reduced"]` override.

### 3. `src/renderer/src/styles/tokens.css` (extended)

- Added a `[data-motion="full"]` override block that restores
  `--motion-fast/base/slow/slower` to their non-reduced values. This
  mirrors `readReducedMotion()` in motion.ts so the Settings → Appearance
  "full motion" toggle wins against the OS preference. The
  `@media (prefers-reduced-motion: reduce)` and `[data-motion="reduced"]`
  collapse-to-0ms blocks are unchanged.

### 4. `src/renderer/src/components/chat/VirtualMessageList.tsx`

- Wrapped `MessageRowV2` in a new `MemoMessageRow` (`memo()`) so
  reference-equal row props short-circuit re-renders during streaming.
- Bumped Virtuoso `increaseViewportBy` from `{200,400}` → `{400,800}`
  and `overscan` from `{200,200}` → `{400,400}` so a streaming tail
  stays mounted further outside the visible window.
- Added module-load `markBudget("chat-virtual-list", 16)` and
  `markBudget("chat-message-row", 8)` registrations.
- `itemContent` now wraps the row JSX in `measureRender("chat-message-row", …)`
  so dev sessions get a console warning when an individual row commit
  blows past 8ms.
- Added a dev-only parent-render timing sample using
  `renderStartRef` + a `useEffect` flush — warns when the parent
  commit exceeds 16ms.

### 5. `src/renderer/src/components/chat/useStickToBottom.ts`

- Throttled `onAtBottomChange` transitions to a 50ms window.
- Leading edge fires immediately so the pill never lags the first
  scroll-away.
- Trailing-edge timer coalesces bursts inside the window — the most
  recent `atBottom` value flushes once the window closes.
- Cleanup `useEffect` clears any pending timer on unmount.

### 6. `src/renderer/src/admin/logs/LogStream.tsx`

- Already used Virtuoso. Polished:
  - Pulled the `computeItemKey` inline arrow out to a module-scoped
    `computeLogItemKey(_i, item) => item.seq` so its identity is stable.
  - Bumped `increaseViewportBy` from `{200,200}` → `{400,400}` and
    added explicit `overscan={{ main: 300, reverse: 300 }}` for fast
    burst rendering.
- `itemContent` was already memoized via `useCallback` — left as-is.

### 7. `src/renderer/src/admin/tasks/TaskHistoryTable.tsx`

Replaced the hand-rolled fixed-row-height windowing pass with
`TableVirtuoso` from react-virtuoso. Variable-height rows now measure
themselves; the sticky `<thead>` is preserved via
`fixedHeaderContent`. The existing CSS module
(`BackgroundTasksCenter.module.css`) is reused verbatim — only the JSX
structure changed.

- Module-scoped, type-safe `components` map (`Scroller`, `Table`,
  `TableHead`, `TableBody`, `TableRow`).
- Custom `VirtualRow` consumes `ItemProps<TaskRecord>` + a typed
  `TableContext` (selectedId + onSelect) so the row can attach
  selection-aware className / aria-selected / data attrs / click
  handler without forcing the parent to mutate the cell markup.
- Stable `computeRowKey` (module scope), memoized `context` &
  `itemContent`, memoized `data = rows.slice()` to avoid allocating
  a new copy when the parent re-renders without a real data change.

## Things I deliberately did not do

- No package.json or new deps. TableVirtuoso ships with the existing
  `react-virtuoso@^4.18.7`.
- Did NOT refactor `MOTION_DURATION` / `MOTION_EASING` away. The new
  `DURATION` / `EASING` aliases sit beside them; renaming would have
  rippled outside the declared ownership.
- Did NOT introduce a Settings toggle for `[data-motion="full"]` — the
  CSS hook is now present, the wiring will follow whenever appearance
  settings adopt it.

## Verification

```
$ npx tsc --noEmit -p tsconfig.web.json
src/shared/i18n/index.ts(332,14): error TS2742: …  # pre-existing, not mine
```

Only the pre-existing unrelated i18n error remains. No new TS errors
in any of the six edited files.

## Files touched

- `src/renderer/src/lib/perf-budget.ts` (new)
- `src/renderer/src/styles/motion.ts`
- `src/renderer/src/styles/tokens.css`
- `src/renderer/src/components/chat/VirtualMessageList.tsx`
- `src/renderer/src/components/chat/useStickToBottom.ts`
- `src/renderer/src/admin/logs/LogStream.tsx`
- `src/renderer/src/admin/tasks/TaskHistoryTable.tsx`