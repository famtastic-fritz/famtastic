/* recipes.js — five named cross-section workflow recipes.

   Source of truth:
     docs/research/famtastic-studio-execution/FAMTASTIC-STUDIO-WORKSPACE-RECIPES.md

   Each recipe defines its nodes (steps) for the visual workflow renderer
   in `recipe-flow.jsx`. Each node has:
     id      — short identifier (kebab-case, unique inside the recipe)
     label   — display label
     section — target rail nav id (one of NAV ids in shell.jsx)
     status  — V1 default 'idle'; the existing `research-to-proof` recipe
               keeps its done/done/active/idle/idle/idle mix from the
               original first-pass render
     summary — one-line honest description of what the node represents

   Loaded by studio.html before screens. Orchestrator: add
     <script type="text/babel" src="/studio/src/lib/recipes.js"></script>
   in studio.html between primitives and screens (alongside site-context.js). */

window.STUDIO_RECIPES = {
  /* ---------------------------------------------------------------- */
  /* Recipe 1 — New Site                                              */
  /* Owner: Sites (entry) → Site Builder (active build) → Mission     */
  /* Control (run state).                                             */
  /* ---------------------------------------------------------------- */
  "new-site": {
    id: "new-site",
    title: "New Site",
    caption: "Brief → Research → Plan → Build → Preview → Inspect → Proof → Learning.",
    owner_section: "sites",
    nodes: [
      { id: "brief",    label: "Brief",    section: "sites",     status: "idle",
        summary: "Description, audience, deploy target." },
      { id: "research", label: "Research", section: "research",  status: "idle",
        summary: "Depth: Fast / Standard / Deep / Expert." },
      { id: "plan",     label: "Plan",     section: "builder",   status: "idle",
        summary: "Page/section/slot scaffold; Shay proposes; user approves." },
      { id: "build",    label: "Build",    section: "builder",   status: "idle",
        summary: "Surgical writes per section/slot." },
      { id: "preview",  label: "Preview",  section: "builder",   status: "idle",
        summary: "Local or staging preview URL." },
      { id: "inspect",  label: "Inspect",  section: "builder",   status: "idle",
        summary: "Capture findings, refinement asks." },
      { id: "proof",    label: "Proof",    section: "mission",   status: "idle",
        summary: "Proof packet attached to the run." },
      { id: "learning", label: "Learning", section: "thinktank", status: "idle",
        summary: "Promotable learning candidates." },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Recipe 2 — Media-to-Component                                    */
  /* Owner: Component Studio (origin) → Media Studio → Media Library  */
  /* → Component Studio (assignment).                                 */
  /* ---------------------------------------------------------------- */
  "media-to-component": {
    id: "media-to-component",
    title: "Media to Component",
    caption: "Slot needs asset → Studio request → Generate → Shay review → Save → Assign → Proof.",
    owner_section: "components",
    nodes: [
      { id: "slot-needs",    label: "Slot needs asset", section: "components", status: "idle",
        summary: "Component slot has media: required, no asset assigned." },
      { id: "studio-request",label: "Studio request",   section: "media",      status: "idle",
        summary: "Prompt composed in Media Studio; Shay enhances if asked." },
      { id: "generate",      label: "Generate",         section: "media",      status: "idle",
        summary: "Provider/ratio/N variations." },
      { id: "shay-review",   label: "Shay review",      section: "shay",       status: "idle",
        summary: "Shay scores; user approves/rejects per variant." },
      { id: "save-library",  label: "Save to library",  section: "library",    status: "idle",
        summary: "Registry entry with provenance, cost, approval." },
      { id: "assign-slot",   label: "Assign to slot",   section: "components", status: "idle",
        summary: "Library entry placement.usage += {site, page, slot, component}." },
      { id: "proof",         label: "Proof",            section: "mission",    status: "idle",
        summary: "Build trace cites {component, slot, asset_id, version}." },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Recipe 3 — Component-to-Site                                     */
  /* Owner: Site Builder (origin) → Component Studio (search/build)   */
  /* → Site Builder (insertion) → Mission Control (run).              */
  /* The search node branches (match → select / no match → build);    */
  /* V1 renders as a linear chain with the branch noted in summary.   */
  /* ---------------------------------------------------------------- */
  "component-to-site": {
    id: "component-to-site",
    title: "Component to Site",
    caption: "Slot needs component → Search library → Select-or-build → Insert (surgical) → Inspect → Proof.",
    owner_section: "builder",
    nodes: [
      { id: "slot-needs",    label: "Slot needs component", section: "builder",    status: "idle",
        summary: "Site page slot needs a component; Shay proposes search-before-create." },
      { id: "search",        label: "Search library",       section: "components", status: "idle",
        summary: "Match by kind, slots, variants. Branches: match → select; no match → build." },
      { id: "select-build",  label: "Select or build",      section: "components", status: "idle",
        summary: "Pick from library, or scaffold a new component (props/slots/variants)." },
      { id: "test-states",   label: "Test states",          section: "components", status: "idle",
        summary: "Verify variant states before insertion (only on build branch)." },
      { id: "insert",        label: "Insert (surgical)",    section: "builder",    status: "idle",
        summary: "Surgical write at {site_dir}/{page}/sections/{section_id}." },
      { id: "inspect",       label: "Inspect",              section: "builder",    status: "idle",
        summary: "Preview shows component in slot; pulse ~1s." },
      { id: "proof",         label: "Proof",                section: "mission",    status: "idle",
        summary: "Build trace cites {site, page, slot, component, version}." },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Recipe — Research → Media → Component → Site Slot → Proof →      */
  /* Learning (the original first-pass recipe; kept verbatim so the   */
  /* RecipeFlow default still renders 6 nodes with done/active mix).  */
  /* ---------------------------------------------------------------- */
  "research-to-proof": {
    id: "research-to-proof",
    title: "Research → Media → Component → Site Slot → Proof → Learning",
    caption: "First-pass visual recipe. Static; clicking a node selects it and shows its summary.",
    owner_section: "research",
    nodes: [
      { id: "research",  label: "Research",  section: "research",   status: "done",
        summary: "Brief: 'Coastal hardware niches 2026'. 3 opportunities identified." },
      { id: "media",     label: "Media",     section: "media",      status: "done",
        summary: "Generated 6 variants of 'amber dusk lawn, low sun'. 4 approved." },
      { id: "component", label: "Component", section: "components", status: "active",
        summary: "Selecting 'fam-hero-layered v2.1' — 4 slots, 1 needs media." },
      { id: "slot",      label: "Site Slot", section: "builder",    status: "idle",
        summary: "Insertion target: auntie-gale / home / hero." },
      { id: "proof",     label: "Proof",     section: "mission",    status: "idle",
        summary: "Run ledger + proof packet (Mission Control)." },
      { id: "learning",  label: "Learning",  section: "thinktank",  status: "idle",
        summary: "Promotable learning candidates → Think-Tank → memory." },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Recipe 4 — Research-to-Build                                     */
  /* Owner: Research Center (origin) → Sites/Component/Media          */
  /* (downstream tasks).                                              */
  /* ---------------------------------------------------------------- */
  "research-to-build": {
    id: "research-to-build",
    title: "Research to Build",
    caption: "Brief → Opportunity/gap → Recipe decision → Task created → Execution recipe → Proof.",
    owner_section: "research",
    nodes: [
      { id: "brief",         label: "Research brief",     section: "research",  status: "idle",
        summary: "Brief detail in Research Center." },
      { id: "opportunity",   label: "Opportunity / gap",  section: "research",  status: "idle",
        summary: "Finding identified; ready to promote." },
      { id: "recipe-pick",   label: "Recipe decision",    section: "research",  status: "idle",
        summary: "Sites? Component? Media? — chosen by user." },
      { id: "task",          label: "Task created",       section: "thinktank", status: "idle",
        summary: "Task with from_brief link; otherwise it's orphan work." },
      { id: "execution",     label: "Execution recipe",   section: "mission",   status: "idle",
        summary: "Recipe 1 / 2 / 3 runs to completion under its own proof discipline." },
      { id: "proof",         label: "Proof",              section: "mission",   status: "idle",
        summary: "Task references back to brief via from_brief." },
    ],
  },

  /* ---------------------------------------------------------------- */
  /* Recipe 5 — Shay routing                                          */
  /* Owner: Shay (origin) → any section.                              */
  /* ---------------------------------------------------------------- */
  "shay-routing": {
    id: "shay-routing",
    title: "Shay Routing",
    caption: "Ask → Classify → Explain decision → Confirm/redirect → Hand off → Track → Readback.",
    owner_section: "shay",
    nodes: [
      { id: "ask",       label: "Ask",        section: "shay",    status: "idle",
        summary: "Fritz asks Shay something that's work, not just a chat answer." },
      { id: "classify",  label: "Classify",   section: "shay",    status: "idle",
        summary: "Classifier maps to one of 12 sections + intent. Unknown → asks for clarification." },
      { id: "explain",   label: "Explain",    section: "shay",    status: "idle",
        summary: "Shay says where she's routing and why." },
      { id: "confirm",   label: "Confirm",    section: "shay",    status: "idle",
        summary: "User accepts the route or picks a different section." },
      { id: "handoff",   label: "Hand off",   section: "shay",    status: "idle",
        summary: "Open target section with context preloaded; URL change + activeContext." },
      { id: "track",     label: "Track",      section: "mission", status: "idle",
        summary: "Shay listens for the downstream action's outcome." },
      { id: "readback",  label: "Readback",   section: "shay",    status: "idle",
        summary: "Shay summarizes outcome; cites source artifact id (run/brief/library)." },
    ],
  },
};
