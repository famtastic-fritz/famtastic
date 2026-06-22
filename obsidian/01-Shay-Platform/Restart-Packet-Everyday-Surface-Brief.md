---
title: Restart-Packet-Everyday-Surface-Brief
type: note
permalink: famtastic/01-shay-platform/restart-packet-everyday-surface-brief
---

Title: Restart Packet Everyday Surface Design
Purpose: Decide how restart packets should show up in normal Shay usage so continuity becomes practical instead of archival.
Goal: Produce a concrete design brief for how restart packets should surface in everyday Shay workflows, including trigger points, visibility surfaces, default behaviors, and proof expectations.

Tasks:
- [x] Inspect the current restart packet artifact shape, indexes, and related conversation export proofs.
- [x] Define the everyday use cases: interruption, handoff, resume-later, background lane continuation, and morning re-entry.
- [x] Define where restart packets should surface by default: CLI output, briefing surfaces, command lookup, or other runtime touchpoints.
- [x] Define what should be automatic versus explicit, and what proof or safety checks are required before a restart packet drives action.
- [x] Record implementation recommendations, dependencies, and anti-noise rules.

Status: completed
Started: 2026-06-22 14:10 EDT
Ended: 2026-06-22 14:24 EDT
Execution: swarm
Research: yes — grounded in current restart packet artifacts, lineage/index surfaces, export proof, and post-eval learnings
Review: completed — concrete enough to drive a later implementation packet without broad runtime changes now
Skills: autonomous-ai-agents
Blocked By: none

## Ground truth artifacts reviewed
- `obsidian/05-Captures/exports/2026-06-22/exp_20260622_ea543140/restart-packet.md`
- `obsidian/05-Captures/index/restart-packets.jsonl`
- `obsidian/05-Captures/index/lineage.jsonl`
- `obsidian/05-Captures/review/convo-export-proof-2026-06-22.md`
- `data-center/reports/post-eval/posteval_abbc3d0ef2d0420d.md`
- Companion brief: `obsidian/01-Shay-Platform/Conversation-Export-Traceable-Intelligence-Brief.md`

## What restart packets are for
Restart packets are the continuity surface for work that is no longer fully alive in the active conversation but still needs to be resumed correctly. They should not behave like a passive archive and they should not become another noisy inbox. Their job is narrower and more useful:
- re-anchor the next session to the right work artifact
- expose the exact next action without broad search
- carry enough lane truth to prevent cross-lane continuation
- distinguish resume-worthy active work from historical reference

## Everyday use cases
### 1) Interruption checkpoint
A meaningful lane is cut off before its stopping condition. Restart packet should become the primary resume primitive.
- Example: long research/evaluation lane gets interrupted by a higher-priority request.
- Need: current state, last completed step, next step, proof pointer, workdir/lane truth.
- Default behavior: auto-create or refresh packet at interruption closeout.

### 2) Handoff between surfaces or sessions
One Shay surface, cron lane, or future session needs to pick up where another left off.
- Need: minimal human-readable state plus exact artifact pointers.
- Default behavior: surface packet in startup brief when the lane is still active or backgrounded.

### 3) Resume-later after intentional stop
Work is paused on purpose, but the next move is known.
- Need: packet should remain discoverable without demanding attention every startup.
- Default behavior: indexed and queryable, but only promoted to the default briefing when still marked active/relevant.

### 4) Background lane continuation
A lane is allowed to keep running or be resumed in background while other work happens.
- Need: packet must declare background-safe status and exact resume command/path.
- Default behavior: explicit background/resume affordance, not automatic execution from packet alone.

### 5) Morning re-entry / everyday startup
Shay needs a practical “what matters now” surface.
- Need: show only packets that are current, actionable, and truth-checked.
- Default behavior: brief digest of top active restart packets, not a dump of all historical packets.

## Recommended visibility surfaces
### A. Default startup brief: yes
Restart packets belong in the everyday startup/restart briefing, but only as a filtered digest.
- Show: active, interrupted, backgrounded, or ready-to-resume packets with recent timestamps.
- Hide by default: completed, superseded, stale reference packets.
- Display shape: `lane/objective → state → next step → proof/source path → resume command if safe`.

### B. Explicit lookup surface: yes
There should be an explicit lookup command/query surface for restart packets.
- Use when Fritz asks “what was I doing on X?” or “what can resume now?”
- Query should support filters by status, studio/stream, path, and recency.
- This is where historical packets live; startup brief should stay selective.

### C. Closeout/reporting surfaces: yes
Meaningful runs that end as `interrupted`, `backgrounded`, or `ready_to_resume` should mention the restart packet path in their closeout.
- This binds continuity to proof instead of leaving it implicit in chat.

### D. Inline runtime prompts: only when context requires it
If a session opens a source artifact with a linked active restart packet, Shay can surface a small contextual hint.
- Example: “active restart packet exists for this export; next step is X.”
- Keep this contextual and sparse. No ambient spam.

## Auto vs explicit behavior
### Automatic
These behaviors should be default and quiet:
- Create/update a restart packet whenever a meaningful lane ends in `interrupted`, `backgrounded`, or `ready_to_resume`.
- Register/update the JSONL index entry.
- Include eligible packets in the startup digest if they pass freshness and truth checks.
- Carry forward exact source export path, lineage path, captured timestamp, and next-step summary.

### Explicit
These behaviors should require an explicit user/agent action:
- Resuming execution from a packet.
- Starting background continuation from a packet.
- Promoting a historical packet back into the active startup digest after it has gone stale.
- Archiving, superseding, or deleting packet families.

## Safety and truth checks before a packet drives action
A restart packet is a continuity pointer, not authority by itself. Before it drives action, validate:
1. **Lane truth** — repo root, cwd, branch, worktree/common-dir relationship, and intended lane still match.
2. **Artifact truth** — linked export path and lineage path still exist and resolve.
3. **State truth** — packet status is still actionable (`interrupted`, `backgrounded`, `ready_to_resume`), not stale `completed` history.
4. **Freshness** — packet timestamp is recent enough for default surfacing, or explicitly requested if older.
5. **Proof link** — packet points to the proof-bearing source/export, not just a prose summary.
6. **Explicit resume authority** — packet may suggest a resume command, but execution still requires a fresh grounding pass.

## Anti-noise rules
- Do not surface every packet every day. Default surface is only for active/actionable packets.
- One lineage should usually surface as one digest item, with the latest eligible packet winning.
- Completed or superseded packets should drop out of the default brief automatically.
- Old packets remain queryable, not ambient.
- If multiple packets compete for the same source lane, prefer the newest truth-checked packet and flag the duplicate as a cleanup issue.

## Recommended implementation order
### 1) Read-only startup digest over existing packet/index artifacts
First build the consumption surface, not a broad runtime rewrite.
- Read `restart-packets.jsonl`
- Filter by status/recency
- Render a compact startup section
- Proof of success: startup surface can show active restart work without manual file hopping

### 2) Packet eligibility and stale-state rules
Add explicit rules for which packets appear by default.
- Status allowlist
- Freshness window
- Lineage dedupe
- Completed/superseded exclusion

### 3) Pre-resume truth validator
Before any packet is used to continue work, run a validator that re-checks lane truth and artifact existence.
- This is the minimum safety helper worth adding early.

### 4) Explicit lookup/query surface
Add a command/subcommand for searching packets by path, stream, studio, status, and recency.
- This keeps startup brief lean while preserving full recall.

### 5) Better packet schema for interruption semantics
After the read surfaces work, extend packet fields only where needed: lane id, objective, last completed step, next step, background-safe flag, proof pointer, and snapshot hash.
- Do not expand schema first and hope consumption catches up later.

### 6) Optional contextual hints
Only after the above exists, add small in-context reminders when an active source artifact has a live restart packet.

## Tiny helper recommendation
A tiny proof helper is justified: a read-only validator that checks whether each indexed restart packet still resolves to its linked export/lineage artifacts and whether its repo/lane context can be re-anchored. That gives the startup digest a truth gate without changing broad runtime behavior.

## Dependencies and gaps
- Current packets are minimal; richer interruption semantics from the companion brief are not yet encoded in the packet itself.
- There is no dedicated packet query surface yet; current lookup remains file/index based.
- Current proof path is artifact-first and file-first, not native chat transcript anchored.
- Freshness, dedupe, and supersession rules need to be formalized before default surfacing can be trusted at scale.
- Background continuation policy exists conceptually in the companion brief, but not yet as a concrete runtime contract.

Proof:
- Completed design brief saved here with use cases, trigger points, visibility surfaces, auto vs explicit behavior, truth checks, and build order.
- Recommendations are grounded in the current restart packet/export/index/proof artifacts reviewed above.
