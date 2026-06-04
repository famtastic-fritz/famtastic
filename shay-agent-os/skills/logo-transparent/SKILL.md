---
name: logo-transparent
description: |
  Make a logo (or any image) background transparent and clean it up — trim margins,
  knock out a solid/white background, produce a ready-to-use transparent PNG. Use
  when the user says: "make the background transparent", "remove the background",
  "clean up this logo", "knock out the white", "transparent PNG", "cut out the logo".
  Runs locally where the image file lives (e.g. ~/Downloads). NOT for image
  generation — that's adobe-firefly.
metadata:
  author: famtastic
  version: "1.0"
  installed: 2026-06-04
---

# logo-transparent — background removal + cleanup

Turns a logo with a background into a clean transparent PNG.

## Run it

```bash
scripts/logo-transparent.sh ~/Downloads/famdlogo.png
# → writes ~/Downloads/famdlogo-transparent.png
scripts/logo-transparent.sh ~/Downloads/famdlogo.png ~/Downloads/famd-clean.png
```

## How it decides

1. **`rembg` (preferred)** — ML-based, removes ANY background (photos, gradients,
   drop shadows). First run downloads a ~170MB model once. Install: `pip install rembg`.
2. **ImageMagick fallback** — for solid/white backgrounds: `-fuzz 12% -transparent
   white`. Install: `brew install imagemagick`.
3. Final **trim** pass removes empty transparent margins either way.

## Where it runs

On the machine that has the file and the tools (Fritz's Mac / Studio). It cannot
run in a fresh cloud container — those have neither the Downloads folder nor the
image tooling. If working from the cloud, the user should either run this script
locally, or upload the file into the session first.

## After

Open the output on both a dark and a light background to check edge halos. For a
crisp vector logo, consider the `media-studio/logo-lab` pipeline (SVG extraction)
instead of a raster cutout.
