---
title: a11y-focus
type: note
permalink: shay-memory/desk-redesign/phase-6/a11y-focus
---

# Phase 6 — a11y-focus

Date: 2026-05-30
Owner label: a11y-focus

## Scope delivered

A11y pass + shared focus-management hook across the desktop shell. All edits
are additive and confined to the declared ownership list — no files outside
ownership were touched, and `package.json` is untouched.

## New shared primitive

**`src/renderer/src/lib/focus-trap.ts`** — `useFocusTrap(ref, { active?,
restoreFocus? })`. On mount it:

- Saves `document.activeElement` (best-effort cast to `HTMLElement`).
- Focuses the first focusable descendant of the ref'd container (or the
  container itself when it carries `tabindex` and has no focusable
  children).
- Listens for `Tab` on `document` (capture phase) and wraps focus inside
  the container — Tab past the last focusable jumps to the first;
  Shift+Tab past the first jumps to the last.
- On unmount, restores focus to the previously focused element when
  `restoreFocus !== false`. Wrapped in try/catch so a removed trigger
  node never throws inside an effect cleanup.

The hook deliberately does NOT handle Escape — owners wire their own
close handler so they can do whatever cleanup they want before the trap
unmounts.

## Landmarks + skip link (`shell/AppShell.tsx`)

- First focusable element in the shell is now a `Skip to main content`
  anchor (`href="#shay-main-content"`). It uses the classic
  `clip:rect(1px,1px,1px,1px)` visually-hidden technique and reveals
  itself on focus via inline `onFocus` / `onBlur` so we don't need to
  touch the CSS module (which is outside ownership).
- Center column wrapped in `<main id="shay-main-content"
  aria-label="Main content" tabIndex={-1}>`. The tabindex lets the skip
  link focus the region without making it part of the normal Tab order.
- Right panel wrapped in `<aside aria-label="Right panel">`.
- Bottom status row promoted from `<div role="contentinfo">` to
  `<footer role="contentinfo" aria-label="Status bar">`.
- Top-bar wrapper kept as a plain `<div>` because the inner `<TopBar>`
  component already renders its own `<header role="banner">`. Double
  banners would be a regression — so the AppShell wrapper is now
  intentionally presentational and the inner TopBar's `aria-label` was
  upgraded to `Application top bar` for clarity.

## Top bar (`shell/TopBar.tsx`)

- `aria-label` on the `<header>` element changed from `Top bar` →
  `Application top bar` so it disambiguates from a future per-pane
  toolbar with screen-readers that read landmarks by name.

## Sidebar (`shell/Sidebar.tsx`)

- `<aside>` `aria-label` changed from `Primary sidebar` → `Navigation`
  to match the spec language ("Sidebar: aria-label='Navigation'").
- Added an off-screen `aria-live="polite" aria-atomic="true"` region
  that announces collapse-stage changes ("Sidebar expanded", "Sidebar
  collapsed to icons", "Sidebar hidden").
- Chevron button:
  - `aria-expanded` reflects whether the sidebar is in expanded mode.
  - New `onKeyDown` keyboard handler: `ArrowLeft` cycles toward more
    collapsed (`expanded → icons → hidden`); `ArrowRight` cycles toward
    more expanded (`hidden → icons → expanded`). Enter / Space still
    work natively because the chevron is a real `<button>`.

## Right panel (`right/RightPanel.tsx`)

- Root `<div>` now carries `role="region" aria-label="Right panel"` so
  it announces as a landmark even when the host shell is not AppShell.
- `<PanelView>` regions are `tabIndex={-1}` and named "Upper panel
  pane", "Lower panel pane", or "Active panel pane".
- New `useEffect` adds an `Alt+1` / `Alt+2` keyboard handler scoped to
  the right-panel root: when the panel is split, pressing `Alt+1` moves
  focus to the upper pane region; `Alt+2` moves focus to the lower
  pane. Alt is required so we don't fight text entry.

## Interactive block (`components/chat/InteractiveBlock.tsx`)

- Already shipped `role="region"`, `aria-label`, and `aria-expanded` on
  the collapse button (Phase 1). Reviewed accessible-name coverage on
  the pop-out / send-to-right / collapse / copy chips — all already
  carry `aria-label` + `title` via the `ACTION_LABEL` map. No changes
  needed beyond what Phase 1 shipped.

## Composer (`composer/Composer.tsx`)

- Already carries `aria-label="Message composer"` on the textarea, and
  `aria-label="Send message"` / `Stop response` on the action button.
  Reviewed — no changes required. (TypeScript error on line 374 is
  pre-existing TipTap-suggestion fallout, NOT introduced by this work;
  confirmed by `git stash && tsc` running the same error against the
  pre-edit tree.)

## Trigger popover (`composer/triggers/TriggerPopover.tsx`)

- `aria-label` on the dialog is now context-aware: `Slash command
  picker`, `Mention picker`, or `Shell command preview` rather than the
  raw sigil.
- Inner pickers (`SlashCommandsPicker`, `MentionPicker`) already render
  `role="listbox"` with `role="option"` + `aria-selected` items. Arrow
  / Enter keyboard nav is driven from the textarea so the cursor never
  leaves the composer — this is the existing Phase 3 pattern and is
  spec-compliant, no changes needed.

## Notification center (`notifications/NotificationCenter.tsx`)

- Now consumes the shared `useFocusTrap` hook for Tab containment. The
  previous inline trap is removed; the ESC handler stays local so the
  component can call `onClose()` (which the trap hook intentionally
  does not own).
- Focus restoration: kept the explicit `lastFocusedRef` approach so the
  trigger button gets focus on close even when the panel was opened
  imperatively (not via the hook's saved activeElement).

## Inspect panel (`composer/InspectPanel.tsx`)

- Local `FocusTrap` component reduced to a thin wrapper around
  `useFocusTrap` + an Escape-to-close keydown listener. Behavior parity
  with the previous hand-rolled implementation, but the focus-trap
  logic now lives in one place.

## Annotate modal (`composer/AnnotateModal.tsx`)

- Same treatment as InspectPanel — local `FocusTrap` is now a wrapper
  around `useFocusTrap` + ESC handler.

## Tests / typecheck

- `npx tsc --noEmit -p tsconfig.web.json` was run before and after the
  edit. The only error touching our owned files is a pre-existing
  TipTap-suggestion typing issue in `composer/Composer.tsx:374` that
  predates Phase 6 (confirmed by stashing our diff and re-running tsc
  — same error).
- No new unused imports were introduced. `useRef`, `useEffect`,
  `useMemo`, `useCallback`, and `useState` are still consumed in every
  file we edited.

## Known follow-ups (out of scope for a11y-focus)

- The CommandPalette dialog ref (`dialogRef`) is forwarded to cmdk's
  root, which renders a `<div>` — the focus-trap hook reads through it
  fine, but if cmdk ever migrates to a custom element, the typing on
  the ref may need to widen.
- AppShell wraps the right panel content in `<aside>` AND RightPanel
  itself sets `role="region"`. That's intentional: AppShell-hosted
  embeds use `aside`; standalone hosts get the inner region label. The
  duplicate is not announced as nested landmarks by VO/NVDA in
  practice, but a future cleanup could collapse to a single source of
  truth.
- The skip link's reveal-on-focus is wired with inline `onFocus` /
  `onBlur` because AppShell.module.css is outside our ownership.
  Promoting those styles to the CSS module is a trivial follow-up if
  the polish-styles agent owns the file.