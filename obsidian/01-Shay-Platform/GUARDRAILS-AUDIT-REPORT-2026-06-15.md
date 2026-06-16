---
title: GUARDRAILS-AUDIT-REPORT-2026-06-15
type: note
permalink: famtastic/01-shay-platform/guardrails-audit-report-2026-06-15
---

# Guardrails Audit Report — 2026-06-15

## Why this note exists
Fritz asked for a grounded audit of recent Shay changes because the runtime feels overcoded, over-gated, and less proactive than intended. This note preserves what is known right now so the guardrails-removal work can resume without context rot.

## Scope
- Canonical repo audited: `~/famtastic/shay-shay`
- Audit window: last 4 days of first-parent commits as of 2026-06-15 12:02 EDT
- Goal: identify which recent commits/files most likely injected the guardrail worldview, separate good observability from bad babysitting, and define a sane removal order

## Observation

### Commit window inspected
1. `78043aa0969f96412379a187e6ddfe3023474828` — 2026-06-15 — `feat: add intelligence layer command surface`
2. `bde9b623e63cbb6d7364cabeb7053cf58c9e293d` — 2026-06-15 — `fix: surface capability status in routing output`
3. `b30a8f514d4594a1625ffb702d356fdb5fcb4771` — 2026-06-14 — `feat: add capability truth layer CLI`
4. `fde1f73f43397e58d2a58ae8870832051f179f7f` — 2026-06-14 — `feat: add process intelligence ledger MVP [docs] (#5)`
5. `5c3cbb255e29b01a3902cf1721c4fa97a275ce21` — 2026-06-13 — `docs: add Shay workstream control map`
6. `6519adae1c171e4418451bf9b996ea6a90d639e1` — 2026-06-12 — `fix(model): stabilize model selection and provider resolution`

### Policy-heavy diff signal in the audit window
Keyword scan across added lines used these terms:
`gated`, `unsafe`, `blocked`, `avoid_by_policy`, `requires_review`, `review gate`, `approval`, `forbidden`, `must not`, `do not`, `dry-run`, `stop/resume`

Runtime suspects ranked by blast radius + policy density:

1. `78043aa0969f96412379a187e6ddfe3023474828`
   - 3,500 added lines
   - 250 policy-heavy hits in added lines
   - Files touched:
     - `shay_cli/capabilities_cmd.py`
     - `shay_cli/intelligence_cmd.py`
     - `shay_cli/intelligence_seed.py`
     - `shay_cli/main.py`
     - `tests/test_intelligence_layer.py`
   - This is the primary suspect commit. It introduced the biggest concentration of hard gating language and turned a lot of posture into runtime contract.

2. `b30a8f514d4594a1625ffb702d356fdb5fcb4771`
   - 1,478 added lines
   - 29 policy-heavy hits in added lines
   - Files touched:
     - `shay_cli/capabilities_cmd.py`
     - `shay_cli/main.py`
     - `tests/test_capabilities_cmd.py`
   - This is the secondary runtime suspect. It reinforced `unsafe`, `blocked`, and `avoid_by_policy` as first-class product vocabulary.

3. `5c3cbb255e29b01a3902cf1721c4fa97a275ce21`
   - 619 added lines
   - 32 policy-heavy hits in added lines
   - Docs only, not main runtime
   - Useful as a worldview precursor, not the main execution problem

4. `fde1f73f43397e58d2a58ae8870832051f179f7f`
   - 1,432 added lines
   - 13 policy-heavy hits in added lines
   - Mostly observability / ledgering work; lower-priority guardrails target

### Current live hotspot files
Raw policy-term hits in the current live files:
- `shay_cli/intelligence_seed.py` = 87
- `shay_cli/capabilities_cmd.py` = 29
- `shay_cli/intelligence_cmd.py` = 137

Important note: these are raw term matches, not unique guardrails. Repeated status labels inflate the count. This means Fritz’s estimate of “90 or so guardrails” is plausible as a unique-rules problem even though the raw term count is much higher.

### Concrete runtime examples still live
`shay_cli/intelligence_cmd.py:80-95`
- `SAFETY_GATES` includes:
  - `no dirty-main writes`
  - `no persona/root-truth edits`
  - `no live runtime edits`
  - `no launchd/cron/symlink edits`
  - `no skill moves/deletes/promotions`
  - `no production HyperSwarm launch without explicit approval`
  - `no external repo execution`
  - `no Gmail send`
  - `no Calendar write`
  - `no publish action`
  - `no uncontrolled provider spend`
  - `no task without output contract`
  - `no worker without ledger entry`
  - `no worker without stop/resume point`
  - `no worker without assigned mission/plan`

`shay_cli/intelligence_cmd.py:881-889`
- `swarm_status()` currently returns:
  - `hyperswarm: gated`
  - `production_launch_safe: false`
  - `requires_fritz_approval_for_production: true`
  - `safety_gates: SAFETY_GATES`
  - `forbidden_actions: COMMON_FORBIDDEN_ACTIONS`

`shay_cli/capabilities_cmd.py:73-76`
- `HYPERSWARM_BLOCKERS` currently states production launch remains gated and requires review gates / stop-resume fields.

`shay_cli/intelligence_seed.py:323-339`
- ChatGPT Pro planning lane now explicitly says ChatGPT-Web-authored guardrail/policy logic should be treated as draft material and audited before adoption.
- This part was corrected during this session so it is now advisory, not a forced gate.

### Tests currently codifying the posture
- `tests/test_intelligence_layer.py`
  - asserts `blocked_for_production`
  - asserts `unsafe is True`
  - asserts `requires_fritz_approval is True`
  - asserts `no production HyperSwarm launch without explicit approval`
  - asserts review gates / forbidden actions behavior
- `tests/test_capabilities_cmd.py`
  - asserts `hyperswarm-doctrine [unsafe]`
  - asserts provider route `primary == blocked`
  - asserts provider route `status == avoid_by_policy`

### Live CLI verification run on 2026-06-15
Commands run:
- `uv run shay capabilities decide "plan a major architecture migration"`
- `uv run shay intelligence route "plan a major architecture migration"`
- `uv run shay capabilities show hyperswarm-doctrine`

Observed results:
- Major planning no longer hard-routes to ChatGPT Pro. It stays on the current provider lane and adds an optional reminder instead.
- `intelligence route` now returns `decision: suggest_optional_lane` for major-planning asks.
- HyperSwarm still presents as `unsafe/gated` with explicit blockers and approval framing.

## Interpretation
- The strongest guardrail injection point is the 2026-06-15 intelligence-layer commit, not the model/provider stabilization work.
- The problem is not observability. The problem is enforcement posture being embedded into capability truth, routing, status labels, and tests.
- The runtime is carrying a babysitting worldview: blocked-by-default, approval-heavy, and review-gated in places that should be advisory or simply described as “not yet wired.”
- Git history cannot prove ChatGPT Web authorship. What it can prove is where the guardrail worldview entered the code and where it became executable product behavior.

## What is worth keeping
Keep these unless they directly prove annoying in practice:
1. Capability visibility and `capabilities show/decide` surfaces
2. Process intelligence / ledgering / resumable context
3. Gap backlog creation from real missing capabilities
4. Explicit statement when a tool surface truly does not exist yet
5. Optional reminders for alternate planning lanes

## What looks overcoded and should be demoted or removed
1. Hard policy vocabulary as capability truth
   - `unsafe`
   - `blocked`
   - `avoid_by_policy`
   - `requires_fritz_approval`
   when used for preference or workflow style instead of actual impossibility/danger

2. Hard safety-gate arrays that include process ideology
   Demote these from hard guardrails to best-practice guidance unless there is a real destructive side effect:
   - `no task without output contract`
   - `no worker without ledger entry`
   - `no worker without stop/resume point`
   - `no worker without assigned mission/plan`

3. Blanket approval framing around production worker behavior
   - Especially HyperSwarm language that treats launch as categorically gated rather than capability-dependent and user-directed

4. Provider-route posture that says `avoid_by_policy`
   - Good for documentation, bad as a default runtime refusal signal when the route is actually available

5. Tests that freeze the babysitting posture into contract
   - These are important removal targets because they will re-impose the same worldview after code edits if not changed alongside the runtime

## Recommended removal order

### Wave 1 — Demote preference-level gates into reminders
Targets:
- provider routing statuses that are preference-driven, not capability-driven
- approval-heavy wording for major planning lanes
- `avoid_by_policy` when the route is actually usable

Goal:
- Current-lane-first behavior
- advisory notes instead of policy refusal

### Wave 2 — Shrink hard safety lists to true hard boundaries
Keep hard only if destructive, irreversible, or identity-corrupting.
Likely keep:
- dirty-main / root-truth / destructive system mutation boundaries
- real secret-exposure or spend-risk boundaries when evidence-backed

Likely demote:
- output contract requirement
- ledger requirement
- stop/resume requirement
- assigned-plan requirement

### Wave 3 — Reclassify absent integrations neutrally
Examples:
- Gmail send
- Calendar write
- publish actions

If the tool surface is not wired, say that plainly.
Do not frame every absence as forbidden behavior.

### Wave 4 — Rewrite tests last, but in the same pass
Update tests so they encode:
- proactive orchestration
- reminder-first posture
- real capability truth
- explicit-user-intent override

## Working rule for future adoption
If planning or runtime logic comes from ChatGPT Web:
1. keep the useful architecture/decomposition ideas
2. treat guardrail, approval, or autonomy logic as draft only
3. run a guardrails audit before it becomes live policy
4. rewrite it Shay-native before promoting it into the runtime

## Resume checklist
When resuming this thread, start here:
1. Open this note
2. Re-run the live proofs:
   - `uv run shay capabilities decide "plan a major architecture migration"`
   - `uv run shay intelligence route "launch hyperswarm"`
   - `uv run shay capabilities show hyperswarm-doctrine`
3. Audit these files in this order:
   - `shay_cli/intelligence_cmd.py`
   - `shay_cli/intelligence_seed.py`
   - `shay_cli/capabilities_cmd.py`
   - `tests/test_intelligence_layer.py`
   - `tests/test_capabilities_cmd.py`
4. Do not rip out everything at once. Convert preference-guardrails first, then update tests.
5. Preserve observability. Remove babysitting.

## Bottom line
The overcoding concern is real.
The main runtime injection point is the intelligence/capability layer added on 2026-06-14 to 2026-06-15, especially commit `78043aa0969f96412379a187e6ddfe3023474828`.
The fix path is not “delete all guardrail words.” The fix path is: keep visibility, demote preference-gates, neutralize false `unsafe/blocked/avoid_by_policy` claims, and rewrite the tests so proactivity becomes the contract.
