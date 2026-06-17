---
title: 2026-06-17-shay-truth-reconstruction
type: note
permalink: shay-memory/research/2026-06-17-shay-truth-reconstruction
---

# Shay truth reconstruction

Status: active reconstruction artifact
Date: 2026-06-17

## Summary
This pass reconstructs Shay's truth system around real files and control surfaces, not narrative status. The key correction is simple: child summaries can help find things, but parent verification is the only acceptable closure proof.

## Research question
What are the real truth-bearing Shay surfaces for memory, capabilities, intelligence, process ledgering, and curation, and how should each one be classified so future runs stop blending seeded declarations with verified reality?

## Observations
1. `docs/shay-master-checklist-2026-06-15.md` already records the core live lesson that delegate/swarm child summaries cannot be trusted as proof by themselves.
2. `docs/shay-truth-surface-rubric-2026-06-13.md` already defines the three base truth surfaces: working tree, committed branch, and live runtime, plus preflight/closeout gate surfaces.
3. `shay_cli/capabilities_cmd.py` contains executable capability-gate structures, including `CapabilityGateReport`, required proof surfaces, and closeout actions.
4. `shay_cli/intelligence_cmd.py` already encodes explicit `REALITY_CLASSES`, worker required fields, and safety gates, which makes it a control-plane assembly surface rather than pure runtime proof.
5. `agent/process_intelligence.py` already provides a durable run ledger with required fields for tools used, files inspected, files changed, artifacts created, validation results, blockers, and lessons learned.
6. `agent/curator.py` persists curator state and lifecycle behavior, but it is scheduler/control behavior, not proof that any given skill truth claim is live.
7. `/Users/famtasticfritz/famtastic/obsidian/01-Shay-Platform/Agent-Capability-Matrix.md` is an active shared truth note, but many rows still use status language that mixes installed, active, partial, and aspirational states.
8. The sibling `~/famtastic` control-plane repair established a hard proof lesson: `node scripts/plans/audit.js` was the real closure surface after backfill, not worker or delegate narrative.

## Interpretations
1. The Shay truth problem is not absence of structure; it is mixed reality classes across multiple surfaces.
2. `shay_cli/intelligence_cmd.py` and `shay_cli/capabilities_cmd.py` are the strongest current control surfaces for executable truth gating, but they are not automatically identical to live-runtime proof.
3. `agent/process_intelligence.py` is the best current candidate for the durable event/proof spine because it stores validation and artifact fields explicitly.
4. The capability matrix note should be treated as a shared curated surface whose entries require stronger reality-class wording before being treated as proof.
5. Curator state is valuable operational truth, but it must not be mistaken for capability proof or learning-loop completion proof.
6. The system needs mandatory parent verification language everywhere swarm/delegate output could otherwise be overclaimed.

## Capability notes
- Capability gating exists in code and is usable as a preflight/closeout control surface.
- Intelligence reality classes exist in code and can anchor doctrine wording.
- Process-intelligence already has ledger structure strong enough to serve as a proof spine.
- Shared Obsidian truth remains useful, but it needs clearer promotion/update gates before it should be treated as proven truth.

## Truth-surface classification

| Surface | Current role | Reality class | Upstream truth source | Promotion/update gate | Proof rule |
|---|---|---|---|---|---|
| `docs/shay-master-checklist-2026-06-15.md` | canonical resumable control checklist | observed_artifact | parent-maintained repo doc | reopen + update after each meaningful slice | parent readback of actual file |
| `docs/shay-source-of-truth-rules-2026-06-17.md` | doctrine/control rule | observed_artifact | parent-authored control doc | checklist + verification doc must reflect it | parent readback |
| `docs/shay-truth-surface-rubric-2026-06-13.md` | baseline truth vocabulary | observed_artifact | existing repo doctrine | may be superseded only by newer explicit doctrine | parent readback |
| `shay_cli/capabilities_cmd.py` | executable capability gate/control logic | implemented_unverified | code in working tree/branch | test path + runtime use for exact claim | file read + tests + task use |
| `shay_cli/intelligence_cmd.py` | assembled intelligence control surface | implemented_unverified | code in working tree/branch | runtime use or direct CLI validation for exact claim | file read + command validation |
| `agent/process_intelligence.py` | durable run/proof ledger spine | implemented_unverified | code in working tree/branch | actual recorded run evidence using the schema | file read + ledger artifact |
| `agent/curator.py` | curator scheduler/state control | implemented_unverified | code in working tree/branch | explicit curator-state/runtime validation | file read + state artifact |
| `obsidian/01-Shay-Platform/Agent-Capability-Matrix.md` | shared human/agent capability note | partial | curated shared vault note | reality-class rewrite + proof-backed updates | parent readback; no row counts as proof by wording alone |

## Drift archaeology notes
1. Drift appears when one artifact is treated as if it answers more truth questions than it really does.
2. Drift appears when docs say "active" or "installed" without naming the proof surface.
3. Drift appears when delegate output is accepted as closure rather than lead generation.
4. Drift appears when curated shared notes are not marked as seeded, partial, or proven.
5. Drift appears when branch truth and runtime truth are collapsed into one sentence.

## Source ledger
- `/Users/famtasticfritz/famtastic/shay-shay/docs/shay-master-checklist-2026-06-15.md`
- `/Users/famtasticfritz/famtastic/shay-shay/docs/learning-loop-verification-run-2026-06-15.md`
- `/Users/famtasticfritz/famtastic/shay-shay/docs/shay-truth-surface-rubric-2026-06-13.md`
- `/Users/famtasticfritz/famtastic/shay-shay/docs/research-artifact-capture-protocol.md`
- `/Users/famtasticfritz/famtastic/shay-shay/shay_cli/capabilities_cmd.py`
- `/Users/famtasticfritz/famtastic/shay-shay/shay_cli/intelligence_cmd.py`
- `/Users/famtasticfritz/famtastic/shay-shay/agent/process_intelligence.py`
- `/Users/famtasticfritz/famtastic/shay-shay/agent/curator.py`
- `/Users/famtasticfritz/famtastic/obsidian/01-Shay-Platform/Agent-Capability-Matrix.md`
- `/Users/famtasticfritz/famtastic/scripts/plans/audit.js`

## Next actions
1. Fold the doctrine and reconstruction results back into the master checklist.
2. Mark source-of-truth rules and swarm preflight complete only after the docs are reopened and linked.
3. Run parent verification on the changed artifacts and git state before any closeout claim.
4. Queue matrix wording cleanup or write-back logic as the next implementation slice instead of pretending it is already solved.

## Resume sentence
Resume by reopening the doctrine doc, checklist, and verification run note, then promote only the claims that are backed by direct parent reads and explicit proof surfaces.