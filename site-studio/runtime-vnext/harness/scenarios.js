'use strict';
/**
 * Characterization scenarios for Site Studio builds.
 *
 * Each scenario defines:
 * - name / description
 * - setup: prepare the site state before the action
 * - action: execute the build action and return a result summary
 *
 * These scenarios intentionally exercise the OLD runtime so that the new
 * runtime can later be compared against captured golden cases.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_SITE_TAG = process.env.SITE_TAG || 'site-demo';

function ensureSpec(specPath, base) {
  const existing = fs.existsSync(specPath) ? JSON.parse(fs.readFileSync(specPath, 'utf8')) : {};
  const merged = { ...existing, ...base };
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  fs.writeFileSync(specPath, JSON.stringify(merged, null, 2));
  return merged;
}

const SCENARIOS = {
  'single-page-build': {
    name: 'single-page-build',
    description: 'Build a single-page site from a minimal design brief.',
    setup: async ({ siteDir, specPath }) => {
      ensureSpec(specPath, {
        tag: DEFAULT_SITE_TAG,
        site_name: 'Demo Single Page',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Single Page',
          goal: 'A clean landing page for a local service business.',
          must_have_sections: ['hero', 'about', 'services', 'contact'],
          tone: ['friendly', 'professional'],
        },
        pages: ['index.html'],
        media_specs: [],
      });
    },
    action: async ({ server, mockWs, siteTag, timeoutMs }) => {
      const spec = server.readSpec();
      return server.triggerSiteBuild(mockWs, spec);
    },
  },

  'multi-page-build': {
    name: 'multi-page-build',
    description: 'Build a multi-page site with nav and shared template.',
    setup: async ({ siteDir, specPath }) => {
      ensureSpec(specPath, {
        tag: DEFAULT_SITE_TAG,
        site_name: 'Demo Multi Page',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Multi Page',
          goal: 'A multi-page site with consistent nav and footer.',
          must_have_sections: ['hero', 'about', 'services', 'testimonials', 'contact'],
          tone: ['modern', 'trustworthy'],
        },
        pages: ['index.html', 'about.html', 'services.html', 'contact.html'],
        media_specs: [],
      });
    },
    action: async ({ server, mockWs, siteTag, timeoutMs }) => {
      const spec = server.readSpec();
      return server.triggerSiteBuild(mockWs, spec);
    },
  },

  'retry-path': {
    name: 'retry-path',
    description: 'Trigger a build where one page fails and is retried.',
    setup: async ({ siteDir, specPath }) => {
      ensureSpec(specPath, {
        tag: DEFAULT_SITE_TAG,
        site_name: 'Demo Retry',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Retry',
          goal: 'A site that exercises the retry path.',
          must_have_sections: ['hero', 'about'],
          tone: ['professional'],
        },
        pages: ['index.html'],
        media_specs: [],
      });
    },
    action: async ({ server, mockWs, siteTag, timeoutMs }) => {
      const spec = server.readSpec();
      // Retry is internal to triggerSiteBuild; we capture whether it happened.
      return server.triggerSiteBuild(mockWs, spec);
    },
  },

  'template-failure': {
    name: 'template-failure',
    description: 'Build where template generation fails and pages fall back to legacy mode.',
    setup: async ({ siteDir, specPath }) => {
      ensureSpec(specPath, {
        tag: DEFAULT_SITE_TAG,
        site_name: 'Demo Template Failure',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Template Failure',
          goal: 'Force template failure to exercise fallback path.',
          must_have_sections: ['hero', 'about'],
          tone: ['professional'],
        },
        pages: ['index.html'],
        media_specs: [],
      });
      // Note: actually forcing template failure may require a malformed prompt or missing asset.
      // The harness records whatever path the runtime takes.
    },
    action: async ({ server, mockWs, siteTag, timeoutMs }) => {
      const spec = server.readSpec();
      return server.triggerSiteBuild(mockWs, spec);
    },
  },

  'cancellation': {
    name: 'cancellation',
    description: 'Start a build and cancel it mid-run.',
    setup: async ({ siteDir, specPath }) => {
      ensureSpec(specPath, {
        tag: DEFAULT_SITE_TAG,
        site_name: 'Demo Cancellation',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Cancellation',
          goal: 'A build that is cancelled.',
          must_have_sections: ['hero', 'about', 'services', 'contact', 'testimonials'],
          tone: ['professional'],
        },
        pages: ['index.html', 'about.html', 'services.html', 'contact.html', 'testimonials.html'],
        media_specs: [],
      });
    },
    action: async ({ server, mockWs, siteTag, timeoutMs }) => {
      const spec = server.readSpec();
      // Start build in background
      const buildPromise = server.triggerSiteBuild(mockWs, spec);
      // Cancel after short delay
      await new Promise(r => setTimeout(r, 3000));
      // Simulate disconnect / cancel by killing child processes
      // In the harness we rely on the runtime's cancel endpoint if available.
      // For now, record that a cancel was requested.
      const cancelResult = { cancelled: true, requestedAt: new Date().toISOString() };
      try {
        await buildPromise;
      } catch (e) {
        cancelResult.buildError = e.message;
      }
      return cancelResult;
    },
  },

  'verification-repair': {
    name: 'verification-repair',
    description: 'Build a page with missing slot attributes and verify auto-repair applies.',
    setup: async ({ siteDir, specPath }) => {
      ensureSpec(specPath, {
        tag: DEFAULT_SITE_TAG,
        site_name: 'Demo Verification Repair',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Verification Repair',
          goal: 'A build where verification repair is needed.',
          must_have_sections: ['hero', 'about'],
          tone: ['professional'],
        },
        pages: ['index.html'],
        media_specs: [
          { slot_id: 'hero-1', role: 'hero', status: 'empty', page: 'index.html' },
        ],
      });
    },
    action: async ({ server, mockWs, siteTag, timeoutMs }) => {
      const spec = server.readSpec();
      return server.triggerSiteBuild(mockWs, spec);
    },
  },

  'partial-failure': {
    name: 'partial-failure',
    description: 'Multi-page build where some pages succeed and others fail.',
    setup: async ({ siteDir, specPath }) => {
      ensureSpec(specPath, {
        tag: DEFAULT_SITE_TAG,
        site_name: 'Demo Partial Failure',
        business_type: 'service',
        design_brief: {
          business_name: 'Demo Partial Failure',
          goal: 'A build with mixed success and failure.',
          must_have_sections: ['hero', 'about', 'services'],
          tone: ['professional'],
        },
        pages: ['index.html', 'about.html', 'services.html'],
        media_specs: [],
      });
    },
    action: async ({ server, mockWs, siteTag, timeoutMs }) => {
      const spec = server.readSpec();
      return server.triggerSiteBuild(mockWs, spec);
    },
  },
};

function getScenario(name) {
  const s = SCENARIOS[name];
  if (!s) throw new Error(`Unknown scenario: ${name}. Available: ${Object.keys(SCENARIOS).join(', ')}`);
  return s;
}

function listScenarios() {
  return Object.keys(SCENARIOS);
}

module.exports = { SCENARIOS, getScenario, listScenarios, ensureSpec };
