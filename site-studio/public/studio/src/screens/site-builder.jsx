/* Site Builder — iframe-wraps the existing /index.html?embedded=1 so the
   working chat/build/preview flow keeps working byte-for-byte inside the
   new shell.

   Phase 1: Preview / Inspect / Refine buttons now call window.SitesActions
   helpers and postMessage into the embedded iframe. Refine opens an inline
   single-input row; submit fires the contract; cancel collapses it.
   After each action a Chip tone="good" "action issued · <intent>" shows in
   the section header right slot for ~3 seconds. */

function ScreenSiteBuilder() {
  const [activeTag, setActiveTag] = React.useState(null);
  // Feedback chip: { intent, ts } or null
  const [actionFeedback, setActionFeedback] = React.useState(null);
  // Refine inline input state
  const [refineOpen, setRefineOpen] = React.useState(false);
  const [refineValue, setRefineValue] = React.useState("");

  React.useEffect(() => {
    if (window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function") {
      setActiveTag(window.SiteContext.getLastActiveTag());
    }
  }, []);

  function getTag() {
    return activeTag || (window.SiteContext?.getLastActiveTag?.() || null);
  }

  // Show action feedback chip for ~3 seconds then clear.
  function flashFeedback(contract) {
    if (!contract) return;
    const ts = contract.issued_at
      ? contract.issued_at.slice(11, 19)  // HH:MM:SS
      : new Date().toISOString().slice(11, 19);
    setActionFeedback({ intent: contract.intent, ts });
    setTimeout(() => setActionFeedback(null), 3000);
  }

  function handlePreview() {
    const contract = window.SitesActions
      ? window.SitesActions.preview(getTag())
      : null;
    flashFeedback(contract);
  }

  function handleInspect() {
    const contract = window.SitesActions
      ? window.SitesActions.inspect(null)
      : null;
    flashFeedback(contract);
  }

  function handleRefineOpen() {
    setRefineOpen(true);
    setRefineValue("");
  }

  function handleRefineCancel() {
    setRefineOpen(false);
    setRefineValue("");
  }

  function handleRefineSubmit() {
    if (!refineValue.trim()) return;
    const contract = window.SitesActions
      ? window.SitesActions.refine(refineValue.trim())
      : null;
    flashFeedback(contract);
    setRefineOpen(false);
    setRefineValue("");
  }

  function handleRefineKey(e) {
    if (e.key === "Enter") handleRefineSubmit();
    if (e.key === "Escape") handleRefineCancel();
  }

  function gotoSettings() {
    const contract = window.SitesActions
      ? window.SitesActions.openSiteSettings(getTag())
      : null;
    flashFeedback(contract);
    if (!contract && typeof window.__studioJump === "function") {
      window.__studioJump("siteset");
    }
  }

  function gotoPlatformDefaults() {
    const contract = window.SitesActions
      ? window.SitesActions.openPlatformDefaults()
      : null;
    flashFeedback(contract);
    if (!contract && typeof window.__studioJump === "function") {
      window.__studioJump("settings");
    }
  }

  const feedbackChip = actionFeedback
    ? <Chip key="af" tone="good">action issued · {actionFeedback.intent} · {actionFeedback.ts}</Chip>
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader
        eyebrow="Site Builder"
        title="Chat. Plan. Build. Preview. Refine."
        sub="The existing chat-driven Studio shell is embedded below. Migration into native panes will follow."
        right={[
          feedbackChip,
          <Tag key="lc" tone="ember">embedded · /index.html?embedded=1</Tag>,
          <Btn key="op" kind="ghost" icon="arrowUpRight" onClick={() => window.open("/index.html", "_blank")}>Open standalone</Btn>,
        ].filter(Boolean)}
      />

      {/* Honest status bar — single source of truth for what the user is working on. */}
      <Card style={{ marginBottom: 10 }}>
        <div className="row gap-2" style={{ flexWrap: "wrap" }}>
          {activeTag
            ? <Tag tone="ember">{activeTag}</Tag>
            : <Tag>no site selected — open one from Sites</Tag>}
          <Chip tone="good">chat WS · embedded</Chip>
          <Chip tone="">preview · iframe</Chip>
          <Chip tone="warn">verify · placeholder</Chip>
          <span className="grow" />
          <Btn kind="ghost" icon="eye" onClick={handlePreview}>Preview</Btn>
          <Btn kind="ghost" icon="search" onClick={handleInspect}>Inspect</Btn>
          {refineOpen ? null : (
            <Btn kind="ghost" icon="edit" onClick={handleRefineOpen}>Refine</Btn>
          )}
          <Btn kind="ghost" icon="siteCog" onClick={gotoSettings}>Local site settings</Btn>
          <Btn kind="ghost" onClick={gotoPlatformDefaults}>Platform defaults</Btn>
        </div>

        {/* Refine inline input row — appears when Refine is clicked. */}
        {refineOpen ? (
          <div className="row gap-2" style={{ marginTop: 10 }}>
            <input
              autoFocus
              className="mono"
              style={{
                flex: 1,
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid oklch(1 0 0 / 0.12)",
                borderRadius: 6,
                padding: "6px 10px",
                fontSize: 13,
                color: "var(--ink-1)",
                outline: "none",
              }}
              placeholder="Describe the refinement (e.g. tighten the hero copy, adjust colors) …"
              value={refineValue}
              onChange={e => setRefineValue(e.target.value)}
              onKeyDown={handleRefineKey}
            />
            <Btn kind="primary" onClick={handleRefineSubmit} disabled={!refineValue.trim()}>Send</Btn>
            <Btn kind="ghost" icon="x" onClick={handleRefineCancel}>Cancel</Btn>
          </div>
        ) : null}

        {/* Target-picker hint for Inspect — deferred to a later pass. */}
        <Hint style={{ marginTop: 8 }}>
          Preview and Inspect post action contracts to the embedded builder · target-picker for Inspect is a later pass · Refine opens an inline input above.
        </Hint>
      </Card>

      <div className="embed-wrap" style={{ flex: 1, minHeight: 480 }}>
        <iframe
          src="/index.html?embedded=1"
          title="FAMtastic Site Builder (embedded)"
          allow="clipboard-read; clipboard-write"
        />
      </div>
      <Hint style={{ marginTop: 10 }}>
        Plan-card · Versions · Verify panels — coming after iframe to native migration. The chat WebSocket and plan flow are unchanged.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenSiteBuilder });
