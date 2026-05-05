# MBSH Launch Unblock Packet — 2026-05-05

## Verdict

The MBSH leftovers are now one grouped launch unblock lane with two parts:

1. **Media/story readiness:** resolved locally.
2. **Live deploy proof:** still blocked by Studio-level service auth/provisioning.

## Media / Story Readiness

Status: **completed for launch-safe generated/derivative assets.**

The seven referenced story image paths now exist in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/`:

- `then-1996-hallway.jpg`
- `now-miami-beach.jpg`
- `era-1926-1959.jpg`
- `era-1960-1979.jpg`
- `era-1980s.jpg`
- `era-1996.jpg`
- `era-2026.jpg`

The two Story images were converted from the canonical promoted generated stills in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/frontend/assets/story/`. The five timeline images were exported as still frames from the existing generated background loops already present in v2.

Rights and provenance are recorded in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/assets/story/RIGHTS-MANIFEST.md`.

Proof:

- `/Users/famtasticfritz/famtastic/proofs/mbsh-story-assets-2026-05-05.json`
- `/Users/famtasticfritz/famtastic/proofs/mbsh-story-assets-2026-05-05.png`

## Live Deploy Proof

Status: **still externally blocked.**

The remaining hard blocker is Studio service provisioning, not local source
code and not MBSH owning provider accounts. MBSH is a generated site product;
Site Studio/platform owns Netlify, Resend, GoDaddy/cPanel, DNS, SSH, and DB
provider relationships.

- `fam-hub platform bootstrap-services` must verify or migrate Studio-owned provider auth.
- `fam-hub platform provision-site mbsh-reunion-v2 --check --proof` must verify MBSH consumes Studio services.
- Studio must generate the production backend secrets/config and production `API_BASE_URL`.
- Any remaining human step should be provider-enforced only: OAuth/login, token creation, DNS UI if API credentials are unavailable, or SSH host trust.

Until those are available, `task-2026-05-04-027` remains blocked.

## Current Task State

| Task | Status | Decision |
|---|---|---|
| `task-2026-05-04-027` Finish MBSH deploy proof | Blocked | Keep open; blocked by Studio service provisioning, not MBSH-owned provider setup. |
| `task-2026-05-04-028` Complete MBSH media/story assets | Completed | Seven referenced files and rights manifest exist; Playwright file render proof passed. |

## Next Action

Bootstrap Studio services, provision-check MBSH as a generated site consumer,
then run the smoke and rollback checklist from
`docs/sites/site-mbsh-reunion/deploy-proof-2026-05-04.md`.
