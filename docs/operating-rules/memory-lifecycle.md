# Memory Lifecycle

Operating rules for entries in the FAMtastic memory store. Defined by `plan_2026_05_05_chat_capture_learn_optimize`.

## Lifecycle states

```
captured (in captures/inbox/)
   │
   ▼
proposed (in captures/review/<id>.proposal.json)
   │
   │  human approval OR auto-promote (allowlist + confidence >= 0.85)
   ▼
candidate ─────────►  active  ─────────►  stale  (digest flag, not auto)
                        │                   │
                        ▼                   ▼
                   superseded            retired
```

| State | Where | Surfaced to Shay? | Who can write |
|---|---|---|---|
| **captured** | `captures/inbox/<id>.json` | no | capture adapters |
| **proposed** | `captures/review/<id>.proposal.json` | no | `memory-promote review` |
| **candidate** | `memory/<type>/<id>.md` (lifecycle: candidate) | yes (soft hint) | promoter, digest auto-promote, human |
| **active** | `memory/<type>/<id>.md` (lifecycle: active) | yes (rule + do-not-repeat enforced) | promoter (human), or auto-allowlist for vendor-fact / do-not-repeat / bug-pattern |
| **stale** | same path, lifecycle: stale | yes with stale badge | digest flags (does NOT auto-apply) |
| **retired** | same path, lifecycle: retired | no | human via `fam-hub memory retire` |
| **superseded** | same path, lifecycle: superseded, references → successor | no | human or promoter when newer entry replaces |

## Auto-promote rules

A capture extract may auto-promote (bypass human gate) when **all** of:

1. `confidence >= 0.85`
2. `type` is in `{vendor-fact, do-not-repeat, bug-pattern}`
3. `canonical_id` does not already exist
4. (If adversarial review enabled) at least one round passed

The digest may also auto-promote a recurrence pattern (3+ sessions) **but only to `lifecycle: candidate`**, never directly to `active`.

## Stale rule

An `active` entry with no `surfaced` event in 60 days is flagged in the next weekly digest. **It is NOT auto-retired.** Human decides whether the entry is still true and either re-promotes the lifecycle, retires it, or supersedes it with a corrected entry.

## Telemetry

Every state transition writes one line to `memory/usage.jsonl`:

```json
{"ts":"...","memory_id":"<id>","event":"reviewed|promoted|auto_promoted|surfaced|cited|honored|violated|retired","context":{...}}
```

Telemetry is local-only. Disable with `MEMORY_TELEMETRY=off`.

## Source-of-truth precedence

When entries conflict (e.g. a `vendor-fact` says "API supports X" but a newer `bug-pattern` says "actually it doesn't"):

1. Newer entry wins by `created_at`.
2. Older entry's lifecycle flips to `superseded`, with `references: [newer.canonical_id]`.
3. Both remain readable for history.

Conflict detection lives in the adversarial review loop (Ops plan `ws_adversarial_review_loop`); the loop produces a `contradictions` digest section.

## Human commands

```bash
# Capture from any source
fam-hub capture extract --source <claude-code|cowork|codex|manual> <input>

# Generate proposal from a capture
fam-hub memory review <capture-id>

# Promote (gated — interactive)
fam-hub memory promote <proposal-id>

# Promote (auto — allowlist only)
fam-hub memory promote <proposal-id> --auto

# Retire an entry
fam-hub memory retire <canonical-id>

# Run the weekly digest manually
node scripts/memory-digest.js
```

CLI parity with the (planned) Ops Memory tab is required.
