# Phase 2A Spec — Media Studio Logo/Brand Workflow

Status: draft, ready for Fritz review

## Goal

Create the FAMtastic logo and brand system through a real Media Studio workflow, while designing the workflow/screens/tools needed to make future media jobs production-ready instead of copy/paste experiments.

## Product promise

Fritz should be able to start with a rough creative direction, old logo artifact, or partial AI concept and move through a guided workflow to a production-ready brand kit with proof, assets, tokens, and usage rules.

## Non-goals for first slice

- Do not claim a final logo is approved before Fritz visually approves it.
- Do not spend MuAPI/image credits without explicit approval.
- Do not make Adobe/Figma/manual tools the source of truth; they are handoff/polish tools.
- Do not build full Mission Control before Media Studio has a valuable workflow.

## Required workflow

1. Intake: brand story, old logo, liked concepts, disliked outputs, goals, constraints.
2. Research: market/category references, logo production standards, visual landscape, tool options.
3. Direction board: selected concepts, reference tags, design language, motion possibilities.
4. Prompt Lab: prompt versions, provider/model target, negative prompts, notes, expected cost.
5. Variant Grid: generated/imported variants with status: raw, promising, rejected, approved-for-refinement.
6. Critique: readability, originality, brand fit, scalability, dark/light use, favicon/social/nav/merch use.
7. Refinement: redraw/vectorize, simplify, lockups, color system, type pairing, spacing rules.
8. Usage Tests: nav, favicon, app icon, dark screen, light screen, social preview, card/mockup, motion intro.
9. Brand Kit: DESIGN.md, tokens, logo files, exports, prompt history, usage rules.
10. Post-Eval: skills/process/media recipes/opportunities captured into Data Center.

## Screens needed

1. Media Studio Home / Brand Projects
2. Logo Lab Intake
3. Concept Board
4. Prompt Lab
5. Generation Plan / Provider Queue
6. Variant Grid
7. Critique & Compare
8. Refinement / Vector Pass
9. Usage Test Board
10. Brand Kit Export
11. Prompt/Asset Lineage
12. Post-Eval / Promote Learnings

## FAMtastic-specific direction

The brand must reconcile two forces:
- origin energy: playful, colorful, bold FAM, green burst, dimensional impact
- current FAMtastic platform direction: night-elegant, premium, cinematic, glass/dark surfaces, culturally fluent, not generic startup

The logo system may therefore need both:
- expressive primary mark for brand storytelling
- refined platform lockup for product surfaces

## Acceptance criteria

- SDD packet exists before UI build.
- Logo artifacts are registered as inputs.
- Workflow supports imported WIPs and generated variants.
- DESIGN.md output is part of the workflow.
- Production readiness requires usage tests, not just a pretty image.
- Prompt history and post-eval are mandatory.
