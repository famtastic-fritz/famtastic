# Slice 1 Acceptance Checklist

**Status:** ready for validation
**Purpose:** Define the proof required for Slice 1 to pass and allow Slice 2 to continue automatically.

## Scope Check

- [ ] Created Slice 1 folder.
- [ ] Created all six contract JSON files.
- [ ] Created all six fixture JSON files.
- [ ] Created `README.md`.
- [ ] Created `agent-run-report-template.md`.
- [ ] Created `UNATTENDED-RUN-CONTROLLER.md`.
- [ ] Updated `RUN_STATUS.md`.

## Contract Check

Each contract must include:

- [ ] purpose
- [ ] required fields
- [ ] optional fields
- [ ] allowed status values where relevant
- [ ] relationship to Studio layer
- [ ] relationship to agent role
- [ ] proof/validation expectations
- [ ] example fixture path

## Fixture Check

- [ ] `intelligence-brief.example.json` parses.
- [ ] `recipe-decision.example.json` parses.
- [ ] `capability-truth.example.json` parses.
- [ ] `run-ledger.example.json` parses.
- [ ] `proof-packet.example.json` parses.
- [ ] `learning-candidate.example.json` parses.
- [ ] Fixtures represent a realistic path toward MBSH V2 proof-readiness.

## Guardrail Check

- [ ] No UI/app behavior files changed.
- [ ] No `site-studio/server.js` changes.
- [ ] No MBSH V2 implementation started.
- [ ] No shipping company site work started.
- [ ] No logo/site work started.
- [ ] No unrelated `.wolf/anatomy.md` changes made by this pass.
- [ ] No paid/cloud actions performed.

## Validation Commands

```bash
find docs/research/famtastic-studio-execution/slice-1-execution-substrate -type f | sort
for f in docs/research/famtastic-studio-execution/slice-1-execution-substrate/*.json docs/research/famtastic-studio-execution/slice-1-execution-substrate/fixtures/*.json; do node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$f"; done
git diff --check
git status --short
```

## Pass Condition

Slice 1 passes when all required files exist, all contract and fixture JSON parses, `git diff --check` passes, scope guards are respected, and the pass is committed.

## Next Slice

Slice 2: server modularization first safe extraction plan/proof.
