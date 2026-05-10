/* Component Studio — library, builder entry, chat, preview/test/enhance,
   props/slots/variants, media needs, insertion, surgical-replacement concept.
   Library pane is wired to /api/components (read-only). Search calls
   /api/components/check (debounced). Insertion stays a labeled action — the
   surgical-write route does not exist yet. */

const SEED_LIB = [
  { id: "fam-hero-layered",       name: "fam-hero-layered",       v: "v2.1", state: "green", uses: 6, kind: "Hero",    slots: new Array(4) },
  { id: "section-intro-two-col",  name: "section-intro · two-col", v: "v1.0", state: "green", uses: 5, kind: "Section", slots: new Array(1) },
  { id: "product-grid-breakout",  name: "product-grid · breakout", v: "v1.4", state: "green", uses: 3, kind: "Grid",    slots: new Array(6) },
  { id: "service-card-breakout",  name: "service-card · breakout", v: "v1.2", state: "green", uses: 4, kind: "Card",    slots: new Array(2) },
  { id: "feature-strip-seasonal", name: "feature-strip · seasonal", v: "v0.9", state: "warn",  uses: 1, kind: "Strip",   slots: new Array(1) },
  { id: "starburst-badge",        name: "starburst-badge",         v: "v1.0", state: "green", uses: 2, kind: "Badge",   slots: [] },
  { id: "countdown-timer",        name: "countdown-timer",         v: "v0.4", state: "warn",  uses: 1, kind: "Widget",  slots: [] },
];

function ScreenComponentStudio() {
  const [tab, setTab] = React.useState("Preview");
  const [lib, setLib] = React.useState([]);
  const [usingSeed, setUsingSeed] = React.useState(false);
  const [apiError, setApiError] = React.useState(null);
  const [selected, setSelected] = React.useState(null);

  const [search, setSearch] = React.useState("");
  const [checkResult, setCheckResult] = React.useState(null); // { exists, near, missing } | null
  const [newCompNote, setNewCompNote] = React.useState(false);

  // Live load on mount
  React.useEffect(() => {
    let alive = true;
    const api = window.ComponentsAPI;
    if (!api || typeof api.list !== "function") {
      if (alive) {
        setLib(SEED_LIB);
        setUsingSeed(true);
        setApiError("ComponentsAPI not loaded");
        setSelected(SEED_LIB[0].id);
      }
      return () => { alive = false; };
    }
    api.list().then(d => {
      if (!alive) return;
      const components = (d && Array.isArray(d.components)) ? d.components : [];
      if (components.length === 0) {
        setLib(SEED_LIB);
        setUsingSeed(true);
        setApiError(d && d.error ? d.error : null);
        setSelected(SEED_LIB[0].id);
      } else {
        setLib(components);
        setUsingSeed(false);
        setApiError(null);
        setSelected(components[0].id);
      }
    });
    return () => { alive = false; };
  }, []);

  // Debounced /check call as the user types
  React.useEffect(() => {
    const api = window.ComponentsAPI;
    const v = search.trim();
    if (!v || !api || typeof api.check !== "function") {
      setCheckResult(null);
      return;
    }
    const t = setTimeout(() => {
      api.check(v).then(r => setCheckResult(r));
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  // Auto-select on exact match
  React.useEffect(() => {
    if (checkResult && checkResult.exists && search.trim()) {
      const id = search.trim().toLowerCase();
      if (lib.some(c => (c.id || "").toLowerCase() === id)) {
        setSelected(id);
      }
    }
  }, [checkResult, lib, search]);

  const selectedComp = React.useMemo(() => {
    if (!selected) return null;
    return lib.find(c => c.id === selected) || null;
  }, [lib, selected]);

  // Visible list = filter by search term (substring match on id or name)
  const visibleLib = React.useMemo(() => {
    const v = search.trim().toLowerCase();
    if (!v) return lib;
    return lib.filter(c => {
      const id = (c.id || "").toLowerCase();
      const name = (c.name || "").toLowerCase();
      return id.includes(v) || name.includes(v);
    });
  }, [lib, search]);

  async function handleShowContract() {
    try {
      const api = window.ComponentsAPI;
      if (!api || typeof api.getContract !== "function") {
        alert("ComponentsAPI not loaded");
        return;
      }
      const c = await api.getContract();
      alert(c ? JSON.stringify(c, null, 2) : "Contract unavailable.");
    } catch (err) {
      alert("Failed to load contract: " + (err && err.message || err));
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 14, height: "100%" }}>
      {/* Library pane */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3">
          <Eyebrow>Library · {lib.length}</Eyebrow>
          <Tag tone="ember">search-first</Tag>
        </div>

        {usingSeed ? (
          <Hint style={{ marginBottom: 10 }}>
            live <span className="mono">/api/components</span> returned empty — showing seed list (skeleton inventory empty in this environment){apiError ? ` · ${apiError}` : ""}
          </Hint>
        ) : null}

        <div className="row gap-2 mb-2">
          <input
            className="input"
            placeholder="Search before you create…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Inline check-existing result */}
        {search.trim() && checkResult ? (
          <div className="mb-2">
            {checkResult.exists ? (
              <Chip tone="good">exists — selecting it</Chip>
            ) : checkResult.near ? (
              <span
                onClick={() => {
                  setSelected(checkResult.near);
                  setSearch(checkResult.near);
                }}
                style={{ cursor: "pointer" }}
                title="Click to select near match"
              >
                <Chip tone="warn">near match: {checkResult.near}</Chip>
              </span>
            ) : (
              <span className="dim fz-11">no match — would create new</span>
            )}
          </div>
        ) : null}

        <Btn
          icon="plus"
          kind="primary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={() => setNewCompNote(true)}
        >
          New component
        </Btn>
        <div className="row gap-2 mt-2" style={{ alignItems: "center" }}>
          <Tag>not wired · check-existing gate live</Tag>
        </div>
        {newCompNote ? (
          <Hint style={{ marginTop: 8 }}>
            New-component flow opens Component chat (not wired).
          </Hint>
        ) : null}

        <div className="divider" />
        <div className="col gap-2">
          {visibleLib.map(c => {
            const id = c.id || c.name;
            const slotCount = Array.isArray(c.slots) ? c.slots.length : 0;
            const tone = c.state === "green" ? "good" : "warn";
            const stateLabel = c.state || (c.v ? c.v : "—");
            return (
              <div
                key={id}
                className="panel-flat"
                style={{ padding: 10, cursor: "pointer", borderColor: selected === id ? "var(--ember)" : undefined }}
                onClick={() => setSelected(id)}
                title={c.evidence || ""}
              >
                <div className="between">
                  <span className="fz-12 mono">{c.name || c.id}</span>
                  <Chip tone={tone}>{stateLabel}</Chip>
                </div>
                <div className="dim fz-11 mt-1">
                  {(c.kind || "—")} · {slotCount} slot{slotCount === 1 ? "" : "s"} · <span className="mono">—</span>
                </div>
              </div>
            );
          })}
          {visibleLib.length === 0 ? (
            <div className="muted fz-12">No components match.</div>
          ) : null}
        </div>
      </Card>

      {/* Workspace */}
      <div className="col" style={{ gap: 14, minWidth: 0 }}>
        {/* Recipe 3 hint card */}
        <Card>
          <div className="between">
            <div>
              <Eyebrow>Recipe 3 · Component-to-Site</Eyebrow>
              <div className="muted fz-12 mt-2" style={{ maxWidth: 720 }}>
                Slot needs component → Search library (search-first policy) → Select or build →
                Define props/slots/variants → Test → Insert (surgical) → Inspect → Proof.
                See Recipe 3 in <span className="mono">WORKSPACE-RECIPES.md</span>.
              </div>
            </div>
            <Tag>recipe</Tag>
          </div>
        </Card>

        <Card>
          <div className="between">
            <div>
              <Eyebrow>{selectedComp ? (selectedComp.name || selectedComp.id) : "—"}</Eyebrow>
              <div className="h-section mt-1">
                {selectedComp ? `${selectedComp.kind || "component"} · state ${selectedComp.state || "unknown"}` : "no component selected"}
              </div>
            </div>
            <div className="row gap-2">
              <Btn kind="ghost" icon="copy">Duplicate</Btn>
              <Btn icon="arrowUpRight" disabled>Insert into site / slot</Btn>
              <Btn icon="check" kind="primary" disabled>Promote v0.4 → locked</Btn>
              <Tag>contract not yet wired</Tag>
            </div>
          </div>
          <div className="mt-3">
            <Tabs
              items={["Preview", "Props / slots", "Variants", "Test states", "History"]}
              value={tab}
              onChange={setTab}
            />
          </div>
        </Card>

        <Card style={{ flex: 1, minHeight: 240 }}>
          {tab === "Preview" ? (
            <div>
              <Eyebrow>Preview</Eyebrow>
              <div className="muted fz-12 mt-2">
                Live preview not wired yet. The component renders inside its own iframe in a later pass.
              </div>
              <MediaTile seed={42} ratio="16 / 9" label="preview placeholder" style={{ marginTop: 10 }} />
            </div>
          ) : tab === "Props / slots" ? (
            <div>
              <Eyebrow>Props · slots</Eyebrow>
              {selectedComp && (
                (Array.isArray(selectedComp.slots) && selectedComp.slots.length > 0) ||
                (Array.isArray(selectedComp.props) && selectedComp.props.length > 0)
              ) ? (
                <div className="col gap-3 mt-3">
                  {Array.isArray(selectedComp.props) && selectedComp.props.length > 0 ? (
                    <div className="col gap-2">
                      <div className="dim fz-11">props</div>
                      {selectedComp.props.map((p, i) => {
                        const label = typeof p === "string"
                          ? p
                          : `${p.name || "prop"} (${p.type || "any"})`;
                        return (
                          <Field key={`p-${i}`} label={label}>
                            <input className="input" placeholder={typeof p === "object" && p.example ? p.example : ""} />
                          </Field>
                        );
                      })}
                    </div>
                  ) : null}
                  {Array.isArray(selectedComp.slots) && selectedComp.slots.length > 0 ? (
                    <div className="col gap-2">
                      <div className="dim fz-11">slots</div>
                      {selectedComp.slots.map((s, i) => {
                        const label = typeof s === "string"
                          ? `${s} (slot)`
                          : `${s.name || "slot"} (slot)`;
                        const filled = typeof s === "object" && s.filled;
                        return (
                          <Field key={`s-${i}`} label={label}>
                            <Slot filled={!!filled}>{filled ? (s.value || "asset") : "empty"}</Slot>
                          </Field>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="muted fz-12 mt-3">
                  No props or slots declared in skeleton inventory — augment via Component chat (not wired).
                </div>
              )}
            </div>
          ) : tab === "Variants" ? (
            <div>
              <Eyebrow>Variants</Eyebrow>
              <div className="muted fz-12 mt-2">
                Variant catalog not yet wired to inventory. Placeholder set shown.
              </div>
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
              <div className="col gap-2 mt-3 fz-12 muted">History not yet wired to inventory.</div>
            </div>
          )}
        </Card>

        <Card>
          <Eyebrow>Component chat (Harry)</Eyebrow>
          <div className="row gap-2 mt-3">
            <input className="input" placeholder="Ask Harry to refine, add a variant, swap a slot…" disabled />
            <Btn icon="send" kind="primary" disabled />
          </div>
          <Hint style={{ marginTop: 10 }}>
            Round-trip pending. Will share the brain pipeline with Site Builder.
          </Hint>
        </Card>
      </div>

      {/* Inspector */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3"><Eyebrow>Inspector</Eyebrow><Btn kind="ghost" icon="more" /></div>

        <Field label="Slots">
          <div className="col gap-2 mt-2">
            {selectedComp && Array.isArray(selectedComp.slots) && selectedComp.slots.length > 0 ? (
              selectedComp.slots.map((s, i) => {
                const label = typeof s === "string" ? s : (s && s.name) || `slot-${i}`;
                const filled = typeof s === "object" && s && s.filled;
                return (
                  <Slot key={`isl-${i}`} filled={!!filled}>
                    {filled ? `${label} · filled` : `${label} · empty`}
                  </Slot>
                );
              })
            ) : (
              <div className="muted fz-12">No slots declared in inventory.</div>
            )}
          </div>
        </Field>

        <div className="divider" />
        <Eyebrow>Media needs</Eyebrow>
        <div className="muted fz-12 mt-2">
          Media-needs map not yet wired to inventory.
        </div>
        <div className="row gap-2 mt-2">
          <Btn icon="zap" disabled>Generate</Btn>
          <Btn disabled>Library</Btn>
        </div>

        <div className="divider" />
        <Eyebrow>Insert into site / slot</Eyebrow>
        <div className="col gap-2 mt-3">
          <Field label="Site"><Seg items={["auntie-gale","mbsh-reunion","hi-tide"]} value="auntie-gale" onChange={() => {}} /></Field>
          <Field label="Page"><Seg items={["home","shop","about"]} value="home" onChange={() => {}} /></Field>
          <Field label="Slot"><Seg items={["hero","section-1","section-2"]} value="hero" onChange={() => {}} /></Field>
          <Btn icon="arrowUpRight" kind="primary" style={{ marginTop: 8 }} disabled>
            Insert (surgical)
          </Btn>
          <div className="row gap-2" style={{ alignItems: "center" }}>
            <Tag>contract ready · server route pending</Tag>
          </div>
          <Btn kind="ghost" icon="doc" onClick={handleShowContract} style={{ marginTop: 4 }}>
            Show contract
          </Btn>
        </div>
        <Hint style={{ marginTop: 10 }}>
          Surgical replacement is real (<span className="mono">lib/surgical-editor.js</span>). Wiring this UI to it is later work.
        </Hint>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenComponentStudio });
