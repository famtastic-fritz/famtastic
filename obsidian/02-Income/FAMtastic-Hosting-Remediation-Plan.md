---
title: FAMtastic Hosting — Remediation Plan
status: in-progress
created: 2026-06-12 16:43:06 EDT
scope: Stabilize FAMtastic Hosting across front end, checkout, domain flow, backend
  fulfillment, and QA hardening so the public funnel and revenue path stop lying.
permalink: famtastic/02-income/famtastic-hosting-remediation-plan-1
---

# FAMtastic Hosting — Remediation Plan

This plan turns the overnight assessment into an execution anchor. The goal is not cosmetic polish first — it is to make the funnel honest, the payment path safe, and the product behavior real. Front end, backend, and QA all tie together here because the current risk is cross-layer: customers can encounter convincing UI before the fulfillment and data paths are truly ready.

## Current State (as of 2026-06-12)

### What's DONE
- Public FAMtastic Hosting site is live at https://famtastichosting.com
- Core product pages exist: home, WordPress, hosting, builder, servers, domains, bundles, contact, checkout
- Cart/checkout foundation exists
- Live PayPal server auth is working
- Codebase builds successfully
- Morning assessment packet is written at `sites/site-famtastic-hosting/reports/qa-ux-backend-assessment-2026-06-12.md`

### What's BROKEN/INCOMPLETE
- Payment capture can move ahead of real fulfillment/provisioning
- Guest checkout identity persistence is weak
- Domains flow allows invalid purchase intent without real domain-name capture
- Several primary CTAs self-link instead of advancing the funnel
- `/servers` is visually and behaviorally inconsistent with the rest of the site
- Auth-gated API behavior leaks internal upstream hostnames in redirects
- Checkout front-end/client config has drift risk versus server-side live config
- Automated QA coverage is too thin for real paid-commerce confidence

### Known Gaps
- No full Playwright rig yet in the canonical repo
- Trust proof near pricing is still light
- Post-purchase confirmation messaging is inconsistent
- GoDaddy-backed customer portal data paths are not fully reliable/complete
- Ops hardening is weak: env validation, monitoring, restart confidence, migration enforcement

---

## Plan: 5 Phases

### Phase 1: Stop the Lie in Revenue Flow (2-4 hours)
Lock down the highest-risk commerce truth gaps before touching polish.

**Tasks:**
1. Audit checkout capture path and define the exact intended post-payment fulfillment architecture.
2. Decide whether checkout stays publicly enabled before fulfillment is real.
3. Wire durable customer identity capture for successful payment paths.
4. Define idempotent order state transitions: created → paid → queued/provisioning → fulfilled/failed.
5. Verify how local orders, PayPal refs, and GoDaddy order creation are supposed to connect.

**Expected result:** We can state honestly whether a successful payment results in a trackable, fulfillable order with customer identity preserved.

---

### Phase 2: Repair Broken Funnel Actions (2-3 hours)
Fix the user-facing actions that currently stall or mislead.

**Tasks:**
1. Inventory all primary CTAs on `/domains`, `/bundles`, `/hosting`, `/wordpress`, and `/servers`.
2. Replace self-linking or dead-end CTAs with real next-step routes: configure, add to cart, checkout, or contact.
3. Rebuild `/domains` so search/lookup comes before carting a domain product.
4. Normalize `/servers` labels, CTA copy, and route behavior to match the rest of the public system.
5. Re-test all primary public CTA paths end-to-end.

**Expected result:** Every primary action on the public funnel advances the user intentionally instead of looping or faking progress.

---

### Phase 3: Align Front-End and Backend Checkout Truth (1-2 hours)
Remove config drift and make browser checkout behavior match server reality.

**Tasks:**
1. Trace PayPal client ID and env usage across canonical repo, build-time env, and server runtime env.
2. Align front-end checkout SDK config with live server-side payment environment.
3. Verify checkout empty state, populated state, order creation, and visible button rendering.
4. Confirm order confirmation messaging reflects actual post-payment behavior and timeline.
5. Remove or hide any checkout claims the backend cannot yet support.

**Expected result:** Checkout UI, SDK config, and server-side payment behavior all tell the same truth.

---

### Phase 4: Backend/API Hardening (3-5 hours)
Clean up backend behavior that will keep leaking risk even after UX fixes.

**Tasks:**
1. Convert auth-gated API redirects into proper API-friendly 401/403 responses where appropriate.
2. Add startup/runtime env validation for critical dependencies: DB, PayPal, GoDaddy, webhook/postback secret, email.
3. Review customer/admin API boundaries and confirm incomplete portal endpoints are either finished or explicitly disabled.
4. Tighten session policy consistency across customer/admin auth flows.
5. Review schema/migration safety and define enforcement expectations for deploys.

**Expected result:** The backend behaves like a production system instead of a promising prototype with hidden edge leaks.

---

### Phase 5: Proof, QA, and Closeout (3-4 hours)
Turn fixes into proof, not vibes.

**Tasks:**
1. Add a real Playwright QA rig in the canonical repo for public funnel + cart + checkout + auth smoke.
2. Add focused integration checks for payment, domain flow, and key customer-facing APIs.
3. Re-run UX/UI and functional QA against the repaired funnel.
4. Update SITE-LEARNINGS.md, CHANGELOG.md, and FAMTASTIC-STATE.md if structure/behavior changed.
5. Produce a closeout packet with open gaps, deferred work, and next recommended lane.

**Expected result:** We have testable proof for the funnel and a clean handoff record if execution spans sessions.

---

## Dependencies & Tech Stack

### Product / Flow Dependencies
- Public funnel depends on honest CTA routing and valid product flow architecture
- Checkout depends on cart state, PayPal client/server alignment, and order persistence
- Fulfillment depends on post-payment order handling and GoDaddy integration strategy
- Dashboard/customer experience depends on auth, session integrity, and shopper-scoped data reliability

### Technical Stack
- Astro site/app
- Svelte components in key UI areas
- PayPal for checkout/payment flow
- GoDaddy reseller/domain-hosting integration paths
- DB-backed auth/session/order persistence
- Apache/proxy layer in front of app runtime

### Proof Dependencies
- Browser QA for user-facing truth
- Repo/code audit for backend truth
- Deploy/runtime verification for config truth

## Known Risks & Mitigations

- Risk: Payment remains enabled while fulfillment is incomplete
  - Impact: customer pays without delivery
  - Mitigation: gate or constrain checkout until paid order lifecycle is real

- Risk: Fixes become front-end-only cosmetics
  - Impact: pretty funnel, same backend lie
  - Mitigation: execute in the order above; Phase 1 before polish

- Risk: Domain flow gets patched instead of redesigned
  - Impact: continued invalid purchase behavior
  - Mitigation: treat domains as a flow architecture issue, not just button wiring

- Risk: Context loss across sessions
  - Impact: re-discovery tax and half-finished work
  - Mitigation: keep this plan updated as the live anchor and checkpoint file

- Risk: Docs drift again from reality
  - Impact: future sessions act on stale assumptions
  - Mitigation: documentation closeout is mandatory for any structural change

## Captain Breakdown — Checkbox View

### Phase 1 — Stop the Lie in Revenue Flow
- [ ] Map the exact paid-order lifecycle from cart to fulfillment
- [ ] Decide whether checkout stays public before fulfillment is real
- [ ] Persist durable customer identity on successful payment
- [ ] Define idempotent order states and transitions
- [ ] Verify how local orders, PayPal refs, and GoDaddy fulfillment are supposed to connect

Depends on:
- Existing code + deploy truth only
- No dependency on later phases

Blocks:
- Phase 3
- most of Phase 4
- final signoff in Phase 5

### Phase 2 — Repair Broken Funnel Actions
- [ ] Inventory all primary CTAs on public revenue pages
- [ ] Fix self-linking / dead-end CTAs
- [ ] Rebuild domains flow around real domain lookup first
- [ ] Normalize `/servers` labels, CTA copy, and route behavior
- [ ] Re-test all primary CTA paths end-to-end

Depends on:
- Can begin immediately
- Domain-flow decisions should stay aligned with Phase 1 revenue truth

Blocks:
- Clean UX signoff
- part of Phase 5 browser proof

### Phase 3 — Align Checkout Front End with Backend Truth
- [ ] Trace PayPal client/env usage across repo, build, and server
- [ ] Align checkout SDK config with live payment environment
- [ ] Verify checkout empty state and populated state
- [ ] Verify order creation and visible payment button rendering
- [ ] Align confirmation messaging with actual post-payment behavior

Depends on:
- Phase 1 must be understood first
- Can overlap partially with Phase 2 after checkout truth is clear

Blocks:
- trustworthy checkout QA
- release confidence

### Phase 4 — Backend/API Hardening
- [ ] Replace API auth redirects with proper API responses where needed
- [ ] Add startup/runtime env validation for critical integrations
- [ ] Review incomplete customer/admin endpoints and either finish or disable them
- [ ] Unify session/auth policy behavior
- [ ] Review migration safety and deployment enforcement

Depends on:
- Phase 1 decisions
- benefits from Phase 3 findings

Blocks:
- production-hardening signoff
- backend readiness signoff

### Phase 5 — Proof, QA, and Closeout
- [ ] Add Playwright QA rig in canonical repo
- [ ] Add focused integration checks for payment, domain flow, and key APIs
- [ ] Re-run UX/UI and functional QA on repaired flows
- [ ] Update SITE-LEARNINGS.md / CHANGELOG.md / FAMTASTIC-STATE.md if structure changed
- [ ] Produce closeout packet with remaining gaps and next lane

Depends on:
- Phases 1–4 substantially complete for honest proof

Blocks:
- final confidence
- handoff / next-session continuity

## Dependency Map

- Phase 1 is the load-bearing phase.
- Phase 2 can start early, but domain-flow work must not contradict Phase 1.
- Phase 3 depends directly on Phase 1 and partially intersects with Phase 2.
- Phase 4 depends mostly on Phase 1, with input from Phase 3.
- Phase 5 depends on all prior phases being materially true, not cosmetically patched.

## Task-List Maintenance Rule

To avoid losing the thread across sessions:
- This plan file is the source of truth for multi-phase progress.
- The chat todo list is temporary steering only.
- At the end of any meaningful work block, update this file first.
- Only one phase should be marked as the active execution phase at a time.
- If work gets interrupted, resume by reading this file before touching code.
- If a sub-task appears during execution, add it under the owning phase here instead of letting it live only in chat context.

## Completed ✅

- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5

---

**Started:** 2026-06-12 16:43:06 EDT  
**Current Phase:** Planning / pre-execution anchor  
**Estimated Completion:** Multi-session; honest estimate 1-2 focused work blocks depending on fulfillment scope