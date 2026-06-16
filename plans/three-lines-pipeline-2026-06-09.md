# Three Lines In The Water — FAMtastic Revenue Pipeline

Created: 2026-06-09
Stream: income (primary), shay-platform (supporting), fritz (personal)
Status: ACTIVE — Phase 0 emergency, Phase 1 ready to build

---

## The Pipeline Vision

Three customer-facing properties that feed each other:

```
FAMtasticThoughts.com (content/deals/marketing engine)
         ↓ promotes
FAMtasticDesigns.com (e-commerce storefront, PayPal checkout)
         ↓ sources from
FAMtasticHosting.com (GoDaddy reseller backend, face-lifted storefront)
```

Cross-promotion rule: Everything sold on Hosting gets a promotional page on Thoughts.
PayPal receipt says "FAMtasticDesigns" — zero customer confusion.

---

## Phase 0 — EMERGENCY (This Week)

**[income]** famtasticthoughts.com expires June 29, 2026 — 20 days
- MUST transfer from reseller account to main GoDaddy account and renew
- Failure = domain loss = no content engine = pipeline broken before it starts

---

## Phase 1 — Three Lines In The Water (Weeks 1-2)

### Line 1: FAMtasticDesigns.com — The Storefront [income]

- **Current state**: Live at 132.148.233.159 (GoDaddy hosted), MX to Outlook, PayPal already tied
- **Stack**: TBD — Drupal is Fritz's comfort zone but not locked in. Evaluate per use case.
- **Features needed**:
  - Product catalog (bundles: Domain + Hosting + SSL + Email, a la carte options)
  - Shopping cart + PayPal checkout tied to Fritz's bank
  - Agent automation packages as products
  - App Building service promotion
  - Professional design samples / portfolio
- **Payment**: PayPal (existing) → bank account
- **Sourcing**: GoDaddy wholesale (reseller API) for domains, SSL, hosting, email
- **Branding**: Customer sees FAMtasticDesigns everywhere. GoDaddy is invisible.

### Line 2: FAMtasticThoughts.com — The Content Engine [income → research]

- **Current state**: Parked at 107.180.51.234 (GoDaddy)
- **Structure**:
  - `/articles/` — blog posts from bug logs, SITE-LEARNINGS, lessons learned
  - `/deals/` — promotional pages for everything on Hosting
  - `/thinking/` — FAMtastic philosophy, seed thesis content
  - Future: subscription/teaching layer for monetization
- **Content sources**: bug logs → blog posts, SITE-LEARNINGS → articles, accumulated research
- **Marketing function**: drives traffic to Designs checkout
- **Domain transfer**: Move from reseller to main GoDaddy account (same as Phase 0)

### Line 3: FAMtasticHosting.com — The Reseller Face Lift [income]

- **Current state**: Live reseller storefront (Slay/Envoy), needs redesign
- **Change**: Redesign storefront, redirect checkout to FAMtasticDesigns
- **Promotional pages**: For every product/service offered
- **Strategic role**: Brochure site funneling to the real store (Designs)
- **Critical rule**: GoDaddy = wholesale backend ONLY. Customer never sees store.famtastichosting.com.

---

## Phase 2 — Pipeline Proof (Weeks 2-3) [income + fritz]

### JJ BA Transport — Full Pipeline Test

**Context**: This is PERSONAL. Fritz's close friend from his Y. Fritz promised him a site, bragged about Site Studio building from a prompt, but the output was embarrassingly basic. He never pushed live. His friend probably thinks he forgot or can't deliver. REPUTATION AND RELATIONSHIP ON THE LINE.

**Pipeline test**:
1. Purchase domain through our reseller
2. Set up repo in FAMtastic ecosystem
3. Design a fire site (NOT basic — this redeems the promise)
4. Push to staging for client review
5. Go live
6. Client pays via PayPal → FAMtasticDesigns → bank account
7. Document the repeatable process

### MBSH Reunion — Finalization + Promotion [income]

- Design finalization: hero images, Hi-Tide Harry integration
- Start promotion — site is live, needs to be FOUND
- Brand builder with ecosystem links

---

## Phase 3 — Platform Backend (Weeks 3-4) [income + shay-platform]

### FAMtastic Dashboard (on famtasticinc.com or FAMtastic domain)

- Management dashboard for ALL deployed sites
- Order tracking, client management, revenue reporting
- Google Analytics integration for every deployed site
- Command center for the entire operation
- Tracks what all three lines produce

---

## Phase 4 — Parallel Builds (Ongoing)

These run alongside revenue lines but don't block money:

### [shay-platform] Site Studio refactor
- Strip monolith to modular
- Site Studio = site lifecycle ONLY
- Other components become independent systems with ecosystem connections

### [shay-platform] Shay Ph9 Live Cutover
- Switch flip for new Shay platform codebase
- Must be done with Fritz at keyboard

### [income] Tool/subscription discovery audit
- Audit ALL paid subscriptions Fritz has
- Find what's not being leveraged
- Surface money left on the table
- Quick win for cost savings or additional capability

### [research] External repo adoption
- Fritz has repos to incorporate into FAMtastic flow

### [research] arena.ai prototyping
- Free prototyping while other stuff gets built
- Leverage for rapid mockups

---

## Phase 5 — Marketing Engine (After Lines Are Live) [income]

- Open Design campaign
- Email marketing (Resend + possibly more)
- Ad creation and posting
- Content calendar powered by Thoughts content
- ai-web-agency pipeline for lead gen (Google Maps → build proof → sell hosting)

---

## Stack Decision Framing

| Property | Fritz's Comfort | Best Fit? | Options |
|----------|----------------|-----------|---------|
| FAMtasticDesigns | Drupal | TBD | Drupal, WordPress+ WooCommerce, Next.js+Shopify, custom |
| FAMtasticThoughts | Drupal | TBD | Drupal, WordPress, Astro, Next.js, Ghost |
| FAMtasticHosting | GoDaddy reseller | Keep reseller storefront, face-lift | Custom overlay, redirect to Designs |

Decision criteria:
- **Designs**: Needs e-commerce, cart, checkout, PayPal integration, product catalog
- **Thoughts**: Needs blog, SEO, content management, subscription-ready
- **Hosting**: Needs to look professional and funnel to Designs

---

## Dependencies

```
Phase 0 (URGENT domain) → Phase 1 (three lines) → Phase 2 (pipeline proof)
                                                      ↓
Phase 3 (platform backend) ← watches the flow
                                                      ↓
Phase 4 (parallel builds) ← runs alongside, doesn't block
                                                      ↓
Phase 5 (marketing) ← scales the flow
```

---

## Domain Portfolio (Current State)

| Domain | DNS | Status |
|--------|-----|--------|
| famtasticdesigns.com | 132.148.233.159 (GoDaddy) | Live, blank, PayPal tied, MX to Outlook |
| famtasticthoughts.com | 107.180.51.234 (GoDaddy) | Parked. **EXPIRES JUNE 29** |
| store.famtastichosting.com | GoDaddy reseller (Slay) | Live, needs face lift |
| famtasticinc.com | 107.180.51.234 (GoDaddy) | Active, candidate for platform backend |
| mbsh96reunion.com | 75.2.60.5 (Netlify) | Live, needs finalization |
| famtastic.com | In sites/ directory | Main brand site |

---

## Cost Summary (from earlier analysis)

- **New monthly**: ~$4.19/mo (self-managed VPS, replaces $13.99/mo cPanel)
- **Already paying**: $149.90/mo reseller plan
- **One-time**: ~$24-32 for domain acquisitions + famtasticthoughts.com renewal
- **Transaction**: Stripe/PayPal 2.9% + 30¢ per sale (no monthly)
- **SSL**: Free via Let's Encrypt on self-managed VPS

---

*Stream tags: income, shay-platform, research, fritz*