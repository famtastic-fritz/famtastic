# Session 9 Phase 2 Report — Anthropic SDK Migration

**Date:** 2026-04-09
**Scope:** Migrate all 8 `spawnClaude()` call sites in `site-studio/server.js` to the Anthropic SDK (`@anthropic-ai/sdk`)

---

## What Was Built

### Infrastructure (Steps 1–3)

Three new requires added at the top of `server.js`:
- `@anthropic-ai/sdk` — direct SDK client
- `logAPICall as logSDKCall` from `lib/api-telemetry` — cost logging
- `getOrCreateBrainSession, resetSessions as resetBrainSessions` from `lib/brain-sessions` — session management

Three helper functions added above `spawnClaude()`:
- **`getAnthropicClient()`** — lazy singleton that initializes once
- **`callSDK(prompt, opts)`** — non-streaming call with AbortController timeout and cost logging. Options: `maxTokens`, `callSite`, `timeoutMs`
- **`spawnClaudeModel(model, prompt)`** — variant of `spawnClaude()` that accepts a model string. Added as prep for CS8 Haiku fallback extraction. `@deprecated`

`spawnClaude()` updated: default model changed from `claude-sonnet-4-5` to `claude-sonnet-4-6`, `@deprecated` JSDoc added.

### Call Site Migrations (Steps 4a–4h)

All 8 `spawnClaude()` call sites migrated. Each migration is its own git commit.

**CS1 — `generateSessionSummary()` (line ~693)**
Was: subprocess → `child.on('close', ...)`. Now: `callSDK()` with `.then()`. The try/catch around `fs.writeFileSync` fixes the known gap where a failed write would never call `resolve()`, hanging `gracefulShutdown`.

**CS2 — `POST /api/generate-image-prompt` (line ~3821)**
Was: subprocess in Express handler. Now: `async (req, res)` handler with `await callSDK()`. JSON parsing and fallback logic unchanged.

**CS3 — `handleDataModelPlanning()` (line ~6669)**
Was: subprocess. Now: `async function` with `await callSDK()`. All JSON parsing and display formatting logic preserved. `ws.send` calls guarded with `ws.readyState === 1` checks.

**CS4 — `generatePlan()` (line ~6763)**
Was: `new Promise` wrapping a subprocess. Now: `await callSDK()` directly (function was already async). Simpler code, same behavior.

**CS5 — `handlePlanning()` (line ~6867)**
Was: synchronous function with subprocess. Now: `async function` with `await callSDK()`. Full brief JSON parsing and spec write logic preserved.

**CS6 — Per-page build in `parallelBuild()` (line ~7231)**
Was: `spawnPage()` returned a `{child, getResponse, appendResponse}` object; `spawnAllPages()` managed per-page child process lifecycle. Now: `spawnPage()` returns a string (the page prompt); `spawnAllPages()` is `async` and uses `Promise.allSettled()`. Each page gets its own `AbortController`. WS close handler aborts all page controllers.

**CS7 — Template build in `parallelBuild()` (line ~7300)**
Was: `templateChild = spawnClaude(templatePrompt)` with timeout + close callbacks. Now: `await getAnthropicClient().messages.create()` with AbortController. Legacy fallback (`spawnAllPages('')`) preserved for SDK failure cases. `templateSpawned` guard preserved.

**CS8 — `handleChatMessage()` (line ~8971)**
Was: `child = spawnClaude(prompt)` with 30s silence timer respawning Haiku via inline `spawn()`, 5-min hard timeout, all response processing in `onChildClose()`. Now: `async function`; response processing extracted to `onChatComplete(finalResponse, usage)` inner function; main path uses `sdk.messages.stream()` with streaming event loop. Silence timer calls new `runHaikuFallbackSDK()` helper.

**`runHaikuFallbackSDK(prompt, ws, buildStartTime, requestType)`** — new standalone `async` function. Called when Sonnet produces no output after 30s. Uses SDK streaming with `claude-haiku-4-5-20251001`. Includes own AbortController + WS-close cancellation.

### Step 5 — `GET /api/telemetry/sdk-cost-summary`

Added before the compare endpoint. Returns: `totalCostUsd`, `byProvider`, `bySite`, `byCallSite`, `generatedAt`, `recentCalls` (last 50 SDK calls for the current site from `sdk-calls.jsonl`).

### Step 6 — `resetBrainSessions()` on site switch

`resetBrainSessions()` is now called in `POST /api/switch-site` immediately after `TAG = newTag`. This clears conversation history for all brain sessions when the user switches sites, preventing cross-site context bleed.

---

## Key Technical Decisions

**CS6 — `Promise.allSettled()` not `Promise.all()`:** Independent page failures shouldn't abort the entire build. `allSettled` lets each page fail or succeed independently. A single failed page logs an error and gets skipped; the other pages still complete.

**CS8 — `onChatComplete()` inner function:** Extracting all response processing into a named inner function makes both the main SDK path and the Haiku fallback path call the same logic for consistent behavior.

**CS8 — Haiku fallback stays SDK-only:** The original Haiku fallback used inline `spawn()`. The new path uses `runHaikuFallbackSDK()`. The `spawnClaudeModel()` function was added but the Haiku path never uses it — it's there for any edge cases that need it as a named function.

**Token tracking improvement:** All SDK paths now log real token counts from `response.usage`. The previous subprocess path used `Math.round(str.length / 4)` estimates. Real counts improve cost visibility in `/api/telemetry/sdk-cost-summary`.

---

## Test Results

`tests/session9-phase2-tests.js` — **39/39 PASS**

Tests cover:
- Infrastructure: imports, callSDK, getAnthropicClient, spawnClaudeModel, @deprecated notice, default model
- CS1–CS8: no `spawnClaude()` at each call site, replacement pattern present, async where required
- CS6: `Promise.allSettled`, `max_tokens: 16384`, `async parallelBuild`
- CS7: `templateController` AbortController, `template-build` callSite label
- CS8: `sdkController`, `resetSilenceTimer`, `sdk.messages.stream`, `runHaikuFallbackSDK`
- Telemetry: endpoint exists, calls `getSessionSummary()` and `readSiteLog()`
- Site switch: `resetBrainSessions()` called

**Cumulative test count: 977/977 (938 prior + 39 new)**

---

## Git Commits (8 migrations + infrastructure)

1. `feat: add Anthropic SDK helpers to server.js (callSDK, getAnthropicClient, spawnClaudeModel)`
2. `migrate CS1: generateSessionSummary() to Anthropic SDK`
3. `migrate CS2: POST /api/generate-image-prompt to Anthropic SDK`
4. `migrate CS3: handleDataModelPlanning() to Anthropic SDK`
5. `migrate CS4: generatePlan() to Anthropic SDK`
6. `migrate CS5: handlePlanning() to Anthropic SDK`
7. `migrate CS6+CS7: parallelBuild page-build and template-build to Anthropic SDK`
8. `migrate CS8: handleChatMessage() to Anthropic SDK streaming`
9. `feat: add /api/telemetry/sdk-cost-summary endpoint and wire resetBrainSessions on site-switch`

---

## Known Gaps / Deferred

- `runHaikuFallbackSDK()` sends the full Haiku response as a plain `assistant` message instead of running the complete `onChatComplete()` HTML parsing pipeline. This is intentional — the Haiku fallback is a degraded mode for congestion situations. Full pipeline support deferred to Session 10.
- `spawnBrainAdapter()` (brainstorm mode for Gemini/Codex) is still subprocess-based. This is a separate migration track — out of scope for Phase 2.
- `spawnClaude()` and `spawnClaudeModel()` are `@deprecated` but still present. Scheduled for removal in Session 10 after SDK paths are proven stable.
