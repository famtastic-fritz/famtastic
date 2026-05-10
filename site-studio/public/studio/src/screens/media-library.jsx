/* Media Library — registry view (Lane B).
   V1 reads from /api/media?tag=<active-tag> when a site is selected via
   Lane A's window.SiteContext. Honest empty states when no site or no assets.
   Approval/upload/generate actions stay visible but labeled until wired. */

function ScreenMediaLibrary() {
  const [tag, setTag] = React.useState(null);
  const [registry, setRegistry] = React.useState({ version: 1, assets: [] });
  const [summary, setSummary] = React.useState({ auto: 0, pending: 0, approved: 0, deferred: 0 });
  const [loadState, setLoadState] = React.useState("idle"); // idle | loading | loaded | error
  const [loadError, setLoadError] = React.useState(null);
  const [selectedId, setSelectedId] = React.useState(null);

  // Lane E — currentContext publish
  React.useEffect(() => {
    const count = Array.isArray(registry?.assets) ? registry.assets.length : 0;
    window.__studioPublishContext?.(window.CurrentContext?.forSection_library?.(count, selectedId) || null);
    return () => window.__studioPublishContext?.(null);
  }, [registry, selectedId]);

  React.useEffect(() => {
    const activeTag = (window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function")
      ? window.SiteContext.getLastActiveTag()
      : null;
    setTag(activeTag || null);
    if (!activeTag) {
      setLoadState("loaded");
      return;
    }
    if (!window.MediaAPI || typeof window.MediaAPI.getRegistry !== "function") {
      setLoadState("error");
      setLoadError("MediaAPI client not loaded");
      return;
    }
    setLoadState("loading");
    let cancelled = false;
    window.MediaAPI.getRegistry(activeTag).then((result) => {
      if (cancelled) return;
      if (result && result.error) {
        setLoadError(result.error);
      }
      setRegistry(result && result.registry ? result.registry : { version: 1, assets: [] });
      setSummary(result && result.summary ? result.summary : { auto: 0, pending: 0, approved: 0, deferred: 0 });
      const assets = (result && result.registry && Array.isArray(result.registry.assets)) ? result.registry.assets : [];
      if (assets.length > 0) setSelectedId(assets[0].id);
      setLoadState("loaded");
    });
    return () => { cancelled = true; };
  }, []);

  // Stable hash → seed for MediaTile (deterministic per asset.id)
  const hashSeed = (str) => {
    if (!str) return 0;
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  };

  const approvalTone = (approval) => {
    if (approval === "approved") return "good";
    if (approval === "pending") return "warn";
    if (approval === "auto") return "ember";
    return "";
  };

  const assets = Array.isArray(registry.assets) ? registry.assets : [];
  const selected = assets.find((a) => a && a.id === selectedId) || null;

  return (
    <div>
      <SectionHeader
        eyebrow={tag ? `Media Library · ${tag}` : "Media Library"}
        title="Where every pixel earns a name."
        sub="Provenance, approval, variants, placement, and slot-compatibility per asset. Reads from /api/media when a site is selected."
        right={[
          <Btn key="up" icon="upload" disabled={true} title="not wired yet">Upload</Btn>,
          <Tag key="up-tag">not wired</Tag>,
          <Btn key="gn" icon="zap" kind="primary" disabled={true} title="uses Media Studio shell — generation not wired">Generate new</Btn>,
          <Tag key="gn-tag">not wired · uses Media Studio shell</Tag>,
        ]}
      />

      <Card style={{ marginBottom: 14 }}>
        <div className="row gap-2">
          <input className="input" style={{ maxWidth: 320 }} placeholder="Search by prompt, slot, site…" disabled />
          <Btn kind="ghost" icon="filter" disabled={true} title="not wired">More</Btn>
          <Tag style={{ marginLeft: "auto" }} tone="ember">search · not wired</Tag>
        </div>
      </Card>

      {/* No-site empty state */}
      {!tag ? (
        <Card>
          <Eyebrow>No site selected</Eyebrow>
          <Hint style={{ marginTop: 10 }}>
            Open a site from <span className="mono">Sites</span> to see its Media Library.
            Platform-wide library not wired yet — assets are scoped per site via <span className="mono">/api/media?tag=&lt;site-tag&gt;</span>.
          </Hint>
        </Card>
      ) : null}

      {/* Loading state */}
      {tag && loadState === "loading" ? (
        <Card>
          <Eyebrow>Loading registry…</Eyebrow>
          <Hint style={{ marginTop: 10 }}>Reading <span className="mono">/api/media?tag={tag}</span></Hint>
        </Card>
      ) : null}

      {/* Error state */}
      {tag && loadState === "error" ? (
        <Card>
          <Eyebrow>Could not load registry</Eyebrow>
          <Hint style={{ marginTop: 10 }}>
            <span className="mono">{loadError || "unknown error"}</span>
          </Hint>
        </Card>
      ) : null}

      {/* Loaded — render summary + grid (or empty-state) */}
      {tag && loadState === "loaded" ? (
        <>
          <Card style={{ marginBottom: 14 }}>
            <div className="row gap-2">
              <Chip tone="good">{summary.approved} approved</Chip>
              <Chip tone="warn">{summary.pending} pending</Chip>
              <Chip>{summary.deferred} deferred</Chip>
              <Chip tone="ember">{summary.auto} auto</Chip>
              <Tag style={{ marginLeft: "auto" }}>{assets.length} total</Tag>
            </div>
          </Card>

          <Card style={{ marginBottom: 14 }}>
            <div className="between mb-3">
              <Eyebrow>Missing / deferred · {summary.deferred}</Eyebrow>
              {summary.deferred === 0
                ? <Tag>0 deferred — nothing waiting</Tag>
                : <Chip tone="warn">action needed</Chip>}
            </div>
            {summary.deferred === 0 ? null : (
              <Hint>Deferred assets are listed via the registry once their slots are known. UI surface for resolving deferred slots is not wired yet.</Hint>
            )}
          </Card>

          {/* No-assets empty state */}
          {assets.length === 0 ? (
            <Card>
              <Eyebrow>No assets yet</Eyebrow>
              <Hint style={{ marginTop: 10 }}>
                Generate via Media Studio or Upload. Both actions become real once provider round-trip and upload route land.
              </Hint>
              <div className="row gap-2 mt-3">
                <Btn icon="upload" disabled={true} title="not wired">Upload</Btn>
                <Btn icon="zap" kind="primary" disabled={true} title="not wired · uses Media Studio shell">Generate</Btn>
              </div>
            </Card>
          ) : (
            <Card>
              <div className="between mb-3">
                <Eyebrow>All assets · {assets.length}</Eyebrow>
                <Tag>live · /api/media</Tag>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
                {assets.map((a, i) => {
                  const isSel = selectedId === a.id;
                  return (
                    <div key={a.id || i} className="col gap-2"
                         style={{ cursor: "pointer", outline: isSel ? "1px solid var(--ember)" : "none", borderRadius: 6 }}
                         onClick={() => setSelectedId(a.id)}>
                      <MediaTile
                        seed={hashSeed(a.id || ("idx-" + i))}
                        ratio="1 / 1"
                        label={a.slot || a.id || `asset-${i}`}
                        badge={<Chip tone={approvalTone(a.approval)}>{a.approval || "—"}</Chip>}
                      />
                      <div className="dim fz-11">{a.provider || "—"} · {a.source || "—"}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Provenance / Placement — only when an asset is selected */}
          {selected ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <Card>
                <div className="between mb-3"><Eyebrow>Provenance</Eyebrow><Tag>{selected.id}</Tag></div>
                <div className="col gap-2 fz-12">
                  <div className="between"><span>Source</span><Tag>{selected.source || "—"}</Tag></div>
                  <div className="between"><span>Provider</span><Tag>{selected.provider || "—"}</Tag></div>
                  <div className="between"><span>Slot</span><Tag>{selected.slot || "—"}</Tag></div>
                  <div className="between"><span>Prompt</span><span className="muted" style={{ maxWidth: 260, textAlign: "right" }}>{selected.prompt || "—"}</span></div>
                  <div className="between"><span>Cost</span><span className="dim mono">{typeof selected.cost_usd === "number" ? `$${selected.cost_usd.toFixed(4)}` : "—"}</span></div>
                  <div className="between"><span>Approval</span><Chip tone={approvalTone(selected.approval)}>{selected.approval || "—"}</Chip></div>
                  <div className="between"><span>Created</span><span className="muted">{selected.created_at || "—"}</span></div>
                </div>
              </Card>
              <Card>
                <div className="between mb-3"><Eyebrow>Placement / usage</Eyebrow><Tag>{(selected.placement_pages || []).length} pages</Tag></div>
                <div className="col gap-2 fz-12">
                  {Array.isArray(selected.placement_pages) && selected.placement_pages.length > 0
                    ? selected.placement_pages.map((p, i) => (
                        <div key={i} className="between">
                          <span>{typeof p === "string" ? p : (p && p.page) || JSON.stringify(p)}</span>
                          <Tag>{(p && p.component) || selected.slot || "—"}</Tag>
                        </div>
                      ))
                    : <div className="muted">No placements recorded.</div>}
                </div>
                <div className="divider" />
                <Eyebrow>Variants</Eyebrow>
                <div className="row gap-2 mt-3" style={{ flexWrap: "wrap" }}>
                  {Array.isArray(selected.variants) && selected.variants.length > 0
                    ? selected.variants.map((v, i) => <Tag key={i}>{typeof v === "string" ? v : (v && v.id) || `v${i+1}`}</Tag>)
                    : <span className="muted fz-12">No variants.</span>}
                </div>
              </Card>
            </div>
          ) : null}
        </>
      ) : null}

      <Hint style={{ marginTop: 14 }}>
        Read path is live (<span className="mono">/api/media?tag=…</span>). Upload, generate, send-to-library, and slot-assignment are honest stubs until the round-trip lands. Asset shape is documented at <span className="mono">/api/media/contract</span>.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenMediaLibrary });
