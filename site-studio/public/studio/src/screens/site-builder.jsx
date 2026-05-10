/* Site Builder — iframe-wraps the existing /index.html?embedded=1 so the
   working chat/build/preview flow keeps working byte-for-byte inside the
   new shell. The wrapper intentionally fills the workspace area.

   V2 adds an honest status bar above the iframe: last-active tag chip,
   three labeled-not-wired action buttons, and a Local site settings
   shortcut. None of the new buttons are wired to the run controller yet
   — they're visible action contracts. */

function ScreenSiteBuilder() {
  // Lane E — currentContext publish
  const [activeTag, setActiveTag] = React.useState(null);
  const [lastClicked, setLastClicked] = React.useState(null);

  React.useEffect(() => {
    if (window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function") {
      setActiveTag(window.SiteContext.getLastActiveTag());
    }
  }, []);

  function notWired(label) {
    setLastClicked(label);
  }

  function gotoSettings() {
    if (typeof window.__studioJump === "function") {
      window.__studioJump("siteset");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader
        eyebrow="Site Builder"
        title="Chat. Plan. Build. Preview. Refine."
        sub="The existing chat-driven Studio shell is embedded below. Migration into native panes will follow."
        right={[
          <Tag key="lc" tone="ember">embedded · /index.html?embedded=1</Tag>,
          <Btn key="op" kind="ghost" icon="arrowUpRight" onClick={() => window.open("/index.html", "_blank")}>Open standalone</Btn>,
        ]}
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
          <Btn kind="ghost" icon="eye" onClick={() => notWired("Preview")}>Preview</Btn>
          <Tag>not wired</Tag>
          <Btn kind="ghost" icon="search" onClick={() => notWired("Inspect")}>Inspect</Btn>
          <Tag>not wired</Tag>
          <Btn kind="ghost" icon="edit" onClick={() => notWired("Refine")}>Refine</Btn>
          <Tag>contract ready</Tag>
          <Btn kind="ghost" icon="siteCog" onClick={gotoSettings}>Local site settings</Btn>
        </div>
        {lastClicked ? (
          <Hint style={{ marginTop: 10 }}>
            <span className="mono">{lastClicked}</span> — wired in a later pass · see gaps
          </Hint>
        ) : null}
      </Card>

      <div className="embed-wrap" style={{ flex: 1, minHeight: 480 }}>
        <iframe
          src="/index.html?embedded=1"
          title="FAMtastic Site Builder (embedded)"
          allow="clipboard-read; clipboard-write"
        />
      </div>
      <Hint style={{ marginTop: 10 }}>
        Plan-card · Versions · Verify panels — coming after iframe → native migration. The chat WebSocket and plan flow are unchanged.
      </Hint>
    </div>
  );
}

Object.assign(window, { ScreenSiteBuilder });
