# Plans — Icon Set Brief

## 1. Domain identity

Plans is the **roadmap and decision** domain. Where Brainstorm is
mid-thought, Plans is *committed* — milestones, sequenced workstreams,
checkpoints, gates. The feeling is *editorial, considered, navigational*.
Adjacent references: Linear's roadmap view, Height's milestone tracker,
the Notion timeline view, a serious project log.

Visual personality: **clean, geometric, slightly editorial**. Thin lines,
rectilinear shapes, dot-and-line motifs that read as "timeline" without
being literally a calendar grid. This domain should feel calm — the
opposite of Brainstorm's spark energy.

## 2. Icon vocabulary (10 concepts)

1. **Plans rail icon** — a horizontal line with three milestone dots
2. **New plan** — a single dot at the start of a line
3. **Workstream** — a flagged horizontal bar (small pennant on a line)
4. **Milestone** — a diamond on a horizontal line
5. **Gate / decision** — a circle bisected by a vertical line
6. **Status: in progress** — half-filled circle
7. **Status: blocked** — circle with a small slash through it
8. **Status: done** — filled circle with a checkmark
9. **Plan archive** — stacked horizontal lines with a vault arc
10. **Branch / fork plan** — two diverging lines from one dot
11. **Promote brainstorm → plan** — spark glyph collapsing into a dot
12. **Linked decision (ADR)** — diamond with a small page glyph beside it

The dot-and-line + diamond motif is the through-line. Everything reads
as a position on a timeline.

## 3. Reference sets

**Iconoir** (https://iconoir.com)
- Pros: 1.5px stroke, deeply geometric, editorial-feeling. Has
  `flash`, `path-arrow`, `git-fork`, `square-wave`, `multi-bubble`.
  Designer-built consistency. MIT.
- Cons: lacks specific milestone/gate metaphors out of the box; we'll
  compose from primitives.
- Suitability: **strong** — Iconoir's restraint matches the calm Plans
  feeling.

**Lucide** (https://lucide.dev)
- Pros: well-known, has `milestone`, `flag`, `git-branch`, `target`,
  `route`. ISC.
- Cons: stroke joins are a touch generic; risk of looking like every
  other dashboard.
- Suitability: **good fallback**.

## 4. Recommended set

**Iconoir (1.5px outline)** as the base, with a **shared baseline rule**:
every Plans icon must be drawable on a horizontal line. The line is the
brand. Even icons that aren't literally on a timeline (archive, fork)
maintain a baseline implied by their bottom edge. This consistency is
what makes the set feel like one set.

## 5. Custom additions needed

- **Milestone diamond on a line** — Iconoir has `diamond` but not the
  "diamond + horizontal line" composite. Draw as a single 22px glyph.
- **Gate** — bisected circle, custom.
- **Workstream pennant on a line** — custom composition.
- **Promote-spark-to-dot** — bridges Brainstorm and Plans visually;
  draw as a custom 22px glyph that uses Brainstorm's spark on the left
  morphing into Plans' dot on the right.

Store all four in `site-studio/public/icons/plans/`.

## 6. Color / style rule

- **Line weight:** 1.5px, uniform across the set
- **Fill style:** outline only; status circles fill when active
  (in-progress = 50%, done = 100%, blocked = 0% with slash)
- **Corner radius:** sharp — diamonds have hard corners, lines have
  square caps. Plans is *committed*, not *soft*.
- **Accent color when active:** `var(--glow-warm)` on the dot/diamond,
  baseline stays `var(--text-2)` — only the milestone "lights up"
- **Hover:** the milestone dot *grows* from r=2 to r=3, slowly (250ms),
  no scale on the whole icon. The growth is the hover, not the glow.
