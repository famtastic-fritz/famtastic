# Proof

## Focused tests

Passed:

- `node tests/media-studio-wrapper-tests.js`
- `node tests/mission-control-tests.js`
- `node tests/data-center-tests.js`
- `git diff --check`

## Live zero-spend proof job

Created by:

`node scripts/media-studio-plan.js --title 'Wave 5 dry-run hero proof' --intent hero-image --media-type image --category hero --prompt '<prompt>' --research-job-ids research-20260519225124-perplexity-metadata-preservation-proof --create-job --json`

Result:

- Job: `data-center/jobs/media-20260521150816-wave-5-dry-run-hero-proof/job.json`
- Proof: `data-center/jobs/media-20260521150816-wave-5-dry-run-hero-proof/outputs/generation-proof.json`
- Model: `flux-dev`
- Fallback chain: `flux-dev -> flux-kontext-max -> gpt4o`
- Dry run: true
- Would spend: false
