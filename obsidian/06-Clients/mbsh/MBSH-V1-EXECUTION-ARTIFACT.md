---
title: MBSH-V1-EXECUTION-ARTIFACT
type: note
permalink: famtastic/03-mbsh/mbsh-v1-execution-artifact
---

# MBSH Class of '96 Reunion Site — V1 Execution Artifact

**Status:** Final consolidated artifact for Codex review and Claude Code execution
**Captured:** 2026-04-29
**Contains:** Self-contained V1 brief + Session 1A prompt + Session 1B prompt
**Source of truth:** This file, on disk. No conversation context dependency.

---

## How to use this file

1. Send this entire file to Codex for final review pass.
2. Once Codex greenlights, save this file to disk at `~/famtastic/docs/sites/site-mbsh-reunion/MBSH-V1-EXECUTION-ARTIFACT.md`.
3. Provide the file path to Claude Code as the source for Session 1A. Claude Code reads the brief from disk, not from conversation context.
4. Session 1A produces a scaffold proposal. Fritz reviews. Approves or revises.
5. Session 1B executes destructive operations only after Fritz's explicit approval.

---

# PART 1: V1 BRIEF (CANONICAL)

# MBSH Class of '96 Reunion Site — V1 Brief

**Status:** Authoritative source of truth for V1 build
**Captured:** 2026-04-29
**Site:** mbsh96reunion.com
**Reunion:** Saturday, July 12, 2026 (assumed; pending final committee confirmation)
**Build classification:** FAMtastic flagship Tier C
**Showcase:** This is the FAMtastic public showcase build. Every alum who sees this site is a potential FAMtastic client.

---

## Identity (Locked)

- **School:** Miami Beach Senior High School
- **Mascot:** Hi-Tide Harry — original cartoon mascot
- **Colors:** Red and White, with Silver accents
- **Tagline:** "Let us be known for our deeds"
- **Founded:** 1926 — 2026 = 100th anniversary
- **Class:** 1996 — 30th reunion
- **Domain:** mbsh96reunion.com (managed via GoDaddy)
- **Committee email V1:** mbsh96reunion@gmail.com (existing). Plan to add committee@mbsh96reunion.com once GoDaddy email forwarding is configured. Until then, all committee notifications route to the Gmail address.

---

## Why This Site Matters

This site serves six purposes simultaneously:

1. The 30th reunion of Class of '96
2. The 100th anniversary of MBSH (dual milestone)
3. The first FAMtastic public showcase build
4. The first publicly available canonical Hi-Tide Harry visual identity
5. The portfolio anchor for every potential FAMtastic client pitch
6. The first branded AI chatbot built through Studio

Every design decision must clear this bar: *"Would this make the most prominent alum in the room text their network and say 'this is fire'?"* Without ever pandering to that alum by name. Quality signaled through quality, not name-dropping.

---

## Hosting Architecture (Hybrid)

### Frontend: Netlify

- Site files (HTML/CSS/JS/assets) deploy to Netlify
- Auto-deploy from GitHub repo `mbsh-reunion` on push to main — but Netlify is NOT connected until Session 8 (when site is staging-ready). Until then, pushes to main do not deploy anywhere.
- Deploy preview URLs per branch for committee review (Session 8+)
- Custom domain `mbsh96reunion.com` points to Netlify via GoDaddy DNS (configured in Session 9)
- Netlify SSL via Let's Encrypt (automatic)

### Backend: GoDaddy Web Hosting Deluxe

- MySQL database for RSVPs, sponsors, memories, time capsules, in-memory submissions, chatbot questions, rate limit tracking, admin auth
- PHP scripts handle form POSTs and write to MySQL
- Subdomain `api.mbsh96reunion.com` points to GoDaddy hosting via DNS A record (DNS configured in Sessions 8-9). Until DNS is live, backend uses GoDaddy temporary hosting URL or local dev URL — `API_BASE_URL` stays null in production config until cutover.
- cPanel for database management, phpMyAdmin for queries
- SSL on api subdomain via GoDaddy or Let's Encrypt

### Email: Resend

- Transactional emails (RSVP confirmation, sponsor inquiry receipt, time capsule scheduled send, committee notifications)
- Free tier covers 3000 emails/month (well above needed volume — reunion is ~250 classmates max)
- API key stored per Production Secrets Strategy below

### DNS: GoDaddy

- `mbsh96reunion.com` (apex) → Netlify (Session 8+)
- `www.mbsh96reunion.com` → Netlify (Session 8+)
- `api.mbsh96reunion.com` → GoDaddy hosting IP (DNS configured in Sessions 8-9; until then, backend reachable via GoDaddy temporary hosting URL or localhost)

---

## Production Secrets Strategy

**Pattern:** Secrets live in a PHP config file OUTSIDE the web root. Backend PHP scripts include via `require_once`. The config file is never accessible via web request because it's not under the document root.

### Local development

- `~/famtastic/site-studio/.env` continues holding development credentials
- Local PHP dev server reads from `.env` for testing
- Local target repo `~/famtastic-sites/mbsh-reunion/.env` also gitignored — used by local backend dev

### Production (GoDaddy)

- Config file at `/home/[godaddy-username]/.config/mbsh-config.php`
- Web root is typically `/home/[godaddy-username]/public_html/`
- Backend scripts use absolute path: `require_once '/home/[godaddy-username]/.config/mbsh-config.php';`
- File permissions: 0600 (owner read/write only)
- Config format:

```php
<?php
return [
  'db_host' => 'localhost',
  'db_name' => '...',
  'db_user' => '...',
  'db_password' => '...',
  'resend_api_key' => 're_...',
  'committee_email' => 'mbsh96reunion@gmail.com',
  'allowed_origins' => [
    'https://mbsh96reunion.com',
    'https://www.mbsh96reunion.com',
    'http://localhost:8080',
  ],
  'allowed_origin_patterns' => [
    // Netlify preview pattern: https://[branch]--[site].netlify.app
    '/^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.netlify\.app$/',
    // Netlify production alias pattern
    '/^https:\/\/[a-z0-9-]+\.netlify\.app$/',
  ],
  'admin_password_hash' => '...', // password_hash() output
  'admin_csrf_secret' => '...',   // random 32+ byte string for CSRF tokens
  'pending_uploads_path' => '/home/[username]/uploads-pending',
  'approved_uploads_path' => '/home/[username]/public_html/uploads/approved',
  'environment' => 'production',
];
```

**Why this pattern:**
- Works on any shared host without special features
- No risk of `.htaccess` misconfig exposing secrets to web
- Standard PHP secrets pattern, not GoDaddy-specific
- Local dev and production use parallel-but-separate config files

---

## Backend Security Rules

All PHP backend scripts MUST implement these defenses without exception. Apply uniformly across rsvp.php, sponsor.php, memory.php, capsule.php, attendees.php, chatbot-question.php, sponsors.php, in-memory.php, and admin scripts.

### CORS Allow-List

Backend explicitly permits only:
- Exact origins from production config: `https://mbsh96reunion.com`, `https://www.mbsh96reunion.com`, `http://localhost:8080` (dev only)
- Pattern-matched origins for Netlify preview URLs

**Netlify preview URL patterns (documented):**
- Branch deploy preview: `https://[branch-name]--[site-name].netlify.app` where `[branch-name]` and `[site-name]` are lowercase alphanumeric with optional hyphens
- Production alias: `https://[site-name].netlify.app`
- Both patterns documented in production config as regex; matched at runtime

**Pattern scoping evolution by session:**
- Sessions 1B-7: Backend not yet deployed publicly — no real CORS exposure to internet. Patterns remain in config but unused.
- Session 8: Once Netlify site is created, the actual `[site-name]` slug becomes known. Tighten regex from generic `[a-z0-9-]+` to the specific Netlify site slug. Until then, broad pattern is acceptable because backend is not internet-reachable.
- Session 9: Production launch — verify CORS regex is locked to exact Netlify site slug, not wildcard.

Reject all other Origin headers with 403. Read allowed origins and patterns from production config, not hardcoded.

Implementation pattern (shared in `lib/cors.php`):

```php
function check_origin($config) {
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array($origin, $config['allowed_origins'])) {
    return $origin;
  }
  foreach ($config['allowed_origin_patterns'] as $pattern) {
    if (preg_match($pattern, $origin)) {
      return $origin;
    }
  }
  return null;
}

$allowed_origin = check_origin($config);
if ($allowed_origin) {
  header("Access-Control-Allow-Origin: $allowed_origin");
  header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
  header("Access-Control-Allow-Headers: Content-Type, X-CSRF-Token");
  header("Vary: Origin");
} else {
  http_response_code(403);
  exit('Origin not allowed');
}
```

**No-Origin request handling (server-to-server, cron, CLI, same-origin form posts):**

Browsers always send `Origin` headers on cross-origin requests. Absence of `Origin` typically means same-origin request, server-to-server, cron job, or CLI test. Per-endpoint policy:

- **Public POST endpoints** (`rsvp.php`, `sponsor.php`, `memory.php`, `capsule.php`, `chatbot-question.php`): Require `Origin` header. Reject if absent — these endpoints are only legitimately called by browsers.
- **Public GET endpoints** (`attendees.php`, `sponsors.php`, `in-memory.php`): Allow no-`Origin` requests (search engines, monitoring tools, CLI checks). Read-only, no state change.
- **Admin endpoints** (`admin/*.php`): Same-origin only. Frontend served from same domain as backend (or via reverse proxy). Reject cross-origin requests entirely. Allow no-`Origin` for same-origin POST forms.
- **Cron scripts** (`cron/*.php`): Run from CLI only. Detect via `php_sapi_name() === 'cli'` and exit if accessed via web request.

### CSRF / Replay Protection

**For public endpoints (RSVP, sponsor inquiry, memory, time capsule, chatbot):**
- POST endpoints handling JSON body (`rsvp.php`, `capsule.php`, `chatbot-question.php`, admin state-change endpoints) reject requests without `Content-Type: application/json` header
- POST endpoints handling file uploads (`sponsor.php`, `memory.php`) accept `Content-Type: multipart/form-data` only — these endpoints validate the multipart structure, file presence, and per-field constraints separately
- Upload endpoints additionally enforce all File Upload Safety rules (MIME validation via `finfo_file()`, size limits, dimension limits, filename sanitization) at the field-handling layer, not at the Content-Type layer
- All forms include a hidden honeypot field (`website` or `url` or similar) — if filled, silent reject as spam
- Reject submissions where the form was loaded less than 3 seconds ago (bot detection via JavaScript-set timestamp in hidden field `form_loaded_at`)
- Rate limiting per IP per endpoint (see Rate Limiting section below)

**For admin endpoints (approve, reject, manage):**
- Session cookie required (set by `/admin/login.php`)
- CSRF token required in `X-CSRF-Token` header on every state-changing POST
- CSRF tokens generated via HMAC of session ID + admin_csrf_secret
- Tokens validated server-side on every admin action
- Tokens rotate on login

### Rate Limiting

**Storage:** MySQL table `rate_limits` (defined in schema below). Tracks attempts per IP per endpoint per time window.

**Public endpoint limits:**
- Max 5 submissions per IP per minute per endpoint
- Max 20 submissions per IP per hour per endpoint
- Exceeding limits returns 429 Too Many Requests

**Admin login limits:**
- Max 5 failed login attempts per IP per 15 minutes
- After 5 failures, IP locked out for 1 hour
- Tracked in `admin_login_attempts` table (defined in schema below)

**Cleanup:** Cron job runs daily to delete `rate_limits` rows older than 24 hours and `admin_login_attempts` older than 7 days.

**Cron activation status by session:**
- Session 1B: Cron scripts (`send-capsules.php`, `cleanup-rate-limits.php`) scaffolded as files with stub PHP. Not registered with GoDaddy cron yet.
- Session 6: `send-capsules.php` activated via cPanel cron when time capsule feature ships.
- Session 8: `cleanup-rate-limits.php` activated via cPanel cron during admin/staging setup.
- Until cleanup cron activates, the `rate_limits` and `admin_login_attempts` tables will accumulate rows. Volume is low enough during pre-launch testing that this is not a problem; tables can be manually truncated via phpMyAdmin if needed.

**Implementation:** `lib/rate-limit.php` provides `check_rate_limit($ip, $endpoint, $window_seconds, $max_attempts)` returning bool.

### Input Validation

Every endpoint validates:
- Required fields present and non-empty
- Email fields match basic regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- String fields under maximum length per schema
- ENUM fields match allowed values exactly
- All inputs validated server-side before storage; never trust client-provided data
- Storage: validated raw text stored in MySQL via PDO prepared statements (parameter binding handles SQL safety; do NOT pre-escape with htmlspecialchars before storage — pre-encoding pollutes data exports, email bodies, and admin review with HTML entities)
- Output escaping is context-specific:
  - HTML output (admin review pages, public attendee display): `htmlspecialchars($value, ENT_QUOTES | ENT_HTML5, 'UTF-8')` at render time
  - JSON API output: `json_encode()` handles escaping automatically
  - Email plain-text bodies: no escaping needed (output as raw text)
  - Email HTML bodies: `htmlspecialchars()` at render time

### File Upload Safety

**Pending uploads (sponsor logos awaiting approval, memory photos awaiting approval) are NOT publicly accessible.**

- Pending uploads stored at `/home/[godaddy-username]/uploads-pending/` (OUTSIDE web root)
- Pending uploads served only via authenticated admin PHP endpoint that checks session and streams file after auth verification
- Approved uploads move to `public_html/uploads/approved/` for static serving
- File operations use absolute paths from production config

**Validation rules for all uploads:**
- MIME type validation via `finfo_file()` — accept only `image/jpeg`, `image/png`, `image/webp`
- **SVG explicitly rejected** (security: SVG can contain executable JavaScript via `<script>` tags or `onload` handlers)
- File size limit: 2MB max
- Image dimension limit: 4000x4000px max
- Filename sanitization: replace original filename with random UUID + verified extension
- No PHP execution in any upload directory

**`.htaccess` rules required in BOTH pending and approved upload directories:**

```apache
# Disable PHP execution
<FilesMatch "\.(php|phtml|php3|php4|php5|phar|cgi|pl)$">
  Require all denied
</FilesMatch>

# Disable directory listing
Options -Indexes

# Disable script execution
Options -ExecCGI

# Restrict to image MIME types only
<FilesMatch "\.(jpe?g|png|webp)$">
  Header set X-Content-Type-Options "nosniff"
</FilesMatch>

# Deny everything else
<FilesMatch "\.(?!jpe?g|png|webp)$">
  Require all denied
</FilesMatch>
```

**Apache compatibility note:**
- `Require all denied` requires Apache 2.4+ with `mod_authz_core`
- Negative lookahead `(?!...)` in `FilesMatch` requires PCRE-compiled Apache (standard on most hosts including GoDaddy)
- GoDaddy Web Hosting Deluxe runs Apache 2.4 by default — both should work
- Session 1B test step: place the `.htaccess` in a test directory and attempt to fetch a `.txt` file via browser; expect 403. If the test fails (older Apache or PCRE not compiled), fall back to a positive-allow whitelist using `mod_rewrite` rules instead.

- Approved uploads served via direct static serving (faster, no PHP overhead)
- Pending uploads NEVER served statically — admin PHP endpoint with session auth required

### SQL Injection Prevention

All queries use prepared statements via PDO with parameter binding. No string concatenation into SQL under any circumstance.

### Admin Page Authentication

Admin pages (Session 8) require committee password authentication via session cookie + CSRF tokens:

**Login flow (`/admin/login.php`):**
- Committee enters shared password
- Password verified against `password_hash()` stored in production config
- Failed login increments `admin_login_attempts` table for that IP
- On success: 
  - Session cookie set with secure flags: `HttpOnly`, `Secure`, `SameSite=Strict`
  - CSRF token generated via HMAC, returned to client
  - Failed attempt counter reset for that IP

**Session validation (`lib/admin-auth.php`):**
- All admin pages call `require_admin_auth()` at top
- Checks session validity
- Session timeout: 4 hours of inactivity
- Auto-logout and redirect to login on expiry

**State-changing actions (approve, reject, edit, delete):**
- Must be POST (never GET)
- Must include valid CSRF token in `X-CSRF-Token` header
- Token validated server-side; mismatch returns 403
- All admin actions logged to `admin_audit_log` table for accountability

**NEVER pass auth tokens via URL parameters** (leaks via browser history, server logs, Referer headers).

### Privacy / Consent Text

All forms include lightweight consent micro-copy:

**RSVP form:**
*"By submitting, you consent to your name and city appearing on the public attendee list (you can opt out via the checkbox above). The committee retains this information until 30 days after the reunion. Email mbsh96reunion@gmail.com to request deletion at any time."*

**Time Capsule form:**
*"Your answers will be emailed back to you on July 12, 2026. The committee will not read or share your responses. Email mbsh96reunion@gmail.com to request deletion before that date."*

**Memory submission:**
*"By submitting, you consent to public display of your memory and name after committee approval. Email mbsh96reunion@gmail.com to request removal at any time."*

**Sponsor inquiry:**
*"Your contact information will be used to coordinate sponsorship details. Approved sponsor logos appear publicly on the site."*

---

## Repository

- **GitHub:** `github.com/famtastic-fritz/mbsh-reunion` (renamed from typo — completed before Session 1)
- **Branch strategy:**
  - `main` — production-ready code (Netlify connection deferred to Session 8)
  - `archive/v0-placeholder` — prior placeholder code preserved as reference branch (created in Session 1B before scaffold replaces main contents via normal commit, no force pushes, no history rewrites)
  - Feature branches off main per session, get auto-generated Netlify preview URLs (Session 8+)
- **Commit policy:** Human-style commit messages only. No AI references, Claude references, or automated-tool language.

---

## Design Direction (Locked)

**Theme:** Cinematic. Movie premiere. Black-tie elegance.

Sibling brand to the official MBSH school site (same red, same school identity bloodline) — but cinematic where the school site is institutional.

### Visual register

- Cinematic hero (Leonardo image-to-video background loop)
- Slow, deliberate animations
- Luxurious typography (six-font system per existing typography doc at `docs/sites/site-mbsh-reunion/MBSH-TYPOGRAPHY-AND-ICONS.md`)
- Generous whitespace
- High-contrast imagery treated like film stills
- Silver metallic accents on red foundation
- Award-show / red-carpet energy
- Mobile-first

### Color palette

- Primary red: #C8102E (MBSH scarlet)
- White: #FFFFFF
- Silver: #C0C0C0 with metallic gradient (NOT flat gray)
- Off-black: #0A0A0A (never pure #000)
- Cream: #F8F4EC (warmer than white for sections needing air)

Dominant register: Red and white lead. Silver and cream as accents.

### Typography (six-font system)

- Playfair Display 900 — display headlines
- Cormorant Garamond italic — captions, accents
- Allura cursive — script labels, decorative
- Great Vibes — small cursive accents
- Inter 400/600 — body, UI, buttons
- JetBrains Mono — data displays only (countdown, numerical readouts)

Five fonts per page maximum.

---

## Custom Brand Mark (V1 — FAMtastic-commissioned)

For V1 launch, we use a FAMtastic-commissioned 30+100 inspired mark, NOT the official school medallion. The official medallion remains the school's IP.

### The commissioned mark

- Circular composition, ~120px display size
- Outer ring: silver foil treatment with text *"30 YEARS"* (top arc) and *"100 YEARS"* (bottom arc)
- Inner core: red field with silver/white "1996 / 2026" composition stacked
- Subtle wave element nodding to "Hi-Tides"
- Generated via OpenAI Responses or Imagen — locked as approved canonical asset before any other section uses it

**Iteration 2 path:** Fritz pursues written permission from MBSH school admin to use the official 100 Years of Excellence medallion. If granted, swap commissioned mark for official one in iteration 2.

**Where the commissioned mark appears:**
- Hero (top-left, stamp of authority)
- "Forever" moment in The Story section
- Footer left column

---

## Mobile-First Mandate

Most alumni first encounter this site on a phone. Mobile experience is primary; desktop is secondary refinement.

- Hero must hit emotionally on a 5.5-inch screen at 11pm in bed
- Vertical stack layouts as default; desktop expands horizontally
- Performance budget: hero loads in under 3 seconds on 4G, full site interactive within 5 seconds
- Touch-first interaction patterns; hover effects are enhancement only

---

## Section Architecture

### Section 1: Hero

**Goal:** First 5 seconds must produce awe + pride.

**Composition (layered):**

- **Background:** Leonardo dancefloor-confetti loop at `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/05-dancefloor-confetti.mp4`. Full-bleed, looped, muted, autoplay. Dark gradient overlay (0% top → 60% black bottom) so foreground reads.

- **Foreground top-left:** FAMtastic-commissioned 30+100 brand mark, sized as a stamp of authority (~80px mobile, ~120px desktop).

- **Center vertical typography stack:**
  - Allura cursive, ~32px mobile / ~56px desktop, silver: *"Welcome back, Class of '96"*
  - Playfair Display 900, ~56px mobile / ~120px desktop, white: **THIRTY YEARS OF HI-TIDES** (two lines)
  - Cormorant Garamond italic, ~16px mobile / ~22px desktop, cream: *"Saturday, July 12, 2026 — Miami Beach"* (date templated as `{{REUNION_DATE}}`)

- **Foreground bottom-right:** Hi-Tide Harry transparent PNG (`assets/mascot/01-wave-hello.png` or `07-confirming.png` — A/B at build time, pick whichever lands better), positioned smaller than typography. Mobile: stacks below typography. Desktop: bottom-right corner.

- **Primary CTA:** Single button, red fill, white text uppercase Inter 600: **"RESERVE YOUR SEAT"** — anchor link to RSVP section.

- **Below the fold tease:** Animated downward scroll arrow + Great Vibes cursive in silver: *"Let us be known for our deeds"*

**Mobile composition:** Vertical stack: brand mark (top-left, smaller) → typography (centered) → Harry (centered below typography) → CTA → scroll tease.

**Desktop composition:** Layered as described, with Harry in bottom-right corner and typography centered.

---

### Section 2: The Story

**Goal:** Establish the dual milestone with emotional weight, not bullet points.

**Three-moment vertical scroll-driven narrative:**

**Moment 1 — Then.**
- Image: Imagen 4 generated still, 16:9, atmospheric 1996-feel. Empty high school hallway, golden hour light through windows, dust motes in light shafts, warm color grade, subtle film grain. NO people, NO readable text, NO specific identifiable location. Suggestive of memory.
- Caption (Playfair Display, 32-48px, white on dark overlay): *"In 1996, we walked these halls."*

**Moment 2 — Now.**
- Image: Imagen 4 generated still, 16:9, atmospheric present-day Miami Beach feel. Coastal light, palm shadows, modern architectural lines, bright but composed. NO specific identifiable location, NO real building photography (use evocative composition).
- Caption: *"Thirty years later, we walk back together."*

**Moment 3 — Forever.**
- Composition: FAMtastic 30+100 commissioned mark centered large on red background. Silver foil treatment. Subtle pulse animation.
- Caption: *"At a school turning 100. One night. One class. One hundred years of Hi-Tides."*

**Below the three moments:**

Refined inline event details in elegant typography (Cormorant Garamond italic for labels, Inter for values):
- Date: `{{REUNION_DATE}}`
- Time: 7:00 PM – Midnight
- Venue: `{{REUNION_VENUE}}` — render *"Venue announcement coming soon"* until locked
- Attire: Black-tie cocktail
- One-line atmospheric hook: *"A black-tie celebration thirty years in the making."*

---

### Section 3: Save the Date / RSVP

**Goal:** Convert. Reduce friction. Make the act of RSVPing feel like a small ceremony.

**Above the form:** Large countdown timer to `{{REUNION_DATE}}` 7:00 PM. Red and silver typography (Playfair Display large numerals, Cormorant Garamond italic labels). Updates every second. Mobile: 2x2 grid. Desktop: horizontal row.

**RSVP Form — progressive disclosure:**

Default visible fields:
- First Name *
- Last Name (Maiden Name if applicable) *
- Email Address *
- Will you attend? * (dropdown: Yes / Maybe / Sorry, can't make it)

Reveals on "Yes" selection:
- Phone Number
- Current City/State
- Number of Guests (Just me / +1 / +2 / +3)
- Guest Name(s)
- Dietary Restrictions/Preferences
- "I'd love to help with planning!" checkbox
- Messages or Venue Suggestions textarea
- "Display me publicly on the attendee list" checkbox (default checked)

**Hidden honeypot field:** `website` — silent reject if filled (bot detection)

**Form-load timestamp:** JavaScript sets a hidden field `form_loaded_at` on page load. Backend rejects if submission arrives less than 3 seconds after load (bot detection).

**Consent micro-copy** (visible above submit button): *"By submitting, you consent to your name and city appearing on the public attendee list (you can opt out via the checkbox above). The committee retains this information until 30 days after the reunion. Email mbsh96reunion@gmail.com to request deletion at any time."*

**Submit button:** Red fill, *"Submit RSVP 🌊"* — wave emoji is the one allowed emoji per typography standing rules.

**Success state:**
Confetti micro-moment (red + silver + white particles). Large success message: *"You're on the list. Welcome back, [First Name]."* Below: *"We've sent confirmation to [email]. See you on July 12."* Plus link to Time Capsule section: *"Want to send your younger self a message? Open the time capsule."*

**Backend wire:**
- Form POSTs to `${API_BASE_URL}/rsvp.php`
- PHP validates per Backend Security Rules (CORS, honeypot, rate limit, input validation)
- Inserts row to `rsvps` MySQL table
- Resend API call sends confirmation to classmate's email AND notification to committee email
- Returns success/error JSON to frontend
- Frontend shows confetti success state on success

---

### Section 4: The Night (Tickets + Sponsors)

**Goal:** Two payment paths — ticket purchase (everyone) and sponsor donation (those who want to give more). Sponsor track funds the event.

#### Subsection 4A: Tickets

Visual hierarchy: friendly, welcoming, intimate.

Two tiers presented as cards:
- **Early Bird** — $60 per person (until June 1, 2026)
- **Regular Price** — $75 per person (after June 1)

Each card: tier name in Playfair Display, price large in red, brief description in Cormorant Garamond italic.

**Early bird display logic (frontend):**
- JavaScript computes on page load: `currentDate <= EARLY_BIRD_DEADLINE && EARLY_BIRD_ACTIVE`
- If true: show "Early Bird" card with countdown to deadline, plus Regular Price card as secondary
- If false: show "Regular Price" card primary, no early bird reference
- The `EARLY_BIRD_ACTIVE` flag in config is a manual override the committee can flip to false to force early-bird off before deadline if needed

CTA: *"Purchase Tickets"* — opens PayPal flow.

**PayPal integration:**
- Committee sets up PayPal business account (separate Fritz-and-committee task)
- Until that account exists, button shows disabled state with subtle messaging: *"Ticketing opens once committee finalizes payment account. RSVP for free now to be notified."*
- Activation via `PAYMENTS_STATUS` config flag flipping from "disabled" to "live"
- Once live, button activates with PayPal redirect using `PAYPAL_BUTTON_ID` from config

#### Subsection 4B: Sponsorship

Visual hierarchy: premium, elevated, jewelry-on-the-page.

Four tier cards with custom premium icons (generated in Session 4 per typography doc):

- **Diamond Sponsor** — $1,000+ • Premium logo placement, recognition at event, social acknowledgment
- **Hi-Tide Captain** — $500 • Featured logo placement, recognition at event
- **Hi-Tide Crew** — $250 • Logo on sponsor wall
- **Hi-Tide Friend** — $100 • Name on sponsor wall

Plus: **Custom Amount** option

Each card: tier name in Allura cursive at top (silver), amount large in red, benefits in Inter 400 cream. Premium icon top-right.

CTA: *"Become a Sponsor"* — opens sponsor inquiry form modal.

**Sponsor Inquiry Form (V1 — manual approval, NOT self-service display):**

V1 BEHAVIOR:
- Sponsor submits inquiry form including optional logo upload
- Logo uploaded to PENDING storage outside web root: `/home/[godaddy-username]/uploads-pending/sponsors/` with random UUID filename
- Inquiry row inserted to `sponsors_pending` table (status='pending')
- Resend notification to committee email with REVIEW LINK (not attached logo) — committee clicks link to authenticated admin review page where they see logo + details
- Committee manually approves via admin page (POST with CSRF token) → row promotes to `sponsors_approved`, logo moves to web-accessible `public_html/uploads/approved/sponsors/`
- Approved sponsor wall queries `sponsors_approved` only

V1 EXPLICITLY DOES NOT:
- Auto-display submitted logos (manual approval gate required)
- Auto-promote pending to approved
- Allow sponsors to edit their submission post-submit
- Serve pending uploads as web-accessible static files (security: pending uploads outside web root)

Form fields:
- Name *
- Company / Organization
- Email *
- Phone
- Tier interest *
- Custom amount (if Custom selected)
- Logo upload (file input — see File Upload Safety rules above for validation; JPEG/PNG/WebP only, no SVG)
- Custom message
- Hidden honeypot field
- Hidden form-load timestamp

**Consent micro-copy:** *"Your contact information will be used to coordinate sponsorship details. Approved sponsor logos appear publicly on the site."*

**Backend wire:**
- POSTs to `${API_BASE_URL}/sponsor.php`
- PHP validates per Backend Security Rules
- Saves logo to pending uploads dir with random filename
- Inserts to `sponsors_pending` MySQL table
- Resend API sends notification to committee email with link: `https://api.mbsh96reunion.com/admin/review-sponsor.php?id=[id]` (link requires admin session cookie to view; ID alone is not auth)
- Returns success JSON to frontend

#### Subsection 4C: Sponsor Wall Preview

"Already supporting" — animated reveal grid of confirmed sponsor logos by tier. Empty state: *"Be among the first to support this milestone celebration."*

Tier groupings visually distinct (Diamond gets largest display, Friend gets smallest). Logos displayed against off-black background with silver dividers between tiers.

Polls `${API_BASE_URL}/sponsors.php` on page load (no real-time refresh needed — sponsors update slowly).

---

### Section 5: Through the Years

**Goal:** Documentary-style legacy section. Not a nostalgia dump — a *legacy* statement.

**Five-era timeline, scroll-driven reveal:**

Each era anchored by ONE strong image. Image sources, in priority order:
1. Florida Memory archival photos (floridamemory.com) — 1942 football, 1942 senior prom, 1963 campus
2. Flashback Miami (flashbackmiami.com) — 1962, 1963, 1979, 1985, 1987 archival
3. Official MBSH school site (miamibeachseniorhigh.net) — building timeline strip
4. Imagen 4 generated period-appropriate fillers if archival sources gap (clearly marked as "atmospheric, not archival" in metadata)

Per-era single sentence in Cormorant Garamond italic. Era badge in Allura cursive.

Suggested eras (committee can refine):
- **1926–1959** — *"The first Hi-Tides. Forty years of laying the foundation."*
- **1960s–1970s** — *"Coming of age in Miami Beach."*
- **1980s** — *"The decade we were born. The school they built around us."*
- **1996** — *"Our year. Our halls. Our class."*
- **2026** — *"One hundred years. Still rising."*

**Below the timeline:** small, unobtrusive invitation to add memories.

Memory submission form:
- Contributor name *
- Contributor email
- Memory text * (max 1000 chars)
- Optional photo upload (same upload safety rules; JPEG/PNG/WebP only, no SVG)
- Hidden honeypot field
- Hidden form-load timestamp

**Consent micro-copy:** *"By submitting, you consent to public display of your memory and name after committee approval. Email mbsh96reunion@gmail.com to request removal at any time."*

**Memory submission backend:**
- POSTs to `${API_BASE_URL}/memory.php`
- PHP validates, saves photo to pending uploads outside web root
- Inserts to `memories` table with `approved=FALSE`
- Resend notification to committee with admin review link
- Committee reviews via admin page, approves to display on site
- Approved memories displayed in chronological order by approval date

---

### Section 6: Who's Coming

**Goal:** Social proof + connection. Real classmates as they RSVP.

**Layout:**

Searchable grid of attendees. Avatar circle (60px) with red ring (confirmed) or silver ring (maybe). Avatar shows initials by default (no photo upload in V1 attendee display — keeps it clean and avoids the photo moderation surface).

Name below in Playfair Display 18px. Location (if shared) in Cormorant Garamond italic 14px.

**Real-time updates:** As RSVPs land, the grid updates within 30 seconds (frontend polls `${API_BASE_URL}/attendees.php` every 30s).

**Search bar:** Filter by name client-side. Inter 400 placeholder: *"Search classmates..."*

**Counter:** *"[N] classmates have already confirmed"* in Allura cursive silver, top of section.

**Empty state:** *"Be the first to RSVP and lead the return."*

**Privacy:** Classmates can opt out of public display during RSVP via `display_publicly` checkbox (default: checked). Last name displayed by default; opt-in for showing maiden name in parentheses.

**Backend:**
- GET `${API_BASE_URL}/attendees.php`
- Returns JSON of RSVPs where `attending IN ('yes','maybe') AND display_publicly=TRUE`
- Returns only: first_name, last_name, maiden_name, city_state, attending status
- No email, phone, message, dietary, or any other private fields exposed

---

### Section 7: In Memory

**Goal:** Honor classmates lost. Soft, respectful, easily skipped on mobile but present.

**Layout:**

Subtle section divider (silver hairline). Section header in Allura cursive: *"In Memory"*. Cormorant Garamond italic subtitle: *"Forever Hi-Tides."*

Names listed in Playfair Display, 24px, white on off-black background. Small year (1996 graduation year + year passed if known) below each name in Cormorant Garamond italic 14px silver.

Each name optionally clickable to reveal a brief tribute (committee-curated, under 200 characters, no AI-generated content here — humans only).

**Inclusion process:** Committee adds names manually via admin page. No public submission form for this section (sensitive content, requires committee discretion).

**Empty state:** Section is hidden until at least one name is added.

**Tone:** Reverent. No melodrama. The visual restraint is the respect.

**Backend:**
- GET `${API_BASE_URL}/in-memory.php`
- Returns JSON of `in_memory` rows where `active=TRUE`, ordered by `display_order`
- Section's HTML/CSS hides itself if returned array is empty

---

### Section 8: Hi-Tide Time Capsule

**Goal:** Surprise emotional payoff. Build anticipation for July 12 with a personal touch each classmate sends to their future self.

**Layout:**

Small dedicated section, not prominent on landing scroll. Linked from RSVP confirmation flow ("Want to send your younger self a message? Open the time capsule.").

**Form:**
- Email address *
- "What song takes you back to '96?" (text field)
- "Who would you most want to find again?" (text field, optional)
- "Best memory from senior year?" (textarea)
- Hidden honeypot field
- Hidden form-load timestamp
- Submit button: *"Seal the Capsule"*

**Consent micro-copy:** *"Your answers will be emailed back to you on July 12, 2026. The committee will not read or share your responses. Email mbsh96reunion@gmail.com to request deletion before that date."*

**Backend:**
- POSTs to `${API_BASE_URL}/capsule.php`
- PHP validates per Backend Security Rules
- Inserts to `time_capsules` table with `send_date` defaulting to `2026-07-12 11:00:00 UTC` (= 7:00 AM ET on July 12)
- Cron job at GoDaddy runs daily, queries capsules where `send_date <= UTC_TIMESTAMP() AND sent_at IS NULL`, sends Resend email with classmate's own answers, marks `sent_at = UTC_TIMESTAMP()`
- Email subject: *"From your 1996 self — welcome home, Hi-Tide."*
- Email body uses site's typography, includes classmate's three answers formatted elegantly

**Visual treatment:**
The form panel is styled as a wax-sealed envelope or metallic capsule. Silver foil accents. Red wax seal illustration if doable, otherwise CSS-only treatment.

---

### Section 9: Class of '96 Playlist

**Goal:** Living, growing, embedded soundtrack. Free to deploy, big emotional resonance.

**Layout:**

Section header in Playfair Display: *"Our Soundtrack"*. Cormorant Garamond italic subtitle: *"The songs that made us who we are."*

**Content:**

Embedded Spotify playlist iframe. Auto-plays muted (user can unmute). Playlist is curated by Fritz / committee, seeded with anchor era tracks (Tupac, Biggie, Outkast, Spice Girls, Alanis Morissette, Fugees, Bone Thugs, No Doubt, Celine Dion, Toni Braxton, Tracy Chapman per existing nostalgia content) — all rights properly licensed via Spotify embed only, no sync/download.

**Submission flow:**
Classmates can suggest tracks via the chatbot or a small form. Committee curates weekly.

**Why this works:**
Spotify's embed handles all licensing. Site never hosts audio. Free, legal, and feels alive.

---

### Section 10: Hi-Tide Harry — Floating Chatbot

**Goal:** First branded AI chatbot built through Studio. Personality interface for the reunion site. Pervasive across all sections.

**Layout:**

Fixed bottom-right corner across all pages. Mobile: 24px from bottom-right. Desktop: 40px from bottom-right.

**Bubble:** Hi-Tide Harry transparent PNG (use `assets/mascot/06-listening.png` for closed/idle state — friendly listening pose, ~64px). Subtle pulse animation. Tap/click reveals chat panel.

**Chat panel (when open):**
- Mobile: full-screen overlay
- Desktop: bottom-right docked panel ~400px wide × ~600px tall

**Panel header:**
- Larger Harry pose (~120px) — `01-wave-hello.png` for initial greeting state
- Name: "Hi-Tide Harry" in Playfair Display 18px
- Status: "Reunion Assistant" in Cormorant Garamond italic 12px silver
- Close button (top-right)

**Chat interface:**
- Harry's messages: rounded chat bubbles, MBSH red background, white text, Inter 400 16px
- User messages: rounded chat bubbles, silver/cream background, off-black text
- Voice optional: if Fritz selects an ElevenLabs voice for Harry, audio plays alongside Harry's text messages (auto-play disabled by default; user toggles with speaker icon)

#### V1 Capability — Phase 1 only (data collector + basic Q&A):

**Pre-loaded FAQ knowledge:**
- "When is the reunion?" → "Saturday, July 12, 2026, from 7 PM to midnight."
- "Where is it?" → "Venue announcement coming soon. The committee is finalizing details."
- "How do I RSVP?" → "Scroll up to the Save the Date section, or tap here to jump there." [link]
- "Who's coming?" → "Tap here to see the Class of '96 who've already confirmed." [link]
- "What's the dress code?" → "Black-tie cocktail. Think prom night, but make it 2026."
- "How much are tickets?" → "$60 early bird until June 1, $75 after."
- "Can I sponsor?" → "Yes! Tap here to see sponsor tiers." [link]
- "Are you AI?" → "I'm Hi-Tide Harry, the reunion's spirit guide. Let's just say I've been here a while."

**Beyond pre-loaded FAQ, Harry uses a graceful fallback:**
*"That's a great question — let me get the committee on it. Drop your email and we'll follow up."*

The fallback collects: question text + email, routes to committee inbox. **No hallucinated answers. No confidently-wrong responses.** Phase 2 expansion (real Q&A capability) is iteration 2 territory.

**Initial greeting:**
On first panel open per session: *"Hey Tide family. I'm Harry, the reunion's spirit guide. Got a question about July 12? Ask me anything."*

**Backend wire:**
- Question + email POSTs to `${API_BASE_URL}/chatbot-question.php`
- PHP validates, inserts to `chatbot_questions` table
- Resend notification to committee email
- Returns success JSON

---

### Section 11: Footer

**Layout:**
Off-black background, white type, silver hairline divider above.

**Three columns (mobile: stacked):**

**Column 1 — Class identity:**
- FAMtastic 30+100 commissioned mark (smaller, ~80px)
- "Class of 1996 • 30th Reunion"
- "Hi-Tide Pride Since 1926 🌊"
- Tagline in Allura cursive silver: *"Let us be known for our deeds"*

**Column 2 — Contact:**
- "Reunion Committee"
- mbsh96reunion@gmail.com (mailto link)
- Phone if committee provides
- Social links: Class Instagram, Facebook reunion group

**Column 3 — Resources:**
- Link to official MBSH school site (miamibeachseniorhigh.net)
- Link to MBSH school's official 100 Years page if it exists
- "Submit a memory" (anchor link)
- "Become a sponsor" (anchor link)

**Footer bottom strip:**
- Copyright: © 2026 MBSH Class of '96 Reunion Committee
- Tiny credit, right-aligned, Inter 400 12px silver: *"Built with FAMtastic Site Studio"* — link to famtastic.com or equivalent. **Subtle, not pushy. This is the portfolio backlink for every alum wondering who built this.**

---

## MySQL Database Schema

All 10 tables with explicit utf8mb4 charset/collation. Apply via `schema.sql` in Session 1B after Fritz approval.

```sql
-- ==========================================================
-- MBSH Class of '96 Reunion Site — Database Schema
-- ==========================================================

CREATE TABLE rsvps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  maiden_name VARCHAR(100) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  city_state VARCHAR(255) DEFAULT NULL,
  attending ENUM('yes','maybe','no') NOT NULL,
  guest_count INT DEFAULT 1,
  guest_names TEXT DEFAULT NULL,
  dietary TEXT DEFAULT NULL,
  help_planning BOOLEAN DEFAULT FALSE,
  message TEXT DEFAULT NULL,
  display_publicly BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_attending (attending),
  INDEX idx_email (email),
  INDEX idx_display (display_publicly, attending)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE sponsors_pending (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contact_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  tier_interest ENUM('diamond','captain','crew','friend','custom') NOT NULL,
  custom_amount DECIMAL(10,2) DEFAULT NULL,
  logo_path VARCHAR(500) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  status ENUM('pending','approved','rejected') DEFAULT 'pending',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP DEFAULT NULL,
  INDEX idx_status (status),
  INDEX idx_tier (tier_interest)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE sponsors_approved (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pending_id INT DEFAULT NULL,
  display_name VARCHAR(255) NOT NULL,
  tier ENUM('diamond','captain','crew','friend') NOT NULL,
  logo_path VARCHAR(500) DEFAULT NULL,
  website_url VARCHAR(500) DEFAULT NULL,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pending_id) REFERENCES sponsors_pending(id) ON DELETE SET NULL,
  INDEX idx_tier_order (tier, display_order),
  INDEX idx_active (active)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE memories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  contributor_name VARCHAR(255) NOT NULL,
  contributor_email VARCHAR(255) DEFAULT NULL,
  memory_text TEXT NOT NULL,
  photo_path VARCHAR(500) DEFAULT NULL,
  approved BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP DEFAULT NULL,
  INDEX idx_approved (approved, display_order)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE in_memory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  graduation_year INT DEFAULT 1996,
  year_passed INT DEFAULT NULL,
  tribute TEXT DEFAULT NULL,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_active_order (active, display_order)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE time_capsules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  song_answer TEXT DEFAULT NULL,
  person_answer TEXT DEFAULT NULL,
  memory_answer TEXT DEFAULT NULL,
  -- Stored in UTC. 2026-07-12 11:00:00 UTC = 7am ET on July 12, 2026
  send_date DATETIME NOT NULL DEFAULT '2026-07-12 11:00:00',
  sent_at TIMESTAMP NULL DEFAULT NULL,
  send_attempts INT DEFAULT 0,
  send_error TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_send_pending (send_date, sent_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE chatbot_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question TEXT NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  matched_faq VARCHAR(255) DEFAULT NULL,
  was_fallback BOOLEAN DEFAULT FALSE,
  responded BOOLEAN DEFAULT FALSE,
  response_notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP DEFAULT NULL,
  INDEX idx_unresponded (responded, was_fallback)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE rate_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_endpoint_time (ip_address, endpoint, attempt_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE admin_login_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  success BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_time (ip_address, attempted_at),
  INDEX idx_success_time (success, attempted_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE admin_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admin_session_id VARCHAR(64) NOT NULL,
  admin_label VARCHAR(100) DEFAULT 'committee',
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(50) DEFAULT NULL,
  target_id INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (admin_session_id),
  INDEX idx_label (admin_label),
  INDEX idx_action_time (action, performed_at)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Schema verification (Session 1B):**
- Capture MySQL version via `SELECT VERSION();`
- Confirm `sql_mode` does not block `ON UPDATE CURRENT_TIMESTAMP`
- Confirm GoDaddy server timezone via `SELECT @@global.time_zone, @@session.time_zone;`
- Document both in DATA-PERSISTENCE.md

**Time capsule send convention:**
All `send_date` values stored as UTC. Cron job runs in GoDaddy server timezone but converts NOW() to UTC for comparison: `WHERE send_date <= UTC_TIMESTAMP() AND sent_at IS NULL`.

Default value of `2026-07-12 11:00:00 UTC` = July 12, 2026 at 7:00 AM ET (UTC-4 during EDT).

---

## Provider Routing

- **Character poses:** Existing at `sites/site-mbsh-reunion/assets/mascot/poses/01-10`. No new generation needed for V1 unless a specific chatbot state requires a missing pose.
- **Atmospheric backgrounds (hero):** Use existing Leonardo loops at `sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/`. Primary: 05-dancefloor-confetti.mp4. Secondary candidates for other sections: 01-yearbook-pages.mp4, 02-rebuilt-school-push-in.mp4.
- **Hero stills (Through the Years atmospheric fillers):** Imagen 4 via Gemini API. 16:9 aspect ratio.
- **Style-consistent batch stills (yearbook treatment if needed):** fal.ai FLUX Kontext.
- **FAMtastic commissioned 30+100 mark:** OpenAI Responses or Imagen 4 — Session 2 generates and Fritz approves before any other section uses it.
- **Voice (Harry chatbot, optional):** ElevenLabs TTS. Voice candidates already generated at `docs/operating-rules/benchmark-runs/audio/B-005-*`. Fritz selects.
- **SFX (optional ambient texture):** ElevenLabs Sound Effects. Five candidates generated at `docs/operating-rules/benchmark-runs/audio/B-006-*`. Use only if it elevates without distracting.
- **Music (hero music bed, optional, opt-in unmute only):** ElevenLabs Music sample at `docs/operating-rules/benchmark-runs/audio/B-007-*`. Or Spotify embed in playlist section as the actual music vehicle. Hero is silent by default.

**No provider names in user-facing UI strings.** Per commit 9bcd93e standing rule.

---

## Standing Rules

1. All character assets are transparent PNG by default.
2. Wordmarks, dates, headlines, prices, registration text — never generated inside images or video. Always overlaid as HTML/SVG/CSS.
3. No provider names in user-facing UI strings.
4. No name-dropping of celebrity alumni.
5. Mobile-first composition. Desktop is enhancement.
6. All dates templated as `{{REUNION_DATE}}` etc. Single source of truth in site config.
7. PayPal button disabled until committee account confirmed (`PAYMENTS_STATUS=disabled` until then).
8. No autoplay audio. All sound is opt-in via user action.
9. Five fonts per page maximum.
10. No emoji icons except 🌊 (Hi-Tide wave).
11. Human-style commit messages only. No AI references.
12. Custom commissioned 30+100 mark for V1, NOT official school medallion.
13. NO force pushes to git under any circumstance.
14. NO SVG uploads accepted (security: SVG can carry executable JavaScript).
15. NO auth tokens via URL parameters (use session cookies + CSRF tokens for state changes).

---

## Out of Scope for V1

- **Self-service sponsor logo upload with auto-display** (V1 = upload to pending storage with manual committee approval before display; iteration 2 = self-service with auto-approval workflow)
- Chatbot Phase 2 / Phase 3 (V1 = Phase 1 FAQ only)
- Stripe (V1 = PayPal only)
- Custom yearbook page per classmate (V1 = basic Who's Coming grid only)
- AR Then-and-Now generator
- Premiere-edited multi-shot promo video (V1 = single Leonardo loop hero only)
- Multi-language support (V1 = English only)
- Native mobile app (V1 = web only)
- FAMtastic Hosting portfolio site (separate workstream for monetizing reseller plan; backlog for cross-system architecture phase)
- Official school medallion (iteration 2 if permission granted)

---

## Build Budget Ceiling

$500 total across API spend, third-party tooling, and dev-time tooling for V1. Realistic actual spend at current generation rates: under $100. Buffer covers iteration.

---

## Session 1 Prerequisites (Fritz Tasks)

Before Session 1B can complete:

1. **Rename GitHub repo** ✅ COMPLETED (`mbsh-reuion` → `mbsh-reunion`)

2. **Sign up for Resend** at resend.com (free tier), verify `mbsh96reunion.com` domain, generate API key. Have key ready for secure prompt during Session 1B.

3. **Add `mbsh96reunion.com` to Web Hosting Deluxe** as additional hosted domain via GoDaddy cPanel (or confirm it's already there). Create MySQL database via cPanel (note: db name, user, password). Have credentials ready for secure prompt during Session 1B.

4. **Email forwarding addresses** can be set up later (not blocking V1 launch — V1 routes to mbsh96reunion@gmail.com):
   - committee@mbsh96reunion.com (eventual)
   - harry@mbsh96reunion.com (eventual)
   - noreply@mbsh96reunion.com (eventual)

5. **DNS configuration** deferred to Sessions 8-9.

---

## Configuration Schema (site-config.json)

```json
{
  "REUNION_DATE": "2026-07-12",
  "REUNION_TIME": "19:00",
  "REUNION_VENUE": "TBA",
  "EARLY_BIRD_PRICE": 60,
  "REGULAR_PRICE": 75,
  "EARLY_BIRD_DEADLINE": "2026-06-01",
  "EARLY_BIRD_ACTIVE": true,
  "PAYPAL_BUTTON_ID": null,
  "PAYMENTS_STATUS": "disabled",
  "REGISTRATION_STATUS": "open",
  "COMMITTEE_EMAIL": "mbsh96reunion@gmail.com",
  "API_BASE_URL": null,
  "API_BASE_URL_DEV": "http://localhost:8080",
  "HARRY_VOICE_ID": null,
  "BUILD_STATUS": "scaffolding"
}
```

**Status flag semantics:**

- `EARLY_BIRD_ACTIVE` (boolean): Manual override. When true, frontend shows early bird if `currentDate <= EARLY_BIRD_DEADLINE`. When false, early bird hidden regardless of date.
- `PAYMENTS_STATUS` ("disabled" | "live" | "paused"): Controls PayPal button state and whether tickets section shows purchase or "coming soon" messaging.
- `REGISTRATION_STATUS` ("open" | "closed" | "waitlist"): Controls RSVP form availability. If "closed", form replaced with thank-you message.
- `API_BASE_URL` (string | null): Production backend URL. Null means backend not yet wired or DNS not yet configured; frontend degrades gracefully with "coming soon" for backend-dependent features. Stays null through Sessions 1-7. Set to GoDaddy temporary hosting URL during Sessions 3-7 backend testing if needed. Set to `https://api.mbsh96reunion.com` in Session 8-9 once DNS cutover is complete.

---

## Success Criteria for V1 Launch

- [ ] All 11 sections render correctly on iPhone 14 and desktop Chrome
- [ ] Hero loads and starts playing within 3 seconds on 4G
- [ ] RSVP form submits successfully and writes to MySQL
- [ ] Confirmation email sends within 30 seconds via Resend
- [ ] Countdown timer updates in real time
- [ ] Hi-Tide Harry chatbot opens and responds to all 8 pre-loaded FAQ questions correctly
- [ ] Sponsor inquiry form submits and emails committee with admin review link
- [ ] Time Capsule form submits and queues email for July 12 send
- [ ] Spotify playlist embeds and plays
- [ ] All Leonardo loop backgrounds load and play muted
- [ ] All Harry pose assets render with transparent backgrounds correctly
- [ ] FAMtastic 30+100 commissioned mark approved and placed in hero, story, footer
- [ ] CORS allow-list rejects requests from unauthorized origins
- [ ] CORS pattern-match accepts Netlify preview URLs
- [ ] All file uploads pass MIME validation, size limits, and dimension limits
- [ ] SVG uploads explicitly rejected
- [ ] All forms include consent micro-copy
- [ ] Honeypot field blocks automated submissions
- [ ] Rate limiting prevents abuse (rate_limits table tracks correctly)
- [ ] Admin login lockout works after 5 failed attempts
- [ ] Admin actions require valid CSRF tokens
- [ ] Admin audit log captures all state changes
- [ ] Production secrets stored in `~/.config/mbsh-config.php` outside web root with 0600 permissions
- [ ] MySQL schema applied with utf8mb4 charset across all 10 tables
- [ ] Time capsule send_date verified as UTC
- [ ] Pending uploads stored OUTSIDE web root
- [ ] Approved uploads served as static files with .htaccess hardening
- [ ] Admin auth via session cookie (not URL parameters)
- [ ] No `.env` or production config in git history
- [ ] Site achieves Lighthouse score >85 on mobile
- [ ] No console errors on any major browser
- [ ] FAMtastic Site Studio credit visible in footer
- [ ] Netlify auto-deploys from main on push (configured Session 8)
- [ ] api.mbsh96reunion.com responds with valid SSL

---

# PART 2: SESSION 1A EXECUTION PROMPT

## Session 1A — Safe Local Inspection and Proposal

Multi-session arc. Each session ends with explicit stop conditions. CRITICAL: this is a flagship build. Quality discipline matters more than speed. If anything is unclear, STOP and ask Fritz before proceeding. Do not fill ambiguity with assumption.

Session 1A is safe local-only inspection and proposal work — no credentials, no database mutation, no remote pushes, no scaffolded directories created. Output is a proposal document Fritz reviews.

The approval gate between 1A and 1B is non-negotiable. Do not silently roll from 1A into 1B.

Allowed network operations: GitHub repo inspection (read-only), filesystem reads, asset existence checks. NO paid provider/media/credential API calls.

### Steps:

**1. Save the V1 brief verbatim to disk at:**
```
~/famtastic/docs/sites/site-mbsh-reunion/V1-BRIEF.md
```

The brief is "PART 1: V1 BRIEF (CANONICAL)" of this artifact file. Read from disk where this artifact was saved (Fritz will provide path) — do NOT regenerate from memory or summarize. Save verbatim, no edits.

If brief content appears truncated or has placeholders: STOP and ask Fritz to verify the artifact file is complete.

**2. Verify the brief saved successfully:**
- File exists at expected path
- File size matches expected (should be substantial — many KB, not bytes)
- First line is `# MBSH Class of '96 Reunion Site — V1 Brief`
- Confirm no `[same as previous]` or similar placeholder strings remain anywhere in the saved file
- Saved brief contains the section header `## Success Criteria for V1 Launch` near the end
- Saved brief contains the line `- [ ] api.mbsh96reunion.com responds with valid SSL` somewhere in the success criteria section
- Saved brief does NOT contain the headers `# PART 2: SESSION 1A EXECUTION PROMPT` or `# PART 3: SESSION 1B EXECUTION PROMPT` (those are kept in the original execution artifact, not in the saved brief file — only the brief portion saves to V1-BRIEF.md)
- Saved brief is structurally complete: starts with `# MBSH Class of '96 Reunion Site — V1 Brief`, contains all 11 section headers (`### Section 1: Hero` through `### Section 11: Footer`), contains the schema block with all 10 CREATE TABLE statements

Report: file path, size, first line, last line, placeholder check result.

**3. Verify GitHub repo state.** Run:
```bash
git ls-remote https://github.com/famtastic-fritz/mbsh-reunion
```

Confirm:
- Repo exists at the corrected URL (no longer the typo `mbsh-reuion`)
- Has at least one commit on main
- Note the current HEAD commit hash for later reference

If repo does not exist at corrected URL: STOP. The rename may not have completed. Do not proceed.

**4. Inventory existing canonical assets (read-only):**

Check for existence and report file paths + sizes:
- 10 Hi-Tide Harry poses at `~/famtastic/sites/site-mbsh-reunion/assets/mascot/poses/`
- 5 Leonardo background loops at `~/famtastic/sites/site-mbsh-reunion/assets/background-tests/leonardo-motion/`
- 5 ElevenLabs voice samples at `~/famtastic/docs/operating-rules/benchmark-runs/audio/B-005-*`
- 5 ElevenLabs SFX at `B-006-*`
- 1 ElevenLabs music sample at `B-007-*`

Report: each asset's existence (yes/no), file size, md5 sum if quick.

If any expected asset is missing: STOP and report. Do not synthesize replacements.

**5. Clone the repo to a temp location for inspection:**
```bash
git clone https://github.com/famtastic-fritz/mbsh-reunion /tmp/mbsh-inspect
```

Use /tmp (standard temp directory). Do NOT clone into `~/famtastic-sites/mbsh-reunion/` yet — that target directory is created in 1B after approval.

Inspect contents:
- Branch list
- Latest commit message and date  
- Top-level directory tree
- Total file count
- Whether it appears to contain placeholder code from prior Claude Web work, or is fresh/empty

Report findings. If placeholder code is present, note specifically what's there but DO NOT modify, move, or delete it. Branch creation happens in Session 1B after Fritz approves the strategy.

**6. Generate the proposed scaffold structure as a text-only manifest at:**
```
~/famtastic/docs/sites/site-mbsh-reunion/SESSION-1A-SCAFFOLD-PROPOSAL.md
```

Include all of the following sections:

**6a. Full proposed directory tree** for `~/famtastic-sites/mbsh-reunion/` after scaffolding completes:

```
mbsh-reunion/
├── frontend/                 (deploys to Netlify, Session 8+)
│   ├── index.html
│   ├── css/
│   │   ├── base.css
│   │   ├── typography.css
│   │   ├── hero.css
│   │   ├── sections.css
│   │   └── chatbot.css
│   ├── js/
│   │   ├── main.js
│   │   ├── countdown.js
│   │   ├── rsvp.js
│   │   ├── sponsor.js
│   │   ├── memory.js
│   │   ├── time-capsule.js
│   │   └── chatbot.js
│   └── assets/
│       ├── mascot/           (copies of 10 Harry poses)
│       ├── backgrounds/      (copies of 5 Leonardo loops)
│       ├── icons/            (premium icons, Session 4)
│       └── brand-mark/       (commissioned mark, Session 2)
├── backend/                  (deploys to GoDaddy, Session 3+)
│   ├── rsvp.php
│   ├── sponsor.php
│   ├── memory.php
│   ├── capsule.php
│   ├── attendees.php
│   ├── chatbot-question.php
│   ├── sponsors.php
│   ├── in-memory.php
│   ├── admin/                (committee admin pages, Session 8)
│   │   ├── login.php
│   │   ├── logout.php
│   │   ├── dashboard.php
│   │   ├── review-sponsor.php
│   │   ├── review-memory.php
│   │   ├── manage-in-memory.php
│   │   └── serve-pending-upload.php
│   ├── lib/
│   │   ├── db.php            (MySQL PDO connection)
│   │   ├── resend.php        (email send wrapper)
│   │   ├── cors.php          (CORS allow-list + pattern enforcement)
│   │   ├── validate.php      (input validation)
│   │   ├── upload.php        (file upload safety)
│   │   ├── rate-limit.php    (MySQL-backed rate limiting)
│   │   ├── admin-auth.php    (session cookie auth)
│   │   └── csrf.php          (CSRF token generation/validation)
│   ├── cron/
│   │   ├── send-capsules.php (runs daily 7am UTC)
│   │   └── cleanup-rate-limits.php (runs daily)
│   ├── uploads/
│   │   ├── approved/         (web-accessible after manual approval)
│   │   │   ├── sponsors/
│   │   │   ├── memories/
│   │   │   └── .htaccess     (deny PHP, restrict to images)
│   │   └── README.md         (note: pending uploads live OUTSIDE web root at /home/[username]/uploads-pending/)
│   └── schema.sql
├── config/
│   └── site-config.json
├── netlify.toml              (Netlify build config — for Session 8)
├── .gitignore
├── .env.example              (template, no secrets)
├── README.md
└── DATA-PERSISTENCE.md
```

**6b. List of files to be created in 1B** with brief description of each.

**6c. List of files to be COPIED (not symlinked) from canonical paths** with source and destination paths:
- 10 Harry poses → `frontend/assets/mascot/`
- 5 Leonardo backgrounds → `frontend/assets/backgrounds/`

**6d. Proposed `site-config.json` content** matching the brief schema exactly (all status flag defaults from brief).

**6e. Proposed `.gitignore` content.** MUST include:
```
# Environment files (never commit secrets)
.env
.env.*
!.env.example

# Local PHP config
*-config.local.php
mbsh-config.php

# Dependencies
node_modules/
vendor/

# Build artifacts
dist/
build/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp

# Upload directories (contents not committed)
backend/uploads/approved/sponsors/*
backend/uploads/approved/memories/*
!backend/uploads/approved/sponsors/.gitkeep
!backend/uploads/approved/memories/.gitkeep

# Temporary files
*.tmp
*.bak
```

**6f. Proposed `netlify.toml` content** (build config pointing to `frontend/` as publish directory; note that Netlify connection is deferred to Session 8 — file exists for future use):

```toml
[build]
  publish = "frontend/"
  
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

**6g. Proposed `.htaccess` content** for `backend/uploads/approved/` (will be deployed alongside backend):

```apache
# Disable PHP execution in upload directories
<FilesMatch "\.(php|phtml|php3|php4|php5|phar|cgi|pl)$">
  Require all denied
</FilesMatch>

# Disable directory listing
Options -Indexes

# Disable script execution
Options -ExecCGI

# Add nosniff header for image MIME types
<FilesMatch "\.(jpe?g|png|webp)$">
  Header set X-Content-Type-Options "nosniff"
</FilesMatch>

# Deny non-image extensions
<FilesMatch "\.(?!jpe?g|png|webp)$">
  Require all denied
</FilesMatch>
```

**Note on `.htaccess` placement:**

The `.htaccess` rules above belong in `public_html/uploads/approved/` where files ARE web-accessible. There the rules provide real protection.

For pending uploads at `/home/[godaddy-username]/uploads-pending/` (OUTSIDE web root), `.htaccess` is symbolic — Apache doesn't serve files from outside the document root regardless of `.htaccess` rules. The real protection for pending uploads is two-fold:
1. Files live outside web root (no URL maps to them)
2. Admin streaming endpoint at `/admin/serve-pending-upload.php` requires session auth before reading the file from disk and streaming it to the browser

A `.htaccess` file in `uploads-pending/` is optional defense-in-depth in case directory layout changes (e.g., if someone later symlinks the dir into web root by mistake), but it should not be relied upon as the primary control.

**6h. Proposed `README.md` outline** (sections, not full content yet):
- Title and status
- Architecture diagram (text-based)
- Frontend deploy instructions (Session 8+)
- Backend deploy instructions
- Local dev setup
- Link to brief
- Asset path manifest
- Session log

**6i. Proposed `DATA-PERSISTENCE.md` outline** explaining hybrid architecture:
- Architecture rationale
- MySQL table relationships (all 10 tables)
- Form submission flow
- Cron job for time capsule sends + rate limit cleanup
- Production secrets strategy (PHP config outside web root)
- Backend security rules summary (CORS + patterns, file uploads outside web root, admin auth via session cookie + CSRF, rate limiting via MySQL)
- Pending vs approved upload paths
- Admin audit log purpose

**6j. Schema preview** — note that `schema.sql` will be generated in 1B with full table definitions per brief, with utf8mb4 charset throughout. Confirm 10 tables: rsvps, sponsors_pending, sponsors_approved, memories, in_memory, time_capsules, chatbot_questions, rate_limits, admin_login_attempts, admin_audit_log.

**6k. Proposed initial commit message for 1B's commit:**
```
Initial scaffolding: hybrid Netlify+GoDaddy architecture, asset copies, database schema
```

**6l. Proposed branching strategy (NON-DESTRUCTIVE):**

- Step A: From the inspection clone at `/tmp/mbsh-inspect`, create branch `archive/v0-placeholder` from current main HEAD (preserves placeholder code in branch form)
- Step B: Push archive branch to origin: `git push origin archive/v0-placeholder`
- Step C: STOP and confirm with Fritz that archive branch is visible on GitHub before proceeding
- Step D: Clone the repo to the real target `~/famtastic-sites/mbsh-reunion/`
- Step E: On main branch in target clone, REPLACE working tree contents with new scaffold via NORMAL commit (not force push, not history rewrite). Use `git rm -rf .` to stage deletion of existing files (if any tracked), then add scaffold files, then commit. **`git rm -rf .` only runs after Steps B-D are complete: archive branch is pushed AND visibility is confirmed by Fritz on GitHub web UI AND Fritz has explicitly approved the scaffold-replacement strategy.** If any of those checks fail, STOP — do not run `git rm`. The archive branch already preserves the prior state on origin, so this operation is recoverable, but explicit approval prevents any accident.
- Step F: Show Fritz the diff before push
- Step G: Push to origin/main ONLY after Fritz approves diff (no force push)

**6m. Explicit notation:** Netlify is NOT connected to this repo in Session 1. Pushing to main does NOT deploy anywhere. Netlify connection deferred to Session 8.

**7. Report Session 1A completion:**

- All checks completed
- All assets verified or missing-list provided
- Repo state confirmed (HEAD commit hash captured)
- Scaffold proposal written and reviewable
- No credentials captured
- No databases modified
- No remote pushes occurred
- No directories created under `~/famtastic-sites/mbsh-reunion/`
- `/tmp/mbsh-inspect` clone exists for inspection reference (will be cleaned up in 1B or by system)

### DO NOT in Session 1A:
- Capture any credentials (Resend, MySQL, anything)
- Apply any database schema
- Create any directories under `~/famtastic-sites/mbsh-reunion/`
- Modify the cloned inspection repo
- Push to any remote
- Delete or move existing placeholder code in repo
- Make any paid API calls
- Generate the FAMtastic 30+100 commissioned mark (Session 2 work)

### STOP after Session 1A completes. Show Fritz:
- Path to saved brief
- Path to scaffold proposal
- Asset inventory results
- Repo inspection results
- Any blockers or anomalies

### Await Fritz approval of the scaffold proposal before starting Session 1B.

---

# PART 3: SESSION 1B EXECUTION PROMPT

## Session 1B — Destructive / External Operations

**DO NOT BEGIN until Fritz has explicitly reviewed and approved the SESSION-1A-SCAFFOLD-PROPOSAL.md file.**

### Steps (in order):

**1. Capture credentials interactively** (Fritz pastes; never log or echo values):

**1a. Prompt for Resend API key:**
```bash
read -s RESEND_API_KEY
```
Save to `~/famtastic/site-studio/.env` as `RESEND_API_KEY=<value>` (append if file exists, replace existing line if RESEND_API_KEY already defined).

Verify with probe:
```bash
curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $RESEND_API_KEY" https://api.resend.com/domains
```

Expected: 200 status. Do not display response body. Confirm only auth success.

If 401/403: STOP. Key is invalid. Do not proceed.

**1b. Prompt for GoDaddy MySQL credentials separately:**
```bash
read -s DB_HOST    # typically `localhost` for cPanel hosts; verify with Fritz
read -s DB_NAME
read -s DB_USER
read -s DB_PASSWORD
```

Save all four to `~/famtastic/site-studio/.env`. Do not display values.

**1c. Verify gitignore in BOTH locations excludes `.env`, `.env.*`, and PHP config files:**
- `~/famtastic/.gitignore` (hub repo)
- `~/famtastic-sites/mbsh-reunion/.gitignore` (target repo, will be created in step 4)

If any `.env` file is currently tracked or not gitignored: STOP loudly and fix before any further work.

**2. Test MySQL connectivity (best effort, NON-BLOCKING):**

Attempt:
```bash
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT VERSION(), @@global.time_zone, @@session.time_zone, @@sql_mode;" "$DB_NAME"
```

If success: capture and report:
- MySQL version
- Server timezone (global and session)
- sql_mode (verify it permits `ON UPDATE CURRENT_TIMESTAMP`)

If failure (likely remote MySQL blocked by GoDaddy):
- Mark connectivity as "remote blocked, verification deferred to cPanel phpMyAdmin"
- Do NOT block on this — it's a diagnostic failure, not a blocking failure
- Schema apply will happen via Fritz pasting `schema.sql` into phpMyAdmin manually (instructions in DATA-PERSISTENCE.md)

**3. Execute the branching strategy approved in 1A:**

**3a.** From `/tmp/mbsh-inspect`, create archive branch:
```bash
cd /tmp/mbsh-inspect
git checkout -b archive/v0-placeholder
git push origin archive/v0-placeholder
```

**3b.** STOP and confirm with Fritz that the archive branch is visible at `github.com/famtastic-fritz/mbsh-reunion/tree/archive/v0-placeholder` before proceeding.

**3c.** After Fritz confirms archive: clone to real target:
```bash
git clone https://github.com/famtastic-fritz/mbsh-reunion ~/famtastic-sites/mbsh-reunion
cd ~/famtastic-sites/mbsh-reunion
git checkout main
```

**3d.** Stage removal of existing files via normal commit (NOT force push, NOT history rewrite).

**Pre-condition checks before running `git rm`:**
- Step 3a archive branch creation succeeded
- Step 3b push to origin succeeded
- Step 3c — Fritz has confirmed via GitHub web UI that `archive/v0-placeholder` branch is visible at `github.com/famtastic-fritz/mbsh-reunion/tree/archive/v0-placeholder`
- Fritz has explicitly approved (in writing in chat) the scaffold-replacement strategy

If any check fails: STOP. Do not proceed.

```bash
# Only if there are tracked files AND all pre-conditions above pass
git rm -rf .
```
Note: archive branch already preserves prior state on origin. Operation is recoverable but explicit approval gate prevents accidents.

**4. Create the scaffold directory tree** at `~/famtastic-sites/mbsh-reunion/` matching the approved Session 1A proposal exactly:

- All directories created
- `.gitkeep` files in any directory that must persist in git as empty
- Empty file scaffolds for HTML/CSS/JS files (just placeholder comments noting "Section 1 - Hero" etc., no functional code)
- All PHP backend files created with just a `<?php` opener, a comment stub, and a require for the relevant lib files
- `.htaccess` files in upload directories with hardening rules from brief

**5. Copy assets (NOT symlink — copies for deploy safety):**

- All 10 Harry poses from canonical path → `frontend/assets/mascot/`
- All 5 Leonardo loops from canonical path → `frontend/assets/backgrounds/`
- `.gitkeep` in any empty directory

Verify copies via md5 sum match against canonical. Report any mismatches.

**6. Generate `schema.sql`** with all 10 MySQL tables defined per brief, with utf8mb4 charset throughout. Write to `backend/schema.sql`.

Apply schema:
- If MySQL CLI worked in step 2: apply via CLI
- If MySQL CLI was blocked: print clear instructions for Fritz to apply manually via cPanel phpMyAdmin, and mark schema apply as "manual pending" — do not block 1B completion

After apply (or pending), verify by attempting:
```sql
SHOW TABLES;
```

Expected: 10 tables (`rsvps`, `sponsors_pending`, `sponsors_approved`, `memories`, `in_memory`, `time_capsules`, `chatbot_questions`, `rate_limits`, `admin_login_attempts`, `admin_audit_log`).

If verification can't complete due to remote blocking, document and proceed.

**7. Create `site-config.json`** matching brief schema exactly. Use status flag defaults from brief.

**8. Generate `netlify.toml`, `.gitignore`, `.env.example`, `README.md`, `DATA-PERSISTENCE.md`** per the approved 1A proposal. Fill in actual content (not just outlines).

`.gitignore` must include the pattern from 1A proposal section (6e), covering `.env`, `.env.*`, `*-config.local.php`, `mbsh-config.php`, `node_modules`, build artifacts, OS files, IDE files, upload contents.

`.env.example` template (no secrets, just keys for documentation):
```
# Local development environment template
# Copy to .env and fill in actual values
RESEND_API_KEY=
DB_HOST=
DB_NAME=
DB_USER=
DB_PASSWORD=
```

`DATA-PERSISTENCE.md` must include:
- Architecture diagram (text-based)
- MySQL connectivity test results from step 2
- Schema apply method (CLI or manual phpMyAdmin)
- Production secrets strategy (PHP config outside web root at `/home/[godaddy-username]/.config/mbsh-config.php`)
- Pending vs approved upload paths (pending OUTSIDE web root)
- Admin auth via session cookie + CSRF tokens (NOT URL parameters)
- Rate limiting via MySQL `rate_limits` and `admin_login_attempts` tables
- Cron jobs: `send-capsules.php` (daily 7am UTC), `cleanup-rate-limits.php` (daily)
- Backend security rules summary

**9. Show Fritz the diff:**
```bash
git status
git diff --stat
```

Plus high-level summary of what was created. Do NOT auto-commit yet. STOP and await explicit Fritz approval of the diff.

**10. After Fritz approves the diff:**

- Stage all scaffold files: `git add -A`
- Commit with message: `Initial scaffolding: hybrid Netlify+GoDaddy architecture, asset copies, database schema`
- Push to origin/main: `git push origin main` (NORMAL push, NOT force push — archive branch already preserves prior state)
- Report commit hash

**11. Final report:**

- Brief saved at correct path
- Scaffold created at `~/famtastic-sites/mbsh-reunion/`
- Asset copies verified (md5 match)
- MySQL schema applied (CLI or manual pending)
- Database tables verified present (or pending manual)
- Resend auth verified
- `.env` gitignored in both locations
- Production secrets path documented (not yet created on GoDaddy — that's deferred to first backend deploy session)
- Archive branch pushed to origin
- Main branch initial scaffold commit pushed
- Netlify NOT connected (correct, deferred to Session 8)
- Any anomalies or deferred items flagged

### DO NOT in Session 1B:
- Begin section composition (Sessions 2+)
- Generate FAMtastic commissioned mark (Session 2)
- Make image/video API calls
- Configure DNS (Sessions 8-9)
- Connect Netlify to repo (Session 8)
- Create GoDaddy production secrets file (deferred to first backend deploy session)
- Force push to any branch under any circumstance

### STOP after Session 1B completes. Await Fritz approval before starting Session 2.

---

# PART 4: SESSION ROADMAP (REFERENCE ONLY — NOT THIS WORK)

- **Session 2:** Hero composition + commissioned mark generation. Stop after hero plays correctly on local preview.
- **Session 3:** Story + RSVP (frontend + backend wired). Stop after RSVP submits to MySQL successfully.
- **Session 4:** Tickets + Sponsors. Stop after sponsor inquiry flow works end-to-end.
- **Session 5:** Through the Years + Who's Coming. Stop after attendees grid renders real RSVP data.
- **Session 6:** In Memory + Time Capsule + Playlist. Stop after capsule cron job verifies.
- **Session 7:** Hi-Tide Harry chatbot Phase 1. Stop after all 8 FAQs answer correctly.
- **Session 8:** Footer + Admin pages + polish + Netlify staging deploy. Stop after staging URL is reviewable.
- **Session 9:** Launch prep, DNS cutover, production launch.

---

# CRITICAL DISCIPLINE (APPLIES ACROSS ALL SESSIONS)

- Brief is canonical. If implementation conflicts with brief, brief wins until Fritz changes brief.
- One scope per session. Do not exceed.
- Do not start Session N+1 without Fritz approval of Session N.
- All commits human-style. No AI references, Claude references, or automated-tool language.
- If anything is unclear, STOP and ask.
- Diagnostic test failures (like remote MySQL blocked) are not the same as blocking failures. Document diagnostically and proceed with workaround unless the brief explicitly says otherwise.
- Credentials never logged, echoed in console output, or committed to git. Local development credentials may be stored in approved gitignored `.env` files (`~/famtastic/site-studio/.env` and `~/famtastic-sites/mbsh-reunion/.env`). Production secrets path on GoDaddy (`/home/[godaddy-username]/.config/mbsh-config.php`) is documented but not populated in this session — that file is created on the GoDaddy server during the first backend deploy session.
- NO force pushes under any circumstance.

---

**End of execution artifact.**