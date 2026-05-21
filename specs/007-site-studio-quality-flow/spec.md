# Site Studio Quality Flow Repair

Date: 2026-05-21
Status: completed
Wave: 7 of 7

## Problem

Site Studio could build from prompts, but the build path still leaned too much on one-shot generation. It did not consistently encode the platform-level rule that builds should research first, search/reuse existing media/components, route specialized needs to owning studios, and return proof to the caller.

## Requirements

1. Build prompts must carry a shared cross-studio orchestration contract.
2. Site Studio must identify media needs such as hero images, gallery assets, video/motion assets, and logo/brand assets.
3. Site Studio must identify component needs such as slideshow/gallery/carousel, hero, testimonials, and pricing/package sections.
4. Component needs must be framed as search-before-build requests.
5. Media needs must be framed as Media Studio requests, not as invented/pretended assets.
6. The implementation must stay safe: no deploy, no paid media generation, no destructive site writes.
7. The behavior must be testable without launching the full Studio server.

## Acceptance criteria

- A pure quality-flow module can extract research, media, and component needs from a spec/user message.
- The module produces prompt context containing the cross-studio contract.
- The module calls Component Studio search context for candidate reuse.
- The module produces dry-run Media Studio planning context.
- Site Studio `buildPromptContext()` appends the quality-flow prompt block.
- Focused tests pass.
