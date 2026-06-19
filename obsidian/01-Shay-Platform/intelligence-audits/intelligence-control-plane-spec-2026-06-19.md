---
title: intelligence-control-plane-spec-2026-06-19
type: note
permalink: famtastic/01-shay-platform/intelligence-audits/intelligence-control-plane-spec-2026-06-19
---

# Intelligence control-plane spec

Generated: 2026-06-19

## Purpose
Turn the anti-drift audit surface into a living control plane that consumes new signals, links them to canonical problems, mutates proof/closeout state, and prunes stale/noisy records before they poison future routing.

## Core graph
Raw signal -> normalized bucket -> promoted finding -> repo verdict -> proof candidate -> closeout mutation -> stale/pruned history

## Canonical records
- `~/.local/share/famtastic/gaps.jsonl`
  - append-only raw issue journal; keeps source wording, aliases, and timestamps.
- `obsidian/01-Shay-Platform/intelligence-audits/problem-buckets.latest.{json,md}`
  - canonical problem buckets + aliases + linked gap ids.
- `~/.local/share/famtastic/intelligence-promotions.json`
  - promoted findings that must track real operational state.
- `obsidian/01-Shay-Platform/intelligence-audits/problem-repo-verdicts.latest.{json,md}`
  - problem -> repo candidate link surface.
- `obsidian/01-Shay-Platform/intelligence-audits/proof-closeout.latest.{json,md}`
  - proof evaluation results + proposed/applied mutations.
- `obsidian/01-Shay-Platform/intelligence-audits/control-plane-pass-history.jsonl`
  - loop pass results and stop-condition evidence.
- `obsidian/01-Shay-Platform/intelligence-audits/gap-ledger-backups/`
  - timestamped pre-mutation backups for reversibility.

## Required statuses
### Gap status
- `open`
- `normalized`
- `duplicate`
- `proof_pending`
- `verified`
- `closed`
- `stale`
- `noise`
- `rejected`

### Promotion status
- `pending`
- `candidate_solution_found`
- `proof_pending`
- `verified`
- `closed`
- `deferred`
- `stale`
- `rejected`

### Repo verdict status
- `candidate`
- `weak_candidate`
- `not_linked`
- `verified_fit`
- `rejected_fit`

## Mutation rules
1. Never destroy raw history.
2. Every mutation writes `updated_at`, `mutation_source`, and `mutation_reason`.
3. Confidence is required on every automated move.
4. `verified` and `closed` are separate: verified means capability/proof exists; closed means the operational issue is done enough to stop reopening it.
5. Weak matches can promote to `candidate_solution_found`, but never to `verified`.
6. A stale/noise downgrade must preserve the original message preview and alias chain.

## Workers
### 1) gap-ingest worker
Runs on every new gap write.
- normalize capability/message against canonical buckets
- attach `bucket_id` if matched
- detect probable duplicate before adding a fresh raw row
- if duplicate: increment frequency / alias instead of emitting junk

### 2) research-ingest worker
Runs after repo-intelligence or research artifact creation.
- map new artifacts to existing buckets
- if no bucket match: park as `unlinked_research`
- rerun repo verdict generation for touched buckets only

### 3) proof-closeout worker
Runs after code/docs/proof scans.
- gather proof candidates per bucket
- assign confidence
- mutate gap + promotion state when thresholds are met
- emit audit notes for manual review if confidence is medium or conflicting

### 4) stale-pruner worker
Runs on schedule.
- merge duplicates
- downgrade malformed low-signal rows to `noise` or `stale`
- collapse redundant aliases
- expire weak repo candidates with no follow-through

### 5) loop-runner worker
Runs iterative improvement passes.
Each pass:
1. refresh buckets
2. refresh repo verdicts
3. run proof/closeout
4. run garbage cleanup
5. append findings to pass history
6. update plan/docs/todo state
7. stop when only minor findings remain or pass count hits 20

## Confidence bands
- 0.90-1.00: safe to mark `verified`; can auto-close only if the issue is clearly proof/closure drift
- 0.70-0.89: safe to mark `proof_pending` or `candidate_solution_found`
- 0.40-0.69: record as weak signal only
- below 0.40: no mutation beyond note/history

## Stop conditions for the autonomous loop
Stop early if all remaining findings in a pass are minor and none change canonical state.
Hard stop at 20 passes.
Minor finding definition:
- wording cleanup only
- alias merge only
- low-confidence repo candidate churn
- stale row downgrade with no active bucket impact

## Cron layout
### Fast consumers
- On gap write: run gap-ingest worker
- On research artifact write: run research-ingest worker

### Scheduled passes
- every 30m: proof-closeout worker
- every 2h: stale-pruner worker
- every 4h: repo verdict refresh
- daily 09:00: loop-runner summary pass

## What should block Fritz interruptions
Only escalate to Fritz when one of these is true:
- revenue opportunity
- real blocker after internal exhaust
- authority boundary
- conflicting high-confidence signals
- repeated failure after 2 automated passes

## First implementation order
1. proof/closeout worker
2. garbage gap cleanup worker
3. gap-ingest / pre-research guardrails
4. scheduled refresh/prune workers
5. loop runner

## First pass target buckets
- `video-background`
- `godaddy-cpanel-access`
- `jj-ba-brief-shaping`
- `platform-conversation-context`
- `research-promotion-ledger`

## Evaluation doctrine
Observation and interpretation stay separate.
Capability missing vs capability unproven stay separate.
Repo discovery is not proof.
Proof is not closeout.
Closeout is not deletion.
