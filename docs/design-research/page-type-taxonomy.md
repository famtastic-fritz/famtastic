# Page-Type Taxonomy

**Status:** draft for review (MVP deliverable 1 of plan_2026_05_05_workbench_per_page_design)
**Audience:** every agent that will touch the Workbench shell from this point forward
**Companion:** `docs/STUDIO-UI-FOUNDATION.md` (rules), `docs/mockups/` (visual reference)

This document is the canonical map from *every existing surface in the Studio* to *exactly one of six page types*. Before any new screen, panel, or workspace ships, the implementor reads this doc, picks the page type, and inherits the layout pattern. No more inventing layouts at build time.

---

## 1. The six page types

### 1.1 Library / Collection

**Definition.** A page that shows a heterogeneous or homogeneous *collection* of objects so the operator can find one, compare two, or take stock of all. The work is *navigational* — the user is not creating value here, they are routing themselves to where value gets made.

**When to use.** The user arrived without a specific object in mind, or with a fuzzy query ("the bakery one," "the one I made yesterday"). Collections of sites, components, media assets, plans, captures, proofs, deploys.

**When NOT to use.** When there is one primary canvas the user is acting on. When the user clicks into an item, you leave Library and enter Creation Canvas, Editor-with-Chat, or Workshop — Library is the *index*, never the *page*.

**Layout DNA.** Search top-left, faceted filters in a slim left/top strip, grid+list toggle on the right of the toolbar, type-aware cards (a Site card is not a Component card is not a Media card), optional operational-widgets row above the grid (only on domain landings).

### 1.2 Creation Canvas

**Definition.** A page where the user is *actively producing the artifact* — generating an image, drafting a prompt, composing a component, editing a hero. The canvas is the work; everything else is chrome that gets out of the way.

**When to use.** Single primary artifact in production. Outputs are visual or visualizable (image, component preview, page render). The user expects to iterate, compare results, and approve.

**When NOT to use.** Form-heavy work (use Settings). Multi-pane code/preview hot-reload work (use Workshop). Rich text + chat with no preview-as-product (use Editor-with-Chat).

**Layout DNA.** Canvas dominates. Glass slide-outs on right (info/tools) and from the icon rail (secondary nav). Collapsible glass prompt input pinned to bottom or floating. Shay-Shay has a pinned home near the canvas so she sees the proof. Chrome auto-collapses on intent (mouse-to-canvas, idle, ⌘\\, F).

### 1.3 Workshop / Sandbox

**Definition.** A multi-pane harness for *testing a thing in isolation*. Code panes plus a live preview, a runner, and a state inspector. Think JSFiddle / CodePen / Storybook.

**When to use.** The artifact is code-shaped (component, template fragment) and the operator needs to poke it — change a prop, check a breakpoint, run a test, inspect state — without the cost of a full build.

**When NOT to use.** When the production environment is the right place to iterate (then it's a Creation Canvas). When there is no live preview (then it's an editor).

**Layout DNA.** Three or four resizable panes (HTML/CSS/JS or Props/Code/Preview), a top toolbar with run/reset/share, an inspector drawer for state and console. Chrome is *expected* here — the panes ARE the work.

### 1.4 Triage / Workshop (Shay-Shay)

**Definition.** Shay-Shay's *own* workspace, distinct from her contextual presence on every other page. This is where bigger asynchronous tasks land, get reasoned about, and get handed back. The operator visits to see what Shay is working on across the empire.

**When to use.** The user wants to see Shay's queue, her in-flight tasks, her drafts awaiting promotion, and the proof she's gathered. Long-running agent work surfaces here.

**When NOT to use.** Per-page conversations with Shay (those live as the right-rail orb on every other page type). Background system jobs without agent reasoning (those go to Admin → Worker Queue).

**Layout DNA.** Inbox-on-left of triage items, primary working column in the middle showing the currently-selected item with Shay's reasoning + draft + proof, a right strip showing the handoff handles ("approve & promote," "kick back," "park"). Closer to Linear-inbox than to a chat.

### 1.5 Settings / Customization

**Definition.** Form-heavy, section-based configuration. Save indicator, no live preview, no agent collaboration. Conventional.

**When to use.** Keys, deploy targets, capability manifest edit, Shay-Shay options, account & billing, capability toggles, rule editing.

**When NOT to use.** Anything with a preview or a generation step (those are creation surfaces, not settings).

**Layout DNA.** Two-column: section nav left, scrolling form right. Sticky header with save state. Section hash routing. Default chrome stays, but glass aesthetic still applies.

### 1.6 Editor with Chat

**Definition.** An editor canvas (rich text, template form, page composition) paired with a persistent chat sidebar. The chat is the *production conversation* about the artifact in front of the user.

**When to use.** Page editor, template editor, brief editor, capture promote-to-plan editor. Anywhere the user is composing meaningful text/structure with conversational AI assistance.

**When NOT to use.** Image generation (Creation Canvas — the prompt input is a glass strip, not a chat sidebar). Settings (no chat needed). Library (no editing).

**Layout DNA.** Editor canvas occupies 60–70% width, chat sidebar 30–40%, both resizable. Two distinct chat surfaces co-exist: **Studio chat** (per-page, transient, scoped to this artifact) and **Shay-Shay** (cross-cutting, ambient, can see the artifact). Their relationship is designed in `06-editor-with-chat.md` (deferred deliverable).

---

## 2. Decision tree — *which page type is this?*

Use this when designing a new surface. Answer top-down; the first **YES** wins.

1. **Is the primary user task to *find* one item out of many of the same kind?**
   → **Library / Collection.**
2. **Is the page form-heavy configuration with no preview and no AI collaboration?**
   → **Settings / Customization.**
3. **Does the user produce a single primary artifact (image, page, component preview) where the artifact IS the screen?**
   → **Creation Canvas.**
4. **Is the artifact code or code-like, and does the user need a runnable preview side-by-side with the source?**
   → **Workshop / Sandbox.**
5. **Is the artifact a text/structure document where the user composes via persistent chat conversation?**
   → **Editor with Chat.**
6. **Is this Shay-Shay's own queue / triage view of work in flight across the empire?**
   → **Triage / Workshop (Shay-Shay).**

If none match, the surface is probably a **panel inside an existing page** (per the Page Rule in STUDIO-UI-FOUNDATION.md §3 — *fewer pages, richer workspaces*). Do not invent a seventh type without a written decision entry.

---

## 3. Mapping table — every existing surface

Sources surveyed:
- `site-studio/public/index.html` (the production shell)
- `site-studio/public/workbench-foundation.html` (the new shell, partial)
- `plan_2026_05_05_ops_workspace_gui` (11 Ops sub-tabs)

| Surface | Page Type | Reasoning | Today's status |
|---|---|---|---|
| **index.html** | | | |
| Brief tab | Editor with Chat | Brief is composed via chat with assistant; canvas is the brief content | working |
| Assets tab | Library / Collection | Grid of media assets per site | working (basic) |
| Mission Control tab | Library / Collection | Overview of plans/runs/proof — collection of operational items | working |
| Ops tab | Library / Collection (with sub-routes) | Top-level Ops is a navigational landing; each sub-tab has its own page type (see below) | working |
| Deploy tab | Creation Canvas (single-action variant) | One primary action with progress proof | working |
| Site rail | Editor with Chat (host) | Wraps Brief/Assets/MC/Ops/Deploy for one site | working |
| Components rail | Library / Collection | Component grid | working (read-only) |
| Media rail | Library / Collection (lands on grid) → Creation Canvas (item) | Landing is library; clicking an item or "generate" enters canvas | partial |
| Mission Control rail | Library / Collection | Cross-site operational overview | working |
| Intelligence rail | Library / Collection | Findings list | placeholder |
| Research rail | Library / Collection | Captures + verticals list | placeholder |
| Shay rail | Triage / Workshop | Shay's own workspace surface | not built |
| Deploy rail | Library / Collection | List of deploy targets and recent deploys | partial |
| **workbench-foundation.html** | | | |
| Sites domain | Library / Collection (lands) → multiple per item | Portfolio is library; per-site routes go to canvas/editor | working (lands only) |
| Brain (Brainstorm) domain | Library / Collection (inbox variant) | Inbox of unpromoted captures | placeholder |
| Plans domain | Library / Collection | P0/P1/P2 task lanes — facets over collection | working |
| Comp (Components) domain | Library / Collection | Component grid + detail | placeholder |
| Media domain | Library / Collection → Creation Canvas | Same as Media rail in index.html | placeholder |
| Intel (Research) domain | Library / Collection | Findings + verticals | placeholder |
| Admin domain | Settings / Customization | Form-heavy configuration | placeholder |
| Bottom: Runs | Library / Collection | List of in-flight runs | working |
| Bottom: Logs | Library / Collection | Streaming log list | placeholder |
| Bottom: Trace | Library / Collection (special: stream view) | Workflow event stream | working |
| Bottom: Approvals | Triage / Workshop (lite) | Items awaiting decision — Shay-adjacent | placeholder |
| Bottom: Proof | Library / Collection | Aggregate of proofs across runs | working |
| **Ops sub-tabs** (plan_2026_05_05_ops_workspace_gui) | | | |
| Pulse | Library / Collection (dashboard variant) | Health-at-a-glance widgets | not built |
| Plans | Library / Collection | Plans list scoped to Ops | not built |
| Tasks | Library / Collection | Task list across plans | not built |
| Jobs | Library / Collection | Worker queue list | partial |
| Runs | Library / Collection | Run history | not built |
| Proofs | Library / Collection | Proof artefacts gallery | not built |
| Agents | Triage / Workshop | Agent-coordination state and assignments | not built |
| Reviews | Triage / Workshop | Items awaiting human approval | not built |
| Gaps | Library / Collection | Known gaps list | not built |
| Memory | Library / Collection | Memory entries (decision/rule/anti-pattern/gap) | not built |
| Debt | Library / Collection | Tech debt list | not built |

**Counts.** Library: 22. Creation Canvas: 1 explicit + 2 secondary (Media item, Deploy). Triage: 4 (Shay rail, Approvals panel, Agents tab, Reviews tab). Settings: 1 (Admin). Editor with Chat: 2 (Brief, Site rail wrapper). Workshop / Sandbox: 0.

---

## 4. Coverage check

### 4.1 Library / Collection
**Coverage: dense.** 22 surfaces. The platform is overwhelmingly *navigational* today, which is a symptom of "we built the indexes but not the rooms inside." Risk: every Library landing must point clearly at the page type the user enters when they pick an item. A Library that leads to nothing is the worst outcome.

### 4.2 Creation Canvas
**Coverage: thin and inconsistent.** The most important page type — *where value gets made* — has the fewest dedicated surfaces. Media generation is the cleanest example today, but it lives inside the index.html shell with no canvas-collapse rules. Component editing has no canvas at all (the Workshop pattern is unbuilt). This is the priority gap. Deliverable 2 of this MVP addresses it.

### 4.3 Workshop / Sandbox
**Coverage: zero.** No surface today implements the multi-pane runner pattern. Component Studio sandbox and Media Studio test-gen both want this and neither has it. Deferred deliverable, but the gap is real and should be queued.

### 4.4 Triage / Workshop (Shay-Shay)
**Coverage: scattered placeholders.** Four surfaces qualify (Shay rail, Approvals, Agents, Reviews) and none are built. The relationship between *Shay's workshop page* (her inbox) and *contextual Shay* (the orb on every page) is undefined. This is a gap, not a duplicate — they coexist by design.

### 4.5 Settings / Customization
**Coverage: minimal.** Admin is the only true Settings surface and it is a placeholder. There is also a small `openSettings()` modal in index.html — fine for keys, not enough for the rule editor or capability toggles that Admin promises. Rebuild needed but the layout pattern is conventional and uncontroversial.

### 4.6 Editor with Chat
**Coverage: two surfaces, neither matches the type cleanly.** Brief tab is the closest, but the chat surface there is page-scoped Studio chat, not Shay. The Site rail wrapper is more of a host than an editor. The Page editor in the Sites domain is the canonical Editor-with-Chat target — and it does not exist yet. Deferred.

### 4.7 Cross-cutting gap
The icon rail is identical across both shells (S/B/P/C/M/Intel/A as text glyphs). Per memory `rule/icons-over-text-always-in-the-rail.md` this is wrong. Resolved by the deferred per-domain icon-set briefs.

---

## 5. Open questions

- **Q1 — Is "Brief" really Editor-with-Chat or Creation Canvas?** The brief is text-shaped and uses chat, so Editor-with-Chat by the decision tree. But the brief output drives a *site build*, which feels canvas-like. **Proposal:** Brief is Editor-with-Chat (composition step); the build trigger is a Creation-Canvas-light surface (single-action with progress proof) reached from the brief.
- **Q2 — Mission Control: Library or its own type?** It's a dashboard-of-dashboards. Treating it as a Library variant ("dashboard widgets are cards") works for now. If a seventh type emerges anywhere it'll be Dashboard, and Mission Control + Pulse will both upgrade to it. Defer.
- **Q3 — Triage vs. Library for Approvals/Agents/Reviews.** They could read as filtered Library views ("items awaiting decision"). Calling them Triage is a deliberate choice: the layout has a *primary working column* per item with reasoning + draft + handoff, which Library cards don't. Document this distinction in the deferred Triage brief.
- **Q4 — Where does the Capability Manifest live?** STUDIO-UI-FOUNDATION.md §10 flags this as open. Page-type-wise it's a Library (read-mostly) with Settings affordances on each row. Treat as Library with an inline-edit pattern; do not split.
- **Q5 — Is Deploy really Creation Canvas?** It produces no visual artifact, but it has a single primary action with progress proof and a "did it ship" output. Calling it Creation Canvas (single-action variant) is a stretch; alternative is to call it a one-off panel inside the Site editor. **Proposal:** Deploy is a *panel* inside Site editor for the per-site case, and a Library when listing deploy targets in Admin. Drop "Creation Canvas (single-action variant)" — it was a placeholder.

---

## 6. How to use this doc

1. Building a new surface → run the decision tree → pick a type → read the matching `docs/design-research/page-types/0X-*.md` brief → render the matching mockup → ship.
2. Reviewing an existing surface → look it up in the mapping table → if its current implementation does not match the page-type's layout DNA, file a known-gap entry and queue a redesign.
3. Adding a row → submit a PR that updates this table; coordinate via `AGENT-COORDINATION.md` because this doc is shared scope.
