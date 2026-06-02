---
title: Planning Lesson — Desktop daily-usability plan (first attempt)
date: 2026-05-30
score: 5
tags:
- desktop
- ipc-audit-error
- truncation
- planning
- self-learning
permalink: shay-memory/learnings/planning-lesson-2026-05-30
---

# Planning Lesson: Desktop daily-usability plan (first attempt)

**Score:** 5/10

## What went wrong
- Plan shipped truncated mid-sentence ('Gateway routes are al...')
- Claimed hermesAPI has 3 IPC bindings — actually 60+ (grep-counted context hits, not bindings)
- Missed that domains.ts/exposeShayDomains already exists — the window.shay.* fix is one import line
- Produced no build order / sequencing
- Assessed only ~10 of 20 screens

## Root causes
- No grounding step — stated codebase facts from memory instead of verifying with grep/wc
- No completeness gate — truncated output shipped unchecked
- No build-order requirement enforced in the prompt/gate

## Fixes applied / to apply
- ground_claim() — verify every codebase fact with a real command before stating it
- plan_completeness_gate() — reject truncated/section-incomplete plans
- Require an explicit build-order section + verify it exists in the gate

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.

---

---
title: Planning Lesson — planning_loop: Produce a tight desktop daily-usability plan for the Shay De
date: 2026-05-30
score: 8
tags: ['planning-loop', 'enforcing-gate', 'planning', 'self-learning']
---

# Planning Lesson: planning_loop: Produce a tight desktop daily-usability plan for the Shay De

**Score:** 8/10

## What went wrong
- attempt 1: plan appears truncated — ends mid-sentence: '...to settings → save → quit) completes without requiring a mouse click at any step'

## Root causes
- completeness gate caught incomplete output; auto-reprompt engaged

## Fixes applied / to apply
- resolved in 2 attempt(s)

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — refine_to_target backfired — score-chasing caused adversarial collapse
date: 2026-05-30
score: 7
tags: ['refine-loop', 'adversarial-collapse', 'score-chasing', 'negative-result', 'verified', 'planning', 'self-learning']
---

# Planning Lesson: refine_to_target backfired — score-chasing caused adversarial collapse

**Score:** 7/10

## What went wrong
- Refining the 8/10 plan to chase a target score made it WORSE: final 7/10, and content halved from 13,625 to 6,092 chars.
- Score trajectory went DOWN each round: 3.3 -> 2.7 -> 2.7. No convergence.
- Same plan scored 8/10 by a holistic rescore but 3.3/10 by three harsh lenses — scoring is non-deterministic and lens-dependent, so it's not a stable optimization target.
- 'Apply 23 fixes' + 'keep everything verbatim' are contradictory — the brain compressed/rewrote and lost detail instead of surgically patching.
- Critics always returned 20+ fixes regardless of quality — there is no fixed bar to converge toward.

## Root causes
- Optimizing against a subjective 0-10 score causes goal displacement / adversarial collapse — the artifact degrades toward whatever superficially silences the critic.
- A moving, non-deterministic score cannot be climbed like a hill.
- Contradictory revision instructions (apply-all-fixes + keep-verbatim) force the model to choose, and it chose to shrink.

## Fixes applied / to apply
- Do NOT optimize against a numeric score. Use a FIXED, binary, deterministic checklist (e.g. 'has a build-order section: Y/N', 'every step is a code change not a verify: Y/N', 'cites grounded IPC count: Y/N').
- Revision must be ADDITIVE/SURGICAL against the checklist — only add what's missing, never regenerate the whole artifact.
- Cap critic fixes to the unmet checklist items, not open-ended 'what's wrong' (which never converges).
- Measure success by checklist-items-passed, not by an LLM score.

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app capability PROVEN — autonomous single + multi-file builds on the real desktop
date: 2026-05-30
score: 9
tags: ['build-app', 'multi-file', 'capability-proven', 'vacuous-pass-fixed', 'planning', 'self-learning']
---

# Planning Lesson: build_app capability PROVEN — autonomous single + multi-file builds on the real desktop

**Score:** 9/10

## What went wrong
- First run was a vacuous pass: manifest had a non-absolute path, write_file rejected it, nothing written, but the already-clean typecheck passed → falsely reported success.

## Root causes
- multi_file_code_job trusted a passing test even when 0 files were written; build_app decomposition emitted project-relative paths instead of absolute.

## Fixes applied / to apply
- Added vacuous-pass guard (files_written < manifest = FAIL); added path resolution against project_root; decomposition now demands absolute paths.
- PROVEN: single-file self-heal across 3 iterations (exposeShayDomains wire-in, real TS errors fixed autonomously); multi-file coordinated build (new file + edit) compiles first try.

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — Runtime render gate — built + proven (catches the bug typecheck can't)
date: 2026-05-30
score: 9
tags: ['runtime-gate', 'render-loop', 'vitest', 'capability-proven', 'planning', 'self-learning']
---

# Planning Lesson: Runtime render gate — built + proven (catches the bug typecheck can't)

**Score:** 9/10

## What went wrong
- First attempt: used --reporter=basic, which was REMOVED in vitest 4 → infra error, even the clean test 'failed'.
- Second attempt: the infinite-loop component HUNG vitest instead of throwing cleanly; TimeoutExpired escaped because the gate only caught RuntimeError.

## Root causes
- Assumed vitest CLI flags without checking the installed major version (4).
- Assumed a render loop always throws 'Maximum update depth' — it can also just hang the runner.

## Fixes applied / to apply
- Dropped the invalid reporter flag.
- Gate now treats subprocess timeout AS the loop signature (looped=True, fail). Two detection paths: 'Maximum update depth' string OR hang/timeout.
- PROVEN: clean component passes, infinite-loop component fails. runtime_render_gate() now catches the SessionNamePicker bug class that typecheck cannot.

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: In /Users/famtasticfritz/famtastic/shay-desktop-electron/src
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: In /Users/famtasticfritz/famtastic/shay-desktop-electron/src

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/App.tsx(205,15): error TS1005: '}' expected."] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — NORTH STAR milestone: Shay autonomously edits her core render path, two-gated, repeatable
date: 2026-05-30
score: 9
tags: ['north-star', 'surgical-patch', 'two-gate', 'capability-proven', 'core-render-path', 'planning', 'self-learning']
---

# Planning Lesson: NORTH STAR milestone: Shay autonomously edits her core render path, two-gated, repeatable

**Score:** 9/10

## What went wrong
- First Gate-B attempt failed: full-file regeneration of 250-line App.tsx kept dropping braces (TS1005), 4 iterations, rolled back.

## Root causes
- multi_file_code_job regenerates the WHOLE file each iteration — fragile for large existing files.

## Fixes applied / to apply
- Built surgical_patch(): brain rewrites only small anchored regions, never the whole file. Result: mounted Soul AND Models into App.tsx/MainShell, FIRST iteration each, both gates (typecheck + render) green. App compiles clean. Capability proven repeatable.
- Two-gate build (typecheck + runtime render gate) now protects core-render-path edits — catches both compile errors and render loops.

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — planning_loop: Produce the COMPLETE, MAPPED build plan for the ULTIMATE Sha
date: 2026-05-30
score: 4
tags: ['planning-loop', 'enforcing-gate', 'planning', 'self-learning']
---

# Planning Lesson: planning_loop: Produce the COMPLETE, MAPPED build plan for the ULTIMATE Sha

**Score:** 4/10

## What went wrong
- attempt 1: plan appears truncated — ends mid-sentence: '...Screens

```
FILES:
  - src/renderer/src/screens/Welcome/index.tsx [NEW]
  - src'; missing required section: 'Acceptance Criteria'
- attempt 2: plan appears truncated — ends mid-sentence: '... MCP Console | `swarm:mcp:list`, `swarm:mcp:invoke`, response inspector |
| U5.2'; missing required section: 'Per-Unit Recipe'
- attempt 3: plan appears truncated — ends mid-sentence: '...load into domain files if patch fails twice |
| Runtime render gate times out on'

## Root causes
- completeness gate caught incomplete output; auto-reprompt engaged

## Fixes applied / to apply
- still failing after 3 attempts — needs manual review

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — Anti-truncation (per-section synthesis) + ralph autonomous loop — both built & verified
date: 2026-05-30
score: 9
tags: ['per-section-synthesis', 'ralph-loop', 'autonomous-build', 'verified', 'planning', 'self-learning']
---

# Planning Lesson: Anti-truncation (per-section synthesis) + ralph autonomous loop — both built & verified

**Score:** 9/10

## What went wrong
- ULTIMATE plan truncated at token ceiling (single-call synthesis of 8 sections).

## Root causes
- One brain call can't finish 8 dense sections within budget.

## Fixes applied / to apply
- synthesize_sections(): generate each section in its own call + assemble. Verified: same 8-section plan went 6.5k truncated → 25.8k complete, gate-passed first try. Wired into planning_loop for 5+ section plans.
- .ralph/ loop built (prd.json 20 stories, loop.py gated driver over build_app, guardrails.md). Deterministic Python over Shay's pipeline — survives context, one gated unit per iteration, blocks-and-continues on failure. Dry-run verified.

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: In src/renderer/src/App.tsx MainShell, extend the nav-view c
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: In src/renderer/src/App.tsx MainShell, extend the nav-view c

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/App.tsx(179,6): error TS17008: JSX element 'ThemeProvider' has no corresponding closing tag.", "src/renderer/src/App.tsx(180,8): error TS17008:

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: In src/renderer/src/App.tsx MainShell, extend the nav-view c
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: In src/renderer/src/App.tsx MainShell, extend the nav-view c

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=['anchors not found in file: [\'case "soul":\\n          return <Soul />;\\n        ca\']'] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: In src/renderer/src/App.tsx MainShell, extend the nav-view c
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: In src/renderer/src/App.tsx MainShell, extend the nav-view c

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=['could not derive anchored edits'] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: In src/renderer/src/App.tsx MainShell, extend the nav-view c
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: In src/renderer/src/App.tsx MainShell, extend the nav-view c

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=['anchors not found in file: [\'const activeScreen = useNavStore((s) => s.activeSc\', \'switch (activeScreen) {\\n            case "soul":\\n \']'] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — Surgical edits: show the brain the WHOLE relevant file, not cur[:6000]
date: 2026-05-30
score: 9
tags: ['build-app', 'surgical_patch', 'render-spine', 'anchor-fidelity', 'truncation', 'ralph', 'planning', 'self-learning']
---

# Planning Lesson: Surgical edits: show the brain the WHOLE relevant file, not cur[:6000]

**Score:** 9/10

## What went wrong
- ralph U1 blocked 3x: brain proposed anchors (switch/case, activeScreen) that don't exist in App.tsx
- App.tsx routing block lived past char 6000; the edit-planning prompt truncated it out
- with the real code unseen, the brain invented a plausible-but-wrong file structure to anchor to

## Root causes
- existing-file edit planning truncated current content to 6000 chars, hiding the exact region to edit
- surgical_patch was orphaned — build_app full-regenerated existing files (separate root cause, fixed same session)

## Fixes applied / to apply
- show up to 24000 chars (whole file when reasonable) in the edit-planning prompt; never anchor to unseen code
- route existing-file edits through surgical_patch (anchored), never full-regen
- render-spine heuristic forces >=2 small additive anchors (add const, then swap one return line)
- retry edit-derivation 3x and LOG raw output so a bad brain response doesn't silently kill the unit
- run the ralph loop under Shay's 3.13 venv so hermes fuzzy-match primitives import (3.10+ syntax)
- build gate (vite build) catches CSS/runtime errors typecheck cannot (e.g. missing } in a .module.css)

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Promote Sessions screen stub to a live list reading sessions
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Promote Sessions screen stub to a live list reading sessions

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/SessionsScreen.tsx(26,26): error TS2352: Conversion of type 'HermesAPI' to type 'Record<string, unknown>' may be a mistake because neit

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Wire Settings screen actions to settings IPC. Typecheck clea
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Wire Settings screen actions to settings IPC. Typecheck clea

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/SettingsScreen.tsx(217,20): error TS1005: '}' expected."] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Promote Providers screen to live CRUD via keychain IPC. Type
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Promote Providers screen to live CRUD via keychain IPC. Type

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/ProvidersScreen.tsx(169,6): error TS17008: JSX element 'div' has no corresponding closing tag.", "src/renderer/src/screens/ProvidersScr

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Create src/renderer/src/screens/AgentMonitor/index.tsx showi
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Create src/renderer/src/screens/AgentMonitor/index.tsx showi

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=['anchors not found in file: ["import Models from \'./screens/Models/Models\';"]'] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Promote Kanban screen to read swarm:queue:list. Typecheck cl
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Promote Kanban screen to read swarm:queue:list. Typecheck cl

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/Kanban/index.tsx(236,17): error TS1005: '}' expected."] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Create Logs screen streaming swarm:log:stream; register rout
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Create Logs screen streaming swarm:log:stream; register rout

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["shell exit 2: \n> shay-desktop@0.4.3 typecheck:node\n> tsc --noEmit -p tsconfig.node.json --composite false\n\n\n> shay-desktop@0.4.3 typecheck:web\n> tsc --noE

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Create Diagnostics screen showing system health; register ro
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Create Diagnostics screen showing system health; register ro

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=['anchors not found in file: ["import Models from \'./screens/Models/Models\';"]'] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Promote Gateway screen to show MCP server connections via he
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Promote Gateway screen to show MCP server connections via he

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/screens/Gateway/index.tsx(90,6): error TS17008: JSX element 'div' has no corresponding closing tag.", "src/renderer/src/screens/Gateway/index.t

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Create CaptureInbox screen reading the Shay-Memory/inbox cap
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Create CaptureInbox screen reading the Shay-Memory/inbox cap

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/components/Sidebar.tsx(2,25): error TS2307: Cannot find module 'react-router-dom' or its corresponding type declarations."] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Create src/renderer/src/screens/AgentMonitor/index.tsx showi
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Create src/renderer/src/screens/AgentMonitor/index.tsx showi

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=["src/renderer/src/components/Sidebar.tsx(2,25): error TS2307: Cannot find module 'react-router-dom' or its corresponding type declarations."] render=None

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.


---

---
title: Planning Lesson — build_app: Create Diagnostics screen showing system health; register ro
date: 2026-05-30
score: 3
tags: ['build-app', 'multi-file', 'typecheck', 'planning', 'self-learning']
---

# Planning Lesson: build_app: Create Diagnostics screen showing system health; register ro

**Score:** 3/10

## What went wrong
- build failed at typecheck stage
- detail: Failed at typecheck. typecheck_errors=['shell exit 2: \n> shay-desktop@0.4.3 typecheck:node\n> tsc --noEmit -p tsconfig.node.json --composite false\n\n\n> shay-desktop@0.4.3 typecheck:web\n> tsc --noE

## Root causes
- typecheck: cross-file contract or a runtime render issue the brain couldn't resolve

## Fixes applied / to apply
- narrow the manifest, add grounded context, or split into smaller builds

## Carry-forward rule
Before the next planning run, read this lesson. Apply ground_claim() to every
factual claim about the codebase. Run plan_completeness_gate() before shipping.
