# Plan Density: Compact

**Purpose:** One-line status per plan for tight surfaces such as Shay Lite, phone glances, status bars, and narrow terminal panes.

## Required Fields

| Field | Meaning |
|---|---|
| `id` | Stable plan identifier used for drilldown. |
| `status_label` | Human-readable status using the same wording as standard/detail. |
| `current_workstream` | Short current focus. |
| `next_action` | Short next action. |

## Canonical Shape

```text
<id>  <status_label>  <current_workstream>  <next_action>
```

## Rules

- Do not invent surface-specific field names.
- Do not include proof details unless a surface has room to render standard density.
- Use the same values as `plans/registry.json`; compact is a density, not a separate summary.
