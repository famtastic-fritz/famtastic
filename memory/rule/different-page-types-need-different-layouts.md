---
schema_version: 0.2.0
canonical_id: rule/different-page-types-need-different-layouts
type: rule
title: "Different page types call for different layouts"
facets: []
confidence: 0.72
lifecycle: active
created_at: 2026-05-06T00:11:51.285564Z
promoted_at: 2026-05-06T00:11:51.285564Z
promoted_by: fritz (manual override of confidence gate)
source_capture: cap_2026-05-06T00-11_16f0
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: false
override_reason: User design feedback is canonical by definition; regex-based confidence does not capture this.
---

# Different page types call for different layouts

Different page types call for different layouts. The 5 mockups demonstrate this: portfolio overview uses card grid, page editor uses sidebar+preview+sidebar, components library uses tile grid, media studio uses chat-with-grid+preview, Shay trace uses terminal log view. Future page additions must pick the right mockup pattern for the page type, not default to a one-size-fits-all template.

## Evidence

- source:cap_design-preferences-2026-05-05.md