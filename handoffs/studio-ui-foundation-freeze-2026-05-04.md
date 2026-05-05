# Studio UI Foundation Freeze Handoff

**Date:** 2026-05-04  
**Status:** frozen and approved by Fritz  
**Canonical rulebook:** `docs/STUDIO-UI-FOUNDATION.md`  
**Decision entry:** `docs/decisions.jsonl`  
**Reference mockups:** `docs/mockups/workbench-night.html`, `docs/mockups/workbench-screens.html`

## What Is Frozen

`docs/STUDIO-UI-FOUNDATION.md` is now the canonical Site Studio UI foundation.
It supersedes any earlier proposal that treats Studio as a generic dashboard,
developer console, rigid card grid, or fixed three-column tool layout.

The frozen foundation says:

- Left nav is domain-level only: Sites, Brainstorm, Plans, Components, Media,
  Research, Admin.
- The workspace reacts to the selected domain and selected object.
- Shay is ambient everywhere and invoked from the current workspace; Shay is
  not a left-nav domain.
- Every feature, panel, button, and tool must pass the Fritz filter:
  saves a click, runs without Fritz, makes money, compounds learning, or
  prevents a mistake.
- Media is Media Studio. It is prompt-first and generation-first; library is a
  supporting surface.
- Tools are contextual to the selected object, not fixed global furniture.
- The bench is the work. Cards may represent repeated items, but cards must not
  replace the task-shaped primary surface.
- Canonical writes, brand-kit changes, deploys, expensive generations, and
  destructive actions use plan-then-approve.

## Required Workspace Contract

Before building a production workspace, fill in:

- `domain`
- `route`
- `parent`
- `purpose`
- `primary_work_surface`
- `selected_object_model`
- `contextual_tools`
- `shay_context`
- `proof_required`
- `promotion_targets`
- `anti_patterns`

If a field cannot be filled in, the screen is not ready to build. Record the
missing field as a known gap instead of inventing UI around it.

## Implementation Guidance

The existing repo-native Workbench page remains useful as a prototype:

- `site-studio/public/workbench-foundation.html`
- `site-studio/public/css/workbench-foundation.css`
- `site-studio/public/js/workbench-foundation.js`
- `site-studio/public/data/workbench-workspaces.json`

Do not make it the default shell until it is rebuilt against the frozen
workspace contract and backed by real state sources. The prototype still
contains fixed chrome and dashboard-like tendencies that Fritz explicitly
rejected.

## Next Build Order

1. Convert the frozen workspace contract into production data consumed by
   Workbench.
2. Wire Plan mode to `plans/registry.json`, `tasks/tasks.jsonl`,
   `runs/runs.jsonl`, and `proofs/proof-ledger.jsonl`.
3. Register Workbench with the Shay context provider so Shay sees selected
   domain, route, object, tools, risk, and proof.
4. Rebuild Media as Media Studio: prompt-first creation, model/capability
   routing, comparison, approval, promotion, usage proof.
5. Only after those are working, propose replacing the default Studio shell.

## Hard Stops

- Do not rename Media Studio back to Media Library.
- Do not add a left-nav item without the page rule and Fritz filter.
- Do not use a generic dashboard/card page as the primary workspace.
- Do not show a tool unless the selected object needs it.
- Do not let Shay write canonical state without approval.
