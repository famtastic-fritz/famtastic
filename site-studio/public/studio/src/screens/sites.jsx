/* Sites — dashboard list. V2 reads from /api/intelligence/sites (via
   window.SitesAPI), persists last-active tag (window.SiteContext),
   filters by a derived honest classification, and offers Grid/List
   views with a real density difference. */

function ScreenSites({ onJump }) {
  const [sites, setSites] = React.useState(null);
  const [filter, setFilter] = React.useState("All");
  const [view, setView] = React.useState("Grid");
  const [resumeTag, setResumeTag] = React.useState(null);

  // Lane E — currentContext publish
  React.useEffect(() => {
    window.__studioPublishContext?.(window.CurrentContext?.forSection_sites?.(resumeTag) || null);
    return () => window.__studioPublishContext?.(null);
  }, [resumeTag]);

  React.useEffect(() => {
    let cancelled = false;
    const load = window.SitesAPI && window.SitesAPI.listSites
      ? window.SitesAPI.listSites()
      : fetch("/api/intelligence/sites").then(r => r.json()).then(d => ({ sites: Array.isArray(d.sites) ? d.sites : [] })).catch(() => ({ sites: [] }));
    Promise.resolve(load).then(d => {
      if (cancelled) return;
      setSites(Array.isArray(d && d.sites) ? d.sites : []);
    });
    return () => { cancelled = true; };
  }, []);

  // Refresh resume tag on mount AND whenever the user navigates back to Sites
  // (this component re-renders inside .fade-up keyed by section).
  React.useEffect(() => {
    if (window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function") {
      setResumeTag(window.SiteContext.getLastActiveTag());
    }
  }, []);

  const placeholderSites = [
    { tag: "site-mbsh-reunion", title: "MBSH Reunion", vertical: "Event · Reunion", run_count: 2, has_intelligence: true, has_dist: true },
    { tag: "site-auntie-gale-garage-sales", title: "Auntie Gale's Garage Sales", vertical: "Local artisan goods", run_count: 1, has_intelligence: true, has_dist: true },
    { tag: "site-hi-tide-harry", title: "Hi-Tide Harry (placeholder)", vertical: "Coastal hardware", run_count: 0, has_intelligence: false, has_dist: false },
  ];
  const usingPlaceholder = !sites || sites.length === 0;
  const list = usingPlaceholder ? placeholderSites : sites;

  // Honest derived status — the API doesn't return a `status` field today.
  // We infer one from signals that DO exist on the listSites payload (or the
  // placeholder set). Surfaced clearly via the Chip's tone + label so it's
  // obvious this is a derived classification, not a server-promised field.
  function deriveStatus(s) {
    if (s && s.has_dist) return "Live";
    if (s && (s.run_count || 0) > 0 && s.has_intelligence) return "Building";
    if (s && s.has_intelligence) return "Design";
    return "Research";
  }

  function statusTone(status) {
    if (status === "Live") return "good";
    if (status === "Building") return "warn";
    if (status === "Design") return "";
    return "";
  }

  const filteredList = list.filter((s) => {
    if (filter === "All") return true;
    return deriveStatus(s) === filter;
  });

  const isGrid = view === "Grid";

  function handleContinue(s) {
    if (window.SiteContext && typeof window.SiteContext.setLastActiveTag === "function" && s && s.tag) {
      window.SiteContext.setLastActiveTag(s.tag);
      setResumeTag(s.tag);
    }
    onJump?.("builder");
  }

  function handleResume() {
    onJump?.("builder");
  }

  return (
    <div>
      <SectionHeader
        eyebrow={`Sites · ${list.length} known`}
        title="Your sites"
        sub="Build new, continue existing, preview, inspect, refine. Local site settings live on each card; platform defaults live in Settings."
        right={[
          <Btn key="ns" icon="plus" kind="primary" onClick={() => onJump?.("builder")}>New site</Btn>,
          <Hint key="nsh" style={{ margin: 0 }}>wizard not wired yet — opens chat builder for now</Hint>,
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

      {filteredList.length === 0 ? (
        <Card><div className="muted fz-12">No sites match filter "{filter}". <span className="dim">(derived classification, not a server field)</span></div></Card>
      ) : (
        <div style={isGrid
          ? { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }
          : { display: "block" }
        }>
          {filteredList.map((s) => {
            const status = deriveStatus(s);
            const fresh = s.last_updated || s.updated_at || null;
            return (
              <Card
                key={s.tag}
                hover
                onClick={() => handleContinue(s)}
                style={isGrid ? undefined : { marginBottom: 10, padding: 14 }}>
                {isGrid ? (
                  <>
                    <div className="between mb-2">
                      <Tag tone="ember">{s.tag}</Tag>
                      <Chip tone={statusTone(status)}>{status.toLowerCase()} · derived</Chip>
                    </div>
                    <div className="h-section">{s.title || s.tag}</div>
                    <div className="muted fz-12 mt-2">{s.vertical || "—"}</div>
                    <div className="row gap-2 mt-3">
                      <Btn kind="ghost" icon="eye">Preview</Btn>
                      <Btn kind="ghost" icon="settings" onClick={(e) => { e.stopPropagation(); handleContinue(s); onJump?.("siteset"); }}>Settings</Btn>
                      <Btn icon="arrowRight" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); handleContinue(s); }}>Continue</Btn>
                    </div>
                    <div className="row gap-2 mt-3" style={{ flexWrap: "wrap" }}>
                      <span className="dim fz-11">Runs: {s.run_count ?? 0}</span>
                      <Chip tone={s.has_intelligence ? "good" : ""}>{s.has_intelligence ? "intel ready" : "no intel"}</Chip>
                      {fresh
                        ? <Chip tone="">updated {String(fresh).slice(0, 10)}</Chip>
                        : <Tag>no freshness</Tag>}
                    </div>
                  </>
                ) : (
                  // List view — denser horizontal row, single column stack of rows
                  <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
                    <Tag tone="ember">{s.tag}</Tag>
                    <div className="grow" style={{ minWidth: 220 }}>
                      <div className="fz-13" style={{ fontWeight: 500 }}>{s.title || s.tag}</div>
                      <div className="dim fz-11">{s.vertical || "—"}</div>
                    </div>
                    <Chip tone={statusTone(status)}>{status.toLowerCase()} · derived</Chip>
                    <Chip tone={s.has_intelligence ? "good" : ""}>{s.has_intelligence ? "intel" : "no intel"}</Chip>
                    {fresh
                      ? <Chip tone="">updated {String(fresh).slice(0, 10)}</Chip>
                      : <Tag>no freshness</Tag>}
                    <span className="dim fz-11 mono">runs {s.run_count ?? 0}</span>
                    <Btn kind="ghost" icon="eye" onClick={(e) => { e.stopPropagation(); }}>Preview</Btn>
                    <Btn kind="ghost" icon="settings" onClick={(e) => { e.stopPropagation(); handleContinue(s); onJump?.("siteset"); }}>Settings</Btn>
                    <Btn icon="arrowRight" onClick={(e) => { e.stopPropagation(); handleContinue(s); }}>Continue</Btn>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3">
          <Eyebrow>Continue where you left off</Eyebrow>
          {resumeTag ? <Tag tone="ember">{resumeTag}</Tag> : <Tag>no prior session</Tag>}
        </div>
        {resumeTag ? (
          <div className="row gap-3">
            <Btn icon="play" kind="primary" onClick={handleResume}>Resume in Site Builder</Btn>
            <Btn onClick={() => onJump?.("mission")}>Inspect runs</Btn>
            <Btn kind="ghost" icon="x" onClick={() => {
              if (window.SiteContext && typeof window.SiteContext.clearLastActiveTag === "function") {
                window.SiteContext.clearLastActiveTag();
                setResumeTag(null);
              }
            }}>Clear</Btn>
          </div>
        ) : (
          <div className="muted fz-12">No prior session yet — open a site above and click Continue to set this.</div>
        )}
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenSites });
