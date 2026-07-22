import { describe, it, expect } from 'vitest';
import { PageBuilderRunner } from '../../runtime-vnext/families/page-builder-runner.js';
import { SharedAssetsRunner } from '../../runtime-vnext/families/shared-assets-runner.js';
import { AssemblyRunner } from '../../runtime-vnext/families/assembly-runner.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

function makeCtx() {
  const workspace_root = fs.mkdtempSync(path.join(os.tmpdir(), 'vnext-test-build-'));
  return { runContext: { workspace_root, run_id: 'test-build' }, stageAttempt: {}, abortSignal: null };
}

const baseRequest = {
  site_tag: 'clean-pools',
  business: {
    name: 'Clean Pools LLC',
    location: 'Austin, TX',
    public_contact: '512-555-0100',
  },
  brand: { mood: 'professional' },
  content_inputs: { services: [{ name: 'Weekly Cleaning', description: 'Full clean.' }] },
  positioning: { desired_outcome: 'Crystal clear pool' },
};

const singlePageManifest = {
  page_id: 'home',
  route: '/',
  title: 'Home',
  output_path: 'index.html',
  required_sections: ['hero', 'services', 'about', 'cta', 'footer'],
};

const singlePageContent = {
  page_id: 'home',
  meta_title: 'Clean Pools LLC',
  meta_description: 'Professional pool cleaning in Austin.',
  sections: [
    { id: 'hero', type: 'hero', content: { heading: 'Sparkling Pools', body: 'We keep your pool perfect.', cta: { text: 'Get a Quote', href: '#contact' } } },
    { id: 'services', type: 'services', content: { heading: 'Our Services', items: [{ name: 'Weekly Cleaning', description: 'Full clean.' }] } },
    { id: 'about', type: 'about', content: { heading: 'About Us', body: 'Family-owned since 2010.', differentiators: ['Licensed', 'Insured'] } },
    { id: 'cta', type: 'cta', content: { heading: 'Ready?', body: 'Contact us today.', button_text: 'Get a Quote', button_href: '#contact' } },
    { id: 'footer', type: 'footer', content: { tagline: 'Sparkling Pools, Happy Customers', links: [] } },
  ],
};

describe('PageBuilderRunner', () => {
  it('writes index.html to staging/', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new PageBuilderRunner();
    await r.execute({
      buildRequest: baseRequest,
      pageManifest: singlePageManifest,
      contentPacket: singlePageContent,
      designTokenPack: { palette: { primary: '#0057a8' } },
    }, { runContext, stageAttempt, abortSignal });
    const htmlPath = path.join(runContext.workspace_root, 'staging', 'index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);
  });

  it('produces valid HTML5 with DOCTYPE and title', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new PageBuilderRunner();
    await r.execute({
      buildRequest: baseRequest,
      pageManifest: singlePageManifest,
      contentPacket: singlePageContent,
      designTokenPack: { palette: { primary: '#0057a8' } },
    }, { runContext, stageAttempt, abortSignal });
    const html = fs.readFileSync(path.join(runContext.workspace_root, 'staging', 'index.html'), 'utf8');
    expect(html).toContain('<!DOCTYPE html');
    expect(html).toContain('<title>');
    expect(html).toContain('Clean Pools LLC');
  });

  it('escapes business name in HTML (XSS safe)', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new PageBuilderRunner();
    const xssRequest = {
      ...baseRequest,
      business: { ...baseRequest.business, name: '<script>alert(1)</script>' },
    };
    await r.execute({
      buildRequest: xssRequest,
      pageManifest: singlePageManifest,
      contentPacket: { ...singlePageContent, meta_title: '<script>alert(1)</script>' },
      designTokenPack: {},
    }, { runContext, stageAttempt, abortSignal });
    const html = fs.readFileSync(path.join(runContext.workspace_root, 'staging', 'index.html'), 'utf8');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('uses contentPackets array fallback when no contentPacket given', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new PageBuilderRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      pageManifest: singlePageManifest,
      contentPackets: [singlePageContent],
      designTokenPack: {},
    }, { runContext, stageAttempt, abortSignal });
    expect(res.result.page_id).toBe('home');
  });
});

describe('SharedAssetsRunner', () => {
  it('writes css/styles.css and js/main.js', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new SharedAssetsRunner();
    await r.execute({
      buildRequest: baseRequest,
      designTokenPack: { palette: { primary: '#0057a8', secondary: '#e8a000', bg: '#f5f5f5', text: '#1a1a1a', accent: '#003d80' } },
    }, { runContext, stageAttempt, abortSignal });
    expect(fs.existsSync(path.join(runContext.workspace_root, 'staging', 'css', 'styles.css'))).toBe(true);
    expect(fs.existsSync(path.join(runContext.workspace_root, 'staging', 'js', 'main.js'))).toBe(true);
  });

  it('CSS contains responsive media query', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    const r = new SharedAssetsRunner();
    await r.execute({ buildRequest: baseRequest, designTokenPack: {} }, { runContext, stageAttempt, abortSignal });
    const css = fs.readFileSync(path.join(runContext.workspace_root, 'staging', 'css', 'styles.css'), 'utf8');
    expect(css).toContain('@media');
  });
});

describe('AssemblyRunner', () => {
  it('returns BuildAssemblyManifest', async () => {
    const { runContext, stageAttempt, abortSignal } = makeCtx();
    // Seed outputs dir with a fake page
    const outputsDir = path.join(runContext.workspace_root, 'outputs');
    fs.mkdirSync(outputsDir, { recursive: true });
    fs.writeFileSync(path.join(outputsDir, 'index.html'), '<html></html>');
    const r = new AssemblyRunner();
    const res = await r.execute({
      buildRequest: baseRequest,
      // AssemblyRunner reads from siteManifest.pages — pass pages in that shape
      siteManifest: {
        site_tag: 'clean-pools',
        pages: [{ page_id: 'home', route: '/', title: 'Home' }],
      },
    }, { runContext, stageAttempt, abortSignal });
    const pageIds = res.result.pages.map(p => p.output_path);
    expect(pageIds).toContain('index.html');
    expect(res.result.build_status).toBe('complete');
  });
});
