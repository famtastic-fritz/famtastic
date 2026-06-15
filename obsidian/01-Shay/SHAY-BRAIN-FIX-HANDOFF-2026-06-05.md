---
title: SHAY-BRAIN-FIX-HANDOFF-2026-06-05
type: note
permalink: famtastic/01-shay/shay-brain-fix-handoff-2026-06-05
---

# Shay Brain Fix — one-pass handoff (2026-06-05)

> For the local Claude Code session on the Mac. shay-shay = gitignored repo at ~/famtastic/shay-shay
> (own remote). config = ~/.shay/config.yaml. Parts 1+2 now (free); Part 3 when GLM key provided.

## Root cause
Shay's default brain is a FREE tier (Gemini free) → HTTP 429 RESOURCE_EXHAUSTED → cascades through other
strained free tiers (gemini-3.1, Cerebras) → and the /model picker crashes so Fritz can't take control.
Her whole chain is free + local + ONE unused flat lane (Codex). Fix = default to a FLAT lane + fix picker
+ add a real flat brain (GLM $18).

## Part 1 — stabilize: default to Codex
`~/.shay/config.yaml` model block → default gpt-5.4 / provider openai-codex /
base_url https://chatgpt.com/backend-api/codex → restart gateway. Verify no 429.

## Part 2 — fix /model picker thoroughly
Two known missing symbols: model_switch.py:720 `resolve_runtime_provider(... user_providers=...)` (unexpected
kwarg) and cli.py:6826 `import resolve_display_context_length` (missing). Grep ALL model_switch imports/calls
in cli.py, verify each exists in model_switch.py, reconcile ALL in one pass (define missing / fix call sites /
align signatures). Test switching 4+ models without crash. Commit to shay-shay repo.

## Part 3 — GLM flat primary (when GLM_API_KEY provided)
GLM Coding Plan $18/mo at z.ai/subscribe. Provider GLM, OpenAI-compat base_url https://api.z.ai/api/openai/v1
(or Anthropic-compat https://api.z.ai/api/anthropic), model glm-5.1/glm-4.7 (confirm id). Set primary.
Target chain: GLM (flat) → Codex (flat) → Gemini free → Groq/Cerebras free → Ollama local. OpenRouter bottom,
:free only. Verify `shay fallback list` shows GLM primary @ api.z.ai, no openrouter duplicates of native models.