---
title: virtualization
type: note
permalink: shay-memory/desk-redesign/phase-1/virtualization
---

# Phase 1 — virtualization worker

## Scope
Owned files (all created, none modified):
- `src/renderer/src/components/chat/VirtualMessageList.tsx`
- `src/renderer/src/components/chat/useStickToBottom.ts`
- `src/renderer/src/components/chat/MessageRowV2.tsx`
- `src/renderer/src/components/chat/VirtualMessageList.module.css`

## What was built

### VirtualMessageList.tsx
React-virtuoso wrapper that takes `messages: ChatMessage[]`, `isStreaming`,
and optional `renderBlock` / `onAnswer` / `onApprove` / `onDeny` /
`onJumpToMessage` callbacks. Key design choices:

- **Stable `itemContent`** wrapped in `useCallback` over only the callback
  identities so Virtuoso does not re-mount rows when the parent re-renders.
- **`followOutput`** returns `"smooth"` only while streaming AND the user is
  at the foot. Returns `false` when scrolled up so new tokens do not yank
  the viewport — this is the snapshot §4 "ScrollToBottomPill" semantics.
- **`computeItemKey`** is module-scoped so its identity never changes.
- **`initialTopMostItemIndex`** seeds the list at the tail for cold starts.
- **`increaseViewportBy` / `overscan`** tuned for ~200px top / 400px bottom
  to keep streaming-tail reflows cheap.
- Wrapped in a `<FeatureBoundary feature="message list" />` so a renderer
  crash inside any row falls back gracefully without nuking the surface.
- Renders the floating `<NewMessagesPill>` (component-local) when
  `pillVisible` is true; clicking it calls `jumpToBottom` then notifies
  `onJumpToMessage(tail.id)`.

### useStickToBottom.ts
Small hook returning `{ atBottom, pillVisible, jumpToBottom, onAtBottomChange }`.

- `onAtBottomChange` is the function passed to Virtuoso's
  `atBottomStateChange` prop. State lives here, not in the component.
- `pillVisible` flips `true` only when the message count grows while
  `atBottom` is false (uses a `lastSeenCountRef` to avoid spurious
  re-renders during unrelated updates).
- `jumpToBottom` calls `virtuosoRef.current.scrollToIndex({ index: "LAST",
  behavior: "smooth", align: "end" })`. Safe when the ref is null.
- Takes `messageCount` + `virtuosoRef` as inputs — deliberately decoupled
  from the chat slice so callers retain control over the "new" definition.

### MessageRowV2.tsx
v2 wrapper around (eventual) `<BlockRenderer>` that adds:

- User/assistant chrome: avatar (reuses existing `chat-avatar` /
  `chat-avatar-user` / `chat-avatar-agent` classes), role label
  (`ROLE_LABELS`), and a `<time dateTime>` timestamp.
- Per-block error boundary via `<FeatureBoundary scope="feature"
  feature="chat block (<kind>)">`. A crashing tool-call block does not
  take out the rest of the assistant message.
- **Decoupled from BlockRenderer**: takes an optional `renderBlock:
  RenderBlockFn` prop. The chat surface consumer wires the real
  `<BlockRenderer>` once the sibling Phase 1 worker lands it; until then
  the file ships a built-in `fallbackRenderBlock` that renders `prose`
  blocks as plain text and stamps unknown kinds with a small placeholder
  (`chat-block-placeholder`). This unblocks parallel work.
- **Memoization**: wrapped in `memo` with a custom `rowsAreEqual` that
  compares message identity, role, streaming flag, createdAt, blocks
  reference, and callback identities. The critical invariant: when a
  `usage_tick` arrives, the chat slice MUST allocate a new `blocks` array
  only for that one row — that way `Object.is` against the previous
  `blocks` reference yields true for every other row and they all skip
  re-render.
- Exposes a `BlockRenderContext` type (messageId, role, streaming,
  onAnswer, onApprove, onDeny) so concrete block variants can invoke row
  callbacks without prop-drilling.

### VirtualMessageList.module.css
Scoped via CSS-module but uses `:global(...)` selectors throughout so the
plain class names (`chat-virtual-list`, `chat-message-v2-*`, `chat-new-pill`,
`chat-block-prose`, `chat-block-placeholder`) work without binding through
TSX. Side-effect imported from VirtualMessageList.tsx so consumers do not
need to wire it manually. All values consumed via Phase 0 CSS-var tokens
(`--space-*`, `--color-*`, `--font-*`, `--motion-*`, `--ease-*`) so theme
switching is a single `data-theme` flip. Honors
`prefers-reduced-motion`.

## Compatibility notes

- **Did not modify** `screens/Chat/MessageList.tsx`, `MessageRow.tsx`, or
  the chat barrel `components/chat/index.ts`. The v1 path is untouched and
  still works.
- The v2 row deliberately does NOT consume the v1 `Attachment` /
  `ChatMessage` types from `screens/Chat/types.ts`. It uses the typed
  Phase 0 `ChatMessage` / `ChatBlock` from `stores/types.ts` (id, role,
  blocks, createdAt, streaming). This is the correct typed model per
  build plan line 33.
- Imports from Phase 0 surfaces only: `components/icons`,
  `components/boundaries`, `stores/types`. Plus the sibling
  Phase 1 file `MessageRowV2` and the hook `useStickToBottom` (both my
  ownership).

## Typecheck status

`npx tsc --noEmit -p tsconfig.web.json --composite false` produces ZERO
errors in my four files. The four remaining errors in
`components/chat/blocks/index.ts` (missing `TerminalBlock`, `AskUserBlock`,
`RunThisBlock`, `MediaBlock` modules) are pre-existing, owned by a
sibling Phase 1 worker.

## Open follow-ups (intentionally deferred)

- Hooking up the real `<BlockRenderer>` once it lands: the chat-surface
  consumer just passes `renderBlock={BlockRenderer}` to
  `<VirtualMessageList>`.
- 16ms coalescing buffer / 250ms `usage_tick` throttle (build plan §
  Phase 1 "SSE backpressure") belongs in the SSE pipe / chat slice
  updater, not the virtualization layer.
- ARIA "new message announced" patch (currently the `role="log"
  aria-live="polite"` on the scroller covers the basic case; finer
  control belongs in MessageRowV2 once block variants stabilize).
- Adding to `components/chat/index.ts` barrel — left to a follow-up so
  this worker stays strictly within "create only" ownership.
