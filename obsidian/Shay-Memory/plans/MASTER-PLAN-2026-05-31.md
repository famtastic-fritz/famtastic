---
title: MASTER-PLAN-2026-05-31
type: plan
permalink: shay-memory/plans/master-plan-2026-05-31
status: active
schema: agnostic-resumable-checklist-v1
---

# Master Plan — Shay System Upgrade (resumable · agent-agnostic)

## How this plan works (read before running)
- **Agnostic:** no item names a specific agent. Each item lists `capabilities` it
  needs. ANY agent (Shay, Claude, Codex, Gemini) with those capabilities enabled can
  claim a `pending`/`in_progress` item and continue it.
- **Resumable:** each item carries a `resume` note = the smallest restart state. If an
  agent stops mid-item, the next agent reads `resume` + the gate and continues — no
  context from the original run required.
- **Done = gate passes**, not self-attestation. The `gate` is the objective check.
- **Tracked live:** this file (+ `plan.json`) is the source for the right-pane Plan tab
  checklist; status flips drive the checkbox. Default runner = **Shay**; known-blockers
  pre-flagged. `[ ]` pending · `[~]` in-progress · `[x]` done · `[!]` blocked/needs-Fritz.

## Execution order (LOCKED 2026-05-31, supervisor: Claude)
- **Phase 0 (now, parallel):** A1 (judge_brain fix → enables provider-spread/parallelism) · B3 (synthesize_sections→build_app → enables large desktop builds) · P0-WT (verify/enable git-worktree isolation in Shay's dispatcher = the 5-lanes-vs-300 dial). No live UI tracker yet (track in this file + chat + heartbeats).
- **Phase 1a:** E1 (Plan-tab checklist) — built BY SHAY as the *proof B3 worked*; once live it becomes the tracker.
- **Phase 1b:** full parallel fan-out (B/C/D rest + E2), worktree-isolated where collision; config (Lane A rest) serialized on live file + restart-handoff.
- **Phase Z (last):** Agent OS port + Z3 restart-handoff test.
- **Gated:** 18 Interview — Fritz-interview + plan review first; not scheduled.
- **Known hazard (flagged):** A1/B3 edit Shay's LIVE engine (shay-agent-os) — run via anchored surgical edits with pytest+import gates; git rollback armed; supervisor verifies before reliance.

## Lanes (run in PARALLEL; serialize only WITHIN a lane on shared files)
- **A** Config & quick wins   (owns: ~/.shay/config.yaml)
- **B** Pipeline / swarm       (owns: shay-agent-os pipeline + dispatcher)
- **C** Memory backbone        (owns: memory backend + lifecycle)
- **D** Agent context & drift  (owns: vault docs, hooks, AGENT-CONTEXT)
- **E** Desktop UI             (owns: shay-desktop App.tsx/manifest/right-pane)
- **Z** Agent OS port          (LAST — owns desktop agentos screens)

---

## LANE A — Config & quick wins  [Shay-runnable]
- [ ] **A1** Fix `judge_brain` key typo in `shay-agent-os/.../local_swarm_dispatcher.py` (force-routes every "auto" → Claude). · caps: `code_edit,pytest` · gate: a routed "auto" call lands on the policy brain, not Claude; test passes · resume: grep `judge_brain` for the typo
- [ ] **A2** Config flips via `shay_cli.config.save_config`: `subagent_auto_approve=ON`, `display.bell_on_complete=ON`, `show_reasoning=ON`, `timestamps=ON`, `compact=ON`, `updates.pre_update_backup=ON`, `max_concurrent_children=30→64`. · caps: `config_write` · gate: re-read config shows all set · resume: diff config vs this list
- [ ] **A3** Personality/SOUL fix — stop the generic `concise` preset diluting her SOUL. Set `display.personality` to defer to SOUL (custom preset = pointer to SOUL, or neutralize). · caps: `config_write,code_read` · gate: system prompt shows SOUL as sole persona, no generic "you are a concise assistant" competing · resume: inspect prompt_builder personality+soul slots
- [ ] **A4** Restart-handoff via the existing `request_restart(via_service=True)`/SIGUSR1, applied ONCE after A1–A3. · caps: `gateway_restart` · gate: new PID, clean log, all A-flips live · resume: `shay gateway status`

## LANE B — Pipeline / swarm efficiency  [Shay-runnable; build_app truncation = known blocker → B3 fixes it]
- [ ] **B1** Wire `cost_telemetry.py` into routing (built, zero callers) + arm low-funds signal (threshold left 0/off until Fritz sets $). · caps: `code_edit,pytest` · gate: a routed call records cost; summary non-empty
- [ ] **B2** Promote `AsyncioDispatcher` stub → parallel `fan_out` (~40 lines). · caps: `code_edit,pytest` · gate: N tasks run concurrently, not serially
- [ ] **B3** Wire `synthesize_sections` into `build_app` + adopt **rlm-rs** content-budget seam (kills `[:6000]/[:16000]` truncation). · caps: `code_edit,pytest` · gate: build_app produces a >250-line file un-truncated; re-run a prior blocked story green · resume: build_app context-cap call sites
- [ ] **B4** Enforce reviewer≠author (heterogeneous council via stamped `brain_used`). · caps: `code_edit,pytest` · gate: pipeline hard-blocks same-brain review

## LANE C — Memory backbone  [Shay-runnable buildable-now; backend install may need restart→A4-style handoff]
- [ ] **C1** Memory lifecycle: persist the compressor's already-generated session memo on `on_session_end` → `reflections/episodic/sessions/<id>.md` (+ threshold refresh). · caps: `code_edit,pytest` · gate: a session writes a memo file · resume: hook `ContextEngine.on_session_end`
- [ ] **C2** Dream upgrade: `reflect.py` extractive→generative at its swap point (replay→distill→edges→score→L3); fix `EXCLUDE_DIRS` so new memos aren't skipped. · caps: `code_edit,aux_model` · gate: a nightly run produces L2/L3 with non-extractive summaries
- [ ] **C3** Carry-forward: inject relevant memo + insights at next SessionStart via the D2 hook. · caps: `code_edit` · depends: D2 · gate: a fresh session shows prior-session memo in context
- [ ] **C4** Memory backend: TencentDB tiers + TurboVec + graphify (semantic+graph recall). · caps: `code_edit,install,pytest` · gate: a semantic query returns ranked linked results; flat-grep path retired behind flag · resume: adopt plans in research/{tencent,turbovec,rlm-rs}-adopt
- [ ] **C5** Rewire recall path onto C4 (query→vector+graph→inject). · caps: `code_edit` · depends: C4

## LANE D — Agent context & drift  [Shay-runnable; doc/script/config — low collision]
- [ ] **D1** `AGENT-CONTEXT.yaml` single source + idempotent emitter → AGENTS.md region, **GEMINI.md (new)**, CLAUDE.md @-import. · caps: `code_edit` · gate: all four files regenerate from one source
- [ ] **D2** Real SessionStart hook — emit `hookSpecificOutput.additionalContext` (system-map+state+recall-path+reuse-before-generate). · caps: `code_edit,hook_write` · gate: a new agent session actually receives the injected block
- [ ] **D3** Anti-drift reconciler: `trace/{nodes,edges}.jsonl` + 3 detectors + `audit-shay.js`/`audit-all.js` + zero-token cron watchdog. · caps: `code_edit,cron` · gate: running it flags W5 + the 6 dropped adopts + the stale triage cards · resume: research/anti-drift-system-design
> **RECOMMENDATION (reported, NOT tasked — Fritz decides):** Claim-verification gate — any agent-produced finding/bug/"done" independently CONFIRMED before acted on (reviewer≠author). Would have caught the A1 misdiagnosis, the B3 false-"done", and the silent adopt-drops. Ties to B4 + verification loops. Not added as a task; awaiting Fritz's call.

- [ ] **D4** Community gap-discovery: SkillNet + clawhub `SkillSource` adapters + `skill_manage(action=discover)` + `GapResolver` wired into planner/curator (reuse-before-generate). · caps: `code_edit,pytest` · gate: a known gap returns community candidates with verdicts

## LANE E — Desktop UI  [Shay tries; build_app truncation = known blocker until B3 → flag]
- [ ] **E1** **Plan-tab checklist (right pane)** — new panel variant reading `plan.json`, renders items as checkboxes grouped by lane, auto-checks on status flip, shows progress. THIS IS THE TRACKER — build first. · caps: `ts_edit,build_gate` · gate: typecheck+build green; tab renders this plan and reflects live status
- [ ] **E2** Wire E1 to live status (anti-drift trace D3 / plan.json writes flip checkboxes). · caps: `ts_edit` · depends: E1, D3

## LANE Z — Agent OS port (W5)  [LAST · biggest · restart-handoff TEST]
- [!] **Z1** Reconcile the W5 port plan's hermes-webui feature inventory against the 8 existing agentos screens → the true delta (what's actually missing). · caps: `code_read` · gate: delta list written
- [ ] **Z2** Port the delta screens natively (depends Z1; depends B3 so build_app won't truncate). · caps: `ts_edit,build_gate` · gate: each ported screen typecheck+build+render green
  - **Z2-Kanban (acceptance bar = Hermes Agent v0.11.0 board, Fritz ref 2026-05-31):** 6-column flow TRIAGE→TODO→READY→IN-PROGRESS→BLOCKED→DONE · lanes-by-profile grouping · filters (search/tenant/assignee/show-archived) · Nudge-Dispatcher + Refresh controls · rich cards (id chip + tags P2/project/0-of-1 + @assignee + dep-count + timestamp) · teal theme + serif headers + system-status footer. Our current Kanban renders but is NOT at this polish — bring it here.
- [ ] **Z3** **RESTART-HANDOFF TEST:** when a unit needs a restart, Shay runs a `dispatch-to-claude` handoff command (built on `request_restart(via_service=True)`) → CLI/Claude restarts the gateway → verifies she restarted correctly. · caps: `gateway_restart` · gate: Shay-initiated handoff → clean new PID → post-restart self-check passes · resume: this is the explicit capability to TEST

## GATED — needs Fritz
- [!] **18 Interview engine (W6)** — BLOCKED: needs a Fritz-interview on scope + Fritz reviews the plan BEFORE build. Do NOT start. First action when unblocked = run the interview, draft the plan, show Fritz.

---

## Known-blockers pre-flagged (so we don't "test" a guaranteed fail)
- **build_app truncation** blocks any large new screen (E1, Z2) UNTIL **B3** lands. So B3 is a prerequisite for the desktop lanes' big builds.
- **C4 backend install** + some config changes will likely need a restart → use the **A4 / Z3 handoff** pattern.
- **Provider rate limits** cap real concurrency (see parallelism map).

## FUTURE RULE (Fritz, 2026-05-31): auto-worktree on collision + reconciliation watcher
When the dispatcher detects that two concurrent tasks will touch the SAME file (collision domain),
AUTO-isolate each into its own git worktree, let them build in parallel safely, then a
RECONCILIATION WATCHER recombines the worktree branches back to the live repo (merge, resolve,
re-gate). This is the wiring P0-WT found missing (workspace_kind='worktree' exists but no
git-worktree-add/merge-back). Until built, the rule is: parallel across DIFFERENT files, SERIAL
on the SAME file. (Deferred — not building mid-run.)
