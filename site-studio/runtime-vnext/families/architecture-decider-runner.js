'use strict';

class ArchitectureDeciderRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const pref = b.architecture_preference || 'auto';
    const constraints = b.architecture_constraints || {};
    const rejectedPatterns = constraints.rejected_patterns || [];
    const requiredPages = constraints.required_pages || [];

    let architecture;
    let page_count;
    let route_model;
    let layout_model;
    let rationale;

    const forcedMultiPage = rejectedPatterns.includes('single-page');

    if (pref === 'single-page' && !forcedMultiPage) {
      architecture = 'single-page';
      page_count = 1;
      route_model = 'hash';
      layout_model = 'sections';
      rationale = 'Single-page architecture chosen per architecture_preference. All content in one scrollable page.';
    } else if (pref === 'multi-page' || forcedMultiPage) {
      architecture = 'multi-page';
      page_count = Math.max(requiredPages.length, 3);
      route_model = 'file-based';
      layout_model = 'full-page';
      rationale = forcedMultiPage
        ? 'Multi-page forced: single-page is in rejected_patterns.'
        : 'Multi-page chosen per architecture_preference. Each page has its own HTML file.';
    } else if (pref === 'app-like') {
      architecture = 'hybrid';
      page_count = 1;
      route_model = 'spa';
      layout_model = 'app';
      rationale = 'App-like hybrid chosen per architecture_preference. SPA routing with app-shell layout.';
    } else {
      // auto
      if (requiredPages.length >= 4) {
        architecture = 'multi-page';
        page_count = Math.max(requiredPages.length, 3);
        route_model = 'file-based';
        layout_model = 'full-page';
        rationale = 'Auto: selected multi-page because 4+ required pages specified.';
      } else {
        architecture = 'single-page';
        page_count = 1;
        route_model = 'hash';
        layout_model = 'sections';
        rationale = 'Auto: defaulting to single-page for simple business site with few requirements.';
      }
    }

    return {
      result: {
        architecture,
        page_count,
        route_model,
        layout_model,
        rejected_patterns: rejectedPatterns,
        rationale,
      },
      sideEffects: [],
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { ArchitectureDeciderRunner };
