# FAMtastic Studio — Site Workflow Modes

**Date:** 2026-05-04  
**Task:** `task-2026-05-04-020` — Define three site workflows  
**Status:** Architecture contract only. Implementation is not changed by this document.

## Purpose

Studio needs one explicit contract for the three site workflows it is expected
to support:

1. `new_site_from_brief` — create a new Studio-owned site from a user brief.
2. `adapt_existing_site` — work on an already-built or deployed site/repo.
3. `rebuild_from_brief` — recreate a Studio site from an existing brief/spec.

As of this document, Studio best supports `new_site_from_brief`. The other two
workflows are architectural targets with real integration gaps. This contract
defines the inputs, ownership boundaries, permissions, config discovery,
execution paths, proof requirements, and known gaps for each mode without
claiming unimplemented behavior exists.

## Shared Terms

| Term | Contract |
|---|---|
| Workflow mode | One of `new_site_from_brief`, `adapt_existing_site`, `rebuild_from_brief`. The mode chooses how source state is discovered, who owns writes, and what proof is required. |
| Studio site tag | The local Studio identifier for a site under the FAMtastic sites root. Existing code commonly refers to this as `TAG`. |
| Brief | User-facing site direction stored in the Studio site spec, usually under `spec.design_brief`. |
| Spec | The Studio-owned site state file for generated sites. Existing behavior commonly centers on `spec.json` plus `.studio.json`. |
| External site/repo | A site whose source is not fully owned by Studio generation, such as a hand-built repo, a deployed static site, or a third-party project folder. |
| Proof | Verifiable evidence that the workflow completed safely: files changed, commands run, previews rendered, audits passed, and gaps recorded. |

## Workflow Summary

| Mode | Primary Use | Current Support | Write Ownership |
|---|---|---|---|
| `new_site_from_brief` | Build a brand-new site from a user brief. | Best supported today. Still has known gaps around multi-page defaults, approval flow, and state consistency. | Studio owns the generated site directory and generated assets. |
| `adapt_existing_site` | Inspect and modify a site that already exists outside Studio's normal generated-site lifecycle. | Not first-class today. Must be treated as unimplemented until adapters and safe write boundaries exist. | The external repo/source remains canonical unless explicitly imported. Studio writes only inside an approved working copy or patch plan. |
| `rebuild_from_brief` | Rebuild a known Studio site from its stored brief/spec, usually after drift, corruption, or a user request to start over. | Partially possible through existing rebuild paths, but not isolated as a first-class mode. | Studio owns regenerated output, but must preserve selected state from the previous site according to a declared rebuild policy. |

## Shared Mode Envelope

Every workflow should be represented by a small mode envelope before execution:

```json
{
  "workflow_mode": "new_site_from_brief",
  "site_tag": "site-example",
  "source": {
    "type": "brief",
    "path": "sites/site-example/spec.json"
  },
  "permissions": {
    "write_scope": "studio_site",
    "external_repo_write": false,
    "deploy_allowed": false
  },
  "proof": {
    "required": ["spec_snapshot", "build_log", "preview_smoke"],
    "ledger_event": "workflow_completed"
  }
}
```

This document does not add that JSON file because no runtime loader currently
consumes it. If implemented later, it should live under `site-studio/lib/` only
if it is executable runtime data, or under `architecture/` if it remains a
reference contract.

## Mode 1: `new_site_from_brief`

### Purpose

Create a new Studio-managed site from a user-provided business/site brief. This
is the default Studio creation flow and the one current implementation supports
most directly.

### Required Inputs

| Input | Required | Notes |
|---|---:|---|
| `site_tag` | Yes | Must be a safe slug. Existing known security notes require strict validation before path operations. |
| `brief_text` or interpreted `design_brief` | Yes | The source of truth for initial content, tone, pages, and build intent. |
| `site_name` / business identity | Yes | Can be derived from the brief when unambiguous. |
| `pages` | Recommended | Current creation has historically defaulted to `["home"]`; multi-page intent must be explicit or copied into `spec.pages`. |
| brand direction | Optional | Colors, typography, logo, image style, character hints. Build layer should default missing values. |
| deploy target | Optional | Deployment is not required for build completion. |

### State Ownership

Studio owns:

- The site directory under the configured sites root.
- `spec.json` and `.studio.json` for the created site.
- Generated `dist/` HTML/CSS/assets.
- Studio-managed uploads, generated images, slot mappings, and build metadata.

The user owns:

- The source brief and any explicit approvals or overrides.
- External credentials and deployment choices.

No external repository is canonical in this mode unless a later export step is
explicitly requested.

### Permissions

Allowed:

- Create a new site directory.
- Write Studio site state and generated output.
- Generate or import assets according to configured providers.
- Run preview and verification.

Not automatically allowed:

- Deploying to production.
- Pushing to a remote repository.
- Modifying unrelated Studio code or global configuration.

### Config Discovery

Resolution order should be:

1. Runtime-selected `site_tag` / active `TAG`.
2. Per-site `spec.json` and `.studio.json`.
3. Global Studio config, currently `~/.config/famtastic/studio-config.json`.
4. Environment variables and provider-specific keys.
5. Build-layer defaults from Studio code and skeleton constants.

Known reality: some global settings are known to be dead or only partly wired.
Contracts must not assume a config key changes runtime behavior unless the code
path actually reads it.

### Execution Path

Expected path:

1. Normalize and validate the requested site tag.
2. Interpret the brief into build intent / design brief fields.
3. Create the site directory and initialize `spec.json` / `.studio.json`.
4. Determine page list before build starts.
5. Build shared template/chrome, then page output.
6. Run post-processing in the established order: slots before mappings, then
   metadata, reconciliation, logo/nav/footer/head/CSS work.
7. Run preview smoke and verification.
8. Record proof.

Current reality:

- The fresh brief path is the most mature path.
- Multi-page creation is still fragile when `spec.pages` is not populated before
  rebuild.
- Some approval and intent flows can fall through to generic layout updates.

### Proof Requirements

Minimum proof:

- Input brief snapshot or hash.
- Site tag validation result.
- Initial `spec.json` / `.studio.json` snapshot.
- Build log with model/agent entry point and page list.
- Generated file inventory.
- Preview smoke result for each page.
- Verification score/result when available.
- Explicit list of deferred gaps.

Completion means a generated site can be previewed locally and its state files
match the generated page list. It does not imply production deployment.

### Known Gaps

- First-class workflow-mode storage does not exist.
- New-site flow can still underbuild multi-page briefs if page intent is not
  copied into `spec.pages` before build.
- Some settings in `studio-config.json` are known to be unwired or only partly
  honored.
- State remains split across globals, disk reads, spec helpers, HTTP handlers,
  and WebSocket handlers.
- Approval semantics differ by entry point and are not represented as an
  explicit workflow envelope.

## Mode 2: `adapt_existing_site`

### Purpose

Allow Studio to inspect, understand, and modify an existing site whose source
was not created by the current Studio generation pipeline. Examples include:

- A hand-built repo.
- A deployed static site cloned locally.
- A site exported from Studio and then edited outside Studio.
- A customer-owned project where Studio should propose or apply patches.

This mode must preserve the external site's ownership model. Studio is a guest
in the repo unless the user explicitly imports the site into Studio ownership.

### Required Inputs

| Input | Required | Notes |
|---|---:|---|
| `source_path` or `repo_url` | Yes | Local path is safest. Remote clone/import must be explicit. |
| `site_tag` | Yes | Studio still needs a local tracking identifier, even when source is external. |
| `write_policy` | Yes | `read_only`, `patch_only`, `working_copy`, or `import_to_studio`. |
| framework/static type | Recommended | Can be discovered from files, but must be recorded before execution. |
| build command | Conditional | Required before running external builds. May be discovered from `package.json`, `netlify.toml`, etc. |
| preview command/output path | Conditional | Required before proof can render the adapted site. |
| deployment ownership | Optional | Must not be guessed from repo files alone. |

### State Ownership

External source remains canonical unless `write_policy` is `import_to_studio`.

Studio may own:

- A local adaptation manifest.
- Analysis reports.
- Patch plans.
- Generated assets staged for review.
- A Studio-side mirror if explicitly imported.

Studio must not assume ownership of:

- The external repository history.
- Production deployment settings.
- Existing CI/CD secrets.
- Hand-authored source conventions.

### Permissions

`adapt_existing_site` requires an explicit write policy:

| Policy | Allowed Writes |
|---|---|
| `read_only` | No writes to source. Only analysis/proof artifacts in Studio-owned locations. |
| `patch_only` | Generate patch/diff artifacts, but do not apply them. |
| `working_copy` | Apply edits inside an approved local working copy. Do not push/deploy automatically. |
| `import_to_studio` | Copy/import site into a Studio-owned site directory, then operate as a Studio site. Original repo remains untouched unless separately requested. |

Any destructive operation, dependency install, build command, deploy command, or
remote push must be separately permitted by the workflow envelope. In this task,
no such runtime behavior is implemented.

### Config Discovery

Discovery should be read-only first:

1. Check `package.json`, lockfiles, and framework config files.
2. Check static hosting config such as `netlify.toml`.
3. Check common output directories such as `dist/`, `build/`, `public/`, or
   framework-specific equivalents.
4. Check existing `.env.example` or documented environment requirements, never
   assume missing secrets.
5. Detect whether the site already has a Studio `spec.json` / `.studio.json`.
6. Record uncertainty instead of inventing commands.

Config discovery must produce a manifest before any write. Suggested manifest
fields:

```json
{
  "workflow_mode": "adapt_existing_site",
  "site_tag": "site-example",
  "source_path": "/absolute/path/to/source",
  "detected_stack": "static-html",
  "build_command": null,
  "preview_command": null,
  "output_dir": "dist",
  "write_policy": "read_only",
  "studio_owned": false,
  "discovery_confidence": "medium",
  "unknowns": ["No package.json build script found"]
}
```

### Execution Path

Target path:

1. Validate the source path is inside an allowed workspace or explicitly
   approved import location.
2. Create or load an adaptation manifest.
3. Discover stack, build command, preview command, output directory, deploy
   config, and Studio state files.
4. Classify the requested change as analysis, patch, working-copy edit, or
   import.
5. For read-only analysis, produce findings and proof without editing source.
6. For patch mode, generate a diff/patch plan with file-level evidence.
7. For working-copy mode, apply scoped edits and run the discovered proof path.
8. For import mode, copy into a Studio site and then switch to
   `new_site_from_brief` or `rebuild_from_brief` semantics as appropriate.

Current reality:

- No first-class adapter manifest is wired.
- Studio's build pipeline assumes Studio-managed site state more strongly than
  external repos.
- Existing WebSocket and HTTP paths are not designed around external source
  ownership or patch-only workflows.

### Proof Requirements

Minimum proof:

- Source path/repo identity and discovery manifest.
- Detected stack and confidence.
- Write policy used.
- Full list of files read and files changed, if any.
- Diff or patch artifact for any proposed/applied change.
- Build/preview command output when commands are available.
- Screenshot or preview smoke when a render path is available.
- Explicit statement if proof could not be run because commands or secrets are
  missing.

Completion means the site was analyzed or patched according to the declared
write policy. It does not mean the external site has been deployed or imported
unless those steps are explicitly included and proven.

### Known Gaps

- No runtime workflow mode exists for external-site adaptation.
- No adaptation manifest is implemented.
- No safe source-path allowlist/import policy is implemented for this mode.
- No patch-only user experience is wired.
- No framework-specific proof runner is wired for external repos.
- No deploy ownership handoff exists.
- The current Studio state model is not suitable for treating an external repo
  and generated Studio output as peers.

## Mode 3: `rebuild_from_brief`

### Purpose

Recreate a Studio-managed site from a stored brief/spec while preserving or
explicitly discarding selected previous state. This is for cases where the user
wants a clean rebuild, a damaged output needs regeneration, or an existing brief
should be re-run through an improved build pipeline.

This mode differs from `new_site_from_brief` because source state already
exists and must be reconciled before regeneration.

### Required Inputs

| Input | Required | Notes |
|---|---:|---|
| `site_tag` | Yes | Identifies the Studio-owned site to rebuild. |
| existing `spec.json` | Yes | Must contain enough `design_brief` / identity to rebuild. |
| rebuild policy | Yes | Defines what to preserve vs regenerate. |
| page list | Yes | Must be explicit before build starts. |
| asset preservation policy | Yes | Determines whether uploaded/generated/stock assets survive. |
| rollback target | Recommended | Existing version snapshot or backup before destructive rebuild. |

### State Ownership

Studio owns the site state, but prior state may contain user-approved decisions.
The rebuild policy must say what happens to:

- `design_brief`
- `design_decisions`
- `pages`
- uploaded assets
- generated images
- stock image mappings
- slot mappings
- version history
- deployment config
- custom code edits, if any

Default safe policy should be preserve-unless-explicitly-regenerated for
identity, brief, pages, user uploads, and deployment metadata.

### Permissions

Allowed with explicit rebuild request:

- Read existing site state.
- Create a pre-rebuild snapshot.
- Regenerate `dist/` output.
- Update generated metadata and verification state.

Requires stronger permission:

- Delete uploaded assets.
- Clear slot mappings.
- Rewrite `design_brief`.
- Change deployment config.
- Push/deploy regenerated output.
- Overwrite custom hand edits outside generated output.

### Config Discovery

Resolution order:

1. Existing `spec.json`.
2. Existing `.studio.json`.
3. Current generated output inventory.
4. Existing version snapshots/backups.
5. Global Studio config.
6. Build-layer defaults.

Discovery must detect stale or inconsistent state before rebuild, especially
when `spec.pages`, `design_brief.must_have_sections`, and generated page files
disagree.

### Execution Path

Expected path:

1. Validate `site_tag`.
2. Load `spec.json`, `.studio.json`, and existing output inventory.
3. Validate that the brief/spec has enough identity and page data.
4. Create a pre-rebuild snapshot.
5. Resolve rebuild policy:
   - `preserve_assets`
   - `preserve_decisions`
   - `preserve_deploy_config`
   - `clear_generated_output`
   - `reuse_template`
6. Rebuild shared template and pages from the existing brief/spec.
7. Reapply preserved slot mappings only after slots are re-extracted.
8. Run post-processing and verification.
9. Compare rebuilt output against expected pages and preserved state.
10. Record proof and rollback pointer.

Current reality:

- Rebuild behavior exists in practice through build/update paths, but the
  rebuild policy is implicit.
- Slot stability and mappings have known fragility, especially when regenerated
  slots are renamed.
- Page list consistency is not guaranteed unless prepared before the build.

### Proof Requirements

Minimum proof:

- Pre-rebuild snapshot path or version id.
- Source brief/spec hash.
- Rebuild policy used.
- Page list before and after rebuild.
- Asset and slot preservation summary.
- Generated file inventory.
- Verification/preview result.
- Rollback pointer.
- Known gaps or preservation failures.

Completion means the regenerated output matches the declared page list, proof
has run, and rollback information exists. It does not mean the rebuild preserved
every prior visual detail unless that was part of the rebuild policy and proof.

### Known Gaps

- No first-class rebuild policy object is implemented.
- No single owner reconciles `spec.pages`, brief page intent, and generated
  files before rebuild.
- Slot mapping preservation remains fragile when IDs change.
- Existing rebuild paths may trigger through broad classifier intents rather
  than an explicit workflow mode.
- There is no guaranteed rollback gate for every rebuild entry point.

## Cross-Workflow State Ownership Matrix

| State | `new_site_from_brief` | `adapt_existing_site` | `rebuild_from_brief` |
|---|---|---|---|
| Brief | Created by Studio from user input. | Imported or inferred only with explicit policy. | Existing brief is canonical unless user changes it. |
| Spec | Studio creates and owns. | Studio owns only a manifest unless imported. | Studio owns and must snapshot before rewrite. |
| Generated output | Studio creates and owns. | External output is read-only unless working-copy/import policy allows edits. | Studio regenerates and owns. |
| Assets | Studio owns generated/uploaded assets. | External assets remain external unless imported. | Preserve by default unless policy says regenerate/delete. |
| Deployment | Not automatic. | External owner remains canonical. | Preserve metadata by default; deploy separately. |
| Git history | Not automatically managed. | External repo remains canonical. | Studio repo/site history is unchanged unless separate git action runs. |

## Proof Event Contract

Every mode should eventually emit proof in a consistent shape:

```json
{
  "event": "workflow_completed",
  "workflow_mode": "new_site_from_brief",
  "site_tag": "site-example",
  "started_at": "2026-05-04T00:00:00.000Z",
  "completed_at": "2026-05-04T00:02:00.000Z",
  "inputs": {
    "brief_hash": "sha256:...",
    "source_path": null
  },
  "state": {
    "write_policy": "studio_site",
    "pages": ["index.html"]
  },
  "artifacts": {
    "spec_snapshot": "sites/site-example/spec.json",
    "build_log": "sites/site-example/logs/build.jsonl",
    "preview": "http://localhost:3335"
  },
  "verification": {
    "ran": true,
    "passed": true,
    "score": 87
  },
  "gaps": []
}
```

The exact storage location is intentionally not declared here because the parent
task owns ledger integration. The important contract is that workflow proof must
identify mode, site, inputs, write policy, artifacts, verification, and gaps.

## Implementation Notes

- The mode should be chosen before classifier/build execution, not inferred
  halfway through a handler.
- Write permissions should be checked before path resolution or command
  execution.
- External source adaptation should start read-only and escalate only through an
  explicit policy.
- Rebuilds should snapshot first, then mutate.
- Page list resolution should happen before any page generation in all modes.
- Proof is part of completion, not an optional afterthought.

## Current Known Gaps Across All Modes

- Workflow modes are not represented as first-class runtime data.
- There is no shared mode envelope, manifest, or proof event writer.
- New-site, rebuild, and adaptation semantics are currently mixed through
  request classification, active site state, and build handlers.
- External repo adaptation lacks safe write boundaries and proof runners.
- Rebuild policy is implicit and does not consistently protect assets, slots,
  deployment metadata, or custom edits.
- Documentation and ledger integration are intentionally left to the parent
  agent for this task.
