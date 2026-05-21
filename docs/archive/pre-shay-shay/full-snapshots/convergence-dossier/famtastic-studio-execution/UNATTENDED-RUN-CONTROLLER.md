# Unattended Run Controller

**Status:** active planning controller
**Purpose:** Define how future FAMtastic Studio setup slices continue toward MBSH V2 proof-readiness without stopping for Fritz approval unless a hard blocker occurs.

This controller is not app code. It is the run policy and proof contract for the next setup passes.

## 1. Full Run Goal

Continue from Slice 1 through the minimum Studio execution substrate until the system is ready for MBSH V2 proofing.

The target state is not "MBSH V2 started." The target state is:

> Studio can ingest an Intelligence Brief, show capability truth, track run status, show cost/approval state, produce a proof packet, capture learning candidates, and identify the next build action without adding major backend behavior to the 20,150-line `server.js`.

## 2. Core Rule

Checkpoints are proof/tracking, not default Fritz approval stops.

Agents should continue automatically when validation passes, proof exists, cost remains under `$50`, and no hard blocker appears.

## 3. Continue Policy

Continue automatically after each passing slice when:

- required files/artifacts exist
- validation passes
- `RUN_STATUS.md` is updated
- proof packet or equivalent proof note exists
- scope remains inside the approved slice
- no hard blocker is present
- cost remains below `$50`
- no DNS/payment/production deploy/destructive/secret action is required
- no major backend behavior is added to `site-studio/server.js` without modularization path

## 4. Stop Policy

Stop only for hard blockers:

- projected cost above `$50`
- missing required secret/API key with no local fallback
- DNS/payment/production deploy/destructive change
- repo write/build impossible
- safety/security issue
- repeated validation failure after documented retry/fix attempts
- implementation would add major backend behavior to the 20,150-line `site-studio/server.js` without a modularization path

If stopped, the agent must update `RUN_STATUS.md`, create or update the proof packet, and report the exact blocker.

## 5. Required RUN_STATUS.md Updates

After every slice, append an update in this shape:

```text
## Update YYYY-MM-DD HH:MM

Status: running | blocked | failed | complete
Agent:
Current track:
What changed:
Proof:
Blockers:
Non-blockers logged:
Next:
```

The update must state:

- slice number/name
- files created or modified
- validation result
- hard blockers, if any
- non-blockers, if any
- next slice or stop reason

## 6. Required FINAL-RUN-REPORT.md

At the end of the full setup run, create:

`docs/research/famtastic-studio-execution/FINAL-RUN-REPORT.md`

It must include:

- completed slices
- files/artifacts created
- validation summary
- cost summary
- blockers encountered
- non-blockers logged
- proof links
- readiness decision
- remaining work before MBSH V2 implementation
- exact next build action

## 7. Slice Sequence

### Slice 1: Execution Substrate Contracts And Fixtures

Create object contracts and realistic fixtures for:

- Intelligence Brief
- Recipe Decision
- Capability Truth
- Run Ledger
- Proof Packet
- Learning Candidate

Proof:

- required files exist
- JSON parses
- no UI/app/server behavior changed
- `RUN_STATUS.md` updated

### Slice 2: Server Modularization First Safe Extraction Plan / Proof

Create the first safe extraction plan and baseline proof for `site-studio/server.js` without changing behavior unless separately authorized.

Proof:

- baseline commands identified
- route smoke checklist created
- first extraction target selected
- no backend behavior changed in planning pass

### Slice 3: Studio Artifact Reader / Display Substrate

Plan or implement the minimal read-only substrate that lets Studio ingest/display the Slice 1 artifacts, depending on approval and modularization guardrails.

Proof:

- artifact paths and parser expectations defined
- read-only state contract defined
- no major backend behavior added without modularization path

### Slice 4: Run Ledger + Proof Packet Wiring Plan

Define how future runs append pass updates, proof packets, cost state, blockers, non-blockers, and learning candidates.

Proof:

- run append flow documented
- validation rules documented
- stop/continue policy wired to object contracts

### Slice 5: MBSH V2 Readiness Gate

Create the final readiness gate for starting MBSH V2 proofing.

Proof:

- MBSH V2 Intelligence Brief draft exists
- capability truth required for MBSH V2 is visible
- component/slot candidates are identified
- media registry candidates are identified
- QA/proof gates are listed
- next build action is explicit

## 8. Ready For MBSH V2 Proofing

Ready means Studio can:

- ingest an Intelligence Brief
- record or show Capability Truth
- track Run Ledger status
- show cost/approval state
- produce a Proof Packet
- capture Learning Candidates
- identify the next build action
- avoid major backend growth in the 20,150-line `site-studio/server.js`

If these are not true, MBSH V2 implementation must not start.

## 9. Non-Blocking Discoveries

If a V2-worthy idea appears during any slice:

1. log it as a non-blocker
2. classify it as V2 backlog or V1 optional
3. continue the active slice

Do not expand the slice unless the idea is required to pass the readiness gate.

## 10. Cost Rule

Any action projected above `$50` stops immediately and requires explicit Fritz approval.

No Slice 1 action should have cost. It is local docs/JSON work only.
