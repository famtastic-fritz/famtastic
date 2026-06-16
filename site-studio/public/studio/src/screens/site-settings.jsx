/* Site Settings — two-scope: Platform defaults vs This site.
   Phase 2 Lane D2: per-site overrides wired via SiteSettingsAPI.

   Behavior:
   - On mount, resolves activeTag from SiteContext.getLastActiveTag().
   - Fetches per-site overrides via SiteSettingsAPI.get(tag).
   - Each Seg is controlled by the corresponding overrides value.
   - null overrides render at the platform-default value with a "default" badge.
   - Changing a Seg stores the pending change in local state.
   - "Save changes" button appears when pendingOverrides differ from loaded overrides.
   - Save calls SiteSettingsAPI.put(tag, { overrides: pendingOverrides }).
   - Diff chip counts non-null overrides in real time.
   - Reset-to-platform calls SiteSettingsAPI.reset(tag) then reloads.
   - No activeTag → honest empty state with a shortcut to Sites. */

function ScreenSiteSettings() {
  const [scope, setScope] = React.useState("This site");
  const [activeTag, setActiveTag] = React.useState(null);

  // Loaded overrides from server (null keys = inherit platform default).
  const [loadedOverrides, setLoadedOverrides] = React.useState(null);
  // Pending in-flight edits before save.
  const [pendingOverrides, setPendingOverrides] = React.useState(null);

  const [saveStatus, setSaveStatus] = React.useState(null); // null | "saving" | "saved" | "error"
  const [saveError, setSaveError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  // Lane E — currentContext publish
  React.useEffect(() => {
    window.__studioPublishContext?.(window.CurrentContext?.forSection_siteset?.(activeTag) || null);
    return () => window.__studioPublishContext?.(null);
  }, [activeTag]);

  // Resolve activeTag from SiteContext on mount.
  React.useEffect(() => {
    if (window.SiteContext && typeof window.SiteContext.getLastActiveTag === "function") {
      setActiveTag(window.SiteContext.getLastActiveTag());
    }
  }, []);

  // Fetch overrides whenever activeTag resolves.
  React.useEffect(() => {
    if (!activeTag) return;
    if (!window.SiteSettingsAPI) return;
    setLoading(true);
    window.SiteSettingsAPI.get(activeTag).then(data => {
      setLoading(false);
      if (data && data.overrides) {
        setLoadedOverrides(data.overrides);
        setPendingOverrides({ ...data.overrides });
      }
    }).catch(() => setLoading(false));
  }, [activeTag]);

  // Platform-level defaults used when override is null.
  const PLATFORM_DEFAULTS = {
    builder_model:           "sonnet-4.5",
    operator_readback_model: "haiku-4.5",
    build_approach:          "Template-first",
    component_reuse:         "Search first",
    media_provider:          "Firefly",
    media_ratio:             "16:10",
    deploy_target:           "Netlify",
    deploy_gate:             "Manual",
  };

  // Count real (non-null) overrides for the diff chip.
  const overrideCount = pendingOverrides
    ? Object.values(pendingOverrides).filter(v => v !== null).length
    : 0;

  // Detect unsaved changes.
  const hasPendingChanges = pendingOverrides && loadedOverrides &&
    Object.keys(pendingOverrides).some(k => pendingOverrides[k] !== loadedOverrides[k]);

  const isThisSite = scope === "This site";
  const titleSuffix = activeTag || "no site selected";

  function gotoBuilder() {
    if (typeof window.__studioJump === "function") window.__studioJump("builder");
  }

  function gotoSites() {
    if (typeof window.__studioJump === "function") window.__studioJump("sites");
  }

  function gotoPlatformDefaults() {
    if (typeof window.__studioJump === "function") window.__studioJump("settings");
  }

  // Update a single override key in pending state.
  function setOverride(key, value) {
    setPendingOverrides(prev => ({ ...prev, [key]: value === "__clear__" ? null : value }));
    setSaveStatus(null);
  }

  // Get the effective value for a Seg: pending override if set, else platform default.
  function effectiveValue(key) {
    if (!pendingOverrides) return PLATFORM_DEFAULTS[key];
    return pendingOverrides[key] !== null ? pendingOverrides[key] : PLATFORM_DEFAULTS[key];
  }

  // Badge for each field: "override" if pending value is non-null, else "default".
  function badge(key) {
    if (!pendingOverrides) return "default";
    return pendingOverrides[key] !== null ? "override" : "default";
  }

  async function handleSave() {
    if (!activeTag || !window.SiteSettingsAPI) return;
    setSaveStatus("saving");
    setSaveError(null);
    const result = await window.SiteSettingsAPI.put(activeTag, { overrides: pendingOverrides });
    if (result && result.ok) {
      setLoadedOverrides({ ...pendingOverrides });
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
      setSaveError(result?.errors?.join(", ") || result?.error || "unknown error");
    }
  }

  async function handleReset() {
    if (!activeTag || !window.SiteSettingsAPI) return;
    const result = await window.SiteSettingsAPI.reset(activeTag);
    if (result && result.ok) {
      // Reload overrides — they're now gone (all null).
      const fresh = await window.SiteSettingsAPI.get(activeTag);
      if (fresh && fresh.overrides) {
        setLoadedOverrides(fresh.overrides);
        setPendingOverrides({ ...fresh.overrides });
      }
      setSaveStatus(null);
    }
  }

  // Empty state when no site is active.
  if (!activeTag && !loading) {
    return (
      <div>
        <SectionHeader
          eyebrow="Site settings"
          title="No site selected"
          sub="Open Sites to pick a site, then return here to configure per-site overrides."
          right={[
            <Btn key="sites" kind="primary" icon="arrowRight" onClick={gotoSites}>Open Sites</Btn>,
          ]}
        />
        <Hint style={{ marginTop: 14 }}>
          Site Settings shows per-site overrides relative to your platform defaults. Pick a site first.
        </Hint>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        eyebrow="Site settings"
        title={titleSuffix}
        sub="Two scopes — Platform defaults apply to all new sites; This site overrides apply only here."
        right={[
          <Seg key="sc" items={["Platform defaults","This site"]} value={scope} onChange={setScope} />,
          isThisSite
            ? <Chip key="dc" tone={overrideCount === 0 ? "" : "good"}>{overrideCount} overrides{overrideCount === 0 ? " · matches platform" : ""}</Chip>
            : null,
          isThisSite && hasPendingChanges
            ? <Btn key="save" kind="primary" icon="check" onClick={handleSave} disabled={saveStatus === "saving"}>
                {saveStatus === "saving" ? "Saving…" : "Save changes"}
              </Btn>
            : null,
          isThisSite && saveStatus === "saved"
            ? <Chip key="saved" tone="good">saved · {overrideCount} override{overrideCount !== 1 ? "s" : ""}</Chip>
            : null,
          <Btn key="rs" kind="ghost" icon="refresh"
            disabled={overrideCount === 0}
            title={overrideCount === 0 ? "no overrides to reset" : "reset all overrides to platform defaults"}
            onClick={overrideCount > 0 ? handleReset : undefined}>
            Reset to platform
          </Btn>,
          <Btn key="diff" kind="ghost" icon="diff">Show diff vs platform</Btn>,
          <Btn key="builder" kind="ghost" icon="arrowRight" onClick={gotoBuilder}>Open Site Builder</Btn>,
          <Btn key="platdefs" kind="ghost" onClick={gotoPlatformDefaults}>Platform defaults</Btn>,
        ].filter(Boolean)}
      />

      {saveStatus === "error" && saveError && (
        <Hint style={{ marginBottom: 8, color: "var(--color-warn, #e55)" }}>
          Save failed: {saveError}
        </Hint>
      )}

      {loading && (
        <Hint style={{ marginBottom: 14 }}>Loading overrides…</Hint>
      )}

      {!loading && isThisSite && overrideCount === 0 && (
        <Hint style={{ marginBottom: 14 }}>
          All fields inherit platform defaults. Change any value below to create a per-site override stored at{" "}
          <span className="mono">sites/{activeTag}/site-settings.json</span>.
        </Hint>
      )}

      {!loading && !isThisSite && (
        <Hint style={{ marginBottom: 14 }}>
          Showing platform defaults from{" "}
          <span className="mono">studio-config.json</span>. These apply to all sites unless overridden here.
        </Hint>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <Card>
          <Eyebrow>Models</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Builder model" sub={<span className="mono">{badge("builder_model")}</span>}>
              <Seg
                items={["sonnet-4.5","opus-4.5","local"]}
                value={effectiveValue("builder_model")}
                onChange={isThisSite ? (v => setOverride("builder_model", v)) : () => {}}
              />
            </Field>
            <Field label="Operator readback model" sub={<span className="mono">{badge("operator_readback_model")}</span>}>
              <Seg
                items={["haiku-4.5","sonnet-4.5"]}
                value={effectiveValue("operator_readback_model")}
                onChange={isThisSite ? (v => setOverride("operator_readback_model", v)) : () => {}}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Build policy</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Approach" sub={<span className="mono">{badge("build_approach")}</span>}>
              <Seg
                items={["Template-first","Page-by-page"]}
                value={effectiveValue("build_approach")}
                onChange={isThisSite ? (v => setOverride("build_approach", v)) : () => {}}
              />
            </Field>
            <Field label="Component reuse" sub={<span className="mono">{badge("component_reuse")}</span>}>
              <Seg
                items={["Search first","Always create"]}
                value={effectiveValue("component_reuse")}
                onChange={isThisSite ? (v => setOverride("component_reuse", v)) : () => {}}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Media</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Default provider" sub={<span className="mono">{badge("media_provider")}</span>}>
              <Seg
                items={["Firefly","Imagen","Mid-J","Local"]}
                value={effectiveValue("media_provider")}
                onChange={isThisSite ? (v => setOverride("media_provider", v)) : () => {}}
              />
            </Field>
            <Field label="Default ratio" sub={<span className="mono">{badge("media_ratio")}</span>}>
              <Seg
                items={["1:1","4:3","16:10","9:16"]}
                value={effectiveValue("media_ratio")}
                onChange={isThisSite ? (v => setOverride("media_ratio", v)) : () => {}}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <Eyebrow>Deploy</Eyebrow>
          <div className="col gap-3 mt-3">
            <Field label="Target" sub={<span className="mono">{badge("deploy_target")}</span>}>
              <Seg
                items={["Netlify","Vercel","S3","Manual"]}
                value={effectiveValue("deploy_target")}
                onChange={isThisSite ? (v => setOverride("deploy_target", v)) : () => {}}
              />
            </Field>
            <Field label="Deploy gate" sub={<span className="mono">{badge("deploy_gate")}</span>}>
              <Seg
                items={["Manual","Auto on PASS"]}
                value={effectiveValue("deploy_gate")}
                onChange={isThisSite ? (v => setOverride("deploy_gate", v)) : () => {}}
              />
            </Field>
          </div>
        </Card>
      </div>

      {!loading && isThisSite && (
        <Hint style={{ marginTop: 14 }}>
          Overrides are stored at{" "}
          <span className="mono">sites/{activeTag}/site-settings.json</span>. Null values inherit
          platform defaults from <span className="mono">studio-config.json</span>.
          Reset to platform removes this file entirely.
        </Hint>
      )}
    </div>
  );
}

Object.assign(window, { ScreenSiteSettings });
