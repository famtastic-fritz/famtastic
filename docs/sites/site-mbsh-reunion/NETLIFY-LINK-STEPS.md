# Netlify Link Steps — MBSH Reunion Staging

Netlify's GitHub repo connection has to be completed in the Netlify UI. The Netlify API/CLI can inspect the site, but it does not expose a reliable way to attach the Git provider connection for this project.

## Target

- Netlify project: `mbsh-reunion-staging`
- Netlify site id: `3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`
- Netlify URL: `https://mbsh-reunion-staging.netlify.app`
- GitHub repo: `git@github.com:famtastic-fritz/mbsh-reunion.git`
- Production branch for this Netlify project: `staging`
- Build command: none
- Publish directory: `frontend/`

## Steps

1. Open `https://app.netlify.com/projects/mbsh-reunion-staging/settings/deploys`.
2. In **Build settings**, choose the option to link or edit the connected repository.
3. Select GitHub as the provider.
4. Select repository `famtastic-fritz/mbsh-reunion`.
5. Set production branch to `staging`.
6. Leave build command blank.
7. Set publish directory to `frontend/`.
8. Save settings.
9. Trigger a deploy from the `staging` branch.

## Verification

After saving, run:

```bash
cd /Users/famtasticfritz/famtastic-sites/mbsh-reunion
netlify status
netlify sites:list --json | jq '.[] | select(.id=="3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf")'
```

Expected result:

- `netlify status` reports the local repo is linked to `mbsh-reunion-staging`.
- The site record shows non-empty build settings for repo `famtastic-fritz/mbsh-reunion`.
- `https://mbsh-reunion-staging.netlify.app` serves the current `staging` branch deploy.
