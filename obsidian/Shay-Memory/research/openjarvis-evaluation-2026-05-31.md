---
title: openjarvis-evaluation-2026-05-31
type: note
permalink: shay-memory/research/openjarvis-evaluation-2026-05-31
---

# OpenJarvis Evaluation for Shay

> Research date: 2026-05-31
> Sources: [Homepage](https://open-jarvis.github.io/OpenJarvis/) · [GitHub](https://github.com/open-jarvis/OpenJarvis) · [Stanford SAIL blog](https://scalingintelligence.stanford.edu/blogs/openjarvis/) · [MarkTechPost coverage](https://www.marktechpost.com/2026/03/12/stanford-researchers-release-openjarvis-a-local-first-framework-for-building-on-device-personal-ai-agents-with-tools-memory-and-learning/)

---

## What it is

OpenJarvis is a **local-first framework for building on-device personal AI agents** — not a voice assistant, not a home-automation hub, and not a consumer product. It comes out of Stanford's **Hazy Research + Scaling Intelligence Lab**, tied to their "Intelligence Per Watt" research program. The thesis: local models already handle ~88.7% of single-turn chat/reasoning queries, so you can build a personal AI that runs locally by default and only calls the cloud when truly necessary, keeping personal data on-device.

It is best understood as a **research-grade peer/competitor to Shay's own architecture** — same brain-agnostic, local-first, agentic philosophy — rather than a component to bolt on. Its real value to Shay is as an **idea/pattern donor and a benchmark of how Stanford solved the same problems**, plus two reusable subsystems (energy/cost telemetry and trace-driven skill optimization).

**License: Apache-2.0** — permissive. Safe to study, adapt, and even vendor specific modules with attribution. No GPL contamination risk.

---

## Architecture

| Dimension | OpenJarvis | Notes vs. Shay |
|---|---|---|
| Project type | Local-first personal AI agent framework (research) | Direct philosophical sibling to Shay |
| Language / stack | Python; FastAPI backend w/ SSE streaming | Shay is Hermes + Electron/Node-leaning |
| Frontend | Browser dashboard (React, localhost:5173) | Shay has Electron desktop |
| Desktop | Tauri-based native apps (.dmg/.exe/.deb/.rpm/.AppImage) | Tauri vs Shay's Electron |
| 5 primitives | Intelligence, Engine, Agents, Tools & Memory, Learning | Clean decomposition worth mirroring |
| Engine layer | Ollama, vLLM, SGLang, llama.cpp, MLX, Exo, LiteLLM, cloud APIs; HW auto-detect + engine recommendation | Strong brain-agnostic routing layer |
| Agents (8) | morning_digest (scheduled); deep_research, orchestrator, native_react, native_openhands, simple (on-demand); monitor_operative, operative (continuous) | Maps to Shay's swarm roles |
| Memory | monitor_operative w/ memory, compression, retrieval; local RAG over folders | Shay uses Obsidian vault |
| Learning loop | Trace-driven optimization: SFT/GRPO/DPO fine-tune, DSPy prompt opt, GEPA agent-level, engine tuning. `jarvis optimize skills --policy dspy`, `jarvis bench skills` | Shay has no equivalent self-improvement loop |
| Eval/telemetry | Energy + dollar cost as first-class metrics; GPU watts/token-cost/latency across NVIDIA/AMD/Apple; live dashboard | Shay has no cost/energy telemetry |
| Messaging surfaces | 26+ channels — iMessage, Telegram, WhatsApp, etc. | Shay's phone companion overlaps |
| Interop | OpenAI-compatible endpoint, MCP server support | Both MCP-friendly |
| Skills source | Discovers skills from a catalog incl. **Hermes Agent** and **OpenClaw** | Notable: OpenJarvis already consumes Hermes skills |
| Maturity | ~5,750 stars, ~1,230 forks, 37 open issues, 31 PRs, actively updated (commit 2026-05-31). Research-forward but production-capable. | Healthy and active |

---

## Feature-by-feature verdict

| OpenJarvis capability | Verdict | One-line reason |
|---|---|---|
| Energy + dollar-cost telemetry (watts/token-cost/latency, live dashboard) | **ADOPT-NOW** | Shay has zero cost/energy visibility; Apache-2.0 telemetry is a clean lift that makes brain-routing decisions accountable. |
| Trace-driven skill optimization (`jarvis optimize skills`, DSPy/GEPA) | **SOLVES-A-BOTTLENECK** | Shay's skills are static; an automatic improve-from-traces loop is a capability Shay lacks entirely. |
| Engine abstraction + HW auto-detect / engine recommendation | **OVERLAPS-EXISTING** | Shay already routes brains via Hermes; borrow the HW-detection heuristics, not the layer. |
| Orchestrator / Operative continuous agents | **OVERLAPS-EXISTING** | Shay's kanban swarm already covers multi-agent orchestration and recurring workflows. |
| `morning_digest` scheduled agent w/ TTS audio | **MONITOR** | Nice pattern (cron digest from email/calendar/health), but Shay can build this on its own scheduler. |
| 26+ messaging channels (iMessage/Telegram/WhatsApp) | **MONITOR** | Overlaps Shay's phone companion; their iMessage/WhatsApp bridges are worth studying for the ambient surface. |
| OpenAI-compatible endpoint + MCP server support | **OVERLAPS-EXISTING** | Shay is already MCP-native. |
| Local RAG over folders/papers | **OVERLAPS-EXISTING** | Shay's Obsidian vault memory covers this. |
| Wake-word / always-listening voice loop | **NOT-RELEVANT** | OpenJarvis has none — no contribution to Shay's voice ambitions. |
| On-device speech-to-text | **NOT-RELEVANT** | Not present; only TTS output exists. |
| Text-to-speech (digest audio) | **OVERLAPS-EXISTING** | Trivial; Shay can wire any TTS. |
| Home / IoT control | **NOT-RELEVANT** | OpenJarvis does not do home automation at all. |
| Mobile companion app | **NOT-RELEVANT** | No mobile app — desktop + messaging bridges only. |
| Tauri desktop packaging | **NOT-RELEVANT** | Shay is committed to Electron; no reason to switch. |

---

## Top 3 adopt recommendations

1. **Energy + dollar-cost telemetry layer (ADOPT-NOW).** Port the concept of treating energy/latency/$-cost as first-class metrics into Shay's brain-router. Even a lightweight version — per-request token cost, latency, and (where available) local GPU watts surfaced in a dashboard — turns Shay's brain-agnostic routing from "pick a brain" into "pick the cheapest brain that clears the quality bar." Clean-room the dashboard; the *idea* is the value, not the code.

2. **Trace-driven skill optimization loop (SOLVES-A-BOTTLENECK).** Shay's skills are hand-maintained and static. OpenJarvis's `optimize skills` + `bench skills` (DSPy prompt optimization, GEPA) is a self-improvement capability Shay has no analog for. Adopt the *pattern*: log skill-invocation traces to the Obsidian memory, then periodically run a DSPy-style optimizer to refine skill prompts/few-shots and benchmark the delta. This is the single biggest net-new capability OpenJarvis demonstrates.

3. **Study their messaging-bridge + morning-digest patterns (MONITOR → selective adopt).** Their iMessage/WhatsApp/Telegram bridges and the `morning_digest` cron agent (briefing from email/calendar/health/news with audio) are mature reference implementations for Shay's phone companion and ambient surfaces. Don't fork — read how they handle the iMessage bridge specifically, since that's the hardest one and they've solved it.

---

## Licensing / security gotchas

- **License is Apache-2.0, not GPL.** Permissive — you may adapt or even vendor specific modules into Shay's (proprietary) base provided you preserve the LICENSE/NOTICE and attribution. No copyleft contamination.
- **Still prefer clean-room for the two adopt targets.** For the telemetry layer and the optimization loop, reimplement from the documented design rather than copy-pasting Python into Shay's Node/Electron stack — it avoids a stack mismatch *and* sidesteps any attribution-tracking burden. Apache lets you copy; clean-room is the cleaner engineering choice here.
- **Stack mismatch is the real friction**, not license: OpenJarvis is Python/FastAPI/Tauri; Shay is Hermes/Electron/Node. Direct code reuse would drag a Python runtime into Shay. Treat OpenJarvis as a design reference, not a dependency.
- **They already consume Hermes Agent skills.** OpenJarvis lists Hermes Agent + OpenClaw as skill sources — worth confirming whether "Hermes Agent" is the same Hermes Shay is built on; if so, there may be a skills-interop opportunity (and a reason to watch how they evolve the catalog).
- **Trust boundary for messaging bridges.** If borrowing iMessage/WhatsApp bridge patterns, audit how OpenJarvis scopes credential/local-data access before mirroring — these are the highest-privilege surfaces in any personal-AI design.