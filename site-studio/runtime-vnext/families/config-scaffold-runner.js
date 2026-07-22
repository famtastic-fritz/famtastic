'use strict';
const fs = require('fs');
const path = require('path');

class ConfigScaffoldRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const { buildRequest } = request;
    const b = buildRequest || {};
    const biz = b.business || {};
    const siteTag = b.site_tag || 'site';
    const stagingDir = path.join(runContext.workspace_root, 'staging');

    const filesCreated = [];
    const sideEffects = [];

    function write(relPath, content) {
      const fullPath = path.join(stagingDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content, 'utf8');
      filesCreated.push(relPath);
      sideEffects.push({ path: relPath, kind: 'write' });
    }

    write('.env.template', [
      `SITE_NAME=${biz.name || siteTag}`,
      `SITE_TAG=${siteTag}`,
      'DEPLOY_HOOK_URL=',
      'NETLIFY_AUTH_TOKEN=',
    ].join('\n') + '\n');

    write('.env.example', [
      `SITE_NAME=${biz.name || 'My Business'}`,
      `SITE_TAG=${siteTag}`,
      'DEPLOY_HOOK_URL=https://api.netlify.com/build_hooks/YOUR_HOOK_ID',
      'NETLIFY_AUTH_TOKEN=your-netlify-token-here',
    ].join('\n') + '\n');

    write('netlify.toml', [
      '[build]',
      'command = "echo \'static\'"',
      'publish = "."',
      '',
      '[context.production]',
      '  [context.production.environment]',
      '    NODE_VERSION = "20"',
      '',
      '[[redirects]]',
      'from = "/*"',
      'to = "/index.html"',
      'status = 200',
      '',
    ].join('\n'));

    return {
      result: {
        files_created: filesCreated,
        deploy_target: 'netlify',
        staging_url_template: `https://${siteTag}.netlify.app`,
      },
      sideEffects,
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { ConfigScaffoldRunner };
