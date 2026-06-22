---
title: Conversation-Export-Skill-Brief
type: note
permalink: famtastic/01-shay-platform/conversation-export-skill-brief
tags: [shay, capture, conversation, export, memory, workflow, skill]
---

# Conversation export skill brief

Date: 2026-06-21
Status: active doctrine

Title: Modular conversation export as a reusable system input
Purpose: Turn valuable session transcripts and session-screen captures into one structured export surface that can feed Shay research, FAMtastic Thoughts, memory refresh, review logic, and future workflows without every downstream system rebuilding its own capture logic.
Goal: Define the conversation-export skill, its hooks, its output schema, where exports live, and how future systems ingest them.

Tasks:
- [x] Inspect current hook/capture reality before inventing a new layer
- [x] Define what this export should be for
- [x] Define the minimum structured export shape
- [x] Define when exports should fire
- [x] Define retrieval logic for session restart / continuity
- [ ] Implement the skill and hook wiring
- [ ] Add downstream consumers that ingest the export
- [ ] Test closeout -> export -> restart -> refresh flow end to end

Status: in_progress
Started: 2026-06-21 18:37 EDT
Ended:
Execution: swarm
Research: yes — /Users/famtasticfritz/famtastic/CLAUDE.md ; /Users/famtasticfritz/famtastic/docs/research/proactive-shay-organic-capture-reflection-os.md
Review: no
Skills: shay-shay, claude-history-ingest
Blocked By: none

Proof:
- Canonical brief created at `obsidian/01-Shay-Platform/Conversation-Export-Skill-Brief.md`
- Existing hook reality documented below
- Export schema and hook plan documented below

## Executive verdict
Yes — this is a real unlock.

Not just for memory.
For modularity.

A single structured export created once at session close can become a reusable input surface for multiple downstream systems:
- Shay recall / restart
- response-mode research
- FAMtastic Thoughts
- project postmortems
- idea extraction
- skills mining
- historical pattern review
- future agent training/evaluation lanes

That means the capture cost gets paid once and the value compounds across many systems.

## What already exists
Current repo truth says some of this system already exists:

1. Session checkpoints already fire automatically.
   - `CLAUDE.md` says `scripts/brain/session-checkpoint.js` is wired into `.claude/settings.json`.
   - It runs at `SessionStart`, `PreCompact`, and `Stop`.
   - Today it guarantees scaffold, timeline, and git delta.
   - It does NOT fully solve modular transcript export by itself.

2. The repo already has a capture-first thesis.
   - `docs/research/proactive-shay-organic-capture-reflection-os.md` already names live chat transcripts, compaction memos, repo-root captured transcripts, and private lane notes as valid organic input.
   - It also already defines a retrieval waterfall.

3. Claude history ingest already exists as a mining pattern.
   - The `claude-history-ingest` skill knows how to read Claude session data, distill it, and ingest it into durable knowledge surfaces.
   - That gives us a strong downstream consumer pattern.

## The real gap
The current system has capture fragments.
It does not yet have one canonical, structured, modular export artifact designed explicitly as a reusable upstream input for many systems.

That is the missing piece.

## Product thesis
Every important session should be able to leave behind a lightweight but structured export artifact.

That export is not the whole transcript only.
It is a package.

One package can contain:
- transcript pointer
- compact summary
- decision list
- promises / obligations
- project hints
- emotional or spiritual signals when relevant
- open loops
- suggested retrieval hooks
- downstream tags

This makes the export useful both for humans and machines.

## Design rules
1. Export once, reuse everywhere.
2. Preserve provenance.
3. Observation and interpretation stay separate.
4. Human-readable and machine-ingestable at the same time.
5. Lightweight on closeout; heavier distillation can happen later.
6. Session continuity should prefer known export locations over trying to rehydrate from giant raw context every time.
7. The export skill should be templated so downstream systems can consume the same shape reliably.

## Proposed artifact model
The system should produce two linked artifacts, not one.

### A) Raw-adjacent export
Purpose: preserve the durable session handoff in a structured way without forcing heavy interpretation at closeout.

Suggested home:
- `~/.shay/private/exports/conversations/YYYY/MM/`

Suggested file names:
- `conversation-export-<timestamp>-<sessionid>.md`
- `conversation-export-<timestamp>-<sessionid>.json`

### B) Distilled derivatives
Purpose: later systems can read the raw-adjacent export and create specialized outputs.

Possible consumers:
- Shay research loops
- FAMtastic Thoughts seed extraction
- project decision ledgers
- skill mining
- session restart / refresh

## Minimum export schema

### Frontmatter / metadata
- `export_id`
- `session_id`
- `created_at`
- `source_surface` (claude-code, shay chat, desktop session, etc.)
- `cwd`
- `repo_hint`
- `branch_hint`
- `user`
- `status` (`open | checkpoint | closed`)
- `sensitivity`
- `related_projects`
- `related_streams`
- `prior_export_id` (if continuation)
- `transcript_pointer`
- `timeline_pointer`
- `git_delta_pointer`

### Structured body sections
1. `session_purpose`
2. `what_happened` (observation only)
3. `what_it_means` (interpretation only)
4. `decisions_made`
5. `open_loops`
6. `promises_or_followups`
7. `project_signals`
8. `fritz_signals`
9. `ideas_worth_reusing`
10. `downstream_consumers`
11. `restart_packet`
12. `source_excerpt_index`

### Restart packet fields
This is the load-bearing part for context recovery.

- `resume_summary`
- `last_clear_state`
- `next_likely_actions`
- `files_to_open_first`
- `plans_to_resume`
- `artifacts_to_check`
- `questions_still_open`
- `confidence`

## Hook model

### 1) Closeout hook — required
On session close / stop:
- generate or refresh the conversation export
- write the restart packet
- link to transcript/session note/checkpoint note
- mark whether the session is terminal or continuing

This is the default high-value hook.

### 2) PreCompact hook — recommended
On context compaction:
- refresh the export with a checkpoint state
- preserve what was just compressed away
- update `status: checkpoint`

This protects against long-context loss.

### 3) SessionStart hook — optional but powerful
On session start:
- determine whether this is a continuation lane or a truly new conversation
- if continuation evidence exists, surface the latest export pointer
- use the restart packet as a fast refresh surface

### 4) Manual capture hook — optional
If Fritz dumps session-screen captures or saved convo snippets manually:
- ingest them into the same export pipeline
- do not force a separate totally different schema

## Continuation detection logic
At start, the system should check in this order:
1. explicit session continuation markers
2. matching cwd/repo/branch/worktree
3. latest export in the same lane
4. latest session note/checkpoint artifact
5. transcript history if needed

If a continuation is likely:
- do not guess from memory alone
- open the export first
- hydrate from `restart_packet`
- only then expand into transcript or longer artifacts if needed

## Why this may help the long-context problem
Because the goal is not to keep everything alive in prompt memory.
The goal is to leave behind a clean breadcrumb with enough structure to restart truthfully.

That means:
- less reliance on bloated injected memory
- better resumability
- faster continuity recovery
- more modular downstream reuse

So yes: in theory, this can absolutely reduce long-context pain if the restart packet is good.

## Downstream value map
One export can feed:
- Shay private research loops
- response-mode research
- FAMtastic Thoughts content seeding
- skill extraction
- plan closeout / reopen logic
- personal pattern review
- historical search and retrieval
- project intelligence ingestion

## Holes / risks to solve
1. Duplicate exports across hooks.
   - Need idempotent update behavior, not endless new files.

2. Over-interpretation at closeout.
   - Closeout export should stay relatively lightweight; heavy distillation can be later.

3. Privacy lane contamination.
   - Sensitive material needs tagging and protected storage rules.

4. False continuation detection.
   - Must not accidentally stitch unrelated sessions together.

5. Schema sprawl.
   - Keep one canonical template instead of per-system variants.

6. Chat-only truth.
   - Exports must point to live artifacts, not replace them.

## Recommended implementation path
Phase 1
- create the skill + canonical export template
- create export location(s)
- wire closeout hook first
- write restart packet first-class

Phase 2
- wire PreCompact refresh
- add continuation detection at SessionStart
- add lightweight index/latest pointer per lane

Phase 3
- connect consumers:
  - response-mode research
  - FAMtastic Thoughts
  - skills mining
  - historical pattern review

## My read
This is strong.
It is modular in the right way.
It follows your seed thesis exactly: one module produces structured output that many other modules can ingest.

That means the conversation export is not just a logging feature.
It is infrastructure.

And if we build it right, it becomes one of those quiet systems that keeps making everything else smarter.
