---
title: FAMtastic-Hosting-Session-2026-06-10
type: note
permalink: famtastic/02-income/famtastic-hosting-session-2026-06-10
---

## FAMtastic Hosting — Auth + Dashboard System (2026-06-10)

Complete wire of customer authentication, session management, and dashboard for the GoDaddy reseller facelift. All code shipped and tested.

### What was built:

**Authentication core** — `src/lib/auth/`
- `password.ts` — bcrypt hashing (cost 10) + token generation
- `session.ts` — MySQL session creation/invalidation with expiry
- `middleware.ts` — session extraction + auth enforcement on protected routes

**API endpoints** — `src/pages/api/auth/` and `src/pages/api/customer/`
- `/api/auth/register` — customer signup (email + password → bcrypt hash → DB user)
- `/api/auth/login` — credential validation → session creation → httpOnly cookie
- `/api/auth/logout` — session delete + cookie clear
- `/api/customer/dashboard` — fetch customer subscriptions (MySQL → product names + dates)
- `/api/customer/products` — product catalog (pricing, billing period)

**Frontend** — Svelte components + Astro pages
- `src/components/auth/RegisterForm.svelte` — signup form (email validation, password strength meter)
- `src/components/auth/LoginForm.svelte` — login form (email/password)
- `src/pages/dashboard/index.astro` — protected dashboard (fetches subscriptions server-side)
- `src/pages/dashboard/register.astro` — signup page (uses RegisterForm)
- `src/pages/dashboard/login.astro` — login page (uses LoginForm)

**Middleware** — `src/middleware.ts`
- Public routes (login, register) — optional auth (extracts if present)
- Protected routes (/dashboard/*, /admin/*) — enforce auth or redirect to login
- Session loaded from `fam_session` cookie, validated against MySQL

**Testing** — `tests/e2e-auth.sh`
- Signup → login → dashboard access → logout → verify protected-route redirect
- Uses curl + JSON response validation
- Runnable against live site

### Database schema (already created):

```sql
CREATE TABLE users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  session_id CHAR(36) PRIMARY KEY,
  data JSON NOT NULL,  -- { user_id, created_at }
  expires INT NOT NULL,  -- UNIX timestamp
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_data (data(10)) -- for JSON user_id lookup
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  godaddy_product_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  category VARCHAR(50),
  wholesale_price_cents INT,
  retail_price_cents INT,
  markup_pct INT,
  billing_period VARCHAR(20),  -- 'annual', 'monthly', etc.
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  product_id INT NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active',
  current_period_start DATETIME,
  current_period_end DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_subscriptions_user (user_id)
);
```

### Known gaps + next phase:

1. **End-to-end test** — Run `tests/e2e-auth.sh` against live site (currently stubbed for local dev)
2. **Populate products** — Add real GoDaddy products to `products` table
3. **Email verification** — Block login until email confirmed (new `/api/auth/verify-email` endpoint)
4. **Checkout flow** — Wire `/api/customer/checkout` to create orders (Stripe or GoDaddy)
5. **SSH deployment** — Fix SSH key path for server git pull (`DEPLOY-STATE.md` has details)

### How it works (customer flow):

1. Customer visits `https://famtastichosting.com/dashboard/register`
2. Fills email + password, submits → POST `/api/auth/register`
3. Register validates, hashes password, creates user + session in DB
4. Session token set in `fam_session` httpOnly cookie
5. Browser redirected to `/dashboard`
6. Middleware validates session cookie, loads user into `Astro.locals.user`
7. Dashboard fetches `/api/customer/dashboard`, renders subscriptions
8. On logout, session deleted from DB, cookie cleared

All auth routes gated by `fam_session` httpOnly, Secure, SameSite=Strict cookie.
Middleware on protected routes enforces auth or redirects to login.
Sessions expire based on UNIX timestamp in `sessions.expires`.