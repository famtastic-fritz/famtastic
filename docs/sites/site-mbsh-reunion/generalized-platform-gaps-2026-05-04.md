# MBSH Generalized Platform Gaps — 2026-05-04

## Verdict

**Reusable gaps have been separated from MBSH-specific blockers.** MBSH-specific launch blockers stay on the site plan. The items below generalize to Studio/Workbench/platform because they will recur across revenue sites unless the system grows a reusable guard, feature, or workflow.

## Promote To `build-intent-fulfillment-trace`

### Pipeline Visualizer

Current state: `parallelBuild()` emits trace events and `site-studio/lib/workflow-stage-catalog.json` defines the phase-one catalog. Workbench Plan mode now has inspect/trace/propose lanes.

Gap: the visualizer is not yet a complete build-run forensic surface. It needs stage/event matching, missing-stage detection, and proposed pipeline edits that preview before applying.

### Brief Fulfillment Delta

Current state: MBSH content comparison found missing story/gallery assets, placeholder playlist ID, date/config mismatches, and empty seeded-content surfaces.

Gap: Studio needs a post-build delta checker that compares the brief against generated files, media references, config values, and interactive feature shells.

## Promote To `studio-workbench-foundation`

### Launch Readiness Gate

Current state: MBSH deploy proof is blocked by missing API origin, backend config/secrets, Netlify/DNS/GoDaddy/Resend access, and smoke tests.

Gap: Workbench needs a deploy/readiness board that can show blocked external access separately from code incompleteness, with proof rows for API, DNS, email, payments, media, and rollback.

### Hidden-State UI Check

Current state: MBSH chatbot panel styled `[hidden]` content as flex and intercepted pointer events until fixed.

Gap: generated widgets/modals need an automated browser check that closed/hidden panels do not intercept clicks and that open/close controls work on mobile.

## Promote To `plan-task-run-intelligence`

### Capture Promotion

Current state: `fam-hub capture extract` writes review-only packets.

Gap: review packets need duplicate detection and explicit item-by-item promotion into canonical memory, task ledgers, bug logs, and gaps.

### Site-Scoped Proof Ledger

Current state: MBSH proof docs are site-scoped, while reusable gaps are manually summarized here.

Gap: the task/proof ledger should support `site_tag`, `promotes_to_plan`, and `gap_id` fields so site audits can feed platform work without copy/paste.

## Promote To `site-mbsh-reunion` Only

These remain MBSH-specific and should not become platform tasks unless repeated elsewhere:

- Final reunion date and venue confirmation.
- PayPal account/button setup.
- Real Spotify playlist ID.
- Committee-curated In Memory names.
- Approved sponsor logos and memory photos.
- MBSH-specific story/timeline image sourcing and rights approvals.

## Next Platform Action

Do not create more parallel plans. Add these as children under the existing four-parent registry:

- Pipeline/stage matching under `build-intent-fulfillment-trace`.
- Launch readiness and hidden-state checks under `studio-workbench-foundation`.
- Capture promotion and site-scoped proof metadata under `plan-task-run-intelligence`.
