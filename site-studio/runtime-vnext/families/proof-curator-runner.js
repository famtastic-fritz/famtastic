'use strict';
const fs = require('fs');
const path = require('path');

class ProofCuratorRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const biz = b.business || {};

    // Collect all QA results passed in
    const structuralQa = request.structuralQa || {};
    const contentQa = request.contentQa || {};
    const browserQa = request.browserQa || {};
    const seoPack = request.seoPack || {};
    const assemblyManifest = request.assemblyManifest || {};

    const qaLanes = [
      { lane: 'structural', status: structuralQa.status || 'unknown', summary: structuralQa.summary || '' },
      { lane: 'content', status: contentQa.status || 'unknown', summary: contentQa.summary || '' },
      { lane: 'browser', status: browserQa.status || 'deferred', summary: browserQa.summary || '' },
      { lane: 'seo', status: seoPack.seo_status || (seoPack.pages && seoPack.pages.length > 0 ? 'complete' : 'unknown'), summary: '' },
    ];

    const overallRed = qaLanes.some(l => l.status === 'red');
    const overallDeferred = qaLanes.some(l => l.status === 'deferred');
    const overallStatus = overallRed ? 'red' : (overallDeferred ? 'yellow' : 'green');

    const allIssues = [
      ...(structuralQa.issues || []),
      ...(contentQa.issues || []),
      ...(browserQa.issues || []),
    ];

    const pagesBuilt = Array.isArray(assemblyManifest.pages_found)
      ? assemblyManifest.pages_found.length
      : Array.isArray(assemblyManifest.pages)
        ? assemblyManifest.pages.length
        : 0;

    const proof = {
      site_tag: b.site_tag || 'unknown',
      business_name: biz.name || '',
      run_id: runContext.run_id || 'unknown',
      build_path: path.join(runContext.workspace_root, 'outputs'),
      qa_lanes: qaLanes,
      overall_status: overallStatus,
      total_issues: allIssues.length,
      error_count: allIssues.filter(i => i.severity === 'error').length,
      warning_count: allIssues.filter(i => i.severity === 'warning').length,
      pages_built: pagesBuilt,
      seo_pages: (seoPack.pages || []).length,
      screenshots: browserQa.screenshots || [],
      deferred_items: [],
    };

    // Collect deferred items
    if (browserQa.status === 'deferred') proof.deferred_items.push('browser-qa-puppeteer');

    // Write proof report
    const reportsDir = path.join(runContext.workspace_root, 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });
    const reportPath = path.join(reportsDir, 'proof-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(proof, null, 2), 'utf8');

    return {
      result: proof,
      sideEffects: [{ path: 'reports/proof-report.json', kind: 'write' }],
      artifactReferences: [{ type: 'ProofReport', path: 'reports/proof-report.json' }],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { ProofCuratorRunner };
