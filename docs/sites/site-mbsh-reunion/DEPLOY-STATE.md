# MBSH Reunion Deploy State

**Date:** 2026-05-04  
**Parent plan:** `site-mbsh-reunion`  
**Status:** Split state documented; deploy repo remains separate from Studio repo.

## Boundary

MBSH is site-scoped production proof, but it has two state homes:

| State | Location | Ownership |
|---|---|---|
| Studio canonical site record | `sites/site-mbsh-reunion/` | FAMtastic Studio repo: spec, memory, research, worker queue, Studio preview symlink. |
| Deployable site implementation | `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/` | Standalone deploy repo: frontend, backend PHP, schema, config, Netlify settings, setup scripts. |
| Studio preview target | `sites/site-mbsh-reunion/dist` | Symlink to `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend`. |
| Audit evidence | `docs/sites/site-mbsh-reunion/cowork-audit-001/` | Proof that Studio could not reproduce the intended MBSH site from intent alone. |

## Rule

Do not mix deploy implementation state into the Studio repo as if Studio built
it natively. Studio may reference, preview, audit, and learn from the deploy
repo, but backend deployment, Netlify config, environment variables, and
production smoke tests belong to the deploy repo until promoted into reusable
platform capabilities.

## Site-Scoped Work Buckets

| Bucket | Site-scoped next action | Promote upward only if |
|---|---|---|
| Backend | Verify PHP endpoints, schema, local/staging environment needs. | The capability becomes reusable backend deploy automation. |
| RSVP | Test form path, persistence, exports, validation, and email behavior. | The RSVP pattern becomes a reusable Studio component/workflow. |
| Sponsors | Test sponsor packages, submission path, assets, and approval flow. | Sponsor packages become reusable revenue module. |
| Media | Recover/finish story section assets, mascot usage, gallery proof, rights state. | Media needs become Media Studio route/asset-library gaps. |
| Chatbot | Verify Phase 1 chatbot content path and boundaries. | Assistant behavior becomes reusable Component Studio module. |
| Deploy | Connect Netlify/backend/DNS with smoke and rollback proof. | Deploy primitive needs become platform capability gaps. |
| Content | Complete final copy/content deltas against V1 brief. | Brief-to-site fulfillment failure generalizes to BuildIntent/trace. |
| Proof | Keep visual, link, console, a11y, API, and fulfillment proof together. | Audit harness pattern applies to any Studio-built site. |

## Current Proof

- `sites/site-mbsh-reunion/dist` is a symlink to the deploy repo frontend.
- Deploy repo contains `frontend/`, `backend/`, `backend/schema.sql`,
  `config/site-config.json`, `netlify.toml`, and `scripts/setup-mbsh-backend.sh`.
- Studio audit output in `cowork-audit-001` remains evidence for platform gaps,
  not a replacement for deploy proof.

