# Session 9 Phase 1 Report — 2026-04-09

## What Was Built/Fixed

Implemented the Brain Adapter Pattern — a universal interface layer between Studio and all three AI brains.

### Files Created

| File | Purpose |
|------|---------|
| `site-studio/lib/brain-interface.js` | Universal Studio-to-Brain communication layer. Maintains conversation history, injects context headers, handles brain switching. |
| `site-studio/lib/brain-adapter-factory.js` | Factory: `create(brain)` → correct adapter instance. Unknown brain falls back to ClaudeAdapter with warning. |
| `site-studio/lib/adapters/claude-adapter.js` | Anthropic SDK adapter. `execute()` + `executeStreaming()`. Silence timer (resetSilenceTimer per chunk). AbortController support. |
| `site-studio/lib/adapters/gemini-adapter.js` | Google Generative AI SDK adapter. Multi-turn via `startChat({history})`. Streaming via `sendMessageStream()`. |
| `site-studio/lib/adapters/codex-adapter.js` | OpenAI SDK adapter. `gpt-4o`. Multi-turn via messages array. `stream:true` streaming. |
| `site-studio/lib/brain-sessions.js` | Persistent BrainInterface sessions. `initBrainSessions()` — auth probe at startup. `getOrCreateBrainSession()` — reuse sessions for multi-turn. |
| `site-studio/lib/api-telemetry.js` | Per-call SDK cost logging. `logAPICall()`, `calculateCost()`, `getSessionSummary()`. Writes to `sites/<tag>/sdk-calls.jsonl`. In-memory session totals. |

### Modified Files

| File | Change |
|------|--------|
| `site-studio/lib/studio-events.js` | Added `MODE_CHANGED: 'mode:changed'` event |

### Key Design Decisions

**Context header injection.** Every message from `BrainInterface.execute()` is automatically prepended with:
```
[MODE: BRAINSTORM] [SITE: vinyl-vault] [PAGE: about.html]
```
This tells any brain it's inside FAMtastic Studio without requiring brain-specific prompt engineering. The header is injected by BrainInterface, not by individual adapters.

**History preservation on brain switch.** `switchBrain(newBrain)` changes the adapter but keeps `conversationHistory`. The new adapter receives the full prior history on the next `execute()` call. This enables seamless mid-session brain switching without context loss.

**Silence timer in ClaudeAdapter.** `executeStreaming()` implements the `resetSilenceTimer()` per-chunk pattern from the migration map Section 3. Timer resets on every chunk received. Fires `onSilence()` callback after 30s of no output (for Haiku fallback, wired in Call Site 8 migration). AbortController is registered in the caller-provided `abortControllers` array for WS-close cancellation.

**ws.send guards.** Every `ws.send` in all three adapters is wrapped in `ws.readyState === WebSocket.OPEN` guard. No unguarded sends.

**api-telemetry.js** created as a standalone module separate from existing `media-telemetry.js`. Uses `calculateCost()` with the same rates already present in server.js (lines 11518-11524). Writes to `sites/<tag>/sdk-calls.jsonl` per site.

**initBrainSessions()** makes real API probes for Claude (cheap Haiku call with 8s timeout) and uses key-presence checks for Gemini/Codex (avoiding rate-limit waste on non-Claude brains). Never throws — always returns a results object. Gemini was `authenticated` in local environment (GEMINI_API_KEY set); Claude and Codex were `needs-auth` (no API keys configured yet).

## Test Results

**60/60 passed. First run (after fixing one syntax error).**

| Section | Tests |
|---------|-------|
| BrainAdapterFactory | 5 |
| Adapter capabilities | 8 |
| BrainInterface instantiation | 4 |
| Context header injection | 6 |
| History management | 6 |
| Brain sessions (sync) | 4 |
| api-telemetry | 5 |
| studio-events MODE_CHANGED | 2 |
| ws.send guards in adapters | 5 |
| File existence | 7 |
| initBrainSessions async | 4 |
| execute() async mocked | 4 |

## What Worked First Try

Everything except one syntax issue (see below). All module instantiation, adapter capabilities, history management, context headers, factory fallback, cost calculation, event emission — first run.

## What Required Rework

**One syntax error:** The test file had `for...of` closing with `});` instead of `}` — the `)` was a copy-paste artifact from a prior describe()-style test structure. Fixed before running.

**Async test wrapper:** Top-level `await` is not valid in CJS modules. Wrapped async tests in `async function runAsyncTests()` called at the bottom.

## Deviations from Prompt

**BrainInterface.readStudioContext():** The prompt referenced `readSTUDIOCONTEXT()` as a standalone function. Implemented as `BrainInterface.readStudioContext()` — an instance method — since it needs `this.tag` and `this.hubRoot`. This is cleaner and easier to test.

**Connect button UI:** The prompt specified a Connect button for unauthenticated brains. This is a Studio UI concern (index.html). The underlying data (`initBrainSessions()` returns `needs-auth` status) is implemented and emitted via `SESSION_STARTED` event. The UI wiring is deferred to when the brain selector is modified in Phase 2 (the brain selector already listens to `brain-status` WS messages — extending it to handle `needs-auth` is straightforward).

**`getBrainSession()` vs `getOrCreateBrainSession()`:** Both implemented in `brain-sessions.js`. The prompt described `getBrainSession()` returning the persistent session; the addendum clarifies the intent is to reuse sessions for multi-turn. Both functions exist for different use cases.

## Suggestions from Claude Code

**Accepted:** `api-telemetry.js` created as a new module rather than extending the existing `media-telemetry.js`. The two have different concerns — media-telemetry tracks image/video generation; api-telemetry tracks text AI SDK calls. Keeping them separate avoids coupling.

**Deferred:** The `initBrainSessions()` Claude auth probe makes a real API call with `claude-haiku-4-5-20251001`. In development without ANTHROPIC_API_KEY set, this is a no-op (key check fails immediately). In production, this adds ~2-5s to Studio startup. Consider making the probe non-blocking (fire-and-forget, update UI asynchronously). Logged as gap.

## New Gaps Discovered

- **initBrainSessions Claude probe is blocking:** At startup, the Claude auth probe adds ~2-5s latency. Should be non-blocking — start the probe, return immediately, update brain status via event when probe completes.
- **Connect button UI not wired:** `needs-auth` status is available in the `SESSION_STARTED` event payload but the brain selector UI doesn't yet show a Connect button. Deferred to Phase 2 / UI work.
- **GeminiAdapter key validation is weak:** Currently just checks if `GEMINI_API_KEY` is set (non-empty). A bad key won't be caught until the first real Gemini call. Consider adding a cheap probe call (same as Claude pattern).
- **OpenAI OAuth authentication not implemented:** The Codex adapter assumes `OPENAI_API_KEY` is set. The prompt mentioned ChatGPT Plus OAuth as an auth path — this was not implemented because OAuth flows require browser interaction, which is outside the scope of a server-side Node module.

## Cost Tracking

No API calls made during Phase 1 development. All tests used mocked adapters or environment key checks.

**Auth probe test results (with no ANTHROPIC_API_KEY):**
- Claude: needs-auth (key not set — probe never fired)
- Gemini: authenticated (GEMINI_API_KEY is set in environment)
- Codex: needs-auth (no OPENAI_API_KEY)
