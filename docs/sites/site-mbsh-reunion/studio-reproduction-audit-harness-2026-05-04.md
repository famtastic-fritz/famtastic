# MBSH Studio Reproduction Audit Harness — 2026-05-04

## Verdict

**Harness is defined; full reproduction run remains open.** MBSH is a valid Studio stress test because the hand-built v2 site contains the exact things Studio must learn to reproduce: seven pages, cinematic identity, media rights/state, custom mascot usage, form behavior, backend boundaries, sponsor workflow, chatbot widget, and launch proof. Running the full harness requires an actual Studio build from the single-paste prompt and then comparing output against the v2 deploy repo.

## Source Inputs

- Authoritative V1 brief: `sites/site-mbsh-reunion/# MBSH Class of '96 Reunion Site — V1 Br.md`
- Paste-ready Studio prompt: `docs/sites/site-mbsh-reunion/cowork-audit-001/01-studio-prompt.md`
- Existing drift report: `docs/sites/site-mbsh-reunion/cowork-audit-001/02-drift-gap-report.md`
- v2 deploy repo: `/Users/famtasticfritz/famtastic-sites/mbsh-reunion-v2/`
- Boundary doc: `docs/sites/site-mbsh-reunion/DEPLOY-STATE.md`

## Exact Studio Message To Send

Use the fenced prompt in:

`docs/sites/site-mbsh-reunion/cowork-audit-001/01-studio-prompt.md`

Send it as one message through Studio Chat or Shay Desk. Do not split it. The point of the test is to expose where Studio fails under full real-world context.

## Audit Method

1. Create a fresh Studio site from the single-paste prompt.
2. Let Studio build the full output without shrinking the prompt.
3. Capture build trace, classifier result, plan card behavior, pages produced, media slots, console output, and any fallback paths.
4. Compare generated output against the v2 deploy repo and the V1 brief.
5. Record two outputs:
   - Specific verdict on the generated MBSH reproduction.
   - Generalized Studio platform gaps that should be promoted outside MBSH.

## Required Checks

- `spec.pages` contains all seven pages: home, rsvp, tickets, through-years, memorial, capsule, playlist.
- Brief colors and typography survive into generated prompts and HTML.
- Hero video/media slots are represented without broken references.
- Existing brand mark and mascot assets are used instead of regenerated.
- RSVP, sponsor, capsule, memory, playlist, and chatbot are represented with the correct shell/runtime boundary.
- Plan card appears when the user asks for a plan and emits to UI, not just terminal logs.
- Build trace events cover intake, page inventory, template generation, page generation, post-processing, verification, and completion.
- Generated pages pass link, console, responsive, and visible-media checks.
- Gaps are logged as reusable platform tasks when they generalize beyond MBSH.

## Current Known Generalized Gaps

- **Workflow-as-data visualizer:** trace events and catalog now exist, but the visualizer is only phase-one inspect/trace/propose.
- **Adapt/rebuild site modes:** hand-built deploy repos and generated Studio sites need different state contracts.
- **Brief/media fulfillment:** missing local asset references should be detected before a site is treated as complete.
- **Interactive feature boundary:** Studio can produce shells, but backend/runtime feature state needs explicit contracts and smoke tests.
- **Chatbot component generation:** Studio lacks a first-class reusable chatbot skeleton with FAQ/fallback/runtime proof.
- **Launch readiness:** date, venue, payment, playlist, seeded content, API base URL, and backend secrets need a launch gate.

## What Is Verifiable Now

- The v2 repo proves the desired target architecture exists outside Studio.
- RSVP and sponsor frontend submits are browser-verified.
- Chatbot Phase 1 frontend behavior is browser-verified.
- Backend endpoint inventory is complete.
- Media/story asset readiness is blocked by missing story images.
- Deploy proof is blocked by external access/config.

## What Requires The Actual Studio Run

- Classifier behavior on the full prompt.
- Plan-card UI behavior during the build request.
- Whether Studio produces all seven pages.
- Whether Studio respects MBSH colors/fonts/media rules.
- Whether new build-trace events populate a complete enough visualizer trace.
- Whether Workbench/Shay can reason from the resulting page context.

## Reusable Platform Gap Promotion

Promote these out of MBSH only after a Studio reproduction run confirms the failure:

- `studio.full_prompt_context_budget` for long prompt handling without 1M-context masking.
- `studio.build_trace_visualizer` for inspect/trace/propose tied to real builds.
- `studio.launch_readiness_gate` for config/media/backend/deploy smoke proof.
- `studio.interactive_feature_contracts` for RSVP/sponsor/chatbot/capsule-like systems.
- `studio.imported_site_mode` for `adapt_existing_site` and `rebuild_from_brief`.
