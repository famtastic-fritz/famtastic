/* Site Settings — two-scope: Platform defaults vs This site.
   Read-only V1; both scopes show example fields with honest "not wired" labels. */

function ScreenSiteSettings() {
  const [scope, setScope] = React.useState("This site");
  return (
    <div>
      <SectionHeader
        eyebrow="Site settings"
        title="Auntie Gale (placeholder)"
        sub="Two scopes — Platform defaults apply to all new sites; This site overrides apply only here."
        right={[
          <Seg key="sc" items={["Platform defaults","This site"]} value={scope} onChange={setScope} />,
          <Btn key="diff" kind="ghost" icon="diff">Show diff vs platform</Btn>,
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <Eyebrow>Models</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Builder model"><Seg items={["sonnet-4.5","opus-4.5","local"]} value="sonnet-4.5" onChange={() => {}} /></Field>
            <Field label="Operator readback model"><Seg items={["haiku-4.5","sonnet-4.5"]} value="haiku-4.5" onChange={() => {}} /></Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Build policy</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Approach"><Seg items={["Template-first","Page-by-page"]} value="Template-first" onChange={() => {}} /></Field>
            <Field label="Component reuse"><Seg items={["Search first","Always create"]} value="Search first" onChange={() => {}} /></Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Media</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Default provider"><Seg items={["Firefly","Imagen","Mid-J","Local"]} value="Firefly" onChange={() => {}} /></Field>
            <Field label="Default ratio"><Seg items={["1:1","4:3","16:10","9:16"]} value="16:10" onChange={() => {}} /></Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Deploy</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Target"><Seg items={["Netlify","Vercel","S3","Manual"]} value="Netlify" onChange={() => {}} /></Field>
            <Field label="Deploy gate"><Seg items={["Manual","Auto on PASS"]} value="Manual" onChange={() => {}} /></Field>
          </div>
        </Card>
      </div>

      <Hint style={{ marginTop: 14 }}>
        Per-site overrides file (e.g. <span className="mono">sites/&lt;tag&gt;/site-settings.json</span>) is not yet defined. Reads from <span className="mono">studio-config.json</span> + <span className="mono">model-config.json</span> are not wired. V1 is display-only.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenSiteSettings });
