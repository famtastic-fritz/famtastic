---
title: theme
type: note
permalink: shay-memory/desk-redesign/phase-0/theme
---

# Phase 0 — Theme + density + focus + motion tokens

**Label:** `theme`
**Status:** complete
**Date:** 2026-05-29

## What was built

A semantic CSS-variable design-token system plus typed TS helpers and
hooks that drive theme / density / motion / focus across the renderer.
Additive — none of the existing `--bg-*` / `--text-*` / `--accent`
palette in `src/renderer/src/assets/main.css` was modified, so existing
screens keep rendering identically while the new vocabulary is
available for redesigned shells, sidebars, slots, and panels.

## Files created

| File | Purpose |
|---|---|
| `src/renderer/src/styles/tokens.css` | Color / type / space / radius / shadow / z-index / motion / density / ring CSS vars. Light + dark palettes via `[data-theme="..."]`. `prefers-color-scheme` fallback for `[data-theme="system"]` / no attribute. `prefers-reduced-motion` + `[data-motion="reduced"]` override collapses motion to 0ms. Global `:focus-visible` style hook for every interactive role. |
| `src/renderer/src/styles/theme.ts` | Typed `Theme = "light" \| "dark" \| "system"` + `getStoredTheme` / `setStoredTheme` / `getSystemTheme` / `resolveTheme` / `getResolvedTheme` / `setTheme` / `initTheme` / `watchSystemTheme`. Persists via `THEME_STORAGE_KEY` (existing constant), writes `<html data-theme>`. |
| `src/renderer/src/styles/motion.ts` | `MOTION_DURATION` (instant/fast/base/slow/slower) + `MOTION_EASING` (linear/standard/emphasized/decelerate/accelerate) typed constants. `useReducedMotion()` hook watching both the OS pref and the `[data-motion]` attribute override, plus `useMotionDuration(token)` convenience hook. |
| `src/renderer/src/styles/density.ts` | `DENSITY` constants (`compact` / `comfortable` / `spacious`), `DENSITY_VALUES`, `DEFAULT_DENSITY`, `DENSITY_STORAGE_KEY`. `getStoredDensity` / `setDensity` / `initDensity` write `<html data-density>`. `useDensity()` hook subscribes to `storage`, an in-process `shay:density-change` CustomEvent, and `MutationObserver` on `<html>`. Comment in place that the hook body should swap to the Zustand `settings.appearance.density` slice when Phase 0 lands the store. |
| `src/renderer/src/styles/README.md` | Documents the token system, file map, loading order, reduced-motion pathways, density model, and focus-ring contract. |

## Key design choices

- **Additive, not replacing.** New `--color-*` / `--space-*` / `--font-*`
  semantic vocabulary layers on top of the existing legacy palette in
  `assets/main.css`. Both can be loaded side-by-side. The legacy palette
  stays the source of truth for existing screens until each is
  refactored.
- **Single attribute flip per axis.** Theme = `<html data-theme>`,
  density = `<html data-density>`, motion-reduce override =
  `<html data-motion>`. No JS re-render needed for color/density
  changes — only the attribute write.
- **`prefers-color-scheme` fallback.** Even if `<html>` has no
  `data-theme` (e.g. before `initTheme()` runs) or is explicitly set to
  `"system"`, the right palette is in place via media queries.
- **Reduced motion has two paths.** OS pref via
  `@media (prefers-reduced-motion: reduce)` collapses durations to 0ms
  automatically. `<html data-motion="reduced">` provides an explicit
  Settings → Appearance override. `useReducedMotion()` watches both.
- **Density hook is forward-compatible.** Today it reads localStorage;
  the JSDoc notes that when the `settings` Zustand slice lands, only
  the hook body changes — call sites stay identical.
- **Focus ring via `:where(...)`.** Zero specificity, so components
  opting out can override with a normal selector. Covers every ARIA
  interactive role plus native `input` / `button` / `[tabindex]`.

## Loading note for the integrator

`tokens.css` should be imported once from the renderer entry
(`src/renderer/src/main.tsx`) ahead of `assets/main.css`. The
integration phase (not this subagent's scope) is responsible for the
import statement and for calling `initTheme()` + `initDensity()`
during bootstrap so the right attributes are on `<html>` before first
paint.

## Out of scope (intentionally deferred)

- Wiring `tokens.css` into `main.tsx` (owned by the integration phase).
- Refactoring `components/ThemeProvider.tsx` to delegate to `theme.ts`
  (will happen when the redesign starts consuming the new helpers
  outside the provider tree).
- Migrating the legacy `--bg-*` / `--text-*` / `--accent` palette to
  the new `--color-*` vocabulary (deferred — per-screen during their
  individual Phase 2+ refactors).
- The `settings.appearance.density` Zustand slice (owned by the state
  subagent — `useDensity()` will be re-pointed once it exists).
- The Settings → Appearance UI surfacing the density/motion-reduce
  toggles (Phase 4).