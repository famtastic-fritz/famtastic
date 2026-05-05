# MBSH Sponsor Flow Verification

Proof artifact for `task-2026-05-04-026`: Verify MBSH sponsor flow.

Scope inspected:

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/tickets.html`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/sponsor.js`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/main.js`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/config.js`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/config/site-config.json`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/sponsor.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/sponsors.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/admin/review-sponsor.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/admin/dashboard.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/admin/serve-pending-upload.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/config.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/cors.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/db.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/validate.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/rate-limit.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/upload.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/admin-auth.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/csrf.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/schema.sql`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.env.example`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/scripts/setup-mbsh-backend.sh`
- `/Users/famtasticfritz/famtastic/docs/sites/site-mbsh-reunion/backend-endpoint-inventory-2026-05-04.md`

## Verdict

The sponsor flow is substantially implemented and can be verified statically from frontend form markup through backend persistence, admin approval, and public sponsor-wall feed. Runtime backend execution is blocked in this checkout because no readable backend config/secrets file exists locally or at the expected production path. The frontend anti-bot timestamp mismatch found during inspection has been fixed and browser-side sponsor submission is now verified with an intercepted API response.

Static verification confirms:

- The tickets page exposes ticket packages and sponsor tiers.
- Sponsor tier buttons open a modal and preselect the chosen tier.
- The sponsor inquiry form posts multipart data to `/sponsor.php`.
- The backend validates payload fields, honeypot, timestamp, rate limits, and optional logo uploads.
- Valid sponsor inquiries persist to `sponsors_pending`.
- Admin review can approve or reject pending sponsors.
- Approval inserts into `sponsors_approved`, moves an uploaded logo to the approved uploads path, and writes `admin_audit_log`.
- The public sponsor wall fetches `/sponsors.php`, which reads active approved sponsors.

Runtime backend verification is not complete because endpoint execution requires provisioned DB credentials, upload paths, admin hash/CSRF secret, allowed origins, and optional Resend credentials.

## Fix Applied After Inspection

The initial inspection found that `frontend/js/main.js` allowed form submission only while `form_loaded_at` was younger than 3000 ms, while `backend/lib/validate.php` rejects submissions younger than 3000 ms. The shared frontend helper now matches the backend rule and returns true only after the form age is at least the minimum.

Browser proof after the fix:

- Loaded the actual `tickets.html` page.
- Opened the sponsor modal from the Captain tier button.
- Filled required sponsor inquiry fields.
- Waited 3200 ms.
- Submitted through the real frontend JavaScript.
- Intercepted `/api/sponsor.php` and confirmed multipart `FormData` included `tier_interest = captain` and `form_loaded_at`.

Proof artifact: `/Users/famtasticfritz/famtastic/proofs/mbsh-rsvp-sponsor-browser-submit-2026-05-04.json`.

## Packages And Tier Source

Ticket packages are rendered in `frontend/tickets.html` and populated by public config:

- Early Bird: displayed as `$60 per person`, bound to `EARLY_BIRD_PRICE` from `config/site-config.json`.
- Regular Price: displayed as `$75 per person`, bound to `REGULAR_PRICE` from `config/site-config.json`.
- Early Bird deadline: displayed as `June 1, 2026`, bound to `EARLY_BIRD_DEADLINE_DISPLAY`.
- Ticket purchase buttons are gated by `PAYMENTS_STATUS`; current config has `"PAYMENTS_STATUS": "disabled"` and `"PAYPAL_BUTTON_ID": null`, so ticketing remains "Ticketing Opens Soon".

Sponsor tiers are hard-coded in `frontend/tickets.html` and mirrored in backend validation:

- `diamond`: Diamond Sponsor, `$1,000+`, premium logo placement, event recognition, social acknowledgment.
- `captain`: Hi-Tide Captain, `$500`, featured logo placement, event recognition.
- `crew`: Hi-Tide Crew, `$250`, logo on sponsor wall.
- `friend`: Hi-Tide Friend, `$100`, name on sponsor wall.
- `custom`: Custom Amount, tailored recognition.

Backend intake accepts all five values in `sponsor.php`. Backend approval only permits public approved tiers `diamond`, `captain`, `crew`, and `friend`; approved `custom` inquiries are downgraded to `friend` unless the admin path is changed.

## Frontend Form Fields

The sponsor modal in `frontend/tickets.html` defines:

- `contact_name`: required text, max 255.
- `company_name`: optional text, max 255.
- `email`: required email, max 255.
- `phone`: optional tel, max 50.
- `tier_interest`: required select with `diamond`, `captain`, `crew`, `friend`, `custom`.
- `custom_amount`: optional number, only shown when `custom` is selected, min 1, step 1.
- `logo`: optional file input accepting `image/jpeg`, `image/png`, `image/webp`.
- `message`: optional textarea, max 2000.
- `website`: honeypot text field.
- `form_loaded_at`: hidden timestamp field stamped by `frontend/js/main.js`.

The form has `enctype="multipart/form-data"`, matching the backend's content-type requirement.

## Frontend JS Behavior

`frontend/js/sponsor.js` verifies statically as follows:

- Finds all `[data-sponsor-tier]` buttons and attaches click handlers.
- Copies the clicked button's `data-sponsor-tier` into `#sponsor-tier-select`.
- Shows the custom amount wrapper only for `custom`.
- Opens the modal with `dialog.showModal()` when supported.
- On submit, prevents default form submission, checks the honeypot, checks the form-loaded timestamp helper, disables the submit button, posts `new FormData(form)` to `window.__famHelpers.apiUrl('/sponsor.php')`, closes the modal on success, and resets the form.
- Polls the public sponsor wall by fetching `window.__famHelpers.apiUrl('/sponsors.php')`.

`frontend/js/main.js` supplies:

- `stampFormLoadedAt()`, which writes `Date.now()` into all `input[name="form_loaded_at"]` fields at page initialization.
- `apiUrl(path)`, which uses `window.__SITE_CONFIG__.API_BASE_URL` first, then `API_BASE_URL_DEV`, then same-origin.

`frontend/js/config.js` fetches `/config/site-config.json` and falls back to local defaults if it fails.

## Frontend Blocker Found Statically And Fixed

The frontend timestamp check is inverted relative to backend validation:

- `frontend/js/main.js` returns true when `(Date.now() - ts) < 3000`.
- `frontend/js/sponsor.js` submits only when that helper returns true.
- `backend/lib/validate.php` rejects with HTTP 204 when elapsed time is less than 3000 ms.

Result before the fix: a fast submit went to the backend but was silently rejected by the backend anti-bot check; a normal submit after 3 seconds was stopped by the frontend before any request was made. This is fixed in the shared helper in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/main.js`.

## Backend Payload Validation And Upload Handling

`backend/sponsor.php` accepts only `POST` and requires `multipart/form-data`.

Validation and guard sequence:

- Loads runtime config through `fam_load_config()`.
- Applies CORS with endpoint class `public_post`.
- Rejects non-POST with 405.
- Rejects non-multipart requests with 415.
- Runs `fam_honeypot_clean($_POST)`, returning 204 for non-empty `website`.
- Runs `fam_form_loaded_at_check($_POST)`, returning 204 when missing, zero, or younger than 3000 ms.
- Opens PDO via `fam_db($config)`.
- Applies `fam_rate_limit($pdo, 'sponsor', 60, 5)`.
- Requires `contact_name` max 255.
- Accepts optional `company_name` max 255.
- Requires valid `email` max 255 and lowercases it.
- Accepts optional `phone` max 50.
- Requires `tier_interest` in `diamond`, `captain`, `crew`, `friend`, `custom`.
- Requires integer `custom_amount` from 1 to 1000000 only when tier is `custom`; otherwise stores null.
- Accepts optional `message` max 2000.

Optional logo upload uses `fam_handle_upload()` with destination `$config['pending_uploads_path'] . '/sponsors'`.

Upload rules:

- Max size: 2 MB.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`.
- SVG explicitly rejected by MIME/name guard.
- Image dimensions must be readable and no larger than 4000x4000.
- Destination directory is created if missing.
- Saved filename is a random 32-hex-character UUID with safe extension.
- File permissions are set to `0644`.
- The saved server filesystem path is returned and persisted as `logo_path`.

On success, `sponsor.php` inserts into `sponsors_pending`, sends a best-effort Resend notification to the committee, and returns `{"ok":true,"id":<id>}`.

## Persistence Tables

`backend/schema.sql` defines the sponsor tables.

`sponsors_pending`:

- `id` primary key.
- `contact_name`, `company_name`, `email`, `phone`.
- `tier_interest` enum: `diamond`, `captain`, `crew`, `friend`, `custom`.
- `custom_amount`.
- `logo_path`.
- `message`.
- `status` enum: `pending`, `approved`, `rejected`, default `pending`.
- `notes`.
- `created_at`, `reviewed_at`.
- Indexes on `status` and `tier_interest`.

`sponsors_approved`:

- `id` primary key.
- `pending_id` nullable FK to `sponsors_pending(id)` with `ON DELETE SET NULL`.
- `display_name`.
- `tier` enum: `diamond`, `captain`, `crew`, `friend`.
- `logo_path`.
- `website_url`.
- `display_order`, default 0.
- `active`, default true.
- `approved_at`.
- Indexes on `(tier, display_order)` and `active`.

Related tables used by the sponsor flow:

- `rate_limits`: written by sponsor POST rate limiting.
- `admin_login_attempts`: used by admin login throttling.
- `admin_audit_log`: written when sponsors are approved or rejected.

## Admin Approval Path

`backend/admin/review-sponsor.php` is an authenticated admin page.

GET behavior:

- Calls `fam_require_admin_auth()`.
- Loads pending rows from `sponsors_pending WHERE status='pending' ORDER BY created_at DESC`.
- Displays contact name, company, tier/custom amount, email, phone, message, and an auth-gated link for uploaded logo review.
- Issues a CSRF token with `fam_csrf_issue(session_id(), $config['admin_csrf_secret'])`.

POST behavior:

- Requires authenticated admin session and valid `X-CSRF-Token` header.
- Loads the pending sponsor by `id`.
- `action=approve`:
  - Uses submitted `display_name` when present, otherwise company name, otherwise contact name.
  - Maps public approved tier to `diamond`, `captain`, `crew`, or `friend`; `custom` becomes `friend`.
  - Moves the logo from pending upload path to `$config['approved_uploads_path'] . '/sponsors'` when present.
  - Inserts into `sponsors_approved`.
  - Updates `sponsors_pending.status` to `approved` and sets `reviewed_at`.
  - Writes `admin_audit_log` with action `sponsor_approve`.
- `action=reject`:
  - Updates `sponsors_pending.status` to `rejected`, sets `reviewed_at`, and stores `notes`.
  - Writes `admin_audit_log` with action `sponsor_reject`.

`backend/admin/dashboard.php` includes sponsor counts and links pending inquiries to `review-sponsor.php`.

`backend/admin/serve-pending-upload.php` is used by the review page to show pending uploads. The backend endpoint inventory says it is auth-gated and uses a realpath containment check against the configured pending upload path.

## Public Sponsors Feed

`backend/sponsors.php` accepts GET only.

Behavior:

- Loads runtime config.
- Applies CORS with endpoint class `public_get`.
- Opens PDO.
- Selects `display_name`, `tier`, `logo_path`, and `website_url` from `sponsors_approved`.
- Filters to `active = 1`.
- Orders by `FIELD(tier, 'diamond','captain','crew','friend'), display_order`.
- Returns the rows as JSON.

`frontend/js/sponsor.js` loads this feed and renders cards into `#sponsor-wall`. If `logo_path` is present, the frontend uses it as an image `src`; otherwise it renders `display_name` as text.

Static risk: approval stores the approved logo as a filesystem path returned from `$config['approved_uploads_path']`, and the public feed returns that exact value as `logo_path`. For browser rendering, production config must ensure the value persisted in `sponsors_approved.logo_path` is web-servable, or the approval/feed path needs a URL translation layer.

## Runtime Config Blockers

The following expected config files are absent in this checkout:

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.env`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.mbsh-config.local.php`
- `/home/nineoo/.config/mbsh-config.php`

Because `backend/lib/config.php` exits with `{"error":"config_unavailable"}` when none of these are readable, local endpoint execution cannot verify database writes, upload movement, admin login, CORS, Resend notifications, or public sponsor feed responses.

Required runtime keys for this flow:

- `db_host`
- `db_name`
- `db_user`
- `db_password`
- `resend_api_key`
- `resend_from_domain`
- `resend_from_committee`
- `committee_email`
- `allowed_origins`
- `allowed_origin_patterns`
- `admin_password_hash`
- `admin_csrf_secret`
- `pending_uploads_path`
- `approved_uploads_path`
- `environment`

Frontend production config blocker:

- `config/site-config.json` has `"API_BASE_URL": null` and `"API_BASE_URL_DEV": "http://localhost:8888"`.
- In production, `API_BASE_URL` must be set to the deployed backend origin, expected elsewhere as `https://api.mbsh96reunion.com`.

Other exact blockers/risks:

- Frontend anti-bot timestamp logic is inverted and blocks successful browser submissions.
- `sponsor.php` hard-codes notification review links to `https://api.mbsh96reunion.com/admin/review-sponsor.php?id=<id>`, so staging on another backend host will send production-looking links.
- Custom sponsor approvals lose the custom tier and become `friend` publicly.
- Public sponsor feed returns stored `logo_path` directly; if it is an absolute filesystem path, sponsor logos will not render in the browser.
- `sponsor.js` injects `display_name` and `logo_path` into `innerHTML` without client-side escaping. Server/admin input should be treated carefully before approval.
- Payment/ticket purchase flow is not implemented; ticket cards are config-gated display only while payments are disabled.

## Recommended Next Smoke Tests Once Config Exists

1. Provision local config using `.env.example` or `MBSH_CONFIG_PATH`, apply `backend/schema.sql`, and start the backend PHP server at `http://localhost:8888`.
2. Fix or temporarily bypass the frontend timestamp mismatch, then submit a sponsor inquiry from `frontend/tickets.html` after waiting at least 3 seconds.
3. Verify the POST returns `{"ok":true,"id":...}` and inserts one row into `sponsors_pending` with `status='pending'`.
4. Repeat with a valid PNG/JPG/WebP logo and verify the file lands under the configured pending uploads path.
5. Negative-test validation: missing contact name, invalid email, invalid tier, too-large logo, SVG logo, and fast submit under 3 seconds.
6. Log into `/admin/login.php` with the configured admin password and open `/admin/review-sponsor.php`.
7. Verify pending sponsor details render, including auth-gated logo preview through `serve-pending-upload.php`.
8. Approve the sponsor and verify `sponsors_pending.status='approved'`, one row exists in `sponsors_approved`, `admin_audit_log.action='sponsor_approve'`, and the logo moved to approved uploads.
9. Reject a second sponsor and verify `sponsors_pending.status='rejected'`, `notes` persisted, and `admin_audit_log.action='sponsor_reject'`.
10. Call `/sponsors.php` and verify only active approved sponsors are returned in tier/display order.
11. Load `tickets.html` and verify the public sponsor wall renders approved text-only sponsors and logo sponsors with browser-accessible image URLs.
12. Repeat the same smoke path against production/staging after `API_BASE_URL`, CORS origins, DB credentials, upload paths, and Resend secrets are configured.
