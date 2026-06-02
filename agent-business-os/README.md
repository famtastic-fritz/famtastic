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
agent-business-os/
├── README.md
├── spec.json                  # FAMtastic site spec
├── api/                       # Azure Static Web Apps lead backend
│   ├── host.json
│   ├── package.json           # @azure/data-tables
│   └── lead/
│       ├── function.json      # anonymous POST → /api/lead
│       └── index.js           # validate, score, persist, webhook + Telegram
└── dist/                      # deploy artifact (app root)
    ├── index.html             # single-page landing
    ├── netlify.toml
    ├── staticwebapp.config.json
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
            ├── config.js      # runtime config: lead endpoint + booking URL
            └── landing.js     # nav state, reveals, ROI calculator, lead form
```

Built to FAMtastic DNA: layered `fam-hero-layered` hero (`--bg/--fx/--character/--content`),
`NAV_SKELETON` nav vocabulary, real SVG section dividers, multi-part logo
wiring, and zero inline styles. No build step — it's static HTML/CSS/JS.

## Local preview

```bash
cd agent-business-os/dist
python3 -m http.server 8080
# open http://localhost:8080
```

## Lead backend

The qualification form POSTs JSON to `window.ABOS_LEAD_ENDPOINT` (set in
`dist/assets/js/config.js`, default `/api/lead`). If the request fails — or the
endpoint is blank — the lead is saved to `localStorage` under `abos_leads` so
nothing is ever lost.

The backend lives in `api/lead/` as an **Azure Static Web Apps function**
(anonymous `POST /api/lead`). It validates `name`, `email`, and `bottleneck`;
scores fit (0–100) into `hot` / `warm` / `nurture` with a 15 / 60 / 240-minute
response SLA; drops spam via a `company_website` honeypot; then persists and
notifies. **Every integration is optional and fails soft** — with no env vars
set it still returns `200` so the form keeps working.

Payload:
`{ name, email, revenue, bottleneck, lift, start7, company_website, utm, submitted_at }`

Configure via app settings (all optional):

| Env var | Effect |
|---|---|
| `LEADS_TABLE_CONNECTION_STRING` | Persist to Azure Table Storage |
| `LEADS_TABLE_NAME` | Table name (default `inboundleads`) |
| `LEAD_WEBHOOK_URL` / `LEAD_WEBHOOK_TOKEN` | Forward each lead to a webhook |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` / `TELEGRAM_THREAD_ID` | Telegram alerts |

### Booking link

Set `window.ABOS_BOOKING_URL` in `dist/assets/js/config.js` to a Cal.com /
Calendly URL and every "Book Strategy Call" CTA opens the scheduler in a new
tab. Leave it blank and the CTAs scroll to the on-page qualification form.

## Deploy

**Azure Static Web Apps (recommended — includes the lead function):**
Workflow at `.github/workflows/azure-static-web-apps-agent-business-os.yml`
(app root `agent-business-os/dist`, API `agent-business-os/api`). To enable it:
1. Create an Azure Static Web Apps resource.
2. Add repo secret `AZURE_STATIC_WEB_APPS_API_TOKEN_ABOS` (the deployment token).
3. Add repo variable `ABOS_DEPLOY_ENABLED = true`.
4. Push to `main` — the workflow uploads `dist/` + `api/`.

**Static-only hosts** (Netlify / Vercel / GitHub Pages): publish `dist/`. The
lead form falls back to `localStorage` unless you point `ABOS_LEAD_ENDPOINT` at
a function you host separately.

Set DNS for `agentbusinessos.com` at the host once deployed.

## Status / next steps

- [x] Landing page, ROI calculator, qualification funnel, FAQ, pricing
- [x] Lead backend (`api/lead`) — validation, fit scoring, honeypot, Azure Table + webhook + Telegram, all fail-soft
- [x] Front-end wired to `/api/lead` with `localStorage` fallback
- [x] Booking-link hook (`ABOS_BOOKING_URL`) on every "Book Strategy Call" CTA
- [ ] Set a real `ABOS_BOOKING_URL` (Cal.com / Calendly)
- [ ] Create the Azure SWA resource + secret/variable, then push to `main`
- [ ] Configure lead env vars (table / webhook / Telegram)
- [ ] Add real logos/testimonials to the social-proof row
- [ ] Point `agentbusinessos.com` DNS at the chosen host
