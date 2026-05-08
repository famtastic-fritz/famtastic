# FAMtastic Dynamic Recipe Resolver

**Status:** planning/spec only  
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)  
**Purpose:** define how FAMtastic avoids rigid templates while still reusing build intelligence.

## Core Rule

Simple does not mean generic. Every recipe receives intelligence; depth changes by scope.

The recipe model is:

```text
Base Build Type + Capability Modules + Polish Level + Lifecycle Model
```

## Recipe Request Object

```yaml
recipe_request:
  id: request.shipping_company_001
  source: enhanced_brief
  base_type: local_business
  vertical: logistics
  customer_context:
    - Miami pickup
    - Bahamas shipping
  capability_modules:
    - quote_request
    - lead_capture
    - generated_assets
  polish_level: standard_plus
  lifecycle_model: production_mvp_then_monthly_improvement
  constraints:
    budget_lane: cheap
    launch_target: staging_mvp
  research_basis:
    - local pickup convenience is a differentiator
    - trust and handling transparency matter
```

## Recipe Fingerprint

A fingerprint is the comparable shape of the request:

```yaml
recipe_fingerprint:
  base_type: local_business
  vertical_cluster: service_logistics
  conversion_goal: quote_request
  content_model:
    - static_pages
    - editable_config
  modules:
    - lead_capture
    - generated_assets
  polish_level: standard_plus
  lifecycle: iterative_business_site
  constraints:
    cost_lane: cheap
    production_readiness: mvp
```

## Resolver Flow

1. Receive build request / enhanced brief.
2. Search existing Recipe Registry.
3. Compare requested fingerprint to existing recipes.
4. Score match.
5. Choose:
   - reuse existing
   - extend existing
   - create hybrid
   - create new
   - deprecate old
6. Record why.
7. Bind recipe to capabilities and QA gates.
8. Feed recipe into full-run plan.

## Existing Recipe Lookup

Lookup should consider:

- base type
- vertical
- conversion goal
- required capabilities
- lifecycle model
- polish level
- prior learning effectiveness
- cost lane
- known blockers

## Similarity Scoring

Scores should be explainable:

| Dimension | Weight | Example |
| --- | --- | --- |
| base type | high | event vs local business |
| conversion model | high | tickets vs quote request |
| capability modules | high | sponsor flow vs ecommerce |
| lifecycle | medium | campaign site vs monthly improvement |
| polish level | medium | cinematic vs standard |
| vertical | medium | logistics vs reunion |
| visual language | low-medium | premium editorial vs warm local |

## Module Compatibility Check

Before reusing or combining modules, check:

- required data exists or can be collected
- required provider capability is working
- module does not conflict with lifecycle
- module has QA gates
- module has fallback behavior
- module cost fits selected lane

## Capability Requirements

Recipes bind to capabilities by status, not assumption.

```yaml
capability_requirements:
  generated_assets:
    required_for: hero_image
    acceptable_status: [working, partial]
    fallback: manual_asset_upload
  quote_form:
    required_for: conversion
    acceptable_status: [working]
    fallback: mailto_or_phone_cta
```

## Hybrid Recipe Creation

Hybrid recipes combine proven modules without pretending the combination is already proven.

Example:

```text
cinematic event shell
+ sponsor flow module
+ character assistant module
= cinematic event with sponsor flow and guide
```

Hybrid status starts as candidate until proof exists.

## Recipe Extension

Extend an existing recipe when:

- the base fingerprint is a strong match
- one or two modules are missing
- the new module is reusable
- the extension does not change the core conversion model

## Recipe Versioning

Recipes need semantic versioning:

- patch: QA rule, prompt wording, fallback, cost estimate
- minor: new compatible module or optional workflow
- major: lifecycle, conversion model, or data contract changes

## Recipe Deprecation

Deprecate recipes when:

- a newer recipe proves better outcomes
- capability assumptions are no longer true
- cost profile becomes unacceptable
- QA failures repeat
- a module becomes unsafe or obsolete

## Recipe Promotion

Promotion requires:

- successful build proof
- QA pass
- closeout with learnings
- capability truth references
- cost results
- reusable pattern justification

Learning Board owns final promotion. Source workspaces nominate.

## Decision Logging

Every resolver decision records:

- matched recipes
- scores
- chosen path
- rejected alternatives
- capability assumptions
- cost assumptions
- QA gates attached
- expected proof

## Examples

| Request | Recipe shape |
| --- | --- |
| simple + generated assets | static/local build + generated hero/media + lightweight QA + MVP lifecycle |
| cinematic + ecommerce | cinematic experience + product/payment modules + premium media + production readiness gates |
| event + sponsor flow | event/campaign base + sponsor tiers + RSVP/ticket interest + post-launch iteration |
| standard + character assistant | standard business/site base + site assistant component + FAQ + safe actions |
| CMS + premium visuals | editable content model + premium theme + media registry + content QA |
| shipping-company local business conversion recipe | local service conversion + research + quote request + pickup trust proof + generated hero assets |
| MBSH cinematic event recipe | cinematic event + character guide + sponsor flow + RSVP + archival/memorial modules |

## Must Not Drift

- Do not use rigid templates as the real decision model.
- Do not create a new recipe when extension or hybridization is enough.
- Do not reuse a recipe without checking capabilities.
- Do not promote recipes without proof.

## Acceptance Criteria

- Resolver can explain reuse vs extension vs hybrid vs new.
- Recipe decisions attach capabilities and QA gates.
- Simple builds still receive intelligence.
- MBSH and shipping examples fit the model.

## Not Yet / Out Of Scope

- No registry schema migration.
- No resolver implementation.
- No recipe entries are created by this doc.
