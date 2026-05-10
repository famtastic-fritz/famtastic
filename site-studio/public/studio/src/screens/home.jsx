/* Home — platform command center.
   First pass: live "what's running / what to do next" cards plus the
   embedded RecipeFlow so the cross-section visual workflow is visible. */

function ScreenHome({ onJump }) {
  return (
    <div>
      <SectionHeader
        eyebrow="Platform · Home"
        title="What's running, what's next."
        sub="Twelve sections. One operator. Mission Control is one tile, not the whole studio."
        right={[
          <Btn key="ns" icon="plus">New site</Btn>,
          <Btn key="nb" icon="spark" kind="primary">New build</Btn>,
        ]}
      />

      {/* Visual recipe flow — drillable */}
      <Card style={{ marginBottom: 14 }}>
        <RecipeFlow onJump={onJump} />
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <Card>
          <div className="between mb-3">
            <Eyebrow>Most likely next</Eyebrow>
            <Chip tone="ember">recommended</Chip>
          </div>
          <div className="h-section">Resume Auntie Gale · /shop regen</div>
          <div className="muted fz-12 mt-2">Two slots deferred for art. Component lib has 3 candidates. Run `rn-92a`.</div>
          <div className="row gap-2 mt-3">
            <Btn icon="play" kind="primary" onClick={() => onJump?.("builder")}>Resume in Builder</Btn>
            <Btn onClick={() => onJump?.("mission")}>See run</Btn>
          </div>
          <Hint style={{ marginTop: 10 }}>Live "next-action" not wired — placeholder copy. Source: docs/research/famtastic-studio-execution.</Hint>
        </Card>

        <Card>
          <div className="between mb-3"><Eyebrow>Pending approval</Eyebrow><Chip tone="warn">2 items</Chip></div>
          <div className="col gap-3">
            <div className="between">
              <div>
                <div className="fz-13">Cost gate · $26.40 / $25 cap</div>
                <div className="dim fz-11">media-studio · firefly · 6 variants</div>
              </div>
              <Btn icon="check">Review</Btn>
            </div>
            <div className="between">
              <div>
                <div className="fz-13">Component promote · v0.4 → locked</div>
                <div className="dim fz-11">fam-hero-layered</div>
              </div>
              <Btn icon="check">Review</Btn>
            </div>
          </div>
          <Hint style={{ marginTop: 10 }}>Approvals view not wired — placeholder data.</Hint>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 14 }}>
        <Card hover onClick={() => onJump?.("sites")}>
          <div className="between mb-2"><Eyebrow>Recent sites</Eyebrow><Btn kind="ghost" icon="arrowRight">All</Btn></div>
          <div className="col gap-2">
            {["Auntie Gale", "Hi-Tide Harry", "MBSH Reunion"].map(s => (
              <div key={s} className="between">
                <div className="row gap-2"><Dot tone="ember" /><span className="fz-12">{s}</span></div>
                <Tag>preview</Tag>
              </div>
            ))}
          </div>
          <Hint style={{ marginTop: 10 }}>Live sites list will read from /api/intelligence/sites.</Hint>
        </Card>
        <Card hover onClick={() => onJump?.("components")}>
          <div className="between mb-2"><Eyebrow>Recent components</Eyebrow><Btn kind="ghost" icon="arrowRight">Library</Btn></div>
          <div className="col gap-2">
            {["fam-hero-layered v2.1","product-card-garage v1.4","starburst-badge v1.0"].map(s => (
              <div key={s} className="between">
                <span className="fz-12">{s}</span>
                <Chip tone="good">in use</Chip>
              </div>
            ))}
          </div>
          <Hint style={{ marginTop: 10 }}>Source: components/library.json.</Hint>
        </Card>
        <Card hover onClick={() => onJump?.("library")}>
          <div className="between mb-2"><Eyebrow>Recent media</Eyebrow><Btn kind="ghost" icon="arrowRight">Library</Btn></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[1,2,3,4,5,6].map(i => <MediaTile key={i} seed={i*7} ratio="1 / 1" label={`pl-${i}`} />)}
          </div>
          <Hint style={{ marginTop: 10 }}>Live media tail will read from public/img and the asset registry.</Hint>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <Card hover onClick={() => onJump?.("research")}>
          <div className="between mb-2"><Eyebrow>Worth your attention</Eyebrow><Btn kind="ghost" icon="arrowRight">Research</Btn></div>
          <div className="h-section">3 opportunities in 'home services local SEO 2026'</div>
          <div className="muted fz-12 mt-2">Brief drafted by Shay. Promote any to a site/component/media task.</div>
          <Hint style={{ marginTop: 10 }}>Source: docs/research/famtastic-studio-execution/03-gap-and-opportunity-map.md.</Hint>
        </Card>
        <Card hover onClick={() => onJump?.("mission")}>
          <div className="between mb-2"><Eyebrow>Mission Control</Eyebrow><Btn kind="ghost" icon="arrowRight">Open</Btn></div>
          <div className="row gap-3">
            <div className="col"><span className="dim fz-11">Active runs</span><span className="h-section">—</span></div>
            <div className="vdivider" />
            <div className="col"><span className="dim fz-11">Blockers</span><span className="h-section">—</span></div>
            <div className="vdivider" />
            <div className="col"><span className="dim fz-11">Today's spend</span><span className="h-section mono">—</span></div>
          </div>
          <Hint style={{ marginTop: 10 }}>Numbers will read from /api/intelligence and /api/ops on the next pass.</Hint>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenHome });
