# MBSH Deploy Proof — task-2026-05-04-027

Date: 2026-05-04  
Site: `site-mbsh-reunion`  
Deploy implementation inspected: `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2`  
Status: deploy plan and requirements are proven from repo state; live production deploy remains blocked by Studio-level service provisioning, not by MBSH owning provider accounts.

## Corrected Ownership Model

MBSH is a generated site product. Site Studio/platform owns the provider
relationships for Netlify, Resend, GoDaddy/cPanel, DNS, SSH, and database
provisioning. MBSH consumes generated runtime config from those Studio services:
database references, sender-domain config, API origin, backend secrets, and
Netlify site IDs.

The launch proof should therefore be driven through:

```bash
fam-hub platform bootstrap-services
fam-hub platform provision-site mbsh-reunion-v2 --check --proof
```

The site-specific deploy proof remains valid as a smoke checklist, but the
missing work is now tracked as Studio service auth/provisioning instead of
MBSH-specific account setup.

## Scope Inspected

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/netlify.toml`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/README.md`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/DATA-PERSISTENCE.md`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.env.example`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/config/site-config.json`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/scripts/setup-mbsh-backend.sh`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/schema.sql`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/config.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/cors.php`
- Frontend endpoint consumers under `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js`
- Git state of `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2`

The v2 deploy repo had no local git changes at inspection time. Latest commit observed: `e273597 2026-05-02 20:59:23 +0000 Initial v2 build: full multi-page MBSH reunion site`.

## What Can Be Completed Now

The frontend publish path is known and ready for Netlify configuration:

- Netlify config file: `netlify.toml`
- Publish directory: `frontend/`
- Static config path: `/config/site-config.json`
- Immutable assets cache: `/assets/*`
- HTML cache: `public, max-age=300, must-revalidate`
- Config cache: `no-cache`

The backend hosting model is documented and the code supports it:

- Host assumption: GoDaddy cPanel on account `nineoo`.
- SSH target in setup script: `nineoo@FAMTASTICINC.COM`.
- Backend upload target: `/home/nineoo/public_html/`.
- Production config file: `/home/nineoo/.config/mbsh-config.php`, mode `0600`, outside web root.
- Production DB name: `nineoo_mbsh96_reunion_v2`.
- Production DB user: `nineoo_mbsh_user`.
- Pending uploads: `/home/nineoo/uploads-pending`.
- Approved uploads: `/home/nineoo/public_html/uploads/approved`.
- Schema: `backend/schema.sql`, 10 idempotent `CREATE TABLE IF NOT EXISTS` tables.

The setup helper can provision the backend once credentials and access are available:

```bash
bash /Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/scripts/setup-mbsh-backend.sh
```

The backend code can then be uploaded with:

```bash
rsync -avz --exclude='.env' /Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/ nineoo@FAMTASTICINC.COM:public_html/
```

## Production Env And Config Requirements

Frontend public config must be adjusted at deploy time. Current state in `config/site-config.json`:

- `API_BASE_URL`: `null`
- `API_BASE_URL_DEV`: `http://localhost:8888`
- `PAYMENTS_STATUS`: `disabled`
- `REGISTRATION_STATUS`: `open`

For production, `API_BASE_URL` must be set to:

```json
"API_BASE_URL": "https://api.mbsh96reunion.com"
```

Required production backend config keys, loaded by `backend/lib/config.php`:

- `db_host`
- `db_name`
- `db_user`
- `db_password`
- `resend_api_key`
- `resend_from_domain`
- `resend_from_noreply`
- `resend_from_committee`
- `resend_from_harry`
- `resend_reply_to`
- `committee_email`
- `allowed_origins`
- `allowed_origin_patterns`
- `admin_password_hash`
- `admin_csrf_secret`
- `pending_uploads_path`
- `approved_uploads_path`
- `environment`

Resend sender domain expected by `.env.example` and setup script:

- `send.mbsh96reunion.com`
- `noreply@send.mbsh96reunion.com`
- `committee@send.mbsh96reunion.com`
- `harry@send.mbsh96reunion.com`

Cron jobs expected in cPanel:

```cron
0 7 * * * /usr/bin/php /home/nineoo/public_html/cron/send-capsules.php
0 3 * * * /usr/bin/php /home/nineoo/public_html/cron/cleanup-rate-limits.php
```

## DNS, API Origin, CORS, And CSP Requirements

Required public origins:

- Frontend apex: `https://mbsh96reunion.com`
- Frontend www: `https://www.mbsh96reunion.com`
- Backend API/admin origin: `https://api.mbsh96reunion.com`
- Resend sender domain DNS: `send.mbsh96reunion.com`

Netlify custom domains required:

- `mbsh96reunion.com`
- `www.mbsh96reunion.com`

GoDaddy or DNS provider records required:

- Apex and `www` must point to Netlify according to the Netlify site instructions.
- `api.mbsh96reunion.com` must route to the GoDaddy cPanel backend serving `/home/nineoo/public_html`.
- `send.mbsh96reunion.com` must have Resend-provided DNS records verified before production mail can be considered proven.

Production CORS expected by setup script:

- Explicit origins: `https://mbsh96reunion.com`, `https://www.mbsh96reunion.com`, `http://localhost:8080`
- Netlify preview patterns:
  - `/^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/`
  - `/^https:\/\/[a-z0-9-]+\.netlify\.app$/`

Current Netlify CSP allows the intended backend origin:

```text
connect-src 'self' https://api.mbsh96reunion.com
```

If staging or production uses any backend origin other than `https://api.mbsh96reunion.com`, both `netlify.toml` CSP and backend `allowed_origins`/`allowed_origin_patterns` must be updated before smoke testing.

## Smoke Test Checklist

Frontend smoke after Netlify publish:

- Visit `https://mbsh96reunion.com/`.
- Confirm all primary pages return 200:
  - `/`
  - `/rsvp.html`
  - `/tickets.html`
  - `/through-years.html`
  - `/memorial.html`
  - `/capsule.html`
  - `/playlist.html`
  - `/404.html`
- Confirm `/config/site-config.json` returns 200 and contains production `API_BASE_URL`.
- Confirm browser console has no CSP errors for scripts, CSS, fonts, video, config fetch, or API requests.
- Confirm videos and images load from `/assets/`.
- Confirm Spotify iframe on playlist page is allowed by `frame-src https://open.spotify.com`.

Backend smoke after setup script, backend upload, DNS, and SSL:

```bash
curl -i https://api.mbsh96reunion.com/attendees.php \
  -H "Origin: https://mbsh96reunion.com"
```

Expected: `200` with JSON array, possibly `[]`.

```bash
FORM_TS=$(($(date +%s000)-4000))
curl -i -X POST https://api.mbsh96reunion.com/rsvp.php \
  -H "Origin: https://mbsh96reunion.com" \
  -H "Content-Type: application/json" \
  -d "{\"first_name\":\"Deploy\",\"last_name\":\"Smoke\",\"email\":\"deploy-smoke@example.com\",\"attending\":\"maybe\",\"guest_count\":1,\"display_publicly\":false,\"form_loaded_at\":${FORM_TS}}"
```

Expected: `200` with `{"ok":true,"id":...}`. Also verify committee notification in Resend or committee inbox if mail is enabled.

Additional endpoint checks:

- `GET https://api.mbsh96reunion.com/sponsors.php` with production Origin returns `200` JSON array.
- `GET https://api.mbsh96reunion.com/in-memory.php` with production Origin returns `200` JSON array.
- `POST https://api.mbsh96reunion.com/chatbot-question.php` with JSON body stores a fallback question.
- `POST https://api.mbsh96reunion.com/capsule.php` with a timestamp older than 3 seconds queues a capsule.
- Multipart smoke for `memory.php` and `sponsor.php` succeeds with text-only payloads before testing uploads.

Admin smoke:

- `https://api.mbsh96reunion.com/admin/login.php` renders over HTTPS.
- Valid admin password opens dashboard.
- Dashboard counts reflect smoke submissions.
- Sponsor and memory review pages render.
- CSRF-gated approve/reject actions work.
- `admin/serve-pending-upload.php` requires auth and cannot read outside pending upload path.

Cron smoke:

```bash
ssh nineoo@FAMTASTICINC.COM '/usr/bin/php /home/nineoo/public_html/cron/cleanup-rate-limits.php'
ssh nineoo@FAMTASTICINC.COM '/usr/bin/php /home/nineoo/public_html/cron/send-capsules.php'
```

Expected: CLI execution succeeds. Web requests to the cron scripts should return `403`.

## Rollback Notes

Frontend rollback:

- Use Netlify deploy history to restore the previous successful deploy.
- Keep DNS pointed at Netlify; rollback should be a deploy promotion, not a DNS change, unless the Netlify site itself is misconfigured.
- If production `API_BASE_URL` was changed incorrectly, restore `config/site-config.json` to the last known good deploy or set it back to the verified API origin.

Backend rollback:

- Before uploading backend changes, keep a timestamped copy of `/home/nineoo/public_html` or at least the PHP files being replaced.
- Roll back by restoring the previous backend file set to `/home/nineoo/public_html`.
- Do not delete `/home/nineoo/.config/mbsh-config.php` during rollback; it is the production secret source.
- Do not drop tables for ordinary rollback. `schema.sql` is additive/idempotent and current deploy proof does not include destructive migrations.
- If smoke data is inserted, remove only known smoke rows by email/name after verification.

DNS rollback:

- DNS changes may take time to propagate. Prefer reverting Netlify deploys and backend files before changing DNS again.
- If `api.mbsh96reunion.com` points to the wrong host, restore the prior DNS record and retest TLS plus CORS after propagation.

## Exact Blockers

Production deployment cannot be proven from this workspace alone because the
Site Studio service layer is not fully provisioned yet:

- Studio-owned Netlify service auth/linking must create or update the MBSH generated site and attach `mbsh96reunion.com` / `www.mbsh96reunion.com`.
- Studio-owned DNS service auth must manage apex, `www`, `api`, and `send` records, or mark the exact provider-enforced manual records.
- Studio-owned GoDaddy/cPanel service auth must verify cPanel API token, SSH trust, and SSH access for `nineoo@FAMTASTICINC.COM`.
- Studio-owned database provisioning must create or reference the MBSH logical production database/user and vault the site DB credential under `sites/mbsh-reunion-v2/db_password.production`.
- Studio-owned Resend service auth must verify or provision `send.mbsh96reunion.com` and expose sender config to the site.
- MBSH-specific admin password must be converted into `admin_password_hash` by the Studio backend-secret generator.
- Confirmation that `/home/nineoo/.config/mbsh-config.php` exists or permission for Studio/platform to generate it.
- Confirmation that `/home/nineoo/public_html` is the correct document root for `api.mbsh96reunion.com`.
- Confirmation that SSL is active for `https://api.mbsh96reunion.com`.
- Production public config update generated from Studio service state: `config/site-config.json` still has `API_BASE_URL: null`.
- Live external smoke tests are blocked until DNS, SSL, backend upload, DB schema, secrets, and CORS are all in place.

Known implementation risks that should be handled before final production sign-off:

- `frontend/js/main.js` falls back to `API_BASE_URL_DEV` when `API_BASE_URL` is null, so production config must not ship with the current null value.
- `frontend/js/rsvp.js` currently treats `formLoadedAtIsRecent(form, 3000)` as success only when elapsed time is less than 3 seconds, while the backend rejects submissions less than 3 seconds old. This can block normal browser RSVP submissions unless corrected before live public launch.
- `backend/sponsor.php` and `backend/memory.php` hard-code review links to `https://api.mbsh96reunion.com/admin/...`; staging on any other API host will send production-looking review links.
- Payment/ticket purchase remains disabled in config and no payment backend endpoint is present.
- Playlist suggestions intentionally route through `/chatbot-question.php`; there is no dedicated playlist endpoint.

## Proof Conclusion

The repo contains enough deploy structure to complete deployment once Studio
service provisioning is available: static frontend on Netlify from `frontend/`,
PHP backend on GoDaddy cPanel under `/home/nineoo/public_html`, MariaDB schema
via `backend/schema.sql`, secrets outside web root, CORS allow-listing for the
production frontend, CSP allowing `https://api.mbsh96reunion.com`, and cPanel
cron definitions.

The live deploy itself is not proven yet. The proof that can be completed now
is a Studio-service readiness and blocker artifact; final proof requires
Netlify publish, DNS/SSL confirmation, backend upload, generated production
secrets, schema application, and successful external smoke tests.
