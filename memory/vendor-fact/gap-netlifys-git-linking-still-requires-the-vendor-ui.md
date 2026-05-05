---
schema_version: 0.2.0
canonical_id: vendor-fact/gap-netlifys-git-linking-still-requires-the-vendor-ui
type: vendor-fact
title: "Gap: Netlify's git linking still requires the vendor UI"
facets: ["vendor:netlify", "vendor:godaddy", "vendor:resend", "vendor:stripe"]
confidence: 0.88
lifecycle: active
created_at: 2026-05-05T18:09:20.507Z
promoted_at: 2026-05-05T18:09:20.507Z
promoted_by: famtasticfritz
source_capture: cap_2026-05-05T18-08_4f0a
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: true
---

# Gap: Netlify's git linking still requires the vendor UI

Gap: Netlify's git linking still requires the vendor UI. We need an "assisted-manual capability" pattern that opens the deep-link URL and polls the API to detect completion. The pattern should generalize to Resend domain verify, GoDaddy DNS confirmation, Stripe webhook setup, and other vendor flows that don't have programmatic equivalents.

## Evidence

- source:test-session-2026-05-05.md

## Backlinks

- Capture: `captures/inbox/cap_2026-05-05T18-08_4f0a.json`
