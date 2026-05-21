# FAMtastic Studio Intelligence Run - Pattern Library

**Status:** complete
**Purpose:** Convert external research into reusable Studio patterns.

## Pattern 1: Intelligence Before Generation

**Seen in:** OpenAI Deep Research, research/provenance pipelines.
**Gap in builders:** Most app builders begin with generation and only research if prompted.

**FAMtastic rule:** Every build starts with at least a fast intelligence pass. Depth scales by project; intelligence never disappears.

**Studio expression:** Project Intake -> Brief Enhancer -> Research Screen -> Opportunity Map -> Recipe Composer.

## Pattern 2: Prompt Objects, Not Loose Prompts

**Seen in:** Citation/source-node systems and RAG metadata practices.
**Gap in builders:** Generated media/code often lacks lineage, research basis, and reuse status.

**FAMtastic rule:** Prompts become structured objects with purpose, source basis, section/slot target, constraints, variants, and QA state.

**Studio expression:** Prompt Registry, Media Library, Asset Board, Build Trace.

## Pattern 3: Preview Is Necessary But Not Proof

**Seen in:** Bolt, v0, Replit, Windsurf.
**Gap in builders:** A working preview can mask missing auth, deploy, data, QA, or production configuration.

**FAMtastic rule:** Preview is one evidence item. Launch readiness requires proof packets.

**Studio expression:** QA Board, Deploy Center, Capability Truth, Proof Checklist.

## Pattern 4: Checkpoints Need Meaning

**Seen in:** Replit checkpoints, Cline/Roo checkpoints, Windsurf checkpoints, LangGraph durable checkpoints.

**FAMtastic rule:** Checkpoints are not Fritz approval stops by default. They are proof points and resume anchors. Stop only on defined hard blockers.

**Studio expression:** Build Ledger, Build Trace, Run Control, pass closeouts.

## Pattern 5: Branch/PR Handoff

**Seen in:** Codex cloud, Copilot coding agent, Cursor background agents.

**FAMtastic rule:** Agent work should land as isolated branch/PR units with proof, risk, commands run, and rollback notes.

**Studio expression:** Run Control creates branch context; Deploy Center and Approval Center gate merge/deploy.

## Pattern 6: Flow Plus Crew Split

**Seen in:** CrewAI Flows vs Crews, LangGraph nodes/state, AutoGen teams.

**FAMtastic rule:** Deterministic product workflow owns state. Agents are delegated to bounded tasks.

**Studio expression:** Mission Control owns state; agents populate Agent Reports and Build Trace.

## Pattern 7: Capability Truth Before Autonomy

**Seen in:** Production agent safety patterns, OWASP excessive agency, deploy/system docs.

**FAMtastic rule:** A declared config is not capability. Capability requires handler + last probe + proof + cost tier + fallback + approval rule.

**Studio expression:** Capability Truth Layer checked before Run Control continues.

## Pattern 8: Visible Cost Governance

**Seen in:** Replit AI billing, model credit systems, OWASP unbounded consumption.

**FAMtastic rule:** Cheap/local lanes are default. Anything projected over $50 requires explicit Fritz approval.

**Studio expression:** Cost / Usage panel, Approval Center, run ledger cost estimates.

## Pattern 9: Component/Slot Mutation

**Seen in:** UI component generators and local component libraries, but rarely as an end-to-end builder primitive.

**FAMtastic rule:** Classify edits first. Prefer slot injection/component replacement over broad rewrites.

**Studio expression:** Component Studio -> Component Library -> Component Installer -> QA Board.

## Pattern 10: Media Library as Active Registry

**Seen in:** Asset workflows; missing in many AI builders.

**FAMtastic rule:** Media assets require prompt lineage, variants, cleanup, approval, allowed slots, usage tracking, and fallback.

**Studio expression:** Media Studio, Asset Board, Media Library, Prompt Registry.

## Pattern 11: Research Display, Not Markdown Pile

**Seen in:** Deep research reports; missing in builder UIs.

**FAMtastic rule:** Research must be visible in Studio as intelligence brief, competitive map, pattern library, proof checklist, and Shay readback.

**Studio expression:** Intelligence Brief screen, Research Depth controls, Dig Deeper action.

## Pattern 12: Strangler Modularization

**Seen in:** standard backend refactor discipline; required by local scan.

**FAMtastic rule:** Large files are acceptable for proof-of-concept. Once proved, map responsibility and extract one module at a time with smoke proof.

**Studio expression:** Server Modularization Track, Build Trace proof, no major backend growth until risk is lowered.
