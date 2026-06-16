---
title: 02-hosted-platforms
type: note
permalink: famtastic/03-research/archive/02-hosted-platforms
---

# Free & Cheap Hosted LLM Inference for an Agent Brain — Mid-2026
> Background research swarm, agent 2 of 3. Raw report — synthesized into SHAY-MODEL-LANDSCAPE.md once all three land.

**Use case:** Shay with an OpenAI-compatible provider fallback chain; goal = test any new frontier model the moment you hear about it, with one key, preferring flat-rate/free over metered.

Mental model:
- **Aggregators** (OpenRouter, GitHub Models, OpenCode) = one key, many models → the "test bench."
- **Direct providers** (Groq, Cerebras, SambaNova, Google AI Studio, Together, Fireworks, Mistral) = one key, that provider's catalog → speed/specific-model/standing-free, each a separate chain entry.

## Summary table

| Platform | Free-tier reality | Tool-calling? | Privacy / trains on you? | OpenAI-compatible? |
|---|---|---|---|---|
| **OpenRouter** | Standing free: `:free` models @ 20 RPM, 50/day (→1,000/day after one-time $10). Paid gateway = hundreds of models | ✅ unified | No training by default; opt-in logging grants commercial rights; ZDR routing available | ✅ |
| **GitHub Models** | Genuinely free w/ GitHub acct; ~10 RPM/50 RPD; **prototyping-only** | ✅ | ⚠️ **Trains by default (opt-out) on Free/Pro since Apr 24 2026**; not for production | ✅ |
| **Groq** | Standing free, no card; ~30 RPM / 14.4K req-day | ✅ | No sharing w/ providers; ZDR opt-in; else ~30-day retention | ✅ |
| **Cerebras** | Standing free, no card; **1M tokens/day**, 30 RPM; ~8K ctx cap | ✅ | Standard cloud terms; check data controls | ✅ |
| **SambaNova** | $5 credit (30-day) + standing free ~200K tokens/day, 10–30 RPM | ✅ | OpenAI-compatible; modest ZDR story | ✅ |
| **Google AI Studio** | Standing free; Flash ~15 RPM/1,500 RPD; limits cut 50–80% Dec 2025 | ✅ | ⚠️ **Free tier trains on prompts/responses**; paid/Vertex does not | ✅ |
| **Together AI** | ⚠️ **Trial credit only (~$25), then pay-per-token** — no standing free | ✅ | Strong: ZDR opt-in, SOC2/HIPAA | ✅ |
| **Fireworks AI** | ⚠️ **$1 trial credit, then pay-per-token** — no free tier | ✅ | SOC2/HIPAA/GDPR; ZDR available | ✅ |
| **Mistral La Plateforme** | Standing free Experiment: ~1B tokens/mo but **2 RPM** | ✅ | ⚠️ No-train guarantee is paid-only | ✅ |
| **OpenCode Go** | $5→$10/mo subscription; $/usage caps; ~9 open coding models | ✅ | Curated open models | ✅ (`/connect`) |

**Adversarial flags:** Together AI & Fireworks "free" = trial credits, not free tiers. Google AI Studio & GitHub Models free tiers train on your data by default — disqualifying for sensitive Shay context. Mistral's no-train guarantee is paid-only and its 2 RPM throttle kills interactive loops. Cerebras/Groq/SambaNova/OpenRouter `:free` are the genuinely standing, no-card free tiers. Together starter-credit amount disputed ($25–$50 vs $5-min) — confirm at signup.

## Best universal test bench → OpenRouter
One OpenAI-compatible key/base URL reaching hundreds of frontier+open models, day-of-release coverage, standing `:free` tier, no training by default, unified tool-calling, seamless escalation to paid frontier from the same prepaid balance. GitHub Models is runner-up but narrower + prototyping-only + now trains by default. Behind OpenRouter, wire Cerebras (biggest free token budget) and Groq (fastest) as direct free fallbacks.

## OpenCode Go vs OpenRouter
Go = curated subscription open-model lane (GLM, Kimi, MiMo, Qwen, MiniMax, DeepSeek), flat-ish cost ($12/5h, $30/wk, $60/mo equiv), good for sustained open-model agent work — but NOT a frontier bench (no GPT/Claude/Gemini, no new-model-day-of). Keep Go as the cheap workhorse; OpenRouter as the test bench. Complementary.

## Bottom line
Make OpenRouter the primary universal test bench (one key, every frontier release, real free tier, $10-once unlock 20×'s the free daily quota); keep OpenCode Go as the cheap flat-rate open-model workhorse; add Cerebras (1M free tokens/day) + Groq (fastest free) as genuinely-free OpenAI-compatible fallbacks; treat Together/Fireworks as paid; Mistral free as too rate-limited for live loops; and keep Google AI Studio + GitHub Models free tiers off-limits for private Shay data (both train on free-tier inputs by default).

### Key sources
- OpenRouter: [limits](https://openrouter.ai/docs/api/reference/limits) · [free-tier](https://klymentiev.com/blog/openrouter-free-tier) · [tool calling](https://openrouter.ai/docs/guides/features/tool-calling) · [data/ZDR](https://openrouter.ai/docs/guides/privacy/data-collection)
- GitHub Models: [docs](https://docs.github.com/github-models/prototyping-with-ai-models) · [training-policy change](https://github.blog/changelog/2026-03-25-updates-to-our-privacy-statement-and-terms-of-service-how-we-use-your-data/)
- Groq: [data](https://console.groq.com/docs/your-data) · [OpenAI compat](https://console.groq.com/docs/openai)
- Cerebras: [rate limits](https://inference-docs.cerebras.ai/support/rate-limits)
- SambaNova: [plans](https://cloud.sambanova.ai/plans) · [function calling](https://docs.sambanova.ai/cloud/docs/capabilities/function-calling)
- Google AI Studio: [rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) · [pricing/data-use](https://ai.google.dev/gemini-api/docs/pricing)
- Mistral: [tiers](https://docs.mistral.ai/deployment/ai-studio/tier)
- OpenCode Go: [docs](https://opencode.ai/docs/go/)