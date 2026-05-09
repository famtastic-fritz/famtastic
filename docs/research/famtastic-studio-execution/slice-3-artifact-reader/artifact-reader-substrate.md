# Slice 3 — Studio Artifact Reader / Display Substrate (Plan)

**Status:** plan complete. No code changes in this slice.
**Date:** 2026-05-08
**Depends on:** Slice 1 contracts, Slice 2 extraction plan.

## 1. Goal

Define the minimum **read-only** substrate that lets Studio ingest and display
the Slice 1 artifacts (Intelligence Brief, Recipe Decision, Capability Truth,
Run Ledger, Proof Packet, Learning Candidate) without growing
`site-studio/server.js`.

Implementation lands in a sibling module per Slice 2's extraction contract.

## 2. Filesystem layout

All artifacts live under `~/famtastic/sites/<tag>/intelligence/` so they are
site-scoped, idempotent, and CRUD-able alongside the site (per the dynamic
CRUD standing rule).

```
sites/<tag>/intelligence/
  intelligence-brief.json         # one per site
  capability-truth.json           # one per site, latest snapshot
  recipes/
    <recipe-id>.json              # one per recipe decision
  runs/
    <run-id>/
      ledger.json                 # Run Ledger
      proof-packet.json           # Proof Packet
      learning-candidates.json    # array of Learning Candidate
```

Filenames are derived from content (`run-id`, `recipe-id`) — no hardcoded
positions, ordering, or counts.

## 3. Module contract

Create `site-studio/server/intelligence-reader.js` (read-only). Public API:

```js
// All functions return parsed objects validated against Slice 1 contracts,
// or null if the file is missing. Throws only on JSON parse failure.

readBrief(tag)                   // -> IntelligenceBrief | null
readCapabilityTruth(tag)         // -> CapabilityTruth | null
listRecipes(tag)                 // -> RecipeDecision[]
readRecipe(tag, recipeId)        // -> RecipeDecision | null
listRuns(tag)                    // -> { runId, status, startedAt }[]
readRunLedger(tag, runId)        // -> RunLedger | null
readProofPacket(tag, runId)      // -> ProofPacket | null
readLearningCandidates(tag, runId) // -> LearningCandidate[]
```

No write paths in this slice. Writes are Slice 4.

## 4. Validation

Per file: `JSON.parse` → contract-shape check (presence of required top-level
keys from the matching `*.contract.json`). On shape mismatch, the reader
returns `null` and logs a `validation_failed` event tagged with the file
path and missing keys. Never throws to the request handler.

## 5. Route surface

Three new GET routes mounted via the extracted module — not added inline to
`server.js`:

```
GET /api/intelligence/brief                 -> readBrief(TAG)
GET /api/intelligence/capability-truth      -> readCapabilityTruth(TAG)
GET /api/intelligence/runs                  -> listRuns(TAG)
GET /api/intelligence/runs/:runId           -> { ledger, proof, learning }
```

All four are read-only, site-scoped via the live `TAG` variable (never
`process.env.SITE_TAG`), and return 404 when the file is missing.

Route registration order: these are static path prefixes and must register
**before** `/api/:anything` parameterized routes (per standing rule).

## 6. Studio UI display contract (read-only state)

Studio sidebar gains a single panel (`Intelligence`) with five subsections:

1. Brief — title, vertical, goals, must-haves, blockers
2. Capability — green/yellow/red truth chips per capability
3. Runs — list of run IDs with status, latest first
4. Run detail — when a run is selected: ledger timeline, proof packet links,
   cost/approval state, blockers, learning candidates
5. Next build action — single string from the Run Ledger `next_action` field

This is rendered from `/api/intelligence/*` only. No mutation.

## 7. Modularization guardrail

The reader and its routes ship as a single new file
(`site-studio/server/intelligence-reader.js`) plus a one-line `app.use(...)`
in `server.js`. Net diff in `server.js`: one line added. This satisfies the
controller's "no major backend growth" rule.

## 8. What this slice does NOT do

- does not write artifacts (Slice 4)
- does not gate runs (Slice 5)
- does not call any LLM or paid API
- does not start MBSH V2 work

## 9. Acceptance for implementation pass (later)

- module exists, exports the eight functions in §3
- all four routes return correct status codes and JSON shapes
- malformed artifact does not 500 the route
- Studio sidebar Intelligence panel renders five subsections from real
  fixture files (use `slice-1-execution-substrate/fixtures/`)
- B1–B9 baseline still passes

## 10. Non-blockers logged

- No real intelligence artifacts exist yet for any production site. Fixture
  files from Slice 1 are sufficient for development. Real-site coverage is a
  V2 backlog item.
- The `Intelligence` sidebar panel UI is a candidate for Studio redesign
  cohesion; visual polish deferred.
