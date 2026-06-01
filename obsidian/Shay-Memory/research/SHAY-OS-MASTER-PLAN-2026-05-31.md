---
title: Shay-Shay OS — Master Plan (reconciled)
type: plan
permalink: shay-memory/research/shay-os-master-plan-2026-05-31
---

# Shay-Shay OS — Master Plan (2026-05-31)

Reconciles 10 research docs: capability-map, agentos-port-plan, per-page-UI-discovery,
kanban-setup-correct, swarm-upgrades-reconciled, free-models-discovery, provider-self-registration,
hermes-capabilities-audit, plugins-discovery, mobile-macmini-strategy, train-our-own-models.
(W2's Gemini worker blocked on the full synthesis — too large; it produced the capability map,
this doc is the next-phase architecture it was meant to pair with.)

## Thesis
Shay's *shell* is already Claude-Desktop-class and the *runtime/swarm/memory plumbing exists*.
The work is **(A) claim unclaimed Hermes capabilities, (B) per-page CLI-parity coverage,
(C) tune the swarm, (D) a local/personal model track** — turning a tool collection into an AI OS.

## ADOPT (capabilities — mostly config/enable, high ROI)
1. **Credential pools** (Hermes) — multi-key same-provider rotation → fixes "both vendors capped" *before* fallback. Direct cap-pain fix. `shay auth add` pools.
2. **Context hygiene** — `rtk` + `token-optimizer` → cut the ~64M-tok/week footprint. Quick win.
3. **`execute_code` + `/goal` loop** (Hermes) — token-efficient multi-step + autonomous loop-until-done.
4. **Free-model lane mapping** — builder→`qwen3-coder:free`, researcher→`deepseek-v4-flash:free`, agentic→`kimi-k2.6:free`; **spread lanes across OpenRouter+Cerebras+Groq+NIM+Google** (the `:free` 200/day cap is shared).
5. **Plugins** — enable bundled (kanban-dashboard, langfuse, holographic local-memory, fastmcp) + add **MCP P0** (Context7, GitHub, Filesystem); keep active MCP ≤6.
6. **Memory architecture** — adopt **Tencent L0→L3 model** as the schema over existing basic-memory/vault; add a nightly **reflection/consolidation** pass; pick **one** local retrieval (holographic provider already installed). This is also the training data for (D).
7. **Infra** — **PM2 + CasaOS on the Mac mini** = always-on Shay home-server host.
8. **`shay mcp serve` / ACP** — expose Shay to Claude Code + IDEs.

## BUILD (desktop — orchestrator does glue, builder lane does bulk)
Universal pattern: **a reusable `DetailDrawer` + `CliVerbPanel` template** — every weak page gets a per-item drawer carrying the *full CLI verb set* (desktop must DO what the CLI does).
- **Provider self-registration** — "+ Add Provider" modal (api-key / OAuth-device-code / custom base_url) as a thin UI over `shay auth` (wire the stubbed `shay:auth:*` channels to shell out). Unlocks Step-3.7-Flash via Nous + any future provider.
- **Skills manager** — enable/disable + edit SKILL.md + sources/`tap` + update badges (14 CLI verbs vs today's 4).
- **Models registry page** — render `data/models-registry.json` + CRUD + "set as lane brain".
- **Agent Monitor** — replace the fake row with real `kanban runs` + cron-output + gateway telemetry.
- **Inbox** (unified review surface, phone-aware) + **Insights** (token/cost) + **Security group** (pairing/hooks/checkpoints).
- **Chat 1:1** — top-right terminal/bg-tasks, below-input row, breadcrumb, Fritz→chat-settings, workspace/inline.
- **Agent OS** — native port of hermes-webui screens under the `agentos` domain (per agentos-port-plan), reusing the DetailDrawer template.

## RUN (swarm orchestration upgrades)
- **Kanban-layer claim-locking** (`claims:` per card) → parallel build cards safe → **removes the "serialize builds" constraint**.
- **Dependency-graph + wave scheduling** (`depends_on` + pull-guard) + **per-board budget/retries** + **wave integration-review** (keep our stronger adversarial_verify).
- **Cross-vendor same-task redundancy** for high-stakes cards only (Claude+Gemini, default off).
- **Multi-lane swarm** already set up (researcher/builder/reviewer/orchestrator); assign role-optimal free brains.

## TRAIN (personal Shay model — local, cap-free)
- **LoRA fine-tune Qwen2.5-3B/7B on the memory corpus via MLX on the Mac mini** (minutes, ~5GB). Second-Me = architecture; LLMs-from-scratch = learning ref.
- Phased: P0 MLX setup + test · P1 memory→JSONL exporter + first 3B LoRA Shay adapter · P2 router fallback + scheduled retrain.
- **Blocker:** confirm Mac-mini RAM (16→2B / 32→3B / 64→7B).

## RANKED BUILD ORDER (single sequence for sign-off)
1. **Swarm RUN upgrades** (claim-locking + lanes + free-model mapping) — unblocks fast, safe parallel building of everything below.
2. **Provider self-registration** + **Models registry page** — unlocks all the new brains (Step-3.7, gemma4, free models) self-service.
3. **DetailDrawer/CliVerbPanel template** — the spine every page upgrade reuses.
4. **Skills manager** (the canonical parity proof) → then Agent Monitor (real telemetry).
5. **Inbox** + **Insights** + **Security group** (new screens via template).
6. **Chat 1:1 parity.**
7. **Agent OS** (hermes-webui native port).
8. **ADOPT plumbing in parallel** (credential pools, rtk/token-optimizer, MCP P0, PM2/CasaOS on Mac mini).
9. **TRAIN track** (memory→L0-L3 + LoRA) — starts once Mac-mini RAM confirmed; runs parallel to builds.

## Open decisions / blockers (need Fritz)
- **Mac-mini RAM** (gates the training base-model size).
- **Nous Portal login** (one device-code sign-in → Step-3.7-Flash live).
- **`ollama pull gemma4`** (+ local lane).
- **Apply the lane→free-model remapping** now, or after build-order sign-off.
