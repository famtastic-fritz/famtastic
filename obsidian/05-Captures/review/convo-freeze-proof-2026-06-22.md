---
proof_id: convo-freeze-proof-2026-06-22
freeze_id: frz_20260622_71490bfe
export_id: exp_20260622_8fcb50fb
verdict: pass_with_known_gaps
permalink: famtastic/05-captures/review/convo-freeze-proof-2026-06-22
---

# Conversation freeze capture proof

## What landed
- Added `scripts/conversation-freeze.js` to create a canonical freeze manifest plus transcript artifacts before export.
- Upgraded `scripts/conversation-export.js` so it can consume `--freeze-manifest` and preserve freeze anchors inside the export package.
- Registered a canonical freeze index at `obsidian/05-Captures/index/freezes.jsonl`.
- Proved the upgraded lane with a freeze-aware export and a downstream review extraction run.

## Canonical freeze artifact
- Manifest: `obsidian/05-Captures/freezes/2026-06-22/frz_20260622_71490bfe/freeze-manifest.json`
- Transcript: `obsidian/05-Captures/freezes/2026-06-22/frz_20260622_71490bfe/transcript.md`
- Transcript sidecar: `obsidian/05-Captures/freezes/2026-06-22/frz_20260622_71490bfe/transcript.json`
- Index row: `obsidian/05-Captures/index/freezes.jsonl:1`
- Anchor mode: `ordinal_speaker_hash_capture_pass`
- Frozen window: `msg_0001_bda51644a26a_cap_6c4a24ff4a` → `msg_0016_bda51644a26a_cap_6c4a24ff4a`

## Export proof
- Prior export path: `obsidian/05-Captures/exports/2026-06-22/exp_20260622_ea543140/export.json`
- Prior seed mode: saved brief file surrogate
- New export path: `obsidian/05-Captures/exports/2026-06-22/exp_20260622_8fcb50fb/export.json`
- New seed mode: freeze manifest → frozen transcript
- Freeze lineage is preserved in the new export via `freeze_manifest_path`, `freeze_transcript_path`, `start_message_anchor`, and `end_message_anchor`.

## Downstream consumer proof
- Review JSON: `obsidian/05-Captures/review/review-exp_20260622_8fcb50fb.json`
- Review Markdown: `obsidian/05-Captures/review/review-exp_20260622_8fcb50fb.md`
- Consumer command: `bash scripts/fam-hub capture extract obsidian/05-Captures/exports/2026-06-22/exp_20260622_8fcb50fb/export.md --out-dir obsidian/05-Captures/review --id review-exp_20260622_8fcb50fb`

## Verification
1. `node scripts/conversation-freeze.js --source-file obsidian/01-Shay-Platform/Conversation-Export-Traceable-Intelligence-Brief.md --source-surface shay-chat-brief --source-locator famtastic/01-shay-platform/conversation-export-traceable-intelligence-brief --title "Conversation Export Traceable Intelligence Test Case"`
   - Result: pass
2. `node scripts/conversation-export.js --freeze-manifest obsidian/05-Captures/freezes/2026-06-22/frz_20260622_71490bfe/freeze-manifest.json --lane conversation-freeze-proof --tags shay-platform,capture,conversation-export,freeze-proof`
   - Result: pass
3. `bash scripts/fam-hub capture extract obsidian/05-Captures/exports/2026-06-22/exp_20260622_8fcb50fb/export.md --out-dir obsidian/05-Captures/review --id review-exp_20260622_8fcb50fb`
   - Result: pass

## Remaining gaps
- This minimum working freeze path derives stable anchors from normalized paragraph blocks in a saved source artifact. It does not yet capture native provider message IDs.
- `session_id` remains missing because the lane source did not expose a native session identifier at capture time.
