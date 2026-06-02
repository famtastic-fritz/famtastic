---
title: Phase 1 — InteractiveBlock primitives progress
date: 2026-05-29
tags:
- shay
- desktop
- phase-1
- chat-chrome
phase: 1-chat-core
label: interactive-block
permalink: shay-memory/desk-redesign/phase-1/interactive-block
---

## Scope shipped

Unified chat-chrome primitive family per Phase 1 build plan + spec §4
"Interactive block reusable pattern" and §6 right-panel chrome.

### Files created
- `src/renderer/src/components/chat/InteractiveBlock.tsx`
  Unified chrome with header (title + subtitle + action chips) and
  capped-height body with show-more.
  - Props: `title`, `subtitle`, `actions` (default
    `['pop-out','send-to-right','collapse','copy']`), `collapsed` (controlled),
    `defaultCollapsed`, `capHeight` (default 240), `onPopOut`,
    `onSendToRight`, `onCopy`, `onCollapsedChange`, `tone`
    (`'default'|'warn'|'danger'|'success'`), `ariaLabel`, `className`,
    `customActions`, `children`.
  - Imperative handle: `setCollapsed`, `focus`.
  - ESC collapses when region focused; Cmd/Ctrl+C copies block text when
    no native selection is active and `copy` is in `actions`.
  - Show-more affordance only renders when measured body overflows
    `capHeight` (ResizeObserver-backed).
  - Copy action falls back to `bodyRef.innerText` + `navigator.clipboard`
    when `onCopy` isn't provided.
  - Disabled chip state for pop-out / send-to-right when no handler given.
  - role="region", `aria-expanded` on collapse chip, `aria-controls` wired
    to the body's `useId()`-generated id, `aria-hidden` on collapsed body.
  - Honors `prefers-reduced-motion` via Phase 0 `useReducedMotion()`.

- `src/renderer/src/components/chat/PanelChrome.tsx`
  Thinner variant for right-panel content panes (Preview, Diff, Terminal,
  Files, Plan, Background tasks).
  - Props: `title`, `subtitle`, `actions`
    (default `['pin','pop-out','close']`), `pinned`, `onPin`, `onPopOut`,
    `onClose`, `ariaLabel`, `customActions`, `className`, `children`.
  - Pin chip uses `aria-pressed` + accent color when `pinned`.
  - Body fills container, scrolls internally.

- `src/renderer/src/components/chat/CollapsibleWrapper.tsx`
  Generic show-more / show-less wrapper for downstream block variants
  (ProseBlock, CodeBlock, ToolCallBlock).
  - Props: `collapsedHeight`, `defaultCollapsed` (default true),
    `revealLabel`, `collapseLabel`, `className`, `children`.
  - Auto-hides toggle when measured content height fits under
    `collapsedHeight` (ResizeObserver).
  - `aria-expanded` + `aria-controls`.
  - Honors `prefers-reduced-motion`.

- `src/renderer/src/components/chat/InteractiveBlock.module.css`
  Scoped styles for all three components. Consumes Phase 0 tokens
  (`--color-*`, `--space-*`, `--radius-*`, `--motion-*`, `--ring-*`,
  `--font-*`). Tone variants use `color-mix()` over `--color-warning-bg`
  etc. so warn/danger/success surfaces stay theme-correct in both light
  and dark. Reduce-motion override via `[data-motion="reduced"]`.

- `src/renderer/src/components/chat/index.ts`
  Barrel re-exports for the three primitives and their public types.

### Phase 0 modules consumed
- `components/icons` — `<Icon name=... />` for all chrome iconography
  (`pop-out`, `send-to-right`, `collapse`/`expand`, `copy`, `pin`,
  `close`, `chevron-up`, `chevron-down`).
- `styles/motion` — `useReducedMotion()` to gate `max-height` transitions
  and the copied-flash flash duration.
- `styles/tokens.css` — every color/space/radius/motion value flows
  through CSS vars; nothing hard-coded.

### Constraints honored
- Only the five owned paths were created. No edits to existing screens
  or imports.
- No `package.json` touched.
- TypeScript strict pass on the three new files (verified via
  `npx tsc -p tsconfig.web.json --noEmit` — only pre-existing errors in
  `chat/blocks/index.ts` remain, owned by the sibling block-variants
  subagent).
- Inline Tailwind / hardcoded colors avoided; tokens-only styling.

### Notes for downstream consumers
- `<TerminalBlock>`, `<AskUserBlock>`, `<RunThisBlock>` should all wrap
  their content in `<InteractiveBlock>` with appropriate tone
  (`ask-user` → `warn`/`info`, terminal exit-code != 0 → `danger`,
  success → `success`).
- The `customActions` slot is the extension point for variant-specific
  chips (e.g. AskUserBlock's "Approve"/"Reject", RunThisBlock's "Run").
- `PanelChrome` consumers in Phase 3 should call `onPin`/`onPopOut`/
  `onClose` against the `panels` Zustand slice; omitting any handler
  disables that chip rather than rendering a non-functional control.
- `CollapsibleWrapper` is the recommended primitive for the §4
  smart-collapse defaults — pair with the block-type heuristic table.