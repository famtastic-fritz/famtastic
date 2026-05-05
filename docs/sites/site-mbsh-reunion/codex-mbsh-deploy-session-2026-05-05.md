# MBSH Deploy Session — 2026-05-05

Branch: `codex/mbsh-deploy`
Base: `origin/main`
Scope: MBSH deploy completion only. Canonical docs and locked memory/capture/plans scopes were not edited.

## Inputs Read

- `docs/sites/site-mbsh-reunion/CANONICAL-RENAME-2026-05-05.md` from `feat/ops-workspace-gui`, because it was not present on `origin/main` when the branch was created.
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion/README.md`.

## Netlify

Netlify project `mbsh-reunion-staging` exists with id `3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`, but Git-provider linking still requires the Netlify UI. Added `docs/sites/site-mbsh-reunion/NETLIFY-LINK-STEPS.md` with the exact Fritz handoff:

- GitHub repo: `git@github.com:famtastic-fritz/mbsh-reunion.git`
- Production branch: `staging`
- Build command: none
- Publish directory: `frontend/`

## Backend Deploy

Command:

```bash
platform/famtastic-platform deploy backend mbsh-reunion
```

Result: passed.

SSH was unavailable for `nineoo@FAMTASTICINC.COM`. Host trust was repaired with `ssh-keyscan`, but key/passwordless auth still failed. The platform deploy command now falls back to cPanel UAPI `Fileman::upload_files`, using `studio.cpanel.api_token` from the platform vault. Backend PHP files, cron scripts, libraries, schema, and upload hardening were uploaded to `public_html/`.

Proof: `proofs/mbsh-deploy-backend-2026-05-05-cpanel-uapi-overwrite.log`

## Database

Command:

```bash
platform/famtastic-platform db apply-schema mbsh-reunion production
```

Result: passed.

The cPanel account already had database `mbsh96_reunion` and user `mbsh_user`; the older `nineoo_mbsh96_reunion` / `nineoo_mbsh_user` names were stale. The branch spec was corrected to the actual cPanel DB/user. The command reset `mbsh_user` to the vaulted `sites/mbsh-reunion/db_password.production`, granted privileges, wrote `/home/nineoo/.config/mbsh-config.php`, and applied the schema with a temporary PHP runner over HTTPS. The runner reported 10 tables.

Proof: `proofs/mbsh-db-apply-schema-2026-05-05-final.log`

## Email

Command:

```bash
platform/famtastic-platform email verify-resend-domain mbsh-reunion
```

Result: passed.

Resend reported `send.mbsh96reunion.com` already verified.

Proof: `proofs/mbsh-email-verify-resend-domain-2026-05-05.log`

## Cron

Command:

```bash
platform/famtastic-platform cron register mbsh-reunion
```

Result: passed.

Registered:

- `0 7 * * * /usr/bin/php /home/nineoo/public_html/cron/send-capsules.php`
- `0 3 * * * /usr/bin/php /home/nineoo/public_html/cron/cleanup-rate-limits.php`

Proof: `proofs/mbsh-cron-register-2026-05-05.log`

## CORS

Command:

```bash
platform/famtastic-platform cors lockdown mbsh-reunion production
```

Result: passed.

SSH was unavailable, so the command verified the cPanel config written by `db apply-schema`. The config contains locked Netlify staging origin patterns for `mbsh-reunion-staging`.

Proof: `proofs/mbsh-cors-lockdown-2026-05-05.log`

## Smoke

Command:

```bash
platform/famtastic-platform smoke test mbsh-reunion
```

Result: passed with DNS fallback.

`api.mbsh96reunion.com` does not currently resolve. The smoke runner recorded that blocker and fell back to `https://FAMTASTICINC.COM` to prove backend runtime behavior. Results:

- RSVP POST: pass
- Capsule POST: pass
- Chatbot fallback POST: pass
- Attendees GET: pass
- Sponsors GET: pass
- In Memory GET: pass
- Blocked-origin CORS rejection: pass

Proof: `proofs/mbsh-smoke-test-2026-05-05-green.log`

## Remaining Blockers

1. Complete Netlify Git-provider linking in the UI for `mbsh-reunion-staging`.
2. Rerun frontend deploy proof from the linked staging project.

## 2026-05-05 API DNS/TLS Follow-Up

`api.mbsh96reunion.com` was repaired after the initial deploy proof. The domain uses GoDaddy DNS (`ns23.domaincontrol.com` / `ns24.domaincontrol.com`), not a cPanel-owned zone. Creating the cPanel addon/vhost for `api.mbsh96reunion.com` also created the authoritative A record to `107.180.51.234`.

The cPanel account does not expose AutoSSL, so a certificate was issued through Let's Encrypt HTTP-01 using cPanel Fileman upload hooks for the challenge file. The issued certificate was installed through cPanel `SSL/install_ssl` for `api.mbsh96reunion.com`.

Final verification passed against the canonical API origin:

- DNS: `api.mbsh96reunion.com` resolves to `107.180.51.234` through GoDaddy authoritative DNS, Cloudflare DNS, and Google DNS.
- TLS: certificate subject/SAN is `api.mbsh96reunion.com`, issuer is Let's Encrypt `E8`, expiry is `2026-08-03`.
- Runtime: `https://api.mbsh96reunion.com/attendees.php` returns `200` with production CORS.
- Platform smoke: `platform smoke test mbsh-reunion` passes `7/7` with `dns_fallback=false`.

Proof: `proofs/mbsh-api-dns-tls-smoke-2026-05-05.log`.

## Task State

`task-2026-05-04-027` was updated from `blocked` to `passed_with_blockers`. The old blockers for missing config/secrets, null API base URL, and missing service access are no longer accurate. The remaining blockers are Netlify UI linking and unresolved API DNS.
