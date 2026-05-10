/* Site Settings — two-scope: Platform defaults vs This site.
   Read-only V2; both scopes show example fields with honest "not wired" labels.
   Diff visualization wired in a structural way — every field shows a `default`
   badge because no per-site overrides file exists yet. When per-site overrides
   land, the badge will flip to `override` per-row and the SectionHeader chip
   will count them. */

function ScreenSiteSettings() {
  const [scope, setScope] = React.useState("This site");
  const [activeTag, setActiveTag] = React.useState(null);

  // Lane E — currentContext publish
  React.useEffect(() => {
    window.__studioPublishContext?.(window.CurrentContext?.forSection_siteset?.(activeTag) || null);
    return () => window.__studioPublishContext?.(null);
  }, [activeTag]);

  React.useEffect(() => {
    if (window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function") {
      setActiveTag(window.SiteContext.getLastActiveTag());
    }
  }, []);

  // Honest diff state — there is no per-site overrides file yet, so every
  // field reads from platform defaults. When the override file lands, this
  // becomes a real count of differing keys.
  const overrideCount = 0;
  const isThisSite = scope === "This site";
  const titleSuffix = activeTag || "Auntie Gale (placeholder)";

  return (
    <div>
      <SectionHeader
        eyebrow="Site settings"
        title={titleSuffix}
        sub="Two scopes — Platform defaults apply to all new sites; This site overrides apply only here."
        right={[
          <Seg key="sc" items={["Platform defaults","This site"]} value={scope} onChange={setScope} />,
          isThisSite
            ? <Chip key="dc" tone={overrideCount === 0 ? "" : "good"}>{overrideCount} overrides · matches platform</Chip>
            : null,
          <Btn key="rs" kind="ghost" icon="refresh" disabled title="no overrides to reset (per-site file not yet defined)">Reset to platform</Btn>,
          <Btn key="diff" kind="ghost" icon="diff">Show diff vs platform</Btn>,
        ].filter(Boolean)}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <Eyebrow>Models</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Builder model" sub={<span className="mono">default</span>}><Seg items={["sonnet-4.5","opus-4.5","local"]} value="sonnet-4.5" onChange={() => {}} /></Field>
            <Field label="Operator readback model" sub={<span className="mono">default</span>}><Seg items={["haiku-4.5","sonnet-4.5"]} value="haiku-4.5" onChange={() => {}} /></Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Build policy</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Approach" sub={<span className="mono">default</span>}><Seg items={["Template-first","Page-by-page"]} value="Template-first" onChange={() => {}} /></Field>
            <Field label="Component reuse" sub={<span className="mono">default</span>}><Seg items={["Search first","Always create"]} value="Search first" onChange={() => {}} /></Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Media</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Default provider" sub={<span className="mono">default</span>}><Seg items={["Firefly","Imagen","Mid-J","Local"]} value="Firefly" onChange={() => {}} /></Field>
            <Field label="Default ratio" sub={<span className="mono">default</span>}><Seg items={["1:1","4:3","16:10","9:16"]} value="16:10" onChange={() => {}} /></Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Deploy</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Target" sub={<span className="mono">default</span>}><Seg items={["Netlify","Vercel","S3","Manual"]} value="Netlify" onChange={() => {}} /></Field>
            <Field label="Deploy gate" sub={<span className="mono">default</span>}><Seg items={["Manual","Auto on PASS"]} value="Manual" onChange={() => {}} /></Field>
          </div>
        </Card>
      </div>

      <Hint style={{ marginTop: 14 }}>
        Editing a field on this screen would write a per-site overrides file at
        <span className="mono"> sites/&lt;tag&gt;/site-settings.json</span> and flip its row's badge from
        <span className="mono"> default</span> to <span className="mono">override</span>. That write path is not yet wired —
        platform defaults from <span className="mono">studio-config.json</span> + <span className="mono">model-config.json</span>
        also still need a read pass. V2 is display-only; diff structure is in place for when overrides land.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenSiteSettings });
