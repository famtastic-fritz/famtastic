# Contract: Model Runner Reconciliation

**Owner milestone:** M7 — Reconcile BrainInterface / ModelRunner abstractions
**Status:** FROZEN
**Frozen at:** 2026-07-22
**Freezes affected:** M8, M9, M10, M11, M12, M13, M14, M15

## Decision
**ModelRunner replaces BrainInterface.**

The canonical runtime surface for all provider calls is the `ModelRunner` registry, composed of execution-family runners (`TextModelRunner`, `ImageGenerator`, `ImageEditor`, `BrowserCapture`, `DeterministicToolRunner`).

`BrainInterface` is retained only as a legacy compatibility shim during the strangler period and is removed in M15.

## What ModelRunner Is

`ModelRunner` is not a single class. It is the collective name for a registry of family-specific runners:

```js
const runner = ModelRunnerRegistry.get('TextModelRunner');
const result = await runner.execute(request, { runContext, stageAttempt, abortSignal });
```

Each runner:
- Accepts a typed request object.
- Returns a typed response object.
- Is provider-agnostic (adapters implement provider details).
- Receives `RunContext` and `StageAttempt` for telemetry and deduplication.
- Respects `AbortSignal` for cancellation.

## Why Not Keep BrainInterface

`BrainInterface` currently mixes several concerns:
1. Conversation history management.
2. Context header injection.
3. Provider adapter routing.
4. Tool use enablement.
5. Streaming handling.

In the vNext runtime these concerns are separated:
- **History** is a run-scoped artifact managed by the recipe DSL.
- **Context header** is a prompt artifact produced by a recipe stage.
- **Provider routing** is handled by the adapter registry.
- **Tool use** is declared per recipe stage.
- **Streaming** is a runner capability flag.

Keeping `BrainInterface` as a canonical surface would perpetuate a stateful, provider-coupled abstraction that competes with the stage-based recipe model.

## Migration Path

| Phase | BrainInterface Status | ModelRunner Status |
|-------|----------------------|--------------------|
| M10-M11 | Legacy shim | New runtime uses ModelRunner |
| M12-M14 | Still called by old path | New path fully uses ModelRunner |
| M15 | Removed | Sole canonical surface |

During the strangler period:
- New recipe stages call `ModelRunnerRegistry`.
- Old `server.js` call sites continue using `BrainInterface` / `callSDK`.
- The characterization harness (M4) verifies parity at the output level, not the abstraction level.

## Conversation History

In the new runtime, conversation history is not owned by a runner. It is:
1. Built by a recipe stage from prior prompt/response artifacts.
2. Passed as part of the `TextModelRunner` request.
3. The response artifact is appended back to the run state by the orchestrator.

This makes history explicit, auditable, and recoverable from `RunRecord` artifacts.

## Open Questions Resolved

1. **Which surface is canonical?** → ModelRunner registry / execution-family runners.
2. **What happens to BrainInterface?** → Legacy shim during strangler; removed in M15.
3. **How does conversation history move?** → From instance state to run-scoped artifacts.

## Anti-Goals
- Do not keep both BrainInterface and ModelRunner as first-class surfaces.
- Do not pass mutable global state into runners.
- Do not let runner adapters leak SDK-specific types into recipe stages.
