---
permalink: shay-memory/desk-redesign/phase-3/composer
---

---
title: Phase 3 — Composer (label: composer)
date: 2026-05-29
phase: 3
component: composer
status: complete
---

# Phase 3 — Composer

## Files created (ownership)
- `src/renderer/src/composer/Composer.tsx`
- `src/renderer/src/composer/ComposerToolbar.tsx`
- `src/renderer/src/composer/triggers/TriggerPopover.tsx`
- `src/renderer/src/composer/triggers/SlashCommandsPicker.tsx`
- `src/renderer/src/composer/triggers/MentionPicker.tsx`
- `src/renderer/src/composer/triggers/ShellPreview.tsx`
- `src/renderer/src/composer/extensions/index.ts`
- `src/renderer/src/composer/Composer.module.css`

## Decisions

1. **Headless textarea, not TipTap.** Build Plan §5 schedules TipTap for
   Phase 6 polish; shipping a textarea now unblocks the rest of Phase 3
   (bottom row, media row, slot framework) with no dep on a heavy editor.
   The composer's public API (`onSend`, `onTrigger`, `onShellRun`,
   `setValue`/`getValue`/`focus`/`clear`) is stable so Phase 6 swap-in is
   mechanical.

2. **Trigger detection lives in `extensions/index.ts`.** Pure helpers
   (`detectTrigger`, `replaceTriggerWord`, `isInsideCodeFence`,
   `codeFenceNewline`, `sigilEnabledKey`) shared with the Phase 6 TipTap
   migration so both implementations honour the same word-boundary
   heuristic for `/`, `@`, `!` and the same code-fence indent rule.

3. **Caret-anchored popover via mirror-div measurement.** Textareas don't
   expose per-character bounding boxes; we render a hidden style-mirrored
   div, find the marker span, and translate its rect into viewport
   coordinates. No `floating-ui` dep. The popover auto-flips above the
   caret if it would overflow the viewport bottom.

4. **Single `<TriggerPopover>` primitive with three pluggable sources.**
   - `SlashCommandsPicker` — sources from `lib/command-registry`
     (Phase 2). Fuzzy filter prefers prefix → substring → keyword.
   - `MentionPicker` — tabbed Files / Skills / Agents / MCP Tools.
     Files via `window.hermesAPI.listProjectFiles?` when present; an empty
     placeholder ("Project file index not wired yet — Phase 5") otherwise.
     Skills / Agents / MCP entries come from `getCommandsByGroup`.
   - `ShellPreview` — renders the typed-after-`!` command in mono with an
     "Approve to send" button. Phase 5 wires the real run path.

5. **Keyboard model: textarea owns navigation.** Arrow/Enter/Escape/Tab
   stay on the textarea; the picker mirrors `activeIndex` and commits on
   mouse selection (`mousedown` to beat blur). This means the cursor never
   leaves the composer and IME composition is undisturbed.

6. **Send-key reads `stores/settings.general.sendKey`** with
   `DEFAULT_SEND_KEY = "enter"` per Spec §2 ("Enter sends, Shift+Enter
   newline"). `mod+enter` also supported. A `sendKeyOverride` prop covers
   tests.

7. **Edit-last via `useChatStore`.** Walks all tabs' messages and picks
   the highest-`createdAt` `user`-role message with a prose block. This
   is the bridge until the tabs slice exposes a canonical activeTab
   selector — at which point the read can be scoped without API change.

8. **Hover-edit ingest via `window` CustomEvent.** Listens for
   `shay:composer:compose-from` with `{ text: string }`. Past-message
   surfaces emit this; the composer fills, focuses, and moves the caret
   to the end. Keeps cross-feature wiring decoupled, in line with how
   `lib/command-registry` dispatches `shay:command:*` events.

9. **Code-fence detection is shallow.** Counts triple-backticks before
   the caret; odd → inside an open fence. Enter inserts a newline with
   the previous line's leading whitespace mirrored (auto-indent). The
   textarea swaps to a monospace font while inside a fence so the user
   gets immediate visual confirmation. Highlighting still belongs to
   the chat block renderer (per task scope).

10. **`<ComposerToolbar>` is opt-in.** Hidden by default per the build
    plan; render-prop children so future formatting/marks chrome doesn't
    require Composer changes.

## Public API

```ts
interface ComposerHandle {
  setValue(text: string): void;
  getValue(): string;
  focus(): void;
  clear(): void;
}

interface ComposerProps {
  initialValue?: string;
  disabled?: boolean;          // streaming → swap Send for Stop
  placeholder?: string;
  onSend: (text: string) => void;
  onAbort?: () => void;
  onTrigger?: (event: TriggerEvent | null) => void;
  onShellRun?: (req: ShellRunRequest) => void;
  leadingSlot?: React.ReactNode;
  sendKeyOverride?: SendKey;
}
```

## Verification

- `npx tsc -p tsconfig.web.json --noEmit` → zero errors in
  composer/Composer.tsx, ComposerToolbar.tsx, triggers/*, extensions/*.
  (Remaining errors are in sibling Phase 3 agents' files —
  composer/slots/*, composer/AttachmentChip.tsx, composer/CaptureToolbar.tsx,
  right/RightPanel.tsx — not in this label's scope.)

## Hand-off contract for sibling agents

- **bottom-row slot agent**: import `Composer` and pass it the `+/mic/mode/ctx/model`
  via `leadingSlot` only if a left-side cluster is needed. Slot strip lives
  OUTSIDE the Composer.
- **media row agent**: attachments are NOT owned here. Render the media row
  above the composer; the composer doesn't track files in Phase 3.
- **chat surface**: emit `shay:composer:compose-from` with
  `detail: { text }` from the hover-edit button on `MessageRow`.
- **shell run plumbing (Phase 5)**: subscribe to `onShellRun({ command,
  fullText })` and translate into a `RunThisBlock` request via the chat
  store. The composer keeps the typed text in place until the parent
  clears it (so users can edit and re-approve).

## Known gaps recorded

- Caret rect measurement is approximate inside hard-wrapped lines —
  acceptable for now; Phase 6 TipTap migration uses ProseMirror coords.
- `MentionPicker` Files tab is hidden behind `window.hermesAPI.listProjectFiles`
  feature detection. The IPC doesn't exist yet (Phase 5).
- `Agents` mention tab has no source yet; renders empty state.
- No fuzzy library — the picker uses a simple
  prefix→substring→keyword score. Good enough for the in-composer
  surface; the ⌘K palette already uses cmdk.