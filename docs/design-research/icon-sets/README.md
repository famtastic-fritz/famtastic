# Per-Domain Icon Sets — Methodology and Cross-Set Rules

This folder holds the icon-set briefs for the seven canonical Workbench
domains: Sites, Brainstorm, Plans, Components, Media, Research, Admin.
Each domain has its own brief; this README is the shared methodology and
the rules that apply to every set.

## Why this exists

The current Foundation rail uses single-letter text glyphs (S/B/P/C/M/Intel/A).
That violates the standing rule `rule/icons-over-text-always-in-the-rail`.
A second rule, `rule/each-domain-gets-its-own-coherent-icon-set`, says we
do **not** solve this by reaching for one library and dropping generic
Lucide-soup across every domain. Each domain gets its own coherent set
that visually feels like that domain.

## The non-negotiable

A domain's icon set must:

1. Feel **internally consistent** — same line weight, same fill style, same
   corner radius, same metaphor family.
2. Feel **externally distinct** — Sites icons must read as a different
   visual language from Media icons or Components icons. If you put all
   seven rail icons next to each other, a designer should be able to point
   at any one and say "that's the Components icon" without reading a label.
3. Stay **on the Night Scheme** — strokes use `var(--text-2)` at rest,
   `var(--glow-warm)` on hover/active, never raw white.

## Candidate icon libraries

Each domain brief picks from this short list. We do not invent libraries
on the fly — pick one (or two combined) per domain.

| Library | Style | License | Best for |
|---|---|---|---|
| **Phosphor** | Six weights (thin → fill), geometric, friendly | MIT | Domains that need warmth + a wide vocabulary (Brainstorm, Media) |
| **Lucide** | Single-weight outline, neutral | ISC | Utility-feeling domains (Admin, Research) |
| **Tabler** | 2px stroke, rounded joins, 4500+ icons | MIT | Coverage-heavy domains (Sites, Components) |
| **Iconoir** | 1.5px stroke, very clean, geometric | MIT | Editorial / serious domains (Plans) |
| **Heroicons** | Tailwind house style, outline + solid | MIT | Fallback if a domain needs UI chrome glyphs |
| **Custom-illustrated** | Hand-drawn or branded SVG | n/a | When metaphor matters more than parity (mascot moments, hero rail icon) |
| **Custom-svg** | Generated for a single concept | n/a | Filling gaps the chosen library doesn't cover |

## Icon size matrix

| Surface | Size | Stroke | Notes |
|---|---|---|---|
| Rail icon (primary nav) | 22px | 1.75px | Centered in 44px hit target |
| Secondary nav slide-out | 18px | 1.5px | Paired with label text |
| In-card glyph | 16px | 1.5px | Status, type, action affordances |
| Button icon | 14px | 1.5px | Inline with button label |
| Empty-state hero | 64px | 2px | Bigger metaphor moment |

## State spec

All three states use motion tokens already in the Night Scheme: a 160ms
ease-out for color shifts, 220ms ease-out for transform.

### Default (rest)
- `color: var(--text-2);` (≈55% warm white)
- `opacity: 0.85;`
- `transform: scale(1);`

### Hover
- `color: var(--glow-warm);` (#F5C46B)
- `opacity: 1;`
- `transform: scale(1.06);`
- Soft glow: `filter: drop-shadow(0 0 6px rgba(245,196,107,0.35));`
- Label slides out from rail (see secondary-nav-slides-out rule).

### Active (current domain)
- `color: var(--glow-warm);`
- `opacity: 1;`
- Persistent left bar: `box-shadow: inset 2px 0 0 var(--glow-warm);`
- No scale — active is calm, hover is alive.

### Disabled
- `color: var(--text-3);` (≈32%)
- `opacity: 0.4;`
- `cursor: not-allowed;`
- No hover state fires.

## Hover effect sample CSS

```css
.rail-icon {
  --icon-color: var(--text-2);
  color: var(--icon-color);
  opacity: 0.85;
  transition:
    color 160ms ease-out,
    opacity 160ms ease-out,
    transform 220ms ease-out,
    filter 220ms ease-out;
}

.rail-icon:hover {
  --icon-color: var(--glow-warm);
  opacity: 1;
  transform: scale(1.06);
  filter: drop-shadow(0 0 6px rgba(245, 196, 107, 0.35));
}

.rail-icon[aria-current="page"] {
  --icon-color: var(--glow-warm);
  opacity: 1;
  box-shadow: inset 2px 0 0 var(--glow-warm);
}

.rail-icon[aria-disabled="true"] {
  --icon-color: var(--text-3);
  opacity: 0.4;
  cursor: not-allowed;
}
```

See `_hover-state-prototype.html` for a working demo of all three states.

## How to read a domain brief

Every brief has the same six sections: Domain identity, Icon vocabulary,
Reference sets, Recommended set, Custom additions needed, Color/style rule.
Implementers should treat the **Recommended set** as the default and only
deviate after a written decision in `cerebrum.md`.
