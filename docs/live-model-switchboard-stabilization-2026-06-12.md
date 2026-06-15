# Live Model-Switchboard Stabilization — Decision Report (2026-06-12)

> Live repo: `/Users/famtasticfritz/famtastic/shay-shay` @ `main` (editable install → working-tree edits run live after a restart).
> **No model-switchboard code was committed, stashed, or reverted.** Config fix (google-antigravity) was applied separately and is backed up.
> Backups: `~/.shay/backups/live-stabilization-20260612/` (`config.yaml`, `state.db`+wal/shm, `live-repo-working-tree.diff` [534 lines], `live-repo-status.txt`).

## Origin of the dirty work
`model_fix_summary.md` (untracked, dated 2026-06-05) documents that Shay was self-repairing the **`/model` command**: the autocomplete was ignoring `model.default` + `fallback_providers` (only read `model_aliases`), and **selection crashed** (`ProviderDef` attribute errors → `slug` vs `id` → a tuple-unpacking bug). The summary ends mid-fix and explicitly escalates. The current working-tree edits are that fix, **partially landed**.

## What changed in the live repo (working tree)
| File | Lines | Classification | Coherent? |
|---|---|---|---|
| `shay_cli/commands.py` | +14 / −3 | **Intended** — `/model` autocomplete fix: reads default + fallbacks + alias `description`; adds `display.model_autocomplete_aliases` / `restrict_to_preferred`. | ✅ self-consistent |
| `shay_cli/models.py` | +25 | **Intended** — adds `custom:poe` brain catalog (Poe OpenAI-compatible models). | ✅ self-contained data |
| `shay_cli/model_switch.py` | +1 / −1 | **Intended but part of an INCOMPLETE fix chain** — `target_provider = pdef.slug` → `pdef.id` (provider-resolution fix). | ⚠️ needs runtime proof |
| `tools/registry.py` | +1 | Harmless drift — `from __future__ import annotations`. | ✅ |
| `shay_constants.py` | +1 | Harmless drift — `from __future__ import annotations`. | ✅ |
| `PERSONA.md`, `SOUL.md` (repo copies) | — | **Unrelated to model-switchboard** — repo-copy identity docs modified. NOT touched here (do-not-modify rule). Review separately. | ⚠️ out of scope |
| `shay_shay.egg-info/*` | — | build metadata churn — ignore. | — |
| untracked: `model_fix_summary.md`, `THINKING-LOG.md`, `research/`, `tinker-atropos/`, `tools/github_obsidian_ingest.py`, new `skills/*` | — | Unrelated to model-switchboard; leave for separate review. | — |

## What appears intentional
The `/model` autocomplete fix (`commands.py`), the Poe catalog (`models.py`), the provider-resolution `slug→id` change (`model_switch.py`), and the two `__future__` imports. All read as a single deliberate effort to make `/model` list and select brains correctly.

## What remains dirty / uncertain
- **The selection-crash fix may be incomplete.** `model_fix_summary.md` lists follow-on bugs (`api_key_env_var`→`api_key_env_vars`, a tuple-unpack at ~`model_switch.py:717`). The working-tree diff shows **only** the `slug→id` change — the other fixes are either already committed earlier or **still unfixed**. **Unknown without a runtime test.**
- Repo-copy `SOUL.md`/`PERSONA.md` are modified — out of scope here; review separately (runtime `~/.shay` copies are intact and were not touched).

## What should be committed later (after runtime verification)
A single focused commit once `/model <name>` selection is confirmed crash-free at runtime:
- `shay_cli/commands.py`, `shay_cli/models.py`, `shay_cli/model_switch.py`, `tools/registry.py`, `shay_constants.py`
- Suggested message: `fix(model): /model autocomplete reads default+fallbacks; resolve provider by id; add Poe catalog`
- **Gate before commit:** run `shay model <alias>` (or the autocomplete) and confirm no `AttributeError`/tuple crash. If it still crashes, finish the fix first (see `model_fix_summary.md` Attempt 3–4).

## What should be stashed/reverted later
- **Nothing to revert** in the model-switchboard set — all changes are intentional.
- The repo-copy `SOUL.md`/`PERSONA.md` edits should be reviewed independently (not model-switchboard; possibly accidental). Decide commit vs `git checkout --` per file — **not** done here.

## What should transfer to the new codebase (`@shay/*` platform)
Carry the *lessons*, not the Python:
- **Brain Router (`@shay/brain`)** must resolve a provider by its **id, not slug** (the live bug). Bake into the router + a test.
- The **model picker** should surface `default + fallbacks + aliases` (with alias descriptions), optionally restricted by a `model_autocomplete_aliases` preference — a surfaces/brain concern.
- **Poe** as a first-class custom provider lane in the router's lane catalog.
- Add the `slug-vs-id` and `api_key_env_var(s)` mistakes to the new repo's do-not-repeat notes.

## Status
- Model-switchboard code: **left as-is (uncommitted), backed up.**
- google-antigravity config: **fixed + validated** (separate change).
- Next gate: a runtime `/model` selection test before committing the fix.
