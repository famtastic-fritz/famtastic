# Business Model — FAMtastic TripSaver (deal-finding as a product)

> Internal-use business model for productizing the deal-finding capability proven
> by this deal engine. Framed as a FAMtastic Designs offering. No money is moved
> by the system; this document is the commercial wrapper around the playbooks the
> engine generates.

## 1. What we sell

A **done-for-you savings playbook** for any trip or event purchase. The customer
gives us a quote (e.g. "$4,500 for 3 on the FAMU alumni cruise") and we return:

- a stacked-lever savings model (modeled ~40-48% off in the proof run),
- a booking-ready execution checklist,
- optional concierge execution (we book it through advisor credentials).

Two productized SKUs:

| SKU | What | Price |
|-----|------|-------|
| **Estimate** | 1-page savings estimate, automated by the engine | Free (lead magnet) |
| **Playbook** | Full stacked-lever plan + checklist | Flat **$99** *or* **20% of verified savings** (customer picks the lower) |
| **Concierge** | We execute the booking via host-agency credentials | 20% of verified savings, min $149 |

## 2. Why it works (unit economics)

- **Cost to produce a playbook ≈ $0.001–$0.004** in model spend (measured: the
  full 10-task proof batch cost **$0.00385** total — triage on a free local tier,
  escalation to a cheap hosted model only for the hard reasoning).
- **Price $99 → playbook gross margin ≈ 99.99%** on inference. Real cost is human
  review time, not compute.
- On the proof case alone, modeled savings were **~$1,845 on a $3,800 quote**.
  A 20%-of-savings fee = **~$369** for ~$0.004 of compute + minutes of review.

The engine is the moat: it drives marginal cost of each additional playbook to
near zero while a human-only competitor pays an analyst per quote.

## 3. The funnel (maps to the pipeline handlers)

```
marketing → campaign → outreach → (deal_finder/apparel_finder) → sales → payment
```

1. **Marketing** (handler `marketing`): position TripSaver to HBCU alumni chapters.
2. **Campaign** (handler `campaign`): reunion/homecoming-season launch funnel.
3. **Outreach** (handler `outreach`): warm first-contact + organizer coordination
   (DRAFT-ONLY in the sandbox; mismatched-contact safety check baked in).
4. **Deliver value** (handlers `deal_finder` / `apparel_finder`): the playbook.
5. **Sales** (handler `sales`): present flat-fee vs %-of-savings, ask for the yes.
6. **Payment** (handler `payment`): PayPal **invoice** (never auto-capture).

Every stage is already a task kind the orchestrator can run at volume.

## 4. Go-to-market

- **Beachhead:** HBCU / FAMU alumni group trips (cruises, reunions, homecoming).
  Warm channels (chapter newsletters, group chats) → near-zero CAC.
- **Wedge offer:** free estimate. If we can't beat the quote, they owe nothing —
  zero-risk, high trust.
- **Expansion:** formal-wear and event-apparel bundles (proven by `apparel_finder`),
  then general group travel.

## 5. Revenue model & targets (illustrative)

- Flat $99 × 50 playbooks/mo = **$4,950/mo** at ~$0.20 total compute.
- %-of-savings on concierge: ~$369 avg × 20 deals/mo = **$7,380/mo**.
- Compute is a rounding error; the constraint is review throughput, which the
  engine's concurrency scaling is designed to relieve.

## 6. Required real inputs (documented, not wired)

- **PayPal Business** (invoice creation only) — `PAYPAL_*` in `.env`.
- **GoDaddy** custom email (`deals@yourdomain.com`) for outreach + invoices.
- **Host-agency advisor credentials** — the single biggest savings lever and the
  thing the prior research attempt only stumbled onto. This is the strategic
  unlock for the Concierge SKU.
- **Live model/data key** — to attach current quotes to each lever.

## 7. Risk & compliance posture

- No autonomous money movement, ever. Invoices are created; the customer pays by
  their own action.
- Outreach is drafted, never auto-sent; recipient identity must be human-verified
  (see the contact-mismatch flag in `OUTREACH-DRAFT.md`).
- Savings are modeled and labeled as estimates until verified against live quotes.
