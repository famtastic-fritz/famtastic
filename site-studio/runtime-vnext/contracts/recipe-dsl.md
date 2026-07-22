# Contract: Recipe DSL and Resolved Graph

**Owner milestone:** M9 — Define versioned recipe DSL
**Status:** FROZEN
**Frozen at:** 2026-07-22
**Freezes affected:** M10, M11, M12, M13, M14, M15

## Purpose
Define a declarative, versioned recipe format that describes build stages, dependencies, fanout, retries, and failure handling.

## Authoring Format

Recipes are authored in **YAML** and compiled to **JSON** for runtime execution.

- YAML is human-readable and allows comments.
- JSON is the canonical resolved format persisted with `RunRecord`.

## Recipe Structure

```yaml
recipe:
  id: site-build-v1
  version: 1.0.0
  description: Build a single-page or multi-page site

stages:
  - id: derive-spec
    family: TextModelRunner
    model: claude-sonnet-4-6
    provider: anthropic
    inputs:
      prompt: "Refine the design brief into a structured spec.\n\nBrief: {{project.design_brief.goal}}"
    outputs:
      - spec-json
    retries: 2
    timeout_sec: 120

  - id: generate-page
    family: TextModelRunner
    foreach: "{{spec.pages}}"
    inputs:
      spec: "{{stages.derive-spec.outputs.spec-json}}"
      page: "{{item}}"
    outputs:
      - html

  - id: verify-pages
    family: BrowserCapture
    needs: [generate-page]
    inputs:
      pages: "{{stages.generate-page.outputs.html}}"
    outputs:
      - verification-report
```

## Required Semantics

| Feature | Syntax | Behavior |
|---------|--------|----------|
| Stage id | `id` | Unique within recipe. |
| Dependencies | `needs: [id1, id2]` | Stage runs after all dependencies succeed. |
| Fanout | `foreach: "{{expr}}"` | Expands into multiple `StageAttempt` instances. |
| Join | `needs: [fanned-stage]` | Receives all fanned outputs as an array. |
| Guards | `guard: "{{expr}}"` | Boolean expression; stage skipped if false. |
| Retry owner | `retry_owner: stage\|provider\|none` | Who retries on failure. |
| Timeout | `timeout_sec: N` | Hard deadline enforced by `AbortSignal`. |
| Cancellation | implicit | Cancellation propagates to active adapter calls. |
| Compensation | `compensation: compensating-stage-id` | Stage to run on failure. |
| Failure propagation | `on_failure: fail_fast\|continue` | Whether to stop or continue on stage failure. |

## Expression Language

Template expressions use `{{...}}` and are evaluated by a minimal sandboxed engine:

- Allowed root variables:
  - `project` — `ProjectContext` and project-level spec fields
  - `spec` — the input spec for the run
  - `stages` — outputs of completed stages
  - `item` — current item in a `foreach`
  - `env` — allow-listed environment variables only

- **No arbitrary JavaScript evaluation.**
- Expressions are read-only.
- Output values are coerced to strings unless the stage input schema declares another type.

Example:
```yaml
inputs:
  page: "{{item}}"
  spec: "{{stages.derive-spec.outputs.spec-json}}"
```

## Resolved Graph Snapshot

Before execution, the recipe is resolved into an immutable graph:

```json
{
  "recipe": { "id": "site-build-v1", "version": "1.0.0" },
  "resolvedAt": "2026-07-22T...",
  "stageGraph": [
    { "stageId": "derive-spec", "dependencies": [], "fanout": null },
    { "stageId": "generate-page", "dependencies": ["derive-spec"], "fanout": { "from": "spec.pages" } },
    { "stageId": "verify-pages", "dependencies": ["generate-page"], "fanout": null }
  ],
  "executionOrder": ["derive-spec", "generate-page", "verify-pages"]
}
```

The resolved graph is persisted as `resolved-recipe.json` in the run workspace.

## Version Migration Policy

- Recipes use semantic versioning (`major.minor.patch`).
- The runtime supports the current major version and the previous major version.
- A recipe with a deprecated major version is auto-migrated by a registered `migrateRecipeV<N>toV<N+1>` function.
- Breaking changes require a new recipe `id` or a major version bump.

## Open Questions Resolved

1. **YAML or JSON authored?** → YAML authored, JSON canonical.
2. **Template expression engine?** → Minimal sandboxed `{{...}}` with allow-listed variables.
3. **Recipe version migration?** → Semantic versioning; runtime supports last 2 major versions.
4. **Loops/conditionals?** → `foreach` for fanout, `guard` for conditionals. No general loops.

## Anti-Goals
- Do not allow recipes to mutate project context.
- Do not allow recipes to reference mutable global state.
- Do not allow arbitrary code execution in expressions.
