# Spec: Wave 2 Witness + Autopilot Foundation

## Goal
Add local witness verification and deterministic wave-run health classification on top of the existing FAMtastic Data Center foundation.

## Requirements
1. The Data Center must support append-only witness records under `data-center/witness/`.
2. Witness records must include capability, status, durationMs, issuedAt, platform, os, metadata, and optional baseline comparison.
3. Witness writes must reuse existing sanitization rules so secrets are never persisted.
4. A local witness CLI/script must register checks for Data Center smoke, second-brain export smoke, and the Site Studio research-router metadata test command.
5. A deterministic autopilot utility must classify recent events as `productive`, `suspicious`, or `stuck` using simple metrics.
6. Autopilot classification must be status-only and must not stop external processes.
7. Docs and observations must capture proof, status, and remaining gaps.

## Acceptance Criteria
- Witness smoke checks append JSONL files under `data-center/witness/`.
- Witness records include baseline deltas when a prior record exists.
- Witness and autopilot tests pass deterministically without network calls.
- Existing `tests/data-center-tests.js` and `tests/second-brain-tests.js` still pass.
- `git diff --check` passes.
