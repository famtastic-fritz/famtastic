---
title: slotstrip
type: note
permalink: shay-memory/desk-redesign/phase-3/slotstrip
---

# Phase 3 slotstrip — progress note

Date: 2026-05-29
Label: slotstrip
Owner files created (additive only):

- shay-desktop-electron/src/renderer/src/composer/SlotStrip.tsx
- shay-desktop-electron/src/renderer/src/composer/SlotStrip.module.css
- shay-desktop-electron/src/renderer/src/composer/slots/SlotShell.tsx
- shay-desktop-electron/src/renderer/src/composer/slots/PinnedActions.tsx
- shay-desktop-electron/src/renderer/src/composer/slots/PlusMenuButton.tsx
- shay-desktop-electron/src/renderer/src/composer/slots/MicButton.tsx
- shay-desktop-electron/src/renderer/src/composer/slots/ModeDropdown.tsx
- shay-desktop-electron/src/renderer/src/composer/slots/ContextIndicator.tsx
- shay-desktop-electron/src/renderer/src/composer/slots/ModelPill.tsx
- shay-desktop-electron/src/renderer/src/composer/slots/index.ts

No files outside the declared ownership were modified. `package.json`
untouched. All shared modules consumed read-only.

## What landed

### SlotStrip (composer/SlotStrip.tsx)

- Reads `stores/slots` for `order`, `visibility`, and `pinnedA`. The
  rendered list is `order.filter(id => visibility[id])` so hidden slots
  retain their relative position when re-enabled.
- Horizontal dnd-kit sortable strip. PointerSensor (4px activation
  distance to avoid swallowing button clicks) plus KeyboardSensor for
  keyboard reorder.
- Drag end persists by calling `useSlotsStore.setOrder(arrayMove(...))`.
- Right-click anywhere inside a SlotShell opens a fixed-position context
  menu at the cursor with "Swap function…" (dispatches
  `shay:slot:swap` CustomEvent for downstream listeners) and "Hide" (calls
  `setVisibility(id, false)`). ESC / click-outside dismiss.
- Thin `<span class="divider">` between visible slots; absent before the
  first slot and after the last. The divider lives in the CSS module so
  density can re-skin it without touching JSX.
- The slot variant for each id is selected via an exhaustive `switch`
  with a `never` guard so future SlotIds in `stores/types` will
  type-error here until handled.

### SlotShell (composer/slots/SlotShell.tsx)

- `useSortable({ id: slotId })` with `disableDrag` prop for future
  customize-mode locks.
- Renders a fading drag handle (`⋮⋮`) that becomes visible on hover or
  focus-within, so the chrome stays quiet until the user reaches for it.
- Forwards right-click via `onContextMenu` prop — the SlotStrip owns the
  context menu, not the shell.

### PinnedActions (Slot A — composer/slots/PinnedActions.tsx)

- Up to 3 pinned action chips side-by-side, with a ▾ swap menu that
  toggles entries between pinned/unpinned (FIFO eviction at cap 3).
- Catalog ships: Accept edits, Plan mode, /compact, /clear, Restore
  checkpoint, Switch brain — matches the spec list. Plus a "Custom slash
  command…" leaf and the SlotStrip's Hide passthrough.
- Each action click dispatches `shay:command:<eventName>` so existing
  command-registry subscribers (and the eventual Phase 5 brain switcher,
  Phase 1 chat /compact handler, etc.) can listen without importing this
  module. This mirrors the convention in `lib/command-registry.ts`
  `BUILT_IN_STUBS`.
- Renders whatever is currently in `stores/slots.pinnedA`. The Phase-3
  task brief says default ["accept-edits"]; the store still ships the
  legacy default ["accept-edits","plan-mode"]. PinnedActions tolerates
  either — no hard-coded assumption. If the slots store wants to flip
  the default, that's a one-line follow-up the slots-store owner can
  make safely.

### PlusMenuButton (Slot B — composer/slots/PlusMenuButton.tsx)

- Popover with: Attach file, Paste image, Insert skill, Run MCP tool,
  Insert snippet, Trigger routine, New chapter marker.
- Each entry dispatches `shay:command:<eventName>` AND mirrors itself
  into `lib/command-registry` so ⌘K also surfaces them. Registration
  uses `try { registerCommand(...) }` so StrictMode double-mount doesn't
  throw duplicate-id errors.
- Click-outside and Escape close the popover. Hide-slot leaf appears at
  the bottom when the parent SlotStrip supplies an `onHide` prop.

### MicButton (Slot C — composer/slots/MicButton.tsx)

- UI shell only. States: idle / recording / paused — voice backend
  lands in Phase 6.
- Mode picker (push-to-talk / toggle / one-shot / continuous) opens on
  right-click of the mic itself; selection persists to localStorage
  under `shay-desk-mic-mode`. The spec asked for
  `stores/composer.micMode`, but the existing composer slice doesn't
  expose that field and the slice file is outside this agent's
  create-only ownership. Local persistence keeps the contract additive;
  a tiny follow-up patch on `stores/composer.ts` can absorb the value
  later without changing the public MicButton surface.
- Push-to-talk drives `recording` from pointerdown→up using
  `setPointerCapture`. Toggle / continuous click flips state. One-shot
  fires a 1.2s recording window then auto-returns to idle.
- Every state transition dispatches `shay:command:voice-state` so the
  Phase-6 backend can subscribe without touching the UI.
- A `prefers-reduced-motion` media query disables the recording pulse
  animation in `SlotStrip.module.css`.

### ModeDropdown (Slot D — composer/slots/ModeDropdown.tsx)

- Mirrors `stores/mode.ts` exactly — same store the sidebar Mode tabs
  read. Single source of truth: flipping mode here updates the sidebar
  and vice versa.
- Listbox-style popover with Chat / Cowork / Code + Hide passthrough.

### ContextIndicator (Slot E — composer/slots/ContextIndicator.tsx)

- DISPLAY-ONLY per spec. No mutation paths.
- The spec calls for reading `stores/chat.currentContextUsage`, but the
  chat slice today only carries per-tab message lists from Phase 1; the
  `currentContextUsage` field does not exist yet. To keep this slot
  display-only and to keep the wire-up boundary clean, ContextIndicator
  listens for `shay:context-usage` CustomEvents on `window`. When the
  Hermes gateway begins emitting `usage_tick` events in Phase 1
  acceptance, whatever bridge folds them into the chat slice can also
  dispatch this event in the same call — no edit to this file needed.
  An optional `usage` prop is also accepted for tests / future store
  wiring.
- Tone shifts gray → amber → red at 50% / 80% thresholds via three
  CSS module classes (ctxLow / ctxMed / ctxHigh).

### ModelPill (Slot F — composer/slots/ModelPill.tsx)

- Composite three-segment chip: model name → opens ModelSwitcher
  popover (lists providers from `constants.PROVIDERS` plus any
  `window.shaySettings?.providerPlugins`), thinking level → Low/Med/
  High/Ultra picker, and a read-only live $/turn from
  `stores/model.costPerTurn`. Phase 1 SSE work owns feeding that field
  — this slot just reads.
- ModelSwitcher dedupes provider ids when a plugin re-advertises a
  built-in. When a provider does not ship a canonical model list, the
  switcher renders a single text input — pressing Enter writes the
  identifier to the model slice. This keeps the slot useful for
  custom / local providers without forcing a hard-coded model list.
- Cost formatter scales precision: < $0.01 → 4 decimals, < $1 → 3
  decimals, ≥ $1 → 2 decimals. `null` renders as `—/turn` with an
  appropriate aria-label.

### SlotStrip.module.css

- Self-contained CSS module. Every value reads from `styles/tokens.css`
  vars (`--space-*`, `--color-*`, `--motion-*`, `--ring-*`, `--font-*`)
  — no hard-coded hex / px.
- Variants present: `.shell`, `.shellDragging`, `.dragHandle`,
  `.slotButton`, `.iconBtn`, `.slotButtonActive`, `.pinnedCluster`,
  `.micIdle/Recording/Paused`, `.ctxIndicator + ctxLow/Med/High/Pct`,
  `.modelPill + modelPillSegment + modelCost`, `.popover +
  popoverRight + popoverItem + popoverItemActive + popoverSeparator +
  popoverHint + popoverHeader`, `.contextMenu`, `.divider`.
- `@media (prefers-reduced-motion: reduce)` disables the recording
  pulse keyframe.

## Verification

- `npm run typecheck:web` → my files compile clean under strict mode.
  Only remaining error is `App.tsx:16 cannot find './right/RightPanel'`
  which is owned by a sibling Phase-3 agent (rightpanel) and unrelated
  to this slice.
- `npx eslint --no-warn-ignored` on my files → 0 errors, 0 warnings
  after prettier auto-format. Verified twice.
- Used existing primitives where possible:
  - `components/icons` `<Icon>` with semantic names already in the
    registry (mic, plus, chevron-down, model, refresh, close, check,
    history, branch, attach, copy, screenshot, settings).
  - `lib/command-registry` for ⌘K mirror of PlusMenu entries.
  - `@dnd-kit/core` + `@dnd-kit/sortable` already in package.json from
    Phase 0.
  - `stores/slots`, `stores/mode`, `stores/model` consumed read+write
    via their existing setters — never mutated their shape.

## Known follow-ups (not in scope for this slice)

- The slots-store default for `pinnedA` is still
  `["accept-edits","plan-mode"]`. The Phase-3 task brief asked for
  `["accept-edits"]` only. PinnedActions renders whatever the store
  holds, so flipping the default is a one-line edit in
  `stores/slots.ts` whenever the store owner is comfortable making it.
- `stores/composer.micMode` is currently absent from the composer slice.
  MicButton uses localStorage as the durable home. When the composer
  slice grows the field, MicButton's `loadMode/saveMode` helpers can
  be swapped for `useComposer((s) => s.micMode)` without changing the
  UI surface.
- `stores/chat.currentContextUsage` is also still absent. ContextIndicator
  listens for `shay:context-usage` CustomEvents until Phase 1 wires the
  SSE bridge.
- ContextMenu's "Swap function…" leaf dispatches a `shay:slot:swap`
  event but the slot variants don't yet open their own swap menus from
  that event — they each open their menus from their own trigger button.
  Wiring the event end-to-end is a small follow-up for either this
  agent's next pass or whichever agent owns the right-click discovery
  affordance.
- The SlotStrip is not yet mounted in the AppShell — that wiring lives
  in a sibling Phase-3 agent's ownership (composer area / BottomRow).
  The `<SlotStrip />` export here is ready to drop in.
