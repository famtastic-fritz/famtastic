# Media Studio Unification Checklist

## Goal

Unify the prompt-first Workbench Media Studio with the richer production Media Studio controls while preserving Media Studio as the parent domain and Media Library as a support surface.

## Action Items

1. Inventory Workbench media state in `site-studio/public/data/workbench-workspaces.json` and `site-studio/public/js/workbench-foundation.js`.
2. Inventory production Media Studio controls in the current Studio screen modules.
3. Map controls into four groups: Create, Compare, Approve, Promote.
4. Keep library/history/provider panels subordinate to prompt-first creation.
5. Identify provider config keys and cost/credit warnings before wiring generation controls.
6. Build one shared media state shape before adding UI polish.
7. Verify through Studio UI with a no-cost/non-generation browser proof first.

## Acceptance

- Workbench and production Studio describe the same Media Studio object model.
- Prompt input remains the center surface.
- Provider controls are visible only with enough config context to avoid accidental spend.
- The Media Library cannot become the primary domain label.

## Hard Stops

- Do not call paid media APIs while building the unification shell.
- Do not propose Adobe Firefly API usage; Firefly API is unavailable on the current plan.
