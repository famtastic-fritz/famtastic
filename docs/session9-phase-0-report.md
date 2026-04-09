# Session 9 Phase 0 Report — 2026-04-09

## What Was Built/Fixed

Fixed 7 defects in `docs/spawn-claude-migration-map.md` before beginning the SDK migration. The map had been written in Session 8 with several architectural errors that would have caused Session 9 failures. All 7 were corrected before any migration work was done.

### M1 — spawnBrainAdapter Inventoried

The Session 8 map mentioned `spawnBrainAdapter` but never put it in the Section 1 inventory. It has been added as **Call Site 9** with its correct location (line 11229), purpose (spawns `fam-convo-get-{brain}` shell adapters for Gemini/Codex), and migration status (**SEPARATE MIGRATION TRACK** — uses Google Generative AI SDK and OpenAI SDK, not `@anthropic-ai/sdk`). It is not migrated via the `callClaudeSDK` path — the Brain Adapter Pattern (Phase 1) replaces it.

### M2 — USE_SDK Feature Flag Removed

The Session 8 map proposed a global `USE_SDK = process.env.USE_SDK === 'true'` toggle with a `callClaude()` wrapper. This cannot work: `spawnClaude()` returns a `child_process` object (event-based), while SDK returns a `Promise` (async/await). These are incompatible types — a transparent wrapper cannot bridge them.

**Replaced with:** Per-call-site migration. Each call site is migrated independently in its own git commit. Rollback = revert that commit. Unmigrated call sites continue using `spawnClaude()` unchanged. Section 6 of the map now documents this approach with a concrete code pattern.

### M3 — Silence Timer Corrected

The Session 8 map proposed `setTimeout(() => controller.abort(), timeoutMs)` from call start. This is wrong — it would kill a slow-starting but correctly-streaming call after 30s regardless of activity.

**Correct pattern:** The existing `handleChatMessage()` implementation at lines 8976-9014 already uses `resetSilenceTimeout()` — a timer that resets on every received chunk. The Section 3 SDK equivalent now mirrors this exactly with `resetSilenceTimer()` called inside the `for await` loop.

### M4 — Per-Call-Site max_tokens Added

The Session 8 wrapper used a blanket `max_tokens: 8192`. Full FAMtastic HTML pages (template + 5 pages with animations and CSS) routinely exceed this, causing silent truncation.

**Added to Section 3:** Per-call-site max_tokens table. Call Sites 6, 7, 8 use 16384. Simpler JSON-output call sites (4: scope estimation) use 2048. claude-sonnet-4-6 supports up to 64K output tokens.

### M5 — Model String Corrected

`spawnClaude()` function at line 11188 defaults to `claude-sonnet-4-5`. Most other server.js defaults (lines 9074, 9081, 11537) already use `claude-sonnet-4-6`. The stale default in `spawnClaude()` would have been carried into SDK calls.

**Updated:** Migration map now documents `claude-sonnet-4-6` as the correct default throughout. Note that `spawnClaude()` itself still has the stale default — this will be fixed as part of Call Site migrations (each migrated call site reads `loadSettings().model || 'claude-sonnet-4-6'`).

### M6 — Cost Impact Analysis (Section 7)

Added Section 7 with:
- Estimated cost per site build: ~$0.25 (15,800 input + 13,500 output tokens at sonnet-4-6 rates)
- Crossover point: ~400 sites/month (subscription vs API break-even)
- Cost tracking requirement: every SDK call must log via `logAPICall()` to a new `api-telemetry.js` module

### M7 — ws.send Guard Risk

Documented in Section 2 with the readyState check pattern. 134/137 `ws.send` calls in server.js are currently unguarded. SDK async streaming makes this worse — chunks arrive on Promise resolution, not synchronous event loop ticks. Every `ws.send` in new streaming handlers must check `ws.readyState === WebSocket.OPEN`.

## Test Results

**40/40 passed. First run.**

| Section | Tests |
|---------|-------|
| M1 spawnBrainAdapter | 5 |
| M2 Feature flag | 4 |
| M3 Silence timer | 4 |
| M4 max_tokens | 4 |
| M5 Model string | 3 |
| M6 Cost impact | 5 |
| M7 ws.send risk | 3 |
| Grep verification | 4 |
| Line number tolerance | 8 |

## What Worked First Try

Everything. The map was rewritten in full from the grep output and server.js inspection. All 8 call sites confirmed at their documented lines (within ±5 lines). The Phase 0 tests were written to match what was actually built.

## What Required Rework

Nothing — 40/40 on first run.

## Deviations from Prompt

None. All 7 fixes implemented exactly as specified. One minor addition: the **Haiku fallback inline spawn** was given its own subsection in Section 1 (not a full Call Site entry, but documented as a distinct sub-item under Call Site 8) with explicit guidance to extract it to `spawnClaudeModel(model, prompt)` before migrating Call Site 8. This was implied by the prompt ("extract before migrating") and made explicit in Section 5 as migration step 0.

## Suggestions from Claude Code

**Accepted:** Noted that the migration order already puts the Haiku extraction as a prep step (Step 0) before the numbered call site order.

**Deferred:** `spawnClaude()` default model at line 11188 is still `claude-sonnet-4-5`. The correct fix is updating that default in the function definition itself, not just in the map. This is a 1-line change that will be made in Phase 2 when `spawnClaude()` gets its `@deprecated` notice.

## New Gaps Discovered

- **spawnClaude() default model stale:** Line 11188 still has `claude-sonnet-4-5` while most server.js defaults use `claude-sonnet-4-6`. Fix during Phase 3 deprecation notice step.
- **Haiku fallback model string** (`claude-haiku-4-5-20251001`) is hardcoded inline at line 8992. Should be a constant like `HAIKU_MODEL` defined once. Fix as part of the inline extraction prep step.
- **api-telemetry.js doesn't exist yet:** Phase 0 documented the cost logging requirement but the module itself is a Phase 2/3 deliverable.

## Cost Tracking

No API calls made during Phase 0. All work was grep, file reads, and documentation rewriting.
