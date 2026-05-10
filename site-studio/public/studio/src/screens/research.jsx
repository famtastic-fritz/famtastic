/* Research Center — evidence-first.
   V1 with depth selector (Fast / Standard / Deep / Expert), source library shell,
   competitive map shell, pattern library shell, opportunity/gap shell, and a
   "visual recipe" pointer back to Home's RecipeFlow.

   Lane D — live brief reads from /api/research/briefs + /api/research/brief/:id.
   Honest disabled-with-label for actions still pending backend wiring. */

const RESEARCH_DEPTH_HINTS = {
  Fast: "1–2 sources, ~30s, surface-level",
  Standard: "5–10 sources, ~3min, balanced",
  Deep: "15–25 sources, ~10min, evidence-rich",
  Expert: "30+ sources, ~30min, gap-mapped",
};

function ScreenResearch({ onJump }) {
  const [depth, setDepth] = React.useState("Standard");
  const [briefs, setBriefs] = React.useState([]);
  const [briefsError, setBriefsError] = React.useState(null);
  const [briefsLoading, setBriefsLoading] = React.useState(true);
  const [selectedId, setSelectedId] = React.useState(null);
  const [detail, setDetail] = React.useState(null);
  const [detailLoading, setDetailLoading] = React.useState(false);

  // Lane E — currentContext publish
  React.useEffect(() => {
    window.__studioPublishContext?.(window.CurrentContext?.forSection_research?.(briefs.length, selectedId) || null);
    return () => window.__studioPublishContext?.(null);
  }, [briefs.length, selectedId]);

  React.useEffect(() => {
    let alive = true;
    if (!window.ResearchAPI) {
      setBriefsLoading(false);
      setBriefsError("research_api_unavailable");
      return () => { alive = false; };
    }
    window.ResearchAPI.listBriefs().then(d => {
      if (!alive) return;
      setBriefs(d.briefs || []);
      setBriefsError(d.error || null);
      setBriefsLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const openBrief = React.useCallback((id) => {
    setSelectedId(id);
    setDetail(null);
    if (!window.ResearchAPI) return;
    setDetailLoading(true);
    window.ResearchAPI.getBrief(id).then(d => {
      setDetail(d);
      setDetailLoading(false);
    });
  }, []);

  // Find ids matching the section cards (defensive — falls back to the literal
  // filename if the ids on disk shift).
  const findId = (needle) => {
    const hit = briefs.find(b => b.id === needle);
    return hit ? hit.id : needle;
  };
  const idCompetitive  = findId("01-competitive-map");
  const idPatterns     = findId("02-pattern-library");
  const idOpportunity  = findId("03-gap-and-opportunity-map");

  return (
    <div>
      <SectionHeader
        eyebrow={`Research Center · ${briefs.length || "—"} briefs`}
        title="Evidence before we build."
        sub="Adjustable depth: Fast / Standard / Deep / Expert. Promote findings to a site, component, or media task."
        right={[
          <div key="dp" className="seg" title="Depth">
            {["Fast","Standard","Deep","Expert"].map(d => (
              <button key={d} className={depth === d ? "on" : ""} onClick={() => setDepth(d)}>{d}</button>
            ))}
          </div>,
          <Btn key="nb" icon="search" kind="primary" disabled={true} title="Brain pipeline pending">New brief</Btn>,
          <Tag key="nbtag">not wired · brain pipeline pending</Tag>,
          <Btn key="ex" kind="ghost" icon="download" disabled={true} title="Export pending">Export</Btn>,
        ]}
      />

      <Hint style={{ marginBottom: 12 }}>
        Depth: <span className="mono">{depth}</span> — {RESEARCH_DEPTH_HINTS[depth]}.
      </Hint>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <Card>
          <div className="between mb-3"><Eyebrow>Opportunity / gap analysis</Eyebrow><Btn kind="ghost" icon="filter">Filter</Btn></div>
          <div className="col gap-3">
            {["Opportunity 1 of 3 — local-SEO seasonal landing pages","Opportunity 2 of 3 — storm-prep aisle component","Opportunity 3 of 3 — reusable reunion countdown"].map((t,i) => (
              <div key={i} className="panel-flat" style={{ padding: 12 }}>
                <Eyebrow>{t.split(" — ")[0]}</Eyebrow>
                <div className="fz-13 mt-2">{t.split(" — ")[1]}</div>
                <div className="row gap-2 mt-2">
                  <Btn icon="zap" disabled={true} title="Brain pipeline pending">Dig deeper</Btn>
                  <Btn icon="arrowUpRight" kind="primary" disabled={true} title="Promotion route pending">Promote findings</Btn>
                  <Tag>not wired</Tag>
                </div>
              </div>
            ))}
          </div>
          <Hint style={{ marginTop: 12 }}>
            Source: <span className="mono">docs/research/famtastic-studio-execution/03-gap-and-opportunity-map.md</span>.{" "}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); openBrief(idOpportunity); }}
              style={{ color: "var(--ember)" }}
            >Open MD</a>.
          </Hint>
        </Card>

        <div className="col gap-3">
          <Card>
            <div className="between mb-3"><Eyebrow>Source library</Eyebrow><Btn kind="ghost" icon="plus" disabled={true} title="Source library write pending">Add</Btn></div>
            <div className="muted fz-12">Curated source URLs and PDFs Shay uses for new briefs. Reads from disk in a later pass.</div>
            <div className="row gap-2 mt-2">
              <Btn kind="ghost" icon="doc" onClick={() => openBrief(idCompetitive)}>Open MD</Btn>
              <span className="dim fz-11 mono">{idCompetitive}.md</span>
            </div>
          </Card>
          <Card>
            <div className="between mb-3"><Eyebrow>Competitive map</Eyebrow><Tag>placeholder</Tag></div>
            <div className="muted fz-12">Reads from <span className="mono">{idCompetitive}.md</span>.</div>
            <div className="row gap-2 mt-2">
              <Btn kind="ghost" icon="doc" onClick={() => openBrief(idCompetitive)}>Open MD</Btn>
            </div>
          </Card>
          <Card>
            <div className="between mb-3"><Eyebrow>Pattern library</Eyebrow><Tag>placeholder</Tag></div>
            <div className="muted fz-12">Reads from <span className="mono">{idPatterns}.md</span>.</div>
            <div className="row gap-2 mt-2">
              <Btn kind="ghost" icon="doc" onClick={() => openBrief(idPatterns)}>Open MD</Btn>
            </div>
          </Card>
        </div>
      </div>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3"><Eyebrow>Visual recipe — Research → Build</Eyebrow><Btn kind="ghost" icon="arrowRight" onClick={() => onJump?.("home")}>See on Home</Btn></div>
        {/* Lane F — RecipeSelector mount */}
        <RecipeSelector default="research-to-build" onJump={onJump} />
        <div className="muted fz-12 mt-3">The cross-section flow visualization lives on Home. Click "Open" inside any node to jump to that section. The recipe spec is in <span className="mono">FAMTASTIC-STUDIO-WORKSPACE-RECIPES.md</span>.</div>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3">
          <Eyebrow>Recent briefs {briefsLoading ? "· loading…" : `· ${briefs.length}`}</Eyebrow>
          <Btn kind="ghost" icon="arrowRight" disabled={true} title="All-briefs index pending">All briefs</Btn>
        </div>
        {briefsError ? (
          <Hint>Couldn't load briefs ({briefsError}). The router may not be mounted yet.</Hint>
        ) : null}
        {!briefsLoading && briefs.length === 0 && !briefsError ? (
          <Hint>No briefs found in <span className="mono">docs/research/famtastic-studio-execution/</span>.</Hint>
        ) : null}
        <div className="col gap-2">
          {briefs.map(b => (
            <div
              key={b.id}
              className="between"
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                cursor: "pointer",
                background: selectedId === b.id ? "oklch(0.78 0.14 65 / 0.10)" : "transparent",
              }}
              onClick={() => openBrief(b.id)}
            >
              <div className="row gap-2" style={{ alignItems: "center" }}>
                <I name="doc" size={12} style={{ color: "var(--ink-3)" }} />
                <span className="fz-12 mono">{b.id}</span>
                <span className="fz-12" style={{ color: "var(--ink-2)" }}>· {b.title}</span>
              </div>
              <Tag>md</Tag>
            </div>
          ))}
        </div>
        <Hint style={{ marginTop: 10 }}>Click a brief to load its title, summary, and first 500 chars below.</Hint>
      </Card>

      {selectedId ? (
        <Card style={{ marginTop: 14 }}>
          <div className="between mb-3">
            <Eyebrow>Brief detail · <span className="mono">{selectedId}.md</span></Eyebrow>
            <Btn kind="ghost" icon="x" onClick={() => { setSelectedId(null); setDetail(null); }}>Close</Btn>
          </div>
          {detailLoading ? (
            <Hint>Loading…</Hint>
          ) : detail && detail.error ? (
            <Hint>Couldn't load detail ({detail.error}).</Hint>
          ) : detail ? (
            <div className="col gap-3">
              <div className="h-display" style={{ fontSize: 18 }}>{detail.title}</div>
              {detail.summary ? (
                <div className="muted fz-13" style={{ lineHeight: 1.55 }}>{detail.summary}</div>
              ) : (
                <Hint>No summary paragraph parsed.</Hint>
              )}
              {detail.body_first_500 ? (
                <pre
                  className="mono fz-11"
                  style={{
                    whiteSpace: "pre-wrap",
                    background: "oklch(1 0 0 / 0.04)",
                    border: "1px solid oklch(1 0 0 / 0.06)",
                    borderRadius: 6,
                    padding: 10,
                    color: "var(--ink-2)",
                    margin: 0,
                  }}
                >{detail.body_first_500}{detail.body_first_500.length >= 500 ? "…" : ""}</pre>
              ) : null}
              <div className="dim fz-11 mono">docs/research/famtastic-studio-execution/{detail.filename}</div>
            </div>
          ) : (
            <Hint>No detail.</Hint>
          )}
        </Card>
      ) : null}
    </div>
  );
}

Object.assign(window, { ScreenResearch });
