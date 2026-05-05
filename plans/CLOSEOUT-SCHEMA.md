# Plan Closeout / Checkpoint Schema

A closeout (or checkpoint) packet is the required artifact whenever a plan transitions from `active` to `completed | superseded | parked`, OR whenever an active plan completes a phase. Codex-proposed (2026-05-05); adopted as the standard.

## Why this exists

A plan was free to sit in `status: active` forever with zero open tasks in the task ledger. That meant "active" had two distinct meanings:
1. *Work is in flight*
2. *Plan was created but never actioned*

The audit run on 2026-05-05 surfaced 8 active plans with this drift. Closeout packets eliminate the ambiguity by forcing every plan to either *prove it's done*, *generate next tasks*, or *mark itself superseded by a successor*.

## The packet (canonical JSON)

```json
{
  "schema_version": "1.0",
  "plan_id": "plan_2026_05_05_chat_capture_learn_optimize",
  "verdict": "completed | needs_tasking | parked | superseded | checkpoint_complete",
  "verdict_at": "2026-05-05T23:30:00.000Z",
  "verdict_by": "fritz | claude-code | codex | cowork",
  "phase": "mvp | phase_1 | phase_2 | … (only when checkpoint_complete)",

  "fixed":            ["..."],
  "added":            ["..."],
  "proved":           ["..."],
  "remaining_work":   ["..."],
  "moved_to":         ["plan_id_of_successor"],

  "evidence": [
    { "type": "commit | proof | doc | test_run | url",
      "ref":  "SHA / path / URL",
      "note": "what this evidence shows" }
  ],

  "memory_candidates": [
    { "type": "decision | rule | learning | bug-pattern | gap | vendor-fact | anti-pattern | do-not-repeat",
      "title": "...",
      "body":  "...",
      "facets": ["..."],
      "confidence": 0.85 }
  ],

  "next_task_ids":    ["task-2026-05-06-001", "..."]
}
```

## Verdict definitions

| Verdict | Meaning | Required fields |
|---|---|---|
| `completed` | Plan goal achieved; no follow-up needed. | `proved[]`, `evidence[]` |
| `needs_tasking` | Plan still wanted, but no open tasks exist; this packet generates them. | `remaining_work[]`, `next_task_ids[]` |
| `parked` | Pause indefinitely; come back later. | `remaining_work[]` (so we know what to resume) |
| `superseded` | Replaced by a newer plan. | `moved_to[]` (target plan id) |
| `checkpoint_complete` | A phase ended; plan continues. | `phase`, `proved[]`, `next_task_ids[]` |

## Where packets live

```
plans/<plan-id>/closeouts/<YYYY-MM-DD>-<verdict>.json
```

Multiple closeouts allowed (one per phase). The latest determines the plan's effective state.

## The rule (now in CLAUDE.md / AGENTS.md / .wolf/cerebrum.md)

> **No plan may stay `status: active` with zero open tasks for more than one
> session.** Either ship a closeout packet (`completed | parked | superseded`),
> a checkpoint packet (`checkpoint_complete`), or generate next tasks
> (`needs_tasking`). The `scripts/plans/audit.js` command lists violations.

## Integration with the memory pipeline

Every closeout packet's `memory_candidates[]` array auto-flows into the chat-capture pipeline:
1. `node scripts/plans/closeout.js apply <packet>` writes the packet to disk AND
2. constructs a v0.2 capture packet at `captures/inbox/closeout-<plan-id>-<date>.json`
3. then runs `node scripts/memory-promote.js review` + `promote --auto` to land vendor-fact / do-not-repeat / bug-pattern entries into canonical memory

## Audit command

`node scripts/plans/audit.js` is read-only. It reports:

- Active plans with zero open tasks (drift violations)
- Active plans with tasks but no commits in the last N days (stale)
- Plans referenced by tasks but missing from registry (orphan tasks)
- Plans with conflicting state (registry says X, latest closeout says Y)

Exit code 0 = clean; exit code 2 = drift exists.
