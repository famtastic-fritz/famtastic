---
title: ADVERSARIAL-REVIEW-master-plan-2026-05-31
type: review
permalink: shay-memory/reviews/adversarial-review-master-plan-2026-05-31
---

# Adversarial Review — Shay-Shay OS Master Plan (2026-05-31)

**Mandate:** try to REFUTE the plan before committing a full autonomous Shay-swarm build to it.
**Method:** read the 4 planning docs + the actual machinery (`.ralph/loop.py`, `components/swarm/pipeline.py`,
`components/swarm/goal_loop.py`, `local_swarm_dispatcher.py`, `shay_cli/kanban*.py`, desktop `App.tsx` + `manifest.ts`).
**Verdict (short):** **NOT safe to run as a "full autonomous free-swarm build" as written.** The build *engine* (ralph + build_app, on Claude) is genuinely production-grade and proven — but four load-bearing premises of the master plan are **not implemented in code, or are contradicted by it.** Run the engine as-is on Claude with a corrected card spec; do NOT flip the build lane to free/Gemini and do NOT assume claim-locked parallelism exists. Fix the BLOCKERS below first.

---

## BLOCKERS (must change before an autonomous run)

### B1 — "Shay's Gemini/free swarm builds the desktop screens" is contradicted by the proven engine. (Feasibility / lens 1)
**Refutation.** The plan's headline premise is that the free/local swarm does the bulk desktop build (master-plan §RUN, §ADOPT-4 lane mapping; build-order #1). But the *working* autonomous builder does the opposite: `.ralph/loop.py` calls `build_app(..., brain="claude")` explicitly (loop.py:326), and `build_app`/`multi_file_code_job`/`_syntax_validate_and_repair`/`surgical_patch` **all default `brain="claude"`** (pipeline.py:1042, 691, 589, 1483, 1532, 1643, 1808). The PRD's done units (U1–U5+) were built on Claude. Flipping the design-sensitive renderer build to `qwen3-coder:free`/Gemini is a **regression from a known-good config to an unproven one**, on exactly the file class (React/TSX render-spine) the codebase has the most scar tissue about.
**Why it will thrash on free brains specifically.** The repair ladder reads only `existing[:6000]` chars of a file for editing (pipeline.py:732) and `src[:16000]` for syntax repair (pipeline.py:652, 905). Weaker models that full-regenerate within that window are precisely what produced the documented `App.tsx` TS17008 dropped-`</ThemeProvider>` class (`_is_render_spine`, pipeline.py:1162; ralph U1 lesson in-code). Free brains have weaker long-context fidelity and weaker JSX/design sense → more brace-drops, more anchor-misses (fuzzy match silently degrades to exact on <3.10, loop.py:24-31), more block→revert cycles burning the 4-iteration budget without progressing.
**Fix.** Keep `brain="claude"` for every UI/renderer/`build_app` card. Restrict free/Gemini lanes to *research*, *non-UI scaffolding*, and the *vision judge* (already Gemini, correctly). If you want a free build experiment, gate it behind a separate board with a hard `--units` allowlist of trivial non-spine files and compare block-rates before trusting it. Make the lane→brain rule explicit in `swarm.yaml`: builder-lane-for-renderer == claude, not free.

### B2 — Kanban-layer file-scope claim-locking does NOT exist; it is 100% planned. Parallel build cards are unsafe today. (Merge/collision + claim-lock implemented? — lens 2)
**Refutation.** The master plan's #1 RUN win and the swarm-upgrades doc's #2 ("removes the serialize-builds constraint") both depend on per-card `claims:` (file/path) locking so the dispatcher refuses overlapping cards. **It is not in the code.** What exists in `kanban_db.py` is *task-level* CAS via `claim_lock`/`claim_expires` (kanban_db.py:574, 767; "at most one claimer can win any given task", :62-64) and a 15-min TTL with `release_stale_claims`. That guarantees one worker per *task* — it says nothing about two different tasks editing the same *file*. Grep for a file-scope `claims`/`file_scope`/overlap field across `kanban*.py` returns only comments. `task_links` exists (dependency edges) but there is no pull-guard wiring it to promotion.
**And the actual runner is serial anyway.** `.ralph/loop.py` is a single `while True` loop processing one story at a time (loop.py:473-482); `WorkerPool(num_workers=3)` parallelizes the *sub-files within one build_app call*, not cards. So today there is no parallel-card collision because there is no parallel-card execution — but the moment you "remove the serialize constraint" as the plan says, you have **zero file-collision protection**.
**Where collisions land even with task-CAS.** `App.tsx` (the screen registry + every import — App.tsx:251-288), `manifest.ts` (the `ScreenId` union + `SCREENS` — every new screen edits it), and shared shell/CSS (`AppShell`, `Sidebar`, `main.css`). The manifest's compile-time `Record<ScreenId, ReactNode>` is a *drift catcher*, not a *merge-conflict preventer*: two cards each adding a screen both edit `manifest.ts` and `App.tsx`, and serial scoped commits will silently clobber each other's anchored edits or fail the typecheck of whichever lands second.
**Fix.** Either (a) keep builds serial (the proven mode — accept the speed cost), or (b) actually implement file-scope claims before parallelizing: add a `claims TEXT` (JSON path-glob list) column to `tasks`, and a dispatcher guard that refuses to promote a card whose claims intersect any running card's claims. Until (b) ships and is tested, **the "parallel build cards are safe" claim is false** and build-order #1 must be descoped to "lane mapping + budget/retry only, builds stay serial."

### B3 — Hidden hard dependency: `manifest.ts` + `App.tsx` are a single-writer chokepoint that breaks out-of-order/parallel builds. (Sequencing + collision — lens 4/2)
**Refutation.** Every new-screen card (Inbox, Insights, Security, Agent OS native ports, MCP split) must touch BOTH `manifest.ts` (add to `ScreenId` union + `SCREENS[]`) and `App.tsx` (`import` + `screenRegistry` entry). The grounding text in loop.py:311-318 already documents this as a repeated block class. The compile gate makes it *worse* for parallelism: a screen added to `manifest` but not `App.tsx` (or vice-versa) is a guaranteed typecheck failure → revert. So manifest/App edits are an implicit global serialization point regardless of file-claims.
**Fix.** Treat `manifest.ts` + `App.tsx` registry wiring as a dedicated, single-card "wiring pass" run AFTER a batch of new-screen component files exist (components first as standalone files, then one wiring card stitches them in). Never let two cards co-edit the registry. Add `manifest.ts` + `App.tsx` to a reserved global-claim that only wiring cards may hold.

### B4 — The discovery doc that seeds the cards is STALE on its two highest-ROI items. (Completeness / correctness of inputs — lens 5)
**Refutation.** PER-PAGE-UI-DISCOVERY ranks "#1 Wire Kanban + Gateway (kill the `<div>` stubs)" as the top XS/huge win and repeatedly calls them "dead-wired," "ship dark," "shipped parity = zero." **This is already false in the current tree.** `App.tsx` imports `KanbanReal from './screens/Kanban/Kanban'` (App.tsx:30) and `GatewayReal from './screens/Gateway/Gateway'` (App.tsx:31) and both are live in `screenRegistry` (App.tsx:265, 268). The `<div>` stubs and redundant `index.tsx` are gone. If cards are generated verbatim from this doc, the agent will be told to "wire the already-wired component," wasting a cycle or re-introducing a regression.
**Fix.** Re-baseline the discovery doc against HEAD before card generation. Downgrade item #1 (Kanban/Gateway wiring) to "verify + deepen" not "wire." Audit every "STUB/dead-wired" claim in the doc against `App.tsx` imports — the doc predates the U1 router-scaffold work that already fixed the registry.

---

## HIGH

### H1 — Gate sufficiency: the QA gates can be silently skipped, and "degrade gracefully" is a truncation/escape hatch. (Gate sufficiency + silent truncation — lens 3/6)
**Refutation.** Gates 4 (contract) and 5 (vision) follow a "infra failure → WARN, don't block" contract (loop.py:261-298, 372-384). That is correct for resilience but is also a **silent-pass channel**: if `qa_gate.mjs`/`visual_qa.py` is missing, Playwright can't launch, the screenshot isn't captured, or the call times out (120/90s), the unit is marked **done** having passed only typecheck+build. A free-brain UI that compiles but renders a blank/broken screen would slip through whenever the vision infra hiccups. There is no counter that says "vision gate has now degraded N times in a row — stop and alert." Combined with B1 (free brains produce more weak UI), this is the most likely way a bad build is marked done.
**Fix.** Add a *degradation budget*: if the contract or vision gate degrades (not passes) more than e.g. 2× in a run, the loop should halt and heartbeat-alert rather than keep marking units done on typecheck alone. Log a per-run tally of pass/degrade/fail per gate. For UI units specifically, treat "no screenshot captured" as a soft-block (retry once) not a silent skip.

### H2 — Goal-until-done loop: budget exists but retry is unbounded across re-runs, and `--units` resets state. (Runaway / infinite-retry — lens 6)
**Refutation.** Within one card, `build_app` is capped at `max_iterations=4` and `goal_loop` has `budget=20` turns with a `BUDGET_EXHAUSTED` synthesize-and-ask (goal_loop.py:58, 97-105) — good. But at the *loop* level there is **no cap on total re-attempts**: `--units U13,U8` resets those stories to `pending` and strips `reason`/`prior_art` (loop.py:438-441), so a human (or a scheduler/cron card) re-running the same failing units re-burns full build+gate cost every time with the diagnostic context discarded. There is also **no per-board budget ceiling or cost tracking** in the runner — the swarm-upgrades doc lists "per-board budget + bounded retries + cost tracking" as ADOPT, confirming it's not built. A `cron`-driven autonomous re-run of a board with 1 permanently-blocked unit loops forever at full cost.
**Fix.** Add (a) a per-story `attempts` counter that survives `--units` reset; after N (e.g. 3) attempts a unit goes `blocked-hard` and is excluded from auto-retry, requiring explicit human flag. (b) A per-run wall-clock + token/$ ceiling that stops the loop. (c) Do not strip `prior_art` on `--units` reset — feed it back in as grounding so retries start from the known fix, not zero.

### H3 — Adversarial-verify can false-kill or no-op depending on a magic threshold; same-vendor correlation undermines redundancy. (Gate sufficiency — lens 3)
**Refutation.** `run_job`'s adversarial gate only fires if BOTH `adversarial_verify` AND a numeric `adversarial_verify_score` are set (pipeline.py:918-923); otherwise it's skipped. So a card spec that sets `adversarial_verify: true` but forgets the score gets **no verification while appearing verified**. Separately, `adversarial_verify` defaults all brains to `"auto"` (pipeline.py:646) → likely the same vendor as the author → correlated errors, exactly the weakness the swarm-upgrades doc admits ("today's passes were both Claude → correlated"). The plan's cross-vendor redundancy (Claude+Gemini) is design-only, not wired into the verify primitive.
**Fix.** Make `adversarial_verify_score` required-or-default (don't silently skip). For high-stakes cards, force `brain` lenses to be cross-vendor (1 Claude + 1 Gemini minimum) in the primitive, not just the prose.

---

## MEDIUM

### M1 — Completeness: several non-postponed plan items have NO concrete card-level plan. (Completeness — lens 5)
Items with a real plan source: per-page parity, Inbox, Insights, Security group, Skills manager, Agent Monitor, Chat composer, Sessions/Profiles/Cron/Models/Providers depth (all in PER-PAGE-UI-DISCOVERY Part 4 with effort/impact). Agent OS native port has phase/card breakdown (agentos-port-plan §3).
**Items with NO concrete plan (named in master plan but not decomposed anywhere I can find):**
- **Provider self-registration "+ Add Provider" modal** — master-plan §BUILD says "wire the stubbed `shay:auth:*` channels to shell out," but no card defines the IPC handler contract, the OAuth-device-code flow UI, or the `shay auth add` argument mapping. This is the unlock for Step-3.7-Flash and is build-order #2 — it cannot be a one-liner card.
- **Models registry page CRUD + "set as lane brain"** — `data/models-registry.json` render is named but the "set as lane brain" write-path (which file does it mutate? `swarm.yaml`? policy?) is undefined. The lane-brain concept itself has no schema yet.
- **Swarm RUN upgrades** — dependency-graph wave scheduling, per-board budget, integration-review-per-wave, `--dry-run` board plan-gate, versioned lane bundles (`swarm.yaml`): all listed as ADOPT/RUN but **none exist in code** (confirmed: `goal_loop` has `depends_on` on subgoals but no wave scheduler; no `swarm.yaml`; no per-board budget). These are net-new engine features, not config flips, and are the literal foundation of build-order #1.
- **ADOPT plumbing** (credential pools, rtk/token-optimizer, MCP P0, PM2/CasaOS) — these are Hermes-config/infra tasks with no acceptance criteria or owner card.
- **Chat 1:1 parity** specifics (top-right terminal/bg-tasks, breadcrumb, workspace/inline) — listed but not mapped to the existing `Chat.tsx` surface.
**Fix.** Before the build, each of the above needs a one-paragraph card with: target file(s), IPC/CLI contract, acceptance gate. The RUN-upgrade items especially must be acknowledged as **engine work that must precede any parallel-build claim**, not parallel ADOPT.

### M2 — Sequencing: build-order #1 ("swarm RUN upgrades unblock everything") is itself the riskiest, least-built item and gates the rest. (Sequencing — lens 4)
**Refutation.** The ranked order front-loads the one thing with zero existing implementation (claim-locking, wave scheduler, per-board budget) and justifies it as the unblocker for parallel building. If #1 slips or ships buggy, either everything waits, or (worse) teams parallelize on top of unproven locking and hit B2 collisions. Meanwhile the *actually-proven* path (serial ralph on Claude) is sidelined.
**Fix.** Re-order: do the **serial Claude build of the per-page parity + new screens FIRST** (proven engine, no new infra), and treat swarm RUN upgrades as a **parallel R&D track** that only flips the build lane to parallel once claim-locking is implemented AND validated on a throwaway board. Don't gate the whole desktop build on un-built orchestration.

### M3 — Vision gate depends on Gemini availability, which the plan itself says is capped. (Gate sufficiency — lens 3/6)
The captured constraint (`project_codex_subscription_capped`, `project_codex_subscription_capped`) notes both vendor brains can be down at once; always-available = Gemini Flash + Ollama. But GATE 5 vision *is* Gemini. If Gemini is rate-capped during a long autonomous run, every UI unit's vision gate degrades-to-skip (H1) → UI quality goes unchecked exactly when you're leaning hardest on it.
**Fix.** Add an Ollama-vision or local-screenshot-heuristic fallback for the vision gate, or make repeated vision degradation a hard stop (ties to H1).

---

## LOW

- **L1 — `_RALPH_REEXEC` venv shim is load-bearing and fragile.** loop.py:24-31 re-execs under `shay-shay/.venv` to get 3.10+ union syntax; if that venv path moves, fuzzy matching silently degrades to exact (more anchor-misses). Add a hard assert that fuzzy_match imported, log loudly if not.
- **L2 — Scoped commit can still entangle `manifest.ts`/`App.tsx`** since multiple cards legitimately list them in `files_written`; the scoped-commit (loop.py:71-76) stages only the unit's files but consecutive cards touching App.tsx will produce churny diffs and complicate any future parallelization.
- **L3 — Interview/Setup is correctly scoped as a flow (not nav) screen** in the discovery doc — no issue, just confirm it doesn't get a `manifest.ts` `ScreenId` card by mistake.
- **L4 — `_balance_scan` only repairs EOF brace-drops, not mid-file** (pipeline.py:1013-1081, documented). Free brains drop closers mid-file more often → falls through to capped brain repair → more budget burn. Reinforces B1.

---

## VERDICT

**Is the plan safe to run as a full autonomous Shay-swarm build? No — not as written.** The *build engine* (ralph loop + gated `build_app` on Claude, with typecheck → build → contract → vision gates and scoped rollback) is real, proven, and impressive. But the master plan layers four unbuilt/contradicted premises on top of it:

1. **Free/Gemini swarm builds the UI** — contradicted by the proven Claude config and the truncation/render-spine scar tissue (B1).
2. **Parallel build cards are safe via claim-locking** — claim-locking is not implemented; only task-level CAS exists; the runner is serial anyway (B2).
3. **Swarm RUN upgrades are config to flip** — they are net-new engine features that gate the whole build order yet don't exist (M1/M2).
4. **The discovery doc is current** — it is stale on its #1 item (Kanban/Gateway already wired) (B4).

**What MUST change first, in order:**
1. **Keep the build lane on Claude** for all UI/renderer cards (revert B1 premise). Free brains for research/non-spine only.
2. **Re-baseline the discovery doc against HEAD** and regenerate cards from the corrected state (B4).
3. **Run builds SERIALLY** (the proven mode). Do NOT remove the serialize constraint until file-scope `claims` locking is actually implemented and validated on a throwaway board (B2/M2).
4. **Make `manifest.ts` + `App.tsx` a single reserved wiring card** per batch; never co-edited (B3).
5. **Add a degradation-budget + hard attempt-cap + per-run cost ceiling** to the loop before any unattended/cron run (H1/H2).
6. **Write concrete cards** (file + contract + gate) for provider self-reg, models registry, and the swarm RUN-upgrade engine work before scheduling them (M1).

Run the engine in its proven configuration on a corrected, serial card set and it will produce real, gated work. Run it in the plan's aspirational configuration (free-swarm, parallel, locking-assumed) and it will thrash, collide on the registry, and silently mark weak UI as done.
