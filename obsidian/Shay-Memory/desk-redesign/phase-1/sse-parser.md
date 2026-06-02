---
title: sse-parser
type: note
permalink: shay-memory/desk-redesign/phase-1/sse-parser
---

# Phase 1 — sse-parser worker

## Scope
Owned files:
- `src/main/sse-parser.ts` (MODIFY, additive)
- `src/main/sse-parser-typed.ts` (CREATE)
- `src/main/sse-parser-typed.test.ts` (CREATE)

## What landed

### `src/main/sse-parser-typed.ts` (new)
- `TypedSseParser` class — stateful, accumulates a string buffer across
  `push(chunk: string | Uint8Array)` calls and returns the typed events
  that fully arrived. `flush()` drains a trailing block with no
  separator. `reset()` clears state.
- `parseTypedSseStream(input)` functional wrapper for one-shot use.
- Recognizes all 13 first-class typed event names from the
  `SseEvent` union in `src/shared/messages.ts`:
  `prose_delta`, `tool_call_start`, `tool_call_delta`, `tool_call_result`,
  `thinking_start`, `thinking_delta`, `thinking_end`, `ask_user`,
  `run_this`, `usage_tick`, `chapter_mark`, `complete`, `error`.
- Legacy alias path — `event: tool.progress` and
  `event: hermes.tool.progress` payloads are routed through
  `toTypedSseEvent()` from `shared/messages.ts` and upgraded into
  `tool_call_start` events. Drops payloads with no tool/label.
- Accepts both LF (`\n\n`) and CRLF (`\r\n\r\n`) block separators.
- TextDecoder is lazy-instantiated with `stream: true` so multi-byte
  UTF-8 sequences split across chunks reassemble cleanly.
- Malformed JSON in a block is silently dropped — never poisons the
  stream.
- Uses `typeof chunk === "string"` rather than `instanceof Uint8Array`
  to dodge cross-realm prototype issues under jsdom (vitest env).

### `src/main/sse-parser.ts` (additive)
- New import block at the top pulling `SseEvent` and the typed parser.
- New overloaded export `parseTyped()`:
  - `parseTyped()` → returns a fresh `TypedSseParser` for incremental
    streaming.
  - `parseTyped(input)` → returns the events parsed from a complete
    string or `Uint8Array` chunk.
- Re-exports `TypedSseParser` and the `SseEvent` type for callers that
  only want to import from `sse-parser.ts`.
- Legacy `processCustomEvent`, `processSseData`, `parseSseBlock`,
  `SseCallbacks`, `ParsedUsage`, `SseDataResult` exports are untouched —
  `hermes.ts` still binds to them until Phase 2 migrates.

### `src/main/sse-parser-typed.test.ts` (new)
22 tests covering:
- One test per typed event name (13 events).
- Three legacy-alias path tests (`tool.progress` upgrade,
  `hermes.tool.progress` upgrade, missing-tool dropped).
- Five streaming/robustness tests (split mid-string, split between
  events, `flush()`, Uint8Array path, CRLF separators).
- One malformed-JSON-doesn't-poison-stream test.
- Two tests for the `parseTyped()` entry point on `sse-parser.ts`
  (with input → events; with no args → parser instance).

## Verification
- `npx vitest run src/main/sse-parser-typed.test.ts` → 22/22 pass.
- `npx tsc -p tsconfig.node.json --noEmit` clean on the three owned
  files. The pre-existing `src/main/settings-handler.ts` errors are
  outside scope and were already documented in `cleanup.md`.

## Notes for downstream Phase 1 workers
- `hermes.ts` consumers can adopt the typed parser by switching from
  the legacy `processSseData(...)` callback pattern to
  `const parser = parseTyped(); parser.push(chunk).forEach(...)`.
  No back-compat break — old surface remains intact.
- The parser does NOT throttle `usage_tick`; that's the consumer's job
  per the Build Plan (16ms coalescing, 250ms throttle on usage_tick).
- The parser does NOT validate `seq` monotonicity; gap detection lives
  in the chat slice per the architecture spec.
