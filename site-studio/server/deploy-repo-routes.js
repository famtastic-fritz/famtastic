'use strict';

const os = require('os');

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

  app.post('/api/deploy', async (req, res) => {
    const env = (req.body && req.body.env) || 'staging';
    if (env !== 'staging' && env !== 'production') {
      return res.status(400).json({ ok: false, reason: 'invalid_env', details: `env must be 'staging' or 'production', got '${env}'` });
    }
    if (!getTag()) {
      return res.status(400).json({ ok: false, reason: 'no_active_site', details: 'No active site selected.' });
    }
    if (isDeployInProgress()) {
      return res.status(409).json({ ok: false, reason: 'deploy_in_progress', details: 'A deploy is already running.' });
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
        reason: netlify && netlify.reason ? netlify.reason : 'other',
        details: (netlify && netlify.details) || 'Netlify is not configured.',
      });
    }

    const wss = getWss();
    const wsClients = [...wss.clients].filter((c) => c.readyState === 1);
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

    runDeploy(broadcastWs, env).catch((err) => {
      console.error('[deploy] uncaught error in runDeploy:', err.message);
    });
    return res.json({ ok: true, dispatched: true, env, tag: getTag() });
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
