# Settings / Customization — Page-Type Brief

**Status:** draft for review (P2 deliverable of plan_2026_05_05_workbench_per_page_design — workstream `ws_research_settings_customization`)
**Page type:** Settings / Customization
**Companion mockup:** `docs/design-research/page-types/05-settings-mockup.html`
**Inherits:** `docs/STUDIO-UI-FOUNDATION.md` §2 Night Scheme, §3 Page Rule
**Taxonomy entry:** `docs/design-research/page-type-taxonomy.md` §1.5

---

## 1. Intent

> *"I came here to change a setting. Show me the setting, let me change it, tell me it saved, and get out of my way."*

A Settings page is the most conventional surface in the Workbench. The user arrives with a specific configuration intent — flip a toggle, tweak a slider, paste a key, set a budget cap. The page exists to present a **structured, navigable form** with a clean save model and unambiguous state.

There is no canvas. There is no agent collaboration in the body of the page. There is no live preview of an artifact. Settings are *form-shaped work*, and the pattern is conventional precisely because operators have learned to expect it from every modern desktop and SaaS product. Inventing here is a regression — the Fritz filter answer for "novel settings layout" is *none of the five values in STUDIO-UI-FOUNDATION §1 R4*.

What FAMtastic gets to express in Settings is **Night Scheme aesthetic** (glass, warm/cool glow, calm density) on top of an otherwise unsurprising shape. The novelty is the surface treatment, not the structure.

---

## 2. Product references

Per the standing rule (`memory/rule/every-page-type-design-must-cite-2-product-references.md`) every page-type design cites at least two proven references. Settings cites four because the surface-area is large.

### 2.1 Linear settings
**Pattern.** Two-column: section list left, scrolling form right. Section list is grouped (Workspace, Account, My settings) with quiet typography. Inputs are dense, hairline-bordered, and explicit-save where the change is structural; autosave on simple toggles. Toast confirms.
**Get right.** Quiet section list with grouping headers. Inputs feel like part of the chrome — no card-per-field clutter. Save indicator is unobtrusive but always visible.
**Adapt.** Steal the section grouping and the dense input styling. Steal the "explicit save for structural changes, autosave for toggles" hybrid model.
**Reject.** Linear's settings have no per-section search; for our larger surfaces (Admin, capability manifest) we need it.

### 2.2 Notion settings
**Pattern.** Modal-style left section list with icons next to each entry; right side scrolls a long form with anchor-able subsections. Saves are autosave-with-debounce; no save button on most surfaces.
**Get right.** Icons in the section list make scanning fast. Anchored subsections inside one section page handle long forms without tabs-on-tabs.
**Adapt.** Use icons in the section list (Personality, Permissions, Budget, Autonomy, Memory, Voice). Use in-page anchors for long forms.
**Reject.** Notion's all-autosave model is dangerous for things like budget caps — those want explicit save with a confirm.

### 2.3 Apple System Settings (modern macOS)
**Pattern.** Sidebar of categories with SF-Symbol icons, search field at top of sidebar (searches across *all* settings, not just the visible section), right pane shows the selected category with grouped panels. Autosave is the default — no Save button at all on most panels.
**Get right.** Cross-section search is the killer feature for big settings surfaces. Sidebar search jumps directly to the relevant control, highlights it briefly. Grouped panels (rounded glass blocks) inside the right pane make a long form skimmable.
**Adapt.** Search-within-settings is mandatory for our Admin and Capability Manifest surfaces. Grouped glass blocks match Night Scheme naturally.
**Reject.** Apple's "no save button anywhere" is wrong for actions with consequences (deploy target rotation, model swap). Hybrid model wins.

### 2.4 Cursor settings
**Pattern.** Tabs across the top (General / Models / Features / Beta) plus a left section list per tab. Models tab is a card grid (each model is a card with toggles and per-model settings inside). Save is implicit on input blur.
**Get right.** Per-model card layout for things that have *substructure* — our Shay-Shay options page is exactly this shape (Personality is a panel, Permissions is a panel, each with their own sub-controls).
**Adapt.** When a section is itself composed of distinct subsystems, render them as glass cards inside the right pane rather than a flat form.
**Reject.** Tabs-on-top *and* sections-on-left is one nav too many for our surfaces. We pick one (left section list) and use anchors for sub-structure.

---

## 3. Layout spec

### 3.1 Frame

```
+----+--------------------------------------------------+
| IR | TOP BAR (44px — breadcrumb + ⌘K + Shay dot)      |
| 56 +----------+---------------------------------------+
| px | SECTION  |  [ search settings  ⌘F ]              |
|    | LIST     +---------------------------------------+
|    | (260px)  |                                       |
|    |          |   FORM AREA (scrolling)               |
|    | • Person.|                                       |
|    | • Permis.|   [ glass block — group A ]           |
|    | • Budget |   [ glass block — group B ]           |
|    | • Auton. |   [ glass block — group C ]           |
|    | • Memory |                                       |
|    | • Voice  |                                       |
|    |          +---------------------------------------+
|    |          | SAVE INDICATOR (sticky bottom-right)  |
+----+----------+---------------------------------------+
```

### 3.2 Section list (left, 260px)

- Hairline-separated entries, JetBrains Mono eyebrow grouping ("SHAY-SHAY", "ADMIN", "STUDIO") above clusters.
- Each entry: 16px domain icon + label (Inter 14.5px). Active entry has a 2px warm-glow left rule and `--glass-2` background.
- Hover: `--glass-2` background, 200ms ease.
- The list scrolls independently of the form area when long.

**Why left, not top.** Top tabs work for ≤6 sections. Settings surfaces grow past that (Admin alone has Capability Manifest, Deploy Targets, Vault, Health, Keys, Logging, Model defaults). Left rail scales without reflowing the form.

### 3.3 Form area (right, fluid)

- Top-of-pane: a search field (`Search settings  ⌘F`) that filters across **every section, not just the active one**. Matching controls in other sections show a chip ("4 in Permissions, 2 in Budget"); clicking the chip routes to that section with the matched control highlighted with a 1.6s warm pulse.
- Body: glass blocks (`--glass`, 16px radius, 20-28px backdrop-blur) per logical group. Each block has a Fraunces 26px italic title and a JetBrains Mono eyebrow above.
- Controls: standard form vocabulary — toggle, slider, text input, textarea, select, segmented control. Hairline borders, dense vertical rhythm (14-18px between rows). No card-per-field clutter.
- Long forms use in-page anchor sublinks at the top of the pane (chip row).

### 3.4 Save model — hybrid (autosave + explicit save)

The hybrid is non-negotiable. It maps to the *consequence* of the change:

| Change shape | Save model | Confirmation |
|---|---|---|
| Toggle, slider, simple text input | **Autosave on blur/release** | Save indicator pulses "saved · 3s ago" |
| Structural change (rename, reorder, delete row) | **Explicit save button** appears in sticky save bar | Toast on save success |
| Destructive change (rotate key, swap deploy target, raise budget cap >25%) | **Explicit save + confirm dialog** | Modal confirm, then toast |

The save indicator is a sticky bottom-right pill (`Autosaved · 3s ago` / `Unsaved changes` / `Saving…` / `Saved` / `Save failed — retry`). It is always present so the user can never wonder.

### 3.5 Search-within-settings

Mandatory for surfaces with >12 controls (Admin, Shay-Shay options, Studio settings). Lives at the top of the form area, full-width, glass. Hits across **all sections** of the active settings surface. Implementation note: each control declares a `data-setting-id`, `data-setting-label`, and `data-setting-keywords` attribute so the search index can be built statically per-render.

---

## 4. Surfaces this applies to

Listed in priority order for build:

### 4.1 Shay-Shay options (the distinctive case)
Sections: Personality, Permissions, Budget, Autonomy, Memory, Voice. This is the most novel because the controls themselves carry meaning (autonomy slider, memory weighting, voice timbre preview). It is the **mockup target** for this brief.

### 4.2 Admin sub-pages
Sections: Capability Manifest, Deploy Targets, Vault (keys & secrets), Health, Logging, Model Defaults. Largely conventional; capability manifest has a row-wise inline-edit pattern (per taxonomy Q4 — treat as Library with Settings affordances on each row, but the wrapping shell is Settings).

### 4.3 Per-site settings
Sections: Identity (brand, vertical, tone), Build (template, page set), Deploy (target, domain), Permissions (who/what can edit). Lives inside the Site rail, not as a global Settings page.

### 4.4 Studio settings
Sections: Model (default Claude variant), Brain Pricing (budget caps, alert thresholds), Default Site Template, Hot Keys, Theme (Night Scheme is the only theme today; this is a placeholder section).

---

## 5. State map

Five states the form area can be in. The save indicator and per-control affordances must reflect them honestly.

| State | When | Save indicator | Form behavior |
|---|---|---|---|
| **Clean** | Mounted, no edits | `Autosaved · {ts}` | Inputs editable, no banner |
| **Dirty** | Unsaved structural change pending | `Unsaved changes` (warm-glow) + sticky Save button | Navigation away triggers confirm |
| **Saving** | After Save click, while in flight | `Saving…` (cool pulse) | Inputs locked, Save button disabled |
| **Saved** | Save success | `Saved` (cool, fades to `Autosaved · just now` after 1.6s) | Inputs editable again |
| **Error** | Save failed | `Save failed — retry` (warm, persistent) | Inputs editable, Retry available, error detail in tooltip |

Autosave path goes Clean → (debounce 600ms) → Saving → Saved → Clean. Explicit save path goes Clean → (edit) → Dirty → (Save click) → Saving → Saved → Clean. The Dirty state is the only one with a sticky Save button visible.

---

## 6. Acceptance criteria

A Settings surface is correctly implemented when:

1. **Shell.** Two-column layout with 56px icon rail, 260px section list (left), fluid form area (right). Top bar is the standard 44px Workbench top bar.
2. **Section list.** Sections are grouped with JetBrains Mono eyebrows. Each entry has an icon. Active entry is warm-glow-ruled.
3. **Search.** The form area has a top-mounted "Search settings ⌘F" field that searches across all sections; cross-section hits surface as chips.
4. **Form blocks.** Logical groups render as glass blocks with Fraunces italic titles. No card-per-field clutter. Standard control vocabulary only.
5. **Save model.** Hybrid model implemented: autosave on simple inputs, explicit save on structural changes, confirm dialog on destructive changes. Save indicator pill is always present at sticky bottom-right.
6. **State map.** All five states (clean / dirty / saving / saved / error) are visually distinct and reachable in QA.
7. **Night Scheme.** Tokens from `STUDIO-UI-FOUNDATION.md` §2 only. No bespoke colors. Glow used only on the active section rule and on transient pulses (search-jump highlight, save success).
8. **Density.** Default state feels calm, not packed. A new operator can land on Shay-Shay options and find Personality > Tone slider in under five seconds without help.
9. **No agent surface in the body.** Shay-Shay's orb is still bottom-right (ambient per R3) but she does not occupy the form area itself. Settings is a no-collaboration surface.
10. **Keyboard.** ⌘F focuses the search field. Tab traverses controls in DOM order. ESC dismisses confirm dialogs.
