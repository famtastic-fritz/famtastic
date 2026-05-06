# Library / Collection — Page-Type Brief

**Status:** draft for review (P1 deliverable `ws_research_library_collection` of plan_2026_05_05_workbench_per_page_design)
**Page type:** Library / Collection
**Companion mockup:** `docs/design-research/page-types/01-library-collection-mockup.html`
**Inherits:** `docs/design-research/cross-cutting/02-glass-slide-out.md`, `docs/STUDIO-UI-FOUNDATION.md` §2 Night Scheme
**Sibling:** `docs/design-research/page-types/02-creation-canvas.md`

---

## 1. Intent

> *"Where is the bakery one — the one I made yesterday?"* — operator behavior model

A Library / Collection page exists so the operator can **find one item out of many of the same kind** as fast as possible, with peripheral support for *comparing*, *taking stock*, and *jumping into work*. The work the user does *on* this page is navigational; the work they do *next* happens elsewhere (Creation Canvas, Editor with Chat, Workshop, Settings).

Per the page-type-taxonomy decision tree, Library / Collection wins when the answer to "is the primary task to find one item out of many of the same kind?" is yes. The operator's expectations on entry are:

1. **See the count and the recents at-a-glance** — orientation before action.
2. **Search instantly** — a keyboard-first slash or `/` jump to a global filter.
3. **Filter by the few facets that matter for this collection type** — not every column.
4. **Sort by the dimension that matches the moment** (recent, name, status, deploy date).
5. **Choose grid vs list** — visual scanning vs dense scanning, depending on whether the artifact has a thumbnail worth showing.
6. **One click to enter the item** — the card is the door, not a row of buttons.
7. **For a domain home,** an operational widget area at the top showing the operator's *running empire* — recent deploys, active runs, queue depth, what Shay is working on.

The Library page is a *router*, but it must never feel like a database admin. Aesthetic match to the Night Scheme is mandatory — the cards are the texture; the chrome stays calm.

---

## 2. Product references

### 2.1 Linear — Backlog & Cycles
**Pattern.** Keyboard-first list/board view of issues. Faceted filters across the top (status, priority, assignee, label) as small pills that compose into a query. `/` opens command palette; `f` opens filter; `g i` jumps to inbox. Hover any row to peek metadata; click to enter the issue (which auto-collapses chrome — the Linear focus-mode pattern).
**Get right.** The faceted filter pills (composable, removable, persisted as views), the keyboard-first model (Linear *is* a keyboard app), and the hover-peek that doesn't require navigation.
**Adapt.** Steal the pill-bar of facets at the top of the toolbar (above the cards) verbatim. Steal `/` for search, `f` for filter, `v` for view-toggle. The Library is the operator's command center — it should reward keyboard fluency.
**Reject.** Linear's information density is too high for our visual artifacts. We default to grid (visual scanning) where Linear defaults to list (dense scanning). Sites cards must show preview thumbnails, not titles-and-priority pills.

### 2.2 Figma — File Browser
**Pattern.** Left sidebar with org / project hierarchy, top toolbar with search + grid/list toggle + sort dropdown, main grid of file cards with cover thumbnails, a "Recents" / "Drafts" / "Shared" filter strip near the top. Hovering a file card surfaces author, last-edited, and a three-dot menu.
**Get right.** Cover-thumbnail-first cards (the cover *is* the identity), the recents/drafts/shared scoping pattern, the calm hover affordances.
**Adapt.** Site cards mirror this — the rendered hero of the site is the card cover. "Recents," "Pinned," "Active," "Archived" become our scope strip. The three-dot menu on hover hosts deploy / rebuild / archive.
**Reject.** Figma's left org sidebar is a multi-tenant pattern; we are single-operator. Our left rail is the icon rail of domains, not a project tree.

### 2.3 Notion — Gallery View
**Pattern.** Card grid with prominent cover images, configurable card properties (which fields render on the card), drag-to-reorder, view-as-table/list/board toggle in the same view-switcher.
**Get right.** Configurable card density — the operator can choose what each card surfaces (deploy URL? last-edited? page count?). Drag-to-reorder for pinned items.
**Adapt.** Card density preset per domain (`compact` / `default` / `expanded`) persisted in localStorage. Pinned section accepts drag-to-reorder; main grid is sort-driven.
**Reject.** Notion's "add a property" lives in the card config — too much configurability for us. Card schema is fixed per domain (decided once, not per-user).

### 2.4 Apple Photos — Library
**Pattern.** Visual-first uniform grid, smart albums (auto-generated facets like People, Places, Recents), fluid zoom (slider scales tile size 60px → 320px), no chrome on the tiles themselves — the image is the chrome.
**Get right.** The fluid-zoom slider (a single control that changes density without modal config). The "no chrome on tiles" philosophy — for Media Studio especially.
**Adapt.** Media library uses Photos-style fluid zoom on the tile size. Smart-album equivalents ("Used in a site," "Generated this week," "Promoted to brand kit") render as facet pills.
**Reject.** Photos-style timeline grouping is wrong for our domains; recency is a sort, not a grouping.

### 2.5 Codex Desktop / VS Code — Project Picker / Start Page
**Pattern.** Recent projects pinned at top with a search affordance, plus a customizable widget area underneath (recently opened, getting started, walkthroughs). The start page is *part of the IDE*, not a separate route.
**Get right.** The widget-area-on-domain-home concept. The start page sets the operator up before they choose what to do — it's a launchpad, not just a list.
**Adapt.** The Sites domain home gets an **operational widgets row** above the grid (KPI tiles + recent activity ticker + Shay's pinned note). Other domain homes inherit the *option* to declare widgets but only Sites uses it in v1.
**Reject.** VS Code's marketing tiles ("explore the marketplace") don't earn their place. Widgets must pass the Fritz filter (saves a click / runs without him / makes money / compounds learning / prevents a mistake).

---

## 3. Layout spec

### 3.1 Frame

```
+----+--------------------------------------------------------+
| IR | TOP BAR — breadcrumb · search · view toggle · ⌘K       |
| 56 +--------------------------------------------------------+
| px |  [ OPERATIONAL WIDGETS ROW — domain home only ]        |
|    +--------------------------------------------------------+
|    |  FACET PILL BAR — status · type · scope · sort         |
|    +--------------------------------------------------------+
|    |                                                        |
|    |                CARD GRID (or list)                     |
|    |                                                        |
|    |                                                        |
+----+--------------------------------------------------------+
```

Right rail (glass slide-out, 0 default) is reachable by clicking a card's *peek* affordance or by `⌘.`; it shows item details without leaving the page (Figma right-rail pattern from `02-glass-slide-out.md`). The right rail does not own search, filter, or sort — those are top-bar citizens.

### 3.2 Search

- **Position.** Top bar, center-left, immediately after the breadcrumb. Always visible; never hidden in a modal.
- **Default state.** Placeholder reads `Search <domain>… ⌘K` with the `⌘K` rendered as a small kbd pill on the right edge.
- **Behavior.** Type to filter the grid live (debounced 120ms). `/` from anywhere on the page focuses the search (Linear-style). `Escape` clears and blurs.
- **Scope.** Search matches across the searchable fields declared by the card schema for the domain (e.g. for Sites: site name, tag, brief title, deploy URL).
- **Empty result.** Shows a "No <domain> match `<query>`" panel with a `Clear search` and a `Capture this as a new <domain> item` CTA where applicable (e.g. on Captures library, the missing query becomes a new capture seed).

### 3.3 Filters / facets

**Position: top, as a horizontal pill bar** under the operational widgets row (or under the top bar if there's no widget row). Justified below.

- Pills are composable: clicking opens a small glass dropdown of values; selected value renders as a filled pill; clicking the pill again removes it.
- Per-domain facet declarations (in the workspace contract): Sites declares `status`, `type`, `pinned`; Plans declares `priority`, `status`, `tag`; Memory declares `kind` (decision/rule/anti-pattern/gap), `lifecycle`.
- A trailing `+ Filter` pill opens the full facet picker (for less-common facets that didn't earn a permanent slot).
- Saved views (Linear-borrowed): the current pill combination can be named and pinned to the breadcrumb (`Sites › Active deploys`).

**Why top, not left.** The user's feedback explicitly named "search box, sort + filter, grid/list toggle" without specifying location — and the cross-cutting glass-slide-out brief reserves the *left edge* for the icon rail and its secondary nav slide-out. A left filter rail would compete with the secondary nav for real estate. Top placement keeps the canvas (the grid) full-width, lets facets be a single keyboard-flicked horizontal scan, and keeps the page consistent with Creation Canvas (which has nothing pinned to the left beyond the icon rail). Left rails resurface as a slide-out only for *deep* faceting in the Memory and Plans libraries, where the facet count exceeds 6 — and even then it's a glass slide-out, not a stuck panel.

### 3.4 Sort

- **Position.** Right side of the facet pill bar, as a single dropdown pill (`Sort: Recent ▾`).
- **Per-domain default.** Sites = `Last deployed`. Components = `Recently updated`. Plans = `Priority then created`. Media = `Recently generated`. Memory = `Recently captured`. Proofs = `Run date`.
- Holding `Shift` while opening the sort dropdown reveals secondary sort (rare; Linear-style).
- Per-column sort on list view (clicking a column header) overrides until a new sort is chosen.

### 3.5 Grid vs list toggle

- Top bar, far right, before `⌘K`. Two icons (grid / list) inside a small segmented glass control. `v` toggles.
- **Default per domain.** Visual-first domains default to grid: Sites, Media, Components, Proofs. Text/structure-first domains default to list: Plans, Memory, Captures.
- The choice persists per-domain in localStorage.

### 3.6 Cards — per-type variants

Cards are domain-typed. The generic card frame (glass background, 16-20px radius, 1px hairline, hover bevel + warm halo) is shared; the *contents* vary.

| Card type | Cover | Title | Eyebrow | Meta line | State chip | Hover actions |
|---|---|---|---|---|---|---|
| **Site card** | Hero render thumbnail | Site name (Fraunces 26px) | Tag (mono uppercase) | "5 pages · last deployed 2h ago" | Deploy state (deployed / building / scaffolded / idle) | Open · Deploy · Rebuild · Pin |
| **Media card** | Asset preview (image / video poster) | Filename | Provider (mono) | "1920×1080 · used in 3 sites" | Generation source (firefly / imagen / upload) | Open · Promote to brand kit · Send to canvas |
| **Component card** | Live preview render (sandboxed iframe at scale) | Component name | `library.json` version (mono) | "Used in 12 sites · 2 props" | Status (stable / draft / experimental) | Open · Sandbox · Insert into site |
| **Plan card** | Progress ring (% workstreams done) | Plan title | Plan ID (mono) | "P1 · 4/9 workstreams · 2 active" | Status (active / planned / closed) | Open · Spawn task · Close out |
| **Proof card** | Proof artifact thumbnail (screenshot / log excerpt) | Proof title | Run ID (mono) | "From <plan> · captured 3h ago" | Type (visual / log / api / metric) | Open · Promote · Discard |
| **Memory card** | (no cover) — kind-glyph in a glass square | Entry title | Kind (decision/rule/anti-pattern/gap) | "Captured 2026-04-29 · cited 5×" | Lifecycle (active / superseded / archived) | Open · Cite · Supersede |

Hover state on every card: bevel deepens (`border-hi` accent + soft warm halo), cover scales 1.02 over 400ms ease, hover-actions fade in along the bottom edge inside the card. Click anywhere on the card except the hover-actions opens the item.

### 3.7 Operational widgets area (Sites domain home only — see §7)

A single horizontal row of **glass mini-cards** above the facet bar, scrollable horizontally on overflow. Each widget is a self-contained, declarative tile (no widget owns state outside its own data fetch).

---

## 4. Surfaces this applies to

From the page-type-taxonomy mapping table, the Library / Collection pattern lands on:

- **Sites landing** — the portfolio (the canonical implementation; gets the operational widgets row)
- **Media Studio landing** — the asset library (Apple Photos influence dominates here)
- **Component Studio landing** — the AI component library (Notion gallery + Component cards)
- **Plans registry** — the plan list (Linear backlog influence; list default)
- **Proofs gallery** — the cross-run proof aggregate (visual grid; type filter is primary facet)
- **Memory library** — decision/rule/anti-pattern/gap entries (list default; lifecycle filter)

Plus the secondary Library surfaces named in the taxonomy: Mission Control, Intelligence findings, Research captures, Deploy history, Bottom-strip Runs / Logs / Trace / Proof. These reuse the *same* layout DNA but typically without the operational widget row and often with smaller card variants.

## 5. Per-surface variants

**Sites.** Grid default. Card cover is the deployed hero render (or the scaffolded skeleton placeholder). Deploy-state chip is the most prominent meta. Operational widgets row is present (see §7). The "+ New site" CTA lives in the icon rail's secondary slide-out, not on the Library page itself, to keep the page *navigational* not *creational*.

**Media.** Grid default with Apple-Photos fluid zoom slider (a single tile-size control in the toolbar between the view-toggle and search). Card cover dominates; meta only on hover. Smart-album-style facets ("Used in a site," "Generated this week," "Promoted to brand kit"). Compare-mode is reachable by selecting two tiles and pressing `c` (Creation Canvas inherits the same compare gesture).

**Components.** Grid default. Card cover is a *live* preview render of the component (sandboxed iframe scaled to fit). Hover scales the preview to 1.05 and unmutes any micro-interaction the component declares (like a Storybook hover). The "Open in Sandbox" hover-action routes to the Workshop / Sandbox page type.

**Plans.** List default (P0/P1/P2 lanes are a *grouped list*, not a kanban — closer to Linear cycles than to Trello). Plan cards collapse to two lines in list mode; expand-on-click reveals workstream progress inline without leaving the page. Filter pills emphasize `priority`, `status`, `tag`.

**Proofs.** Grid default. Type filter (visual / log / api / metric) is the primary facet. Visual proofs render full thumbnail; log proofs render a 4-line code excerpt with monospace; api proofs render endpoint + status code; metric proofs render a sparkline.

**Memory.** List default. Kind is a glyph badge to the left of the title. Lifecycle filter is primary (active default; toggling to "archived" changes the visual treatment to dimmed). Cited-count is shown as a small pill — high-cite entries are visually weighted (bigger glyph, brighter title), so the operator's *most-leaned-on* memory entries surface naturally.

---

## 6. State map

| State | Grid / List body | Top bar | Facet bar | Operational widgets |
|---|---|---|---|---|
| **Empty (no items ever)** | Centered Fraunces italic prompt: *"Nothing here yet. Make the first <domain> item."* with a single CTA pointing into Creation/Editor flow | Search disabled | Hidden | Hidden |
| **Loading** | 12 skeleton cards (shimmer; match domain card aspect ratio) | Search disabled | Pills render with shimmer values | Widgets render skeletons |
| **Few items (1–6)** | Grid renders at native card size; no pagination; ample whitespace below | Normal | Normal | Normal |
| **Many items (7+)** | Grid wraps; lazy-load on scroll (no pagination control); a small `N items` count appears on the right of the facet bar | Normal | Normal | Normal |
| **Filtered → results** | Grid shows the filtered subset; an `N of M` count replaces `N items`; a small `Clear filters` chip appears | Normal | Active filters render as filled pills | Normal |
| **Filtered → no results** | Centered: *"No <domain> match these filters."* with `Clear filters` and `Show all <N>` CTAs | Normal | Active filters visible (so user sees what to remove) | Normal |
| **Search → results** | Highlighted matched substring in card titles (warm-glow underline) | Search has visible value with × clear | Filters still respected | Normal |
| **Search → no results** | Centered: *"No <domain> match `<query>`."* with `Clear search`, and (where applicable) `Capture this as a new <domain>` CTA | Normal | Normal | Normal |
| **Error** | Inline glass card spans grid: *"Couldn't load <domain>. Retry."* — preserves last-good grid behind a 0.4 opacity overlay if available | Normal | Normal | Per-widget error state (see §7) |

---

## 7. Operational widgets area spec — Sites home only

The Sites domain home has a **horizontal row of glass mini-tiles** above the facet bar. The row is scrollable on horizontal overflow with edge fades. Each tile is one of the declared widget kinds.

**Widget kinds (v1):**

| Widget | Renders | Click action |
|---|---|---|
| `kpi.deploys_today` | Big number + delta vs yesterday | Opens Deploy log filtered to today |
| `kpi.active_runs` | Count + breathing dot if > 0 | Opens Runs strip |
| `kpi.queue_depth` | Worker queue depth + age of oldest | Opens Admin → Worker Queue |
| `kpi.proofs_pending` | Count + breakdown by type | Opens Proofs gallery filtered to pending |
| `recent_activity` | Last 4 events as a vertical micro-feed | Opens full activity log |
| `shay_pinned_note` | Shay's current top-of-mind line + cool dot | Opens Shay's workshop page (Triage / Workshop) |
| `intel_top_finding` | Most-recent unreviewed promoted finding | Opens Intelligence rail filtered to that finding |

**Customizability.**
- The set of tiles, their order, and which are pinned vs collapsed is stored per-operator in a single `studio-config.json` key (proposed: `dashboard.sites_home.widgets`). Drag-to-reorder; right-click → hide; a `+` chip at the end of the row opens a glass picker of available widgets.
- Widget *implementations* are declarative — each declares its data source (a known endpoint), its render kind (kpi / feed / note), and its click action. Adding a new widget kind is a code change; *configuring* widgets is config-only.
- All widget data refreshes on a single shared poll (default 30s) to avoid N pollers.

**Where they live.** Above the facet bar, below the top bar. They occupy a maximum of 132px tall; the row scrolls horizontally if overflow.

**How they collapse during creation mode.** Per the chrome-collapse rule (`memory/rule/chrome-collapses-when-user-is-actively-creating.md`), the operational widgets row collapses to a 28px strip showing only the *count* of widgets and a single status dot when the user enters creation mode (which the Library page itself does not do — but if a Library is shown *next to* a creation surface in a future split-view, the collapse rule applies). On the standalone Library page, widgets stay expanded by default; a `–` chip in the row corner collapses the entire row to a 28px strip the user can re-expand with `+`.

**Per-widget error state.** If a widget's data source fails, the widget renders a glass error card with the widget label and a small retry chip. The other widgets are unaffected.

---

## 8. Acceptance criteria

An implementation passes review when:

1. **Search is always visible** in the top bar; `/` focuses it from anywhere; `Escape` clears it. No modal search.
2. **Facets are top-anchored pills**, composable, removable per pill, with saved-view naming. No left filter rail except as a glass slide-out for >6-facet domains.
3. **Sort is a single dropdown pill** with a per-domain default. `Shift+click` reveals secondary sort.
4. **Grid/list toggle** lives in the top bar with `v` shortcut and persists per-domain in localStorage.
5. **Cards are domain-typed** and follow the §3.6 schema for the relevant card type. Generic-card fallback is forbidden.
6. **Hover state matches the Night Scheme glass spec** — bevel deepens, warm halo, hover-actions fade in along the card bottom.
7. **The operational widgets row** is present **only** on the Sites domain home in v1; widget config is stored in `studio-config.json` and reorderable by drag.
8. **All seven state-map states render** per the table in §6 — no skipped empty / no-results / error states.
9. **Tokens come from STUDIO-UI-FOUNDATION.md §2.** No new colors, no new motion curves, no new fonts.
10. **Cites at least 2 product references** in the implementation PR (per memory rule). This brief gives 5; pick the two that most influenced the implementation.
11. **Renders the matching mockup** at `01-library-collection-mockup.html` to within visual parity. No invented layouts.
12. **Library is a router, never a creator.** No surface on this page produces an artifact; every action either filters, sorts, opens an item, or routes to a creation surface elsewhere.

---

## 9. Known gaps this brief opens

- **Saved-view persistence.** Linear-style saved views need a storage location (`studio-config.json`? per-domain `.studio/views.json`?) — defer to consolidation plan.
- **Apple-Photos fluid zoom** is specified for Media but the mechanic (slider? scroll-to-zoom? key?) isn't decided. Mockup uses a 3-position segmented control as a conservative starting point.
- **Memory cited-count** requires a citation-tracking pass that doesn't exist; file as a Memory-platform gap.
- **Component live-preview iframe sandbox** is non-trivial (CSP + sandbox attrs + size scaling). File as a Components-platform gap.
- **Compare-mode (`c` on multi-select)** is hinted at in the Media variant but specced fully in the Creation Canvas brief; cross-link required when both implementations land.
- **Widget data poll cadence** (30s default) is a guess; should be measured against actual endpoint cost before locking in.
