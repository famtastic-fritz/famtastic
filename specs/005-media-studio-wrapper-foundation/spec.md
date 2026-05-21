# Wave 5 — Media Studio Wrapper Foundation

Status: implemented

## Goal

Create the first safe Media Studio substrate without spending provider credits.

## Built

- Model alias/fallback registry at `media-studio/model-aliases.json`.
- Media Studio library at `media-studio/lib/index.js`.
- Dry-run MuAPI planning with prompt hashing, fallback chain, command preview, and zero-spend default.
- Data Center media job creation with `kind: media_generation`.
- Generation proof output at `data-center/jobs/<media-job>/outputs/generation-proof.json`.
- Asset ledger writes to `data-center/ledgers/media-assets.jsonl`.
- Mission Control media generation visibility through `summary.media_generations` and `media_generations`.
- CLI planner at `scripts/media-studio-plan.js`.

## Safety

- Wave 5 does not call paid MuAPI generation.
- `--spend` is explicitly blocked in the CLI planner.
- Prompts are hashed for deduplication/proof.
- Secret-like keys/values are sanitized via the existing Data Center ledger path.
