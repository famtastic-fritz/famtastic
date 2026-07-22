'use strict';

const BUILT_IN_MAP = {
  'hero': 'hero-component',
  'services': 'services-grid-component',
  'services-grid': 'services-grid-component',
  'services-overview': 'services-grid-component',
  'services-intro': 'services-grid-component',
  'about': 'about-section-component',
  'about-snippet': 'about-section-component',
  'about-story': 'about-section-component',
  'testimonials': 'testimonials-component',
  'cta': 'cta-banner-component',
  'cta-banner': 'cta-banner-component',
  'contact-form': 'contact-form-component',
  'contact': 'contact-form-component',
  'footer': 'footer-component',
  'team': 'team-section-component',
  'values': 'values-section-component',
  'location': 'location-component',
  'hours': 'hours-component',
};

class ComponentSelectorRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    try {
      const pm = request.pageManifest || {};
      const sections = pm.required_sections || [];
      const components = [];
      const custom_needed = [];

      for (const section of sections) {
        const builtIn = BUILT_IN_MAP[section];
        if (builtIn) {
          components.push({ id: builtIn, type: section, source: 'built-in', status: 'available', notes: '' });
        } else {
          const compId = section + '-comp';
          components.push({ id: compId, type: section, source: 'custom-needed', status: 'deferred', notes: 'No built-in component for this section type' });
          custom_needed.push(section);
        }
      }

      return {
        result: {
          page_id: pm.page_id || 'unknown',
          components,
          custom_needed,
          fallback_policy: 'use-built-in',
        },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    } catch (err) {
      return {
        result: { page_id: 'unknown', components: [], custom_needed: [], fallback_policy: 'use-built-in' },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }
  }
}

module.exports = { ComponentSelectorRunner };
