---
title: free-tier-caps-note-2026-05-31
type: note
permalink: shay-memory/learnings/free-tier-caps-note-2026-05-31
---

# Free LLM tiers — caps + free-limit-counter idea (2026-05-31)
Free models are NOT unlimited: OpenRouter :free = 20rpm/200rpd SHARED across all :free on the key;
Cerebras free = 1M tok/day but 8K ctx; Nous/Hermes Portal "free" = free-for-subscribers.
USE: pick free models for specific builds/research by tooling+capability, not sustained swarm load;
spread lanes across providers. PLANNED feature: a free-limit counter per model/provider (rpm/rpd/tpd
vs cap) that surfaces near-limit/exhausted and feeds credential-pool rotation + low-funds alert.
Caps recorded in data/models-registry.json -> meta._provider_free_caps.