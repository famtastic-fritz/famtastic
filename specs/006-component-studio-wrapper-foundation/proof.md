# Proof

## Focused verification

Passed:

- `node tests/component-studio-tests.js`
- `node tests/mission-control-tests.js`
- `node tests/media-studio-wrapper-tests.js`
- `node scripts/component-studio-search.js --query 'cinematic hero with video background and CTA' --type hero --json`
- `node scripts/plans/audit.js`
- `git diff --check`

## Live proof

Created a zero-site-write Data Center proof job by running:

`node scripts/component-studio-search.js --query 'cinematic hero with video background and CTA' --type hero --create-proof --title 'Wave 6 component reuse proof' --json`

The top candidate was `video-hero`. The proof job wrote `job.json`, `events.jsonl`, `report.md`, and `outputs/component-reuse-proof.json` under `data-center/jobs/component-*`.

## Drift discovered

The live catalog found 9 component manifests but `components/library.json` lists 6 components. Wave 6 does not mutate the registry automatically; it records this as a known gap for repair.
