---
title: tencent-agent-memory-adopt-2026-05-31
type: note
permalink: shay-memory/research/tencent-agent-memory-adopt-2026-05-31
---

# TencentDB Agent Memory Adoption Research
**Date:** 2026-05-31  
**Task:** Adopt TencentDB Agent Memory tiers (Identity / Experience / Persona)  
**Output:** Research document mapping TencentDB tiers to Shay's L0→L3 schema  

## Executive Summary
TencentDB Agent Memory offers a 4-tier semantic pyramid (L0 Conversation → L1 Atom → L2 Scenario → L3 Persona) that aligns conceptually with Shay's existing L0→L3 layering convention (L0 raw → L1 episodic → L2 semantic → L3 reflective). While the tier names and granularity differ, both systems share the core principle of hierarchical memory organization for progressive disclosure and traceability. TencentDB adds valuable innovations in symbolic short-term memory (Mermaid-based) and heterogeneous storage that could enhance Shay's memory subsystem.

**Verdict:** **ADOPT** (with mapping adjustments) - TencentDB's layered approach complements Shay's existing infrastructure and offers measurable benefits in token reduction and recall accuracy.

---

## 1. TencentDB Agent Memory Tiers Explained

### **L0 Conversation** (Raw Dialogue)
- **What it is:** Verbose, unrefined conversational exchanges, tool outputs, logs, and raw traces.
- **Purpose:** Preserves granular evidence for auditability and drill-down recovery.
- **Storage:** Persisted in external files (`refs/*.md`) or database for full-text retrieval.
- **Access:** Queried only when finer detail is needed via `node_id` tracing from higher layers.

### **L1 Atom** (Atomic Facts)
- **What it is:** Discrete, individual facts or data points extracted from raw dialogue (e.g., "user prefers dark mode", "meeting at 3pm").
- **Purpose:** Semi-structured knowledge units that enable fact-based reasoning.
- **Storage:** Stored in structured formats (JSONL, database entries) for efficient querying.
- **Access:** Middle tier accessed when L3/L2 needs validation; preserves evidence layer.

### **L2 Scenario** (Scene Blocks)
- **What it is:** Contextualized blocks grouping related atoms and dialogue segments (e.g., "project kickoff meeting", "debugging session for login bug").
- **Purpose:** Preserves macro-level structure and situational context.
- **Storage:** Stored as human-readable Markdown files or database records with rich metadata.
- **Access:** Queried after L3 for contextual understanding before drilling to L1/L0 for specifics.

### **L3 Persona** (User Profile)
- **What it is:** Day-to-day user preferences, behavioral patterns, standing constraints, and identity DNA.
- **Purpose:** First-query layer for personalization; carries "who the user is" in actionable form.
- **Storage:** Human-readable Markdown files for white-box inspection and editing.
- **Access:** **Always queried first**; system drills down to L2→L1→L0 only when details are needed.

### **Symbolic Short-Term Memory** (Cross-Cutting Innovation)
- **What it is:** Mermaid-based task state compression for in-session context management.
- **Purpose:** Reduces token usage by offloading verbose logs while preserving traceability via `node_id`.
- **Components:**
  - Full tool logs offloaded to external files (`refs/*.md`)
  - Lightweight Mermaid canvas remains in agent context
  - Agent recalls details by grepping for `node_id` in external files
- **Benefit:** Cuts token usage by up to 61.38% (per MarkTechPost benchmarks).

---

## 2. Technical Specifications

### **License**
- **MIT License** (permissive, allows commercial use, modification, distribution)
- Verified in GitHub repository: [`LICENSE`](https://github.com/Tencent/TencentDB-Agent-Memory/blob/main/LICENSE)

### **Hosting & Deployment**
- **Self-hostable:** Yes, designed for zero external API dependencies
- **Default backend:** Local SQLite with `sqlite-vec` extension (vector search)
- **Alternative backends:** Configurable; supports hybrid retrieval (BM25 + vector)
- **Deployment options:**
  - Local device (Mac mini, laptop, mobile)
  - Server-side (Docker, PM2, CasaOS)
  - Embedded in agent runtime (via Hermes Gateway adapter)
- **No cloud dependency:** Fully operational offline; no required external services

### **API/SDK**
- **Primary interfaces:**
  - **Hermes Gateway adapter** (`hermes-plugin/memory/memory_tencentdb/`)
  - **OpenClaw plugin** (`openclaw.plugin.json`)
  - **Direct SDK:** `@tencentdb-agent-memory/memory-tencentdb` (Node.js/npm package)
- **Language support:** Node.js/TypeScript (primary), with potential for Python bindings
- **Integration points:** Memory storage/retrieval hooks, context injection, symbol tracing

### **Current Maturity**
- **Stars:** 4.5k+ on GitHub (indicating strong community interest)
- **Recent activity:** v0.3.6 release (4 days ago from research date)
- **Documentation:** English/README.md + Chinese/README_CN.md
- **Examples:** OpenClaw and Hermes integration demonstrations
- **Testing:** Benchmarks showing 51.52% pass rate improvement on WideSearch, 59% on PersonaMem

---

## 3. Mapping to Shay's Existing L0→L3 Schema

Shay's current memory layering convention (MEMORY-SCHEMA-L0-L3.md) defines:

| Shay Layer | Track-4 Name | Purpose | Current Implementation |
|------------|--------------|---------|------------------------|
| **L0** | raw | Verbatim capture: logs, transcripts, inbox dumps | Obsidian vault + basic-memory `memory.db` (default) |
| **L1** | episodic | Per-event summaries: "what happened in this session/day" | Nightly reflection pass → `reflections/episodic/` |
| **L2** | semantic | Durable NL facts ABOUT Fritz/projects/decisions | Nightly reflection pass → `reflections/semantic/` |
| **L3** | reflective | Stable constraints, identity/DNA, recurring patterns | Nightly reflection pass + human → `reflections/reflective/` |

### **Direct Mapping Challenges**
TencentDB's L1-L3 are more granular and task-oriented than Shay's session-based layers:
- TencentDB **L1 Atom** ≈ Shay **L2 semantic** (both store distilled facts)
- TencentDB **L2 Scenario** ≈ Shay **L1 episodic** (both store contextual blocks)
- TencentDB **L3 Persona** ≈ Shay **L3 reflective** (both store identity/preferences)
- TencentDB **L0 Conversation** ≈ Shay **L0 raw** (both store verbatim traces)

### **Recommended Hybrid Approach**
Rather than replace Shay's existing schema, **layer TencentDB's innovations on top**:

1. **Keep Shay's L0→L3 session/reflection structure** as the foundation
2. **Add TencentDB's 4-tier pyramid within each Shay layer** for enhanced granularity:
   - Shay L0 raw → contains TencentDB L0 Conversation (verbatim) + L1 Atom (extracted facts)
   - Shay L1 episodic → contains TencentDB L2 Scenario (session scenes) + L3 Persona (session-level prefs)
   - Shay L2 semantic → contains cross-session TencentDB L3 Persona (durable identity)
   - Shay L3 reflective → contains meta-Persona (standing constraints, DNA)

3. **Integrate TencentDB's symbolic short-term memory** as a universal compression layer:
   - Apply to all tool chains, agent loops, and context-intensive operations
   - Offload verbose logs to `refs/*.md`, retain Mermaid canvases in context
   - Use `node_id` tracing for lossless drill-down when needed

### **Storage Strategy Alignment**
Both systems use **heterogeneous storage**:
- **Bottom layer (evidence):** Facts, logs, traces → databases (SQLite/FTS5 for Shay, SQLite+sqlite-vec for TencentDB)
- **Top layer (structure):** Personas, scenes, canvases → human-readable Markdown files
- **Shared principle:** Lower layers preserve evidence, upper layers preserve structure

---

## 4. Integration Plan

### **Phase 1: Assessment & Preparation** (Days 1-2)
- [ ] Verify Hermes Gateway adapter compatibility with current Shay agent
- [ ] Audit existing memory tools (`shay memory`, `basic-memory` MCP) for integration points
- [ ] Confirm sqlite-vec extension availability in Shay's local SQLite
- [ ] Document current memory usage baselines (token counts, recall accuracy)

### **Phase 2: Core Integration** (Days 3-5)
- [ ] Enable TencentDB Hermes Gateway adapter as external memory provider
- [ ] Configure single-select slot to use TencentDB (replacing built-in only)
- [ ] Implement symbolic short-term memory wrapping for:
  - Tool execution chains (`execute_code`, web search, etc.)
  - Agent loop context (Ralph-loop `/goal` integration)
  - Swarm worker communication (reduce inter-agent token costs)
- [ ] Establish drill-down pathways: Mermaid `node_id` → external `refs/*.md` → Shay's L0 raw

### **Phase 3: Layer Mapping & Schema Extension** (Days 6-8)
- [ ] Extract TencentDB L1 Atoms from Shay L0 raw during reflection pass
- [ ] Build TencentDB L2 Scenarios from Shay L1 episodic summaries
- [ ] Curate TencentDB L3 Persona from Shay L2 semantic + L3 reflective
- [ ] Create bidirectional sync: TencentDB updates → Shay memory files (and vice versa where appropriate)

### **Phase 4: Validation & Optimization** (Days 9-10)
- [ ] Run benchmarks: measure token reduction and recall improvement
- [ ] Tune Mermaid compression levels and offloading thresholds
- [ ] Validate traceability: confirm lossless recovery from symbol to raw text
- [ ] Document new memory flow in SITE-LEARNINGS.md and MEMORY-SCHEMA-L0-L3.md

### **Optional Enhancements** (Post-Adoption)
- [ ] Explore TencentDB skill generation layering (Scenario → reusable Skills/Persona)
- [ ] Investigate hybrid retrieval (BM25 + vector) for improved recall precision
- [ ] Consider TencentDB/OpenClaw plugin for expanded ecosystem compatibility

---

## 5. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Integration complexity** | Medium | Medium | Start with symbolic memory only (non-invasive); layer pyramid gradually |
| **Storage duplication** | Low | Low | Use Shay's existing SQLite as TencentDB backend; avoid double storage |
| **Schema confusion** | Medium | Low | Maintain clear documentation; preserve Shay's L0-L3 names where possible |
| **Performance overhead** | Low | Medium | Benchmark thoroughly; symbolic memory should reduce net token load |
| **Tool compatibility** | Low | Low | Hermes adapter designed for agent integration; test with core Shay tools |

---

## 6. Verdict: ADOPT

**Recommendation:** **ADOPT** TencentDB Agent Memory with the following rationale:

### **Strengths Supporting Adoption**
1. **Proven benefits:** 61.38% token reduction, 51.52% pass rate improvement, 59% PersonaMem accuracy gain (per independent benchmarks)
2. **Architectural alignment:** Shares Shay's core principles of hierarchical memory, heterogeneous storage, and traceability
3. **Non-disruptive integration:** Hermes Gateway adapter allows incremental adoption; symbolic memory layer can be added independently
4. **Zero external dependencies:** Fully self-hostable, MIT licensed, no vendor lock-in
5. **Complementary innovations:** Symbolic short-term memory addresses Shay's known context bloat pain point
6. **Active maintenance:** Recent v0.3.6 release, 4.5k stars, clear upgrade path

### **Why Not MONITOR or SKIP**
- **MONITOR insufficient:** Benefits are measurable and immediate (token savings accrue from day one)
- **SKIP unjustified:** No fundamental conflicts with Shay's architecture; risks are manageable and incremental
- **Strategic fit:** Directly addresses Shay's goal of persistent, scalable memory for long-horizon agents
- **Cost-benefit favorable:** Low integration effort (adapter already exists), high potential ROI in token efficiency

### **Adoption Conditions**
1. **Preserve Shay's L0→L3 naming** for continuity with existing reflection scripts and user expectations
2. **Layer TencentDB pyramid within Shay's framework** rather than replacing it wholesale
3. **Prioritize symbolic memory integration** as highest-leverage, lowest-risk entry point
4. **Maintain bidirectional compatibility** with existing Obsidian/basic-memory tools where possible
5. **Measure and document** actual token savings and recall improvements post-integration

---

## 7. Build Story (For Shay's Loop Implementation)

> **Note:** Per task instructions, this section outlines the plan and narrative only. Shay's agent loop will execute the actual implementation.

### **Narrative**
Fritz needs Shay to develop persistent, scalable memory that reduces context bloat while preserving recall fidelity for long-horizon agent operations. TencentDB Agent Memory provides a battle-tested 4-tier semantic pyramid with symbolic compression that directly addresses these needs. By integrating TencentDB's innovations as an enhancement layer over Shay's existing L0→L3 schema—rather than a replacement—we gain immediate token savings and improved long-term personalization without disrupting established workflows. The Hermes Gateway adapter offers a plug-and-path forward, while the symbolic memory layer delivers quick wins in context efficiency. Successful adoption will manifest as measurable reductions in API token consumption, improved agent pass rates on complex tasks, and a more structured, inspectable memory system that preserves both evidence (raw logs) and structure (personas, scenes) for optimal reasoning.

### **Key Implementation Milestones**
1. **Week 1:** Symbolic memory integration → immediate token savings in tool chains
2. **Week 2:** TencentDB as external memory provider → enhanced long-term recall
3. **Week 3:** Bidirectional layer mapping → unified memory pyramid across Shay and TencentDB
4. **Week 4:** Validation and optimization → documented improvements in SITE-LEARNINGS.md

### **Success Metrics**
- Token reduction: Target 40-60% decrease in context-heavy operations
- Recall accuracy: Measure improvement in PersonaMem-equivalent tests
- System stability: Zero regressions in existing memory-dependent features
- User experience: Faster response times, fewer "I need to repeat myself" moments

---
*Research complete. Ready for Shay's loop implementation phase.*