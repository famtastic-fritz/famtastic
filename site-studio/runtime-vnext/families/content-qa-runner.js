'use strict';
const fs = require('fs');
const path = require('path');
const { outputPathForPage } = require('../lib/page-output-path');

function normalizeForContentChecks(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .toLowerCase();
}

class ContentQaRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const outputsDir = path.join(runContext.workspace_root, 'outputs');
    const b = request.buildRequest || {};
    const biz = b.business || {};
    const pageManifests = request.pageManifests || [];

    const checks = [];
    const issues = [];

    const bizName = normalizeForContentChecks(biz.name);

    for (const pm of pageManifests) {
      const outPath = outputPathForPage(pm);
      const fullPath = path.join(outputsDir, outPath);
      if (!fs.existsSync(fullPath)) continue;

      const html = fs.readFileSync(fullPath, 'utf8');
      const htmlLower = normalizeForContentChecks(html);

      // Business name present
      if (bizName) {
        const hasBizName = htmlLower.includes(bizName);
        checks.push({ check: 'biz-name-present', page_id: pm.page_id, pass: hasBizName });
        if (!hasBizName) issues.push({ severity: 'warning', code: 'BIZ_NAME_MISSING', page_id: pm.page_id, detail: biz.name });
      }

      // No unresolved template leakage or placeholder copy
      const placeholders = ['{{', '}}', 'lorem ipsum', 'TODO', 'FIXME'];
      for (const ph of placeholders) {
        if (htmlLower.includes(ph.toLowerCase())) {
          checks.push({ check: 'no-placeholder-text', page_id: pm.page_id, pass: false, detail: ph });
          issues.push({ severity: 'warning', code: 'PLACEHOLDER_TEXT', page_id: pm.page_id, detail: ph });
        } else {
          checks.push({ check: 'no-placeholder-text', page_id: pm.page_id, pass: true, detail: ph });
        }
      }

      // Has at least one heading
      const hasHeading = /<h[1-6][^>]*>[^<]+<\/h[1-6]>/i.test(html);
      checks.push({ check: 'has-heading', page_id: pm.page_id, pass: hasHeading });
      if (!hasHeading) issues.push({ severity: 'warning', code: 'NO_HEADING', page_id: pm.page_id });

      // Has at least one paragraph or content block
      const hasContent = /<p[^>]*>[^<]{10,}<\/p>/i.test(html);
      checks.push({ check: 'has-content', page_id: pm.page_id, pass: hasContent });
      if (!hasContent) issues.push({ severity: 'info', code: 'THIN_CONTENT', page_id: pm.page_id });

      // Contact page has contact info
      if (pm.page_id === 'contact') {
        const hasContact = htmlLower.includes('contact') && (htmlLower.includes('@') || htmlLower.includes('form'));
        checks.push({ check: 'contact-page-has-contact', page_id: pm.page_id, pass: hasContact });
        if (!hasContact) issues.push({ severity: 'info', code: 'CONTACT_MISSING', page_id: pm.page_id });
      }
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warnCount = issues.filter(i => i.severity === 'warning').length;
    const passCount = checks.filter(c => c.pass).length;
    const status = errorCount === 0 ? (warnCount === 0 ? 'green' : 'yellow') : 'red';

    return {
      result: {
        qa_type: 'content',
        checks_run: checks.length,
        checks_passed: passCount,
        issues,
        status,
        summary: `${passCount}/${checks.length} content checks passed, ${errorCount} errors, ${warnCount} warnings`,
      },
      sideEffects: [],
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { ContentQaRunner };
