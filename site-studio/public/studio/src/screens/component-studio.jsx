/* Component Studio — library, builder entry, chat, preview/test/enhance,
   props/slots/variants, media needs, insertion, surgical-replacement concept.
   Library pane is wired to /api/components (read-only). Search calls
   /api/components/check (debounced) then ComponentsActions.checkExistingNew()
   for a recommend field. Insertion stages a contract in local state — NEVER
   mutates a real site. Phase 1 action wiring by Lane C. */

const SEED_LIB = [
  { id: "fam-hero-layered",       name: "fam-hero-layered",       v: "v2.1", state: "green", uses: 6, kind: "Hero",    slots: new Array(4) },
  { id: "section-intro-two-col",  name: "section-intro · two-col", v: "v1.0", state: "green", uses: 5, kind: "Section", slots: new Array(1) },
  { id: "product-grid-breakout",  name: "product-grid · breakout", v: "v1.4", state: "green", uses: 3, kind: "Grid",    slots: new Array(6) },
  { id: "service-card-breakout",  name: "service-card · breakout", v: "v1.2", state: "green", uses: 4, kind: "Card",    slots: new Array(2) },
  { id: "feature-strip-seasonal", name: "feature-strip · seasonal", v: "v0.9", state: "warn",  uses: 1, kind: "Strip",   slots: new Array(1) },
  { id: "starburst-badge",        name: "starburst-badge",         v: "v1.0", state: "green", uses: 2, kind: "Badge",   slots: [] },
  { id: "countdown-timer",        name: "countdown-timer",         v: "v0.4", state: "warn",  uses: 1, kind: "Widget",  slots: [] },
];

// Insertion pane state helpers — kept outside the component for readability.
const SITES  = ["auntie-gale", "mbsh-reunion", "hi-tide"];
const PAGES  = ["home", "shop", "about"];
const ISLOTS = ["hero", "section-1", "section-2"];

function ScreenComponentStudio() {
  const [tab, setTab] = React.useState("Preview");
  const [lib, setLib] = React.useState([]);
  const [drafts, setDrafts] = React.useState([]);
  const [usingSeed, setUsingSeed] = React.useState(false);
  const [apiError, setApiError] = React.useState(null);
  const [selected, setSelected] = React.useState(null);

  const [search, setSearch] = React.useState("");
  // checkResult now carries recommend field via ComponentsActions.checkExistingNew
  const [checkResult, setCheckResult] = React.useState(null);

  // Chat state
  const [chatInput, setChatInput] = React.useState("");
  const [chatMessages, setChatMessages] = React.useState([]); // [{who, text}]

  // Insertion pane state
  const [insSite, setInsSite] = React.useState(SITES[0]);
  const [insPage, setInsPage] = React.useState(PAGES[0]);
  const [insSlot, setInsSlot] = React.useState(ISLOTS[0]);

  // Currently focused slot in media-needs panel (for mediaNeed routing)
  const [currentSlotId, setCurrentSlotId] = React.useState(null);

  // Action contract display
  const [lastContract, setLastContract] = React.useState(null);
  const [draftMsg, setDraftMsg] = React.useState(null);

  // Insertion status chip (Phase 2, Lane C2)
  const [insertStatus, setInsertStatus] = React.useState(null); // null | {kind, text}
  const insertStatusTimer = React.useRef(null);

  // Insertion history (Phase 2, Lane C2)
  const [insertionHistory, setInsertionHistory] = React.useState([]);
  const [historyOpen, setHistoryOpen] = React.useState(true);

  // Active tag is the currently selected site in the insertion pane.
  // (kept in sync with insSite)
  const activeTag = insSite;

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

  React.useEffect(() => {
    let alive = true;
    window.WorkflowAPI?.listComponentDrafts?.().then((result) => {
      if (!alive) return;
      setDrafts(Array.isArray(result?.drafts) ? result.drafts : []);
    });
    return () => { alive = false; };
  }, []);

  // Debounced check-existing call augmented with recommend via ComponentsActions
  React.useEffect(() => {
    const actions = window.ComponentsActions;
    const v = search.trim();
    if (!v || !actions || typeof actions.checkExistingNew !== "function") {
      setCheckResult(null);
      return;
    }
    const t = setTimeout(() => {
      actions.checkExistingNew(v).then(r => setCheckResult(r));
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

  // Load insertion history on mount and when activeTag changes (Phase 2, Lane C2)
  function loadInsertionHistory(tag) {
    const api = window.ComponentsAPI;
    if (!api || typeof api.listInsertions !== "function") return;
    api.listInsertions(tag).then(d => {
      if (d && Array.isArray(d.insertions)) {
        setInsertionHistory(d.insertions);
      }
    });
  }

  React.useEffect(() => {
    loadInsertionHistory(activeTag);
  }, [activeTag]);

  const selectedComp = React.useMemo(() => {
    if (!selected) return null;
    return mergedLib.find(c => c.id === selected) || null;
  }, [mergedLib, selected]);

  // Visible list = filter by search term (substring match on id or name)
  const mergedLib = React.useMemo(() => {
    const normalizedDrafts = drafts.map((draft) => ({
      id: draft.id,
      name: draft.name || draft.id,
      v: 'draft',
      state: 'warn',
      uses: 0,
      kind: draft.purpose || 'Draft',
      slots: Array.isArray(draft.slots) ? draft.slots : [],
      props: Array.isArray(draft.props) ? draft.props : [],
      variants: Array.isArray(draft.variants) ? draft.variants : [],
      media_needs: Array.isArray(draft.media_needs) ? draft.media_needs : [],
      isDraft: true,
    }));
    const draftIds = new Set(normalizedDrafts.map((draft) => draft.id));
    return lib.filter((item) => !draftIds.has(item.id)).concat(normalizedDrafts);
  }, [lib, drafts]);

  const visibleLib = React.useMemo(() => {
    const v = search.trim().toLowerCase();
    if (!v) return mergedLib;
    return mergedLib.filter(c => {
      const id = (c.id || "").toLowerCase();
      const name = (c.name || "").toLowerCase();
      return id.includes(v) || name.includes(v);
    });
  }, [mergedLib, search]);

  // --- Action helpers ---

  function pushContract(c) {
    window.__componentLastAction = c;
    setLastContract(c);
  }

  async function handleNewComponent() {
    const actions = window.ComponentsActions;
    if (!actions) return;
    if (checkResult && (checkResult.recommend === 'reuse' || checkResult.recommend === 'consider-near-match')) {
      setDraftMsg({ ok: false, text: checkResult.recommend === 'reuse' ? 'existing component found — reuse first' : `near match found · ${checkResult.near}` });
      return;
    }
    const c = await actions.newComponentContract({
      id: "new-component-draft",
      name: "new-component-draft",
      purpose: "new component draft",
      props: [],
      slots: [],
      variants: [],
      media_needs: [],
    });
    pushContract(c);
    if (c?.status === 'stored_local' && c.server_result?.draft) {
      setDrafts((prev) => [c.server_result.draft, ...prev.filter((item) => item.id !== c.server_result.draft.id)]);
      setDraftMsg({ ok: true, text: `draft stored · ${c.server_result.draft.id}` });
    }
  }

  async function handleStageNewFromSearch() {
    const actions = window.ComponentsActions;
    if (!actions) return;
    if (!search.trim()) return;
    if (checkResult && (checkResult.recommend === 'reuse' || checkResult.recommend === 'consider-near-match')) {
      setDraftMsg({ ok: false, text: checkResult.recommend === 'reuse' ? 'existing component found — reuse first' : `near match found · ${checkResult.near}` });
      return;
    }
    const id = search.trim() || "new-component-draft";
    const c = await actions.newComponentContract({
      id,
      name: id,
      purpose: "staged from search",
      props: [],
      slots: [],
      variants: [],
      media_needs: currentSlotId ? [{ slot: currentSlotId, status: 'needed' }] : [],
    });
    pushContract(c);
    if (c?.status === 'stored_local' && c.server_result?.draft) {
      setDrafts((prev) => [c.server_result.draft, ...prev.filter((item) => item.id !== c.server_result.draft.id)]);
      setDraftMsg({ ok: true, text: `draft stored · ${c.server_result.draft.id}` });
    }
  }

  function handleChatSend() {
    const actions = window.ComponentsActions;
    const text = chatInput.trim();
    if (!text) return;
    // Append the user's message
    setChatMessages(prev => [...prev, { who: "fritz", text }]);
    setChatInput("");
    // Stage the contract and append Shay's honest response
    const c = actions ? actions.componentChat(selected, text) : null;
    if (c) pushContract(c);
    setChatMessages(prev => [
      ...prev,
      { who: "shay", text: "Contract staged · brain round-trip pending" },
    ]);
  }

  async function handleInsert() {
    const actions = window.ComponentsActions;
    if (!actions) return;

    // Clear any previous status chip timer.
    if (insertStatusTimer.current) clearTimeout(insertStatusTimer.current);
    setInsertStatus({ kind: "working", text: "staging…" });

    const c = await actions.insertionContract(
      selected || "none",
      selectedComp ? (selectedComp.v || "unknown") : "unknown",
      insSite,
      insPage,
      insSlot
    );
    pushContract(c);

    if (c && c.status === "staged_local") {
      const relPath = c.server_result && c.server_result.written ? c.server_result.written : "_test/inserts/";
      setInsertStatus({ kind: "good", text: `staged · ${relPath}` });
      // Refresh history after successful insertion.
      loadInsertionHistory(activeTag);
    } else {
      const reason = (c && c.reason) || "insert failed";
      setInsertStatus({ kind: "warn", text: `contract only · ${reason}` });
    }

    insertStatusTimer.current = setTimeout(() => setInsertStatus(null), 4000);
  }

  function handleMediaNeed(slotId) {
    const actions = window.ComponentsActions;
    if (!actions) return;
    const c = actions.mediaNeed(selected || "none", slotId || currentSlotId || "unknown");
    pushContract(c);
  }

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

  // Render the check-existing result with recommend field
  function renderCheckResult() {
    if (!search.trim() || !checkResult) return null;
    const { recommend, near } = checkResult;
    if (recommend === "reuse") {
      return (
        <div className="mb-2">
          <Chip tone="good">exists · select to reuse</Chip>
        </div>
      );
    }
    if (recommend === "consider-near-match") {
      return (
        <div className="mb-2">
          <span
            onClick={() => {
              setSelected(near);
              setSearch(near);
            }}
            style={{ cursor: "pointer" }}
            title="Click to select near match"
          >
            <Chip tone="warn">near: {near}</Chip>
          </span>
        </div>
      );
    }
    // create-new
    return (
      <div className="mb-2 col gap-2">
        <span className="dim fz-11">no match — would create new</span>
        <Btn
          kind="ghost"
          icon="plus"
          onClick={handleStageNewFromSearch}
        >
          Stage new-component contract
        </Btn>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 320px", gap: 14, height: "100%" }}>

      {/* ── Library pane ── */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3">
          <Eyebrow>Library · {mergedLib.length}</Eyebrow>
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

        {/* Inline check-existing result with recommend */}
        {renderCheckResult()}

        <Btn
          icon="plus"
          kind="primary"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={handleNewComponent}
        >
          New component
        </Btn>
        <div className="row gap-2 mt-2" style={{ alignItems: "center" }}>
          <Tag>check-existing gate live</Tag>
          {draftMsg ? <Chip tone={draftMsg.ok ? "good" : "warn"}>{draftMsg.text}</Chip> : null}
        </div>

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
                  <div className="row gap-2">
                    {c.isDraft ? <Tag tone="warn">draft</Tag> : null}
                    <Chip tone={tone}>{stateLabel}</Chip>
                  </div>
                </div>
                <div className="dim fz-11 mt-1">
                  {(c.kind || "—")} · {slotCount} slot{slotCount === 1 ? "" : "s"}
                </div>
              </div>
            );
          })}
          {visibleLib.length === 0 ? (
            <div className="muted fz-12">No components match.</div>
          ) : null}
        </div>
      </Card>

      {/* ── Workspace ── */}
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

        {/* Component header */}
        <Card>
          <div className="between">
            <div>
              <Eyebrow>{selectedComp ? (selectedComp.name || selectedComp.id) : "—"}</Eyebrow>
              <div className="h-section mt-1">
                {selectedComp
                  ? `${selectedComp.kind || "component"} · state ${selectedComp.state || "unknown"}`
                  : "no component selected"}
              </div>
            </div>
            <div className="row gap-2">
              <Btn kind="ghost" icon="copy">Duplicate</Btn>
              <Btn icon="check" kind="primary" disabled>Promote v0.4 → locked</Btn>
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

        {/* Tab content */}
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
                        const slotId = typeof s === "string" ? s : (s && s.name) || `slot-${i}`;
                        return (
                          <Field key={`s-${i}`} label={label}>
                            <Slot
                              filled={!!filled}
                              style={{ cursor: "pointer" }}
                              onClick={() => setCurrentSlotId(slotId)}
                            >
                              {filled ? (s.value || "asset") : "empty"}
                            </Slot>
                          </Field>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="muted fz-12 mt-3">
                  No props or slots declared in skeleton inventory — augment via Component chat.
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
              <div className="col gap-2 mt-3 fz-12 muted">
                empty · loading · loaded · error · long-text · narrow-viewport
              </div>
            </div>
          ) : (
            <div>
              <Eyebrow>History</Eyebrow>
              <div className="col gap-2 mt-3 fz-12 muted">History not yet wired to inventory.</div>
            </div>
          )}
        </Card>

        {/* Component chat */}
        <Card>
          <Eyebrow>Component chat (Harry)</Eyebrow>
          {chatMessages.length > 0 ? (
            <div className="col mt-3" style={{ gap: 0 }}>
              {chatMessages.map((m, i) => (
                <ChatBubble key={i} who={m.who}>{m.text}</ChatBubble>
              ))}
            </div>
          ) : null}
          <div className="row gap-2 mt-3">
            <input
              className="input"
              placeholder="Ask Harry to refine, add a variant, swap a slot…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleChatSend(); }}
            />
            <Btn icon="send" kind="primary" onClick={handleChatSend} />
          </div>
          <Hint style={{ marginTop: 10 }}>
            Brain round-trip not wired — Send stages a local contract and echoes an honest reply.
          </Hint>
        </Card>

        {/* Action contract card — bottom of workspace */}
        <Card>
          <div className="between mb-2">
            <Eyebrow>Last action · contract only</Eyebrow>
            <Tag tone="ember">no site mutation</Tag>
          </div>
          {lastContract ? (
            <pre style={{
              fontSize: 10,
              color: "var(--ink-3)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              margin: 0,
              maxHeight: 180,
              overflow: "auto",
              background: "oklch(1 0 0 / 0.03)",
              borderRadius: 6,
              padding: 10,
            }}>
              {JSON.stringify(lastContract, null, 2)}
            </pre>
          ) : (
            <div className="muted fz-12">
              No action staged yet. Use New component, chat Send, Insert, or Generate to stage a contract.
            </div>
          )}
        </Card>
      </div>

      {/* ── Inspector ── */}
      <Card style={{ overflow: "auto" }}>
        <div className="between mb-3">
          <Eyebrow>Inspector</Eyebrow>
          <Btn kind="ghost" icon="more" />
        </div>

        <Field label="Slots">
          <div className="col gap-2 mt-2">
            {selectedComp && Array.isArray(selectedComp.slots) && selectedComp.slots.length > 0 ? (
              selectedComp.slots.map((s, i) => {
                const label = typeof s === "string" ? s : (s && s.name) || `slot-${i}`;
                const filled = typeof s === "object" && s && s.filled;
                return (
                  <Slot
                    key={`isl-${i}`}
                    filled={!!filled}
                    style={{ cursor: "pointer" }}
                    onClick={() => setCurrentSlotId(label)}
                  >
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
          {currentSlotId
            ? <>Selected slot: <span className="mono">{currentSlotId}</span></>
            : "Click a slot above to target it, then Generate."}
        </div>
        <div className="row gap-2 mt-2">
          <Btn
            icon="zap"
            onClick={() => handleMediaNeed(currentSlotId)}
          >
            Generate
          </Btn>
          <Btn disabled>Library</Btn>
        </div>
        <Hint style={{ marginTop: 8 }}>
          Generate routes to Media Studio with slot prefilled in{" "}
          <span className="mono">window.__mediaStageFromComponent</span>.
        </Hint>

        <div className="divider" />

        <Eyebrow>Insert into site / slot</Eyebrow>
        <div className="col gap-2 mt-3">
          <Field label="Site">
            <Seg items={SITES} value={insSite} onChange={setInsSite} />
          </Field>
          <Field label="Page">
            <Seg items={PAGES} value={insPage} onChange={setInsPage} />
          </Field>
          <Field label="Slot">
            <Seg items={ISLOTS} value={insSlot} onChange={setInsSlot} />
          </Field>
          <div className="row gap-2 mt-2" style={{ alignItems: "center", flexWrap: "wrap" }}>
            <Btn icon="arrowUpRight" kind="primary" onClick={handleInsert}>
              Insert (surgical)
            </Btn>
            {insertStatus ? (
              <Chip tone={insertStatus.kind === "good" ? "good" : insertStatus.kind === "warn" ? "warn" : ""}>
                {insertStatus.text}
              </Chip>
            ) : (
              <Tag tone="aurora">staged in _test/inserts/</Tag>
            )}
          </div>
          <Btn kind="ghost" icon="doc" onClick={handleShowContract} style={{ marginTop: 4 }}>
            Show server contract
          </Btn>
        </div>
        <Hint style={{ marginTop: 10 }}>
          Insert writes a safe placeholder fragment to{" "}
          <span className="mono">sites/{"{tag}"}/_test/inserts/</span>.{" "}
          Real surgical write via <span className="mono">lib/surgical-editor.js</span> is later work.
        </Hint>

        <div className="divider" />

        {/* Insertion History card (Phase 2, Lane C2) */}
        <div>
          <div
            className="between"
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => setHistoryOpen(o => !o)}
          >
            <Eyebrow>Insertion history</Eyebrow>
            <Tag>{historyOpen ? "▲" : "▼"}</Tag>
          </div>
          {historyOpen ? (
            insertionHistory.length === 0 ? (
              <div className="muted fz-11 mt-2">No insertions staged yet for {activeTag}.</div>
            ) : (
              <div className="col gap-1 mt-2" style={{ maxHeight: 220, overflow: "auto" }}>
                {insertionHistory.slice().reverse().map((entry, i) => (
                  <div key={i} style={{ padding: "4px 0", borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}>
                    <div className="mono fz-11" style={{ color: "var(--ink-2)" }}>
                      {entry.ts ? entry.ts.replace("T", " ").replace(/\.\d+Z$/, " UTC") : "—"}
                    </div>
                    <div className="mono fz-11" style={{ color: "var(--ember)", marginTop: 1 }}>
                      {entry.component_id || "—"}
                    </div>
                    <div className="mono fz-11 dim" style={{ marginTop: 1 }}>
                      {(entry.target_site || activeTag) + " · " + (entry.target_page || entry.page || "—") + " · " + (entry.target_slot || entry.slot || "—")}
                    </div>
                    <div className="mono fz-11 dim" style={{ marginTop: 1 }}>
                      {entry.inserted_fragment_path || entry.written || "—"}
                    </div>
                    <div className="mono fz-11 dim" style={{ marginTop: 1 }}>
                      {entry.status || "staged_local"} · {entry.original_fragment_ref || "no-fragment-ref"}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenComponentStudio });
