'use strict';
const fs = require('fs');
const path = require('path');

class RepoBootstrapRunner {
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

    const pkg = JSON.stringify({
      name: siteTag,
      version: '0.1.0',
      description: biz.description || '',
      private: true,
    }, null, 2);
    write('package.json', pkg);

    write('.gitignore', [
      'node_modules/',
      '.env',
      'dist/',
      '.DS_Store',
      '*.log',
      '.netlify/',
    ].join('\n') + '\n');

    const readme = [
      `# ${biz.name || siteTag}`,
      '',
      biz.description || '',
      '',
      '## Contact',
      biz.public_contact || '',
      '',
      '## Hours',
      biz.hours || '',
      '',
      '## Build',
      'Open `index.html` in a browser, or deploy the folder to any static host.',
      '',
    ].join('\n');
    write('README.md', readme);

    write('src/.gitkeep', '');

    return {
      result: {
        files_created: filesCreated,
        skipped: [],
        stack: 'html',
        project_root: stagingDir,
      },
      sideEffects,
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { RepoBootstrapRunner };
