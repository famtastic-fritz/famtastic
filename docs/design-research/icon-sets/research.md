# Research — Icon Set Brief

## 1. Domain identity

Research is the **intelligence and inquiry** domain — Pinecone-backed
vertical research, intelligence reports, promoted findings, competitive
audits, the magnifier-on-the-codebase mode. The feeling is *analytical,
focused, slightly forensic*. Adjacent references: Notion's AI search
panel, Perplexity's source rail, Linear's insights view, a serious
research notebook.

Visual personality: **precise, instrument-like, neutral but sharp**.
Magnifiers, microscopes, charts, beakers, dot-grids. Lines are thin
and exact. This domain should feel like a measurement tool — accurate,
not flashy.

## 2. Icon vocabulary (10 concepts)

1. **Research rail icon** — magnifier with a small dot grid inside the lens
2. **New inquiry** — magnifier with a plus
3. **Vertical pack** — folder with a small chart line on the tab
4. **Source / citation** — page with a small quote mark
5. **Finding / insight** — small chart bar with a star
6. **Promoted finding** — finding glyph with an upward chevron
7. **Dismissed finding** — finding glyph with a strikethrough
8. **Pinecone / vector index** — a 3-dot constellation inside a circle
9. **Intelligence loop / cron** — circular arrow around a chart bar
10. **Competitive audit** — two charts side by side
11. **Severity badge (major/minor/opportunity)** — small filled triangle
12. **Saved query** — magnifier with a bookmark fold

The magnifier and the small-chart motifs are the through-lines.

## 3. Reference sets

**Lucide** (https://lucide.dev)
- Pros: clean utility feel; has `search`, `microscope`, `flask-conical`,
  `bar-chart-3`, `bookmark`, `quote`, `trending-up`. ISC.
- Cons: a touch generic — risk of looking like every other research
  surface in the world.
- Suitability: **strong** — Research can afford to look "neutral
  professional" because the *content* is what carries it.

**Tabler Icons** (https://tabler.io/icons)
- Pros: has `microscope`, `chart-dots`, `chart-arcs`, `report-search`,
  `binoculars`, `vocabulary`. MIT.
- Cons: 2px stroke is heavier than the precise feeling we want.
- Suitability: **secondary** — borrow `report-search` and `chart-dots`
  if Lucide is too thin.

## 4. Recommended set

**Lucide (1.5px outline)** as the base, with one platform-wide
override: every Research icon must contain a **dot or dot cluster**
somewhere — inside the magnifier lens, on the chart bar, on the page.
The dot is the "data point" through-line that ties the set together
and distinguishes it from Admin (which uses gears) and Sites (which
uses frames).

## 5. Custom additions needed

- **Pinecone / vector index** — a 3-dot triangular constellation
  inside a 16px circle. Custom SVG, used in the Research rail and on
  the intelligence-loop status badge.
- **Severity triangle (3 weights)** — three small filled triangles
  in increasing fill opacity for minor/major/opportunity. Custom.
- **Promoted-finding chevron** — Lucide has `chevrons-up` but we want
  it inside the finding glyph as one composite.

Store in `site-studio/public/icons/research/`.

## 6. Color / style rule

- **Line weight:** 1.5px, uniform
- **Fill style:** outline at rest; **the data dot fills** with
  `var(--glow-warm)` on active — only the dot, never the surrounding
  shape. This mimics a measurement instrument lighting up.
- **Corner radius:** sharp (1px) on shapes, perfectly round on dots
- **Accent color when active:** `var(--glow-warm)` on data dots only;
  the surrounding magnifier or chart stays `var(--text-2)`
- **Hover:** the dot *pulses* — opacity 0.5 → 1.0 over 600ms ease-in-out,
  paired with the standard glow. Pulse rate is constant, not driven by
  hover, when the icon is active (signals "data is live").
