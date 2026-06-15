---
title: FAMtastic-Hosting-GoDaddy-Data-Dump
type: note
permalink: famtastic/02-income/famtastic-hosting-go-daddy-data-dump-1
---

# FAMtastic Hosting — GoDaddy Data Dump

**Date:** 2026-06-11
**Source:** GoDaddy API (sso-key auth)
**Purpose:** Data-first schema design for MySQL backend on cPanel

## Pricing Scale

All GoDaddy API monetary values are in **microdollars** — divide by 1,000,000 for USD.

**Pro Reseller Plan: $179.88/year** (API: `179880000`)

## Domains (13 total)

### Active (4)
| Domain | Expires | Status | Privacy | Locked |
|--------|---------|--------|---------|--------|
| famtasticdesigns.com | 2027-04-08 | ACTIVE | Yes | Yes |
| famtastichosting.com | 2027-04-08 | ACTIVE | Yes | Yes |
| famtasticinc.com | 2027-04-10 | ACTIVE | Yes | Yes |
| mbsh96reunion.com | 2027-11-13 | ACTIVE | Yes | Yes |

### Pending DNS (3)
- thestreetfamilyhistory.com
- thetwincessdiaries.com
- thetwincessdiaries.org

### Cancelled (6)
- developeddreamz.com, exoticdesirez.com, ftpiercelodge155.org, ftpiercercelogde155.org, monopolizedinvestmentgroup.com, thestreetfamilyhistory.org

## Domain Detail Structure (from API)

Each domain returns these fields:
```
authCode, contactRegistrant (nameFirst, nameLast, email, phone, addressMailing), 
createdAt, domain, domainId, expirationProtected, expires, exposeWhois, 
holdRegistrar, locked, nameServers, privacy, registrarCreatedAt, renewAuto, 
renewDeadline, renewable, redeemable, status, transferProtected
```

## Orders (97 total, 2009-2026)

**Total account spend: ~$56,987 over 17 years**

### Unique Order Item Labels
- .COM Domain Name Registration - 1 Year (recurring)
- .COM Domain Name Registration - 2 Years (recurring)
- .COM Domain Name Renewal - 1 Year (recurring)
- .COM Domain Name Renewal - 2 Years (recurring)
- .ORG Domain Name Registration - 1 Year (recurring)
- .ORG Domain Name Renewal - 1 Year (recurring)
- Bandwidth Renewal (recurring)
- Basic Reseller Plan Fee (annual)
- Basic Reseller Plan Fee - Renewal (annual)
- Domain Consolidation
- Hosting - Classic - Deluxe - Linux - Renewal - Monthly (recurring)
- Hosting - Classic - Deluxe - Windows - 2 years (recurring)
- Hosting - Web - Deluxe - Linux cPanel - US Region - 3 Month (recurring)
- Hosting - Web - Deluxe - Linux cPanel - US Region - Renewal - 1 years (recurring)
- Hosting - Web - Economy - Linux cPanel - US Region - Renewal - 1 years (recurring)
- Microsoft 365 - Email - Monthly
- Microsoft 365 Email Essentials - 1 Year
- Microsoft 365 Email Essentials - Renewal - 1 Year
- Pro Reseller Plan Fee (annual)
- Pro Reseller Plan Fee - Renewal (annual)
- Renewal Usage

### Order Item Structure (SPARSE — only label field)
```json
{
  "label": ".COM Domain Name Renewal - 1 Year (recurring)"
}
```
No per-item pricing, no product ID, no quantity. Only order-level total in microdollars.

### Order Structure
```json
{
  "createdAt": "2026-04-11T14:18:40.000Z",
  "currency": "USD",
  "items": [{ "label": "..." }],
  "label": "...",
  "orderId": "4061772291",
  "pricing": { "total": 23190000 }
}
```

## API Access Limitations

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /v1/domains | Working | 13 domains, full detail |
| GET /v1/domains/{domain} | Working | Full detail including authCode, contacts |
| GET /v1/domains/{domain}/records | Working | All DNS records |
| GET /v1/orders | Working | 97 orders, sparse item data |
| GET /v1/customers | 401 | sso-key not supported |
| GET /v1/shoppers/self | 403 | Access denied |
| GET /v1/reseller/orders | 404 | Endpoint doesn't exist |

## What We Can't Get From API
- Customer list (need Reseller Control Center)
- Per-item pricing in orders (only order-level total)
- Product catalog with wholesale pricing
- Reseller-specific order/revenue data
- Shopper details

## Architecture Decision: GoDaddy MySQL (NOT Supabase)

One vendor, one bill, one data location. Everything on cPanel.
- Database: MySQL on GoDaddy cPanel
- Auth: Custom (bcrypt + JWT) in our API layer
- Customer interface: "My Account" (NOT "dashboard")
- Admin interface: Dashboard (Fritz only)
- API layer: Astro routes proxying to GoDaddy Reseller API

## Next Steps
1. ✅ Push 32 commits to GitHub
2. Access Reseller Control Center for customer data, product catalog, wholesale pricing
3. Create MySQL database on cPanel
4. Design schema from real data (not assumptions)
5. Adapt built backend code from Supabase to MySQL
6. Deploy to GoDaddy cPanel