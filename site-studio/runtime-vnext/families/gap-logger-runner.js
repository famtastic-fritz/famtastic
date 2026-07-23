'use strict';
const fs = require('fs');
const path = require('path');

class GapLoggerRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();

    const structuralQa = request.structuralQa || {};
    const contentQa = request.contentQa || {};
    const browserQa = request.browserQa || {};
    const mediaPlan = request.mediaPlan || {};
    const componentPlan = request.componentPlan || {};
    const proofReport = request.proofReport || {};

    const gaps = [];

    // Media gaps
    const missingMedia = (mediaPlan.missing_ideal || []);
    for (const m of missingMedia) {
      gaps.push({ category: 'media', severity: 'info', id: m, description: 'Ideal media asset missing — using placeholder', deferred: true });
    }

    // Component gaps
    const customNeeded = (componentPlan.custom_needed || []);
    for (const c of customNeeded) {
      gaps.push({ category: 'component', severity: 'info', id: c + '-component', description: 'No built-in component for section type "' + c + '" — using generic placeholder', deferred: true });
    }

    // Browser QA gap
    if (browserQa.status === 'deferred' || browserQa.provider === 'none') {
      gaps.push({ category: 'qa', severity: 'warning', id: 'browser-qa', description: 'Playwright browser QA was skipped or unavailable. Enable playwright-backed browser verification before cutover.', deferred: true });
    }

    // Collect issues from QA
    const allIssues = [
      ...(structuralQa.issues || []),
      ...(contentQa.issues || []),
    ];
    for (const issue of allIssues) {
      if (issue.severity !== 'error') continue;
      gaps.push({ category: 'build', severity: 'error', id: issue.code, description: issue.code + (issue.page_id ? ' on ' + issue.page_id : '') + (issue.path ? ' at ' + issue.path : ''), deferred: false });
    }

    const gapLog = {
      site_tag: (request.buildRequest || {}).site_tag || 'unknown',
      run_id: runContext.run_id || 'unknown',
      total_gaps: gaps.length,
      blocking: gaps.filter(g => !g.deferred).length,
      deferred: gaps.filter(g => g.deferred).length,
      gaps,
    };

    const reportsDir = path.join(runContext.workspace_root, 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const gapLogPath = path.join(reportsDir, 'gap-log.json');
    fs.writeFileSync(gapLogPath, JSON.stringify(gapLog, null, 2), 'utf8');

    return {
      result: gapLog,
      sideEffects: [{ path: 'reports/gap-log.json', kind: 'write' }],
      artifactReferences: [{ type: 'GapLog', path: 'reports/gap-log.json' }],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { GapLoggerRunner };
