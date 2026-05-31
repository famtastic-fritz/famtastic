---
title: cleanup
type: note
permalink: shay-memory/desk-redesign/phase-2/cleanup
---

# Phase 2 — cleanup pass

Author: cleanup subagent
Date: 2026-05-29
Scope: 4 type/lint targets called out by the build plan.

## Targets and fixes

### 1. `src/main/settings-handler.ts` — TS2322 / TS2352 union-vs-intersection

**Root cause.** `SettingsByGroup[G]` where `G` is a generic `SettingsGroup`
widens to the *intersection* of all nine group shapes when used on an
assignment LHS and to the *union* of all nine group shapes on the RHS. TS
cannot reconcile the two across an indexed access. The original code tried
to bridge with single-step `as Record<string, unknown>` casts, which TS
correctly rejects because `DesktopAppSettings` (and friends) do not have a
string index signature.

**Fix.** Erase the type once at the storage boundary with a double-`unknown`
cast:

- In `loadFromDisk`, alias `merged` once as
  `Record<string, Record<string, unknown>>` and do the shallow-merge through
  that alias. The function returns `SettingsByGroup`, so the boundary is
  contained to a single local.
- In `setSettings`, perform the same double-`unknown` round-trip on
  `all[group]` and `patch`, then re-narrow the merged object via
  `as unknown as SettingsByGroup[G]` once.

No runtime behavior change. No schema change required.

### 2. `src/renderer/src/components/chat/VirtualMessageList.tsx:140` — unused `_isAtBottom`

**Fix.** Wired the parameter into the decision: Virtuoso passes a freshest
`isAtBottom` snapshot on every append, which is more current than the
debounced `atBottom` state from the hook. We now follow output if *either*
signal says we're at the foot. This makes the pill less likely to strand
during fast streams that race ahead of `atBottomStateChange` flushes.

### 3. `src/renderer/src/components/chat/blocks/TerminalBlock.tsx:34` — `no-control-regex`

**Fix.** The source literal contained a raw `0x1B` (ESC) byte inside the
regex (`/\x1b\[(\d+...)m/g`). Replaced the literal byte with the
JS hex escape `` (resolves to the same character at runtime) so the
regex no longer trips `no-control-regex`. Added a belt-and-suspenders
`// eslint-disable-next-line no-control-regex` directive directly above the
regex with a justification — ESC is exactly the byte the ANSI parser must
match.

### 4. `src/renderer/src/components/chat/useStickToBottom.ts:82` — `react-hooks-extra/no-direct-set-state-in-use-effect`

**Root cause.** The original effect called `setPillVisible` synchronously
when `atBottom` or `messageCount` changed. The new `react-hooks` lint rule
forbids setState in effects to push devs toward derived state.

**Fix.** Removed the effect entirely. Replaced the `pillVisible` state with
a **derived value** during render:

```ts
const pillVisible = !atBottom && messageCount > baselineCount;
```

`baselineCount` is a new piece of state advanced in event handlers only —
`onAtBottomChange(true)` bumps it to the latest count, and `jumpToBottom`
sets it to the latest count. Both handlers close over `messageCount`
directly with it included in `useCallback` deps; that does churn the
callback identity per-render, but Virtuoso treats `atBottomStateChange` as
a simple event prop (not a hot path), so the trade-off is fine and avoids
the React-Compiler `react-hooks/immutability` ban on prop-mirroring refs.

## Verification

- Node typecheck: ✅ clean (was 6 errors in `settings-handler.ts`).
- Web typecheck: ✅ clean.
- Lint pre: 1244 problems / 179 errors / 1065 warnings.
- Lint post: 1243 problems / 178 errors / 1065 warnings. Net **-1 error** —
  the `setState-in-effect` finding from `useStickToBottom`.
- Target files report no lint errors. `settings-handler.ts` and
  `TerminalBlock.tsx` have only pre-existing prettier nits unchanged in
  count.

## Files touched

- `src/main/settings-handler.ts`
- `src/renderer/src/components/chat/VirtualMessageList.tsx`
- `src/renderer/src/components/chat/blocks/TerminalBlock.tsx`
- `src/renderer/src/components/chat/useStickToBottom.ts`

`src/shared/settings-schema.ts` was read but not modified — the existing
field optionality was already correct; the bug was in the handler's casting
not the schema.