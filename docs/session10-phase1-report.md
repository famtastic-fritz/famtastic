# Session 10 Phase 1 Report — Brain/Worker Split Selector

**Date:** 2026-04-10  
**Tests:** 12/12 passing

## What Was Built

### CSS (`site-studio/public/css/studio-brain-selector.css`)
Full rewrite with the Brain/Worker split layout system. New classes:
- `.brain-worker-panel` — outer container with flex-column layout
- `.bw-section-label` — small uppercase section headers ("Brain", "Workers")
- `.bw-pills-row` — horizontal pill row with wrapping
- `.brain-pill` — selectable API-backed brain pills with provider-specific `--brain-color` custom property (claude=purple, gemini=blue, openai=green)
- `.worker-pill` — display-only monospace CLI labels (non-interactive `<span>`)
- `.brain-status-dot` — status indicator with states: `connected`, `pending`, `failed`, `unavailable`
- `.brain-model-selector` — per-brain dropdown for model selection, absolutely positioned, toggled via `.open` class
- `.brain-model-option` — clickable model option with name + description
- Fallback bar styles preserved (`#brain-fallback-bar`)

### HTML (`site-studio/public/index.html`)
- Replaced old `#brain-selector-bar` (3-pill flat bar with claude/codex/gemini) with new `.brain-worker-panel`
- Brain section: 3 selectable buttons — Claude, Gemini, OpenAI — each with status dot, model tag, cost badge, and model selector dropdown
- Worker section: 3 read-only `<span>` elements — claude-code, codex-cli, gemini-cli — with permanently-green connected dots
- Model dropdowns wired with per-brain model options
- WS connect handler updated: `BrainSelector.onWsOpen()` → `BrainSelector.init(ws)` to pass socket reference
- WS message handler consolidated: brain-changed, brain-status, brain-api-status, brain-fallback all route through `BrainSelector.handleMessage(msg)`

### JS (`site-studio/public/js/brain-selector.js`)
Full rewrite. New features vs old:
- `init(ws)` — stores socket reference, fetches API status on connect
- `setModel(brain, model, optionEl)` — per-brain model selection, updates tag text, notifies server via `set-brain-model` WS message
- `toggleModelSelector(brain, event)` — opens/closes model dropdowns
- `handleMessage(msg)` — unified handler for all brain WS message types
- `getBrainModels()` — returns copy of per-brain model selections
- `_fetchAPIStatus()` — hits `/api/brain-status` HTTP endpoint on connect
- `_updateStatusDots(results)` — maps API status response to dot CSS classes
- `handleServerMessage()` preserved as alias for backward compat
- `onWsOpen()` preserved as alias, now triggers `_fetchAPIStatus`

### Server (`site-studio/server.js`)
- Added `openai` to `BRAIN_LIMITS` and `sessionBrainCounts`
- Added `ws.brainModels` per-connection state initialization (default models per brain)
- Added `set-brain-model` WS message handler — stores per-connection model preference, acks with `brain-model-set`
- Subprocess fallback status: now reads "Claude (subscription fallback) is generating..."
- SDK streaming status: now computes `brainLabel` from active brain + model → e.g., "Claude API (sonnet-4-6) is generating..."
- `routeToBrainForBrainstorm()`: added explicit `openai` branch that creates a child-process-like EventEmitter backed by `CodexAdapter` (OpenAI SDK)

### Adapter Factory (`site-studio/lib/brain-adapter-factory.js`)
- Added `case 'openai'` → `new CodexAdapter()` (CodexAdapter IS the OpenAI SDK adapter)
- Updated `supportedBrains` to include `'openai'`

## Architectural Decisions

1. **OpenAI brain uses CodexAdapter.** The existing `CodexAdapter` already wraps the OpenAI SDK with full multi-turn, streaming, and billing tracking. No new adapter needed — `openai` is just a named alias that creates a `CodexAdapter`.

2. **Worker pills are `<span>`, not `<button>`.** Workers are CLI processes managed by the fam-hub agent system, not selectable inputs. Making them non-interactive prevents accidental clicks and clearly communicates read-only status.

3. **Model dropdowns are client-side only.** `ws.brainModels` stores the selection per-connection for use in status messages. The actual model used for HTML generation is still controlled by `loadSettings().model` — the brain model selector affects brainstorm/chat routing, not site builds (build always uses Claude via the configured model).

4. **`/api/brain-status` HTTP endpoint used for status dots.** This endpoint was already implemented in Phase 0. `_fetchAPIStatus()` calls it on connect rather than waiting for a WS message, so dots update immediately on page load.

## Deviations from Spec

- The `brain-fallback-bar` `<label>` for "Auto-fallback" toggle was removed from the HTML since the new split panel replaces the old bar structure. The auto-fallback logic in `brain-selector.js` was not referenced by the new code and is not carried forward.
- `handleServerMessage()` is kept as a live alias (not removed) since `index.html` had existing references; both names now work.
- The `init(ws)` call replaces `onWsOpen()` in the WS connect handler, but `onWsOpen()` is preserved as a callable no-op alias for any external references.
