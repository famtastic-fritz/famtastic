---
title: Shay Master Plan — Next Execution Arc (adversarially reviewed)
date: 2026-05-30
author: shay-master-plan-adversarial workflow (6 agents)
tags:
- plan
- ralph
- recovery
- adoption
- adversarial-reviewed
- run-in-one-go
permalink: shay-memory/plans/master-plan-next-arc-2026-05-30
---

> ## ▶ EXECUTION STATUS (updated 2026-05-31)
> - [x] **Phase 0** — loop hygiene (scoped commit/rollback, --units, run-state) ✅
> - [x] **Phase 1A** — new-file brace-drop deterministic repair ✅
> - [x] **Phase 1B** — anchor-miss re-anchor ✅
> - [~] **Phase 1C** — recover blocked units: **17/20 landed**; 3 left (U5 JSX-tag, U8/U14 App.tsx edit hygiene)
> - [x] **Phase 2** — functional launch test ✅ (found+fixed dead preload bridge + window.hermesAPI undefined; app boots, IPC alive)
> - [ ] **Phase 3** — adoption tracks (tool-registry, obsidian-wiki, SkillNet, memory spike, Kanban) + companion app — NEXT
> - Bonus fixes landed: 7 code-review findings; path-doubling resolver bug; Telegram push notifications.
> - Directive: run to completion, fix bugs in-loop, DEFER decisions to end.



# SHAY MASTER PLAN — Next Execution Arc (FINAL, 2026-05-30)

## Summary
11/20 PRD units have landed (cumulative typecheck:web + typecheck:node + production build GREEN, tree clean); 9 are blocked-and-rolled-back in three failure classes: NEW-FILE brace-drop from `multi_file_code_job` full-regen (U4/U5/U9/U15/U16), anchor-miss on shared existing files (U8/U14), and generic/infra (U3/U13). This plan recovers the 9 as first priority by fixing the pipeline mechanism **deterministically first** (balance-scanner closer-insertion + `npx prettier --check` per-file pre-gate, with a brain repair reserved and capped), then closes the never-launched testing gap with an **automated Electron+Playwright harness** (not a manual checklist), then runs adoption tracks ordered by cap cost behind hard vault-hash and provenance gates. The whole arc is reframed as a **checkpointed run with human/phone sign-off gates**, not one unattended sitting, because the realistic brain-call budget (60–120+ Opus-class calls) can exhaust the weekly cap mid-arc and silent Gemini/Ollama fallback is a quality cliff for precision code edits.

---

## PHASE 0 — Loop hygiene: scoped commits AND scoped rollback [PREREQUISITE, deterministic, ZERO cap]

**Objective:** Stop both the `git add -A` commit sweep (loop.py:225) AND the repo-wide `git checkout -- .` rollback blast radius (loop.py:214) from touching files outside the active unit. Both are destructive defects; Phase 0 fixes both, plus arms the loop to even know which files a unit touched.

**Exact changes to `.ralph/loop.py`:**
1. **Derive the touched set from runtime, not from a `files` key.** `prd.json` stories have only `{id,title,goal,kind,status,elapsed_sec}` — there is NO `files` field (verified). `build_app` already returns `result["result"]["files_written"]` (absolute paths, read at loop.py:222). Capture that list per unit.
2. **Scoped stage:** replace `git add -A` with `git add -- <files_written> .ralph/prd.json`. Explicitly include `prd.json` (it is mutated every unit via `save_prd`; excluding it desyncs committed code from committed PRD state).
3. **Scoped rollback:** replace `git checkout -- .` with `git checkout -- <files_written> .ralph/prd.json` PLUS `git clean -f -- <new-file-paths>` (checkout ignores untracked new files; clean removes them). New vs modified is determined by `git ls-files --error-unmatch` per path before the unit runs.
4. **Single rollback authority:** loop.py owns rollback against HEAD. `multi_file_code_job`'s internal manifest-snapshot rollback (pipeline.py:664–675) stays for in-job failures, but on unit-level block the loop's scoped git checkout is authoritative — so Phase 1A repair must never leave a half-repaired *untracked* file (the `git clean -f` covers it).
5. **Add `--units U3,U4,...` / `--only` arg parsing.** The loop today only parses `--one`/`--dry-run`; `--units` is silently ignored. Add it so 1C can target the 9.
6. **Run-state ledger.** Write `.ralph/run-state.json` after every unit/track gate: `{unit_id, status, files_written, brain_calls, provider, committed_sha}`. Cold restart resumes from last green checkpoint instead of re-deriving from git log.
7. **Pre-run tree prep:** commit the existing dirty doc tree as ONE isolated commit on the current branch BEFORE the loop runs (not stash — a unit rollback could strand a stash). Working tree genuinely clean afterward.

**GATE (fail loudly):** Run a **synthetic no-op unit** (touch one declared file — NOT a re-run of real brain-backed U20, whose gen is non-deterministic and would produce a spurious diff). Assert `git diff --cached --name-only` equals EXACTLY `files_written ∪ {.ralph/prd.json}`, stage is non-empty, and a simulated rollback touches only those paths. Empty stage = hard fail.

**Parallel/seq:** Sequential, first. **Brain:** none (deterministic). **Rollback:** revert the loop.py edit; the isolated doc commit is unaffected. **Dependencies:** none.

---

## PHASE 1 — Recover the 9 blocked units [PRIORITY]

> **1A and 1B are SERIALIZED, not parallel.** Both edit `pipeline.py`; concurrent writes race. One agent applies 1A, commits, then 1B, commits. (Critic-sequencing high.)

### 1A — Fix the NEW-FILE brace-drop class (deterministic-first) [code-capable brain only]
**Objective:** Make `multi_file_code_job` (pipeline.py:536) emit syntactically valid new files WITHOUT full-regen loops, and without trusting a stochastic model to re-close its own dropped brace.

**Mechanism (corrected per critics — deterministic repair is primary, brain is last resort):**
1. **Per-file `npx prettier --check` BEFORE the project typecheck.** Call the binary directly with an explicit `--parser` (`typescript`/`babel-ts`). Do NOT use `npm run format` — that is `prettier --write .`, whole-tree mutating, and would detonate Phase 0's scoping. Prettier needs no import resolution, so it runs per generated file (project `tsc` cannot attribute a project-wide error to one file — pipeline comment line 488 confirms "per-file tsc can't resolve project imports").
2. **Treat ONLY parse errors as repair triggers, not style diffs.** A prettier config mismatch fails `--check` on valid files; gate repair on prettier *parse failure* (unparseable) + the cited `tsc` codes TS1005/TS1128/TS17008, never on formatting opinions.
3. **Deterministic balance-scanner repair FIRST.** On parse failure, run a string/comment/template-literal/regex/JSX-aware scanner (NOT a naive counter — naive counters false-positive on `{'}'}` etc.) to locate the actual unbalanced scope and append the missing closer(s) at scope-end. Do NOT trust the compiler's reported line:col as the edit site (a dropped `{` on line 2 surfaces as an error at 3:3 — inserting there produces a valid-but-wrong file). Re-run prettier `--check`. Most brace-drops close here with zero brain.
4. **Brain repair ONLY if deterministic fails, hard-capped.** Feed the brain the full offending file + the diagnostic as *context not edit-site* + constrained instruction. Cap at 2 attempts per file AND a **per-run global repair-call budget**. The repaired file must pass prettier `--check` AND the unit's render-autogen smoke AND typecheck before acceptance (prettier checks syntax, not correctness — logic drift must be caught).
5. **Brain tier is pinned.** Repair is a precision edit. If the only available brain is Gemini/Ollama, **PAUSE the unit and checkpoint** — do NOT attempt the repair on a weak model (it produces MORE malformed TSX and burns the 2-attempt budget, then rolls back looking like a code failure). Log the downgrade as the abort reason.

**Files:** `pipeline.py` — new `_syntax_validate_and_repair(file_path)` near `_fuzzy_replace` (493); call inside `multi_file_code_job` after each file write, before the gate. New `_balance_scan(src)` (language-aware closer finder).

**GATE:** Swarm unit test — brace-dropped TSX fixture closes deterministically with ZERO brain calls and passes prettier `--check`; a second fixture the scanner can't close routes to ≤2 brain repairs then passes typecheck+smoke.

**Brain:** code-capable tier only (Claude/Codex), pause-not-downgrade. **Rollback:** revert pipeline.py edit. **Dependencies:** Phase 0.

### 1B — Fix the anchor-miss class [code-capable brain only]
**Objective:** Land U8 AgentMonitor + U14 Diagnostics. Tighten the real gap: `surgical_patch` (680) already loops `max_iterations=4` re-prompting with `last_error`, and `_fuzzy_replace` (493) already tries hermes `fuzzy_find_and_replace`. The defect is iterations 2–4 re-prompt with the SAME anchor → identical miss (exactly what blocked U8/U14).

**Mechanism:** On miss, pass the brain the FULL current file + intent and require it to RETURN a fresh anchor string copied verbatim from that file. Assert `anchor in text` deterministically BEFORE spending a brain call on the replacement. Add a structural-landmark fallback (export name / interface name / `data-` attr) instead of a long literal block.

**Files:** `pipeline.py` (`surgical_patch`, `_fuzzy_replace`). **GATE:** Re-run U8 + U14 → both pass typecheck + render-autogen smoke + production build, scoped auto-commit. **Brain:** code-capable, pause-not-downgrade. **Rollback:** revert edit. **Dependencies:** Phase 0; serialized AFTER 1A.

### 1C — Re-run the 9 blocked units [CHECKPOINTED, code-capable brain]
**Objective:** Drive U3,U4,U5,U8,U9,U13,U14,U15,U16 to GREEN + scoped commits.

**Pre-step (verify gates before trusting them):**
- Confirm `runtime_render_gate` runs `npx vitest run {rel}` (line 818) scoped to ONLY the single autogen test file with NO global setup that pulls the 64 failing suites. If a shared setup throws, the smoke fails for reasons unrelated to the unit. Verify before the run.
- **Snapshot the 64 failing test IDs on the current clean HEAD now** (`npx vitest run` → record exact IDs). This is the falsifiable baseline: only these IDs may later be skipped; any NEW failure after Phase 1 is a hard stop. Without this, "pre-existing" is unfalsifiable.
- U13: capture its actual stderr before classifying as infra. "exit 2" from `npm run build` is usually a real tsc/electron-vite failure or a 180s/600s timeout, not a free retry. If TS error → route to brace-drop/anchor class; if timeout → raise timeout or split unit; only blind-retry if genuinely infra.

**Command:** `python .ralph/loop.py --units U13,U8,U14,U4,U5,U9,U15,U16,U3` under Shay's py3.13 venv.
**Run order:** U13 (probe per above) → U8,U14 (1B path) → U4,U5,U9,U15,U16 (1A path) → U3 (unknown, last).
**Cap budget (mandatory):** Instrument the loop to log brain-call count + provider per unit and **abort at a configurable threshold BEFORE the API 429s**, persisting the resume cursor in `run-state.json`. Realistic cost: 9 units × (decompose + 1–2 gen + 0–2 repair + gate retries) ≈ 30–50 Opus-class calls — plausibly a full weekly-cap segment. Do NOT treat 1C as atomic.

**GATE:** Each recovered unit committed + scoped; cumulative `npm run typecheck` + `npm run build` GREEN; `git status` clean. Note the redundant double typecheck (`build` = `typecheck && electron-vite build`, and build_app already gated via `test_cmd`) — optionally have the loop's build step call `electron-vite build` directly to halve typecheck cost.

**Brain:** code-capable; pause-and-checkpoint on forced downgrade. **Rollback:** Phase 0 scoped rollback per unit. **Dependencies:** 1A + 1B both merged. **Partial-pass rule:** if cap exhausts after N<9, checkpoint and resume on cap reset; Phase 2 runs against CURRENTLY-LANDED units.

---

## PHASE 2 — Functional app testing via AUTOMATED harness [GO/NO-GO; launch ZERO cap]

**Objective:** The app has NEVER been launched. jsdom smoke + production build already passed for 11 units yet nothing proves the Electron app runs — those gates demonstrably don't catch runtime/main-process failures. Prove it with a re-runnable, CI-gateable harness, not a manual click-through.

**Mechanism:**
- **Build an automated Electron smoke** using Playwright `_electron.launch()`: launch the built app, assert window title, navigate each route of every CURRENTLY-LANDED screen, assert it mounts, assert `window.hermesAPI` calls resolve, and assert `page.on('console','error')` stays empty per route. Screenshot per route as artifact. This is the GO/NO-GO mechanism — the ralph loop cannot clear a manual checklist.
- **Remediation path defined:** a white-screening/erroring screen re-opens its unit as `blocked` and triggers a scoped revert (Phase 0) — NOT "stop." A failing screen here is already committed, so it must be reverted cleanly.
- **Test triage is a SEPARATE, deferrable, cap-bearing task** (split from launch): reconcile the 64 baselined failures against live `src/preload/index.d.ts`. Each is either fixed or `it.skip` with a linked TODO referencing its baselined ID — never deleted, never silently relabeled. **Route triage to Gemini/Ollama** (mechanical low-precision edits tolerate weak models) so it does NOT consume the code-capable cap stacked right after heavy 1C. Triage does NOT block the Phase 3 go/no-go.

**GATE (two-part, automated):** (1) Electron harness: app boots to interactive shell, every landed route mounts, zero console errors, screenshots captured. (2) No NEW test failures vs the Phase-1C baseline; the 64 are each fixed or skipped-with-reason.

**Parallel/seq:** Sequential after 1C. **This is the hard GO/NO-GO for ALL of Phase 3.** **Brain:** launch=zero; triage=Gemini/Ollama. **Rollback:** failing screen → scoped revert + reblock unit. **Dependencies:** Phase 1.

---

## PHASE 3 — Adoption tracks (cap-cost ordered, hard safety gates)

> **Global Phase-3 rules:**
> - **Entry gated on MEASURED remaining cap**, not just the Phase 2 functional gate. If 1C+2 drained the weekly Anthropic cap, the low-cap deterministic tracks (3A, 3B) run on any provider; the generative tracks (3C/3D/3E) are DEFERRED to a fresh cap window. There is an explicit **cap-reset boundary between 3B and 3C** in the run diagram.
> - **Vault hash-baseline guard applies to EVERY track that runs third-party FS-capable code** (3A, 3B, 3C, 3D, 3E) — not just memory. Hash the whole hand-authored vault before/after; any drift = NO-GO + rollback (buglog #207).
> - **Provenance/egress gate for ALL vendored OSS:** vendor at a pinned commit, audit network calls before enabling, run adoption spikes with `ANTHROPIC_API_KEY` ABSENT from env (use a throwaway/Gemini-only key — vendored Python `open(...,'w')` and MCP servers bypass Shay's `write_file` ~/famtastic+/tmp restriction and could exfiltrate the key), and apply an outbound-network allowlist/deny to vendored components.

### 3A — Multi-provider tool registry [SEQUENTIAL-FIRST, LOW cap, any provider]
**Objective:** Steal blackbox-poc's top idea — define a tool ONCE, serialize per provider (Anthropic/OpenAI/Gemini/MCP). Foundational: every later track registers tools, and it directly serves cap-resilience.
**Files:** new `shay-agent-os/components/tools/registry.py`; wire into BrainChain adapters; migrate ad-hoc tool defs.
**GATE:** same tool invoked through ≥2 providers (Anthropic + Gemini) in a smoke test; existing pipeline tools still resolve; vault hash unchanged.
**Brain:** mostly deterministic, any provider. **Rollback:** revert registry + adapter wiring. **Dependencies:** Phase 2 green. **Parallel:** none (base layer).

### 3B — Kanban SQLite substrate swap [PARALLEL with nothing here; LOW cap, any provider]
**Objective:** Replace JSON ralph queue with the SQLite Hermes Kanban in Shay's fork (desktop has full `kanban*` IPC). This also removes `prd.json` from the committed tree, retiring the Phase-0-low prd.json-staging coupling.
**HARD dependency gate:** **ABORT 3B if U9 (Kanban screen) did not land GREEN in 1C** — 3B's verification renders the live board on U9. **Forbid any ralph loop re-run after the substrate swap until the swap is verified bidirectional** (loop reads/writes SQLite, prd.json importer is one-time; otherwise the loop reads SQLite while prd.json is stale).
**Files:** `.ralph/loop.py` (read/write units from SQLite; prd.json → one-time importer); board card status todo/blocked/landed.
**GATE:** fresh recovery run reads from SQLite, updates card status on land/rollback; U9 desktop screen renders the live board; vault hash unchanged.
**Brain:** mechanical, any provider. **Rollback:** restore prd.json substrate. **Dependencies:** Phase 2; U9 GREEN. **Parallel:** safe with nothing cap-heavy (runs in the pre-reset window with 3A).

> ===== CAP-RESET BOUNDARY (checkpoint; resume in a fresh cap window) =====

### 3C — obsidian-wiki adoption [MED cap, requires cost dry-run]
**Objective:** Adopt ar9av/obsidian-wiki (Ingest/Extract/Merge/Maintain, multi-agent history mining incl. Hermes) over Shay's vault.
**Cost dry-run FIRST (unbounded-cost guard):** count vault files × est tokens; cap Ingest/Extract to a bounded batch (N most-recent or one subdirectory); measure actual calls on that batch before any full-vault run. Make ingest **resumable per-file** so a cap stall mid-mine doesn't restart from zero.
**HARD gate (buglog #207):** hash-baseline the whole vault before; wiki output goes to a SEPARATE generated namespace; assert every hand-authored file hash UNCHANGED after. The `Merge/Maintain` phases are write-capable — point them only at the generated namespace. NO-GO on any baseline drift.
**Files:** vendor under `shay-agent-os/components/wiki/`, READ-mostly against the vault.
**Brain:** MED, code/general tier; pause on forced downgrade. **Rollback:** delete generated namespace; tear down any index; re-assert baseline. **Dependencies:** Phase 2; fresh cap window. **Parallel:** none cap-heavy alongside.

### 3D — SkillNet + mint 4 skills [SEQUENTIAL after 3A, MED cap]
**Objective:** zjunlp/SkillNet (search/install/auto-create/evaluate/analyze). Mint `micro-patch-living-file`, `render-spine-guard`, `structural-prepass`, `code-graph-context`.
**Cutover (single source of truth — explicit, was missing):** `micro-patch-living-file` and `render-spine-guard` formalize the EXACT mechanisms built in 1A/1B which live in pipeline.py. 3D MUST either (a) have the skill call into the pipeline.py helper, or (b) delete the inline pipeline path and route through the skill — with a gate proving the brace-drop fixture still passes post-cutover. No two-sources-of-truth.
**Files:** vendor under `shay-agent-os/components/skills/`; register via 3A registry.
**GATE:** 4 skills installed, each passes SkillNet's evaluate; `render-spine-guard` reproduces `_is_render_spine` ≥2-additive-anchor on a fixture; brace-drop fixture still green post-cutover; vault hash unchanged; auto-create ran with API key absent.
**Brain:** MED generative (quality-sensitive — pin code tier, no weak-model auto-create). **Rollback:** unregister skills, restore inline pipeline path. **Dependencies:** 3A; fresh cap window.

### 3E — Memory SPIKE [STRICTLY SEQUENTIAL, one candidate at a time, MED cap]
**Objective:** Cap relief + memory depth. Order: **(1) rohitg00/agentmemory** (92% token-cut claim, MCP, lowest risk) → **(2) vectorize-io/hindsight** (Retain/Recall/Reflect, pipeline-side) → **(3) plastic-labs/honcho** (AGPL license review REQUIRED first; most invasive).
**Registration clarified:** register via the raw 3A registry (so 3E is **3D-independent**), unless a candidate is wrapped as a SkillNet skill — in which case it moves after 3D. Default: raw registry, 3D-independent.
**Quiesce barrier (was missing):** 3E candidate-1 baseline may begin ONLY after 3C's process has FULLY EXITED (no open file handles, index flushed, post-run hash recorded) — "3C gate passed" is not enough; a mid-mutation baseline yields false unchanged/drift.
**Per-candidate HARD gate:** vault hash-baseline before/after (#207); measure actual token delta on a FIXED transcript; GO only if net token reduction AND zero vault mutation. **External-state rollback:** memory backends persist vector stores / MCP indexes that git revert won't clear — each rollback must explicitly tear down its external store, kill orphan indexes/processes, and re-assert the vault baseline BEFORE the next candidate's baseline.
**Files:** each behind a flag in `shay-agent-os/components/memory/`.
**Brain:** MED; pin code/general tier. **Dependencies:** 3A; AND 3C fully quiesced. **Strictly sequential** within itself.

---

## RUN IN ONE GO — checkpointed sequence with sign-off gates

```
CP0  Phase 0  Loop hygiene (scoped add + scoped checkout + clean, --units, run-state ledger)   [det, unattended-safe]
      └─ GATE: synthetic no-op unit → staged set == files_written ∪ prd.json; rollback scoped.
                                                                  ▶ AUTO-PROCEED
1A   Pipeline: prettier --check pre-gate + deterministic balance-scanner repair + capped brain  ┐ serialized
1B   Pipeline: anchor-miss return-verified-anchor + structural fallback                         ┘ (same file)
      └─ GATE: brace-drop fixture closes 0-brain; anchor fixture lands.                ▶ AUTO-PROCEED
─── snapshot 64 failing test IDs on clean HEAD; verify render gate is single-file scoped ───
1C   Re-run 9: U13→U8,U14→U4,U5,U9,U15,U16→U3   [code-tier only; cap-budget abort; resume cursor]
      └─ GATE: recovered units committed+scoped; typecheck+build GREEN; tree clean.
                                          ★ HUMAN/PHONE SIGN-OFF #1 (cap status + units landed) ★
2    Electron+Playwright automated smoke over landed screens (zero console errors, screenshots)
      └─ GATE: app boots, all landed routes mount, no NEW test failures vs baseline.
                              ★ HUMAN/PHONE SIGN-OFF #2 — HARD GO/NO-GO for all Phase 3 ★
─── measure remaining cap ───
3A   Tool registry (any provider)
3B   Kanban SQLite substrate (ABORT if U9 not GREEN; verify bidirectional before any loop re-run)
                              ★ CAP-RESET BOUNDARY — checkpoint; resume in fresh cap window ★
                              ★ HUMAN/PHONE SIGN-OFF #3 (cap reset confirmed) ★
3C   obsidian-wiki  [cost dry-run → bounded batch → vault-hash gate]   (process must fully exit)
3D   SkillNet + 4 skills (after 3A; cutover removes pipeline dual-source)
3E   Memory: agentmemory → hindsight → honcho  [after 3A + 3C-quiesced; per-candidate hash+token+teardown gate]
```

**Genuinely unattended-safe:** CP0 (deterministic) + the Phase 2 launch only. Everything else is checkpointed with a resume cursor in `run-state.json`. **Serialized:** 1A→1B (same file); all of 3E; 3D after 3A. **Cap-resilient:** code-tier pinned for precision phases, forced downgrade = PAUSE not silent fallback.

**Single highest-leverage change:** Phase 1A's deterministic balance-scanner + per-file prettier pre-gate — it converts 5 of 9 blocked units from expensive full-regen loops into a zero-brain mechanical close, and is the exact mechanism later formalized (single-source) as the `micro-patch-living-file` / `render-spine-guard` skills in 3D.

---

## RISKS-RETIRED

| Critic finding | Sev | How the final plan handles it |
|---|---|---|
| `npm run format` is `--write .` (mutating), no `--check` script | high | Call `npx prettier --check <file>` binary directly w/ explicit `--parser`; never `npm run format` in loop (1A). |
| prd.json has no `files` key; `--units` not parsed | high | Derive touched set from `result["result"]["files_written"]`; add `--units` parser (Phase 0). |
| Diagnostic line:col is parser-confusion point, not missing-brace site; brain re-drops | high | Deterministic balance-scanner finds real scope + appends closer; brain reserved, capped, never trusts col (1A). |
| Per-file tsc can't resolve imports; can't attribute project error to one file | high | prettier `--check` per file BEFORE project typecheck; gate on parse failure + cited TS codes (1A). |
| 1A "net cap-saving" false; adds calls on top of max_iter=4 | high | Deterministic repair = 0 brain for most; hard per-run repair budget; abort-before-429 cursor (1A/1C). |
| BrainChain fallback to Gemini/Ollama = silent quality cliff for precision edits | high | Code-tier pinned; forced downgrade = PAUSE + checkpoint, logged as abort reason (1A/1B/1C). |
| 1A∥1B race on same pipeline.py file | high | Serialized 1A→1B, one agent, commit between (Phase 1). |
| `git checkout -- .` rollback nukes unrelated dirty tree | high | Scoped `git checkout -- <files_written>` + `git clean -f` for new files (Phase 0). |
| Two rollback authorities (pipeline manifest vs loop git) disagree | high | loop.py is single unit-level authority; `git clean` catches untracked half-repairs (Phase 0/1A). |
| U9 not recovered → 3B dead on arrival; loop reads stale prd.json post-swap | high | ABORT 3B if U9 not GREEN; forbid loop re-run until swap verified bidirectional (3B). |
| 3C still mutating vault when 3E baselines | high | Quiesce barrier: 3C process fully exited + hash recorded before 3E baseline (3E). |
| Phase 2 "zero console errors" not autonomously verifiable | high | Replaced manual click-through with Playwright `_electron.launch` automated harness (Phase 2). |
| Hash-baseline only on memory tracks; SkillNet/wiki also write | med | Hash-baseline + egress gate applied to ALL FS-capable tracks 3A–3E (Phase 3 global). |
| Vendored OSS can exfiltrate ANTHROPIC_API_KEY | med | Pinned commit, audited net calls, key ABSENT from env during spikes, outbound allowlist (Phase 3 global). |
| Partial 1C (cap exhaustion) leaves Phase 2/3 undefined | med | Phase 2 runs against CURRENTLY-LANDED units; 3B/3D/3E gate on the specific units they need (1C/Phase 3). |
| 1A repair passes prettier but introduces logic drift | med | Repaired file must also pass render-autogen smoke + typecheck, not just prettier (1A). |
| 3D dual source of truth vs pipeline.py 1A/1B | med | Explicit cutover: skill calls helper OR pipeline path deleted; fixture gate post-cutover (3D). |
| Memory rollback ≠ git rollback (external vector stores persist) | med | Per-candidate teardown of external store + orphan process kill + re-baseline (3E). |
| 64 failing tests relabeled without proof | med | Snapshot 64 IDs on clean HEAD pre-Phase-1; only those skippable; any NEW failure = hard stop (1C/2). |
| render gate may pull the 64 broken suites via global setup | med | Verify `runtime_render_gate` runs vitest scoped to single autogen file before trusting it (1C). |
| Test-triage labeled zero-cap but uses brain | med | Triage split out, deferrable, routed to Gemini/Ollama, non-blocking (Phase 2). |
| Phase 3 front-loads MED-cap tracks with no budget | med | Phase 3 entry gated on measured cap; cap-reset boundary between 3B and 3C (Phase 3 global). |
| obsidian-wiki cost unbounded by vault size | med | Cost dry-run → bounded batch → per-file resumable before full vault (3C). |
| Naive brace counter false-positives on strings/JSX | low | Scanner is string/comment/template/regex/JSX-aware; prettier parser is authority (1A). |
| U13 "free retry" may burn a real failure/timeout | low | Inspect actual stderr first; classify TS vs timeout vs infra before retrying (1C). |
| build runs typecheck twice | low | Optionally call `electron-vite build` directly in loop; noted in cap estimates (1C). |
| Phase 0 dry-run via non-deterministic U20 | low | Use synthetic no-op unit, not a real brain-backed re-run (Phase 0 gate). |
| Scoped commit drops prd.json status update | low | prd.json explicitly staged with each unit until 3B retires it from the tree (Phase 0/3B). |
| No resume artifact for cap-pause | low | `.ralph/run-state.json` ledger updated per unit/track gate (Phase 0). |
| Ollama throughput (not cap) stalls "one go" | low | Max-local-calls throttle; prefer pause-for-reset over grinding local generations (Phase 3 global). |
| No Phase 0 self-rollback | low | Phase 0 gate fails loudly on empty/mismatched stage; loop.py edit is trivially revertible (Phase 0). |
| AGPL honcho license | low | License review required before honcho adoption; ordered last (3E). |

This is the document to execute from. Critical path: **CP0 → 1A→1B → 1C → [SIGN-OFF #1] → Phase 2 → [SIGN-OFF #2 GO/NO-GO] → 3A → 3B → [CAP-RESET / SIGN-OFF #3] → 3C ∥ 3D → 3E.**