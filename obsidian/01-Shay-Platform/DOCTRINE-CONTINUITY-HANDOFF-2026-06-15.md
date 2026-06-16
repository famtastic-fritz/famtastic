---
title: DOCTRINE-CONTINUITY-HANDOFF-2026-06-15
type: note
permalink: famtastic/01-shay-platform/doctrine-continuity-handoff-2026-06-15
---

# Doctrine Continuity Handoff — 2026-06-15

Purpose: preserve the planning/orchestration doctrine work so it can be resumed cleanly in a fresh session after worktree/main cleanup.

## Current Situation
- Fritz identified the broader Shay weirdness as related to too many open workspaces/worktrees plus a dirty main.
- Main cleanup is happening in another session.
- The adversarial-review partner session lost context / rotted.
- This doctrine conversation is important and should not be lost.

## What Was Established
The doctrine direction is:
- whole-map planning, not phased concealment
- graph truth as source of truth
- boards/briefs/views are derived surfaces, not the brain
- multiple plans can coexist in parallel
- queues are first-class
- swarms are execution packages, not the operating system
- routing, evaluation, resumability, and command-center visibility are core architecture

## Canonical Doctrine Title
Whole-Map Planning and Orchestration Doctrine

## Intended Workflow Split
- writer pass = this session
- reviewer / pressure-test pass = adversarial review session
- one artifact, two roles, less relay

## Doctrine Sections Drafted In Chat
These were drafted in conversation even if not all were safely written into a file yet:

### Drafted section set 1
1. Core Principle
2. Source-of-Truth Principle
3. Top-Level Structure
4. Planning Doctrine
5. Parallelism Doctrine
6. Queue Doctrine
7. Swarm Doctrine
8. Routing Doctrine
9. Evaluation Doctrine
10. Views Doctrine

### Drafted section set 2 (tightened boundaries / control surfaces)
11. Permanent Object Boundaries
12. Parallelism Rules
13. Routing Truth
14. Agent Type as First-Class Object
15. Durable Run Ledger
16. Evaluation: Observation vs Interpretation
17. Visual Synchronization Doctrine
18. Command-Center Default
19. Resumability Rule

## Key Refinements Agreed In Review
These were established in chat and should be preserved for the next writer/reviewer pass:

- Do not use “v1” framing unless it clearly means document revision only.
- The doctrine must be whole-map from the start even if implementation is incremental.
- Lane / Project / Plan / Task / Queue / Swarm boundaries must be explicit and non-collapsing.
- Cheap-first routing must be explicit.
- “Within policy” is too vague and should be replaced by explicit limits/constraints.
- Approval gates are exceptions, not defaults.
- Agent Type must be first-class.
- Routing Policy must be distinguished from Runtime Decision.
- Durable run/swarm ledger must be explicit.
- Observation must stay separated from interpretation.
- Visual synchronization / command-center doctrine is core, not decorative.
- Resumability is an operating requirement.

## Next Missing Mechanics To Define
The next doctrine section should explicitly define:
- queue admission rules
- queue rejection / requeue rules
- queue-to-swarm escalation rules
- swarm creation thresholds
- cost posture mechanics
- worker identity model
- artifact contract
- dependency object / edge model
- evaluation writeback model

## Important Session IDs
Potentially relevant session IDs from today:
- Doctrine / cleanup continuity session: 20260615_170612_32798d
- Earlier morning/brief thread: 20260615_143731_bf3bb3
- Cleanup-related session seen in recent list: 20260615_145339_967c67

## Important Note About Artifact State
A markdown doctrine file was intended to be created at:
- /Users/famtasticfritz/famtastic/Whole-Map-Planning-and-Orchestration-Doctrine.md

But this should be VERIFIED before relying on it, because later file lookup did not find it. Treat the chat-drafted sections above as the safe truth unless the file is confirmed to exist.

## Recommended Recovery Move For A Fresh Session
Tell the new session:

"We were building a doctrine called 'Whole-Map Planning and Orchestration Doctrine.'
The important part is not to restart from generic planning theory.
Use the handoff file at /Users/famtasticfritz/famtastic/obsidian/01-Shay-Platform/DOCTRINE-CONTINUITY-HANDOFF-2026-06-15.md as the current truth.
First verify whether /Users/famtasticfritz/famtastic/Whole-Map-Planning-and-Orchestration-Doctrine.md actually exists.
If not, reconstruct the doctrine file from the handoff.
Then continue by writing the next section covering:
queue admission/requeue/escalation, swarm creation thresholds, cost posture, worker identity, artifact contract, dependency model, and evaluation writeback."

## Post-Cleanup Role For This Session
After baseline-of-main cleanup finishes, this session should do:
- post-merge / post-cleanup truth audit
- verify main is actually canonical
- verify no stale lane doctrine drift survived
- verify doctrine artifact location/state
- rebuild the reviewer handoff cleanly if needed