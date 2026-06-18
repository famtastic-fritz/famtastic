# FAMtastic Web-Agency Pipeline

The AI web-agency play: find local businesses with no/poor website → render
**several design mockups** per business → pick one → build & sell.

> **Namespaced on purpose.** Several agents were asked to build into `agency/`,
> so generic paths (`agency/leads`, `agency/dashboard`, `agency/sandbox`) collide
> on merge. This whole initiative lives under **`agency/web-agency/`**. Keep new
> web-agency work here, not at the `agency/` root.

## Run the sandbox (on the Mac)

```bash
cd ~/famtastic
python3 agency/web-agency/engine/serve.py
```

Pure Python stdlib — no installs, no API key. It builds **3 design variants for
every lead**, serves them locally, and opens your browser to the comparison hub
at **http://localhost:8788**:

- **Left:** each lead with its three variant chips (Warm / Bold / Minimal).
- **Right:** live preview. Click a variant to compare. Pick one per business.

Stop with `Ctrl-C`.

## Layout

```
agency/web-agency/
  engine/
    generate.py   — mockup engine: vertical (palette+copy) × variant (design)
    serve.py      — build all variants, serve comparison hub, open browser
  leads/
    psl-2026-06-18.json   — 10 qualified Port St. Lucie leads (no website)
  build/            — generated mockups (git-ignored, rebuilt each run)
```

## The two axes

- **Vertical** (auto-detected from the lead's type): `taqueria`, `nail`,
  `detailing`, `lawn`, `general`. Sets palette, hero copy, menu/services,
  reviews, and gallery labels.
- **Variant** (3 design directions): `warm` (light editorial, serif),
  `bold` (dark statement, oversized type), `minimal` (white, restrained).

Each site has: hero, menu/services, reviews, gallery, story, visit/contact,
click-to-call, and a sticky mobile call bar.

## Customizing

- **Palettes / copy:** edit `VERTICALS` in `engine/generate.py`.
- **Design directions:** edit `VARIANTS` (add a fourth, tweak fonts/mode/layout).
- **More leads:** add to `leads/*.json` (same shape), re-run.

## How it fits

This is the fast, deterministic baseline you can see and choose from. When a
lead is worth a bespoke build, hand its JSON to the Claude factory
(`fam-hub site build`) for hand-tuned work.
