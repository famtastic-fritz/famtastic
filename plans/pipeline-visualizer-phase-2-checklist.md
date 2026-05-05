# Pipeline Visualizer Phase 2 Checklist

## Goal

Extend the live Workbench pipeline visualizer from inspect/trace/propose into stage/event matching, missing-stage detection, and proposed patch preview.

## Action Items

1. Define matching rules between `site-studio/lib/workflow-stage-catalog.json` and `/api/trace` events.
2. Mark catalog stages as observed, missing, partial, or extra.
3. Surface missing required stages in the Workbench trace lane.
4. Add a proposed patch preview lane for instrumentation gaps only.
5. Keep reorder/swap/compare/history deferred until stage matching is trustworthy.
6. Verify with a trace fixture and one live Studio trace through browser automation.
7. Document trace semantics in `SITE-LEARNINGS.md`.

## Acceptance

- A build trace can be compared against the stage catalog.
- Missing-stage detection is visible in Workbench Plan mode.
- Proposed patches are previews only and require a separate apply step.

## Hard Stops

- Do not change build execution order in this phase.
- Do not treat missing trace data as a failed build unless the stage catalog says the stage is required.
