# Session 10 — Phase 2 Report: Tool Calling Infrastructure

## Status: COMPLETE — 14/14 tests pass (31 assertions)

---

## What Was Built

### New Files

| File | Purpose |
|------|---------|
| `site-studio/lib/studio-tools.js` | STUDIO_TOOLS array — 5 Anthropic-format tool definitions, Claude-only |
| `site-studio/lib/tool-handlers.js` | Tool handler implementations + initToolHandlers() injection |
| `tests/session10-phase2-tests.js` | 14 tests, 31 assertions — all passing |

### Modified Files

| File | Change |
|------|--------|
| `site-studio/lib/adapters/claude-adapter.js` | Added `_executeBlocking()` with MAX_TOOL_DEPTH=3, tool loop, ws-through-options |
| `site-studio/lib/brain-interface.js` | Tools only for Claude in build/brainstorm mode (C1), ws.brainModels override (C6) |
| `site-studio/server.js` | Added `initToolHandlers` require + init call, `/api/worker-queue` endpoint |
| `.wolf/cerebrum.md` | Appended Session 10 decisions |

---

## Addendum Corrections Applied

| ID | Correction | Where |
|----|-----------|-------|
| C1 | STUDIO_TOOLS only passed when brain === 'claude' AND mode is build/brainstorm | brain-interface.js execute() |
| C2 | MAX_TOOL_DEPTH = 3 in _executeBlocking() | claude-adapter.js |
| C3 | Worker dispatch stubs write to .worker-queue.jsonl, return structured result | tool-handlers.js dispatchToClaudeCode/Playwright |
| C4 | ws flows through options chain, never stored as this.ws | claude-adapter.js, brain-interface.js |
| C5 | read_file sandboxed to SITE_DIR() via path.resolve + startsWith check | tool-handlers.js readSiteFile() |
| C6 | ClaudeAdapter accepts model override from opts.model; BrainInterface reads ws.brainModels[brain] | Both files |

---

## Tool Definitions (CLAUDE-ONLY)

1. **get_site_context** — returns spec, pages summary, approved decisions
2. **get_component_library** — returns library.json components (always via `.components` key)
3. **get_research** — delegates to research-router if available, gracefully falls back
4. **dispatch_worker** — writes to `~/famtastic/.worker-queue.jsonl`; workers: claude-code, playwright, netlify
5. **read_file** — sandboxed to SITE_DIR(); path traversal blocked by path.resolve + startsWith

---

## Architecture Notes

- `initToolHandlers()` is called in server.js immediately after `invalidateSpecCache()` (line ~175), after TAG, HUB_ROOT, SITE_DIR(), and readSpec() are all established. The `getSiteDir` lambda closes over the mutable `TAG` variable so it always returns the active site path.
- Tool loop in `_executeBlocking()` collects all `tool_use` blocks from the response, calls `handleToolCall()` for each, appends tool_result messages, and recurses. Depth increments on each recursion. At depth >= 3 returns a fallback content string without hitting the API.
- Worker dispatch is functional stubs only — Session 12 will replace with actual Claude Code CLI dispatch via subprocess and Playwright MCP via WebSocket.
- `/api/worker-queue` endpoint reads the JSONL queue file and returns all tasks. Registered BEFORE `/api/research/:filename` to comply with static-before-parameterized rule.

---

## Test Results

```
Results: 31 passed, 0 failed
ALL TESTS PASSED
```

Run: `node tests/session10-phase2-tests.js`

---

## Deferred to Session 12

- Actual Claude Code CLI subprocess dispatch (replaces JSONL queue stub)
- Playwright MCP worker dispatch
- Gemini/OpenAI tool format translation (tool calling is Claude-only until then)
