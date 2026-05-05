# Netlify Link Verification — MBSH Reunion Staging

This file originally captured the manual Netlify UI steps needed to connect the staging project to GitHub. Fritz completed the provider link in the Netlify UI on 2026-05-05. This document now records the verified state.

## Verified Target

- Netlify project: `mbsh-reunion-staging`
- Netlify site id: `3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`
- Netlify URL: `https://mbsh-reunion-staging.netlify.app`
- GitHub repo: `https://github.com/famtastic-fritz/mbsh-reunion`
- Production branch for this Netlify project: `staging`
- Build command: none
- Publish directory: `frontend/`
- Latest verified deploy state: `ready`

## Verified Production Project

- Netlify project: `loquacious-valkyrie-37d5f8`
- Netlify site id: `d83da14e-6513-4407-8cdf-8176975690c0`
- Netlify URL: `https://loquacious-valkyrie-37d5f8.netlify.app`
- Custom domain: `https://mbsh96reunion.com`
- GitHub repo: `https://github.com/famtastic-fritz/mbsh-reunion`
- Production branch: `main`
- Build command: none
- Publish directory: `frontend/`
- Latest verified deploy state: `ready`

## Verification

Run:

```bash
cd /Users/famtasticfritz/famtastic-sites/mbsh-reunion
netlify status
netlify sites:list --json | jq '.[] | select(.id=="3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf")'
netlify sites:list --json | jq '.[] | select(.id=="d83da14e-6513-4407-8cdf-8176975690c0")'
curl -I https://mbsh-reunion-staging.netlify.app/
curl -I https://mbsh96reunion.com/
```

Expected result:

- `netlify status` reports the local repo is linked to `mbsh-reunion-staging`.
- The site record shows non-empty build settings for repo `famtastic-fritz/mbsh-reunion`.
- `https://mbsh-reunion-staging.netlify.app` serves the current `staging` branch deploy.
- `https://mbsh96reunion.com` serves the current `main` branch deploy through the production Netlify project.

Proof: `proofs/mbsh-netlify-branch-link-2026-05-05.log`.
