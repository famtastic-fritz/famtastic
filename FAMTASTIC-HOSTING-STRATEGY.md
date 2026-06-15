# FAMtastic Hosting + Designs — Capabilities, Costs & Strategy

**Status:** Live strategy document
**Date:** 2026-06-07
**Owner:** Fritz (decisions) / Shay (orchestration)
**Source research:** `~/famtastic/research/hosting-options.md`

---

## The Play in One Sentence

FAMtastic Designs is the front-door brand. When a customer buys a bundle (design + hosting + email + domain), a config hook registers the component orders to GoDaddy via reseller API. We own the relationship and the brand experience; GoDaddy handles provisioning, payments, and support invisibly.

---

## What We Can Sell (Capabilities Inventory)

**Through GoDaddy Pro Reseller (current account path):**

| Capability | Wholesale | Realistic Retail | Margin |
|---|---|---|---|
| .com domain (yr) | $11.59 | $18-25 | 42% |
| .net / .org / .co domains | $12-31 | $20-50 | 35-45% |
| Professional Email (mo) | $1.61 | $7-10 | 80% |
| Microsoft 365 (mo) | $4.29-11.42 | $9-22 | 50-110% |
| SSL Standard (yr) | $31.73 | $60-90 | 58% |
| Website Builder (mo) | $4.13-10.44 | $12-30 | 65-190% |
| Website Security (mo) | $4.43-22.21 | $12-55 | 60-150% |
| cPanel Hosting (mo) | $3.99-17.59 | $10-35 | 100-150% |
| Managed WordPress (mo) | $7.01-13.67 | $15-32 | 60-130% |
| Web Hosting Plus (mo) | $20.90-72.44 | $35-130 | 37-80% |
| Email Marketing (mo) | $7.15-20.66 | $15-40 | 50-110% |

**What we CANNOT sell through GoDaddy:**
- VPS (true root access virtualized servers) — excluded from reseller catalog
- Dedicated servers — discontinued by GoDaddy in 2024
- M365 add-ons, GoDaddy Pro, Conversations phone, design services

**Workaround for VPS/root needs:** Either refer the client out, or open a parallel ResellerClub account ($199+ deposit) which DOES offer VPS reselling. Decision deferred until we have a client that actually needs it.

---

## Real Costs (The Honest Ledger)

| Cost Item | Amount | Frequency |
|---|---|---|
| GoDaddy Pro Reseller (promo) | $89.88 | annual |
| GoDaddy Pro Reseller (renewal) | $179.88 | annual after year 1 |
| Hetzner VPS (Shay always-on) | $5-10 | monthly |
| Mac mini back home | $0 ongoing | already owned |
| Domain for FAMtastic Hosting storefront | ~$12 | annual |
| Site Studio time (we build the front site) | $0 | internal |
| Customer support burden | $0 | GoDaddy handles invisibly |
| Merchant account | $0 | GoDaddy processes payments |

**Break-even:** Pro Reseller fee ($89.88) is covered after selling ~4-5 Managed WordPress bundles. Everything after that is margin.

**No inventory. No servers. No merchant fees. No support burden.**

---

## The Product Architecture — FAMtastic Designs as Front Door

### Product 1: FAMtastic Designs (the brand-layer product)
- This is what we market. Custom site design + brand work.
- Built by Site Studio. Priced as a project fee + monthly care plan.
- **Hook:** When a Designs contract closes, we register the underlying infrastructure (hosting, domain, email, SSL) to GoDaddy automatically via config hook.
- **Customer sees:** One purchase, FAMtastic Designs. Period.
- **Backend sees:** Designs revenue + hosting commission + email commission + SSL commission — all from one event.

### Product 2: Bundle Combos (campaign-driven)
Pre-built combos for specific campaigns (FAMU cruise launch, MBSH reunion season, small business month, etc.):

| Bundle | Components | Retail | Our Cost | Margin |
|---|---|---|---|---|
| **Small Biz Starter** | Domain + 3 emails + SSL | $299/yr | $77/yr | $222 |
| **WordPress Launch** | Managed WP + Email + SSL + Domain | $35-45/mo | $18.89/mo | $16-26/mo recurring |
| **Growth Hosting** | Web Hosting Plus + Security + SSL | $45-60/mo | $27/mo | $20-35/mo recurring |
| **Designs Complete** | Custom design + WP Launch bundle | $1,500-5,000 + $40/mo | Time + $18.89/mo | ~80% on design + recurring |

### The Config Hook Pattern (how bundles become orders)

```
Customer buys bundle on famtastic-designs.com
        ↓
Config hook fires with bundle definition
        ↓
Hook translates bundle → individual GoDaddy SKUs
        ↓
GoDaddy API provisions each component
        ↓
Customer receives single FAMtastic-branded confirmation
        ↓
Recurring billing handled by GoDaddy invisibly
```

**Phase 1 (now):** Manual bundle registration — we sell, we manually configure in reseller panel.
**Phase 2 (after storefront live):** Automated via WordPress plugin or storefront API.
**Phase 3 (full platform):** Custom Site Studio site with full API Reseller integration, singlecheckout, fully branded.

---

## Strategy — How We Get Lines in the Water

### Phase 1: Inventory & Activate (this week)
1. Verify reseller account status (active or reactivate)
2. Confirm tier (Basic → upgrade to Pro if needed)
3. Configure storefront branding: "FAMtastic Hosting"
4. Set markups: global 1.75x wholesale, SSL tuned to 2.5x
5. Point custom domain at reseller storefront

### Phase 2: Front Door Build (parallel, Site Studio)
1. Build famtastic-designs.com (or subpath) as Site Studio output
2. Present FAMtastic Designs as the product, not raw hosting
3. Configure bundle combos as product listings
4. Connect buy-flow → reseller checkout (redirect initially, API later)

### Phase 3: Marketing Lines
1. Pitch Designs bundle to existing site clients (MBSH, future projects)
2. FAMU cruise June 26 = live audience — Designs cards + QR to bundle page
3. Reseller store SEO (GoDaddy handles some of this)
4. Referral loop: every Designs client becomes a hosting client

### Phase 4: Automation Layer
1. API Reseller certification (when volume justifies)
2. Custom Site Studio checkout (full white-label, no redirect)
3. Customer dashboard inside FAMtastic ecosystem
4. Recurring revenue dashboard for Fritz

---

## Why This Works for 1-Man + 1-AI

- **No support burden:** GoDaddy 24/7 white-label support handles all customer issues.
- **No inventory:** All products are digital, provisioned instantly.
- **No merchant fees:** GoDaddy processes payments, takes their cut invisibly.
- **No manual work after setup:** Auto-provisioning means we sell once and collect recurring revenue.
- **The account pays for itself:** Even one Designs client per year covers the reseller fee. Everything else is margin.
- **FAMtastic Designs adds the premium layer:** The design work is where we add real value and command premium pricing. The hosting/email/SSL is recurring revenue on top.

---

## The Math (Long View)

| Milestone | Revenue | Notes |
|---|---|---|
| 1 Designs client + 1 WP bundle | $1,500 + $35/mo | Year 1 baseline |
| 5 Designs clients + 10 hosting bundles | $7,500 + $350/mo recurring | Year 1 target |
| 20 Designs clients + 40 hosting bundles | $30,000 + $1,400/mo recurring | Year 2 trajectory |

Each hosting bundle is a seed in the FAMtastic architecture. Each Designs client compounds — they bring hosting, email, SSL, renewals, referrals. The 1,000-projects / $100-mo goal isn't abstract — it's 1,000 bundles live, each producing $100/mo average. We're building the engine for that now.

---

## Open Decisions (Fritz Holds These)

1. **Reseller account status** — is it currently active? When did it last renew? Need to log in and confirm.
2. **Tier** — currently Basic or Pro? Upgrade justified?
3. **Custom domain** — what's the storefront URL going to be? hosting.famtasticstudios.com? designs.famtastic.com? Something standalone?
4. **Designs pricing** — what's the project fee structure for the design work itself?
5. **FAMU cruise scope** — does Designs have a presence there (cards, QR codes, mini-pitch)?

---

## Standing Rules for This Strategy

- Updates to this document are logged in CHANGELOG.md
- Wholesale rates are subject to GoDaddy changes — re-verify quarterly
- New product ideas go in the backlog, not directly into this doc
- Anytime a new bundle is designed, it gets added to the Bundle Combos table
- The config-hook pattern stays the integration target — manual is temporary, automation is the destination
