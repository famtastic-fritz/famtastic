# MBSH RSVP Flow Verification

Proof artifact for `task-2026-05-04-025`: Verify MBSH RSVP flow.

Scope inspected:

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/rsvp.html`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/rsvp.js`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/main.js`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/config.js`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/config/site-config.json`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/rsvp.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/attendees.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/schema.sql`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/config.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/cors.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/db.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/validate.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/rate-limit.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/lib/resend.php`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/backend/admin/dashboard.php`
- Existing proof reference: `/Users/famtasticfritz/famtastic/docs/sites/site-mbsh-reunion/backend-endpoint-inventory-2026-05-04.md`

## Result

Static verification confirms that the RSVP backend endpoint, database table, rate limiting, email side effects, public attendee feed endpoint, and dashboard aggregate counts exist.

End-to-end browser RSVP submission to the real backend is not currently verifiable from this checkout because runtime backend config/secrets are missing. The browser-side submission path is now verified with Playwright using a local static frontend server and intercepted API response.

## Fix Applied After Inspection

The initial inspection found the frontend anti-bot timestamp check inverted relative to the backend check:

- `frontend/js/main.js` stamps `form_loaded_at` when the page initializes.
- The frontend helper allowed submit only when `Date.now() - form_loaded_at < 3000`.
- `backend/lib/validate.php` only accepts submit when `Date.now() - form_loaded_at >= 3000`.

That meant a fast browser submit reached the backend too early and was silently rejected with `204`, while a normal submit after 3 seconds was stopped by the frontend before the POST. The shared frontend helper in `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/main.js` now matches the backend rule and returns true only after the form age is at least the minimum.

The inspection also found that unchecking `display_publicly` omitted the checkbox from `FormData`, causing the backend default `true` to override the user's opt-out. `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/frontend/js/rsvp.js` now explicitly serializes unchecked public display as `display_publicly = "0"`.

Browser proof after the fix:

- Loaded the actual `rsvp.html` page.
- Filled required fields.
- Selected `attending=yes`.
- Unchecked public attendee display.
- Waited 3200 ms.
- Submitted through the real frontend JavaScript.
- Intercepted `/api/rsvp.php` and confirmed `display_publicly = "0"` and `form_loaded_at` was present.

Proof artifact: `/Users/famtasticfritz/famtastic/proofs/mbsh-rsvp-sponsor-browser-submit-2026-05-04.json`.

Runtime endpoint execution is also blocked locally by missing backend config/secrets. The following expected runtime-only files are absent or unreadable in this environment:

- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.env`
- `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/.mbsh-config.local.php`
- `/home/nineoo/.config/mbsh-config.php`

## Frontend Form

`frontend/rsvp.html` contains a real RSVP form with `id="rsvp-form"` and `novalidate`.

Always visible fields:

- `first_name`, required text, max length 100.
- `last_name`, required text, max length 100, label asks for maiden name if applicable.
- `email`, required email, max length 255.
- `attending`, required select with `yes`, `maybe`, and `no`.

Revealed only when `attending=yes`:

- `phone`, optional tel, max length 50.
- `city_state`, optional text, max length 255.
- `guest_count`, select values 1 through 4.
- `guest_names`, optional text, max length 500.
- `dietary`, optional textarea, max length 500.
- `help_planning`, optional checkbox with value `1`.
- `message`, optional textarea, max length 2000.
- `display_publicly`, optional checkbox with value `1`, checked by default.

Anti-bot fields:

- `website`, hidden honeypot text field.
- `form_loaded_at`, hidden timestamp field populated by `frontend/js/main.js`.

The page consent copy says the attendee can opt out of public attendee display and references a public attendee list. The backend supports this with `/attendees.php`, but this page does not currently include an attendee-list section or any JavaScript fetch for `/attendees.php`.

## Frontend JavaScript

`frontend/js/rsvp.js` implements:

- Progressive disclosure: `#rsvp-yes-reveal` is hidden unless `#rsvp-attending` has value `yes`.
- Honeypot short-circuit: non-empty `website` returns without submitting.
- Timestamp check through `window.__famHelpers.formLoadedAtIsRecent(form, 3000)`.
- JSON submit to `window.__famHelpers.apiUrl('/rsvp.php')`.
- `Content-Type: application/json`.
- Success UI: hides the form, shows `#rsvp-success`, writes submitted first name and email, and runs a confetti micro-interaction.
- Failure UI: restores the button and shows an alert directing the user to email the committee.

`frontend/js/main.js` provides:

- `stampFormLoadedAt()`, which writes `Date.now()` into all `input[name="form_loaded_at"]` fields.
- `serializeForm(formEl)`, which serializes enabled form fields using `FormData`.
- `apiUrl(path)`, which chooses `API_BASE_URL`, then `API_BASE_URL_DEV`, then same-origin.

Important static findings:

- Browser flow now satisfies the frontend/backend anti-bot timing contract after the shared helper fix.
- The `novalidate` attribute disables native browser validation, and `rsvp.js` does not call `form.checkValidity()` or provide custom required-field validation before POST. Required-field enforcement therefore depends on the backend.
- The public display opt-out now serializes explicitly as `"0"` when unchecked.
- `guest_count` is always serialized from the hidden reveal field's default value of `1`, even for `attending=maybe` or `attending=no`.

## Backend Request Handling

`backend/rsvp.php` is a JSON-only POST endpoint.

Request gates:

- Loads config through `fam_load_config()`.
- Applies CORS with endpoint class `public_post`.
- Rejects non-POST methods with `405`.
- Rejects requests without `application/json` content type with `415`.
- Reads JSON body with `fam_read_json_body()`.
- Applies honeypot check with `fam_honeypot_clean($data)`, returning silent `204` for bot-like payloads.
- Applies form-load timestamp check with `fam_form_loaded_at_check($data)`, returning silent `204` when missing or submitted in under 3000 ms.
- Opens MySQL/MariaDB through PDO.
- Applies rate limits: `rsvp` allows 5 submissions per 60 seconds; `rsvp_hourly` allows 20 submissions per 3600 seconds.

Validated payload:

- Required: `first_name` max 100, `last_name` max 100, `email`, `attending` in `yes`, `maybe`, `no`.
- Optional: `maiden_name` max 100, `phone` max 50, `city_state` max 255, `guest_names` max 500, `dietary` max 1000, `message` max 2000.
- Integer: `guest_count` min 1, max 10, default 1.
- Boolean: `help_planning`, default false.
- Boolean: `display_publicly`, default true.

Response behavior:

- Success returns `200` with `{ "ok": true, "id": <insert id> }`.
- Validation failures return `400` with `{ "error": "validation_error", "message": ... }`.
- Database exceptions return `500` with `{ "error": "db_error" }`.
- Other uncaught exceptions return `500` with `{ "error": "internal_error" }`.

## Persistence

`backend/schema.sql` declares the `rsvps` table:

- `id`
- `first_name`
- `last_name`
- `maiden_name`
- `email`
- `phone`
- `city_state`
- `attending`
- `guest_count`
- `guest_names`
- `dietary`
- `help_planning`
- `message`
- `display_publicly`
- `created_at`
- `updated_at`

Indexes:

- `idx_attending (attending)`
- `idx_email (email)`
- `idx_display (display_publicly, attending)`

`backend/rsvp.php` inserts directly into `rsvps` using a prepared statement. The endpoint also writes to `rate_limits` through `fam_rate_limit()`.

## Email Behavior

On successful insert, `backend/rsvp.php` sends two best-effort emails through `fam_send_email()`:

- Confirmation to the attendee using sender role `noreply`, subject `You're on the list, {first}`.
- Committee notification to `$config['committee_email']` using sender role `committee`, subject `RSVP: {first} {last} — {attending}`.

Email failures do not fail the RSVP. `ResendError` is caught and logged with `[rsvp] Resend send failed: ...`.

`backend/lib/resend.php` sends through `https://api.resend.com/emails` and requires config keys such as `resend_api_key`, `resend_from_noreply`, `resend_from_committee`, `resend_reply_to`, and `committee_email`.

## Public Attendee Feed And Admin Visibility

Public attendee feed:

- `backend/attendees.php` exists.
- It returns `first_name`, `last_name`, `maiden_name`, `city_state`, and `attending`.
- It only includes rows where `attending` is `yes` or `maybe` and `display_publicly = 1`.
- No email or phone fields are exposed.
- No frontend consumer for `/attendees.php` was found in `frontend/rsvp.html` or `frontend/js`.

Admin visibility:

- `backend/admin/dashboard.php` includes aggregate RSVP counts for `yes`, `maybe`, and `no`.
- No dedicated RSVP admin list/detail page was found.
- No RSVP CSV/export endpoint was found.
- No admin action for correcting or deleting RSVP records was found.

## Config And Deployment Blockers

Backend config blockers:

- `backend/lib/config.php` exits with `{"error":"config_unavailable","detail":"No mbsh-config.php or .env found"}` when no readable config source exists.
- This checkout has `.env.example`, but not `.env`.
- The local override `.mbsh-config.local.php` is absent.
- The production secrets path `/home/nineoo/.config/mbsh-config.php` is absent in this environment.
- Without DB credentials, schema state and insert behavior cannot be executed.
- Without Resend credentials/sender configuration, email behavior cannot be executed.

Frontend config blockers:

- `config/site-config.json` has `"API_BASE_URL": null`.
- The same file has `"API_BASE_URL_DEV": "http://localhost:8888"`.
- `frontend/js/main.js` chooses the dev URL when `API_BASE_URL` is null.
- In production, this would make browser RSVP submissions target `http://localhost:8888/rsvp.php` unless deployment replaces the public config.
- `netlify.toml` CSP allows `connect-src 'self' https://api.mbsh96reunion.com`, so production should set `API_BASE_URL` to `https://api.mbsh96reunion.com` or another allowed backend origin.

Functional blockers:

- No public attendee-list rendering exists despite the RSVP consent copy and chatbot answer linking to `rsvp.html#attendees`.

## Recommended Next Smoke Tests

Run these after backend config exists and the schema has been applied.

1. Direct backend happy-path smoke with a timestamp at least 4 seconds in the past:

   ```bash
   TS=$(($(date +%s%3N)-4000))
   curl -i -X POST https://api.mbsh96reunion.com/rsvp.php \
     -H "Origin: https://mbsh96reunion.com" \
     -H "Content-Type: application/json" \
     -d "{\"first_name\":\"Smoke\",\"last_name\":\"Test\",\"email\":\"smoke-rsvp@example.com\",\"attending\":\"yes\",\"guest_count\":\"1\",\"form_loaded_at\":$TS}"
   ```

   Expected: `200` with `{ "ok": true, "id": ... }`, one row in `rsvps`, and rate-limit rows for `rsvp` and `rsvp_hourly`.

2. Backend validation smoke:

   ```bash
   TS=$(($(date +%s%3N)-4000))
   curl -i -X POST https://api.mbsh96reunion.com/rsvp.php \
     -H "Origin: https://mbsh96reunion.com" \
     -H "Content-Type: application/json" \
     -d "{\"first_name\":\"Smoke\",\"last_name\":\"Bad\",\"email\":\"bad-email\",\"attending\":\"yes\",\"form_loaded_at\":$TS}"
   ```

   Expected: `400` with `validation_error`.

3. CORS smoke:

   ```bash
   curl -i -X OPTIONS https://api.mbsh96reunion.com/rsvp.php \
     -H "Origin: https://mbsh96reunion.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type"
   ```

   Expected: `204` with `Access-Control-Allow-Origin: https://mbsh96reunion.com`.

4. Public attendee-feed smoke:

   ```bash
   curl -i https://api.mbsh96reunion.com/attendees.php \
     -H "Origin: https://mbsh96reunion.com"
   ```

   Expected: `200` JSON array containing only public `yes` and `maybe` RSVP rows with no email or phone fields.

5. Admin dashboard smoke:

   - Log in at `https://api.mbsh96reunion.com/admin/login.php`.
   - Open `https://api.mbsh96reunion.com/admin/dashboard.php`.
   - Confirm RSVP Yes/Maybe/No counts reflect rows inserted by smoke tests.

6. Browser RSVP smoke after fixing the frontend timing gate and setting production `API_BASE_URL`:

   - Open `https://mbsh96reunion.com/rsvp.html`.
   - Wait at least 4 seconds.
   - Submit a valid `yes` RSVP.
   - Confirm network POST goes to `https://api.mbsh96reunion.com/rsvp.php`.
   - Confirm success panel appears.
   - Confirm attendee and committee emails are sent or logged.
   - Confirm dashboard counts update.

7. Opt-out smoke after fixing unchecked checkbox serialization:

   - Submit a valid RSVP with "Display me publicly on the attendee list" unchecked.
   - Confirm the row has `display_publicly=0`.
   - Confirm `/attendees.php` does not return that row.
