# Agent Options Report — June 8, 2026

## The Problem

Right now Shay's GLM subscription is doing double duty:
- **BRAIN** (Shay's own reasoning, orchestration, conversation with Fritz)
- **WORKERS** (subagents, compression, session search, skills hub, triage)

That means every worker task burns prompts from the same pool Shay thinks with.
We need them separated. Plus we need the ability to:
1. Swap different agents for the same task (benchmarking)
2. Route tasks by capability, not just availability
3. Track subagent performance over time
4. Add capacity without clogging the brain lane

---

## What We Have NOW

### Subscription (Flat Rate — Already Paid)

| Lane | Model | Plan | Cost | Limits | Status |
|------|-------|------|------|--------|--------|
| GLM Brain | glm-5.1 | Z.ai Coding Plan | ~$9-72/mo (check your tier) | ~80-1,600 prompts/5hr, rolling cap | ACTIVE — primary brain |
| GLM 4.6 | glm-4.6 | Same plan | Included | Same pool | CONFIGURED |
| GLM 4.7 | glm-4.7 | Same plan | Included | Same pool | CONFIGURED |
| Codex | gpt-5.4 | OpenAI ChatGPT Plus/Pro | ~$20/mo | Usage limits, cap resets 10th | CAPPED until 10th |

### Free Tiers (Keys Already Set)

| Lane | Model | Provider | Free Limits | Best For | Status |
|------|-------|----------|-------------|----------|--------|
| Groq Llama | llama-3.3-70b-versatile | Groq | 30 RPM, 30K TPM, 14.4K RPD | Fast inference, classification, routing | KEY SET |
| Groq Llama 4 | llama-4-scout | Groq | 30 RPM, 30K TPM, 14.4K RPD | Larger context tasks | KEY SET |
| Cerebras Llama | llama-3.3-70b | Cerebras | 1M tokens/day, 2,600 tok/s | High-volume batch, daily budget king | KEY SET |
| Cerebras Qwen3 | qwen3-235b-instruct | Cerebras | 1M tokens/day | Reasoning-heavy tasks | KEY SET |
| Gemini 2.5 Pro | gemini-2.5-pro | Google AI Studio | 50 RPD free tier | Deep reasoning, vision, multimodal | KEY SET |
| Gemini 3.1 Pro | gemini-3.1-pro-preview | Google AI Studio | Limited free tier | Latest model, cutting edge | KEY SET |
| Gemini Flash | gemini-2.5-flash | Google AI Studio | 10 RPM, 250K TPM, 1.5K RPD | Fast general-purpose, generous free tier | KEY SET |
| OpenRouter Qwen Coder | qwen3-coder:free | OpenRouter | 20 RPM, 1K RPD | 1M context coding — strongest free coder | KEY SET |
| OpenRouter Kimi K2 | kimi-k2.6:free | OpenRouter | 20 RPM, 200 RPD | General reasoning | KEY SET |

### Local (Zero Cost — On Your M5)

| Lane | Model | Size | Speed Profile | Best For | Status |
|------|-------|------|---------------|----------|--------|
| Ollama hermes3 | hermes3:latest | 4.7 GB | Medium | Shay's internal tasks, compression, session search | ACTIVE (auxiliary) |
| Ollama qwen3 | qwen3:14b | 9.3 GB | Medium | Skills hub, triage, approval, MCP | ACTIVE (auxiliary) |
| Ollama deepseek-r1 | deepseek-r1:latest | 5.2 GB | Slow (reasoning) | Deep reasoning tasks, code analysis | INSTALLED |
| Ollama gemma4 | gemma4:latest | 9.6 GB | Medium | General purpose, multimodal potential | INSTALLED |
| Ollama wizardlm | wizardlm-uncensored:latest | 7.4 GB | Medium | Unfiltered generation | INSTALLED |
| Ollama dolphin-llama3 | dolphin-llama3:latest | 4.7 GB | Fast | Quick uncensored tasks | INSTALLED |
| Ollama phi4-mini | phi4-mini:latest | 2.5 GB | Fast | Lightweight classification, routing | INSTALLED |
| Ollama qwen2.5 1.5b | qwen2.5:1.5b | 986 MB | Very fast | Ultra-light routing, embedding | INSTALLED |

**Hardware constraint:** M5, 16 GB RAM, 10 cores. Two large models loaded simultaneously maxes out. Currently hermes3 + qwen3 are the active pair. Can swap but not run all at once.

---

## What's AVAILABLE (Not Yet Configured)

### Cheap Paid Additions (Worker Lanes)

| Provider | Model | Cost | Why It Matters |
|----------|-------|------|----------------|
| MiniMax Coding Plan | M2.7, M2.7-highspeed | $10-20/mo flat | 100+ TPS, includes TTS/image/music models too. Never runs out on $20 tier. Best value worker lane. |
| Qwen Coding Plan | Qwen3.5-Plus, Qwen3-Coder | $10/mo | 1,200 requests, 1M context coding. Alibaba's answer to Claude. |
| Kimi Code Plan | Kimi K2.5 | ~$7/wk ($28/mo) | 300-1,200 calls, 100 TPS. Moonshot's flagship. |
| GLM Lite Plan | GLM-4.7-Flash | FREE | Zero cost model from Z.ai — different from your paid plan, separate pool |
| OpenRouter Credits | Any model | $5-10 credits | Unlocks 200+ models at pay-per-token. $10 in account bumps free models to 1K RPD. |

### One-Time Sign-up Credits (Free Money)

| Provider | Free Credits | How |
|----------|-------------|-----|
| OpenAI | $5 | New API account |
| Anthropic | $5 | New API account |
| xAI (Grok) | $25 | New API account |
| Together AI | $25-100 | Startup credits |
| Google Gemini | Unlimited free tier | No card needed |
| **Total grabbable** | **$200+** | Across 15+ providers |

---

## The Architecture We Should Build

### Brain Lane (Protected — Never Use for Workers)

```
SHAY'S BRAIN → glm-5.1 (Z.ai subscription, flat rate)
  ├── Orchestrating Fritz's empire
  ├── Conversation, reasoning, decisions  
  ├── Dispatching workers
  └── This is the QUEEN. Workers don't touch this lane.
```

### Worker Lanes (Dispatch Pool — Interchangeable)

```
FAST WORKERS (classification, routing, triage, format conversion)
  ├── groq/llama-3.3-70b     — 30K TPM free, instant
  ├── cerebras/llama-3.3-70b  — 1M tok/day free, 2,600 tok/s  
  ├── ollama/phi4-mini        — local, 2.5GB, instant
  └── ollama/qwen2.5-1.5b     — local, 1GB, ultra-fast

CODING WORKERS (code generation, review, debugging)
  ├── openrouter/qwen3-coder:free  — 1M context, strongest free coder
  ├── codex/gpt-5.4                — when cap resets, premium coding
  ├── ollama/deepseek-r1           — local, reasoning-capable code analysis
  └── [ADD: qwen coding plan $10/mo for dedicated coding lane]

REASONING WORKERS (research, analysis, planning, review)
  ├── gemini-2.5-pro free          — 50 RPD, deep reasoning + vision
  ├── cerebras/qwen3-235b          — 1M tok/day, strong reasoning
  ├── ollama/deepseek-r1           — local, chain-of-thought
  └── openrouter/kimi-k2.6:free   — general reasoning

MULTIMODAL WORKERS (vision, image analysis, screenshots)
  ├── gemini-2.5-flash free        — multimodal input, 1.5K RPD
  └── ollama/gemma4                — local, multimodal potential

SHAY'S INTERNAL AUXILIARY (already configured — don't change)
  ├── compression  → ollama/hermes3
  ├── session_search → ollama/hermes3
  ├── skills_hub   → ollama/qwen3:14b
  ├── approval     → ollama/qwen3:14b
  ├── triage       → ollama/qwen3:14b
  └── mcp          → ollama/qwen3:14b
```

### What We Need to ADD (Paid — Pick 1-2)

**RECOMMENDATION: MiniMax $20/mo plan**

Why:
- Flat rate, no metering anxiety
- 100+ tokens/second (fast enough for real-time worker use)
- Includes TTS, image, and music models — covers Media Studio needs too
- Multiple tiers ($10, $20, $40) so we can scale
- Users report never running out on $20 plan
- Separate from GLM brain subscription = lanes stay clean

**Runner-up: Qwen Coding Plan $10/mo**
- Dedicated coding lane with 1,200 requests
- 1M context window on Qwen3-Coder
- Covers the coding worker lane cheaply

**Budget option: Just grab the $200+ in sign-up credits**
- OpenRouter with $10 credit bumps free model limits to 1K RPD
- Together AI credits for premium model access
- Zero monthly commitment

---

## The Missing Pieces We Need to Build

### 1. Agent Capability Matrix
A structured file tracking what each agent can do, tested and scored:

```
agent_matrix.yaml:
  groq-llama-33-70b:
    capabilities: [classification, routing, fast-inference, code-review]
    speed: fast (30K TPM)
    context: 128K
    quality_scores:
      classification: 8/10
      code_review: 6/10
      reasoning: 5/10
    cost: free
    last_tested: 2026-06-08
```

### 2. Benchmark Harness
Run the same task through 3+ agents, collect:
- Output quality (human-rated or Gemini-rated)
- Time to complete
- Token usage
- Cost
- Failure modes

### 3. Subagent Process Tracker
Log every dispatched task with:
- Agent used
- Task type
- Duration
- Success/failure
- Quality rating
- Cost (if any)

This data feeds the matrix over time. The matrix feeds routing decisions.

---

## Immediate Action Items (Priority Order)

1. **Protect GLM brain lane** — verify no auxiliary/worker traffic hits glm-5.1 (already good — auxiliaries use ollama)
2. **Add MiniMax or Qwen plan** — $10-20/mo gives dedicated worker capacity
3. **Grab free sign-up credits** — $200+ available with new accounts
4. **Build agent_matrix.yaml** — start tracking capabilities
5. **Build benchmark harness** — same task, 3 agents, compare results
6. **Add GLM-4.7-Flash as free worker** — zero cost, separate from paid plan
7. **Configure cost_aware routing** — currently `cost_aware: false` in config

---

## Cost Summary

| Option | Monthly Cost | What It Unlocks |
|--------|-------------|-----------------|
| Current setup | $0 additional | 5 free cloud providers + 8 local models |
| + MiniMax plan | $20/mo | Dedicated fast worker lane + TTS/image/music |
| + Qwen plan | $10/mo | Dedicated coding lane, 1M context |
| + Sign-up credits | $0 (one-time) | $200+ in premium model access |
| **Total to add everything** | **$30/mo** | Full worker fleet, brain protected |
