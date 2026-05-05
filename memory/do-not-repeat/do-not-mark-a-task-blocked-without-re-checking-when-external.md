---
schema_version: 0.2.0
canonical_id: do-not-repeat/do-not-mark-a-task-blocked-without-re-checking-when-external
type: do-not-repeat
title: "Do not mark a task blocked without re-checking when external state changes"
facets: ["governance", "ledgers"]
confidence: 0.88
lifecycle: active
created_at: 2026-05-05T23:15:44.002Z
promoted_at: 2026-05-05T23:15:44.002Z
promoted_by: famtasticfritz
source_capture: cap_closeout_site-mbsh-reunion_2026-05-05_f701
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: true
---

# Do not mark a task blocked without re-checking when external state changes

task-2026-05-04-028 stayed blocked in tasks.jsonl after the underlying media gap was closed by a separate session. Always re-audit blocked tasks at session start.

## Evidence

- closeout:site-mbsh-reunion:2026-05-05T23:30:00.000Z
- 33ceea5
- docs/sites/site-mbsh-reunion/DEPLOY-STRATEGY-VERIFICATION-2026-05-05.md
- docs/sites/site-mbsh-reunion/CANONICAL-RENAME-2026-05-05.md

## Backlinks

- Capture: `captures/inbox/cap_closeout_site-mbsh-reunion_2026-05-05_f701.json`
