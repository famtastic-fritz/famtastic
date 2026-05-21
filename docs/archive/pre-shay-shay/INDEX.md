# Pre-Shay-Shay Archive Index

Date: 2026-05-21
Status: reference archive

This folder preserves older plans, specs, and agent-role material discovered during cleanup. Nothing here is deleted or treated as current execution law by default. The current priority is Phase 2: Visual Workflows & Brand Systems.

## Current source of truth

- `plans/PHASE2-VISUAL-WORKFLOWS-BRAND-SYSTEMS.md`
- `data-center/reports/post-eval/posteval_phase1_20260521.md`
- `SITE-LEARNINGS.md`
- `FAMTASTIC-STATE.md`

## Harvested reference docs

| File | Source | Status |
|---|---|---|
| `harvested-reference/phase2-media-logo-video-asset-spec.md` | `docs/process/FAMTASTIC-MEDIA-STUDIO-LOGO-VIDEO-ASSET-SPEC.md` | reference-current-input |
| `harvested-reference/phase2-component-studio-lifecycle.md` | `docs/process/FAMTASTIC-COMPONENT-STUDIO-LIFECYCLE.md` | reference-current-input |
| `harvested-reference/phase2-operator-cockpit-mission-control.md` | `docs/process/FAMTASTIC-OPERATOR-COCKPIT-AND-MISSION-CONTROL-SPEC.md` | reference-later-phase |
| `harvested-reference/phase2-studio-workflow-map.md` | `docs/process/FAMTASTIC-STUDIO-WORKFLOW-MAP.md` | reference-needs-reconciliation |
| `harvested-reference/phase2-studio-screen-contracts.md` | `docs/process/FAMTASTIC-STUDIO-SCREEN-CONTRACTS.md` | reference-needs-reconciliation |
| `harvested-reference/phase2-studio-redesign-master-spec.md` | `docs/process/FAMTASTIC-STUDIO-REDESIGN-MASTER-SPEC.md` | superseded-by-phase2-order-reference-only |
| `harvested-reference/site-studio-build-mutation-injection-system.md` | `docs/process/FAMTASTIC-BUILD-MUTATION-AND-INJECTION-SYSTEM.md` | reference-site-edit-loop |
| `harvested-reference/server-modularization-track.md` | `docs/research/famtastic-studio-execution/SERVER-MODULARIZATION-TRACK.md` | current-backlog-reference |
| `harvested-reference/server-modularization-plan.md` | `docs/research/famtastic-studio-execution/server-modularization-plan.md` | current-backlog-reference |
| `harvested-reference/server-responsibility-map.md` | `docs/research/famtastic-studio-execution/server-responsibility-map.md` | current-backlog-reference |
| `harvested-reference/server-modularization-proof.md` | `docs/research/famtastic-studio-execution/server-modularization-proof.md` | historical-proof-reference |

## Agent role references

Specialist role docs were copied into `agent-role-references/` as references for Phase 2 and future multi-agent onboarding. They are not current startup instructions until reconciled into `AGENTS.md`, `CLAUDE.md`, or surface-specific config.

## Full snapshots

The final cleanup pass also preserved broader pre-Shay-Shay worktree material under `full-snapshots/` so useful details are not lost while keeping the current plan clear:

- `full-snapshots/convergence-dossier/` — full docs/process, studio-execution research, design ingest docs, and Claude agent references from the convergence worktree.
- `full-snapshots/adoring-merkle-agent-bootstrap/` — experimental `.agents` skills and Codex bootstrap config for future agent startup consolidation.
- `full-snapshots/great-gauss-temporary-stubs/` — temporary Site Studio stubs preserved only as evidence of old missing module expectations.
- `local-artifact-manifests/epic-mclean-muapi-logo-outputs.md` — manifest for MuAPI logo/media outputs preserved in the local archive, not committed as binary bulk.

## Consolidation decisions

- Older Studio redesign docs are preserved as reference because Phase 2 order changed: Media Studio logo/brand first, then Site Studio workflow, then Component Studio, then Mission Control/Data Center/Shay Desk visuals.
- Server modularization work is preserved as a current backlog reference, but no wholesale refactor is merged during Phase 1 cleanup.
- Worktree UI/app changes are not merged wholesale. Selective harvesting must happen through reviewed specs, tests, and small commits.
- `_tool-probes/` cloned repos and raw capture files remain local/probe material unless converted into ledgers or summaries.
