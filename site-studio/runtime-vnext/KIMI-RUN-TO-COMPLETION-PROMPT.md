You are Kimi Code.

Primary workdir
/Users/famtasticfritz/famtastic-worktrees/site-studio-runtime-vnext-closeout/site-studio

Branch already prepared for you
feature/site-studio-runtime-vnext-closeout

Safety snapshot already prepared
- dirty-state backup dir: /Users/famtasticfritz/famtastic/backups/site-studio-runtime-vnext-prep-20260722-161831
- tracked patch: /Users/famtasticfritz/famtastic/backups/site-studio-runtime-vnext-prep-20260722-161831/tracked.patch
- untracked archive: /Users/famtasticfritz/famtastic/backups/site-studio-runtime-vnext-prep-20260722-161831/untracked-files.tgz

Mission
Make Site Studio work without depending on Claude `-p` / direct Claude subprocess orchestration as the runtime backbone. Run this to completion inside the prepared clean worktree. Do not stop for preference questions. Deliver a working bounded Site Studio path that proves both single-page and multi-page builds through runtime-vnext, then create a clean commit on the prepared branch once proof passes.

Operating mode
- Read-only assessment is over. Execute.
- Work only inside the prepared worktree branch unless you must read repo truth from the source tree.
- Do not ask the operator to make architecture choices unless you hit a true external blocker.
- Default to the narrowest safe implementation that restores a working Site Studio build path, but the proof for this run must include multi-page capability, not only one-page.
- Old runtime may remain available, but the working path you deliver must not depend on `claude -p` as the core execution model.
- Keep changes scoped primarily to `runtime-vnext/`, `tests/runtime-vnext/`, and the minimal legacy integration points needed to expose the working path.
- Do not rewrite UI broadly.
- Do not do deploy work.
- Do not fake parity or success.

Non-negotiable repo truth
1. Canonical contracts live in `runtime-vnext/contracts/`.
2. `runtime-vnext/CAPTAIN-BRIEF.md` marks M1-M11 complete.
3. `runtime-vnext/contracts/migration-policy.md` is the M12 contract surface and is still DRAFT.
4. `runtime-vnext/harness/reports/single-page-build-parity.md` shows the old baseline is unhealthy because zero output files were captured.
5. `runtime-vnext/research/live-truth-inventory.md` documents the legacy blockers:
   - mutable global `TAG`
   - path authority derived from `TAG`
   - in-memory build lock globals
   - WebSocket-owned runtime state
   - `spawnClaude` fallback path
6. `tests/runtime-vnext/deterministic-recipe.test.js` and `tests/runtime-vnext/consumer-contract.test.js` currently pass.
7. `runtime-vnext/recipes/deterministic-site-build.yaml` already contains `foreach` page-generation stages, so multi-page proof is expected, not optional.
8. `tests/characterization-harness.test.js` already lists `multi-page-build` as an expected scenario.

What “done” means for this run
A human can start a bounded Site Studio build path and it works end-to-end for the first supported slice with proof. “Working” for this task means:
- a single-page Site Studio build can be executed through runtime-vnext
- a multi-page Site Studio build can be executed through runtime-vnext
- each run has explicit `project_id` and `run_id`
- outputs land in isolated run-scoped workspace/artifact locations
- published outputs exist for both the single-page and multi-page supported slices
- comparison/report artifacts are generated
- the path does not require `claude -p` / `spawnClaude` as the orchestration backbone
- tests pass
- the handoff tells the operator exactly how to run the working path
- after proof passes, create a commit on `feature/site-studio-runtime-vnext-closeout`

Priority order
1. Efficiency
2. Automation
3. Revenue potential
4. “It works” is the floor, not the goal — but ship the bounded working slice first.

Execution order

Phase 1 — Freeze and activate M12
- Read:
  - `runtime-vnext/CAPTAIN-BRIEF.md`
  - `runtime-vnext/contracts/README.md`
  - `runtime-vnext/contracts/migration-policy.md`
  - `runtime-vnext/M12-SHADOW-STRANGLER-BRIEF.md`
- Update `runtime-vnext/contracts/migration-policy.md` from DRAFT to a captain-approved M12 contract.
- Add exact shadow verdict contract: `match`, `mismatch`, `incomplete`, `blocked`.
- Define authority rule explicitly: legacy runtime remains authority during M12; vNext is evidence-producing only.

Phase 2 — Deliver the first actually working Site Studio paths
- Implement a bounded Site Studio build entrypoint through runtime-vnext.
- Reuse the existing deterministic slice where possible.
- Prove both:
  1. single-page build
  2. multi-page build
- If legacy integration is needed, keep it minimal and behind an explicit shadow/vNext route/command.
- Do not let runtime-vnext derive authority from mutable global `TAG`.
- Ensure every run carries:
  - `project_id`
  - `run_id`
  - `recipe_id`
  - `recipe_version`
  - comparison status
- Write outputs to separate run-scoped workspace and separate published output path.

Phase 3 — Expose a usable operator path
- Add the thinnest possible way to invoke the working slice from Site Studio.
- Acceptable surfaces, in order:
  1. explicit CLI/script entrypoint under repo scripts/runtime-vnext
  2. explicit server route for bounded shadow/vNext build
  3. explicit UI hook only if required after 1 or 2
- The final result must include exact command(s) that reliably run:
  - one single-page build
  - one multi-page build

Phase 4 — Proof and guardrails
- Add/update tests for:
  - isolated outputs
  - no legacy authority overwrite
  - blocked/incomplete handling
  - comparison artifact generation
  - end-to-end bounded single-page build success
  - end-to-end bounded multi-page build success
- Run at minimum:
  - `npm test -- tests/runtime-vnext/deterministic-recipe.test.js tests/runtime-vnext/consumer-contract.test.js`
  - any new runtime-vnext tests you add
  - if safe, full `npm test`
- Save proof artifacts under `runtime-vnext/harness/reports/`.
- Update `runtime-vnext/CAPTAIN-BRIEF.md` and `runtime-vnext/contracts/README.md` with M12 completion truthfully.

Phase 5 — Commit after proof
- Once proof passes, create a commit containing only the Site Studio files relevant to this work.
- Do not sweep unrelated dirty repo changes into this commit.
- Use a human-style commit message with no mention of AI tools.
- In the final handoff, include the exact commit SHA.

Phase 6 — Operator handoff
When done, output only:
1. What now works
2. Exact files changed
3. Exact command(s) to run the working single-page and multi-page Site Studio paths
4. Exact proof (test results + artifact paths)
5. Exact commit SHA
6. What is still intentionally out of scope

Rules
- Do not stop to ask whether to do mock-only vs real-provider unless truly blocked. Default to provider-free bounded success for this slice.
- Do not broaden scope to deploy, repair, or full cutover.
- Do not claim parity where the old baseline is unhealthy.
- Do not silently route back to `spawnClaude` / `claude -p` and call that success.
- Do not rewrite large unrelated parts of the repo.
- Keep commits/messages human-style; do not mention AI tools.

Useful file anchors
- `runtime-vnext/lib/runner.js`
- `runtime-vnext/lib/project-context.js`
- `runtime-vnext/lib/run-context.js`
- `runtime-vnext/families/deterministic-tool-runner.js`
- `runtime-vnext/recipes/deterministic-site-build.yaml`
- `runtime-vnext/harness/README.md`
- `runtime-vnext/research/live-truth-inventory.md`
- `tests/runtime-vnext/deterministic-recipe.test.js`
- `tests/runtime-vnext/consumer-contract.test.js`
- `tests/characterization-harness.test.js`
- `server.js`

Success threshold for this run
Do not come back with a plan. Come back with a working bounded Site Studio runtime-vNext path for both single-page and multi-page builds, plus proof, exact run instructions, and a clean commit SHA on `feature/site-studio-runtime-vnext-closeout`.