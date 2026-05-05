# MBSH Backend Endpoint Inventory

Proof artifact for `task-2026-05-04-024`: Verify MBSH backend endpoint inventory.

Scope inspected:

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/schema.sql`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.env.example`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/config/site-config.json`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/netlify.toml`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/README.md`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/DATA-PERSISTENCE.md`
- Frontend endpoint consumers under `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js`

## Inventory Summary

The v2 site has a real PHP/MySQL backend with public form endpoints, public read feeds, admin review pages, and two CLI-only cron jobs. The persistence layer is MariaDB/MySQL via PDO and the schema declares 10 tables:

- `rsvps`
- `sponsors_pending`
- `sponsors_approved`
- `memories`
- `in_memory`
- `time_capsules`
- `chatbot_questions`
- `rate_limits`
- `admin_login_attempts`
- `admin_audit_log`

Shared backend libraries:

- `backend/lib/config.php`: loads config from `MBSH_CONFIG_PATH`, production `/home/nineoo/.config/mbsh-config.php`, local `.mbsh-config.local.php`, or repo-root `.env`.
- `backend/lib/cors.php`: allow-list plus Netlify preview regex CORS handling.
- `backend/lib/db.php`: PDO connection with `utf8mb4`, exception mode, associative fetches, and native prepares.
- `backend/lib/validate.php`: required/optional/email/enum/int/bool validators, JSON body reader, honeypot, and form-load timestamp anti-bot check.
- `backend/lib/rate-limit.php`: table-backed per-IP endpoint rate limiting.
- `backend/lib/resend.php`: Resend email sender via `https://api.resend.com/emails`.
- `backend/lib/upload.php`: JPEG/PNG/WebP uploads only, 2 MB max, 4000x4000 max, UUID rename, SVG rejection.
- `backend/lib/admin-auth.php`: admin session, password verification, login throttling, audit logging.
- `backend/lib/csrf.php`: HMAC CSRF tokens for admin state-changing requests.

## Public Endpoints

| Endpoint | Method | Content type | Payload expectation | Persistence | Side effects | Follow-up consumers |
|---|---:|---|---|---|---|---|
| `/rsvp.php` | POST | `application/json` | Required `first_name`, `last_name`, `email`, `attending` in `yes/maybe/no`, `form_loaded_at`; optional `maiden_name`, `phone`, `city_state`, `guest_count` 1-10 default 1, `guest_names`, `dietary`, `help_planning`, `message`, `display_publicly`; `website` honeypot must be empty. | Inserts `rsvps`; writes `rate_limits` for `rsvp` and `rsvp_hourly`. | Sends best-effort Resend confirmation to attendee and notification to committee. Returns `{ok:true,id}`. | RSVP follow-up, deploy proof. |
| `/attendees.php` | GET | none | No request body. | Reads public rows from `rsvps` where `attending` is `yes` or `maybe` and `display_publicly=1`. | Returns first/last/maiden/city/attending only, no email/phone. | RSVP follow-up, deploy proof. |
| `/sponsor.php` | POST | `multipart/form-data` | Required `contact_name`, `email`, `tier_interest` in `diamond/captain/crew/friend/custom`, `form_loaded_at`; optional `company_name`, `phone`, `custom_amount` when tier is `custom`, `message`, file field `logo`; `website` honeypot must be empty. | Inserts `sponsors_pending`; writes `rate_limits` for `sponsor`; optional logo saved under configured pending upload path. | Sends best-effort committee notification with hard-coded review URL `https://api.mbsh96reunion.com/admin/review-sponsor.php?id=<id>`. Returns `{ok:true,id}`. | Sponsor follow-up, deploy proof. |
| `/sponsors.php` | GET | none | No request body. | Reads active rows from `sponsors_approved`. | Returns `display_name`, `tier`, `logo_path`, `website_url`, ordered by tier and display order. | Sponsor follow-up, deploy proof. |
| `/chatbot-question.php` | POST | `application/json` | Required `question`; optional `email`; optional `was_fallback`, default true. No honeypot or `form_loaded_at` check in this endpoint. | Inserts `chatbot_questions`; writes `rate_limits` for `chatbot`. | If email exists and `was_fallback` is true, sends committee notification as `harry`. Returns `{ok:true}`. | Chatbot follow-up, deploy proof. |
| `/memory.php` | POST | `multipart/form-data` | Required `contributor_name`, `memory_text`, `form_loaded_at`; optional `contributor_email`, file field `photo`; `website` honeypot must be empty. | Inserts `memories` with `approved=0`; writes `rate_limits` for `memory`; optional photo saved under configured pending upload path. | Sends best-effort committee review notification. Returns `{ok:true,id}`. | Deploy proof; adjacent memory feature, not one of the named RSVP/sponsor/chatbot consumers. |
| `/in-memory.php` | GET | none | No request body. | Reads active rows from `in_memory`. | Returns `full_name`, `graduation_year`, `year_passed`, `tribute`. | Deploy proof; memorial page. |
| `/capsule.php` | POST | `application/json` | Required `email`, `form_loaded_at`; optional `song_answer`, `person_answer`, `memory_answer`; `website` honeypot must be empty. | Inserts `time_capsules`; writes `rate_limits` for `capsule`. | Queues for default `send_date` from schema, currently `2026-07-12 11:00:00`. Returns `{ok:true}`. | Deploy proof; time capsule page. |

## Admin Endpoints And Pages

These are PHP pages rather than JSON APIs. State-changing admin actions require an authenticated `mbsh_admin` session and HMAC CSRF header `X-CSRF-Token`.

| Endpoint | Method | Payload expectation | Persistence | Notes | Follow-up consumers |
|---|---:|---|---|---|---|
| `/admin/login.php` | GET/POST | GET renders login. POST expects form field `password`. | Reads `admin_password_hash`; writes `admin_login_attempts`; writes `admin_audit_log` for success/failure. | 5 failed logins in 15 minutes triggers lockout behavior. Successful login regenerates session id. | Deploy proof. |
| `/admin/logout.php` | GET | No payload. | Destroys PHP session. | Redirects to `login.php`. | Deploy proof. |
| `/admin/dashboard.php` | GET | Authenticated session. | Reads aggregate counts from `rsvps`, `sponsors_pending`, `sponsors_approved`, `memories`, `in_memory`, `time_capsules`, `chatbot_questions`. | Shows committee dashboard counts. | RSVP, sponsor, chatbot, deploy proof. |
| `/admin/review-sponsor.php` | GET/POST | GET lists pending sponsor inquiries. POST expects `id`, `action=approve/reject`, CSRF header; approval can accept `display_name` and `website_url`; rejection can accept `notes`. | Reads/updates `sponsors_pending`; inserts `sponsors_approved` on approval; writes `admin_audit_log`. | Approval moves uploaded logo from pending path to approved path when present. | Sponsor follow-up, deploy proof. |
| `/admin/review-memory.php` | GET/POST | GET lists pending memories. POST expects `id`, `action=approve/reject`, CSRF header. | Updates or deletes `memories`; writes `admin_audit_log`. | Approval moves pending photo to approved path when present. | Deploy proof. |
| `/admin/manage-in-memory.php` | GET/POST | GET lists entries. POST `action=add` expects `full_name`, optional `graduation_year`, `year_passed`, `tribute`, `display_order`; POST `action=deactivate` expects `id`; CSRF header required. | Inserts/updates `in_memory`; writes `admin_audit_log`. | No server-side max-length validation beyond DB columns and textarea hint. | Deploy proof. |
| `/admin/serve-pending-upload.php` | GET | Authenticated session, query `path`. | Reads file from configured pending upload path only. | Uses `realpath` containment check and streams file inline with detected MIME. | Sponsor review, memory review, deploy proof. |

## Cron Jobs

| Script | Invocation | Persistence | Notes | Follow-up consumers |
|---|---|---|---|---|
| `backend/cron/send-capsules.php` | CLI only | Reads pending `time_capsules`; updates `sent_at`, `send_attempts`, `send_error`. | Sends up to 100 due capsules per run through Resend. Web invocation returns 403. README expects cPanel cron `0 7 * * *`. | Deploy proof. |
| `backend/cron/cleanup-rate-limits.php` | CLI only | Deletes old rows from `rate_limits` and `admin_login_attempts`. | Removes `rate_limits` older than 24h and `admin_login_attempts` older than 7d. Web invocation returns 403. README expects cPanel cron `0 3 * * *`. | Deploy proof. |

## Frontend Consumers Verified

- `frontend/js/rsvp.js` posts JSON to `/rsvp.php`.
- `frontend/js/sponsor.js` posts multipart data to `/sponsor.php` and fetches `/sponsors.php`.
- `frontend/js/chatbot.js` posts JSON fallback questions to `/chatbot-question.php`.
- `frontend/js/playlist.js` also posts playlist suggestions to `/chatbot-question.php` with a `[Playlist suggestion]` prefix in the question.
- `frontend/js/memory.js` posts multipart data to `/memory.php`.
- `frontend/js/memorial.js` fetches `/in-memory.php`.
- `frontend/js/time-capsule.js` posts JSON to `/capsule.php`.
- No frontend consumer was found for `/attendees.php`, though the endpoint exists and supports the RSVP attendee feed.

## Config And Environment Requirements

Runtime config sources, in order:

1. `MBSH_CONFIG_PATH` environment variable, if readable.
2. `/home/nineoo/.config/mbsh-config.php`, production secrets outside web root.
3. `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.mbsh-config.local.php`, local override, gitignored.
4. `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.env`, local dev fallback.

Required config keys used by code:

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

Frontend config:

- `config/site-config.json` has `API_BASE_URL` set to `null` and `API_BASE_URL_DEV` set to `http://localhost:8888`.
- `frontend/js/main.js` chooses `API_BASE_URL` first, then `API_BASE_URL_DEV`, then empty string.
- For production, `API_BASE_URL` must be set to the deployed backend origin, expected by `netlify.toml` CSP as `https://api.mbsh96reunion.com`.

CORS assumptions:

- Dev `.env` fallback permits `http://localhost:8080`, `http://localhost:3333`, and `http://127.0.0.1:8080`.
- Production setup script declares allowed origins for `https://mbsh96reunion.com`, `https://www.mbsh96reunion.com`, and `http://localhost:8080`.
- Netlify deploy preview regexes are configured for `*.netlify.app` and branch deploy URLs.

Upload assumptions:

- Pending uploads are expected outside web root under `/home/nineoo/uploads-pending` in production.
- Approved uploads are expected under `/home/nineoo/public_html/uploads/approved`.
- Repository includes `backend/uploads/approved/.htaccess`; no public pending upload directory is expected.

## Local And Staging Assumptions

Local:

- Frontend local server: README suggests `cd frontend && python3 -m http.server 3333`.
- Backend local server: README suggests `cd backend && php -S localhost:8888`.
- Local DB is expected to be `mbsh_reunion_v2_dev` with user `mbsh_reunion_v2_dev_user`, sourced from `.env`.
- The setup script can apply `backend/schema.sql` locally if MariaDB is running.

Staging/deploy:

- Frontend is configured for Netlify with publish directory `frontend/`.
- Backend is intended for GoDaddy cPanel under the `nineoo` account, copied to `public_html/`.
- Production secrets are expected at `/home/nineoo/.config/mbsh-config.php` with mode `0600`.
- The setup helper expects production DB `nineoo_mbsh96_reunion_v2`, DB user `nineoo_mbsh_user`, host `FAMTASTICINC.COM`, and Resend sender domain `send.mbsh96reunion.com`.
- Production smoke test in README posts to `https://api.mbsh96reunion.com/rsvp.php` with Origin `https://mbsh96reunion.com`.

## Missing Expected Files

The following expected runtime-only files are absent in this local inspection:

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.env`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.mbsh-config.local.php`
- `/home/nineoo/.config/mbsh-config.php`

The following file existed in the older non-v2 backend inventory but is absent in v2:

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/scripts/verify-rsvp.php`

The absence of `.env`, `.mbsh-config.local.php`, and production secrets means local or production endpoint execution cannot be verified from this checkout without provisioning credentials. The absence of `backend/scripts/verify-rsvp.php` only means the v1 diagnostic helper was not carried into v2; no v2 code references it.

## Blockers And Risks

- **Config unavailable locally:** Without `.env`, `.mbsh-config.local.php`, or `MBSH_CONFIG_PATH`, endpoints exit with `{"error":"config_unavailable"}`.
- **Production backend origin not wired in public config:** `config/site-config.json` has `API_BASE_URL: null`; production frontend calls will fall back to `API_BASE_URL_DEV` unless the public config is changed during deploy.
- **CSP requires production backend origin:** `netlify.toml` currently allows `connect-src 'self' https://api.mbsh96reunion.com`; if staging uses another backend host, CSP must be updated.
- **Hard-coded review URLs:** `sponsor.php` and `memory.php` email review links point at `https://api.mbsh96reunion.com/admin/...`; staging on another host would send production-looking links unless adjusted.
- **No chatbot admin response workflow:** `chatbot_questions` are collected and counted on the dashboard, but there is no admin page to mark them responded or write `response_notes`.
- **No payment/ticket backend endpoint:** Tickets are present in frontend/config, but no PHP payment, PayPal, or ticket purchase endpoint exists.
- **No dedicated playlist endpoint:** `playlist.js` intentionally routes suggestions through `/chatbot-question.php`.
- **Local smoke tests require DB and secrets:** The schema and endpoint code are present, but DB credentials, Resend key, admin hash, and upload paths must be provided before meaningful endpoint testing.

## Follow-Up Task Consumption Map

- RSVP follow-up should use `/rsvp.php`, `/attendees.php`, `rsvps`, `rate_limits`, and dashboard RSVP counts.
- Sponsor follow-up should use `/sponsor.php`, `/sponsors.php`, `/admin/review-sponsor.php`, `/admin/serve-pending-upload.php`, `sponsors_pending`, `sponsors_approved`, `rate_limits`, and `admin_audit_log`.
- Chatbot follow-up should use `/chatbot-question.php`, `chatbot_questions`, `rate_limits`, and dashboard fallback counts. A response-management admin endpoint/page is still missing.
- Deploy proof should verify `backend/schema.sql`, `scripts/setup-mbsh-backend.sh`, production secrets path, Netlify CSP/connect-src, production `API_BASE_URL`, CORS origins, cron registration, upload paths, and at least one external POST smoke test against `https://api.mbsh96reunion.com/rsvp.php`.
