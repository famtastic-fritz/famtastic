# spawnClaude() Migration Map

**Purpose:** Document all spawnClaude() call sites in server.js and define the SDK migration strategy for Session 9.

**Last verified:** 2026-04-09 (Session 9 Phase 0 — line numbers confirmed, all 7 map defects fixed)

---

## Section 1 — Complete Call Site Inventory

There are **8 call sites** where `spawnClaude()` is invoked, plus 2 additional direct subprocess invocations that do NOT go through `spawnClaude()`:

- **Haiku fallback** (line 8992): Inline `spawn()` call inside `handleChatMessage()` that respawns with `claude-haiku-4-5-20251001` after 30s silence
- **`spawnBrainAdapter()`** (line 11229): Separate function that spawns shell adapter scripts (`fam-convo-get-claude/gemini/codex`) — NOT via claude --print

### Call Site 1 — Session Summary Generation
- **Location:** server.js:693 ✅ verified
- **Context:** `generateSessionSummary()` — generates a session summary at session end or site switch
- **Input characteristics:** Medium prompt (200–600 tokens) including conversation history and site brief
- **Output type:** Text (markdown session summary written to disk)
- **Streaming used:** No — accumulates full response before writing
- **Timeout:** 120,000ms (2 minutes)
- **Error handling:** `summaryTimeout` kills child on timeout; write skips if empty response
- **Fallback behavior:** `resolve()` with empty string if empty or non-zero exit code
- **Recommended max_tokens (SDK):** 4096

### Call Site 2 — Image Prompt Generation
- **Location:** server.js:3821 ✅ verified
- **Context:** `POST /api/image-prompt` — generates an AI image generation prompt from site context
- **Input characteristics:** Medium prompt (~400 tokens) with brand/site context, requesting JSON output
- **Output type:** JSON (structured image prompt with dimensions, style keywords)
- **Streaming used:** No — accumulates full response
- **Timeout:** 120,000ms (2 minutes)
- **Error handling:** `imgTimeout` kills child; responds 500 on empty/parse error
- **Fallback behavior:** 500 response with error message
- **Recommended max_tokens (SDK):** 4096

### Call Site 3 — Data Model Generation
- **Location:** server.js:6669 ✅ verified
- **Context:** `handleDataModel()` — generates a data model blueprint from site spec
- **Input characteristics:** Large prompt (~800 tokens) with full spec context, requesting structured JSON
- **Output type:** JSON (entities, relationships, mock approach)
- **Streaming used:** Yes — streams chunks to WebSocket as they arrive, with `firstChunk` tracking
- **Timeout:** 180,000ms (3 minutes)
- **Error handling:** `dmTimeout` kills child; WS message on timeout
- **Fallback behavior:** WS error message sent to client
- **Recommended max_tokens (SDK):** 4096

### Call Site 4 — Scope Estimation
- **Location:** server.js:6763 ✅ verified
- **Context:** `estimateScope()` — helper that estimates project scope (small/medium/large) from spec
- **Input characteristics:** Medium prompt (~300 tokens) requesting JSON with estimated_scope
- **Output type:** JSON (scope object)
- **Streaming used:** No — Promise-based, awaits close event
- **Timeout:** 120,000ms (kills and resolves null)
- **Error handling:** `timeout` kills child; `resolve(null)` on timeout or parse error
- **Fallback behavior:** Returns `null` which callers handle as "unknown scope"
- **Recommended max_tokens (SDK):** 2048

### Call Site 5 — Planning / Design Brief Generation
- **Location:** server.js:6867 ✅ verified
- **Context:** `handlePlanning()` — the brief creation flow for new sites or redesigns
- **Input characteristics:** Large prompt (~600–1200 tokens) including full conversation history + spec context
- **Output type:** JSON (design brief object with all fields)
- **Streaming used:** Yes — streams chunks to WebSocket, including partial plan card updates
- **Timeout:** 180,000ms (3 minutes)
- **Error handling:** `planTimeout` kills child; WS error message
- **Fallback behavior:** WS error message; spec not updated
- **Recommended max_tokens (SDK):** 8192

### Call Site 6 — Parallel Build: Per-Page HTML Generation
- **Location:** server.js:7231 ✅ verified
- **Context:** `spawnOnePage()` inner function inside `parallelBuild()` — spawns one Claude process per page
- **Input characteristics:** Very large prompt (1,000–4,000 tokens) with full brief, template context, slot stability instructions
- **Output type:** Full HTML page
- **Streaming used:** Yes — chunks streamed, page written on close
- **Timeout:** Implicit (parallel build has outer timeout)
- **Error handling:** `ws.activeChildren` tracks all children; each killed on WS close
- **Fallback behavior:** Page skipped from written pages list if empty response
- **Recommended max_tokens (SDK):** 16384 — large FAMtastic pages with animations and CSS routinely exceed 8192 tokens

### Call Site 7 — Template Build (Parallel Build Phase 1)
- **Location:** server.js:7300 ✅ verified
- **Context:** First step in `parallelBuild()` — builds `_template.html` before spawning per-page processes
- **Input characteristics:** Very large prompt (~2,000 tokens) for template-first architecture
- **Output type:** HTML template (`_template.html`)
- **Streaming used:** No — accumulates full response before writing
- **Timeout:** 180,000ms (3 minutes), with `templateSpawned` guard to prevent double-callback
- **Error handling:** Falls back to legacy build if template fails or times out
- **Fallback behavior:** `spawnAllPages(null)` — no template context, legacy mode
- **Recommended max_tokens (SDK):** 16384

### Call Site 8 — Chat Message / Edit Handler
- **Location:** server.js:8971 ✅ verified
- **Context:** `handleChatMessage()` — the primary chat→HTML generation pipeline
- **Input characteristics:** Very large prompt (1,000–8,000 tokens) including full page HTML, conversation history, slot stability instructions, brand rules
- **Output type:** Full HTML page (streamed)
- **Streaming used:** Yes — chunks streamed to WebSocket for real-time preview updates
- **Timeout:** 30s silence timeout (fires Haiku fallback); outer 5-minute hard timeout
- **Error handling:** Haiku fallback after 30s silence; full error handling on child close
- **Fallback behavior:** Respawns with Haiku model if Sonnet silent for 30s (line 8992); both children tracked in `ws.currentChild`
- **Recommended max_tokens (SDK):** 16384

### Call Site 9 — spawnBrainAdapter (Non-Claude Brain Adapters)
- **Location:** server.js:11229 ✅ verified
- **Context:** `spawnBrainAdapter(brain, prompt)` — spawns shell adapter scripts for Gemini/Codex
- **Scripts:** `adapters/{brain}/fam-convo-get-{brain}` — these are Bash scripts that call the Gemini CLI or Codex CLI
- **Pattern:** `spawn(adapterScript, [TAG], { env, cwd: HUB_ROOT, stdio: ['pipe','pipe','pipe'] })`
- **Callers:** `routeToBrainForBrainstorm()` (line 11300). Fallback to `spawnClaude()` if adapter unavailable.
- **Migration status:** ⚠️ **SEPARATE MIGRATION TRACK** — these are NOT Claude --print calls. Gemini uses Google Generative AI SDK; Codex uses OpenAI SDK. The Brain Adapter Pattern (Phase 1) wraps these in their own adapters. `spawnBrainAdapter()` is the current implementation; `GeminiAdapter` and `CodexAdapter` are the Session 9 replacements.
- **Recommended max_tokens (SDK):** Per-adapter (Gemini 32000, Codex/OpenAI gpt-4o: 16384)

### Haiku Fallback (Inline Spawn — Not a Call Site)
- **Location:** server.js:8992
- **Context:** Inside `handleChatMessage()` — inline `spawn()` that bypasses `spawnClaude()` entirely
- **Trigger:** 30s silence detected, `response.length === 0`, not already retried
- **Model:** `claude-haiku-4-5-20251001`
- **Status:** ⚠️ Should be extracted to `spawnClaudeModel(model, prompt)` before SDK migration — otherwise migrating Call Site 8 requires migrating the inline fallback separately. Extract as a prep step.

---

## Section 2 — What spawnClaude() Does Beyond Calling Claude

The `spawnClaude()` function (lines 11187–11220) does far more than call the Claude CLI:

### Env var stripping
- **What it does:** Iterates `process.env` and deletes every key starting with `CLAUDE_` plus `CLAUDECODE`
- **Why:** Prevents `claude --print` from detecting it's running inside a Claude Code session (nested-session detection). Without this, the subprocess refuses to start or produces zero output.
- **SDK equivalent:** Not needed — SDK calls are API-based, no subprocess, no nested-session concept.

### CWD set to os.tmpdir()
- **What it does:** Always runs from `os.tmpdir()` instead of the project root
- **Why:** Any directory with CLAUDE.md triggers Claude Code project instructions. With `--tools ""`, the subprocess cannot honor OpenWolf instructions and produces 0 bytes. os.tmpdir() is guaranteed clean.
- **SDK equivalent:** Not applicable — no subprocess CWD.

### Child process lifecycle management
- **What it does:** Returns the raw child process object; callers attach their own `stdout.on('data')`, `stderr.on('data')`, and `close` handlers
- **The stdin write pattern:** `child.stdin.write(prompt); child.stdin.end()` — prompt sent as stdin, not args
- **Error event handler:** Registered on spawn error to log and reset `buildInProgress` lock to prevent permanent deadlock
- **SDK equivalent:** Promise-based — no process management needed. Wrap in try/catch; error rejects the promise.

### No built-in streaming to WebSocket
- **What it does:** Returns child process; streaming to WS is the caller's responsibility
- **Pattern:** firstChunk tracking, ws.readyState checks (varying — some call sites unguarded)
- **SDK equivalent:** `stream: true` returns an async iterable. Caller iterates with `for await` and calls `onChunk(delta.text)` per chunk. ws.readyState MUST be checked on every send.

### No timeout
- **What it does:** No built-in timeout — every call site manages its own `setTimeout(() => child.kill(), ...)`
- **SDK equivalent:** `AbortController` + `setTimeout(() => controller.abort(), timeoutMs)`

### WebSocket disconnect handling
- **What it does:** `ws.currentChild` (single child) or `ws.activeChildren[]` (parallel build); `ws.on('close')` kills all tracked children
- **SDK equivalent:** AbortController array; `ws.on('close')` calls `controller.abort()` on each

### Model selection
- **What it does:** Reads model from `loadSettings().model` at call time (not cached)
- **Default in spawnClaude():** `claude-sonnet-4-5` (line 11188) — **this is stale**, most other server.js defaults now use `claude-sonnet-4-6`
- **Haiku fallback:** `claude-haiku-4-5-20251001` — hardcoded inline at line 8992
- **SDK rule:** Always read from `loadSettings().model` — never hardcode model strings. Default: `claude-sonnet-4-6`.

### IMPORTANT: 134/137 ws.send calls unguarded
**This is a critical risk for async streaming.** In the current subprocess model, `child.stdout.on('data')` fires synchronously-ish on the Node.js event loop. With SDK streaming, chunks arrive asynchronously via Promise resolution — the WebSocket may close between chunk events. Every `ws.send` in a streaming path MUST check `ws.readyState === WebSocket.OPEN` before calling send. The pattern:
```javascript
if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload))
```
Apply this to every `ws.send` in new streaming handlers. Unguarded sends throw on a closed socket and can crash the server process.

---

## Section 3 — SDK Equivalents

| Current spawnClaude() behavior | Anthropic SDK equivalent |
|-------------------------------|--------------------------|
| Strip CLAUDE_* env vars | Not needed — SDK is API-based |
| Run from os.tmpdir() | Not applicable — no CWD |
| `claude --print --model X --tools ""` | `anthropic.messages.create({ model, messages, max_tokens })` |
| stdin → stdout streaming | `stream: true` → async iterable, iterate with `for await` |
| Manual stdout accumulation | `stream.finalMessage()` returns complete response |
| Separate child process lifecycle | Promise/async — no process management |
| `ws.currentChild = child; child.kill()` | `controllers.push(controller); ws.on('close', () => controller.abort())` |
| `buildInProgress` reset in error handler | try/catch rejects → catch block resets lock |
| Per-call timeout via `setTimeout(() => child.kill())` | `AbortController` + `setTimeout(() => controller.abort(), ms)` |
| Model from `loadSettings()` | Same — `model: loadSettings().model \|\| 'claude-sonnet-4-6'` |
| `child.stdin.write(prompt); child.stdin.end()` | `messages: [{ role: 'user', content: prompt }]` |
| Haiku fallback via inline respawn | Catch AbortError/timeout, call SDK again with `claude-haiku-4-5-20251001` model |

### Per-Call-Site max_tokens

**Do NOT use a single shared max_tokens.** Large HTML pages (Call Sites 6, 7, 8) can exceed 8192 output tokens — using 8192 will silently truncate HTML. Use these values:

| Call Site | Purpose | max_tokens |
|-----------|---------|------------|
| 1 | Session summary | 4096 |
| 2 | Image prompt (JSON) | 4096 |
| 3 | Data model (JSON) | 4096 |
| 4 | Scope estimation (JSON) | 2048 |
| 5 | Planning / design brief | 8192 |
| 6 | Per-page HTML (parallel) | 16384 |
| 7 | Template build | 16384 |
| 8 | Main chat / edit | 16384 |
| Haiku fallback | Chat fallback | 8192 |

Note: Anthropic SDK supports up to 64K output tokens on claude-sonnet-4-6. Use 16384 for HTML generation — it covers all real FAMtastic pages while staying within comfortable API limits.

### Silence Timer — Correct Pattern for Call Site 8

The current implementation (lines 8976–9014) already uses the correct `resetSilenceTimeout()` pattern — the timer resets on every received chunk, not from call start. The SDK equivalent preserves this pattern exactly:

```javascript
let silenceTimer = null
const SILENCE_TIMEOUT = 30000

const resetSilenceTimer = () => {
  if (silenceTimer) clearTimeout(silenceTimer)
  if (retriedWithHaiku) return // don't retry twice
  silenceTimer = setTimeout(() => {
    if (response.length === 0 && !retriedWithHaiku) {
      retriedWithHaiku = true
      controller.abort() // AbortController cancels the SDK stream
      // trigger Haiku retry — same behavior as current line 8992
      fallbackToHaiku(messages, onChunk, ws)
    }
  }, SILENCE_TIMEOUT)
}

// In the streaming loop — reset on every chunk received:
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    resetSilenceTimer() // ← resets 30s window on every chunk
    const text = event.delta.text
    response += text
    if (ws && ws.readyState === WebSocket.OPEN) {  // always guard
      ws.send(JSON.stringify({ type: 'chunk', content: text }))
    }
    if (onChunk) onChunk(text)
  }
}
if (silenceTimer) clearTimeout(silenceTimer)
```

**Critical:** Do not replace the silence timer with a simple `AbortController` timeout from call start. That would break the "30 seconds of no output" behavior — a call that produces output immediately but then pauses briefly would be killed prematurely.

### SDK Initialization (module-level, not per-call)

```javascript
const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
// ANTHROPIC_API_KEY read from env — not from studio-config.json
// anthropic client initialized once at module load, reused for all calls
```

---

## Section 4 — Call Sites Requiring Special Attention

### Call Site 8 (Chat Handler) — HIGH
- **Complexity:** Haiku fallback is an inline `spawn()` inside `handleChatMessage()` at line 8992 — it bypasses `spawnClaude()` entirely. This inline code must be extracted to `spawnClaudeModel(model, prompt)` BEFORE migrating this call site, otherwise the SDK migration is migrating two separate patterns simultaneously.
- **Prep step:** Extract line 8992 spawn block into `function spawnClaudeModel(model, prompt)` that looks identical to `spawnClaude()` but accepts a model parameter. Commit that extraction before any SDK work.
- **SDK approach:** Silence timer pattern above; try/catch around primary Sonnet call; catch AbortError → call `fallbackToHaiku()` via SDK (new SDK call with Haiku model)
- **Risk:** HIGH — most complex call site, involves streaming, silence detection, ws.currentChild tracking, Haiku retry

### Call Site 7 (Template Build) — HIGH
- **Complexity:** Has `templateSpawned` guard (line 7303) to prevent double-callback from timeout+close race. This guard must be preserved in SDK migration.
- **SDK approach:** `templateSpawned` boolean still needed; AbortController abort triggers the same fallback to `spawnAllPages(null)`
- **Risk:** HIGH — race condition guard is subtle; easy to regress

### Call Site 6 (Per-Page Parallel Build) — HIGH
- **Complexity:** Multiple concurrent Claude calls — `ws.activeChildren[]` replaced with array of AbortControllers. Each page currently runs independently; SDK parallel calls need shared cancellation.
- **SDK approach:** `Promise.allSettled(pageFiles.map(page => sdkStreamPage(page)))` — `allSettled` not `all` so one page failure doesn't cancel others. Shared AbortController array for WS-close cancellation.
- **Risk:** HIGH — concurrency, shared cancellation, per-page streaming

### Call Site 5 (Planning / Design Brief) — MEDIUM
- **Complexity:** Streams plan card updates to WebSocket during generation. Partial JSON parsing for plan cards relies on streaming chunks.
- **Risk:** MEDIUM — streaming pattern is established, but partial JSON parsing of chunks needs care

### Call Site 3 (Data Model) — MEDIUM
- **Complexity:** Similar streaming pattern to Call Site 5 but with WS firstChunk tracking.
- **Risk:** MEDIUM — straightforward streaming, no special cases

### Call Sites 1, 2, 4 (Summary, Image Prompt, Scope) — LOW
- **Complexity:** Non-streaming or simple accumulate-then-respond patterns
- **Risk:** LOW — simple async/await replacement

### Call Site 9 / spawnBrainAdapter — SEPARATE TRACK
- **NOT migrated via callClaudeSDK.** Uses Google Generative AI SDK (Gemini) and OpenAI SDK (Codex) — different APIs entirely.
- **Migration:** Brain Adapter Pattern (Session 9 Phase 1) wraps each brain in its own adapter class. `GeminiAdapter` and `CodexAdapter` replace `spawnBrainAdapter()`.

---

## Section 5 — Migration Order

Recommended migration order (simplest first, most complex last):

0. **PREP: Extract Haiku fallback** — extract lines 8992–9013 to `spawnClaudeModel(model, prompt)`. Commit separately. This is a prerequisite for Call Site 8.
1. **Call Site 4 — Scope Estimation** (non-streaming, Promise-based, returns null on failure) — safest entry point
2. **Call Site 2 — Image Prompt** (non-streaming, HTTP response, simple timeout)
3. **Call Site 1 — Session Summary** (non-streaming, writes to disk, WS optional)
4. **Call Site 5 — Planning / Design Brief** (streaming to WS, complex output but established pattern)
5. **Call Site 3 — Data Model** (streaming to WS, similar to planning)
6. **Call Site 7 — Template Build** (non-streaming accumulate, templateSpawned race guard)
7. **Call Site 6 — Per-Page Parallel Build** (concurrent streaming, highest complexity)
8. **Call Site 8 — Chat Handler** (concurrent streaming + Haiku fallback — migrate last)

**Each call site migration = its own git commit.** Per-call-site commits enable surgical rollback without reverting unrelated changes.

---

## Section 6 — Per-Call-Site Migration Approach (Replaces USE_SDK Flag)

**The USE_SDK feature flag approach documented in previous versions of this map is incorrect and has been removed.**

The problem: SDK returns `Promise` (async/await), subprocess returns a `child_process` object (event-based). These are incompatible interfaces. A global toggle wrapper cannot bridge them transparently — callers would need to handle both patterns, defeating the purpose of the flag.

### Correct Approach: Migrate Call Sites One at a Time

Each call site is migrated independently. During migration, the call site switches from subprocess to SDK. Unmigrated call sites continue using `spawnClaude()` unchanged.

**Pattern for a migrated call site:**
```javascript
// Before (subprocess):
async function generateBrief(prompt, ws) {
  const child = spawnClaude(prompt)
  ws.currentChild = child
  // ... child.stdout.on('data', ...), child.on('close', ...)
}

// After (SDK):
async function generateBrief(prompt, ws) {
  const controller = new AbortController()
  ws.currentAbortController = controller  // replace ws.currentChild
  ws.on('close', () => controller.abort())  // cancel on disconnect

  try {
    const msg = await anthropic.messages.create({
      model: loadSettings().model || 'claude-sonnet-4-6',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
      signal: controller.signal
    })
    return msg.content[0].text
  } catch (err) {
    if (err.name === 'AbortError') return ''  // WS closed, normal
    throw err
  }
}
```

### Rollback

Rollback = revert the git commit for that specific call site. `spawnClaude()` is never removed until all call sites are migrated and proven stable across at least one full session.

### SDK Dependency

```bash
cd site-studio && npm install @anthropic-ai/sdk
```

Initialize once at module load (server.js):
```javascript
const Anthropic = require('@anthropic-ai/sdk')
const anthropic = new Anthropic()
// Reads ANTHROPIC_API_KEY from process.env automatically
```

---

## Section 7 — Cost Impact Analysis

**Current:** `spawnClaude()` uses the Claude Code subscription (~$100/month flat rate). No per-token billing.

**After migration:** SDK calls are billed per token via the Anthropic API.

### Estimated Cost Per Site Build

| Phase | Input tokens | Output tokens | Cost |
|-------|-------------|---------------|------|
| Template build | ~2,000 | ~3,000 | ~$0.051 |
| 5 pages × 2,000 input | ~10,000 | ~7,500 | ~$0.143 |
| Planning / brief | ~800 | ~1,000 | ~$0.017 |
| Typical edits (3×) | ~3,000 | ~2,000 | ~$0.039 |
| **Total per build** | **~15,800** | **~13,500** | **~$0.25** |

Rates: input $3/1M, output $15/1M (claude-sonnet-4-6).
Haiku fallback rates: input $0.80/1M, output $4/1M.

### Crossover Point

| Volume | Subscription cost | API cost | Verdict |
|--------|-------------------|----------|---------|
| 5 sites/month | ~$100 | ~$1.25 | Subscription cheaper |
| 50 sites/month | ~$100 | ~$12.50 | Subscription cheaper |
| 200 sites/month | ~$100 | ~$50 | Subscription cheaper |
| 400 sites/month | ~$100 | ~$100 | Break-even |

**Current volume:** 5 sites built. API billing is affordable and enables per-token optimization, cache warming, and fine-grained cost tracking. SDK is the right architectural investment regardless of immediate cost.

### Cost Tracking Requirement

Every SDK call MUST log to `site-studio/lib/api-telemetry.js` with:
```javascript
logAPICall({
  provider: 'claude',
  model: model,
  call_site: callSiteId,  // e.g., 'brief-generation', 'page-build'
  input_tokens: usage.input_tokens,
  output_tokens: usage.output_tokens,
  cost_usd: calculateCost('claude-sonnet-4-6', usage.input_tokens, usage.output_tokens),
  tag: TAG,  // current site
  timestamp: new Date().toISOString()
})
```

`calculateCost()` already exists in server.js at line 11515.

---

## Search Commands Used

Run these before Session 9 to confirm no undocumented call sites exist:

```bash
# All direct spawnClaude() calls in server.js
grep -n "spawnClaude(" site-studio/server.js

# All spawnBrainAdapter calls
grep -n "spawnBrainAdapter" site-studio/server.js

# All child_process / spawn / exec invocations in server.js
grep -n "child_process\|\.spawn\b\|\.exec\b\|\.execFile\b" site-studio/server.js | sort -n

# Any spawnClaude or child_process in lib/ modules
grep -rn "spawnClaude\|child_process" site-studio/lib/

# Any direct claude --print invocations anywhere
grep -rn "claude --print\|claude --model" site-studio/

# Any inline spawn() calls (like the Haiku fallback)
grep -n "= spawn(" site-studio/server.js
```

**Session 9 Phase 0 results:**
- 8 `spawnClaude()` call sites confirmed (lines 693, 3821, 6669, 6763, 6867, 7231, 7300, 8971)
- 1 `spawnBrainAdapter()` function (line 11229), called from `routeToBrainForBrainstorm()` (line 11300)
- 1 inline `spawn()` call — Haiku fallback (line 8992)
- Several `child_process` imports for non-Claude uses (execFile for rembg/deploy scripts, etc.) — these are NOT call sites
- No undocumented Claude call sites found

---

## Manual Review Required

This document must be read by someone who knows the server.js codebase **before Session 9 migration begins**.

**Phase 0 verification checklist (completed 2026-04-09):**
1. ✅ All 8 call sites reviewed against current server.js line numbers (all confirmed ±5 lines)
2. ✅ `spawnBrainAdapter()` inventoried as Call Site 9 / separate migration track
3. ✅ Section 2 special behaviors verified against current `spawnClaude()` implementation
4. ✅ Section 6 USE_SDK flag removed — per-call-site approach documented
5. ✅ Section 3 silence timer corrected to use `resetSilenceTimer()` pattern
6. ✅ Per-call-site max_tokens added to Section 3
7. ✅ Model strings updated to `claude-sonnet-4-6` (spawnClaude default was stale at `claude-sonnet-4-5`)
8. ✅ Section 7 Cost Impact added
9. ✅ ws.send guard risk documented in Section 2

**Ready for Session 9 migration.** Do not modify this map structure without re-verifying all call sites.

**Last verified:** 2026-04-09 (Session 9 Phase 0)
