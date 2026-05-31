---
title: Phase 3 — Media row + composer attachments
date: 2026-05-29
phase: 3
label: media-row
status: implemented
permalink: shay-memory/desk-redesign/phase-3/media-row
---

# Phase 3 — `media-row` worker

Ships the composer's attachments strip + capture surface per Build Plan
Phase 3 / Spec §3. Additive — no Phase 0/1/2 modules edited.

## Files

Renderer (`src/renderer/src/composer/`):

- `MediaRow.tsx` — orchestrator. Hidden completely when
  `stores/attachments.stagedByTab[activeTabId]` is empty. When non-empty
  renders a horizontal `<DndContext>` of `<AttachmentChip>` (drag-reorder via
  `@dnd-kit/sortable`, same convention as `ChatTabsRow`) and a trailing
  `<CaptureToolbar>`. Hosts the `<InspectPanel>`, `<ReusePicker>` and
  `<AnnotateModal>` portals as siblings so the open-state lives in one
  place. Wrapped in `<FeatureBoundary scope="feature">` so a render fault
  inside one chip does not nuke the composer.
- `AttachmentChip.tsx` — thumbnail + inline-editable filename + the four
  per-chip actions: `edit` (annotate), `info` (inspect), `history` (reuse),
  `close` (remove). Pointer-down on action buttons is stopped so the chip's
  drag handle does not steal the click. Hover overlay shows mime + size.
  Widens `AttachmentRef` via a local `AttachmentMeta` interface adding
  optional `size`, `mime`, `dataUrl`, `smartPayload`, `annotations` — the
  store's slim type stays the source of truth, the renderer just decorates.
- `CaptureToolbar.tsx` — buttons driven by
  `stores/customize.captureTools`. Defaults still
  `['screenshot','screen-record','cam','mic']`. Each button calls
  `window.shay.capture.<kind>()` (typed mirror of `CaptureDomain`), pushes
  the returned ref into the staged list, and surfaces a momentary
  warning-style state if the bindings are missing (Linux without
  `desktopCapturer`, etc.).
- `InspectPanel.tsx` — portal modal with focus-trap. Renders the
  token-efficient preview by attachment kind: image → OCR + auto-description,
  pdf → first-page excerpt + TOC, audio/video → transcript, fallback →
  summary. Footer hosts the **Send raw instead** toggle that flips
  `sendMode` between `smart` and `raw`.
- `ReusePicker.tsx` — portal modal grid sourced from
  `stores/attachments.recent`. Clicking a card clones the source with a
  fresh id (`originId` pointing back) and pushes it into the active tab.
- `AnnotateModal.tsx` — portal modal with `Image` + `Audio / video trim`
  tabs. Phase 3 ships the image annotator (arrow, box, blur, crop, text
  label) backed by a small `<canvas>` re-blit loop. Audio/video trim is a
  "coming soon" tab so the surface area exists for the polish phase.
- `MediaRow.module.css` — strip, chip, toolbar, modal styles. Uses the
  Phase-0 CSS variables (`--color-*`, `--font-*`, `--motion-*`,
  `--ease-decelerate`) so theme/density toggle automatically. Honors
  `prefers-reduced-motion`.

Main process (replaces Phase-0 skeleton):

- `src/main/domains/capture.ts` — `shay:capture:*` IPC. Registers:
  `permissions`, `requestPermission`, generic `start/stop/cancel`, plus
  the named channels `screenshot`, `screenrec`, `webcam`, `voice`. Screen
  capture uses Electron `desktopCapturer.getSources()` + `image.toPNG()`
  to write a tmp PNG under `os.tmpdir()/shay-captures/`. Recording kinds
  (`screen-record`, `mic`) bookkeep an in-process `active` map keyed by
  capture id and expose start/stop semantics so the renderer can drive
  `MediaRecorder` while main owns the lifecycle. Where the OS primitive is
  not available the handler throws an Error with `code: "ENOTSUP"`,
  `status: 501` so the preload layer rejects with a structured error per
  the build-plan "501-equivalent" contract.

Preload:

- `src/preload/capture-domain.ts` — typed `buildCaptureBindings()` that
  wraps `ipcRenderer.invoke` with the `CaptureDomain` shape, plus
  `exposeCaptureDomain()` for callers that want capture without the full
  `window.shay` umbrella (e.g. a future pop-out window preload). The
  canonical mount stays the Phase-0 umbrella in `src/preload/domains.ts`,
  which is unchanged.

## Wiring notes left for Phase 3 integrator

`MediaRow` reads the active tab from `useTabsStore.activeTabId` and the
staged attachments from `useAttachmentsStore.stagedByTab[activeTabId]`.
There is no separate wiring step — once the integrator (the slot/strip
phase-3 worker) mounts `<MediaRow />` above the composer it lights up
automatically. The component returns `null` when there are zero
attachments so it is safe to leave mounted at all times.

The Phase-0 domain registry (`src/main/domains/index.ts`) already lists
`capture.register` — but neither `src/main/index.ts` nor `src/preload/index.ts`
have been switched to call `registerDomains()` / `exposeShayDomains()` yet
(out of this worker's ownership). Until the integrator does that, the
`window.shay.capture.*` calls will reject with "capture bindings missing"
and the toolbar surfaces the warning-tint affordance, which is the
intended graceful-degradation contract.

The store's `inspectOpenFor` is overloaded with the sentinel id
`"__reuse__"` to drive the reuse picker without growing the slice surface.
A future store refactor can split this into a dedicated `reuseOpen: bool`,
but additive constraints in this phase mean we ride on the existing keys.

## Acceptance checks

- `tsc -p tsconfig.web.json` — clean for every owned file (the one
  unresolved error in the project belongs to `App.tsx` referencing a
  different phase-3 worker's `right/RightPanel` module).
- `tsc -p tsconfig.node.json` — clean.
- Rendering contract verified by inspection: `MediaRow` returns null when
  `items.length === 0`; renders strip + toolbar otherwise.
- Focus trap on each modal restores focus to the prior element on close.
- Capture domain handlers all throw structured `ENOTSUP/501` errors on
  unsupported platforms rather than silently failing.

## Out of scope (will be handled later)

- `register(ipcMain)` + `exposeShayDomains()` invocation from
  `src/main/index.ts` / `src/preload/index.ts` (integrator owns those
  files).
- Renderer-side webcam pixel-buffer capture (deferred per Spec §3 step
  49 "capture backends deferred per platform").
- Persistent attachment-history sqlite table (Phase-5 backfill — the
  renderer reads `stores/attachments.recent` regardless of backing store).
- `<Modal>` / `<Popover>` / `<Toast>` Phase-4 primitives — InspectPanel,
  ReusePicker and AnnotateModal use minimal portal+focus-trap helpers
  inlined here so Phase 3 ships without blocking on Phase 4.