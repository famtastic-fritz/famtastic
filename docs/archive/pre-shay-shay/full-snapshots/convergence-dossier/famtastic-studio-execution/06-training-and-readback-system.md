# FAMtastic Studio Intelligence Run - Training and Readback System

**Status:** complete
**Purpose:** Define how Studio teaches, retrieves, and explains its own workflow.

## Problem

Research, plans, and agent runs lose value when they are only stored as Markdown or chat history. FAMtastic needs a system that can answer:

- What did we decide?
- Why?
- What does it prove?
- What should future builds reuse?
- What is still only a V2 idea?
- What does Fritz need to decide right now?

## Training Objects

Training objects should be small, retrievable units:

- decision card
- pattern card
- proof checklist
- recipe lesson
- component lesson
- media lesson
- safety lesson
- cost lesson
- run closeout
- anti-drift rule

Each object needs:

- id
- source artifact
- summary
- applies_to
- confidence
- status: draft | active | superseded | retired
- retrieval tags
- readback prompt
- proof requirement

## Shay Readback Contract

When asked about a run, Shay should answer:

1. What was attempted.
2. What succeeded.
3. What failed.
4. What did not block.
5. What proved the result.
6. What changed in the system.
7. What should be reused.
8. What still needs Fritz.

## Studio Views

Research cannot remain only in Markdown. Studio should expose:

- Intelligence Brief screen
- Competitive Map screen
- Pattern Library screen
- Agent Skill Map screen
- Proof Checklist screen
- Shay Readback / Guide view
- Research Depth controls: Fast, Standard, Deep, Expert
- Dig Deeper action that adds a new research pass

## Retrieval Before Planning

Before a serious plan is created, Studio should retrieve:

- relevant decisions
- matching recipes
- past failures
- proof checklists
- capability status
- reusable components
- reusable media patterns
- open V2 backlog

## After-Action Capture

Every completed pass should generate a compact closeout:

- fixed
- added
- proved
- deferred
- risks
- reusable lessons
- registry nominations
- training candidates

## Acceptance Criteria

- A future agent can read the run package and know what to do next.
- Shay can explain a completed run without inspecting every raw log.
- Learning Board can nominate reusable patterns without rewriting source docs.
- No plan is considered complete unless it states what it fixed, added, or proved.
