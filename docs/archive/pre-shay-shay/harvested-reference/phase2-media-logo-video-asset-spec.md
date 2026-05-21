<!--
Pre-Shay-Shay harvested reference
Source worktree: /Users/famtasticfritz/famtastic-convergence-dossier
Source branch: research/studio-intelligence-foundation-20260508
Source path: docs/process/FAMTASTIC-MEDIA-STUDIO-LOGO-VIDEO-ASSET-SPEC.md
Consolidation status: reference-current-input
Rule: reference only unless reconciled into the current Phase 2 plan.
-->

# FAMtastic Media Studio Logo Video Asset Spec

**Status:** planning/spec only
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)
**Purpose:** define Media Studio modes and how media work supports site builds.

## Media Studio Modes

- Asset Library
- Hero Image workflow
- Logo Lab
- Brand Kit
- Adobe Handoff
- Video Lab / Video Prompt Packet
- Image cleanup / alpha workflow
- Vectorization workflow
- Export / usage-test workflow

## Asset Library

The Asset Library is the visible workspace for the Media Library Asset Registry. It shows assets by status, source, prompt lineage, allowed slots, variants, QA, and usage.

## Hero Image Workflow

Hero images start from research and page purpose:

```text
research insight
-> visual direction
-> prompt object
-> generated candidates
-> critique
-> variants
-> approved media asset
-> component binding
-> slot injection
```

## Logo Lab

Logo creation is not the same as hero image generation.

Logo Lab includes:

- brief
- concept board
- variant grid
- comparison
- prompt history
- vector pass
- Adobe handoff
- lockups
- usage tests
- brand kit promotion

Logo work should prove usage across real contexts before promotion:

- nav
- favicon
- social preview
- dark background
- light background
- mobile header
- merch/mock usage where relevant

## Brand Kit

Brand Kit stores:

- logo lockups
- colors
- type
- usage rules
- spacing
- visual motifs
- motion rules
- prompt constraints

## Adobe Handoff

Adobe is polish/finalization and handoff, not the only source of truth.

Adobe handoff should receive:

- selected concept
- prompt history
- usage requirements
- vectorization target
- lockup requirements
- export formats

## Video Lab

Video Lab is not fully automated unless proven.

Near-term mode is planning/manual provider prompt packet.

Background video flow:

```text
still image
-> image-to-video provider
-> loop asset
-> compress
-> register
-> inject
```

Video assets must go through Capability Truth and Cost Governance before generation.

## Image Cleanup / Alpha Workflow

Cleanup handles:

- background removal
- alpha inspection
- halo detection
- compression
- mobile variants
- fallback creation

## Vectorization Workflow

Vectorization is required for:

- logos
- marks
- icons
- reusable brand shapes

It is not required for every generated image.

## Export / Usage-Test Workflow

Exports are approved only after usage tests confirm the asset works in its target contexts.

## Media Injection

- media assets must be registered before use
- approved media binds to components
- components install into slots

## Must Not Drift

- Do not start FAMtastic logo execution before Studio media flows are mapped.
- Do not treat hero generation as logo generation.
- Do not make Adobe the only source of truth.
- Do not inject media before registration and approval.
- Do not automate video generation until provider, cost, and QA proof exist.

## Acceptance Criteria

- Media Studio modes are named.
- Logo Lab and Hero Image workflow are separate.
- Video Lab is bounded to prompt packets until proven.
- Adobe role is clear.
- Media injection follows registry/component/slot flow.

## Not Yet / Out Of Scope

- No logo creation.
- No video generation.
- No Adobe automation.
- No Media Studio UI.
- No asset exports.
