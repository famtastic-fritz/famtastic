# Session 8 Phase 3 Report — 2026-04-09

## What Was Done

Produced a complete spawnClaude() migration map document at `docs/spawn-claude-migration-map.md`. No code changes to server.js — documentation only per phase spec.

## Document Coverage

- **8 call sites** inventoried from server.js (lines 693, 3821, 6669, 6763, 6867, 7231, 7300, 8971)
- **2 additional** direct `spawn()` calls documented (Haiku fallback at 8992, spawnBrainAdapter at 11229)
- **13 call site entries** in Section 1 (covers primary + sub-calls within complex handlers)
- Section 2: 7 behaviors documented (env stripping, tmpdir CWD, stdin pattern, streaming, timeout, WS disconnect, model selection)
- Section 3: Full SDK equivalents table + SDK wrapper function code
- Section 4: All call sites rated by risk (3 HIGH, 2 MEDIUM, 3 LOW)
- Section 5: 8-step migration order (simplest first)
- Section 6: USE_SDK feature flag pattern with quick revert instructions

## Test Results: 21/21 passed

## What Worked First Try

All sections written from direct grep + read of server.js. All 21 test assertions pass.

## What Required Rework

None.

## Deviations from Prompt (with reason)

- The prompt said "search for any other subprocess spawning of claude" — found the Haiku fallback inline spawn at line 8992 (not a call to `spawnClaude()` but same pattern) and documented it in the inventory under Call Site 8's detail.
- The test counted 13 documented call sites vs. 11 actual `spawnClaude(` matches in grep. The discrepancy is because Section 4 also uses "### Call Site N" headers — they're subsections not additional calls. The test asserts `documented >= actual` which passes correctly.

## New Gaps Discovered

- **`spawnBrainAdapter` not covered by USE_SDK flag:** The brain adapter spawning function uses its own subprocess pattern (shell scripts, not claude --print). It will need a separate migration track if non-claude brains ever switch to SDK-based APIs.
- **Haiku fallback is inline code not a function:** The Haiku respawn at line 8992 duplicates most of `spawnClaude()` inline. This should be extracted to a `spawnClaudeModel(model, prompt)` helper before SDK migration to avoid migrating the same logic twice.
