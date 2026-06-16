/* Shay Shay — Phase 3 local routing workspace.
   Honest local-first action surface: creates tasks, records learnings,
   reads section context, and never pretends a paid/cloud brain call ran. */

function ScreenShay({ onJump }) {
  const [mode, setMode] = React.useState("Operator");
  const [note, setNote] = React.useState("");
  const [routeTarget, setRouteTarget] = React.useState("research");
  const [routeMsg, setRouteMsg] = React.useState(null);
  const [learningMsg, setLearningMsg] = React.useState(null);
  const [tasks, setTasks] = React.useState([]);
  const [state, setState] = React.useState(null);

  const current = window.__studioCurrentContext || null;

  React.useEffect(() => {
    window.__studioPublishContext?.({
      section: "shay",
      activeId: current?.activeId || null,
      explain: current?.explain || "Shay routes local-first tasks based on the current section context.",
      nextAction: current?.nextAction || null,
      hints: current?.hints || [],
      capabilityTruth: [
        { label: "Local routing", status: "verified", detail: "creates tasks in tasks/tasks.jsonl" },
        { label: "Learning capture", status: "verified", detail: "writes local learning candidates" },
        { label: "Backend chat", status: "pending", detail: "no paid/cloud brain call in Phase 3" },
      ],
    });
    return () => window.__studioPublishContext?.(null);
  }, [current]);

  const refresh = React.useCallback(() => {
    window.WorkflowAPI?.listTasks?.().then((result) => setTasks(Array.isArray(result?.tasks) ? result.tasks.slice(0, 8) : []));
    const tag = window.SiteContext?.getLastActiveTag?.() || null;
    window.WorkflowAPI?.getState?.(tag).then((next) => setState(next || null));
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  const handleRoute = async () => {
    const result = await window.ShayActions?.routeWithPayload(routeTarget, {
      title: `Shay routed work to ${routeTarget}`,
      recommendation: note.trim() || current?.nextAction?.title || `Open ${routeTarget}`,
      source_section: current?.section || "shay",
      source_id: current?.activeId || "",
    });
    setRouteMsg(result?.task ? `task created · ${result.task.task_id}` : "route staged");
    refresh();
    onJump?.(routeTarget);
  };

  const handleLearning = async () => {
    if (!note.trim()) return;
    const result = await window.ShayActions?.captureLearning(current?.section || "shay", note, current?.activeId || '');
    setLearningMsg(result?.stored?.item ? `learning stored · ${result.stored.item.learning_id}` : "learning captured");
    setNote("");
    refresh();
  };

  const densityContext = window.CurrentContext?.forDensity?.(current, mode) || current;
  const hints = Array.isArray(densityContext?.hints) ? densityContext.hints : [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.35fr 360px", gap: 14, height: "100%" }}>
      <Card style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="p-3" style={{ borderBottom: "1px solid var(--hair)", display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar kind="shay" initials="S" />
          <div>
            <div className="fz-13 fw-500">Shay</div>
            <div className="dim fz-11">local routing · no paid backend chat</div>
          </div>
          <div className="seg" style={{ marginLeft: "auto" }}>
            {["Short","Operator","Deep","Next-action"].map((item) => (
              <button key={item} className={mode === item ? "on" : ""} onClick={() => setMode(item)}>{item}</button>
            ))}
          </div>
        </div>

        <div className="p-4" style={{ flex: 1, overflow: "auto" }}>
          <ChatBubble who="shay" meta="local">
            {densityContext?.explain || "Open another section first if you want Shay to explain or route from live context."}
          </ChatBubble>
          {densityContext?.nextAction ? (
            <Card style={{ marginTop: 12 }}>
              <Eyebrow>What should Fritz do next?</Eyebrow>
              <div className="fw-500 fz-13 mt-2">{densityContext.nextAction.title}</div>
              <div className="muted fz-11 mt-2">{densityContext.nextAction.subtitle || "Local next-action summary only."}</div>
            </Card>
          ) : null}

          <Card style={{ marginTop: 12 }}>
            <Eyebrow>Route request</Eyebrow>
            <div className="seg mt-3" style={{ width: "100%" }}>
              {["research","sites","components","media","mission","settings"].map((item) => (
                <button key={item} className={routeTarget === item ? "on" : ""} onClick={() => setRouteTarget(item)}>{item}</button>
              ))}
            </div>
            <textarea className="input mt-3" rows={4} placeholder="What should Fritz do next?" value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="row gap-2 mt-3">
              <Btn icon="arrowUpRight" kind="primary" onClick={handleRoute}>Create task + route</Btn>
              {routeMsg ? <Chip tone="good">{routeMsg}</Chip> : null}
            </div>
          </Card>

          <Card style={{ marginTop: 12 }}>
            <Eyebrow>Learning capture</Eyebrow>
            <div className="muted fz-12 mt-2">Writes a local candidate so Shay can remember what mattered without pretending a remote memory system ran.</div>
            <div className="row gap-2 mt-3">
              <Btn kind="ghost" icon="bookmark" onClick={handleLearning} disabled={!note.trim()}>Record learning</Btn>
              {learningMsg ? <Chip tone="aurora">{learningMsg}</Chip> : null}
            </div>
          </Card>
        </div>
      </Card>

      <div className="col" style={{ gap: 14 }}>
        <Card>
          <div className="between mb-3"><Eyebrow>Context routes</Eyebrow><Tag>{hints.length}</Tag></div>
          <div className="col gap-2">
            {hints.length > 0 ? hints.map((hint, idx) => (
              <div key={idx} className="between panel-flat" style={{ padding: 8 }}>
                <span className="fz-12">{hint.label}</span>
                <Btn kind="ghost" icon="arrowRight" onClick={() => onJump?.(hint.target)}>Open</Btn>
              </div>
            )) : <div className="muted fz-12">No section context published yet.</div>}
          </div>
        </Card>

        <Card>
          <div className="between mb-3"><Eyebrow>Local task queue</Eyebrow><Btn kind="ghost" icon="refresh" onClick={refresh}>Refresh</Btn></div>
          <div className="col gap-2">
            {tasks.length > 0 ? tasks.map((task) => (
              <div key={task.task_id} className="panel-flat" style={{ padding: 8 }}>
                <div className="between">
                  <span className="fz-12">{task.target_section}</span>
                  <Tag>{task.status}</Tag>
                </div>
                <div className="muted fz-11 mt-1">{task.recommendation || task.title || task.task_id}</div>
              </div>
            )) : <div className="muted fz-12">No Studio tasks yet.</div>}
          </div>
        </Card>

        <Card>
          <div className="between mb-3"><Eyebrow>Local state</Eyebrow><Tag>phase 3</Tag></div>
          <div className="col gap-2 fz-12 muted">
            <div>site drafts: {state?.counts?.site_drafts || 0}</div>
            <div>component drafts: {state?.counts?.component_drafts || 0}</div>
            <div>open tasks: {state?.counts?.open_tasks || 0}</div>
            <div>learning candidates: {state?.counts?.learning_candidates || 0}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenShay });
