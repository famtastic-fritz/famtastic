---
title: verify
type: note
permalink: shay-memory/desk-redesign/phase-0/verify
---

# Phase 0 — Verify Report

Date: 2026-05-29
Verifier: verify agent
Repo: `/Users/famtasticfritz/famtastic/shay-desktop-electron`

---

## 1. Typecheck

`npm run typecheck` → **FAIL** (3 errors total across node + web).

### Errors

| File | Line | Error | Phase 0 owner? |
| --- | --- | --- | --- |
| `src/main/skills.ts` | 271 | TS1005: `'try' expected.` | **NO — pre-existing unstaged edit on main** |
| `src/main/skills.ts` | 279 | TS1128: Declaration or statement expected. | **NO — same pre-existing edit** |
| `src/renderer/src/lib/errors.ts` | 86 | TS2322: `componentStack: string \| undefined` not assignable to `componentStack: string` on `AppError`. | **YES — owned by renderer `lib/` agent** |

### Diagnoses

- **`src/main/skills.ts:271,279`** — A prior unstaged refactor of `listBundledSkills()` extracted a `scanDir` helper but left the original `for (const category of categories)` block and trailing `} catch { ... }` orphaned at lines 237–273. The dangling `catch` has no matching `try`. This file was already broken before Phase 0 began (`git stash` of Phase 0 untracked files leaves the same parse error visible). Phase 0 **did not modify this file**. Resolve by either deleting the orphan block (lines 237–273) or restoring the file from `git HEAD`. **Pre-existing blocker, not Phase 0 regression.**

- **`src/renderer/src/lib/errors.ts:86`** — The `toRenderError` (or equivalent) builder constructs an `AppError` from a `React.ErrorInfo` whose `componentStack?: string | null` is optional, but the target `AppError.componentStack` is required-string. Quick fix: change the target type to `componentStack?: string` (or `componentStack: string | undefined`), or coalesce at the call site (`componentStack: info.componentStack ?? ""`). **Owned by the renderer-libs agent (Phase 0).**

---

## 2. Lint

`npm run lint -- --max-warnings=200` → **889 problems (178 errors, 711 warnings)**.

The bulk is project-wide pre-existing prettier formatting noise + a handful of `no-unused-vars` errors in unrelated tests. Not actionable for Phase 0 cleanup at this stage. The errors include unused imports in files Phase 0 did not author (e.g. `tests/...`, `src/main/installer.ts`-adjacent files). Phase 0 contributions are mostly clean by inspection.

Recommend deferring a lint sweep to a dedicated cleanup pass; do not gate Phase 1 on this.

---

## 3. Import sanity

`grep -rn "from '@/stores'" src/renderer/src` → **no hits**. Expected — Phase 0 only stubs stores; no caller imports them yet. Wiring happens in later phases.

---

## 4. File existence

All declared Phase 0 directories populated:

- `src/renderer/src/stores/` — 18 files (chat, composer, connection, customize, index, mode, model, nav, notifications, panels, sessions, settings, sidebar, slots, tabs, tasks, types, attachments)
- `src/renderer/src/styles/` — 5 files (README.md, density.ts, motion.ts, theme.ts, tokens.css)
- `src/renderer/src/components/icons/` — 2 files (index.tsx, registry.ts)
- `src/renderer/src/components/boundaries/` — 2 files (FeatureBoundary.tsx, index.ts)
- `src/renderer/src/lib/` — 3 files (errors.ts, shortcuts.ts, shortcuts.test.ts)
- `src/main/domains/` — 11 files (auth, capture, index, keychain, logs, mcp, notifications, panels, sessions, settings, tasks)

Additional untracked Phase 0 surface area: `src/main/settings-handler.ts`, `src/main/keychain.ts` + `keychain.test.ts`, `src/main/site-studio.ts`, `src/preload/domains.ts`, `src/renderer/src/screens/Studio/`, `src/shared/settings-schema.ts`.

---

## 5. Status

- ✅ All Phase 0 stub files landed in their declared homes.
- ✅ No `@/stores` consumers yet (expected — wiring is later).
- ⚠️ Lint dirty (889 issues, mostly pre-existing prettier drift).
- ❌ Typecheck fails: **1 real Phase 0 bug** (`src/renderer/src/lib/errors.ts:86` — `componentStack` nullability), **1 pre-existing bug** (`src/main/skills.ts` orphan `catch`).

---

## 6. Blockers for Phase 1

1. **MUST FIX BEFORE PHASE 1** — `src/renderer/src/lib/errors.ts:86` `componentStack` typing. Renderer-libs agent should mark the field optional (`componentStack?: string`) or coalesce at the call site. ~2-minute fix.

2. **Should fix soon (not strictly Phase 0)** — `src/main/skills.ts` orphan block at lines 237–273. The file was already broken on disk before Phase 0 began. Either revert with `git checkout -- src/main/skills.ts` (loses the scanDir refactor) or delete the dead block. Recommend the latter — but assign to whichever agent next touches main-process work.

Once both are resolved, `npm run typecheck` should pass cleanly and Phase 1 can proceed.