# Conversation freeze capture — Post-Evaluation

Evaluation ID: posteval_conversation_freeze_capture_2026-06-22
Status: completed
System: shay-shay
Created: 2026-06-22T18:16:00Z

## Summary

Implemented the missing freeze-manifest/transcript capture layer under conversation export, then proved the export lane can consume the frozen artifact instead of the saved brief surrogate.

## Learnings

- The missing seam was not export packaging; it was source freezing before packaging.
- A canonical freeze directory plus one JSONL index is enough for a minimum working path.
- Export packages need to carry freeze lineage fields directly, not rely on external inference.
- File-first behavior survived the upgrade cleanly because freeze capture was added as an explicit upstream step rather than a destructive rewrite.

## Gaps

- Native provider message IDs are still not captured; the current anchor mode is derived from normalized block order plus speaker hash and capture pass ID.
- `session_id` is still missing for this test lane because the source surface available in-repo was a saved artifact, not a native provider transcript API.
- There is still no dedicated replay/query CLI over freeze + export indexes.

## Opportunities

- tool_opportunity: add a replay/query command that can resolve a question against `freezes.jsonl` plus export indexes without manual file hops.
- workflow_opportunity: make freeze capture the default precursor for bounded long-form conversation closeout lanes.
- adapter_opportunity: add native provider adapters that emit provider message IDs and timestamps into freeze manifests when the surface exposes them.

## Proof

- brief: `obsidian/01-Shay-Platform/Conversation-Freeze-Capture-Brief.md`
- freeze_manifest: `obsidian/05-Captures/freezes/2026-06-22/frz_20260622_71490bfe/freeze-manifest.json`
- export_json: `obsidian/05-Captures/exports/2026-06-22/exp_20260622_8fcb50fb/export.json`
- proof_packet: `obsidian/05-Captures/review/convo-freeze-proof-2026-06-22.md`
- consumer_review: `obsidian/05-Captures/review/review-exp_20260622_8fcb50fb.md`

## Next actions

- Add native provider transcript/message-ID adapters where the source surface allows it.
- Build a replay/query surface over the freeze/export indexes.
- Promote freeze-first closeout into the reusable conversation export module.
