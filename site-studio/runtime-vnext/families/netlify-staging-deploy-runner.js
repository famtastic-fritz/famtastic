'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

class NetlifyStagingDeployRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const deploy = b.deploy || {};
    const outputsDir = path.join(runContext.workspace_root, 'outputs');

    // Require explicit staging flag — never auto-deploy without opt-in
    if (!deploy.staging_deploy) {
      return {
        result: {
          status: 'skipped',
          reason: 'deploy.staging_deploy not set in build request',
          deploy_url: null,
          site_id: null,
        },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }

    if (!fs.existsSync(outputsDir)) {
      return {
        result: { status: 'error', reason: 'outputs directory does not exist', deploy_url: null, site_id: null },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }

    const siteId = deploy.netlify_site_id || null;
    const netlifyArgs = ['deploy', '--dir', outputsDir, '--json'];
    if (siteId) netlifyArgs.push('--site', siteId);

    try {
      const output = execFileSync('netlify', netlifyArgs, { encoding: 'utf8', timeout: 120000 });
      let parsed = {};
      try { parsed = JSON.parse(output); } catch (_) {}

      const deployUrl = parsed.deploy_url || parsed.url || null;

      const reportsDir = path.join(runContext.workspace_root, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const reportPath = path.join(reportsDir, 'staging-deploy.json');
      fs.writeFileSync(reportPath, JSON.stringify({ status: 'success', deploy_url: deployUrl, site_id: siteId, raw: parsed }, null, 2), 'utf8');

      return {
        result: { status: 'success', deploy_url: deployUrl, site_id: siteId || parsed.site_id || null },
        sideEffects: [{ path: 'reports/staging-deploy.json', kind: 'write' }],
        artifactReferences: [{ type: 'DeployReport', path: 'reports/staging-deploy.json' }],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    } catch (err) {
      return {
        result: { status: 'error', reason: err.message, deploy_url: null, site_id: siteId },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }
  }
}

module.exports = { NetlifyStagingDeployRunner };
