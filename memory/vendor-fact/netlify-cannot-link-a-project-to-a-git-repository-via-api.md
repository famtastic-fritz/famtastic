---
schema_version: 0.2.0
canonical_id: vendor-fact/netlify-cannot-link-a-project-to-a-git-repository-via-api
type: vendor-fact
title: "Netlify cannot link a project to a Git repository via API"
facets: ["vendor:netlify", "deploy"]
confidence: 0.88
lifecycle: active
created_at: 2026-05-05T18:09:20.504Z
promoted_at: 2026-05-05T18:09:20.505Z
promoted_by: famtasticfritz
source_capture: cap_2026-05-05T18-08_4f0a
references: []
seen_count: 0
last_surfaced_at: null
auto_promoted: true
---

# Netlify cannot link a project to a Git repository via API

Netlify cannot link a project to a Git repository via API. The `netlify api updateSite` call can rename a project, change build settings, and modify deploy hooks, but it does not expose project-to-repo linking. The "Connect to Git" flow requires the vendor UI. This is a vendor fact about Netlify's API surface confirmed by today's attempt to repoint the mbsh-reunion-staging project programmatically.

## Evidence

- source:test-session-2026-05-05.md

## Backlinks

- Capture: `captures/inbox/cap_2026-05-05T18-08_4f0a.json`
