---
schema_version: 0.2.0
canonical_id: recipe/user-canonical-override-on-confidence-gate
type: recipe
title: "User-canonical override on the auto-promote confidence gate"
facets: ["memory", "process", "platform-gap"]
confidence: 0.95
lifecycle: active
created_at: 2026-05-06T01:50:58.608769Z
promoted_at: 2026-05-06T01:50:58.608769Z
promoted_by: fritz (user-canonical override)
source_capture: cap_2026-05-06T01-49_8547
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: false
override_reason: User-canonical session meta-learning. Regex confidence does not capture nuanced user feedback.
---

# User-canonical override on the auto-promote confidence gate

Regex confidence rates user feedback at 0.7-0.78, below the 0.85 gate. User feedback IS canonical by definition. Workaround: explicit override with override_reason in frontmatter. Recurring need; the capture pipeline should add a --user-canonical promoter flag that defaults confidence to 0.95.

## Source

- captures/inbox/cap_session-meta-learning-2026-05-05.md (user-requested meta capture)