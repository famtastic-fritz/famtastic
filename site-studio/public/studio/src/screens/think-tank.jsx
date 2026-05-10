/* Think-Tank / Brainstorm — Capture · Cluster · Promote.
   V1 board with three columns and Promote-to-X chips. */

function ScreenThinkTank() {
  const [tab, setTab] = React.useState("Board");
  const cols = [
    { name: "Capture", chip: "", items: [
      { t: "Auntie Gale could host a 'Sunday market' digest mailer", chip: "" },
      { t: "Hi-Tide Harry: storm-prep aisle landing during hurricane watches", chip: "warn" },
      { t: "Reusable 'reunion-countdown' component across class-reunion sites", chip: "good" },
    ]},
    { name: "Cluster", chip: "", items: [
      { t: "Local-SEO seasonal pages (3 ideas)", chip: "ember" },
      { t: "Reunion-as-a-template product line", chip: "aurora" },
    ]},
    { name: "Promote", chip: "", items: [
      { t: "Promoted: 'home services local SEO 2026' → Research", chip: "good" },
    ]},
  ];

  return (
    <div>
      <SectionHeader
        eyebrow="Think-Tank · Brainstorm"
        title="Where ideas live before they're work."
        sub="Capture is frictionless. Shay clusters. Promote sends ideas to Research, Sites, Component Studio, or Media Studio."
        right={[
          <Tabs key="tabs" items={["Board","Stream","Mind-map"]} value={tab} onChange={setTab} />,
          <Btn key="ci" icon="plus" kind="primary">Capture idea</Btn>,
        ]}
      />

      <Card style={{ marginBottom: 14 }}>
        <div className="row gap-2">
          <input className="input" placeholder="What's on your mind? Start typing — Shay clusters and routes." />
          <Btn icon="bolt">Quick add</Btn>
          <Btn icon="link">Link source</Btn>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {cols.map(col => (
          <Card key={col.name}>
            <div className="between mb-3"><Eyebrow>{col.name}</Eyebrow><Tag>{col.items.length}</Tag></div>
            <div className="col gap-2">
              {col.items.map((it, i) => (
                <div key={i} className="panel-flat" style={{ padding: 10 }}>
                  <div className="between" style={{ alignItems: "flex-start" }}>
                    <div className="fz-12" style={{ color: "var(--ink-2)", lineHeight: 1.45 }}>{it.t}</div>
                    {it.chip ? <Chip tone={it.chip}>·</Chip> : null}
                  </div>
                  <div className="row gap-2 mt-2">
                    <Btn kind="ghost" icon="arrowUpRight" title="Promote">Promote</Btn>
                    <span className="dim fz-11">→ Research · Site · Component · Media</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3"><Eyebrow>Promote idea</Eyebrow><Chip tone="aurora">recipe · 4</Chip></div>
        <div className="muted fz-12">From any captured idea, route to the right downstream section. Wired in a later pass; V1 is read-only board with disabled promote actions.</div>
      </Card>

      <Hint style={{ marginTop: 14 }}>
        Live reads will pull from <span className="mono">captures/inbox/*.capture.json</span> and <span className="mono">captures/review/*.proposal.json</span>. Promote actions will create artifacts in Research / Sites / Components / Media. Nothing is wired in V1.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenThinkTank });
