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

Migrated from `sites/mbsh-reunion-v2/*` → `sites/mbsh-reunion/*`. Old keys removed.

## Netlify

Project `street-family-reunion-staging` (id `3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`) renamed to `mbsh-reunion-staging`. Default URL: `https://mbsh-reunion-staging.netlify.app`.

**MANUAL STEP STILL REQUIRED:** the Netlify ↔ GitHub link must be (re)established via the Netlify UI — Netlify's git connection cannot be set via API. After my rename, the build_settings came back null. Steps:

1. https://app.netlify.com/sites/mbsh-reunion-staging/settings/deploys
2. Link site to repo: `git@github.com:famtastic-fritz/mbsh-reunion.git`
3. Production branch: `staging` (the staging branch deploys to this Netlify project)
4. Build command: (none — netlify.toml takes over)
5. Publish directory: `frontend/` (already in netlify.toml)

## Promote-to-prod model (designed — implementation pending)

A separate Netlify project will be created for production:
- Name: `mbsh-reunion`
- URL: `mbsh-reunion.netlify.app` → custom domain `mbsh96reunion.com`
- Production branch: `main`

Promotion ladder:
- `dev` branch → no auto-deploy (local only)
- `staging` branch → auto-deploys to staging Netlify
- `main` branch → auto-deploys to prod Netlify, custom domain
- Tags `vYYYY.MM.DD-HHMM` → immutable release markers, used by `platform site rollback`

Implementation lives in `plan_2026_05_05_platform_site_promotion`.

## Provision-site verification

After cleanup, `platform studio provision-site mbsh-reunion --check` returns 12/12 ready/present, 0 blocked. Proof: `proofs/studio-service-auth-mbsh-reunion-2026-05-05.json`.
