---
title: turbovec-adopt-2026-05-31
type: note
permalink: shay-memory/research/turbovec-adopt-2026-05-31
---

# TurboVec Adoption Research
## What it is
TurboVec is a Rust-based vector index with Python bindings built on Google Research's TurboQuant algorithm. It provides fast compressed vector retrieval with online ingest capabilities, no training phase, and SIMD-optimized search kernels.

## Performance Claims
- 10M document corpus fits in 4GB RAM vs 31GB for float32 FAISS
- 12-20% faster than FAISS IndexPQFastScan on ARM (NEON)
- Matches or beats FAISS on x86 (AVX-512BW)
- Online ingest: add vectors without retraining or rebuilding
- Filter at search time with id allowlist or slot bitmask
- Pure local deployment - no managed service required

## License
MIT License (confirmed from GitHub API response)

## Comparison to Shay's Current Retrieval
Shay's current retrieval system consists of:
1. basic-memory MCP - provides entity/relation storage and basic querying
2. vault-search MCP - provides semantic search over Obsidian vault
3. Any holographic retrieval - not currently implemented in Shay

Key differences:
- TurboVec is purpose-built for high-performance vector search with compression
- basic-memory/vault-search are general knowledge graph systems with text-based querying
- TurboVec requires vector embeddings as input (would need embedding model integration)
- TurboVec offers orders-of-magnitude better memory efficiency for large vector sets
- TurboVec has specialized search optimizations (SIMD, filter pushdown) not present in current system

## Should it become the memory backend behind TencentDB tiers?
**Verdict: Yes, with caveats**

**Pros:**
- Massive memory savings (8x+ reduction) for vector storage
- Faster search latency than current FAISS-based approaches
- Online ingest matches Shay's need for continuous memory updates
- Filtering capabilities align with TencentDB tiered access patterns
- MIT license permits commercial use in FAMtastic ecosystem
- Actively maintained (last push May 30, 2026)

**Cons/Integration Requirements:**
- Requires embedding model integration (would need to add sentence-transformers or similar)
- Current basic-memory/vault-search would need to be wrapped or migrated
- Would lose direct graph/query capabilities of basic-memory (entities/relations)
- Need to build abstraction layer to maintain compatibility with existing Shay agent interfaces

## Integration Plan
1. **Evaluation Phase** (1-2 days)
   - Install turbovec: `pip install turbovec`
   - Benchmark with Shay's embedding dimensions (likely 1536 for OpenAI/text-embedding-3-small)
   - Test online ingest performance with simulated memory stream
   - Verify filter functionality with TencentDB tier bitmasks

2. **Abstraction Layer Design** (2-3 days)
   - Create TurboVecMemoryBackend interface matching basic-memory MCP protocol
   - Implement entity/vector mapping layer (store entity ID → vector mapping)
   - Add filtering support for TencentDB tier bitmasks
   - Maintain backward compatibility with existing agent memory calls

3. **Migration Path** (3-5 days)
   - Phase 1: Run TurboVec alongside basic-memory for new memories only
   - Phase 2: Migrate existing memories via batch embedding generation
   - Phase 3: Cut over completely, retain basic-memory for graph relations only
   - Phase 4: Evaluate if graph relations can be migrated to TurboVec with payload storage

4. **Self-Heal Loop Integration**
   - As specified in task: Shay's self-heal loop implements, not Claude
   - Self-heal loop should monitor TurboVec performance metrics
   - Auto-trigger reindex if fragmentation > threshold
   - Validate search latency SLOs

## Build Story
TurboVec adoption represents a strategic upgrade to Shay's memory subsystem that addresses the core limitation of vector storage scalability. By leveraging TurboQuant compression, Shay can maintain agent-memory for 10x more vectors at same memory cost, enabling longer agent lifespans and richer contextual recall. The integration preserves Shay's existing agent OS interfaces while swapping out the underlying storage engine for one purpose-built for high-volume vector retrieval.

**Honest Assessment**: TurboVec is a strong candidate for replacing Shay's current vector storage backend. The performance gains are substantial and align perfectly with FAMtastic's goal of supporting 500+ parallel agents. The main risk is integration complexity, but the MIT license and active maintenance mitigate long-term concerns. Recommend proceeding with evaluation phase immediately.