# Server Modularization Plan - FAMtastic Studio

**Status:** planning complete
**Mode:** strangler extraction, one module at a time.

## Goal

Reduce implementation risk before major Studio redesign features are added.

## Extraction Order

### Phase 1: Pure Helpers

Extract low-risk helpers with minimal side effects:

1. validators
2. path/site file helpers
3. settings redaction/loading helpers

**Proof:** app starts, route smoke tests still pass, unit tests if present.

### Phase 2: Static Route Groups

Extract routes with clear boundaries:

1. site/spec/pages
2. uploads/assets
3. versions/rollback

**Proof:** route response smoke checks and file write checks.

### Phase 3: Product Capability Modules

Extract higher-value domains:

1. media
2. components/slots
3. research/intel
4. deploy

**Proof:** targeted route checks, no behavior changes, proof packet per extraction.

### Phase 4: Agent / Shay / Build Runtime

Extract last because these are tightly coupled:

1. WebSocket events
2. build pipeline
3. prompt context / brain
4. Shay/Shay-Shay orchestration
5. agent runner/provider adapters

**Proof:** WebSocket connects, build cancel works, Shay session init works, no hidden cloud calls introduced.

## Extraction Rules

- Keep `server.js` as entrypoint until modules are proven.
- Extract without changing behavior.
- Preserve route paths.
- Add smoke proof per module.
- Do not mix extraction with new feature behavior.
- Document every extraction in a proof note.

## Suggested Target Shape

```text
site-studio/
  server.js
  server/
    app.js
    settings.js
    session-state.js
    site-files.js
    websocket-events.js
    status.js
    version-watcher.js
    deploy.js
    validators.js
    media.js
    components.js
    slots.js
    research.js
    intel.js
    prompt-context.js
    brain.js
    build-pipeline.js
    agent-runner.js
    shay/
      routes.js
      prompt.js
      bridge.js
      sessions.js
```

## Blocker Rule

Server modularization should not block research. It should block major new backend feature growth if the feature would further entangle `server.js`.
