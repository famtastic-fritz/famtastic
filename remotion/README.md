# @famtastic/remotion

The FAMtastic shared animation & rendering engine. Built on
[Remotion](https://www.remotion.dev) — Compositions are React components,
rendered to MP4/PNG/GIF/WebM via Node.js.

This package is the canonical home for every animated or programmatically-
rendered piece of the FAMtastic brand. The studios consume it:

```
~/famtastic/
├── remotion/                     ← YOU ARE HERE — shared compositions + render API
├── site-studio/                  ← will import compositions for site hero video, intros
├── (future) media-studio/        ← will batch-render social variants
├── (future) component-studio/    ← will use as reusable animation library
└── brand/                        ← brand-mark manifesto + source PNG layers
```

## Compositions

| ID | Format | Purpose |
|---|---|---|
| `FacelessVideo`          | any | **Faceless video generator** — topic→script→voiceover→captioned short. See [`FACELESS.md`](FACELESS.md) |
| `FAMtasticLogo-Luminous` | 1920×1080 | Primary brand-mark animation, luminous-core burst |
| `FAMtasticLogo-Dark`     | 1920×1080 | Alt brand-mark animation, dark-pigment burst |
| `FAMtasticLogo-Square`   | 1080×1080 | Square crop for social / avatars |

Brand-mark compositions live in [`src/FAMtasticLogo.tsx`](src/FAMtasticLogo.tsx).
The faceless generator lives in [`src/faceless/`](src/faceless/) (composition) +
[`src/pipeline/`](src/pipeline/) (Node pipeline) + [`bin/faceless.mjs`](bin/faceless.mjs) (CLI).
All registered in [`src/Root.tsx`](src/Root.tsx).

### Faceless videos — quick start

```bash
node bin/faceless.mjs "how compound interest builds wealth"   # → out/<slug>.spec.json
node bin/faceless.mjs "best coffee in atlanta" --render        # → out/<slug>.mp4
```

Works with zero API keys (templated script + silent video). Full docs:
[`FACELESS.md`](FACELESS.md) · monetization paths: [`MONETIZATION.md`](MONETIZATION.md).

## Brand assets

PNG layers (transparent, generated from the design session of 2026-05-18)
live in [`public/brand/`](public/brand/):

- `burst-luminous.png` — green ink burst with glowing white core
- `burst-dark.png` — green ink burst with deep-recess center
- `fam-motion.png` — FAM letters with motion warp + slight A peak
- `fam-original.png` — FAM letters as originally generated
- `tastic.png` — "tastic" in chunky bold with white halo

All assets are referenced via `staticFile("brand/<name>.png")` so they
load correctly during both dev (Remotion Studio) and bundled rendering.

## Common commands

```bash
# Interactive studio (preview, scrub timeline, tweak props live)
npm run dev          # opens http://localhost:3000

# Render videos
npm run render:luminous   # → out/famtastic-logo-luminous.mp4
npm run render:dark       # → out/famtastic-logo-dark.mp4
npm run render:square     # → out/famtastic-logo-square.mp4

# Render a still PNG (frame 60 of the luminous composition)
npm run render:still      # → out/famtastic-logo.png

# Type-check + lint
npm run lint

# Bundle for production (used by site-studio / media-studio at render time)
npm run build
```

## Animation beats (FAMtasticLogo, 120 frames @ 30fps = 4s)

```
00–18  burst explodes from a tiny point (the wand-touch moment)
12–36  FAM letters drop in behind the burst impact, spring-settle
30–60  "tastic" types/wipes in to the right of the burst
60–120 hold pose
```

Beat timings live as plain numbers in
[`src/FAMtasticLogo.tsx`](src/FAMtasticLogo.tsx) — change them there.

## Integrating into a studio

Site Studio (or any other studio) can render compositions programmatically
without spawning the CLI:

```ts
// from site-studio/server.js (example)
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";

const remotionRoot = path.resolve(process.cwd(), "../remotion");

const bundled = await bundle({
  entryPoint: path.join(remotionRoot, "src/index.ts"),
});

const composition = await selectComposition({
  serveUrl: bundled,
  id: "FAMtasticLogo-Luminous",
  inputProps: { burstVariant: "luminous", famVariant: "motion", backgroundColor: "#ffffff" },
});

await renderMedia({
  composition,
  serveUrl: bundled,
  codec: "h264",
  outputLocation: "/tmp/site-hero-intro.mp4",
  inputProps: { burstVariant: "luminous", famVariant: "motion", backgroundColor: "#0a0a0a" },
});
```

This pattern is the contract: studios pass `inputProps` to override the
default brand colors / variants on a per-site / per-render basis.

## License

Internal — FAMtastic ecosystem only.
