# Contract: ProjectContext, RunContext, RunRecord, StageAttempt, ArtifactManifest

**Owner milestone:** M5 — Freeze canonical execution identity
**Status:** FROZEN
**Frozen at:** 2026-07-22
**Freezes affected:** M6, M7, M8, M9, M10, M11, M12, M13, M14, M15

## Purpose
Define the immutable execution identity for every Site Studio build. Eliminate mutable global `TAG` as a runtime authority.

## ID Format

All IDs use the existing Site Studio convention for sortability and uniqueness:

```
<prefix>_<timestamp-ms>_<4-char-hex>
```

- `project_id` prefix: `project`
- `run_id` prefix: `run`
- `stage_attempt_id` prefix: `stage`
- `artifact_id` prefix: `artifact`

Example: `run_1753207217000_a3f2`

Rationale: matches current `lib/run-id.js` format, is lexicographically sortable by time, and is collision-resistant enough for single-node operation.

## Entities

### ProjectContext
- `project_id` (string): stable identifier.
- `site_tag` (string): human-readable tag; may change, but `project_id` does not.
- `hub_root` (string): absolute path to FAMtastic hub.
- `sites_root` (string): absolute path to sites directory.
- `created_at` (ISO timestamp): project creation time.

**Hard rule:** `ProjectContext` is immutable after creation. No runtime logic may re-derive paths from `TAG`.

**Storage:** `sites/<site_tag>/.project.json`

**Migration for existing sites:** On first access, if `.project.json` does not exist, generate `project_id` deterministically from a SHA-256 hash of `site_tag + hub_root` and write `.project.json`. This ensures the same site always gets the same `project_id`.

### RunContext
- `run_id` (string): unique identifier for one execution of a recipe.
- `project_id` (string): reference to ProjectContext.
- `recipe_id` (string): reference to the recipe being executed.
- `recipe_version` (string): semantic version of the recipe.
- `started_at` (ISO timestamp).
- `trigger` (enum): `user`, `autonomous`, `repair`, `retry`, `test`.
- `workspace_root` (string): isolated working directory for this run.

### RunRecord
- `run_id` (string): primary key.
- `project_id` (string).
- `status` (enum): `preparing`, `running`, `committing`, `published`, `failed`, `cancelled`.
- `stage_attempts` (array of StageAttempt ids).
- `artifact_manifest_id` (string).
- `events` (array): ordered trace events.
- `ended_at` (ISO timestamp | null).

### StageAttempt
- `stage_attempt_id` (string): primary key.
- `run_id` (string).
- `stage_id` (string): recipe-local stage identifier.
- `attempt_number` (number): 1-based retry counter.
- `status` (enum): `pending`, `running`, `succeeded`, `failed`, `compensating`, `compensated`.
- `inputs` (ArtifactManifest ids).
- `outputs` (ArtifactManifest ids).
- `started_at`, `ended_at`.

### ArtifactManifest
- `artifact_id` (string): primary key.
- `run_id` (string).
- `stage_attempt_id` (string | null): null for run-level artifacts.
- `kind` (enum): `file`, `spec_patch`, `trace_event`, `prompt`, `render_output`, `verification_report`.
- `path` (string | null): relative path within workspace_root.
- `checksum` (string): SHA-256 of artifact content.
- `metadata` (object): kind-specific metadata.

## Persistence

**Authoritative store:** SQLite tables `projects`, `runs`, `stage_attempts`, `artifacts`.

**Portable log:** Append-only JSONL per run in `sites/<site_tag>/runs/<run_id>/run.jsonl`.

**Why both:** SQLite is authoritative for queries and recovery; JSONL is the durable audit trail and enables cross-system inspection.

## Migration from Old Records

- Old `.studio.json`, `mutations.jsonl`, and `build-trace.jsonl` remain read-only archives.
- The new runtime creates a `ProjectContext` for existing sites on first access.
- Old `site_tag` references in trace records are kept as-is but are treated as projections; new records use `project_id`.

## Anti-Goals
- Do not allow any stage to read `process.env.SITE_TAG` or a mutable global.
- Do not reuse the same `RunRecord` for retries; each retry is a new `RunContext` linked to a parent.
- Do not mutate `ProjectContext` after creation.
