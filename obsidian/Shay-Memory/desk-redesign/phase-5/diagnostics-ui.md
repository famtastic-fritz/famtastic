---
title: diagnostics-ui
type: note
permalink: shay-memory/desk-redesign/phase-5/diagnostics-ui
---

# Phase 5 — Diagnostics UI (label: diagnostics-ui)

Status: complete (typecheck-clean against tsconfig.web.json and tsconfig.node.json — only pre-existing shared/i18n error remains).

## Files created

### Renderer (admin + service)
- `src/renderer/src/admin/diagnostics/DiagnosticsPage.tsx` — SettingsPage shell composing all sub-panels; self-registers under id `diagnostics` in the Advanced category with icon `warn` (no `doctor` icon in the registry yet — flagged for Phase 6).
- `src/renderer/src/admin/diagnostics/DoctorRunner.tsx` — "Run Doctor" CTA, expandable per-check rows, per-row "Auto-fix" button driven by `check.fixable`. Re-runs after a fix.
- `src/renderer/src/admin/diagnostics/DumpPanel.tsx` — Generates sanitized JSON dump; surfaces the resulting path + byte count + redaction count.
- `src/renderer/src/admin/diagnostics/DebugShareDialog.tsx` — Modal with bullet-list of what is included, Save bundle, and stubbed Upload button.
- `src/renderer/src/admin/diagnostics/UpdateChannelPanel.tsx` — stable/beta/nightly dropdown via `getUpdateChannel`/`setUpdateChannel`; version pill; stub Check-for-updates.
- `src/renderer/src/admin/diagnostics/ExportImportPanel.tsx` — Export settings/sessions buttons; Import buttons that open a hidden `<input type=file>` and pass `file.path` (Electron) to the import IPC.
- `src/renderer/src/admin/diagnostics/ResetDeskDialog.tsx` — Typed-confirmation modal requiring `RESET MY DESK`; optional pre-backup checkbox (default on); honest surface of the Phase-5 stub return `{ ok: false, reason: "phase-6-stub" }`.
- `src/renderer/src/admin/diagnostics/DiagnosticsPage.module.css` — Scoped CSS module (section/row/pill/modal/button primitives).
- `src/renderer/src/admin/diagnostics/index.ts` — Barrel re-export.
- `src/renderer/src/services/diagnostics-service.ts` — Renderer-side typed wrapper. Reads `window.shay.diagnostics` with fallback to `window.shayDiagnosticsRpc`. Returns descriptive rejection when bindings are missing (test harness friendly).

### Main + preload (IPC)
- `src/main/domains/diagnostics.ts` — New domain. Thin passthrough around `src/main/diagnostics.ts`. Channels: `doctor`, `fix`, `dump`, `share`, `getUpdateChannel`, `setUpdateChannel`, `exportSettings`, `exportSessions`, `importSettings`, `importSessions`, `reset`. Uses `safeHandle` to swallow duplicate-registration errors so the new domain can coexist with any pre-existing scaffold.
- `src/preload/diagnostics-domain.ts` — Mounts surface under `shayDiagnosticsRpc` in isolated contexts (sibling key) and merges into `window.shay.diagnostics` in non-isolated contexts. Same additive pattern used by `plugins-domain.ts`.

### Files NOT created (already existed and complete)
- `src/main/diagnostics.ts` — orchestrator already present with the full surface this task needed (`runDoctor`, `fixCheck`, `generateDump`, `generateDebugShare`, `getUpdateChannel`, `setUpdateChannel`, `exportSettings`, `exportSessions`, `importSettings`, `importSessions`, `resetDesk`). Reused as-is.

## Wiring notes (for Phase 6 follow-up)
- `domains/diagnostics.ts` is not yet listed in `src/main/domains/index.ts` (the central registry) — that file is outside ownership for this task. Phase 6 needs to:
  1. Add `import * as diagnostics from "./diagnostics";` and an entry to `DOMAINS`.
  2. Add a `buildDiagnostics` import in `src/preload/domains.ts` and expose it inside the merged `ShayDomains` so `window.shay.diagnostics` resolves natively (the fallback `shayDiagnosticsRpc` works today only because `exposeDiagnosticsDomain()` is called explicitly).
  3. Call `exposeDiagnosticsDomain()` from `src/preload/index.ts`. Until that lands, the renderer service silently falls back through `shayDiagnosticsRpc` if it is mounted, or rejects with a clear error message if it is not.
- Add a `doctor` (stethoscope) entry to `IconName` in `src/renderer/src/components/icons/registry.ts` and swap the nav icon from `warn` to `doctor`.
- Replace the Phase 5 `resetDesk()` stub with a real wipe in `src/main/diagnostics.ts` once the backup pathway exists.
- Wire `electron-updater` against the selected channel and implement `Check for updates`.

## Behavior verified by type checks
- All renderer code compiles against `tsconfig.web.json` with no new errors (only the unrelated `shared/i18n` pre-existing error).
- All main/preload code compiles against `tsconfig.node.json` with no new errors.
- No files outside the declared ownership list were modified.
- No `package.json` touch.