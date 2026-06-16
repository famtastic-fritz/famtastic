# Brain Capabilities Map

Quick-reference for every brain model available in the Shay system.
Updated: June 2026

---

## At a Glance

| Model | Provider | Cost Tier | Context Window | Speed | Quality Tier | Image Gen |
|---|---|---|---|---|---|---|
| **glm-5.1** | Z.AI (Zhipu) | Flat (primary) | 1M tokens | Fast (~140 tok/s) | Frontier | No (separate GLM-Image) |
| **gpt-5.4** | OpenAI | Metered | 1M tokens (922K in / 128K out) | Fast | Top-tier (BenchLM 92) | Via separate tools |
| **gpt-5.4-mini** | OpenAI | Metered (cheap) | 512K tokens | Very fast (2x gpt-5.4) | Strong mid-tier | Via separate tools |
| **gemini-2.5-pro** | Google | Metered | 1M tokens | Fast | High (legacy but solid) | No (text only) |
| **gemini-3.1-pro-preview** | Google | Metered | 1M tokens | Fast (~140 tok/s) | Frontier (GPQA 94.3%) | Native multimodal input |
| **hermes3** | Ollama (local) | Free | 128K (8B) / 128K (70B) | Depends on hardware | Mid (8B) / High (70B) | No |

---

## Cost Quick Reference

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Notes |
|---|---|---|---|
| glm-5.1 | $1.40 | $4.40 | Cheapest frontier model. Flat in Shay = no metering. |
| gpt-5.4 | $2.50 | $15.00 | Most expensive metered brain. |
| gpt-5.4-mini | $0.75 | $4.50 | 3.3x cheaper output than gpt-5.4. |
| gemini-2.5-pro | $1.25 | $10.00 | Mid-range. |
| gemini-3.1-pro-preview | $2.00 | $12.00 | Premium tier for Google. |
| hermes3 | $0.00 | $0.00 | Local only. Your hardware = your limit. |

---

## Detailed Model Profiles

---

### GLM-5.1 (Primary Brain)

**Provider:** Z.AI (Zhipu AI) — Chinese AI lab, open-source (MIT license)
**Role in Shay:** Default brain. Flat cost, no metering.
**Release:** April 2026

**Context Window:** Up to 1M tokens. Can hold entire codebases in a single pass.

**Strengths:**
- Best price-to-performance ratio of any frontier model
- Open-source (MIT) — can be self-hosted
- Anthropic-compatible API surface (Claude-style agents drop in unchanged)
- Beat both Claude Opus 4.6 and GPT-5.4 on SWE-Bench Pro (655 iterations, 6,000+ tool calls)
- Strong agentic capabilities: complex instruction decomposition, multi-agent coordination, temporal consistency in extended tasks
- DeepSeek Sparse Attention for high token efficiency
- Excellent code generation and systems engineering

**Weaknesses:**
- English reasoning depth slightly below Claude Opus tier
- Newer ecosystem — fewer third-party integrations than OpenAI/Google
- Documentation and community resources primarily Chinese-first
- No native image generation (requires separate GLM-Image model)

**Best For:**
- Day-to-day Shay operations (primary brain for a reason)
- Large codebase analysis and multi-file refactors
- Long-context tasks where you need the whole repo in memory
- Cost-sensitive workloads that still need frontier quality
- Agentic workflows with heavy tool calling

**Speed:** ~140 tokens/second output
**Quality Notes:** Competitive with GPT-5.4 on coding tasks. Slightly behind on pure English prose and nuanced reasoning compared to Claude Opus. Strong on structured output and function calling.

---

### GPT-5.4

**Provider:** OpenAI (Codex lineage)
**Role in Shay:** Premium metered brain for high-stakes tasks.
**Release:** March 5, 2026

**Context Window:** 1M tokens (922K input / 128K output)

**Strengths:**
- BenchLM composite score of 92 — highest of any model at release
- SWE-Bench Pro: 57.7% — frontier coding
- OSWorld: 75% (surpasses human expert baseline of 72.4%) — native computer use
- GDPval: 83% — knowledge work
- Unified model: absorbs former Codex line, no separate coding model needed
- Native computer-use capabilities
- Strong multi-step quantitative reasoning
- Largest ecosystem of integrations, tools, and community resources

**Weaknesses:**
- Most expensive metered brain ($15/M output tokens)
- Can be verbose — generates more tokens than needed for simple tasks
- Metered usage adds up fast in long sessions
- Native image generation not built into text model

**Best For:**
- High-stakes code generation where you want the absolute best
- Complex multi-step reasoning chains
- Computer-use / GUI automation tasks
- Tasks where ecosystem compatibility (plugins, tools) matters
- When you need the safety of the most battle-tested model

**Speed:** Fast but not the fastest. gpt-5.4-mini is 2x faster.
**Quality Notes:** Top of the market on composite benchmarks. Particularly strong on coding and computer use. English prose quality is excellent. The gold standard — you pay for it.

---

### GPT-5.4-mini

**Provider:** OpenAI (Codex lineage)
**Role in Shay:** Cost-effective metered brain for high-volume work.
**Release:** March 17, 2026

**Context Window:** ~512K tokens (smaller than full gpt-5.4)

**Strengths:**
- 2x faster than gpt-5.4
- 3.3x cheaper on output tokens ($4.50 vs $15.00 per 1M)
- Retains strong coding and reasoning from the GPT-5.4 family
- Good for subagent / parallel execution patterns
- Multimodal input support
- 30% of GPT-5.4 quota — stretches your OpenAI spend further

**Weaknesses:**
- Noticeably below gpt-5.4 on complex reasoning and expert tasks
- Smaller context window limits whole-codebase analysis
- Not suitable for the hardest coding challenges
- Quality gap is real on SWE-Bench Pro vs full gpt-5.4

**Best For:**
- High-volume, lower-stakes tasks (bulk edits, formatting, summaries)
- Quick prototyping where speed matters more than perfection
- Subagent dispatches — run many in parallel cheaply
- Everyday coding tasks that don't need frontier intelligence
- When you want OpenAI quality but gpt-5.4 is overkill

**Speed:** Very fast. Best speed-to-quality ratio in the OpenAI lineup.
**Quality Notes:** Solid but not frontier. Think of it as gpt-5.4 with ~80% of the brainpower at 30% of the cost. Fine for most tasks. Upgrade to gpt-5.4 when the task is genuinely hard.

---

### Gemini 2.5 Pro

**Provider:** Google DeepMind
**Role in Shay:** Google-ecosystem brain with strong reasoning.
**Release:** May 2025 (mature, stable)

**Context Window:** 1M tokens

**Strengths:**
- Built-in "thinking" mode for step-by-step reasoning
- Excellent multimodal input (text, image, video, audio, PDF)
- Competitive coding benchmark (SWE-Bench ~72%)
- Strong research synthesis and multi-document analysis
- Mature model — well-tested, fewer surprises
- 1M context window is genuine, not marketing
- Good balance of speed and quality

**Weaknesses:**
- Older generation — surpassed by Gemini 3.1 Pro on reasoning
- Output pricing ($10/M) is middle-of-pack
- No native image generation in the text model
- Can be slower than gpt-5.4-mini on simple tasks
- "Thinking" mode adds latency

**Best For:**
- Research-heavy tasks (multi-document synthesis, literature reviews)
- Multimodal analysis (processing images, PDFs alongside text)
- Tasks where built-in reasoning chains are valuable
- Google Cloud / Vertex AI integrated workflows
- When you want a proven, stable model

**Speed:** Moderate. Thinking mode slows it down but improves accuracy.
**Quality Notes:** A workhorse. Not the flashiest model anymore but extremely reliable. Particularly good at understanding and synthesizing complex, multi-source information. The thinking toggle is genuinely useful for hard problems.

---

### Gemini 3.1 Pro Preview

**Provider:** Google DeepMind
**Role in Shay:** Google's frontier reasoning brain.
**Release:** February 19, 2026 (still in preview)

**Context Window:** 1M tokens (1,048,576)

**Strengths:**
- GPQA Diamond: 94.3% — best-in-class on graduate-level science reasoning
- ARC-AGI-2: 77.1% — more than double Gemini 3 Pro (31.1%)
- SWE-Bench Verified: 80.6% — strong coding
- Leads 13 of 16 major benchmarks per Google
- MoE (Mixture of Experts) architecture — efficient for its capability level
- Native multimodal input (text, image, video, audio, PDF)
- ~140 tokens/second output speed
- $2/$12 pricing is 7.5x cheaper than Claude Opus 4.6 on input

**Weaknesses:**
- Still in "preview" — no confirmed GA date
- Benchmark leadership doesn't always translate to production reliability
- Somewhat verbose (generated 57M tokens during evaluation vs 35M average)
- Output pricing ($12/M) is premium
- Preview status means potential API changes
- Practitioner reports of quality fluctuations in real-world use

**Best For:**
- Complex reasoning tasks requiring deep scientific/mathematical understanding
- Graduate-level knowledge work
- Agentic workflows with custom tools (has a customtools variant)
- When you need Google's best reasoning capability
- Long-horizon tasks where extended thinking pays off

**Speed:** ~140 tokens/second — faster than average.
**Quality Notes:** Legitimately impressive on reasoning benchmarks. The GPQA Diamond score of 94.3% is remarkable. However, preview status and verbosity mean it's not always the most practical choice for routine work. Best when the task genuinely demands deep reasoning.

---

### Hermes 3 via Ollama (Local)

**Provider:** Nous Research (fine-tuned Llama 3.1)
**Role in Shay:** Local, free, offline brain.
**Release:** August 2024 (8B), ongoing updates

**Context Window:** 128K tokens (Llama 3.1 base) — Ollama defaults to 4K, configurable

**Available Sizes:**
- 8B — runs on 8 GB RAM (laptop-grade)
- 70B — runs on 40+ GB RAM (desktop/server)
- 405B — requires multi-GPU setup (not typical for local Shay use)

**Strengths:**
- Completely free — no API costs, no rate limits, no metering
- Runs offline — works without internet
- Privacy — data never leaves your machine
- Strong function calling and structured output
- Good instruction following and system prompt adherence
- Neutrally aligned — follows user intent without unnecessary refusals
- Open-source, customizable
- Excellent for experimentation and rapid iteration

**Weaknesses:**
- Quality significantly below frontier cloud models, especially the 8B variant
- Speed limited by your hardware — can be very slow on modest machines
- No native image generation
- 8B struggles with complex reasoning, long code generation, and nuanced tasks
- 70B requires serious hardware (40+ GB VRAM for comfortable use)
- Ollama default context window is only 4K tokens — must be manually increased
- No built-in web search, tool calling beyond what Ollama provides

**Best For:**
- Offline / air-gapped environments
- Quick local prototyping without burning API credits
- Privacy-sensitive tasks where data must not leave the machine
- Learning and experimentation
- Fallback when cloud APIs are down
- Simple tasks that don't justify API spend

**Speed:** Depends entirely on your hardware. 8B on M-series Mac: ~30-60 tok/s. 70B: ~5-15 tok/s.
**Quality Notes:** 8B is usable for simple tasks but noticeably below cloud models. 70B is genuinely competitive with older cloud models (GPT-4-class) but requires serious hardware. The Hermes fine-tune improves instruction following and function calling over base Llama 3.1, which matters for agent use.

---

## Decision Guide: Which Brain When?

```
Need the absolute best coding result?        → gpt-5.4
Day-to-day Shay work, good enough + cheap?   → glm-5.1 (default)
High-volume tasks, speed matters?            → gpt-5.4-mini
Deep scientific/reasoning work?              → gemini-3.1-pro-preview
Multimodal analysis (images, PDFs, audio)?   → gemini-2.5-pro or 3.1-pro
Working offline or privacy-critical?         → hermes3
Big codebase in context, budget matters?     → glm-5.1 (1M context, cheapest)
```

---

## Switching Brains in Shay

Brains are switched via the Shay gateway. The active brain determines:
- Response quality and style
- Token costs (if metered)
- Available capabilities (multimodal, computer use, etc.)
- Speed and latency

Default: **glm-5.1** — best balance of cost, quality, and context for daily operations.

---

*Last updated: June 2026. Model capabilities and pricing change frequently. Verify before making cost-critical decisions.*
