# FAMtastic Studio — Workspace Recipes

**Date:** 2026-05-10
**Phase:** 3 of 5 (drift-correction realignment)
**Status:** Spec only

Five named cross-section workflow recipes. Each recipe defines: nodes (steps), inputs, outputs, owner section, proof/checkpoint, and what should be visualized in the UI when the recipe is running.

These recipes are the source of truth for the **visual flow renderer** that lives in Mission Control (per the design's `mission-control.jsx`, "Visual flow · rn-92a"). Every active run should be paintable as one of these recipes (or a composition of them).

---

## Recipe 1 — New Site

**Owner section:** Sites (entry) → Site Builder (active build) → Mission Control (run state).
**Trigger.** Fritz clicks "New site" or "From description" on Home or Sites.

### Nodes

```
[brief]
  ↓
[research]   — depth: Fast/Standard/Deep/Expert
  ↓
[plan]       — page/section/slot scaffold; Shay proposes; user approves
  ↓
[build]      — surgical writes per section/slot
  ↓
[preview]    — local or staging preview URL
  ↓
[inspect]    — capture findings, refinement asks
  ↓
[proof]      — proof packet attached to the run
  ↓
[learning]   — promotable learning candidates
```

### Inputs
- Description prompt (from Sites "From description") OR promoted research opportunity (from Research Center).
- Optional: brand DNA, target audience, deploy target.
- Cost cap (from Settings or Site Settings override).

### Outputs
- New site directory (default location: `~/famtastic-sites/<slug>/`).
- Site brief at `sites/site-<slug>/intelligence/intelligence-brief.json`.
- Run ledger at `sites/site-<slug>/intelligence/runs/<run-id>/ledger.json`.
- Proof packet at the same run dir.
- Optional learning-candidates if any pattern was discovered.

### Proof / checkpoint
- After **plan**, user approval is required (gate). Plan-approval write goes to ledger.
- After **build**, every section write becomes a `pass` entry on the ledger.
- After **preview**, a screenshot is captured and attached to the proof packet.
- After **proof**, the run can be `finalize`d. After that, learning candidates can be promoted to memory.

### What should be visualized in the UI
- The 8 nodes drawn left-to-right with progress per node.
- Active node pulses with the section accent color (ember).
- Each completed node shows a green dot and a click-through to the artifact (brief, plan, build trace, preview screenshot, proof packet).
- Cost meter alongside the chain (mirrors Mission Control's cost line).
- Failure on any node turns that node red; downstream nodes stay grey.

---

## Recipe 2 — Media-to-Component (component needs an asset)

**Owner section:** Component Studio (origin) → Media Studio (work) → Media Library (registry) → Component Studio (assignment).
**Trigger.** A component slot in Component Studio has `media: required`, no asset assigned, and the user clicks "Generate".

### Nodes

```
[component-slot needs asset]
  ↓
[media-studio request]   — prompt composed in Media Studio (Shay enhances if asked)
  ↓
[generate variations]    — provider/ratio/N variations
  ↓
[shay review]            — Shay scores; user approves/rejects per variant
  ↓
[save to library]        — registry entry created with provenance/cost/approval
  ↓
[assign to slot]          — library entry's placement.usage += {site, page, slot, component}
  ↓
[proof]                  — assignment shows up in build trace; component-studio inspector reflects filled slot
```

### Inputs
- Component name + slot id.
- Prompt seed (Shay can synthesize from slot context).
- Provider, ratio, variations count (from Media Studio defaults or Site Settings overrides).
- Cost cap remaining.

### Outputs
- Generated assets (binary + metadata) in `public/img/...` or per-site asset dir.
- Library entry per saved asset: `{ asset_id, provenance: {kind: "generated", provider, prompt, cost}, approval: {status, by, at}, placements: [{site, page, slot, component, version}] }`.
- Surgical update to the component instance to reference the asset.

### Proof / checkpoint
- **shay review** is a hard gate. Approval writes the per-asset `approval` block.
- **assign to slot** is verifiable: the component's slot now has a non-null `assigned_asset_id`.
- A build-trace entry cites `{component, slot, asset_id, version}`.

### What should be visualized in the UI
- The 7 nodes as a horizontal chain.
- Variations grid renders inline at the **generate** node (mirrors Media Studio).
- Reject/approve buttons at the **shay review** node.
- After **assign**, the component card in Component Studio shows the slot as `filled` (using the design's `Slot` primitive's `filled` modifier).

---

## Recipe 3 — Component-to-Site (site page needs a component)

**Owner section:** Site Builder (origin) → Component Studio (search/build) → Site Builder (insertion) → Mission Control (run).
**Trigger.** Site Builder needs a component for a section/slot — Shay proposes search-before-create.

### Nodes

```
[site-page slot needs component]
  ↓
[search component library]   — match by kind, slots, variants
  ↓ (match)
  → [select component]
  ↓ (no match)
  → [build component]         — Component Studio chat + scaffold
        ↓
        [define props/slots/variants]
        ↓
        [test states]
  ↓
[insert into site slot]       — surgical (lib/surgical-editor.js)
  ↓
[inspect]                     — preview shows component in slot
  ↓
[proof]                       — build trace cites {site, page, slot, component, version}
```

### Inputs
- Site tag, page id, slot id.
- Component search query (from slot context or user prompt).

### Outputs
- Either an existing component reference, or a new component file with library registry update.
- Surgical insertion at `{site_dir}/{page}/sections/{section_id}.{ext}` referencing the component.
- Build-trace entry.

### Proof / checkpoint
- **search** must precede **build** (reuse policy from Settings — "Search first" by default).
- **insert** is verified by re-rendering the page and confirming the slot is no longer empty.
- Component version is locked at insertion; later upgrades are explicit.

### What should be visualized in the UI
- A decision diamond at **search**: "match found" → green path; "no match" → ember path branches into the build sub-recipe.
- The Component Studio "Insert into site / slot" dialog mirrors the design template's CTA.
- After **insert**, Site Builder's preview pulses the inserted slot for ~1s.

---

## Recipe 4 — Research-to-Build

**Owner section:** Research Center (origin) → Sites/Component Studio/Media Studio (downstream tasks).
**Trigger.** A research finding (opportunity or gap) is promoted to a build task.

### Nodes

```
[research brief]
  ↓
[opportunity / gap identified]
  ↓
[recipe decision]            — Sites? Component? Media?
  ↓
[task created]               — site task / component spec / media prompt
  ↓
[execution recipe]           — Recipe 1 / Recipe 2 / Recipe 3 (chained)
  ↓
[proof]                      — task references back to brief via from_brief
```

### Inputs
- Brief id; chosen opportunity/gap.
- Decision: Sites | Component | Media.

### Outputs
- New task with `from_brief: <brief-id>` link.
- Eventually: a site / component / media artifact whose proof packet cites the brief.

### Proof / checkpoint
- **task created** must include `from_brief` (otherwise it's orphan work).
- The downstream recipe runs to completion under its own proof discipline.
- The brief's "Findings" list shows promoted-to chips (with link).

### What should be visualized in the UI
- The brief detail view in Research Center renders this chain on the right side, with the active downstream node highlighted.
- "Promote findings" CTA in Research Center kicks off this recipe and creates a new run in Mission Control.

---

## Recipe 5 — Shay routing

**Owner section:** Shay (origin) → any section.
**Trigger.** Fritz asks Shay something that isn't a chat answer — it's work.

### Nodes

```
[shay receives ask]
  ↓
[classify ask]               — Shay's classifier maps to section + intent
  ↓
[explain decision]           — Shay says where she's routing and why
  ↓
[user confirm or redirect]   — buttons: accept route / pick a different section
  ↓
[hand off]                   — open target section with context preloaded
  ↓
[track result]               — Shay listens for the downstream action's outcome
  ↓
[readback]                   — Shay summarizes outcome at chosen depth
```

### Inputs
- User text (Shay chat input).
- Current screen context (every section publishes a `currentContext` object with `{section, activeId?, hints[]}`).
- Routing classifier (Shay-shay-sessions + brain).

### Outputs
- A handoff with context to the target section.
- A run id (if the handoff started a run).
- A readback message in Shay chat citing what happened.

### Proof / checkpoint
- **classify** must produce one of the 12 sections. If "unknown", Shay asks for clarification rather than guessing.
- **hand off** is verifiable by URL change + activeContext payload echo.
- **readback** at end carries the source artifact id (run id, brief id, library id, etc).

### What should be visualized in the UI
- The Shay screen's "Route this thread to…" panel matches the design template (see `src/screens/shay.jsx` line ~140).
- Chip highlights the recommended section; alternatives are dimmer.
- After hand off, a small floating chip in the target section reads "Came from Shay · click to return."

---

## Composition

Real work composes these. Examples:

- **"Build me a new site for Auntie Gale"** = Recipe 1, with Recipe 3 nested inside the **build** node (each section needs a component), and Recipe 2 nested inside Recipe 3 when a component slot needs an asset.
- **"Take this research finding and make it a thing"** = Recipe 4, which dispatches into Recipe 1 / 2 / 3.
- **"Shay, the lawn-care site needs a fall promo banner"** = Recipe 5 → routes to either Recipe 2 (if it's just an asset) or Recipe 3 (if it's a section/component).

The visual flow renderer in Mission Control should compose these — when a parent recipe contains a child, the child renders as a sub-chain inside the parent's active node.

---

## Acceptance — Phase 3

- [x] Five recipes named and described.
- [x] Each recipe has nodes, inputs, outputs, owner section, proof/checkpoint, and UI visualization notes.
- [x] Recipe 1 — New Site covers brief→research→plan→build→preview→inspect→proof→learning.
- [x] Recipe 2 — Media-to-Component covers slot needs → request → generate → review → save → assign → proof.
- [x] Recipe 3 — Component-to-Site covers search→select-or-build→props/slots→insert→inspect→proof.
- [x] Recipe 4 — Research-to-Build covers finding → recipe decision → site/component/media task → proof.
- [x] Recipe 5 — Shay routing covers ask → classify → confirm → hand off → track → readback.
- [x] Composition rules stated.
- [x] Mission Control's visual-flow renderer ties back to these recipes (single source of truth).
