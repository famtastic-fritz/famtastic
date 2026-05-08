---
schema_version: 0.2.0
canonical_id: decision/pages-of-a-site-can-trigger-page-type-research-when-needed
type: decision
title: "Per-page-type research for site pages is optional, triggered by user dissatisfaction"
facets: ["site-execution","design-research","governance"]
confidence: 0.95
lifecycle: active
created_at: 2026-05-06T02:04:23.103969Z
promoted_at: 2026-05-06T02:04:23.103969Z
promoted_by: fritz (user-canonical correction)
source_capture: cap_2026-05-06T01-49_8547
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: false
override_reason: User-canonical correction of an over-strict prior decision.
supersedes: decision/pages-of-a-site-need-page-type-research-too
---

# Per-page-type research for site pages is optional, triggered by user dissatisfaction

The earlier framing made per-page-type research MANDATORY for every site page. User clarified that's wrong. Most sites should ship from existing patterns without a research detour. The trigger for invoking the research discipline on a site page is **user dissatisfaction** — when a built page doesn't feel right, then we apply the 8-question pre-flight + product-reference research + mockup-first build to refine it.

## When to invoke

- User says "I don't like this site / this page"
- User asks for a redesign or significant revision
- A new page type the platform hasn't shipped before (e.g., a first-ever ticket page, a first-ever live countdown experience)
- A site that's user-visible at a high quality bar (showcase sites, prominent client work)

## When NOT to invoke

- Routine site builds following established patterns (template-derived sites)
- Test/PoC sites
- Iterations on a page that already passed user approval
- Standard form/contact/about pages where the existing patterns are good enough

## How it triggers

When the user expresses dissatisfaction in chat (or via a Studio Reviews queue once it ships), the `fam-hub site refine <tag> <page>` command opens a research session for that specific page. Output: a brief + mockup + new task. Then the rebuild happens.

## Source

- captures/inbox/cap_session-meta-learning-2026-05-05.md (user-requested meta capture)
- User clarification 2026-05-06: "B should be option, like if I dont like the site or something like that. not a requrement"
