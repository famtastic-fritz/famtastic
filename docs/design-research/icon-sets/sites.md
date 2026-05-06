# Sites — Icon Set Brief

## 1. Domain identity

Sites is the **empire view**. It is the operator's portfolio of every
website FAMtastic has built or is building — owned territory, not a
collection of files. The feeling we want is *cartography*: a person looking
at a map of their holdings, picking which one to visit. Adjacent emotional
references: a real-estate dashboard, a captain's chart room, a record-label
roster wall. The opposite of "file manager."

Visual personality: **architectural, weighty, ownership-coded**. Strokes
slightly heavier than the platform default. A whisper of structure
(rectangles, frames, plats) shows up in the metaphors. Globes and pins
appear, but sparingly — this is not a travel app.

## 2. Icon vocabulary (10 concepts)

Sites needs concepts the rest of the platform does not:

1. **Portfolio overview** (rail icon) — stacked rectangles / framed grid
2. **Single site card** — single framed rectangle with a small flag or pin
3. **Page within a site** — sheet with a folded corner, optionally numbered
4. **Deploy** — upward arrow leaving a frame (not a generic upload arrow)
5. **Preview** — eye over a frame (not just an eye)
6. **Version / snapshot** — stacked sheets with a clock dot
7. **Fork / duplicate** — two frames joined at a node
8. **Archive** — frame inside a vault arc
9. **Status: gold** — frame with a small star/medal in the corner
10. **Status: scaffolded** — frame with a dashed border (in-progress)
11. **Domain / live URL** — globe with one latitude line, paired to a frame
12. **Build state** — pulse line crossing the bottom of a frame

The frame motif is the through-line. Almost every Sites icon includes a
small rectangle so the family reads as related.

## 3. Reference sets

**Tabler Icons** (https://tabler.io/icons)
- Pros: 4500+ glyphs, 2px stroke + rounded joins reads architectural,
  has `layout-grid`, `world`, `building`, `frame`, `versions`, `archive`,
  `git-fork` already drawn in a consistent family. MIT licensed.
- Cons: a bit utilitarian; lacks the "framed thumbnail" specific glyph
  for a site card.
- Suitability: **strong** — coverage carries the day.

**Phosphor (Regular weight)** (https://phosphoricons.com)
- Pros: warmer, more humanist line; `globe`, `browsers`, `frame-corners`,
  `stack`, `git-fork`, `cloud-arrow-up` all present. MIT.
- Cons: thinner default stroke makes the "weighty empire" feeling harder
  to land without overrides.
- Suitability: **good** but secondary.

## 4. Recommended set

**Tabler Icons (2px outline)** as the base. The architectural stroke and
broad vocabulary fit the empire feeling without us drawing eight custom
glyphs. We pin one weight (`stroke: 1.75` after platform scaling) so all
Sites icons share line weight even where Tabler offers variants.

## 5. Custom additions needed

Tabler does not ship the exact metaphors we want for:

- **Status: gold** — combine `frame` + a custom 8px star in the
  upper-right corner.
- **Status: scaffolded** — `frame` with a dashed `stroke-dasharray: 3 2`
  override.
- **Site card with flag** — `frame` + custom 6px pennant, used in nav
  brand contexts.

Draw these three as platform-internal SVGs in
`site-studio/public/icons/sites/` so they can be reused without re-deriving.

## 6. Color / style rule

- **Line weight:** 1.75px (slightly heavier than platform default 1.5)
- **Fill style:** outline only at rest; warm fill on the corner accent
  (star, pin) when active
- **Corner radius:** 1.5px on rectangles — sharp enough to read
  architectural, soft enough not to feel CAD
- **Accent color when active:** `var(--glow-warm)` on the frame outline +
  the corner accent; never fill the whole rectangle
- **Hover:** the frame "lifts" — 1px translateY(-1px) plus the standard
  drop-shadow glow from `README.md`
