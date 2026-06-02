---
title: rlm-rs-adopt-2026-05-31
type: note
permalink: shay-memory/research/rlm-rs-adopt-2026-05-31
---

# rlm-rs Adoption Research
**Date:** 2026-05-31  
**Status:** Research Complete  
**Target:** Shay Autonomous Self-Heal Loop Integration  

---

## What is rlm-rs?

rlm-rs is a Rust CLI implementing the Recursive Language Model (RLM) pattern specifically designed for Claude Code. Based on the arXiv paper "Recursive Language Models" (arXiv:2512.24601), it enables processing documents up to 100x larger than typical provider context windows through intelligent chunking, semantic search, and recursive sub-LLM orchestration.

## Language/Stack

- **Primary Language:** Rust (1.88+ required, 2024 edition)
- **Persistence Layer:** SQLite for reliable state management across sessions
- **Embedding Model:** BGE-M3 (automatically generated during document loading)
- **Vector Index:** Optional HNSW for scalable approximate nearest neighbor search
- **File I/O:** Memory-mapped I/O for efficient handling of large files
- **Build System:** Makefile + Cargo (standard Rust toolchain)
- **Dependencies:** cargo-deny for supply chain security, various Rust crates for chunking strategies

## License

**MIT License** - Permissive open-source license allowing commercial use, modification, and distribution with minimal restrictions. See [LICENSE](https://github.com/zircote/rlm-rs/blob/main/LICENSE) for full text.

## How Recursion/Chunking Enables Beyond-Context-Window Processing

The core innovation of rlm-rs lies in its hybrid approach to handling context limits:

### 1. **Intelligent Chunking Strategies**
Documents are pre-processed into semantically meaningful chunks using one of four strategies:
- **Semantic:** Splits at natural boundaries (headings, paragraphs) - ideal for markdown/prose
- **Code-aware:** Language-aware chunking at function/class boundaries (supports Rust, Python, JS/TS, Go, Java, C/C++, Ruby, PHP)
- **Fixed:** Splits at exact byte boundaries - ideal for logs/plain text
- **Parallel:** Multi-threaded fixed chunking for large files (>10MB)

### 2. **Semantic + BM25 Hybrid Search**
Each chunk gets automatically embedded using BGE-M3 during loading. Searches combine:
- **Semantic search:** Vector similarity via HNSW index (or brute force for smaller sets)
- **BM25:** Traditional keyword-based scoring
- **RRF fusion:** Combines both scores for optimal relevance

### 3. **Pass-by-Reference Architecture**
Instead of stuffing chunks into context windows, rlm-rs uses chunk IDs as references:
- Root LLM (main Claude conversation) works with chunk IDs
- Sub-LLM agents retrieve specific chunks by ID from SQLite as needed
- This enables arbitrary-depth recursion without context window bloat

### 4. **Agentic Workflow Support**
- **dispatch:** Split chunks into batches for parallel subagent processing
- **aggregate:** Combine findings from multiple analyst subagents
- Enables map-reduce style processing of massive documents

## Concrete Integration Plan into Shay

### Integration Points

1. **File Read Layer** (`shay-agent-os/components/file_reads.py`)
   - Replace direct file reads with rlm-ql load/search for files >50KB
   - Maintain backward compatibility for small files
   - Add configuration toggle: `USE_RLM_FOR_LARGE_FILES`

2. **Context Engine** (`shay-agent-os/components/context_engine.py`)
   - Integrate rlm-rs as external environment for recursive calls
   - Map Shay's subagent calls to rlm-rs dispatch/aggregate pattern
   - Use rlm-rs chunk get for pass-by-reference instead of context stuffing

3. **build_app's Large-File Generation** (`shay-agent-os/components/code_jobs.py`)
   - For generation tasks >30KB output, use rlm-rs to:
     - Load reference materials/documents
     - Search for relevant patterns/examples
     - Generate in chunks with recursive self-improvement
   - Particularly valuable for site generation with large template libraries

### Clean-Room vs Vendored Decision

**Recommendation: Vendored Approach with Custom Fork**

**Reasons for Vendored:**
1. **Control Over Updates:** Shay needs guaranteed compatibility with its autonomous self-heal loop
2. **Custom Extensions:** Will need Shay-specific hooks for progress reporting to disk
3. **Dependency Management:** Avoids version conflicts with Shay's existing Rust toolchain
4. **Offline First:** Vendoring ensures no network dependency during autonomous operations
5. **Security Audit:** Enables full supply chain review within Shay's security boundary

**Implementation Plan:**
1. Fork zircote/rlm-rs to `famtastic/rlm-rs-shay` 
2. Add Shay-specific features:
   - Disk heartbeat protocol integration (for swarm visibility)
   - Custom chunking strategy for FAMtastic site templates
   - Enhanced metadata tracking for agent OS debugging
3. Maintain upstream compatibility through periodic rebasing
4. Document all Shay-specific extensions in FORK-README.md

### Integration Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Increased binary size | Medium | Low | Use `--release` builds, consider UPX compression |
| Rust toolchain complexity | Medium | Medium | Document exact Rust version (1.88+) in setup scripts |
| SQLite locking under concurrent access | Low | High | Implement connection pooling, WAL mode |
| Embedding model download delays | Medium | Medium | Pre-bundle BGE-M3 with Shay distribution |
| Context switch overhead | Low | Medium | Benchmark dispatch/aggregate vs direct calls |

## Ralph-Style Build Story for Shay's Autonomous Self-Heal Loop

> **Note:** This is a *build story* - a narrative description of what the autonomous system should build, not implementation instructions. Shay's self-heal loop will execute this story.

---

### The rlm-rs Integration Build Story

**Goal:** Enable Shay to process and reason over arbitrarily large codebases, documentation sets, and site templates without context window limitations, while maintaining full auditability and swarm visibility.

**Act I: The Foundation**
```
[Shay Agent OS] detects need to analyze codebase >50MB
├── Checks configuration: USE_RLM_FOR_LARGE_FILES = true
├── Invokes rlm-rs init (creates SQLite store at ~/.shay/rlm-state)
├── Loads target directory with semantic chunking:
│   └── rlm-rs load ./famtastic --chunker semantic --name codebase
└── Confirms load completion via rlm-rs status
```

**Act II: The Recursive Reasoning Loop**
```
[Shay Sub-Agent] receives task: "Find all authentication-related code"
├── Rather than stuffing entire codebase into context:
│   ├─ Executes: rlm-rs search "authentication OR login OR jwt" --buffer codebase --top-k 20
│   └─ Gets back ranked chunk IDs with semantic+BM25 scores
├── For each high-relevance chunk (score >0.8):
│   ├─ Retrieves full chunk via: rlm-rs chunk get <chunk-id>
│   ├─ Analyzes chunk content for auth patterns
│   └─ Reports findings to aggregation buffer
└── After processing all chunks:
    ├─ Executes: rlm-rs aggregate --buffer codebase --findings ./auth-findings.json
    └─ Receives consolidated report of all auth-related code locations
```

**Act III: The Self-Heal Application**
```
[Shay Agent OS] identifies outdated auth pattern needing update
├── Uses rlm-rs to locate exact files needing modification:
│   └── rlm-rs grep codebase "old_auth_function" --max-matches 100
├── For each file:
│   ├─ Loads file into temporary rlm-rs buffer for precise editing
│   ├─ Applies transformation using sub-agent reasoning
│   └─ Writes back modified chunk via rlm-rs update-buffer
└── Commits changes with full traceability:
    └─ rlm-rs export-buffers --output ./pre-change-state.json
```

**Act IV: The Visibility Protocol**
```
Throughout all operations:
├── Every rlm-rs command triggers disk heartbeat:
│   └─ echo "{\"ts\": $(date +%s), \"op\": \"$COMMAND\", \"buffer\": \"$BUFFER\"}" >> ~/.shay/rlm-hearts.log
├── Swarm monitors can track progress via:
│   └─ tail -f ~/.shay/rlm-hearts.log | jq -s '. | group_by(.op) | map({op: .[0].op, count: length})'
└── Autonomous halt conditions visible:
    └─ If no heartbeats for 300s, trigger swarm investigation
```

**Acceptance Criteria (Binary Checklist):**
- [ ] Shay can process single files >10MB without context window errors
- [ ] Recursive sub-agent calls work for documents 50x context window size
- [ ] All rlm-rs operations emit heartbeat to disk for swarm visibility
- [ ] Clean-room integration maintains <5% performance regression on small files
- [ ] Vendored fork builds successfully in Shay's CI pipeline
- [ ] Documentation updated in SITE-LEARNINGS.md with specific file paths and function names

**Known Gaps to Address During Implementation:**
- [ ] SQLite WAL mode configuration for concurrent Shay subprocess access
- [ ] Embedding model bundling strategy to avoid first-run download delays
- [ ] Progress reporting granularity for very large dispatch operations
- [ ] Memory usage monitoring for long-running rlm-rs processes
- [ ] Integration test coverage for edge cases (empty files, binary files, permission errors)

---

## Implementation Roadmap

**Phase 1: Spike & Validation (1-2 days)**
- [ ] Test rlm-rs with Shay's largest existing codebase (~20MB famtastic/)
- [ ] Verify heartbeat protocol integration works
- [ ] Benchmark search performance vs current grep/ripgrep approach

**Phase 2: Vendoring & Customization (3-4 days)**
- [ ] Create famtastic/rlm-rs-shay fork with Shay-specific enhancements
- [ ] Implement disk heartbeat hooks in rlm-rs CLI
- [ ] Add FAMtastic-optimized chunking strategy for site templates

**Phase 3: Integration & Testing (5-6 days)**
- [ ] Integrate rlm-rs calls into Shay's file read/context engine layers
- [ ] Add configuration flags and fallback paths
- [ ] Run autonomous self-heal loop scenarios with large document processing

**Phase 4: Documentation & Knowledge Transfer (0.5 day)**
- [ ] Update SITE-LEARNINGS.md with integration details
- [ ] Create runbook for troubleshooting rlm-rs issues in Shay context
- [ ] Add to agent OS onboarding materials

**Total Estimated Effort:** 9-12.5 researcher days

---

## Decision Summary

**ADOPT rlm-rs** via vendored fork with Shay-specific enhancements for:
1. Processing documents beyond context window limits (100x capability)
2. Enabling recursive sub-agent reasoning patterns
3. Providing disk-based visibility for swarm operations
4. Maintaining compatibility with Shay's autonomous self-heal loop requirements

**DO NOT** implement via clean-room recreation - the existing rlm-rs implementation provides battle-tested patterns that would take significantly longer to replicate correctly.

**NEXT STEP:** Present this research to Fritz for approval to begin Phase 1 spike.