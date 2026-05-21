# FAMtastic — Brand Mark Manifesto

> The official record of the FAMtastic mark. This is what every future
> rendering, refinement, and variation answers to. Update it when the rules
> evolve; do not contradict it.

## The Story

> *fantastic* (n., adj., the ordinary) → [magic-wand touches the first three letters] → **FAM**tastic (the result, a new concept).

The mark is a snapshot of the moment of transformation. It is the brand
definition rendered in a single image. We took an ordinary established
word and turned it into a concept — we deviated from the spelling, the use,
and the original definition of the word to make something even better.

## The Three Letters (the magic-wand result)

| Letter | Color | Role |
|---|---|---|
| **F** | royal blue | strength on the left. The anchor. The left structural wing/buttress. |
| **A** | golden yellow | THE TALLEST LETTER. Protection from above. The apex/keystone/peak. |
| **M** | crimson red | strength on the right. The right wing/buttress. Load-bearer that carries "tastic" out to the right. |

The three letters together form a unified architectural composition:
F + A + M = left buttress + central peak + right buttress. The A is the
roof; F and M are the columns. The shape is fundamentally a temple or
arch silhouette.

## The Burst (the magic-wand moment)

The burst is the **action** — the verb in the sentence. It is the snapshot
of the moment the magic wand touched the word. It is not decoration. It is
not optional. Without it, the logo is only the result, not the
transformation. The burst MUST be present in the official lockup.

Direction for the burst: radiating energy / aura / sun-corona / refined
explosion. NOT a 2003 comic-book POW!. Modern, alive, premium.

## "tastic" (the ordinary remnant)

"tastic" is deliberately plain. Clean, calm, unstyled. It is the "before"
that has been transformed by everything to its left. The plainer it is,
the more the FAM looks like magic. Resist any urge to dress it up.

## Mark Architecture (two lockups)

1. **Short mark / signature:** FAM only. Used for favicons, medallions,
   small badges, ecosystem product icons.
2. **Official mark:** FAMtastic — the full story. F-A-M + burst + tastic.
   Used for primary brand identification.

The short mark is a *part of* the official mark. They cannot diverge.

## Production Rules (non-negotiable)

1. **Single contiguous die-cut shape.** The official mark must be one
   physical object — peel-as-one sticker, cast-as-one medallion, milled
   from one piece. No floating elements.
2. **A is taller than F and M.** Always. The hierarchy is part of the
   meaning.
3. **F-A-M are connected as one form**, not three letters that happen to
   touch. Shared stems, ligatures, or fused geometry — not adjacency.
4. **Haitian-flag palette:** royal blue / golden yellow / crimson red,
   flowing as a current through the F-A-M letters. Not three flat color
   blocks — one continuous flow.
5. **Premium and alive — never cartoon.** No bubble plastic. No early-2000s
   toy-logo finish. Modern, sophisticated, magical.
6. **M's right side extends into "tastic"** — M has structural
   responsibility for the full-lockup wordmark.

## Ecosystem Use

The official FAMtastic signature prefixes every product in the ecosystem:

- FAMtastic Site Studio
- FAMtastic Media Studio
- (...etc.)

This means the signature must lock up cleanly with a sub-product name on
its right side, on a defined baseline. The short mark (FAM only) may also
serve as the product-icon base.

## Build Phases

Building the mark in phases (this is intentional — each phase has to land
before the next is committed):

- **Phase 1 — FAM ligature.** Get the three connected letters right.
  *(Currently in progress.)*
- **Phase 2 — Burst.** Evolve from comic-book explosion to refined
  transformation aura that pairs with the chosen FAM.
- **Phase 3 — "tastic" lockup.** Add the plain wordmark to the right of
  M with proper baseline and kerning.
- **Phase 4 — Full system.** Ecosystem lockups, monochrome and reversed
  versions, favicon/small-size variants, animation behavior (if any).

## Delivery & Animation — where the mark lives

The brand mark exists as both static PNG layers (this directory) and an
animated/programmatic composition at `~/famtastic/remotion/`. The Remotion
package is the **shared animation engine** for the FAMtastic ecosystem
(Media Studio foundation). Three compositions are registered today:
`FAMtasticLogo-Luminous`, `FAMtasticLogo-Dark`, `FAMtasticLogo-Square`.

Animation beats (4 seconds @ 30fps):
1. Burst explodes from a point (00–18) — the wand-touch
2. FAM letters drop in behind it (12–36) — the magic-wand result
3. "tastic" wipes in to the right (30–60) — the untouched ordinary remnant
4. Hold (60–120)

This animation is the canonical motion expression of the manifesto: the
visual sequence literally renders the sentence *ordinary → transformation
→ new concept* over 4 seconds.

Future motion variants and integration patterns (composition library +
Media Studio recipes) live at `~/famtastic/remotion/RECIPES.md`.

## Source

This manifesto is recorded as a result of the design session on
2026-05-18 in which the brand owner articulated the core story (ordinary
word → magic-wand moment → new concept) and the per-letter roles. Per
the FAMtastic Declaration: *the results are the proof*. This document
is the start of recording the results.
