# FAMtastic Ecosystem Master Brief

**Status:** In Progress  
**Owner:** Fritz  
**Goal:** Three branded properties that sell into each other, plus automation/app revenue streams.

---

## The Three Properties

### 1. FAMtastic Hosting (`famtastichosting.com`)
- **Purpose:** Revenue pipe for domains, hosting, email, SSL, website builder, security.
- **Model:** GoDaddy Pro Reseller white-label. We brand it; GoDaddy fulfills it.
- **Local path:** `/Users/famtasticfritz/famtastic/sites/site-famtastic-hosting/`
- **Current State:** Live Astro SSR site with editable homepage, auth, cart, admin, customer dashboard. Live PayPal + GoDaddy API wired; real auto-provisioning still pending.
- **Priority:** Fix real GoDaddy/cPanel provisioning next.

### 2. FAMtastic Designs (`famtasticdesigns.com`)
- **Purpose:** Lead engine + high-ticket custom design/services sales.
- **Model:** Proof-to-profit outreach. Discover local businesses/churches → generate preview sites → claim/pay funnel.
- **Local path:** `/Users/famtasticfritz/famtastic/sites/site-famtastic-designs/`
- **Current State:** Content model + sample collection flow documented; Drupal build exists; Next.js/pipeline build in progress elsewhere.
- **Priority:** Make it a platform to collect sample website links and sell any service/product. Extendable catalog.
- **Tech:** Drupal headless CMS + Next.js 15 + R3F 3D gallery.

### 3. FAMtastic Thoughts (`famtasticthoughts.com`)
- **Purpose:** Content engine. Capture thoughts, reviews, interviews, product reviews, lessons learned.
- **Model:** Editorial content drives SEO and cross-sells Hosting/Designs.
- **Local path:** `/Users/famtasticfritz/famtastic/sites/site-famtastic-thoughts/`
- **Current State:** Content model + capture flow + sample data defined. Project skeleton created.
- **Priority:** Build capture-first CMS + 3D constellation homepage.
- **Tech:** Astro (server output) + SQLite/Markdown + voice/email/web capture.

---

## Revenue Streams

| Stream | Property | Product | Price Range |
|--------|----------|---------|-------------|
| Hosting | Hosting | WordPress Launch bundle | $35/mo |
| Email + Domain | Hosting | Small Biz Starter | $299/yr |
| Servers | Hosting | Web Hosting Plus | $45-60/mo |
| Custom Design | Designs | Logo / Brand / Site | $300 - $1,500+ |
| Design + Hosting | Cross-sell | Designs Complete | $1,500 + $40/mo |
| Apps/Automation | Future | Chrome extensions, SaaS tools, AI agents | TBD |
| Google Play Store | Future | Android apps, widgets | TBD |
| Advertising | Promotion | Sponsored content, affiliate reviews | TBD |

---

## Cross-Sell Rules

- **Hosting → Designs:** Every product page has a Design Bridge: "Need a site too?"
- **Hosting → Thoughts:** Every page has a Thoughts strip linking to relevant articles.
- **Designs → Hosting:** Every design package includes a hosting bundle upsell.
- **Designs → Thoughts:** Case studies link to process/lesson articles.
- **Thoughts → Hosting:** Articles about hosting/domains/SSL link to product pages.
- **Thoughts → Designs:** Articles about design/branding link to design services.

---

## Shared Design Language

- **Metaphor:** Orbit / Constellation. Everything revolves around the customer's business.
- **3D layer:** Immersive entry on each homepage. Progressive enhancement — static fallback if WebGL fails.
- **Color anchors:**
  - Hosting: deep violet/black + electric violet + terminal green
  - Designs: fam-burst green (#2EE56B) + ink black + tri-color F-A-M marks
  - Thoughts: warm amber/gold + deep black + signal-pink highlights

---

## Automation/App Ideas (Revenue Later)

- **FAMtastic Agent Browser Extension:** One-click site analysis for leads (for Designs pipeline).
- **Thoughts Mobile App:** Voice-to-thought capture for content creation.
- **Hosting Status Widget:** Android widget for customers to see uptime/renewals.
- **Local Business Scanner App:** Photo + notes → auto-generates preview site pitch.

---

## Promotion Engine (Phase After Build)

1. **SEO:** Thoughts articles rank for buyer keywords.
2. **Direct Outreach:** Designs pipeline targets local businesses.
3. **Referrals:** Hosting customers get credit for referring design clients.
4. **Content Ads:** Promote high-value Thoughts articles on social/search.
5. **Affiliate Reviews:** Review hosting/design tools, link to our products.

---

## Current Execution Focus

1. ✅ Wire hosting homepage to existing content editor.
2. ✅ Add editable editorial sections to hosting.
3. ✅ Cross-promo strips to Designs/Thoughts.
4. ✅ Content models + sample flows for Designs and Thoughts.
5. **Next:** real GoDaddy/cPanel provisioning.
6. **Next:** Designs capture-first platform / CMS + 3D gallery.
7. **Next:** Thoughts capture-first CMS + 3D constellation homepage.
