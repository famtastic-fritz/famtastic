/* Site Builder — iframe-wraps the existing /index.html?embedded=1 so the
   working chat/build/preview flow keeps working byte-for-byte inside the
   new shell. The wrapper intentionally fills the workspace area. */

function ScreenSiteBuilder() {
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
