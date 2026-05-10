/* Research Center — evidence-first.
   V1 with depth selector (Fast / Standard / Deep / Expert), source library shell,
   competitive map shell, pattern library shell, opportunity/gap shell, and a
   "visual recipe" pointer back to Home's RecipeFlow. */

function ScreenResearch({ onJump }) {
  const [depth, setDepth] = React.useState("Standard");

  return (
    <div>
      <SectionHeader
        eyebrow="Research Center · 4 docs · ?? sources"
        title="Evidence before we build."
        sub="Adjustable depth: Fast / Standard / Deep / Expert. Promote findings to a site, component, or media task."
        right={[
          <div key="dp" className="seg" title="Depth">
            {["Fast","Standard","Deep","Expert"].map(d => (
              <button key={d} className={depth === d ? "on" : ""} onClick={() => setDepth(d)}>{d}</button>
            ))}
          </div>,
          <Btn key="nb" icon="search" kind="primary">New brief</Btn>,
          <Btn key="ex" kind="ghost" icon="download">Export</Btn>,
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <Card>
          <div className="between mb-3"><Eyebrow>Opportunity / gap analysis</Eyebrow><Btn kind="ghost" icon="filter">Filter</Btn></div>
          <div className="col gap-3">
            {["Opportunity 1 of 3 — local-SEO seasonal landing pages","Opportunity 2 of 3 — storm-prep aisle component","Opportunity 3 of 3 — reusable reunion countdown"].map((t,i) => (
              <div key={i} className="panel-flat" style={{ padding: 12 }}>
                <Eyebrow>{t.split(" — ")[0]}</Eyebrow>
                <div className="fz-13 mt-2">{t.split(" — ")[1]}</div>
                <div className="row gap-2 mt-2">
                  <Btn icon="zap">Dig deeper</Btn>
                  <Btn icon="arrowUpRight" kind="primary" onClick={() => onJump?.("sites")}>Promote findings</Btn>
                </div>
              </div>
            ))}
          </div>
          <Hint style={{ marginTop: 12 }}>Source: <span className="mono">docs/research/famtastic-studio-execution/03-gap-and-opportunity-map.md</span>. UI is read-only.</Hint>
        </Card>

        <div className="col gap-3">
          <Card>
            <div className="between mb-3"><Eyebrow>Source library</Eyebrow><Btn kind="ghost" icon="plus">Add</Btn></div>
            <div className="muted fz-12">Curated source URLs and PDFs Shay uses for new briefs. Not wired yet.</div>
          </Card>
          <Card>
            <div className="between mb-3"><Eyebrow>Competitive map</Eyebrow><Tag>placeholder</Tag></div>
            <div className="muted fz-12">Reads from <span className="mono">01-competitive-map.md</span> in a later pass.</div>
          </Card>
          <Card>
            <div className="between mb-3"><Eyebrow>Pattern library</Eyebrow><Btn kind="ghost" icon="plus" /></div>
            <div className="muted fz-12">Reads from <span className="mono">02-pattern-library.md</span> in a later pass.</div>
          </Card>
        </div>
      </div>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3"><Eyebrow>Visual recipe — Research → Build</Eyebrow><Btn kind="ghost" icon="arrowRight" onClick={() => onJump?.("home")}>See on Home</Btn></div>
        <div className="muted fz-12">The cross-section flow visualization lives on Home. Click "Open" inside any node to jump to that section. The recipe spec is in <span className="mono">FAMTASTIC-STUDIO-WORKSPACE-RECIPES.md</span>.</div>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3"><Eyebrow>Recent briefs</Eyebrow><Btn kind="ghost" icon="arrowRight">All briefs</Btn></div>
        <div className="col gap-2">
          {["00-intelligence-run-kickoff","01-competitive-map","02-pattern-library","03-gap-and-opportunity-map","04-agent-skill-map","05-proof-and-checklist-system","06-training-and-readback-system","07-v1-adaptations","08-v2-backlog","09-execution-plan-impact"].map(b => (
            <div key={b} className="between">
              <div className="row gap-2">
                <I name="doc" size={12} style={{ color: "var(--ink-3)" }} />
                <span className="fz-12 mono">{b}</span>
              </div>
              <Tag>md</Tag>
            </div>
          ))}
        </div>
        <Hint style={{ marginTop: 10 }}>Listed from disk path conventions. Click-through to brief detail comes in a later pass.</Hint>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenResearch });
