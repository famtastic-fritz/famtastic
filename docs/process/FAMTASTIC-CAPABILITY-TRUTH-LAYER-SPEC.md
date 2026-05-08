# FAMtastic Capability Truth Layer Spec

**Status:** planning/spec only  
**Primary anchor:** [FAMtastic Research-Driven Build System Blueprint](FAMTASTIC-RESEARCH-DRIVEN-BUILD-SYSTEM-BLUEPRINT.md)  
**Purpose:** define the honest status layer for tools/capabilities.

## Status Vocabulary

- working
- partial
- stubbed
- broken
- manual_only
- costly
- approval_required

## Core Rules

- Declared config does not mean working.
- A capability is working only if there is a real handler and proof.
- Every capability should have last probe, last error, cost tier, fallback, approval requirement, and proof reference.
- Missing capability blocks only features that require it.
- Capability Truth must be checked before autonomous execution.

## Capability Record

```yaml
capability:
  id: media.image_cleanup.local
  status: working
  handler: scripts/media/cleanup-alpha
  last_probe: 2026-05-08T12:00:00-04:00
  last_error: null
  cost_tier: cheap_local
  fallback: manual_cleanup
  approval_required: false
  proof_ref: proofs/media-image-cleanup-local-2026-05-08.md
```

## Examples

| Capability condition | Status |
| --- | --- |
| Gemini key present but invalid | broken |
| Netlify configured but out of build minutes | partial/broken for deploy |
| Video generation unproven | manual_only/partial |
| Firefly credentials missing | broken/unconfigured |
| Local image cleanup available | working |

## Cost And Approval

Capabilities can be functional but gated:

- costly
- approval_required
- manual_only

Anything projected over $50 requires explicit Fritz approval even if the capability itself is working.

## Feature Blocking

Missing capability blocks only features that require it.

Example:

- no video provider does not block static site launch
- no payment provider blocks checkout, not sponsor-interest form
- no generated image capability blocks generated hero assets, not manual asset upload

## Probe Requirements

Each capability should be probeable where possible:

- provider auth check
- quota/limit check
- minimal action test
- fallback check
- proof write

## Must Not Drift

- Do not treat env vars as proof.
- Do not mark a capability working without a handler and proof.
- Do not let missing optional capability block unrelated build progress.
- Do not run autonomous work against unverified capabilities.

## Acceptance Criteria

- Status vocabulary is standardized.
- Capability records include proof and fallback.
- Cost and approval are attached to capability decisions.
- Build plans can check capability truth before execution.

## Not Yet / Out Of Scope

- No capability registry migration.
- No probe implementation.
- No provider auth work.
