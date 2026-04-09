# Session 7 — Phase 4 Report: Research Intelligence System

**Date:** 2026-04-09  
**Tests:** 76/76 (first run, zero failures)  
**Status:** ✅ Complete

---

## What Was Built

A modular, provider-agnostic research intelligence system that routes vertical research queries through a Pinecone-first caching layer with graceful degradation, effectiveness scoring, and a UI panel in the Intel tab.

---

## Files Created

### `site-studio/lib/research-registry.js`

Defines `RESEARCH_REGISTRY` — a flat object of 4 research sources:

| Key | Type | Status | Cost |
|-----|------|--------|------|
| `gemini_loop` | automated | active (when GEMINI_API_KEY set) | $0 |
| `build_patterns` | internal | active | $0 |
| `manual` | manual | active | $0 |
| `perplexity` | api | disabled (default) | $0.001/query |

Each source has: `name`, `type`, `status`, `costPerQuery`, `query()` function, `bestFor[]` array.

**Effectiveness scoring** persisted to `.local/research-effectiveness.json`:
- `saveEffectivenessScore(source, vertical, score)` — increments call count; if score 1–5, saves rating
- `getEffectivenessReport()` — returns array sorted by avg score descending
- `loadEffectivenessScores()` — reads from disk (used at module load)

### `site-studio/lib/research-router.js`

`queryResearch(vertical, question, options)`:
1. Calls `pineconeQuery(vertical, question)` — checks cache (0.85 cosine threshold)
2. If cache hit and not stale (< 90 days): returns `{ fromCache: true, ... }`
3. If stale: logs stale result as fallback candidate, continues to fresh query
4. `selectSource()` picks best source: build_patterns → manual → gemini_loop → perplexity
5. Calls source's `query()` function
6. `pineconeUpsert()` saves result to cache
7. `logResearchCall()` appends to `.local/research-calls.jsonl`
8. Returns `{ answer, source, fromCache: false, vertical, question }`

`rateResearch(source, vertical, score)` — validates score 1–5, calls `saveEffectivenessScore()`.

`selectSource(vertical, question, options)` — `forceSource` option respected; otherwise picks by availability.

### `scripts/seed-pinecone`

Node.js script (chmod +x). Seeds Pinecone index `famtastic-intelligence` from:
- `sites/*/spec.json` — brief summaries + design decisions
- `SITE-LEARNINGS.md` — sections as knowledge chunks

Vectors tagged `source: 'build_patterns'`. Namespace per vertical.

**Graceful degradation:** exits 0 with explanation if `PINECONE_API_KEY` not set. Always safe to run.

**Known gap:** All vectors use placeholder zero-vectors. Real `text-embedding-3-small` embeddings required for semantic similarity to function.

---

## Files Modified

### `scripts/fam-hub`

Added `research)` case with 4 subcommands:
- `seed-from-sites` → calls `scripts/seed-pinecone`
- `sources` → curls `GET /api/research/sources`
- `effectiveness` → curls `GET /api/research/effectiveness`
- `query <vertical> "<question>"` → curls `POST /api/research/query`

### `site-studio/server.js`

**Requires added:**
```js
const researchRegistry = require('./lib/research-registry');
const researchRouter   = require('./lib/research-router');
```

**Endpoints added** (registered BEFORE `/api/research/:filename` to prevent route shadowing):
- `GET /api/research/sources` — returns all sources from RESEARCH_REGISTRY with status, costPerQuery, bestFor
- `GET /api/research/effectiveness` — calls `getEffectivenessReport()`, returns effectiveness array
- `POST /api/research/query` — calls `queryResearch(vertical, question, options)`, returns result
- `POST /api/research/rate` — calls `rateResearch(source, vertical, score)`, validates and saves

**Route ordering fix:** Endpoints placed at line ~4811, immediately before the existing `/api/research/:filename` parameterized route. Without this, Express would match all `/api/research/sources` requests to `/:filename`.

### `site-studio/public/index.html`

**Research Sources Panel** added to Intel tab (`#canvas-intel`):
- `#research-sources-panel` — container
- `#research-sources-list` — source cards with status dots, cost badges, bestFor tags
- `#research-vertical-select` — dropdown for vertical selection
- `#research-question-input` — question text input
- `#research-query-result` — result display area

**JS functions:**
- `loadResearchSources()` — fetches `/api/research/sources`, renders source cards
- `runResearchQuery()` — posts to `/api/research/query`, shows result + fromCache badge
- Auto-load: `switchCanvasTab` patched to call `loadResearchSources()` when Intel tab opens

---

## Test Coverage

```
── research-registry.js ─────────────── 22 tests
── research-router.js ───────────────── 16 tests
── scripts/seed-pinecone ────────────────  8 tests
── fam-hub research subcommand ──────────  5 tests
── server.js research endpoints ─────────  8 tests
── index.html research panel ────────── 10 tests
                               TOTAL: 76/76 PASS
```

---

## Known Gaps Opened

1. **Zero-vector embeddings** — Pinecone seed uses placeholder vectors. Real semantic similarity requires `text-embedding-3-small` integration.
2. **90-day staleness not auto-re-queried** — detected but only re-queries if another call to `queryResearch` is made.
3. **Research effectiveness stars UI** — `POST /api/research/rate` endpoint exists; client-side post-build rating prompt not wired.
4. **seed-pinecone requires manual run** — no automation hook; must run `fam-hub research seed-from-sites` manually when key is set.
