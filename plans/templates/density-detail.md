# Plan Density: Detail

**Purpose:** Full single-plan drilldown for `fam-hub plan show <id>`, Shay Desk detail responses, and Studio detail panels.

## Required Fields

| Field | Meaning |
|---|---|
| `id` | Stable plan identifier. |
| `title` | Human-readable plan name. |
| `status_label` | Human-readable status. |
| `group` | Plan cluster. |
| `plan_path` | Primary source file. |
| `originator` | Person, agent, or session that originated the plan. |
| `origin_surface` | Surface where the plan originated. |
| `current_runner` | Current executor, not permanent owner. |
| `runner_surface` | Surface where the current runner is operating. |
| `run_target` | Complete, percent, timebox, until blocked, pilot, or not running. |
| `handling` | Governance mode for the plan. |
| `current_workstream` | Current focus. |
| `next_action` | Next recommended action. |
| `open_blockers` | Current blocker or ambiguity. |
| `proof` | Source files, reports, traces, or other evidence. |
| `tasks` | Known grouped tasks. |
| `assumptions` | Assumptions made while deriving status. |

## Rules

- Detail density is for one plan at a time.
- Detail can show arrays as bullets, but must not rename fields by surface.
- If a field is missing, render it as `unknown` and log the gap instead of blocking read-only status.
