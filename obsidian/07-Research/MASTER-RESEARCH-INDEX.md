# Master Research Index — what we paid for, organized

> Built 2026-06-04 by Claude (session on `main`). Consolidates the research that
> Shay's "Archaeologist" agent choked on — not because it was lost, but because it's
> **3.3 MB across 100+ files** and can't be summarized in one response. **None of it
> is lost.** This is the map. Status tags: ✅ research captured · 🟡 design captured,
> implementation partial · 🔵 evaluation/decision · 🏗 build record.
>
> Sources: `obsidian/Shay-Memory/research/` (41) · `…/learnings/` (11) · `…/builds/`
> (24) · `…/plans/` (19) · `data-center/jobs/` (11 research jobs).

## A. Shay-OS architecture & master plans
- ✅ `research/SHAY-OS-MASTER-PLAN-2026-05-31` — the OS master plan (lanes A–E + Z)
- ✅ `research/next-phase-architecture-2026-05-31` — next-phase AI-OS architecture
- 🟡 `research/agentos-port-plan-2026-05-31` + `agentos-port-delta-2026-06-01` — porting hermes-webui; delta = what's still missing
- ✅ `research/ai-os-discovery-report` — AI-OS research discovery (Fritz brief)
- ✅ `research/efficiency-future-map-2026-05-31` — master efficiency & future-capability map

## B. Memory & anti-drift (the "don't lose work" research)
- ✅ `research/memory-lifecycle-design-2026-05-31` — capture / save+compact / dream / recall
- ✅ `research/anti-drift-system-design-2026-05-31` — anti-drift system
- ✅ `research/completion-watcher-design-2026-05-31` — outcome from EVIDENCE, not self-report ← *directly relevant to today's "research lost" misfire*
- 🔵 `research/claude-mem-evaluation-2026-05-31` · `tencent-agent-memory-adopt` · `turbovec-adopt` · `rlm-rs-adopt` — memory-backend evaluations

## C. Swarm orchestration & build coordination
- ✅ `research/swarm-patterns-passA` + `passB` + `swarm-upgrades-reconciled-2026-05-31` — orchestration patterns (two independent passes, reconciled)
- 🔵 `research/swarm-worktree-verdict-2026-05-31` — worktree isolation verdict
- ✅ `research/kanban-setup-correct-2026-05-31` — correct multi-agent kanban
- ✅ `research/build-coordinator-design-2026-06-01` · `build-tracker-design-2026-05-31` — safe concurrent builds + pattern capture
- ✅ `research/escalation-ladder-design-2026-05-31` — "try harder until she genuinely can't"

## D. Models & providers
- ✅ `research/free-models-discovery-2026-05-31` + `learnings/free-tier-caps-note` — free/open worker-lane brains
- ✅ `research/train-our-own-models-strategy-2026-05-31` — train-our-own (local LoRA)
- ✅ `research/provider-self-registration-design-2026-05-31` — Shay adds/auths providers herself

## E. Tool/project adoption evals (reuse-before-build)
- 🔵 `research/openjarvis-evaluation` + `openjarvis-adopt-impl-2026-05-31` — OpenJarvis
- 🔵 `research/page-agent-review` · `plugins-discovery` · `caveman-scoped-install-2026-05-31`
- 🔵 `learnings/external-research-scan-2026-05-30` — projects evaluated, reuse verdicts

## F. Capabilities & gap analysis
- ✅ `research/hermes-capabilities-audit-2026-05-31` — what we use vs. leave on the table
- ✅ `research/missed-capabilities-impact-map` · `capability-map-2026-05-31` · `community-gap-discovery-2026-05-31`

## G. ADOPT plumbing (Track 4 — token-hygiene + memory + capabilities)
- ✅ `research/ADOPT-PLAN-2026-05-31` — Shay-side plumbing plan
- 🏗 `research/track4-safe-prep-2026-05-31` + `track4-safe-subset-done-2026-05-31` — safe FS-only subset DONE

## H. Features & strategy
- ✅ `research/interview-types-2026-05-31` — W6 interview feature
- ✅ `research/mobile-macmini-strategy-2026-05-31` — mobile + Mac Mini home server
- ✅ `research/cross-agent-context-layer-2026-05-31` — universal cross-agent context (→ shipped as AGENT-CONTEXT.yaml)
- 📥 `research/bookmarks-ingest` — Chrome research bookmarks (raw, to mine)

## I. Learnings (process & retros — the durable lessons)
- ✅ `learnings/PROCESS-GAP-done-means-works-2026-05-31` — "done" = runs + reachable + looks right + usable
- ✅ `learnings/self-healing-lesson` · `phase1-lessons` · `process-improvements` · `session-lessons-2026-05-31b`
- ✅ `learnings/UI-SPRINT-LESSONS` · `planning-lesson-2026-05-30/31` · `skill-recommendations-2026-05-30`

## J. Data-center research jobs (May 19–21 — media/studio workflow research)
- `jobs/research-2026052119xx-phase2a-*` (5) — brand-kit production, AI logo readiness, media-studio UX, React brand animation
- `jobs/research-20260521171xx-*` (4) — post-eval learning loops, logo/brand workflow, website-builder enhancement, component-studio registry
- `jobs/research-20260519225xx-*` (3) — perplexity metadata proof, swarm research-synthesis structure, research-shaped SDD

## K. Build records & plans (execution trail)
- `builds/b_*.md` (24) — the overnight master-plan build records
- `plans/` (19) — MASTER-PLAN, FINAL-PLAN-to-done, desktop plans v1–v3, companion-app PRD, skills-disclosure, capability-backlog

---

## What's still genuinely missing (the only real gap)
- **Codex transcripts from June 2** (`~/.codex/sessions/`) — NOT yet harvested; run
  `scripts/recover-codex-research.sh 2026-06-02` on the Mac. This is the one source
  not already in the brain.
- **`portfolio-revenue-model.md`** (~10.5 KB, the "1000-site revenue model") —
  referenced by build records, committed to no branch. Recover or mark artifact-lost.

Everything else above is **already in the brain and safe.** The effort was not for nothing.
