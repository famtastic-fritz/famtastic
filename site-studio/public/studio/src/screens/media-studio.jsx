/* Media Studio — generation workspace.
   Three-pane: prompt · variations grid · inspector. V1 is layout + actions
   that are not wired to providers yet. Approve/Reject/Save are visible per tile. */

function ScreenMediaStudio() {
  const [provider, setProvider] = React.useState("Firefly");
  const [ratio, setRatio] = React.useState("16:10");
  const [variations, setVariations] = React.useState("6");
  const grid = Array.from({ length: 6 }, (_, i) => ({ seed: 200 + i, label: `var-${i+1}` }));

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 340px", gap: 14, height: "100%" }}>
      {/* Prompt pane */}
      <Card style={{ overflow: "auto" }}>
        <Eyebrow>Prompt</Eyebrow>
        <textarea className="input" rows={6} style={{ marginTop: 8, resize: "vertical" }}
          placeholder="amber dusk lawn, low sun, soft grain, golden ratio crop, mood:'coming out of darkness'…" />
        <Btn kind="ghost" icon="spark" style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>Enhance with Shay</Btn>
        <div className="divider" />
        <Eyebrow>Provider</Eyebrow>
        <div className="seg mt-3" style={{ width: "100%" }}>
          {["Firefly","Imagen","Mid-J","Local"].map(p => <button key={p} className={provider === p ? "on" : ""} onClick={() => setProvider(p)}>{p}</button>)}
        </div>
        <div className="divider" />
        <Eyebrow>Aspect ratio</Eyebrow>
        <div className="seg mt-3" style={{ width: "100%" }}>
          {["1:1","4:3","3:2","16:10","16:9","9:16"].map(r => <button key={r} className={ratio === r ? "on" : ""} onClick={() => setRatio(r)}>{r}</button>)}
        </div>
        <div className="divider" />
        <Field label="Variations" sub="est. cost not wired"><Seg items={["2","4","6","8"]} value={variations} onChange={setVariations} /></Field>
        <Btn icon="zap" kind="primary" style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>Generate {variations}</Btn>
        <Hint style={{ marginTop: 10 }}>Adapters exist (<span className="mono">lib/openai-image-adapter.js</span>, <span className="mono">lib/adapters/</span>). Generate is not yet wired in V1.</Hint>
      </Card>

      {/* Variations grid */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3">
          <Eyebrow>Variations · {provider} · {ratio} · placeholder</Eyebrow>
          <div className="row gap-2">
            <Btn kind="ghost" icon="diff">Compare</Btn>
            <Btn kind="ghost" icon="filter">Filter</Btn>
            <Btn icon="refresh">Re-roll</Btn>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {grid.map(g => (
            <div key={g.seed} className="panel-flat" style={{ padding: 6 }}>
              <MediaTile seed={g.seed} ratio={ratio === "16:10" ? "16 / 10" : ratio === "1:1" ? "1 / 1" : "16 / 9"} label={g.label} />
              <div className="row gap-2 mt-2">
                <button className="btn btn-ghost btn-icon" title="Approve"><I name="check" size={12} /></button>
                <button className="btn btn-ghost btn-icon" title="Reject"><I name="x" size={12} /></button>
                <button className="btn btn-ghost btn-icon" title="Save to library"><I name="bookmark" size={12} /></button>
                <Tag style={{ marginLeft: "auto" }}>seed {g.seed}</Tag>
              </div>
            </div>
          ))}
        </div>
        <div className="row gap-2 mt-3">
          <Btn icon="check" kind="primary">Approve selected</Btn>
          <Btn>Save all to library</Btn>
          <Btn kind="ghost" icon="layers" style={{ marginLeft: "auto" }}>Send to Media Library</Btn>
        </div>
      </Card>

      {/* Inspector */}
      <Card style={{ overflow: "auto" }}>
        <Eyebrow>Pick of the litter</Eyebrow>
        <MediaTile seed={205} ratio="16 / 10" label="var-6" style={{ marginTop: 8 }} />
        <div className="row gap-2 mt-3">
          <Btn icon="check" kind="primary">Approve v2</Btn>
          <Btn>Save all</Btn>
        </div>
        <div className="divider" />
        <Eyebrow>Metadata</Eyebrow>
        <div className="col gap-2 mt-3 fz-12">
          <div className="between"><span>Provider</span><Tag>{provider}</Tag></div>
          <div className="between"><span>Ratio</span><Tag>{ratio}</Tag></div>
          <div className="between"><span>Variations</span><Tag>{variations}</Tag></div>
          <div className="between"><span>Cost</span><span className="dim mono">not wired</span></div>
          <div className="between"><span>Approval</span><Chip>pending</Chip></div>
        </div>
        <div className="divider" />
        <Eyebrow>Assign to</Eyebrow>
        <div className="col gap-2 mt-3">
          <Field label="Component"><Seg items={["fam-hero-layered","product-grid","feature-strip"]} value="fam-hero-layered" onChange={() => {}} /></Field>
          <Field label="Slot"><Seg items={["hero-image","badge","cta"]} value="hero-image" onChange={() => {}} /></Field>
          <Btn icon="arrowUpRight" kind="primary" style={{ marginTop: 8 }}>Assign to component slot</Btn>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenMediaStudio });
