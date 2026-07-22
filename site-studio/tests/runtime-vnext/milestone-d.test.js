import { describe, it, expect } from 'vitest';
import { ComponentSelectorRunner } from '../../runtime-vnext/families/component-selector-runner.js';
import { CustomComponentBuilderRunner } from '../../runtime-vnext/families/custom-component-builder-runner.js';
import { MediaPlannerRunner } from '../../runtime-vnext/families/media-planner-runner.js';
import { MediaGenerationRunner } from '../../runtime-vnext/families/media-generation-runner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function makeCtx() {
  const workspace_root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnext-test-d-'));
  return { runContext: { workspace_root, run_id: 'test-d' }, stageAttempt: {}, abortSignal: null };
}

const baseRequest = {
  site_tag: 'clean-pools',
  business: { name: 'Clean Pools LLC' },
  content_inputs: { services: [{ name: 'Weekly Cleaning' }, { name: 'Chemical Balance' }] },
  assets_available: {},
};

const homeManifest = {
  page_id: 'home',
  route: '/',
  required_sections: ['hero', 'services', 'about', 'cta', 'footer'],
};

describe('ComponentSelectorRunner', () => {
  it('returns components array with built-in mappings', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ComponentSelectorRunner();
    const res = await r.execute({ pageManifest: homeManifest }, { runContext, stageAttempt, abortSignal });
    expect(Array.isArray(res.result.components)).toBe(true);
    const heroComp = res.result.components.find(c => c.type === 'hero');
    expect(heroComp.source).toBe('built-in');
    expect(heroComp.status).toBe('available');
  });

  it('marks unknown sections as custom-needed deferred', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ComponentSelectorRunner();
    const res = await r.execute({
      pageManifest: { ...homeManifest, required_sections: ['hero', 'mystery-widget'] },
    }, { runContext, stageAttempt, abortSignal });
    const mystery = res.result.components.find(c => c.type === 'mystery-widget');
    expect(mystery.status).toBe('deferred');
    expect(res.result.custom_needed).toContain('mystery-widget');
  });

  it('never throws — unknown sections degrade gracefully', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ComponentSelectorRunner();
    await expect(r.execute({}, { runContext, stageAttempt, abortSignal })).resolves.toBeTruthy();
  });
});

describe('CustomComponentBuilderRunner', () => {
  it('writes component HTML file to staging/', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new CustomComponentBuilderRunner();
    const res = await r.execute({
      componentNeed: { id: 'mystery-widget', type: 'mystery-widget' },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.status).toBe('built');
    const compPath = path.join(runContext.workspace_root, 'staging', res.result.output_path);
    expect(fs.existsSync(compPath)).toBe(true);
  });

  it('never throws on bad input', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new CustomComponentBuilderRunner();
    await expect(r.execute({}, { runContext, stageAttempt, abortSignal })).resolves.toBeTruthy();
  });
});

describe('MediaPlannerRunner', () => {
  it('returns media plan with has_blocking_media=false', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new MediaPlannerRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifest: homeManifest }, { runContext, stageAttempt, abortSignal });
    expect(res.result.has_blocking_media).toBe(false);
    expect(Array.isArray(res.result.media_items)).toBe(true);
  });

  it('plans placeholder for hero when no photography', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new MediaPlannerRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifest: homeManifest }, { runContext, stageAttempt, abortSignal });
    const hero = res.result.media_items.find(m => m.slot === 'hero-background');
    expect(hero.status).toBe('placeholder');
  });

  it('never throws on empty input', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new MediaPlannerRunner();
    await expect(r.execute({}, { runContext, stageAttempt, abortSignal })).resolves.toBeTruthy();
  });
});

describe('MediaGenerationRunner', () => {
  it('writes SVG placeholder to staging/images/', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new MediaGenerationRunner();
    const res = await r.execute({
      mediaPlanItem: { id: 'hero-bg-home', slot: 'hero-background', source_type: 'placeholder', path: 'images/hero-bg.svg' },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.status).toBe('placeholder');
    const imgPath = path.join(runContext.workspace_root, 'staging', res.result.output_path);
    expect(fs.existsSync(imgPath)).toBe(true);
    const svg = fs.readFileSync(imgPath, 'utf8');
    expect(svg).toContain('<svg');
  });

  it('returns deferred for generate source_type (no provider)', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new MediaGenerationRunner();
    const res = await r.execute({
      mediaPlanItem: { id: 'hero', source_type: 'generate' },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.status).toBe('deferred');
  });

  it('never throws on empty input', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new MediaGenerationRunner();
    await expect(r.execute({}, { runContext, stageAttempt, abortSignal })).resolves.toBeTruthy();
  });
});
