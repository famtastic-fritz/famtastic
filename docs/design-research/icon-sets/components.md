# Components — Icon Set Brief

## 1. Domain identity

Components is the **building blocks** domain — the library of reusable
hero patterns, cards, badges, dividers, and snippets that get composed
into sites. The feeling is *constructive, modular, code-adjacent*.
Adjacent references: Storybook's component sidebar, Figma's component
panel, shadcn/ui's docs sidebar, an old well-organized LEGO drawer.

Visual personality: **cubic, modular, slightly technical**. Brackets,
cubes, stacked rectangles, code symbols. Where Sites uses single frames,
Components uses *assemblies* of frames. Strokes are crisp. There's a
small, intentional dose of monospace energy.

## 2. Icon vocabulary (10 concepts)

1. **Components rail icon** — three small cubes assembled into an L
2. **New component** — a single cube with a plus on its top face
3. **Hero pattern** — wide rectangle with a cube cluster inside
4. **Card pattern** — single rectangle with a corner notch
5. **Badge / chip** — pill shape with two dots
6. **Divider** — wavy or zig line between two stacked rectangles
7. **Snippet / code** — `< >` brackets with a small dot between them
8. **Sandbox / playground** — cube inside a dashed frame
9. **Test runner** — cube with a small play triangle
10. **Variant** — cube with a duplicated outline offset behind it
11. **Lock (protected file)** — cube with a small padlock
12. **Publish to library** — cube with an upward arrow into a shelf line

The cube and the bracket are the through-lines. Every icon should feel
like it could click together with the next one.

## 3. Reference sets

**Tabler Icons** (https://tabler.io/icons)
- Pros: has `box`, `cube`, `components`, `puzzle`, `code`, `brackets`,
  `stack-2`, `play`, `flask`, `test-pipe`. 2px stroke fits the
  technical feel. MIT.
- Cons: cubes are slightly small in their default viewbox; needs
  consistent sizing rules.
- Suitability: **excellent** — Tabler's vocabulary maps almost
  one-to-one to our concepts.

**Phosphor (Regular)** (https://phosphoricons.com)
- Pros: has `cube`, `cube-focus`, `bracket-angle`, `code`, `puzzle-piece`.
  MIT.
- Cons: humanist roundness fights the modular feeling we want here.
- Suitability: **secondary** — borrow only `puzzle-piece` and
  `cube-focus` if Tabler's equivalents disappoint.

## 4. Recommended set

**Tabler Icons (2px outline)** as the primary library, with a strict
"every Components glyph must contain a 6px cube somewhere" rule. The
recurring cube is what differentiates Components icons from Sites icons
even though both use rectangles. Sites = framed rectangles (containers).
Components = cubes (assembled blocks).

## 5. Custom additions needed

- **Bracketed cube** — `< [cube] >` composition, used as the favicon
  for the Components domain and as the empty-state hero. Custom SVG.
- **Divider glyph** — Tabler has `wave-saw-tool` but it doesn't read
  as "divider between sections." Draw a custom 22px glyph showing two
  stacked rectangles separated by a wavy line.
- **Variant offset** — Tabler has `copy` but not "variant of a
  component." Draw as cube + offset duplicated outline.

Store in `site-studio/public/icons/components/`.

## 6. Color / style rule

- **Line weight:** 2px (slightly heavier than Plans, matches the
  technical feel)
- **Fill style:** outline at rest; the *top face* of cubes fills with
  `var(--glow-warm)` when active — never the whole cube
- **Corner radius:** 1px on cubes (just enough to not feel CAD), sharp
  on brackets
- **Accent color when active:** `var(--glow-warm)` on the cube top face
  and on bracket tips
- **Hover:** the cube "extrudes" — a 2px translateY(-2px) on the front
  face only, suggesting depth, with the standard glow. This is the
  Components-specific hover personality.
