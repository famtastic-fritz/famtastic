/* Media Studio — generation workspace (Lane B).
   Three-pane: prompt · variations grid · inspector. V1 is layout + honest
   action contracts. The variations grid stays placeholder — no fake generation.
   Generate / Approve / Reject / Save / Send-to-library / Assign-to-slot are all
   visible but disabled-or-pill-labeled until the provider round-trip lands. */

function ScreenMediaStudio() {
  const [provider, setProvider] = React.useState("Firefly");
  const [ratio, setRatio] = React.useState("16:10");
  const [variations, setVariations] = React.useState("6");
  const [component, setComponent] = React.useState("fam-hero-layered");
  const [slot, setSlot] = React.useState("hero-image");
  const grid = Array.from({ length: 6 }, (_, i) => ({ seed: 200 + i, label: `var-${i+1}` }));

  const showContract = async () => {
    try {
      if (!window.MediaAPI || typeof window.MediaAPI.getContract !== "function") {
        alert("MediaAPI client not loaded.");
        return;
      }
      const c = await window.MediaAPI.getContract();
      if (!c) {
        alert("Action contract unavailable — server did not respond. The /api/media/contract route is provided by site-studio/server/media-routes.js.");
        return;
      }
      alert(JSON.stringify(c, null, 2));
    } catch (err) {
      alert("Could not fetch contract: " + (err && err.message ? err.message : String(err)));
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 340px", gap: 14, height: "100%" }}>
      {/* Prompt pane */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3">
          <Eyebrow>Prompt</Eyebrow>
          <Btn kind="ghost" icon="doc" onClick={showContract} title="View /api/media/contract">Contract</Btn>
        </div>

        {/* Recipe 2 hint card — visible workflow on Home */}
        <div className="panel-flat" style={{ padding: 8, marginBottom: 10 }}>
          <Eyebrow>Recipe 2 · media-to-component</Eyebrow>
          <div className="fz-11 muted mt-2">
            Slot needs asset → Studio request → Generate → Shay review → Save → Assign → Proof.
            See the visual recipe on Home.
          </div>
        </div>

        <textarea className="input" rows={6} style={{ marginTop: 8, resize: "vertical" }}
          placeholder="amber dusk lawn, low sun, soft grain, golden ratio crop, mood:'coming out of darkness'…" />
        <Btn kind="ghost" icon="spark" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} disabled={true} title="Shay enhancement not wired">Enhance with Shay</Btn>
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
        <Field label="Variations" sub="local control · cost on round-trip"><Seg items={["2","4","6","8"]} value={variations} onChange={setVariations} /></Field>

        <div className="between mt-3 fz-12">
          <span>Cost estimate</span>
          <span className="dim mono">est. cost · not wired (provider round-trip required)</span>
        </div>

        <Btn icon="zap" kind="primary" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} disabled={true} title="Generation not wired — provider adapters exist; round-trip pending">Generate {variations}</Btn>
        <div className="row gap-2 mt-3" style={{ justifyContent: "center" }}>
          <Tag tone="ember">not wired · provider adapters exist; round-trip pending</Tag>
        </div>
        <Hint style={{ marginTop: 10 }}>Adapters exist (<span className="mono">lib/openai-image-adapter.js</span>, <span className="mono">lib/adapters/</span>). Generate is not yet wired in V1.</Hint>
      </Card>

      {/* Variations grid */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3">
          <Eyebrow>Variations · {provider} · {ratio} · placeholder</Eyebrow>
          <div className="row gap-2">
            <Btn kind="ghost" icon="diff" disabled={true} title="not wired">Compare</Btn>
            <Btn kind="ghost" icon="filter" disabled={true} title="not wired">Filter</Btn>
            <Btn icon="refresh" disabled={true} title="re-roll requires generation round-trip">Re-roll</Btn>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {grid.map(g => (
            <div key={g.seed} className="panel-flat" style={{ padding: 6 }}>
              <MediaTile seed={g.seed} ratio={ratio === "16:10" ? "16 / 10" : ratio === "1:1" ? "1 / 1" : "16 / 9"} label={g.label} />
              <div className="row gap-2 mt-2">
                <button className="btn btn-ghost btn-icon" title="requires approved generation round-trip — see gaps" disabled><I name="check" size={12} /></button>
                <button className="btn btn-ghost btn-icon" title="requires approved generation round-trip — see gaps" disabled><I name="x" size={12} /></button>
                <button className="btn btn-ghost btn-icon" title="requires approved generation round-trip — see gaps" disabled><I name="bookmark" size={12} /></button>
                <Tag style={{ marginLeft: "auto" }}>placeholder · v1 honest</Tag>
              </div>
            </div>
          ))}
        </div>
        <div className="row gap-2 mt-3">
          <Btn icon="check" kind="primary" disabled={true} title="requires approved generation round-trip — see gaps">Approve selected</Btn>
          <Btn disabled={true} title="requires approved generation round-trip — see gaps">Save all to library</Btn>
          <Btn kind="ghost" icon="layers" style={{ marginLeft: "auto" }} disabled={true} title="requires approved generation round-trip — see gaps">Send to Media Library</Btn>
        </div>
        <Hint style={{ marginTop: 10 }}>
          These actions become real when the generate round-trip lands. The Send-to-library write path goes through <span className="mono">lib/media-registry.js</span> (read contract via <span className="mono">MediaAPI.getContract()</span>).
        </Hint>
      </Card>

      {/* Inspector */}
      <Card style={{ overflow: "auto" }}>
        <Eyebrow>Pick of the litter</Eyebrow>
        <MediaTile seed={205} ratio="16 / 10" label="var-6" style={{ marginTop: 8 }} />
        <div className="row gap-2 mt-3">
          <Btn icon="check" kind="primary" disabled={true} title="requires approved generation round-trip — see gaps">Approve v2</Btn>
          <Btn disabled={true} title="requires approved generation round-trip — see gaps">Save all</Btn>
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
          <Field label="Component"><Seg items={["fam-hero-layered","product-grid","feature-strip"]} value={component} onChange={setComponent} /></Field>
          <Field label="Slot"><Seg items={["hero-image","badge","cta"]} value={slot} onChange={setSlot} /></Field>
          <Btn icon="arrowUpRight" kind="primary" style={{ marginTop: 8 }} disabled={true} title="contract ready · component-routes wiring later">Assign to component slot</Btn>
          <div className="row gap-2 mt-2">
            <Tag tone="ember">contract ready · component-routes wiring later</Tag>
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenMediaStudio });
