---
title: review-exp_20260622_8fcb50fb
type: note
permalink: famtastic/05-captures/review/review-exp-20260622-8fcb50fb
---

# Capture Review Packet — review-exp_20260622_8fcb50fb

**Source:** obsidian/05-Captures/exports/2026-06-22/exp_20260622_8fcb50fb/export.md
**Status:** review_required
**Created:** 2026-06-22T18:12:29.026Z

This packet is review-only. It proposes destinations; it does not write canonical memory.

## Design decisions

1. **Title: Conversation Export Traceable Intelligence Test Case Purpose: Turn this conversation lane into the proving ground**
   - Source heading: msg_0002_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Title: Conversation Export Traceable Intelligence Test Case Purpose: Turn this conversation lane into the proving ground for a structured export system that improves recall, queryability, traceability, and downstream reuse. Goal: Use this exact conversation as the first-class test case for a canonical export pipeline that can prove better recall with structured data, source traversal, restart continuity, downstream consumer reuse, and pruning discipline.

2. **Every X must register a non-blocking follow-up bundle rather than forcing all downstream processes into the same creatio**
   - Source heading: msg_0003_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Every X must register a non-blocking follow-up bundle rather than forcing all downstream processes into the same creation step.

3. **resolver contract: baseline proof must store the exact resolved artifact path/ID used for grounding before any compariso**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: resolver contract: baseline proof must store the exact resolved artifact path/ID used for grounding before any comparison run is valid

4. **evidence-bind requirement: baseline proof must resolve the search result to an exact session artifact/path/ID used for t**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: evidence-bind requirement: baseline proof must resolve the search result to an exact session artifact/path/ID used for the grounded answer

5. **canonical saved location when implemented: `obsidian/05-Captures/exports/baselines/<baseline-id>/baseline.md` plus machi**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: canonical saved location when implemented: `obsidian/05-Captures/exports/baselines/<baseline-id>/baseline.md` plus machine-readable sidecar `baseline.json`

6. **Canonical expected answers:**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical expected answers:

7. **Canonical-answer bind rule:**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical-answer bind rule:

8. **before any scoring run, the baseline proof packet must bind both target answers to exact evidence excerpts and anchors f**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: before any scoring run, the baseline proof packet must bind both target answers to exact evidence excerpts and anchors from the resolved frozen artifact

9. **the scorer must compare baseline and structured runs against that evidence-bound canonical answer set, not the prose bul**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: the scorer must compare baseline and structured runs against that evidence-bound canonical answer set, not the prose bullets alone

10. **Comparison method: deterministic human-readable rubric against the canonical expected answers, with the structured expor**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Comparison method: deterministic human-readable rubric against the canonical expected answers, with the structured export surface named in the proof.

11. **Canonical anchor schema:**
   - Source heading: msg_0005_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical anchor schema:

12. **Boundary rule for this brief: include a message only if it is at or before the frozen `end_message_anchor`; later messag**
   - Source heading: msg_0005_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Boundary rule for this brief: include a message only if it is at or before the frozen `end_message_anchor`; later messages in the same lane are excluded from the frozen seed and must become child exports if captured.

13. **Seed export must receive an immutable export ID when implemented; that ID becomes the root trace node for this test case**
   - Source heading: msg_0005_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Seed export must receive an immutable export ID when implemented; that ID becomes the root trace node for this test case.

14. **Any replay/evaluation run must name whether it uses the seed export, a child export, or a later revision.**
   - Source heading: msg_0005_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Any replay/evaluation run must name whether it uses the seed export, a child export, or a later revision.

15. **`source_locator` is the canonical source-reference field.**
   - Source heading: msg_0006_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: `source_locator` is the canonical source-reference field.

16. **Root-resolution algorithm (must run before first export write):**
   - Source heading: msg_0006_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Root-resolution algorithm (must run before first export write):

17. **if neither exists, set `session_id: null` and mark `session_id_status: missing`; capture must still proceed if `root_con**
   - Source heading: msg_0006_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: if neither exists, set `session_id: null` and mark `session_id_status: missing`; capture must still proceed if `root_conversation_id` can be resolved

18. **same conversation observed from multiple surfaces/views: one canonical `root_conversation_id` must win and all other obs**
   - Source heading: msg_0006_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: same conversation observed from multiple surfaces/views: one canonical `root_conversation_id` must win and all other observed identifiers become aliases linked to that root

19. **Deterministic fallback rule: identical source surface, source locator/permalink, and freeze anchor must resolve to the s**
   - Source heading: msg_0006_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Deterministic fallback rule: identical source surface, source locator/permalink, and freeze anchor must resolve to the same `root_conversation_id`.

20. **Uniqueness rule: two exports may not claim the same `export_id`; if the seed is re-captured, it must resolve to the same**
   - Source heading: msg_0006_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Uniqueness rule: two exports may not claim the same `export_id`; if the seed is re-captured, it must resolve to the same root ID plus explicit revision lineage rather than a silent duplicate root.

21. **Identity Authority: 1**
   - Source heading: msg_0006_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Identity Authority: 1. if the source surface provides a native conversation ID, normalize and use it as the canonical root seed 2. else if a canonical artifact permalink/path exists, normalize and use it as the canonical root seed 3. else if the conversation is a live unsaved lane, create an immutable freeze-manifest/transcript artifact first and use its saved path as `source_locator` 4. else derive a deterministic fallback seed from normalized `source_surface + source_locator + start_message_anchor + end_message_anchor + freeze_timestamp` 5. emit exactly one `root_conversation_id` from the chosen seed plus `root_resolution_version` 6. record aliases for any non-winning identifiers, but do n

22. **[x] If `session_search` does not resolve directly to a saved session artifact, create the canonical freeze-manifest/tran**
   - Source heading: msg_0007_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: [x] If `session_search` does not resolve directly to a saved session artifact, create the canonical freeze-manifest/transcript artifact first and bind its path/ID

23. **[x] Define the canonical export contract with three required outputs: export artifact, restart packet, and pointer trail**
   - Source heading: msg_0007_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: [x] Define the canonical export contract with three required outputs: export artifact, restart packet, and pointer trail

24. **Any repo-root `captures/...` path is treated as legacy shorthand and must resolve to the authority root before proof or**
   - Source heading: msg_0010_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Any repo-root `captures/...` path is treated as legacy shorthand and must resolve to the authority root before proof or rebuild work is valid

25. **Canonical file path: `obsidian/05-Captures/exports/baselines/<baseline-id>/baseline.md` plus machine-readable sidecar `b**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical file path: `obsidian/05-Captures/exports/baselines/<baseline-id>/baseline.md` plus machine-readable sidecar `baseline.json`

26. **Minimum rebuild fields inside canonical files: `baseline_id`, replay query, tool surface, run timestamp, returned sessio**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Minimum rebuild fields inside canonical files: `baseline_id`, replay query, tool surface, run timestamp, returned session identifiers/paths, exact summary/excerpt lines used for each answer, canonical expected answers, and final grounded answer text used for scoring

27. **Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/export.md` plus machine-readable sidecar `export.j**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/export.md` plus machine-readable sidecar `export.json`

28. **Truth precedence: canonical file pair first, index second**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Truth precedence: canonical file pair first, index second

29. **Minimum rebuild fields inside canonical files: `root_conversation_id`, `root_resolution_version`, `export_id`, `session_**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Minimum rebuild fields inside canonical files: `root_conversation_id`, `root_resolution_version`, `export_id`, `session_id`, `session_id_status`, `source_surface`, `source_locator`, `source_path`, `created_at`, `captured_at`, `revision`, `parent_export_id`, tags, and lineage pointers

30. **Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/restart-packet.md`**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/restart-packet.md`

31. **Minimum rebuild fields inside canonical files: `export_id`, `root_conversation_id`, `captured_at`, restart summary, curr**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Minimum rebuild fields inside canonical files: `export_id`, `root_conversation_id`, `captured_at`, restart summary, current state, next step, and linked source export path

32. **Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/lineage.json`**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical file path: `obsidian/05-Captures/exports/<date>/<export-id>/lineage.json`

33. **Minimum rebuild fields inside canonical files: `export_id`, `root_conversation_id`, aliases, parent/child links, derived**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Minimum rebuild fields inside canonical files: `export_id`, `root_conversation_id`, aliases, parent/child links, derived artifact links, merge records, and tombstones

34. **Canonical file path: `obsidian/05-Captures/review/<capture-id>.md` and `.json`**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical file path: `obsidian/05-Captures/review/<capture-id>.md` and `.json`

35. **Minimum rebuild fields inside canonical files: `capture_id`, linked `export_id` or source path, proposed destinations, e**
   - Source heading: msg_0011_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Minimum rebuild fields inside canonical files: `capture_id`, linked `export_id` or source path, proposed destinations, extraction buckets, and created timestamp

36. **A lane that has not met its stopping condition but is externally interrupted must be classified as `interrupted`, not `f**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: A lane that has not met its stopping condition but is externally interrupted must be classified as `interrupted`, not `failed`.

37. **`interrupted` runs must emit a checkpoint artifact with: current stopping condition, last completed round, next required**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: `interrupted` runs must emit a checkpoint artifact with: current stopping condition, last completed round, next required action, resume command/path, whether background continuation is allowed, and a snapshot of the exact grounding inputs needed to resume from the same truth surface.

38. **Busy mode is a first-class runtime state for long-running review/extraction/orchestration lanes**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Busy mode is a first-class runtime state for long-running review/extraction/orchestration lanes. While busy, the lane must expose: active objective, current phase/round, stop condition, interruption policy, and latest checkpoint pointer.

39. **If a lane is safe for unattended continuation, it should be eligible for explicit background execution with pinned workd**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: If a lane is safe for unattended continuation, it should be eligible for explicit background execution with pinned workdir plus notify/checkpoint semantics rather than forcing an either/or choice against incoming work.

40. **Background continuation must start from the snapshot/resume packet, not from chat memory**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Background continuation must start from the snapshot/resume packet, not from chat memory. Same starting point means same frozen inputs, same workdir/lane binding, same stop condition, and same proof pointer.

41. **Parent reporting must distinguish: `completed`, `failed`, `interrupted`, `backgrounded`, and `superseded`.**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Parent reporting must distinguish: `completed`, `failed`, `interrupted`, `backgrounded`, and `superseded`.

42. **If a second incoming task is higher priority, architecture should prefer dual-track handling when safe: checkpoint the a**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: If a second incoming task is higher priority, architecture should prefer dual-track handling when safe: checkpoint the active lane, continue it in background if eligible, and service the new task without rewriting history as a simple fail.

43. **Proof packets for evaluation lanes must record whether termination was endogenous (`completed`/`failed`) or exogenous (`**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Proof packets for evaluation lanes must record whether termination was endogenous (`completed`/`failed`) or exogenous (`interrupted`/`backgrounded`).

44. **Adversarial review must operate on saved X artifacts and their follow-up outputs, not on live truth surfaces directly.**
   - Source heading: msg_0013_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Adversarial review must operate on saved X artifacts and their follow-up outputs, not on live truth surfaces directly.

45. **Restart surface must restore context from the restart packet using the saved linked source export path and named next-st**
   - Source heading: msg_0014_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Restart surface must restore context from the restart packet using the saved linked source export path and named next-step state.

46. **Lineage surface must traverse backward to the seed export and forward to at least one derived artifact from the lineage**
   - Source heading: msg_0014_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Lineage surface must traverse backward to the seed export and forward to at least one derived artifact from the lineage file without broad search.

47. **At least one downstream consumer must ingest export metadata from the structured export/index surface directly and produ**
   - Source heading: msg_0014_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: At least one downstream consumer must ingest export metadata from the structured export/index surface directly and produce a proof artifact.

48. **Canonical first-consumer proof artifact path: `obsidian/05-Captures/review/<capture-id>.md` and `.json`, linked back to**
   - Source heading: msg_0014_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Canonical first-consumer proof artifact path: `obsidian/05-Captures/review/<capture-id>.md` and `.json`, linked back to the seed `export_id`.

49. **If the audit shows `fam-hub capture extract` / `scripts/capture-insights.js` is stale or not live enough, a replacement**
   - Source heading: msg_0014_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: If the audit shows `fam-hub capture extract` / `scripts/capture-insights.js` is stale or not live enough, a replacement first consumer must be named and bound before any pass/fail scoring run.

50. **Final proof must name the replay steps or commands used for each consumer proof.**
   - Source heading: msg_0014_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Final proof must name the replay steps or commands used for each consumer proof.

51. **From the canonical export directory alone, the system must be able to deterministically rebuild export, restart, and lin**
   - Source heading: msg_0015_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: From the canonical export directory alone, the system must be able to deterministically rebuild export, restart, and lineage indexes.

52. **Review packets are external derived artifacts: they must be linked by path and `export_id`, but they are not required in**
   - Source heading: msg_0015_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Review packets are external derived artifacts: they must be linked by path and `export_id`, but they are not required inputs to rebuild export/restart/lineage indexes.

53. **Index rebuild proof must show that the rebuilt indexes preserve root IDs, export IDs, parent/child links, aliases, and l**
   - Source heading: msg_0015_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: Index rebuild proof must show that the rebuilt indexes preserve root IDs, export IDs, parent/child links, aliases, and linked artifact pointers needed for recall and traversal.

54. **indexes: append-only or explicitly rebuilt from canonical files; never prune in a way that breaks reconstruction**
   - Source heading: msg_0016_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: indexes: append-only or explicitly rebuilt from canonical files; never prune in a way that breaks reconstruction

55. **review packets: prune only after promotion/archival decision is recorded**
   - Source heading: msg_0016_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `.wolf/cerebrum.md`
   - Confidence: high
   - Summary: review packets: prune only after promotion/archival decision is recorded

## Breakthroughs

- none detected

## Gaps

1. **--- schema_version: 0.1.0 root_conversation_id: conv_71490bfe7c8dd6e3 export_id: exp_20260622_8fcb50fb source_surface: s**
   - Source heading: Document
   - Proposed destination: `gaps.jsonl`
   - Confidence: high
   - Summary: --- schema_version: 0.1.0 root_conversation_id: conv_71490bfe7c8dd6e3 export_id: exp_20260622_8fcb50fb source_surface: shay-chat-brief source_locator: famtastic/01-shay-platform/conversation-export-traceable-intelligence-brief source_path: obsidian/05-Captures/freezes/2026-06-22/frz_20260622_71490bfe/transcript.md created_at: 2026-06-22 18:12:24.696000+00:00 captured_at: 2026-06-22 18:12:24.696000+00:00 session_id: null session_id_status: missing revision: 1 parent_export_id: null lane: conversation-freeze-proof tags: freeze_timestamp: 2026-06-22 18:12:18.685000+00:00 freeze_manifest_path: obsidian/05-Captures/freezes/2026-06-22/frz_20260622_71490bfe/freeze-manifest.json freeze_transcript_pa

2. **partial hit: one target recovered correctly while the other is missing or materially incomplete**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `gaps.jsonl`
   - Confidence: high
   - Summary: partial hit: one target recovered correctly while the other is missing or materially incomplete

3. **`session_id_status` values: `native`, `derived`, or `missing`.**
   - Source heading: msg_0006_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `gaps.jsonl`
   - Confidence: high
   - Summary: `session_id_status` values: `native`, `derived`, or `missing`.

4. **`failed` is reserved for runs that reached a terminal negative outcome inside the lane logic: proof disproved, blocker u**
   - Source heading: msg_0012_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `gaps.jsonl`
   - Confidence: high
   - Summary: `failed` is reserved for runs that reached a terminal negative outcome inside the lane logic: proof disproved, blocker unhandled, max rounds exhausted, command error unrecovered, or explicit stop condition missed without continuity protection.

## Lessons

1. **X is allowed to exist as raw baseline capture before parsing, summarization, lesson extraction, restart packet generatio**
   - Source heading: msg_0003_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: X is allowed to exist as raw baseline capture before parsing, summarization, lesson extraction, restart packet generation, promotion review, or pruning logic are complete.

2. **Artifact X Follow-Up Bundle: 1**
   - Source heading: msg_0013_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `SITE-LEARNINGS.md`
   - Confidence: high
   - Summary: Artifact X Follow-Up Bundle: 1. parse/export pass 2. restart packet pass 3. lesson extraction pass 4. promotion-review pass 5. prune/archive review pass

## Contradictions

1. **fail: either answer wrong, invented, or not source-grounded**
   - Source heading: msg_0004_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `FAMTASTIC-STATE.md`
   - Confidence: high
   - Summary: fail: either answer wrong, invented, or not source-grounded

2. **[x] Audit live checkpoint/export surfaces and separate working capability from stale or partial intent**
   - Source heading: msg_0007_bda51644a26a_cap_6c4a24ff4a
   - Proposed destination: `FAMTASTIC-STATE.md`
   - Confidence: high
   - Summary: [x] Audit live checkpoint/export surfaces and separate working capability from stale or partial intent