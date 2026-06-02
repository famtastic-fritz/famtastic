# Agent Business OS — Landing Site

**Tagline:** *Your business runs itself. You run your business.*

A FAMtastic-built landing site for **Agent Business OS** — a done-for-you
autonomous revenue-operations service. It captures demand, qualifies buyers,
converts pipeline, and delivers fulfillment across four agent layers, with
founder control at every gate.

Adapted from the zero-human / Agent Business OS concept
([IAMGODIAM/zero-human-business-landing](https://github.com/IAMGODIAM/zero-human-business-landing))
into a single, distinctive FAMtastic landing page. Canonical destination:
`agentbusinessos.com`.

## The offer at a glance

- **Four execution layers** — Capture → Decision → Conversion → Fulfillment
- **One founder control plane** — auditable logs + escalation thresholds
- **Time to first signal:** 48–96 hours · **Full rollout:** 30 days
- **ICP:** founder-led services, agencies, and operators targeting
  $10k–$100k of monthly revenue lift, ready to start within 7 days
- **Pricing:** Starter ($2,500 setup) · Performance Sprint ($3,500 + $1,500/mo) · Scale (custom)

## Structure

```
sites/site-agent-business-os/
├── README.md
├── spec.json                  # FAMtastic site spec
└── dist/                      # deploy artifact (publish this directory)
    ├── index.html             # single-page landing
    ├── netlify.toml
    ├── robots.txt
    ├── sitemap.xml
    └── assets/
        ├── logo-full.svg      # icon + wordmark (nav, footer)
        ├── logo-icon.svg      # icon only (favicon)
        ├── logo-wordmark.svg  # wordmark only
        ├── css/
        │   ├── base.css       # tokens, reset, nav, footer, dividers, buttons
        │   └── landing.css    # layered hero, sections, calculator, pricing, form
        └── js/
            └── landing.js     # nav state, reveals, ROI calculator, lead form
```

Built to FAMtastic DNA: layered `fam-hero-layered` hero (`--bg/--fx/--character/--content`),
`NAV_SKELETON` nav vocabulary, real SVG section dividers, multi-part logo
wiring, and zero inline styles. No build step — it's static HTML/CSS/JS.

## Local preview

```bash
cd sites/site-agent-business-os/dist
python3 -m http.server 8080
# open http://localhost:8080
```

## Wiring the lead form to a backend

The qualification form posts to whatever endpoint you set on
`window.ABOS_LEAD_ENDPOINT`. Until that's set, leads are stored in
`localStorage` under the `abos_leads` key so nothing is lost.

```html
<!-- add before assets/js/landing.js -->
<script>window.ABOS_LEAD_ENDPOINT = "/api/lead";</script>
```

The original concept repo ships Azure Static Web Apps Functions
(`/api/lead`, `/api/leads`, `/api/kpi`) — point `ABOS_LEAD_ENDPOINT` at
`/api/lead` to reuse that backend, or any endpoint that accepts a JSON POST
with `{ name, email, revenue, bottleneck, lift, start7, utm, submitted_at }`.

## Deploy

Static — deploy the `dist/` directory to any host:

- **Netlify:** publish `dist/` (config in `dist/netlify.toml`).
- **Azure Static Web Apps / GitHub Pages / Vercel:** serve `dist/` as the site root.

Set DNS for `agentbusinessos.com` at the host once deployed.

## Status / next steps

- [x] Landing page, ROI calculator, qualification funnel, FAQ, pricing
- [ ] Connect `ABOS_LEAD_ENDPOINT` to a live lead backend
- [ ] Wire booking link (Cal.com / Calendly) into "Book Strategy Call" CTAs
- [ ] Add real logos/testimonials to the social-proof row once available
- [ ] Point `agentbusinessos.com` DNS at the chosen host
