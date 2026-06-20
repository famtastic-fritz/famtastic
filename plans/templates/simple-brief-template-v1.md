# Simple Brief Template v1

Status: draft
Version: v1
Updated: 2026-06-18
Purpose: Human-readable brief format with the bare minimum resumable fields. Rich execution detail belongs in telemetry, ledgers, and supporting artifacts — not in the default human-facing brief.

## Default template — scram line

Title: [short name]
Purpose: [why this exists]
Goal: [what done looks like]

Tasks:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

Status: [proposed / ready / in_progress / blocked / done]
Started: [YYYY-MM-DD HH:MM]
Ended: [YYYY-MM-DD HH:MM]
Execution: [single / phased / parallel / swarm / hyperswarm]
Research: [yes / no] — [file path if yes]
Review: [yes / no] — [file path if yes]
Skills: [comma-separated list or none]
Blocked By: [plan id(s) or none]

Proof:
- [what proves this is done]

## Notes
- This is now the default human-facing brief shape.
- Checkbox tasks are the resumability surface. Check them off as work completes.
- Rich orchestration detail belongs in telemetry, ledgers, research artifacts, reviews, and plan-control surfaces.
- Keep exactly one blank line after `Goal:`, one blank line after the last task, and one blank line before `Proof:`.
- If `Research` or `Review` is `no`, do not add extra sub-lines.
- `Blocked By` is optional in practice, but when another active plan is the blocker, name the plan ID explicitly.

## Filled example

Title: Reactivate reseller income pipeline
Purpose: Restore a neglected but already functional income path that can start producing money quickly.
Goal: Get the reseller account active again and verified so it can be used as a live revenue channel.

Tasks:
- [ ] Confirm reseller account status
- [ ] Resolve billing or access issues
- [ ] Verify account can manage products
- [ ] Document activation steps
- [ ] Identify first revenue-ready offer

Status: in_progress
Started: 2026-06-17 09:00
Ended:
Execution: swarm
Research: yes — research/reseller-account-status.md
Review: yes — reviews/reseller-activation-review.md
Skills: shay-shay, codex
Blocked By: PLAN-052

Proof:
- Reseller login works
- Billing is confirmed current
- Product management is accessible
- Activation steps are documented
