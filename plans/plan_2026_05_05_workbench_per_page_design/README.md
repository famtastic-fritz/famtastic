# Workbench Per-Page-Type Design Research

- **ID:** `plan_2026_05_05_workbench_per_page_design`
- **Label:** `workbench-per-page-design`
- **Status:** active
- **Owner:** Fritz

## Why this exists

User feedback session 2026-05-05: *"this is not for a website. it's for a product that produces websites."*

The previous Workbench trajectory built website-style chrome with empty rooms inside. The user re-framed FAMtastic as a creation platform — meaning canvas-dominant layouts, collapsible glass chrome, distinct layouts per page type, per-domain icon sets, and real research on how each page type should work.

This plan **pauses implementation** and does the design research first. Six page types identified. Cross-cutting chrome/glass research required. Per-domain icon-set briefs required. Then a consolidation plan picks an implementation path.

## What's in scope

- 6 page-type design briefs (Library · Creation Canvas · Workshop/Sandbox · Triage · Settings · Editor-with-chat)
- 7 per-domain icon-set briefs (Sites · Brainstorm · Plans · Components · Media · Research · Admin)
- Cross-cutting briefs: chrome-collapse pattern, glass slide-out pattern
- Each brief cites at least 2 product references (Cursor, Figma, Leonardo, Linear, Codex Desktop, JSFiddle, etc.)
- Consolidation plan that turns the research into a buildable implementation plan

## MVP

Three deliverables unblock everything else:
1. `ws_page_type_taxonomy_doc` — what page type does each existing surface belong to
2. `ws_research_creation_canvas` — the most important page type (where value gets made)
3. `ws_research_chrome_glass_pattern` — the cross-cutting rule every other page type inherits

## Decisions confirmed

| ID | Decision |
|---|---|
| D1 | FAMtastic is a creation platform, not a website. |
| D2 | Different page types get different layouts. Six types. |
| D3 | Chrome collapses when user is actively creating; canvas dominates. |
| D4 | Right rail + secondary nav are glass slide-outs. |
| D5 | Each domain gets its own coherent icon set. |
| D6 | Pause Workbench implementation until research is done. |

## Out of scope (deferred)

- Choosing Path A / B / C from `docs/STUDIO-SHELL-RECONCILIATION-2026-05-05.md`
- Drawing final production icons
- Implementing any of the new mockups

The follow-up plan (`plan_2026_05_XX_workbench_shell_rebuild`) handles that, after the research lands.
