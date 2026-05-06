# Page Type 04 — Triage / Workshop (Shay-Shay's Own Page)

**Status:** draft for review (workstream `ws_research_triage_workshop`, plan `plan_2026_05_05_workbench_per_page_design`, P2)
**Companion mockup:** `docs/design-research/page-types/04-triage-workshop-mockup.html`
**Sibling brief (contextual Shay):** `docs/design-research/page-types/06-editor-with-chat.md`
**Predecessor mockup:** `docs/mockups/mockup-b-shays-workshop.html`
**Authority:** `docs/design-research/page-type-taxonomy.md` §1.4

---

## 1. Intent

This page is **Shay-Shay's own workspace** — a dedicated room she keeps inside the
Studio where bigger asynchronous tasks land, get triaged, get decomposed, get run,
and get reported back. It is the surface the operator visits when they want to
**send** Shay work, not when they want to **chat** with her about what's already
on screen.

The single sentence that drove this brief, from the 2026-05-05 capture:

> "Shay shay which is its own thing, its a work shop, where we send bigger task to be triaged. how does that look"

That distinction — *send work, then come back* — is the whole reason this page
exists. Everywhere else in the Studio Shay shows up as a contextual companion:
the right-rail glass orb on a Creation Canvas, the ambient observer on the Brief
editor, the second voice on a Sites editor pane. That is **contextual Shay**.
She watches the artifact on screen, she answers questions about it in real time,
and she disappears the moment the user does not need her. She does not own her
own page in those modes — she is a guest on someone else's.

The Triage / Workshop page is the inverse. Here the artifact *is* the queue of
tasks Shay is responsible for. The operator arrives without a piece of work in
mind; they arrive to see **what Shay is doing for them across the empire**.
Linear-inbox is the right mental model: a triage list on the left, a primary
working column in the middle, handoff handles on the right. The conversation
surface is secondary — it lives where it makes the work visible, not where it
makes the chat pretty.

This page is also where the **escalation contract** with the other agents
lives. When a task is too big for Shay alone — a refactor that needs Codex, a
research dive that needs Gemini, a decision that needs the operator — the
handoff handles on this page are how that happens. Without this page, those
handoffs would have to live as one-off chips in contextual Shay, which would
clutter every other surface in the Studio.

---

## 2. Product references

Per memory rule `every-page-type-design-must-cite-2-product-references.md`,
this brief cites four references plus the existing internal mockup.

**1. Linear Inbox.** The single best reference for the layout. Triage items as
a left-rail list, the selected item as a structured detail in the middle,
status / assignment / actions on the right. The operator can move through 30
items in 60 seconds because every item is rendered in the same skeleton. We
adopt: the three-column ratio, the keyboard-first navigation, the per-item
state badge in the list, the "snooze / done / handoff" affordances at the top
of the detail. We diverge: the middle column has to show **agent reasoning +
in-flight sub-tasks**, not just a description and comments.

**2. LangGraph Studio (and CrewAI's task dashboard).** The right reference for
how to visualize an agent's **decomposition tree**. LangGraph renders nodes for
each step the graph executes, with state pills that update live. CrewAI does
something similar with its task / sub-task / agent / tool tree. We adopt: the
nested tree of decomposed sub-tasks, the per-node state pill, the live cost
meter that ticks as nodes complete. We diverge: we are not exposing the graph
authoring surface — Shay decomposes; the operator does not edit the graph.

**3. Cursor's Agent panel.** The reference for **handoff between agents and
the operator**. Cursor's agent runs autonomously, then surfaces a "needs
review" state with a clear diff and explicit accept / reject / refine buttons.
We adopt: the explicit `awaiting-clarification` state with operator-facing
chips ("answer Shay's question," "approve & continue," "kick back," "park").
We diverge: we surface the cost meter alongside, because Shay's tasks are not
free.

**4. Asana Inbox.** The reference for **the inbox shape itself** — the
left-column triage list with sender, age, badge, and one-line summary.
Decades-validated UX for "I have N things in front of me; I need to triage them
fast." We adopt: row density, age-stamp formatting, the read/unread
distinction. We diverge: items are not from people, they are from systems
(captures, plans, intelligence promotions, operator dispatches, scheduled
jobs), so the sender column is a typed icon, not an avatar.

**5. `docs/mockups/mockup-b-shays-workshop.html` (existing internal).** This
mockup already proved a lot of the vocabulary: tool rail on the left, bench
in the middle showing original + attempts, docked chat on the right, job queue
as a real horizontal strip with durations and costs, status bar showing the
return path. **What works and we keep:** the bench-with-artifact pattern,
the "Handoff from / Return path to" framing in the header and footer, the
job queue as a real line-by-line ledger with `lib/job-queue.js` provenance,
the cool-tone Shay orb pulsing when she's thinking, the pinned chat as the
narrating channel rather than the primary surface. **What we change:** that
mockup is a single-task workspace (one image refinement); this page has to
work as a **multi-task triage room** where the operator picks which task to
expand. The bench in this brief shows the *currently expanded* task; the
queue list to its left is the rest of Shay's plate.

---

## 3. Layout spec

Six regions, top to bottom and left to right. All measurements are token-based;
no hard pixels other than the icon rail width which is fixed at 56px per the
freeze.

**Region A — Icon rail (56px, far left).** Standard Workbench icon rail. Per
R3 (`each-domain-gets-its-own-coherent-icon-set.md`) and R-icons-over-text,
Shay-Shay's icon is the cool-teal orb glyph. Honoring the constraint that
**Shay is not a domain**, this page is reached as a special invocation surface
inside the Admin / Ops domain — the Shay icon in the rail is a *companion
glyph* that toggles into her workspace from anywhere, not a peer to Sites /
Brain / Plans / Components / Media / Intel / Admin. (Justification: making
Shay a 7th domain would imply the empire has seven peer concerns; Shay is a
verb that runs across all six. The icon rail companion treatment matches that
mental model.)

**Region B — Triage queue (left column, ~280px).** A scrolling list of every
task currently on Shay's plate. Each row: typed-source icon (capture / plan /
promotion / dispatch / schedule), one-line title, age, state pill (see §4),
cost-so-far chip. Sorted by state-then-age by default; filterable by state
and source. Selected row gets the cool-teal accent border. The list is
keyboard-navigable (j/k, ↑/↓, enter to expand).

**Region C — Active triage workspace (center, fluid).** The currently-selected
task expanded. Top of the workspace: title, source-of-truth link (back to the
capture / plan that spawned it), state, age, accept-criteria. Below: **Shay's
working notes** — a structured panel where she shows what she has understood
about the task in her own words ("here is what I think you're asking; here is
what I'm planning to do"). Operators read this to verify she has the intent
right before she burns budget.

**Region D — Decomposition tree (inside Region C, expandable).** When the task
has been broken into sub-tasks, this panel renders them as a nested tree. Each
node shows: sub-task name, assigned executor (Shay herself / Codex / Gemini /
operator), state pill, duration, cost. Nodes are click-to-expand for their own
notes and proof. This region is hidden when the task is still in
`acknowledged` or `decomposing` and there's no tree to show yet.

**Region E — Run trace + cost meter (right column, ~340px, top half).** A
streaming strip of every event in the task's history: prompts sent, tool
calls, file writes, sub-task spawns, model switches, retries. Each entry is
timestamped and cost-stamped. The cost meter at the top of this column shows
the rolling total for this task and the rolling total for Shay's session.
This is the audit trail — it has to be skimmable, not chatty. Borrows the
job-queue row format from `mockup-b-shays-workshop.html`.

**Region F — Report-back surface (right column, bottom half).** Shay's draft
of the answer she intends to return. Plain prose with structured fields where
appropriate (links to artifacts, before/after diffs, recommended next steps).
This is what the operator approves or kicks back. Below the draft: the
**handoff handles** — `Approve & promote`, `Kick back with note`,
`Park`, `Escalate to Codex`, `Escalate to Gemini`, `Hand to operator`. These
chips are the formal escalation contract.

The **glass slide-out for contextual Shay does not appear on this page.**
This is her room; she has full presence in regions C, D, E, F. The right rail
glass is reserved here for the run trace and report-back, not a chat orb.

---

## 4. State map for triaged tasks

A triaged task moves through this state machine. State labels are exact —
they are the same strings the queue badge, the row pill, and the trace events
use, so they can be filtered as one.

```
submitted ─▶ acknowledged ─▶ decomposing ─▶ running ─▶ done
                  │                │            │
                  ▼                ▼            ▼
            awaiting-clarification ◀──────────┘
                  │
                  ▼
            (back to running, or)
                  │
                  ▼
              handed-off ─▶ (returns as a new submitted task from the handoff target)
                  │
                  ▼
               failed (terminal)
```

- **submitted** — the task arrived. Shay has not opened it yet. (Source could
  be a capture promotion, a plan task, an operator dispatch from another page,
  a scheduled job, an intelligence promotion.)
- **acknowledged** — Shay has read it and written her working notes. No work
  has been done yet. The operator can sanity-check intent here cheaply.
- **decomposing** — Shay is breaking the task into sub-tasks. Decomposition
  tree is being constructed. No executor work has started.
- **running** — at least one sub-task is in flight. Cost meter is ticking.
- **awaiting-clarification** — Shay needs the operator to answer something
  before she can continue. Surfaces a prompt in the report-back panel and a
  badge on the row.
- **done** — terminal success. Report-back is the final answer, ready to
  approve & promote.
- **failed** — terminal failure. Report-back contains what was tried and why
  it stopped. Failure is a first-class outcome; it is logged, not hidden.
- **handed-off** — Shay decided this needs Codex / Gemini / the operator.
  The original task closes; a new `submitted` task appears in the relevant
  agent's queue (or in the operator's inbox).

State transitions are emitted as trace events into Region E so the operator
can replay a task's life.

---

## 5. Relationship to contextual Shay

| Aspect | Contextual Shay (06-editor-with-chat) | Triage Workshop Shay (this page) |
|---|---|---|
| Where she lives | Right-rail glass slide-out on every other page | Owns the whole page (regions B–F) |
| Who initiates | The operator, with a question about what's on screen | The system, when a task is enqueued for her |
| Time horizon | Synchronous — answers in seconds | Asynchronous — runs may take minutes / hours |
| Visible artifact | The thing on the operator's canvas right now | A list of in-flight tasks across the empire |
| Output | Inline answer + chips to act on the canvas | Structured report-back the operator approves |
| Cost surface | Hidden (it's a conversation) | Always visible (it's a budget) |
| Handoff | She suggests; the operator clicks | She formalizes; the handoff handles fire |
| Color | Cool teal `#6FE0D2` glow on the orb | Same cool teal, applied to row accents and the report-back border |

**How a contextual question becomes a workshop task.** Inside contextual Shay,
when the operator asks something that would take longer than a few seconds or
costs more than a small budget, Shay surfaces a `Send to Workshop` chip
instead of answering inline. Clicking it enqueues a `submitted` task on this
page with the conversation snippet as the source-of-truth payload, then
collapses the right-rail orb. The operator can keep working; the orb pulses
gently when the workshop task changes state, and a one-line toast appears
when it reaches `done` or `awaiting-clarification`. The **return path** is
exactly the pattern proven in `mockup-b-shays-workshop.html`'s status bar.

---

## 6. Acceptance criteria

A Triage / Workshop implementation is acceptable when all of the following hold:

1. The page is reachable via the Shay companion glyph in the icon rail from
   any other page, and via direct URL.
2. Region B (queue) renders every task with the correct state pill and source
   icon, and supports keyboard navigation (j/k or ↑/↓, enter to expand).
3. Region C (workspace) renders Shay's working notes as the first thing the
   operator sees after they expand a task — not the decomposition tree,
   not the trace, not the chat.
4. Region D (decomposition tree) renders nested sub-tasks with executor,
   state, duration, and cost on every node. Hidden when there is no tree.
5. Region E (run trace) streams events in real time; each event is timestamped
   and cost-stamped; the cost meter tallies both task and session.
6. Region F (report-back) shows Shay's draft plus the six handoff handles
   (`Approve & promote`, `Kick back with note`, `Park`, `Escalate to Codex`,
   `Escalate to Gemini`, `Hand to operator`). Every handle fires a real
   transition — none are decorative.
7. State transitions emit trace events; the state machine in §4 is honored
   exactly (no invented states, no skipped states).
8. Contextual Shay's `Send to Workshop` chip enqueues a `submitted` task here
   and the return-path toast fires on terminal state changes.
9. Cool-teal accent (`#6FE0D2`) is used on all Shay surfaces per the freeze;
   no gold/copper warm tones from the original mockup leak into Shay
   chrome on this page.
10. The page honors R-chrome-collapses-when-creating: when the operator
    expands a task and starts typing in the report-back surface, the queue
    column (Region B) collapses to a 56px state-pill rail and can be
    re-expanded with a single keystroke or hover.
