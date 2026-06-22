---
title: Conversation-Query-Replay-Command-Brief
type: note
permalink: famtastic/01-shay-platform/conversation-query-replay-command-brief
---

Title: Conversation Query/Replay Command Design
Purpose: Define the future read-oriented command surface for replaying grounded answers from conversation export artifacts without manual file hopping.
Goal: Produce a concrete design brief for a query/replay command that uses the current export, baseline, restart, and lineage surfaces; names syntax and outputs; and recommends the next implementation shape without requiring Fritz intervention.

Tasks:
- [x] Inspect the current conversation export artifacts, indexes, proofs, and post-eval outputs.
- [x] Define the user-facing command shape, arguments, defaults, and success criteria.
- [x] Define the grounding model: what artifacts/indexes are consulted, in what order, and how truth precedence works.
- [x] Define output modes for quick answer, proof-backed answer, and resumable replay.
- [x] Record known risks, implementation dependencies, and recommended build order.

Status: completed
Started: 2026-06-22 14:10 EDT
Ended: 2026-06-22 14:34 EDT
Execution: swarm
Research: yes — grounded against the current export/proof/post-eval artifacts and the live export script surface
Review: completed — concrete enough to implement without another theory pass
Skills: autonomous-ai-agents
Blocked By: none

## Current ground truth
- Current writer surface: `scripts/conversation-export.js`
- Current canonical indexes:
  - `obsidian/05-Captures/index/exports.jsonl`
  - `obsidian/05-Captures/index/restart-packets.jsonl`
  - `obsidian/05-Captures/index/lineage.jsonl`
- Current proof and evaluation anchors:
  - `obsidian/05-Captures/review/convo-export-proof-2026-06-22.md`
  - `data-center/reports/post-eval/posteval_abbc3d0ef2d0420d.md`
- Current known truth from those proofs:
  - file-first export package works for bounded replay
  - indexes are useful lookup accelerators, not the top truth surface
  - the missing layer is a dedicated read/query command, not another export theory doc

## Recommendation summary
Build a read-only command surface first. Do not make replay depend on live chat APIs, mutable memory, or direct transcript scraping. The command should resolve a question against saved export artifacts, cite the exact evidence used, and optionally emit a restart/replay packet for the next lane.

Primary recommendation: ship this as a `fam-hub conversation` subcommand family backed by a small shared resolver module that can also be reused by cron jobs, review scripts, and future GUI surfaces.

## Proposed command surface

### 1) Ask for a grounded answer
```bash
fam-hub conversation ask <question> [options]
```

Example:
```bash
fam-hub conversation ask "before we started talking about the importance of this data, what was the other topic, and what was the list we talked about from earlier?" \
  --root conv_b62d27bb2d083f64 \
  --mode proof
```

Purpose:
- resolve the best matching export lineage
- answer from canonical saved artifacts
- emit source-backed evidence, not just prose

### 2) Search the export surface without answering
```bash
fam-hub conversation find [query] [options]
```

Examples:
```bash
fam-hub conversation find "conversation export"
fam-hub conversation find --topic restart --limit 10 --json
```

Purpose:
- list candidate exports/roots before asking a replay question
- support cron, audits, and manual disambiguation

### 3) Replay a saved export or lineage directly
```bash
fam-hub conversation replay <export-id|root-id|path> [options]
```

Examples:
```bash
fam-hub conversation replay exp_20260622_ea543140 --show answer
fam-hub conversation replay conv_b62d27bb2d083f64 --show timeline
fam-hub conversation replay obsidian/05-Captures/exports/2026-06-22/exp_20260622_ea543140/export.md --mode proof
```

Purpose:
- bypass search when the caller already knows the export, root, or path
- reconstruct a readable replay from the saved package

### 4) Emit a resumable continuation packet
```bash
fam-hub conversation restart <export-id|root-id|path> [options]
```

Examples:
```bash
fam-hub conversation restart exp_20260622_ea543140
fam-hub conversation restart conv_b62d27bb2d083f64 --format markdown
```

Purpose:
- return the linked restart packet when it exists
- optionally synthesize a restart view from canonical export fields if the packet is missing

### 5) Trace backward and forward lineage
```bash
fam-hub conversation trace <export-id|root-id|path> [options]
```

Examples:
```bash
fam-hub conversation trace exp_20260622_ea543140
fam-hub conversation trace conv_b62d27bb2d083f64 --direction both --json
```

Purpose:
- show parent/child links, aliases, and derived artifacts
- support proof and debugging when replay confidence is low

## Required arguments and selectors
At least one selector must be present, either explicitly or by searchable narrowing:
- `--export <export-id>`
- `--root <root-conversation-id>`
- `--path <export.md|export.json|restart-packet.md|lineage.json>`
- `--source-locator <locator>`
- free-text query for `find` or `ask`

Optional narrowing flags:
- `--lane <label>`
- `--tag <tag>` repeatable
- `--topic <token>` repeatable
- `--date <YYYY-MM-DD>`
- `--from <YYYY-MM-DD>`
- `--to <YYYY-MM-DD>`
- `--limit <n>`
- `--latest`
- `--revision <n|latest>`

Behavior defaults:
- default scope: latest matching export lineage
- default mode for `ask`: `answer`
- default mode for `find`, `trace`: `table`
- default mode for `restart`: `markdown`
- when ambiguity remains after narrowing, command must stop with a candidate list instead of bluffing

## Output modes

### `--mode answer`
Fast human-readable response.
- final answer only
- short citation footer with export ID and evidence path/lines
- use when Fritz wants the answer fast

### `--mode proof`
Proof-backed answer.
- final answer
- resolved selector info
- exact artifacts opened in order
- evidence excerpts with line references when available
- truth-precedence notes if an index disagreed with a canonical file
- confidence and ambiguity notes

### `--mode replay`
Resumable context block.
- summary of the source conversation/export
- current state
- next step
- linked restart packet path
- useful for handing off to another lane without rereading the whole artifact set

### `--mode json`
Machine-readable output.
Minimum shape:
```json
{
  "question": "...",
  "selector": {
    "export_id": "...",
    "root_conversation_id": "...",
    "path": "..."
  },
  "resolved_from": ["..."],
  "answer": "...",
  "evidence": [
    {
      "path": "...",
      "lines": [97, 99],
      "excerpt": "..."
    }
  ],
  "artifacts_opened": ["..."],
  "ambiguity": null,
  "mode": "json"
}
```

### `--mode table`
Compact listing for `find` and `trace`.
- export ID
- root ID
- title
- created_at
- lane
- tags
- canonical path

## Lookup flow

### A. Selector resolution
1. If `--path` is provided and it points to a canonical artifact, resolve that first.
2. Else if `--export` is provided, look up the export ID in `exports.jsonl`, then confirm against the canonical export file.
3. Else if `--root` is provided, gather all matching exports for that root and pick the latest revision unless overridden.
4. Else run `find`-style candidate search over indexes and exported metadata fields.
5. If exactly one candidate survives, continue.
6. If multiple survive, return ambiguity with ranked candidates and stop.

### B. Canonical artifact hydration
Once a candidate export is chosen, hydrate in this order:
1. canonical `export.json` or `export.md`
2. linked `restart-packet.md` when needed
3. linked `lineage.json` when needed
4. relevant proof packet only when `--mode proof` or `--with-proof` is requested

### C. Answer resolution
1. Prefer direct answer fields or structured summary sections if they are later added.
2. Otherwise answer from `export.md` sections and excerpts.
3. Use restart packet for current-state/next-step questions.
4. Use lineage for parent-child or derived-artifact questions.
5. Use proof packets to validate or enrich evidence, never to outrank canonical export facts.

## Truth precedence
This has to be hard-coded and explicit.

1. Fritz's direct current instruction, if present in the invoking lane
2. Live canonical artifact file pair inside the export directory
   - `export.json` / `export.md`
   - `restart-packet.md`
   - `lineage.json`
3. Review/proof packets that cite the export lineage
4. JSONL indexes as discovery accelerators
5. Legacy shorthand paths or stale aliases

Operational rule:
- indexes are pointers, not authority
- if an index row conflicts with a canonical file, the command must trust the file and optionally emit a drift warning
- if a canonical file referenced by an index is missing, the command may fall back to index metadata only in `find` mode; `ask`, `replay`, and `restart` must fail closed unless `--allow-index-only` is explicitly set

## Suggested syntax details
Recommended flags:
- `--mode <answer|proof|replay|json|table>`
- `--format <text|markdown|json>`
- `--show <answer|timeline|restart|lineage|evidence>`
- `--with-proof`
- `--with-lineage`
- `--with-restart`
- `--allow-index-only`
- `--strict`
- `--quiet`
- `--verbose`

Recommended exit behavior:
- `0`: successful resolution
- `2`: no matches found
- `3`: ambiguous selector / multiple candidates
- `4`: canonical artifact missing or broken
- `5`: answer not grounded strongly enough for the requested mode

## Tiny helper allowed, full command deferred
Do not implement the full command yet unless needed to prove one tight lookup behavior. If a proof helper becomes necessary, keep it tiny:
- pure read-only resolver
- accepts `--export`, `--root`, or `--path`
- prints resolved canonical paths and metadata
- no chat integration
- no write side effects

That helper would only exist to harden the resolver contract before wiring the full `fam-hub conversation` command family.

## Recommended build order

### Phase 1 — resolver spine
- add a shared read-only resolver module under `scripts/lib/` or the existing `fam-hub` support area
- inputs: export/root/path/query
- outputs: resolved canonical paths plus hydrated metadata
- proof of done: can deterministically resolve `exp_20260622_ea543140` and `conv_b62d27bb2d083f64`

### Phase 2 — `find` and `trace`
- easiest read surfaces with low interpretation risk
- gives immediate operational value for audits and manual use
- proof of done: can list current exports and walk lineage without opening files by hand

### Phase 3 — `restart`
- low-risk because it is mostly packaging an existing canonical file
- proof of done: returns the current restart packet or clearly states it is missing

### Phase 4 — `ask`
- highest value, highest interpretation risk
- implement only after resolver and citation plumbing are solid
- proof of done: reproduces the canonical answered question from the June 22 export proof with explicit evidence

### Phase 5 — structured answer fields and scoring hooks
- optional later improvement
- add answer caches or extracted facts only after the file-first replay path is already trustworthy

## Known risks
- Current seed proof uses a saved brief artifact, not native chat transcripts with stable message IDs.
- `scripts/conversation-export.js` is a writer; replay must not inherit write-side assumptions from it.
- JSONL indexes can drift from canonical files if append/write discipline breaks.
- Export markdown is human-readable but not yet optimized for deterministic fact extraction.
- No dedicated topic/entity index exists yet, so free-text `ask` must start narrow and fail closed on weak grounding.

## Dependencies and gaps
- Shared resolver module does not exist yet.
- `scripts/fam-hub` needs a new conversation subcommand family or equivalent dispatch hook.
- Native message-ID freeze capture is still a gap, which limits future precision for line-level replay from live chat surfaces.
- Proof packets exist, but there is no standard line-reference extraction helper yet.
- Index rebuild/repair tooling should be ready before replay becomes a heavily used surface.

## Success criteria for implementation
- A caller can ask a bounded replay question without manual file hopping.
- The command returns the exact export/root/path it used.
- The command cites evidence from canonical artifacts.
- Ambiguity causes a stop with ranked candidates, not a guessed answer.
- `restart` and `trace` work off the same resolver spine, so there is one source of truth.

Proof:
- A durable design brief exists with command syntax, grounding flow, output modes, truth precedence, and implementation recommendation.
- The design is grounded against the current export package, indexes, proof artifact, post-eval report, and live `scripts/conversation-export.js` writer surface.
- Recommended build order is concrete enough to implement in phases without another strategy pass.
