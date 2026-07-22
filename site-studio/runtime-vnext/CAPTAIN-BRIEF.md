# Site Studio vNext — Captain Brief

## Owner
- **Captain:** This Kimi session (runtime-rewrite lane)
- **Authority:** Owns all canonical contracts under `runtime-vnext/contracts/` until the schema freeze gate is lifted.
- **Contact rule:** Any downstream implementation agent must read this brief and the contracts packet before writing code.

## Scope Boundary
**In scope:**
- Build orchestration runtime (stage graph, execution identity, state authority, transaction boundary).
- Provider-neutral model runner abstraction.
- Recipe DSL and deterministic recipe execution.
- Characterization harness for parity measurement.
- Shadow/strangler migration path for the existing build pipeline.

**Out of scope (for this rewrite):**
- Express/WebSocket route handlers (keep as consumers of the new runtime).
- Upload handlers, mailer, client interview wizard (call runtime, don't rewrite).
- Front-end Studio UI components.
- Credential storage / `.env` structure (unchanged).
- General FAMtastic hub features outside Site Studio builds.

## Repo Truth Packet
All canonical contracts live in:

```
runtime-vnext/contracts/
  README.md                 — packet index and navigation
  project-context.md        — project_id, RunContext, RunRecord
  state-authority.md        — transaction boundary, prepare/commit/publish
  execution-families.md     — TextModelRunner, ImageGenerator, etc.
  recipe-dsl.md             — stage graph, guards, retries, compensation
  model-runner.md           — BrainInterface / ModelRunner reconciliation
  migration-policy.md       — shadow/strangler, rollback, data migration
```

No implementation file may contradict these contracts once they are marked `FROZEN`.

## Merge Policy
1. **Schema freeze gate:** Downstream coding (M10+) starts only after M1-M9 are complete and contracts are marked `FROZEN`.
2. **Contract changes after freeze:** Require a revision block in the contract file, a note in this brief, and explicit captain approval.
3. **Implementation merge gate:** Each milestone produces a checkpoint commit. A milestone is "merged" when:
   - Its deliverable files exist.
   - It passes its own stated verification (tests, harness, or review).
   - The captain has acknowledged completion in the TODO list.
4. **Parallel lane rule:** Subagents may work on independent milestones, but no subagent may modify another milestone's contract files.

## Gate: No Downstream Coding Before Schema Freeze
- M1-M9 are design, inventory, and contract work only.
- M10 (DeterministicRecipe implementation) is the first code-writing milestone.
- Any agent that discovers a needed contract change during implementation must stop, propose the change, and wait for freeze amendment before continuing.

## Success Criteria for M1
- [x] Captain brief exists and is discoverable.
- [x] Contract file structure created.
- [x] Each contract file has an owner milestone and a freeze target date.
- [x] Scope boundary documented and acknowledged.

## Milestone Status

| Milestone | Status | Proof |
|-----------|--------|-------|
| M1-M9 | ✓ Complete | All contracts FROZEN under `runtime-vnext/contracts/` |
| M10 | ✓ Complete | `runner.js`, `deterministic-tool-runner.js`, `deterministic-site-build.yaml`, passing tests |
| M11 | ✓ Complete | `consumer-contract.test.js`, `single-page-build-parity.md`. 206 tests passed. |
| **Milestone B** | ✓ Complete | `repo-bootstrap-runner.js`, `config-scaffold-runner.js`, `milestone-b.test.js` (6/6) |
| **Milestone C** | ✓ Complete | 8 workers: arch-decider, sitemap-planner, page-copy, design-token, js-behavior, page-builder, shared-assets, assembly. Tests: 19/19 |
| **Milestone D** | ✓ Complete | 4 workers: component-selector, custom-component-builder, media-planner, media-generation. Tests: 12/12 |
| **Milestone E** | ✓ Complete | 6 workers: seo-pack, structural-qa, content-qa, browser-qa, proof-curator, gap-logger. Tests: 14/14 |
| **Milestone F** | ✓ Complete | `netlify-staging-deploy-runner.js`, `prod-deploy-router-runner.js`, `legacy-compat.js`. Tests: 7/7 |
| **Milestone G** | ✓ Complete | `server-bridge.js`, `POST /api/vnext-build` opt-in in `server.js` (behind `FAMTASTIC_USE_RUNTIME_VNEXT=1`) |
| **Milestone H** | ✓ Complete | `LEGACY-AUDIT.md` filed; de-authorization gate sequence documented; legacy functions NOT removed yet (pending shadow-run parity proof) |

**Full test suite gate:** 265/265 pass as of 2026-07-22.

## Decisions Log
| Date | Decision | Owner |
|------|----------|-------|
| 2026-07-22 | vNext runtime rewrite approved; M1 captain brief created | Kimi runtime-rewrite lane |
| 2026-07-22 | Contract home set to `runtime-vnext/contracts/` | Kimi runtime-rewrite lane |
| 2026-07-22 | Schema freeze gate placed at M9/M10 boundary | Kimi runtime-rewrite lane |
| 2026-07-22 | M10 DeterministicRecipe first executable slice implemented and passing tests | Kimi runtime-rewrite lane |
| 2026-07-22 | Milestones B-H implemented; full deterministic pipeline wired end-to-end | Claude Code session |
| 2026-07-22 | Provider-agnostic design confirmed: all 22 workers registered as `deterministic` family; no Claude dependency in primary path | Claude Code session |
| 2026-07-22 | Legacy de-authorization deferred to shadow-run parity step (gate 4 in LEGACY-AUDIT.md) | Claude Code session |
