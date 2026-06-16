# FAMtastic Studio Research Source Map

## Purpose

Track what must be researched, why it matters, what source types are acceptable, and how findings should be stored.

## Source categories

### 1. AI app builders / website builders

Targets:

- Replit Agent
- Bolt/new
- v0
- Lovable-style builders
- Dyad-style builders
- Webflow AI / Framer AI-style systems where relevant

Questions:

- How do they turn a vague request into a build?
- Do they research before building?
- Do they ask clarifying questions?
- Do they support live preview?
- Do they create reusable artifacts?
- Do they expose costs?
- Do they produce proof or just output?

### 2. Agentic coding systems

Targets:

- Claude Code
- Codex Cloud
- GitHub Copilot coding agent
- Cursor background agents
- Windsurf Cascade
- Cline/Roo-style local agents

Questions:

- How do they run unattended?
- How do they checkpoint?
- How do they report progress?
- How do they notify the operator?
- How do they avoid destructive changes?
- How do they handle branches and PRs?
- How do they recover from failed runs?

### 3. Multi-agent orchestration systems

Targets:

- CrewAI
- LangGraph
- AutoGen
- OpenHands/OpenDevin-style systems
- Agent workflow repos with role-based execution

Questions:

- How are roles defined?
- How is state persisted?
- How is human approval handled?
- How do agents pass work to each other?
- How are logs and artifacts structured?

### 4. Research/provenance systems

Targets:

- research agents
- RAG pipelines
- source extraction systems
- evidence scoring tools
- citation/provenance frameworks

Questions:

- How should FAMtastic score sources?
- How should research be stored?
- How does research become build input?
- How can Studio show simple/deep research views?

### 5. Security, cost, and safety

Targets:

- public postmortems
- AI builder failure cases
- source-map leak lessons
- secret leakage patterns
- uncontrolled spend examples
- package/install risks

Questions:

- What failure modes must FAMtastic avoid?
- Which failures are blockers?
- Which failures become logged non-blockers?
- How should Studio expose Capability Truth and cost gates?

## Required storage outputs

Research should eventually create:

- docs/research/famtastic-studio-execution/data/sources.json
- docs/research/famtastic-studio-execution/data/competitor-map.json
- docs/research/famtastic-studio-execution/data/pattern-map.json
- docs/research/famtastic-studio-execution/data/question-bank.json
- docs/research/famtastic-studio-execution/data/proof-criteria.json

## Source quality rules

Prefer:

- official docs
- GitHub repos
- technical writeups
- public postmortems
- respected engineering blogs
- reproducible examples

Use caution with:

- hype posts
- unsourced claims
- leaked/reverse-engineered summaries
- marketing-only pages

Never copy leaked proprietary code. Extract only publicly discussed concepts and safety lessons.
