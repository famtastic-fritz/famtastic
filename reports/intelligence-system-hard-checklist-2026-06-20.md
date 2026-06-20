Title: Intelligence system hard checklist

Purpose: Turn the current intelligence system from vague partial loops into an explicit ingest -> consume -> prune -> learn map.

Goal:

Identify every important ingest surface, its current consumer, missing consumer, prune owner, learn owner, and whether the loop is real, partial, or fake.

Tasks:
- [x] Inventory current ingest surfaces
- [x] Verify current consumers where possible from live code/runtime
- [x] Check whether pruning/retention exists
- [x] Check whether pattern-learning exists
- [x] Record fix-now priorities and exact file owners

Status: completed
Started: 2026-06-20 11:37
Ended: 2026-06-20 11:50
Execution: single-lane audit
Research: yes
Review: no
Skills: shay-shay
Blocked By: none

## Hard checklist

| Ingest surface | Writer | Current consumer | Missing consumer | Prune owner | Learn owner | Status |
|---|---|---|---|---|---|---|
| `~/.shay/state.db` | Shay runtime/session store | `session_search`, manual SQL recall | automatic preference/pattern extractor | none verified | none explicit | partial |
| `~/.shay/memories/MEMORY.md` + `USER.md` | memory tool / manual | auto-injected prompt memory | stale-entry validator | human/manual | memory tool + operator discipline | real |
| `obsidian/Shay-Memory/research/*.md` + `_ledger/research-artifacts.jsonl` | `shay-shay/scripts/research_capture.py` | `shay-shay/scripts/research_preflight.py` | automatic research pattern miner / promoter | none verified | weak/manual | partial |
| `~/.local/share/famtastic/gaps.jsonl` | `site-studio/lib/gap-logger.js` | `promoteGap`, stronger-branch control-plane scripts | one canonical live consumer in current branch | cleanup worker only on stronger branch | normalization / bucketing / repo-verdict workers | partial |
| `~/.local/share/famtastic/suggestions.jsonl` | `site-studio/lib/suggestion-logger.js` | `logOutcome`, `checkPromotion`, `sync_learning_artifacts.py` | real runtime/build-time behavior consumer | none verified | simple source::intent thresholding | partial |
| `~/.local/share/famtastic/suggestion-promotions.jsonl` | suggestion logger / sync worker | audit/sync reporting | prompt/build/routing consumer | none verified | none meaningful | fake-to-partial |
| `~/.local/share/famtastic/intelligence-promotions.json` | gap promotion / cleanup / normalization | cleanup/control-plane artifacts; `shay-phone/server.py` active-site promo read; site-level promoted findings also feed `site-studio/server.js:getPromotedIntelligence()` | canonical backlog/task opener | cleanup workers partly | partial/manual | partial |
| `sites/*/brand.json` + `~/.local/share/famtastic/brand.json` | site build + `sync_learning_artifacts.py` | registry/audit generation; `site-studio/server.js:readBrandJsonForFingerprint()`; `site-studio/lib/style-fingerprint.js` recovery source for future build fingerprints | stronger global registry consumer and explicit drift/policy loop | overwrite/refresh only | none | partial |
| `~/.shay/process-intelligence/runs.jsonl` | process-intelligence runtime | `shay capabilities doctor`, `shay intelligence truth`, `shay intelligence status` | broader automatic capability mutation | none verified | capability-truth overlays | real |
| `~/.shay/process-intelligence/intelligence/events/events.jsonl` + workers/ledgers | shay intelligence layer | `shay intelligence truth/status` | stronger operator synthesis + retention | none verified | partial/manual | partial |
| `obsidian/01-Shay-Platform/intelligence-audits/*` | `scripts/intelligence/*` on stronger branch | `sync_control_plane_to_briefing.py`, cron alerts, human review | unified reconciler with write-back into canonical truth | none real; backups pile up | partial via control-plane loop | partial |
| `obsidian/01-Shay-Platform/LATEST-BRIEFING.md` | briefing sync/update scripts | human/session startup | explicit machine consumer for routing | overwrite/update only | none | partial |

## Real weakest points

1. Pruning / retention
- No verified scheduled retention for suggestions, research ledgers, audit backups, or process-intelligence ledgers.
- Cleanup exists for some gap/control-plane surfaces, but retention does not.

2. Research becoming useful automatically
- Research capture is real.
- Research preflight is real.
- Automatic pattern extraction and promotion from research artifacts is weak to absent.

3. Branch-unified truth
- The stronger control-plane loop lives on the main/merged lane.
- This memory-intelligence-rescue lane contains useful recovery work but not the full live loop.
- Truth is split across branches/worktrees.

4. Global consumption of suggestion/brand artifacts
- Suggestions are logged and promoted, but their promotions do not clearly change future behavior.
- Brand artifacts do have a verified local consumer now: `site-studio/server.js:readBrandJsonForFingerprint()` and `site-studio/lib/style-fingerprint.js` use per-site `brand.json` as a recovery source for future build fingerprints.
- The weaker gap is the global brand registry (`~/.local/share/famtastic/brand.json`): it refreshes and audits, but a stronger policy/drift consumer was not proven in this pass.

## Fix Now

### 1. Unify branch truth
Owner:
- repo maintainer / current working lane

Files/lane:
- choose one canonical lane, likely the merged `feat/improve-shay-proactiveness` lane
- merge or transplant the real wins from `fix/memory-intelligence-rescue`

Required keepers:
- `site-studio/lib/gap-logger.js` recovery improvements if desired
- stronger branch `scripts/intelligence/*`
- whichever `LATEST-BRIEFING.md` changes are actually wanted

### 2. Add pruning jobs
Owner:
- cron + intelligence lane

Natural homes:
- `~/.shay/scripts/control_plane_loop_cron.sh`
- a new `scripts/intelligence/prune_learning_artifacts.py`
- a new `scripts/intelligence/prune_audit_backups.py`
- possibly a new `shay-shay/scripts/research_prune.py`

Targets:
- old audit backups
- duplicate/stale gap backups
- stale suggestions with no outcome after cutoff
- stale research artifacts with no verdict/reuse signal

### 3. Wire suggestion promotions to a real consumer
Owner:
- Site Studio prompt/build context lane

Likely files:
- `site-studio/server.js` / `buildPromptContext()` or equivalent prompt builder
- or a briefing/report surface if not build-time

Desired behavior:
- repeated successful suggestion patterns should influence future build/routing decisions

### 4. Wire research registry to a real consumer
Owner:
- shay-shay research loop

Likely files:
- `shay-shay/scripts/research_preflight.py`
- new summarizer/promoter script over `research-registry.jsonl`

Desired behavior:
- classify artifacts into useful now / seed for later / dead / promote

### 5. Fix truth-surface path drift
Owner:
- shay-shay intelligence truth docs/code

Observed drift:
- truth output still references `~/.shay/process-intelligence/runs/runs.jsonl`
- live file exists at `~/.shay/process-intelligence/runs.jsonl`

Likely files:
- `shay-shay/shay_cli/intelligence_cmd.py`
- `obsidian/01-Shay-Platform/Agent-Capability-Matrix.md`
- related docs in `shay-shay/docs/`

## Fix Soon

### 6. State.db pattern extractor
Owner:
- shay-shay memory/intelligence lane

Desired behavior:
- mine recurring user corrections, routing preferences, frustrations, and swarm/agent mental-model lessons from `~/.shay/state.db`

### 7. Make brand registry affect future builds
Owner:
- Site Studio build/prompt context lane

Desired behavior:
- inject brand DNA into future builds
- run simple drift checks against rebuilt output

### 8. Add explicit owner fields to every ingest loop
Owner:
- truth-surface/docs + code layer

Desired behavior:
- every ingest surface explicitly names writer, consumer, prune owner, learn owner

### 9. Add research verdict loop
Owner:
- shay-shay research lane

Desired behavior:
- every artifact eventually becomes `useful_now`, `seed_for_later`, `dead`, or `promoted`

## Kill It

### 10. Any ingest surface with no consumer
Rule:
- either wire a consumer or stop pretending the surface matters

### 11. Duplicate audit exhaust without retention
Rule:
- stop piling tracked backup artifacts forever
- move them to bounded local retention or purge by age/count

### 12. Fake learning claims
Do not overclaim these until behavior actually changes:
- suggestion promotions
- brand registry
- research capture alone

## Priority execution order

1. unify branch truth
2. add prune jobs
3. wire suggestion promotions to a real consumer
4. wire research registry to a real consumer
5. fix truth-surface path drift
6. add state.db pattern extractor
7. make brand registry influence builds

Proof:
- live code/runtime review covered `state.db`, `site-studio/lib/gap-logger.js`, `site-studio/lib/suggestion-logger.js`, `scripts/intelligence/run_control_plane_pass.py`, `scripts/intelligence/sync_learning_artifacts.py`, `scripts/intelligence/cleanup_gap_rows.py`, `scripts/intelligence/sync_control_plane_to_briefing.py`, `shay-shay/scripts/research_capture.py`, `shay-shay/scripts/research_preflight.py`, `shay-shay/docs/shay-memory-hierarchy.md`, `shay capabilities doctor`, `shay intelligence truth`, `shay intelligence status`, and `shay cron list`.
