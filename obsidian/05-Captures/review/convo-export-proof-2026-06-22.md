---
proof_id: convo-export-proof-2026-06-22
export_id: exp_20260622_ea543140
root_conversation_id: conv_b62d27bb2d083f64
verdict: pass_with_known_gaps
permalink: famtastic/05-captures/review/convo-export-proof-2026-06-22
---

# Conversation export proof

## What was proven
- File-first structured export package was created.
- Restart packet was created and indexed.
- Lineage file was created and indexed.
- First downstream consumer completed: `fam-hub capture extract` against the seed export.
- The structured path directly recovered the two canonical expected answers.

## Baseline path
- Tool: `session_search`
- Query: `conversation export OR data importance OR last run OR restart packet OR downstream consumers`
- Result: useful nearby sessions, but not a direct recovery of both target answers.
- Baseline verdict: partial_or_fail.

## Structured path
- Hop 1: `obsidian/05-Captures/index/exports.jsonl`
- Hop 2: `obsidian/05-Captures/exports/2026-06-22/exp_20260622_ea543140/export.md`
- Answer evidence: lines 97-99 in `export.md`
- Restart proof: `obsidian/05-Captures/index/restart-packets.jsonl:1`
- Lineage proof: `obsidian/05-Captures/index/lineage.jsonl:1`

## Canonical recovered answers
- Other topic: how the last run went / what happened in the last run
- Earlier list: Shay continuity / restart, research loops, FAMtastic Thoughts, skill extraction, postmortems, idea mining, project intelligence, and long-history pattern review

## Known gaps
- This proof used the saved brief as the seed source artifact, not a native chat transcript with stable message IDs.
- The structured lookup path is file-first plus JSONL. A dedicated query surface can come later.