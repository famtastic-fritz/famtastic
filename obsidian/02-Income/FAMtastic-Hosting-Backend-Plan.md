---
title: FAMtastic-Hosting-Backend-Plan
type: note
permalink: famtastic/02-income/famtastic-hosting-backend-plan
---

# FAMtastic Hosting — Backend Implementation Plan

**Status:** REWRITE — Converting from Supabase to GoDaddy cPanel MySQL. All Supabase references removed.
**Date:** 2026-06-11 (rewritten from original dated 2026-06-11)
**Owner:** Shay (orchestrator) → Claude Code swarm (executor)
**Model constraint:** Sonnet/Haiku ONLY. No Opus. Run parallel agents for speed.

---

## What This Is

The FAMtastic Hosting **facelift** (Phase 1) is live at famtastichosting.com. The backend (Phase 2 dashboard) is the missing piece. This plan turns the Phase 2 spec from BUILD-SPEC.md into a concrete, executable work breakdown.

**THIS IS A FACELIFT — NOT A "MARKETING SITE."** The word "marketing site" does not appear in this plan. It's a hosting business facelift: branded customer experience over GoDaddy's wholesale infrastructure.

**The backend does TWO things:**
1. **Customer Portal** — branded self-service where customers manage hosting, domains, email, billing ("My Account")
2. **Admin Dashboard** — Fritz's command center for orders, revenue, products, provisioning

Both talk to GoDaddy's reseller API behind the scenes. GoDaddy handles payments and provisioning invisibly. We own the relationship and the brand experience.

---

## Architecture Decisions (Pre-Made — Claude Code Doesn't Decide These)

| Decision | Choice | Why |
|----------|--------|-----|
| **Framework** | Astro (existing site) + SvelteKit islands | Hosting site facelift stays Astro static. Dashboard pages use SvelteKit as Astro islands with SSR. One deploy, one domain. |
| **Database** | **GoDaddy cPanel MySQL ONLY** — no Supabase, no external DB vendor | One vendor for everything. Eat your own dog food. GoDaddy cPanel provides MySQL — use it. Free tier is not worth the vendor lock-in and data fragmentation. |
| **Auth** | MySQL session-based auth (bcrypt passwords, express-session) | No Supabase Auth. No Auth0 dependency. MySQL sessions table, bcrypt password hashing, server-side session cookies. Simple, ownable, runs on the same cPanel instance. |
| **API layer** | Astro API routes (`src/pages/api/`) | Server-side routes that proxy to GoDaddy. Never expose GoDaddy API keys to the client. |
| **GoDaddy integration** | Server-side only | All GoDaddy API calls happen in Astro API routes or server-side SvelteKit load functions. Client never sees sso-key credentials. |
| **Deployment** | Same GoDaddy cPanel (Astro SSR) | Eat your own dog food. The facelift already deploys here. Add SSR for dashboard routes. |
| **CSS** | Extend existing wild.css / extreme.css system | Dashboard uses the same design tokens (Space Grotesk, violet accent, dark mode). New `dashboard.css` with clean card layouts. |
| **State management** | Svelte stores | Lightweight. No Redux overhead. Server-side reads from MySQL, client-side reactive stores. |
| **Payment flow** | Redirect to store.famtastichosting.com for checkout | GoDaddy handles all payment processing. We don't touch PCI. The "Buy" button links to the appropriate GoDaddy storefront product page. |
| **Customer creation** | GoDaddy reseller API (v1/shoppers) or storefront self-registration | Customer registers via GoDaddy storefront, then logs into our portal with the same credentials. We sync via GoDaddy's postback/API. |

---

## Database Architecture — GoDaddy cPanel MySQL

### Why MySQL, Not Supabase/Postgres

- **We already pay for it.** GoDaddy cPanel includes MySQL. No additional cost.
- **Same vendor, same infra.** Database runs on the same server as the site. Zero latency for local queries.
- **No vendor lock-in.** No Supabase URL, no Supabase auth, no Supabase RLS. If GoDaddy changes, we export MySQL and migrate. Standard SQL, standard tooling.
- **Eats its own dog food.** We're selling hosting. Our dashboard runs on the hosting we sell.
- **One connection string.** `mysql://localhost` or cPanel connection. No external service dependency.

### Database Instance

Created on GoDaddy cPanel:
- Database name: `famtastic_hosting` (or cPanel prefix: `fritzco_hosting`)
- User: `fh_app` (or `fritzco_fh_app`)
- Access: localhost only (server-side API routes)
- Character set: `utf8mb4` for full Unicode support

### Schema — Data-First Design

We extracted real GoDaddy data first (renewals, navigation, reports). The schema matches what the reseller panel actually provides, not what we imagine it should.

#### Core Tables (MySQL `db/schema.sql`)

```sql
-- Users table for customers and admins
-- MySQL bcrypt-based auth (no external auth provider)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  godaddy_shopper_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_email (email),
  INDEX idx_users_godaddy_shopper_id (godaddy_shopper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Sessions table for express-session MySQL store
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id INT NOT NULL,
  ip_address VARCHAR(45),
  user_agent VARCHAR(512),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_user_id (user_id),
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Products table — synced from GoDaddy API
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  godaddy_product_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category ENUM('wordpress', 'hosting', 'builder', 'servers', 'domains', 'email', 'ssl', 'security') NOT NULL,
  wholesale_price_cents INT NOT NULL COMMENT 'Price in cents (USD × 100)',
  retail_price_cents INT NOT NULL COMMENT 'Price in cents (USD × 100)',
  markup_pct DECIMAL(5,2) NOT NULL COMMENT 'Markup percentage',
  billing_period ENUM('monthly', 'annual') DEFAULT 'monthly',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_category (category),
  INDEX idx_products_godaddy_product_id (godaddy_product_id),
  INDEX idx_products_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders table — links to GoDaddy order system
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT,
  godaddy_order_id VARCHAR(255) UNIQUE NOT NULL,
  status ENUM('pending', 'active', 'cancelled', 'expired', 'processing', 'failed') NOT NULL DEFAULT 'pending',
  amount_cents INT NOT NULL COMMENT 'Order total in cents (USD × 100)',
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_orders_user_id (user_id),
  INDEX idx_orders_godaddy_order_id (godaddy_order_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Subscriptions table — recurring services
CREATE TABLE IF NOT EXISTS subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  godaddy_subscription_id VARCHAR(255) UNIQUE,
  status ENUM('active', 'paused', 'cancelled', 'expired', 'grace_period') NOT NULL DEFAULT 'active',
  current_period_start DATETIME NOT NULL,
  current_period_end DATETIME NOT NULL,
  auto_renew BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_subscriptions_user_id (user_id),
  INDEX idx_subscriptions_product_id (product_id),
  INDEX idx_subscriptions_status (status),
  INDEX idx_subscriptions_current_period_end (current_period_end),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Contact submissions from "Talk to a Human" form
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  ip_address VARCHAR(45),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP NULL,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_contact_email (email),
  INDEX idx_contact_resolved (resolved),
  INDEX idx_contact_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Admin settings — key-value configuration
CREATE TABLE IF NOT EXISTS admin_settings (
  setting_key VARCHAR(255) PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed default settings
INSERT INTO admin_settings (setting_key, setting_value, description) VALUES
  ('support_phone', '(480) 624-2500', 'GoDaddy white-label support phone number'),
  ('site_name', 'FAMtastic Hosting', 'Brand name for dashboard'),
  ('site_url', 'https://famtastichosting.com', 'Primary site URL'),
  ('notification_email', 'hello@famtastichosting.com', 'Email for admin notifications')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);
```

#### GoDaddy Report Tables (from extracted data)

```sql
-- Renewals data — synced from GoDaddy Reseller Control Center
CREATE TABLE IF NOT EXISTS godaddy_renewals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  product_name VARCHAR(512) NOT NULL,
  renewal_date DATE NOT NULL,
  days_until_renewal INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_renewal_customer (customer_name),
  INDEX idx_renewal_date (renewal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Available reports — maps GoDaddy RCC navigation
CREATE TABLE IF NOT EXISTS godaddy_available_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(255) NOT NULL,
  report_name VARCHAR(255) NOT NULL,
  requires_authentication BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO godaddy_available_reports (category, report_name) VALUES
  ('Reports', 'Commissions'),
  ('Reports', 'Product Commissions'),
  ('Reports', 'Payment History'),
  ('Reports', 'Renewals'),
  ('Reports', 'Customer Sales'),
  ('Dashboard', 'Main Dashboard'),
  ('Customers', 'Customer List'),
  ('Pricing', 'Pricing Rules'),
  ('Storefront', 'Storefront Settings'),
  ('Marketing', 'Marketing Tools'),
  ('Settings', 'Account Settings');
```

#### Auth — MySQL Sessions (No External Provider)

- **Registration:** bcrypt hash stored in `users.password_hash`
- **Login:** compare bcrypt, create session in `sessions` table
- **Session store:** `express-mysql-session` (MySQL-backed session store for Express/Astro)
- **No RLS needed.** MySQL doesn't have Row Level Security. Application-layer access control:
  - Customer API routes check `req.session.userId` and filter queries by `WHERE user_id = ?`
  - Admin API routes check `req.session.role === 'admin'` before any query
  - Admin role assignment is manual (direct DB update or special `/admin/setup` route during initial setup)

---

## API Endpoints (The Backend Map)

### GoDaddy Reseller API — What's Available

| Endpoint | Auth | Status | Notes |
|----------|------|--------|-------|
| `GET /v1/domains` | sso-key | **Working** | List all domains in account |
| `GET /v1/domains/{domain}` | sso-key | **Working** | Domain details, DNS, status |
| `GET /v1/domains/available?domain=X` | sso-key | **Working** | Availability + pricing |
| `GET /v1/orders?limit=N` | sso-key | **Working** | Full order history with pricing |
| `GET /v1/customers` | OAuth | **401 with sso-key** | Needs different auth — reseller API or OAuth |
| `GET /v1/shoppers/self` | shopper token | **403 with sso-key** | Customer self-service needs shopper auth |
| DNS management endpoints | sso-key | **Working** | Read/set DNS records |

### Our API Routes (Astro endpoints we build)

```
/api/auth/login          POST   Customer login (bcrypt verify, create MySQL session)
/api/auth/register       POST   Customer registration (bcrypt hash, insert user)
/api/auth/logout         POST   Destroy session
/api/auth/admin/login    POST   Admin login (bcrypt verify + role check)

/api/customer/domains    GET    List customer's domains
/api/customer/hosting    GET    List customer's hosting plans
/api/customer/email      GET    List customer's email accounts
/api/customer/billing    GET    List customer's invoices/payments
/api/customer/profile    GET/PATCH  Customer profile

/api/admin/customers     GET    List all customers (search/filter)
/api/admin/customers/:id GET    Customer detail
/api/admin/orders        GET    All orders (filter by status/date)
/api/admin/orders/:id    GET    Order detail
/api/admin/revenue       GET    Revenue dashboard data (MTD, by category, projections)
/api/admin/products      GET    Product catalog (wholesale + retail pricing)
/api/admin/products/:id  PATCH  Update retail pricing/markup
/api/admin/provisioning  GET    Provisioning status for pending orders
/api/admin/renewals      GET    Upcoming renewals from godaddy_renewals table

/api/godaddy/domains     GET    Proxy: domain list
/api/godaddy/domains/:domain GET  Proxy: domain detail
/api/godaddy/dns/:domain  GET/PUT  Proxy: DNS management
/api/godaddy/available   GET    Proxy: domain availability check
/api/godaddy/orders      GET    Proxy: order history
/api/godaddy/products    GET    Proxy: product catalog + pricing

/api/contact             POST   Contact form submission (email via SMTP)
/api/health              GET    Health check
```

---

## Work Breakdown — 8 Parallel Tracks

### Track 1: Auth & User System (MySQL)
**Priority:** P0 — nothing works without auth
**Model:** 1 Sonnet agent
**Estimate:** 4-6 hours

Tasks:
- Create MySQL database on GoDaddy cPanel (or run schema.sql)
- Run `db/schema.sql` to create all tables
- Build MySQL connection pool (`src/lib/db/pool.ts`) using `mysql2/promise`
- Build `/api/auth/login` — bcrypt compare, session creation (express-mysql-session)
- Build `/api/auth/register` — bcrypt hash, insert into `users` table
- Build `/api/auth/logout` — destroy session
- Build `/api/auth/admin/login` — bcrypt compare + role = 'admin' check
- Admin registration: one-time setup script or `/admin/setup` route (disable after first admin)
- Rate limiting on auth endpoints (5 attempts / minute)

Acceptance:
- Customer can register, log in, see their dashboard
- Admin can log in, see admin dashboard
- Unauthenticated users redirect to login
- Rate limiting blocks brute force attempts
- No Supabase dependency anywhere

---

### Track 2: GoDaddy API Integration Layer
**Priority:** P0 — dashboard has no data without this
**Model:** 1 Sonnet agent
**Estimate:** 4-5 hours

Tasks:
- Create `src/lib/godaddy/client.ts` — typed GoDaddy API client (ALREADY EXISTS — verify and enhance)
- Auth: sso-key from environment (server-side ONLY, never client)
- Implement domain endpoints: list, detail, availability, DNS management
- Implement order endpoints: list, detail, date filtering
- Implement product catalog: fetch available products + wholesale pricing
- Error handling: rate limiting (GoDaddy limits), auth failures, network timeouts
- Implement retry logic with exponential backoff
- Cache layer: short-lived in-memory cache for product catalog (5 min TTL)
- Webhook handler for GoDaddy postback notifications (provisioning status updates)

Acceptance:
- `api/godaddy/domains` returns real domain list from GoDaddy
- `api/godaddy/orders` returns real order history
- `api/godaddy/available?domain=test.com` returns availability + pricing
- `api/godaddy/dns/:domain` reads and writes DNS records
- All GoDaddy calls are server-side only
- Errors from GoDaddy are handled gracefully with user-friendly messages

---

### Track 3: Customer Portal — UI + API
**Priority:** P1 — customer-facing feature set
**Model:** 1 Sonnet agent
**Estimate:** 6-8 hours

Tasks:
- Dashboard home: service overview cards (active domains, hosting plans, email accounts, renewal dates)
- Domain management page: list domains, view DNS, renewal status, auto-renew toggle
- Hosting management page: plan details, resource usage, cPanel access link (branded), SSL status
- Email management page: list accounts, add/remove, change password (via GoDaddy API or storefront redirect)
- Billing page: invoices, payment history, upcoming renewals, payment method
- Support section: white-label phone number (480) 624-2500, knowledge base links, contact form
- Upgrade paths: "Want more?" cards linking to bundles, "Need a custom site?" → famtasticdesigns.com
- All pages: mobile-responsive, dark mode, Space Grotesk + DM Sans, violet accent

Acceptance:
- Customer logs in → sees their services
- Domain list shows real data from GoDaddy API
- "Talk to a Human" shows (480) 624-2500 on every dashboard page
- Billing page shows real order data
- Mobile layout works at 320px, 768px, 1024px

---

### Track 4: Admin Dashboard — UI + API
**Priority:** P1 — Fritz's command center
**Model:** 1 Sonnet agent
**Estimate:** 6-8 hours

Tasks:
- Customer lookup: search by name, email, domain
- Order management: filter by status (pending, active, cancelled, expired), view order details
- Revenue dashboard: MTD revenue, by product category, by bundle type, wholesale vs retail margin calculations, recurring revenue projection
- Renewals view: pull from `godaddy_renewals` table, show upcoming renewals sorted by date
- Product catalog: view products with wholesale/retail pricing, adjust markups per product, toggle products on/off
- Provisioning status: GoDaddy provisioning status per order, identify stuck orders
- Reports: monthly revenue CSV export, customer growth CSV, churn report, popular products
- Settings: profile, branding (logo, colors, support phone), notification preferences, API key management (view/regenerate GoDaddy keys)

Acceptance:
- Fritz logs in → sees revenue dashboard with real numbers
- Customer search works by email and domain
- Product markup can be adjusted per product
- Revenue calculations show margin (wholesale vs retail)
- Reports export to CSV
- Admin dashboard is at `/admin` with separate auth gate

---

### Track 5: Purchase Flow Integration
**Priority:** P1 — how money moves
**Model:** 1 Sonnet agent
**Estimate:** 2-3 hours

Tasks:
- "Buy" buttons on all product pages → redirect to correct store.famtastichosting.com product URL
- Map each product tier to its GoDaddy storefront URL
- After purchase, GoDaddy sends postback → our webhook updates customer's dashboard
- Customer portal shows "Purchase History" linking GoDaddy order IDs to FAMtastic product names
- Bundle pages: "Buy Bundle" → either storefront redirect OR custom form that triggers multi-product provisioning

Acceptance:
- Clicking "Buy WordPress Hosting" takes customer to correct store.famtastichosting.com product page
- Bundle "Buy" buttons work for each bundle tier
- Post-purchase, the order appears in customer's dashboard within 5 minutes
- No payment data ever touches our servers (GoDaddy handles all PCI)

---

### Track 6: Contact Form + Email Integration
**Priority:** P2 — needed but not blocking launch
**Model:** 1 Haiku agent
**Estimate:** 1-2 hours

Tasks:
- Contact form on hosting site facelift → POST `/api/contact`
- Route submissions to `hello@famtastichosting.com` (or Fritz's preferred email)
- Use GoDaddy cPanel SMTP relay (same server, no external email service needed)
- Rate limiting (5 submissions per IP per hour to prevent spam)
- Honeypot field for bot detection
- Admin dashboard shows contact submissions

Acceptance:
- Contact form sends email
- Spam submissions are filtered
- Submissions appear in admin dashboard

---

### Track 7: Database Schema + Seed Data
**Priority:** P0 — all other tracks depend on this
**Model:** 1 Haiku agent (fast, schema work)
**Estimate:** 1-2 hours

Tasks:
- `db/schema.sql` — all tables in MySQL syntax (already drafted above in this plan)
- `db/seed.sql` — product catalog data matching BUILD-SPEC.md pricing, in MySQL syntax
- `db/reports-schema.sql` — GoDaddy report tables (renewals, available_reports)
- Create database on GoDaddy cPanel or provide setup script
- Seed data: all GoDaddy products with wholesale/retail pricing from BUILD-SPEC.md
- Application-layer access control (no RLS — that's a Postgres feature, not available in MySQL)

Acceptance:
- `db/schema.sql` creates all tables without error on GoDaddy cPanel MySQL
- `db/seed.sql` inserts product catalog data matching BUILD-SPEC.md pricing
- `db/reports-schema.sql` creates GoDaddy report tables
- Application code enforces: customers see only their own data, admins see all
- Admin role assignment is manual (direct DB or setup route)

---

### Track 8: Dashboard Design System + Shared Components
**Priority:** P0 — tracks 3 and 4 depend on this
**Model:** 1 Sonnet agent
**Estimate:** 3-4 hours

Tasks:
- Create `src/styles/dashboard.css` — dark mode dashboard styles
- Design tokens: same violet accent (#7c3aed), gray scale, Space Grotesk headings, DM Sans body
- Shared Svelte components:
  - `<DashboardNav>` — sidebar nav (customer vs admin variants)
  - `<ServiceCard>` — domain/hosting/email status cards
  - `<PricingTable>` — reusable pricing display (wholesale hidden, retail shown)
  - `<RevenueChart>` — MTD revenue visualization (lightweight, no D3 — CSS bar charts or Chart.js via CDN)
  - `<StatusBadge>` — active/expiring/expired status indicators
  - `<DataTable>` — sortable, filterable table (orders, customers)
  - `<ContactPhone>` — (480) 624-2500 display component
  - `<PageShell>` — dashboard layout wrapper (sidebar + main content)

Acceptance:
- All components render in storybook-style isolation
- Dashboard layout matches Stripe Dashboard / Linear aesthetic
- Dark mode with violet accent throughout
- Mobile-responsive sidebar collapses to hamburger on small screens
- Design tokens match BUILD-SPEC.md color palette

---

## Execution Order (What Starts When)

```
Hour 0:  Track 7 (DB schema on MySQL) + Track 8 (Design system) + Track 2 (GoDaddy API layer) — all start immediately in parallel
Hour 2:  Track 1 (Auth — MySQL sessions + bcrypt) starts (needs DB schema from Track 7)
Hour 3:  Track 3 (Customer portal) starts (needs auth from Track 1, design system from Track 8, GoDaddy API from Track 2)
Hour 3:  Track 4 (Admin dashboard) starts (same dependencies)
Hour 4:  Track 5 (Purchase flow) starts (needs GoDaddy API from Track 2)
Hour 5:  Track 6 (Contact form) starts (needs DB schema, can be Haiku)

Everything parallel. No sequential bottleneck except auth needing DB schema.
```

## File Structure (Corrected — No Supabase)

```
famtastic-hosting/
├── src/
│   ├── components/               (hosting site facelift — existing)
│   ├── layouts/                  (existing)
│   ├── pages/
│   │   ├── index.astro           (existing — homepage)
│   │   ├── wordpress.astro       (existing)
│   │   ├── hosting.astro         (existing)
│   │   ├── builder.astro         (existing)
│   │   ├── servers.astro         (existing)
│   │   ├── domains.astro         (existing)
│   │   ├── bundles.astro         (existing)
│   │   ├── api/                  (NEW — API routes)
│   │   │   ├── auth/
│   │   │   │   ├── login.ts
│   │   │   │   ├── register.ts
│   │   │   │   └── logout.ts
│   │   │   ├── customer/
│   │   │   │   ├── domains.ts
│   │   │   │   ├── hosting.ts
│   │   │   │   ├── email.ts
│   │   │   │   ├── billing.ts
│   │   │   │   └── profile.ts
│   │   │   ├── admin/
│   │   │   │   ├── customers.ts
│   │   │   │   ├── orders.ts
│   │   │   │   ├── revenue.ts
│   │   │   │   ├── products.ts
│   │   │   │   ├── renewals.ts
│   │   │   │   └── provisioning.ts
│   │   │   ├── godaddy/
│   │   │   │   ├── domains.ts
│   │   │   │   ├── dns.ts
│   │   │   │   ├── available.ts
│   │   │   │   ├── orders.ts
│   │   │   │   └── products.ts
│   │   │   ├── contact.ts
│   │   │   └── health.ts
│   │   ├── dashboard/            (NEW — customer portal pages)
│   │   │   ├── login.astro
│   │   │   ├── register.astro
│   │   │   ├── index.astro        (dashboard home)
│   │   │   ├── domains.astro
│   │   │   ├── hosting.astro
│   │   │   ├── email.astro
│   │   │   ├── billing.astro
│   │   │   └── support.astro
│   │   └── admin/                (NEW — admin dashboard pages)
│   │       ├── login.astro
│   │       ├── index.astro       (revenue dashboard)
│   │       ├── customers.astro
│   │       ├── orders.astro
│   │       ├── products.astro
│   │       ├── provisioning.astro
│   │       ├── reports.astro
│   │       └── settings.astro
│   ├── app/                      (NEW — SvelteKit dashboard SPA)
│   │   ├── auth/
│   │   ├── dashboard/
│   │   └── admin/
│   ├── lib/
│   │   ├── godaddy/              (NEW — GoDaddy API client)
│   │   │   ├── client.ts         (base client, auth, retry, error handling)
│   │   │   ├── domains.ts        (domain management)
│   │   │   ├── dns.ts             (DNS read/write)
│   │   │   ├── orders.ts          (order history)
│   │   │   ├── products.ts        (catalog + pricing)
│   │   │   └── types.ts           (TypeScript interfaces)
│   │   ├── db/                   (NEW — MySQL connection pool + query helpers)
│   │   │   ├── pool.ts           (mysql2/promise connection pool)
│   │   │   ├── schema.ts         (table names + column constants)
│   │   │   └── types.ts           (TypeScript interfaces matching MySQL tables)
│   │   ├── auth/                 (NEW — session management)
│   │   │   ├── middleware.ts      (session check middleware)
│   │   │   └── helpers.ts         (bcrypt helpers, session creation/destroy)
│   │   └── storefront.ts
│   ├── styles/
│   │   ├── global.css            (existing)
│   │   ├── wild.css              (existing)
│   │   ├── extreme.css           (existing)
│   │   ├── components.css        (existing)
│   │   └── dashboard.css         (NEW — dashboard design system)
│   └── data/
│       ├── products.json         (existing — single source of truth for pricing)
│       └── bundles.json          (existing)
├── db/                           (NEW — replacing supabase/ directory)
│   ├── schema.sql                (all tables — MySQL syntax)
│   ├── seed.sql                  (product catalog data)
│   ├── reports-schema.sql        (GoDaddy report tables)
│   └── setup.sh                  (one-command: create DB + run schema + seed)
├── astro.config.mjs              (updated — add SSR adapter, API routes)
├── package.json                  (updated — add mysql2, express-session; REMOVE @supabase/supabase-js)
├── .env.example                  (NEW — template for env vars)
└── DEPLOY-STATE.md               (updated — add backend deploy details)
```

---

## Environment Variables Required

```env
# GoDaddy API (server-side only — NEVER expose to client)
GODADDY_API_KEY=9Q5aAbe5kYr_...
GODADDY_API_SECRET=Y8ihZtqA4f...
GODADDY_API_BASE=https://api.godaddy.com/v1

# MySQL (GoDaddy cPanel — localhost connection)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=famtastic_hosting
MYSQL_USER=fh_app
MYSQL_PASSWORD=...

# Session
SESSION_SECRET=...                    (32+ character random string for signing cookies)

# Contact form
SMTP_HOST=...                         (GoDaddy cPanel SMTP relay)
SMTP_PORT=465
SMTP_USER=...
SMTP_PASSWORD=...
CONTACT_EMAIL=hello@famtastichosting.com

# Site
SITE_URL=https://famtastichosting.com
```

**No Supabase variables. No external DB. One MySQL instance on the same cPanel.**

---

## GoDaddy API Auth Gotchas (Critical — Read Before Coding)

1. **sso-key format** is `sso-key KEY:SECRET` in PLAINTEXT, NOT base64-encoded. NOT `sBasic`. NOT `Basic`. This burned 3+ previous sessions.
2. **`/v1/customers` returns 401 with sso-key.** Error message says "sso-key authType is not supported for api." Customer management needs either:
   - GoDaddy Reseller API (separate certification required)
   - OAuth/shopper token flow
   - For MVP: redirect customers to store.famtastichosting.com for account creation, then sync via postback
3. **`/v1/reseller/orders` does NOT exist.** Returns 404. Reseller revenue data is only in the Reseller Control Center dashboard.
4. **`/v1/orders` DOES work** with sso-key. Returns full order history. Use this for financial data.
5. **All pricing in `/v1/orders` is in microdollars.** Divide by 1,000,000 for USD.
6. **`/v1/shoppers/self` returns 403** with self-serve API keys. Cannot query shopper details without reseller API access.

---

## Key Difference from Previous (Wrong) Version

This plan replaces the Supabase-based backend plan that was previously written. Key changes:

| What changed | Old (WRONG) | New (CORRECT) |
|---|---|---|
| **Database** | Supabase (Postgres) | GoDaddy cPanel MySQL |
| **Auth** | Supabase Auth (external) | MySQL sessions + bcrypt (ownable) |
| **RLS** | Postgres Row Level Security | Application-layer access control |
| **UUID types** | `uuid` primary keys with `gen_random_uuid()` | `INT AUTO_INCREMENT` primary keys |
| **Timestamps** | `timestamp with time zone` | `TIMESTAMP` / `DATETIME` |
| **Migration system** | `supabase/migrations/` (6 files) | `db/schema.sql` (single file + `db/seed.sql`) |
| **Config** | `supabase/config.toml` | `db/setup.sh` (one-command setup) |
| **Client lib** | `@supabase/supabase-js` | `mysql2/promise` |
| **Session store** | Supabase session cookies | `express-mysql-session` (MySQL-backed) |
| **Env vars** | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` |
| **Data-first** | Schema-first (imagined tables) | Data-first (extracted real GoDaddy data, schema from data) |
| **Project framing** | "Marketing site" | **Hosting business FACELIFT** |

---

## What "Done" Looks Like

### MVP Launch Criteria (All Must Pass)

- [ ] Customer can register and log in at `/dashboard`
- [ ] Customer sees their real GoDaddy orders/domains after login
- [ ] Admin can log in at `/admin`
- [ ] Admin sees revenue dashboard with real numbers from GoDaddy API
- [ ] Admin sees renewal data from `godaddy_renewals` table
- [ ] All "Buy" buttons link to correct store.famtastichosting.com product pages
- [ ] Contact form sends email via cPanel SMTP
- [ ] (480) 624-2500 appears on every dashboard page
- [ ] No GoDaddy API keys exposed to client (verified via browser network tab)
- [ ] Mobile-responsive at 320px, 768px, 1024px, 1440px
- [ ] Dark mode with violet accent consistent with hosting site facelift
- [ ] Hosting site facelift unchanged (7 pages still work, no regressions)
- [ ] **Zero Supabase dependencies in package.json**
- [ ] **Zero references to "marketing site" in codebase**

### Security

- MySQL sessions: bcrypt password hashing, HTTP-only session cookies, CSRF protection
- Auth middleware: customer routes check `req.session.userId`, admin routes check `req.session.role === 'admin'`
- Customer data isolation: all customer queries include `WHERE user_id = ?` (application-layer, not RLS)
- No external auth dependency — ownable, auditable, runs on the same cPanel
- GoDaddy API keys: server-side only, never exposed to client

### Post-MVP (Phase 2.1 — Can Start Immediately After MVP)

- Admin product markup editing (per-product retail pricing override)
- Revenue projection calculations (based on subscription renewal dates)
- Automated email notifications (order confirmation, renewal reminders) via cPanel SMTP
- GoDaddy postback webhook handler for real-time provisioning status
- Customer DNS management (edit DNS records through our portal)
- Bundle purchase flow (multi-product order creation)
- Custom nameserver setup flow (ns1/ns2.famtastichosting.com)

---

## Key References

| What | Where |
|------|-------|
| Build spec (full) | `~/famtastic/famtastic-hosting/BUILD-SPEC.md` |
| Deploy state | `~/famtastic/sites/site-famtastic-hosting/DEPLOY-STATE.md` |
| Hosting strategy | `~/famtastic/FAMTASTIC-HOSTING-STRATEGY.md` |
| GoDaddy API skill | `godaddy-reseller-ops` skill (loaded via skill_view) |
| VPS wholesale pricing | skill → `references/vps-wholesale-pricing.md` |
| cPanel deploy reference | skill → `references/cpanel-git-deployment.md` |
| Storefront activation | skill → `references/storefront-activation-checklist.md` |
| This backend plan | `~/famtastic/obsidian/02-Income/FAMtastic-Hosting-Backend-Plan.md` |
| Extracted GoDaddy data | `~/famtastic/renewals_data.json`, `~/famtastic/godaddy_renewals_schema.sql`, `~/famtastic/godaddy_reports_schema.sql` |
| Site repo | `~/famtastic/sites/site-famtastic-hosting/` |
| GitHub repo | `famtastic-fritz/famtastic-hosting` |

---

*Rewritten by Shay-Shay. No Supabase. No "marketing site." GoDaddy MySQL ONLY. Facelift, not marketing.*