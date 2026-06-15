# Shay Platform Build — YOLO Swarm Kickoff

## Purpose
Execute the Shay Platform build (Phases 0–9) as described in `~/basic-memory/plans/SHAY-BUILD-CLAUDE-YOLO-SWARM-2026-06-08.md`. Run full YOLO — high autonomy, no per-step gating, self-driving phase to phase. The only stops are spec failures hitting 3× (escalate to Fritz) and Phase completion (brief checkpoint, then continue).

## Blocking Decisions — RESOLVED

1. **Git topology (Ph0):** Monorepo in `famtastic-fritz/shay-shay`. Anatomy dirs at root — Brain/, Spine/, Heart/, Digestive/, Senses/, Immune/, Organs/, Skin/. Main branch is `main`. Each phase gets a feature branch (`phase-0-harness`, `phase-1-spine`, etc). Merge to main after Sonnet verify gate passes. Worktree isolation for all parallel Haiku builds.

2. **Schema authority format (Ph1):** TypeScript interfaces + JSON Schema validation. No YAML, no Zod. Keep it boring and standard. Every contract in Spine gets a `.schema.json` file alongside its `.ts` interface.

3. **Memory store + re-embedding (Ph2):** Read-only bridge to basic-memory during build. New platform writes to its own store. Old basic-memory stays untouched as source of truth until Ph9 cutover. Embedding model: Ollama nomic-embed-text (free, local). No metered embedding API. Do NOT migrate anything until Ph9.

4. **state.db migration window (Ph2):** Don't migrate until Ph9 (Consolidation & Cutover). During Ph2–8, new Heart reads from old state.db as fallback data source only. Full migration happens once, after Ph6 (The Doctor) validates everything green. One migration, one cutover, not a rolling migration.

## Execution Rules

- **Two tiers only:** Haiku for grunt work (scaffold, boilerplate, mechanical edits, test runs, doc-gen). Sonnet for judgment (build-spec authoring, design choices, code review, adversarial verify, DoD pass/fail). NO Opus. Any would-be-Opus moment = escalate to Fritz.
- **Different-tier verify:** Haiku builds it, Sonnet refutes it. Never same tier reviewing its own work.
- **Worktree isolation:** Every Haiku builder runs in its own worktree. Parallel edits never clobber each other. Auto-clean unchanged worktrees.
- **Per-phase workflow:** Sonnet decomposes phase into build-specs → Haiku swarm builds (parallel, worktree-isolated) → Sonnet gate+refute → completeness critic → loop until dry → merge to main → next phase.
- **Autonomy:** YOLO mode. Accept edits, sandboxed bypass, no per-step approval. Self-drive through all phases.
- **Failure handling:** Spec fails verify → retry build (max 2). After 3 failures on same spec → escalate to Fritz. Otherwise keep moving.
- **Budget:** Per-phase budget cap. Fan-out scales to remaining budget. If budget can't cover next phase → stop and report, don't silently skip.
- **Between phases:** Brief checkpoint log (what shipped, what's deferred, what failed). Then continue. Don't stop for approval between phases unless something broke.

## Phase Reference

| Phase | Anatomy | What Ships |
|-------|---------|-----------|
| 0 | Harness & Foundation | Repo scaffold (anatomy dirs), per-phase Workflow template, LOCKED.json, provenance tooling, Doctor-gate stub |
| 1 | Spine (Kernel) | Schema/contract registry, event bus, vault, capability-registry interface |
| 2 | Heart (Memory Fabric) | Memory API, tiered store, write-shims, state.db read-through bridge |
| 3 | Brain (Orchestrator+Router) | Brain router with REQ-14 resume, Dispatch Planner, Anticipation Engine v1 |
| 4 | Digestive (Ingestion Protocol) | 4-stage pipeline (decompose→normalize→register→verify), facet adapters, skill normalizer. Ingest Hermes = run #1 |
| 5 | Senses | MCP bridge, A2A support, OASF adapter, Release Radar |
| 6 | Immune (The Doctor) | Self-diagnostic, full DoD gate, authority tiers 0–4, config-mismatch checks |
| 7 | Organs | Register Site Studio, promote site_bridge via contract system |
| 8 | Skin | Desktop/web/phone/CLI thin gateway clients |
| 9 | Consolidation & Cutover | Retire silos, one source of truth, Doctor green, final cutover |

## What To Do RIGHT NOW

1. Read the full plan at `~/basic-memory/plans/SHAY-BUILD-CLAUDE-YOLO-SWARM-2026-06-08.md`
2. Read the companion plan at `~/basic-memory/plans/SHAY-BUILD-IMPLEMENTATION-PLAN-2026-06-08.md`
3. Read the architecture reference at `~/.shay/skills/shay-shay/references/shay-platform-architecture.md`
4. Clone or enter the `famtastic-fritz/shay-shay` repo
5. Execute Phase 0 — scaffold the repo, create anatomy dirs, set up the per-phase Workflow template, stub the Doctor gate
6. Verify Phase 0 passes Sonnet review
7. Continue to Phase 1. Then Phase 2. Keep going until all 9 phases are done or you hit an escalation.

**Do not stop between phases for approval.** Log progress, commit, continue. Fritz will check on you. If something breaks 3×, stop and report. Otherwise: full send.

## Commit Rules (Non-Negotiable)

- NEVER reference Claude, AI, Codex, Haiku, Sonnet, Opus, "generated", "assisted", or any AI-related terms in commit messages
- Every commit reads as if a human developer wrote it
- Use conventional commit format: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`
- Commit per logical unit, not per phase dump

## Reporting

After each phase completion, append a brief entry to `~/famtastic/CHANGELOG.md`:
```
## YYYY-MM-DD — Phase N: [anatomy name]
[2-3 sentences: what shipped, what was deferred, what needs attention.]
```

---

Go. Build Shay.
