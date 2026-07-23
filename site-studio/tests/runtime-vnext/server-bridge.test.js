import { describe, it, expect } from 'vitest';
import { normalizeLegacyRequest } from '../../runtime-vnext/legacy-compat.js';

// server-bridge.js itself requires live SQLite and file I/O — tested via integration.
// This unit test covers the legacy-compat bridge and the module load contract.

describe('server-bridge module contract', () => {
  it('can require server-bridge without errors', async () => {
    const bridge = await import('../../runtime-vnext/server-bridge.js');
    expect(typeof bridge.runSiteBuild).toBe('function');
  });

  it('exports runSiteBuild as async function', async () => {
    const { runSiteBuild } = await import('../../runtime-vnext/server-bridge.js');
    expect(runSiteBuild.constructor.name).toBe('AsyncFunction');
  });
});

describe('legacy-compat bridge', () => {
  it('handles fully missing services gracefully', () => {
    const req = normalizeLegacyRequest({ siteTag: 'test', siteName: 'Test' });
    expect(Array.isArray(req.content_inputs.services)).toBe(true);
    expect(req.content_inputs.services.length).toBe(0);
  });

  it('never sets prod_deploy true from legacy shape', () => {
    const req = normalizeLegacyRequest({ siteTag: 'test', siteName: 'Test', staging_deploy: true, prod_deploy: true });
    expect(req.deploy.prod_deploy).toBe(false);
  });

  it('string services become objects with name field', () => {
    const req = normalizeLegacyRequest({
      siteTag: 'test',
      siteName: 'Test',
      services: ['Service A', 'Service B'],
    });
    expect(req.content_inputs.services[0]).toEqual({ name: 'Service A', description: '' });
  });

  it('maps legacy multi-page hints into architecture constraints', () => {
    const req = normalizeLegacyRequest({
      siteTag: 'test',
      siteName: 'Test',
      pages: ['index.html', 'about.html', 'services'],
    });
    expect(req.architecture_preference).toBe('multi-page');
    expect(req.architecture_constraints.required_pages).toEqual(['about', 'services']);
  });
});
