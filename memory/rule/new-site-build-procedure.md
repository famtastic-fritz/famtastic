---
schema_version: 0.2.0
canonical_id: rule/new-site-build-procedure
type: rule
title: "New site build procedure"
facets: ["build","procedure"]
confidence: 0.9
lifecycle: candidate
created_at: 2026-05-05T18:51:10.154Z
promoted_at: null
promoted_by: null
source_capture: brain-migration-2026-05-05
references: ["cowork-branch:claude/check-running-agents-tuSFO",".brain/procedures.md"]
seen_count: 0
last_surfaced_at: null
auto_promoted: false
---

# New site build procedure

Proven end-to-end build:

1. Design brief approval → template build (header/nav/footer/shared CSS)
2. Extract template artifacts (`_nav.html`, `_footer.html`, `styles.css`)
3. All pages build in true parallel with template context injected
4. Post-processing: extract slots → reapply mappings → blueprint + SEO → reconcile orphans → `applyLogoV` → CSS swap or legacy sync → `fixLayoutOverflow`
5. `runBuildVerification` (5 file checks): slot attrs, CSS coherence, cross-page consistency, head dependencies, logo + layout
6. If verification fails: `autoTagMissingSlots` → re-verify → commit
7. Stock photos: `fill_stock_photos` intent → `fetchFromProvider` → 3-provider chain
8. Deploy: `site-deploy` → Netlify → update `spec.json` with `deployed_url`

## Source

Migrated from `.brain/procedures.md` (cowork branch).
