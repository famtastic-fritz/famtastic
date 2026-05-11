/* current-context.js — per-section helpers that build a stable
   `currentContext` object consumed by ContextPanel in shell.jsx.

   Loaded by studio.html before screens. Orchestrator: add
     <script type="text/babel" src="/studio/src/lib/current-context.js"></script>
   in studio.html between primitives and screens.

   Contract:
     forSection_<name>(...) → {
       section,             // rail id (matches NAV ids)
       activeId,            // optional — site tag, brief id, capture id, etc.
       hints: [{ kind, label, target }],   // chips for "Route this to…"
       explain,             // string — Shay's screen summary, honest mode
       nextAction,          // { title, subtitle, buttons: [{label,kind?,icon?}] } | null
       capabilityTruth: [{ label, status, detail }],  // status: verified|partial|pending
     }

   Helpers stay honest — when something isn't wired, the explain string and
   nextAction make that explicit. Do not invent metrics. */

/* forDensity — filter a currentContext object to match the selected density tier.
   Short:       explain only (hide nextAction, capabilityTruth, keep hints for chips)
   Operator:    explain + nextAction + first-3 capabilityTruth rows (Phase 0 default)
   Deep:        full object — all fields unmodified
   Next-action: nextAction only (clear explain, capabilityTruth, hints)              */
function forDensity(ctx, density) {
  if (!ctx) return ctx;
  switch (density) {
    case 'Short':
      return { ...ctx, nextAction: null, capabilityTruth: [], hints: ctx.hints };
    case 'Deep':
      return ctx; // full
    case 'Next-action':
      return { ...ctx, explain: '', capabilityTruth: [], hints: [] };
    case 'Operator':
    default:
      // Phase 0 default — explain + nextAction + capabilityTruth (compact, 3 rows max)
      return { ...ctx, capabilityTruth: (ctx.capabilityTruth || []).slice(0, 3) };
  }
}

window.CurrentContext = {
  forDensity,

  forSection_home(activeSite) {
    return {
      section: "home",
      activeId: activeSite || null,
      hints: [
        { kind: "route", label: "Sites",            target: "sites" },
        { kind: "route", label: "Research Center",  target: "research" },
        { kind: "route", label: "Think-Tank",       target: "thinktank" },
        { kind: "route", label: "Mission Control",  target: "mission" },
      ],
      explain: activeSite
        ? `Platform Home with ${activeSite} as the active site. The recipe flow up top is the cross-section visual map. Cards below are honest placeholders — "spend" and "queue" telemetry aren't wired yet.`
        : `Platform Home. The recipe flow up top is the cross-section visual map. Pick a section from the rail or click a recipe stage to drill in. Most "what's running" telemetry is honest-placeholder until live runs land.`,
      nextAction: {
        title: "Pick a recipe to drill into",
        subtitle: "RecipeFlow is interactive — click a stage to jump to its section.",
        buttons: [
          { label: "Open Recipes", kind: "primary", icon: "spark" },
          { label: "Browse Sites",                   icon: "sites"  },
        ],
      },
      capabilityTruth: [
        { label: "RecipeFlow",       status: "verified", detail: "5 recipes from WORKSPACE-RECIPES.md" },
        { label: "What's-running",   status: "pending",  detail: "no live run feed yet" },
        { label: "Recommended next", status: "pending",  detail: "static copy until run history exists" },
      ],
    };
  },

  forSection_sites(activeTag) {
    return {
      section: "sites",
      activeId: activeTag || null,
      hints: [
        { kind: "route", label: "Site Builder",   target: "builder" },
        { kind: "route", label: "Site Settings",  target: "siteset" },
        { kind: "route", label: "Mission Control", target: "mission" },
      ],
      explain: activeTag
        ? `Looking at the ${activeTag} card. Continue routes to Site Builder; Settings opens this site's overrides view.`
        : `Sites dashboard. Pick a card to continue, or use New Site to stage a safe local draft under sites/_drafts before opening Builder.`,
      nextAction: activeTag
        ? {
            title: "Resume in Builder",
            subtitle: "Loads the chat shell for the active tag.",
            buttons: [{ label: "Resume", kind: "primary", icon: "play" }],
          }
        : null,
      capabilityTruth: [
        { label: "Sites list",          status: "verified", detail: "/api/intelligence/sites" },
        { label: "New-site wizard",     status: "verified", detail: "stages local drafts in sites/_drafts" },
        { label: "Per-site freshness",  status: "verified", detail: "updated_at served from filesystem mtime" },
      ],
    };
  },

  forSection_siteset(activeTag) {
    return {
      section: "siteset",
      activeId: activeTag || null,
      hints: [
        { kind: "route", label: "Sites",         target: "sites" },
        { kind: "route", label: "Site Builder",  target: "builder" },
        { kind: "route", label: "Settings",      target: "settings" },
      ],
      explain: activeTag
        ? `Per-site overrides for ${activeTag}. Read-only V2: every field shows the platform default with a "default" badge — when an overrides file lands, badges flip to "override" per row.`
        : `Site Settings shell. No site is selected yet — pick one from Sites to see its scoped overrides. Platform defaults are visible regardless.`,
      nextAction: null,
      capabilityTruth: [
        { label: "Two-scope view",      status: "verified", detail: "Platform defaults vs This site" },
        { label: "Per-site overrides",  status: "pending",  detail: "site-settings.json schema not yet defined" },
        { label: "Override count chip", status: "pending",  detail: "needs override file to count diffs" },
      ],
    };
  },

  forSection_thinktank(captureCount) {
    const n = Number.isFinite(captureCount) ? captureCount : 0;
    return {
      section: "thinktank",
      activeId: null,
      hints: [
        { kind: "route", label: "Research Center",  target: "research" },
        { kind: "route", label: "Sites",            target: "sites" },
        { kind: "route", label: "Component Studio", target: "components" },
        { kind: "route", label: "Media Studio",     target: "media" },
      ],
      explain: n > 0
        ? `Capture · Cluster · Promote. ${n} capture${n === 1 ? "" : "s"} on the board. Promote writes a local promotion record and a Studio task.`
        : `Capture · Cluster · Promote. The board shows seed examples only when captures/inbox is empty.`,
      nextAction: {
        title: "Capture an idea",
        subtitle: "Live capture endpoint not wired — opens the local capture form.",
        buttons: [{ label: "Capture idea", kind: "primary", icon: "plus" }],
      },
      capabilityTruth: [
        { label: "Three-column board",  status: "verified", detail: "Capture / Cluster / Promote layout" },
        { label: "Live captures read",  status: "verified", detail: "captures/inbox read by client" },
        { label: "Promote-to-X",        status: "verified", detail: "writes promotion json + Studio task" },
      ],
    };
  },

  forSection_research(briefCount, selectedBriefId) {
    const n = Number.isFinite(briefCount) ? briefCount : 0;
    return {
      section: "research",
      activeId: selectedBriefId || null,
      hints: [
        { kind: "route", label: "Think-Tank",        target: "thinktank" },
        { kind: "route", label: "Sites",             target: "sites" },
        { kind: "route", label: "Component Studio",  target: "components" },
      ],
      explain: selectedBriefId
        ? `Reading brief ${selectedBriefId}. Depth selector switches reading mode (Fast / Standard / Deep / Expert) — V1 changes UI density, doesn't yet call the brain.`
        : (n > 0
            ? `Research Center · ${n} brief${n === 1 ? "" : "s"} on file. Promote findings creates local Studio tasks while depth stays local-only.`
            : `Research Center shell. Briefs read from docs/research/famtastic-studio-execution/. Promote-findings creates local Studio tasks.`),
      nextAction: {
        title: "Pick a depth and open a brief",
        subtitle: "Depth changes UI density only — Deep / Expert do not yet call the brain.",
        buttons: [{ label: "Open brief", kind: "primary", icon: "search" }],
      },
      capabilityTruth: [
        { label: "Brief inventory",   status: "partial",  detail: "/api/research/briefs returns titles only" },
        { label: "Depth selector",    status: "verified", detail: "UI density only in V1 — honest" },
        { label: "Promote findings",  status: "verified", detail: "promotion writes local Studio tasks" },
      ],
    };
  },

  forSection_library(assetCount, selectedAssetId) {
    const n = Number.isFinite(assetCount) ? assetCount : 0;
    return {
      section: "library",
      activeId: selectedAssetId || null,
      hints: [
        { kind: "route", label: "Media Studio",     target: "media" },
        { kind: "route", label: "Component Studio", target: "components" },
        { kind: "route", label: "Sites",            target: "sites" },
      ],
      explain: selectedAssetId
        ? `Selected asset ${selectedAssetId}. Approve / Send-to-component actions stay labeled until the write side of the registry is wired.`
        : (n > 0
            ? `Media Library · ${n} asset${n === 1 ? "" : "s"} loaded from /api/media for the active site. Status and assignment are local-first writes.`
            : `Media Library shell. Read-side reads /api/media when a site is selected; local status and assignment writes are available when an asset exists.`),
      nextAction: null,
      capabilityTruth: [
        { label: "Asset registry read",   status: "verified", detail: "/api/media live" },
        { label: "Approve / status write",status: "verified", detail: "writes local registry approval state" },
        { label: "Slot assignment",       status: "verified", detail: "records local used_by contracts" },
      ],
    };
  },

  forSection_settings(activeGroup) {
    const g = activeGroup || "models";
    const groupLabels = {
      models: "Models & providers", cost: "Cost & approvals",
      media: "Media defaults", components: "Component defaults",
      sites: "Site defaults", deploy: "Deployment", theme: "Theme & workspace",
    };
    const label = groupLabels[g] || g;
    return {
      section: "settings",
      activeId: g,
      hints: [
        { kind: "route", label: "Site Settings", target: "siteset" },
        { kind: "route", label: "Sites",         target: "sites"   },
        { kind: "route", label: "Home",          target: "home"    },
      ],
      explain: `Settings · ${label}. V2 is read-only — every field shows the current platform default with an honest "not wired" pill where saves aren't yet implemented.`,
      nextAction: null,
      capabilityTruth: [
        { label: "Read display",     status: "verified", detail: "all 7 groups render current defaults" },
        { label: "Save mutations",   status: "pending",  detail: "no PATCH endpoint for studio-config.json" },
        { label: "Per-site override", status: "partial", detail: "scope toggle exists in Site Settings only" },
      ],
    };
  },
};
