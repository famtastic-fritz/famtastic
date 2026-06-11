# Track 1 Review Patch — Payments, Netlify, and Mobile Review Queue

_Date: 2026-06-11_

## Context

During Track 1 review, the plan treated Stripe as the primary payment rail and Cash App as fallback. Fritz corrected this:

- Fritz already has a **PayPal Business account** for FAMtastic Designs.
- The account has existed since approximately 2008.
- Fritz also has a Netlify account.
- Shay can handle some of the hosting/account details, but the plan needs to stop assuming Stripe is the only professional primary rail.
- There is also an unresolved conflict: if admin is localhost-only, Fritz cannot reliably approve sends from his phone.

## Payment Decision

Do not assume Stripe is the required primary payment rail for Sprint Day 1.

Use the existing **PayPal Business** account as the fastest trusted primary rail unless technical/account checks prove otherwise.

Recommended payment ladder:

```text
Primary Day-1 rail:
- PayPal Business payment links / invoices / checkout buttons

Secondary / parallel rail:
- Stripe Payment Links or Checkout if available and quick to activate

Fallback / manual rail:
- Cash App / manual invoice only when needed
```

## Why

PayPal Business is already live and historically tied to FAMtastic Designs. That reduces launch friction and avoids delaying deposit collection on Stripe onboarding.

The plan should still support Stripe later because Stripe is useful for:

- subscriptions;
- webhooks;
- embedded checkout;
- payment links;
- cleaner automation;
- recurring care plans.

But Day 1 should prioritize money movement with what already exists.

## Required Plan Patch

### roadmap.md

Replace or adjust Stripe-primary language:

```text
0.4 Payment rail check:
- PayPal Business live link/invoice/button verified.
- Stripe checked in parallel, but not launch-blocking if PayPal works.
- Cash App remains fallback/manual rail.
```

Acceptance:

```text
A test payment path works end-to-end through PayPal or Stripe.
Payment confirmation triggers the same Payment/Client/Onboarding flow.
```

### pages.md / claim page

Change payment display priority:

```text
Primary visible option: PayPal Business / card-capable checkout if configured.
Secondary: Stripe checkout if available.
Fallback: Cash App/manual invoice, visible but not equal-weight for professional/church prospects.
```

### backend.md

Payment provider enum should include:

```text
paypal
stripe
cashapp
invoice
```

Payment object should support:

- provider = paypal;
- PayPal payment ID / invoice ID / order ID;
- manual reconciliation if using simple PayPal links first;
- webhook support later if PayPal API/webhooks are added.

### workflows.md

WF-10 Payment/Deposit should say:

```text
Payment may arrive through PayPal, Stripe, Cash App, or invoice.
Day 1 requires at least one working professional payment path.
Webhook automation is ideal, but manual reconciliation is acceptable only for the initial sprint if it does not block deposit collection.
```

## Netlify Note

Fritz has a Netlify account.

This should be treated as an available hosting/deploy option, especially for:

- quick preview deploys;
- static proof previews;
- emergency/static claimable shell;
- branch previews;
- simple forms/functions if useful.

Do not force Netlify if Vercel/GoDaddy is better for a specific lane. Use it as an available asset.

Recommended positioning:

```text
Vercel remains preferred for the Next.js immersive showroom if the team chooses Option A.
Netlify is available for static proof previews, branch previews, quick deploys, or emergency shell fallback.
GoDaddy remains available for PHP/MySQL hosted plane and reseller/domain/email economics.
```

## Mobile Review Queue Conflict

Problem:

The plan says admin is localhost-first, but Fritz is expected to review sends/flags from his phone. If admin is only localhost, Fritz cannot reliably approve from mobile unless he is at the machine/network.

Decision:

Do not make full hosted admin launch-blocking, but create a **minimal mobile review mechanism** before outreach begins.

Recommended Sprint solution:

```text
Mobile Review Queue v0
- Email digest to fritz@ / notify@ with proof cards.
- Each item includes approve / reject / park links.
- Links are signed, single-use, expire quickly, and call a hosted endpoint.
- No secrets in the link beyond signed token.
- Every action writes AgentTaskLog + Proof/Email status transition.
```

This avoids building a full admin UI before outreach but still lets Fritz review from phone.

Options:

1. **Best Day-1 option:** signed approve/reject links in email digest hitting the hosted PHP API.
2. **Alternative:** Netlify/Vercel lightweight review page protected by signed token.
3. **Developer/admin option:** Cloudflare Tunnel or Tailscale to localhost admin, but this is less friendly and should not be required for daily mobile review.
4. **Fallback:** GitHub issue/checkbox queue, but this adds friction and should be temporary only.

## Required Launch-Blocking Patch

Add to launch-blocking:

```text
Mobile review v0 works before any send requiring Fritz approval.
```

Acceptance test:

```text
A flagged proof creates a review item.
Fritz receives a mobile-readable email.
Approve link changes status to approved.
Reject link parks the proof with reason.
Both actions are logged.
Sender choke point respects the resulting status.
```

## Review Severity

Priority: **P0/P1**

- Payment rail correction is P0 because it affects Day-1 deposit collection.
- Mobile review v0 is P1/P0 depending on whether human-reviewed sends are required before outreach.
- Netlify note is P2 unless used for the sprint shell/preview hosting.
