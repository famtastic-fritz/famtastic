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

/* Bottom memory strip — placeholder activity tail.
   In a later pass this reads from /captures/ + /sites/<tag>/intelligence/runs.
   For now, a labeled placeholder so the user can see the strip exists. */
function MemoryStrip({ section, site }) {
  const items = [
    { t: "now",   who: "shell",   text: `Active: ${section}${site && site !== "—" ? " · " + site : ""}`, tone: "info" },
    { t: "—",     who: "memory",  text: "Live memory tail not wired yet — placeholder.", tone: "" },
  ];
  return (
    <div className="strip">
      <div className="row gap-2"><I name="history" size={14} style={{ color: "var(--ink-3)" }} /><span className="eyebrow">Memory</span></div>
      <div className="vdivider" style={{ height: 22 }} />
      <div className="row" style={{ gap: 18, overflow: "hidden", flex: 1 }}>
        {items.map((it, i) => (
          <div key={i} className="row gap-2" style={{ flexShrink: 0 }}>
            <span className="mono dim tabular">{it.t}</span>
            <Dot tone={it.tone} />
            <span className="muted">{it.who}</span>
            <span style={{ color: "var(--ink-2)" }}>{it.text}</span>
          </div>
        ))}
      </div>
      <div className="row gap-2">
        <span className="dim">replay · pin · …</span>
      </div>
    </div>
  );
}

/* Right contextual panel — Shay context-aware. Per-screen explanation and
   "what's next" hooks; placeholder content until each screen publishes
   a currentContext object (see Recipe 5: Shay routing). */
function ContextPanel({ section, currentContext }) {
  const screenName = (NAV.find(n => n.id === section) || {}).label || section;
  const explainer = currentContext?.explain
    || `You're on ${screenName}. Real Shay context not wired yet — this panel is a placeholder until each section publishes its currentContext.`;
  const nextAction = currentContext?.nextAction;
  return (
    <aside className="right-panel">
      <div className="p-4" style={{ borderBottom: "1px solid var(--hair)" }}>
        <div className="between">
          <div className="row gap-2">
            <Avatar kind="shay" initials="S" />
            <div>
              <div className="fz-13 fw-500">Shay</div>
              <div className="dim fz-11">Operator · context-aware</div>
            </div>
          </div>
          <div className="row gap-2">
            <button className="btn btn-ghost btn-icon"><I name="diff" size={14} /></button>
          </div>
        </div>
        <div className="seg mt-3">
          <button className="on">Short</button>
          <button>Operator</button>
          <button>Deep</button>
          <button>Next</button>
        </div>
      </div>

      <div className="p-4" style={{ flex: 1, overflow: "auto" }}>
        <ChatBubble who="shay" meta="just now">{explainer}</ChatBubble>

        {nextAction ? (
          <Card style={{ marginBottom: 12 }}>
            <Eyebrow>Next recommended action</Eyebrow>
            <div className="fw-500 mt-2 fz-13">{nextAction.title}</div>
            {nextAction.subtitle ? <div className="muted fz-11 mt-2">{nextAction.subtitle}</div> : null}
            <div className="row gap-2 mt-3">
              {(nextAction.buttons || []).map((b, i) => (
                <Btn key={i} kind={b.kind || "default"} icon={b.icon}>{b.label}</Btn>
              ))}
            </div>
          </Card>
        ) : null}

        <Card>
          <div className="between mb-3">
            <Eyebrow>Capability truth</Eyebrow>
            <Chip tone="good">Honest mode</Chip>
          </div>
          <div className="col gap-2 fz-12">
            <div className="between"><span>Site builds</span><span className="muted">verified · chat shell live</span></div>
            <div className="between"><span>Mission Control</span><span className="muted">verified · operator action layer</span></div>
            <div className="between"><span>Sites dashboard</span><span style={{ color: "var(--warn)" }}>read-only · no UI yet</span></div>
            <div className="between"><span>Media gen</span><span className="dim">adapters wired · UI placeholder</span></div>
            <div className="between"><span>Component reuse</span><span className="dim">surgical edits real · UI placeholder</span></div>
          </div>
        </Card>

        <div className="mt-3">
          <Eyebrow>Route this to…</Eyebrow>
          <div className="row gap-2 mt-2" style={{ flexWrap: "wrap" }}>
            {["Sites","Site Builder","Research","Components","Media","Mission Control"].map(t => (
              <button key={t} className="btn btn-ghost" style={{ fontSize: 11 }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

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
