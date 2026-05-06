---
schema_version: 0.2.0
canonical_id: rule/render-matching-mockup-when-implementing-domain
type: rule
title: "When implementing a workbench domain, the implementor must render the matching mockup screen, not in"
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

# When implementing a workbench domain, the implementor must render the matching mockup screen, not in

When implementing a workbench domain, the implementor must render the matching mockup screen, not invent its own layout. The current middle-area implementation (the macOS-styled Object/Sites/Page/Meta tile system) has no source in the mockups and was invented during build. Future builds: open the relevant mockup HTML side-by-side with the implementation and match it.

## Evidence

- source:cap_design-preferences-2026-05-05.md