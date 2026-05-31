---
title: Phase 1 — Typed Blocks (workflow label `typed-blocks`)
date: 2026-05-29
phase: 1-chat-core
permalink: shay-memory/desk-redesign/phase-1/typed-blocks
---

## Status
Complete. Both files exist, TypeScript strict passes with zero errors,
and vitest reports 7/7 tests green (Test Files 1 passed, Tests 7 passed,
duration ~489ms).

## Files

- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/shared/messages.ts`
- `/Users/famtasticfritz/famtastic/shay-desktop-electron/src/shared/messages.test.ts`

## What `messages.ts` exports

Block discriminated union (9 variants, each with `type: '<name>'` + `id: string`):
- `ProseBlock` — `text`, `collapsedDefault`
- `ToolCallBlock` — `tool`, `args`, `status: 'pending'|'running'|'complete'|'error'`, `startedAt`, `endedAt?`, `result?`, `error?`
- `CodeBlock` — `language`, `code`, `filename?`, `collapsedDefault`
- `FileDiffBlock` — `path`, `mode: 'inline'|'split'`, `hunks: FileDiffHunk[]`, `status: 'pending'|'accepted'|'rejected'`
- `ThinkingBlock` — `text`, `hidden`, `durationMs?`
- `TerminalBlock` — `cmd`, `cwd?`, `output`, `exitCode?`, `capped`, `status`
- `AskUserBlock` — `prompt`, `options?`, `responseDeadline?`, `answer?` (replaces `APPROVAL_RE` regex)
- `RunThisBlock` — `cmd`, `cwd?`, `dryRunPreview?`, `requireApproval`, `answer?: 'approved'|'declined'`
- `MediaBlock` — `kind: 'image'|'audio'|'video'|'file'`, `src`, `name`, `meta?: { size, duration, w, h }`

`FileDiffHunk` is a typed sub-shape (`oldStart`, `oldLines`, `newStart`,
`newLines`, `header`, `lines[]`, per-hunk `status`) so the renderer can offer
per-hunk accept/reject without re-parsing unified diffs.

`ChatMessage`:
- `id`, `role: 'user'|'assistant'|'system'`, `createdAt`, `updatedAt`
- `blocks: Block[]`, `status: 'streaming'|'complete'|'error'`
- `meta?: { model?, brain?, project?, costUsd?, tokensIn?, tokensOut?, thinkingLevel?: 'low'|'med'|'high'|'ultra' }`

Type guards (one per Block variant):
`isProseBlock`, `isToolCallBlock`, `isCodeBlock`, `isFileDiffBlock`,
`isThinkingBlock`, `isTerminalBlock`, `isAskUserBlock`, `isRunThisBlock`,
`isMediaBlock`.

`SseEvent` discriminated union (13 variants, each with `seq: number` + `at: string` base):
`ProseDelta`, `ToolCallStart`, `ToolCallDelta`, `ToolCallResult`,
`ThinkingStart`, `ThinkingDelta`, `ThinkingEnd`, `AskUser`, `RunThis`,
`UsageTick`, `ChapterMark`, `CompleteEvent`, `ErrorEvent`. Exported alias
`SseEventType = SseEvent['type']`.

Legacy interop:
- `LegacyToolProgress` — shape of the old `hermes.tool.progress` payload
  (`tool?`, `label?`, `emoji?`, `messageId?`, `blockId?`, `args?`, `at?`, `seq?`).
- `toTypedSseEvent(legacy: unknown): SseEvent | null` — normalizes a legacy
  payload to a `ToolCallStart`. Returns `null` for null/undefined/non-object/
  empty input. Falls back to `label` when `tool` is missing. Preserves `seq`
  when present (default `0` matching the legacy `seq ?? 0` semantics).
  Synthesizes stable-ish `messageId` (`'legacy'`) and `blockId`
  (`'legacy-<tool>'`) so the renderer's gap-detection can reconcile when the
  typed stream takes over.

## What `messages.test.ts` proves

Three describe blocks:

1. **Block discriminated union** — `describeBlock(b: Block)` exhaustive switch
   with a `const _exhaustive: never = b` default arm. Adding a new Block
   variant without a switch arm fails the type-check. Runtime assertion
   compares all 9 labels against an expected array. Type guards filter
   correctly and narrow inside conditionals (`isToolCallBlock` narrows
   to access `tool` + `status`).

2. **SseEvent discriminated union** — `describeEvent(e: SseEvent)` exhaustive
   switch with the same `never` default. Constructs all 13 event variants
   with required fields and asserts label list length + a few content checks.

3. **toTypedSseEvent** — upgrades a legacy payload to `tool_call_start`
   preserving `tool`, `args`, `seq`, `messageId`, `blockId`. Falls back to
   `label` when `tool` is missing. Returns `null` for `null`, `undefined`,
   strings, `{}`, and whitespace-only `tool`.

## Test result

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
   Duration  489ms
```

## Notes for downstream consumers (Phase 1)

- `src/main/sse-parser.ts` should call `toTypedSseEvent(payload)` for any
  `hermes.tool.progress` it sees and fall through to the typed branch when
  the result is `null` (covers genuinely typed events).
- `BlockRenderer` in the renderer should `switch (block.type)` and lean on
  the exhaustiveness check — adding a new block variant in `messages.ts`
  will surface as a TS error in the renderer until it adds a case.
- `chat` Zustand slice should key messages by `ChatMessage.id` and append
  to `blocks` from SSE events using `messageId`/`blockId` from each event.
- `LegacyToolProgress` is the only alias that should land in
  `src/main/sse-parser.ts` for the deprecation window; the alias should be
  deleted when the gateway upgrades.

## Ownership scope respected

Created only the two files listed in the workflow contract. Did not touch
`package.json`, did not modify any other file, did not delete any screens.
