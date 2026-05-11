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
  // Phase 2 Lane E2 — fetch intelligence runs on mount to drive live node statuses.
  const [runs, setRuns] = React.useState(null); // null = loading; [] = loaded (empty)
  const [workflowState, setWorkflowState] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    const tag = window.SiteContext && typeof window.SiteContext.getLastActiveTag === 'function'
      ? window.SiteContext.getLastActiveTag()
      : null;
    const url = tag
      ? `/api/intelligence/runs?tag=${encodeURIComponent(tag)}`
      : '/api/intelligence/runs';
    fetch(url)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!cancelled) setRuns(Array.isArray(data && data.runs) ? data.runs : []);
      })
      .catch(() => {
        if (!cancelled) setRuns([]); // fail-soft: fall back to static statuses
      });
    window.WorkflowAPI?.getState?.(tag).then((state) => {
      if (!cancelled) setWorkflowState(state || null);
    });
    return () => { cancelled = true; };
  }, []); // on mount only; re-triggers on recipe switch via RecipeSelector key prop

  // Apply live binding when runs are loaded and the helper is available.
  const boundRecipe = window.STUDIO_RECIPES_BIND
    ? window.STUDIO_RECIPES_BIND(recipe, runs || [], workflowState)
    : recipe;

  // Derive binding label for the header tag.
  const bindingLabel = runs === null
    ? 'loading runs…'
    : workflowState
      ? `local state + ${runs.length} run${runs.length !== 1 ? 's' : ''}`
      : runs.length > 0
        ? `bound to ${runs.length} run${runs.length !== 1 ? 's' : ''}`
        : 'no runs · static';

  const [activeId, setActiveId] = React.useState(
    (recipe.nodes.find(n => n.status === "active") || recipe.nodes[0]).id
  );
  const active = boundRecipe.nodes.find(n => n.id === activeId);
  return (
    <div>
      <div className="between mb-3">
        <Eyebrow>{recipe.title}</Eyebrow>
        <div className="row" style={{ gap: 6 }}>
          <Chip tone={runs && runs.length > 0 ? "good" : "muted"}>{bindingLabel}</Chip>
          <Chip tone="aurora">recipe · v1</Chip>
        </div>
      </div>
      <div className="recipe">
        {boundRecipe.nodes.map((n, i) => (
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
            {i < boundRecipe.nodes.length - 1 ? <span className="recipe-arrow">→</span> : null}
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

          {/* Inputs / Outputs / Next action / Proof — two-column grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginTop: 14 }}>

            {/* Left column — Inputs + Outputs */}
            <div className="col" style={{ gap: 10 }}>
              {Array.isArray(active.inputs) && active.inputs.length > 0 ? (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Inputs</div>
                  <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                    {active.inputs.map((inp, i) => <Tag key={i} style={{ fontSize: 10 }}>{inp}</Tag>)}
                  </div>
                </div>
              ) : null}
              {Array.isArray(active.outputs) && active.outputs.length > 0 ? (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Outputs</div>
                  <div className="row" style={{ gap: 4, flexWrap: "wrap" }}>
                    {active.outputs.map((out, i) => <Tag key={i} style={{ fontSize: 10 }}>{out}</Tag>)}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right column — Next action + Proof */}
            <div className="col" style={{ gap: 10 }}>
              {active.next_action ? (
                <Card style={{ padding: "8px 10px" }}>
                  <Eyebrow style={{ marginBottom: 4 }}>Next action</Eyebrow>
                  <div className="row" style={{ gap: 8, alignItems: "center", marginTop: 4 }}>
                    <span className="fz-12" style={{ color: "var(--ink-2)", flex: 1 }}>{active.next_action.label}</span>
                    <Btn kind="ghost" style={{ fontSize: 10, padding: "2px 8px" }}
                      onClick={() => onJump?.(active.next_action.target)}>Open</Btn>
                  </div>
                </Card>
              ) : null}
              <Card style={{ padding: "8px 10px" }}>
                <Eyebrow style={{ marginBottom: 4 }}>Owner / artifacts</Eyebrow>
                <div className="fz-11 dim">owner: {recipe.owner_section || '—'}</div>
                <div className="row" style={{ gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  {Array.isArray(workflowState?.recipe_artifacts?.[recipe.id]) && workflowState.recipe_artifacts[recipe.id].length > 0
                    ? workflowState.recipe_artifacts[recipe.id].slice(0, 5).map((item, i) => <Tag key={i} style={{ fontSize: 10 }}>{item}</Tag>)
                    : <span className="fz-11 dim">no local artifacts yet</span>}
                </div>
              </Card>
              {Array.isArray(active.proof) && active.proof.length > 0 ? (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 4 }}>Proof</div>
                  <div className="col" style={{ gap: 3 }}>
                    {active.proof.map((p, i) => (
                      <div key={i} className="fz-11 dim" style={{ lineHeight: 1.4 }}>· {p}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
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
