# Part 2 Prep — Agent Y findings (Q2 + Q3)

**Date:** 2026-06-01
**Scope:** READ-ONLY scan of `_refs/hermes-workspace-v2.3/` and `_refs/hermes-webui-v0.51/` + web research

---

## Q2: OpenAI-compat compliance level

### Headline

- **Verdict: Extended-tolerant.** Both Workspace and WebUI parse OpenAI-shaped SSE chunks but treat **unknown fields as ignored**, malformed JSON as silently skipped, and **branch on SSE `event:` name** to layer Hermes-specific tool-progress payloads on top of the OpenAI envelope.
- **Failure mode if shape mismatches: silent drop** (try/except around JSON.parse, optional-chaining all the way down). The connection won't error — the chat just appears empty / cards stay stuck "running."
- Both consumers also understand the Hermes `event: hermes.tool.progress` extension (Workspace also accepts legacy `claude.tool.progress`). WebUI translates that into its own `tool` / `tool_complete` browser SSE events.

### Workspace streaming consumer

Files: `src/server/openai-compat-api.ts`, `src/server/claude-api.ts` (`streamChat`), `src/server/chat-backends.ts`.

**Two parallel paths exist:**

1. **`openai-compat` backend** → `openai-compat-api.ts:parseOpenAIStream` (lines 194–267) hits `${CLAUDE_API}/v1/chat/completions`.
2. **`claude-enhanced` backend** → `claude-api.ts:streamChat` (lines 363–459) hits `${CLAUDE_API}/api/sessions/${sessionId}/chat/stream` — a Hermes-Agent-specific route, NOT OpenAI-compat. This is the path Workspace prefers when `sessionId` is available; uses raw SSE `event:` / `data:` lines and forwards every event through `onEvent({event, data})` (claude-api.ts:445).

**Parser strictness (openai-compat path):**
- Splits SSE by `\n\n` boundary, then by `\n` lines (openai-compat-api.ts:211–228).
- `data: [DONE]` recognized and skipped (line 231).
- `JSON.parse` wrapped in try/catch with `// Ignore malformed chunks.` (lines 242–261). **Silent drop.**
- Fields indexed: only `choices[0].delta.{content, reasoning, reasoning_content}` (lines 243–254). Everything else (id, model, system_fingerprint, finish_reason, role, tool_calls in the OpenAI sense) is ignored.
- `usage` field is NOT consumed by Workspace's openai-compat path (unlike WebUI's).
- No `tool_calls` parsing in OpenAI delta shape — tool surfacing comes only via the `event: hermes.tool.progress` / `event: claude.tool.progress` SSE-named events (lines 234–240, handler at `parseClaudeToolProgressChunk` lines 156–192). That handler accepts: `tool|name`, `emoji`, `label`, `toolCallId|tool_call_id`, `status` (running/completed). Missing fields → tolerant: still yields a chunk as long as label OR toolCallId is present.

**Branches on backend type:** Yes. `chat-backends.ts:resolveChatBackend()` chooses `openai-compat` vs `claude-enhanced`; the two paths have completely different parsers and endpoints.

**Notable extras:**
- Debug tap: `HERMES_TOOL_DEBUG=1` dumps every raw SSE event to `/tmp/hermes-tool-debug/` (claude-api.ts:398–417). Useful when validating Shay's gateway emissions.

### WebUI gateway_chat.py + streaming.py

File: `api/gateway_chat.py` (lines 116–164, 297–360).

WebUI's gateway-bridge mode (`HERMES_WEBUI_CHAT_BACKEND=gateway`) acts as a **proxy/translator**: it POSTs to `${base}/v1/chat/completions` with `stream: true`, parses OpenAI-shaped SSE, and re-emits its own browser-SSE event names (`token`, `tool`, `tool_complete`, `done`, `stream_end`, `apperror`).

**Parser strictness:**
- Line-by-line SSE (lines 307–326). `event:` line captured into `sse_event` var; `data: [DONE]` breaks the loop; bad JSON → `continue` (silent drop, gateway_chat.py:325–326).
- `_gateway_sse_delta` (lines 116–131): pulls `choices[0].delta.content` (str) OR falls back to `choices[0].message.content`. Anything else returns `""`. Tolerant of missing `choices` or empty list.
- `_gateway_stream_usage` (lines 134–142): reads `usage.{prompt_tokens|input_tokens, completion_tokens|output_tokens, estimated_cost|estimated_cost_usd}`. Accepts BOTH OpenAI canonical names AND Anthropic-ish aliases.
- Hermes tool-progress: branches when `sse_event == "hermes.tool.progress"` (line 327). `_gateway_tool_progress_event` (lines 145–164) reads `tool|name|function_name`, `status` (running/completed/complete/success/error/failed), `toolCallId|tool_call_id|id`, `label|preview`, `args`. Same forgiveness profile as Workspace.
- Sends `X-Hermes-Session-Id: <session>` and (when an API key is configured) `X-Hermes-Session-Key: webui:<session>` (lines 274–280).

**Streaming consumer in WebUI's native (non-gateway) path** lives in `api/streaming.py` and is for the *legacy in-process* path (it owns its own AIAgent + callbacks, not the wire protocol). It is NOT an OpenAI-compat consumer; the gateway-chat module is the only OpenAI-compat consumer in WebUI.

### Public RFC / design notes

**`_refs/hermes-webui-v0.51/docs/rfcs/hermes-run-adapter-contract.md`** is in-tree and load-bearing (tracking issue [nesquena/hermes-webui#1925](https://github.com/nesquena/hermes-webui/issues/1925), revised 2026-05-23). Key points for our gateway shim:

- The browser event contract (Artifact 1) defines **14 event families**: `run.started / status`, `token.delta`, `reasoning.delta / reasoning.done`, `progress`, `tool.started / updated / done`, `approval.requested / resolved`, `clarify.requested / resolved`, `title.updated`, `usage.updated / final`, `error`, `done` (RFC lines 183–199).
- These are the runtime-adapter event families — they are NOT what `/v1/chat/completions` emits today. The gateway-chat translator collapses many of them into OpenAI deltas + `hermes.tool.progress`.
- Slice 4f (lines 957–971) is explicit: *"a runner must emit events that are already compatible with the browser SSE event names/payloads, or a later runner-owned normalization layer must translate Hermes runtime families such as `token.delta`, `tool.started`, and `done` before they reach this route."*
- Slice 4e (line 906) confirms `runner-local` mode is **default-off** and returns "not-configured" until a supervised runner client exists. Until then, all live chat stays on `legacy-direct`.

Web search summary: GitHub issue #1925 is reachable but I have no web access here; RFC is fully reproduced in-tree at lines 1–1080, dated 2026-05-23 — that *is* the authoritative spec.

### Shay gateway compatibility verdict

**Shay's gateway needs only a thin translation layer**, not a full re-implementation. Concretely:

What Shay MUST emit on `POST /v1/chat/completions` with `stream: true`:
1. `data: {"choices":[{"delta":{"content":"<token>"}}]}\n\n` — the core OpenAI delta. **Required.** Anything else and both consumers stay silent.
2. `data: [DONE]\n\n` — the terminator. Required.
3. Optional `usage` block on final chunk: `{"usage":{"prompt_tokens":N,"completion_tokens":N}}` — WebUI consumes both OpenAI and Anthropic-style aliases (`input_tokens`/`output_tokens`/`estimated_cost`). Workspace ignores usage on this path.
4. (Optional but recommended for tool visibility) `event: hermes.tool.progress\ndata: {"tool":"<name>","label":"...","status":"running|completed","toolCallId":"..."}\n\n` — this is the Hermes extension both consumers know.

What Shay MUST NOT emit (or guard behind a flag):
- Anthropic-native event names (`message_start`, `content_block_delta`, `message_delta`) — neither consumer recognizes these on the openai-compat route. They will be silently dropped.
- vLLM-style `data: {"text":"...", "stop":false}` — not parsed.
- New top-level fields like `run_id`, `status`, `active_controls` on `/api/chat/start` JSON — RFC Slice 4e/4f explicitly forbids public response-shape drift.

For Workspace's **`claude-enhanced` path** (preferred when `sessionId` set), Shay's gateway must additionally support `POST /api/sessions/${sid}/chat/stream` returning Hermes-Agent SSE: `event: assistant.delta` + `event: assistant.completed` envelopes per `chat-backends.ts:49–68`. If Shay only speaks `/v1/chat/completions`, Workspace will fall back to the openai-compat path **only if** `resolveChatBackend()` returns `openai-compat`. Without `/api/sessions/.../chat/stream`, the Hermes-Agent code path in Workspace is dead.

---

## Q3: Bearer token sourcing

### Headline

- **Verdict: env-var-sourced, optional, scheme = `Authorization: Bearer <token>`.** Workspace reads `HERMES_API_TOKEN` (primary) or `CLAUDE_API_TOKEN` (back-compat). WebUI's bridge reads `HERMES_WEBUI_GATEWAY_API_KEY` (primary) or `API_SERVER_KEY` (fallback). If the env var is empty, the `Authorization` header is **omitted entirely** — there is no "anonymous required" path; the server is expected to allow unauthenticated loopback unless `Require Bearer on loopback` is flipped in the Shay desktop admin UI.
- **Header format:** `Authorization: Bearer <raw token>` — no special prefix, no other schemes.

### Workspace resolution

- Canonical const: `src/server/gateway-capabilities.ts:262` — `export const BEARER_TOKEN = process.env.HERMES_API_TOKEN || process.env.CLAUDE_API_TOKEN || ''`.
- `_authHeaders()` helper: `gateway-capabilities.ts:271` and duplicated in `claude-api.ts:28–29`, `context-usage.ts:142`, `responses-api.ts:59` — all gate on truthy token, returning `{}` when empty.
- Applied on streaming hot path: `claude-api.ts:377` (Hermes-Agent `/api/sessions/.../chat/stream`).
- The `openai-compat-api.ts` path uses a separate, **lazier** resolver `getBearerToken()` (lines 21–41) that adds a third fallback: read `~/.codex/auth.json → tokens.access_token`. This bridges Codex OAuth users. Reads on every call (intentional — vite-node SSR const-freeze workaround documented in the file header).
- Sent at `openai-compat-api.ts:282–285` (header omitted if empty).
- **Required or optional?** Optional. No code path asserts `BEARER_TOKEN` is non-empty before issuing a request. A 401 returned by the server is surfaced as a thrown `Error("OpenAI-compatible chat: 401 ...")` (line 309) or as a stream-level error in `streamChat`. Nothing crashes; it just fails the turn.

### WebUI resolution

- `api/gateway_chat.py:73–79`: `_gateway_api_key()` reads `HERMES_WEBUI_GATEWAY_API_KEY` OR `API_SERVER_KEY`. Empty string means "don't send Authorization."
- Header set at `gateway_chat.py:276–280` — only when `api_key` is truthy. Also conditionally adds `X-Hermes-Session-Key: webui:<sid>` ONLY when the bearer is present (cookie/CSRF isolation per comment).
- On 401, emits an `apperror` event with hint "Set HERMES_WEBUI_GATEWAY_API_KEY to the same value as the Hermes Gateway API_SERVER_KEY" (lines 100–106). Confirms the canonical name on the *server side* (Shay gateway) is `API_SERVER_KEY`.

### Cross-check with Shay gateway expectations

- Legacy Shay Desktop (`shay-desktop-electron/src/renderer/src/admin/auth/ApiServerKeyPanel.tsx:4`, `AuthPage.tsx:11`, `auth-service.ts:81`) confirms the server-side primitive is `API_SERVER_KEY` with a **`requireBearer` toggle** (default off for loopback). When `requireBearer=false`, loopback clients without `Authorization` succeed; when `true`, they 401.
- Headers expected by Shay gateway: `Authorization: Bearer <API_SERVER_KEY value>`.
- Compatibility: **fully compatible.** Both Workspace and WebUI send exactly what Shay expects. Translation needed: **none** at the wire level. The only operator-facing translation is the naming asymmetry: client env vars (`HERMES_API_TOKEN`, `HERMES_WEBUI_GATEWAY_API_KEY`) must be set to the *same string* as the server's `API_SERVER_KEY`.

### Recommendation for Shay gateway

- **Auth scheme:** `Authorization: Bearer <token>` only. No other schemes.
- **Env vars to honor on the server:** keep `API_SERVER_KEY` as canonical (matches what WebUI's error hint promises and what the desktop admin UI manages). Optionally also accept `HERMES_API_TOKEN` as an alias on the server side so a single env-set covers all three surfaces.
- **Default policy:** `requireBearer=false` on loopback (matches existing legacy Shay Desktop default) so unconfigured WebUI/Workspace dev runs "just work" on `127.0.0.1`. Promote `requireBearer=true` whenever Shay binds to non-loopback or an SSH tunnel is in play.
- **Documentation:** explicitly state the three client env var names users must set to the same value: `API_SERVER_KEY` (server), `HERMES_API_TOKEN` (Workspace), `HERMES_WEBUI_GATEWAY_API_KEY` (WebUI). This is the single most error-prone config in the stack.

---

## Combined implications for Part 2

### Highest-risk finding

**Silent drop on shape mismatch is the dominant failure mode.** Specifically: if Shay's gateway emits anything other than `data: {"choices":[{"delta":{"content":"..."}}]}` on `/v1/chat/completions`, both Workspace and WebUI will **show an empty assistant turn with no error**, because every JSON.parse is wrapped in a swallowed try/catch and every field lookup uses optional chaining. The user will see "Gateway returned no response" only after the stream closes (gateway_chat.py:363–369), with no clue *why*. This is the canonical foot-gun.

Mitigation: enable Workspace's `HERMES_TOOL_DEBUG=1` (claude-api.ts:398) during bring-up to capture every raw SSE byte. Mirror its logging shape in Shay's emitter so we can diff actual-vs-expected without instrumenting client code.

### Secondary risk

If we want **tool cards to render**, Shay's gateway MUST emit the Hermes-specific `event: hermes.tool.progress\ndata: {...}\n\n` extension on the openai-compat route. Without it, tool calls are invisible to both clients on the `/v1/chat/completions` path (Workspace's legacy `event: claude.tool.progress` alias is still tolerated as a back-compat for older builds).

### Lowest-effort path forward

1. Stand up Shay gateway emitting **only** the OpenAI delta shape + `[DONE]` first — text-only chat will work in both surfaces with zero auth (loopback, no `API_SERVER_KEY` set).
2. Add `event: hermes.tool.progress` SSE events with `{tool, label, status, toolCallId}` payload — tool cards light up in both surfaces.
3. Add `Authorization: Bearer` check at the server gated by a `requireBearer` flag matching the legacy desktop's pattern; recommend exporting one env var name on the server (`API_SERVER_KEY`) and document the client-side aliases.
4. Defer the `claude-enhanced` Hermes-Agent route (`/api/sessions/${sid}/chat/stream` with `event: assistant.delta`) until we want session continuity in Workspace specifically; until then, force Workspace's `resolveChatBackend()` to `openai-compat` via config.
5. Do NOT chase runtime-adapter event families (`run.started`, `tool.updated`, `approval.requested`, etc.) — RFC confirms the runner backend is default-off and route-gated; live `/api/chat/start` is still legacy-direct in v0.51.108+. We can ignore the runner contract entirely for Part 2.

### Citations (file:line)

- Workspace OpenAI parser strictness + silent-drop: `_refs/hermes-workspace-v2.3/src/server/openai-compat-api.ts:242–261`
- Workspace fields consumed: `_refs/hermes-workspace-v2.3/src/server/openai-compat-api.ts:243–254`
- Workspace tool-progress extension handler: `_refs/hermes-workspace-v2.3/src/server/openai-compat-api.ts:156–192, 234–240`
- Workspace Hermes-Agent (non-openai) SSE path: `_refs/hermes-workspace-v2.3/src/server/claude-api.ts:363–459`
- Workspace bearer resolution (canonical): `_refs/hermes-workspace-v2.3/src/server/gateway-capabilities.ts:262, 271`
- Workspace bearer resolution (lazy, with Codex fallback): `_refs/hermes-workspace-v2.3/src/server/openai-compat-api.ts:21–41, 282–285`
- WebUI openai-compat translator + parser: `_refs/hermes-webui-v0.51/api/gateway_chat.py:116–164, 297–360`
- WebUI bearer resolution: `_refs/hermes-webui-v0.51/api/gateway_chat.py:73–79, 276–280`
- WebUI 401 hint naming `API_SERVER_KEY`: `_refs/hermes-webui-v0.51/api/gateway_chat.py:94–113`
- Hermes Run Adapter Contract RFC (in-tree): `_refs/hermes-webui-v0.51/docs/rfcs/hermes-run-adapter-contract.md` (tracking issue: https://github.com/nesquena/hermes-webui/issues/1925)
- Legacy Shay Desktop `API_SERVER_KEY` + `requireBearer`: `shay-desktop-electron/src/renderer/src/admin/auth/ApiServerKeyPanel.tsx:4, 79, 198`, `auth-service.ts:81–116`

### Web sources

Web search/fetch was NOT used — the RFC is fully reproduced in-tree at `_refs/hermes-webui-v0.51/docs/rfcs/hermes-run-adapter-contract.md` (1080 lines, last revised 2026-05-23 by @franksong2702, tracking nesquena/hermes-webui#1925), which is the authoritative source for the adapter contract. The in-tree copy is more current than anything public search would surface. No additional external sources were load-bearing.
