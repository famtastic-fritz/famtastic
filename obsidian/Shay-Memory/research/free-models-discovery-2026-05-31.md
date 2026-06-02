---
title: free-models-discovery-2026-05-31
type: note
permalink: shay-memory/research/free-models-discovery-2026-05-31
---

# Free / Open LLM Discovery — Shay Worker-Lane Brains

**Date:** 2026-05-31
**Scope:** READ-ONLY research. Best FREE / open models to power Shay worker lanes.
**Registry sync:** New entries appended to `/Users/famtasticfritz/famtastic/data/models-registry.json` with `status: "candidate"` (nothing removed).

---

## TL;DR ranked picks by lane

| Lane | #1 pick | Why | Access |
|---|---|---|---|
| **Coding** | `qwen/qwen3-coder:free` | Strongest free coder, 1M ctx, agentic tool-use | OpenRouter |
| **Research / Reasoning** | `deepseek/deepseek-v4-flash:free` | Native reasoning chain, 1M ctx, free | OpenRouter |
| **Agentic / tool-use** | `moonshotai/kimi-k2.6:free` | Best open agentic + long-horizon loops, vision | OpenRouter |
| **Long-context** | Gemini Flash free tier / `deepseek-v4-flash:free` | 1M ctx, multimodal | Google AI Studio OAuth / OpenRouter |
| **Vision** | `google/gemma-4-31b-it:free` / Gemini Flash | vision+tools, also local via Ollama | OpenRouter / Google |
| **Mobile-edge** | `liquid/lfm-2.5-1.2b-thinking:free` / `nemotron-nano-9b-v2:free` | tiny reasoning, on-device | OpenRouter / NIM |
| **High-volume bulk** | Cerebras free tier (1M tok/day) | best daily budget, fastest | Cerebras (8K ctx cap) |
| **Speed** | Groq free tier (~315+ TPS) | ultra-low latency open-weight | Groq |

---

## OpenRouter `:free` models (best subset)

All free models share a hard limit: **20 req/min, 200 req/day, no credit card**. Good for low-volume lanes and failover; not for sustained swarm load. Source: [costgoat free list](https://costgoat.com/pricing/openrouter-free-models), [OpenRouter free collection](https://openrouter.ai/collections/free-models).

- **`qwen/qwen3-coder:free`** — 1M ctx. Strongest free coding model, agentic. → Coding lane. [link](https://openrouter.ai/qwen/qwen3-coder:free)
- **`deepseek/deepseek-v4-flash:free`** — 1M ctx, native reasoning, SOTA code-gen + reasoning. → Research/reasoning lane. [link](https://openrouter.ai/deepseek/deepseek-v4-flash:free)
- **`moonshotai/kimi-k2.6:free`** — 262K ctx, agentic + tool-use + vision, long-horizon agent workflows. → Agentic lane. [link](https://openrouter.ai/moonshotai/kimi-k2.6:free)
- **`openai/gpt-oss-120b:free`** — 131K ctx, coding/general OpenAI open-weight. Also hostable on Groq/Cerebras for speed. → Coding fallback. [link](https://openrouter.ai/openai/gpt-oss-120b:free)
- **`google/gemma-4-31b-it:free`** — 262K ctx, vision+tools. Mirrors local `gemma4` Ollama option. → Vision lane. [link](https://openrouter.ai/google/gemma-4-31b-it:free)
- **`nvidia/nemotron-3-super-120b-a12b:free`** — already in registry (verified-reachable), 1M ctx reasoning/long-context. → Bulk reasoning.
- **`nvidia/nemotron-nano-9b-v2:free`** — 128K, lightweight/fast. → Edge/triage. [link](https://openrouter.ai/nvidia/nemotron-nano-9b-v2:free)
- **`liquid/lfm-2.5-1.2b-thinking:free`** — 33K, 1.2B reasoning, on-device-sized. → Mobile-edge/glasses. [link](https://openrouter.ai/liquid/lfm-2.5-1.2b-thinking:free)
- Other free entries: `nemotron-3-nano-30b-a3b`, `qwen3-next-80b-a3b-instruct`, `glm-4.5-air`, `llama-3.3-70b-instruct`, `hermes-3-llama-3.1-405b`, `gpt-oss-20b`, `gemma-4-26b-a4b`.

---

## Other free inference providers (host open models yourself)

These let you run free open-weight models off OpenRouter's daily quota — better for production volume.

- **Cerebras free tier** — **1M tokens/day free**, no card. 30 req/min, 60–100K tok/min, ~2600 TPS (fastest). **Caveat: 8,192-token context cap on free tier** — kills long-context lanes. Best for high-volume short-context bulk. [rate limits](https://inference-docs.cerebras.ai/support/rate-limits)
- **Groq free tier** — 30 req/min, 6K tok/min, 14.4K req/day, ~315+ TPS. No card. Hosts gpt-oss, llama, qwen, gemma. Best for latency-sensitive lanes. [rate limits](https://console.groq.com/docs/rate-limits)
- **Google AI Studio free tier** — Gemini 2.5/3 Flash: ~15 RPM / 1M TPM / 1500 RPD, 1M ctx, multimodal. Pro: ~2 RPM. OAuth, no card. Note: Google cut free limits 50–80% in Dec 2025. Complements existing paid `gemini-2.5-flash` default. [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)
- **NVIDIA NIM** — free API key at build.nvidia.com for Nemotron + open models. Host Nemotron lanes without burning OpenRouter quota. [build.nvidia.com](https://build.nvidia.com)
- **HuggingFace Inference** — free tier only $0.10/month credit, no markup. Discovery/eval surface for trending models, not production volume. [state of OS HF spring 2026](https://huggingface.co/blog/huggingface/state-of-os-hf-spring-2026)
- **Together AI** — **no real free tier** in 2026 ($25 trial credit / $5 minimum). Skip for "free." [pricing](https://www.together.ai/pricing)

---

## Nous / Hermes Portal

- Portal bundles **300+ models** + tools (web search, scrape, image-gen, browser, code-exec, voice) under one subscription — **not free**, but rotates a free-for-subscribers list monthly (their Hermes series + select open-weights). Existing registry `step-3.7-flash` candidate fits here.
- Hermes 4 family (`Hermes-4-70B`, `Hermes-4-405B`, Llama-3.1-based) is reasoning/chat tuned — **weak at multi-step tool loops**, so not ideal as an agentic lane brain. Source: [Hermes Agent providers](https://hermes-agent.nousresearch.com/docs/integrations/providers), [Nous Portal models](https://portal.nousresearch.com/info).
- Free providers Hermes Agent itself supports: **Google Gemini (OAuth), Ollama (local), HuggingFace** — overlaps with the providers above.

---

## HuggingFace trending open models (2026, for self-host / eval)

Top open-weight models worth evaluating (not necessarily on a free hosted API yet): **GLM-4.7 Thinking** (93.5% LiveCodeBench, top open coder), **DeepSeek V4 Pro** (near Opus 4.7 / GPT-5.5), **Kimi K2.6** (agentic), **Qwen3** (best local all-rounder), **SmolLM3-3B** (best <8B). Sources: [HF best open-source LLMs 2026](https://huggingface.co/blog/daya-shankar/open-source-llms), [WhatLLM coding ranking](https://whatllm.org/best-llm-for-coding).

---

## Recommended wiring (free-first lane map)

1. **Coding lane** → `qwen3-coder:free` (OpenRouter) primary, `gpt-oss-120b` on Groq for speed, `gpt-5.3-codex` (paid sub) as quality escalation.
2. **Research/reasoning lane** → `deepseek-v4-flash:free` (OpenRouter), Nemotron-120b on NVIDIA NIM for off-quota bulk.
3. **Agentic/tool lane** → `kimi-k2.6:free`.
4. **Long-context/vision** → Gemini Flash free (Google AI Studio OAuth) — complements paid default.
5. **Mobile-edge** → `lfm-2.5-1.2b-thinking:free` or local Ollama `gemma4`.
6. **High-volume bulk (short ctx)** → Cerebras free 1M tok/day.

**Quota strategy:** spread lanes across OpenRouter + Cerebras + Groq + NIM + Google so no single 200/day or 1M/day cap throttles the swarm. Always-available floor stays Ollama local (`hermes3`, `gemma4`) per the capped-vendor reality.