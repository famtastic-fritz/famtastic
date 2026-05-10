/* Settings — platform-wide. V1 is read-only displays of the seven groups
   from the IA: Models & providers, Cost & approvals, Media defaults,
   Component defaults, Site defaults, Deployment, Theme & workspace. */

function ScreenSettings() {
  const [group, setGroup] = React.useState("models");

  // Lane E — currentContext publish
  React.useEffect(() => {
    window.__studioPublishContext?.(window.CurrentContext?.forSection_settings?.(group) || null);
    return () => window.__studioPublishContext?.(null);
  }, [group]);

  const groups = [
    { id: "models",     label: "Models & providers", icon: "cube" },
    { id: "cost",       label: "Cost & approvals",   icon: "bolt" },
    { id: "media",      label: "Media defaults",     icon: "media" },
    { id: "components", label: "Component defaults", icon: "components" },
    { id: "sites",      label: "Site defaults",      icon: "sites" },
    { id: "deploy",     label: "Deployment",         icon: "globe" },
    { id: "theme",      label: "Theme & workspace",  icon: "settings" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 14, height: "100%" }}>
      <Card style={{ overflow: "auto" }}>
        <div className="col gap-1">
          {groups.map(g => (
            <div key={g.id}
                 className={`row gap-2 ${group === g.id ? "" : "muted"}`}
                 style={{
                   padding: 8, borderRadius: 6, cursor: "pointer",
                   background: group === g.id ? "oklch(1 0 0 / 0.05)" : undefined,
                 }}
                 onClick={() => setGroup(g.id)}>
              <I name={g.icon} size={14} />
              <span className="fz-12">{g.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ overflow: "auto" }}>
        {group === "models" ? (
          <>
            <SectionHeader eyebrow="Models & providers" title="Pick the brains." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Builder model"><Seg items={["sonnet-4.5","opus-4.5","local-llama"]} value="sonnet-4.5" onChange={() => {}} /></Field>
              <Field label="Operator readback"><Seg items={["haiku-4.5","sonnet-4.5"]} value="haiku-4.5" onChange={() => {}} /></Field>
              <Field label="Web research"><Seg items={["Brave","Google","Bing"]} value="Brave" onChange={() => {}} /></Field>
              <Field label="Image"><Seg items={["Firefly","Imagen","Mid-J","Local"]} value="Firefly" onChange={() => {}} /></Field>
            </div>
            <Hint style={{ marginTop: 12 }}>Source: <span className="mono">site-studio/lib/model-config.json</span>. Read-only in V1.</Hint>
          </>
        ) : group === "cost" ? (
          <>
            <SectionHeader eyebrow="Cost & approvals" title="Spend with intent." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Session cap"><Seg items={["$5","$10","$25","$50"]} value="$50" onChange={() => {}} /></Field>
              <Field label="Confirmation threshold"><Seg items={["$5","$10","$25"]} value="$25" onChange={() => {}} /></Field>
            </div>
            <Hint style={{ marginTop: 12 }}>Cost-cap is real (<span className="mono">$50</span> in <span className="mono">intelligence-writer.js</span>). Editing not wired in V1.</Hint>
          </>
        ) : group === "media" ? (
          <>
            <SectionHeader eyebrow="Media defaults" title="Pixels with provenance." />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label="Default provider"><Seg items={["Firefly","Imagen","Mid-J","Local"]} value="Firefly" onChange={() => {}} /></Field>
              <Field label="Default ratio"><Seg items={["1:1","4:3","16:10","16:9","9:16"]} value="16:10" onChange={() => {}} /></Field>
              <Field label="Default variations"><Seg items={["2","4","6","8"]} value="6" onChange={() => {}} /></Field>
            </div>
          </>
        ) : group === "components" ? (
          <>
            <SectionHeader eyebrow="Component defaults" title="Reuse first." />
            <Field label="Reuse policy"><Seg items={["Search first","Always create"]} value="Search first" onChange={() => {}} /></Field>
            <div className="mt-3"><Field label="Default divider"><Seg items={["wave","tilt","peak","arch"]} value="peak" onChange={() => {}} /></Field></div>
          </>
        ) : group === "sites" ? (
          <>
            <SectionHeader eyebrow="Site defaults" title="Defaults that apply to every new site." />
            <Field label="Approach"><Seg items={["Template-first","Page-by-page"]} value="Template-first" onChange={() => {}} /></Field>
          </>
        ) : group === "deploy" ? (
          <>
            <SectionHeader eyebrow="Deployment" title="How sites go live." />
            <Field label="Default target"><Seg items={["Netlify","Vercel","S3","Manual"]} value="Netlify" onChange={() => {}} /></Field>
            <div className="mt-3"><Field label="Auto-deploy on PASS"><Seg items={["off","on"]} value="off" onChange={() => {}} /></Field></div>
          </>
        ) : (
          <>
            <SectionHeader eyebrow="Theme & workspace" title="Set the room." />
            <div className="muted fz-12">The Studio shell theme is fixed for V1 (Claude-Design "coming out of darkness"). Switching themes is a future-pass concern.</div>
            <Hint style={{ marginTop: 12 }}>Tokens live in <span className="mono">/studio/styles.css</span> scoped under <span className="mono">.studio-shell</span>. Legacy <span className="mono">operator.css</span> is unaffected.</Hint>
          </>
        )}
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenSettings });
