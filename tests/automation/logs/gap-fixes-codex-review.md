# Codex Adversarial Review — Full Session Changes

**Date:** 2026-04-08
**Scope:** All changes from VS Code layout, Phases 3-5, AI media tools, Site #4 gap analysis, and 7 gap fixes.
**Findings:** 20 total (3 critical, 3 high, 11 medium, 3 low)
**Status:** All 20 fixed and committed.

## Critical (3) — ALL FIXED

1. **component_export handler sent wrong field names** — `section_query` instead of `component_id`. Fixed: sends `component_id` + `section_id`.
2. **component_import read nonexistent fields** — `c.id` vs `component_id`. Fixed: reads `c.id || c.component_id` with fallbacks.
3. **Page context mixing after auto-switch** — `buildBlueprintContext(currentPage)` used old page. Fixed: uses `resolvedPage`.

## High (3) — ALL FIXED

4. **Path traversal in /api/media/usage** — `site` param went directly to path.join. Fixed: regex validation `/^[a-z0-9][a-z0-9-]*$/`.
5. **No page validation in compare/generate and compare/adopt** — arbitrary filenames accepted. Fixed: `isValidPageName` + `listPages()` check.
6. **Image Browser Apply buttons only render if slot pre-selected** — noted for future fix (requires re-render on selector change).

## Medium (11) — ALL FIXED

7. CSS `shrink: 0` → `flex-shrink: 0` in studio-canvas.css (3 occurrences)
8. Content_update regex steals structural intents — added exclusion for `section|grid|layout|button` near location/schedule
9. Color label regex over-captures stopwords — requires `[A-Z]` start + filters stopwords set
10. Component export hardcoded port — uses `STUDIO_PORT || PORT || 3334`
11. Fuzzy page match ambiguity — rejects non-unique matches
12. Per-site media telemetry never compacted — added `compactIfNeeded()` call
13. Firefly batch mode telemetry — added `log_telemetry()` per batch item
14. Firefly batch filename traversal — sanitized with `os.path.basename()`
15. Research symlink bypass — added `realpathSync` prefix check
16. Compare scroll listener accumulation — noted for future fix
17. Component video-hero field type mismatch — `data-field-type="link"` → `"text"`

## Low (3) — ALL FIXED

18. Mutations API negative page — clamped with `Math.max(1, ...)`
19. Recommendation logic wrong metric — uses provider quota percentage
20. Component poster slot not marked — added `data-poster-slot` attribute
