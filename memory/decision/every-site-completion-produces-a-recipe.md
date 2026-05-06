---
schema_version: 0.2.0
canonical_id: decision/every-site-completion-produces-a-recipe
type: decision
title: "Every site completion produces a reusable recipe distilled to memory"
facets: ["site-execution", "memory", "recipes"]
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

# Every site completion produces a reusable recipe distilled to memory

Today MBSH proved a deploy recipe (cPanel UAPI overwrite + DNS via cPanel + Resend domain verify + cron + CORS lockdown + smoke test). Pattern: at each site completion, distill the unique-to-this-site work AND the reusable recipe and promote the recipe to memory so the next site reuses it.

## Source

- captures/inbox/cap_session-meta-learning-2026-05-05.md (user-requested meta capture)