/* Think-Tank / Brainstorm — Capture · Cluster · Promote.
   V1 board with three columns and Promote-to-X chips.

   Lane D — live capture reads from /api/think-tank/captures.
   When the inbox is non-empty, the Capture column shows real captures.
   When empty, the column falls back to seed examples with a labeled hint.
   Phase 1 — Quick Add and Capture idea write to disk via POST /api/think-tank/captures.
   Per-card Promote writes promotion contracts via POST /api/think-tank/promote. */

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

const PROMOTE_TARGETS = ["Research", "Sites", "Components", "Media"];
const PROMOTE_TARGET_IDS = { Research: "research", Sites: "sites", Components: "components", Media: "media" };

function PromoteMenu({ captureId, captureTitle, onDone }) {
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const handleTarget = React.useCallback(async (label) => {
    if (busy) return;
    const to = PROMOTE_TARGET_IDS[label];
    if (!to) return;
    setBusy(true);
    setResult(null);
    const r = await window.ThinkTankActions?.promote(captureId, to, { note: captureTitle });
    setBusy(false);
    if (r && r.ok) {
      setResult({ ok: true, msg: `promoted → ${label} · ${r.path || ''}` });
      onDone?.({ ok: true });
    } else {
      setResult({ ok: false, msg: r?.error || r?.detail || 'promote failed' });
    }
  }, [captureId, captureTitle, busy]);

  if (result) {
    return (
      <div className="row gap-2 mt-2" style={{ flexWrap: "wrap" }}>
        <Chip tone={result.ok ? "good" : "warn"}>{result.ok ? "promoted" : "error"} · {result.msg}</Chip>
      </div>
    );
  }

  return (
    <div className="row gap-2 mt-2" style={{ flexWrap: "wrap" }}>
      {busy ? (
        <Chip tone="">promoting…</Chip>
      ) : (
        PROMOTE_TARGETS.map(label => (
          <Btn key={label} kind="ghost" icon="arrowUpRight" onClick={() => handleTarget(label)}>
            → {label}
          </Btn>
        ))
      )}
    </div>
  );
}

function QuickAdd({ onCaptureDone }) {
  const [title, setTitle] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const submit = React.useCallback(async () => {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    setResult(null);
    const r = await window.ThinkTankActions?.capture(t, '', []);
    setBusy(false);
    if (r && r.ok) {
      setTitle("");
      setResult({ ok: true, msg: `captured · ${r.capture?.id || ''}` });
      window.__captureInboxDirty = true;
      onCaptureDone?.();
    } else {
      setResult({ ok: false, msg: r?.error || r?.detail || 'capture failed' });
    }
  }, [title, busy]);

  const onKey = React.useCallback((e) => {
    if (e.key === "Enter") submit();
  }, [submit]);

  return (
    <Card style={{ marginBottom: 14 }}>
      <div className="row gap-2">
        <input
          className="input"
          placeholder="What's on your mind? Start typing — Shay clusters and routes."
          value={title}
          onChange={e => { setTitle(e.target.value); setResult(null); }}
          onKeyDown={onKey}
          disabled={busy}
        />
        <Btn icon="bolt" onClick={submit} disabled={busy || !title.trim()}>
          {busy ? "saving…" : "Quick add"}
        </Btn>
        <Btn icon="link" disabled={true} title="Source link write pending">Link source</Btn>
      </div>
      {result ? (
        <div className="row gap-2 mt-2">
          <Chip tone={result.ok ? "good" : "warn"}>{result.msg}</Chip>
        </div>
      ) : null}
    </Card>
  );
}

function CaptureModal({ onDone }) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState(null);

  const submit = React.useCallback(async () => {
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    setResult(null);
    const r = await window.ThinkTankActions?.capture(t, body.trim(), []);
    setBusy(false);
    if (r && r.ok) {
      setTitle("");
      setBody("");
      setResult({ ok: true, msg: `captured · ${r.capture?.id || ''}` });
      window.__captureInboxDirty = true;
      onDone?.({ ok: true, capture: r.capture });
    } else {
      setResult({ ok: false, msg: r?.error || r?.detail || 'capture failed' });
    }
  }, [title, body, busy]);

  return (
    <Card style={{ marginBottom: 14 }}>
      <Eyebrow>Capture idea</Eyebrow>
      <div className="col gap-2 mt-2">
        <input
          className="input"
          placeholder="Idea title (required)"
          value={title}
          onChange={e => { setTitle(e.target.value); setResult(null); }}
          disabled={busy}
        />
        <textarea
          className="input"
          placeholder="Optional detail…"
          value={body}
          onChange={e => setBody(e.target.value)}
          disabled={busy}
          rows={3}
          style={{ resize: "vertical", fontFamily: "inherit", fontSize: 12 }}
        />
        <div className="row gap-2">
          <Btn kind="primary" icon="plus" onClick={submit} disabled={busy || !title.trim()}>
            {busy ? "saving…" : "Capture"}
          </Btn>
          <Btn kind="ghost" onClick={() => onDone?.({ cancelled: true })}>Cancel</Btn>
        </div>
        {result ? (
          <Chip tone={result.ok ? "good" : "warn"}>{result.msg}</Chip>
        ) : null}
      </div>
    </Card>
  );
}

function ScreenThinkTank() {
  const [tab, setTab] = React.useState("Board");
  const [captures, setCaptures] = React.useState([]);
  const [capturesLoaded, setCapturesLoaded] = React.useState(false);
  const [capturesError, setCapturesError] = React.useState(null);
  const [selectedCapId, setSelectedCapId] = React.useState(null);
  const [showCaptureModal, setShowCaptureModal] = React.useState(false);
  // openPromoteId: the card id whose promote menu is currently open
  const [openPromoteId, setOpenPromoteId] = React.useState(null);
  const [tasks, setTasks] = React.useState([]);

  // Lane E — currentContext publish
  React.useEffect(() => {
    window.__studioPublishContext?.(window.CurrentContext?.forSection_thinktank?.(captures.length) || null);
    return () => window.__studioPublishContext?.(null);
  }, [captures.length]);

  const loadCaptures = React.useCallback(() => {
    if (!window.ThinkTankAPI) {
      setCapturesLoaded(true);
      setCapturesError("think_tank_api_unavailable");
      return;
    }
    window.ThinkTankAPI.listCaptures().then(d => {
      setCaptures(d.captures || []);
      setCapturesError(d.error || null);
      setCapturesLoaded(true);
    });
  }, []);

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

  const handleCaptureDone = React.useCallback(() => {
    loadCaptures();
  }, [loadCaptures]);

  const handleCaptureModalDone = React.useCallback(({ ok, cancelled } = {}) => {
    setShowCaptureModal(false);
    if (ok) loadCaptures();
  }, [loadCaptures]);

  React.useEffect(() => {
    let alive = true;
    window.WorkflowAPI?.listTasks?.('thinktank').then((result) => {
      if (!alive) return;
      setTasks(Array.isArray(result?.tasks) ? result.tasks.slice(0, 8) : []);
    });
    return () => { alive = false; };
  }, [captures.length, openPromoteId]);

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
          <Btn key="ci" icon="plus" kind="primary" onClick={() => setShowCaptureModal(v => !v)}>
            Capture idea
          </Btn>,
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

      {showCaptureModal ? (
        <CaptureModal onDone={handleCaptureModalDone} />
      ) : null}

      <QuickAdd onCaptureDone={handleCaptureDone} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {cols.map(col => (
          <Card key={col.name}>
            <div className="between mb-3">
              <Eyebrow>{col.name}</Eyebrow>
              <Tag>{col.items.length}</Tag>
            </div>

            {col.kind === "promote" ? (
              <Hint style={{ marginBottom: 8 }}>
                Promote routes (→ Research/Sites/Component/Media) write a local promotion record and append a Studio task.
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
                const isPromoteOpen = isLiveCap && it.id && it.id === openPromoteId;
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

                    {isLiveCap ? (
                      <div onClick={e => e.stopPropagation()}>
                        {isPromoteOpen ? (
                          <PromoteMenu
                            captureId={it.id}
                            captureTitle={it.t}
                            onDone={() => setOpenPromoteId(null)}
                          />
                        ) : (
                          <div className="row gap-2 mt-2">
                            <Btn
                              kind="ghost"
                              icon="arrowUpRight"
                              onClick={() => setOpenPromoteId(it.id)}
                            >Promote</Btn>
                            <span className="dim fz-11">→ Research · Site · Component · Media</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="row gap-2 mt-2">
                        <Btn kind="ghost" icon="arrowUpRight" title="Promote pending (seed card)" disabled={true}>Promote</Btn>
                        <Tag>not wired</Tag>
                        <span className="dim fz-11">→ Research · Site · Component · Media</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3"><Eyebrow>Promote idea</Eyebrow><Chip tone="aurora">recipe · 4</Chip></div>
        <div className="muted fz-12">From any captured idea, route to the right downstream section. Click Promote on any live card to open the 4-target menu.</div>
      </Card>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3"><Eyebrow>Think-Tank tasks</Eyebrow><Tag>{tasks.length}</Tag></div>
        <div className="col gap-2">
          {tasks.length > 0 ? tasks.map((task) => (
            <div key={task.task_id} className="panel-flat" style={{ padding: 10 }}>
              <div className="between">
                <span className="fz-12">{task.target_section}</span>
                <Tag>{task.status}</Tag>
              </div>
              <div className="muted fz-11 mt-1">{task.recommendation || task.title || task.task_id}</div>
            </div>
          )) : <div className="muted fz-12">No Think-Tank-origin tasks yet.</div>}
        </div>
      </Card>

      <Hint style={{ marginTop: 14 }}>
        Live reads pull from <span className="mono">captures/inbox/*.capture.json</span>. Quick Add and Capture idea write real files. Promote writes promotion contracts to <span className="mono">captures/promotions/</span> and appends a local Studio task.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenThinkTank });
