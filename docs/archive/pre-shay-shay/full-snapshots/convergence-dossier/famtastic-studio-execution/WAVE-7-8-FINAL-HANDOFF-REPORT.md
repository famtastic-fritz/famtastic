# Wave 7-8 Final Handoff Report — Local-only FAMtastic Site Studio consolidation

Date: 2026-05-11
Branch: research/studio-intelligence-foundation-20260508
Working directory: /Users/famtasticfritz/famtastic-convergence-dossier
Scope: Wave 7 documentation consolidation + Wave 8 final review / merge-readiness handoff only

## Status

PASS for the requested local-only Wave 7 and Wave 8 scope.

No deploy was run. No merge was run. No DNS was touched. No secrets were printed or rotated. No paid/provider calls were made. Perplexity was documented as guarded/unproductized rather than exercised.

## Product truth preserved

- There is one unified Shay Shay assistant.
- `Shay Lite` is legacy code/surface naming only, not a separate assistant.
- Shay Shay is the ambient Site Studio assistant, aware of current page/object/context, tools/functions, local workflow state, and next actions.
- Larger work can open into Studio surfaces/locations such as Site Builder, Component Studio, Media Studio, Research, Think-Tank, Mission Control, or future workshop/desk/closet-style spaces; those are surfaces, not separate Shays.

## Files changed by this Wave 7-8 closeout

- `SITE-LEARNINGS.md`
  - Added `2026-05-11 — Studio Action Wiring Phase 3 + Wave 7 consolidation`.
  - Documented actual Phase 3 behavior and paths.
  - Documented `/api/studio-workflows/*` endpoints.
  - Documented `window.WorkflowAPI`, `window.ShayActions`, related local action APIs, task/learning/outcome/prompt-improvement ledgers, and draft paths.
  - Documented classifier intent names that still matter.
  - Documented config keys and the Perplexity guarded-research gap.
  - Updated known gaps honestly with closed and still-open gaps.

- `CHANGELOG.md`
  - Added a dated 2026-05-11 Wave 7-8 summary near the top.

- `FAMTASTIC-STATE.md`
  - Updated the Last updated line to 2026-05-11.
  - Added a recent milestone for Studio Action Wiring Phase 3 + docs consolidation.
  - Added `/api/studio-workflows/*` endpoint rows.
  - Updated Known Gaps to remove/mark gaps closed by current worktree and add remaining open gaps.
  - Added a `Closed 2026-05-11 — Studio Action Wiring Phase 3` section.
  - Added `workflow-api.js`, `studio-workflows-routes.js`, local workflow JSONL files, site draft path, and component draft path to file inventory.

- `docs/research/famtastic-studio-execution/WAVE-7-8-FINAL-HANDOFF-REPORT.md`
  - This final handoff report.

## Current behavior documented

- `site-studio/server/studio-workflows-routes.js` is mounted at `/api/studio-workflows` from `site-studio/server.js`.
- `GET /api/studio-workflows/state?tag=` aggregates local workflow state.
- `GET/POST /api/studio-workflows/sites/drafts` read/write `sites/_drafts/<tag>/draft.json` and append Studio tasks.
- `GET/POST /api/studio-workflows/components/drafts` read/write `components/studio-drafts/<id>/draft.json` and append Studio tasks.
- `GET/POST /api/studio-workflows/tasks`, `/learning`, `/outcomes`, and `/prompt-improvements` read/append local JSONL workflow records.
- `window.WorkflowAPI` exposes the local persistence client used by Sites, Components, Shay, Recipes, and Memory.
- `window.ShayActions` can route work, create tasks, capture learning, record outcomes, and capture prompt improvements locally.
- Media generation remains contract/local-only; local/manual registry save and assignment are real.
- Component insertion remains sandboxed under `sites/<tag>/_test/`; real surgical editor application remains a gap.
- Perplexity exists in the registry/router but lacks a Studio-visible budget/approval gate, so it remains guarded/unproductized and should not be called by default.

## Verification run

Command run from repo root:

```bash
git diff --check && npm test --prefix site-studio && node tests/studio/lane-static-checks.js && node scripts/plans/audit.js && git status --short --branch
```

Exact results:

- `git diff --check`: PASS, no output.
- `npm test --prefix site-studio`: PASS.
  - Vitest v4.1.1.
  - Test files: 4 passed.
  - Tests: 181 passed / 181.
  - Existing stderr/stdout classifier/tier diagnostics appeared; no failures.
- `node tests/studio/lane-static-checks.js`: PASS.
  - `STATIC: 187 PASS / 0 FAIL (total=187)`.
  - Included JSX parsing, browser lib node checks, server module node checks, server.js check, mount checks, Mission Control drift trip-wire, Phase 1 assertions, and Phase 2 assertions.
- `node scripts/plans/audit.js`: PASS / clean.
  - Active plans: 8.
  - Drift active + zero open tasks: 0.
  - Conflicts: 0.
  - Orphan tasks: 0.
  - Verdict: clean.
- `git status --short --branch`: ran successfully; status remains dirty with unrelated/parallel work plus this docs closeout.

## Known gaps remaining

- `/studio.html` is ready for Fritz to use as the main local workbench, but not production-ready and not deployed.
- Native builder-side execution of staged site drafts is still missing; `sites/_drafts/<tag>/draft.json` is only a safe handoff artifact.
- Media Studio Generate remains contract/local-only; paid/provider round-trip needs a visible cost gate, budget display, and approval flow.
- Component insertion remains sandboxed and placeholder-based; `lib/surgical-editor.js` is not invoked against real site output yet.
- Perplexity is purchased/available in concept and present in `research-registry.js`, but lacks a Studio-visible budget/approval gate and should remain guarded/unproductized by default.
- Standalone Shay screen still lacks a real brain chat/tool round-trip; local tasks/learnings/outcomes/prompt improvements work.
- Local workflow records are append-only JSON/JSONL with no review/approval/compaction lifecycle or schema migration path yet.
- A dedicated Phase 3 browser smoke script should be codified from the targeted proof path.
- Parallel dirty worktree items remain and were intentionally preserved.

## Merge readiness

Not merge-ready as a clean branch from this worker alone.

The requested Wave 7-8 docs closeout is complete and verified, but the branch/worktree still contains many unrelated or pre-existing dirty files from parallel active workstreams. The code/test state is locally green, yet a human or integration worker should review the full dirty set and split/stage only the intended Studio consolidation files before merging.

## Current status after verification

`git status --short --branch` at verification time reported:

```text
## research/studio-intelligence-foundation-20260508
 M .brain-context-codex
 M .brain-context-gemini
 M AGENT-COORDINATION.md
 M CHANGELOG.md
 M FAMTASTIC-STATE.md
 M SITE-LEARNINGS.md
 M memory/usage.jsonl
 M package-lock.json
 M package.json
 M site-studio/package-lock.json
 M site-studio/package.json
 M site-studio/public/index.html
 M site-studio/public/js/studio-orb.js
 M site-studio/public/studio/src/lib/shay-actions.js
 M site-studio/public/studio/src/lib/sites-actions.js
 M site-studio/public/studio/src/lib/workflow-api.js
 M site-studio/public/studio/src/recipe-flow.jsx
 M site-studio/public/studio/src/screens/component-studio.jsx
 M site-studio/public/studio/src/screens/shay.jsx
 M site-studio/public/studio/src/screens/sites.jsx
 M site-studio/server/studio-workflows-routes.js
 M site-studio/tests/unit.test.js
 M tasks/tasks.jsonl
?? .hermes/
?? MBSH-Cleanup-Run-2026-05-10.md
?? captures/inbox/phase3-proof-capture.capture.json
?? captures/promotions/
?? components/studio-drafts/
?? docs/research/famtastic-studio-execution/STUDIO-RUNTIME-FINAL-VERIFY-REPORT.md
?? site-studio/public/js/shay-bridge-client.js
?? tasks/studio-learning-candidates.jsonl
?? tasks/studio-outcomes.jsonl
?? tasks/studio-prompt-improvements.jsonl
```

The final verification status snapshot includes this report as `?? docs/research/famtastic-studio-execution/WAVE-7-8-FINAL-HANDOFF-REPORT.md`.

## Handoff notes

Recommended next commands for Fritz or the integration worker:

```bash
git diff --check
npm test --prefix site-studio
node tests/studio/lane-static-checks.js
node scripts/plans/audit.js
git status --short --branch
```

Then inspect and stage intentionally, for example:

```bash
git diff -- SITE-LEARNINGS.md CHANGELOG.md FAMTASTIC-STATE.md docs/research/famtastic-studio-execution/WAVE-7-8-FINAL-HANDOFF-REPORT.md
```

Do not sweep unrelated dirty files into a commit without reviewing their owner/scope.
