# Wave 7 — Site Studio Quality Flow Repair

Status: completed
Date: 2026-05-21

## Goal

Repair the Site Studio build prompt path so new builds are research-first, studio-routed, reuse-aware, and proof-gated instead of jumping from rough vibe to generic one-shot output.

## What changed

- Added `lib/famtastic/site-quality-flow/index.js`.
- Added `tests/site-quality-flow-tests.js`.
- Added `site-studio/tests/site-quality-flow-integration.test.js`.
- Patched `site-studio/server.js::buildPromptContext()` to append a `SITE QUALITY FLOW` block into build prompts.

## Contract now injected into Site Studio builds

- Research first: audience, competitors, trust signals, SEO/search intent, visual landscape, and offer positioning should shape the build.
- Search/reuse before generate: Site Studio should ask Component Studio and Media Studio what already exists before creating new UI/assets.
- Route specialized needs to the owning studio:
  - Media Studio owns image/video/audio/logo asset requests.
  - Component Studio owns reusable sections/widgets/patterns.
- Return structured results to the caller with ids, paths, provenance, status, proof, cost/usage, and blockers.
- Record proof in Data Center.
- Save reusable output back to the owning studio so the library compounds.

## Initial need extraction

`extractPlatformNeeds()` now recognizes build-time needs from the spec/user message:

- Research request: always required for build context.
- Media Studio requests: hero image, gallery assets, video/motion assets, logo/brand assets.
- Component Studio requests: slideshow/gallery/carousel, hero, testimonial/social proof, pricing/package sections.

## Proof

Focused verification passed:

- `node tests/site-quality-flow-tests.js`
- `cd site-studio && npm test -- --run tests/site-quality-flow-integration.test.js`

## Known limits

- This is still a prompt/context contract and backend module, not the full cross-studio broker.
- Media Studio and Component Studio still need Phase 2 visual workflow design and product screens.
- Component Studio partial-piece reuse is represented in the contract, but not fully scored/assembled yet.
- Media Studio asset generation remains dry-run/zero-spend unless Fritz explicitly approves generation.
