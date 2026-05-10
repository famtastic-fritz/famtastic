/* Component Studio — library, builder entry, chat, preview/test/enhance,
   props/slots/variants, media needs, insertion, surgical-replacement concept. */

function ScreenComponentStudio() {
  const [tab, setTab] = React.useState("Preview");
  const [selected, setSelected] = React.useState("fam-hero-layered");

  const lib = [
    { name: "fam-hero-layered",       v: "v2.1", chip: "good", uses: 6, slots: 4, kind: "Hero" },
    { name: "section-intro · two-col", v: "v1.0", chip: "good", uses: 5, slots: 1, kind: "Section" },
    { name: "product-grid · breakout", v: "v1.4", chip: "good", uses: 3, slots: 6, kind: "Grid" },
    { name: "service-card · breakout", v: "v1.2", chip: "good", uses: 4, slots: 2, kind: "Card" },
    { name: "feature-strip · seasonal", v: "v0.9", chip: "warn", uses: 1, slots: 1, kind: "Strip" },
    { name: "starburst-badge",          v: "v1.0", chip: "good", uses: 2, slots: 0, kind: "Badge" },
    { name: "countdown-timer",          v: "v0.4", chip: "warn", uses: 1, slots: 0, kind: "Widget" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 14, height: "100%" }}>
      {/* Library pane */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3"><Eyebrow>Library · {lib.length}</Eyebrow><Tag tone="ember">search-first</Tag></div>
        <div className="row gap-2 mb-3"><input className="input" placeholder="Search before you create…" /></div>
        <Btn icon="plus" kind="primary" style={{ width: "100%", justifyContent: "center" }}>New component</Btn>
        <div className="divider" />
        <div className="col gap-2">
          {lib.map(c => (
            <div key={c.name}
                 className="panel-flat"
                 style={{ padding: 10, cursor: "pointer", borderColor: selected === c.name ? "var(--ember)" : undefined }}
                 onClick={() => setSelected(c.name)}>
              <div className="between">
                <span className="fz-12 mono">{c.name}</span>
                <Chip tone={c.chip}>{c.v}</Chip>
              </div>
              <div className="dim fz-11 mt-1">{c.kind} · {c.slots} slots · {c.uses} uses</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Workspace */}
      <div className="col" style={{ gap: 14, minWidth: 0 }}>
        <Card>
          <div className="between">
            <div>
              <Eyebrow>{selected}</Eyebrow>
              <div className="h-section mt-1">v0.4 (working) → v2.1 (locked)</div>
            </div>
            <div className="row gap-2">
              <Btn kind="ghost" icon="copy">Duplicate</Btn>
              <Btn icon="arrowUpRight">Insert into site / slot</Btn>
              <Btn icon="check" kind="primary">Promote v0.4 → locked</Btn>
            </div>
          </div>
          <div className="mt-3"><Tabs items={["Preview","Props / slots","Variants","Test states","History"]} value={tab} onChange={setTab} /></div>
        </Card>

        <Card style={{ flex: 1, minHeight: 240 }}>
          {tab === "Preview" ? (
            <div>
              <Eyebrow>Preview</Eyebrow>
              <div className="muted fz-12 mt-2">Live preview not wired yet. The component renders inside its own iframe in a later pass.</div>
              <MediaTile seed={42} ratio="16 / 9" label="preview placeholder" style={{ marginTop: 10 }} />
            </div>
          ) : tab === "Props / slots" ? (
            <div>
              <Eyebrow>Props · slots</Eyebrow>
              <div className="col gap-2 mt-3">
                <Field label="title (string)"><input className="input" placeholder="The Best Lawn Care" /></Field>
                <Field label="kicker (string)"><input className="input" placeholder="Atlanta · Home services" /></Field>
                <Field label="hero-image (slot)"><Slot filled>asset · pl-3</Slot></Field>
                <Field label="badge (slot)"><Slot>empty</Slot></Field>
              </div>
            </div>
          ) : tab === "Variants" ? (
            <div>
              <Eyebrow>Variants</Eyebrow>
              <div className="row gap-2 mt-3" style={{ flexWrap: "wrap" }}>
                {["light","dark","peak","arch","seasonal-fall","seasonal-storm"].map(v => (
                  <Tag key={v}>{v}</Tag>
                ))}
              </div>
            </div>
          ) : tab === "Test states" ? (
            <div>
              <Eyebrow>Test states</Eyebrow>
              <div className="col gap-2 mt-3 fz-12 muted">empty · loading · loaded · error · long-text · narrow-viewport</div>
            </div>
          ) : (
            <div>
              <Eyebrow>History</Eyebrow>
              <div className="col gap-2 mt-3 fz-12 muted">v2.1 locked · 14d ago · v0.4 working · 2h ago</div>
            </div>
          )}
        </Card>

        <Card>
          <Eyebrow>Component chat (Harry)</Eyebrow>
          <div className="row gap-2 mt-3">
            <input className="input" placeholder="Ask Harry to refine, add a variant, swap a slot…" />
            <Btn icon="send" kind="primary" />
          </div>
          <Hint style={{ marginTop: 10 }}>Chat round-trip not wired in V1. Will use the same brain pipeline as Site Builder.</Hint>
        </Card>
      </div>

      {/* Inspector */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3"><Eyebrow>Inspector</Eyebrow><Btn kind="ghost" icon="more" /></div>
        <Field label="Slots">
          <div className="col gap-2 mt-2">
            <Slot filled>hero-image · pl-3</Slot>
            <Slot>badge · empty</Slot>
            <Slot>cta · empty</Slot>
            <Slot>media-strip · empty</Slot>
          </div>
        </Field>
        <div className="divider" />
        <Eyebrow>Media needs</Eyebrow>
        <div className="muted fz-12 mt-2">3 slots need media. Generate via Media Studio or pick from Media Library.</div>
        <div className="row gap-2 mt-2">
          <Btn icon="zap">Generate</Btn>
          <Btn>Library</Btn>
        </div>
        <div className="divider" />
        <Eyebrow>Insert into site / slot</Eyebrow>
        <div className="col gap-2 mt-3">
          <Field label="Site"><Seg items={["auntie-gale","mbsh-reunion","hi-tide"]} value="auntie-gale" onChange={() => {}} /></Field>
          <Field label="Page"><Seg items={["home","shop","about"]} value="home" onChange={() => {}} /></Field>
          <Field label="Slot"><Seg items={["hero","section-1","section-2"]} value="hero" onChange={() => {}} /></Field>
          <Btn icon="arrowUpRight" kind="primary" style={{ marginTop: 8 }}>Insert (surgical)</Btn>
        </div>
        <Hint style={{ marginTop: 10 }}>Surgical replacement is real (<span className="mono">lib/surgical-editor.js</span>). Wiring this UI to it is later work.</Hint>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenComponentStudio });
