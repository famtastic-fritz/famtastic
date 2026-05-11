/* Sites — dashboard list. V2 reads from /api/intelligence/sites (via
   window.SitesAPI), persists last-active tag (window.SiteContext),
   filters by a derived honest classification, and offers Grid/List
   views with a real density difference.

   Phase 1: action buttons now call window.SitesActions helpers and
   surface Chip feedback ("action issued · <intent>") in the section
   header for ~3 seconds. No silent failures. */

function relativeTime(iso) {
  if (!iso) return '—';
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const sec = Math.max(0, Math.floor((now - then) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    return iso.slice(0, 10); // YYYY-MM-DD
  } catch (_e) { return '—'; }
}

function ScreenSites({ onJump }) {
  const [sites, setSites] = React.useState(null);
  const [drafts, setDrafts] = React.useState([]);
  const [filter, setFilter] = React.useState("All");
  const [view, setView] = React.useState("Grid");
  const [resumeTag, setResumeTag] = React.useState(null);
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const [draftMsg, setDraftMsg] = React.useState(null);
  const [wizard, setWizard] = React.useState({
    site_name: "",
    site_tag: "site-",
    site_type: "marketing",
    goal: "",
    starting_recipe: "New Site",
    notes: "",
  });
  // Feedback chip: { intent, ts } or null
  const [actionFeedback, setActionFeedback] = React.useState(null);
  // Per-card preview note state: tag or null
  const [previewNoteTag, setPreviewNoteTag] = React.useState(null);

  // Lane E — currentContext publish
  React.useEffect(() => {
    window.__studioPublishContext?.(window.CurrentContext?.forSection_sites?.(resumeTag) || null);
    return () => window.__studioPublishContext?.(null);
  }, [resumeTag]);

  React.useEffect(() => {
    let cancelled = false;
    const load = window.SitesAPI && window.SitesAPI.listSites
      ? window.SitesAPI.listSites()
      : fetch("/api/intelligence/sites").then(r => r.json()).then(d => ({ sites: Array.isArray(d.sites) ? d.sites : [] })).catch(() => ({ sites: [] }));
    Promise.resolve(load).then(d => {
      if (cancelled) return;
      setSites(Array.isArray(d && d.sites) ? d.sites : []);
    });
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    let alive = true;
    window.WorkflowAPI?.listSiteDrafts?.().then((result) => {
      if (!alive) return;
      setDrafts(Array.isArray(result?.drafts) ? result.drafts : []);
    });
    return () => { alive = false; };
  }, []);

  // Refresh resume tag on mount AND whenever the user navigates back to Sites.
  React.useEffect(() => {
    if (window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function") {
      setResumeTag(window.SiteContext.getLastActiveTag());
    }
  }, []);

  // Show action feedback chip for ~3 seconds then clear.
  function flashFeedback(contract) {
    if (!contract) return;
    const ts = contract.issued_at
      ? contract.issued_at.slice(11, 19)  // HH:MM:SS
      : new Date().toISOString().slice(11, 19);
    setActionFeedback({ intent: contract.intent, ts });
    setTimeout(() => setActionFeedback(null), 3000);
  }

  const placeholderSites = [
    { tag: "site-mbsh-reunion", title: "MBSH Reunion", vertical: "Event · Reunion", run_count: 2, has_intelligence: true, has_dist: true },
    { tag: "site-auntie-gale-garage-sales", title: "Auntie Gale's Garage Sales", vertical: "Local artisan goods", run_count: 1, has_intelligence: true, has_dist: true },
    { tag: "site-hi-tide-harry", title: "Hi-Tide Harry (placeholder)", vertical: "Coastal hardware", run_count: 0, has_intelligence: false, has_dist: false },
  ];
  const usingPlaceholder = !sites || sites.length === 0;
  const list = usingPlaceholder ? placeholderSites : sites;

  // Honest derived status — the API doesn't return a `status` field today.
  function deriveStatus(s) {
    if (s && s.has_dist) return "Live";
    if (s && (s.run_count || 0) > 0 && s.has_intelligence) return "Building";
    if (s && s.has_intelligence) return "Design";
    return "Research";
  }

  function statusTone(status) {
    if (status === "Live") return "good";
    if (status === "Building") return "warn";
    return "";
  }

  const filteredList = list.filter((s) => {
    if (filter === "All") return true;
    return deriveStatus(s) === filter;
  });

  const isGrid = view === "Grid";

  // Action handlers — all go through SitesActions.
  function handleContinue(s) {
    if (!s || !s.tag) return;
    const contract = window.SitesActions
      ? window.SitesActions.continueSite(s.tag)
      : null;
    if (!contract) {
      // Fallback if SitesActions not yet loaded.
      if (window.SiteContext && typeof window.SiteContext.setLastActiveTag === "function") {
        window.SiteContext.setLastActiveTag(s.tag);
      }
      setResumeTag(s.tag);
      onJump?.("builder");
      return;
    }
    setResumeTag(s.tag);
    flashFeedback(contract);
  }

  function handlePreview(e, s) {
    e.stopPropagation();
    if (!s || !s.tag) return;
    const contract = window.SitesActions
      ? window.SitesActions.preview(s.tag)
      : null;
    flashFeedback(contract);
    setPreviewNoteTag(s.tag);
    setTimeout(() => setPreviewNoteTag(prev => prev === s.tag ? null : prev), 5000);
  }

  function handleSettings(e, s) {
    e.stopPropagation();
    if (!s || !s.tag) return;
    const contract = window.SitesActions
      ? window.SitesActions.openSiteSettings(s.tag)
      : null;
    // Also update local resume tag so settings screen shows the right site.
    if (window.SiteContext) setResumeTag(window.SiteContext.getLastActiveTag?.() || s.tag);
    flashFeedback(contract);
  }

  function handleResume() {
    if (!resumeTag) return;
    const contract = window.SitesActions
      ? window.SitesActions.continueSite(resumeTag)
      : null;
    flashFeedback(contract);
    if (!contract) onJump?.("builder");
  }

  function handleNewSite() {
    setWizardOpen((open) => !open);
    setDraftMsg(null);
  }

  function updateWizard(key, value) {
    setWizard((prev) => ({ ...prev, [key]: value }));
  }

  async function handleStageDraft() {
    setDraftMsg(null);
    const payload = {
      ...wizard,
      site_tag: String(wizard.site_tag || '').toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    };
    const result = await window.WorkflowAPI?.createSiteDraft?.(payload);
    if (result && result.ok) {
      setDraftMsg({ ok: true, text: `draft staged · ${result.draft.site_tag}` });
      setDrafts((prev) => [result.draft, ...prev.filter((item) => item.site_tag !== result.draft.site_tag)]);
      setResumeTag(result.draft.site_tag);
      window.SiteContext?.setLastActiveTag?.(result.draft.site_tag);
      setWizardOpen(false);
    } else {
      setDraftMsg({ ok: false, text: result?.error || 'draft staging failed' });
    }
  }

  const feedbackChip = actionFeedback
    ? <Chip key="af" tone="good">action issued · {actionFeedback.intent} · {actionFeedback.ts}</Chip>
    : null;

  return (
    <div>
      <SectionHeader
        eyebrow={`Sites · ${list.length} known`}
        title="Your sites"
        sub="Build new, continue existing, preview, inspect, refine. Local site settings live on each card; platform defaults live in Settings."
        right={[
          feedbackChip,
          <Btn key="ns" icon="plus" kind="primary" onClick={handleNewSite}>New site</Btn>,
          draftMsg ? <Chip key="dm" tone={draftMsg.ok ? "good" : "crit"}>{draftMsg.text}</Chip> : null,
          <Btn key="im" icon="upload">Import existing</Btn>,
          <Btn key="tt" icon="brain" onClick={() => onJump?.("thinktank")}>Start in Think-Tank</Btn>,
        ].filter(Boolean)}
      />

      {wizardOpen ? (
        <Card style={{ marginBottom: 14 }}>
          <Eyebrow>New Site wizard</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <Field label="Site name"><input className="input" placeholder="Site name" value={wizard.site_name} onChange={(e) => updateWizard("site_name", e.target.value)} /></Field>
            <Field label="Site tag"><input className="input" placeholder="site-your-tag" value={wizard.site_tag} onChange={(e) => updateWizard("site_tag", e.target.value)} /></Field>
            <Field label="Site type"><input className="input" placeholder="marketing" value={wizard.site_type} onChange={(e) => updateWizard("site_type", e.target.value)} /></Field>
            <Field label="Starting recipe"><input className="input" placeholder="New Site" value={wizard.starting_recipe} onChange={(e) => updateWizard("starting_recipe", e.target.value)} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <Field label="Goal / purpose"><textarea className="input" placeholder="Goal / purpose" rows={4} value={wizard.goal} onChange={(e) => updateWizard("goal", e.target.value)} /></Field>
            <Field label="Optional notes"><textarea className="input" placeholder="Optional notes" rows={4} value={wizard.notes} onChange={(e) => updateWizard("notes", e.target.value)} /></Field>
          </div>
          <div className="row gap-2 mt-3">
            <Btn kind="primary" icon="check" onClick={handleStageDraft} disabled={!wizard.site_name.trim() || !wizard.site_tag.trim()}>Stage local draft</Btn>
            <Btn kind="ghost" onClick={() => setWizardOpen(false)}>Close</Btn>
            <Tag tone="warn">safe path · sites/_drafts/&lt;tag&gt;/draft.json</Tag>
          </div>
          <Hint style={{ marginTop: 10 }}>
            Safe tags must match <span className="mono">site-&lt;slug&gt;</span>. If a live site already exists, this still stages a draft instead of mutating production.
          </Hint>
        </Card>
      ) : null}

      <Card style={{ marginBottom: 14 }}>
        <div className="between">
          <div className="seg">
            {["All","Live","Building","Design","Research"].map(f => (
              <button key={f} className={filter === f ? "on" : ""} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="row gap-2">
            <Seg items={["Grid","List"]} value={view} onChange={setView} />
          </div>
        </div>
      </Card>

      {usingPlaceholder ? (
        <Hint style={{ marginBottom: 14 }}>Live /api/intelligence/sites returned empty in this environment — showing placeholder set.</Hint>
      ) : null}

      {drafts.length > 0 ? (
        <Card style={{ marginBottom: 14 }}>
          <div className="between mb-3">
            <Eyebrow>Staged local drafts</Eyebrow>
            <Tag>{drafts.length}</Tag>
          </div>
          <div className="col gap-2">
            {drafts.slice(0, 6).map((draft) => (
              <div key={draft.site_tag} className="between panel-flat" style={{ padding: 10 }}>
                <div>
                  <div className="fz-12 fw-500">{draft.site_name}</div>
                  <div className="dim fz-11">{draft.site_tag} · {draft.site_type || "—"} · {draft.starting_recipe || "—"}</div>
                </div>
                <div className="row gap-2">
                  <Tag tone="warn">draft</Tag>
                  <Btn kind="ghost" onClick={() => { window.SiteContext?.setLastActiveTag?.(draft.site_tag); setResumeTag(draft.site_tag); onJump?.("builder"); }}>Continue in Builder</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {filteredList.length === 0 ? (
        <Card><div className="muted fz-12">No sites match filter "{filter}". <span className="dim">(derived classification, not a server field)</span></div></Card>
      ) : (
        <div style={isGrid
          ? { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }
          : { display: "block" }
        }>
          {filteredList.map((s) => {
            const status = deriveStatus(s);
            return (
              <Card
                key={s.tag}
                hover
                onClick={() => handleContinue(s)}
                style={isGrid ? undefined : { marginBottom: 10, padding: 14 }}>
                {isGrid ? (
                  <>
                    <div className="between mb-2">
                      <Tag tone="ember">{s.tag}</Tag>
                      <Chip tone={statusTone(status)}>{status.toLowerCase()} · derived</Chip>
                    </div>
                    <div className="h-section">{s.title || s.tag}</div>
                    <div className="muted fz-12 mt-2">{s.vertical || "—"}</div>
                    <div className="row gap-2 mt-3">
                      <Btn kind="ghost" icon="eye" onClick={(e) => handlePreview(e, s)}>Preview</Btn>
                      <Btn kind="ghost" icon="settings" onClick={(e) => handleSettings(e, s)}>Settings</Btn>
                      <Btn icon="arrowRight" style={{ marginLeft: "auto" }} onClick={(e) => { e.stopPropagation(); handleContinue(s); }}>Continue</Btn>
                    </div>
                    {previewNoteTag === s.tag ? (
                      <Hint style={{ marginTop: 8 }}>
                        previewing in builder · <Btn kind="ghost" onClick={(e) => { e.stopPropagation(); onJump?.("builder"); }}>open Site Builder</Btn>
                      </Hint>
                    ) : null}
                    <div className="row gap-2 mt-3" style={{ flexWrap: "wrap" }}>
                      <span className="dim fz-11">Runs: {s.run_count ?? 0}</span>
                      <Chip tone={s.has_intelligence ? "good" : ""}>{s.has_intelligence ? "intel ready" : "no intel"}</Chip>
                      {s.updated_at
                        ? <Tag>{relativeTime(s.updated_at)}</Tag>
                        : <Tag>no freshness</Tag>}
                    </div>
                  </>
                ) : (
                  // List view — denser horizontal row
                  <div className="row" style={{ gap: 14, flexWrap: "wrap" }}>
                    <Tag tone="ember">{s.tag}</Tag>
                    <div className="grow" style={{ minWidth: 220 }}>
                      <div className="fz-13" style={{ fontWeight: 500 }}>{s.title || s.tag}</div>
                      <div className="dim fz-11">{s.vertical || "—"}</div>
                    </div>
                    <Chip tone={statusTone(status)}>{status.toLowerCase()} · derived</Chip>
                    <Chip tone={s.has_intelligence ? "good" : ""}>{s.has_intelligence ? "intel" : "no intel"}</Chip>
                    {s.updated_at
                      ? <Tag>{relativeTime(s.updated_at)}</Tag>
                      : <Tag>no freshness</Tag>}
                    <span className="dim fz-11 mono">runs {s.run_count ?? 0}</span>
                    <Btn kind="ghost" icon="eye" onClick={(e) => handlePreview(e, s)}>Preview</Btn>
                    <Btn kind="ghost" icon="settings" onClick={(e) => handleSettings(e, s)}>Settings</Btn>
                    <Btn icon="arrowRight" onClick={(e) => { e.stopPropagation(); handleContinue(s); }}>Continue</Btn>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Card style={{ marginTop: 14 }}>
        <div className="between mb-3">
          <Eyebrow>Continue where you left off</Eyebrow>
          {resumeTag ? <Tag tone="ember">{resumeTag}</Tag> : <Tag>no prior session</Tag>}
        </div>
        {resumeTag ? (
          <div className="row gap-3">
            <Btn icon="play" kind="primary" onClick={handleResume}>Resume in Site Builder</Btn>
            <Btn onClick={() => onJump?.("mission")}>Inspect runs</Btn>
            <Btn kind="ghost" icon="x" onClick={() => {
              if (window.SiteContext && typeof window.SiteContext.clearLastActiveTag === "function") {
                window.SiteContext.clearLastActiveTag();
                setResumeTag(null);
              }
            }}>Clear</Btn>
          </div>
        ) : (
          <div className="muted fz-12">No prior session yet — open a site above and click Continue to set this.</div>
        )}
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenSites });
