# Plan Density: Standard

**Purpose:** Default active plan list for CLI, Codex/Cowork responses, Claude Code responses, Studio plan list view, and phone/web mirrors.

## Required Fields

| Field | Meaning |
|---|---|
| `id` | Stable plan identifier used for drilldown. |
| `title` | Human-readable plan name. |
| `status_label` | Human-readable status. |
| `current_workstream` | Current workstream or focus. |
| `next_action` | Next recommended action. |
| `proof` | Source files, reports, traces, or other evidence links. |
| `open_blockers` | Current blocker, ambiguity, or `none`. |

## Canonical Shape

| Active plan | Status | Current workstream | Next action | Proof | Open blockers |
|---|---|---|---|---|---|
| `<id> - <title>` | `<status_label>` | `<current_workstream>` | `<next_action>` | `<proof links>` | `<open_blockers>` |

## Rules

- Markdown is the default output because it degrades in terminals and becomes clickable in agent/web surfaces.
- Proof links should point to repo-local paths where possible.
- Surfaces may render this as a table, list, or cards, but the fields, order, and wording stay fixed.
