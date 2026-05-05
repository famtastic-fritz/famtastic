# MBSH Deploy Strategy Verification — 2026-05-05

## Current Verified State

MBSH now has the intended two-environment Netlify setup:

- Staging Netlify project: `mbsh-reunion-staging`
- Staging Netlify site id: `3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`
- Staging branch: `staging`
- Staging URL: `https://mbsh-reunion-staging.netlify.app`
- Production Netlify project: `loquacious-valkyrie-37d5f8`
- Production Netlify site id: `d83da14e-6513-4407-8cdf-8176975690c0`
- Production branch: `main`
- Production URL: `https://loquacious-valkyrie-37d5f8.netlify.app`
- Public custom domain: `https://mbsh96reunion.com`

Both Netlify projects are connected to `https://github.com/famtastic-fritz/mbsh-reunion`, use publish directory `frontend/`, and have no build command. Staging deploys only the `staging` branch. Production deploys only the `main` branch.

Proof: `proofs/mbsh-netlify-branch-link-2026-05-05.log`.

## Logical Flow

1. Local feature work happens in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion` on a feature branch or `dev`.
2. When the site is ready for staged review, merge or fast-forward into `staging` and push.
3. Netlify staging auto-deploys from `staging` to `https://mbsh-reunion-staging.netlify.app`.
4. Run frontend smoke against staging and backend smoke against `https://api.mbsh96reunion.com`.
5. When staging is approved, merge `staging` into `main` and push.
6. Netlify production auto-deploys from `main`.
7. Production rollback should use Netlify deploy history or a git revert on `main`, not a DNS change.

## Runtime Dependencies

The frontend is static on Netlify. The backend is platform-managed and currently served through GoDaddy/cPanel:

- API origin: `https://api.mbsh96reunion.com`
- API A record: `107.180.51.234`
- API TLS: Let's Encrypt certificate installed through cPanel `SSL/install_ssl`
- Database: cPanel MariaDB referenced through vaulted Site Studio config
- Email: Resend sender domain `send.mbsh96reunion.com`

Staging and production both currently call the same production API origin. If staging needs isolated backend data later, Site Studio should provision a separate staging backend reference rather than hard-coding another API origin into the frontend.

## Discovered Rules

- Treat Site Studio as the service owner. Sites consume generated service config.
- Keep staging and production as persistent environments; do not delete staging after production exists.
- Do not change DNS to promote or roll back frontend code. DNS points to platform surfaces; deploy history and branches handle release movement.
- Netlify project names can be misleading. Verify by site id, repo path, branch, and latest deploy commit.
- `config/site-config.json` is not currently deployed at that URL; frontend API config is embedded in the current site bundle. Do not use the missing config URL as deploy failure proof unless the frontend is changed to depend on it.

## Remaining Platform Gaps

- API TLS renewal is not automated. The current Let's Encrypt certificate expires on `2026-08-03`.
- The production Netlify project should be renamed from `loquacious-valkyrie-37d5f8` to a human-readable name such as `mbsh-reunion-production`.
- Site Studio needs a deploy-environment model that records local branch, staging project, production project, custom domain, API origin, and promotion status as structured data.
- Site Studio needs a domain-options workflow for purchase/registration decisions. That belongs in a separate platform/domain task, not in the MBSH deploy proof.
