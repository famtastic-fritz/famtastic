# Contract: State Authority and Transaction Boundary

**Owner milestone:** M6 — Choose authoritative transaction boundary
**Status:** FROZEN
**Frozen at:** 2026-07-22
**Freezes affected:** M7, M8, M9, M10, M11, M12, M13, M14, M15

## Purpose
Define the authoritative transactional record and the prepare → commit → publish lifecycle so crash recovery is deterministic.

## Authoritative Store

**SQLite is the single source of truth** for run state. Tables:
- `projects` — `project_id`, `site_tag`, `hub_root`, `sites_root`, `created_at`
- `runs` — `run_id`, `project_id`, `recipe_id`, `recipe_version`, `status`, `workspace_root`, `started_at`, `ended_at`, `parent_run_id`, `trigger`
- `stage_attempts` — `stage_attempt_id`, `run_id`, `stage_id`, `attempt_number`, `status`, `inputs_json`, `outputs_json`, `started_at`, `ended_at`
- `artifacts` — `artifact_id`, `run_id`, `stage_attempt_id`, `kind`, `path`, `checksum`, `metadata_json`, `created_at`

**JSONL audit trail:** Each run also appends state transitions to `sites/<site_tag>/runs/<run_id>/run.jsonl`.

**Projections (non-authoritative):**
- `.studio.json`
- `mutations.jsonl`
- Build trace JSONL
- Version directories
- WebSocket event broadcasts
- `db.builds`, `db.sessions` telemetry tables

## Prepare → Commit → Publish Model

### Prepare
1. Validate recipe and inputs against schema.
2. Allocate workspace directory: `sites/<site_tag>/runs/<run_id>/`.
3. Write initial `RunRecord` with status `preparing`.
4. Resolve all stage inputs from upstream artifacts or project state.
5. **No side effects outside the workspace during prepare.**

### Commit
1. Execute stage graph inside the workspace.
2. Each stage writes outputs as artifacts under `workspace_root/staging/`.
3. Stage state transitions are logged atomically to SQLite.
4. On stage success: move artifacts from `staging/` to `outputs/` and update `StageAttempt` status to `succeeded`.
5. On stage failure: stop execution (unless `continue_on_error`), mark `RunRecord` as `failed`, optionally run compensation stages.

### Publish
1. Copy committed artifacts from `workspace_root/outputs/` to production locations (e.g., `dist/`).
2. Update consumer-facing projections (`.studio.json`, spec patches, version records).
3. Mark `RunRecord` as `published`.
4. **Publish is idempotent**; re-running publish for the same `run_id` must be safe.

## Workspace Layout

```
sites/<site_tag>/
  .project.json
  spec.json
  dist/                       ← production outputs (published)
  runs/
    <run_id>/
      run.jsonl               ← audit trail
      resolved-recipe.json    ← immutable resolved graph
      staging/                ← in-progress stage outputs
      outputs/                ← committed artifacts
      prompts/                ← prompt artifacts
      traces/                 ← trace event artifacts
```

## Event Publishing

The runtime maintains an internal event bus. WebSocket consumers subscribe to it; the runtime does not own `ws` objects.

Event categories:
- `run:preparing`, `run:running`, `run:committed`, `run:published`, `run:failed`, `run:cancelled`
- `stage:pending`, `stage:running`, `stage:succeeded`, `stage:failed`, `stage:compensating`
- `artifact:created`
- `trace:logged`

## Provider Call Deduplication

Before executing a provider call, compute a deterministic hash of:
- `run_id`
- `stage_id`
- `attempt_number`
- normalized inputs

If an artifact with the same hash already exists in the run workspace, reuse it instead of calling the provider again.

## Crash Recovery

On startup:
1. Scan `runs` table for entries in `running` or `committing` state.
2. Reconstruct in-memory execution graph from `resolved-recipe.json`.
3. Resume from last completed stage if idempotency allows.
4. If the run cannot be safely resumed, mark it `failed` and require manual repair.

## Compensation

- Compensation stages are defined in the recipe DSL.
- Compensation runs inside the same `RunContext` after failure.
- Compensation outputs are stored as artifacts but do **not** trigger publish.
- For partially published runs, operator-initiated rollback restores files from versioned backups; the runtime does not auto-rollback.

## Anti-Goals
- Do not let `.studio.json` or any other projection become the authority.
- Do not mutate production paths during the commit phase.
- Do not allow a stage to read or write outside its run workspace.

## SQLite Schema (Authoritative)

```sql
CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  site_tag TEXT NOT NULL UNIQUE,
  hub_root TEXT NOT NULL,
  sites_root TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE runs (
  run_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id),
  recipe_id TEXT NOT NULL,
  recipe_version TEXT NOT NULL,
  status TEXT NOT NULL,
  workspace_root TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  parent_run_id TEXT REFERENCES runs(run_id),
  trigger TEXT NOT NULL
);

CREATE TABLE stage_attempts (
  stage_attempt_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  stage_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  inputs_json TEXT,
  outputs_json TEXT,
  started_at TEXT,
  ended_at TEXT
);

CREATE TABLE artifacts (
  artifact_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES runs(run_id),
  stage_attempt_id TEXT REFERENCES stage_attempts(stage_attempt_id),
  kind TEXT NOT NULL,
  path TEXT,
  checksum TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
```
