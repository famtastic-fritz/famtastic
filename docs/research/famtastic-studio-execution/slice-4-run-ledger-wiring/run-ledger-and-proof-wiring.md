# Slice 4 — Run Ledger + Proof Packet Wiring (Plan)

**Status:** plan complete. No code changes in this slice.
**Date:** 2026-05-08
**Depends on:** Slice 1 contracts, Slice 3 reader.

## 1. Goal

Define how runs append pass updates, proof packets, cost state, blockers,
non-blockers, and learning candidates — and how stop/continue policy from
the Unattended Run Controller maps to the Slice 1 object contracts.

## 2. Append flow

Single writer module: `site-studio/server/intelligence-writer.js`.
Companion to the Slice 3 reader. All writes are append-or-replace at the
file level — never partial in-place edits.

```js
startRun(tag, { recipeId, brief, intent }) -> runId
appendLedgerPass(tag, runId, pass)         // pushes to ledger.passes[]
setLedgerStatus(tag, runId, status)        // running|blocked|failed|complete
recordCost(tag, runId, costDelta)          // updates ledger.cost.{usd, tokens}
recordBlocker(tag, runId, blocker)         // pushes to ledger.blockers[]
recordNonBlocker(tag, runId, note)         // pushes to ledger.non_blockers[]
attachProofPacket(tag, runId, packet)      // writes proof-packet.json
addLearningCandidate(tag, runId, candidate) // appends learning-candidates.json
setNextAction(tag, runId, action)          // single string
finalizeRun(tag, runId, verdict)           // pass|fail|blocked|parked
```

Each function: read → mutate → atomic write (`fs.writeFile` to `*.tmp` then
`fs.rename`) to avoid torn reads if Studio is reading concurrently.

## 3. Validation rules

Before any write:

1. Target file path resolves under `sites/<tag>/intelligence/runs/<runId>/`.
   Path traversal (`..`) rejected.
2. Payload validated against Slice 1 contract for that artifact type.
3. `runId` matches `^[a-z0-9][a-z0-9-]{6,40}$` — content-derived, never
   wall-clock-derived alone.
4. `cost.usd` is non-negative number; cumulative writes only.
5. `status` is one of: `running | blocked | failed | complete`.
6. `verdict` is one of: `pass | fail | blocked | parked`.
7. Pass append rejected if the run is already `complete` or `failed`.

On validation failure: throw, do not write. Caller logs and surfaces.

## 4. Stop/continue wiring (controller → contracts)

Mapping from `UNATTENDED-RUN-CONTROLLER.md` rules to ledger fields:

| Controller signal | Ledger surface | Reader surface |
|---|---|---|
| projected cost > $50 | `ledger.cost.usd >= 50` → setLedgerStatus(blocked) + recordBlocker `cost_cap_exceeded` | UI shows red cost chip |
| missing secret | recordBlocker `missing_secret:<name>` + setLedgerStatus(blocked) | UI shows blocker card |
| DNS/payment/prod deploy | recordBlocker `destructive_action_required` + setLedgerStatus(blocked) | UI shows approval-required chip |
| repeated validation failure | recordBlocker `validation_loop:<artifact>` after 3 retries | UI surfaces retry count |
| backend growth in server.js | recordNonBlocker `modularization_required` + setLedgerStatus(blocked) | UI surfaces modularization tag |
| pass | appendLedgerPass + recordCost | UI advances ledger timeline |
| readiness met | finalizeRun(pass) + setNextAction | UI shows next action |

Continue policy is the absence of any blocker plus `cost.usd < 50` plus a
non-empty `next_action`.

## 5. Cost accounting

`ledger.cost = { usd, tokens, by_provider: { anthropic, openai, gemini, ... } }`

Every paid call increments cumulatively. Free/local calls record `0`. No
provider call may run if `usd + projected_delta >= 50` — caller must check
first and record blocker if so. The writer enforces the cumulative invariant
but does not project cost itself.

## 6. Proof packet shape (already in Slice 1 contract; this is the wiring)

Each pass that produces a verifiable artifact attaches a proof packet entry:

```json
{
  "pass_id": "...",
  "proofs": [
    { "kind": "route_smoke", "path": "/api/health", "status": 200 },
    { "kind": "file_exists", "path": "sites/<tag>/dist/index.html" },
    { "kind": "test_run", "command": "npm test", "exit": 0 },
    { "kind": "screenshot", "path": ".wolf/designqc-captures/<id>.png" }
  ],
  "non_blockers": [...],
  "blockers": []
}
```

## 7. Learning candidates

Captured anywhere a non-blocker discovery occurs. Each candidate:

```json
{
  "id": "...",
  "from_run": "<runId>",
  "kind": "convention | pattern | anti_pattern | tooling",
  "summary": "...",
  "evidence": ["..."],
  "promote_target": "famtastic-dna.md | cerebrum.md | site-learnings.md"
}
```

Promotion is a separate Slice 6+ track. Slice 4 only captures.

## 8. UI implications (read path only — write is server-side)

Studio Intelligence panel (Slice 3) gains live-refresh on the active run:

- ledger timeline polls `/api/intelligence/runs/:runId` every 3s while
  `status === 'running'`
- cost chip color: green `< $25`, yellow `$25–$49.99`, red `>= $50`
- blocker cards expand into the controller's stop-policy text
- learning candidates list is collapsed by default

No new write routes are exposed to the browser. Writes happen server-side
inside the build/agent pipeline.

## 9. Modularization guardrail

`intelligence-writer.js` ships as one new file plus zero changes to
`server.js`. Build pipeline calls into it directly via `require(...)` from
the existing build code path. This stays inside the controller's
"no major backend growth" rule.

## 10. Acceptance for implementation pass (later)

- writer exposes the API in §2
- atomic writes verified (no torn reads under concurrent reader)
- all validation rules in §3 enforced
- cost cap blocks at `$50`
- ledger timeline updates visible in Studio within 3s
- B1–B9 baseline still passes

## 11. Non-blockers logged

- Ledger lock contention is not addressed; concurrent runs on the same site
  are not expected in V1. V2 backlog: ledger-level write lock.
- Cost projection per provider is caller responsibility in V1. V2 backlog:
  provider-aware projection helper.
