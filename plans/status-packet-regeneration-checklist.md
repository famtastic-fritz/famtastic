# Status-Packet Regeneration Checklist

## Goal

Generate `FAMTASTIC-STATUS.md` and `site-studio/public/data/workbench-plan-state.json` from ledgers instead of hand-editing mirrors.

## Action Items

1. Add a `fam-hub plan export-status` command.
2. Read `plans/registry.json`, `tasks/tasks.jsonl`, `runs/runs.jsonl`, and `proofs/proof-ledger.jsonl`.
3. Derive active parents, open tasks, blocked tasks, proof counts, and current run.
4. Write `site-studio/public/data/workbench-plan-state.json` as browser-safe JSON.
5. Write `FAMTASTIC-STATUS.md` as human-readable mirror text.
6. Validate JSON before write and keep a temp-file/rename flow for atomic updates.
7. Add `fam-hub plan review` checks for stale `registry.updated_at` versus generated packet timestamps.

## Acceptance

- One command regenerates both status outputs.
- Workbench Plan mode renders the generated JSON without manual editing.
- The markdown packet names ready, blocked, and completed work accurately.

## Hard Stops

- Do not make generation depend on network access.
- Do not overwrite canonical memory files from capture packets in this command.
