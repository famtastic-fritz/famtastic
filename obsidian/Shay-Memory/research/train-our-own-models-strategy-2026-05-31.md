---
title: train-our-own-models-strategy-2026-05-31
type: note
permalink: shay-memory/research/train-our-own-models-strategy-2026-05-31
---

# Train Our Own Models — Strategy

**Date:** 2026-05-31
**Status:** Research / strategy (read-only investigation, no code changes)
**Author:** Shay research pass
**Scope:** Evaluate Second-Me and LLMs-from-scratch as references; figure out whether and how "train our own models" fits the Shay/FAMtastic + AI-OS stack, with an honest compute reality check.

---

## TL;DR

- **Training our own *foundation* model is not worth doing.** From-scratch (the Raschka path) is a learning exercise, not a product path. We will never out-train Qwen/Llama/Claude with a Mac mini.
- **The realistic, high-value play is a *personal Shay model* via LoRA fine-tuning of a small open base model (Qwen2.5-3B/7B-Instruct) on our consolidated memory corpus.** This is exactly what Second-Me does, and it runs natively on Apple Silicon via MLX in minutes.
- **Second-Me is the right architectural reference** (its L0→L1→L2 memory-to-model pipeline maps cleanly onto our existing memory layer). We should borrow its *pipeline shape*, not necessarily run its full Docker stack.
- **LLMs-from-scratch is the right learning reference** — read it to understand tokenization, attention, LoRA, and the training loop so we can debug and own the fine-tuning pipeline. It is not production infrastructure.
- **Phased recommendation:** (Phase 0) read both, stand up MLX-LM on the Mac mini. (Phase 1) build a memory→JSONL exporter and ship a first LoRA Shay model. (Phase 2) wire it as a local fallback/router behind the existing cloud models. Foundation pretraining: never.

---

## 1. What Second-Me actually does + Apple Silicon feasibility

**Source:** https://github.com/mindverse/Second-Me · paper "AI-native Memory 2.0: Second Me" https://arxiv.org/abs/2503.08102 · https://deepwiki.com/mindverse/Second-Me

Second-Me is an open-source "train your AI self" platform. You feed it your documents/notes; it produces a **Localized Personal Model (LPM)** — a small fine-tuned LLM that talks and reasons in your voice and context, runs locally, and is owned by you.

**The core idea is a memory→model pipeline with three layers** (Hierarchical Memory Modeling, HMM):

- **L0 — Raw Data:** document ingestion, chunking, embedding generation. (This is plain RAG-style storage.)
- **L1 — Natural-Language Memory:** the model writes a structured profile *about you* in natural language — a short bio, a list of significant sentences/phrases, preference tags, entities, topics. Human-readable, inspectable.
- **L2 — AI-Native Memory:** the personal knowledge is baked **into model parameters** via fine-tuning. Each LPM *is* a neural network. This is the layer that distinguishes Second-Me from a normal RAG bot — the personality lives in the weights, not just the retrieval index.

**How it trains:**
- Base model: **Qwen2.5-7B-Instruct** (and smaller Qwen2.5 sizes for less RAM).
- Method: **PEFT / LoRA** (parameter-efficient fine-tuning) — it does *not* retrain the whole model.
- A fully automated data-synthesis pipeline: data mining (entities/topics) → memory-data synthesis (self-location reinforcement, context-enhancement and context-critique pairs) → a five-stage quality filter → produces the instruction/JSONL training set automatically from your raw docs.
- Frameworks: **MLX** for training/inference on Apple Silicon, **llama.cpp** for inference, Microsoft **GraphRAG** for data synthesis. Python kernel (`lpm_kernel`), React frontend, Docker for non-Mac.
- The MLX LoRA training path lives at `lpm_kernel/L2/mlx_training`; LoRA params are configured via YAML.

**Apple Silicon / Mac mini feasibility — yes, comfortably.** Second-Me publishes RAM-tiered model sizing:

| RAM | Personal model size it can train/run |
|-----|--------------------------------------|
| 8 GB | ~0.8B–1.0B params |
| 16 GB | ~1.5B–2.0B params |
| 32 GB | ~2.8B–3.5B params |

So a Mac mini with **16 GB → a ~1.5–2B Shay model**; **32 GB → a ~3B Shay model**; **64 GB → comfortably a 7B Shay model** (the size Second-Me itself targets). This is the single most important feasibility fact: a personal LoRA model is well within Mac-mini reach. **Note the actual RAM of our Mac mini before committing to a base size** — it sets the ceiling.

---

## 2. Realistic paths to a "personal Shay model"

Three options, ranked by realism:

### A. LoRA fine-tune a small open base model on our memory corpus — **DO THIS**
Take Qwen2.5-3B/7B-Instruct (or Llama-3.x-8B), generate an instruction JSONL from the consolidated memory (Obsidian vault, 340 sessions / 15.8k messages, basic-memory `memory.db`), and run `mlx_lm.lora --train`. Adds a small adapter (tens of MB) that encodes Fritz/Shay voice, preferences, project context, and the FAMtastic do-not-repeat rules.
- **Compute:** minutes to ~30 min per run on Apple Silicon (a 3B LoRA finishes in ~3–4 min on an M2 Pro/16 GB at ~5 GB peak; see sources). Re-trainable nightly/weekly as memory grows.
- **Reversible, cheap, inspectable.** The base model stays intact; we just swap adapters.

### B. Full fine-tune (all weights) — **No.**
Even for a 3B model, full fine-tuning needs far more memory and time, risks catastrophic forgetting, and buys almost nothing over LoRA for a personalization task. Skip.

### C. Train from scratch (Raschka path) — **No, except as learning.**
Building a GPT from scratch produces a tiny, undertrained model that is worse than anything we can download. Its only value is education: do it on paper/laptop to *understand* the machinery, then apply that understanding to the LoRA pipeline in (A).

**Recommended path: A**, with the **Second-Me L0→L1→L2 pipeline as the blueprint** and **LLMs-from-scratch as the textbook** for whoever owns the trainer.

---

## 3. Hardware / compute reality check

**Source:** https://towardsdatascience.com/lora-fine-tuning-on-your-apple-silicon-macbook-432c7dab614a/ · https://github.com/ARahim3/mlx-tune · https://markaicode.com/run-fine-tune-llms-mac-mlx-lm/

- **Mac mini (Apple Silicon) is genuinely sufficient for LoRA fine-tuning of ≤7B models.** This is not aspirational — MLX-LM does it in minutes. Unified memory is the constraint, not raw FLOPs. 3B LoRA ≈ minutes; 7B LoRA ≈ tens of minutes to low hours per run depending on dataset/iters.
- **What the Mac mini cannot do:** pretrain a foundation model, fine-tune 70B+ models, or do large full-parameter training. Those need cloud GPUs (A100/H100). We have no reason to go there.
- **Cloud is a fallback we likely don't need.** A one-off cloud GPU run (rented H100 hours) could fine-tune a 70B if we ever wanted a heavyweight personal model — but the value-per-dollar is poor versus a 7B LoRA. Park it.
- **The free/open models we already have do most of the work.** We already run open models (Gemini Flash + Ollama are the always-available tier per project memory). A fine-tuned local Shay adapter *complements* those: it's the always-on, private, on-brand layer that doesn't burn the weekly Claude/Codex caps. **This is the real strategic prize** — a local model that never rate-limits and always sounds like us, sitting under the cloud brains.

**Reality-check verdict:** The Mac mini is the *right* host for personal fine-tuning, the *wrong* host for foundation training. Match the ambition to the hardware.

---

## 4. How training fits the broader AI-OS plan

The AI-OS discovery report (`ai-os-discovery-report.md`) already names the memory layer as **Tencent L0–L3 identity memory**, plus always-on memory agents and vector stores. Training slots in as follows:

- **Memory → training data.** The consolidated memory (Obsidian Shay-Memory vault + basic-memory `memory.db`, 88 MB, 340 sessions / 15.8k messages) is exactly the corpus Second-Me's pipeline expects. The AI-OS memory layer's L0 (raw) and L1 (natural-language summaries) become the *source*; the new **L2 (parameters)** is the fine-tuned Shay adapter. Our memory layer and Second-Me's HMM layers are the same shape — we already have L0/L1; training adds L2.
- **The Mac mini is the host.** It is the always-on home server that owns: (a) the memory DB, (b) the nightly memory→JSONL export, (c) the MLX LoRA trainer, (d) local inference of the resulting Shay model. One box, fully private, no per-token cost.
- **Which existing models to fine-tune.** Start with **Qwen2.5-3B-Instruct** (fits comfortably, fast iteration) and graduate to **Qwen2.5-7B-Instruct** (Second-Me's own target) once the pipeline is proven and RAM allows. Avoid exotic bases — Qwen + MLX is the most road-tested Apple-Silicon combo.
- **Continuous loop.** Because LoRA runs are cheap, retraining can ride the same cadence as the existing intelligence loop / memory consolidation — a scheduled job on the Mac mini re-exports memory and re-bakes the adapter, so the Shay model drifts toward current reality instead of going stale.

---

## 5. Phased, honest recommendation

**Phase 0 — Learn + stand up the bench (low effort, do now).**
- Read LLMs-from-scratch Ch 2–7 + Appendix E (LoRA) to own the fundamentals. https://github.com/rasbt/LLMs-from-scratch
- Install `mlx-lm` on the Mac mini; confirm its actual RAM (sets base-model ceiling).
- Do a throwaway LoRA run on a public sample dataset to prove the toolchain end-to-end (~15 min). No memory data yet.

**Phase 1 — First personal Shay model (medium effort, high value).**
- Build a **memory→instruction-JSONL exporter**: pull from the Obsidian vault + basic-memory `memory.db`, shape into instruction/response pairs (borrow Second-Me's L1 "bio + significant sentences + preference tags" framing and its context-enhancement / context-critique pair structure).
- LoRA fine-tune **Qwen2.5-3B-Instruct** on it via MLX. Evaluate against held-out memory questions ("what's our nav class vocabulary?", "what are the do-not-repeat rules?").
- Deliverable: a `.safetensors` adapter + a one-command local-inference path. Reversible, private, free to run.

**Phase 2 — Wire into the stack (medium effort, later).**
- Add the local Shay model as a **router fallback / always-on tier** beneath the cloud models, so cap-free, private, on-brand responses are available even when Claude/Codex are throttled (the cap-burn problem is already a documented pain point).
- Schedule nightly/weekly re-training off the live memory DB so the adapter stays current.
- Optionally graduate the base to **Qwen2.5-7B** if RAM allows.

**Not worth doing — now or later:**
- ❌ Train a foundation model from scratch (educational only).
- ❌ Full-parameter fine-tunes (LoRA covers it).
- ❌ Cloud GPU pretraining (no ROI vs. a 7B LoRA).
- ⚠️ Running Second-Me's full Docker stack verbatim — evaluate it, but we likely want a *leaner* MLX-only pipeline we control, borrowing its pipeline design rather than adopting its whole app.

---

## Sources

- Second-Me repo — https://github.com/mindverse/Second-Me
- Second-Me README — https://github.com/mindverse/Second-Me/blob/master/README.md
- Second-Me MLX training dir — https://github.com/mindverse/Second-Me/tree/master/lpm_kernel/L2/mlx_training
- AI-native Memory 2.0: Second Me (paper) — https://arxiv.org/abs/2503.08102
- Second-Me DeepWiki — https://deepwiki.com/mindverse/Second-Me
- LLMs-from-scratch (Raschka) — https://github.com/rasbt/LLMs-from-scratch
- LoRA fine-tuning on Apple Silicon — https://towardsdatascience.com/lora-fine-tuning-on-your-apple-silicon-macbook-432c7dab614a/
- mlx-tune (SFT/DPO/LoRA on MLX) — https://github.com/ARahim3/mlx-tune
- Run & fine-tune LLMs on Mac with MLX-LM (2026) — https://markaicode.com/run-fine-tune-llms-mac-mlx-lm/
- Internal: `obsidian/Shay-Memory/research/ai-os-discovery-report.md` (Tencent L0–L3 memory layer)