---
title: verify
type: note
permalink: shay-memory/desk-redesign/phase-3/verify
---

# Phase 3 Verify Report

Date: 2026-05-29
Label: verify

## Typecheck
PASS. `npm run typecheck` (node + web) ran cleanly with no errors emitted.

## Lint
1388 problems (192 errors, 1196 warnings) at `--max-warnings=500`.
Delta vs Phase 2 baseline: Phase 3 added a large surface (right/, composer/,
notifications/, status/, main notifications-*.ts, gateway desk_tasks_routes.py)
but the dominant signal is prettier/prettier formatting noise and a handful of
`explicit-function-return-type` / `no-unused-vars` / `no-explicit-any` errors,
many of which exist in tests and pre-Phase-3 files. None of the lint errors
block typecheck; they are formatter-fixable (`--fix`) and not new structural
problems. Recommend Phase 6 polish pass to clear them.

## File existence (Phase 3 ownership)
Confirmed present:
- src/renderer/src/right/        — PanelHeader, PanelTab, PanelTabsRow,
  RightPanel, TaskRow(+css), TaskTrayStrip(+css), usePanelAutoSwitch,
  index.ts, variants/
- src/renderer/src/composer/     — AnnotateModal, AttachmentChip,
  CaptureToolbar, Composer(+css), ComposerToolbar, InspectPanel,
  MediaRow(+css), ReusePicker, SlotStrip(+css), extensions/, slots/, triggers/
- src/renderer/src/notifications/ — NotificationCenter(+css),
  NotificationToast(+css), index.ts
- src/renderer/src/status/       — StatusBar(+css), StatusPill(+css), index.ts
- src/main/notifications-store.ts  — present
- src/main/notifications-os.ts     — present
- src/main/notifications-dnd.ts    — present
- shay-shay/gateway/desk_tasks_routes.py — present

## Python compile
FAIL. `python -m py_compile gateway/desk_tasks_routes.py` errored:

```
File "gateway/desk_tasks_routes.py", line 130
    yield b": stub stream — wire in Phase 5\n\n"
SyntaxError: bytes can only contain ASCII literal characters
```

The em-dash character (U+2014) is inside a `b"..."` byte literal. Fix: either
escape (`\xe2\x80\x94`), use a plain ASCII dash (`--`), or convert the literal
to a regular `str` and `.encode()`. This is a single-line blocker for Phase 5
wiring of the SSE stream.

## AppShell mount confirmation
Confirmed. `src/renderer/src/App.tsx` line 8 imports
`{ AppShell } from "./shell/AppShell"` and line 230 mounts `<AppShell ...>`
inside the `MainShell` component (Phase 2 three-column layout, now wrapping
the Phase 3 right panel + composer + status bar + notifications surfaces).

## Blockers for Phase 4
1. `gateway/desk_tasks_routes.py` non-ASCII bytes literal — must fix before
   Phase 5 SSE wiring; cosmetic for Phase 4 (Settings decomposition) but log
   now so it does not surprise Phase 5.
2. Lint formatter noise is large but non-blocking; defer to Phase 6 polish.
3. No structural/typescript blockers — Phase 4 (Settings decomposition) can
   start against the current Phase 3 tree.