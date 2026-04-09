# Session 7 — Phase 2 Report: Brain Router UI

**Date:** 2026-04-09  
**Tests:** 62/62 passing  
**Status:** ✅ Complete

---

## What Was Built

Phase 2 wires Studio chat to route to the selected brain (Claude, Codex, or Gemini) instead of always calling Claude Code. A pill bar UI lets users switch brains in real time.

### New Files

| File | Purpose |
|------|---------|
| `site-studio/public/css/studio-brain-selector.css` | Brain selector pill bar styles |
| `site-studio/public/js/brain-selector.js` | BrainSelector module — select, sync, fallback display |

### Modified Files

| File | Changes |
|------|---------|
| `site-studio/server.js` | Brain state vars, `spawnBrainAdapter()`, `setBrain()`, `routeToBrainForBrainstorm()`, REST endpoints, WS handlers, handleBrainstorm enhancement |
| `site-studio/public/index.html` | Brain selector HTML, CSS link, JS script, WS handlers, onWsOpen hook |

---

## Brain State (server.js)

```javascript
let currentBrain = 'claude';
const BRAIN_LIMITS = {
  claude:  { dailyLimit: null, currentUsage: 0, status: 'available' },
  codex:   { dailyLimit: 40,   currentUsage: 0, status: 'available' },
  gemini:  { dailyLimit: 1500, currentUsage: 0, status: 'available' },
};
const sessionBrainCounts = { claude: 0, codex: 0, gemini: 0 };
```

---

## Brain Router Functions

### `spawnBrainAdapter(brain, prompt)`
Spawns the correct shell adapter (`adapters/{brain}/cj-get-convo-{brain}`) with the prompt via stdin. Returns a child process matching the `spawnClaude()` interface so callers are interchangeable. Falls back cleanly if adapter script doesn't exist.

### `setBrain(brain, ws)`
Sets `currentBrain`, emits `STUDIO_EVENTS.BRAIN_SWITCHED`, broadcasts `brain-changed` to all connected WS clients. Returns false for unknown brains.

### `routeToBrainForBrainstorm(prompt, brain)`
Main dispatch function:
1. Increments `sessionBrainCounts` and `currentUsage` for the active brain
2. Checks daily limit — if exceeded, marks status `rate-limited`, sends `brain-fallback` WS message, auto-falls-back to next available brain (Claude → Codex → Gemini)
3. Routes to `spawnClaude(prompt)` for Claude, `spawnBrainAdapter(brain, prompt)` for Codex/Gemini
4. On adapter failure, falls back to Claude and marks brain unavailable

---

## REST Endpoints

- `GET /api/brain` — returns `{ currentBrain, limits, sessionCounts }`
- `POST /api/brain` body `{ brain }` — sets active brain; 400 for unknown brains

---

## WS Message Types

| Type | Direction | Payload |
|------|-----------|---------|
| `set-brain` | Client → Server | `{ brain }` |
| `get-brain-status` | Client → Server | (none) |
| `brain-changed` | Server → Client | `{ brain, limits, sessionCounts }` |
| `brain-status` | Server → Client | `{ currentBrain, limits, sessionCounts }` |
| `brain-fallback` | Server → Client | `{ from, to, reason }` |

---

## Brain Selector UI

### HTML (above chat form in index.html)
```
#brain-fallback-bar     — amber warning bar, auto-dismisses in 6s
#brain-selector-bar     — flex container with label + 3 pills
  .brain-pill[claude]   — Claude (active by default, blue when active)
  .brain-pill[codex]    — Codex (green when active)
  .brain-pill[gemini]   — Gemini (yellow when active)
    .brain-status-dot   — green/yellow/red for available/rate-limited/unavailable
    .brain-cost-badge   — "Sub" / "API"
    .brain-msg-count    — hidden until non-zero session count
```

### JS Module (brain-selector.js)
- `BrainSelector.select(brain)` — highlights pill, sends `set-brain` WS message
- `BrainSelector.handleServerMessage(msg)` — re-renders pills on state sync, shows fallback bar
- `BrainSelector.onWsOpen()` — requests status sync 400ms after WS connect
- `window.selectBrain(brain)` — global onclick handler for pill buttons

---

## handleBrainstorm Enhancement

Two changes to `handleBrainstorm()` in server.js:

1. **STUDIO-CONTEXT.md injection:** Reads up to 80 lines of `STUDIO-CONTEXT.md` and appends as `studioCtxSection` at the bottom of the brainstorm prompt. This gives any brain — including Codex and Gemini — full awareness of the active site, vertical research, components, and standing rules.

2. **Brain routing:** Replaced `spawnClaude(prompt)` with `routeToBrainForBrainstorm(prompt)` so brainstorm uses the user's selected brain.

---

## Usage Limit Fallback

When a brain exceeds its daily limit:
1. `lim.status = 'rate-limited'`
2. Server sends `brain-fallback` WS message to all clients
3. Fallback order: Claude → Codex → Gemini → Claude (next day)
4. `#brain-fallback-bar` shows amber notification with auto-dismiss
5. Auto-fallback is opt-in (checkbox in fallback bar)

---

## Test Results

```
── Brain state ──────────────────────────  7/7
── Brain router functions ───────────────  11/11
── Brain REST endpoints ─────────────────  4/4
── Brain WS handlers ────────────────────  3/3
── handleBrainstorm context injection ───  4/4
── CSS file ─────────────────────────────  8/8
── JS file ──────────────────────────────  12/12
── index.html wiring ────────────────────  13/13

Total: 62/62 ✅
```

---

## Known Gaps (Phase 2)

- `routeToBrainForBrainstorm` only handles brainstorm routing — build/content-edit paths always use Claude via `spawnClaude`. Extending brain routing to builds is a Phase 3+ concern (non-trivial due to HTML_UPDATE parsing expectations).
- Codex and Gemini adapters require functioning CLI tools and API keys to produce real output; adapter failures fall back to Claude silently.
- Integration tests (browser-based) were not run in this automated suite — they require a live Studio server at localhost:3334.
- `BRAIN_SWITCHED` event triggers STUDIO-CONTEXT.md regeneration (via Phase 1 event subscription), but the new brain context won't be injected into existing adapters until next `brainInjector.inject()` call (startup only).
