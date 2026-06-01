---
title: swarm-patterns-passA-2026-05-31
type: note
permalink: shay-memory/research/swarm-patterns-pass-a-2026-05-31
---

# Swarm Orchestration Patterns — Pass A (2026-05-31)

Research extract for improving the FAMtastic Claude-orchestrator + Shay-worker (Gemini)
kanban swarm. Two sources mined; recommendations mapped onto our existing
kanban-lane architecture (boards: research/agentos/deskbuild; lanes/profiles:
researcher/builder/reviewer/orchestrator).

Sources:
- Hermes Agent Swarm — https://goldstarlinks.com/hermes-agent-swarm/
- claude-swarm (affaan-m) — https://github.com/affaan-m/claude-swarm

---

## 1. Key patterns by source

### Hermes Agent Swarm (goldstarlinks.com)
- **Role specialization prevents drift.** "A builder builds. A reviewer reviews.
  A planner plans." Each agent gets its own *system prompt, mission, model, and skills*.
  The stated failure mode of a single agent is that it "slows down, misses details,
  repeats itself, or loses track" — role isolation is the cure.
- **Mission-based fan-out via an orchestrator.** You submit *one high-level goal*;
  the orchestrator decides which agents help and routes work. Example given: an SEO
  mission decomposes into keyword research / competitor checks / article structures /
  internal linking — i.e. decomposition by sub-deliverable, not by file.
- **Dedicated reviewer + routing agent.** A reviewer agent checks for mistakes; a
  separate routing agent sends work to the right place. Outputs land as local editable
  files for human inspection (human-in-the-loop by default).
- **Kanban-style visibility.** A Workspace dashboard shows which agents are
  *ready / blocked / working* via a left-sidebar agent list — eliminating status guesswork.
- **No** voting/merge, same-task redundancy, or concrete config syntax in the article.

### claude-swarm (affaan-m, GitHub)
- **Three-phase workflow** with model tiering:
  1. **Decomposition** — Opus analyzes the codebase and emits a *dependency graph*
     of subtasks (planner = expensive model).
  2. **Parallel execution** — independent subtasks run simultaneously via the Claude
     Agent SDK with **dependency-aware scheduling** ("tasks only start when their
     dependencies complete"). Workers use Haiku (cheap); planner uses Opus.
  3. **Quality gate (Phase 2.5)** — Opus reviews *combined* output for integration
     issues between agents, missed edge cases, and security concerns.
- **Pessimistic file locking** to prevent simultaneous edits, tracked as
  `{auth.ts -> Agent 1}`. This is the concurrency-safety mechanism.
- **Budget enforcement** — hard cost ceiling cancels remaining tasks when exceeded,
  with real-time per-agent cost tracking.
- **Automatic retry** of failed tasks with configurable attempt limits (`--retry`).
- **Config surface:**
  ```
  claude-swarm --max-agents 4 --budget 5.0 "Refactor auth module"
  claude-swarm --dry-run "Task description"   # prints plan, no execution
  ```
  A `swarm.yaml` defines custom agent types, tools, and inter-agent `connections`
  blocks expressing task dependencies.
- **No** voting/consensus or same-task parallelism — it deliberately favors a
  dependency graph (divide-and-conquer) over redundancy.

---

## 2. Recommendations for OUR kanban-lane swarm

Mapped to commands/config where possible.

1. **Add a `--dry-run` / plan-gate to the orchestrator (cheap, high value).**
   Before fanning cards out across lanes, the orchestrator should emit the full
   decomposition (cards + lane assignment + dependencies) for one-glance human or
   self-review. This is claude-swarm's single best ergonomics win and maps cleanly
   onto kanban: render the proposed board state before committing cards.

2. **Make dependencies first-class on cards (dependency-aware scheduling).**
   Add a `depends_on: [card_id,...]` field to card schema. The orchestrator only
   moves a card from backlog→active when all `depends_on` cards are `done`. Today
   our lanes are profile-typed but ordering is implicit; explicit deps prevent a
   builder card starting before its researcher card lands.

3. **Model tiering per lane.** Adopt Hermes/claude-swarm's planner=strong,
   worker=cheap split explicitly: orchestrator/reviewer = Claude (Opus/Sonnet),
   bulk builder/researcher cards = Shay/Gemini-Flash (cheap). We already do this
   informally (Claude-orchestrator + Gemini-worker); formalize it as a per-lane
   `model` config so it's auditable and tunable.

4. **Add a hard `--budget` ceiling + per-card cost tracking.** A board-level token/
   credit budget that, when crossed, parks remaining `backlog` cards instead of
   running them. Directly relevant given the documented dual-vendor rate-cap risk
   (Codex + Anthropic can both be capped). Pairs with the always-available
   Gemini/Ollama fallback.

5. **Add a Phase-2.5 integration quality gate.** After a board's cards complete,
   one reviewer-lane card reviews the *combined* output (not each card in isolation)
   for integration seams, missed edges, security. This is distinct from per-card
   review and catches cross-agent inconsistency — especially valuable on deskbuild.

6. **Pessimistic file/resource locking on deskbuild.** When multiple builder cards
   touch the same repo, claim a lock per file/path (`{path -> card_id}`) so two
   builders never edit the same file. Cheap to implement as a board-scoped lock
   ledger; prevents the parallel-write race (which our own DNA already learned the
   hard way with the parallel-page logo race).

7. **Auto-retry with attempt cap on failed cards.** A failed card re-queues up to N
   times (config `max_attempts`) before moving to a `blocked` lane requiring human
   attention — instead of silently stalling the board.

8. **Same-task redundancy as an opt-in board mode (the diversity/adversarial ask).**
   Neither source builds this in, so it is net-new design for us. Recommended shape:
   a `redundancy: N` flag on a card spawns N independent workers (ideally
   *heterogeneous* — e.g. Claude + Gemini + a second Claude with a different system
   prompt) on the identical task, then a reviewer/orchestrator card runs a
   **merge/judge step**: pick-best, synthesize-union, or adversarial cross-check
   (each output critiques the others). This is exactly the two-pass A/B reconcile
   pattern this very research task uses. Reserve for high-stakes, low-volume cards.

---

## 3. Overlap vs net-new

**Already have (keep / formalize):**
- Role/lane specialization (researcher/builder/reviewer/orchestrator) ≈ Hermes roles.
- Orchestrator-driven fan-out across boards ≈ Hermes mission routing + claude-swarm
  decomposition.
- Kanban visibility (boards/lanes) ≈ Hermes Workspace dashboard.
- `adversarial_verify` skill ≈ claude-swarm Phase-2.5 review *and* is the natural
  engine for same-task merge/judge.
- `build_app` ≈ claude-swarm parallel worker execution.
- Claude-orchestrator + Gemini-worker ≈ the planner/worker model-tier split.

**Net-new to adopt:**
- Explicit `depends_on` dependency scheduling on cards (claude-swarm).
- `--dry-run` plan-gate before committing the board (claude-swarm).
- Per-board hard budget ceiling + per-card cost tracking (claude-swarm).
- Pessimistic file/resource locking for parallel deskbuild cards (claude-swarm).
- Auto-retry with attempt cap → blocked lane (claude-swarm).
- Combined-output integration gate distinct from per-card review (claude-swarm 2.5).
- **Same-task redundancy + merge/voting** — absent from BOTH sources; our own
  invention to design (extend `adversarial_verify` into a merge/judge step).

---

## 4. Risks / when NOT to use same-task redundancy

- **Cost multiplier.** N-way redundancy is N× spend on a card. Given the documented
  dual-vendor rate-cap exposure, broad redundancy can exhaust the weekly cap fast.
  Gate it to high-stakes cards only; default `redundancy: 1`.
- **Divergence with no clean merge.** For open-ended creative/build work, N outputs
  may be incomparable, making the merge step itself expensive and subjective. Best
  for tasks with a checkable answer (research claims, spec correctness, bug fixes),
  worst for free-form generation where "pick best" is a coin flip.
- **Latency.** Merge/judge adds a serial step after the parallel fan-out; not worth
  it for fast/cheap cards where a single pass + normal review suffices.
- **Reviewer becomes the bottleneck/single point of failure.** If one judge merges
  all redundant outputs, a weak judge silently negates the diversity benefit. Use a
  strong model for the judge, or make the judge itself adversarial (each candidate
  critiques the others before the judge decides).
- **Prefer decomposition over redundancy by default.** Both production systems chose
  divide-and-conquer (more coverage per dollar). Use redundancy as the exception for
  correctness-critical cards, not the norm.

---

## Citations
- https://goldstarlinks.com/hermes-agent-swarm/
- https://github.com/affaan-m/claude-swarm