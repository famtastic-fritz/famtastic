---
title: FAMtastic Hosting — Full Wire Plan (Jun 10–completion)
status: in-progress
created: 2026-06-10
updated: 2026-06-10 17:55:00-04:00
scope: Complete FAMtastic Hosting authentication, product display, and dashboard for
  customer login
permalink: famtastic/02-income/famtastic-hosting-full-wire-plan
---

# FAMtastic Hosting — Full Wire Plan

**Goal:** FAMtastic Hosting is fully wired. Customer can signup → login → see products & dashboard → logout.

**Scope:** Auth system, product pages, customer dashboard, end-to-end flow.

**Timeline:** Compressed, working until fully complete.

---

## Current State (as of Jun 10, 17:55)

### What's DONE
- Site deployed to `famtastichosting.com` (HTTP confirmed 200)
- HTTPS cert installed (expires 2026-09-08) — **NEEDS VERIFICATION**
- Astro framework + React components for UI
- Auth middleware structure in place (`src/middleware.ts`)
- Login page routes exist (`/dashboard/login`, `/admin/login`)
- Database schema created (`db/schema.sql`) with users table + sessions table
- MySQL connection configured in `.env`

### What's BROKEN/INCOMPLETE
- **Database not wired to auth** — Auth middleware calls `extractSession()` but DB queries fail (no connection pool or query logic)
- **No customer registration** — Login page exists but no signup flow
- **No password hashing** — Plaintext comparison or missing bcrypt
- **No session persistence** — Sessions not stored in DB; memory-only
- **Product pages show placeholders** — No real pricing data fetched from DB
- **Dashboard is empty** — No customer data display
- **No email verification** — Registration email not configured

### Known Gaps
1. HTTPS not yet verified live
2. Auth middleware logic stubbed but not functional
3. No password reset flow
4. No admin panel for customer management
5. GoDaddy API integration not wired (future: automatic domain provisioning)

---

## Plan: Five Phases

### Phase 0: HTTPS Verification (5 min)
**Blocker check before anything else.**

```bash
curl -sI https://famtastichosting.com | grep -E "HTTP|Server|Date"
curl -sI https://www.famtastichosting.com | grep -E "HTTP|Server|Date"
```

If not 200 with valid cert: wait for Apache restart, retry.

**Expected output:**
```
HTTP/2 200
Server: Apache
```

### Phase 1: Wire Database Connection + Auth Queries (30 min)
**Goal:** Auth middleware can query the DB and validate sessions.

**Tasks:**
1. Create `src/lib/db.ts` — MySQL connection pool using `mysql2/promise`
   - Load from `.env`: host, user, password, database
   - Verify connection on startup (connection test query)
   
2. Implement session lookup in `src/lib/auth/middleware.ts`
   - `extractSession(cookie)` → queries DB for session record
   - Returns `AuthUser` or null
   - Handle DB errors gracefully (log, return null)

3. Implement password validation
   - Install bcrypt: `npm install bcrypt`
   - Add password hash + verification functions to `src/lib/auth/password.ts`

4. Create test query
   - Simple endpoint `/api/auth/test` that queries `SELECT 1` from DB
   - Verify no SQL errors

**Expected result:** Auth middleware can load and validate a session from the DB.

---

### Phase 2: Customer Registration Flow (45 min)
**Goal:** Customer can create an account.

**Tasks:**
1. Create `/dashboard/signup` route (Astro page)
   - Form: email, password, confirm password
   - Client-side validation (email format, password length ≥ 8)
   - Submit to POST `/api/auth/register`

2. Implement POST `/api/auth/register` (Astro API route)
   - Validate input (email not already used, password strength)
   - Hash password with bcrypt (cost: 10)
   - Insert into `users` table with `email`, `password_hash`, `created_at`
   - Return 201 + JSON: `{ session_id, email }` OR 400 + error

3. Set session cookie on signup
   - After successful registration, create session record in DB
   - Set `HttpOnly`, `Secure`, `SameSite=Lax` cookie
   - Redirect to `/dashboard` (authenticated)

4. Email verification (DEFERRED for now)
   - Stub: Send email (placeholder log only)
   - User can login without email verification for MVP

**Expected result:** Customer can go to `/dashboard/signup`, enter email + password, get logged in.

---

### Phase 3: Customer Login Flow (30 min)
**Goal:** Customer can login with existing credentials.

**Tasks:**
1. Update POST `/api/auth/login` (stub already exists)
   - Accept email + password
   - Query `users` table for email
   - Compare password with bcrypt
   - If match: create session record in DB, set cookie
   - If no match: return 401 + error message

2. Redirect on successful login
   - Redirect to `/dashboard` (customer home)

3. Logout endpoint
   - DELETE `/api/auth/logout` 
   - Delete session from DB
   - Clear cookie

**Expected result:** Customer can login with email/password, see their dashboard.

---

### Phase 4: Customer Dashboard + Product Display (60 min)
**Goal:** Authenticated customer sees their hosted sites and the product catalog.

**Tasks:**
1. Create `/dashboard` page (Astro, authenticated only)
   - Show customer's email + account status
   - Display "My Sites" section (pulled from DB `orders` table)
   - Display "Quick Links" to product pages
   - "See All Plans" → link to /pricing or product pages

2. Wire product pages to show real pricing
   - Update `/wordpress`, `/hosting`, `/builder`, `/servers`, `/domains` pages
   - Fetch pricing from DB (`products` table) or mock data
   - Display in pricing cards
   - Add "Get This Plan" CTA → checkout (stub for now, can be GoDaddy redirect)

3. Create admin stub
   - `/admin/login` → separate login flow (admin users only)
   - `/admin/dashboard` → show total customers, total orders (read-only for now)

4. Wire middleware guards
   - `/dashboard/*` requires customer auth (else redirect to `/dashboard/login`)
   - `/admin/*` requires admin auth (else redirect to `/admin/login`)

**Expected result:** Authenticated customer sees dashboard + product pricing.

---

### Phase 5: End-to-End Testing + Cleanup (45 min)
**Goal:** Full signup → login → dashboard → logout flow works.

**Tasks:**
1. Test signup flow
   - Go to `/dashboard/signup`
   - Register new account (email: test@example.com, pass: TestPass123)
   - Should redirect to `/dashboard` (logged in)

2. Test login flow
   - Logout
   - Go to `/dashboard/login`
   - Login with same credentials
   - Should redirect to `/dashboard` (logged in)

3. Test product pages
   - Navigate to `/wordpress`, `/hosting`, `/builder`, `/servers`, `/domains`
   - Should see real pricing (or mock data)
   - "Get This Plan" buttons should not error

4. Test auth guards
   - Try to access `/dashboard` without login → should redirect to `/dashboard/login`
   - Try to access `/admin` without admin login → should redirect to `/admin/login`

5. Update documentation
   - Update `DEPLOY-STATE.md` with auth status
   - Update `SITE-LEARNINGS.md` with what was built
   - Commit all changes with clean messages

**Expected result:** End-to-end signup → dashboard → logout flow is solid and deployed.

---

## Dependencies & Tech Stack

| Component | Tech | Status |
|-----------|------|--------|
| Database | MySQL on GoDaddy | Connected, schema exists |
| Auth | bcrypt + session table | To implement |
| Password reset | Email + token | DEFERRED |
| Checkout | GoDaddy API redirect (stub) | DEFERRED |
| Admin panel | Auth only | DEFERRED |
| Email verification | Stub (log only) | DEFERRED |

---

## Known Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| DB connection fails | Auth completely broken | Test connection in Phase 1, add retry logic |
| Password hashing too slow | Signup slow | Use bcrypt cost=10 (standard), cache salt |
| Session table grows large | Disk/performance | Add session expiry logic (cleanup after 30d) |
| HTTPS not live after cert install | API calls fail | Verify in Phase 0, check Apache error log if needed |

---

## Completed ✅

- [ ] Phase 0: HTTPS verification
- [ ] Phase 1: DB + auth queries
- [ ] Phase 2: Customer signup
- [ ] Phase 3: Customer login
- [ ] Phase 4: Dashboard + product display
- [ ] Phase 5: End-to-end testing + deployment

---

## Notes for Shay

- **Context loss protection:** This plan is saved to `~/famtastic/obsidian/02-Income/FAMtastic-Hosting-Full-Wire-Plan.md`. If context switches, reload this file before continuing.
- **Deployment:** After Phase 5, push changes to GitHub, pull on server via `deploy.sh`.
- **Testing:** Use curl or Postman for API testing; browser for UI.
- **Communication:** After each phase, update this doc with status + blockers.

---

**Started:** 2026-06-10 17:55  
**Current Phase:** 0 (HTTPS verification)  
**Estimated Completion:** 2026-06-10 22:00 (assuming no major blockers)