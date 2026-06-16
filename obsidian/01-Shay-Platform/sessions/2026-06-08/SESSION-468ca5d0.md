---
session_id: 468ca5d0-278c-4348-8bf4-6e6200390ab9
short_id: 468ca5d0
branch: main
date: 2026-06-08
start_sha: main
started: 2026-06-08 UTC
agent: claude-code (opus-4-8-1m)
status: active
permalink: famtastic/01-shay-platform/sessions/2026-06-08/session-468ca5d0
---

# Session 468ca5d0 — 2026-06-08

> Manually created — this Claude Code session launched from `~/` so the
> SessionStart hook did not auto-scaffold a note. Tying work to the session id
> per the Brain Sync Contract.

## What this session did
Got Fritz off his maxed-out z.ai (GLM) subscription and onto local Ollama brains in Shay. Diagnosed and fixed three things: (1) **bug-276** — Ollama brains failed with `unknown provider 'ollama'` because `ollama` was referenced in `model_aliases`/`fallback_providers` but never defined in the top-level `providers:` dict of `~/.shay/config.yaml`; added the entry. (2) **bug-277** — strict OpenAI-compat backends (Cerebras/Groq) 400 on the `reasoning_content` field that thinking providers (GLM/DeepSeek/Kimi) bake into history; added `AIAgent._provider_rejects_reasoning_content()` in `run_agent.py` and strip the field for the strict set at both api-message build sites (detects Cerebras even via the `custom` path by base_url host). (3) Switched Shay's default brain to `ollama qwen3:14b`, rebuilt the fallback chain to `ollama hermes3 → ollama qwen3 → glm` (removed groq/cerebras — Fritz has no keys for them), and removed the exposed `OPENAI_API_KEY` from `~/.zshrc` (it had been silently authenticating the Cerebras `custom` path).

Verification: Ollama confirmed running with all aliased models installed; resolver + end-to-end generation through Shay's own client succeeded for the default brain and fallbacks; 83 reasoning/custom-provider unit tests pass.

Deferred: Fritz should **rotate** the exposed OpenAI key at platform.openai.com (deletion ≠ safety). `PERPLEXITY_API_KEY` still sits plaintext in `~/.zshrc`. The `run_agent.py` change is uncommitted in the shay-shay repo.

## Update — Ollama context-ceiling fix (bug-278)
After switching the brain to local Ollama, every real prompt 400'd with `exceed_context_size_error` (n_ctx 4096). Root cause: Ollama.app loads llama-server at `-c 4096` regardless of model max, and Shay's `query_ollama_num_ctx` reports the GGUF max (131k) not the runtime window — so Shay never compressed below 4k and gave up after 3 attempts. (Also why qwen3 "felt too small".) Fixed by enabling q8_0 KV-cache quant + flash-attn on the Ollama server, creating `hermes3-32k`/`deepseek-r1-32k`/`qwen3-32k` variants with `num_ctx 32768` baked in (Modelfile param fixes both Ollama load AND Shay's detection), and pointing the brain+fallbacks at them with `model.context_length: 32768`. Verified a 15k-token prompt now succeeds. Brain is now `hermes3-32k`; chain `deepseek-r1-32k → qwen3-32k → glm-5.1`. 16GB RAM caps this at ~32k (running ~85% mem). KV-quant env is session-scoped (resets on reboot) — persistence LaunchAgent proposed but blocked/not installed (needs Fritz approval); num_ctx variants persist.

## Promoted to
- `.wolf/buglog.json` — bug-276 (ollama provider registration), bug-277 (reasoning_content strip), bug-278 (Ollama 4096 context ceiling)
- `.wolf/cerebrum.md` — do-not-repeat (2026-06-08): providers: registration mandatory + reasoning_content provider polarity + Ollama real-context-is-4096 fix pattern

## Timeline
- 2026-06-08 — session started on `main`; Ollama diagnosis → config + run_agent.py fixes → brain sync

## Git delta
_(uncommitted: ~/famtastic/shay-shay/run_agent.py; ~/.shay/config.yaml and ~/.zshrc are outside the repo)_