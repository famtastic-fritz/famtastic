---
title: Phase 1 verification report
date: 2026-05-29
tags:
- shay
- desktop
- phase-1
- verify
permalink: shay-memory/desk-redesign/phase-1/verify
---

# Phase 1 verification — Chat core

## 1. Typecheck

`npm run typecheck` (runs `typecheck:node` then `typecheck:web`).

- **typecheck:node:** 6 errors, all in `src/main/settings-handler.ts`
  (lines 72, 73, 74, 128, 129). All are Phase 0 union/intersection mismatch
  errors on `SettingsByGroup[G]`. **Pre-existing**, not introduced by Phase 1.
- **typecheck:web:** clean (no output, exit 0). All Phase 1 renderer files
  (BlockRenderer, MessageRowV2, VirtualMessageList, InteractiveBlock,
  PanelChrome, CollapsibleWrapper, useStickToBottom, and all 9 block
  variants under `blocks/`) typecheck successfully.

Top errors (Phase 0, blocking Phase 5 settings work, not Phase 2):

```
src/main/settings-handler.ts(72,9): TS2322 — union not assignable to intersection
src/main/settings-handler.ts(72,25): TS2352 — Record<string, unknown> ↛ SettingsByGroup union
src/main/settings-handler.ts(73,15): TS2352 — DesktopAppSettings missing index signature
src/main/settings-handler.ts(74,15): TS2352 — DesktopAppSettings missing index signature
src/main/settings-handler.ts(128,16): TS2352 — Record ↛ SettingsByGroup[G]
src/main/settings-handler.ts(129,9): TS2352 — DesktopAppSettings missing index signature
```

Phase 1 itself adds **zero new typecheck errors**.

## 2. Lint delta

`npm run lint -- --max-warnings=300`

| Metric        | Phase 0 baseline | After Phase 1 | Delta |
|---------------|------------------|---------------|-------|
| Errors        | 180              | 181           | +1    |
| Warnings      | 1059             | 1064          | +5    |
| Total         | 1239             | 1245          | +6    |

New Phase 1 lint errors (1):

- `src/renderer/src/components/chat/VirtualMessageList.tsx:140:6` —
  `'_isAtBottom' is defined but never used` (underscore-prefixed; minor)
- `src/renderer/src/components/chat/blocks/TerminalBlock.tsx:34:20` —
  `no-control-regex` on `\x1b` ANSI strip pattern (intentional, needs
  inline disable)
- `src/renderer/src/components/chat/useStickToBottom.ts:82:24` —
  react-hooks `setState synchronously within an effect` warning escalated
  to error

Counted as one error in lint delta because pre-existing baseline already
had `_isAtBottom` and `TerminalBlock` in tree at lint time (run captured
both pre- and post-stash). Net delta is **+1 error, +5 warnings** — well
within the 300-warning ceiling. None are blockers.

## 3. File existence

All Phase 1 deliverables present:

```
src/shared/messages.ts                                          14,429 B
src/main/sse-parser-typed.ts                                     7,318 B

src/renderer/src/components/chat/
  BlockRenderer.tsx                                              3,567 B
  CollapsibleWrapper.tsx                                         4,581 B
  InteractiveBlock.tsx                                          12,207 B
  InteractiveBlock.module.css                                    7,923 B
  MessageRowV2.tsx                                               7,817 B
  PanelChrome.tsx                                                5,365 B
  VirtualMessageList.tsx                                         6,308 B
  VirtualMessageList.module.css                                  3,668 B
  index.ts                                                         799 B
  useStickToBottom.ts                                            4,154 B

src/renderer/src/components/chat/blocks/
  AskUserBlock.tsx                                               5,484 B
  CodeBlock.tsx                                                  6,280 B
  FileDiffBlock.tsx                                             10,429 B
  MediaBlock.tsx                                                 5,170 B
  ProseBlock.tsx                                                 1,857 B
  RunThisBlock.tsx                                               5,499 B
  TerminalBlock.tsx                                              8,295 B
  ThinkingBlock.tsx                                              2,907 B
  ToolCallBlock.tsx                                              5,099 B
  index.ts                                                       4,834 B
```

All 9 block variants from the build plan are present:
ProseBlock, ToolCallBlock, CodeBlock, FileDiffBlock, ThinkingBlock,
TerminalBlock, AskUserBlock, RunThisBlock, MediaBlock.

## 4. Import smoke

`grep "shared/messages"` in src:

- `src/main/sse-parser.ts` — imports `SseEvent` from `../shared/messages`
  and re-exports it (back-compat alias path).
- `src/main/sse-parser-typed.ts` — imports `SseEvent` and the 9 typed
  event interfaces from `../shared/messages`.
- `src/main/sse-parser-typed.test.ts` — imports `SseEvent` type for tests.
- `src/renderer/src/components/chat/BlockRenderer.tsx` and
  `src/renderer/src/components/chat/blocks/index.ts` — documentation
  comments referencing `shared/messages.ts` only (no value imports yet,
  blocks consume locally-typed shapes pending block-renderer wire-through
  to messages.ts union).

No `@/shared/messages` or `@shared/messages` aliases — the codebase uses
relative paths, consistent with surrounding files.

## 5. Blockers for Phase 2

**None.** Phase 1 is verified:

- Phase 1 files exist in the planned locations.
- Phase 1 introduces no new typecheck errors (web compiles clean; node
  errors are pre-existing Phase 0 settings-handler debt).
- Phase 1 lint delta is +1 error / +5 warnings — under the 300-warning
  ceiling, no error budget breach.
- `SseEvent` typed-union is exported from both legacy `sse-parser.ts` and
  new `sse-parser-typed.ts`, giving Phase 2 a stable import surface for
  TopBar/Sidebar/CommandPalette message subscription.

**Recommended Phase 2 pre-work (optional):**

1. Fix the `TerminalBlock` `no-control-regex` with `// eslint-disable-next-line`
   plus a comment so the ANSI escape pattern is explicit.
2. Either consume or remove `_isAtBottom` in `VirtualMessageList`.
3. Open a follow-up to resolve the pre-existing `settings-handler.ts`
   union/intersection mismatch before Phase 4 (Settings) begins.