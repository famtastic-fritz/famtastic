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
current_phase: planning-complete
current_pass: pre-pass-0
status: awaiting-pass-0-execution
review_gate: strict
autonomy_mode: guarded-autonomous
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

---

## 3. Current Status

```yaml
current_status:
  plan_name: FAMtastic Site Build — MBSH Premiere Experience
  current_pass: pre-pass-0
  next_action: execute-pass-0-only
  approved_to_build: pass-0-only-after-ledger-creation
  blocked_by: none
  must_stop_after: pass-0-closeout
  last_review: Design Map approved as build blueprint, not full build approval
  next_review_needed: after Pass 0 closeout
```

### Immediate next action

Run Pass 0 only in the `mbsh-reunion` product repo.

Do not start Pass 1.

---

## 4. Autonomy Model

### Mode

```yaml
autonomy_mode: guarded-autonomous
```

Meaning:

- The system may operate autonomously inside an approved pass.
- The system may not jump to the next pass without closeout and review.
- The system may not silently downgrade missing assets or poses.
- The system may not treat fallbacks as final without logging them.
- The system must produce proof before claiming a pass is complete.
- The system must stop at Fritz review gates.

### Stop conditions

Stop immediately and request review if:

- A pass exit criterion cannot be met.
- A requested visual component is not possible with current assets/capabilities.
- The implementation requires skipping an approved design-map section.
- A task fails twice with the same root cause.
- The builder is tempted to move to the next pass.
- The site visually changes during Pass 0.
- A missing asset/pose would materially weaken the experience.

---

## 5. Model Routing / Multi-Brain Support

### Medium model / orchestrator

Use for:

- Maintaining this ledger.
- Tracking current pass and status.
- Assigning sub-tasks.
- Summarizing progress.
- Checking whether proof exists.
- Deciding whether a task should escalate.
- Writing closeout reports.

### Specialist subagents

Use for:

- Visual direction.
- Frontend architecture.
- Accessibility.
- Motion design.
- Asset generation.
- Harry pose generation.
- QA.

### Codex

Use for:

- Implementation.
- Refactors.
- File edits.
- Test fixes.
- Mechanical code changes.
- Structured patch review.

### Claude Code

Use for:

- Larger architectural work.
- Complex repo-aware changes.
- Visual implementation passes.
- Ultrathink gates.
- Ultrareview.

### Higher reasoning / ultrathink

Use only when the wrong choice is expensive:

- Golden filmstrip direction.
- Medallion navigation model.
- Harry interaction model.
- Scroll-snap strategy.
- Asset generation art direction.
- Pass boundary decisions.

### Escalation ladder

```text
1. Medium model tries to orchestrate.
2. If blocked once, ask a specialist subagent.
3. If blocked twice, ask a higher reasoning model.
4. If still blocked, switch to Claude Code ultrathink.
5. If implementation is built and needs critique, use /ultrareview.
6. If still unresolved, stop and ask Fritz.
```

---

## 6. Roadmap / Pass Ledger

### Pass 0 — Setup / Architecture

**Status:** not-started  
**Approval:** approved after this ledger exists  
**Stop after:** Pass 0 closeout

Purpose:

Prepare the structure without changing the visible site.

Allowed:

- Document z-layer architecture.
- Verify feature flag behavior.
- Scaffold files/directories.
- Reorganize `premiere.js` into named sections.
- Confirm preview/dev workflow.
- Confirm asset directory.

Not allowed:

- No visual redesign.
- No new components.
- No page redesign.
- No new assets.
- No full-site implementation.
- No CSS visual rules beyond no-op scaffolding.

Proof to Fritz:

- Files touched.
- What changed.
- Confirmation that the site still renders unchanged.
- Confirmation that smoke checks remain green.
- Preview URL if available.
- Risks/blockers found.
- Whether Pass 1 is ready.
- Which Pass 1 decisions need ultrathink.
- Which technical questions need Plan-subagent review.

Closeout location:

```text
docs/sites/site-mbsh-reunion/closeouts/PASS-0-CLOSEOUT.md
```

---

### Pass 1 — Reusable Structure

**Status:** not-started  
**Approval:** requires Pass 0 closeout review

Purpose:

Build the shared foundation components.

Potential parallel workstreams after Pass 0:

- Golden filmstrip frame prototype.
- Medallion menu prototype.
- Harry usher controller prototype.
- Snap/scroll transition prototype.
- Stage/backdrop slot setup.

Reasoning gates before Pass 1:

- Ultrathink: golden filmstrip visual direction.
- Ultrathink: medallion menu behavior and placement.
- Plan subagent: scroll-snap / iOS Safari strategy.
- Plan subagent: medallion keyboard/focus strategy if not already obvious.

Proof to Fritz:

- Isolated section or sandbox demonstrating each component.
- Keyboard test for medallion menu.
- Reduced-motion behavior shown.
- No broad page redesign.

---

### Pass 2 — Existing Assets Only

**Status:** not-started

Purpose:

Build as much of the experience as possible using assets already in the repo.

Parallel workstreams:

- Home existing-asset experience.
- Memorial quiet experience.
- RSVP form/frame experience.
- Tickets fallback tier wall.
- Capsule mini-card/fallback experience.
- Playlist fallback experience.
- Through-the-Years era frames.

Rules:

- Use existing 10 Harry poses only.
- Use existing MP4s/JPGs/brand mark.
- Mark every missing asset fallback clearly.
- Do not pretend fallback is final.

Proof to Fritz:

- Page-by-page preview.
- Missing asset list updated.
- Fallback list updated.
- Screenshots or screen capture.
- Notes on what feels weak because assets are missing.

---

### Pass 3 — Missing Asset Generation

**Status:** not-started

Purpose:

Generate missing Harry poses and premium visuals.

Parallel workstreams:

- Harry pose batch.
- Page backdrop batch.
- Filmstrip / ribbon / medallion polish.
- Animated typography assets if needed.
- Brand mark foil treatment.

Each asset must log:

- Filename.
- Prompt.
- Target path.
- Dimensions.
- Transparent background yes/no.
- Tool used.
- Approval status.
- Fallback if rejected.

Proof to Fritz:

- Contact sheet of generated Harry poses.
- Asset approval table.
- Rejected assets logged.
- Final approved assets listed by path.

---

### Pass 4 — Asset Integration

**Status:** not-started

Purpose:

Replace fallbacks with approved assets.

Parallel workstreams:

- Harry pose integration.
- Background integration.
- Visual frame integration.
- Ticket/capsule/sponsor asset integration.

Proof to Fritz:

- Before/after comparisons.
- List of fallbacks removed.
- List of fallbacks still deferred.
- Page preview.

---

### Pass 5 — Motion Polish

**Status:** not-started

Purpose:

Make the experience feel premium instead of busy.

Focus:

- Title timing.
- Harry movement timing.
- Scroll transition rhythm.
- Animated type restraint.
- Marquee timing.
- Mobile motion reduction.

Review gate:

Use `/ultrareview` after this pass, before formal QA.

Proof to Fritz:

- Screen recording on desktop.
- Screen recording on phone.
- Reduced-motion walkthrough.
- List of toned-down animations.

---

### Pass 6 — QA / Accessibility / Performance

**Status:** not-started

Purpose:

Prove it works.

Checks:

- Lighthouse mobile.
- Lighthouse desktop.
- Keyboard navigation.
- Screen-reader sanity check.
- iOS Safari check.
- Android Chrome check.
- Reduced-motion.
- Reduced-data.
- Form submissions.
- Chatbot opens.
- No console errors.

Proof to Fritz:

- QA checklist.
- Test results.
- Known issues.
- Accepted exceptions.
- Final blocker list.

---

### Pass 7 — Final Review / Ship

**Status:** not-started

Purpose:

Deploy the experience safely.

Proof to Fritz:

- Staging preview.
- Final walkthrough.
- Production deployment checklist.
- Smoke 7/7.
- Rollback note.

---

### Pass 8 — Post-Review / Learning Loop

**Status:** not-started

Purpose:

Improve the FAMtastic system from what was learned.

Review questions:

- What went well?
- What got confusing?
- Where did the builder move too fast?
- Where did asset planning help?
- Where did tagging help or fail?
- Where did pass boundaries help or fail?
- Where did autonomous execution need better controls?
- What should become a reusable skill?
- What should become an agent?
- What should become an MCP/plugin?
- What should become a template?
- What should be added to the FAMtastic build pipeline?

Outputs:

- Postmortem.
- Improvement hooks.
- Reusable builder rules.
- New agent/plugin/MCP ideas.
- Updated tagging system.
- Updated orchestration template.

Closeout location:

```text
docs/sites/site-mbsh-reunion/closeouts/POST-REVIEW-LEARNING.md
```

---

## 7. Parallel Workstream Map

Once Pass 0 closes, future work may split like this:

### Orchestration

- Maintain this ledger.
- Track pass status.
- Collect proof.
- Decide escalation.

### Architecture

- Feature flag.
- Z-layers.
- File structure.
- JS organization.

### Visual system

- Filmstrip frame.
- Ribbon divider.
- Stage backdrops.
- Poster wall.

### Character / Harry

- Harry controller.
- Pose gap register.
- Pose prompts.
- Interaction map.

### Motion

- Snap behavior.
- Title animation.
- Transition rhythm.
- Reduced-motion fallbacks.

### Asset generation

- Pose batch.
- Backgrounds.
- SVG assets.
- Approval sheets.

### QA

- Smoke.
- Mobile.
- Accessibility.
- Performance.

### Learning loop

- Postmortem.
- Improvement hooks.
- Reusable FAMtastic logic.

---

## 8. Failure Log Template

Every repeated failure gets logged.

```yaml
failure:
  failure_id:
  timestamp:
  pass:
  workstream:
  task:
  what_failed:
  tool_or_model:
  attempt_count:
  root_cause_guess:
  next_action:
  escalation_needed:
  status:
```

No silent retries forever.

---

## 9. Decision Log Template

```yaml
decision:
  decision_id:
  timestamp:
  pass:
  topic:
  options_considered:
  chosen_direction:
  why:
  rejected:
  still_open:
  needs_fritz_review:
  needs_ultrathink:
  needs_plan_subagent:
```

---

## 10. Proof Standard

For every pass, done means:

1. Work completed.
2. Proof collected.
3. Risks logged.
4. Deferred items listed.
5. Next-pass recommendation written.
6. Fritz can understand what changed without digging through code.

No proof, no completion claim.

---

## 11. Session Start Protocol

Every agent/session must start by reading:

1. This ledger.
2. `PREMIERE-DESIGN-MAP-2026-05-07.md`.
3. Current pass closeout, if any.
4. Current branch / PR status in the product repo.

Then state:

```text
Current pass:
Current approval:
Next action:
Stop condition:
Known blockers:
```

---

## 12. Session End Protocol

Every agent/session must end by updating or reporting:

1. Current pass.
2. Completed tasks.
3. Blocked tasks.
4. Next action.
5. Proof links.
6. Open decisions.
7. Whether Fritz review is needed.
8. Whether ledger update is needed.

---

## 13. Claude Code Kickoff Prompt

Use this prompt when starting Pass 0 in Claude Code:

```text
Read the following files first:

1. docs/sites/site-mbsh-reunion/MBSH-PREMIERE-BUILD-LEDGER.md
2. docs/sites/site-mbsh-reunion/PREMIERE-DESIGN-MAP-2026-05-07.md
3. docs/sites/site-mbsh-reunion/PREMIERE-EXPERIENCE-V3-PLAN-2026-05-07.md
4. docs/sites/site-mbsh-reunion/PREMIERE-EXPERIENCE-V2-PLAN-2026-05-07.md

Plan name:
FAMtastic Site Build — MBSH Premiere Experience

Tags:
parent:famtastic-site
site:mbsh-reunion
project:premiere-experience
pass:0-setup-architecture
workstream:orchestration
review-gate:strict

You are cleared for Pass 0 only.

Do not start Pass 1.

Pass 0 scope:
- document z-layer architecture
- verify feature flag behavior
- scaffold files/directories
- reorganize premiere.js into named sections
- confirm preview/dev workflow
- confirm asset directory
- no visible design changes
- no CSS visual rules beyond no-op scaffolding
- no page redesign
- no new components yet

Autonomy mode:
guarded-autonomous

You may operate autonomously inside Pass 0, but you must stop at Pass 0 closeout.

Exit with a closeout report showing:
- files touched
- what changed
- confirmation that the site still renders unchanged
- confirmation that smoke checks remain green
- risks or blockers found
- whether Pass 1 is ready
- which decisions require ultrathink before Pass 1
- which technical questions require Plan subagent review

Do not proceed to Pass 1 without explicit approval.
```

---

## 14. Post-Run Verification Prompt

Use this after Claude Code completes Pass 0:

```text
Review the Pass 0 closeout for the FAMtastic Site Build — MBSH Premiere Experience.

Check:
1. Did it stay inside Pass 0 scope?
2. Were there any visible design changes? There should not be.
3. Were files scaffolded or reorganized safely?
4. Was premiere.js reorganized without behavior regressions?
5. Was the asset directory confirmed?
6. Was the feature flag verified?
7. Did the preview still render unchanged?
8. Did smoke checks remain green?
9. Are risks/blockers logged clearly?
10. Is Pass 1 readiness honestly assessed?
11. Are ultrathink decisions identified before Pass 1?
12. Are Plan-subagent technical questions identified before Pass 1?
13. Does the closeout provide enough proof for Fritz without reading code?
14. Should Pass 1 be approved, revised, or blocked?

Return:
- verdict
- evidence
- missing proof
- required corrections
- recommendation for next action
```

---

## 15. Learning Loop Notes

This project is also evaluating the FAMtastic long-running autonomous build process.

Track opportunities for:

- Better tagging.
- Better session capture.
- Better pass boundaries.
- Better model routing.
- Better agent specialization.
- Better cost controls.
- Better proof standards.
- Better rollback/defer logic.
- Custom skills.
- Custom agents.
- Plugins.
- MCPs.
- Reusable FAMtastic site build templates.

Initial hypothesis:

```text
A named ledger + pass-based execution + proof gates + escalation ladder should make long-running autonomous work more reliable across ChatGPT, Claude Code, Codex, and future agents.
```

This must be evaluated in Pass 8.

---

## 16. Current Next Step

```yaml
next_step:
  action: run_claude_code_pass_0
  allowed_scope: pass_0_only
  stop_after: pass_0_closeout
  review_required: true
```
