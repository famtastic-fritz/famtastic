/* Media Library — registry view. V1 is a placeholder grid with provenance,
   approval, placement, and compatible-components fields. */

function ScreenMediaLibrary() {
  const tiles = Array.from({ length: 24 }, (_, i) => {
    const slot = i % 6 === 0 ? "missing" : i % 5 === 0 ? "review" : "approved";
    const usage = i % 4 === 0 ? "unused" : i % 3 === 0 ? "in 1 site" : "in 2 sites";
    const provider = ["firefly","imagen","mid-j","local"][i % 4];
    return { seed: 100 + i, slot, usage, provider };
  });

  return (
    <div>
      <SectionHeader
        eyebrow="Media Library · placeholder index"
        title="Where every pixel earns a name."
        sub="Provenance, approval, variants, placement, and slot-compatibility per asset. Reads from public/img/ + asset-registry once wired."
        right={[
          <Btn key="up" icon="upload">Upload</Btn>,
          <Btn key="gn" icon="zap" kind="primary">Generate new</Btn>,
        ]}
      />

      <Card style={{ marginBottom: 14 }}>
        <div className="row gap-2">
          <input className="input" style={{ maxWidth: 320 }} placeholder="Search by prompt, slot, site…" />
          <Btn kind="ghost" icon="filter">More</Btn>
        </div>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <div className="between mb-3"><Eyebrow>Missing / deferred · 4 (placeholder)</Eyebrow><Chip tone="warn">action needed</Chip></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[0,1,2,3].map(i => (
            <div key={i} className="panel-flat" style={{ padding: 8 }}>
              <Slot>missing · slot-{i+1}</Slot>
              <div className="row gap-2 mt-2">
                <Btn kind="ghost" icon="upload">Upload</Btn>
                <Btn icon="zap">Generate</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="between mb-3"><Eyebrow>All assets · {tiles.length} (placeholder)</Eyebrow><Tag>placeholder</Tag></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {tiles.map((t, i) => (
            <div key={t.seed} className="col gap-2">
              <MediaTile seed={t.seed} ratio="1 / 1" label={`pl-${i}`}
                badge={<Chip tone={t.slot === "approved" ? "good" : t.slot === "review" ? "warn" : "crit"}>{t.slot}</Chip>} />
              <div className="dim fz-11">{t.provider} · {t.usage}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <Card>
          <div className="between mb-3"><Eyebrow>Provenance</Eyebrow><Tag>example</Tag></div>
          <div className="col gap-2 fz-12">
            <div className="between"><span>Kind</span><Tag>generated</Tag></div>
            <div className="between"><span>Provider</span><Tag>firefly</Tag></div>
            <div className="between"><span>Prompt</span><span className="muted">amber dusk lawn, low sun…</span></div>
            <div className="between"><span>Cost</span><span className="dim mono">not wired</span></div>
            <div className="between"><span>Approved by</span><span className="muted">fritz · 2026-05-09</span></div>
          </div>
        </Card>
        <Card>
          <div className="between mb-3"><Eyebrow>Placement / usage</Eyebrow><Tag>example</Tag></div>
          <div className="col gap-2 fz-12">
            <div className="between"><span>auntie-gale / home / hero</span><Tag>fam-hero-layered v2.1</Tag></div>
            <div className="between"><span>auntie-gale / shop / promo</span><Tag>feature-strip v0.9</Tag></div>
          </div>
          <div className="divider" />
          <Eyebrow>Compatible components</Eyebrow>
          <div className="row gap-2 mt-3" style={{ flexWrap: "wrap" }}>
            {["fam-hero-layered","product-grid","feature-strip","starburst-badge"].map(c => <Tag key={c}>{c}</Tag>)}
          </div>
        </Card>
      </div>

      <Hint style={{ marginTop: 14 }}>
        V1 is fully placeholder data. The asset-registry index file (per <span className="mono">FAMTASTIC-MEDIA-LIBRARY-ASSET-REGISTRY-SPEC.md</span>) is not generated yet. Provenance/cost/approval/placement become real once the registry materializes.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenMediaLibrary });
