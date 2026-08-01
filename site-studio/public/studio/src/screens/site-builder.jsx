/* Site Builder — Operator V1 deterministic build surface.

   V1 path (top of screen): a selected site + an operator brief, POSTed to
   /api/site-studio/build-vnext with an explicit siteTag. The run_id returned
   is polled over HTTP (GET /api/site-studio/build-vnext/status?run_id=...)
   until a terminal status (published / failed). No WebSocket and no embedded
   chat are involved in starting or completing a build. Results (files,
   publish_dir, error) and the preview URL (GET /api/site-studio/preview-url)
   stay on screen durably.

   The legacy embedded chat (/index.html?embedded=1) remains available in a
   collapsed section at the bottom, marked legacy. */

const VNEXT_TERMINAL_STATUSES = ["published", "failed"];
const VNEXT_POLL_INTERVAL_MS = 1500;
const VNEXT_MAX_POLLS = 120; // ~3 minutes of polling headroom

function ScreenSiteBuilder() {
  const [activeTag, setActiveTag] = React.useState(null);
  const [brief, setBrief] = React.useState("");
  // Build state: { phase: 'submitting' | 'polling' | 'published' | 'failed' | 'error', ... }
  const [build, setBuild] = React.useState(null);
  // Legacy embedded chat visibility
  const [legacyOpen, setLegacyOpen] = React.useState(false);

  React.useEffect(() => {
    if (window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function") {
      setActiveTag(window.SiteContext.getLastActiveTag());
    }
  }, []);

  function getTag() {
    return activeTag || (window.SiteContext?.getLastActiveTag?.() || null);
  }

  // Poll the run row over HTTP until terminal status. Returns the final row.
  async function pollRunStatus(runId) {
    for (let attempt = 0; attempt < VNEXT_MAX_POLLS; attempt++) {
      try {
        const res = await fetch(`/api/site-studio/build-vnext/status?run_id=${encodeURIComponent(runId)}`);
        if (res.ok) {
          const row = await res.json();
          if (VNEXT_TERMINAL_STATUSES.includes(row.status)) return row;
        }
      } catch (_err) {
        // transient network hiccup — keep polling
      }
      await new Promise((resolve) => setTimeout(resolve, VNEXT_POLL_INTERVAL_MS));
    }
    return null; // timed out
  }

  async function handleBuildVnext() {
    const tag = getTag();
    if (!tag) return; // button is disabled without a selected site
    const trimmedBrief = brief.trim();
    setBuild({ phase: "submitting", siteTag: tag });
    try {
      const res = await fetch("/api/site-studio/build-vnext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteTag: tag, brief: trimmedBrief }),
      });
      const data = await res.json();
      if (!data.run_id) {
        setBuild({ phase: "error", siteTag: tag, error: data.error || data.message || `HTTP ${res.status}` });
        return;
      }
      const runId = data.run_id;
      // Synchronous route: success already means published. Poll anyway so the
      // on-screen status reflects the persisted run row, not the response body.
      setBuild({
        phase: "polling",
        siteTag: tag,
        runId,
        status: data.success ? "published" : "running",
        files: data.files || null,
        publishDir: data.publish_dir || null,
        error: data.success ? null : (data.error || null),
      });
      const finalRow = await pollRunStatus(runId);
      const status = finalRow ? finalRow.status : (data.success ? "published" : "failed");
      const files = data.files || null;
      const publishDir = data.publish_dir || null;
      const error = finalRow && finalRow.status === "failed"
        ? (finalRow.error || "build failed")
        : (data.success ? null : (finalRow ? null : (data.error || "status polling timed out")));

      let previewUrl = null;
      if (status === "published") {
        try {
          const pres = await fetch(`/api/site-studio/preview-url?siteTag=${encodeURIComponent(tag)}`);
          if (pres.ok) previewUrl = (await pres.json()).url || null;
        } catch (_err) {
          previewUrl = null;
        }
      }
      setBuild({
        phase: status === "published" ? "published" : "failed",
        siteTag: tag,
        runId,
        status,
        files,
        publishDir,
        error: status === "published" ? null : (error || "build failed"),
        previewUrl,
      });
    } catch (err) {
      setBuild({ phase: "error", siteTag: tag, error: err.message });
    }
  }

  const tag = getTag();
  const buildBusy = build && (build.phase === "submitting" || build.phase === "polling");

  const buildPanel = build ? (
    <Card style={{ marginBottom: 10 }}>
      <div className="row gap-2" style={{ flexWrap: "wrap", alignItems: "center" }}>
        {build.phase === "submitting" ? <Chip tone="warn">submitting build…</Chip> : null}
        {build.phase === "polling" ? <Chip tone="warn">build {build.status || "running"} · run {build.runId}</Chip> : null}
        {build.phase === "published" ? <Chip tone="good">published · {build.siteTag}</Chip> : null}
        {build.phase === "failed" ? <Chip tone="crit">build failed · {build.siteTag}</Chip> : null}
        {build.phase === "error" ? <Chip tone="crit">build request error</Chip> : null}
        {build.runId ? <Tag>run · {build.runId}</Tag> : null}
        <span className="grow" />
        {build.previewUrl ? (
          <Btn kind="primary" icon="arrowUpRight" onClick={() => window.open(build.previewUrl, "_blank")}>Open preview</Btn>
        ) : null}
      </div>
      {build.error ? (
        <Hint style={{ marginTop: 8 }}>error · {build.error}</Hint>
      ) : null}
      {build.phase === "published" ? (
        <Hint style={{ marginTop: 8 }}>
          {build.files ? `${build.files.length} file(s) · ${build.files.join(", ")}` : "files unknown"}
          {build.publishDir ? ` · publish_dir: ${build.publishDir}` : ""}
        </Hint>
      ) : null}
    </Card>
  ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <SectionHeader
        eyebrow="Site Builder"
        title="Brief. Build. Preview."
        sub="Deterministic vNext build over plain HTTP — pick a site, write the brief, build. No chat, no WebSocket required."
      />

      {/* V1 build surface — brief + explicit site tag. */}
      <Card style={{ marginBottom: 10 }}>
        <Field label="Build brief" sub="What should this site be? Persisted server-side as the normalized build request (spec.vnext_build_request).">
          <textarea
            className="input"
            rows={4}
            placeholder="e.g. A warm one-page landing site for a Lisbon bakery — hero, menu highlights, opening hours, contact."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            disabled={!tag}
            style={{ resize: "vertical" }}
          />
        </Field>
        <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 10 }}>
          {tag
            ? <Tag tone="ember">{tag}</Tag>
            : <Tag tone="crit">no site selected — open one from Sites to build</Tag>}
          <span className="grow" />
          <Btn
            kind="primary"
            onClick={handleBuildVnext}
            disabled={!tag || buildBusy || !brief.trim()}
            title={!tag ? "Select a site first" : (!brief.trim() ? "Write a brief first" : "POST /api/site-studio/build-vnext")}
          >
            {buildBusy ? "Building…" : "Build vNext"}
          </Btn>
        </div>
        {!tag ? (
          <Hint style={{ marginTop: 8 }}>
            Select a site from the Sites screen first — the build requires an explicit site tag and is refused (400) without one.
          </Hint>
        ) : null}
      </Card>

      {/* Durable build status / result panel. */}
      {buildPanel}

      {/* Legacy embedded chat — kept accessible, collapsed by default. */}
      <Card style={{ flex: legacyOpen ? 1 : undefined, display: "flex", flexDirection: "column" }}>
        <div className="row gap-2" style={{ alignItems: "center" }}>
          <Tag tone="warn">legacy</Tag>
          <span style={{ fontSize: 13 }}>Embedded chat builder (/index.html?embedded=1) — the pre-V1 flow, unchanged.</span>
          <span className="grow" />
          <Btn kind="ghost" icon="arrowUpRight" onClick={() => window.open("/index.html", "_blank")}>Open standalone</Btn>
          <Btn kind="ghost" onClick={() => setLegacyOpen(!legacyOpen)}>{legacyOpen ? "Collapse" : "Expand"}</Btn>
        </div>
        {legacyOpen ? (
          <div className="embed-wrap" style={{ flex: 1, minHeight: 480, marginTop: 10 }}>
            <iframe
              src="/index.html?embedded=1"
              title="FAMtastic Site Builder (legacy embedded)"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

Object.assign(window, { ScreenSiteBuilder });
