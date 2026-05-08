# FAMtastic Media Library Asset Registry Spec

**Status:** planning/spec only  
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)  
**Purpose:** define the Media Library as an active production registry, not simple storage.

## Core Definition

Media Library is not "where images live."

It controls prompt lineage, variants, cleanup, approval, allowed slots, component binding, fallback, and injection.

Generated media cannot become approved media until QA passes.

## Media Asset Fields

Every media asset must declare:

- id
- type
- source/provider
- prompt object id
- research basis
- variants
- dimensions
- formats
- allowed slots
- composition notes
- cleanup status
- alpha/transparency status where applicable
- compression status
- mobile crop status
- usage locations
- fallback asset
- approval state
- rights/source notes
- related component bindings
- QA results

## Example Asset Object

```yaml
media_asset:
  id: shipping_hero_pickup_01
  type: hero_image
  status: approved
  source:
    provider: gemini
    prompt_id: hero_pickup_scene
    research_basis:
      - local pickup is the differentiator
  variants:
    desktop: assets/hero/shipping-pickup-desktop.webp
    mobile: assets/hero/shipping-pickup-mobile.webp
    thumb: assets/hero/shipping-pickup-thumb.webp
  allowed_slots:
    - home.hero.background
    - services.pickup.visual
  composition_notes:
    cta_space: center-right
    subject_position: left-third
  qa:
    alpha_check: not_applicable
    compression: pass
    contrast_safe: pass
    mobile_crop: pass
  fallback:
    asset: shipping_hero_css_gradient
```

## Workflows

### Generate Asset

- receive prompt object
- choose provider based on capability truth and cost lane
- record generation attempt
- store raw result as unapproved variant

### Inspect Asset

- check composition against prompt object
- check artifacts
- check brand and slot fit
- record critique

### Clean Background

- run alpha or background cleanup where required
- inspect for halos or dirty edges
- record cleanup tool and result

### Compress

- generate target formats
- record sizes
- verify visual quality

### Create Variants

- desktop
- mobile
- thumbnail
- transparent where needed
- fallback or poster frame

### Approve

- QA passes
- allowed slots confirmed
- rights/source notes present
- fallback present
- approval recorded

### Bind To Component

- connect approved asset to component prop/slot
- record component binding
- preserve fallback behavior

### Inject Into Slot

- use Component Installer or slot mutation protocol
- verify responsive crop
- attach proof

### Record Usage

- usage location
- component id
- page/slot
- date
- proof reference

### Retire / Deprecate Asset

- mark retired
- identify replacement
- preserve history
- prevent new usage

## Approval States

- draft
- generated
- needs_cleanup
- needs_regeneration
- candidate
- approved
- rejected
- retired

## Must Not Drift

- Do not treat file existence as approval.
- Do not use generated media without prompt lineage.
- Do not inject unapproved media into production slots.
- Do not forget mobile crops.
- Do not approve transparent assets without alpha QA.

## Acceptance Criteria

- Every approved media asset has QA results.
- Every generated asset links to a prompt object.
- Every used asset has usage locations.
- Every asset knows allowed slots and fallback.
- Media Library can answer why an asset exists and where it is used.

## Not Yet / Out Of Scope

- No physical storage migration.
- No media UI implementation.
- No provider integration.
- No asset generation.
