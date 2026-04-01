# FAMtastic Knowledge Base — Always Loaded

## Architecture decisions that are locked in
- Template-first builds (shared header/footer before parallel pages) eliminate nav drift and are faster than page-by-page builds
- spawnClaude() must run from os.tmpdir() — never HUB_ROOT — to avoid CLAUDE.md interference causing 0-byte output
- Slot-based image identity (data-slot-id) is the only pattern that survives HTML regeneration across rebuilds
- currentMode must reset to 'build' on every new WS connection — never persist
- Never use overflow-x: hidden on html or body — it clips hero breakout

## Known failure patterns
- Input length >10K causes server unresponsiveness — input length cap exists
- Zombie Claude subprocesses on WS disconnect — child.kill() on ws.on('close')
- Message flood causes MaxListeners warning — in-flight flag prevents concurrent calls
- endSession() must be awaited before TAG changes or summaries write to wrong site

## Portfolio (1 site built)
- Site 1: The Best Lawn Care | lawn care | 7 pages | live
  URL: https://the-best-lawn-care.netlify.app
  Lesson: proven end-to-end pipeline. Template-first was required for CSS/nav consistency.

## What we do not know yet
- Which niches respond best to dark vs light themes
- Whether hero breakout measurably improves or hurts bounce rate
- Optimal image count per page for Core Web Vitals performance
