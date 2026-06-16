---
title: shay-aux-models-and-empty-defaults-2026-06-08
type: note
permalink: shay-memory/operational/shay-aux-models-and-empty-defaults-2026-06-08
---

# Shay auxiliary models + empty/`auto` config defaults (2026-06-08)

> For Shay to read. Context: while fixing the long-answer truncation bug we found
> a config mismatch class — `auxiliary.*` tasks left at `provider: auto` + empty
> `model` can resolve to one vendor's endpoint while passing another vendor's
> default model id, producing 404s. This note records the web_extract model
> decision, the full assessment of the other empty-default entries, and what's
> applied vs pending your review.

## Root pattern (the thing to kill at the source)
`provider: auto` + empty `model: ''` → "auto" picks an endpoint (often Gemini, since `GEMINI_API_KEY` is set) but passes the **global default model id** `glm-5.1`, which isn't a Gemini model → `HTTP 404 models/glm-5.1 is not found`. This hit `web_extract` 43 times. Maps to rewrite **REQ-05**: validate model-id-vs-provider at config load; prefer explicit provider+model over `auto`.

## Decision: `auxiliary.web_extract` → `gemma4:latest` (APPLIED)
web_extract summarizes fetched web pages: needs faithful, fast summarization with enough context to hold a long page — not a reasoner.

| Model | Params | Context | Verdict for web extraction |
|---|---|---|---|
| **gemma4:latest** ✅ CHOSEN | 8B | **128k** | Big context for long pages, clean faithful summarizer, not a reasoning model → fast, no `<think>` pollution. |
| qwen3:14b | 14.8B | 40k | More capable, but 40k context risks truncating long pages; hybrid reasoner (slower). Alt if raw capability matters more than page length. |
| deepseek-r1:latest | 8.2B | 128k | Reasoning model — overthinks, emits think-traces. Wrong tool for extraction. |
| nous-hermes2:latest | 11B | 4k | Context far too small for web pages. Out. |
| phi4-mini:latest | 3.8B | 128k | Too small to extract reliably. Out. |
| hermes3:latest | 8B | 128k | Fine, but explicitly distrusted by Fritz — replaced. |

Applied config (`~/.shay/config.yaml` → `auxiliary.web_extract`):
```yaml
web_extract:
  provider: ollama
  model: gemma4:latest
  base_url: http://localhost:11434/v1
  api_key: ollama
  timeout: 360
  extra_body: {}
  context_length: 131072
```
Local, zero-cost, no endpoint/key mismatch → the 404 class is gone for web_extract.

## Installed Ollama models (reference)
`deepseek-r1:latest` (8.2B/128k, reasoning), `gemma4:latest` (8B/128k), `qwen3:14b` (14.8B/40k, hybrid reasoning), `hermes3:latest` (8B/128k), `nous-hermes2:latest` (11B/4k), `phi4-mini:latest` (3.8B/128k), `qwen2.5:1.5b`, plus dolphin-*/wizardlm-uncensored variants. **None are vision-capable** (all text-only).

## Assessment: other entries with empty/`auto` defaults (PENDING your review — NOT changed)
Full structural scan of `config.yaml` found exactly four:

| Entry | Does | Current | Risk | Recommendation |
|---|---|---|---|---|
| **auxiliary.vision** | describe/analyze images | `auto` / empty | Same 404 class. Needs a **vision** model — none installed locally are multimodal. | Decision needed: pin to a real Gemini **vision** model (`gemini-2.5-flash`, **cloud → privacy flag**) OR install a local vision model (llava / qwen2.5-vl) to stay local. |
| **auxiliary.kanban_decomposer** | break a goal into kanban tasks | `auto` / empty | Same 404 class | Pin to local `qwen3:14b` (strong at structured decomposition). Safe, zero-cost. |
| **auxiliary.profile_describer** | generate profile/description text | `auto` / empty | Same 404 class | Pin to local `qwen3:14b` or `gemma4`. Safe, zero-cost. |
| **delegation** | model for delegated sub-agents | empty provider/model | **NOT a 404 risk** — empty = inherit the main brain (glm-5.1). Intentional. | Optional: pin a cheaper/faster model for sub-agents, or leave inheriting main for quality. Not a bug. |

**Verdict:** `kanban_decomposer` + `profile_describer` are safe no-brainer local pins. `vision` is the one real decision (local vision model vs cloud Gemini + privacy). `delegation` is fine as-is.

## Related fixes this session (already applied)
- **Long-answer truncation:** `SHAY_STREAM_READ_TIMEOUT=900` on the gateway plist (confirmed it governs GLM — no per-provider `request_timeout_seconds` override exists for glm). Tolerates up to a 15-min inter-token gap; read timeout is the *gap between tokens*, not total task length, so long tasks complete as long as tokens keep flowing. Durable mechanism = REQ-14 (checkpointed resume-on-same-brain; no model fallback because-long).
- **Long-context:** `memory.user_char_limit` 2500 → 4000 (was overflowing). Context engine already `compressor` + local 128k summarizer + `auto_prune`.
- Bugs logged: `.wolf/buglog.json` bug-274 (timeout), bug-275 (web_extract 404).

## Open decisions for Fritz
1. `vision`: local vision model vs cloud Gemini (privacy)?
2. Pin `kanban_decomposer` + `profile_describer` to local `qwen3:14b`? (recommended)
## RESOLVED 2026-06-08 (all auxiliary empty/auto defaults closed)
Fritz directive: vision must be LOCAL (Ollama) — no Google unless not tied to his API accounts. All pinned local:
- `vision` → `llama3.2-vision:latest` (local; pulled ~7.8GB). No Google.
- `kanban_decomposer` → `qwen3:14b` (local)
- `profile_describer` → `qwen3:14b` (local)
- `web_extract` → `gemma4:latest` (local) — done earlier
- `delegation` → left empty intentionally (inherits main brain glm-5.1; not a 404 risk)
Scan confirms zero remaining `provider: auto` / empty-model auxiliary entries. The 404 class is closed.
