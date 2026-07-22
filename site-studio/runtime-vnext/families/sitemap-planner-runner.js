'use strict';

function slug(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

class SitemapPlannerRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const b = request.buildRequest || {};
    const arch = request.architectureDecision || {};
    const biz = b.business || {};
    const pos = b.positioning || {};
    const constraints = b.architecture_constraints || {};
    const requiredPages = constraints.required_pages || [];
    const cta = pos.primary_cta || 'Get Started';

    const siteTag = b.site_tag || 'site';
    const siteName = biz.name || siteTag;
    const architecture = arch.architecture || 'single-page';

    let pageManifests = [];

    if (architecture === 'single-page') {
      pageManifests = [{
        page_id: 'home',
        route: '/',
        title: 'Home',
        purpose: 'Primary landing page — all content in scrollable sections',
        required_sections: ['hero', 'services', 'about', 'cta', 'footer'],
        cta,
        dependencies: [],
      }];
    } else {
      const basePages = [
        {
          page_id: 'home',
          route: '/',
          title: 'Home',
          purpose: 'Primary landing page with overview of services and value proposition',
          required_sections: ['hero', 'services-overview', 'about-snippet', 'cta', 'footer'],
          cta,
          dependencies: [],
        },
        {
          page_id: 'services',
          route: '/services',
          title: 'Services',
          purpose: 'Full services listing with details and pricing',
          required_sections: ['services-intro', 'services-grid', 'cta', 'footer'],
          cta,
          dependencies: ['home'],
        },
        {
          page_id: 'about',
          route: '/about',
          title: 'About',
          purpose: 'Company story, team, and values',
          required_sections: ['about-story', 'team', 'values', 'cta', 'footer'],
          cta,
          dependencies: [],
        },
        {
          page_id: 'contact',
          route: '/contact',
          title: 'Contact',
          purpose: 'Contact form, location, and hours',
          required_sections: ['contact-form', 'location', 'hours', 'footer'],
          cta,
          dependencies: [],
        },
      ];

      const customPages = requiredPages.map((p) => {
        const pageId = typeof p === 'string' ? slug(p) : slug(p.name || p.page_id || 'page');
        const pageTitle = typeof p === 'string' ? p : (p.title || p.name || pageId);
        return {
          page_id: pageId,
          route: '/' + pageId,
          title: pageTitle,
          purpose: 'Custom page: ' + pageTitle,
          required_sections: ['hero', 'cta', 'footer'],
          cta,
          dependencies: [],
        };
      });

      // Merge, skip duplicates
      const seen = new Set(basePages.map(p => p.page_id));
      const extra = customPages.filter(p => !seen.has(p.page_id));
      pageManifests = [...basePages, ...extra];
    }

    const siteManifest = {
      site_tag: siteTag,
      site_name: siteName,
      pages: pageManifests.map(p => ({ page_id: p.page_id, route: p.route, title: p.title })),
      architecture,
    };

    return {
      result: { siteManifest, pageManifests },
      sideEffects: [],
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { SitemapPlannerRunner };
