/* Think-Tank / Brainstorm — Capture · Cluster · Promote.
   V1 board with three columns and Promote-to-X chips.

   Lane D — live capture reads from /api/think-tank/captures.
   When the inbox is non-empty, the Capture column shows real captures.
   When empty, the column falls back to seed examples with a labeled hint.
   Promote actions stay disabled-with-Tag pending backend wiring. */

const SEED_CAPTURES = [
  { t: "Auntie Gale could host a 'Sunday market' digest mailer", chip: "" },
  { t: "Hi-Tide Harry: storm-prep aisle landing during hurricane watches", chip: "warn" },
  { t: "Reusable 'reunion-countdown' component across class-reunion sites", chip: "good" },
];

const SEED_CLUSTERS = [
  { t: "Local-SEO seasonal pages (3 ideas)", chip: "ember" },
  { t: "Reunion-as-a-template product line", chip: "aurora" },
];

const SEED_PROMOTED = [
  { t: "Promoted: 'home services local SEO 2026' → Research", chip: "good" },
];

function ScreenThinkTank() {
  const [tab, setTab] = React.useState("Board");
  const [captures, setCaptures] = React.useState([]);
  const [capturesLoaded, setCapturesLoaded] = React.useState(false);
  const [capturesError, setCapturesError] = React.useState(null);
  const [selectedCapId, setSelectedCapId] = React.useState(null);

  // Lane E — currentContext publish
  React.useEffect(() => {
    window.__studioPublishContext?.(window.CurrentContext?.forSection_thinktank?.(captures.length) || null);
    return () => window.__studioPublishContext?.(null);
  }, [captures.length]);

  React.useEffect(() => {
    let alive = true;
    if (!window.ThinkTankAPI) {
      setCapturesLoaded(true);
      setCapturesError("think_tank_api_unavailable");
      return () => { alive = false; };
    }
    window.ThinkTankAPI.listCaptures().then(d => {
      if (!alive) return;
      setCaptures(d.captures || []);
      setCapturesError(d.error || null);
      setCapturesLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  const useLiveCaptures = capturesLoaded && captures.length > 0;
  const captureItems = useLiveCaptures
    ? captures.map(c => ({ id: c.id, t: c.title, sub: c.captured_at, source: c.source_path, chip: "" }))
    : SEED_CAPTURES;

  const cols = [
    { name: "Capture", items: captureItems, kind: "capture" },
    { name: "Cluster", items: SEED_CLUSTERS, kind: "cluster" },
    { name: "Promote", items: SEED_PROMOTED, kind: "promote" },
  ];

  const selectedCap = useLiveCaptures && selectedCapId
    ? captures.find(c => c.id === selectedCapId) || null
    : null;

  return (
    <div>
      <SectionHeader
        eyebrow={`Think-Tank · Brainstorm${useLiveCaptures ? ` · ${captures.length} live` : ""}`}
        title="Where ideas live before they're work."
        sub="Capture is frictionless. Shay clusters. Promote sends ideas to Research, Sites, Component Studio, or Media Studio."
        right={[
          <Tabs key="tabs" items={["Board","Stream","Mind-map"]} value={tab} onChange={setTab} />,
          <Btn key="ci" icon="plus" kind="primary" disabled={true} title="Capture write pending">Capture idea</Btn>,
          <Tag key="citag">not wired · captures/inbox write pending</Tag>,
        ]}
      />

      {capturesError ? (
        <Hint style={{ marginBottom: 12 }}>Couldn't load captures ({capturesError}). The router may not be mounted yet.</Hint>
      ) : null}
      {capturesLoaded && captures.length === 0 && !capturesError ? (
        <Hint style={{ marginBottom: 12 }}>
          live <span className="mono">captures/inbox/</span> is empty — showing example ideas
        </Hint>
      ) : null}

      <Card style={{ marginBottom: 14 }}>
        <div className="row gap-2">
          <input
            className="input"
            placeholder="What's on your mind? Start typing — Shay clusters and routes."
            disabled={true}
          />
          <Btn icon="bolt" disabled={true} title="Capture write pending">Quick add</Btn>
          <Btn icon="link" disabled={true} title="Source link write pending">Link source</Btn>
          <Tag>not wired · captures/inbox write pending</Tag>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {cols.map(col => (
          <Card key={col.name}>
            <div className="between mb-3">
              <Eyebrow>{col.name}</Eyebrow>
              <Tag>{col.items.length}</Tag>
            </div>

            {col.kind === "promote" ? (
              <Hint style={{ marginBottom: 8 }}>
                Promote routes (→ Research/Sites/Component/Media) require backend wiring — visible as labeled actions only.
              </Hint>
            ) : null}
            {col.kind === "cluster" ? (
              <Hint style={{ marginBottom: 8 }}>
                Shay clusters not wired — showing seed examples.
              </Hint>
            ) : null}

            <div className="col gap-2">
              {col.items.map((it, i) => {
                const isLiveCap = col.kind === "capture" && useLiveCaptures;
                const isSelected = isLiveCap && it.id && it.id === selectedCapId;
                return (
                  <div
                    key={(it.id || i) + ":" + col.name}
                    className="panel-flat"
                    style={{
                      padding: 10,
                      cursor: isLiveCap ? "pointer" : "default",
                      background: isSelected ? "oklch(0.78 0.14 65 / 0.08)" : undefined,
                    }}
                    onClick={() => {
                      if (isLiveCap) setSelectedCapId(isSelected ? null : it.id);
                    }}
                  >
                    <div className="between" style={{ alignItems: "flex-start" }}>
                      <div className="fz-12" style={{ color: "var(--ink-2)", lineHeight: 1.45 }}>{it.t}</div>
                      {it.chip ? <Chip tone={it.chip}>·</Chip> : null}
                    </div>
                    {isSelected && selectedCap ? (
                      <div className="dim fz-11 mt-2 col gap-1">
                        {selectedCap.captured_at ? <div>captured: <span className="mono">{selectedCap.captured_at}</span></div> : null}
                        <div>id: <span className="mono">{selectedCap.id}</span></div>
                        <div>source: <span className="mono">{selectedCap.source_path}</span></div>
                      </div>
                    ) : null}
                    <div className="row gap-2 mt-2">
                      <Btn kind="ghost" icon="arrowUpRight" title="Promote pending" disabled={true}>Promote</Btn>
                      <Tag>not wired</Tag>
                      <span className="dim fz-11">→ Research · Site · Component · Media</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3"><Eyebrow>Promote idea</Eyebrow><Chip tone="aurora">recipe · 4</Chip></div>
        <div className="muted fz-12">From any captured idea, route to the right downstream section. Wired in a later pass; V1 is read-only board with disabled promote actions.</div>
      </Card>

      <Hint style={{ marginTop: 14 }}>
        Live reads pull from <span className="mono">captures/inbox/*.capture.json</span>. Promote actions will create artifacts in Research / Sites / Components / Media. Promotion routes not wired in V1.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenThinkTank });
