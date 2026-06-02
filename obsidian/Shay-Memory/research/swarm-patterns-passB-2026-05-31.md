---
title: swarm-patterns-passB-2026-05-31
type: note
permalink: shay-memory/research/swarm-patterns-pass-b-2026-05-31
---

# Swarm Orchestration Patterns — Pass B (Independent)

**Date:** 2026-05-31
**Author:** Pass B research agent (parallel/adversarial to Pass A)
**Scope:** Extract actionable multi-agent orchestration patterns from the Hermes agent swarm article and the `affaan-m/claude-swarm` repo, then map them onto our Claude-orchestrator + Shay-worker (Gemini) kanban swarm (boards: research/agentos/deskbuild; lanes = profiles: researcher/builder/reviewer/orchestrator).

**Sources**
- Hermes agent swarm — https://goldstarlinks.com/hermes-agent-swarm/
- claude-swarm — https://github.com/affaan-m/claude-swarm
- claude-swarm author corpus (ECC/everything-claude-code) — https://github.com/affaan-m/everything-claude-code

---

## 1. Key orchestration patterns — by source

### Hermes agent swarm (goldstarlinks.com)
A product/marketing description, light on architecture. The genuinely transferable ideas:

- **Per-agent identity bundle.** Each agent gets "its own system prompt, mission, model, and skills." The unit of an agent = (prompt + mission + model + tools), not a generic worker. This is a clean contract for a kanban *lane*: a lane should pin its own system prompt, model, and tool allow-list.
- **Role specialization over generic workers.** Named roles — planner, builder, reviewer, routing/triage, researcher, writer/reporter. Maps 1:1 onto our profile lanes.
- **Orchestrator-as-router.** "Give the swarm one goal and let the orchestrator route the work" and decide "which agents should help." The human states a goal; routing is the orchestrator's job, not the human's.
- **Reviewer as a distinct phase.** A dedicated reviewer agent "checks for mistakes" — review is a separate stage, not folded into the builder.
- **Workspace visibility / status surface.** "Hermes Workspace" shows agents as ready / blocked / working, and outputs land as reviewable *files*, not chat. This is exactly a kanban board's value proposition.

**Caveat:** No MCP, no CLI, no real coordination/locking, no verification detail. Treat Hermes as a UX/vocabulary reference, not an engineering reference.

### claude-swarm (affaan-m) — the real architecture reference
Two-phase, wave-based orchestration over the Claude Agent SDK:

- **Phase 1 — Decomposition (Opus 4.6).** A high-tier model analyzes the codebase/task and emits a **dependency graph of subtasks** (`decomposer.py`). The plan is explicit data: tasks + dependencies + parallelization opportunities.
- **Phase 2 — Wave-based parallel execution (`orchestrator.py`).** Independent subtasks run simultaneously in "waves"; a task starts only when its upstream dependencies complete. Within a wave, agents run in parallel.
- **Pessimistic file locking.** Each file is locked to one agent during edit; prevents two agents writing the same file. This is the core conflict-avoidance mechanism.
- **Budget + retry guardrails.** CLI: `claude-swarm --budget 3.0 --max-agents 6 --retry 2 "Build a REST API..."`. Budget enforcement halts runaway cost; retries bounded.
- **Model tiering.** Opus 4.6 for decomposition + final review; cheaper tier (Haiku) for parallel worker execution. Framed as "senior architect plans, junior engineers execute, senior reviews."
- **Phase 2.5 — Quality gate.** After agents finish, Opus 4.6 reviews the *combined* output for integration issues between agents, missed edge cases, security concerns, and whether the original task was fully addressed.
- **`swarm.yaml` config.** Declarative agent types, descriptions, per-agent model/tools, and connection topology between agents.
- **Rich terminal dashboard** for live wave/agent/budget visibility.

**Important correction (adversarial note):** claude-swarm is **not** a same-task-redundancy or adversarial-debate system. It uses *single quality-gate consensus review* (one Opus pass over merged output). Anyone citing it as evidence for "spawn N agents on the same task and cross-check" is overreaching — that pattern is absent here. It is a *divide-and-merge* system, not a *redundancy* system.

---

## 2. Concrete adoption recommendations for our kanban-lane swarm

1. **Make the decomposition step a first-class, explicit artifact.** Before cards hit lanes, the Claude orchestrator should emit a dependency graph (cards + `depends_on` edges) onto the board, not just spawn ad hoc. Cards stay in a `blocked` column until upstream cards reach `done`. This is the single most valuable steal from claude-swarm and we likely under-do it today.

2. **Adopt wave gating on the kanban.** A card becomes pullable only when its dependencies are `done`. Cheap to implement as a `depends_on: [card_ids]` field + a pull guard. Gives us safe parallelism without a real scheduler.

3. **Pin per-lane identity bundles (Hermes pattern).** Each lane = (system prompt + mission template + model + tool allow-list). Researcher/reviewer lanes → Gemini/Shay or Flash; builder lanes that touch code → stronger tier; orchestrator → Opus-class. Store as a `swarm.yaml`-style declarative file in the repo so lane config is versioned, not hardcoded.

4. **Add file-scope locking for deskbuild/agentos boards.** Pessimistic locking is the cheapest correctness win when builders run in parallel and touch shared files. A `claims: [paths]` field per active card + reject pulls that overlap an in-progress card's claims. Honors our standing "every write path through `runPostProcessing`" discipline by keeping one writer per file.

5. **Institute a Phase-2.5 quality gate as a mandatory reviewer card.** After a wave's builder cards complete, auto-spawn one orchestrator/reviewer card whose job is integration review of the *combined* diff — not per-card review. Checks: do the pieces fit, edge cases, security, did we actually answer the original goal. This matches our existing adversarial-verify / judge-panel doctrine.

6. **Budget + retry guardrails per board run.** Track token/credit spend per board run; hard-stop at a ceiling; bound retries (e.g. 2). Especially important given the documented reality that both Anthropic and Codex subs can be rate-capped simultaneously (memory: `project_codex_subscription_capped`). A budget ceiling forces graceful degradation to Gemini Flash / Ollama rather than silent stalls.

7. **Status surface = the board itself.** Hermes' ready/blocked/working surface is just our lanes. Make sure every spawned agent writes status transitions back to the card (working → review → done/blocked) so the board is ground truth, not a stale mirror of agent state.

---

## 3. Honest critique — hype vs. genuinely useful

**Hermes:** Mostly marketing. The vocabulary (role bundle, orchestrator-as-router, reviewer-as-phase, file outputs over chat) is useful framing, but there is *zero* engineering substance — no coordination, no locking, no verification, no MCP/CLI. Do not cite Hermes as proof any pattern works; cite it only for naming/UX.

**claude-swarm:** Genuinely useful and the more credible source. Wave scheduling, dependency graphs, pessimistic file locking, budget/retry, and model tiering are real, well-understood distributed-execution ideas applied sensibly. The two caveats:
- It's **codebase-centric** (REST-API-build framing). Our research and agentos boards are not file-edit-heavy, so file locking matters far less there — don't bolt locking onto research lanes where there's no shared-file contention.
- The "Opus plans, Haiku executes, Opus reviews" tiering assumes an all-Claude SDK substrate. **We are heterogeneous** (Claude orchestrator + Gemini/Shay workers). The clean SDK subprocess control and uniform model API claude-swarm relies on does **not** map directly — our worker is a different vendor with different tool access, different failure modes, and no shared file-lock primitive out of the box. We'd be reimplementing the coordination layer ourselves; claude-swarm's code is a design reference, not a drop-in.

**Where claude-swarm would NOT fit us:**
- Its file-locking + Agent-SDK subprocess model assumes homogeneous Claude agents on one machine sharing a filesystem. Our Gemini worker doesn't participate in that lock protocol unless we build a board-level lock (recommendation #4) that both Claude and Gemini lanes respect. The lock has to live in *our* kanban layer, not the SDK.
- Its consensus single-review gate is weaker than our existing adversarial-verify/judge-panel practice. Don't downgrade to it — keep our stronger review and just borrow the *combined-output integration* focus (rec #5).

---

## 4. Same-task redundancy: cost/quality tradeoff + a usage rule

Neither source actually does same-task redundancy (claude-swarm explicitly does not; Hermes doesn't either). So this is *our* extension, and it must be justified on its own merits, not borrowed authority.

**The tradeoff:**
- **Cost:** Running N agents on the identical task multiplies token/credit spend ~N×, plus a reconciliation pass. With both vendor subs rate-cappable, redundancy burns the scarce resource fastest. This is real, not theoretical, in our environment.
- **Quality:** Redundancy buys (a) diversity — different models/prompts surface different failure modes; (b) adversarial cross-check — one agent critiques another's output; (c) variance reduction on high-stakes or ambiguous tasks. But beyond 2 (occasionally 3) agents, returns drop sharply — the third opinion rarely changes the verdict and reconciliation cost rises.
- **Cross-vendor diversity is the high-value variant.** Two *identical* Claude agents on the same task give correlated errors (same blind spots). Claude + Gemini on the same task give *uncorrelated* errors — that's where redundancy actually pays. Prefer heterogeneous redundancy over homogeneous.

**Proposed rule (when to use same-task redundancy):**

> Use same-task redundancy ONLY when at least one is true: (1) the task is high-stakes / hard-to-reverse (architecture decision, security-sensitive change, a research conclusion that will drive downstream build); (2) the task is genuinely ambiguous and a single agent's framing risks tunnel vision; or (3) a prior single-agent pass produced low-confidence or contested output. When used, default to **exactly 2 agents from different vendors** (Claude + Gemini/Shay) for uncorrelated errors, then a single orchestrator reconciliation/judge pass. Never run >2 same-vendor clones — correlated errors waste budget. For routine, reversible, or low-ambiguity cards, use a single agent + the standard reviewer gate. Honor the per-board budget ceiling (rec #6): redundancy is the first thing to drop when approaching the cap.

This makes the *current* Pass A / Pass B exercise (two independent agents, then reconcile) the canonical template — but reserved for high-value tasks, not the default.

---

## 5. One-line takeaways
- Steal from claude-swarm: explicit dependency graph + wave gating + per-lane config + budget/retry + combined-output quality gate.
- Steal from Hermes: vocabulary only (role bundles, orchestrator-as-router, files-not-chat).
- Do NOT inherit claude-swarm's homogeneous-Claude assumptions or its weaker single-review consensus.
- Same-task redundancy is OUR idea, not theirs: use it sparingly, cross-vendor, 2 agents max, gated by stakes + budget.