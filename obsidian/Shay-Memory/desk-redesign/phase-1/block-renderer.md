---
title: Phase 1 — Block renderer + variants
date: 2026-05-29
phase: 1
label: block-renderer
permalink: shay-memory/desk-redesign/phase-1/block-renderer
---

## Built

`<BlockRenderer>` dispatcher + 9 typed Block variants for the Phase 1 chat
core. All wrapped in `FeatureBoundary` so a single bad payload can't take
the conversation down.

Each variant consumes its narrow `data` shape from the discriminated `Block`
union declared in `blocks/index.ts` (Phase 1 stand-in for the future
`shared/messages.ts` taxonomy — swap is a one-line re-export when that
module lands).

### Files

- `src/renderer/src/components/chat/BlockRenderer.tsx` — dispatcher with
  exhaustive `switch` over `block.kind`. Props: `{ block, messageId, index,
  onAnswer, onApprove }`.
- `src/renderer/src/components/chat/blocks/index.ts` — `Block` discriminated
  union + per-variant `*BlockData` shapes + barrel re-exports.
- `src/renderer/src/components/chat/blocks/ProseBlock.tsx` — markdown via
  `AgentMarkdown`; auto-collapses past 50 lines via `CollapsibleWrapper`.
- `src/renderer/src/components/chat/blocks/ToolCallBlock.tsx` — collapsed
  one-liner default (`→ name(args…)`); expand reveals input + output +
  duration.
- `src/renderer/src/components/chat/blocks/CodeBlock.tsx` — lazy-loaded
  `react-syntax-highlighter` (Prism / one-dark), copy works, run / save /
  open-in-editor are Phase 1 IPC stubs (`chat:code-block:*`). Auto-collapses
  past 30 lines.
- `src/renderer/src/components/chat/blocks/FileDiffBlock.tsx` — inline ↔
  side-by-side toggle, per-hunk accept / reject (stub IPC
  `chat:file-diff:hunk-decision`).
- `src/renderer/src/components/chat/blocks/ThinkingBlock.tsx` — hidden by
  default when `settings.appearance.thinkingHidden` (or absent — defaults
  hidden). Per-block override in header.
- `src/renderer/src/components/chat/blocks/TerminalBlock.tsx` — InteractiveBlock
  chrome (pop-out / send-to-right / collapse / copy). Capped at 360px with
  show-more. Subset ANSI converter handles 30-37 / 90-97 / bold / reset.
- `src/renderer/src/components/chat/blocks/AskUserBlock.tsx` — "Shay asks
  you something" with choice chips and/or freeform textarea. Routes via
  `onAnswer(blockId, answer)`.
- `src/renderer/src/components/chat/blocks/RunThisBlock.tsx` — command +
  cwd + Approve/Deny. Optional dry-run preview shown via `CollapsibleWrapper`.
  Routes via `onApprove(blockId, approved)`.
- `src/renderer/src/components/chat/blocks/MediaBlock.tsx` — image / audio
  / video / file. Image: click-to-fullscreen, OCR stub
  (`chat:media-block:ocr`).

### Constraints honored

- No `package.json` touched; only used deps already installed
  (`react-syntax-highlighter`, `lucide-react`, `zustand`, `react-markdown`).
- No files outside the declared ownership list created or modified.
- Imports stay relative (`../../../stores`, `../../boundaries`,
  `../../icons`, `../../AgentMarkdown`, `../CollapsibleWrapper`,
  `../InteractiveBlock.module.css`) — matches existing renderer style.
- TypeScript `strict` passes against `tsconfig.web.json` — only pre-existing
  i18n declaration-portability error (TS2742 in
  `src/shared/i18n/index.ts:332`) remains, untouched.
- Each block is wrapped in a `FeatureBoundary` so a malformed payload
  fails soft.
- IPC stubs all go through a safe `window.hermesAPI?.send?.(channel,
  payload)` pattern that no-ops when the bridge is missing — keeps Phase 1
  renderable in tests / Storybook without main process.

### Notes for downstream workflows

- `Block` union should be re-exported from `src/shared/messages.ts` when
  the workflow that owns the SSE event taxonomy lands it. Swap is a single
  `export type { Block } from "../../../../shared/messages"` line in
  `blocks/index.ts`.
- A peer workflow is creating `src/renderer/src/components/chat/InteractiveBlock.tsx`
  (the module.css is already in place). The block variants here intentionally
  use the same module.css classes directly rather than the wrapping
  component to stay decoupled. When the wrapper lands, individual blocks
  can migrate to use it without changing their public surface.
- ANSI converter is the conservative-correct subset described in the
  build plan; richer support (256-color, 24-bit) is a Phase 6 polish item.