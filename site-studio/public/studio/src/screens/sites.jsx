/* Sites — dashboard list. V1 reads from /api/intelligence/sites if available;
   gracefully falls back to a labeled placeholder list. */

function ScreenSites({ onJump }) {
  const [sites, setSites] = React.useState(null);
  const [filter, setFilter] = React.useState("All");
  const [view, setView] = React.useState("Grid");

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/intelligence/sites")
      .then(r => r.json())
      .then(d => { if (!cancelled) setSites(Array.isArray(d.sites) ? d.sites : []); })
      .catch(() => { if (!cancelled) setSites([]); });
    return () => { cancelled = true; };
  }, []);

  const placeholderSites = [
    { tag: "site-mbsh-reunion", title: "MBSH Reunion", vertical: "Event · Reunion", run_count: 2, has_intelligence: true },
    { tag: "site-auntie-gale",  title: "Auntie Gale (placeholder)", vertical: "Local artisan goods", run_count: 0, has_intelligence: false },
    { tag: "site-hi-tide-harry", title: "Hi-Tide Harry (placeholder)", vertical: "Coastal hardware", run_count: 0, has_intelligence: false },
  ];
  const usingPlaceholder = !sites || sites.length === 0;
  const list = usingPlaceholder ? placeholderSites : sites;

  return (
    <div>
      <SectionHeader
        eyebrow={`Sites · ${list.length} known`}
        title="Your sites"
        sub="Build new, continue existing, preview, inspect, refine. Local site settings live on each card; platform defaults live in Settings."
        right={[
          <Btn key="ns" icon="plus" kind="primary">New site</Btn>,
          <Btn key="im" icon="upload">Import existing</Btn>,
          <Btn key="tt" icon="brain" onClick={() => onJump?.("thinktank")}>Start in Think-Tank</Btn>,
        ]}
      />

      <Card style={{ marginBottom: 14 }}>
        <div className="between">
          <div className="seg">
            {["All","Live","Building","Design","Research"].map(f => (
              <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="row gap-2">
            <Seg items={["Grid","List"]} value={view} onChange={setView} />
          </div>
        </div>
      </Card>

      {usingPlaceholder ? (
        <Hint style={{ marginBottom: 14 }}>Live /api/intelligence/sites returned empty in this environment — showing placeholder set.</Hint>
      ) : null}

      <div style={{ display: view === "Grid" ? "grid" : "block", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {list.map((s) => (
          <Card key={s.tag} hover onClick={() => onJump?.("builder")} style={view === "List" ? { marginBottom: 10 } : undefined}>
            <div className="between mb-2">
              <Tag tone="ember">{s.tag}</Tag>
              <Chip tone={s.has_intelligence ? "good" : ""}>{s.has_intelligence ? "intel ready" : "no intel"}</Chip>
            </div>
            <div className="h-section">{s.title || s.tag}</div>
            <div className="muted fz-12 mt-2">{s.vertical || "—"}</div>
            <div className="row gap-2 mt-3">
              <Btn kind="ghost" icon="eye">Preview</Btn>
              <Btn kind="ghost" icon="settings" onClick={(e) => { e.stopPropagation(); onJump?.("siteset"); }}>Settings</Btn>
              <Btn icon="arrowRight" style={{ marginLeft: "auto" }}>Continue</Btn>
            </div>
            <div className="dim fz-11 mt-3">Runs: {s.run_count ?? 0}</div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3"><Eyebrow>Continue where you left off</Eyebrow><Tag>last build</Tag></div>
        <div className="row gap-3">
          <Btn icon="play" kind="primary" onClick={() => onJump?.("builder")}>Resume in Site Builder</Btn>
          <Btn onClick={() => onJump?.("mission")}>Inspect runs</Btn>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenSites });
