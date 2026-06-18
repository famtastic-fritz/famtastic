# FAMtastic Designs — Internal Business Model & End-to-End Sales Pipeline

> Produced by the agent factory as the proof task. Mode: offline (no live
> spend, no real sends). Every credential below is a documented plug-point, not
> an active integration. Assumptions are marked **ASSUMPTION** and re-listed in
> SUMMARY.md.

---

## 0. What we are selling

**FAMtastic Designs** productizes the FAMtastic site factory: confidently-different,
fast-shipping marketing websites for small/local businesses (barbers, bakeries,
flower shops, transport, accounting — see the build history in
`famtastic-dna.md`). The differentiation is craft: layered hero vocabulary,
real SVG dividers, multi-part logos, motion — output a normal agency would not
ship. We sell that *output as a service/product*, not the factory itself.

**Positioning line:** "A site that looks like you spent $15k, shipped in days,
priced like you didn't."

---

## 1. Offer architecture (conception → packaged product)

Three productized tiers + one recurring line. Prices are **ASSUMPTION**s tuned
for SMB willingness-to-pay; adjust after first 10 deals.

| Tier | Name | Scope | Price (one-time) | Delivery |
| --- | --- | --- | --- | --- |
| Starter | **Storefront** | 1–3 page site, 1 hero, contact + map, mobile-perfect | **$900** | 3–5 days |
| Core | **Signature** | 4–6 pages, custom logo set, motion, gallery/menu, SEO basics | **$2,400** | 5–8 days |
| Premium | **Flagship** | 6+ pages, copywriting, booking/lead capture, analytics, 2 revision rounds | **$4,800** | 8–12 days |
| Recurring | **Care Plan** | hosting, edits, monthly freshness, uptime | **$79–$199/mo** | ongoing |

**Add-ons (high-margin, near-zero marginal cost given the factory):** extra page
$250, logo refresh $300, copy polish $400, rush delivery +30%.

**Unit economics (ASSUMPTION):** factory build cost per site is dominated by
model spend + review time. Target **>85% gross margin** on one-time tiers; the
Care Plan is the durable revenue. The agent factory's own cost ledger
(`COSTS.log`) is the template for tracking per-deal production cost.

---

## 2. Pipeline overview (conception → cash)

```
[1 Conceive offer] → [2 Build assets] → [3 Market] → [4 Campaign] →
[5 Contact/Outreach] → [6 Qualify] → [7 Pitch/Propose] → [8 Close] →
[9 Invoice/Collect] → [10 Deliver] → [11 Upsell Care Plan] → (loop)
```

Each stage below has: **goal · channel/tool · the asset · the trigger to next
stage · what the agent factory automates.**

---

## 3. Marketing (top of funnel)

**Goal:** make SMB owners in target verticals aware that a premium-looking site
is cheap and fast.

- **Proof-led content:** publish the actual factory builds as a portfolio at
  `famtasticdesigns.com/work` (one case study per site already in `famtastic-dna.md`).
  Before/after + "shipped in N days" is the whole pitch.
- **Channels (ranked by SMB reach, ASSUMPTION):**
  1. Local SEO + Google Business Profile (intent traffic).
  2. Instagram/Facebook reels showing a build time-lapse (FAMtastic motion sells itself).
  3. Local FB groups / Nextdoor / Chamber of Commerce partnerships.
  4. Vertical cold outreach (see §5) — the highest-control channel.
- **Lead magnet:** "Free 60-second site teardown" — we record a Loom roasting
  their current site and end with a one-click "build the FAMtastic version."
- **Landing/serve layer:** a lightweight static serve for campaign landing
  pages and the teardown opt-in. (Reference inspiration: the `vibe-serve`
  project the brief linked — a minimal serve layer for these pages. **ASSUMPTION:**
  used only as a pattern, not a dependency.)

**Factory automation:** a `content` task type can mint case-study pages and reel
scripts from each completed build; a `seo` task can generate per-vertical
landing copy.

---

## 4. Campaigning (structured demand gen)

**Goal:** run repeatable, measurable pushes per vertical, not one-off blasts.

- **Campaign unit = one vertical × one city** (e.g., "Atlanta barbers"). The
  factory already has proof builds per vertical — lead with the matching one.
- **Sequence per campaign:**
  - Day 0: cold email #1 (teardown offer) from `hello@famtasticdesigns.com`.
  - Day 3: email #2 (case study in their vertical).
  - Day 7: email #3 (price-anchored "Storefront $900, live this week").
  - Day 10: break-up email.
- **Tracking:** UTM per campaign → landing page → opt-in. KPIs: open, reply,
  booked-call, close, CAC, payback. **ASSUMPTION:** target reply rate ≥6%,
  call-book ≥2%, close ≥25% of calls.
- **Compliance:** B2B cold email with opt-out + physical address (CAN-SPAM).
  Warm the domain before volume (see §5).

**Factory automation:** an `outreach_campaign` task type expands (vertical, city)
into a full sequence with personalized first lines pulled from the prospect's
current site.

---

## 5. Contacting / Outreach (the controllable channel)

**Goal:** get a qualified reply, then a booked call.

**Infrastructure (mock now, fill in `.env` later):**
- **Sending domain:** `famtasticdesigns.com` via **GoDaddy**. **ASSUMPTION:** a dedicated
  outreach subdomain (e.g., `mail.famtasticdesigns.com` or a separate `.com`) so the primary
  domain reputation is protected.
- **Mailbox / identity:** custom address `hello@famtasticdesigns.com` (GoDaddy custom email —
  assumed available per brief).
- **Sending capability:** GoDaddy email (SMTP `smtpout.secureserver.net`) is
  assumed available *but explicitly flagged non-blocking*. **ASSUMPTION/RISK:**
  GoDaddy/Microsoft 365 mailboxes throttle and are weak for cold volume; if
  reply rates or deliverability disappoint, swap the send layer to a dedicated
  cold-email ESP (Instantly/Smartlead-style) while keeping the same `famtasticdesigns.com`
  identity. The pipeline treats "send" as a pluggable interface so this swap is
  config-only.
- **Domain warmup:** 2–3 weeks ramp, SPF/DKIM/DMARC set on `famtasticdesigns.com` before any
  campaign volume. **ASSUMPTION:** start at ≤20 sends/day/mailbox, ramp slowly.

**Outreach asset:** personalized cold email referencing their current site, the
matching vertical case study, and the teardown CTA. Reply → book a 15-min call.

**Factory automation:** a `personalize` task (cheap model — pure triage) drafts
the first line from a prospect record; only `proposal` tasks escalate to the
strong model. Sends are stubbed offline and logged; the real send is a single
adapter function documented in SETUP.md.

---

## 6. Qualify → 7. Pitch/Propose

- **Qualify (BANT-lite, ASSUMPTION):** has a business + a phone number + an
  ugly/absent site + can decide. 2-question form on the landing page.
- **Pitch:** 15-min call. Script: mirror their teardown, show the vertical
  case study, anchor on Storefront $900 → upsell to Signature.
- **Proposal:** one-page, three-tier, "pick a box" + a single PayPal pay link.
  Generated by a `proposal` task (strong model — this is the high-stakes,
  high-complexity step the router escalates for).

---

## 8. Closing

- **Mechanism:** proposal contains a **50% deposit** PayPal link. Click = closed.
  Remaining 50% on delivery/approval.
- **Care Plan:** offered at handoff as "keep it fresh for $79/mo, first month
  free." **ASSUMPTION:** ~40% attach rate — this is the real LTV driver.

---

## 9. Invoicing & Payment Collection (PayPal Business)

**Account:** <PayPal Business — provided at activation> — **ASSUMPTION:** PayPal Business credentials are provided
at activation and the pipeline never moves money on its own until then.

**Flow:**
1. On close, create a **PayPal invoice** (deposit) via PayPal Invoicing API, or
   a hosted **payment link** for the deposit amount.
2. Webhook (`PAYMENT.SALE.COMPLETED` / `INVOICING.INVOICE.PAID`) flips the deal
   to *paid-deposit* → triggers the build (a factory `build` task).
3. On delivery approval, send the balance invoice; second webhook → *paid-full*.
4. Care Plan = PayPal **subscription** (recurring billing).

**Money-safety invariant:** in this sandbox every PayPal call is **mocked** and
logged; nothing is charged. `PAYPAL_ENV=sandbox` until the operator flips to
`live` deliberately. No card data ever touches the factory — PayPal hosts it.

**Reconciliation:** each paid deal records production cost (from `COSTS.log`
pattern) vs. revenue → true per-deal margin.

---

## 10. Delivery → 11. Upsell

- **Deliver:** the FAMtastic factory builds the site (existing pipeline). Hand
  off preview link → revision round → approval → balance invoice → publish.
- **Upsell loop:** Care Plan subscription + periodic "freshness" edits feed
  recurring revenue and referrals. Happy SMB → review → local SEO flywheel
  (back to §3).

---

## 12. Roles as agent-factory task types (how this maps to the factory)

| Pipeline stage | Task type | Routed model (typical) |
| --- | --- | --- |
| Personalize outreach line | `personalize` | cheap/triage |
| Expand campaign sequence | `outreach_campaign` | mid |
| Qualify inbound | `qualify` | cheap/triage |
| Write proposal | `proposal` | strong |
| Build the site | `build` | (FAMtastic factory, external) |
| Reconcile margin | `reconcile` | cheap/triage |

This is why the proof task lives in the factory: **the same orchestrator that
spawns/retires workers and routes by cost is the engine that would run this
revenue pipeline.** Throughput-per-dollar on outreach personalization is
literally the business's gross-margin lever.

---

## 13. 30-day activation plan (ASSUMPTION-driven)

1. **Week 1:** stand up `famtasticdesigns.com`, custom mailbox, SPF/DKIM/DMARC, PayPal
   Business sandbox, portfolio page from existing builds.
2. **Week 2:** pick 1 vertical × 1 city, build 50-prospect list, warm domain,
   draft sequence. Stand up the deposit PayPal link.
3. **Week 3:** launch campaign #1 (≤20 sends/day), book calls, send proposals.
4. **Week 4:** close first 1–3 deals, deliver via factory, attach Care Plans,
   write the case studies, compute real CAC/margin, then clone the campaign to
   the next vertical.

**North-star metric:** gross profit per outreach-hour. **Guardrail metric:**
domain deliverability (reply-rate proxy).

---

## 14. Open risks (logged)

- **R1 — Deliverability:** GoDaddy SMTP may not sustain cold volume. *Mitigation:*
  pluggable send adapter; swap ESP without touching the pipeline. (non-blocking)
- **R2 — Pricing:** $900 floor is an assumption; validate against first cohort.
- **R3 — Compliance:** keep CAN-SPAM opt-out + address; B2B only.
- **R4 — Capacity:** the factory must keep build SLAs as deal volume rises —
  this is exactly what the orchestrator's self-scaling solves.
- **R5 — Money safety:** never flip `PAYPAL_ENV=live` until reconciliation +
  refund policy are defined.
