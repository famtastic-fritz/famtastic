# Brainstorm — Icon Set Brief

## 1. Domain identity

Brainstorm is the **capture and spark** domain. This is where ideas land
before they have shape — voice memos, half-sentences, screenshots dropped
on the canvas, a 2am thought the user wants to keep. The feeling is
*momentary, electric, generative*. Adjacent references: Apple Notes' new
quick-capture sheet, Granola's pre-meeting blank slate, the Linear
"create issue" overlay before any field is filled in.

Visual personality: **soft, rounded, slightly luminous**. Where Sites
feels architectural, Brainstorm feels organic. Lightbulbs, sparks, and
sound waves dominate. Lines are slightly thinner than the platform
default. Nothing feels finished — everything feels mid-thought.

## 2. Icon vocabulary (10 concepts)

1. **Brainstorm rail icon** — lightbulb with a small spark above it
2. **New capture** — plus sign inside a soft round bubble
3. **Voice capture** — microphone with a single sound-wave arc
4. **Text capture** — pencil with a tiny spark dot
5. **Screenshot capture** — dashed rectangle being "snipped"
6. **Idea / sticky** — rounded rectangle with one folded corner
7. **Triage / sort** — three dots being grouped by a soft circle
8. **Promote to plan** — spark turning into an arrow
9. **Archive idea** — bubble fading into a moon shape
10. **Linked thought** — two bubbles connected by a curved line
11. **Pinned idea** — bubble with a tiny pin glyph
12. **Search captures** — magnifier inside a bubble (not a generic search)

The bubble + spark motif is the through-line. Curved, rounded, breathing.

## 3. Reference sets

**Phosphor (Regular weight)** (https://phosphoricons.com)
- Pros: humanist, soft geometric. Has `lightbulb`, `lightbulb-filament`,
  `microphone`, `sparkle`, `chat-circle`, `sticker`, `link-simple`,
  `notepad`, `magnifying-glass-plus`. Six weights so we can use Regular
  for rest and Fill for active. MIT.
- Cons: a few exact concepts (idea-promote arrow) need composition.
- Suitability: **excellent** — Phosphor's humanist line *is* the brand
  for this domain.

**Iconoir** (https://iconoir.com)
- Pros: 1.5px stroke, very clean, has `light-bulb`, `microphone`,
  `sparks`. MIT.
- Cons: too geometric and serious for the spark feeling we want.
- Suitability: **fallback only**.

## 4. Recommended set

**Phosphor — Regular at rest, Fill on active.** The weight-swap is the
hover/active animation, not just a color change: the bulb literally
"lights up" by morphing from outline to filled. This single behavior
defines the Brainstorm domain visually and gives it a personality no
other domain will share.

## 5. Custom additions needed

- **Promote-to-plan** — spark + arrow composition. Phosphor has
  `arrow-square-out` and `sparkle` separately; combine into one 22px
  custom glyph.
- **Linked thought** — two `chat-circle` glyphs joined by a custom
  Bezier curve.
- **Capture button (mascot moment)** — a custom illustrated lightbulb
  with hand-drawn filament for the empty state on the Brainstorm landing.

## 6. Color / style rule

- **Line weight:** 1.5px (Phosphor Regular default)
- **Fill style:** outline at rest, **filled in `var(--glow-warm)` when
  active** — this swap is the whole personality
- **Corner radius:** maximum (Phosphor's natural rounded joins; do not
  override)
- **Accent color when active:** `var(--glow-warm)` fill + an extra-soft
  drop-shadow at 0 0 10px rgba(245,196,107,0.45) — a touch more glow
  than other domains, because sparks should feel luminous
- **Hover:** the icon "breathes" — a 600ms ease-in-out scale from 1.0
  to 1.04 and back, paired with the standard glow
