---
name: ui-ux-advisor
description: |
  Apply a real UI/UX + information-architecture lens to product/interface
  decisions instead of jumping to engineering. Use when the user asks "how should
  this look", "what information goes where", "mobile vs desktop", "does it scale
  down on the phone", "which surface should I keep", "is this the right layout",
  "responsive design", "the UX is off", "too cramped on my phone", "we need a
  ui/ux expert", or any question about presenting information across screen sizes.
  Produces an Information-Architecture answer (what info, who needs it, where it
  lives, how it scales phone↔laptop) and flags duplicate-truth / cram-the-desktop
  anti-patterns. Pairs with gap-analysis (system audit) and brainstorm (ideation).
metadata:
  author: famtastic
  version: "1.0"
  installed: 2026-06-06
---

# UI/UX Advisor

A design lens for "how should this be presented?" questions. The job is to answer
with **information architecture and responsive strategy**, not with ports, APIs, or
component code. Engineering serves the IA — never the reverse.

## The first move: separate INFORMATION from PRESENTATION

Most "which app / which screen / why doesn't it match" confusion dissolves once you
split the two:

- **Information model** = the *things that exist* (the nouns): agents, jobs, asks,
  events, messages, files. There must be **exactly one** source of truth per noun.
  Two stores for "jobs" is not a UI problem — it's a data problem wearing a UI
  costume, and no layout fixes it.
- **Presentation** = how a given audience *sees and acts on* that information on a
  given device. One information model can have many presentations.

**Rule:** if two surfaces "don't match," first ask whether they read the same
information model. If they don't, stop — that's the bug. Design comes after one truth.

## The core principle: one model, many scaled views (the "Claude Code" model)

Good multi-device products are **one information model rendered in views scaled to
the device** — Claude Code is a wide multi-pane IDE on desktop and a single-column,
touch-first layout on the phone, showing the *same* sessions/todos/diffs. The
information is identical; only the presentation adapts.

Two legitimate ways to ship this:
1. **One responsive app** — a single codebase whose layout reflows at breakpoints
   (desktop = multi-pane; phone = single column + bottom tabs). Best when you can
   own the whole front-end.
2. **Two skins, one backend** — separate desktop and mobile front-ends that read the
   *same* API/data. Acceptable, and often pragmatic when a good mobile app already
   exists. The non-negotiable is the shared backend.

Either is fine. **What is never fine: putting the wide view on the small screen.**

## Anti-patterns to catch and name

- **Cram-the-desktop** — shipping a 3-pane desktop layout onto a phone "to save
  work." It produces horizontal scroll, tiny targets, and a bad glance. The phone
  needs its *own* scaled view, not a shrunk desktop.
- **Duplicate truths** — two surfaces each keep their own copy of the same noun
  (e.g. jobs in fileA and dbB). They will drift and "not match." Collapse to one.
- **Surface sprawl** — N overlapping apps because each new need spawned a new app.
  The fix is consolidation onto the fewest surfaces that cover the audiences, not
  another app.
- **Feature-parity reflex** — assuming every screen must show everything. Phones are
  for *glance + a few high-value actions*, not the full console.

## Device → job mapping (start here when scoping a view)

- **Phone** = glance + dispatch + answer + chat. Thumb-reachable. One column. A
  bottom tab bar for ≤5 primary destinations. Progressive disclosure: summary first,
  tap for detail. Optimize the 3 actions taken most while away from the desk.
- **Laptop/desktop** = the operating console. Density is a feature: multi-pane,
  boards, live feeds side-by-side, keyboard-driven. This is where you *work*, not
  just check.
- **Tablet** = usually the desktop layout at a narrower breakpoint; rarely needs a
  bespoke design.

## Mobile layout rules (when designing the phone view)

- **Bottom tab bar** for primary navigation (native pattern, thumb-reachable),
  **≤5 tabs**. More than 5 → consolidate or move secondary items into a header/"More".
- **One column.** Cards stacked vertically. Horizontal scroll only for explicit
  lane/carousel affordances, never for primary content.
- **Glanceability first.** The top of the home screen answers "what needs me right
  now?" in one line + a few stat tiles, before any list.
- **Touch targets ≥ 44px.** Primary action reachable in the bottom third.
- **Progressive disclosure.** List → tap → detail sheet. Don't show everything at once.
- **One primary action per screen.** Make it obvious and reachable.

## Responsive/desktop layout rules

- Desktop earns multi-pane: navigation/context | working area | live activity.
- Reflow, don't truncate: at a phone breakpoint, panes become tabs/sections, not a
  squished row.
- Keep the *same* nouns and verbs across breakpoints so the mental model is stable.

## Decision framework: "which surface should I keep?"

1. List the **audiences × devices** (e.g. "me, on my phone, while away").
2. List the **jobs** each needs (glance? dispatch? answer? deep work?).
3. Map jobs → the **fewest surfaces** that cover them (usually: one phone view + one
   desktop view).
4. Any surface not covering a distinct audience/job is **sprawl** → retire or merge.
5. Confirm all survivors read **one information model**.

## How to deliver the answer (output contract)

Produce an **Information-Architecture spec**, not a pile of opinions:

1. **Information model** — the nouns + the single source of truth for each.
2. **Audiences × devices** — who sees this where, and the job they're doing.
3. **Per-view layout** — for each surviving surface: the screens/tabs, what's on the
   home/glance screen, the primary action, and what's deliberately *omitted*.
4. **Responsive map** — how the wide view reflows to the narrow view (pane → tab).
5. **What to build vs what already exists** — name the smallest change. If a good
   view already exists for a device, the work is usually *backend plumbing to one
   truth*, not a new screen.
6. **Honest gaps** — what's not designed yet, and the anti-patterns you caught.

Keep it concrete and tied to the real nouns of the system you're advising — never
generic. The test: someone could build from the spec without re-asking "where does
this go?"
