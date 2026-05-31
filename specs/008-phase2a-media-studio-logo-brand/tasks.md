# Phase 2A Tasks — Media Studio Logo/Brand Workflow

Status: draft implementation checklist

## Task 1: Register logo artifacts as Media Studio inputs
Create a tracked manifest pointing to original logo, liked concept, secondary rendition, and MuAPI archive manifest. Verify files exist; do not copy large local archives into git.

## Task 2: Build BrandProject and LogoInput storage
TDD: create tests for creating/listing a brand project and attaching logo inputs.

## Task 3: Build Prompt Lab dry-run model
TDD: create prompt version records with provider/model/cost estimate/status. No paid generation.

## Task 4: Build Variant Grid importer
TDD: import existing WIP image paths as variants and mark status/notes.

## Task 5: Build Critique rubric
TDD: score/readability/scalability/brand-fit/dark-light/production-readiness.

## Task 6: Build Usage Test manifest
TDD: record required contexts and proof assets; screenshots can be manual at first.

## Task 7: Generate initial DESIGN.md draft
Use design-md skill; lint with npx @google/design.md once palette/type are chosen.

## Task 8: Prototype Logo Lab UI
Start with static/React screen prototype: intake, concept board, prompt lab, variant grid, critique, brand kit export.

## Task 9: Add post-eval hook
After each logo workflow run, record reusable prompts, skill opportunities, process gaps, and tool needs.

## Task 10: Fritz review gate
Do not generate paid variants or call logo final until Fritz reviews screen flow and visual direction.
