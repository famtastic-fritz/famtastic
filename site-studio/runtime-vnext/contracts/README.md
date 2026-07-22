# Site Studio vNext — Contract Packet

This directory contains the canonical contracts for the Site Studio vNext modular runtime rewrite. No implementation may contradict these contracts once they are marked `FROZEN`.

## Contract Index

| File | Owner Milestone | Freeze Target | Status |
|------|-----------------|---------------|--------|
| [project-context.md](./project-context.md) | M5 | After M5 review | **FROZEN** |
| [state-authority.md](./state-authority.md) | M6 | After M6 review | **FROZEN** |
| [model-runner.md](./model-runner.md) | M7 | After M7 review | **FROZEN** |
| [execution-families.md](./execution-families.md) | M8 | After M8 review | **FROZEN** |
| [recipe-dsl.md](./recipe-dsl.md) | M9 | After M9 review | **FROZEN** |
| [migration-policy.md](./migration-policy.md) | M12/M14 | After M12 review | DRAFT |

## Implementation Status

| Milestone | Status | Proof |
|-----------|--------|-------|
| M10 — DeterministicRecipe first slice | **COMPLETE** | `runtime-vnext/lib/runner.js`, `runtime-vnext/families/deterministic-tool-runner.js`, `runtime-vnext/recipes/deterministic-site-build.yaml`, `tests/runtime-vnext/deterministic-recipe.test.js` (4 passing) |
| M11 — Differential replay + consumer verification | **COMPLETE** | `tests/runtime-vnext/consumer-contract.test.js` (9 passing), `runtime-vnext/harness/reports/single-page-build-parity.md`. Old-runtime real-build baseline blocked by Anthropic credit balance; vNext deterministic case captured and verified. |

## How to Use
1. Read the [Captain Brief](../CAPTAIN-BRIEF.md) first.
2. Read the contract relevant to your milestone.
3. Propose changes via revision blocks if you find contradictions.
4. Do not write implementation code that conflicts with `FROZEN` contracts.

## Revision Block Format
When amending a frozen contract, append a block like this at the top:

```markdown
## Revision YYYY-MM-DD
- Reason: <why the change was needed>
- Approved by: <captain>
- Affected sections: <list>
```
