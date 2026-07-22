import { describe, it, expect } from 'vitest';
import { SeoPackRunner } from '../../runtime-vnext/families/seo-pack-runner.js';
import { StructuralQaRunner } from '../../runtime-vnext/families/structural-qa-runner.js';
import { ContentQaRunner } from '../../runtime-vnext/families/content-qa-runner.js';
import { BrowserQaRunner } from '../../runtime-vnext/families/browser-qa-runner.js';
import { ProofCuratorRunner } from '../../runtime-vnext/families/proof-curator-runner.js';
import { GapLoggerRunner } from '../../runtime-vnext/families/gap-logger-runner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function makeCtx() {
  const workspace_root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnext-test-e-'));
  return { runContext: { workspace_root, run_id: 'test-e' }, stageAttempt: {}, abortSignal: null };
}

const baseRequest = {
  site_tag: 'clean-pools',
  business: { name: 'Clean Pools LLC', description: 'Pool cleaning in Austin.', location: 'Austin, TX' },
  deploy: { custom_domains: [] },
  positioning: { desired_outcome: 'Crystal clear pool' },
};

const pageManifests = [
  { page_id: 'home', route: '/', title: 'Home', output_path: 'index.html', purpose: 'Main landing page' },
];

function seedOutputPage(workspace_root, filename, content) {
  const dir = path.join(workspace_root, 'outputs');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
}

describe('SeoPackRunner', () => {
  it('returns pages with title, description, canonical for each page', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new SeoPackRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifests }, { runContext, stageAttempt, abortSignal });
    expect(res.result.seo_status).toBe('complete');
    expect(res.result.pages).toHaveLength(1);
    const p = res.result.pages[0];
    expect(p.title.length).toBeLessThanOrEqual(60);
    expect(p.description.length).toBeLessThanOrEqual(155);
    expect(p.canonical).toContain('http');
  });

  it('writes sitemap.xml and robots.txt to staging/', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new SeoPackRunner();
    await r.execute({ buildRequest: baseRequest, pageManifests }, { runContext, stageAttempt, abortSignal });
    expect(fs.existsSync(path.join(runContext.workspace_root, 'staging', 'sitemap.xml'))).toBe(true);
    expect(fs.existsSync(path.join(runContext.workspace_root, 'staging', 'robots.txt'))).toBe(true);
  });

  it('adds LocalBusiness schema for home page', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new SeoPackRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifests }, { runContext, stageAttempt, abortSignal });
    const home = res.result.pages.find(p => p.page_id === 'home');
    expect(home.schema_json_ld).toBeTruthy();
    const schema = JSON.parse(home.schema_json_ld);
    expect(schema['@type']).toBe('LocalBusiness');
  });
});

describe('StructuralQaRunner', () => {
  it('green status when all pages exist and have DOCTYPE', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    seedOutputPage(runContext.workspace_root, 'index.html',
      '<!DOCTYPE html><html><head><title>Test</title><meta name="viewport" content="width=device-width"/><link rel="stylesheet" href="css/styles.css"/></head><body><h1>Hi</h1></body></html>');
    // Also seed css/styles.css and js/main.js
    fs.mkdirSync(path.join(runContext.workspace_root, 'outputs', 'css'), { recursive: true });
    fs.mkdirSync(path.join(runContext.workspace_root, 'outputs', 'js'), { recursive: true });
    fs.writeFileSync(path.join(runContext.workspace_root, 'outputs', 'css', 'styles.css'), 'body{}');
    fs.writeFileSync(path.join(runContext.workspace_root, 'outputs', 'js', 'main.js'), '// main');
    fs.writeFileSync(path.join(runContext.workspace_root, 'outputs', 'sitemap.xml'), '<urlset/>');
    fs.writeFileSync(path.join(runContext.workspace_root, 'outputs', 'robots.txt'), 'User-agent: *');
    const r = new StructuralQaRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifests }, { runContext, stageAttempt, abortSignal });
    expect(res.result.status).toBe('green');
    expect(res.result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
  });

  it('red status when page file is missing', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    fs.mkdirSync(path.join(runContext.workspace_root, 'outputs'), { recursive: true });
    const r = new StructuralQaRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifests }, { runContext, stageAttempt, abortSignal });
    expect(res.result.status).toBe('red');
    const missing = res.result.issues.find(i => i.code === 'PAGE_MISSING');
    expect(missing).toBeTruthy();
  });
});

describe('ContentQaRunner', () => {
  it('detects business name in page', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    seedOutputPage(runContext.workspace_root, 'index.html',
      '<!DOCTYPE html><html><head><title>Clean Pools LLC</title></head><body><h1>Clean Pools LLC</h1><p>Professional pool cleaning in Austin.</p></body></html>');
    const r = new ContentQaRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifests }, { runContext, stageAttempt, abortSignal });
    const bizIssue = res.result.issues.find(i => i.code === 'BIZ_NAME_MISSING');
    expect(bizIssue).toBeUndefined();
  });

  it('flags placeholder text leakage', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    seedOutputPage(runContext.workspace_root, 'index.html',
      '<!DOCTYPE html><html><body><h1>Hello</h1><p>{{placeholder}}</p></body></html>');
    const r = new ContentQaRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifests }, { runContext, stageAttempt, abortSignal });
    const ph = res.result.issues.find(i => i.code === 'PLACEHOLDER_TEXT');
    expect(ph).toBeTruthy();
  });
});

describe('BrowserQaRunner', () => {
  it('returns deferred gracefully (SKIP_BROWSER_QA=1)', async () => {
    process.env.SKIP_BROWSER_QA = '1';
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new BrowserQaRunner();
    const res = await r.execute({ buildRequest: baseRequest, pageManifests }, { runContext, stageAttempt, abortSignal });
    delete process.env.SKIP_BROWSER_QA;
    expect(res.result.status).toBe('deferred');
    expect(res.result.qa_type).toBe('browser');
  });
});

describe('ProofCuratorRunner', () => {
  it('writes proof-report.json to reports/', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ProofCuratorRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      structuralQa: { status: 'green', issues: [] },
      contentQa: { status: 'green', issues: [] },
      browserQa: { status: 'deferred', screenshots: [] },
      seoPack: { seo_status: 'complete', pages: [{}] },
      assemblyManifest: { pages_found: ['index.html'] },
    }, { runContext, stageAttempt, abortSignal });
    const reportPath = path.join(runContext.workspace_root, 'reports', 'proof-report.json');
    expect(fs.existsSync(reportPath)).toBe(true);
    expect(res.result.overall_status).toBe('yellow'); // deferred browser QA
  });

  it('overall_status green when all lanes green', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new ProofCuratorRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      structuralQa: { status: 'green', issues: [] },
      contentQa: { status: 'green', issues: [] },
      browserQa: { status: 'green', screenshots: [] },
      seoPack: { seo_status: 'complete', pages: [{}] },
      assemblyManifest: { pages_found: ['index.html'] },
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.overall_status).toBe('green');
  });
});

describe('GapLoggerRunner', () => {
  it('writes gap-log.json', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new GapLoggerRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      structuralQa: { issues: [] },
      contentQa: { issues: [] },
      browserQa: { status: 'deferred' },
      mediaPlan: { missing_ideal: ['hero-image'] },
      componentPlan: { custom_needed: [] },
      proofReport: {},
    }, { runContext, stageAttempt, abortSignal });
    const gapPath = path.join(runContext.workspace_root, 'reports', 'gap-log.json');
    expect(fs.existsSync(gapPath)).toBe(true);
    expect(res.result.gaps.some(g => g.id === 'hero-image')).toBe(true);
    expect(res.result.gaps.some(g => g.id === 'browser-qa')).toBe(true);
  });
});
