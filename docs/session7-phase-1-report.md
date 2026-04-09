# Session 7 — Phase 1 Report: Universal Context File

**Date:** 2026-04-09  
**Tests:** 75/75 passing  
**Status:** ✅ Complete

---

## What Was Built

Phase 1 delivers a universal context file system — `STUDIO-CONTEXT.md` — that any AI brain (Claude, Gemini, Codex) reads at session start to understand the current working state of FAMtastic Studio.

### New Files

| File | Purpose |
|------|---------|
| `site-studio/lib/studio-events.js` | Singleton EventEmitter + 8 event constants (namespaced: `session:started`, etc.) |
| `site-studio/lib/studio-context-writer.js` | Generates `STUDIO-CONTEXT.md` on init and on every studio event |
| `site-studio/lib/brain-injector.js` | Injects STUDIO-CONTEXT.md into each brain's session |

### Modified Files

| File | Changes |
|------|---------|
| `site-studio/server.js` | 3 new requires, init block in `server.listen()` callback, 7 event emits, 2 new API endpoints |

---

## STUDIO-CONTEXT.md Sections

Generated file contains (in order):
1. `# FAMtastic Studio — Current Context` (title)
2. `## Generated:` (ISO timestamp)
3. `## Active Site:` (current TAG)
4. `## Event:` (event type that triggered the write)
5. `## Current Site Brief` — site name, description, industry (from spec.json)
6. `## Current Site State` — pages, deployed URL, last build timestamp, build status
7. `## Component Library` — total component count, 5 most recently updated
8. `## What We Know About This Vertical ({vertical})` — Pinecone research results (graceful degradation: placeholder if no API key or package)
9. `## Intelligence Findings` — promoted findings from `sites/{tag}/intelligence-promotions.json`
10. `## Available Tools (This Session)` — Claude Code (always), Gemini (env check), Codex (spawnSync which), Pinecone (env check)
11. `## Standing Rules` — 6 standing rules including TAG vs SITE_TAG, route order, library.json shape, etc.

---

## Event System (studio-events.js)

```
SESSION_STARTED    =>  'session:started'
SITE_SWITCHED      =>  'site:switched'
BUILD_STARTED      =>  'build:started'
BUILD_COMPLETED    =>  'build:completed'
EDIT_APPLIED       =>  'edit:applied'
COMPONENT_INSERTED =>  'component:inserted'
DEPLOY_COMPLETED   =>  'deploy:completed'
BRAIN_SWITCHED     =>  'brain:switched'
```

Singleton `studioEvents` EventEmitter with `setMaxListeners(20)` to prevent warnings.

The context writer subscribes to **all** events via `Object.values(STUDIO_EVENTS).forEach(...)`. Any studio event fires an async `generate()` call.

---

## Brain Injection Strategies (brain-injector.js)

### Claude Code
- Appends marker + `@STUDIO-CONTEXT.md` to `CLAUDE.md`
- Idempotent — checks for marker before writing; returns `{ action: 'already_present' }` on re-call
- Claude Code natively resolves `@`-file references in CLAUDE.md at session start

### Gemini + Codex
- Writes a sidecar file: `.brain-context-gemini` or `.brain-context-codex`
- Sidecar contains the absolute path to `STUDIO-CONTEXT.md`
- Adapters read the sidecar and prepend context to every prompt
- Returns `{ action: 'sidecar_written' }`

---

## Server.js Wiring

### Startup (server.listen callback)
Calls `studioContextWriter.init(...)`, injects context into all 3 brains, emits SESSION_STARTED.

### Event Emits Wired

| Event | Location in server.js |
|-------|----------------------|
| `SESSION_STARTED` | `server.listen()` callback + `startSession()` |
| `SITE_SWITCHED` | Both `/api/switch-site` handlers (existing + new site) |
| `BUILD_COMPLETED` | `finishParallelBuild()` |
| `EDIT_APPLIED` | `POST /api/content-field` |
| `DEPLOY_COMPLETED` | `runDeploy()` success handler |
| `COMPONENT_INSERTED` | `POST /api/components/export` |

### New Endpoints
- `GET /api/context` — returns `{ tag, generated_at, content }` from STUDIO-CONTEXT.md
- `POST /api/context/refresh` — triggers `generate('manual-refresh', { tag: TAG })`, returns `{ success, message }`

---

## Security Constraint: spawnSync Only

The security pre-tool hook blocks files containing `execSync` or shell-based exec patterns. The codex binary detection in `buildAvailableTools()` uses `spawnSync('which', ['codex'], { timeout: 1000, encoding: 'utf8' })` — no shell string interpolation.

---

## Pinecone Graceful Degradation

`queryPineconeVertical(vertical)`:
- Returns `null` if `process.env.PINECONE_API_KEY` is not set
- Wraps entire query in try/catch — returns `null` on any error (missing package, network failure, etc.)
- `generate()` converts `null` result to a plain-language placeholder

---

## Test Results

```
── studio-events.js ──────────────── 14/14
── studio-context-writer.js ─────────  5/5
── brain-injector.js ───────────────  18/18
── server.js wiring ────────────────  16/16
── All events trigger update ────────  22/22

Total: 75/75
```

---

## Known Gaps (Phase 1)

- `BRAIN_SWITCHED` event has no emit wired in server.js yet — Phase 2 will add it when the brain selector UI is built
- `BUILD_STARTED` event has no emit — could be added to the parallel build kickoff path; deferred
- Pinecone research section uses a zero-vector for Phase 1 placeholder queries — Phase 4 will replace with real embeddings
- `.brain-context-gemini` and `.brain-context-codex` sidecars written to `hubRoot`; adapters must be updated to read these (Phase 2 scope)
