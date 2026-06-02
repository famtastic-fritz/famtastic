# Phase 2A Proof — FAMtastic Logo / Brand Workflow

## 2026-05-21 — First paid MuAPI logo batches

Authorization: Fritz approved paid generation up to $50 for Phase 2A Logo Lab.

Actual available MuAPI balance at start: $18.1450 USD.
Current observed balance after first two batches: $17.9550 USD.
Observed spend so far: approximately $0.1900 USD.

No API key was printed or committed. MuAPI was already configured in the CLI keychain. `MUAPI_KEY` was not present in shell env; the CLI keychain credential was used.

## Inputs

Staged input assets:

- `specs/008-phase2a-media-studio-logo-brand/assets/input/original-logo-candidate-logo1.png`
- `specs/008-phase2a-media-studio-logo-brand/assets/input/original-logo-candidate-temp-fam.jpg`
- `specs/008-phase2a-media-studio-logo-brand/assets/input/liked-concept-composite-7-3-x-fam5.jpg`
- `specs/008-phase2a-media-studio-logo-brand/assets/input/secondary-concept-0fb25c9.jpg`

Manifest:

- `specs/008-phase2a-media-studio-logo-brand/assets/input/manifest.json`

## Generated runs

Run 1:

- `media-studio/logo-lab/runs/2026-05-21-first-paid-batch/`

Outputs:

- `downloads/8c97a91fe4c64ab597d9d3e0bc38496c.jpg` — reference-guided refinement using `flux-kontext-pro`; rejected as full wordmark because it omitted `tastic`, but useful as FAM/icon energy reference.
- `downloads/2376ad623c1349a5b7005bafd640c488.png` — fresh wordmark using `gpt4o`; keep as strong starting direction because it spells `FAMtastic`, preserves the old energy, and works on a dark background.

Run 2:

- `media-studio/logo-lab/runs/2026-05-21-second-paid-batch/`

Outputs:

- `downloads/dae0c3a8b1bf40aa830c36f93dd7ad0d.png` — flat/vector production direction; keep as best production/vectorization path.
- `downloads/b1d69568b4c0455dbf6cde561bc66c09.png` — dark-screen premium direction; keep as app/splash/Mission Control direction, but simplify for production lockups.
- `downloads/1d101bb3934f4f92a004520de1796b23.png` — icon/app mark direction; iterate, because it is too detailed for favicon/app icon at small sizes.

Gallery:

- `media-studio/logo-lab/runs/2026-05-21-logo-lab-gallery.html`

## Workflow findings

- `gpt4o` text-to-image is currently better than reference-guided edit for full `FAMtastic` spelling.
- `flux-kontext-pro` image-to-image preserved the visual energy but dropped `tastic`; use as reference/icon direction, not final wordmark path.
- The strongest production path is to combine the fresh wordmark and flat/vector output, then run a vectorization/refinement pass.
- The dark-screen premium output is valuable for the broader FAMtastic UI/animation language, but it is too complex to be the primary production mark.
- Icon direction needs a simplified mark: likely a stylized F/A/star/burst, not full detailed `FAM` plus UI pieces.

## Next proof gates

1. Fritz reviews gallery and identifies which pieces feel right/wrong.
2. Run one refinement batch targeting the chosen direction.
3. Produce production package: primary wordmark, flat vector/SVG candidate, dark/light lockups, icon/favicon, color tokens, usage board, motion concept.
4. Record post-eval opportunities into Data Center after Phase 2A workflow completion.
