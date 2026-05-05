# MBSH — Canonical Rename (2026-05-05)

`mbsh-reunion-v2` is now the source of truth and has been renamed to `mbsh-reunion`. Earlier copies are archived. All historical docs that reference `mbsh-reunion-v2` describe state that was correct on 2026-05-04 and are kept for provenance.

## Final layout

| Path | Status | GitHub |
|---|---|---|
| `~/famtastic-sites/mbsh-reunion/` | **Canonical site** (was v2) | `git@github.com:famtastic-fritz/mbsh-reunion.git` (force-pushed v2 over v1) |
| `~/famtastic-sites/_archive/mbsh-reunion-v1-archived-2026-05-05/` | Archived | (no remote on archive) |
| `~/famtastic-sites/_archive/site-mbsh96reunion-archived-2026-05-05/` | Archived | (no remote on archive) |
| `~/famtastic/sites/site-mbsh-reunion/` | Studio sandbox (asset workshop, gitignored) | n/a |

## Branches

`main`, `staging`, `dev` all created and pushed to origin.

## Vault keys

Migrated from `sites/mbsh-reunion-v2/*` to `sites/mbsh-reunion/*`. Old keys removed.

## Netlify

Project `street-family-reunion-staging` (id `3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`) renamed to `mbsh-reunion-staging`. Default URL: `https://mbsh-reunion-staging.netlify.app`.

Fritz completed the Netlify GitHub provider link through the Netlify UI on 2026-05-05. The staging project now deploys from `famtastic-fritz/mbsh-reunion` branch `staging`, with publish directory `frontend/` and no build command.

Verified staging settings:

- Site id: `3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`
- Repo: `https://github.com/famtastic-fritz/mbsh-reunion`
- Provider: GitHub
- Production branch: `staging`
- Allowed branches: `staging`
- Build command: none
- Publish directory: `frontend/`
- Latest deploy state: `ready`

Proof: `proofs/mbsh-netlify-branch-link-2026-05-05.log`.

## Promote-to-prod model

A separate Netlify production project remains the intended production path:

- Name: `mbsh-reunion`
- URL: `mbsh-reunion.netlify.app` to custom domain `mbsh96reunion.com`
- Production branch: `main`

Promotion ladder:

- `dev` branch: local only
- `staging` branch: auto-deploys to staging Netlify
- `main` branch: deploys to production Netlify/custom domain
- Tags `vYYYY.MM.DD-HHMM`: release markers for rollback tooling

## Provision-site verification

After cleanup, `platform studio provision-site mbsh-reunion --check` returned 12/12 ready or present, 0 blocked. Proof: `proofs/studio-service-auth-mbsh-reunion-2026-05-05.json`.
