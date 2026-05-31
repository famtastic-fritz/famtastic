---
title: Phase 0 — Error Boundaries
date: 2026-05-29
tags:
- shay
- desktop
- phase-0
- error-boundaries
permalink: shay-memory/desk-redesign/phase-0/error-boundaries
---

## Scope shipped

Phase 0 error-boundary track: typed AppError union + helpers, a new
feature-scoped boundary primitive, and a refactor of the existing
top-level ErrorBoundary so it now accepts a `scope` prop and an `onError`
callback while preserving its public default-export API (App.tsx imports
keep working unchanged).

## Files created

- `src/renderer/src/lib/errors.ts` — typed `AppError` discriminated union
  with branches `render | ipc | network | unknown`, plus helpers
  `isAppError`, `toAppError`, `fmtError`. Normalizes anything the runtime
  can throw (Error, string, DOMException, arbitrary objects) into a
  consistent shape and stamps `scope`, `componentStack`, `timestamp`.
- `src/renderer/src/components/boundaries/FeatureBoundary.tsx` — smaller
  decorative boundary intended for individual feature panes. Shows a
  compact inline fallback card with `Retry` + `Report` buttons. Retry
  resets boundary state (and fires an optional `onReset` callback);
  Report writes the normalized AppError to `console.error` as a Phase-1
  placeholder for a real reporter. Default + named exports.
- `src/renderer/src/components/boundaries/index.ts` — public barrel
  exporting `FeatureBoundary` (named + default-alias).

## Files refactored

- `src/renderer/src/components/ErrorBoundary.tsx` — extended with optional
  `scope: "app" | "feature" | "panel"`, `feature` label, and `onError`
  props. Default `scope` is `"app"`, preserving original behavior for
  `App.tsx`. When `scope` is `"feature"` or `"panel"` the boundary
  composes with `<FeatureBoundary>` so all Phase 0 boundaries share the
  same fallback chrome + reporter contract. The original full-screen
  error card is preserved verbatim for `scope="app"` to avoid any visual
  regression in production. Existing API (default export, `children`,
  `fallback`) preserved.

## Notes for downstream phases

- Phase 1 should swap the `Report` button's `console.error` placeholder
  for a real reporter (likely an IPC channel under the new
  `domains/notifications` or `domains/diagnostics` namespace).
- The `AppError` union is intentionally small (4 branches). When Phase 1
  introduces typed SSE/IPC events, extend the union there — keep `code`
  stable across branches so reporters can group by `code`.
- `FeatureBoundary` uses lucide icons (`AlertTriangle`, `RefreshCcw`,
  `Send`) at 12–16px to match existing chrome density.
- All i18n calls use `i18next.t(...)` with `defaultValue` fallbacks so
  the new copy ships even before translation keys land.
- Class names (`feature-boundary`, `feature-boundary-card`,
  `feature-boundary-header`, `feature-boundary-title`,
  `feature-boundary-message`, `feature-boundary-actions`) are introduced
  for Phase 0 styling work to consume later.

## Out of scope (per build plan)

- No CSS shipped (styling is the theming track's responsibility).
- No real reporter wiring (Phase 1).
- No changes to `App.tsx` or other consumers — additive only.
