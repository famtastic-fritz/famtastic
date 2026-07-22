# M12 — Shadow / Strangler Slice

Title
M12 Shadow Runtime / Strangler Slice

Purpose
Run one bounded Site Studio build path through vNext beside the legacy runtime without changing production authority, while capturing structured parity and consumer-compatibility evidence.

Goal
Prove that a single-page shadow slice can execute through runtime-vnext with explicit `project_id` / `run_id` isolation, produce comparison artifacts, and leave the legacy runtime as the only production authority.

Tasks
- [ ] Freeze the M12 migration-policy contract from draft to captain-approved shadow-mode rules.
- [ ] Add a shadow-run envelope that always carries `project_id`, `run_id`, `recipe_id`, `recipe_version`, legacy case reference, and comparison status.
- [ ] Implement one bounded shadow entrypoint for the single-page build path only; no deploy, no repair, no production publish authority.
- [ ] Write shadow outputs to separate run-scoped workspace and separate published output location from the legacy path.
- [ ] Emit a structured comparison artifact with verdict: `match`, `mismatch`, `incomplete`, or `blocked`.
- [ ] Preserve consumer compatibility by projecting vNext events into a review surface without replacing existing WebSocket authority.
- [ ] Add proof tests for isolation, no-authority-overwrite, and blocked-state handling when the old baseline is unhealthy or provider-credit-gated.
- [ ] Run the bounded shadow slice and save the parity / comparison artifacts under `runtime-vnext/harness/reports/`.

Status
ready_to_start

Started
2026-07-22

Ended
—

Execution
Type
swarm

Strategy
Captain-owned contract freeze first, then dependency-first implementation. The first slice is narrow on purpose: single-page shadow execution only. Old runtime stays authoritative. vNext is evidence-producing only.

Assignments
Task
Freeze migration policy and define shadow verdict contract
Agent
captain contract lane
Model
parent lane

Task
Implement shadow-run envelope + comparison artifact schema
Agent
runtime identity lane
Model
Kimi worker

Task
Implement bounded single-page shadow entrypoint
Agent
shadow entrypoint lane
Model
Kimi worker

Task
Implement output separation and authority guardrails
Agent
artifact isolation lane
Model
Kimi worker

Task
Project review-safe consumer events without UI cutover
Agent
consumer projection lane
Model
Kimi worker

Task
Add tests for isolation / blocked-state / no-authority-overwrite
Agent
verification lane
Model
Kimi worker

Research
Status
complete enough to proceed

File
- `runtime-vnext/research/live-truth-inventory.md`
- `runtime-vnext/research/adopt-vs-build-decision.md`

Review
Required
yes

Status
pending for M12 closeout

Type
captain review + adversarial pass before M13/M14

File
- `runtime-vnext/contracts/migration-policy.md`
- `runtime-vnext/harness/reports/`

Dependencies
Depends On
- M1-M9 frozen contracts
- M10 deterministic slice
- M11 consumer verification and parity-report scaffolding

Blocks
- M13+ broader migration/extraction

Proof
- legacy runtime remains authority throughout M12
- shadow run writes only to isolated vNext run/workspace outputs
- comparison artifact produced for each shadow run
- blocked legacy baseline is reported honestly as `blocked` or `incomplete`, never treated as parity success
- targeted runtime-vnext tests pass

Do Not Do
- do not cut over production traffic
- do not replace legacy WebSocket authority
- do not treat unhealthy Anthropic-credit-gated old baselines as parity wins
- do not run multi-page, deploy, repair, or destructive external flows in the first M12 slice
- do not let any vNext path derive authority from mutable global `TAG`
