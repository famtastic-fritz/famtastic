---
title: Phase 0 — Icons & Keyboard Shortcuts
date: 2026-05-29
phase: 0
label: icons-shortcuts
permalink: shay-memory/desk-redesign/phase-0/icons-shortcuts
---

## What was built

Lucide-react icon registry with a typed semantic-name vocabulary, an `<Icon>`
React component wrapping the registry with sensible defaults (16px, stroke 2),
a tinykeys-based keyboard shortcuts manifest with a `useShortcuts` hook, and a
vitest smoke test for the manifest.

## Files (all CREATE, additive, no existing files modified)

- `shay-desktop-electron/src/renderer/src/components/icons/registry.ts`
  - Exports `IconName` union (60+ semantic names including the 30+ called
    out in the Build Plan), `ICON_REGISTRY: Record<IconName, LucideIcon>`,
    and `isIconName()` type guard. TypeScript `Record` mapping forces every
    `IconName` to have a registry entry — adding a new name without a map
    entry is a compile error.
- `shay-desktop-electron/src/renderer/src/components/icons/index.tsx`
  - `<Icon name="..." size={16} strokeWidth={2} className="..." />` —
    resolves via the registry, forwards refs, memoized. Auto-sets
    `aria-hidden` when no `aria-label` is provided.
- `shay-desktop-electron/src/renderer/src/lib/shortcuts.ts`
  - Exports `SHORTCUTS` (readonly typed manifest with `id`, `keys`,
    `scope`, `description`, `defaultEnabled`, `category`), `useShortcuts`
    hook (tinykeys-backed, supports per-id override map for Settings →
    Shortcuts), `getShortcut`, `shortcutsByCategory`, and stable
    `ShortcutId` / `ShortcutScope` / `ShortcutCategory` types.
  - Defaults wired per Build Plan: `$mod+k` palette, `$mod+/` thinking,
    `$mod+Enter` send, `$mod+\\` sidebar toggle, `$mod+Shift+\\` hide
    sidebar, `$mod+f` chat search, `$mod+,` settings, `Escape` close
    overlay.
- `shay-desktop-electron/src/renderer/src/lib/shortcuts.test.ts`
  - Vitest smoke test: manifest is non-empty, ids unique, keys unique,
    every entry has description/scope/category/keys, all 8 Phase 0
    required ids present, `getShortcut` returns the right def,
    `shortcutsByCategory` partitions every shortcut exactly once.

## Notes / decisions

- Lucide-react 1.7.0 is installed in node_modules; tinykeys 3.1.0 likewise.
- Used `Record<IconName, LucideIcon>` so any name added to the union without
  a registry entry fails strict TS at compile time.
- `useShortcuts` calls `event.preventDefault()` + `event.stopPropagation()`
  on every fired binding — important inside an Electron renderer where
  `Cmd+F`, `Cmd+,`, `Cmd+K` would otherwise trigger browser defaults.
- Overrides plumbing exists in the hook signature (Phase 0 spec says "for
  Phase 0, just read defaults"). When the settings store lands, callers
  will pass `overrides={settings.shortcuts}` — no signature churn needed.
- No file outside the declared ownership scope was touched.