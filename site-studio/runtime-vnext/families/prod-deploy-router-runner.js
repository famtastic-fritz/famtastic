'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

class ProdDeployRouterRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const deploy = b.deploy || {};
    const outputsDir = path.join(runContext.workspace_root, 'outputs');

    // Require explicit prod flag AND proof of passing QA
    if (!deploy.prod_deploy) {
      return {
        result: {
          status: 'skipped',
          reason: 'deploy.prod_deploy not set — explicit opt-in required for production',
          deploy_url: null,
        },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }

    const proofReport = request.proofReport || {};
    if (proofReport.overall_status === 'red') {
      return {
        result: {
          status: 'blocked',
          reason: 'QA proof report is RED — production deploy blocked until errors are resolved',
          deploy_url: null,
        },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }

    if (!fs.existsSync(outputsDir)) {
      return {
        result: { status: 'error', reason: 'outputs directory does not exist', deploy_url: null },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }

    const siteId = deploy.netlify_site_id || null;
    const netlifyArgs = ['deploy', '--prod', '--dir', outputsDir, '--json'];
    if (siteId) netlifyArgs.push('--site', siteId);

    try {
      const output = execFileSync('netlify', netlifyArgs, { encoding: 'utf8', timeout: 120000 });
      let parsed = {};
      try { parsed = JSON.parse(output); } catch (_) {}

      const deployUrl = parsed.url || parsed.deploy_url || null;

      const reportsDir = path.join(runContext.workspace_root, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const reportPath = path.join(reportsDir, 'prod-deploy.json');
      fs.writeFileSync(reportPath, JSON.stringify({ status: 'success', deploy_url: deployUrl, site_id: siteId, raw: parsed }, null, 2), 'utf8');

      return {
        result: { status: 'success', deploy_url: deployUrl, site_id: siteId || parsed.site_id || null },
        sideEffects: [{ path: 'reports/prod-deploy.json', kind: 'write' }],
        artifactReferences: [{ type: 'DeployReport', path: 'reports/prod-deploy.json' }],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    } catch (err) {
      return {
        result: { status: 'error', reason: err.message, deploy_url: null },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }
  }
}

module.exports = { ProdDeployRouterRunner };
