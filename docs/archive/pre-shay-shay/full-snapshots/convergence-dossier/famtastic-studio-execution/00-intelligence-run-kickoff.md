# FAMtastic Studio Intelligence Run — Kickoff

**Status:** kickoff seeded
**Branch:** `research/studio-intelligence-foundation-20260508`
**Base checkpoint:** Studio redesign/spec checkpoint
**Purpose:** turn the Studio redesign checkpoint into a research-driven execution foundation before implementation.

## Core principle

Every FAMtastic build starts with intelligence. The client brief is the starting point, not the ceiling. Simple does not mean generic.

## What this run must prove

This research run must prove that the Studio execution plan is not just a task list. It must become a reusable intelligence layer that captures:

1. Competitive landscape.
2. Similar and adjacent industries/tools.
3. What each comparable system does well.
4. What those systems miss.
5. How FAMtastic exploits the gaps without reinventing the wheel.
6. Which expert domains support each decision.
7. Which agent roles and skills own the work.
8. Which proofs/checks make the work trustworthy.
9. Which findings are v1 upgrades versus v2 backlog.
10. Which training modules/checklists are needed so the system can teach its own workflow.

## Required research tracks

### A. AI app builders and site builders

Study systems such as Replit Agent, Bolt/new, v0, Lovable-style builders, Dyad-style tools, and similar tools.

Capture:

- workflow model
- environment/runtime model
- preview model
- deployment model
- pricing/cost visibility
- strengths
- missing patterns
- reusable FAMtastic lessons

### B. Agentic coding systems

Study systems such as Claude Code, Codex Cloud, GitHub Copilot coding agent, Cursor background agents, Windsurf Cascade, and similar systems.

Capture:

- unattended execution patterns
- branch/PR handoff
- subagent/role model
- hooks/statusline/run monitor ideas
- checkpoint/resume behavior
- failure handling
- notification patterns

### C. Multi-agent orchestration frameworks

Study CrewAI, LangGraph-style flows, AutoGen-style patterns, and other multi-agent systems.

Capture:

- crew/role mapping
- flow/state model
- persistence/resume
- human-in-the-loop gates
- observability
- how this maps into FAMtastic Studio layers

### D. Research and knowledge systems

Study research pipelines, source collection, extraction, ranking, provenance, and briefing systems.

Capture:

- source model
- evidence scoring
- source trust levels
- question bank generation
- briefing UX
- how findings get reused by builders

### E. Security and spend safety

Study failures in vibe-coding and AI builder ecosystems, including accidental data exposure, secret leakage, weak auth, public asset leaks, and uncontrolled spend.

Capture:

- threat pattern
- required guardrail
- proof/check needed
- whether guardrail blocks build or logs a revisit item

## Required artifact structure

This run should later produce or prepare:

```text
docs/research/famtastic-studio-execution/
  00-intelligence-run-kickoff.md
  01-competitive-map.md
  02-pattern-library.md
  03-gap-and-opportunity-map.md
  04-agent-skill-map.md
  05-proof-and-checklist-system.md
  06-training-and-readback-system.md
  07-v1-adaptations.md
  08-v2-backlog.md
  09-execution-plan-impact.md
  RUN_STATUS.md
  data/
    sources.json
    competitor-map.json
    pattern-map.json
    agent-skill-map.json
    question-bank.json
    proof-criteria.json
    v1-v2-classification.json
```

## Studio visibility requirement

The research must not live only as Markdown. It must define how Studio displays it:

- Intelligence Brief screen
- Competitive Map screen
- Pattern Library screen
- Agent Skill Map screen
- Proof Checklist screen
- Shay Readback / Guide view
- Research Depth controls: Fast, Standard, Deep, Expert
- Dig Deeper actions that add another research pass instead of making the first pass final

## Unattended execution principle

Do not stop at every checkpoint for Fritz approval. Checkpoints are for tracking and proof. Continue unless a hard blocker appears.

## Final briefing requirement

At the end, produce a plain-English briefing:

- What was researched
- What competitors/similar systems were found
- What they do well
- What they miss
- What FAMtastic should borrow
- What FAMtastic should exploit
- What must be v1
- What moves to v2
- What setup was attempted
- What succeeded
- What failed but did not block
- What proof exists
- What the first build run should do next
