# Hosting Options: What Can FAMtastic Actually Sell?

**Date:** 2026-06-07
**Purpose:** Go/no-go decision on monetizing the dormant GoDaddy reseller account.
**Bottom line up front:** GoDaddy reseller can sell domains, shared hosting, WordPress hosting, email, SSL, and website security. It CANNOT sell VPS or dedicated servers. The highest-margin play is bundling managed WordPress + professional email + SSL for small businesses at $25-40/mo. To hit $100/mo per project, we'd need 3-4 clients per project or a single higher-tier client.

---

## 1. GoDaddy Reseller Program (Current State, 2026)

The program is alive and unchanged in structure. Three tiers exist:

| Plan | Cost (promo annual) | Cost (renewal annual) | Customer Limit | Discount vs Retail |
|------|-------------------|----------------------|----------------|-------------------|
| Basic Reseller | $53.88/yr | $107.88/yr ($8.99/mo) | 25 customers | ~20% off retail |
| Pro Reseller | $89.88/yr | $179.88/yr ($14.99/mo) | Unlimited | ~40% off retail |
| API Reseller | Custom | Custom | Unlimited | Developer self-integration |

**Recommendation:** Pro Reseller ($89.88/yr promo) — the 40% discount doubles margins on most products vs Basic, and the price difference pays for itself after one SSL sale.

### What You CAN Sell (Pro Reseller Wholesale Rates)

| Product | Wholesale (Pro) | GoDaddy Retail | Realistic Our Price |
|---------|----------------|----------------|-------------------|
| .com domain (yr) | $11.59 | $12-15 | $18-25 |
| .net domain (yr) | $14.99 | $16-20 | $22-30 |
| .org domain (yr) | $12.58 | $13-16 | $20-28 |
| .co domain (yr) | $31.19 | $35-40 | $40-50 |
| Professional Email Individual (mo) | $1.61 | $5.99 | $7-10 |
| Professional Email Group (mo) | $2.12 | $7.99 | $10-15 |
| Microsoft 365 Essentials (mo) | $4.29 | $7.99 | $9-12 |
| Microsoft 365 Professional (mo) | $11.42 | $22.00 | $18-22 |
| SSL Standard (yr) | $31.73 | $69.99 | $60-90 |
| Website Builder Personal (mo) | $4.13 | $9.99 | $12-18 |
| Website Builder Business Plus (mo) | $10.44 | $16.99 | $20-30 |
| Website Security Standard (mo) | $4.43 | $9.99 | $12-18 |
| Website Security Premium (mo) | $22.21 | $49.99 | $40-55 |
| Web Hosting cPanel Starter (mo) | $3.99 | $8.99 | $10-15 |
| Web Hosting cPanel Ultimate (mo) | $17.59 | $25.99 | $28-35 |
| Web Hosting Plus Launch (mo) | $20.90 | $29.99 | $35-45 |
| Web Hosting Plus Expand (mo) | $72.44 | $99.99+ | $100-130 |
| Managed WordPress Basic (mo) | $7.01 | $11.99 | $15-20 |
| Managed WordPress Ultimate (mo) | $13.67 | $21.99 | $25-32 |
| Email Marketing Beginner (mo) | $7.15 | $13.99 | $15-20 |
| Email Marketing Pro (mo) | $20.66 | $29.99 | $30-40 |

### What You CANNOT Sell

- **VPS Hosting** — NOT available through Basic/Pro reseller. This is the biggest gap.
- **Dedicated Servers** — GoDaddy discontinued these entirely in 2024.
- Microsoft 365 add-ons
- GoDaddy Pro (agency tools)
- GoDaddy Conversations (business phone)
- Website design services

---

## 2. Pricing & Margin Structure

**How it works:** You set retail prices above wholesale. Customer pays you (via GoDaddy's payment processing). GoDaddy keeps the wholesale amount; you keep the spread as commission. No merchant account needed.

**Markup method:** You can set markups as flat amounts, percentages, or a global pricing rule across the catalog.

**Typical margins (Pro Reseller):**

| Product Category | Wholesale | Suggested Retail | Margin | Margin % |
|-----------------|-----------|-----------------|--------|----------|
| .com domain | $11.59 | $20 | $8.41 | 42% |
| SSL Standard | $31.73 | $75 | $43.27 | 58% |
| Pro Email (mo) | $1.61 | $8 | $6.39 | 80% |
| Managed WP Basic (mo) | $7.01 | $18 | $10.99 | 61% |
| Web Hosting Plus Expand (mo) | $72.44 | $115 | $42.56 | 37% |

**Minimum viable pricing:** Charge at minimum 1.5x wholesale to cover the annual reseller fee ($89.88) and remain profitable. SSL and email have the best margin-to-effort ratio.

---

## 3. VPS Specifically

**The hard truth: GoDaddy resellers cannot sell VPS.**

True VPS (root access, dedicated virtualized resources, OS choice) is excluded from the reseller catalog. The wholesale rate sheet has no VPS tier.

**The closest alternative — "Web Hosting Plus":**
This is GoDaddy's VPS-adjacent product. It provides dedicated CPU and RAM within a shared architecture, but without root access.

| Tier | CPU Cores | RAM | Storage | Wholesale (Pro) |
|------|-----------|-----|---------|----------------|
| Launch | 2 | 4 GB | 100 GB SSD | $20.90/mo |
| Expand | 4 | 8 GB | 200 GB SSD | $72.44/mo |

If a client needs actual VPS/root access, we'd need a different provider (see Section 6).

---

## 4. White-Label vs GoDaddy-Branded

**Fully white-label.** The reseller storefront shows YOUR brand name, not GoDaddy's. Specifically:

- Custom storefront with your business name and logo
- Custom domain (e.g., hosting.famtasticstudios.com)
- Products display under your brand
- Customer sees your company, not GoDaddy
- GoDaddy handles payment processing invisibly
- GoDaddy provides white-label 24/7 English support for your customers
- Customer accounts are managed through your control panel

**Caveat:** The storefront uses GoDaddy's template system. Customization is limited to colors, logo, domain, and layout choices — not a fully custom website. For deeper customization, the WordPress plugin or API Reseller plan allows integration into your own site.

**Verdict:** Yes, it can be "FAMtastic Hosting" with zero GoDaddy branding visible to customers.

---

## 5. Reseller Control Panel / API

**Basic/Pro Reseller — Turnkey storefront (no coding):**
- Reseller Control Center: manage products, pricing, promotions, reports
- Pre-built storefront auto-provisions orders — customer buys, product is set up automatically
- GoDaddy handles all provisioning, billing, support, renewals
- WordPress plugin available: adds domain search + cart to any WP site
- Zero manual work after initial setup

**API Reseller — Full developer integration:**
- REST API for domain registration, DNS, and related services
- Requires passing a certification test before going live
- You build your own storefront entirely
- Best for: integrating into an existing platform or custom workflow

**For a 1-man + 1-AI operation:** The Basic/Pro storefront is the right starting point. It's zero-maintenance. The customer experience is: visit your branded store → buy → auto-provisioned → done. We never touch it manually.

---

## 6. Alternative Reseller Programs

If we need VPS capability or better margins on specific products:

### ResellerClub (resellerclub.com)
- **Pros:** Volume-based pricing slabs ($199-$499+ deposit unlocks lower rates). Full white-label. VPS AND dedicated available. Strong API. Domain + hosting + email + SSL + security all in one platform.
- **Cons:** Deposit-based pricing means upfront capital. Smaller brand recognition. Support quality varies.
- **Best for:** If we need VPS reselling or want the broadest product catalog.

### Namecheap Reseller (namecheap.com/hosting/reseller)
- **Pros:** Three flexible plans. You set prices. Hosting-focused (cPanel reseller). Strong brand trust.
- **Cons:** Hosting-only, not a full domain/email/SSL ecosystem. No true VPS reselling.
- **Best for:** Simple hosting reselling with low overhead.

### Enom / Tucows (enom.com)
- **Pros:** Domain-focused with excellent API. SSL + email available. Mature platform. WHMCS integration.
- **Cons:** No hosting or VPS. Domain + email + SSL only.
- **Best for:** Domain-heavy business or complementing a hosting provider.

**Quick comparison:**

| Feature | GoDaddy | ResellerClub | Namecheap | Enom |
|---------|---------|-------------|-----------|------|
| Domains | Yes | Yes | Limited | Yes (best) |
| Shared Hosting | Yes | Yes | Yes | No |
| VPS | No | Yes | No | No |
| WordPress Hosting | Yes | Yes | No | No |
| SSL | Yes | Yes | No | Yes |
| Email/Workspace | Yes | Yes | No | Yes |
| White-label | Full | Full | Partial | Full |
| API | Yes | Yes | No | Yes (best) |
| Auto-provision | Yes | Yes | Yes | Yes |
| Startup cost | $90/yr | $199+ deposit | ~$15-30/mo | Free |

---

## 7. The Verdict — Top 3 Products to Lead With

For a 1-man + 1-AI operation targeting $100/mo per seed project, using GoDaddy Pro Reseller:

### Lead Product 1: Managed WordPress Hosting Bundle
**Bundle:** Managed WordPress Ultimate ($13.67 wholesale) + Professional Email ($1.61 wholesale) + SSL Standard ($31.73/yr = $2.64/mo amortized) + .com domain ($11.59/yr = $0.97/mo amortized)
- **Total wholesale:** ~$18.89/mo + $43.32/yr upfront
- **Sell at:** $35-45/mo (billed monthly, domain/SSL included)
- **Margin:** $16-26/mo recurring + domain/SSL markup
- **Why:** WordPress powers 43% of websites. Small businesses need this. High perceived value. Low support burden (GoDaddy handles it).

### Lead Product 2: Business Email + Domain Starter Pack
**Bundle:** Professional Email Group ($2.12/mo wholesale) x 3 addresses + .com domain ($11.59/yr wholesale) + SSL Standard ($31.73/yr wholesale)
- **Sell at:** $25-35/mo or $299-399/yr
- **Margin:** ~60-70%
- **Why:** Lowest barrier to entry. Every new business needs email + domain. Great upsell funnel to hosting later. Near-zero support — email just works.

### Lead Product 3: Web Hosting Plus (VPS-Alternative)
**Bundle:** Web Hosting Plus Launch ($20.90/mo wholesale) + SSL + Website Security Standard ($4.43/mo wholesale)
- **Sell at:** $45-60/mo
- **Margin:** $20-35/mo recurring
- **Why:** For clients who outgrow shared hosting or need more resources. Closest thing to VPS we can offer. Higher ticket = fewer clients needed to hit $100/mo. Two clients = $100/mo.

### Path to $100/mo per project

| Strategy | Mix | Monthly Revenue |
|---------|-----|----------------|
| Volume (email/domain) | 4 starter packs @ $25 | $100 |
| Balanced (WP bundles) | 3 WP bundles @ $35 | $105 |
| Premium (hosting plus) | 2 Web Hosting Plus @ $55 | $110 |

**The math:** With Pro Reseller at $89.88/yr, we break even after selling ~4-5 WordPress bundles. Everything after that is profit. The reseller fee is negligible at scale.

### Go/No-Go Recommendation

**GO** — but with eyes open:
- We cannot sell VPS. If clients need root access, refer them out or use a ResellerClub account alongside GoDaddy.
- The white-label storefront and auto-provisioning make this a genuine passive income stream once set up.
- Start with the Pro Reseller plan ($89.88/yr promo), configure the storefront as "FAMtastic Hosting," set markups at 1.5-2x wholesale, and lead with the Managed WordPress Bundle.
- The annual reseller fee ($90-180/yr) is the only fixed cost. No inventory, no servers, no merchant account, no support burden.

**Next steps if approved:**
1. Log into the existing reseller account, verify it's still active or reactivate
2. Upgrade to Pro Reseller if currently on Basic
3. Configure storefront branding as FAMtastic Hosting
4. Set product markups (global 1.75x rule, then tune SSL higher)
5. Build a landing page on famtasticstudios.com linking to the reseller storefront
6. Pitch the WordPress bundle to existing FAMtastic site clients as a natural upsell
