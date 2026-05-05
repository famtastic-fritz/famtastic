# MBSH Launch Unblock Packet — 2026-05-05

## Verdict

The MBSH leftovers are now one grouped launch unblock lane with two parts:

1. **Media/story readiness:** resolved locally.
2. **Live deploy proof:** still blocked by external access and production config.

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

The remaining hard blocker is production access/config, not local source code:

- Netlify project/domain access
- DNS access for apex, `www`, `api`, and Resend sender domain records
- GoDaddy/PHP/MySQL access
- Resend API key and verified sender domain
- Production backend config/secrets
- Production `API_BASE_URL`

Until those are available, `task-2026-05-04-027` remains blocked.

## Current Task State

| Task | Status | Decision |
|---|---|---|
| `task-2026-05-04-027` Finish MBSH deploy proof | Blocked | Keep open; this is the only real MBSH launch blocker left. |
| `task-2026-05-04-028` Complete MBSH media/story assets | Completed | Seven referenced files and rights manifest exist; Playwright file render proof passed. |

## Next Action

Collect the production deploy access/config bundle, then run the smoke and rollback checklist from `docs/sites/site-mbsh-reunion/deploy-proof-2026-05-04.md`.
