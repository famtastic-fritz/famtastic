---
schema_version: 0.2.0
canonical_id: bug-pattern/agent-checkin-keyword-overlap-is-too-coarse-flags-merged-bra
type: bug-pattern
title: "agent-checkin keyword overlap is too coarse — flags merged branches as conflicts"
facets: ["agents", "governance"]
confidence: 0.88
lifecycle: active
created_at: 2026-05-05T23:15:43.754Z
promoted_at: 2026-05-05T23:15:43.755Z
promoted_by: famtasticfritz
source_capture: cap_closeout_plan_2026_05_05_agent_coordination_2026-05-05_a515
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: true
---

# agent-checkin keyword overlap is too coarse — flags merged branches as conflicts

2026-05-05 audit: agent-checkin --intent "Plan closeout mechanism" flagged 7 branches as overlap based on generic keyword presence (plan, script, schema). All 7 were merged or stale. Need per-branch staleness check (already-merged? abandoned?) before flagging.

## Evidence

- closeout:plan_2026_05_05_agent_coordination:2026-05-05T23:30:00.000Z
- ec40894
- AGENT-COORDINATION.md

## Backlinks

- Capture: `captures/inbox/cap_closeout_plan_2026_05_05_agent_coordination_2026-05-05_a515.json`
