---
title: Conversation-Artifact-X-Rule
type: note
permalink: famtastic/01-shay-platform/conversation-artifact-x-rule
---

Title: Conversation Artifact X Rule
Purpose: Define the practical baseline rule for conversation capture so proof lanes stop tripping over downstream completeness requirements.

Core rule
- When the purpose of a task is to create/store conversation data, the first obligation is to create artifact X.
- X may be raw back-and-forth conversation capture.
- Raw capture is acceptable as the measurable baseline.

What X must carry
- source identity or best available locator
- capture timestamp
- lane/context label when available
- pointer to the creating conversation/session

What should attach to X
- parse/export follow-up
- restart/continuity follow-up
- lesson extraction follow-up
- promotion review follow-up
- pruning/archive review follow-up

Super-simple lifecycle
X -> attached jobs -> derived artifacts -> review/promotion -> archive or prune

Meaning
- X = raw conversation capture saved first
- attached jobs = the follow-up bundle registered at creation time
- derived artifacts = exports, restart packets, review packets, lesson packets
- review/promotion = decide what gets elevated, routed, or kept as proof only
- archive or prune = keep what must survive, archive what may matter later, prune only what is safe

Important behavior rule
- These follow-ups are attached to X as a process bundle.
- They do not block the successful creation of X.
- X should be born with a tail, not a burden.

Adversarial-loop rule
- The adversarial loop should evaluate X and its follow-up artifacts.
- It should not rewrite live truth directly while the proof/eval loop is still running.

Why this matters
- preserves the raw conversation chain
- gives a measurable baseline immediately
- lets parsing and refinement happen later
- reduces self-inflicted loop instability

Current proof relevance
- This rule is the practical fix discovered during the conversation-export proof lane and the round-15 adversarial loop.
