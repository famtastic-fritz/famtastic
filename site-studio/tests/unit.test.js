import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

// Must set before requiring server.js — TAG reads from SITE_TAG at module load
process.env.SITE_TAG = process.env.SITE_TAG || 'site-demo';

const require = createRequire(import.meta.url);

const {
  sanitizeSvg,
  isValidPageName,
  extractSlotsFromPage,
  classifyRequest,
  extractBrandColors,
  labelToFilename,
  SLOT_DIMENSIONS,
  truncateAssistantMessage,
  ensureHeadDependencies,
  extractTemplateComponents,
  autoTagMissingSlots,
  calculateSessionCost,
  getContextPercentage,
} = require('../server');

const db = require('../lib/db');

// classifyRequest checks fs.existsSync for index.html — ensure it exists
const HUB_ROOT = path.resolve(import.meta.dirname, '../../');
const DIST_DIR = path.join(HUB_ROOT, 'sites', process.env.SITE_TAG || 'site-demo', 'dist');
let createdDistDir = false;
let createdIndexHtml = false;

beforeAll(() => {
  if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR, { recursive: true });
    createdDistDir = true;
  }
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    fs.writeFileSync(indexPath, '<html><body>test</body></html>');
    createdIndexHtml = true;
  }
});

afterAll(() => {
  if (createdIndexHtml) {
    try { fs.unlinkSync(path.join(DIST_DIR, 'index.html')); } catch {}
  }
  if (createdDistDir) {
    try { fs.rmSync(DIST_DIR, { recursive: true }); } catch {}
  }
});

// --- isValidPageName ---
describe('isValidPageName', () => {
  it('accepts valid page names', () => {
    expect(isValidPageName('index.html')).toBe(true);
    expect(isValidPageName('about.html')).toBe(true);
    expect(isValidPageName('contact-us.html')).toBe(true);
    expect(isValidPageName('page-123.html')).toBe(true);
  });

  it('rejects path traversal', () => {
    expect(isValidPageName('../../etc/passwd.html')).toBe(false);
    expect(isValidPageName('../index.html')).toBe(false);
  });

  it('rejects non-html files', () => {
    expect(isValidPageName('script.js')).toBe(false);
    expect(isValidPageName('data.json')).toBe(false);
    expect(isValidPageName('image.png')).toBe(false);
  });

  it('rejects empty and malformed', () => {
    expect(isValidPageName('')).toBe(false);
    expect(isValidPageName('.html')).toBe(false);
    expect(isValidPageName('file')).toBe(false);
  });
});

// --- sanitizeSvg ---
describe('sanitizeSvg', () => {
  it('removes script tags', () => {
    const dirty = '<svg><script>alert("xss")</script><rect/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).toContain('<rect');
  });

  it('removes script tags with whitespace variations', () => {
    const dirty = '<svg>< script>alert(1)</ script></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('alert');
  });

  it('removes on* event handlers', () => {
    const dirty = '<svg><rect onload="alert(1)" onclick="hack()"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('onload');
    expect(clean).not.toContain('onclick');
  });

  it('removes javascript: URIs from href', () => {
    const dirty = '<svg><a href="javascript:alert(1)">link</a></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('javascript:');
  });

  it('removes javascript: URIs from src', () => {
    const dirty = '<svg><image src="javascript:alert(1)"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('javascript:');
  });

  it('removes foreignObject', () => {
    const dirty = '<svg><foreignObject><body><script>xss</script></body></foreignObject></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('foreignObject');
  });

  it('removes iframe/embed/object', () => {
    const dirty = '<svg><iframe src="evil.html"></iframe><embed src="evil.swf"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('iframe');
    expect(clean).not.toContain('embed');
  });

  it('removes CSS expressions in style', () => {
    const dirty = '<svg><rect style="background: expression(alert(1))"/></svg>';
    const clean = sanitizeSvg(dirty);
    expect(clean).not.toContain('expression');
  });

  it('preserves safe SVG content', () => {
    const safe = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="blue"/><text x="10" y="50">Hello</text></svg>';
    const clean = sanitizeSvg(safe);
    expect(clean).toContain('rect');
    expect(clean).toContain('Hello');
    expect(clean).toContain('fill="blue"');
  });
});

// --- extractSlotsFromPage ---
describe('extractSlotsFromPage', () => {
  it('extracts slots from img tags', () => {
    const html = `
      <img data-slot-id="hero-1" data-slot-status="empty" data-slot-role="hero" src="data:image/gif;base64,R0lGOD">
      <img data-slot-id="team-1" data-slot-status="stock" data-slot-role="team" src="assets/stock/team-1.jpg">
    `;
    const slots = extractSlotsFromPage(html, 'index.html');
    expect(slots).toHaveLength(2);
    expect(slots[0]).toEqual({
      slot_id: 'hero-1', role: 'hero', dimensions: '1920x1080', status: 'empty', page: 'index.html'
    });
    expect(slots[1]).toEqual({
      slot_id: 'team-1', role: 'team', dimensions: '400x400', status: 'stock', page: 'index.html'
    });
  });

  it('returns empty array for HTML without slots', () => {
    const html = '<div><img src="logo.png" alt="Logo"></div>';
    expect(extractSlotsFromPage(html, 'index.html')).toEqual([]);
  });

  it('handles missing role/status gracefully', () => {
    const html = '<img data-slot-id="misc-1" src="#">';
    const slots = extractSlotsFromPage(html, 'about.html');
    expect(slots).toHaveLength(1);
    expect(slots[0].role).toBe('unknown');
    expect(slots[0].status).toBe('empty');
    expect(slots[0].dimensions).toBe('800x600');
  });

  it('uses correct dimensions per role', () => {
    for (const [role, dims] of Object.entries(SLOT_DIMENSIONS)) {
      const html = `<img data-slot-id="test-1" data-slot-role="${role}" data-slot-status="empty">`;
      const slots = extractSlotsFromPage(html, 'test.html');
      expect(slots[0].dimensions).toBe(dims);
    }
  });
});

// --- classifyRequest ---
describe('classifyRequest', () => {
  const noSpec = {};
  const withBrief = { design_brief: { approved: true } };

  it('classifies deploy intent', () => {
    expect(classifyRequest('deploy this site', withBrief)).toBe('deploy');
    expect(classifyRequest('deploy to production', withBrief)).toBe('deploy');
  });

  it('classifies build intent', () => {
    expect(classifyRequest('build the site', withBrief)).toBe('build');
    expect(classifyRequest('rebuild the site', withBrief)).toBe('build');
  });

  it('classifies brand health check', () => {
    expect(classifyRequest('check brand health', withBrief)).toBe('brand_health');
    expect(classifyRequest("what's missing?", withBrief)).toBe('brand_health');
  });

  it('classifies brainstorm mode', () => {
    expect(classifyRequest("let's brainstorm ideas", withBrief)).toBe('brainstorm');
  });

  it('classifies stock photo fill', () => {
    expect(classifyRequest('add images', withBrief)).toBe('fill_stock_photos');
    expect(classifyRequest('fill stock photos', withBrief)).toBe('fill_stock_photos');
    expect(classifyRequest('I need images', withBrief)).toBe('fill_stock_photos');
  });

  it('classifies content update', () => {
    expect(classifyRequest('change the phone number to 555-1234', withBrief)).toBe('content_update');
    expect(classifyRequest('update the heading text', withBrief)).toBe('content_update');
  });

  it('classifies layout update', () => {
    expect(classifyRequest('add a testimonial section', withBrief)).toBe('layout_update');
    expect(classifyRequest('remove the sidebar', withBrief)).toBe('layout_update');
  });

  it('classifies restyle', () => {
    expect(classifyRequest('make it more premium', withBrief)).toBe('restyle');
    expect(classifyRequest('change the overall vibe to modern', withBrief)).toBe('restyle');
  });

  it('classifies major revision', () => {
    expect(classifyRequest('start over from scratch', withBrief)).toBe('major_revision');
    expect(classifyRequest('I hate this', withBrief)).toBe('major_revision');
  });

  it('classifies bug fix', () => {
    expect(classifyRequest('the header is broken', withBrief)).toBe('bug_fix');
    expect(classifyRequest('text is overlapping', withBrief)).toBe('bug_fix');
  });

  it('routes to new_site when no brief exists', () => {
    expect(classifyRequest('I want a restaurant website', noSpec)).toBe('new_site');
  });

  it('classifies brief edit', () => {
    expect(classifyRequest('edit the brief', withBrief)).toBe('brief_edit');
    expect(classifyRequest('update the brief audience', withBrief)).toBe('brief_edit');
  });

  it('classifies rollback', () => {
    expect(classifyRequest('rollback to previous version', withBrief)).toBe('rollback');
    expect(classifyRequest('undo that change', withBrief)).toBe('rollback');
  });

  it('classifies data model', () => {
    expect(classifyRequest('do I need a database?', withBrief)).toBe('data_model');
    expect(classifyRequest('plan the data model', withBrief)).toBe('data_model');
  });

  it('classifies asset generation', () => {
    expect(classifyRequest('create a logo for my site', withBrief)).toBe('asset_import');
    expect(classifyRequest('generate a favicon', withBrief)).toBe('asset_import');
  });

  it('defaults to layout_update for ambiguous requests', () => {
    expect(classifyRequest('make it look better', withBrief)).toBe('layout_update');
  });
});

// --- extractBrandColors ---
describe('extractBrandColors', () => {
  it('returns defaults when no brief', () => {
    const colors = extractBrandColors({});
    expect(colors.primary).toBe('#1a5c2e');
    expect(colors.accent).toBe('#d4a843');
  });

  it('extracts hex colors from visual_direction', () => {
    const spec = {
      design_brief: {
        visual_direction: { color_usage: 'Use #ff0000 as primary and #00ff00 as accent' }
      }
    };
    const colors = extractBrandColors(spec);
    expect(colors.primary).toBe('#ff0000');
    expect(colors.accent).toBe('#00ff00');
  });

  it('keeps defaults when no hex found', () => {
    const spec = { design_brief: { visual_direction: { color_usage: 'Use warm earthy tones' } } };
    const colors = extractBrandColors(spec);
    expect(colors.primary).toBe('#1a5c2e');
  });
});

// --- labelToFilename ---
describe('labelToFilename', () => {
  it('generates safe filenames', () => {
    expect(labelToFilename('My Hero Image', 'hero', 'index.html')).toBe('index-my-hero-image.svg');
  });

  it('falls back to section when no label', () => {
    expect(labelToFilename('', 'gallery', 'about.html')).toBe('about-gallery.svg');
  });

  it('falls back to placeholder when neither', () => {
    expect(labelToFilename('', '', 'index.html')).toBe('index-placeholder.svg');
  });

  it('truncates long labels', () => {
    const long = 'a'.repeat(100);
    const filename = labelToFilename(long, '', 'index.html');
    expect(filename.length).toBeLessThan(60);
  });

  it('strips special characters', () => {
    expect(labelToFilename("John's Photo #1!", '', 'index.html')).toBe('index-john-s-photo-1.svg');
  });
});

// --- truncateAssistantMessage ---
describe('truncateAssistantMessage', () => {
  it('returns empty string for null/undefined', () => {
    expect(truncateAssistantMessage(null)).toBe('');
    expect(truncateAssistantMessage(undefined)).toBe('');
    expect(truncateAssistantMessage('')).toBe('');
  });

  it('keeps short non-HTML messages intact', () => {
    const msg = 'Sure, I can help with that!';
    expect(truncateAssistantMessage(msg)).toBe(msg);
  });

  it('truncates long non-HTML messages at 500 chars', () => {
    const long = 'a'.repeat(600);
    const result = truncateAssistantMessage(long);
    expect(result.length).toBeLessThanOrEqual(503); // 500 + '...'
    expect(result).toContain('...');
  });

  it('extracts CHANGES: section from HTML_UPDATE responses', () => {
    const html = 'HTML_UPDATE:\n<!DOCTYPE html><html><body>...</body></html>\n\nCHANGES:\n- Added hero section\n- Updated nav';
    const result = truncateAssistantMessage(html);
    expect(result).toContain('[Generated HTML]');
    expect(result).toContain('Added hero section');
    expect(result).not.toContain('<!DOCTYPE');
  });

  it('detects MULTI_UPDATE pages', () => {
    const multi = 'MULTI_UPDATE:\n--- PAGE: index.html ---\n<html>...</html>\n--- PAGE: about.html ---\n<html>...</html>';
    const result = truncateAssistantMessage(multi);
    expect(result).toContain('index.html');
    expect(result).toContain('about.html');
  });

  it('returns fallback for HTML without CHANGES or PAGE markers', () => {
    const html = '<!DOCTYPE html><html><head></head><body></body></html>';
    const result = truncateAssistantMessage(html);
    expect(result).toBe('[Generated/updated site HTML]');
  });
});

// --- classifyRequest edge cases ---
describe('classifyRequest edge cases', () => {
  const withBrief = { design_brief: { approved: true } };

  it('does not classify "history of this font" as version_history', () => {
    // "history" alone should not trigger version_history anymore
    const result = classifyRequest("what's the history of this font choice?", withBrief);
    expect(result).not.toBe('version_history');
  });

  it('classifies "show versions" as version_history', () => {
    expect(classifyRequest('show me the versions', withBrief)).toBe('version_history');
  });

  it('does not classify "restore the original colors" as rollback', () => {
    // "restore" without version context should not be rollback
    const result = classifyRequest('restore the original colors', withBrief);
    expect(result).not.toBe('rollback');
  });

  it('classifies "restore previous version" as rollback', () => {
    expect(classifyRequest('restore previous version', withBrief)).toBe('rollback');
  });
});

// --- ensureHeadDependencies ---
describe('ensureHeadDependencies', () => {
  const testDir = path.join(DIST_DIR, '_test_head');

  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    try { fs.rmSync(testDir, { recursive: true }); } catch {}
  });

  it('does not crash on empty dist directory', () => {
    // ensureHeadDependencies reads listPages() which reads from DIST_DIR
    // This test just verifies no throw on normal run
    expect(() => ensureHeadDependencies(null)).not.toThrow();
  });
});

// --- extractTemplateComponents ---
describe('extractTemplateComponents', () => {
  it('extracts all four components from valid template', () => {
    const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style data-template="shared">
    :root { --color-primary: #1a5c2e; }
    .text-primary { color: var(--color-primary); }
  </style>
</head>
<body>
  <header data-template="header">
    <nav><a href="index.html">Home</a><a href="about.html">About</a></nav>
  </header>
  <footer data-template="footer">
    <p>© 2026 Test Business</p>
  </footer>
</body>
</html>`;
    const result = extractTemplateComponents(template);
    expect(result.headBlock).toContain('tailwindcss');
    expect(result.headBlock).toContain('data-template="shared"');
    expect(result.headerHtml).toContain('data-template="header"');
    expect(result.headerHtml).toContain('<nav>');
    expect(result.footerHtml).toContain('data-template="footer"');
    expect(result.footerHtml).toContain('2026 Test Business');
    expect(result.sharedCss).toContain('--color-primary');
    expect(result.sharedCss).toContain('.text-primary');
    expect(result.navHtml).toContain('<a href="index.html">');
  });

  it('returns empty strings for missing components', () => {
    const minimal = '<html><head><title>Test</title></head><body></body></html>';
    const result = extractTemplateComponents(minimal);
    expect(result.headBlock).toContain('<head>');
    expect(result.headerHtml).toBe('');
    expect(result.footerHtml).toBe('');
    expect(result.sharedCss).toBe('');
    expect(result.navHtml).toBe('');
  });

  it('handles malformed HTML gracefully', () => {
    const broken = 'not html at all';
    const result = extractTemplateComponents(broken);
    expect(result.headBlock).toBe('');
    expect(result.headerHtml).toBe('');
    expect(result.footerHtml).toBe('');
    expect(result.sharedCss).toBe('');
  });

  it('extracts nav from inside header', () => {
    const template = `<html><head></head><body>
      <header data-template="header"><div class="container"><nav class="flex gap-4"><a href="/">Home</a></nav></div></header>
    </body></html>`;
    const result = extractTemplateComponents(template);
    expect(result.navHtml).toContain('<nav');
    expect(result.navHtml).toContain('Home');
  });
});

describe('autoTagMissingSlots', () => {
  const testPage = 'test-autotag.html';
  const testPath = path.join(DIST_DIR, testPage);

  afterEach(() => {
    try { fs.unlinkSync(testPath); } catch {}
  });

  it('tags images missing slot attributes', () => {
    fs.writeFileSync(testPath, `<html><body><main>
      <img src="assets/stock/hero.jpg" alt="lawn hero" class="w-full">
    </main></body></html>`);
    const result = autoTagMissingSlots([testPage]);
    expect(result.totalFixed).toBe(1);
    const html = fs.readFileSync(testPath, 'utf8');
    expect(html).toContain('data-slot-id=');
    expect(html).toContain('data-slot-role="hero"');
    expect(html).toContain('data-slot-status="stock"');
  });

  it('skips images that already have all three slot attributes', () => {
    fs.writeFileSync(testPath, `<html><body><main>
      <img data-slot-id="hero-1" data-slot-role="hero" data-slot-status="empty" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP" alt="hero">
    </main></body></html>`);
    const result = autoTagMissingSlots([testPage]);
    expect(result.totalFixed).toBe(0);
  });

  it('skips logo images inside data-logo-v anchors', () => {
    fs.writeFileSync(testPath, `<html><body>
      <header><a href="/" data-logo-v><img src="assets/logo.svg" alt="My Site" class="h-10"></a></header>
      <main><img src="assets/stock/hero.jpg" alt="hero image"></main>
    </body></html>`);
    const result = autoTagMissingSlots([testPage]);
    expect(result.totalFixed).toBe(1);
    const html = fs.readFileSync(testPath, 'utf8');
    // Logo img should NOT have slot attributes
    expect(html).toMatch(/<a[^>]*data-logo-v[^>]*><img(?![^>]*data-slot-id)/);
    // Hero img should have slot attributes
    expect(html).toContain('data-slot-role="hero"');
  });

  it('generates content-derived IDs with auto- prefix', () => {
    fs.writeFileSync(testPath, `<html><body><main>
      <img src="assets/stock/team.jpg" alt="our team members" class="w-full">
    </main></body></html>`);
    autoTagMissingSlots([testPage]);
    const html = fs.readFileSync(testPath, 'utf8');
    const idMatch = html.match(/data-slot-id="([^"]+)"/);
    expect(idMatch).toBeTruthy();
    expect(idMatch[1]).toMatch(/^auto-/);
    expect(idMatch[1]).toContain('team');
  });
});

// --- Session Cost & Context ---

describe('calculateSessionCost', () => {
  it('calculates Sonnet cost correctly for known token counts', () => {
    // 10000 input × $0.000003 + 2000 output × $0.000015 = $0.06
    expect(calculateSessionCost('claude-sonnet-4-6', 10000, 2000)).toBe(0.06);
  });
  it('calculates Haiku cost correctly', () => {
    // 10000 × $0.0000008 + 2000 × $0.000004 = $0.016
    expect(calculateSessionCost('claude-haiku-4-5-20251001', 10000, 2000)).toBe(0.016);
  });
  it('returns 0 for zero token counts without throwing', () => {
    expect(calculateSessionCost('claude-sonnet-4-6', 0, 0)).toBe(0);
  });
});

describe('getContextPercentage', () => {
  it('returns green class when usage is below 50%', () => {
    const r = getContextPercentage(40000, 200000);
    expect(r.percentage).toBe(20);
    expect(r.colorClass).toBe('context-green');
  });
  it('returns amber class when usage is 50-80%', () => {
    const r = getContextPercentage(120000, 200000);
    expect(r.colorClass).toBe('context-amber');
  });
  it('returns red class when usage exceeds 80%', () => {
    const r = getContextPercentage(170000, 200000);
    expect(r.colorClass).toBe('context-red');
  });
});

// --- SQLite Session Storage ---

describe('db: session lifecycle', () => {
  beforeAll(() => { db._createTestDb(); });
  afterAll(() => { db._closeDb(); });

  it('creates and ends a session correctly', () => {
    db.createSession({ id: 'test-s1', siteTag: 'site-test', model: 'claude-sonnet-4-6' });
    const rows = db.getSessionHistory('site-test', 10);
    expect(rows.length).toBe(1);
    expect(rows[0].status).toBe('active');
    db.endSession('test-s1');
    const ended = db.getSessionHistory('site-test', 10);
    expect(ended[0].status).toBe('completed');
    expect(ended[0].ended_at).toBeTruthy();
  });

  it('accumulates token counts across multiple updates', () => {
    db.createSession({ id: 'test-s2', siteTag: 'site-test', model: 'claude-haiku-4-5-20251001' });
    db.updateSessionTokens('test-s2', 1000, 200, 0.01);
    db.updateSessionTokens('test-s2', 500, 100, 0.005);
    const rows = db.getSessionHistory('site-test', 10);
    const s = rows.find(r => r.id === 'test-s2');
    expect(s.total_input_tokens).toBe(1500);
    expect(s.total_output_tokens).toBe(300);
    expect(s.message_count).toBe(2);
  });

  it('returns correct portfolio stats from known data', () => {
    db.logBuild({
      id: 'test-b1', sessionId: 'test-s1', siteTag: 'site-test',
      pagesBuilt: 3, verificationStatus: 'passed', verificationIssues: 0,
      durationMs: 5000, model: 'claude-sonnet-4-6', inputTokens: 2000, outputTokens: 500,
    });
    const stats = db.getPortfolioStats();
    expect(stats.totalSessions).toBeGreaterThanOrEqual(2);
    expect(stats.totalBuilds).toBeGreaterThanOrEqual(1);
    expect(stats.sitesBuilt).toBeGreaterThanOrEqual(1);
  });
});

// --- Studio CSS File Structure ---

describe('Studio CSS file structure', () => {
  it('all expected css/ files exist and are linked in index.html', () => {
    const cssDir = path.join(__dirname, '../public/css');
    const indexHtml = fs.readFileSync(
      path.join(__dirname, '../public/index.html'), 'utf8'
    );
    const expectedFiles = [
      'studio-base.css',
      'studio-panels.css',
      'studio-chat.css',
      'studio-sidebar.css',
      'studio-modals.css',
      'studio-terminal.css',
    ];
    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(cssDir, file)),
        `${file} missing from public/css/`).toBe(true);
      expect(indexHtml,
        `${file} not linked in index.html`).toContain(`href="css/${file}"`);
    }
  });
});
