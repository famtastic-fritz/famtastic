# Session 10 Phase 0 Report
**Date:** 2026-04-10

## What Was Built

- **openai package** added to `site-studio/package.json` (^4.104.0 installed) and installed via npm
- **`site-studio/lib/model-config.json`** created — canonical model registry for claude, gemini, openai providers with model names and fallbacks
- **`site-studio/lib/api-cost-tracker.js`** updated — added `gpt-4o-mini` rate ($0.15 input / $0.60 output per million tokens); `gpt-4o` was already present
- **`site-studio/lib/brain-verifier.js`** created — startup verification module for all four brains (Claude, Gemini, OpenAI, Codex CLI); exports `verifyAllAPIs`, `getBrainStatus`, and individual per-brain verify functions
- **`site-studio/lib/adapters/codex-adapter.js`** rewritten — upgraded from CLI subprocess (`fam-convo-get-codex`) to OpenAI SDK; real multi-turn, streaming, and tool calling now enabled; `capabilities.multiTurn` and `capabilities.streaming` both `true`
- **`site-studio/server.js`** updated — requires `brain-verifier`, calls `verifyAllAPIs()` at server startup (after listen), adds `GET /api/brain-status` route (placed before parameterized routes)
- **`tests/session10-phase0-tests.js`** created — 12 test groups, 33 assertions total, all passing

## Test Results

**33/33 assertions passed across 12 test groups.** No failures.

## API Verification Results

All three APIs connected successfully with real keys:

| Brain   | Status    | Model              |
|---------|-----------|--------------------|
| Claude  | connected | claude-sonnet-4-6  |
| Gemini  | connected | gemini-2.5-flash   |
| OpenAI  | connected | gpt-4o             |
| Codex   | connected | OpenAI SDK via OPENAI_API_KEY (CLI also in PATH) |

## Perplexity Trigger Status

**Not triggered automatically.** Status in `research-registry.js` is `disabled`. It has an `enableCondition` documented as `'vertical not in Pinecone AND no manual research exists'`, but in `research-router.js` the `selectSource()` function only enables perplexity when `options.enablePerplexity === true` is explicitly passed by the caller AND `PERPLEXITY_API_KEY` is set. No code path currently sets `enablePerplexity: true` automatically for new/unknown verticals. This is a known gap — Perplexity is wired but requires manual opt-in per query.

## Deviations from Spec

- `gpt-4o` was already present in `api-cost-tracker.js` COST_PER_MILLION before this session; only `gpt-4o-mini` was added
- `verifyCodexCLI` uses `execFileSync` with `['which', ['codex']]` instead of `execSync('which codex')` to avoid shell injection (security hook enforcement)
- `CodexAdapter` constructor uses `apiKey: process.env.OPENAI_API_KEY || '__not_set__'` placeholder so the OpenAI SDK does not throw at construction time when key is absent — the adapter still warns and will fail at first call
- Test file contains 33 assertions (not a 1:1 mapping to 12 test groups; some groups have multiple related checks)
