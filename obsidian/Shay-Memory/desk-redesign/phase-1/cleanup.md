---
title: cleanup
type: note
permalink: shay-memory/desk-redesign/phase-1/cleanup
---

# Phase 1 — cleanup worker

## Scope
Owned files:
- `src/renderer/src/lib/errors.ts`
- `src/main/skills.ts`

## Fixes

### 1. `src/renderer/src/lib/errors.ts` (line 86 area)
`toAppError` returned `componentStack: value.componentStack ?? context?.componentStack`
which resolves to `string | undefined`. The `render` variant of the `AppError`
union requires `componentStack: string` (required). The file's existing
pattern (line 102) already coalesces with `?? ""` for the same field on the
fresh-Error branch, so I matched that pattern:

```ts
componentStack: value.componentStack ?? context?.componentStack ?? "",
```

This is the least-disruptive fix — no interface change, consistent with
the rest of the file.

### 2. `src/main/skills.ts` (lines 237–274)
`listBundledSkills` had been refactored to use a `scanDir` inner helper that
handles both `skills/` and `optional-skills/`. The two `scanDir(...)` calls
at the bottom were added, but the OLD inline scan body (a stray
`for (const category of categories)` loop plus the corresponding orphan
`} catch { /* ignore */ }`) was never removed. That orphan code lived
between the `scanDir` calls and the `return skills.sort(...)`.

I removed lines 237–274 (the orphan loop + its `catch`). The function now
runs `scanDir(...)` for both directories then returns the sorted skills.
Behavior intent is preserved — `scanDir` already does what the orphan loop
was trying to do, just deduplicated.

## Typecheck result
The three target errors are resolved:
- `src/main/skills.ts(271,5): error TS1005: 'try' expected.` — GONE
- `src/main/skills.ts(279,1): error TS1128: Declaration or statement expected.` — GONE
- The `errors.ts` componentStack assignability error — GONE

Remaining failures in `src/main/settings-handler.ts` (lines 72, 73, 74, 128, 129)
are PRE-EXISTING and OUTSIDE my ownership scope. They relate to a
`SettingsByGroup[G]` union narrowing problem and are unaffected by my
changes. Another worker owns that file.