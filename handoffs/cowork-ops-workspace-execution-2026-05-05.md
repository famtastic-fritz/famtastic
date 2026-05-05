# Cowork Handoff — Execute Ops Workspace GUI Plan End-to-End

**Created:** 2026-05-05
**Branch:** `feat/ops-workspace-gui` (already checked out, pushed to origin)
**Plan:** `plans/plan_2026_05_05_ops_workspace_gui/plan.json`
**Mode:** Autonomous. Run to completion without human intervention.
**Risk:** LOW — plan went through 3-round adversarial review (Claude author, Codex reviewer).
**Orchestrator:** A separate Claude Code session is monitoring your status log. It will read your check-ins and step in only if you report a hard blocker.

---

## Your job in one sentence

Implement every workstream in `plans/plan_2026_05_05_ops_workspace_gui/plan.json` in dependency order, commit as you go with `docs:` or `feat:` prefixes, push to `feat/ops-workspace-gui`, and write a status check-in to the status log every 15 minutes or after every commit (whichever comes first).

---

## Read these files first (in this order)

1. `~/famtastic/CLAUDE.md` — global rules. Non-negotiable: commit policy (no AI attribution), SITE-LEARNINGS.md update on every meaningful change, CHANGELOG.md entry at session end.
2. `~/famtastic/famtastic-dna.md` — non-negotiable build rules.
3. `~/famtastic/.wolf/cerebrum.md` — do-not-repeat list.
4. `~/famtastic/.wolf/anatomy.md` — file inventory.
5. `~/famtastic/plans/plan_2026_05_05_ops_workspace_gui/plan.json` — the plan you are executing.
6. `~/famtastic/plans/plan_2026_05_05_ops_workspace_gui/README.md` — plan summary.
7. `~/famtastic/SITE-LEARNINGS.md` — current state of system, especially Known Gaps section.

---

## Execution order (strict)

The plan has explicit `depends_on` fields. Honor them. Order:

### Phase 0 — REQUIRED FIRST (no UI work until these are done)
1. **`ws_phase0_state_contract`** — produce these artifacts:
   - `docs/ops/state-contract.md` (human mirror of `source_of_truth_matrix` baked into the plan)
   - `scripts/ops/inventory.js` (snapshot script)
   - `docs/ops/inventory-2026-05-05.json` (first snapshot output)
   - Schema changes for cross-link fields (add to existing ledger schemas as documented)
2. **`ws_ops_test_substrate`** — produce these artifacts:
   - `tests/ops/fixtures/` (synthetic ledger fixtures)
   - `tests/ops/freshness-derivation.test.js`
   - `tests/ops/stale-cannot-inflate-live.test.js`
   - `tests/ops/ws-reconcile.test.js`
   - `tests/ops/destructive-action-gate.test.js`
   - `tests/ops/cross-link-integrity.test.js`
   - All must pass.

### Phase 1 — API surface
3. **`ws_ops_api_surface`** — implement in `site-studio/server.js` (or a new `site-studio/lib/ops-api.js` module loaded by server.js):
   - GET endpoints: `/api/ops/jobs`, `/api/ops/runs`, `/api/ops/tasks`, `/api/ops/plans`, `/api/ops/proofs`, `/api/ops/gaps`, `/api/ops/memory`, `/api/ops/reviews`, `/api/ops/debt`, `/api/ops/needsMe`
   - POST: `/api/ops/command/{approve, reroute, park, retry, cancel, promote, archive, purge, migrate}`
   - WS: `/ws/ops` with snapshot_version + sequence_id contract
   - Every response includes `{snapshot_version, generated_at, source_ledgers[], record_count}`
   - Per-endpoint contract test asserting source ledger matches the matrix

### Phase 2 — Jobs MVP (the first user-visible screen)
4. **`ws_jobs_tab_mvp`** — implement under `site-studio/public/`:
   - New CSS file `site-studio/public/css/ops-jobs.css` (per the project's CSS file-per-component rule)
   - New JS file `site-studio/public/js/ops-jobs.js`
   - HTML mounted into the existing Workbench shell as a new domain `◆ Ops` → sub-tab `Jobs`
   - Seven swimlanes mapped 1:1 to job DB statuses
   - Stale Debt drawer with Migrate/Archive/Purge (gated)
   - Job inspector (right slide-over)
   - WebSocket live updates with reconcile contract
   - Shay-Shay one-sentence summary in drawer

### Phase 3 — Remaining tabs (parallel where safe)
5. `ws_pulse_tab` — Pulse home view
6. `ws_tasks_tab` — Tasks kanban
7. `ws_agents_tab` — Agents Command Center
8. `ws_reviews_tab` — Reviews (depends on `ws_adversarial_review_loop`)
9. `ws_runs_tab` — Runs table
10. `ws_proofs_tab` — Proofs masonry
11. `ws_plans_tab` — Plans registry
12. `ws_gaps_tab` — Gaps list
13. `ws_memory_tab` — Memory library
14. `ws_debt_tab` — Debt cleanup

### Phase 4 — Cross-cutting features
15. **`ws_record_visual_language`** — design tokens for PLAN/TASK/JOB/RUN/PROOF/GAP/MEMORY/REVIEW (color, glyph, shape, route prefix). Add to `site-studio/public/css/ops-tokens.css`.
16. **`ws_plan_create_flow`** — composer for new plans, plus CLI parity in `fam-hub plan new`.
17. **`ws_adversarial_review_loop`** — implement the loop runner. Configurable, optional, global toggle.
18. **`ws_shay_shay_drawer_integration`** — per-tab briefings + recommendation chips (no auto-actions).

---

## Standing rules (do not violate)

- **Commit policy:** every commit message human-style. NEVER include "Claude", "AI", "Co-Authored-By", "generated", "assisted". Use `docs:` for plan/doc changes, `feat:` for new features, `fix:` for fixes, `test:` for tests.
- **CSS file-per-component:** new CSS goes into a new file under `site-studio/public/css/`, linked from `index.html` `<head>`. Never inline styles, never new `<style>` blocks.
- **JS file-per-component:** same pattern under `site-studio/public/js/`, scripted at bottom of `<body>`.
- **Tailwind utility classes on HTML are fine** (exempt from the file-per-component rule).
- **Studio is launchd-managed.** Never `node server.js` manually. To restart: `launchctl stop com.famtastic.studio` (it auto-restarts in ~2s).
- **Use TAG, never `process.env.SITE_TAG`.**
- **Static Express routes register before parameterized routes.**
- **Every HTML write path goes through `runPostProcessing()`.**
- **Never modify** `site-studio/lib/fam-motion.js`, `site-studio/lib/fam-shapes.css`, `site-studio/lib/character-branding.js`.

---

## Status check-in protocol (REQUIRED)

Append a JSON line to `~/famtastic/handoffs/cowork-ops-execution-status.jsonl` every:
- 15 minutes (whichever comes first), AND
- after every commit, AND
- on entering or completing a workstream, AND
- on any blocker, AND
- on completion or stop.

Each line is one JSON object on one line:

```json
{"ts":"2026-05-05T17:00:00Z","event":"checkpoint","phase":"phase_0","workstream":"ws_phase0_state_contract","status":"in_progress","commits":["abc123","def456"],"summary":"matrix doc done; inventory script writing","blocker":null,"next":"finish inventory.js, run first snapshot"}
```

Event types: `start`, `checkpoint`, `commit`, `workstream_start`, `workstream_done`, `blocker`, `human_help_needed`, `done`, `stop`.

Status values: `idle`, `in_progress`, `blocked`, `succeeded`, `failed`.

When you write a `blocker` event, also write a `human_help_needed` event with a clear question. The orchestrator session will pick it up and either resolve or escalate.

---

## When to stop on your own (do not wait for human approval)

Stop and write `event: done` if all workstreams complete and tests green.

Stop and write `event: stop` (with reason) if:
- A workstream's acceptance test fails 3 times across attempts to fix it.
- You discover the plan is fundamentally wrong about the codebase (e.g., a file the plan assumes doesn't exist and can't be reasonably created).
- You would need to violate a CLAUDE.md non-negotiable to proceed.
- You would need to delete or rename existing ledger files (those are governance hard-stops).

Otherwise: keep going. Make the call. Log it. Move on. The plan went through adversarial review — when in doubt, follow the plan.

---

## Documentation duties (per CLAUDE.md)

Before stopping for any reason (including completion):
1. Update `~/famtastic/SITE-LEARNINGS.md` with what shipped, what changed, and any new known gaps.
2. Append a session entry to `~/famtastic/CHANGELOG.md` (3–5 sentences).
3. If structure changed (new endpoints, new files, new config keys, etc.), regenerate `~/famtastic/FAMTASTIC-STATE.md`.
4. Update `~/famtastic/.wolf/anatomy.md` for new files.
5. Append learnings to `~/famtastic/.wolf/cerebrum.md`.
6. Log any bugs found/fixed to `~/famtastic/.wolf/buglog.json`.

---

## Final commit + push

When done (success OR stop), make a final commit with a session-summary message, push to `feat/ops-workspace-gui`, then write the final status-log entry.

Do NOT open a PR or merge to main. The orchestrator session will review and decide.

---

## Confirmation handshake

Your very first action: append this exact event to the status log so the orchestrator knows you started:

```json
{"ts":"<UTC now>","event":"start","phase":"bootstrap","workstream":null,"status":"in_progress","commits":[],"summary":"cowork session online; reading plan and CLAUDE.md","blocker":null,"next":"begin Phase 0"}
```

Then begin Phase 0.

Good hunting.
