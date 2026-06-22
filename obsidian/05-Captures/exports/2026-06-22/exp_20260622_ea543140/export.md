---
schema_version: 0.1.0
root_conversation_id: conv_b62d27bb2d083f64
export_id: exp_20260622_ea543140
source_surface: shay-chat-brief
source_locator: famtastic/01-shay-platform/conversation-export-traceable-intelligence-brief
source_path: obsidian/01-Shay-Platform/Conversation-Export-Traceable-Intelligence-Brief.md
created_at: 2026-06-22 17:45:43.796000+00:00
captured_at: 2026-06-22 17:45:43.796000+00:00
session_id: null
session_id_status: missing
revision: 1
parent_export_id: null
lane: conversation-export-proof
tags:
- shay-platform
- capture
- conversation-export
- proof
freeze_timestamp: 2026-06-22 17:09:53.811000+00:00
permalink: famtastic/05-captures/exports/2026-06-22/exp-20260622-ea543140/export
---

# Export exp_20260622_ea543140

Source title: Conversation Export Traceable Intelligence Test Case
Source file: obsidian/01-Shay-Platform/Conversation-Export-Traceable-Intelligence-Brief.md
Root conversation: conv_b62d27bb2d083f64

## Artifact X

- Raw source captured first.
- This export is the structured descendant of the saved source artifact.
- Follow-up consumers are attached but non-blocking.

## Follow-up bundle

- parse_export: completed (blocking: no)
- restart_packet: completed (blocking: no)
- lesson_extraction: pending (blocking: no)
- promotion_review: pending (blocking: no)
- prune_archive_review: pending (blocking: no)

## Source excerpts

- ---
- title: Conversation-Export-Traceable-Intelligence-Brief
- type: note
- permalink: famtastic/01-shay-platform/conversation-export-traceable-intelligence-brief
- ---
- Title: Conversation Export Traceable Intelligence Test Case
- Purpose: Turn this conversation lane into the proving ground for a structured export system that improves recall, queryability, traceability, and downstream reuse.
- Goal: Use this exact conversation as the first-class test case for a canonical export pipeline that can prove better recall with structured data, source traversal, restart continuity, downstream consumer reuse, and pruning discipline.
- Artifact-first rule:
- - The primary success condition is to create/store conversation artifact X first.
- - X is allowed to exist as raw baseline capture before parsing, summarization, lesson extraction, restart packet generation, promotion review, or pruning logic are complete.
- - Every X must register a non-blocking follow-up bundle rather than forcing all downstream processes into the same creation step.

## Source body

```text
---
title: Conversation-Export-Traceable-Intelligence-Brief
type: note
permalink: famtastic/01-shay-platform/conversation-export-traceable-intelligence-brief
---

Title: Conversation Export Traceable Intelligence Test Case
Purpose: Turn this conversation lane into the proving ground for a structured export system that improves recall, queryability, traceability, and downstream reuse.
Goal: Use this exact conversation as the first-class test case for a canonical export pipeline that can prove better recall with structured data, source traversal, restart continuity, downstream consumer reuse, and pruning discipline.

Artifact-first rule:
- The primary success condition is to create/store conversation artifact X first.
- X is allowed to exist as raw baseline capture before parsing, summarization, lesson extraction, restart packet generation, promotion review, or pruning logic are complete.
- Every X must register a non-blocking follow-up bundle rather than forcing all downstream processes into the same creation step.

Acceptance Criteria:
- Replay prompt: "before we started talking about the importance of this data, what was the other topic, and what was the list we talked about from earlier?"
- Baseline reference: the search-heavy recall path proven in this session via `session_search`.
- Baseline proof binding:
  - exact baseline query: `conversation export OR data importance OR last run OR restart packet OR downstream consumers`
  - discovery tool surface: `session_search`
  - baseline resolution ladder:
    1. `session_search` hit
    2. resolve to exact captured session note path under `obsidian/05-Captures/sessions/...` when present
    3. if absent, resolve to the exact freeze-manifest/transcript/export artifact created for this lane
    4. if neither exists, baseline run is blocked and scoring cannot start
  - resolver tie-break order:
    1. exact session note for this lane if uniquely matched
    2. else exact freeze artifact for the frozen window
    3. else candidate whose anchors fully cover the frozen window
    4. if still tied, abort baseline as ambiguous and record manual disambiguation requirement in the proof packet
  - resolver contract: baseline proof must store the exact resolved artifact path/ID used for grounding before any comparison run is valid
  - evidence-bind requirement: baseline proof must resolve the search result to an exact session artifact/path/ID used for the grounded answer
  - canonical saved location when implemented: `obsidian/05-Captures/exports/baselines/<baseline-id>/baseline.md` plus machine-readable sidecar `baseline.json`
  - no scoring run is valid unless the baseline proof packet is referenced by ID/path in the final proof
- Canonical expected answers:
  - Other topic: how the last run went / what happened in the last run
  - Earlier list: Shay continuity / restart, research loops, FAMtastic Thoughts, skill extraction, postmortems, idea mining, project intelligence, and long-history pattern review
- Canonical-answer bind rule:
  - before any scoring run, the baseline proof packet must bind both target answers to exact evidence excerpts and anchors from the resolved frozen artifact
  - the scorer must compare baseline and structured runs against that evidence-bound canonical answer set, not the prose bullets alone
- Scoring rule:
  - exact match: same answer with equivalent wording and no material omission
  - acceptable paraphrase: same meaning with minor wording changes
  - partial hit: one target recovered correctly while the other is missing or materially incomplete
  - fail: either answer wrong, invented, or not source-grounded
- Comparison method: deterministic human-readable rubric against the canonical expected answers, with the structured export surface named in the proof.
- Evaluation procedure:
  - baseline run start event: launch of the saved baseline query
  - baseline evidence-bind step: resolve the baseline search result to an exact saved session artifact/path/ID
  - baseline run stop event: grounded answer produced with cited evidence artifact source
  - structured run start event: first lookup against the structured export/index surface
  - structured run stop event: grounded answer produced with cited export/lineage source
  - source hop rule: each distinct source artifact or indexed record opened to recover the answer counts as one hop
  - sidecar/index rule: reading an index or sidecar counts as a hop if it is opened as a distinct evidence surface
  - retry rule: retries and alternate lookups count toward hop and timing totals
  - repeated-open rule: opening the same artifact a second time counts as another hop only if it is reopened after leaving it for a different evidence surface; repeated reads within the same open artifact count once
  - latency rule: measure wall-clock elapsed time from start event to stop event for each run and store it in fixed proof fields
  - required proof fields for both baseline and structured runs: `run_id`, `start_timestamp`, `stop_timestamp`, `elapsed_ms`, `hop_count`, `artifacts_opened[]`, `retries`, `final_answer`, `grounding_sources[]`
- Metrics:
  - latency from query start to grounded answer
  - number of source hops needed to recover the answer
  - exact-source recovery rate for the prior-topic answer and the earlier-list answer
  - forward/back traversal success rate from source conversation to derived artifacts and back
- Pass threshold:
  - fewer source hops than the baseline path
  - equal or better answer correctness than the baseline path
  - direct recovery of both target answers from the structured export surface
  - successful backtrace to the seed export and forward trace to at least one derived artifact without manual broad search
  - consumer proof steps exist for restart, lineage traversal, and at least one downstream reuse surface

Source Freeze Rule:
- Seed conversation scope: this active conversation lane about last-run recall, conversation export, restart packets, downstream consumers, and structured memory improvement.
- Mandatory precondition before implementation: bind the seed source locator in the baseline proof packet or export proof packet as `source_surface` plus exact native conversation ID when available, else exact artifact permalink/path.
- Mandatory freeze record format before any capture/scoring work:
  - `start_message_anchor`
  - `end_message_anchor`
  - `freeze_timestamp`
  - `boundary_rule`
  - `source_surface`
  - `source_locator`
- Canonical anchor schema:
  - use native `message_id` when the source surface exposes it
  - otherwise derive anchor as `ordinal + timestamp + speaker_hash`
  - if reliable per-message timestamps are unavailable, derive anchor as `ordinal + speaker_hash + capture_pass_id`
- Fallback anchor derivation rule: when native message IDs are unavailable, enumerate messages in source order within the live lane, preserve the observed timestamp string when available, hash the speaker label deterministically, and bind the anchor tuple exactly as captured.
- Allowed anchor modes:
  - native `message_id` mode for surfaces that expose stable message IDs
  - `ordinal + timestamp + speaker_hash` mode for surfaces with ordered messages and reliable timestamps
  - `ordinal + speaker_hash + capture_pass_id` mode for live lanes without per-message timestamps, with `capture_pass_id` recorded in the freeze manifest
- Boundary rule for this brief: include a message only if it is at or before the frozen `end_message_anchor`; later messages in the same lane are excluded from the frozen seed and must become child exports if captured.
- Frozen window descriptor is required for validity: exact start message anchor, exact end message anchor, freeze timestamp, and rule for inclusion/exclusion of messages that cross the freeze boundary.
- No export, baseline, revision, replay, or consumer-proof work is valid until that seed source locator is frozen.
- Freeze anchor timestamp: 2026-06-21 19:55 EDT for the initial seed brief capture.
- Seed export must receive an immutable export ID when implemented; that ID becomes the root trace node for this test case.
- Follow-up work after the freeze is tracked as child exports or explicit revisions, not silently merged into the original seed artifact.
- Any replay/evaluation run must name whether it uses the seed export, a child export, or a later revision.

Identity Authority:
- Required root fields: `root_conversation_id`, `root_resolution_version`, `export_id`, `session_id`, `session_id_status`, `source_surface`, `source_locator`, `source_path`, `created_at`, `captured_at`, `revision`, `parent_export_id`.
- `source_locator` is the canonical source-reference field.
- `source_path` is optional and only used as a file-path alias when the locator resolves to a saved artifact path.
- `session_id_status` values: `native`, `derived`, or `missing`.
- Root-resolution algorithm (must run before first export write):
  1. if the source surface provides a native conversation ID, normalize and use it as the canonical root seed
  2. else if a canonical artifact permalink/path exists, normalize and use it as the canonical root seed
  3. else if the conversation is a live unsaved lane, create an immutable freeze-manifest/transcript artifact first and use its saved path as `source_locator`
  4. else derive a deterministic fallback seed from normalized `source_surface + source_locator + start_message_anchor + end_message_anchor + freeze_timestamp`
  5. emit exactly one `root_conversation_id` from the chosen seed plus `root_resolution_version`
  6. record aliases for any non-winning identifiers, but do not permit a second root
- Identity precedence order:
  - native conversation/session ID from the source surface when available
  - saved session artifact permalink/path when native conversation ID is absent
  - deterministic fallback ID derived from source surface + seed locator + freeze timestamp
- Session ID rule:
  - if the source provides a native session ID, store it and mark `session_id_status: native`
  - if no native session ID exists but a stable derived alias can be produced from source surface + locator + freeze anchor, store that alias and mark `session_id_status: derived`
  - if neither exists, set `session_id: null` and mark `session_id_status: missing`; capture must still proceed if `root_conversation_id` can be resolved
- Normalization rules:
  - native-ID-present only: native conversation/session ID anchors the root
  - artifact-path-present only: permalink/path anchors the root
  - both native ID and artifact path present: native ID wins; artifact path is stored as an alias/pointer, not a second root
  - same conversation observed from multiple surfaces/views: one canonical `root_conversation_id` must win and all other observed identifiers become aliases linked to that root
- Deterministic fallback rule: identical source surface, source locator/permalink, and freeze anchor must resolve to the same `root_conversation_id`.
- Dedupe/merge rule: when two candidate roots share the same normalized native ID or the same deterministic fallback identity, merge them under one root and record the merge in lineage/proof.
- Revision rule: re-capture of the same frozen source window with changed normalization, metadata cleanup, or equivalent bounded capture corrections creates a new `export_id` revision under the same `root_conversation_id`.
- Child export rule: any capture that includes post-freeze conversation content, follow-up work, or derived continuation creates a new child export with `parent_export_id` pointing to the seed or revision it came from.
- Boundary rule: post-freeze additions in the same lane can never be recorded as a revision of the frozen seed unless they remain fully inside the original frozen message window.
- Uniqueness rule: two exports may not claim the same `export_id`; if the seed is re-captured, it must resolve to the same root ID plus explicit revision lineage rather than a silent duplicate root.

Tasks:
- [ ] Audit live checkpoint/export surfaces and separate working capability from stale or partial intent
- [ ] Freeze the seed source locator and bounded message window for this conversation
- [ ] If `session_search` does not resolve directly to a saved session artifact, create the canonical freeze-manifest/transcript artifact first and bind its path/ID
- [ ] Capture and freeze the baseline proof packet from `session_search` before any structured-export scoring, replay, or consumer-proof run begins
- [ ] Confirm `fam-hub capture extract` / `scripts/capture-insights.js` as the first live consumer or bind a replacement before scoring
- [ ] Capture this conversation as the test case and define its source identity model (`conversation_id`, `session_id`, source surface, timestamps, lane/project/studio tags)
- [ ] Define the canonical export contract with three required outputs: export artifact, restart packet, and pointer trail
- [ ] Define the traceability contract so this conversation can be traversed backward to source and forward to every derived artifact
- [ ] Define the tagging model for person, lane, project, studio, topic, privacy, and derived-output class
- [ ] Define the consumer map so every produced artifact has an explicit downstream owner/use
- [ ] Define the pruning contract so exports, indexes, and derived artifacts do not become unbounded landfill
- [ ] Define pruning policy: retention classes, non-prunable proof artifacts, pruning triggers, review authority, and tombstone behavior
- [ ] Decide the file-first plus index/DB architecture keyed by conversation/session identity
- [ ] Define interruption semantics, busy-mode signaling, and background-continuation rules so long-running review lanes do not get mislabeled as simple failures
- [ ] Prove the first downstream consumer using the seed export and save its proof artifact
- [ ] Re-run the original recall task against the improved structure and compare speed, precision, and traversal clarity against the baseline search-heavy path
- [ ] Record proof, gaps, and next build order for implementation

Status: blocked
Started: 2026-06-21 19:55 EDT
Ended:
Execution: swarm
Research: yes — this conversation is the seed research artifact and baseline proof case
Review: active — adversarial review loop remains open until no concern above minor remains or 50 review rounds are exhausted
Skills: shay-shay
Blocked By: none

Proof:
- This conversation is preserved as the baseline test case that revealed both the current success path and the current retrieval ceiling
- The original recall task can be repeated later against structured exports to show measurable improvement in search breadth, latency, and source traversal
- The resulting design explicitly covers creation, consumption, traceability, and pruning rather than transcript capture alone

Canonical Root Mapping:
- Authority root: `obsidian/05-Captures/`
- Export artifacts live under `obsidian/05-Captures/exports/...`
- Session notes live under `obsidian/05-Captures/sessions/...`
- Review packets live under `obsidian/05-Captures/review/...`
- Indexes live under `obsidian/05-Captures/index/...`
- Any repo-root `captures/...` path is treated as legacy shorthand and must resolve to the authority root before proof or rebuild work is valid

Canonical Output / Ownership Matrix:
- Baseline proof packet
  - Canonical file path: `obsidian/05-Captures/exports/baselines/<baseline-id>/baseline.md` plus machine-readable sidecar `baseline.json`
  - Index registration: `obsidian/05-Captures/index/baselines.jsonl`
  - Owning system: evaluation/proof surface
  - Truth precedence: baseline packet files first, baseline index second
  - Minimum rebuild fields inside canonical files: `baseline_id`, replay query, tool surface, run timestamp, returned session identifiers/paths, exact summary/excerpt lines used for each answer, canonical expected answers, and final grounded answer text used for scoring
- Export artifact
  - Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/export.md` plus machine-readable sidecar `export.json`
  - Index registration: `obsidian/05-Captures/index/exports.jsonl`
  - Owning system: conversation export module
  - Truth precedence: canonical file pair first, index second
  - Minimum rebuild fields inside canonical files: `root_conversation_id`, `root_resolution_version`, `export_id`, `session_id`, `session_id_status`, `source_surface`, `source_locator`, `source_path`, `created_at`, `captured_at`, `revision`, `parent_export_id`, tags, and lineage pointers
- Restart packet
  - Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/restart-packet.md`
  - Index registration: `obsidian/05-Captures/index/restart-packets.jsonl`
  - Owning system: startup/continuation surface
  - Truth precedence: restart packet file first, restart index second
  - Minimum rebuild fields inside canonical files: `export_id`, `root_conversation_id`, `captured_at`, restart summary, current state, next step, and linked source export path
- Pointer trail / lineage links
  - Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/lineage.json`
  - Index registration: `obsidian/05-Captures/index/lineage.jsonl`
  - Owning system: traceability/consumer layer
  - Truth precedence: lineage file first, lineage index second
  - Minimum rebuild fields inside canonical files: `export_id`, `root_conversation_id`, aliases, parent/child links, derived artifact links, merge records, and tombstones
- Review extraction packet
  - Canonical file path: `obsidian/05-Captures/review/<capture-id>.md` and `.json`
  - Index registration: `obsidian/05-Captures/index/review-packets.jsonl`
  - Owning system: capture/extract review flow
  - Truth precedence: review packet files first, review packet index second
  - Minimum rebuild fields inside canonical files: `capture_id`, linked `export_id` or source path, proposed destinations, extraction buckets, and created timestamp

Run-State / Interruption Contract:
- A lane that has not met its stopping condition but is externally interrupted must be classified as `interrupted`, not `failed`.
- `failed` is reserved for runs that reached a terminal negative outcome inside the lane logic: proof disproved, blocker unhandled, max rounds exhausted, command error unrecovered, or explicit stop condition missed without continuity protection.
- `interrupted` runs must emit a checkpoint artifact with: current stopping condition, last completed round, next required action, resume command/path, whether background continuation is allowed, and a snapshot of the exact grounding inputs needed to resume from the same truth surface.
- Snapshot/resume packet is the handoff primitive for background continuation. Minimum fields: `lane_id`, `objective`, `status`, `stop_condition`, `workdir`, `branch_or_lane`, `source_artifacts[]`, `frozen_inputs[]`, `last_completed_step`, `next_step`, `resume_command`, `proof_pointer`, `created_at`, and `snapshot_hash`.
- Busy mode is a first-class runtime state for long-running review/extraction/orchestration lanes. While busy, the lane must expose: active objective, current phase/round, stop condition, interruption policy, and latest checkpoint pointer.
- If a lane is safe for unattended continuation, it should be eligible for explicit background execution with pinned workdir plus notify/checkpoint semantics rather than forcing an either/or choice against incoming work.
- Background continuation must start from the snapshot/resume packet, not from chat memory. Same starting point means same frozen inputs, same workdir/lane binding, same stop condition, and same proof pointer.
- Parent reporting must distinguish: `completed`, `failed`, `interrupted`, `backgrounded`, and `superseded`.
- If a second incoming task is higher priority, architecture should prefer dual-track handling when safe: checkpoint the active lane, continue it in background if eligible, and service the new task without rewriting history as a simple fail.
- Proof packets for evaluation lanes must record whether termination was endogenous (`completed`/`failed`) or exogenous (`interrupted`/`backgrounded`).

Artifact X Follow-Up Bundle:
- Triggered when conversation artifact X is created/stored.
- Follow-ups are attached, not blocking:
  1. parse/export pass
  2. restart packet pass
  3. lesson extraction pass
  4. promotion-review pass
  5. prune/archive review pass
- Attached follow-ups may run later via reminder, cron, background worker, or explicit next-lane pickup.
- Failure or delay in a follow-up does not invalidate creation of X.
- Adversarial review must operate on saved X artifacts and their follow-up outputs, not on live truth surfaces directly.

Consumer Proof Requirements:
- First required downstream consumer: `fam-hub capture extract <source-file>` backed by `scripts/capture-insights.js`, using the seed export as input and producing a review packet proof artifact.
- Required first-consumer input contract: a saved source file path to the seed export/session artifact that the extractor can read directly.
- Restart surface must restore context from the restart packet using the saved linked source export path and named next-step state.
- Lineage surface must traverse backward to the seed export and forward to at least one derived artifact from the lineage file without broad search.
- At least one downstream consumer must ingest export metadata from the structured export/index surface directly and produce a proof artifact.
- Canonical first-consumer proof artifact path: `obsidian/05-Captures/review/<capture-id>.md` and `.json`, linked back to the seed `export_id`.
- If the audit shows `fam-hub capture extract` / `scripts/capture-insights.js` is stale or not live enough, a replacement first consumer must be named and bound before any pass/fail scoring run.
- Final proof must name the replay steps or commands used for each consumer proof.

Reconstruction Guarantee:
- From the canonical export directory alone, the system must be able to deterministically rebuild export, restart, and lineage indexes.
- Review packets are external derived artifacts: they must be linked by path and `export_id`, but they are not required inputs to rebuild export/restart/lineage indexes.
- Index rebuild proof must show that the rebuilt indexes preserve root IDs, export IDs, parent/child links, aliases, and linked artifact pointers needed for recall and traversal.

Pruning Policy:
- Retention classes:
  - seed exports: retain by default; never auto-delete while they anchor proof or lineage
  - restart packets: keep the latest active packet per export lineage; older ones may be archived, not silently removed
  - child exports/revisions: retain while referenced by lineage, proof, or downstream consumers; archive before deletion
  - indexes: append-only or explicitly rebuilt from canonical files; never prune in a way that breaks reconstruction
  - review packets: prune only after promotion/archival decision is recorded
- Non-prunable proof artifacts: any seed export, lineage file, or proof packet required to replay the baseline comparison or verify back/forward traversal
- Pruning triggers: superseded revision, completed promotion, aged review packet with resolved disposition, or explicit archive pass
- Review authority: prune decisions belong to the owning capture/intelligence lane, not an unscoped background delete
- Tombstone behavior: when a derived artifact is removed or archived, leave a tombstone/redirect record preserving export ID, artifact ID, reason, timestamp, and new location if moved
```