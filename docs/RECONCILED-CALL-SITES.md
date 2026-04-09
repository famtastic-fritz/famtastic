# RECONCILED-CALL-SITES.md

**Purpose:** Authoritative post-migration inventory of all spawnClaude() call sites.
Produced after Phase 3 verification to document final state.

**Last verified:** 2026-04-09 (Session 9 Addendum — line numbers confirmed post-migration)

---

## Call Site Inventory

### CS1 — Session Summary Generation

| Field | Value |
|-------|-------|
| Number | CS1 |
| Function | `generateSessionSummary()` |
| Line | ~696 |
| SDK method | `callSDK()` — non-streaming |
| max_tokens | 4096 |
| callSite label | `session-summary` |
| Timeout | 120,000ms |
| Complexity | **Simple** — non-streaming, no WS |
| Purpose | Generates a markdown session summary at session end or site switch. Written to `sites/<tag>/session-summary.md`. |

---

### CS2 — Image Prompt Generation

| Field | Value |
|-------|-------|
| Number | CS2 |
| Function | `POST /api/image-prompt` handler |
| Line | ~3821 |
| SDK method | `callSDK()` — non-streaming |
| max_tokens | 4096 |
| callSite label | `image-prompt` |
| Timeout | 120,000ms |
| Complexity | **Simple** — non-streaming, HTTP response |
| Purpose | Generates a structured AI image prompt (JSON) from site context and brand spec. |

---

### CS3 — Data Model Generation

| Field | Value |
|-------|-------|
| Number | CS3 |
| Function | `handleDataModelPlanning()` / `handleDataModel()` |
| Line | ~6669 |
| SDK method | `callSDK()` — non-streaming |
| max_tokens | 4096 |
| callSite label | `data-model` |
| Timeout | 180,000ms |
| Complexity | **Simple** — non-streaming, result sent via WS after completion |
| Purpose | Generates a data model blueprint (entities, relationships, mock approach) from site spec. |

---

### CS4 — Scope Estimation

| Field | Value |
|-------|-------|
| Number | CS4 |
| Function | `generatePlan()` / `estimateScope()` |
| Line | ~6751 |
| SDK method | `callSDK()` — non-streaming |
| max_tokens | 2048 |
| callSite label | `generate-plan` |
| Timeout | 120,000ms |
| Complexity | **Simple** — non-streaming, returns JSON scope object |
| Purpose | Estimates project scope (small/medium/large) from spec JSON. Returns null on failure (callers handle). |

---

### CS5 — Planning / Design Brief Generation

| Field | Value |
|-------|-------|
| Number | CS5 |
| Function | `handlePlanning()` |
| Line | ~6847 |
| SDK method | `callSDK()` — non-streaming |
| max_tokens | 8192 |
| callSite label | `planning-brief` |
| Timeout | 180,000ms |
| Complexity | **Simple** — non-streaming; streams WS status updates around SDK call |
| Purpose | Generates the full DESIGN_BRIEF from conversation history and spec context. Stores in spec.json. |

---

### CS6 — Per-Page HTML Generation (Parallel Build)

| Field | Value |
|-------|-------|
| Number | CS6 |
| Function | `spawnOnePage()` inner function in `parallelBuild()` |
| Line | ~7224 |
| SDK method | `sdk.messages.stream()` — streaming |
| max_tokens | 16384 |
| callSite label | `page-build` |
| Timeout | AbortController per-page + outer WS close |
| Complexity | **Complex** — streaming, parallel (`Promise.allSettled`), AbortController per page |
| Purpose | Generates one HTML page per invocation. Multiple instances run in parallel. |

---

### CS7 — Template Build (Parallel Build Phase 1)

| Field | Value |
|-------|-------|
| Number | CS7 |
| Function | Template build step in `parallelBuild()` |
| Line | ~7295 |
| SDK method | `sdk.messages.create()` — non-streaming |
| max_tokens | 16384 |
| callSite label | `template-build` |
| Timeout | 180,000ms AbortController |
| Complexity | **Moderate** — non-streaming but large output; fallback to legacy build on failure |
| Purpose | Builds `_template.html` (header, nav, footer, shared CSS) before per-page builds. |

---

### CS8 — Chat Message / Edit Handler

| Field | Value |
|-------|-------|
| Number | CS8 |
| Function | `handleChatMessage()` |
| Line | ~9201 |
| SDK method | `sdk.messages.stream()` — streaming |
| max_tokens | 16384 |
| callSite label | `chat` |
| Timeout | 30s silence → `runHaikuFallbackSDK()`; 5min hard outer timeout |
| Complexity | **Complex** — streaming, silence timer, Haiku fallback, `onChatComplete()` handler |
| Purpose | The primary chat→HTML generation pipeline. Streams chunks to WS for real-time preview. |

---

### CS9 — spawnBrainAdapter (Non-Claude Brain Adapters)

| Field | Value |
|-------|-------|
| Number | CS9 |
| Function | `routeToBrainForBrainstorm()` / `spawnBrainAdapter()` |
| Line | ~11384 (spawnBrainAdapter) / ~11452 (routeToBrain) |
| SDK method | **Not migrated** — CLI subprocess via `adapters/{brain}/fam-convo-get-{brain}` |
| Complexity | **Separate track** — shell scripts, not Claude --print. Gemini/Codex use their own CLIs. |
| Status | 🔄 Retained — brainstorm routing still uses subprocess |
| Purpose | Routes brainstorm mode through the selected brain. Falls back to spawnClaude() for claude brain. |

---

### Haiku Fallback — Silence Timeout Recovery

| Field | Value |
|-------|-------|
| Number | (not a call site — inline pattern) |
| Function | `runHaikuFallbackSDK()` |
| Line | ~9255 |
| SDK method | `sdk.messages.stream()` — streaming with `claude-haiku-4-5-20251001` |
| Trigger | 30s silence in CS8 main Sonnet stream |
| Complexity | **Simple** — extracted to `runHaikuFallbackSDK()` (was inline spawn) |
| Status | ✅ Migrated |

---

## Migration Complexity Ratings

| Rating | Meaning |
|--------|---------|
| Simple | Non-streaming, uses `callSDK()`. No WS streaming during generation. |
| Moderate | Non-streaming but large output or with fallback behavior. |
| Complex | Streaming to WebSocket, with AbortController and error handling. |
| Separate track | Not a claude --print call. Different transport entirely. |

## Migration Order (ascending complexity)

1. CS1, CS2, CS3, CS4 — Simple → `callSDK()` non-streaming
2. CS5 — Simple → `callSDK()` non-streaming (larger output)
3. CS7 — Moderate → `messages.create()` non-streaming  
4. CS6 — Complex → `messages.stream()` per-page parallel
5. CS8 — Complex → `messages.stream()` with silence timer + Haiku fallback
6. CS9 — Separate track → retain until Brain Adapter Pattern wired to brainstorm handler
