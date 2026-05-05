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

No deploy blockers remain for the MBSH proof. Staging and production Netlify projects are both GitHub-linked and branch-scoped.

Follow-up platform work remains outside the MBSH deploy proof:

1. Automate renewal for the `api.mbsh96reunion.com` Let's Encrypt certificate before `2026-08-03`.
2. Rename the production Netlify project from `loquacious-valkyrie-37d5f8` to a human-readable production name.
3. Build a structured Site Studio deploy-environment model instead of relying on per-site prose.

## 2026-05-05 API DNS/TLS Follow-Up

`api.mbsh96reunion.com` was repaired after the initial deploy proof. The domain uses GoDaddy DNS (`ns23.domaincontrol.com` / `ns24.domaincontrol.com`), not a cPanel-owned zone. Creating the cPanel addon/vhost for `api.mbsh96reunion.com` also created the authoritative A record to `107.180.51.234`.

The cPanel account does not expose AutoSSL, so a certificate was issued through Let's Encrypt HTTP-01 using cPanel Fileman upload hooks for the challenge file. The issued certificate was installed through cPanel `SSL/install_ssl` for `api.mbsh96reunion.com`.

Final verification passed against the canonical API origin:

- DNS: `api.mbsh96reunion.com` resolves to `107.180.51.234` through GoDaddy authoritative DNS, Cloudflare DNS, and Google DNS.
- TLS: certificate subject/SAN is `api.mbsh96reunion.com`, issuer is Let's Encrypt `E8`, expiry is `2026-08-03`.
- Runtime: `https://api.mbsh96reunion.com/attendees.php` returns `200` with production CORS.
- Platform smoke: `platform smoke test mbsh-reunion` passes `7/7` with `dns_fallback=false`.

Proof: `proofs/mbsh-api-dns-tls-smoke-2026-05-05.log`.

## 2026-05-05 Netlify Branch-Link Follow-Up

Fritz completed the missing Netlify Git-provider link for staging. Verification through the Netlify API now shows:

- Staging project `mbsh-reunion-staging` (`3b4f9abd-d0cd-4b78-9ac1-d1b4b51606bf`) is linked to `https://github.com/famtastic-fritz/mbsh-reunion`, branch `staging`, publish directory `frontend/`.
- Production project `loquacious-valkyrie-37d5f8` (`d83da14e-6513-4407-8cdf-8176975690c0`) is linked to the same repo, branch `main`, publish directory `frontend/`.
- Staging and production both returned HTTP `200` from their root URLs.
- `https://mbsh96reunion.com/` returned HTTP `200` through Netlify.

Proof: `proofs/mbsh-netlify-branch-link-2026-05-05.log`.

## 2026-05-05 Capture Follow-Up

The deploy discoveries were captured into the v0.2 memory flow:

- Source summary: `captures/inbox/mbsh-deploy-discoveries-2026-05-05.md`
- Capture packet: `captures/inbox/cap_2026-05-05T21-12_a27e.json`
- Review proposal: `captures/review/cap_2026-05-05T21-12_a27e.proposal.json`

The capture generated 16 tagged extracts and 8 auto-promote eligible entries. They were left at review/proposal state so canonical memory promotion can happen intentionally.

## Task State

`task-2026-05-04-027` is now `completed`. The old blockers for missing config/secrets, null API base URL, missing service access, API DNS, and Netlify UI linking are no longer accurate.
