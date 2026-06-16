# MBSH Deploy Access Handoff Checklist

## Goal

Make the deploy blocker actionable by naming every external access/config item required before live MBSH proof can run.

## Required Access And Config

1. Netlify project access for the MBSH v2 deploy target.
2. DNS/domain access for final domain or subdomain.
3. GoDaddy/PHP hosting access for backend deployment.
4. MySQL database host, database name, user, password, and table creation permission.
5. Resend API key and approved sender/domain state.
6. Production backend origin for `API_BASE_URL`.
7. Secret/config delivery path for `.env`, `.mbsh-config.local.php`, or `MBSH_CONFIG_PATH`.

## Action Items

1. Fill the access/config table before any production deploy attempt.
2. Confirm rollback path for frontend and backend separately.
3. Run backend health/config smoke.
4. Run RSVP, sponsor, chatbot fallback, admin/export, and email smoke tests.
5. Capture production proof and update `docs/sites/site-mbsh-reunion/deploy-proof-2026-05-04.md`.

## Acceptance

- Every required external item has an owner, value/location, and verification status.
- Production smoke tests pass or fail with exact evidence.
- Rollback instructions are proven, not assumed.

## Hard Stops

- Do not change DNS or deploy production without explicit access/config present.
- Do not commit secrets.
