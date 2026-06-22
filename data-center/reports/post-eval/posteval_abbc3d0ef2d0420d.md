# Conversation export traceable intelligence test case — Post-Evaluation

Evaluation ID: posteval_abbc3d0ef2d0420d
Status: completed
System: shay-shay
Created: 2026-06-22T18:01:46.891Z

## Summary

Post-evaluation for Conversation export traceable intelligence test case: 5 learnings, 3 gaps, 4 opportunities.

## Learnings

- File-first artifacts plus small JSONL indexes beat chat-only recall for bounded replay questions.
- A baseline proof packet must be frozen before structured scoring, otherwise the comparison turns mushy and political.
- The right minimal package is export artifact plus restart packet plus lineage, not transcript capture alone.
- Consumer proof matters: proving one downstream reader is more valuable than claiming the export is reusable.
- Truth precedence has to be explicit: canonical files first, indexes second, legacy shorthand never authoritative.

## Gaps

- The seed source for this run was a saved brief artifact, not a native transcript with stable message IDs.
- Lookup is still file-first plus JSONL; there is no dedicated query/replay surface yet.
- The first downstream consumer is review/extraction only; canonical memory write lanes are still separate.

## Opportunities

- process_opportunity: Standardize export-first capture closeout for meaningful conversation lanes (high)
  - action: Turn the export artifact + restart packet + lineage + proof bundle into a default closeout module for long multi-step chats.
- skill_opportunity: Conversation export and replay evaluation skill (high)
  - action: Save the working pattern as a reusable skill with commands, artifacts, proof rules, and known pitfalls.
- tool_opportunity: Dedicated query surface over conversation exports (medium)
  - action: Add a read-oriented CLI or fam-hub subcommand that resolves replay questions without manual file hopping.
- workflow_gap: Native message-ID freeze capture is missing (high)
  - action: Add a freeze-manifest or transcript capture path that preserves stable message anchors before downstream export steps.

## Proof

- brief: obsidian/01-Shay-Platform/Conversation-Export-Traceable-Intelligence-Brief.md
- baseline: obsidian/05-Captures/exports/baselines/baseline-2026-06-22-conversation-export/baseline.md
- export: obsidian/05-Captures/exports/2026-06-22/exp_20260622_ea543140/export.md
- consumer_review: obsidian/05-Captures/review/review-exp_20260622_ea543140.md
- recall_proof: obsidian/05-Captures/review/convo-export-proof-2026-06-22.md

## Next actions

- Promote the export package contract into a reusable module/skill.
- Add native transcript or freeze-manifest capture with stable anchors.
- Build a query/replay surface on top of the export and baseline indexes.
