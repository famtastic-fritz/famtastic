import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
const require = createRequire(import.meta.url);

const {
  sanitizeSvg,
  isValidPageName,
  extractSlotsFromPage,
  classifyRequest,
  extractBrandColors,
  labelToFilename,
  SLOT_DIMENSIONS,
} = require('../server');

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
