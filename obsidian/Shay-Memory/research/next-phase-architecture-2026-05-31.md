---
title: Next-Phase AI-OS Architecture — Shay-Shay OS (target)
type: architecture
permalink: shay-memory/research/next-phase-architecture-2026-05-31
---

# Next-Phase AI-OS Architecture — Shay-Shay OS (2026-05-31)

This is the **target architecture** the Gemini worker (W2) blocked on — the synthesis the
capability map was meant to pair with. It does not re-list capabilities; it makes the concrete
**adopt / build / wire** decisions for each of the 11 AI-OS layers, defines the memory layer
(Tencent L0–L3 + reflection + local retrieval + LoRA L2), fixes the orchestration/swarm
topology, and gives one coherent architecture diagram + adoption sequence.

**Reconciles:** capability-map, ai-os-discovery-report, agentos-port-plan,
free-models-discovery, hermes-capabilities-audit, plugins-discovery, mobile-macmini-strategy,
provider-self-registration-design, swarm-upgrades-reconciled, train-our-own-models-strategy,
PER-PAGE-UI-DISCOVERY, SHAY-OS-MASTER-PLAN.

---

## 0. The one decision that frames all others

The shell is already Claude-Desktop-class and the runtime/swarm/memory plumbing **exists in
Hermes** — most of it is unclaimed, not unbuilt. So the architecture is governed by a single
rule:

> **Adopt the Hermes capability before building a new one. Build only the UI/glue that exposes
> it. Generate net-new only where neither Hermes nor an existing FAMtastic service covers it.**

Every layer decision below resolves to one of four verbs:
**ADOPT** (enable existing Hermes/config), **WIRE** (build desktop UI over an existing
backend), **BUILD** (net-new, no backend exists), **HOST** (run on the Mac mini home server).

---

## 1. The 11 layers → concrete decisions

| # | Layer | Verb | Concrete decision (what actually ships) |
|---|-------|------|-----------------------------------------|
| 1 | **RUNTIME** | ADOPT | Hermes-Agent stays the single runtime. No OpenSwarm/pi adoption — they overlap what Hermes profiles + kanban lanes already do. Add `execute_code` (programmatic tool calling) + `/goal` Ralph-loop as the two runtime upgrades. PM2 supervises the Hermes gateway + API server processes on the Mac mini. |
| 2 | **MEMORY** | ADOPT + BUILD | **Tencent L0–L3 as the schema** layered over existing basic-memory/`memory.db` + Obsidian vault. `holographic` provider (already in-tree, local SQLite+FTS5) is the **single** chosen local-retrieval engine. Add a nightly **reflection/consolidation** pass (cron). **Do NOT adopt Honcho/Mem0/Hindsight as live providers** — single-select slot goes to holographic; the L0–L3 structure lives in our own files, not a vendor provider. (See §2.) |
| 3 | **LONG-CONTEXT** | ADOPT-lite | Lean on the free 1M-ctx models (`deepseek-v4-flash:free`, `qwen3-coder:free`, Gemini Flash) as the long-context path instead of standing up rlm-rs. rlm-rs stays MONITOR — revisit only if a corpus exceeds even 1M ctx after retrieval. |
| 4 | **CONTEXT-HYGIENE** | ADOPT | `rtk` + `token-optimizer` enabled to cut the ~64M-tok/week footprint. Pairs with `execute_code` (intermediate results never hit context) as the two-pronged token-cost fix. |
| 5 | **VERIFICATION** | ADOPT (keep ours) | Keep our **stronger** `adversarial_verify` / `judge_panel` — do **not** downgrade to a single consensus gate. Add the swarm's **per-wave integration-review card** (reviewer over combined wave output). Ralph-loop (`/goal`) supplies loop-until-done. |
| 6 | **SKILLS** | WIRE | Hermes skills system is rich (14 CLI verbs); desktop exposes ~4. Build the **Skills manager** (enable/disable via `skills config`, in-app SKILL.md edit reusing the Soul editor, update/check badges, `tap` sources panel, curator strip). This is the canonical CLI-parity proof. |
| 7 | **UI** | WIRE + BUILD | Native React/TS `agentos` domain in `shay-desktop-electron`, grounding the proven hermes-webui flows (per agentos-port-plan). Reusable **`DetailDrawer` + `CliVerbPanel`** template is the spine; every weak "list + one action" page gets the full CLI verb set. New screens: **Inbox**, **Insights**, **Security group**. Wire the two dark screens (Kanban, Gateway) first — one-line imports. |
| 8 | **RESEARCH** | ADOPT | Existing deep-research harness + web-search backends stay. Add `delegate_task` parallel-batch fan-out for research/review inside one session. No AutoResearchClaw adoption. |
| 9 | **CODING** | ADOPT | Coding lane = `qwen3-coder:free` primary, `gpt-oss-120b` on Groq for speed, paid `gpt-5.3-codex` as quality escalation. No Codebuff/dedicated coding-model integration into core — route through lanes. |
| 10 | **MODELS** | BUILD + ADOPT | **Provider self-registration** ("+ Add Provider" desktop modal as thin UI over `shay auth`/`shay providers`) + **Models registry page** (render `data/models-registry.json`, CRUD, "set as lane brain", drag-reorderable fallback chain). Free-model lane map (§3) applied. Local Shay LoRA model becomes a registered local provider (§4). |
| 11 | **INFRA** | HOST | **Mac mini = always-on home server**: PM2 (process supervision) + CasaOS (container/app management) + Tailscale (secure mobile reach). Hosts Hermes gateway, API server, memory DB, MCP servers, the reflection cron, and the MLX LoRA trainer. Mobile = Hermes-on-Android (on-device floor) deferring to the Mac mini when reachable. |

**Dropped/parked from the discovery list** (explicit non-decisions to stop re-litigating):
OpenSwarm, earendil/pi, rlm-rs (monitor), Honcho/Mem0/Hindsight as live providers, Codebuff,
AutoResearchClaw, ChatdollKit, full Second-Me Docker stack, foundation pretraining,
full-parameter fine-tunes, cloud-GPU training, built-in FAL image-gen (muapi recipes win),
Shay native browser stack (Chrome/Playwright MCP win), RL/batch-trajectory training.

---

## 2. Memory layer — Tencent L0–L3 + reflection + local retrieval + LoRA L2

The memory layer is the spine of the whole OS and the **training-data source** for the local
model. It unifies three things we already have (Obsidian vault, basic-memory `memory.db`,
built-in MEMORY.md/USER.md) under one L0–L3 schema, adds a consolidation pass, and bakes the
top layer into model weights.

```
L0  RAW            Obsidian Shay-Memory vault (.md) + basic-memory memory.db (~88MB,
                   340 sessions / 15.8k msgs) + session JSONL. Chunked + embedded.
                   Retrieval engine: HOLOGRAPHIC (local SQLite+FTS5, single-select slot).
                   ── this is plain storage + RAG; already exists.

L1  NL-MEMORY      Natural-language profile ABOUT Fritz/projects: bio, significant
                   sentences, preference tags, entities, do-not-repeat rules.
                   Human-readable, inspectable. Written/refreshed by the nightly
                   REFLECTION pass. (MEMORY.md/USER.md are the seed of this.)

L2  PARAMETERS     The personal Shay model: Qwen2.5-3B/7B-Instruct + LoRA adapter
                   trained on an instruction-JSONL exported from L0+L1 via MLX on the
                   Mac mini. The personality lives in the weights, not just retrieval.
                   Reversible (swap adapters), private, cap-free.

L3  IDENTITY       The stable contract: who Shay is, standing constraints, the FAMtastic
                   DNA invariants, project map. Curated, slow-changing. Sits above the
                   churn of L0–L2 and is injected into every session's system context.
```

**How it fits Shay's existing infra:**
- **Holographic** is the chosen retrieval provider — it's already installed, local-first, and
  single-select (Hermes only allows one external memory provider at a time). This closes the
  "pick one local retrieval" decision.
- The **nightly reflection/consolidation cron** runs on the Mac mini: (a) summarizes new L0
  sessions into L1 NL-memory, (b) prunes/merges duplicate L1 entries (mirror the
  `consolidate-memory` discipline), (c) re-exports the L0+L1 corpus to instruction-JSONL, (d)
  triggers the MLX LoRA retrain so L2 drifts toward current reality instead of going stale.
- **Reflection ≠ retrieval.** Retrieval (holographic) answers "what did we decide about X";
  reflection re-writes the durable L1 profile so the next session and the next LoRA run start
  smarter. Both are required.
- This is a **leaner-than-Second-Me** pipeline: borrow Second-Me's L0→L1→L2 *shape* and its
  context-enhancement / context-critique JSONL pair structure, but run an MLX-only trainer we
  control, not the full Docker stack.

---

## 3. Orchestration / swarm topology

The swarm is **kanban-lane based**, not an SDK lock. Four lanes (profiles) with role-optimal
free brains, coordinated through one SQLite kanban board with claim-locking.

```
                         ORCHESTRATOR lane (Claude Sonnet / paid)
                         · decomposes work into board cards
                         · assigns lanes, owns wave scheduling
                         · does glue, not bulk
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        ▼                         ▼                          ▼
  RESEARCHER lane           BUILDER lane               REVIEWER lane
  deepseek-v4-flash:free    qwen3-coder:free           kimi-k2.6 / cross-vendor
  (research/reasoning)      (bulk code/build)          (adversarial_verify,
  Nemotron-120b @ NIM       gpt-oss-120b @ Groq         judge_panel, integration
  for off-quota bulk        for speed; codex escalate   review per wave)
        │                         │                          │
        └─────────────────────────┴──────────────────────────┘
                                  ▼
              KANBAN BOARD (SQLite) — the coordination substrate
              · cards carry  depends_on  +  claims: (file/path scope)
              · pull-guard: card promotes only when parents are done
              · claim-lock: dispatcher refuses overlapping-claim cards
                concurrently  ──►  REMOVES the "serialize builds" constraint
              · per-board budget ceiling + bounded retries + cost tracking
              · --dry-run plan-gate previews decomposition/cost before spend
              · versioned lane identity bundle (swarm.yaml: prompt+model+skills)
```

**Topology decisions:**
- **Claim-locking is the keystone upgrade** — it makes parallel build cards safe, so
  deskbuild/agentos cards run concurrently without collisions. This is the single biggest
  throughput win and it lives in *our* kanban layer (lanes are heterogeneous: Claude
  orchestrator + free-model workers).
- **Cross-vendor redundancy is OFF by default**, used only for high-stakes / irreversible /
  genuinely-ambiguous cards: exactly 2 agents from *different* vendors (Claude + Gemini) + 1
  reconciliation pass. Never >2 same-vendor (correlated errors = low value). Dropped first when
  nearing budget.
- **Quota spreading:** lanes spread across OpenRouter + Cerebras + Groq + NIM + Google so no
  single 200/day or 1M/day cap throttles the swarm. **Always-available floor = Ollama local
  (`hermes3`, `gemma4`) + the local Shay LoRA model** — the cap-free tier under everything.
- **Credential pools** (multi-key same-provider rotation) fire on 429/quota *before*
  cross-provider fallback — the direct fix for the documented "both vendors capped" pain.

---

## 4. Local model track (L2) — where it sits in the runtime

The LoRA Shay model is not a separate system — it registers as a **local provider** in the same
registry every other brain uses, and sits at the bottom of the fallback chain as the cap-free,
private, on-brand tier.

```
request ─► resolve_provider() ─► [paid/cloud brains] ─► credential-pool rotation
                                        │ (on cap/429)
                                        ▼
                                 [free-model lanes]
                                        │ (all quotas exhausted / privacy-required)
                                        ▼
                          LOCAL TIER (always available, cap-free)
                          · Ollama hermes3 / gemma4
                          · Shay LoRA adapter on Qwen2.5-3B/7B (MLX, Mac mini)
```

- **Base model ceiling is set by Mac-mini RAM** (16GB→~2B, 32GB→~3B, 64GB→7B). **Confirming
  RAM is the gating blocker** for choosing the base size.
- Trainer: `mlx_lm.lora --train` on the JSONL exported by the reflection pass; minutes per 3B
  run. Adapter is tens of MB, reversible, swap-in.
- It complements (not replaces) cloud brains — the value is "never rate-limits, always sounds
  like us," not "beats Claude."

---

## 5. Single coherent architecture diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                          SURFACES  (how Fritz reaches Shay)                          │
│  shay-desktop-electron (React/TS, agentos domain)   ·   CLI (shay …)                 │
│  Hermes-on-Android (on-device floor)  ─Tailscale─►  Mac-mini host                    │
│  shay mcp serve / ACP  ─►  Claude Code, Zed, IDEs call Shay as a tool                │
└───────────────────────────────┬──────────────────────────────────────────────────┘
                                 │
┌───────────────────────────────▼──────────────────────────────────────────────────┐
│   UI LAYER (agentos)  · DetailDrawer + CliVerbPanel template = the spine            │
│   Chat(+composer footer/context ring) · Kanban(wire+swimlanes/DAG) · Gateway(wire)  │
│   Skills mgr · Models registry · Providers(+Add Provider) · Inbox · Insights        │
│   Security group(Pairing/Hooks/Checkpoints) · Memory · Sessions · Profiles          │
└───────────────────────────────┬──────────────────────────────────────────────────┘
                                 │  IPC / shay CLI / API server (OpenAI-compat)
┌───────────────────────────────▼──────────────────────────────────────────────────┐
│   RUNTIME — Hermes-Agent                                                            │
│   profiles (orchestrator/researcher/builder/reviewer) · execute_code · /goal loop   │
│   delegate_task fan-out · hooks/webhooks · checkpoints · context-hygiene(rtk/opt)   │
│                                                                                     │
│   ┌─ ORCHESTRATION ──────────────────────────────────────────────────────────┐    │
│   │  KANBAN swarm (SQLite): claim-lock · depends_on/wave · budget/retries ·    │    │
│   │  --dry-run gate · per-wave integration review · adversarial_verify/judge   │    │
│   │  cross-vendor redundancy (high-stakes only, off by default)                │    │
│   └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│   ┌─ MODELS ─────────────────────────────────────────────────────────────────┐    │
│   │  registry(models-registry.json) · self-registration(shay auth/providers)  │    │
│   │  cloud(Claude/Gemini/codex) ─cred-pools─► free lanes(OpenRouter/Cerebras/  │    │
│   │  Groq/NIM/Google) ─► LOCAL tier(Ollama + Shay LoRA, cap-free floor)        │    │
│   └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│   ┌─ MEMORY  (L0 raw → L1 NL → L2 params → L3 identity) ──────────────────────┐    │
│   │  L0 Obsidian+memory.db, retrieval=holographic(local)                       │    │
│   │  L1 NL-profile  ◄── nightly REFLECTION/consolidation cron                  │    │
│   │  L2 LoRA adapter ◄── MLX trainer (JSONL export from L0+L1)                  │    │
│   │  L3 identity/DNA injected into every session                               │    │
│   └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│   SKILLS (14-verb system, curator) · RESEARCH (deep-research+web) · VERIFICATION    │
│   MCP CLIENT (≤6 active: Context7/GitHub/Filesystem P0 · Playwright P1)              │
└───────────────────────────────┬──────────────────────────────────────────────────┘
                                 │
┌───────────────────────────────▼──────────────────────────────────────────────────┐
│   INFRA — Mac mini home server                                                      │
│   PM2 (supervise gateway/API/cron) · CasaOS (apps/containers) · Tailscale (reach)   │
│   hosts: memory.db · reflection cron · MLX LoRA trainer · MCP servers · gateway     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Adoption sequence (single sign-off order)

Ordered so each step unblocks the next; ADOPT-plumbing and the TRAIN track run in parallel.

1. **Swarm RUN upgrades** — kanban claim-locking + depends_on/wave scheduling + free-model lane
   map + credential pools. *Unblocks fast, safe parallel building of everything below; directly
   fixes cap pain.*
2. **Provider self-registration + Models registry page** — wire the stubbed `shay:auth:*`
   channels to shell out to `shay auth`/`shay providers`; render the registry with CRUD + "set
   as lane brain" + fallback-chain editor. *Unlocks all new brains (Step-3.7-Flash via Nous,
   gemma4, free models) self-service.*
3. **DetailDrawer / CliVerbPanel template** — the reusable spine every page upgrade consumes.
4. **Wire the dark screens (Kanban + Gateway)** — one-line imports, delete redundant `index.tsx`
   variants. *XS effort, huge impact: lights up the two deepest already-built domains.*
5. **Skills manager** (canonical parity proof) → then **Agent Monitor** replaced by real
   telemetry (`kanban runs/watch` + gateway status).
6. **Inbox + Insights + Security group** (Pairing/Hooks/Checkpoints) — new screens via template.
7. **Chat composer footer + context ring**, skills-preload + worktree toggles.
8. **Agent OS** — native hermes-webui port across remaining screens, reusing the template.
9. **ADOPT plumbing in parallel** — rtk/token-optimizer, `execute_code`, `/goal`, MCP P0
   (Context7/GitHub/Filesystem, ≤6 active), PM2 + CasaOS + Tailscale on the Mac mini, holographic
   memory provider, nightly reflection cron.
10. **TRAIN track in parallel** — MLX setup + throwaway LoRA test → memory→JSONL exporter +
    first Qwen2.5-3B Shay adapter → register as local provider + fallback tier + scheduled
    retrain. *Starts once Mac-mini RAM is confirmed.*

---

## 7. Open blockers (need Fritz)

- **Mac-mini RAM** — gates the LoRA base-model size (16→~2B / 32→~3B / 64→7B) and confirms it can
  host the always-on stack.
- **Nous Portal login** — one device-code sign-in unblocks Step-3.7-Flash live (the
  self-registration flow's worked example).
- **`ollama pull gemma4`** — seats the local vision/floor lane.
- **Apply the lane→free-model remapping now, or after build-order sign-off?**
- **Confirm holographic** as the single memory-retrieval provider (vs leaving built-in-only).
