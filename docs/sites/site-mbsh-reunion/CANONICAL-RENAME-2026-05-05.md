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

**Manual step still required:** the Netlify to GitHub link must be established through the Netlify UI. Netlify's GitHub provider connection cannot be set reliably through the API for this project. After the rename, build settings came back empty.

Required settings:

1. Open `https://app.netlify.com/projects/mbsh-reunion-staging/settings/deploys`.
2. Link site to repo: `git@github.com:famtastic-fritz/mbsh-reunion.git`.
3. Production branch: `staging`.
4. Build command: none.
5. Publish directory: `frontend/`.

## Promote-to-prod model

A separate Netlify production project remains the intended production path:

- Name: `mbsh-reunion`
- URL: `mbsh-reunion.netlify.app` to custom domain `mbsh96reunion.com`
- Production branch: `main`

Promotion ladder:

- `dev` branch: local only
- `staging` branch: auto-deploys to staging Netlify after UI link
- `main` branch: deploys to production Netlify/custom domain
- Tags `vYYYY.MM.DD-HHMM`: release markers for rollback tooling

## Provision-site verification

After cleanup, `platform studio provision-site mbsh-reunion --check` returned 12/12 ready or present, 0 blocked. Proof: `proofs/studio-service-auth-mbsh-reunion-2026-05-05.json`.
