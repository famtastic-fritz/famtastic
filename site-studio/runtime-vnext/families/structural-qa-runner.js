'use strict';
const fs = require('fs');
const path = require('path');

class StructuralQaRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const outputsDir = path.join(runContext.workspace_root, 'outputs');
    const pageManifests = request.pageManifests || [];

    const checks = [];
    const issues = [];

    // Check each page file exists
    for (const pm of pageManifests) {
      const outPath = pm.output_path || (pm.page_id === 'home' ? 'index.html' : pm.page_id + '/index.html');
      const fullPath = path.join(outputsDir, outPath);
      const exists = fs.existsSync(fullPath);
      checks.push({ check: 'page-file-exists', page_id: pm.page_id, path: outPath, pass: exists });
      if (!exists) issues.push({ severity: 'error', code: 'PAGE_MISSING', page_id: pm.page_id, path: outPath });
    }

    // Check shared assets
    for (const assetFile of ['css/styles.css', 'js/main.js']) {
      const fullPath = path.join(outputsDir, assetFile);
      const exists = fs.existsSync(fullPath);
      checks.push({ check: 'shared-asset-exists', path: assetFile, pass: exists });
      if (!exists) issues.push({ severity: 'warning', code: 'ASSET_MISSING', page_id: null, path: assetFile });
    }

    // Check for sitemap and robots
    for (const meta of ['sitemap.xml', 'robots.txt']) {
      const fullPath = path.join(outputsDir, meta);
      const exists = fs.existsSync(fullPath);
      checks.push({ check: 'meta-file-exists', path: meta, pass: exists });
      if (!exists) issues.push({ severity: 'warning', code: 'META_MISSING', page_id: null, path: meta });
    }

    // HTML content checks on found pages
    for (const pm of pageManifests) {
      const outPath = pm.output_path || (pm.page_id === 'home' ? 'index.html' : pm.page_id + '/index.html');
      const fullPath = path.join(outputsDir, outPath);
      if (!fs.existsSync(fullPath)) continue;

      const html = fs.readFileSync(fullPath, 'utf8');

      const hasDoctype = html.includes('<!DOCTYPE html');
      checks.push({ check: 'html-doctype', page_id: pm.page_id, pass: hasDoctype });
      if (!hasDoctype) issues.push({ severity: 'error', code: 'NO_DOCTYPE', page_id: pm.page_id, path: outPath });

      const hasTitle = /<title>[^<]+<\/title>/.test(html);
      checks.push({ check: 'html-title', page_id: pm.page_id, pass: hasTitle });
      if (!hasTitle) issues.push({ severity: 'warning', code: 'NO_TITLE', page_id: pm.page_id, path: outPath });

      const hasViewport = html.includes('name="viewport"');
      checks.push({ check: 'html-viewport', page_id: pm.page_id, pass: hasViewport });
      if (!hasViewport) issues.push({ severity: 'warning', code: 'NO_VIEWPORT', page_id: pm.page_id, path: outPath });

      const hasCssLink = html.includes('styles.css') || html.includes('tokens.css');
      checks.push({ check: 'html-css-linked', page_id: pm.page_id, pass: hasCssLink });
      if (!hasCssLink) issues.push({ severity: 'warning', code: 'NO_CSS_LINK', page_id: pm.page_id, path: outPath });
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warnCount = issues.filter(i => i.severity === 'warning').length;
    const passCount = checks.filter(c => c.pass).length;
    const status = errorCount === 0 ? (warnCount === 0 ? 'green' : 'yellow') : 'red';

    return {
      result: {
        qa_type: 'structural',
        checks_run: checks.length,
        checks_passed: passCount,
        issues,
        status,
        summary: `${passCount}/${checks.length} structural checks passed, ${errorCount} errors, ${warnCount} warnings`,
      },
      sideEffects: [],
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { StructuralQaRunner };
