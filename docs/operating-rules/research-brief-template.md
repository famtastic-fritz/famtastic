# Research Brief Template

Distilled from the six page-type briefs produced 2026-05-05. Every new UI surface that doesn't fit an already-researched page type goes through this template before any code lands.

## The 8 pre-flight questions (run these first)

Before drafting a brief, answer all 8 in writing:

1. **Is this a creation tool or a website?** (changes everything about the layout)
2. **What page type is this?** (Library / Creation Canvas / Workshop-Sandbox / Triage Workshop / Settings / Editor-with-Chat — see `docs/design-research/page-type-taxonomy.md`)
3. **Where does Shay live so she can see what she needs to see?** (placement is design, not afterthought)
4. **Does this surface push the canvas or float over it?** (right-rail behavior choice — default is float per `docs/design-research/cross-cutting/02-glass-slide-out.md`; exceptions need justification)
5. **Per-domain coherent icon set or generic library?** (visual identity at the rail; per-domain by default)
6. **What 2 product references prove this layout works?** (no inventing layouts; cite real ones)
7. **What does this look like in: empty / loading / single result / many results / error?** (state map per page)
8. **What would Codex's adversarial review say?** (independent verification before ship — at least mentally)

If any answer is "I don't know," do the research before writing the brief.

## Required brief structure

Every brief is an `.md` file at `docs/design-research/page-types/<NN>-<slug>.md` (or `cross-cutting/` for non-page-specific briefs) with these sections:

### 1. Intent
What does the user expect when they enter this surface? Quote any direct user feedback verbatim if available. State the *job* the page does, not the *features* it has.

### 2. Product references (minimum 2)
For each:
- **Name + URL** (or canonical app name)
- **Layout pattern** — one paragraph
- **What it gets right** — bullet list
- **What we adapt** — bullet list (specific decisions we're borrowing)
- **What we reject** — bullet list (specific decisions we're NOT borrowing, with why)

### 3. Layout spec
Concrete:
- Canvas dimensions / position
- Where each tool/panel/control lives (with rationale, not just placement)
- Glass slide-out behavior per `02-glass-slide-out.md`
- Chrome-collapse behavior per `01-chrome-collapse.md`
- Where Shay lives (per the freeze: never a domain, may be ambient companion)

### 4. Surfaces this applies to
List every existing or planned surface in the platform that uses this pattern. If only one, ask whether it really needs its own page-type or whether it fits an existing pattern.

### 5. Per-surface variants
Short paragraph each on how the pattern adapts per surface (e.g., Sites variant of Library has deploy state cards; Media variant has preview thumbnails).

### 6. State map
For every page type:
- empty
- loading
- single-item / few-items
- many-items
- filtered / no-results
- error
- in-progress (when applicable: generating, saving, deploying)

### 7. Acceptance criteria
What must be true for an implementation to pass review. Bullet list. Specific. Testable.

### 8. Known gaps
Things this brief identifies but doesn't solve. Surface them so they don't get silently buried.

## Required companion mockup

Every page-type brief ships with a working HTML mockup at `docs/design-research/page-types/<NN>-<slug>-mockup.html`:

- Self-contained (inline CSS, no framework requires)
- Uses Night Scheme tokens from `docs/STUDIO-UI-FOUNDATION.md` Section 2
- Demonstrates the most distinctive surface variant
- Includes at least one hover-state element to show the bevel + warm glow + transition
- Static HTML/CSS preferred; minimal vanilla JS only when interaction is the point of the demo

The mockup is the visual companion to the .md spec. They must match.

## Sourcing user feedback

Before drafting, read:
- `~/famtastic/captures/inbox/cap_creation-product-design-direction-2026-05-05.md` — the foundational user feedback for the per-page design system
- `~/famtastic/captures/inbox/cap_design-preferences-2026-05-05.md` — earlier design preferences
- All entries under `~/famtastic/memory/decision/`, `~/famtastic/memory/rule/`, `~/famtastic/memory/anti-pattern/` — the canonical preferences

User feedback is canonical by definition. If the regex confidence in the chat-capture pipeline rated something below 0.85, that's a tooling gap, not a signal that the feedback is weak. Use the user-canonical override pattern when needed.

## Adversarial review (recommended)

Before promoting a brief from draft to canonical, run an adversarial review pass with Codex. Pattern:
- Codex reads the brief
- Codex writes "what's wrong / missing / inconsistent / contradicts existing rules"
- Author amends, max 3 rounds default
- Final brief carries an `amendments[]` log

Reference: today's `plan_2026_05_05_ops_workspace_gui` plan went through 3 rounds and converged. Same pattern applies to design briefs.

## Commit discipline

Drafts land in `docs/design-research/` as untracked files first. The user reviews before commit. Once approved, commit to a `docs/<scope>` branch and PR. The `docs:` prefix is mandatory per CLAUDE.md.

## Promotion to memory

At end of session, capture the brief's high-value decisions and rules into the chat-capture pipeline (`scripts/session-capture.js --source manual --input <brief.md>`). Memory entries flow back into Shay's context for future sessions. This is how the platform learns.
