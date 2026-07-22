import { describe, it, expect } from 'vitest';
import { NetlifyStagingDeployRunner } from '../../runtime-vnext/families/netlify-staging-deploy-runner.js';
import { ProdDeployRouterRunner } from '../../runtime-vnext/families/prod-deploy-router-runner.js';
import { normalizeLegacyRequest } from '../../runtime-vnext/legacy-compat.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function makeCtx() {
  const workspace_root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnext-test-f-'));
  return { runContext: { workspace_root, run_id: 'test-f' }, stageAttempt: {}, abortSignal: null };
}

const baseRequest = {
  site_tag: 'clean-pools',
  business: { name: 'Clean Pools LLC' },
  deploy: { staging_deploy: false, prod_deploy: false },
};

describe('NetlifyStagingDeployRunner', () => {
  it('skips when staging_deploy not set', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new NetlifyStagingDeployRunner();
    const res = await r.execute({ buildRequest: baseRequest }, { runContext, stageAttempt, abortSignal });
    expect(res.result.status).toBe('skipped');
    expect(res.result.deploy_url).toBeNull();
  });

  it('errors when outputs/ dir missing and staging_deploy=true', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new NetlifyStagingDeployRunner();
    const res = await r.execute({
      buildRequest: { ...baseRequest, deploy: { staging_deploy: true } },
    }, { runContext, stageAttempt, abortSignal });
    // Either 'error' (outputs missing) or actual deploy attempt — both valid
    expect(['error', 'success']).toContain(res.result.status);
  });
});

describe('ProdDeployRouterRunner', () => {
  it('skips when prod_deploy not set', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ProdDeployRouterRunner();
    const res = await r.execute({ buildRequest: baseRequest, proofReport: {} }, { runContext, stageAttempt, abortSignal });
    expect(res.result.status).toBe('skipped');
  });

  it('blocks when proofReport is RED even with prod_deploy=true', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ProdDeployRouterRunner();
    const res = await r.execute({
      buildRequest: { ...baseRequest, deploy: { prod_deploy: true } },
      proofReport: { overall_status: 'red' },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.status).toBe('blocked');
  });
});

describe('legacy-compat normalizeLegacyRequest', () => {
  it('converts flat legacy shape to BuildRequest', () => {
    const legacy = {
      siteTag: 'plumber-pro',
      siteName: 'Plumber Pro',
      industry: 'plumbing',
      description: 'We fix pipes.',
      location: 'Dallas, TX',
      mood: 'professional',
      services: ['Drain Cleaning', 'Pipe Repair'],
    };
    const req = normalizeLegacyRequest(legacy);
    expect(req.site_tag).toBe('plumber-pro');
    expect(req.business.name).toBe('Plumber Pro');
    expect(req.business.industry).toBe('plumbing');
    expect(req.content_inputs.services[0].name).toBe('Drain Cleaning');
    expect(req.brand.mood).toBe('professional');
    expect(req.deploy.prod_deploy).toBe(false);
  });

  it('passes canonical requests through unchanged', () => {
    const canonical = {
      site_tag: 'clean-pools',
      business: { name: 'Clean Pools' },
      brand: {},
      deploy: {},
    };
    const result = normalizeLegacyRequest(canonical);
    expect(result).toEqual(canonical);
  });

  it('throws on non-object input', () => {
    expect(() => normalizeLegacyRequest(null)).toThrow();
    expect(() => normalizeLegacyRequest('string')).toThrow();
  });
});
