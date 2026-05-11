/* recipes.js — five named cross-section workflow recipes.

   Source of truth:
     docs/research/famtastic-studio-execution/FAMTASTIC-STUDIO-WORKSPACE-RECIPES.md

   Each recipe defines its nodes (steps) for the visual workflow renderer
   in `recipe-flow.jsx`. Each node has:
     id          — short identifier (kebab-case, unique inside the recipe)
     label       — display label
     section     — target rail nav id (one of NAV ids in shell.jsx)
     status      — V1 default 'idle'; the existing `research-to-proof` recipe
                   keeps its done/done/active/idle/idle/idle mix from the
                   original first-pass render
     summary     — one-line honest description of what the node represents
     inputs[]    — data or artifacts needed at this node (1–3 items)
     outputs[]   — data or artifacts produced at this node (1–3 items)
     next_action — { label, target } — primary action the user can take
     proof[]     — checkpoint / gate statements (1–3 items)

   Loaded by studio.html before screens. Orchestrator: add
     <script type="text/babel" src="/studio/src/lib/recipes.js"></script>
   in studio.html between primitives and screens (alongside site-context.js). */

/* bindRecipeStatuses — Phase 2 Lane E2.
   Maps intelligence-run activity onto recipe node statuses.

   HEURISTIC LIMITATION: The intelligence-runs ledger has no `section` field
   — each run carries only run_id, status, started_at, verdict, and cost_usd.
   There is no reliable 1:1 mapping between a run and a recipe section.
   This v1 binding applies a "mission" + "builder" umbrella heuristic:
   all runs are treated as activity for the "mission" and "builder" sections
   (the two sections most tightly coupled to run execution). All other section
   nodes (research, media, components, shay, thinktank, library) are not
   updated — they retain their original Phase 1 static status. This is
   intentional and honest; a richer binding requires the ledger to carry
   a section_id field, which is a Phase 3 concern. */
function bindRecipeStatuses(recipe, runs, workflowState) {
  if (!recipe || !Array.isArray(recipe.nodes)) return recipe;
  const state = workflowState && typeof workflowState === 'object' ? workflowState : null;
  const hasRuns = Array.isArray(runs) && runs.length > 0;
  const hasWorkflow = !!state;
  if (!hasRuns && !hasWorkflow) return recipe;

  // Derive activity counts for sections we can actually map from runs data.
  const sectionActivity = {};

  for (const run of (Array.isArray(runs) ? runs : [])) {
    // Treat all runs as activity for the "mission" section (runs live in
    // Mission Control; "builder" is the most common execution section).
    const sect = 'mission';
    if (!sectionActivity[sect]) {
      sectionActivity[sect] = { running: 0, complete: 0, failed: 0, latest: null };
    }
    const state = (run.state || run.status || '').toLowerCase();
    if (state === 'running' || state === 'active') {
      sectionActivity[sect].running++;
    } else if (state === 'complete' || state === 'done' || state === 'finalized') {
      sectionActivity[sect].complete++;
    } else if (state === 'failed' || state === 'error') {
      sectionActivity[sect].failed++;
    }
    // Track the most-recent run (listRuns already returns newest-first).
    if (!sectionActivity[sect].latest) sectionActivity[sect].latest = run;
  }

  // Also propagate mission activity to "builder" — most runs are build runs.
  if (sectionActivity.mission) {
    sectionActivity.builder = sectionActivity.mission;
  }

  if (state) {
    if ((state.site_drafts || []).length > 0) {
      sectionActivity.sites = { running: 1, complete: 0, failed: 0 };
      sectionActivity.research = { running: 0, complete: 1, failed: 0 };
    }
    if ((state.component_drafts || []).length > 0) {
      sectionActivity.components = { running: 1, complete: 0, failed: 0 };
    }
    if ((state.insertions || []).length > 0) {
      sectionActivity.components = { running: 0, complete: 1, failed: 0 };
      sectionActivity.builder = { running: 1, complete: 0, failed: 0 };
    }
    if ((state.media_assets || []).length > 0) {
      const usedCount = state.media_assets.filter((asset) => Array.isArray(asset.used_by) && asset.used_by.length > 0).length;
      sectionActivity.media = { running: usedCount > 0 ? 0 : 1, complete: (state.media_summary?.approved || 0) + usedCount, failed: 0 };
      sectionActivity.library = { running: 0, complete: state.media_assets.length, failed: 0 };
    }
    if ((state.tasks || []).some((task) => task.target_section === 'research')) {
      sectionActivity.research = { running: 1, complete: 0, failed: 0 };
    }
    if ((state.tasks || []).some((task) => task.source_type === 'shay')) {
      sectionActivity.shay = { running: 1, complete: 0, failed: 0 };
    }
    if ((state.learning_candidates || []).length > 0) {
      sectionActivity.thinktank = { running: 0, complete: 1, failed: 0 };
    }
  }

  const newNodes = recipe.nodes.map(n => {
    const act = sectionActivity[n.section];
    if (!act) return n; // section not in activity map → keep original status
    let status = n.status;
    if (act.running > 0) status = 'active';
    else if (act.failed > 0) status = 'fail';
    else if (act.complete > 0) status = 'done';
    return { ...n, status };
  });

  return { ...recipe, nodes: newNodes };
}

// Expose on window so recipe-flow.jsx (loaded via Babel/script tag) can call it.
window.STUDIO_RECIPES_BIND = bindRecipeStatuses;

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
        summary: "Description, audience, deploy target.",
        inputs:  ["description prompt", "optional brand DNA"],
        outputs: ["brief.json", "site slug"],
        next_action: { label: "Start research", target: "research" },
        proof:   ["brief.json written before research can begin"],
      },
      { id: "research", label: "Research", section: "research",  status: "idle",
        summary: "Depth: Fast / Standard / Deep / Expert.",
        inputs:  ["brief.summary", "depth selector"],
        outputs: ["intelligence-brief.json", "opportunities[]"],
        next_action: { label: "Open Research Center", target: "research" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "plan",     label: "Plan",     section: "builder",   status: "idle",
        summary: "Page/section/slot scaffold; Shay proposes; user approves.",
        inputs:  ["brief.summary", "research.opportunities[]"],
        outputs: ["plan.json", "plan.approved boolean"],
        next_action: { label: "Approve plan", target: "builder" },
        proof:   ["plan.approved=true gates the build node"],
      },
      { id: "build",    label: "Build",    section: "builder",   status: "idle",
        summary: "Surgical writes per section/slot.",
        inputs:  ["plan.json", "component library"],
        outputs: ["site files", "build-trace entries[]"],
        next_action: { label: "Open Site Builder", target: "builder" },
        proof:   ["each section write becomes a pass entry on the ledger"],
      },
      { id: "preview",  label: "Preview",  section: "builder",   status: "idle",
        summary: "Local or staging preview URL.",
        inputs:  ["built site files"],
        outputs: ["preview URL", "screenshot"],
        next_action: { label: "Open Site Builder", target: "builder" },
        proof:   ["screenshot captured and attached to proof packet"],
      },
      { id: "inspect",  label: "Inspect",  section: "builder",   status: "idle",
        summary: "Capture findings, refinement asks.",
        inputs:  ["preview screenshot", "user feedback"],
        outputs: ["refinement tasks[]", "inspection notes"],
        next_action: { label: "Open Site Builder", target: "builder" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "proof",    label: "Proof",    section: "mission",   status: "idle",
        summary: "Proof packet attached to the run.",
        inputs:  ["build-trace entries[]", "run ledger"],
        outputs: ["proof packet", "run finalized boolean"],
        next_action: { label: "Open Mission Control", target: "mission" },
        proof:   ["run.status=finalized before learning candidates can be promoted"],
      },
      { id: "learning", label: "Learning", section: "thinktank", status: "idle",
        summary: "Promotable learning candidates.",
        inputs:  ["proof packet", "run annotations"],
        outputs: ["learning candidates[]", "memory entries"],
        next_action: { label: "Open Think-Tank", target: "thinktank" },
        proof:   ["no proof contract yet — Phase 2"],
      },
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
        summary: "Component slot has media: required, no asset assigned.",
        inputs:  ["component name", "slot id"],
        outputs: ["media request context"],
        next_action: { label: "Open Media Studio", target: "media" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "studio-request",label: "Studio request",   section: "media",      status: "idle",
        summary: "Prompt composed in Media Studio; Shay enhances if asked.",
        inputs:  ["slot context", "prompt seed"],
        outputs: ["enhanced prompt", "provider settings"],
        next_action: { label: "Open Media Studio", target: "media" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "generate",      label: "Generate",         section: "media",      status: "idle",
        summary: "Provider/ratio/N variations.",
        inputs:  ["enhanced prompt", "provider + ratio + N"],
        outputs: ["generated asset variants[]"],
        next_action: { label: "Open Media Studio", target: "media" },
        proof:   ["generation disabled until provider round-trip wired — Phase 2"],
      },
      { id: "shay-review",   label: "Shay review",      section: "shay",       status: "idle",
        summary: "Shay scores; user approves/rejects per variant.",
        inputs:  ["generated variants[]"],
        outputs: ["approval.status per variant", "approved assets[]"],
        next_action: { label: "Open Shay", target: "shay" },
        proof:   ["shay-review is a hard gate — approval.status must be set before save"],
      },
      { id: "save-library",  label: "Save to library",  section: "library",    status: "idle",
        summary: "Registry entry with provenance, cost, approval.",
        inputs:  ["approved assets[]", "provenance metadata"],
        outputs: ["library entry with asset_id", "registry.json updated"],
        next_action: { label: "Open Media Library", target: "library" },
        proof:   ["asset_id present in registry before assign-to-slot can proceed"],
      },
      { id: "assign-slot",   label: "Assign to slot",   section: "components", status: "idle",
        summary: "Library entry placement.usage += {site, page, slot, component}.",
        inputs:  ["asset_id", "component slot id"],
        outputs: ["component.slot.assigned_asset_id", "build-trace entry"],
        next_action: { label: "Open Component Studio", target: "components" },
        proof:   ["component slot assigned_asset_id is non-null after assign"],
      },
      { id: "proof",         label: "Proof",            section: "mission",    status: "idle",
        summary: "Build trace cites {component, slot, asset_id, version}.",
        inputs:  ["build-trace entry", "run ledger"],
        outputs: ["proof packet"],
        next_action: { label: "Open Mission Control", target: "mission" },
        proof:   ["build trace entry cites component + slot + asset_id + version"],
      },
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
        summary: "Site page slot needs a component; Shay proposes search-before-create.",
        inputs:  ["site tag", "page id", "slot id"],
        outputs: ["component search query"],
        next_action: { label: "Open Component Studio", target: "components" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "search",        label: "Search library",       section: "components", status: "idle",
        summary: "Match by kind, slots, variants. Branches: match → select; no match → build.",
        inputs:  ["component search query"],
        outputs: ["match results[]", "branch: match | no-match"],
        next_action: { label: "Open Component Studio", target: "components" },
        proof:   ["search must precede build (reuse policy: search-first by default)"],
      },
      { id: "select-build",  label: "Select or build",      section: "components", status: "idle",
        summary: "Pick from library, or scaffold a new component (props/slots/variants).",
        inputs:  ["match results[] or build branch"],
        outputs: ["selected or new component id", "component props/slots/variants"],
        next_action: { label: "Open Component Studio", target: "components" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "test-states",   label: "Test states",          section: "components", status: "idle",
        summary: "Verify variant states before insertion (only on build branch).",
        inputs:  ["component id", "variant definitions"],
        outputs: ["test state results"],
        next_action: { label: "Open Component Studio", target: "components" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "insert",        label: "Insert (surgical)",    section: "builder",    status: "idle",
        summary: "Surgical write at {site_dir}/{page}/sections/{section_id}.",
        inputs:  ["component id", "site + page + slot target"],
        outputs: ["site file updated", "build-trace entry"],
        next_action: { label: "Open Site Builder", target: "builder" },
        proof:   ["insert verified by re-rendering page and confirming slot non-empty"],
      },
      { id: "inspect",       label: "Inspect",              section: "builder",    status: "idle",
        summary: "Preview shows component in slot; pulse ~1s.",
        inputs:  ["updated site file"],
        outputs: ["inspection notes", "refinement asks"],
        next_action: { label: "Open Site Builder", target: "builder" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "proof",         label: "Proof",                section: "mission",    status: "idle",
        summary: "Build trace cites {site, page, slot, component, version}.",
        inputs:  ["build-trace entry", "run ledger"],
        outputs: ["proof packet"],
        next_action: { label: "Open Mission Control", target: "mission" },
        proof:   ["build trace entry cites site + page + slot + component + version"],
      },
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
        summary: "Brief: 'Coastal hardware niches 2026'. 3 opportunities identified.",
        inputs:  ["brief.summary"],
        outputs: ["intelligence-brief.json", "opportunities[]"],
        next_action: { label: "Open Research Center", target: "research" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "media",     label: "Media",     section: "media",      status: "done",
        summary: "Generated 6 variants of 'amber dusk lawn, low sun'. 4 approved.",
        inputs:  ["prompt seed", "provider settings"],
        outputs: ["approved assets[]", "registry entries"],
        next_action: { label: "Open Media Studio", target: "media" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "component", label: "Component", section: "components", status: "active",
        summary: "Selecting 'fam-hero-layered v2.1' — 4 slots, 1 needs media.",
        inputs:  ["component search query"],
        outputs: ["component id", "slot assignment"],
        next_action: { label: "Open Component Studio", target: "components" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "slot",      label: "Site Slot", section: "builder",    status: "idle",
        summary: "Insertion target: auntie-gale / home / hero.",
        inputs:  ["component id", "slot target"],
        outputs: ["site file updated", "build-trace entry"],
        next_action: { label: "Open Site Builder", target: "builder" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "proof",     label: "Proof",     section: "mission",    status: "idle",
        summary: "Run ledger + proof packet (Mission Control).",
        inputs:  ["build-trace entries[]", "run ledger"],
        outputs: ["proof packet"],
        next_action: { label: "Open Mission Control", target: "mission" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "learning",  label: "Learning",  section: "thinktank",  status: "idle",
        summary: "Promotable learning candidates → Think-Tank → memory.",
        inputs:  ["proof packet", "run annotations"],
        outputs: ["learning candidates[]"],
        next_action: { label: "Open Think-Tank", target: "thinktank" },
        proof:   ["no proof contract yet — Phase 2"],
      },
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
        summary: "Brief detail in Research Center.",
        inputs:  ["brief id"],
        outputs: ["brief detail", "opportunities[]"],
        next_action: { label: "Open Research Center", target: "research" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "opportunity",   label: "Opportunity / gap",  section: "research",  status: "idle",
        summary: "Finding identified; ready to promote.",
        inputs:  ["brief.opportunities[]"],
        outputs: ["chosen opportunity or gap"],
        next_action: { label: "Open Research Center", target: "research" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "recipe-pick",   label: "Recipe decision",    section: "research",  status: "idle",
        summary: "Sites? Component? Media? — chosen by user.",
        inputs:  ["chosen opportunity"],
        outputs: ["recipe target: sites | components | media"],
        next_action: { label: "Open Research Center", target: "research" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "task",          label: "Task created",       section: "thinktank", status: "idle",
        summary: "Task with from_brief link; otherwise it's orphan work.",
        inputs:  ["recipe target", "brief id"],
        outputs: ["task object with from_brief", "promotion record"],
        next_action: { label: "Open Think-Tank", target: "thinktank" },
        proof:   ["task must include from_brief — orphan tasks are invalid"],
      },
      { id: "execution",     label: "Execution recipe",   section: "mission",   status: "idle",
        summary: "Recipe 1 / 2 / 3 runs to completion under its own proof discipline.",
        inputs:  ["task object", "recipe target"],
        outputs: ["run id", "downstream artifacts"],
        next_action: { label: "Open Mission Control", target: "mission" },
        proof:   ["downstream recipe runs to completion under its own proof discipline"],
      },
      { id: "proof",         label: "Proof",              section: "mission",   status: "idle",
        summary: "Task references back to brief via from_brief.",
        inputs:  ["run id", "task from_brief"],
        outputs: ["proof packet citing brief"],
        next_action: { label: "Open Mission Control", target: "mission" },
        proof:   ["brief findings list shows promoted-to chip with link"],
      },
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
        summary: "Fritz asks Shay something that's work, not just a chat answer.",
        inputs:  ["user text"],
        outputs: ["ask captured"],
        next_action: { label: "Open Shay", target: "shay" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "classify",  label: "Classify",   section: "shay",    status: "idle",
        summary: "Classifier maps to one of 12 sections + intent. Unknown → asks for clarification.",
        inputs:  ["user text", "current screen context"],
        outputs: ["section target", "intent"],
        next_action: { label: "Open Shay", target: "shay" },
        proof:   ["classify must produce one of 12 sections — unknown triggers clarification ask"],
      },
      { id: "explain",   label: "Explain",    section: "shay",    status: "idle",
        summary: "Shay says where she's routing and why.",
        inputs:  ["section target", "intent"],
        outputs: ["routing explanation"],
        next_action: { label: "Open Shay", target: "shay" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "confirm",   label: "Confirm",    section: "shay",    status: "idle",
        summary: "User accepts the route or picks a different section.",
        inputs:  ["routing explanation"],
        outputs: ["confirmed section target"],
        next_action: { label: "Open Shay", target: "shay" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "handoff",   label: "Hand off",   section: "shay",    status: "idle",
        summary: "Open target section with context preloaded; URL change + activeContext.",
        inputs:  ["confirmed section target", "context payload"],
        outputs: ["run id", "target section open"],
        next_action: { label: "Open Shay", target: "shay" },
        proof:   ["handoff verifiable by URL change + activeContext payload echo"],
      },
      { id: "track",     label: "Track",      section: "mission", status: "idle",
        summary: "Shay listens for the downstream action's outcome.",
        inputs:  ["run id"],
        outputs: ["outcome status"],
        next_action: { label: "Open Mission Control", target: "mission" },
        proof:   ["no proof contract yet — Phase 2"],
      },
      { id: "readback",  label: "Readback",   section: "shay",    status: "idle",
        summary: "Shay summarizes outcome; cites source artifact id (run/brief/library).",
        inputs:  ["outcome status", "source artifact id"],
        outputs: ["readback message in Shay chat"],
        next_action: { label: "Open Shay", target: "shay" },
        proof:   ["readback carries source artifact id (run id, brief id, or library id)"],
      },
    ],
  },
};
