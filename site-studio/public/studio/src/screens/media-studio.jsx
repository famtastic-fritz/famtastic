/* Media Studio — generation workspace (Lane B, Phase 1).
   Three-pane: prompt · variations grid · inspector. V1 is layout + honest
   action contracts. The variations grid stays placeholder — no fake generation.
   Generate / Approve / Reject / Save / Send-to-library / Assign-to-slot are all
   visible but disabled-or-pill-labeled until the provider round-trip lands.
   Phase 1 addition: "Save local test asset" is live and hits POST /api/media/test-asset.
   All other button clicks return honest contract objects displayed in a Card. */

function ScreenMediaStudio() {
  const [provider, setProvider] = React.useState("Firefly");
  const [ratio, setRatio] = React.useState("16:10");
  const [variations, setVariations] = React.useState("6");
  const [component, setComponent] = React.useState("fam-hero-layered");
  const [slot, setSlot] = React.useState("hero-image");
  const [lastContract, setLastContract] = React.useState(null);
  const [saveStatus, setSaveStatus] = React.useState(null); // null | 'ok' | 'err'
  const [saveMsg, setSaveMsg] = React.useState("");
  const [saveFormOpen, setSaveFormOpen] = React.useState(false);
  const [saveFormId, setSaveFormId] = React.useState("");
  const [saveFormSlot, setSaveFormSlot] = React.useState("test-slot");
  const [saveFormPrompt, setSaveFormPrompt] = React.useState("(local test)");

  const grid = Array.from({ length: 6 }, (_, i) => ({ seed: 200 + i, label: `var-${i+1}` }));

  const activeTag = () => (
    window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function"
      ? window.SiteContext.getLastActiveTag()
      : null
  );

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

  // Generate button — wires action contract; keeps disabled={true}
  const handleGenerate = () => {
    if (!window.MediaActions) return;
    const promptEl = document.querySelector(".media-studio-prompt");
    const promptVal = promptEl ? promptEl.value : "";
    const contract = window.MediaActions.generate(promptVal, provider, ratio, variations);
    setLastContract(contract);
  };

  // Per-tile review — wires action contract; keeps disabled={true}
  const handleReview = (seed, decision) => {
    if (!window.MediaActions) return;
    const contract = window.MediaActions.reviewVariant(seed, decision);
    setLastContract(contract);
  };

  // Assign — wires action contract; keeps disabled={true}
  const handleAssign = () => {
    if (!window.MediaActions) return;
    const contract = window.MediaActions.assignToComponentSlot("(no-asset)", component, slot);
    setLastContract(contract);
  };

  // Save local test asset — LIVE action (called by inline form)
  const handleSaveTestAsset = async () => {
    if (!window.MediaActions) {
      setSaveStatus("err");
      setSaveMsg("MediaActions not loaded");
      return;
    }
    const rawId = saveFormId.trim();
    if (!rawId) return;
    const id = rawId.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const tag = activeTag();
    setSaveStatus(null);
    setSaveMsg("");
    const result = await window.MediaActions.saveLocalTestAsset(tag, {
      id,
      slot: saveFormSlot.trim() || "test-slot",
      prompt: saveFormPrompt.trim() || "(local test)",
    });
    if (result && result.ok) {
      setSaveStatus("ok");
      setSaveMsg("Saved: " + id);
      window.__mediaRegistryDirty = true;
      setSaveFormOpen(false);
      setSaveFormId("");
    } else {
      setSaveStatus("err");
      setSaveMsg(
        result && result.error
          ? result.error
          : result && result.errors
            ? result.errors.join("; ")
            : "unknown error"
      );
    }
  };

  // Open save form with defaults reset
  const handleOpenSaveForm = () => {
    setSaveFormId("");
    setSaveFormSlot("test-slot");
    setSaveFormPrompt("(local test)");
    setSaveStatus(null);
    setSaveMsg("");
    setSaveFormOpen(true);
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

        <textarea className="input media-studio-prompt" rows={6} style={{ marginTop: 8, resize: "vertical" }}
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

        <Btn icon="zap" kind="primary" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} disabled={true} onClick={handleGenerate} title="Generation not wired — provider adapters exist; round-trip pending">Generate {variations}</Btn>
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
            <Btn icon="upload" onClick={handleOpenSaveForm} title="Write a local test asset to media/registry.json — no provider call">Save local test asset</Btn>
          </div>
        </div>

        {/* Inline save form — opens when button clicked */}
        {saveFormOpen && (
          <Card style={{ marginBottom: 14 }}>
            <Eyebrow>Save local test asset</Eyebrow>
            <div className="col gap-2 mt-3">
              <Field label="Asset ID (required)" sub="lowercase · letters / digits / hyphens / underscores">
                <input
                  className="input"
                  value={saveFormId}
                  onChange={(e) => setSaveFormId(e.target.value)}
                  placeholder="e.g. hero-bg-v1"
                  style={{ width: "100%" }}
                />
              </Field>
              <Field label="Slot" sub="target slot identifier">
                <input
                  className="input"
                  value={saveFormSlot}
                  onChange={(e) => setSaveFormSlot(e.target.value)}
                  placeholder="test-slot"
                  style={{ width: "100%" }}
                />
              </Field>
              <Field label="Prompt" sub="brief description or generation prompt">
                <input
                  className="input"
                  value={saveFormPrompt}
                  onChange={(e) => setSaveFormPrompt(e.target.value)}
                  placeholder="(local test)"
                  style={{ width: "100%" }}
                />
              </Field>
              <div className="row gap-2 mt-2">
                <Btn
                  icon="check"
                  kind="primary"
                  disabled={!saveFormId.trim()}
                  onClick={handleSaveTestAsset}
                  title="Save local media asset"
                >Save</Btn>
                <Btn
                  kind="ghost"
                  onClick={() => { setSaveFormOpen(false); setSaveStatus(null); setSaveMsg(""); }}
                >Cancel</Btn>
                {saveStatus === "ok" && <Chip tone="good">{saveMsg}</Chip>}
                {saveStatus === "err" && <Chip tone="crit">Error: {saveMsg}</Chip>}
              </div>
            </div>
          </Card>
        )}

        {/* Save feedback (shown after form closes on success) */}
        {!saveFormOpen && saveStatus === "ok" && (
          <div className="row gap-2 mb-3">
            <Chip tone="good">{saveMsg}</Chip>
            <span className="fz-11 muted">Registry dirty flag set — Media Library will refresh on next visit.</span>
          </div>
        )}
        {!saveFormOpen && saveStatus === "err" && (
          <div className="row gap-2 mb-3">
            <Chip tone="crit">Error: {saveMsg}</Chip>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {grid.map(g => (
            <div key={g.seed} className="panel-flat" style={{ padding: 6 }}>
              <MediaTile seed={g.seed} ratio={ratio === "16:10" ? "16 / 10" : ratio === "1:1" ? "1 / 1" : "16 / 9"} label={g.label} />
              <div className="row gap-2 mt-2">
                <button className="btn btn-ghost btn-icon" title="contract only — requires real generation output" disabled onClick={() => handleReview(g.seed, "approve")}><I name="check" size={12} /></button>
                <button className="btn btn-ghost btn-icon" title="contract only — requires real generation output" disabled onClick={() => handleReview(g.seed, "reject")}><I name="x" size={12} /></button>
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

        {/* Last action contract display */}
        {lastContract && (
          <Card style={{ marginTop: 14 }}>
            <Eyebrow>Last action contract</Eyebrow>
            <pre className="mono" style={{ fontSize: 10, marginTop: 8, whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--ink-2)" }}>{JSON.stringify(lastContract, null, 2)}</pre>
          </Card>
        )}
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
          <Btn icon="arrowUpRight" kind="primary" style={{ marginTop: 8 }} disabled={true} onClick={handleAssign} title="contract ready · component-routes wiring later">Assign to component slot</Btn>
          <div className="row gap-2 mt-2">
            <Tag tone="ember">contract ready · component-routes wiring later</Tag>
          </div>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenMediaStudio });
