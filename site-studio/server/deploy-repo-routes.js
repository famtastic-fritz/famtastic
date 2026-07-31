'use strict';

const os = require('os');
const fs = require('fs');
const { siteTagOr400 } = require('../lib/request-context');
const { newDeploymentId, upsertDeployment, findDeployment } = require('../lib/deploy-jobs');

function registerDeployRepoRoutes({
  app,
  getWss,
  path,
  previewPort,
  getSiteDir,
  getDistDir,
  getSpecFile,
  getHubRepoCache,
  getTag,
  isDeployInProgress,
  readSpec,
  writeSpec,
  checkNetlify,
  runDeploy,
  createSiteRepo,
  getDistVnextDir,
  loadSettings,
  getSitesRoot,
}) {
  app.get('/api/deploy-info', (req, res) => {
    try {
      const spec = readSpec();
      const envs = spec.environments || {};

      res.json({
        local: {
          url: `http://localhost:${previewPort}`,
          status: 'running',
          site_dir: getSiteDir(),
          dist_dir: getDistDir(),
          spec_file: getSpecFile(),
        },
        staging: envs.staging ? {
          url: envs.staging.url || null,
          state: envs.staging.state || 'not deployed',
          deployed_at: envs.staging.deployed_at || null,
          provider: envs.staging.provider || null,
          site_id: envs.staging.site_id || null,
          custom_domain: envs.staging.custom_domain || null,
        } : null,
        production: envs.production ? {
          url: envs.production.url || null,
          state: envs.production.state || 'not deployed',
          deployed_at: envs.production.deployed_at || null,
          provider: envs.production.provider || null,
          site_id: envs.production.site_id || null,
          custom_domain: envs.production.custom_domain || null,
          repo: envs.production.repo || null,
        } : null,
        hub_repo: getHubRepoCache(),
        site_repo: spec.site_repo || null,
        deployed: !!(envs.staging?.url || envs.production?.url),
        url: envs.production?.url || envs.staging?.url || null,
      });
    } catch {
      res.json({ local: {}, staging: null, production: null, repo: null, deployed: false });
    }
  });

  // Operator V1 deploy (ported from feature/site-studio-runtime-vnext-closeout).
  // Explicit-site authority, dist-vnext artifact, immutable provider+site-id
  // target captured BEFORE dispatch, durable job record, HTTP observability.
  app.post('/api/deploy', async (req, res) => {
    const env = (req.body && req.body.env) || 'staging';
    if (env !== 'staging' && env !== 'production') {
      return res.status(400).json({ ok: false, reason: 'invalid_env', details: `env must be 'staging' or 'production', got '${env}'` });
    }
    // Explicit site authority — the request must name the site. Traversal-shaped
    // tags were already rejected by the requestContext middleware.
    const siteTag = siteTagOr400(req, res);
    if (!siteTag) return;

    // The in-progress guard keys on the explicit site+env, not on global state,
    // so a duplicate dispatch for THIS site 409s while another site is unaffected.
    if (isDeployInProgress(siteTag, env)) {
      return res.status(409).json({ ok: false, reason: 'deploy_in_progress', details: 'A deploy is already running.' });
    }

    // The deploy ships the V1 artifact (dist-vnext). Fail fast when it is missing.
    const distVnextDir = getDistVnextDir(siteTag);
    if (!fs.existsSync(distVnextDir) || !fs.existsSync(path.join(distVnextDir, 'index.html'))) {
      return res.status(409).json({
        ok: false,
        reason: 'no_vnext_build',
        details: `Site ${siteTag} has no dist-vnext artifact. Run a vNext build first.`,
      });
    }

    let netlify;
    try {
      netlify = await checkNetlify();
    } catch (probeErr) {
      netlify = { ok: false, reason: 'other', details: probeErr.message };
    }
    if (!netlify || !netlify.ok) {
      return res.status(412).json({
        ok: false,
        reason: (netlify && netlify.reason) || 'other',
        details: (netlify && netlify.details) || 'Netlify is not configured.',
      });
    }

    // Capture site identity AND the Netlify site id into locals BEFORE dispatch.
    // The completion path uses only these captured values — never the ambient tag.
    const spec = readSpec(siteTag);
    const siteId = spec.environments?.[env]?.site_id || spec.netlify_site_id || null;
    // The V1 deploy path binds to an immutable Netlify target: without a
    // configured site id there is nothing immutable to bind to. Refuse BEFORE
    // dispatch — auto-create stays available only on the legacy script path.
    if (!siteId) {
      return res.status(412).json({
        ok: false,
        reason: 'no_netlify_site_id',
        details: `Site ${siteTag} has no Netlify site id for env '${env}' (spec.environments.${env}.site_id or spec.netlify_site_id). Link or create the site first.`,
      });
    }

    // Capture the deploy provider BEFORE dispatch too, resolving it the same
    // way the legacy flow would (spec.deploy_provider > settings deploy_target
    // > 'netlify'), normalized to the script's lowercase names. It travels
    // verbatim to the subprocess via SITE_DEPLOY_PROVIDER, so neither
    // spec.deploy_provider nor config defaults can drift the target after
    // dispatch. Netlify is the only supported V1 provider — anything else is
    // refused BEFORE dispatch, not discovered mid-deploy.
    const capturedProvider = String(
      spec.deploy_provider
      || (typeof loadSettings === 'function' ? (loadSettings() || {}).deploy_target : null)
      || 'netlify'
    ).toLowerCase();
    if (capturedProvider !== 'netlify') {
      return res.status(412).json({
        ok: false,
        reason: 'unsupported_deploy_provider',
        details: `Site ${siteTag} resolves to deploy provider '${capturedProvider}' (spec.deploy_provider or settings deploy_target), but the V1 deploy path only supports 'netlify'.`,
      });
    }
    const deploymentId = newDeploymentId();
    const now = new Date().toISOString();
    upsertDeployment(readSpec, writeSpec, siteTag, deploymentId, {
      status: 'dispatched',
      env,
      provider: capturedProvider,
      site_id: siteId,
      captured_provider: capturedProvider,
      actual_provider_used: null,
      captured_site_id: siteId,
      actual_site_id_used: null,
      url: null,
      error: null,
      created_at: now,
    });

    const wss = getWss();
    const wsClients = [...wss.clients].filter((client) => client.readyState === 1);
    const broadcastWs = {
      readyState: 1,
      send: (data) => {
        wsClients.forEach((client) => {
          if (client.readyState === 1) {
            try { client.send(data); } catch {}
          }
        });
      },
    };

    runDeploy(broadcastWs, env, { siteTag, deploymentId, siteId, provider: capturedProvider, sourceDir: 'dist-vnext' }).catch((err) => {
      console.error('[deploy] uncaught error in runDeploy:', err.message);
    });
    return res.json({ ok: true, deployment_id: deploymentId, site_tag: siteTag, env });
  });

  // HTTP-observable deploy status: a client that never opens a WebSocket can
  // drive a deploy to completion and read the real proof URL here.
  app.get('/api/deploy-status', (req, res) => {
    const deploymentId = req.query.deployment_id;
    if (!deploymentId || typeof deploymentId !== 'string') {
      return res.status(400).json({ ok: false, error: 'deployment_id_required', details: 'Pass ?deployment_id=<id>.' });
    }
    const found = findDeployment({ sitesRoot: getSitesRoot(), readSpec }, deploymentId);
    if (!found) {
      return res.status(404).json({ ok: false, error: 'deployment_not_found', deployment_id: deploymentId });
    }
    // Normalize the record so every documented field is always present, even
    // for records persisted before captured/actual provider+id fields existed
    // (back-compat: `provider`, `site_id` and `url` keep their historical
    // meaning).
    const record = found.record;
    return res.json({
      ok: true,
      deployment: {
        deployment_id: record.deployment_id || deploymentId,
        site_tag: record.site_tag || found.siteTag,
        env: record.env || null,
        provider: record.provider || null,
        status: record.status || null,
        url: record.url ?? null,
        error: record.error ?? null,
        created_at: record.created_at || null,
        updated_at: record.updated_at || null,
        ...record,
        captured_provider: record.captured_provider ?? record.provider ?? null,
        actual_provider_used: record.actual_provider_used ?? null,
        captured_site_id: record.captured_site_id ?? record.site_id ?? null,
        actual_site_id_used: record.actual_site_id_used ?? null,
      },
    });
  });

  app.post('/api/create-site-repo', (req, res) => {
    const wss = getWss();
    const client = [...wss.clients].find((c) => c.readyState === 1);
    if (!client) return res.status(400).json({ error: 'No WebSocket client connected' });
    createSiteRepo(client);
    res.json({ success: true, message: 'Creating site repo...' });
  });

  app.put('/api/site-repo', (req, res) => {
    const { repoPath, remote } = req.body;
    if (!repoPath) return res.status(400).json({ error: 'repoPath required' });
    const resolvedPath = path.resolve(repoPath);
    const home = os.homedir();
    if (!resolvedPath.startsWith(home + path.sep) && resolvedPath !== home) {
      return res.status(400).json({ error: 'repoPath must be under home directory' });
    }

    const spec = readSpec();
    spec.site_repo = {
      path: resolvedPath,
      remote: remote || null,
    };
    writeSpec(spec);
    res.json({ success: true, site_repo: spec.site_repo });
  });
}

module.exports = { registerDeployRepoRoutes };
