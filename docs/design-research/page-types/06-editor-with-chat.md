# Editor with Chat — Page-Type Brief

**Status:** draft for review (workstream `ws_research_editor_with_chat`, P1, plan_2026_05_05_workbench_per_page_design)
**Page type:** Editor with Chat
**Companion mockup:** `docs/design-research/page-types/06-editor-with-chat-mockup.html`
**Inherits:** `docs/design-research/cross-cutting/01-chrome-collapse.md`, `02-glass-slide-out.md`
**Related page types:** `02-creation-canvas.md` (Template/Page editor variants currently live there as a fallback — this brief is what promotes them out of Creation Canvas and into their own pattern.)
**Visual rulebook:** `docs/STUDIO-UI-FOUNDATION.md` §2 Night Scheme

---

## 1. Intent

> *"How do we handle the chats on each page? we have studio chat, shay shay?"* — Fritz, capture 2026-05-05

The Editor with Chat is the page type that answers a question Creation Canvas could not: when the artifact is *long-form content with structure* (a page, a template, a brief, a plan body), the operator wants two distinct conversational surfaces, not one.

The first is a per-page worker that does what it is told inside this single artifact — **Studio Chat**. The second is a cross-cutting partner that already knows the operator's empire and is reasoning about whether the artifact is any good — **Shay-Shay**. Both must be reachable. Both must feel different. The hardest design decision is what happens at the boundary: when does Studio Chat speak, when does Shay-Shay speak, do they coexist on the page, and is there an explicit handoff.

The user's expectation when entering an Editor with Chat page is: *I can edit the thing in front of me with my hands; I can ask for an inline change without leaving; and I can promote any question up to Shay-Shay if it crosses the boundary of this page.* The page must make that promotion path obvious — never hidden behind a menu — but never forced.

This page type is also where the platform earns the right to call itself a *creation platform with an assistant in it* rather than *a CMS with a chatbot bolted on*. If the two chats blur into one, FAMtastic reads as the latter.

---

## 2. The two chats — definitions

### 2.1 Studio Chat

**Scope.** A single page, a single artifact, a single editing session. Studio Chat does not know other sites, does not remember last week, and does not think about the brand at large. It thinks about *this page right now*.

**Lifetime.** Ephemeral. The transcript is pinned to the page (and recoverable if the user re-opens the same page within a session) but disappears from view when the operator navigates away. New page = new chat.

**Authority.** Allowed to write to the artifact directly. A Studio Chat instruction like "rewrite this hero section in a calmer voice" results in an inline edit applied to the editor canvas with a diff preview the operator can accept or reject. This is the surgical-edit path.

**Examples.**
- "Rewrite this hero section in a calmer voice."
- "Add a CTA below the second paragraph."
- "Tighten this paragraph by 20%."
- "Change the H1 to lowercase."
- "Move the contact form section above the gallery."

**Personality.** Quiet, terse, takes orders. No opinions unless asked. Uses the `--text-2` palette in the UI. No avatar — it is a *function* of the page, not a *being*.

### 2.2 Shay-Shay

**Scope.** The whole platform. She knows the current site, the active plan, recent runs, the memory store, the brief, the brand, and the other pages of this same site. She is the same Shay the operator knows from the Creation Canvas presence dot and from the Triage Workshop.

**Lifetime.** Persistent across pages, sessions, and surfaces. A conversation with Shay started on the RSVP page is still there when the operator opens the Schedule page.

**Authority.** Read-only by default with respect to the current artifact. Shay does not silently rewrite paragraphs; she *suggests* rewrites that the operator (or Studio Chat, on the operator's word) executes. Shay can spawn plans, file capture notes, and dispatch worker tasks in her own surfaces — that is her domain. The artifact stays the operator's.

**Examples.**
- "Is this hero on-brand?"
- "Do other reunion sites have a memorial section above the schedule?"
- "What did Fritz say about RSVP forms last month?"
- "Show me the proofs from yesterday's Shay Lite run."
- "Why did the previous build fail?"

**Personality.** Warm, opinionated, willing to push back. Has an avatar (the breathing teal orb). Speaks in the brand voice. Uses the warm-glow palette on her own messages.

### 2.3 Why two and not one

A single chat that did both jobs would (a) have to ask "are you talking to me about this page or about everything?" before every reply, (b) accumulate cross-cutting memory it shouldn't carry into a surgical edit, and (c) blur the authority line — the operator would not know whether typing a message will *change the page* or *think about the page*. Two chats keep that line bright.

---

## 3. Product references

### 3.1 Cursor — chat sidebar with @-mention to attach context

**Pattern.** Right-anchored chat sidebar (⌘+L). The composer accepts `@filename`, `@docs`, `@web` — each one *attaches* a context source to the next message. The sidebar is one chat, but the @-mention is the user's lever for changing what the chat *knows*.

**Adopt.** The `@shay` mention from inside Studio Chat as the canonical handoff verb. Typing `@shay` in Studio Chat does not switch panes — it *escalates the current message* to Shay and shows a notification chip in the rail with a link to her response.

**Reject.** Cursor's single-chat-with-context-mentions model. We need two separate transcripts because the personalities and authority levels differ.

### 3.2 Notion AI — inline + sidebar

**Pattern.** Two surfaces: an inline "Ask AI" button on selection (operates *on the selection*) and a sidebar Q&A (operates *on the workspace*). Notion does not blur them. The selection-bound surface writes; the workspace surface answers.

**Adopt.** The split-by-authority model verbatim. Studio Chat ≈ inline AI: writes to the artifact, scoped to the page. Shay ≈ workspace AI: knows everything, suggests rather than writes.

**Adopt.** Selection-triggered Studio Chat composer — selecting text in the editor canvas surfaces a glass mini-composer ("rewrite", "tighten", "@shay ask").

### 3.3 Codex Desktop — chat pane separate from editor

**Pattern.** A persistent chat pane (resizable, dockable) that survives across files and projects. The chat has its own memory and its own scrolling history independent of whatever file is open in the editor.

**Adopt.** Shay's right-rail tab is *that* pane in spirit — persistent, cross-file, cross-page. The operator can switch pages and Shay's transcript is still there.

**Reject.** Codex Desktop's chat is the *only* chat surface. We add Studio Chat as a second tab so the per-page work has its own home.

### 3.4 Linear — inline AI agent on issues

**Pattern.** An issue page has both a description editor and an in-line AI agent that can be invoked from the description menu. The agent edits the description directly, leaving an "edited by AI" trace.

**Adopt.** The diff-preview-then-accept pattern for any Studio Chat write. No silent edits — every change shows up as a reviewable diff in the canvas.

### 3.5 macOS Mail — VIP sender separation

**Pattern.** Mail visually separates VIP threads from regular inbox using a different surface treatment — same UI, different importance. **Adopt.** Shay's tab gets the warm-glow accent; Studio Chat's tab is cool-neutral. Same surface, distinct visual weight, so the operator knows at a glance which is speaking.

---

## 4. Layout spec

### 4.1 Frame

```
+----+--------------------------------------------------+----+
| IR | TOP BAR (44px) breadcrumb · save · cost · Shay• | TS |
| 56 +--------------------------------------------------+----+
| px |                                                  |    |
|    |               EDITOR CANVAS                      | RA |
|    |     (rich content, dominant, gutter 24px)        | IL |
|    |                                                  |    |
|    |                                                  |    |
|    |                                                  |    |
|    |                                                  | TS |
|    +--------------------------------------------------+    |
|    | bottom strip · model · save state · ⌘\ collapse  | 0  |
+----+--------------------------------------------------+----+
                                                       (closed)
                                                       420px
                                                       (open)
```

- **Icon rail (IR):** 56px. Same as every other page type.
- **Top bar:** 44px collapsed default. Breadcrumb on the left (`Sites / mbsh-reunion / rsvp.html`), Shay presence dot + save indicator + cost meter on the right. ⌘K hint in the center fades on idle.
- **Editor canvas:** Center column. Width fills viewport minus icon rail and right rail. Padding 24px horizontal, 32px top. Rich content editor with sectioned blocks (each block has a hover handle for "ask Studio Chat" and "ask Shay"). When right rail is closed, canvas reaches the right edge with 32px gutter. When right rail is open at 420px, canvas reflows — *unlike Creation Canvas, the editor canvas is allowed to be pushed* because long-form text needs predictable line length. This is a deliberate departure from §2 Glass Slide-Out's float-over rule, justified in §4.5 below.
- **Right rail:** 0 (closed) → 420px (open) glass slide-out. Two tabs at the top: **Studio chat** and **Shay**. Single transcript per tab. Cost ticker pinned to the bottom.
- **Bottom strip:** 28px glass status bar pinned bottom of the canvas column. Model in use, save state ("saved 2s ago"), ⌘\ collapse hint. Never carries actions.

### 4.2 Studio Chat surface

- **Lives in the right rail, tab 1.**
- **Composer pinned to the bottom** of the rail (above the cost ticker). Single-line input that expands on focus. Submit on ⌘+↵.
- **Selection mini-composer** appears as a glass pill above any selected text in the canvas: `rewrite · tighten · @shay ask · ✕`. Click `rewrite` opens the right rail with the Studio Chat tab focused and the selection prefilled in the composer with a `Selection: "..."` chip.
- **Diff preview.** Studio Chat replies with a proposed diff rendered *in the canvas* (not in the rail) as a glass overlay over the affected block. Two buttons: `accept` (warm) and `reject` (cool). The rail message shows a status line ("proposed an edit · awaiting review") with a click-to-jump anchor.
- **Visual weight.** Cool-neutral palette (`--text-1` for assistant messages on `--glass`). No avatar. Composer placeholder: *"do this thing on this page…"*.

### 4.3 Shay surface

- **Lives in the right rail, tab 2.**
- **Same geometry as Studio Chat** — composer pinned to bottom, transcript scrolls above. *Same surface, different tab.* This is the macOS Mail-style "same UI, different importance" choice.
- **Visual weight.** Warm-glow palette. Shay's avatar (breathing teal orb) appears next to her messages. Composer placeholder: *"ask Shay anything across the empire…"*.
- **Persistence.** Tab survives page navigation. Switching to the Schedule page and back to RSVP — Shay's transcript is intact. Studio Chat resets per page.
- **Cross-page references.** When Shay references another page or site, it renders as a glass chip with a click-through. She can also produce a "promote to plan" button that spawns a plan from the conversation.

### 4.4 The handoff between them

Two paths exist; both are explicit, never silent.

1. **Operator-initiated `@shay` from Studio Chat.** Typing `@shay` anywhere in a Studio Chat message routes that message to Shay instead of Studio Chat. The Studio Chat composer shows a chip *"sending to @shay…"* and the right rail tab strip flashes the Shay tab to draw the eye. The message lands in Shay's transcript with a context block: `From Studio Chat on rsvp.html — "<message>"`. Shay replies in her own tab. The operator can choose to switch tabs to read or stay in Studio Chat and see the badge count tick up.
2. **System-initiated escalation from Studio Chat.** If Studio Chat receives a request it cannot answer within its scope (e.g. "is this on-brand?" — that requires brand memory it doesn't have), it does *not* attempt a guess. It replies with one line: *"I can't help with that — this is a Shay question. [escalate to Shay]"*. The escalate button performs the same routing as the @-mention path.

The reverse direction (Shay → Studio Chat) is a *suggestion*, not an escalation. Shay can propose a concrete edit ("you should change the headline to X"); her message renders an `apply via Studio Chat` button. Clicking it sends the edit instruction into Studio Chat as a prefilled composer message, which the operator submits (or modifies first). Shay never writes to the artifact directly.

### 4.5 Why the rail pushes the canvas here (not floats)

Glass Slide-Out §2 says the rail floats over the canvas. The Editor with Chat is the documented exception. Long-form rich text needs a predictable measure (60–75ch for body copy) — a floating glass rail at 420px would obscure the right edge of every paragraph and break that measure unpredictably. So on this page type only:

- **Closed rail:** canvas occupies full available width.
- **Open rail:** canvas reflows to `viewport - 56 - 420 - gutters` and the rail occupies its own column. Glass treatment is preserved; the floats-over rule is not.

This exception is recorded as a note in `cross-cutting/02-glass-slide-out.md` (to be added in the consolidation pass) so future implementors do not "fix" what looks like a violation.

---

## 5. Modes

| Mode | Trigger | Top bar | Right rail | Notes |
|---|---|---|---|---|
| Editor only | ⌘\ or idle 8s with no rail interaction | 44px | Closed | Canvas full width. Save indicator visible. Bottom strip visible. |
| Editor + Studio Chat | Click Studio chat tab, click selection mini-composer, or ⌘J | 44px | Open, Studio chat tab active | Canvas reflowed. Selection chips highlighted. |
| Editor + Shay | Click Shay tab, click presence dot, or ⌘. | 44px | Open, Shay tab active | Canvas reflowed. Shay's transcript visible. |
| Editor + both (split) | Click the split toggle in the rail header (visible only in this mode) | 44px | Open, *both tabs visible as a vertical split* (Studio chat top half, Shay bottom half) | Explicit only — never auto-engaged. Each half has its own composer. Used when the operator is actively iterating with Studio Chat and consulting Shay simultaneously. |

Mode is mostly user-driven on this page type, unlike Creation Canvas where it is implicit. The operator typically settles on one of the four and stays there. The split mode is the rarely-used escape hatch for advanced sessions.

---

## 6. State map for chats

Both chat surfaces share a single state vocabulary:

| State | Composer | Transcript | Visual cue |
|---|---|---|---|
| idle | Empty, placeholder visible | Last messages visible | No accent |
| typing | Operator typing | Static | Composer border-hi accent |
| streaming | Locked | New assistant message rendering token-by-token | Cool teal pulse on the streaming message |
| done | Re-enabled, cleared | Full message visible, copy/regenerate actions on hover | None |
| error | Re-enabled, prior message preserved as draft | Error toast in the transcript with retry | Red-warm border on the failed message |
| awaiting-clarification | Re-enabled, the assistant's clarification question is the last message | Question rendered as a glass card with quick-reply chips | Warm pulse on the question |
| escalated-to-Shay | Studio Chat only — composer cleared, escalation chip in transcript | The user message is shown with a `→ @shay` annotation; Shay's reply lands in *her* tab, and a badge count appears on the Shay tab | Both: faint warm flash on the Shay tab when the escalation lands |

A Studio Chat message that produced a diff has an additional sub-state: `diff-pending` (operator has not yet accepted/rejected) → `diff-accepted` or `diff-rejected`. Visible in the transcript as a status line under the assistant message.

---

## 7. Surfaces this applies to

The Editor with Chat pattern applies to every long-form authored artifact in the platform:

1. **Sites > Template editor.** The shared template is rich-structured; Studio Chat does template-local edits, Shay reasons about what it implies for sites that use it.
2. **Sites > Page editor.** Per-page authoring (e.g. mbsh-reunion / rsvp.html). Studio Chat for the page; Shay for the site, brief, and brand.
3. **Brief editor.** Editing a captured brief. Studio Chat shapes the brief text; Shay cross-references prior briefs and proposes plan candidates.
4. **Plan composer (when added).** Editing a plan body, workstreams, acceptance criteria. Studio Chat does plan-local writes; Shay reasons about plan dependencies and history.
5. **Component editor in *author mode*.** When the operator is writing the description, intent, and usage notes of a component, this is Editor with Chat. (When sandbox-testing the component's runtime, that is Workshop / Sandbox — a different page type.)

Out of scope: per-page generation surfaces (those are Creation Canvas), Shay's own workspace (that is Triage Workshop), settings forms (that is Settings).

---

## 8. Acceptance criteria

An implementation passes review when:

1. **Two distinct chat surfaces exist on the same right rail** as named tabs (`Studio chat` and `Shay`), with the visual-weight distinction from §4.2/§4.3.
2. **`@shay` mention in Studio Chat routes the message to Shay's transcript** with a context block, and the Shay tab badges the new message. The Studio Chat composer never produces a Shay-style answer.
3. **Studio Chat writes via diff preview only.** No silent rewrites. Every write produces an accept/reject overlay in the canvas.
4. **Shay never writes to the artifact directly.** Her edit proposals always render an `apply via Studio Chat` button.
5. **Selection mini-composer works** on any text selection in the editor canvas with the three actions: rewrite, tighten, @shay ask.
6. **Right rail pushes the canvas** rather than floating over it, on this page type only. Documented exception is referenced in code comments.
7. **Studio Chat resets per page; Shay persists across pages.** Verified by navigating Sites / mbsh-reunion / rsvp → schedule → rsvp and observing transcripts.
8. **System-initiated escalation works** — Studio Chat replies with the standard one-liner and escalate button when a question is out of scope.
9. **Tokens come from STUDIO-UI-FOUNDATION.md §2.** No new colors, no new motion curves.
10. **Cites at least 2 product references in the implementation PR** per memory rule `every-page-type-design-must-cite-2-product-references.md`.
11. **Renders `06-editor-with-chat-mockup.html` to within visual parity.** No invented layouts.

---

## 9. Known gaps this brief opens

- **Cross-page Shay context API.** Shay needs a "what page is the operator on right now" subscription so her transcript can carry a *current_view* sidebar entry. Same gap noted in `02-creation-canvas.md` §8.
- **Diff-preview rendering library.** No existing component renders accept/reject overlays in the canvas. Component Studio gap.
- **Plan composer page does not yet exist.** This brief lists it as a target surface; the actual plan composer is a future build.
- **Split mode (editor + both chats) interaction.** Specced but not user-tested. Mark as experimental in the first implementation; instrument usage and prune if unused.
- **`@shay` autocomplete and discoverability.** The mention syntax must be obvious. First implementation should include a `@` palette in the Studio Chat composer that lists Shay as the only target — leaves room for future targets (`@codex`, `@gemini`) without redesign.
