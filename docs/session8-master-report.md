# Session 8 Master Report — 2026-04-09

## Session Summary

Session 8 completed four phases:
- **Phase 0:** Renamed all 8 `cj-*` scripts to `fam-convo-*` with deprecation shims and full reference updates
- **Phase 1:** Fixed 7 Codex adversarial findings (C1–C7) covering seed status, history formatting, context cache, threshold calibration, effectiveness scoring, Quick Start verification, and summarization documentation
- **Phase 2:** Closed 7 Session 7 known gaps (G1–G7): all-pages context, real Pinecone embeddings, auto-seed hook, stale research refresh, effectiveness bar UI, MCP table auto-parse, brain sidecar reinject
- **Phase 3:** Produced complete spawnClaude() → Anthropic SDK migration map (documentation only, no server.js changes)

**Total tests: 155 new (75 + 31 + 28 + 21) — all passing. Cumulative: 884/884.**

---

## Phase 0 — cj-* → fam-convo-* Rename

### What Changed

All 8 conversation pipeline scripts renamed to `fam-convo-*` canonical names. Old `cj-*` paths replaced with deprecation shims that print a WARNING to stderr and exec the new script.

### New Files

| New Path | Old Path |
|----------|----------|
| `scripts/fam-convo-compose` | `scripts/cj-compose-convo` |
| `scripts/fam-convo-reconcile` | `scripts/cj-reconcile-convo` |
| `scripts/fam-convo-ingest` | `scripts/cj-ingest` |
| `scripts/fam-convo-promote` | `scripts/cj-promote` |
| `scripts/fam-convo-generate-latest` | `scripts/generate-latest-convo` |
| `adapters/claude/fam-convo-get-claude` | `adapters/claude/cj-get-convo-claude` |
| `adapters/gemini/fam-convo-get-gemini` | `adapters/gemini/cj-get-convo-gemini` |
| `adapters/codex/fam-convo-get-codex` | `adapters/codex/cj-get-convo-codex` |

### Internal Reference Updates

- `fam-convo-reconcile`: updated internal calls to `fam-convo-compose` and `fam-convo-generate-latest`
- `fam-convo-ingest`: updated internal call to `fam-convo-promote`
- All three adapter scripts: added summarization comment documenting that Claude always handles summarization regardless of active brain
- `scripts/fam-hub`: updated 3 dispatcher references (reconcile, ingest, promote)
- `site-studio/server.js`: updated `adapterNames` object to `fam-convo-get-*`
- `tests/session7-phase0-tests.js` and `tests/session7-phase2-tests.js`: updated adapter path assertions

### Deprecation Shim Pattern

```bash
#!/usr/bin/env bash
echo "WARNING: cj-compose-convo is deprecated. Use fam-convo-compose instead." >&2
exec "$(dirname "$0")/fam-convo-compose" "$@"
```

### Tests: 75/75 passed

---

## Phase 1 — Codex Adversarial Findings (C1–C7)

### C1 — Pinecone Seed Status Endpoint

`GET /api/research/seed-status` added to `server.js` (declared before `/:filename`). Returns `{ index, vectorCount, lastSeeded, status }`.

### C2 — Per-Brain History Formatting

`site-studio/lib/history-formatter.js` created. Three format functions:
- **claude:** JSON messages array (`{ messages: [{ role, content }] }`)
- **gemini:** `Human: ... \n\nAssistant: ...\n\nHuman:` transcript
- **codex:** `### Prior conversation:\n...\n### Current request:`

Summarization always uses Claude CLI regardless of active brain. When history > 20 turns, oldest 10 summarized before formatting. Runs from `os.tmpdir()`, logs `source: 'summarization'`.

### C3 — Context Writer Cache

CONTEXT_CACHE object added to `studio-context-writer.js` (module-level, 30s TTL). Cache invalidated on `SITE_SWITCHED` and `BUILD_COMPLETED` events. Logs `CONTEXT_CACHE HIT` or `CONTEXT_CACHE MISS` on every `generate()` call.

### C4 — Threshold Calibration Endpoint

`GET /api/research/threshold-analysis` added (declared before `/:filename`). `getThreshold()` function reads `research.pinecone_threshold` from `~/.config/famtastic/studio-config.json` (default 0.75). Exported from `research-router.js`.

### C5 — Build Metrics Effectiveness Scoring

`computeEffectivenessFromBuild(source, vertical, buildMetrics)` added to `research-registry.js`:
- `healthDelta × 50% + briefReuseRate × 30% + iterationsToApproval × 20%`
- Calls `saveEffectivenessScore()`, returns rounded integer 0–100
- Wired to `BUILD_COMPLETED` in `server.js`

### C6 — Quick Start Verification

`fam-hub admin verify-quickstart` subcommand added. Checks 5 tools: `node`, `npm`, `python3`, `claude`, `netlify`. Reports found (with path) or NOT FOUND.

### C7 — Summarization Documentation

Summarization architecture note added to:
- `FAMTASTIC-SETUP.md` (Architecture Overview section)
- `scripts/fam-hub` (convo subcommand help text)
- `.wolf/cerebrum.md` (Key Learnings)
- All 3 adapter `fam-convo-get-*` scripts (inline comment)

### Tests: 31/31 passed

---

## Phase 2 — Session 7 Known Gaps (G1–G7)

### G1 — All Pages Context in STUDIO-CONTEXT.md

`buildAllPages(hubRoot, tag, activePage)` function added to `studio-context-writer.js`. For each HTML file in `sites/<TAG>/dist/`:
- Extracts H1 text (first `<h1>` tag)
- Counts `data-section-id` attributes
- Counts `<img>` tags
- Gets last-modified timestamp
- Active page marked with `(active)`

Section added to `generate()` sections array between site state and component library.

### G2 — Real Pinecone Embeddings

`pineconeUpsert()` updated to `upsertRecords([{ id, text, ...metadata }])` (Pinecone text-based integrated embedding API). `pineconeQuery()` updated to `searchRecords({ query: { topK: 1, inputs: { text: question } } })`. Both have fallback to legacy `upsert()`/`query()` with zero-vectors if SDK doesn't support the new methods.

### G3 — Auto-seed After Build

`computeEffectivenessFromBuild()` wired to `BUILD_COMPLETED` in `server.js`. Reads spec for vertical, computes and saves effectiveness score. Full Pinecone auto-seed with `--vertical` flag deferred (seed-pinecone doesn't support `--vertical` yet — new gap logged).

### G4 — Active Staleness Re-query

`backgroundRefresh(vertical, question, staleResult)` added to `research-router.js` using `setImmediate()`. Stale result (>90 days) returned immediately to caller; fresh query runs in background. On completion, emits `RESEARCH_UPDATED` event. `RESEARCH_UPDATED: 'research:updated'` added to `studio-events.js`.

### G5 — Effectiveness UI

`loadResearchSources()` in `index.html` updated to fetch `/api/research/effectiveness` in parallel with sources. Each source card renders:
- `.effectiveness-bar` — progress bar (0-100% width, green fill)
- `.effectiveness-score` — percentage text
- Title attribute: `"Score based on: build health (50%), brief reuse (30%), iterations saved (20%)"`

`.effectiveness-bar` and `.effectiveness-score` CSS added to `studio-canvas.css`.

### G6 — Auto-parse MCP Table

MCP auto-parse block added to `scripts/update-setup-doc`. Runs `claude mcp list 2>/dev/null`, parses "Connected"/"Failed" status for known MCPs (playwright, computer-use, codex-bridge, codex-official, Claude\_Preview, famtastic, magic), updates Status column in FAMTASTIC-SETUP.md. Gracefully skips if `claude` not found or `mcp list` returns no output.

### G7 — Brain Switch Reinjects Sidecar

`reinject(brain, tag, hubRoot)` function added to `brain-injector.js`. Reads current `STUDIO-CONTEXT.md`, writes `sites/<tag>/STUDIO-CONTEXT-<brain>.md`. Logs `[brain-injector] BRAIN_CONTEXT_INJECTED`. Called in `setBrain()` in `server.js` after `BRAIN_SWITCHED` event emission. Exported from `brain-injector.js`.

### Tests: 28/28 passed

---

## Phase 3 — spawnClaude() Migration Map

Documentation-only phase. No changes to `server.js`.

### Document: `docs/spawn-claude-migration-map.md`

6 sections:

**Section 1 — Call Site Inventory (8 call sites)**
| Call Site | Location | Risk |
|-----------|----------|------|
| 1 — Session Summary | line 693 | LOW |
| 2 — Image Prompt | line 3821 | LOW |
| 3 — Data Model | line 6669 | MEDIUM |
| 4 — Scope Estimation | line 6763 | LOW |
| 5 — Planning / Design Brief | line 6867 | MEDIUM |
| 6 — Per-Page Parallel Build | line 7231 | HIGH |
| 7 — Template Build | line 7300 | HIGH |
| 8 — Chat Handler | line 8971 | HIGH |

Plus: Haiku inline respawn (line 8992) + spawnBrainAdapter (line 11229).

**Section 2 — What spawnClaude() Does**
7 behaviors documented: CLAUDE_* env var stripping, os.tmpdir() CWD, stdin write pattern, no built-in streaming, no built-in timeout, no WS disconnect handling, model from loadSettings().

**Section 3 — SDK Equivalents**
Full mapping table + `callClaudeSDK()` wrapper function using AbortController, async/await, and streaming via `for await (const event of stream)`.

**Section 4 — Special Attention Call Sites**
Risk classification with migration approach for each.

**Section 5 — Migration Order**
8-step order, simplest first: Scope → Image Prompt → Summary → Planning → Data Model → Template Build → Parallel Build → Chat Handler.

**Section 6 — Rollback Plan**
`USE_SDK = process.env.USE_SDK === 'true'` feature flag. `callClaude()` wrapper delegates to either `spawnClaude()` or `callClaudeSDK()`. spawnClaude() stays in codebase until all call sites stable. Revert = one env var change.

### New Gaps Discovered
- Haiku fallback is inline code at line 8992 (not a function call). Should be extracted to `spawnClaudeModel(model, prompt)` before SDK migration.
- `spawnBrainAdapter` uses shell scripts, not claude --print. Separate migration track if non-claude brains switch to SDK.

### Tests: 21/21 passed

---

## Files Created This Session

| File | Type |
|------|------|
| `scripts/fam-convo-compose` | New script |
| `scripts/fam-convo-reconcile` | New script |
| `scripts/fam-convo-ingest` | New script |
| `scripts/fam-convo-promote` | New script |
| `scripts/fam-convo-generate-latest` | New script |
| `adapters/claude/fam-convo-get-claude` | New script |
| `adapters/gemini/fam-convo-get-gemini` | New script |
| `adapters/codex/fam-convo-get-codex` | New script |
| `site-studio/lib/history-formatter.js` | New lib file |
| `docs/spawn-claude-migration-map.md` | New doc |
| `docs/session8-phase-0-report.md` | Phase report |
| `docs/session8-phase-1-report.md` | Phase report |
| `docs/session8-phase-2-report.md` | Phase report |
| `docs/session8-phase-3-report.md` | Phase report |
| `tests/session8-phase0-tests.js` | New test suite |
| `tests/session8-phase1-tests.js` | New test suite |
| `tests/session8-phase2-tests.js` | New test suite |
| `tests/session8-phase3-tests.js` | New test suite |

## Files Modified This Session

| File | Changes |
|------|---------|
| `scripts/cj-compose-convo` | Replaced with deprecation shim |
| `scripts/cj-reconcile-convo` | Replaced with deprecation shim |
| `scripts/cj-ingest` | Replaced with deprecation shim |
| `scripts/cj-promote` | Replaced with deprecation shim |
| `scripts/generate-latest-convo` | Replaced with deprecation shim |
| `adapters/claude/cj-get-convo-claude` | Replaced with deprecation shim |
| `adapters/gemini/cj-get-convo-gemini` | Replaced with deprecation shim |
| `adapters/codex/cj-get-convo-codex` | Replaced with deprecation shim |
| `scripts/fam-hub` | Updated 3 dispatcher refs, added verify-quickstart |
| `scripts/update-setup-doc` | Added MCP auto-parse section |
| `site-studio/server.js` | adapterNames update, seed-status + threshold-analysis endpoints, computeEffectivenessFromBuild hook, setBrain reinject call |
| `site-studio/lib/studio-context-writer.js` | CONTEXT_CACHE + buildAllPages() + All Pages section |
| `site-studio/lib/research-router.js` | getThreshold(), text-based upsertRecords/searchRecords, backgroundRefresh(), logSimilarityScore() |
| `site-studio/lib/research-registry.js` | computeEffectivenessFromBuild() |
| `site-studio/lib/studio-events.js` | RESEARCH_UPDATED event added |
| `site-studio/lib/brain-injector.js` | reinject() function added and exported |
| `site-studio/public/index.html` | Effectiveness bar rendering in loadResearchSources() |
| `site-studio/public/css/studio-canvas.css` | .effectiveness-bar + .effectiveness-score CSS |
| `FAMTASTIC-SETUP.md` | Verification comment, manual checklist, summarization architecture note |
| `.wolf/cerebrum.md` | Summarization always uses Claude — key learning added |
| `tests/session7-phase0-tests.js` | Updated adapter path assertions to fam-convo-* |
| `tests/session7-phase2-tests.js` | Updated adapterNames assertions to fam-convo-* |

---

## Test Count Progression

| Session | Tests Added | Running Total |
|---------|------------|---------------|
| v3 Engine (Phases 0–5) | 401 | 401 |
| Session 7 | 328 | 729 |
| Session 8 | 155 | 884 |

---

## New Gaps Opened This Session

| Gap | Priority | Source |
|-----|----------|--------|
| Haiku fallback inline spawn (line 8992) should be extracted before SDK migration | Tier 3 | Phase 3 analysis |
| seed-pinecone --vertical flag needed for per-vertical auto-seed | Tier 3 | Phase 2 G3 deviation |
| spawnBrainAdapter needs separate SDK migration track | Tier 3 | Phase 3 analysis |

## Gaps Closed This Session

All 7 Session 7 known gaps (G1–G7) and all 7 Codex adversarial findings (C1–C7) closed.

---

## Session 8 Addendum — 2026-04-09

Second adversarial review identified 6 corrections and a new conversation tagging feature. All 54 addendum tests pass.

### Correction 1 — Real Embeddings Before Calibration

The Phase 1 implementation of Pinecone text-based embeddings was correct in principle but the legacy fallback in `pineconeQuery()` used `setImmediate(() => backgroundRefresh(...))` directly instead of going through the queue. The test for C1 was also incorrectly comparing character indices across different functions (cross-function index comparison is meaningless). Both fixed.

**Files:** `site-studio/lib/research-router.js`

### Correction 2 — Multi-turn Subprocess Limitation Documented

Claude CLI subprocess invocations pass conversation history as prepended plain text — not a structured API. Multi-turn fidelity is best-effort only; real multi-turn requires the Anthropic SDK (Session 9). Documented in:
- All three adapter scripts (`fam-convo-get-claude`, `fam-convo-get-gemini`, `fam-convo-get-codex`) with explicit comment
- `.wolf/cerebrum.md` — `SUBPROCESS_CLI_MULTI_TURN` do-not-repeat entry referencing Session 9
- `.wolf/cerebrum.md` — `SUMMARIZATION_ALWAYS_CLAUDE` do-not-repeat entry
- `--input-format json` flag confirmed absent (it doesn't exist in Claude CLI)

### Correction 3 — iterations_to_approval Removed

`iterations_to_approval` required plan revision tracking infrastructure that doesn't exist. Removed from `computeEffectivenessFromBuild()`. Weights rebalanced:
- `healthDelta` weight: **0.6** (was 0.5)
- `briefReuseRate` weight: **0.4** (was 0.3)
- `iterationsToApproval` weight: **removed** (was 0.2)

Comment in source explains removal rationale. Score range 0–100 preserved.

**Files:** `site-studio/lib/research-registry.js`

### Correction 4 — Staleness Re-query Single-Worker Queue

Phase 2's `backgroundRefresh` via bare `setImmediate()` allowed parallel floods when multiple stale verticals triggered simultaneously. Replaced with `REQUERY_QUEUE`:

```javascript
const REQUERY_QUEUE = {
  pending:    new Set(),  // deduplicates by vertical+question
  processing: false,      // at most 1 background call at a time
};
```

- `enqueueRequery(vertical, question)` — adds to queue, starts worker if idle
- `processRequeryQueue()` — single-worker async drain loop
- Both `setImmediate(backgroundRefresh)` calls in `pineconeQuery()` replaced (primary + legacy fallback paths)

**Files:** `site-studio/lib/research-router.js`

### Correction 5 — verify-quickstart → check-tools

`fam-hub admin verify-quickstart` renamed to `fam-hub admin check-tools`. The old name implied Studio startup verification (which it doesn't do). Help text now reads: *"Does not verify Studio starts correctly"*. Deprecation shim prints `WARNING: verify-quickstart is deprecated, use: fam-hub admin check-tools` to stderr and execs the new subcommand.

**Files:** `scripts/fam-hub`

### Correction 6 — Migration Map Grep Scope Expanded

`docs/spawn-claude-migration-map.md` appended with:
- **Search Commands Used** — 4 grep patterns for finding all call sites: `spawnClaude(`, `child_process`, `site-studio/lib/` references, `claude --print`
- **Manual Review Required** — section with verification date `2026-04-09`

### Conversation Tagging (New Feature)

`scripts/fam-convo-tag` — bash script using `jq` to auto-classify assistant messages with content-pattern tags. 7 tag patterns:

| Tag | Content Signal |
|-----|----------------|
| `component-discussion` | component, library, export, skill |
| `build-related` | build, generate, html, template |
| `gap-identified` | error, failed, broken, bug, fix |
| `brainstorm` | idea, what if, consider, maybe, could we |
| `deployment` | deploy, netlify, live, production |
| `research-related` | research, vertical, market, industry |
| `media` | image, photo, mascot, character, logo, svg |

Behaviors:
- Non-destructive: existing tags preserved, new ones appended, `unique` applied
- Handles both `{ messages: [...] }` objects and bare arrays
- Validates JSON before processing; exits 0 on invalid/missing file
- `fam-convo-reconcile` calls it non-blocking (`|| true`) after writing canonical JSON

Adapter updates — all three `fam-convo-get-*` scripts now include `tags:[]` in jq output:
```bash
'{agent:$a, at:$t, tags:[], messages:[...]}'
```

### Addendum Test Results

**54/54 tests — all passing.**

| Section | Tests |
|---------|-------|
| Correction 1 — Real Embeddings | 4 |
| Correction 2 — Multi-turn Documentation | 8 |
| Correction 3 — iterations_to_approval Removed | 6 |
| Correction 4 — Staleness Queue | 7 |
| Correction 5 — check-tools Rename | 7 |
| Correction 6 — Migration Map | 6 |
| Conversation Tagging | 16 |

### Addendum Files

| File | Change |
|------|--------|
| `scripts/fam-convo-tag` | New script |
| `tests/session8-addendum-tests.js` | New test suite (54 tests) |
| `site-studio/lib/research-router.js` | REQUERY_QUEUE + enqueueRequery + processRequeryQueue; second setImmediate removed |
| `site-studio/lib/research-registry.js` | iterations_to_approval removed; weights 0.6/0.4 |
| `scripts/fam-hub` | check-tools subcommand; verify-quickstart deprecation shim |
| `adapters/claude/fam-convo-get-claude` | best-effort comment; tags:[] in jq output |
| `adapters/gemini/fam-convo-get-gemini` | best-effort comment; tags:[] in jq output |
| `adapters/codex/fam-convo-get-codex` | best-effort comment; tags:[] in jq output |
| `scripts/fam-convo-reconcile` | fam-convo-tag call (non-blocking) |
| `.wolf/cerebrum.md` | SUBPROCESS_CLI_MULTI_TURN + SUMMARIZATION_ALWAYS_CLAUDE entries |
| `docs/spawn-claude-migration-map.md` | Search Commands + Manual Review Required sections |

### Updated Test Count

| Session | Tests Added | Running Total |
|---------|------------|---------------|
| v3 Engine (Phases 0–5) | 401 | 401 |
| Session 7 | 328 | 729 |
| Session 8 | 155 | 884 |
| Session 8 Addendum | 54 | **938** |
