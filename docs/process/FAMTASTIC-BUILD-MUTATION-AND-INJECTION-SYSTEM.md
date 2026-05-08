# FAMtastic Build Mutation And Injection System

**Status:** planning/spec only  
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)  
**Purpose:** define how FAMtastic Studio performs efficient, safe, component-aware changes instead of broad rewrites.

## A. Change Classification

Every requested change must be classified before editing:

- content edit
- style/token edit
- component replacement
- component variant
- slot injection
- layout restructure
- runtime enhancer
- build-time render
- module extraction
- new capability
- new recipe

Classification determines blast radius, proof requirements, registry checks, and QA scope.

## B. Slot Model

Pages and sites expose named slots.

Example slots:

- home.hero
- home.hero.visual
- home.hero.cta
- page.main
- page.form
- page.where_next
- page.footer
- site.nav
- site.chat_assistant
- site.media_backdrop
- playlist.embed
- through_years.main
- ticket.cta

Slots make changes addressable. A builder should be able to say "replace `playlist.embed`" instead of rewriting the playlist page.

## C. Component Injection Contract

Every component must declare:

- id
- type
- version
- status
- allowed slots
- required data
- required assets
- dependencies
- install method
- fallback
- QA gates
- proof requirements
- usage locations
- owner workspace

Example:

```yaml
component:
  id: footer.final_reel
  type: footer
  version: 1.0.0
  status: candidate
  allowed_slots:
    - page.footer
    - site.footer
  required_data:
    - event_name
    - primary_cta
  required_assets:
    - reel_card_texture
  dependencies:
    css:
      - footer-final-reel.css
  install_method: component_installer
  fallback: footer.default_grid
  qa_gates:
    - mobile_viewport_gate
    - contrast_gate
    - footer_treatment_gate
  proof_requirements:
    - desktop screenshot
    - mobile screenshot
    - linked usage record
  usage_locations: []
  owner_workspace: Component Studio
```

## D. Examples

- replace `footer.default_grid` -> `footer.final_reel`
- replace `playlist.placeholder` -> `spotify_embed`
- replace `through_years.coming_soon` -> `archival_filmstrip`
- inject `site_assistant.harry` -> `site.chat_assistant`
- inject approved hero image -> `home.hero.visual`
- replace `ticket_interest_cta` -> `checkout_button`

## E. Prompt-To-Asset-To-Component-To-Slot Flow

```text
research insight
-> prompt object
-> generated variants
-> critique/regeneration
-> cleanup/compression
-> approved media asset
-> asset registry
-> component binding
-> slot injection
-> QA proof
-> learning capture
```

The flow prevents loose media and loose prompts from bypassing the production system.

## F. JS/CSS Rebuild And Modularization Strategy

Large files are allowed during proof-of-concept. They are not the target architecture.

Rules:

- Large files are allowed during proof-of-concept.
- After proof, run modularization audit before reuse.
- Runtime injection is allowed for MVP.
- Build-time rendering should be preferred for reusable production components once stable.
- Runtime injections must be documented.

`premiere.js` should eventually split into:

- sections
- chevrons
- character
- footer
- reel cards
- assets
- QA hooks

Large `server.js` files should split into:

- routes
- services
- registries
- adapters
- middleware
- job runners

## G. Efficient Edit Protocol

Every builder change follows:

1. classify change
2. check registry
3. locate slot/component/module
4. choose smallest safe mutation
5. apply change
6. run targeted QA
7. update registry/learning if reusable

## H. Anti-Drift Rules

- Do not rewrite whole pages when a slot replacement is enough.
- Do not create duplicate components when a variant would work.
- Do not add media directly to a page without registering it.
- Do not promote components to the library without proof.
- Do not leave runtime injections undocumented.
- Do not let generated media become approved without QA.

## Runtime Injection Decision Standard

Runtime injection is acceptable when:

- the component is proving value quickly
- the page build system cannot yet render it cleanly
- the injection is documented
- QA covers the injected result
- there is a later modularization path

Runtime injection is not acceptable when it hides a production dependency that should be explicit.

## Must Not Drift

- Mutation must stay component-aware.
- Slot names must become stable enough for automation.
- Broad rewrites require justification.
- Reusable proof-of-concept code must face modularization before becoming a library pattern.

## Acceptance Criteria

- Every change can be classified before editing.
- Components declare install contracts.
- Slots are named and addressable.
- Prompt/media/component/slot flow is explicit.
- Large-file tolerance is bounded by audit and modularization.

## Not Yet / Out Of Scope

- No installer code.
- No runtime injection code.
- No JS/CSS file split.
- No registry mutation.
