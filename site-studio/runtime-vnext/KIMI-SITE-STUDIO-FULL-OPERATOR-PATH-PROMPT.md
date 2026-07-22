You are Kimi Code.

Primary workdir
/Users/famtasticfritz/famtastic-worktrees/site-studio-runtime-vnext-closeout/site-studio

Branch
feature/site-studio-runtime-vnext-closeout

Mission
Finish the job. Do not stop at a bounded shadow slice. Make Site Studio itself work through the new runtime backbone for the supported operator path, without Claude `-p` / `spawnClaude` serving as the orchestration backbone for that path.

This is not an M12 closeout task.
This is operator-path completion.
Do not come back with another architecture phase summary.
Come back only when the actual Site Studio operator flow works for the supported slice, with proof, tests, and a clean commit.

Current truth
- A bounded runtime-vnext shadow slice already exists and is committed on this branch.
- Commit `0e26c35feb99395d1c89b5e4293370f88a15c17e` proves deterministic single-page and multi-page builds via runtime-vnext.
- That is not enough.
- The remaining blocker is that Site Studio itself is not yet proven to run its real operator-facing path on the new backbone.

What “done” means now
A normal operator can use Site Studio’s supported flow and successfully trigger the new runtime path without relying on Claude `-p` / `spawnClaude` as the orchestration backbone for that supported flow.

For this run, done means all of the following are true:
1. Site Studio exposes a real operator-facing invocation path for the new runtime.
2. That path is wired into the app/server surface, not just a detached proof CLI.
3. The supported flow can run:
   - one single-page build
   - one multi-page build
4. The supported flow produces published outputs and run artifacts with:
   - `project_id`
   - `run_id`
   - `recipe_id`
   - `recipe_version`
5. The supported flow does not use `claude -p` / `spawnClaude` as its orchestration backbone.
6. Tests pass.
7. Proof artifacts exist.
8. A clean new commit exists on this branch for this operator-path completion work.

Non-goals
- Do not broaden to deploy.
- Do not broaden to repair flows.
- Do not broaden to full production cutover of every legacy path.
- Do not rewrite the whole Studio UI.
- Do not fake parity with unhealthy old baselines.
- Do not silently fall back to `spawnClaude` and call that success.

Required target
You must convert the existing runtime-vnext slice from “proof lane” into “actual supported Site Studio operator lane.”

Acceptable completion shapes, in priority order
1. Server/API route wired into Site Studio’s existing operator surface.
2. Existing operator action path routed to runtime-vnext for the supported deterministic slice.
3. If UI work is absolutely necessary, make the smallest possible UI change to expose the operator path cleanly.

Unacceptable completion shape
- “Use this separate CLI script manually forever.”
That is not enough by itself. The CLI may remain as a support/debug tool, but Site Studio needs a real operator-facing path.

Execution order

Phase 1 — Re-anchor to the live operator path
Read and inspect the current invocation surfaces that operators actually use.
At minimum inspect:
- `server.js`
- existing Site Studio build routes / WebSocket flow
- `public/studio/src/lib/sites-actions.js`
- `public/studio/src/lib/sites-api.js`
- any current build-trigger surface already used by Site Studio

Determine the thinnest real integration point that lets the supported Site Studio flow invoke runtime-vnext.

Phase 2 — Wire the supported Site Studio flow to runtime-vnext
- Reuse existing runtime-vnext components.
- Keep legacy authority protections where needed.
- For the supported flow, runtime-vnext must be the actual backbone.
- Keep scope bounded to deterministic supported slices if that is the safest way to finish.
- Preserve explicit run identity and separate publish/output locations unless you intentionally prove a safe promotion step.

Phase 3 — Prove the operator path, not just the engine
Add proof for the actual operator-facing flow.
That can be via API-level tests, server integration tests, Playwright-supported flow tests, or the thinnest truthful proof surface that demonstrates the real Site Studio path works.

Minimum proof must include:
- single-page operator-path success
- multi-page operator-path success
- no `spawnClaude` / `claude -p` orchestration dependency in the supported path
- published output evidence
- run artifact evidence

Phase 4 — Keep the closeout honest
Update reports/docs to reflect the new truth.
If M12 proof docs are now incomplete for the operator-path story, extend them or add a new report.
Do not overwrite truthful historical notes; add a new truthful completion artifact.

Phase 5 — Test and commit
Run the relevant test set.
At minimum:
- existing runtime-vnext tests
- new operator-path tests you add
- full `npm test` if safe

Then create a clean commit containing only the additional operator-path completion work.
Do not roll unrelated repo dirt into it.
Use a human-style commit message.
Return the exact commit SHA.

Final response format
Return only:
1. What operator path now works
2. Exact files changed in this pass
3. Exact steps to use the new Site Studio operator flow
4. Exact proof (tests + artifact/report paths)
5. Exact commit SHA for this pass
6. What is still intentionally out of scope

Success threshold
Do not return with another “foundation complete but not integrated” message.
Return only when Site Studio itself has a real supported operator-facing runtime-vnext path working for the bounded slice.