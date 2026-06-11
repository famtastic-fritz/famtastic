---
title: FAMtastic-Hosting-Session-2026-06-11
type: session-note
session_id: 409ac7b5-e998-455e-a310-cfa5caf9b39d
model: claude-sonnet-4-6
timestamp: 2026-06-11T00:00:00Z
project: famtastic-hosting
repo: ~/famtastic/famtastic-sites/famtastic-hosting
permalink: famtastic/02-income/famtastic-hosting-session-2026-06-11
---

# FAMtastic Hosting — QC, Infrastructure Fixes, Auth Hardening (2026-06-11)

**Session ID:** `409ac7b5-e998-455e-a310-cfa5caf9b39d`
**Model:** claude-sonnet-4-6
**Timestamp:** 2026-06-11 (continued from 2026-06-10 context overflow)
**Repo:** `~/famtastic/famtastic-sites/famtastic-hosting`
**Live site:** https://famtastichosting.com

---

## Context Coming In

This session continued directly from the previous one (`2026-06-10`) which ran out of context window. The prior session had built:
- PayPal sandbox checkout flow (create-order → capture → confirmation)
- Security hardening (TOCTOU via checkout_snapshots, fail-open via orphan_payments, URL injection via validation)
- Admin fulfillment queue at `/admin/orders`

Fritz stopped the prior session and ran a QC request before "Add to Cart" buttons were added. His exact concern:

> "buttons on pages open a message window that doesn't make sense. Talk to a Human opens a chat window. GoDaddy number should only be visible in a help section for logged-in users. Dashboard and admin login shows the side panels links before login — clicking throws errors. I need quality control, end-to-end test."

---

## Original Issues (QC Findings, Verified)

| Issue | Status Coming In |
|-------|-----------------|
| `POST /api/cart/add` → 500 | BLOCKING — MYSQL_HOST missing from Node process |
| `/checkout` → 404 | BLOCKING — rsync overwrote .htaccess, lost checkout route |
| `/admin` bare → 500 | rsync/proxy issue |
| Sidebar visible on login/register pages | Major UX — full sidebar chrome before login |
| GoDaddy phone (480) 624-2500 everywhere | Public footer, schema.org JSON-LD, login pages |
| "Talk to a Human" → mailto: | Should go to /contact, not open email client |
| `store.famtastichosting.com` links | GoDaddy storefront was taken down — all Buy buttons 404'd |
| RegisterForm validation always failing | `confirmPassword` not sent in API body |

---

## Root Cause Deep Dive

### Root Cause 1 — Server .env Was Critically Incomplete

The single biggest root cause: the server `.env` at `/home/nineoo/public_html/famtastichosting.com/site/.env` only had **3 variables** (PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_ENV). It was missing:
- All `MYSQL_*` vars (host, port, database, user, password)
- All `GODADDY_*` vars
- `SESSION_SECRET`
- All `SMTP_*` and `RESEND_*` vars

**Why:** The previous session only added PayPal credentials (Fritz provided them in chat). The MYSQL/GODADDY vars were never actually written to the server `.env` — they were believed to be there based on prior planning but never verified.

**Why `source .env` couldn't catch it:** Even after PayPal vars were added, the startup command was `source .env` which would have broken on `MYSQL_DATABASE=FAMtastic Hosting` (space in value → bash treats `Hosting` as a command). But since MYSQL vars were never there, the break was complete: Node started with zero DB credentials.

**Fix:** Used `scp` to copy the full local `.env` (which had all vars) to the server. Then restarted Node with `--env-file` flag (Node 20 native, handles spaces in values correctly):
```bash
node --env-file=/home/nineoo/.../.env dist/server/entry.mjs
```

**Key learning:** Always verify the server .env is complete by checking variable names: `ssh host "grep -o '^[A-Z_]*' .env"`. NEVER assume env vars are there.

### Root Cause 2 — rsync Overwrites .htaccess on Every Deploy

`rsync -az dist/client/ docroot/` copies the Astro-generated `dist/client/.htaccess` to the Apache docroot, overwriting any manually-edited server .htaccess. Checkout and order-confirmation routes added manually on the server were lost every deploy.

**Fix:** Moved the canonical `.htaccess` into `public/` (Astro copies it to `dist/client/` at build time). Now the routes are code — they deploy automatically and never get overwritten.

### Root Cause 3 — RegisterForm Missing `confirmPassword` in API Body

`RegisterForm.svelte` line 58 sent `{ email, password }` to `POST /api/auth/register`. The backend (register.ts line 38) requires `{ email, password, confirmPassword }` — returns "Missing required fields" when confirmPassword is absent. The frontend validated locally but never sent the field. Every submission failed server-side.

**Fix:** Added `confirmPassword` to the JSON body.

### Root Cause 4 — Login/Register Pages Used DashboardLayout

`dashboard/login.astro`, `admin/login.astro`, and `dashboard/register.astro` all imported `DashboardLayout`, which renders `PageShell.svelte` — the full sidebar + topbar chrome. Pre-login users saw the full nav, and clicking sidebar links threw 500 errors (protected routes need auth).

**Fix:** Created `AuthLayout.astro` — minimal wrapper (doctype, head, CSS imports, no PageShell). All three auth pages switched to it.

---

## All Fixes Made This Session

### Infrastructure

**`public/.htaccess`** — Added checkout and order-confirmation proxy routes:
```apache
RewriteRule ^checkout$ proxy.php [L,QSA]
RewriteRule ^order-confirmation$ proxy.php [L,QSA]
```

**Server .env** — Uploaded full env via scp. All 19 variables now present on server.

**Node startup** — Restarted via `/bin/sh /tmp/restart-node.sh` using `--env-file` flag. Shell script approach bypasses bash profile `tput` issues that cause SSH heredocs to exit 255.

**entry.mjs patches** — 4 required after every `npm run build`:
```bash
# 1. Fix client path (build machine → server)
sed -i '' 's|"client": "file:///Users/famtasticfritz...|"client": "file:///home/nineoo/...|'
# 2. Fix server path
sed -i '' 's|"server": "file:///Users/famtasticfritz...|"server": "file:///home/nineoo/...|'
# 3. Force IPv4 (Node defaults to ::1, proxy uses 127.0.0.1)
sed -i '' 's|"host": false|"host": "127.0.0.1"|'
# 4. Set port 3001
sed -i '' 's|"port": 4321|"port": 3001|'
```

### UX / Auth Pages

**`src/layouts/AuthLayout.astro`** — NEW FILE. Minimal layout: HTML boilerplate + CSS imports, no PageShell, no sidebar.

**`src/pages/dashboard/login.astro`** — Switched to AuthLayout. Removed GoDaddy phone, replaced with `/contact` link.

**`src/pages/dashboard/register.astro`** — Switched to AuthLayout. Removed GoDaddy phone in two places. (Sidebar bug + phone were both present.)

**`src/pages/admin/login.astro`** — Switched to AuthLayout. Removed GoDaddy phone.

**`src/components/auth/RegisterForm.svelte`** — Fixed: added `confirmPassword` to POST body (line 58).

### GoDaddy Phone Removal from Public Areas

Phone `(480) 624-2500` removed from all public-facing surfaces:
- `src/components/Footer.astro` — both instances replaced with `/contact` link
- `src/layouts/WildLayout.astro` — removed from schema.org JSON-LD (Google-indexed! replaced with `email:`)
- `src/layouts/ExtremeLayout.astro` — removed from footer text
- All three auth pages — replaced with `/contact` links

**ContactPhone.svelte** (dashboard topbar/sidebar) intentionally NOT touched — phone is OK for authenticated users in the dashboard.

### "Talk to a Human" Standardized

All CTAs now go to `/contact`:
- `src/layouts/ExtremeLayout.astro` (was `mailto:hello@famtastichosting.com`)
- `src/pages/wordpress.astro` — both instances (was `mailto:`)
- Nav was already correct (`/contact`)

### Dead store.famtastichosting.com Links Fixed

`src/data/storefront-urls.json` — All product URLs updated from dead GoDaddy storefront to local pages:
- WordPress products → `/wordpress`
- Hosting products → `/hosting`
- Builder products → `/builder`
- Server products → `/servers`
- Domain products → `/domains`
- Email/SSL/Security → `/contact`
- Bundles → `/bundles`

`src/lib/storefront.ts` — `BASE_STOREFRONT` fallback changed from `https://store.famtastichosting.com` to `/contact`. `buildCheckoutURL` simplified (GoDaddy ISC promo param no longer relevant).

### Admin Account

Admin user (ID 3, `admin@famtastichosting.com`) already existed in DB from the 2026-06-10 session. Password reset to: **`FamAdmin2026!`** (bcrypt hash `$2a$10$PuT.ER96...`).

Used disposable PHP seed scripts (scp → curl → self-delete pattern) to avoid exposing credentials in SSH commands.

---

## Deployment Pattern (Documented for Shay)

Every deploy to production follows this exact sequence:

```bash
# 1. Build
npm run build

# 2. Patch entry.mjs (4 patches, required every time)
sed -i '' 's|"client": "file:///Users/famtasticfritz[^"]*dist/client/"|"client": "file:///home/nineoo/public_html/famtastichosting.com/site/dist/client/"|' dist/server/entry.mjs
sed -i '' 's|"server": "file:///Users/famtasticfritz[^"]*dist/server/"|"server": "file:///home/nineoo/public_html/famtastichosting.com/site/dist/server/"|' dist/server/entry.mjs
sed -i '' 's|"host": false|"host": "127.0.0.1"|' dist/server/entry.mjs
sed -i '' 's|"port": 4321|"port": 3001|' dist/server/entry.mjs

# 3. Rsync client (static files + .htaccess)
rsync -az dist/client/ nineoo@p3plzcpnl506112.prod.phx3.secureserver.net:/home/nineoo/public_html/famtastichosting.com/ -e "ssh -i ~/.ssh/id_ed25519"

# 4. Rsync server bundle
rsync -az dist/server/ nineoo@p3plzcpnl506112.prod.phx3.secureserver.net:/home/nineoo/public_html/famtastichosting.com/site/dist/server/ -e "ssh -i ~/.ssh/id_ed25519"

# 5. Restart Node (use /bin/sh script — direct SSH commands exit 255 due to tput in server bash profile)
scp -i ~/.ssh/id_ed25519 /tmp/restart-node.sh nineoo@...:/tmp/restart-node.sh
ssh -i ~/.ssh/id_ed25519 nineoo@... "/bin/sh /tmp/restart-node.sh" 2>/dev/null
```

**restart-node.sh content:**
```sh
#!/bin/sh
pkill -f "node.*entry.mjs" 2>/dev/null
sleep 2
NODE=/home/nineoo/.nvm/versions/node/v20.20.2/bin/node
ENTRY=/home/nineoo/public_html/famtastichosting.com/site/dist/server/entry.mjs
ENV=/home/nineoo/public_html/famtastichosting.com/site/.env
nohup $NODE --env-file=$ENV $ENTRY >> /tmp/fam-node.log 2>&1 &
sleep 3
tail -5 /tmp/fam-node.log
```

---

## SSH Gotchas on This cPanel Host

- **`tput: No value for $TERM`** — server bash profile runs `tput` which fails without a terminal. This causes multi-command SSH strings to return exit code 255. Workaround: use `/bin/sh script.sh` instead of `bash -c "..."` or heredocs.
- **`pkill` over SSH returns 255** — not because it fails, but because the tput error in the bash profile propagates. Same `/bin/sh` workaround applies.
- **scp and rsync work fine** — they don't invoke the bash profile.
- **Simple one-liners work** — `ssh host "echo hello"` works. Complex multi-part commands reliably fail.

---

## Server Architecture (Verified Current State)

| Component | Location | Notes |
|-----------|----------|-------|
| Apache docroot | `/home/nineoo/public_html/famtastichosting.com/` | Static files + .htaccess |
| Node app root | `/home/nineoo/public_html/famtastichosting.com/site/` | .env, dist/ |
| Node listens | `127.0.0.1:3001` | IPv4 forced via entry.mjs patch |
| Proxy | `proxy.php` in docroot | `follow_location=0` required |
| .htaccess | Routes api/dashboard/admin/checkout/order-confirmation → proxy.php | Lives in `public/` source |
| Node log | `/tmp/fam-node.log` | Not persistent across reboots |
| MySQL | `FAMtastic Hosting` database (with space in name) | User: ShayShayDbAdmin |
| Node start | `--env-file` flag | Handles `FAMtastic Hosting` space in MYSQL_DATABASE |

---

## Database State (as of this session)

**Tables confirmed:**
- `users` — 6+ users, including admin (ID 3, admin@famtastichosting.com)
- `products` — seeded (seed.sql), 15+ products across wordpress/hosting/builder/servers/domains/email/ssl
- `orders` — order tracking
- `sessions` — session tokens
- `cart_items` — shopping cart
- `checkout_snapshots` — TOCTOU prevention (created migration 002)
- `orphan_payments` — fail-safe capture logging (created migration 002)

**Admin credentials:** `admin@famtastichosting.com` / `FamAdmin2026!`
**Customer:** Register at `/dashboard/register`

---

## Verification Matrix (End of Session)

| Endpoint | HTTP | Notes |
|----------|------|-------|
| `POST /api/cart/add` | 200 | Returns real product from DB |
| `GET /api/cart` | 200 | Returns items with prices |
| `/checkout` | 200 | Routes through proxy to Node |
| `/order-confirmation` | 200 | Routes correctly |
| `/dashboard/login` | 200 | AuthLayout — no sidebar |
| `/dashboard/register` | 200 | AuthLayout — no sidebar |
| `/admin/login` | 200 | AuthLayout — no sidebar |
| `POST /api/auth/admin/login` | 200 | Returns `{"ok":true,"role":"admin"}` |
| `POST /api/auth/register` | 201 | Creates user, issues session |
| All product page CTAs | — | Now point to local pages, not dead store |

---

## What Is NOT Yet Tested (Browser Required)

- Full PayPal sandbox checkout: button render → approve in popup → `/order-confirmation`
- Visual appearance of auth pages (verified HTML class, not render)
- Customer dashboard after login (subscriptions display)
- Admin dashboard visuals (order queue, fulfillment)

---

## Known Issues at Session End

1. **Node restart not persistent** — If the cPanel server reboots, Node won't auto-restart. Need a cPanel cron job or a startup mechanism. Currently manual restart only.
2. **No "Add to Cart" buttons on product pages** — Product CTAs currently link to the relevant product page. Cart infrastructure is working, but the UX entry point (Add to Cart button on product pages) is the next build item.
3. **`/api/admin/orders` returns 500** — Suspected proxy.php issue with auth redirects. Not debugged this session.
4. **GoDaddy shopper creation fails non-fatally** — When a customer registers, `createShopper()` fires and fails (GoDaddy API returns "Not Found"). This is non-blocking (user registers successfully) but the GoDaddy shopper link is never made. Expected until the reseller account is fully wired.

---

## Next Build Item

**"Add to Cart" buttons on product pages** — Fritz explicitly requested this as the next step after QC. Each product page (hosting.astro, wordpress.astro, builder.astro, domains.astro, servers.astro, bundles.astro) needs:
- A button that calls `POST /api/cart/add` with the correct `productId`
- Cart badge update in the nav
- Redirect to `/checkout` after add

Product IDs from the `products` table:
- Managed WP Basic: ID 1
- Managed WP Ultimate: ID 2
- cPanel Starter: ID 3
- cPanel Ultimate: ID 4
- Website Builder Essential: ID 5
- Website Builder Commerce: ID 6
- Web Hosting Plus Launch: ID 7
- Web Hosting Plus Expand: ID 8
- .com Domain: ID 9, .net: ID 10, .org: ID 11, .co: ID 12
- Email Pro: ID 13, Group Email: ID 14, M365: ID 15
- SSL Standard: ID 16
- Security Standard: ID 17, Premium: ID 18

---

## Key Files Changed This Session

```
src/layouts/AuthLayout.astro          ← NEW — minimal auth-only layout
src/layouts/WildLayout.astro          ← removed telephone from schema.org
src/layouts/ExtremeLayout.astro       ← fixed Talk to a Human, removed phone
src/pages/dashboard/login.astro       ← AuthLayout, removed phone
src/pages/dashboard/register.astro    ← AuthLayout, removed phone (x2)
src/pages/admin/login.astro           ← AuthLayout, removed phone
src/pages/wordpress.astro             ← Talk to a Human → /contact (x2)
src/components/Footer.astro           ← removed phone (x2), replaced with /contact
src/components/auth/RegisterForm.svelte ← confirmPassword added to POST body
src/data/storefront-urls.json         ← all store.famtastichosting.com → local pages
src/lib/storefront.ts                 ← BASE_STOREFRONT fallback → /contact
public/.htaccess                      ← added checkout + order-confirmation routes
```
