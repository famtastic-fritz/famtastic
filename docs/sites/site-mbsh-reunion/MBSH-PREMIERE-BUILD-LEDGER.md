# FAMtastic Site Build — MBSH Premiere Experience Ledger

**Status:** Active execution ledger / resumable orchestration tracker
**Created:** 2026-05-07
**Project:** MBSH Class of '96 Reunion Premiere Experience
**Parent:** FAMtastic Site Build
**Primary planning repo:** `famtastic`
**Target product repo:** `mbsh-reunion`

---

## 0. Purpose

This ledger is the live control document for the MBSH Premiere Experience build.

The planning documents define what should be built. This ledger defines how the work stays organized, resumable, reviewable, autonomous, and teachable across ChatGPT, Claude Code, Codex, subagents, future sessions, and future FAMtastic build workflows.

This is not a design brief. This is the operational source of truth for execution state.

Every agent/session should read this file first before acting.

---

## 1. Plan Identity

```yaml
plan_name: FAMtastic Site Build — MBSH Premiere Experience
canonical_short_name: mbsh-premiere-experience
parent: famtastic-site
site: mbsh-reunion
project: premiere-experience
current_phase: pass-1-paused-for-fritz
current_pass: pass-1
status: paused-awaiting-fritz-d4-d5-d8
review_gate: strict
autonomy_mode: guarded-autonomous-to-completion
asset_strategy: hybrid
character_strategy: full-guide
motion_level: cinematic
implementation_depth: pass-by-pass
```

### Core tags

```text
parent:famtastic-site
site:mbsh-reunion
project:premiere-experience
plan:mbsh-premiere-experience
```

### Workstream tags

```text
workstream:orchestration
workstream:architecture
workstream:visual-system
workstream:character-harry
workstream:asset-generation
workstream:motion
workstream:navigation
workstream:chatbot
workstream:qa
workstream:learning-loop
```

### Pass tags

```text
pass:0-setup-architecture
pass:1-reusable-structure
pass:2-existing-assets
pass:3-missing-assets
pass:4-asset-integration
pass:5-motion-polish
pass:6-qa-accessibility-performance
pass:7-final-review-ship
pass:8-post-review-learning
```

### Status tags

```text
status:not-started
status:active
status:blocked
status:needs-fritz-review
status:approved
status:deferred
status:complete
```

### Model / brain tags

```text
brain:orchestrator-medium
brain:subagent-specialist
brain:codex
brain:claude-code
brain:high-reasoning
brain:ultrathink
brain:ultrareview
```

---

## 2. Source-of-Truth Documents

Authority chain:

1. `docs/sites/site-mbsh-reunion/PREMIERE-THEME-EXPERIENCE-PLAN-2026-05-05.md` — V1 original creative direction.
2. `docs/sites/site-mbsh-reunion/PREMIERE-EXPERIENCE-V2-PLAN-2026-05-07.md` — creative direction + per-page treatment.
3. `docs/sites/site-mbsh-reunion/PREMIERE-EXPERIENCE-V3-PLAN-2026-05-07.md` — production protocol gate.
4. `docs/sites/site-mbsh-reunion/PREMIERE-DESIGN-MAP-2026-05-07.md` — concrete per-section design map + pass pipeline.
5. `docs/sites/site-mbsh-reunion/MBSH-PREMIERE-BUILD-LEDGER.md` — this live execution tracker.

Rule: the Design Map drives build decisions. This ledger tracks execution status, proof, blockers, and learning-loop updates.

### Run apparatus (added 2026-05-07 with autonomy run start)

- `COVERAGE-MATRIX.md` — Design Map sections × build-pass status
- `DECISION-LOG.md` — V3 §8 decisions + run-time decisions R1+
- `FAILURE-LOG.md` — every failure encountered and its resolution
- `DEFERRED-ASSETS.md` — assets/poses explicitly deferred with fallbacks
- `RUN-STATE.md` — heartbeat / resume state
- `closeouts/PASS-0-CLOSEOUT.md`
- `closeouts/PASS-1-CLOSEOUT.md`
- `evidence/INDEX.md`, `evidence/p0-no-op-eval.json`, `evidence/p1-sandbox-state.json`

---

## 3. Current Status

```yaml
current_status:
  plan_name: FAMtastic Site Build — MBSH Premiere Experience
  current_pass: pass-1
  pass_disposition: paused-for-fritz-approval
  next_action: fritz-reviews-sandbox-D4-D5-D8
  approved_to_build: pass-2-after-fritz-approval-of-pass-1
  blocked_by: fritz-review-of-D4-D5-D8 + gemini-key-for-pass-3
  must_stop_after: pass-1-pause-resolved
  last_review: V3 approved as protocol; Design Map approved as build blueprint
  next_review_needed: D4 filmstrip frame, D5 medallion menu, D8 snap mechanism
  product_repo_branch: feat/premiere-theme
  product_repo_head: 6b9ca56
  pre_p0_baseline: 1386d17
  p0_commit: dbec459
  p1_commit: 6b9ca56
  sandbox_url_local: http://localhost:3000/_premiere-sandbox.html
```

### Immediate next action

Fritz reviews `_premiere-sandbox.html` on the deploy repo's `feat/premiere-theme` branch (or local preview). Disposition for D4 (filmstrip frame visual), D5 (medallion-as-menu, including arc-on-corner polish), D8 (snap mechanism + iOS Safari real-device test deferred to P6).

After Fritz disposition: P2 starts (propagate components to all 7 production HTMLs with explicit per-pose fallbacks per `DEFERRED-ASSETS.md`) OR sandbox iterates per feedback OR direction changes.

---

## 4. Autonomy Model

### Mode

```yaml
autonomy_mode: guarded-autonomous-to-completion
```

Per Fritz directive (2026-05-07):

The system may continue from pass to pass automatically when ALL of these hold:

- Pass exit criteria are met (per Design Map §0)
- Proof is collected (filed in `evidence/`)
- Smoke 7/7 green or accepted exception logged
- No Fritz-level decision required
- No scope drift detected
- No unresolved blocker remains
- Missing assets/poses are either implemented or explicitly deferred with fallback
- Coverage matrix updated

The system MUST PAUSE when ANY of these hold:

- Pass gate fails
- Same task fails twice
- Scope drifts from approved plan
- Missing asset/pose materially weakens experience and no acceptable fallback exists
- Empty stubs or undocumented placeholders are created
- Production deployment is about to happen
- Cost/tool usage exceeds reasonable limits
- Major visual/architecture/navigation decision needs Fritz approval

### Stop conditions (carried from earlier ledger version)

Stop immediately and request review if:

- A pass exit criterion cannot be met.
- A requested visual component is not possible with current assets/capabilities.
- The implementation requires skipping an approved design-map section.
- A task fails twice with the same root cause.
- The site visually changes during Pass 0.
- A missing asset/pose would materially weaken the experience.
- Production deploy is about to happen (explicit Fritz approval required).

---

## 5. Model Routing / Multi-Brain Support

### Medium model / orchestrator
Maintain ledger; track pass/status; assign sub-tasks; summarize progress; check proof; decide escalation; write closeouts.

### Specialist subagents
Visual direction, frontend architecture, accessibility, motion design, asset generation, Harry pose generation, QA.

### Codex
Implementation, refactors, file edits, test fixes, mechanical code changes, structured patch review.

### Claude Code
Larger architectural work, complex repo-aware changes, visual implementation passes, ultrathink gates, ultrareview.

### Higher reasoning / ultrathink
Used only when wrong choice is expensive: golden filmstrip direction, medallion model, Harry interaction model, scroll-snap strategy, asset art direction, pass boundary decisions.

### Escalation ladder

```text
1. Medium model orchestrates.
2. If blocked once → specialist subagent.
3. If blocked twice → higher reasoning.
4. If still blocked → Claude Code ultrathink.
5. If built but needs critique → /ultrareview.
6. If still unresolved → stop and ask Fritz.
```

---

## 6. Roadmap / Pass Ledger

### Pass 0 — Setup / Architecture

**Status:** ✅ complete
**Commit:** `dbec459`
**Closeout:** `closeouts/PASS-0-CLOSEOUT.md`

Landed:
- Z-layer architecture documented in `premiere.css` header (V3 §1.1)
- `premiere.js` init reorganized into named sections + P1 roadmap
- Asset directory `frontend/assets/premiere/` confirmed
- Preview server confirmed (port 3000)
- `1386d17` baseline confirmed

Exit criteria all met:
- `body[data-premiere="on"]` toggle does nothing visible: pass
- Preview renders unchanged: pass
- Smoke 7/7: green by accepted exception (no relevant surface modified)

Evidence: `evidence/p0-no-op-eval.json`

---

### Pass 1 — Reusable Structure

**Status:** ⏸ **paused for Fritz approval (D4 / D5 / D8)**
**Commit:** `6b9ca56`
**Closeout:** `closeouts/PASS-1-CLOSEOUT.md`

Landed:
- `.premiere-frame` golden filmstrip frame (sprocket strips top + bottom, polished gold gradient, 6s shimmer)
- `.premiere-divider` golden ribbon between sections (drop shadow + light-sweep)
- `.premiere-medallion-menu` brand-mark medallion + 7-destination radial menu (click/Esc/Tab/arrow accessible)
- Snap mechanism: `[data-snap="on"]` activates `scroll-snap-type: y mandatory`; scrollend listener with 150ms debounce fallback; 600ms bounce keyframe
- Harry vocabulary CSS: `.is-walking`, `.is-celebrating`, `.is-stepping-back`, `.premiere-peek` decorative instances
- Harry vocabulary JS: walk on home section change (desktop); celebrate on form-submit custom events
- Removals (gated by `[data-medallion-menu="mounted"]`): V1 top nav, edge film strips, .is-visible bounce, Compass label
- Cinema-gold tokens: `--c-gold-light/mid/deep/shadow` + `--grad-cinema-gold`
- Sandbox HTML at `frontend/_premiere-sandbox.html`
- Production page HTMLs NOT modified — propagation deferred to P2 after Fritz approval

Exit criteria status:
- Components testable on sandbox: ✅ pass
- Medallion menu opens/closes/keyboard-accessible: ✅ pass
- One section demonstrates frame-around-section: ⚠️ partial (sandbox demonstrates; production propagation in P2)
- Preview-verified: ✅ pass
- Smoke 7/7: ✅ green by accepted exception

Evidence: `evidence/p1-sandbox-state.json`

Decisions raised (need Fritz disposition):
- **D4** filmstrip frame visual — match the "shiny folded golden filmstrip tape" reference?
- **D5** medallion-as-menu + arc-by-quadrant fix for top-right placement
- **D8** snap mechanism cadence; iOS Safari real-device deferred to P6

---

### Pass 2 — Existing Assets Only

**Status:** ⬜ pending Fritz approval of P1
**Closeout location:** `closeouts/PASS-2-CLOSEOUT.md`

Purpose: build as much of the experience as possible using existing assets.

Parallel workstreams: Home poster wall in golden frames; Memorial quiet experience; RSVP form/frame + cinema-leader; Tickets fallback tier wall; Capsule envelope + mini-cards; Playlist vinyl + tracklist; Through-Years era frames + reel-leader.

Rules: existing 10 Harry poses + V1 fallbacks per `DEFERRED-ASSETS.md`; existing MP4s/JPGs/brand mark; mark every fallback clearly; do not pretend fallback is final.

Proof to Fritz: page-by-page preview; updated `DEFERRED-ASSETS.md`; screenshots; notes on what feels weak.

---

### Pass 3 — Missing Asset Generation

**Status:** 🚫 blocked on `GEMINI_API_KEY` expired (GAP-2026-05-05-03)

Purpose: generate missing Harry poses + premium visuals.

When key restored: priority order in `DEFERRED-ASSETS.md` §"Re-generation priority."

Each asset must log: filename, prompt, target path, dimensions, transparent y/n, tool used, approval status, fallback if rejected.

Proof to Fritz: contact sheet of generated poses; asset approval table; rejected/approved log.

---

### Pass 4 — Asset Integration

**Status:** ⬜ pending P3

Replace fallbacks with approved assets. Before/after comparisons; list of fallbacks removed/still deferred; page preview.

---

### Pass 5 — Motion Polish

**Status:** ⬜ pending

Title timing, Harry movement timing, scroll transition rhythm, animated type restraint, marquee timing, mobile motion reduction.

Review gate: `/ultrareview` after this pass, before formal QA.

---

### Pass 6 — QA / Accessibility / Performance

**Status:** ⬜ pending

Lighthouse mobile + desktop; keyboard; screen reader; iOS Safari (D8 verification); Android Chrome; reduced-motion; reduced-data; form submissions; chatbot; no console errors.

---

### Pass 7 — Final Review / Ship

**Status:** ⬜ pending

**Gate:** Do not merge to production without explicit Fritz approval.

Staging preview, final walkthrough, prod deploy checklist, smoke 7/7, rollback note.

---

### Pass 8 — Post-Review / Learning Loop

**Status:** ⬜ pending

Postmortem; improvement hooks; reusable builder rules; new agent/plugin/MCP ideas; updated tagging system; updated orchestration template.

Closeout: `closeouts/POST-REVIEW-LEARNING.md`

---

## 7. Parallel Workstream Map

Orchestration, Architecture, Visual system, Character/Harry, Motion, Asset generation, QA, Learning loop. (See V2/V3 plans for sub-task lists.)

---

## 8. Failure Log Template

Every repeated failure logged in `FAILURE-LOG.md`. No silent retries forever.

---

## 9. Decision Log Template

Active decisions in `DECISION-LOG.md`. Each entry: id, timestamp, pass, topic, options, chosen, why, rejected, still_open, needs_fritz/ultrathink/plan_subagent.

---

## 10. Proof Standard

Done = work completed + proof collected + risks logged + deferred items listed + next-pass recommendation + Fritz can understand without reading code. **No proof, no completion claim.**

---

## 11. Session Start Protocol

Read this ledger → Design Map → current pass closeout → branch/PR status. Then state: current pass, current approval, next action, stop condition, known blockers.

---

## 12. Session End Protocol

Update or report: current pass, completed tasks, blocked tasks, next action, proof links, open decisions, Fritz-review-needed flag, ledger-update flag.

---

## 13. Run History

| Timestamp | Pass | Event | Note |
|---|---|---|---|
| 2026-05-07 | — | Run initialized | Autonomy mode flipped from `guarded-autonomous` (pre-pass-0 only) to `guarded-autonomous-to-completion` per Fritz directive. Apparatus created. |
| 2026-05-07 | P0 | ✅ Closed | Header z-layer doc landed at `dbec459`. No visible regression. Smoke green by accepted exception. |
| 2026-05-07 | P1 | Started | Building filmstrip frame, ribbon divider, medallion menu, snap mechanism, Harry vocabulary. |
| 2026-05-07 | P1 | ⏸ Paused | Components built + sandbox demos. Awaiting Fritz on D4/D5/D8. Commit `6b9ca56`. Apparatus committed via second-pass after rebase reconciliation with Fritz's parallel ledger work. |

---

## 14. Cost / Tool Usage

| Tool | Cost characteristic | Used so far |
|---|---|---|
| Claude Opus 4.7 (this builder) | Subscription | This run, P0 + P1 |
| Plan / Explore subagents | Free within session | Not yet |
| Codex bridge | Rate-limited (hit limit 2026-05-05) | Not in this run |
| Gemini / nano-banana | API key expired | Blocked (P3) |
| Adobe Firefly | Auth unverified | Not attempted in this run |
| Lighthouse | Free | Pending P6 |
| Netlify deploy preview | Free with branch push | Pending P7 |

---

## 15. Learning Loop Notes

Initial hypothesis:

> A named ledger + pass-based execution + proof gates + escalation ladder should make long-running autonomous work more reliable across ChatGPT, Claude Code, Codex, and future agents.

Track for Pass 8: tagging, session capture, pass boundaries, model routing, agent specialization, cost controls, proof standards, rollback/defer logic; potential custom skills, agents, plugins, MCPs, reusable site-build templates.

---

## 16. Current Next Step

```yaml
next_step:
  action: fritz_review_sandbox_pass_1
  surface: http://localhost:3000/_premiere-sandbox.html (or staging URL post-push)
  decisions_to_disposition:
    - D4_filmstrip_frame_visual
    - D5_medallion_radial_menu_arc_by_quadrant
    - D8_snap_iOS_real_device_(deferred_to_P6_with_proximity_fallback_wired)
  unblock_conditions:
    - fritz_approves_or_iterates_or_redirects
  if_approved:
    next_action: start_pass_2
    scope: propagate_components_to_7_production_HTMLs_with_explicit_fallbacks
  if_iterate:
    next_action: revise_sandbox_per_feedback
    scope: sandbox_only
  if_redirect:
    next_action: revisit_design_map_section_5
    scope: planning_re_open
```
