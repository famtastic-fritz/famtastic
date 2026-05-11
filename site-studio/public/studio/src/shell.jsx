/* App shell — Rail (12 items per platform IA), Topbar, body, MemoryStrip,
   ContextPanel (right-rail Shay), and the floating ShayBubble.

   Source of truth: docs/research/famtastic-studio-execution/
     FAMTASTIC-STUDIO-PLATFORM-IA-AND-FUNCTIONAL-MAP.md (12-section nav).
   The design template's NAV had 9; this shell promotes Site Builder,
   Site Settings, and Media Library to top-level rail items per the IA. */

const NAV = [
  { id: "home",       label: "Home",                icon: "home" },
  { id: "sites",      label: "Sites",               icon: "sites" },
  { id: "builder",    label: "Site Builder",        icon: "builder" },
  { id: "siteset",    label: "Site Settings",       icon: "siteCog" },
  { id: "thinktank",  label: "Think-Tank",          icon: "brain" },
  { id: "research",   label: "Research Center",     icon: "research" },
  { id: "components", label: "Component Studio",    icon: "components" },
  { id: "media",      label: "Media Studio",        icon: "media" },
  { id: "library",    label: "Media Library",       icon: "library" },
  { id: "shay",       label: "Shay Shay",           icon: "shay" },
  { id: "mission",    label: "Mission Control",     icon: "mission" },
  { id: "settings",   label: "Settings",            icon: "settings", kind: "footer" },
];

function Rail({ active, onSelect }) {
  const top = NAV.filter(n => n.kind !== "footer");
  const foot = NAV.filter(n => n.kind === "footer");
  return (
    <aside className="rail">
      <div className="rail-mark" title="FAMtastic Studio">F</div>
      {top.map(n => (
        <div key={n.id}
             className={`rail-item ${active === n.id ? "active" : ""}`}
             onClick={() => onSelect(n.id)}
             role="button" tabIndex={0}
             aria-label={n.label}
             onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(n.id); } }}>
          <I name={n.icon} size={18} />
          <span className="rail-tooltip">{n.label}</span>
        </div>
      ))}
      <div className="rail-spacer" />
      {foot.map(n => (
        <div key={n.id}
             className={`rail-item ${active === n.id ? "active" : ""}`}
             onClick={() => onSelect(n.id)}
             role="button" tabIndex={0}
             aria-label={n.label}>
          <I name={n.icon} size={18} />
          <span className="rail-tooltip">{n.label}</span>
        </div>
      ))}
      <div style={{ marginTop: 8 }}>
        <Avatar kind="fritz" initials="F" />
      </div>
    </aside>
  );
}

function Topbar({ section, project, site }) {
  const labels = Object.fromEntries(NAV.map(n => [n.id, n.label]));
  return (
    <div className="topbar">
      <div className="crumb">
        <span className="muted">{project}</span>
        <I name="chev" size={12} />
        <b>{site}</b>
        <I name="chev" size={12} />
        <span style={{ color: "var(--ink-2)" }}>{labels[section] || ""}</span>
      </div>

      <div className="row gap-2" style={{ marginLeft: 14 }}>
        <button className="btn btn-ghost"><I name="search" /> <span className="dim">Search anything</span> <span className="kbd">⌘K</span></button>
      </div>

      <div className="status">
        <span className="item"><Dot tone="good" /> <span className="muted">Build queue</span> <span className="mono tabular dim" style={{ marginLeft: 4 }}>—</span></span>
        <span className="item"><I name="cube" size={13} /> <span className="muted">claude-sonnet-4.5</span> <span className="dim mono">· haiku-4.5</span></span>
        <span className="item mono tabular dim">spend not wired</span>
        <span className="item"><I name="bell" size={13} /></span>
      </div>
    </div>
  );
}

/* Bottom memory strip — live activity tail.
   Reads /api/intelligence/runs?tag=<last-active-tag> via window.MemoryTail
   (lib/memory-tail.js). When no tag is selected or the registry has no
   runs, renders a single honest empty-state row instead of fake items. */
function MemoryStrip({ section, site }) {
  /* Lane F — MemoryStrip wire */
  const [items, setItems] = React.useState([]);
  const [reason, setReason] = React.useState("Loading…");

  /* Lane F — MemoryStrip refresh */
  const [refreshed, setRefreshed] = React.useState(false);

  function loadTail() {
    const tag = (window.SiteContext && window.SiteContext.getLastActiveTag)
      ? window.SiteContext.getLastActiveTag()
      : null;
    if (!window.MemoryTail || typeof window.MemoryTail.getTail !== "function") {
      setItems([]);
      setReason("memory tail not loaded");
      return;
    }
    window.MemoryTail.getTail({ tag }).then((res) => {
      const list = (res && Array.isArray(res.items)) ? res.items : [];
      if (list.length > 0) {
        setItems(list);
        setReason(null);
      } else {
        setItems([]);
        setReason((res && res.reason) || "no activity");
      }
    });
  }

  React.useEffect(() => {
    loadTail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site]);

  function handleRefresh() {
    loadTail();
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 1500);
  }
  /* end Lane F — MemoryStrip refresh */

  const visible = items.slice(0, 5);

  return (
    <div className="strip">
      <div className="row gap-2"><I name="history" size={14} style={{ color: "var(--ink-3)" }} /><span className="eyebrow">Memory</span></div>
      <div className="vdivider" style={{ height: 22 }} />
      <div className="row" style={{ gap: 18, overflow: "hidden", flex: 1 }}>
        {visible.length > 0 ? visible.map((it, i) => (
          <div key={i} className="row gap-2" style={{ flexShrink: 0 }}>
            <span className="mono dim tabular">{it.t}</span>
            <Dot tone={it.tone} />
            <span className="muted">{it.who}</span>
            <span style={{ color: "var(--ink-2)" }}>{it.text}</span>
          </div>
        )) : (
          <div className="row gap-2" style={{ flexShrink: 0 }}>
            <span className="dim">{reason}</span>
          </div>
        )}
      </div>
      <div className="row gap-2">
        {/* Lane F — MemoryStrip refresh */}
        {refreshed ? <Chip tone="good" style={{ fontSize: 10 }}>refreshed</Chip> : null}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ fontSize: 11, padding: "2px 8px" }}
          onClick={handleRefresh}
          title="Refresh memory strip">
          <I name="refresh" size={12} /> Refresh
        </button>
        {/* end Lane F — MemoryStrip refresh */}
        <span className="dim">replay · pin · …</span>
      </div>
    </div>
  );
}

/* Right contextual panel — Shay context-aware. Renders dynamically from
   `currentContext` published by the active screen via window.__studioPublishContext.
   Falls back to an honest placeholder when nothing is published.
   Collapsible — `collapsed` + `onToggle` are owned by the App in app.jsx
   and persisted to localStorage (key: "studio.rightCollapsed").

   Phase 1 additions:
   - Density Seg (Short / Operator / Deep / Next-action) — pure local UI toggle
   - "Explain current screen" action button — calls ShayActions.explainCurrentScreen
   - "What should I do next?" action button — calls ShayActions.whatNext
   - Routing chips call ShayActions.routeWithPayload (not bare __studioJump)
   - Learning capture footer — calls ShayActions.captureLearning + inbox chip
   - All feedback chips auto-clear after ~2s via setTimeout + state             */
function ContextPanel({ section, currentContext, collapsed, onToggle }) {
  const screenName = (NAV.find(n => n.id === section) || {}).label || section;

  // Density state — "Operator" is the Phase 0 default
  const [density, setDensity] = React.useState("Operator");

  // Transient chip feedback flags
  const [explainChip, setExplainChip]   = React.useState(false);
  const [nextChip,    setNextChip]      = React.useState(false);
  const [learnChip,   setLearnChip]     = React.useState(false);

  // Learning capture input ref
  const learnRef = React.useRef(null);

  // Helper — show a chip for ~2s then hide
  const flashChip = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // Map capabilityTruth status → display color + label
  const statusBits = (status) => {
    if (status === "verified") return { color: "var(--good)", label: "verified" };
    if (status === "partial")  return { color: "var(--warn)", label: "partial"  };
    if (status === "pending")  return { color: "var(--ink-3)", label: "pending" };
    return                          { color: "var(--ink-3)", label: status || "" };
  };

  // Collapsed state — slim 36px vertical bar with avatar + expand button (Phase 0 preserved)
  if (collapsed) {
    return (
      <aside className="right-panel collapsed" aria-label="Shay panel (collapsed)">
        <button
          type="button"
          className="btn btn-ghost btn-icon panel-collapse-btn"
          onClick={onToggle}
          aria-label="Expand Shay panel"
          title="Expand Shay panel">
          <I name="chev" size={14} />
        </button>
        <div className="panel-collapsed-mark" title="Shay">
          <Avatar kind="shay" initials="S" />
        </div>
      </aside>
    );
  }

  // Apply density filter via CurrentContext.forDensity (lib/current-context.js)
  const dctx = (window.CurrentContext?.forDensity && currentContext)
    ? window.CurrentContext.forDensity(currentContext, density)
    : currentContext;

  // Resolved values — fall back to honest placeholders when no context published
  const explain = dctx?.explain
    || (density !== "Next-action"
        ? `You're on ${screenName}. Real Shay context not wired yet — this panel is a placeholder until each section publishes its currentContext.`
        : "");
  const nextAction      = dctx?.nextAction  || null;
  const capabilityTruth = Array.isArray(dctx?.capabilityTruth) ? dctx.capabilityTruth : [];
  const hints           = Array.isArray(dctx?.hints) ? dctx.hints : [];

  // Default route chips when no hints published
  const defaultHints = [
    { label: "Sites",           target: "sites"      },
    { label: "Site Builder",    target: "builder"    },
    { label: "Research",        target: "research"   },
    { label: "Components",      target: "components" },
    { label: "Media",           target: "media"      },
    { label: "Mission Control", target: "mission"    },
  ];
  const routeHints = hints.length ? hints : defaultHints;

  // Action handlers
  const handleExplain = () => {
    const result = window.ShayActions?.explainCurrentScreen(currentContext);
    console.info("[shay] explainCurrentScreen →", result);
    flashChip(setExplainChip);
  };

  const handleWhatNext = () => {
    const result = window.ShayActions?.whatNext(currentContext);
    console.info("[shay] whatNext →", result);
    flashChip(setNextChip);
  };

  const handleLearnSave = async () => {
    const note = learnRef.current?.value?.trim();
    if (!note) return;
    const result = await window.ShayActions?.captureLearning(section, note, currentContext?.activeId || '');
    console.info("[shay] captureLearning →", result);
    if (learnRef.current) learnRef.current.value = "";
    flashChip(setLearnChip);
  };

  const handleRouteChip = async (target) => {
    await window.ShayActions?.routeWithPayload(target, {
      title: `Shay routed work to ${target}`,
      recommendation: currentContext?.nextAction?.title || `Open ${target}`,
      source_section: currentContext?.section || section,
      source_id: currentContext?.activeId || '',
    });
  };

  return (
    <aside className="right-panel" aria-label="Shay panel">

      {/* ── Header ── */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--hair)" }}>
        <div className="between">
          <div className="row gap-2">
            <Avatar kind="shay" initials="S" />
            <div>
              <div className="fz-13 fw-500">Shay</div>
              <div className="dim fz-11">{density} · context-aware</div>
            </div>
          </div>
          <div className="row gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-icon panel-collapse-btn"
              onClick={onToggle}
              aria-label="Collapse Shay panel"
              title="Collapse">
              <I name="chev" size={14} />
            </button>
          </div>
        </div>

        {/* Density Seg — Short / Operator / Deep / Next-action */}
        <div className="mt-3">
          <Seg
            items={["Short", "Operator", "Deep", "Next-action"]}
            value={density}
            onChange={setDensity}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-4" style={{ flex: 1, overflow: "auto" }}>

        {/* Action buttons row */}
        <div className="row gap-2" style={{ marginBottom: 12, flexWrap: "wrap" }}>
          <Btn kind="ghost" icon="spark" onClick={handleExplain}>Explain screen</Btn>
          {explainChip ? <Chip tone="good">Explanation surfaced</Chip> : null}
          <Btn kind="ghost" icon="spark" onClick={handleWhatNext}>What's next?</Btn>
          {nextChip ? <Chip tone="good">Next action surfaced</Chip> : null}
        </div>

        {/* Explain bubble — show when density is not Next-action and explain is non-empty */}
        {density !== "Next-action" && explain ? (
          <ChatBubble who="shay" meta="just now">{explain}</ChatBubble>
        ) : null}

        {/* Next action card — shown in Operator / Deep / Next-action (not Short) */}
        {nextAction ? (
          <Card style={{ marginBottom: 12 }}>
            <Eyebrow>Next recommended action</Eyebrow>
            <div className="fw-500 mt-2 fz-13">{nextAction.title}</div>
            {nextAction.subtitle
              ? <div className="muted fz-11 mt-2">{nextAction.subtitle}</div>
              : null}
            <div className="row gap-2 mt-3">
              {(nextAction.buttons || []).map((b, i) => (
                <Btn key={i} kind={b.kind || "default"} icon={b.icon}>{b.label}</Btn>
              ))}
            </div>
          </Card>
        ) : null}

        {/* Capability truth card — shown in Operator (≤3 rows) and Deep (all rows) */}
        {capabilityTruth.length > 0 ? (
          <Card style={{ marginBottom: 12 }}>
            <div className="between mb-3">
              <Eyebrow>Capability truth</Eyebrow>
              <Chip tone="good">Honest mode</Chip>
            </div>
            <div className="col gap-2 fz-12">
              {capabilityTruth.map((row, i) => {
                const bits = statusBits(row.status);
                return (
                  <div key={i} className="between">
                    <span>{row.label}</span>
                    <span style={{ color: bits.color }}>
                      {bits.label}
                      {row.detail ? <span className="dim"> · {row.detail}</span> : null}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : null}

        {/* Routing chips — hidden in Next-action density */}
        {density !== "Next-action" ? (
          <div className="mt-3">
            <Eyebrow>Route this to…</Eyebrow>
            <div className="row gap-2 mt-2" style={{ flexWrap: "wrap" }}>
              {routeHints.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 11 }}
                  onClick={() => h.target && handleRouteChip(h.target)}>
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Learning capture footer */}
        <div className="mt-4" style={{ borderTop: "1px solid var(--hair)", paddingTop: 12 }}>
          <Eyebrow style={{ marginBottom: 8 }}>Capture a learning</Eyebrow>
          <div className="row gap-2">
            <input
              ref={learnRef}
              className="input"
              placeholder="Note something worth remembering…"
              style={{ flex: 1 }}
              onKeyDown={(e) => { if (e.key === "Enter") handleLearnSave(); }}
            />
            <Btn kind="ghost" icon="bookmark" onClick={handleLearnSave}>Save</Btn>
          </div>
          {learnChip
            ? <Chip tone="good" style={{ marginTop: 6, display: "inline-block" }}>
                Learning captured · inbox+1
              </Chip>
            : null}
        </div>

      </div>

      {/* ── Chat input strip (Phase 0 preserved — not wired to backend in Phase 1) ── */}
      <div className="p-3" style={{ borderTop: "1px solid var(--hair)", display: "flex", gap: 8 }}>
        <input className="input" placeholder="Ask Shay…  ⌘ to readback" />
        <button className="btn btn-primary btn-icon"><I name="send" size={14} /></button>
      </div>
    </aside>
  );
}

function ShayBubble({ onClick }) {
  return <div className="shay-bubble" onClick={onClick} title="Shay">S</div>;
}

Object.assign(window, { NAV, Rail, Topbar, MemoryStrip, ContextPanel, ShayBubble });
