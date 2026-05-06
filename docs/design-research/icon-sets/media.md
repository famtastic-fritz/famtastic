# Media — Icon Set Brief

## 1. Domain identity

Media is the **generation and asset** domain — image generation, video
clips, sparkles, prompt-driven creation, the gallery of everything the
platform has produced. The feeling is *generative, luminous, alive*.
Adjacent references: Midjourney's gallery, Leonardo's canvas, Adobe
Firefly's quick-actions tray, the Apple Photos memory header.

Visual personality: **soft, sparkly, image-forward**. Sparkles, frames
with content inside, play triangles, cameras and prisms. The set should
feel like it was drawn for a creative tool, not a productivity tool.
This is the most expressive set in the platform.

## 2. Icon vocabulary (10 concepts)

1. **Media rail icon** — a sparkle inside a small frame
2. **New generation** — sparkle with a plus
3. **Image asset** — landscape rectangle with a small sun/peak inside
4. **Video asset** — landscape rectangle with a play triangle
5. **Audio asset** — sound waveform inside a small frame
6. **Prompt** — sparkle next to a chat bubble
7. **Variation / re-roll** — circular arrow around a sparkle
8. **Upscale** — small frame growing to a larger frame
9. **Background remove** — frame with a subject silhouette and dashed
   negative space
10. **Mask / inpaint** — frame with a soft brush mark inside
11. **Style preset** — palette dot cluster
12. **Gallery / collection** — three small frames overlapped

The sparkle and the framed-content motifs are the through-lines.

## 3. Reference sets

**Phosphor (Regular + Fill)** (https://phosphoricons.com)
- Pros: best `sparkle`, `magic-wand`, `image`, `play-circle`,
  `palette`, `frame-corners`, `wave-sine`, `selection-background`
  in the open-source world. Six weights gives us rest/active swap.
  MIT.
- Cons: `inpaint`/`mask` concepts need composition.
- Suitability: **excellent** — Phosphor was practically designed for
  generative-creative tools.

**Heroicons (Solid)** (https://heroicons.com)
- Pros: solid weight reads luminous; has `sparkles`, `photo`, `film`,
  `paint-brush`. MIT.
- Cons: limited vocabulary; lacks `magic-wand`, `prism`, etc.
- Suitability: **secondary** — borrow `sparkles` if Phosphor's
  feels too thin.

## 4. Recommended set

**Phosphor — Regular at rest, Duotone on active.** Media is the one
domain where we use Phosphor's *Duotone* weight on active state instead
of Fill. Duotone gives us a two-color treatment (warm primary + cool
secondary) that visually says "generated, AI-touched, alive" — and it's
the only place in the platform we use two accent colors at once.

This is intentional: Media is the most expressive surface, and the
Duotone treatment becomes a visual signature for "this came from the
generator, not the file system."

## 5. Custom additions needed

- **Mask / inpaint** — frame with a soft round brush mark; combine
  Phosphor's `frame-corners` + a custom 8px brush dab.
- **Background-remove** — frame with subject silhouette + dashed
  negative space. Custom SVG.
- **Re-roll sparkle** — composite of `arrow-clockwise` + `sparkle`.
- **Empty-state hero** — a custom illustrated prism refracting a
  sparkle into a small framed image. Used on the Media Studio landing
  empty state.

Store in `site-studio/public/icons/media/`.

## 6. Color / style rule

- **Line weight:** 1.5px (Phosphor Regular default)
- **Fill style:** outline at rest; **Duotone fill on active** — primary
  fill is `var(--glow-warm)`, secondary tint is `var(--glow-cool)` at
  ~30% opacity
- **Corner radius:** Phosphor's natural rounded joins; do not override
- **Accent color when active:** dual — warm primary, cool secondary.
  This is the only set with a two-color active state.
- **Hover:** the sparkle inside the icon **rotates 15°** over 250ms,
  paired with the standard glow. Sparkles never sit still — that's the
  Media personality.
