/* RecipeFlow — visual workflow renderer.
   Source of truth: docs/research/famtastic-studio-execution/FAMTASTIC-STUDIO-WORKSPACE-RECIPES.md.
   Each node has: id, label, status (idle|active|done|fail), section (target nav id),
   summary (one-line). Click to surface a detail card; this V1 is read-only/static. */

const RECIPE_RESEARCH_TO_PROOF = {
  id: "research-to-proof",
  title: "Research → Media → Component → Site Slot → Proof → Learning",
  caption: "First-pass visual recipe. Static; clicking a node selects it and shows its summary.",
  nodes: [
    { id: "research",  label: "Research",        section: "research",   status: "done",
      summary: "Brief: 'Coastal hardware niches 2026'. 3 opportunities identified." },
    { id: "media",     label: "Media",           section: "media",      status: "done",
      summary: "Generated 6 variants of 'amber dusk lawn, low sun'. 4 approved." },
    { id: "component", label: "Component",       section: "components", status: "active",
      summary: "Selecting 'fam-hero-layered v2.1' — 4 slots, 1 needs media." },
    { id: "slot",      label: "Site Slot",       section: "builder",    status: "idle",
      summary: "Insertion target: auntie-gale / home / hero." },
    { id: "proof",     label: "Proof",           section: "mission",    status: "idle",
      summary: "Run ledger + proof packet (Mission Control)." },
    { id: "learning",  label: "Learning",        section: "thinktank",  status: "idle",
      summary: "Promotable learning candidates → Think-Tank → memory." },
  ],
};

function RecipeFlow({ recipe = RECIPE_RESEARCH_TO_PROOF, onJump }) {
  const [activeId, setActiveId] = React.useState(
    (recipe.nodes.find(n => n.status === "active") || recipe.nodes[0]).id
  );
  const active = recipe.nodes.find(n => n.id === activeId);
  return (
    <div>
      <div className="between mb-3">
        <Eyebrow>{recipe.title}</Eyebrow>
        <Chip tone="aurora">recipe · v1 · static</Chip>
      </div>
      <div className="recipe">
        {recipe.nodes.map((n, i) => (
          <React.Fragment key={n.id}>
            <div
              className={`recipe-node ${n.id === activeId ? "active" : ""} ${n.status === "done" ? "done" : ""}`}
              onClick={() => setActiveId(n.id)}>
              <div className="between" style={{ marginBottom: 8 }}>
                <span className="eyebrow">{n.label}</span>
                <Dot tone={n.status === "done" ? "good" : n.status === "active" ? "ember" : n.status === "fail" ? "crit" : ""} />
              </div>
              <div className="fz-11 muted" style={{ minHeight: 28, lineHeight: 1.4 }}>
                {n.summary.slice(0, 80)}{n.summary.length > 80 ? "…" : ""}
              </div>
              <div className="row mt-3" style={{ gap: 6 }}>
                <Tag>{n.section}</Tag>
                <Btn kind="ghost" icon="arrowUpRight" onClick={(e) => { e.stopPropagation(); onJump?.(n.section); }}>Open</Btn>
              </div>
            </div>
            {i < recipe.nodes.length - 1 ? <span className="recipe-arrow">→</span> : null}
          </React.Fragment>
        ))}
      </div>
      {active ? (
        <Card style={{ marginTop: 14 }}>
          <Eyebrow>{active.label} · detail</Eyebrow>
          <div className="fz-12 mt-2" style={{ color: "var(--ink-2)" }}>{active.summary}</div>
          <div className="row gap-2 mt-3">
            <Btn icon="arrowUpRight" kind="primary" onClick={() => onJump?.(active.section)}>Open in {active.section}</Btn>
            <Btn kind="ghost" icon="doc">View artifact</Btn>
          </div>
          <div className="mt-3 dim fz-11">{recipe.caption}</div>
        </Card>
      ) : null}
    </div>
  );
}

/* RecipeSelector — wraps RecipeFlow with a 5-recipe picker.
   Reads recipe definitions from window.STUDIO_RECIPES (lib/recipes.js).
   Falls back to the bare RECIPE_RESEARCH_TO_PROOF if the registry isn't
   loaded yet so the Home card never goes empty. */
function RecipeSelector({ default: defaultId = "research-to-proof", onJump }) {
  const recipes = window.STUDIO_RECIPES || {};
  const ids = Object.keys(recipes);
  const fallback = recipes[defaultId] ? defaultId : (ids[0] || null);
  const [selectedId, setSelectedId] = React.useState(fallback);

  if (!ids.length) {
    /* Registry not loaded — render the original single recipe so the page
       still has a visible workflow card. */
    return <RecipeFlow recipe={RECIPE_RESEARCH_TO_PROOF} onJump={onJump} />;
  }

  const recipe = recipes[selectedId] || recipes[fallback];
  const titles = ids.map(i => recipes[i].title);
  return (
    <div>
      <div className="between mb-3" style={{ gap: 12, flexWrap: "wrap" }}>
        <Eyebrow>Visual workflow · {ids.length} recipes</Eyebrow>
        <Seg
          items={titles}
          value={recipe.title}
          onChange={(t) => {
            const next = ids.find(i => recipes[i].title === t);
            if (next) setSelectedId(next);
          }}
        />
      </div>
      <RecipeFlow recipe={recipe} onJump={onJump} />
    </div>
  );
}

Object.assign(window, { RecipeFlow, RecipeSelector, RECIPE_RESEARCH_TO_PROOF });
