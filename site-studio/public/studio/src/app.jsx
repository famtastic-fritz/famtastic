/* App entry — wires Rail + Topbar + ContextPanel + 12 screens.
   - 12 sections per platform IA (no nested sub-tabs in the rail).
   - URL hash routing (#home, #sites, #builder, …) so deep links + reload work.
   - Each screen can publish a currentContext via window.__studioContext.
   - Some screens own their own right-pane (builder/components/media/shay/mission)
     and we suppress the global ContextPanel for those. */

const SCREENS = {
  home:       { title: "Platform Home",       comp: () => <ScreenHome onJump={window.__studioJump} /> },
  sites:      { title: "Sites",                comp: () => <ScreenSites onJump={window.__studioJump} /> },
  builder:    { title: "Site Builder",         comp: () => <ScreenSiteBuilder /> },
  siteset:    { title: "Site Settings",        comp: () => <ScreenSiteSettings /> },
  thinktank:  { title: "Think-Tank",           comp: () => <ScreenThinkTank /> },
  research:   { title: "Research Center",      comp: () => <ScreenResearch onJump={window.__studioJump} /> },
  components: { title: "Component Studio",     comp: () => <ScreenComponentStudio /> },
  media:      { title: "Media Studio",         comp: () => <ScreenMediaStudio /> },
  library:    { title: "Media Library",        comp: () => <ScreenMediaLibrary /> },
  shay:       { title: "Shay Shay",            comp: () => <ScreenShay /> },
  mission:    { title: "Mission Control",      comp: () => <ScreenMissionControl /> },
  settings:   { title: "Settings",             comp: () => <ScreenSettings /> },
};

const NO_RIGHT_PANEL = new Set(["builder", "components", "media", "shay", "mission"]);

function readHashSection() {
  const h = (location.hash || "").replace(/^#/, "").trim();
  return SCREENS[h] ? h : "home";
}

function App() {
  const [section, setSection] = React.useState(readHashSection());
  const [activeSite] = React.useState("Auntie Gale");
  const [currentContext, setCurrentContext] = React.useState(null);
  const [rightCollapsed, setRightCollapsed] = React.useState(() => {
    try { return localStorage.getItem("studio.rightCollapsed") === "1"; }
    catch (_) { return false; }
  });
  const toggleRightCollapsed = React.useCallback(() => {
    setRightCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem("studio.rightCollapsed", next ? "1" : "0"); }
      catch (_) { /* ignore quota / privacy-mode */ }
      return next;
    });
  }, []);

  // Expose a global jump hook so screens (and the recipe flow) can request navigation
  // without prop drilling. Stable identity by mutating window.
  React.useEffect(() => {
    window.__studioJump = (id) => {
      if (SCREENS[id]) {
        location.hash = id;
      }
    };
    window.__studioPublishContext = (ctx) => setCurrentContext(ctx);
    return () => {
      window.__studioJump = undefined;
      window.__studioPublishContext = undefined;
    };
  }, []);

  // Hash routing: react to hashchange + push hash on rail click
  React.useEffect(() => {
    const onHash = () => setSection(readHashSection());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Reset currentContext on section change so stale context doesn't leak
  React.useEffect(() => {
    setCurrentContext(null);
  }, [section]);

  const select = (id) => { location.hash = id; };
  const Screen = SCREENS[section]?.comp;

  // Topbar site context only applies on screens that have a site
  const siteFor = ["home","sites","builder","siteset","components","media","library","mission"].includes(section) ? activeSite : "—";

  return (
    <div className="app">
      <Rail active={section} onSelect={select} />
      <div className="shell">
        <Topbar section={section} project="FAMtastic" site={siteFor} />

        <div className={`body ${NO_RIGHT_PANEL.has(section) ? "no-right" : ""} ${!NO_RIGHT_PANEL.has(section) && rightCollapsed ? "right-collapsed" : ""}`}>
          <main className="workspace">
            <div className="fade-up" key={section}>
              {Screen ? <Screen /> : <div className="muted">Coming soon.</div>}
            </div>
          </main>
          {!NO_RIGHT_PANEL.has(section) ? (
            <ContextPanel
              section={section}
              currentContext={currentContext}
              collapsed={rightCollapsed}
              onToggle={toggleRightCollapsed}
            />
          ) : null}
        </div>

        <MemoryStrip section={SCREENS[section]?.title || section} site={siteFor} />
      </div>

      <ShayBubble onClick={() => select("shay")} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("studio-root"));
root.render(<App />);
