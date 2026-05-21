# Wave 6 — Component Studio Wrapper Foundation

Status: implemented

## Goal

Create the first Component Studio substrate so Site Studio can search and reuse existing components before generating new ones.

## Built

- Component catalog loader at `lib/famtastic/component-studio/index.js`
- Manifest-aware search that merges `components/library.json` with manifest-only component folders
- Reuse context builder that can be injected into future Site Studio build prompts
- Data Center `component_reuse` proof jobs with `outputs/component-reuse-proof.json`
- Sanitized `component-reuse` ledger events
- Mission Control `summary.component_reuse` and `component_reuse` section
- CLI search/proof entrypoint at `scripts/component-studio-search.js`
- Tests at `tests/component-studio-tests.js`

## Decisions

- `components/library.json` remains the canonical registry index, but Wave 6 search also reads manifest-only folders so stale index drift does not hide reusable assets.
- Search-before-build is implemented as a substrate and proof contract first, not yet wired into the production build prompt.
- Open Design patterns adopted now: registry/manifest discipline, component groups, preview/proof metadata, provenance, and copy-owned component reuse.

## Known gaps

- Existing registry drift: live scan finds 9 component manifests but `components/library.json` lists 6.
- Build prompt injection is not wired yet; Wave 7 owns Site Studio flow repair.
- No visual Component Studio UI yet.
- No semantic/vector search yet; current scoring is deterministic keyword/type/group matching.
