import { describe, it, expect } from 'vitest';
import { ArchitectureDeciderRunner } from '../../runtime-vnext/families/architecture-decider-runner.js';
import { SitemapPlannerRunner } from '../../runtime-vnext/families/sitemap-planner-runner.js';
import { PageCopyRunner } from '../../runtime-vnext/families/page-copy-runner.js';
import { DesignTokenRunner } from '../../runtime-vnext/families/design-token-runner.js';
import { JsBehaviorRunner } from '../../runtime-vnext/families/js-behavior-runner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function makeCtx() {
  const workspace_root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnext-test-'));
  return { runContext: { workspace_root, run_id: 'test-c' }, stageAttempt: {}, abortSignal: null };
}

const baseRequest = {
  site_tag: 'clean-pools',
  site_type: 'single-page',
  business: {
    name: 'Clean Pools LLC',
    industry: 'pool-cleaning',
    description: 'Professional pool cleaning services in Austin.',
    location: 'Austin, TX',
    public_contact: '512-555-0100',
    tagline: 'Sparkling Pools, Happy Customers',
  },
  brand: { mood: 'professional', color_hint: null, typography: null },
  content_inputs: {
    services: [
      { name: 'Weekly Cleaning', description: 'Full clean every week.' },
      { name: 'Chemical Balance', description: 'Perfect water chemistry.' },
      { name: 'Equipment Check', description: 'Inspect and maintain.' },
    ],
    testimonials: [{ author: 'Jane D', text: 'Amazing service!' }],
    about_text: 'Family-owned business serving Austin since 2010.',
  },
  positioning: {
    target_audience: 'Homeowners with pools',
    desired_outcome: 'A crystal clear pool without the hassle',
    differentiators: ['Licensed & insured', 'Same-day service'],
  },
  deploy: { staging_deploy: false, prod_deploy: false },
};

describe('ArchitectureDeciderRunner', () => {
  it('returns single-page decision for single-page preference', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ArchitectureDeciderRunner();
    const res = await r.execute({ buildRequest: { ...baseRequest, architecture_preference: 'single-page' } }, { runContext, stageAttempt, abortSignal });
    expect(res.result.architecture).toBe('single-page');
    expect(res.result.rationale).toBeTruthy();
  });

  it('returns multi-page for multi-page preference', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ArchitectureDeciderRunner();
    const res = await r.execute({
      buildRequest: { ...baseRequest, architecture_preference: 'multi-page' },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.architecture).toBe('multi-page');
  });

  it('produces deterministic output on same input', async () => {
    const ctx1 = makeCtx();
    const ctx2 = makeCtx();
    const r = new ArchitectureDeciderRunner();
    const req = { buildRequest: { ...baseRequest, architecture_preference: 'single-page' } };
    const r1 = await r.execute(req, { runContext: ctx1.runContext, stageAttempt: {}, abortSignal: null });
    const r2 = await r.execute(req, { runContext: ctx2.runContext, stageAttempt: {}, abortSignal: null });
    expect(r1.result.architecture).toBe(r2.result.architecture);
  });
});

describe('SitemapPlannerRunner', () => {
  it('returns siteManifest and pageManifests', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new SitemapPlannerRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      architectureDecision: { architecture: 'single-page' },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.siteManifest).toBeTruthy();
    expect(Array.isArray(res.result.pageManifests)).toBe(true);
    expect(res.result.pageManifests.length).toBeGreaterThan(0);
  });

  it('single-page produces exactly one page', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new SitemapPlannerRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      architectureDecision: { architecture: 'single-page' },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.pageManifests.length).toBe(1);
    expect(res.result.pageManifests[0].route).toBe('/');
  });

  it('multi-page produces home + core pages', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new SitemapPlannerRunner();
    const res = await r.execute({
      buildRequest: { ...baseRequest, architecture_preference: 'multi-page' },
      architectureDecision: { architecture: 'multi-page' },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.pageManifests.length).toBeGreaterThanOrEqual(4);
    const routes = res.result.pageManifests.map(p => p.route);
    expect(routes).toContain('/');
    expect(routes).toContain('/services');
  });
});

describe('PageCopyRunner', () => {
  it('returns ContentPacket with page_id', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new PageCopyRunner();
    const pm = { page_id: 'home', route: '/', title: 'Home', required_sections: ['hero', 'services', 'about', 'cta', 'footer'] };
    const res = await r.execute({ buildRequest: baseRequest, pageManifest: pm }, { runContext, stageAttempt, abortSignal });
    expect(res.result.page_id).toBe('home');
    expect(Array.isArray(res.result.sections)).toBe(true);
    expect(res.result.sections.length).toBeGreaterThan(0);
  });

  it('hero section has heading', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new PageCopyRunner();
    const pm = { page_id: 'home', route: '/', required_sections: ['hero'] };
    const res = await r.execute({ buildRequest: baseRequest, pageManifest: pm }, { runContext, stageAttempt, abortSignal });
    const hero = res.result.sections.find(s => s.id === 'hero');
    expect(hero).toBeTruthy();
    expect(hero.content.heading).toBeTruthy();
  });
});

describe('DesignTokenRunner', () => {
  it('returns DesignTokenPack with color palette', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new DesignTokenRunner();
    const res = await r.execute({ buildRequest: baseRequest }, { runContext, stageAttempt, abortSignal });
    expect(res.result.colors).toBeTruthy();
    expect(res.result.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('writes tokens.css to staging/', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new DesignTokenRunner();
    await r.execute({ buildRequest: baseRequest }, { runContext, stageAttempt, abortSignal });
    const cssPath = path.join(runContext.workspace_root, 'staging', 'css', 'tokens.css');
    expect(fs.existsSync(cssPath)).toBe(true);
    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css).toContain('--color-primary');
  });
});

describe('JsBehaviorRunner', () => {
  it('returns JsBehaviorPlan with modules', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new JsBehaviorRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      siteManifest: { site_type: 'single-page' },
    }, { runContext, stageAttempt, abortSignal });
    expect(Array.isArray(res.result.modules)).toBe(true);
    expect(res.result.modules.length).toBeGreaterThan(0);
  });

  it('includes section-observer module for single-page', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new JsBehaviorRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      siteManifest: { site_type: 'single-page' },
    }, { runContext, stageAttempt, abortSignal });
    const ids = res.result.modules.map(m => m.id);
    expect(ids).toContain('section-observer');
  });
});
