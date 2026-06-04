# Free Open-Weight LLMs as Agentic Brains — Mid-2026
> Background research swarm, agent 1 of 3. Raw report — synthesized into SHAY-MODEL-LANDSCAPE.md.

**Source-quality warning:** mid-2026 model-name searches are polluted by SEO/affiliate sites inventing ultra-specific versions ("Qwen3.6-35B", "DeepSeek V4 Pro 1.6T", "Hermes 4.3 36B perf"). Primary-sourced claims (model cards, HF repos, Ollama library, vendor docs) are load-bearing; affiliate-only claims are flagged unverified.

## Fact-check: remoteopenclaw "Best Free Models for Hermes"
Directionally true map, but conflates "free" in 4 different senses and its specific Hermes promise is wrong:
- ✅ **Ollama local = the only truly unlimited, no-strings free option** (no rate limit, no key, no data leaves machine).
- ⚠️ **Groq free** real (30 RPM, 14.4K req/day, no card, doesn't train on free-tier) — but Groq doesn't host actual Hermes weights; "free Hermes on Groq" = a Hermes-style agent on a non-Hermes model.
- ❌ **"Free Hermes 4 via OpenRouter" is FALSE** — Hermes 4 405B is **paid $1/$3 per M**. Only **Hermes 3 405B `:free`** is free, capped at **50 req/day** (→1,000/day after one-time $10).
- 🚩 **Google AI Studio free trains on your data** (humans may read it); only paid tier has the no-train commitment.
- OpenRouter free models: not logged/trained by default IF you keep training opt-out off, but free router can route to training providers — flip the privacy switch.

**Truly-free-no-catch = Ollama local only.** Clean-but-rate-limited = Groq. Rate-limited-trains-unless-opt-out = OpenRouter. Trains-on-you = Google AI Studio.

## Ranked free agentic brains (mid-2026)
| Rank | Model | Agentic quality | Best FREE way to run | Caveat |
|---|---|---|---|---|
| 1 | **Qwen3 / 3.5** | Top — leads BFCL v4 (~72–73%) | Local `qwen3:14b`/`30b`; free on Groq/OpenRouter | newest tag names secondary-sourced — verify |
| 2 | **DeepSeek V3.2** | Frontier — ~72–74% SWE-bench Verified | Free hosted only (OpenRouter R1 `:free`, Groq distills) | 685B not laptop-local; "V4 Pro" = unconfirmed hype |
| 3 | **Nous Hermes 4** | Strong, tool-native; Shay-aligned | Local Hermes-4 GGUF; **Hermes 3** is the free-hosted one | Hermes 4 is **paid** on OpenRouter; only Hermes 3 free |
| 4 | **Gemma 4** | Strong — built for edge agentic, native FC/JSON | Local `ollama pull gemma4` (E4B ~6GB) | AI Studio free tier trains on you |
| 5 | **Llama 4 Scout** | Good generalist, huge context | **Free on Groq** (14.4K/day, clean) | tool benchmarks thin; MoE too big to run local |
| 6 | **Mistral Small 3.x / Medium 3.5** | Good, reliable native FC | Mistral Small via Ollama; Mixtral free on Groq | flagship figures secondary-sourced |

## Your 8 installed models — keep / upgrade / drop
| Installed | Verdict | Why |
|---|---|---|
| **hermes3 (8B)** | **KEEP** (best current local brain) | real tool-calling, 128K ctx, Nous family = Shay-aligned |
| **phi4-mini (3.8B)** | **KEEP as worker** | modern, fast, decent — good for classify/route/summarize |
| **qwen2.5 (1.5B)** | **UPGRADE → qwen3:1.7b/4b** | Qwen3 brings better tool-calling at same size |
| **nous-hermes2 (11B)** | **DROP** | pre-Hermes-3, lacks mature tool grammar; superseded by hermes3 |
| **wizardlm-uncensored (13B)** | **DROP** | Llama-1/2 era, no function-calling, weak by 2026 |
| **dolphin-llama3 (8B)** | **DROP / worker-only** | uncensored finetune, unreliable structured tool calls |
| **dolphin-mistral (7B)** | **DROP / worker-only** | same; superseded by Mistral Small 3.x / qwen3:8b |
| **dolphin-phi (3B)** | **DROP** | tiny, old, no agentic value |

**Net:** keep hermes3:8b (brain) + phi4-mini (worker); drop the dolphin/wizard/nous-hermes2 finetunes (none reliably tool-call); swap qwen2.5 → qwen3.

### Recommended new pulls (upgraded free floor)
```bash
ollama pull qwen3:8b      # ~5GB  — best benchmarked free tool-caller at small size (BRAIN candidate)
ollama pull qwen3:14b     # ~9GB  — stronger BRAIN if headroom
ollama pull gemma4        # E4B ~6GB — Google edge-agentic, native function calling
ollama pull qwen3:30b     # ~19GB MoE, 256K ctx — strongest local brain if 32–64GB RAM
# Hermes 4 local: confirm the tag first (likely community GGUF, not one-word `ollama pull hermes4`)
```

## Bottom line
Truly-free local brain: pull **qwen3:14b** + keep **hermes3:8b** (Nous-aligned); drop the 4 outdated finetunes. Free hosted floor above local ceiling: **Groq** (Llama 4 Scout / Qwen3 32B, 14.4K/day, clean) + **Hermes 3 405B `:free`** on OpenRouter for in-family overflow (50/day). The remoteopenclaw page is wrong that Hermes **4** is free (it's paid; only Hermes 3 is). Never route real data through Google AI Studio free (trains on you). Keep Claude Max as the brain; these are workers/fallback.

### Key sources
- [HF NousResearch/Hermes-4-405B](https://huggingface.co/NousResearch/Hermes-4-405B) · [Ollama hermes3](https://ollama.com/library/hermes3) · [Ollama qwen3](https://ollama.com/library/qwen3)
- [OpenRouter Hermes 4 405B (paid)](https://openrouter.ai/nousresearch/hermes-4-405b) · [Hermes 3 405B :free](https://openrouter.ai/nousresearch/hermes-3-llama-3.1-405b:free)
- [BFCL leaderboard](https://gorilla.cs.berkeley.edu/leaderboard.html) · [HF DeepSeek-V3.2](https://huggingface.co/deepseek-ai/DeepSeek-V3.2) · [Gemma 4 model card](https://ai.google.dev/gemma/docs/core/model_card_4)
- [Groq rate limits](https://console.groq.com/docs/rate-limits) · [Google Gemini API billing/data-use](https://ai.google.dev/gemini-api/docs/billing)
