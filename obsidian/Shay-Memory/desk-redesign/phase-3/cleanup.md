---
title: cleanup
type: note
permalink: shay-memory/desk-redesign/phase-3/cleanup
---

# Phase 3 cleanup — progress note

Date: 2026-05-29
Label: cleanup
Owner files touched:
- shay-desktop-electron/src/renderer/src/App.tsx
- shay-desktop-electron/src/renderer/src/shell/CommandPalette.tsx
- shay-desktop-electron/src/main/sessions-rpc.ts (no edits required — see notes)
- shay-shay/gateway/desk_sessions_routes.py

## What changed

### 1. App.tsx — mount AppShell on `screen === "main"`

- Replaced `<Layout … />` in the `main` case with a new `<MainShell />`
  component that mounts the Phase 2 `<AppShell>` with the slot contract:
  `sidebar={<Sidebar/>}`, `topbar={<TopBar/>}`,
  `chatTabs={<ChatTabsRow/>}`, `chat={<Chat … />}`, `rightPanel={null}`,
  `statusBar={null}`.
- Dropped the unused `import Layout` (legacy mega-screen retired here).
- Splash / welcome / installing / setup branches untouched. Setup still
  receives `verifyWarning`, `handleVerifyReinstall`,
  `handleDismissVerifyWarning`.
- Chat slot owns local `messages` / `currentSessionId` for now, mirroring
  what `Layout.tsx` did. The chat slice in `stores/chat` will absorb this
  in a later cleanup pass.

### 2. CommandPalette.tsx — setState-in-effect removed

- The `useCommandEntries` hook was using
  `useEffect(() => { setSnapshot(getCommandEntries()) }, [])` as a
  catch-up pass after subscribing — exactly the
  `react-hooks/no-set-state-in-effect` lint case the task called out.
- Replaced with `useSyncExternalStore(subscribeCommands,
  getCommandEntries, getCommandEntries)`, mirroring the existing
  `usePaletteOpenState` pattern in the same file. No `useEffect` left in
  the hook; React itself handles the catch-up + subscription lifecycle.

### 3. sessions-rpc.ts — no Phase 2 TODOs left

Re-read the file end-to-end. All Phase 2 handlers (`rename`, `setPinned`,
`setArchived`, `setProject`, `setMode`, `searchFuzzy`, `remove`) already
have real implementations that round-trip through `sessions-overlay.ts`
and `sessions.ts`. The only `NotImplemented` is `fork`, which the build
plan explicitly defers to Phase 5 (fork-from-message backend primitive).
No edits applied — additive refactor would be noise.

### 4. desk_sessions_routes.py — typed Pydantic models

- Added typed body models (`RenameBody`, `PinBody`, `ArchiveBody`,
  `SetProjectBody`, `SetModeBody`, `ForkBody`) mirroring the TypeScript
  contract in `sessions-rpc.ts`. Each model uses `alias=` so the wire
  shape stays `customTitle` / `projectId` / `atMessageId` (matches the
  TS surface) while the Python field names stay snake_case.
- `SessionMode` re-declared as a `Literal["chat","cowork","code"]` so
  FastAPI rejects invalid modes at the parse layer instead of in the
  Phase 5 coerce step.
- Added a small `_dump()` helper that handles pydantic v1 / v2 and falls
  through when pydantic isn't installed (the file already had a fallback
  branch for that case).
- Kept the "not yet registered" doc comment and all `_stub_response`
  501 envelopes — wiring is still a Phase 5 concern.

## Verification

- `npm run typecheck` → clean (node + web both pass).
- `npm run lint -- --max-warnings=400` → 212 errors, same as baseline
  (verified by stash + re-run). Net delta: 0.
- `.venv/bin/python -m py_compile gateway/desk_sessions_routes.py` → OK.
- `from gateway.desk_sessions_routes import build_router; build_router()`
  yields an `APIRouter` with 10 routes (list, get, rename, pin, archive,
  project, mode, search/fuzzy, fork, delete).

## Known follow-ups (not in scope)

- Pre-existing `react-hooks/no-set-state-in-effect` error in
  `App.tsx:103` (`runInstallCheck` in a mount effect). Pre-dates this
  task and falls under the install-check flow, not Phase 3 cleanup.
- `usePaletteOpenState` in CommandPalette has a pre-existing
  `explicit-function-return-type` error. Leaving alone — not in the
  cleanup scope, and the function shape is obvious from the body.
- Chat slot still owns local `useState` for messages/sessionId. The
  proper home is `stores/chat`; the Sidebar / TopBar slots already
  read from the matching stores, so this is a small loose end the chat
  agent will close.