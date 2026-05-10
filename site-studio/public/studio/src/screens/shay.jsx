/* Shay Shay — assistant workspace.
   Two-pane: chat · routing/knowledge. Mode segmented control:
   Short / Operator / Deep / Next-action. Explain-current-screen + route-to. */

function ScreenShay() {
  const [mode, setMode] = React.useState("Operator");
  const routes = [
    { id: "research",   label: "Research Center", chip: "good" },
    { id: "components", label: "Component Studio" },
    { id: "media",      label: "Media Studio" },
    { id: "builder",    label: "Site Builder" },
    { id: "mission",    label: "Mission Control" },
    { id: "thinktank",  label: "Think-Tank" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 360px", gap: 14, height: "100%" }}>
      {/* Chat */}
      <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="p-3" style={{ borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar kind="shay" initials="S" />
          <div>
            <div className="fz-13 fw-500">Shay</div>
            <div className="dim fz-11">Operator · context-aware</div>
          </div>
          <div className="seg" style={{ marginLeft: "auto" }} title="Readback mode">
            {["Short","Operator","Deep","Next-action"].map(m => <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>{m}</button>)}
          </div>
        </div>

        <div className="p-4" style={{ flex: 1, overflow: "auto" }}>
          <ChatBubble who="shay" meta="just now">
            You're on Shay. I can explain any screen, route work to the right section, or summarize a run at four depths. Live brain integration is wired separately — V1 is layout + intent, not full round-trips.
          </ChatBubble>
          <ChatBubble who="fritz" meta="now">
            Take this thread to Research and start a Standard brief on home services local SEO 2026.
          </ChatBubble>
          <ChatBubble who="shay" meta="thinking…">
            Routing this to Research Center. I'll preload the prompt and set depth to <Tag>Standard</Tag>. Confirm or pick a different section.
          </ChatBubble>

          <Card style={{ marginTop: 12 }}>
            <Eyebrow>Suggested next step</Eyebrow>
            <div className="fw-500 fz-13 mt-2">Open Research with prompt preloaded</div>
            <div className="muted fz-11 mt-2">Cost not wired · Brief will save under docs/research/famtastic-studio-execution.</div>
            <div className="row gap-2 mt-3">
              <Btn icon="zap" kind="primary">Run brief</Btn>
              <Btn>Edit prompt first</Btn>
            </div>
          </Card>
        </div>

        <div className="p-3" style={{ borderTop: "1px solid var(--hair)", display: "flex", gap: 8 }}>
          <input className="input" placeholder="Ask Shay anything — she'll route or readback…" />
          <Btn icon="send" kind="primary" />
        </div>
      </Card>

      {/* Routing + knowledge */}
      <div className="col" style={{ gap: 14 }}>
        <Card>
          <Eyebrow>Route this thread to…</Eyebrow>
          <div className="col gap-2 mt-3">
            {routes.map(r => (
              <div key={r.id} className="between panel-flat" style={{ padding: 8 }}>
                <span className="fz-12">{r.label}</span>
                {r.chip ? <Chip tone={r.chip}>recommended</Chip> : <Btn kind="ghost" icon="arrowRight">Route</Btn>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Eyebrow>Explain current screen</Eyebrow>
          <div className="muted fz-12 mt-2">From any other section, ask Shay to explain it. She summarizes layout, current state, and the most useful next action.</div>
          <div className="row gap-2 mt-3">
            <Btn icon="search">Explain</Btn>
            <Btn icon="diff">Compare</Btn>
          </div>
        </Card>

        <Card>
          <div className="between mb-3"><Eyebrow>Knowledge sources</Eyebrow><Tag>auto-loaded</Tag></div>
          <div className="col gap-2 fz-12 muted">
            <div>· FAMTASTIC-STUDIO-PLATFORM-IA-AND-FUNCTIONAL-MAP.md</div>
            <div>· FAMTASTIC-STUDIO-WORKSPACE-RECIPES.md</div>
            <div>· STUDIO-DESIGN-TO-IMPLEMENTATION-PLAN.md</div>
            <div>· STUDIO-DRIFT-CORRECTION-NOTES.md</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenShay });
