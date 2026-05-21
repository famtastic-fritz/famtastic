---
schema_version: 0.2.0
canonical_id: do-not-repeat/zero-task-active-plans-need-explicit-closeout
type: do-not-repeat
title: "Zero-task active plans need explicit closeout"
facets: ["plans", "closeout-discipline"]
confidence: 0.98
lifecycle: active
created_at: 2026-05-19T23:54:03.201Z
promoted_at: 2026-05-19T23:54:03.201Z
promoted_by: famtasticfritz
source_capture: cap_closeout_plan_2026_05_05_workbench_per_page_design_2026-05-19_a6d8
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: true
---

# Zero-task active plans need explicit closeout

If a plan is still desired but has no open tasks, issue a needs_tasking closeout instead of leaving it active with ambiguous state.

## Evidence

- closeout:plan_2026_05_05_workbench_per_page_design:2026-05-19T23:55:00.000Z
- plans/plan_2026_05_05_workbench_per_page_design/plan.json
- docs/platform-refresh/PLATFORM-REFRESH-V2-IMPLEMENTATION-RECONCILIATION.md
- node scripts/plans/audit.js

## Backlinks

- Capture: `captures/inbox/cap_closeout_plan_2026_05_05_workbench_per_page_design_2026-05-19_a6d8.json`
