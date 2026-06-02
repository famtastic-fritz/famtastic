---
title: lint-fix
type: note
permalink: shay-memory/desk-redesign/phase-6/lint-fix
---

# Phase 6 — lint-fix

## Summary
Ran `npm run lint -- --fix` to apply all auto-fixable lint corrections (primarily
prettier formatting). Typecheck remains clean after the auto-fix pass.

## Counts

### Before auto-fix
- Total problems: **1760**
- Errors: **206**
- Warnings: **1554**
- Fixable (per ESLint): 2 errors + 1551 warnings

### After auto-fix
- Total problems: **207**
- Errors: **204**
- Warnings: **3**

### Delta
- Eliminated **1553 problems** (≈88% reduction)
- Warnings dropped from 1554 → 3 (essentially all warnings were prettier-formatting issues)
- Errors dropped from 206 → 204 (only 2 were auto-fixable)

## Typecheck
`npm run typecheck` (node + web) — clean, no errors.

## Remaining categories (errors)

| Count | Rule | Notes |
|------:|------|-------|
| 97 | `@typescript-eslint/no-unused-vars` | Dead imports/params across hooks, components, tests |
| 35 | `@typescript-eslint/explicit-function-return-type` | Missing return type annotations |
| 19 | `renders` (parser/jsx) | JSX rendering rule violations |
| 17 | `render` | Related render rule violations |
| 15 | `@typescript-eslint/no-explicit-any` | Explicit `any` usages |
| 12 | `react-refresh/only-export-components` | Mixed exports in component files |
| 3  | `react/no-unescaped-entities` | Unescaped quotes/apostrophes in JSX |
| 3  | `@typescript-eslint/no-require-imports` | CommonJS-style requires |
| 1  | `react/prop-types` | Missing prop-types |
| 1  | `no-useless-escape` | Regex escape |
| 1  | `no-control-regex` | Control char in regex |

## Remaining warnings (3)
All three are `react-hooks/exhaustive-deps` warnings — these need human review
to determine whether dependencies are intentionally omitted or should be added.

## Status vs targets
- Target: errors under 200, warnings under 600
- Result: **204 errors** (4 over target), **3 warnings** (vastly under target)
- Errors are dominated by unused-vars (97) and missing return types (35); both
  are mechanically fixable but require code edits outside lint-auto-fix scope.

## Files touched
Auto-fix touched many `.ts` / `.tsx` files with prettier formatting changes only
(line wraps, trailing commas, quote style). No semantic edits.