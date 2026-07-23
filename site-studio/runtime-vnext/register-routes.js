'use strict';

const { runSiteBuild } = require('./server-bridge');
const { normalizeLegacyRequest } = require('./legacy-compat');

function safeBroadcast(getWss, payload) {
  const wss = typeof getWss === 'function' ? getWss() : null;
  if (!wss || !wss.clients) return;
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      try { client.send(message); } catch (_) {}
    }
  });
}

function deriveRuntimeVnextRequestFromSpec(spec, fallbackTag) {
  const pages = Array.isArray(spec.pages) && spec.pages.length
    ? spec.pages
    : Array.isArray(spec.design_brief?.must_have_sections)
      ? spec.design_brief.must_have_sections
      : ['home'];

  const tone = Array.isArray(spec.design_brief?.tone)
    ? spec.design_brief.tone.join(', ')
    : (spec.client_brief?.style_notes || 'professional');

  const primaryGoal = spec.positioning?.primary_goal || spec.design_brief?.goal || spec.business_type || 'Professional Services';
  const desiredOutcome = spec.client_brief?.primary_cta || spec.positioning?.desired_outcome || spec.design_brief?.goal || 'Contact us today';

  const legacyShape = {
    siteTag: spec.tag || fallbackTag,
    siteName: spec.site_name || spec.design_brief?.business_name || fallbackTag,
    business_type: spec.business_type || '',
    industry: spec.business_type || '',
    description: spec.client_brief?.business_description || spec.design_brief?.goal || '',
    audience: spec.client_brief?.ideal_customer || spec.design_brief?.audience || '',
    cta: desiredOutcome,
    mood: tone,
    about: spec.client_brief?.business_description || spec.design_brief?.goal || '',
    pages,
    rejected_patterns: spec.design_brief?.avoid || [],
    custom_domains: spec.environments?.production?.url ? [spec.environments.production.url] : [],
    primary_goal: primaryGoal,
    desired_outcome: desiredOutcome,
  };

  return normalizeLegacyRequest(legacyShape);
}

function shapeBuildResponse(result) {
  return {
    status: result.status,
    run_id: result.run_id,
    dist_dir: result.dist_dir,
    workspace_root: result.workspace_root,
    proof_report_path: result.proof_report_path,
    gap_log_path: result.gap_log_path,
    proof_report: result.proof_report,
    gap_log: result.gap_log,
    error: result.error || null,
  };
}

function registerRuntimeVnextRoutes({ app, getWss, readSpec, tag }) {
  app.post('/api/vnext-build', async (req, res) => {
    try {
      const rawRequest = req.body;
      if (!rawRequest || typeof rawRequest !== 'object') {
        return res.status(400).json({ error: 'BuildRequest body required' });
      }
      const buildRequest = normalizeLegacyRequest(rawRequest);
      const result = await runSiteBuild(buildRequest);
      res.json(shapeBuildResponse(result));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/rebuild-runtime-vnext', async (req, res) => {
    try {
      const spec = readSpec();
      if (!spec || typeof spec !== 'object') {
        return res.status(400).json({ error: 'Current site spec not found' });
      }

      const buildRequest = deriveRuntimeVnextRequestFromSpec(spec, tag);
      safeBroadcast(getWss, { type: 'status', content: 'runtime-vnext: preparing deterministic rebuild...' });
      const result = await runSiteBuild(buildRequest);
      const summary = result.proof_report
        ? `runtime-vnext rebuild complete: ${result.proof_report.pages_built || 0} page(s), ${result.proof_report.total_issues || 0} issue(s), overall ${result.proof_report.overall_status || result.status}.`
        : `runtime-vnext rebuild complete with status ${result.status}.`;
      safeBroadcast(getWss, { type: 'status', content: summary });
      safeBroadcast(getWss, { type: 'runtime-vnext-build-complete', result: shapeBuildResponse(result) });
      res.json(shapeBuildResponse(result));
    } catch (err) {
      safeBroadcast(getWss, { type: 'error', content: `runtime-vnext rebuild failed: ${err.message}` });
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = {
  registerRuntimeVnextRoutes,
  deriveRuntimeVnextRequestFromSpec,
  shapeBuildResponse,
};
