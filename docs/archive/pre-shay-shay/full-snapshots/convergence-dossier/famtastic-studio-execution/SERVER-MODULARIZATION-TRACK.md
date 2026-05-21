# Server Modularization Track — FAMtastic Studio

## Purpose

Prevent the Studio backend from becoming a fragile giant server.js file that agents cannot safely modify.

This is a V1 technical foundation track, not a cosmetic cleanup.

## Why this matters

FAMtastic Studio is moving toward research-driven, agent-powered, guarded autonomous execution. A large all-in-one server file increases risk:

- agents edit unrelated logic accidentally
- features become harder to test
- route behavior becomes hard to prove
- background runs become fragile
- cost/status/proof logic becomes tangled
- refactors become dangerous

## Rule

Do not keep piling major Studio behavior into server.js.

Before heavy implementation continues, map current server responsibilities and create a safe modularization plan.

## Required first step

Create a responsibility map.

Capture:

- routes/endpoints
- WebSocket behavior
- Claude/agent runner behavior
- prompt/context building
- cost/session tracking
- build pipeline behavior
- file read/write helpers
- status/progress reporting
- deployment behavior
- settings/config handling
- version watcher behavior
- error handling

## Recommended module targets

Suggested structure:

```text
server.js                         # entrypoint/orchestrator only
server/
  settings.js                     # load/save/redact settings
  session-state.js                # session, mode, lifecycle state
  agent-runner.js                 # Claude/Codex/Gemini runner logic
  prompt-context.js               # prompt and brain/context injection
  brain.js                        # .brain knowledge helpers
  build-pipeline.js               # build lifecycle and verification flow
  site-files.js                   # spec, blueprint, page helpers
  websocket-events.js             # WebSocket routing/messages
  status.js                       # cost/context/session status
  version-watcher.js              # CLI/model version checks
  deploy.js                       # publish/deploy actions
  validators.js                   # pure validation helpers
```

Adjust names to match the actual repo structure.

## Refactor rule

Use a strangler approach:

1. Map behavior.
2. Add smoke/proof checks.
3. Extract one module at a time.
4. Keep server.js working as the entrypoint.
5. Avoid behavior changes unless explicitly required.
6. Document every extraction.

## Required proof per extraction

Each extraction must prove:

- app starts
- existing routes still respond
- WebSocket still connects if applicable
- build/test command still passes or failure is logged
- no endpoint changed unintentionally
- no hidden cloud calls introduced
- no cost approval rules bypassed

## Blocker rule

Server modularization should not block research. It should block major new backend feature growth if the current server.js is too risky to keep extending.

## Output expected

Later research/build runs should create:

- docs/research/famtastic-studio-execution/server-responsibility-map.md
- docs/research/famtastic-studio-execution/server-modularization-plan.md
- docs/research/famtastic-studio-execution/server-modularization-proof.md
