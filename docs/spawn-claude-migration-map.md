# spawnClaude() Migration Map

**Purpose:** Document all spawnClaude() call sites in server.js and define the SDK migration strategy for Session 9.

---

## Section 1 — Complete Call Site Inventory

There are **8 call sites** where `spawnClaude()` is invoked, plus 2 additional direct `spawn()` calls that mirror it (Haiku fallback and `spawnBrainAdapter`).

### Call Site 1 — Session Summary Generation
- **Location:** server.js:693
- **Context:** `generateSessionSummary()` — generates a session summary at session end or site switch
- **Input characteristics:** Medium prompt (200–600 tokens) including conversation history and site brief
- **Output type:** Text (markdown session summary written to disk)
- **Streaming used:** No — accumulates full response before writing
- **Timeout:** 120,000ms (2 minutes)
- **Error handling:** `summaryTimeout` kills child on timeout; write skips if empty response
- **Fallback behavior:** `resolve()` with empty string if empty or non-zero exit code

### Call Site 2 — Image Prompt Generation
- **Location:** server.js:3821
- **Context:** `POST /api/image-prompt` — generates an AI image generation prompt from site context
- **Input characteristics:** Medium prompt (~400 tokens) with brand/site context, requesting JSON output
- **Output type:** JSON (structured image prompt with dimensions, style keywords)
- **Streaming used:** No — accumulates full response
- **Timeout:** 120,000ms (2 minutes)
- **Error handling:** `imgTimeout` kills child; responds 500 on empty/parse error
- **Fallback behavior:** 500 response with error message

### Call Site 3 — Data Model Generation
- **Location:** server.js:6669
- **Context:** `handleDataModel()` — generates a data model blueprint from site spec
- **Input characteristics:** Large prompt (~800 tokens) with full spec context, requesting structured JSON
- **Output type:** JSON (entities, relationships, mock approach)
- **Streaming used:** Yes — streams chunks to WebSocket as they arrive, with `firstChunk` tracking
- **Timeout:** 180,000ms (3 minutes)
- **Error handling:** `dmTimeout` kills child; WS message on timeout
- **Fallback behavior:** WS error message sent to client

### Call Site 4 — Scope Estimation
- **Location:** server.js:6763
- **Context:** `estimateScope()` — helper that estimates project scope (small/medium/large) from spec
- **Input characteristics:** Medium prompt (~300 tokens) requesting JSON with estimated_scope
- **Output type:** JSON (scope object)
- **Streaming used:** No — Promise-based, awaits close event
- **Timeout:** 120,000ms (kills and resolves null)
- **Error handling:** `timeout` kills child; `resolve(null)` on timeout or parse error
- **Fallback behavior:** Returns `null` which callers handle as "unknown scope"

### Call Site 5 — Planning / Design Brief Generation
- **Location:** server.js:6867
- **Context:** `handlePlanning()` — the brief creation flow for new sites or redesigns
- **Input characteristics:** Large prompt (~600–1200 tokens) including full conversation history + spec context
- **Output type:** JSON (design brief object with all fields)
- **Streaming used:** Yes — streams chunks to WebSocket, including partial plan card updates
- **Timeout:** 180,000ms (3 minutes)
- **Error handling:** `planTimeout` kills child; WS error message
- **Fallback behavior:** WS error message; spec not updated

### Call Site 6 — Parallel Build: Per-Page HTML Generation
- **Location:** server.js:7231
- **Context:** `spawnOnePage()` inner function inside `parallelBuild()` — spawns one Claude process per page
- **Input characteristics:** Very large prompt (1,000–4,000 tokens) with full brief, template context, slot stability instructions
- **Output type:** Full HTML page
- **Streaming used:** Yes — chunks streamed, page written on close
- **Timeout:** Implicit (parallel build has outer timeout)
- **Error handling:** `ws.activeChildren` tracks all children; each killed on WS close
- **Fallback behavior:** Page skipped from written pages list if empty response

### Call Site 7 — Template Build (Parallel Build Phase 1)
- **Location:** server.js:7300
- **Context:** First step in `parallelBuild()` — builds `_template.html` before spawning per-page processes
- **Input characteristics:** Very large prompt (~2,000 tokens) for template-first architecture
- **Output type:** HTML template (`_template.html`)
- **Streaming used:** No — accumulates full response before writing
- **Timeout:** 180,000ms (3 minutes), with `templateSpawned` guard to prevent double-callback
- **Error handling:** Falls back to legacy build if template fails or times out
- **Fallback behavior:** `spawnAllPages(null)` — no template context, legacy mode

### Call Site 8 — Chat Message / Edit Handler
- **Location:** server.js:8971
- **Context:** `handleChatMessage()` — the primary chat→HTML generation pipeline
- **Input characteristics:** Very large prompt (1,000–8,000 tokens) including full page HTML, conversation history, slot stability instructions, brand rules
- **Output type:** Full HTML page (streamed)
- **Streaming used:** Yes — chunks streamed to WebSocket for real-time preview updates
- **Timeout:** 30s silence timeout (fires Haiku fallback); outer 3-minute hard timeout
- **Error handling:** Haiku fallback after 30s silence; full error handling on child close
- **Fallback behavior:** Respawns with Haiku model if Sonnet silent for 30s; both children tracked in `ws.currentChild`

---

## Section 2 — What spawnClaude() Does Beyond Calling Claude

The `spawnClaude()` function (lines 11187–11220) does far more than call the Claude CLI:

### Env var stripping
- **What it does:** Iterates `process.env` and deletes every key starting with `CLAUDE_` plus `CLAUDECODE`
- **Why:** Prevents `claude --print` from detecting it's running inside a Claude Code session (nested-session detection). Without this, the subprocess refuses to start or produces zero output.
- **Note:** This is a per-call operation — it builds a fresh env object each time, not mutating global process.env.

### CWD set to os.tmpdir()
- **What it does:** Always runs from `os.tmpdir()` instead of the project root
- **Why:** Any directory with CLAUDE.md triggers Claude Code project instructions. With `--tools ""`, the subprocess cannot honor OpenWolf instructions (read anatomy.md, etc.) and produces 0 bytes. os.tmpdir() is guaranteed clean.
- **Note:** Documented in cerebrum.md as SPAWN_CLAUDE_CWD do-not-repeat rule.

### Child process lifecycle management
- **What it does:** Returns the raw child process object; callers attach their own `stdout.on('data')`, `stderr.on('data')`, and `close` handlers
- **The stdin write pattern:** `child.stdin.write(prompt); child.stdin.end()` — prompt sent as stdin, not args
- **Error event handler:** Registered on spawn error to log and reset `buildInProgress` lock to prevent permanent deadlock
- **Close event handler:** Logs non-zero exit codes

### No built-in streaming to WebSocket
- **What it does:** Returns child process; streaming to WS is the caller's responsibility
- **How streaming works:** Each call site attaches its own `child.stdout.on('data', chunk => { ws.send(...) })` handler
- **Pattern:** firstChunk tracking, ws.readyState checks (varying — some call sites are unguarded)

### No timeout
- **What it does:** No built-in timeout — every call site manages its own `setTimeout(() => child.kill(), ...)`
- **Timeout values:** 120,000ms (non-streaming), 180,000ms (streaming/build), 30s silence → Haiku respawn

### WebSocket disconnect handling
- **What it does:** None built into spawnClaude() itself
- **How callers handle it:** `ws.currentChild` (single child) or `ws.activeChildren[]` (parallel build); `ws.on('close')` kills all tracked children
- **Risk:** 134/137 `ws.send` calls in server are unguarded (documented in cerebrum.md)

### Nested session prevention
- **Mechanism:** CLAUDE_* env var stripping + tmpdir CWD (together these defeat nested-session detection)

### Model selection
- **What it does:** Reads model from `loadSettings().model` at call time (not cached)
- **Default:** `claude-sonnet-4-5` if not configured
- **Haiku fallback:** Call site 8 has its own inline respawn with `claude-haiku-4-5-20251001`

---

## Section 3 — SDK Equivalents

| Current spawnClaude() behavior | Anthropic SDK equivalent |
|-------------------------------|--------------------------|
| Strip CLAUDE_* env vars | Not needed — SDK calls are API-based, no subprocess, no nested-session concept |
| Run from os.tmpdir() | Not applicable — no subprocess CWD to set |
| `claude --print --model X --tools ""` | `anthropic.messages.create({ model, messages, max_tokens, stream })` |
| stdin → stdout streaming | `stream: true` → `stream.on('text', chunk => ws.send(chunk))` |
| Manual stdout accumulation | Handled by SDK stream — `stream.finalMessage()` for full result |
| Separate child process lifecycle | Promise-based — no process management needed |
| `ws.currentChild = child; child.kill()` on WS close | `controller.abort()` via AbortController when WS closes |
| `buildInProgress` reset in child error handler | SDK rejects the promise on error — wrap in try/catch |
| Per-call timeout via `setTimeout(() => child.kill())` | `AbortController` + `setTimeout(() => controller.abort())` |
| Model from `loadSettings()` | Same — pass to `anthropic.messages.create({ model })` |
| `child.stdin.write(prompt); child.stdin.end()` | `messages: [{ role: 'user', content: prompt }]` |
| Haiku fallback via inline respawn | Catch error / timeout, call SDK again with `model: 'claude-haiku-4-5-20251001'` |

**New SDK wrapper signature:**
```javascript
async function callClaudeSDK(prompt, opts = {}) {
  const { model, stream: useStream, ws, timeout: timeoutMs, onChunk } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 120000);
  try {
    if (useStream && ws && onChunk) {
      const stream = await anthropic.messages.create({
        model: model || loadSettings().model || 'claude-sonnet-4-5',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }, { signal: controller.signal });
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          onChunk(event.delta.text);
        }
      }
      clearTimeout(timer);
      return await stream.finalMessage();
    } else {
      const msg = await anthropic.messages.create({
        model: model || loadSettings().model || 'claude-sonnet-4-5',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
      }, { signal: controller.signal });
      clearTimeout(timer);
      return msg.content[0].text;
    }
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}
```

---

## Section 4 — Call Sites Requiring Special Attention

### Call Site 8 (Chat Handler) — HIGH
- **Complexity:** Haiku fallback is an inline respawn inside the same function, re-attaching handlers to the new child. SDK migration needs a clean retry path with a new `callClaudeSDK` call using Haiku model.
- **Proposed SDK approach:** try/catch around primary Sonnet call; catch AbortError → retry with Haiku model
- **Risk:** HIGH — most complex call site, involves ws.currentChild tracking, streaming, Haiku fallback, silence detection

### Call Site 7 (Template Build) — HIGH
- **Complexity:** Has a `templateSpawned` guard to prevent double-callback from timeout+close race. The guard logic will need to be preserved with AbortController.
- **Proposed SDK approach:** `templateSpawned` boolean still needed; AbortController abort triggers the same fallback
- **Risk:** HIGH — race condition guard is subtle; easy to regress

### Call Site 6 (Per-Page Parallel Build) — HIGH
- **Complexity:** Multiple concurrent Claude calls — `ws.activeChildren[]` must be replaced with `Promise.all()` + AbortControllers. Each child currently runs independently; SDK parallel calls need shared cancellation.
- **Proposed SDK approach:** `Promise.all(pageFiles.map(page => callClaudeSDK(pagePrompt(page), { stream: true, onChunk })))` with shared `AbortController` for WS-close cancellation
- **Risk:** HIGH — concurrency, shared cancellation, per-page streaming

### Call Site 5 (Planning / Design Brief) — MEDIUM
- **Complexity:** Streams plan card updates to WebSocket during generation. The partial JSON parsing for plan cards relies on streaming chunks.
- **Proposed SDK approach:** Use `onChunk` callback for streaming partial updates; standard Promise for final result
- **Risk:** MEDIUM — streaming pattern is established, but partial JSON parsing of chunks needs care

### Call Site 3 (Data Model) — MEDIUM
- **Complexity:** Similar streaming pattern to Call Site 5 but with WS firstChunk tracking.
- **Risk:** MEDIUM — straightforward streaming, no special cases

### Call Sites 1, 2, 4 (Summary, Image Prompt, Scope) — LOW
- **Complexity:** Non-streaming or simple accumulate-then-respond patterns
- **Proposed SDK approach:** Straight async/await with AbortController timeout; no streaming needed
- **Risk:** LOW — simple replacement

---

## Section 5 — Migration Order

Recommended migration order (simplest first, most complex last):

1. **Call Site 4 — Scope Estimation** (non-streaming, Promise-based, returns null on failure) — safest entry point
2. **Call Site 2 — Image Prompt** (non-streaming, HTTP response, simple timeout)
3. **Call Site 1 — Session Summary** (non-streaming, writes to disk, WS optional)
4. **Call Site 5 — Planning / Design Brief** (streaming to WS, complex output but established pattern)
5. **Call Site 3 — Data Model** (streaming to WS, similar to planning)
6. **Call Site 7 — Template Build** (non-streaming accumulate, but templateSpawned race guard)
7. **Call Site 6 — Per-Page Parallel Build** (concurrent streaming, highest complexity)
8. **Call Site 8 — Chat Handler** (concurrent streaming + Haiku fallback — migrate last)

---

## Section 6 — Rollback Plan

### Feature Flag Approach

```javascript
const USE_SDK = process.env.USE_SDK === 'true';

function callClaude(prompt, opts) {
  return USE_SDK ? callClaudeSDK(prompt, opts) : spawnClaude(prompt);
}
```

- Set `USE_SDK=false` in environment to immediately revert all call sites to `spawnClaude()`
- Migrate call sites one at a time by routing through `callClaude()` wrapper
- Test each call site with `USE_SDK=true` in isolation before advancing to next
- `spawnClaude()` stays in server.js as fallback until all call sites are migrated and stable for at least one full session

### Quick Revert
Set `USE_SDK=false` in shell environment or `.env` file. The `spawnClaude()` function is never removed until the flag has been removed and all call sites are proven stable. Revert is a one-line env var change, not a code change.

### SDK Dependency
Add `@anthropic-ai/sdk` to `site-studio/package.json`. Initialize once at module load:
```javascript
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
```

---

## Search Commands Used

**Session 8 addendum (Correction 6):** Run these grep commands before Session 9 to verify no undocumented call sites exist. The Section 1 inventory was built from these commands.

```bash
# All direct spawnClaude() calls in server.js
grep -n "spawnClaude(" site-studio/server.js

# All child_process / spawn / exec / execFile references in server.js
grep -n "child_process\|\.spawn\b\|\.exec\b\|\.execFile\b" site-studio/server.js

# Any spawnClaude or child_process in lib/ modules
grep -rn "spawnClaude\|child_process" site-studio/lib/

# Any direct claude --print or claude --model invocations anywhere
grep -rn "claude --print\|claude --model" site-studio/
```

Any matches from these grep commands that are NOT in Section 1 of this document indicate an undocumented call site. Document before migrating.

---

## Manual Review Required

This document must be read by someone who knows the server.js codebase **before Session 9 begins**.

Structural tests (file exists, sections present, call site counts match) verify formatting only — not accuracy. A migration map with correct structure but wrong descriptions will cause Session 9 failures.

**Before starting the SDK migration, confirm:**
1. Every call site in Section 1 has been reviewed against current server.js line numbers (they shift as code is added)
2. Section 2 special behaviors are still accurate (check spawnClaude() implementation for any changes since this was written)
3. Section 4 complex call sites have been triaged — plan the streaming migration carefully
4. Section 6 feature flag is in place and tested before migrating the first call site

**Last verified:** 2026-04-09. Re-verify before Session 9.
