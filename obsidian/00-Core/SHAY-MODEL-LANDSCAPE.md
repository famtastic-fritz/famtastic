---
title: SHAY-MODEL-LANDSCAPE
type: note
permalink: famtastic/00-famtastic-core/shay-model-landscape
---

# Shay Model Landscape — free/open/frontier brains & how to add them (2026-06-04)

> Synthesis of a 3-agent background research swarm (raw reports in
> `obsidian/05-Captures/research/2026-06-04-model-landscape/`). Companion to
> `SHAY-BRAIN-ARCHITECTURE.md` (which holds the live chain). This doc answers:
> what's genuinely free, what to run where, and how to add any new frontier
> model as it drops. Adversarially verified — "free" is split into its real meanings.

## The lanes (mental model)

| Lane | What | Cost | Use for |
|---|---|---|---|
| **Brain** | Claude Sonnet/Opus (Max, Claude Code mode) | flat (Max) | thinking, planning, orchestration |
| **Backup brains** | Gemini (API key) · Copilot Sonnet · Codex gpt-5.4 (sub) | flat/cheap | fallback when Claude caps/down |
| **Frontier test bench** | **OpenRouter** (one key → hundreds of models) | free `:free` + cheap metered | "try the new model I just heard about" |
| **Cheap workhorse** | OpenCode Go (curated open coding models) | $10/mo flat-ish | sustained simple/bulk open-model work |
| **Free hosted burst** | **Groq** (fastest) · **Cerebras** (1M tok/day) | $0 standing | free bulk when local is too slow |
| **Local $0 floor** | **Ollama** (qwen3 / hermes3 / gemma4) | $0, private, uncapped | private/offline/all-night bulk; last-resort catch |

## Verified current chain (2026-06-04)
Primary `claude-sonnet-4-6` (anthropic) → 1. `gemini-2.5-pro` → 2. `claude-sonnet-4.6` (copilot) → 3. `gemini-3.1-pro-preview` → 4. `gpt-5.4` (openai-codex). Claude = driver; Gemini/Copilot/Codex = bench. ✅

## How to add ANY new frontier model (the capability Fritz wanted)
1. **Wire OpenRouter once** as a Shay provider (one API key, OpenAI-compatible). Then each new model =
   `shay fallback add` → openrouter → pick model, or `shay model` to test it as brain. New releases hit
   OpenRouter's catalog within days. This is the universal test bench.
2. **Open-weights models** (Llama 4, Qwen3, DeepSeek, Mistral, Hermes) → add behind ONE OpenAI-compatible
   endpoint (Ollama local or OpenRouter hosted) so each is a one-line base-URL/model-name change.
3. **Closed frontier** (Opus, GPT-5.x, Gemini 3.x, Grok) → official CLI/SDK on subscription or API key.

## Recommended adds (priority order)
1. **OpenRouter** — the test bench. One-time **$10 credit** lifts free `:free` quota from 50→1,000 req/day and unlocks paid frontier from the same balance. No training by default (keep logging off).
2. **Ollama floor upgrade** — your installed set is outdated. Pull:
   ```bash
   ollama pull qwen3:14b    # best benchmarked free tool-caller (BRAIN-grade local)
   ollama pull gemma4       # Google edge-agentic, native function calling
   ollama pull qwen3:30b    # if 32–64GB RAM: strongest local brain, 256K ctx
   ```
   Then wire as bottom fallback: `shay fallback add` → Ollama → `http://localhost:11434/v1` → `qwen3:14b`.
3. **Groq** (free, fastest) + **Cerebras** (free, 1M tok/day) — genuinely-free OpenAI-compatible hosted fallbacks behind OpenRouter. No card.

## Your 8 local models — cleanup verdict
- **KEEP:** `hermes3:8b` (best local brain, Nous-aligned), `phi4-mini` (cheap worker).
- **UPGRADE:** `qwen2.5:1.5b` → `qwen3:4b`.
- **DROP** (outdated, none reliably tool-call): `nous-hermes2`, `wizardlm-uncensored`, `dolphin-llama3`, `dolphin-mistral`, `dolphin-phi`.

## Hard truths / landmines (adversarial flags)
- **"Run Hermes 4 free" is FALSE.** Hermes 4 405B on OpenRouter is **paid $1/$3 per M**. Only **Hermes 3 405B `:free`** is free, capped **50 req/day**. Truly-free Hermes = **local via Ollama** (`hermes3`) only.
- **Gemini: API key only, NEVER the CLI OAuth.** The Gemini CLI free-login-as-agent path is an explicit ToS violation (Google's own repo), has banned real accounts, and **shuts down June 18, 2026**. The Nous Hermes Gemini guide uses an **API key** (`GEMINI_API_KEY`) — the sanctioned path Shay already uses. Nous even notes the free tier is too small for agents → use a billing-enabled key.
- **Claude Code billing trap:** if `ANTHROPIC_API_KEY` is set it **overrides** the Max subscription and silently bills metered API (people ate >$1,800). **`echo $ANTHROPIC_API_KEY` must be empty.**
- **Privacy:** **Google AI Studio free** and **GitHub Models free** both **train on your inputs by default** (GitHub since Apr 24 2026). Keep sensitive Shay traffic off them. Groq/Cerebras/OpenRouter (opt-out on) are clean.
- **Codex via ChatGPT sub = legit** (official CLI, like Claude Code). Keep Shay invoking the real `codex` binary; don't scrape the token.

## Frontier watchlist (add as they mature)
Anthropic **Opus 4.7** (have via Max) · Anthropic **"Mythos"** preview (next top Claude) · OpenAI **GPT-5.5** (new Codex default) · Google **Gemini 3.5 Flash** (cheap/fast/1M ctx — ideal high-volume fallback) · Meta **Llama 4** (free weights) · **Qwen3 235B** (Apache-2.0, top BFCL) · **DeepSeek V3.2** (MIT, frontier, free weights — note "V4 Pro" rumors are unverified) · Mistral **Large 3** (Apache-2.0) · xAI **Grok 4.3** · Nous **Hermes 4 405B** (free weights).

> Raw agent reports: `05-Captures/research/2026-06-04-model-landscape/{01-open-models-as-brains,02-hosted-platforms,03-cli-as-brain-and-watchlist}.md`