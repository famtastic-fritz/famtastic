# MBSH Media/Story Readiness Checklist

## Goal

Unblock MBSH story and gallery readiness by defining the exact missing assets, rights state, and verification path.

## Missing Assets

The current blocker is seven referenced `frontend/assets/story/*.jpg` files in the MBSH v2 deploy repo. The readiness pass must map each reference to a real source or generated substitute.

## Action Items

1. Inventory every `frontend/assets/story/*.jpg` reference in the deploy repo.
2. Create an asset manifest with path, intended scene, source type, rights status, alt text, and approval state.
3. Decide per asset: archival photo, crowd-sourced photo, generated substitute, or remove/reference change.
4. Generate only non-sensitive substitute assets when rights are unavailable.
5. Add or update files in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/`.
6. Browser-verify Story and Through the Years sections after assets exist.
7. Update `docs/sites/site-mbsh-reunion/media-story-assets-verification-2026-05-04.md`.

## Acceptance

- All referenced story image paths resolve.
- Every asset has alt text and rights/approval status.
- Browser proof shows no broken story/gallery images.

## Hard Stops

- Do not invent real-person archival claims for generated assets.
- Do not publish crowd-sourced images without approval state.
