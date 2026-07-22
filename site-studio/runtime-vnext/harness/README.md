# Site Studio vNext — Characterization Harness

Captures golden-path and failure-path build runs from the **old** runtime so the new runtime can be compared for parity.

## Scenarios

| Scenario | Purpose |
|----------|---------|
| `single-page-build` | Baseline single-page build. |
| `multi-page-build` | Multi-page build with shared template. |
| `retry-path` | Build where a page fails and is retried. |
| `template-failure` | Template generation fails; pages fall back to legacy mode. |
| `cancellation` | Build is cancelled mid-run. |
| `verification-repair` | Verification finds issues and auto-repairs. |
| `partial-failure` | Some pages succeed, others fail. |

## Run a Scenario

```bash
node runtime-vnext/harness/run-scenario.js single-page-build --site-tag=site-demo
```

This writes captured data to `runtime-vnext/harness/cases/<scenario>/`:
- `case.json` — full capture (pre-state, post-state, events, action result).
- `spec-before.json` / `spec-after.json` — spec snapshots.
- `events.jsonl` — WebSocket events emitted during the run.

**Note:** Scenarios invoke real AI providers and may incur costs. Run only when you intend to capture a new golden case.

## Compare Old vs New

After capturing an old-runtime case and a new-runtime case:

```bash
node runtime-vnext/harness/compare-runs.js \
  runtime-vnext/harness/cases/single-page-build \
  runtime-vnext/harness/cases/single-page-build-vnext
```

Output includes:
- Spec diff
- File-level dist diff
- Event counts
- Trace counts
- Parity score (% of old files that match exactly in the new run)

## Programmatic Use

```js
const { CharacterizationHarness } = require('./characterization-harness');
const { getScenario } = require('./scenarios');

const harness = new CharacterizationHarness({
  siteTag: 'site-demo',
  caseDir: './cases/my-scenario',
});

const summary = await harness.runScenario(getScenario('single-page-build'));
console.log(summary);
```

## Harness Design Principles
1. **No runtime authority:** The harness only observes; it does not change the runtime contract.
2. **Old-runtime first:** Cases are captured from the existing monolith.
3. **Deterministic replay inputs:** Each case stores the exact inputs needed to replay against the new runtime.
4. **Parity, not identity:** The comparison focuses on observable outputs (files, events, traces), not internal implementation details.
