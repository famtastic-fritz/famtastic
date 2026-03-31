const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cheerio = require('cheerio');

// --- Config ---
const PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const PREVIEW_PORT = parseInt(process.env.PREVIEW_PORT || '3333', 10);
// Restore last active site from settings, fall back to env var or 'site-demo'
const LAST_SITE_FILE = path.join(process.env.HOME || '~', '.config', 'famtastic', '.last-site');
function readLastSite() {
  try { return fs.readFileSync(LAST_SITE_FILE, 'utf8').trim(); } catch { return null; }
}
function writeLastSite(tag) {
  try {
    const dir = path.dirname(LAST_SITE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LAST_SITE_FILE, tag);
  } catch {}
}
let TAG = process.env.SITE_TAG || readLastSite() || 'site-demo';
const RECENT_CONVO_COUNT = 15; // Recent conversation turns to include in prompt context
const serverStartedAt = new Date().toISOString();
const HUB_ROOT = path.resolve(__dirname, '..');
const SITES_ROOT = path.join(HUB_ROOT, 'sites');

// Cache hub repo info at startup (doesn't change at runtime)
let _hubRepoCache = null;
try {
  const { execSync: _es } = require('child_process');
  const _url = _es('git remote get-url origin', { cwd: HUB_ROOT, encoding: 'utf8' }).trim();
  const _branch = _es('git branch --show-current', { cwd: HUB_ROOT, encoding: 'utf8' }).trim();
  _hubRepoCache = { url: _url, branch: _branch };
} catch {}

// Derived paths — recomputed on site switch
function SITE_DIR() { return path.join(SITES_ROOT, TAG); }
function DIST_DIR() { return path.join(SITE_DIR(), 'dist'); }
function CONVO_FILE() { return path.join(SITE_DIR(), 'conversation.jsonl'); }
function SPEC_FILE() { return path.join(SITE_DIR(), 'spec.json'); }
function STUDIO_FILE() { return path.join(SITE_DIR(), '.studio.json'); }
function VERSIONS_DIR() { return path.join(DIST_DIR(), '.versions'); }
function SUMMARIES_DIR() { return path.join(SITE_DIR(), 'summaries'); }
function UPLOADS_DIR() { return path.join(DIST_DIR(), 'assets', 'uploads'); }

// --- Spec.json write-through cache ---
// Single-process Node.js: all reads/writes go through these two functions.
// Eliminates read-modify-write race conditions across concurrent handlers.
let _specCache = null;
let _specCacheTag = null; // tracks which TAG the cache belongs to

function readSpec() {
  if (_specCache && _specCacheTag === TAG) return _specCache;
  if (fs.existsSync(SPEC_FILE())) {
    try {
      _specCache = JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8'));
      _specCacheTag = TAG;
      // Lightweight schema check — warn on missing core fields but don't crash
      if (_specCache && typeof _specCache === 'object') {
        if (!_specCache.tag) console.warn(`[spec] ${TAG}: missing 'tag' field`);
        if (!_specCache.site_name) console.warn(`[spec] ${TAG}: missing 'site_name' field`);
        // Ensure arrays are actually arrays
        if (_specCache.media_specs && !Array.isArray(_specCache.media_specs)) {
          console.warn(`[spec] ${TAG}: media_specs is not an array, resetting`);
          _specCache.media_specs = [];
        }
        // Normalize old-format media_specs (slot→slot_id, missing→empty, infer role)
        if (Array.isArray(_specCache.media_specs)) {
          let migrated = false;
          _specCache.media_specs = _specCache.media_specs.map(s => {
            if (s.slot_id && s.role && s.status !== 'missing') return s;
            migrated = true;
            const slotId = s.slot_id || s.slot || 'unknown';
            const status = s.status === 'missing' ? 'empty' : (s.status || 'empty');
            const role = s.role || (slotId.match(/hero/i) ? 'hero' : slotId.match(/logo/i) ? 'logo' : slotId.match(/gallery/i) ? 'gallery' : slotId.match(/team/i) ? 'team' : slotId.match(/service/i) ? 'service' : slotId.match(/testimonial/i) ? 'testimonial' : slotId.match(/favicon/i) ? 'favicon' : 'gallery');
            return { ...s, slot_id: slotId, status, role, page: s.page || 'index.html' };
          });
          if (migrated) {
            console.log(`[spec] ${TAG}: migrated old-format media_specs to slot-based format`);
            writeSpec(_specCache);
          }
        }
        if (_specCache.design_decisions && !Array.isArray(_specCache.design_decisions)) {
          console.warn(`[spec] ${TAG}: design_decisions is not an array, resetting`);
          _specCache.design_decisions = [];
        }
        // Migrate flat deploy fields to environments object
        if (_specCache.deployed_url && !_specCache.environments) {
          _specCache.environments = {
            staging: {
              provider: _specCache.deploy_provider || 'netlify',
              site_id: _specCache.netlify_site_id || null,
              url: _specCache.deployed_url,
              deployed_at: _specCache.deployed_at || null,
              state: 'deployed',
            },
          };
          console.log(`[spec] ${TAG}: migrated flat deploy fields to environments.staging`);
          fs.writeFileSync(SPEC_FILE(), JSON.stringify(_specCache, null, 2));
        }
      }
    } catch (e) {
      console.error(`[spec] Failed to parse ${SPEC_FILE()}: ${e.message}`);
      _specCache = {};
      _specCacheTag = TAG;
    }
  } else {
    _specCache = {};
    _specCacheTag = TAG;
  }
  return _specCache;
}

function writeSpec(spec) {
  _specCache = spec;
  _specCacheTag = TAG;
  fs.mkdirSync(SITE_DIR(), { recursive: true });
  fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
}

function invalidateSpecCache() {
  _specCache = null;
  _specCacheTag = null;
}

// --- Path safety ---
// Validates that a page name is safe (no traversal, alphanumeric + hyphens only)
function isValidPageName(name) {
  return /^[a-z0-9][a-z0-9._-]*\.html$/i.test(name) && !name.includes('..');
}

// --- Multi-page state ---
let currentPage = 'index.html';
let currentMode = 'build'; // 'build' or 'brainstorm'
let buildInProgress = false;
let sessionMessageCount = 0;
let sessionStartedAt = new Date().toISOString();
const ACCEPTED_TYPES = /\.(png|jpe?g|gif|svg|webp|html|zip)$/i;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_UPLOADS_PER_SITE = 100; // default; overridden at runtime by loadSettings().max_uploads_per_site

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      fs.mkdirSync(UPLOADS_DIR(), { recursive: true });
      cb(null, UPLOADS_DIR());
    },
    filename: (req, file, cb) => {
      // Sanitize: lowercase, strip special chars, add timestamp if duplicate
      let name = file.originalname.toLowerCase().replace(/[^a-z0-9._-]/g, '-');
      if (fs.existsSync(path.join(UPLOADS_DIR(), name))) {
        const ext = path.extname(name);
        const base = path.basename(name, ext);
        name = `${base}-${Date.now()}${ext}`;
      }
      cb(null, name);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ACCEPTED_TYPES.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Accepted: .png, .jpg, .gif, .svg, .webp, .html, .zip'));
    }
  },
});

// --- SVG Sanitizer ---
function sanitizeSvg(svgContent) {
  let clean = svgContent;
  // Remove <script> tags — handle whitespace/case variations
  clean = clean.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  clean = clean.replace(/<\s*script[^>]*\/\s*>/gi, '');
  // Remove ALL on* event handler attributes (any casing, any quote style, unquoted)
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  // Remove javascript:/data: URIs from ALL src-like attributes (href, src, xlink:href, poster, data, action, formaction)
  clean = clean.replace(/((?:href|src|xlink:href|poster|data|action|formaction)\s*=\s*)(?:"(?:javascript|data\s*:)[^"]*"|'(?:javascript|data\s*:)[^']*')/gi, '$1"#"');
  // Remove <foreignObject> (can embed arbitrary HTML)
  clean = clean.replace(/<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, '');
  // Remove <use> with external references
  clean = clean.replace(/<\s*use[^>]*(?:href|xlink:href)\s*=\s*(?:"https?:[^"]*"|'https?:[^']*')[^>]*\/?\s*>(?:<\s*\/\s*use\s*>)?/gi, '');
  // Remove <iframe>, <embed>, <object>, <applet>, <base>, <form>
  clean = clean.replace(/<\s*(?:iframe|embed|object|applet|base|form)[\s\S]*?(?:<\s*\/\s*(?:iframe|embed|object|applet|base|form)\s*>|\/\s*>)/gi, '');
  // Remove CSS expressions and url(javascript:) in style attributes
  clean = clean.replace(/style\s*=\s*"[^"]*(?:expression|javascript|url\s*\(\s*['"]?\s*javascript)[^"]*"/gi, 'style=""');
  clean = clean.replace(/style\s*=\s*'[^']*(?:expression|javascript|url\s*\(\s*['"]?\s*javascript)[^']*'/gi, "style=''");
  return clean;
}

// --- Site Versioning ---
function versionFile(page, reason) {
  if (!loadSettings().auto_version) return null;
  const htmlPath = path.join(DIST_DIR(), page);
  if (!fs.existsSync(htmlPath)) return null;

  const pageDir = path.join(VERSIONS_DIR(), page.replace('.html', ''));
  fs.mkdirSync(pageDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const versionPath = path.join(pageDir, `${ts}.html`);
  fs.copyFileSync(htmlPath, versionPath);

  // Store version metadata in .studio.json
  let studio;
  try {
    studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
  } catch { studio = {}; }

  if (!studio.versions) studio.versions = [];
  const entry = {
    page,
    timestamp: new Date().toISOString(),
    file: path.relative(DIST_DIR(), versionPath),
    reason: reason || 'update',
    size: fs.statSync(htmlPath).size,
  };
  studio.versions.push(entry);

  // Keep last 50 versions total
  if (studio.versions.length > 50) {
    const removed = studio.versions.splice(0, studio.versions.length - 50);
    // Clean up old version files
    for (const old of removed) {
      const oldPath = path.join(DIST_DIR(), old.file);
      if (fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }
  }

  fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2));
  return entry;
}

function getVersions(page) {
  let studio;
  try {
    studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
  } catch { studio = {}; }

  const versions = studio.versions || [];
  if (page) return versions.filter(v => v.page === page);
  return versions;
}

function rollbackToVersion(page, timestamp) {
  const versions = getVersions(page);
  const target = versions.find(v => v.timestamp === timestamp);
  if (!target) return { error: 'Version not found' };

  const versionPath = path.join(DIST_DIR(), target.file);
  if (!fs.existsSync(versionPath)) return { error: 'Version file missing' };

  const htmlPath = path.join(DIST_DIR(), page);

  // Save current state as a version before rolling back
  versionFile(page, 'pre-rollback');

  // Copy the old version back
  fs.copyFileSync(versionPath, htmlPath);

  return { success: true, restoredFrom: target.timestamp, page };
}

// --- Site Blueprint ---
function BLUEPRINT_FILE() { return path.join(SITE_DIR(), 'blueprint.json'); }

function readBlueprint() {
  if (fs.existsSync(BLUEPRINT_FILE())) {
    try { return JSON.parse(fs.readFileSync(BLUEPRINT_FILE(), 'utf8')); } catch { return null; }
  }
  return null;
}

function writeBlueprint(bp) {
  fs.mkdirSync(SITE_DIR(), { recursive: true });
  bp.last_updated = new Date().toISOString();
  fs.writeFileSync(BLUEPRINT_FILE(), JSON.stringify(bp, null, 2));
}

// Swap data-logo-v anchor content: img if assets/logo.{ext} exists, site name text otherwise
function applyLogoV(pages) {
  try {
    const distDir = DIST_DIR();
    const spec = readSpec();
    const siteName = spec.site_name || spec.design_brief?.business_name || '';

    const logoSvg = fs.existsSync(path.join(distDir, 'assets', 'logo.svg'));
    const logoPng = fs.existsSync(path.join(distDir, 'assets', 'logo.png'));
    const logoFile = logoSvg ? 'assets/logo.svg' : logoPng ? 'assets/logo.png' : null;

    const newContent = logoFile
      ? `<img src="${logoFile}" alt="${siteName}" class="h-10 w-auto">`
      : siteName;

    const logoVRegex = /(<a[^>]*data-logo-v[^>]*>)([\s\S]*?)(<\/a>)/i;

    // Update the canonical nav partial first so syncNavPartial won't clobber it
    const navPartialPath = path.join(distDir, '_partials', '_nav.html');
    if (fs.existsSync(navPartialPath)) {
      let nav = fs.readFileSync(navPartialPath, 'utf8');
      if (logoVRegex.test(nav)) {
        nav = nav.replace(logoVRegex, `$1${newContent}$3`);
        fs.writeFileSync(navPartialPath, nav);
      }
    }

    // Update all pages
    let updated = 0;
    const allPages = pages || listPages();
    for (const page of allPages) {
      const filePath = path.join(distDir, page);
      if (!fs.existsSync(filePath)) continue;
      let html = fs.readFileSync(filePath, 'utf8');
      if (logoVRegex.test(html)) {
        html = html.replace(logoVRegex, `$1${newContent}$3`);
        fs.writeFileSync(filePath, html);
        updated++;
      }
    }

    if (updated > 0) {
      console.log(`[logo-v] Applied ${logoFile ? 'image' : 'text'} logo to ${updated} page(s)`);
    }
  } catch (err) {
    console.error('[logo-v] Error:', err.message);
  }
}

// Patch a slot img tag regardless of attribute order — finds the full <img> tag by slot-id,
// then does targeted replacements for src and/or data-slot-status within it.
// Returns { html, changed } — html is the (possibly modified) string.
function patchSlotImg(html, escapedId, { src, status } = {}) {
  const imgRegex = new RegExp(`<img([^>]*data-slot-id=["']${escapedId}["'][^>]*)>`, 'i');
  let changed = false;
  const result = html.replace(imgRegex, (match, attrs) => {
    let a = attrs;
    if (src !== undefined)    a = a.replace(/src=["'][^"']*["']/i, `src="${src}"`);
    if (status !== undefined) a = a.replace(/data-slot-status=["'][^"']*["']/i, `data-slot-status="${status}"`);
    if (a !== attrs) changed = true;
    return `<img${a}>`;
  });
  return { html: result, changed };
}

// Re-apply saved slot→image mappings after builds so uploads/stock photos survive rebuilds
function reapplySlotMappings(writtenPages) {
  try {
    const spec = readSpec();
    const mappings = spec.slot_mappings;
    if (!mappings || Object.keys(mappings).length === 0) return;

    const distDir = DIST_DIR();
    let applied = 0;

    for (const page of writtenPages) {
      const filePath = path.join(distDir, page);
      if (!fs.existsSync(filePath)) continue;
      let html = fs.readFileSync(filePath, 'utf8');
      let changed = false;

      for (const [slotId, mapping] of Object.entries(mappings)) {
        const escapedId = slotId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const patched = patchSlotImg(html, escapedId, { src: mapping.src, status: 'uploaded' });
        if (patched.changed) {
          html = patched.html;
          changed = true;
          applied++;
        }
      }

      if (changed) {
        fs.writeFileSync(filePath, html);
      }
    }

    if (applied > 0) {
      console.log(`[slot-mappings] Re-applied ${applied} image mapping(s) across ${writtenPages.length} page(s)`);
    }
  } catch (err) {
    console.error('[slot-mappings] Error re-applying mappings:', err.message);
  }
}

// Remove slot_mappings keys that no longer correspond to any data-slot-id in any page
function reconcileSlotMappings() {
  try {
    const distDir = DIST_DIR();
    const spec = readSpec();
    if (!spec.slot_mappings || Object.keys(spec.slot_mappings).length === 0) return { removed: [] };

    // Collect all real slot IDs across every page
    const realSlotIds = new Set();
    for (const page of listPages()) {
      const filePath = path.join(distDir, page);
      if (!fs.existsSync(filePath)) continue;
      const html = fs.readFileSync(filePath, 'utf8');
      for (const m of html.matchAll(/data-slot-id=["']([^"']+)["']/gi)) {
        realSlotIds.add(m[1]);
      }
    }

    const orphans = Object.keys(spec.slot_mappings).filter(id => !realSlotIds.has(id));
    if (orphans.length > 0) {
      for (const id of orphans) delete spec.slot_mappings[id];
      writeSpec(spec);
      console.log(`[reconcile] Removed ${orphans.length} orphaned mapping(s): ${orphans.join(', ')}`);
    }

    return { removed: orphans };
  } catch (err) {
    console.error('[reconcile] Error:', err.message);
    return { removed: [] };
  }
}

function updateBlueprint(writtenPages) {
  const bp = readBlueprint() || { version: 1, pages: {}, global: {}, last_updated: null };
  const distDir = DIST_DIR();

  for (const page of writtenPages) {
    const htmlPath = path.join(distDir, page);
    if (!fs.existsSync(htmlPath)) continue;
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Extract sections — prefer id attribute, skip Tailwind utility classes
    const sections = [];
    const sectionMatches = html.matchAll(/<section[^>]*(?:id=["']([^"']+)["'])?[^>]*(?:class=["']([^"']+)["'])?[^>]*>/gi);
    let sectionIdx = 0;
    const isTailwindClass = (cls) => /^-?[a-z]+(?:-[a-z0-9/[\].]+)+$/.test(cls) || /^(?:relative|absolute|fixed|sticky|flex|grid|block|inline|hidden|overflow|container)$/.test(cls);
    for (const m of sectionMatches) {
      sectionIdx++;
      if (m[1]) {
        // Has id — use it (most semantic)
        if (!sections.includes(m[1])) sections.push(m[1]);
      } else if (m[2]) {
        // No id — find first semantic class (skip Tailwind utilities)
        const classes = m[2].split(/\s+/);
        const semantic = classes.find(c => !isTailwindClass(c));
        const label = semantic || `section-${sectionIdx}`;
        if (!sections.includes(label)) sections.push(label);
      } else {
        sections.push(`section-${sectionIdx}`);
      }
    }

    // Extract components — popups, modals, overlays
    const components = [];
    const compMatches = html.matchAll(/<(?:div|section|aside)[^>]*class=["'][^"']*\b(popup|modal|overlay|lightbox|drawer|dialog)\b[^"']*["'][^>]*>/gi);
    for (const m of compMatches) {
      const type = m[1].toLowerCase();
      if (!components.find(c => c.type === type)) {
        components.push({ type, added: new Date().toISOString().split('T')[0] });
      }
    }

    // Extract title from <title> tag
    const titleMatch = html.match(/<title[^>]*>([^<|]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : page.replace('.html', '');

    // Merge with existing entry — preserve layout_notes from previous runs
    const existing = bp.pages[page] || {};
    bp.pages[page] = {
      title,
      sections,
      components: mergeComponents(existing.components || [], components),
      layout_notes: existing.layout_notes || [],
    };
  }

  // Extract global nav/footer structure from index.html
  const indexPath = path.join(distDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    const navMatch = indexHtml.match(/<nav[^>]*class=["']([^"']+)["']/i);
    if (navMatch) bp.global.nav_style = navMatch[1].substring(0, 100);
    const footerMatch = indexHtml.match(/<footer[^>]*class=["']([^"']+)["']/i);
    if (footerMatch) bp.global.footer_style = footerMatch[1].substring(0, 100);
    // Detect logo
    const logoSvg = fs.existsSync(path.join(distDir, 'assets', 'logo.svg'));
    const logoPng = fs.existsSync(path.join(distDir, 'assets', 'logo.png'));
    if (logoSvg) bp.global.logo = 'assets/logo.svg';
    else if (logoPng) bp.global.logo = 'assets/logo.png';
  }

  writeBlueprint(bp);
  console.log(`[blueprint] Updated for ${writtenPages.length} page(s)`);
  return bp;
}

function mergeComponents(existing, extracted) {
  const merged = [...existing];
  for (const comp of extracted) {
    if (!merged.find(c => c.type === comp.type && c.content === comp.content)) {
      merged.push(comp);
    }
  }
  return merged;
}

function buildBlueprintContext(page) {
  const bp = readBlueprint();
  if (!bp || !bp.pages) return '';

  const entry = bp.pages[page];
  if (!entry) return '';

  let ctx = `\nBLUEPRINT FOR ${page}:`;
  if (entry.sections.length > 0) {
    ctx += `\nRequired sections: ${entry.sections.join(', ')}`;
  }
  if (entry.components.length > 0) {
    ctx += `\nComponents that MUST be preserved: ${entry.components.map(c => `${c.type}${c.trigger ? ` (trigger: ${c.trigger})` : ''}${c.content ? ` — ${c.content}` : ''}`).join('; ')}`;
  }
  if (entry.layout_notes.length > 0) {
    ctx += `\nLayout rules: ${entry.layout_notes.join('; ')}`;
  }
  ctx += '\nThese sections and components currently exist. Preserve them UNLESS the user explicitly asks to remove, replace, or restructure them. User requests always take priority over the blueprint.\n';
  return ctx;
}

// --- Session Summaries ---
function loadSessionSummaries(count) {
  if (!fs.existsSync(SUMMARIES_DIR())) return [];
  const files = fs.readdirSync(SUMMARIES_DIR())
    .filter(f => f.endsWith('.md'))
    .sort()
    .slice(-(count || 3));
  return files.map(f => {
    const content = fs.readFileSync(path.join(SUMMARIES_DIR(), f), 'utf8');
    return { file: f, content };
  });
}

function generateSessionSummary(ws) {
  return new Promise((resolve) => {
    // Read recent conversation
    if (!fs.existsSync(CONVO_FILE())) return resolve();
    const lines = fs.readFileSync(CONVO_FILE(), 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length < 3) return resolve();

    // Take last 40 messages for summary context
    const recent = lines.slice(-40).map(l => {
      try { return JSON.parse(l); } catch { return null; }
    }).filter(Boolean);

    const convoText = recent.map(m => `[${m.role}] ${m.content}`).join('\n');

    const prompt = `Summarize this website design conversation in 3-5 bullet points. Focus on:
- Key decisions made (design, layout, content)
- What was built or changed
- Open items or next steps discussed

Keep it concise — this summary will be injected into future sessions for context continuity.

CONVERSATION:
${convoText}

SUMMARY:`;

    // Notify client that summary is being generated (if still connected)
    if (ws && ws.readyState === 1) {
      try { ws.send(JSON.stringify({ type: 'status', content: 'Generating session summary...' })); } catch {}
    }

    const child = spawnClaude(prompt);
    const summaryTimeout = setTimeout(() => { console.error('[summary] Timed out after 2 minutes'); child.kill(); }, 120000);

    let response = '';
    child.stdout.on('data', (chunk) => { response += chunk.toString(); });
    child.stderr.on('data', (chunk) => { console.error('[summary]', chunk.toString()); });

    child.on('close', (code) => {
      clearTimeout(summaryTimeout);
      if (code !== 0 || !response.trim()) {
        console.error('[summary] Failed to generate session summary');
        return resolve();
      }

      fs.mkdirSync(SUMMARIES_DIR(), { recursive: true });
      const sessionNum = (getStudioSessionCount() || 0).toString().padStart(3, '0');
      const summaryFile = path.join(SUMMARIES_DIR(), `session-${sessionNum}.md`);
      const header = `# Session ${sessionNum} — ${new Date().toISOString().split('T')[0]}\n\n`;
      fs.writeFileSync(summaryFile, header + response.trim() + '\n');
      console.log(`[summary] Wrote session summary: ${summaryFile}`);

      // Also store in .studio.json
      try {
        const studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
        studio.conversation_summary = response.trim();
        fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2));
      } catch {}
      resolve();
    });
  });
}

function getStudioSessionCount() {
  try {
    const studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
    return studio.session_count || 0;
  } catch { return 0; }
}

// --- Studio Persistence ---
function loadStudio() {
  if (fs.existsSync(STUDIO_FILE())) {
    try {
      const studio = JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8'));
      currentPage = studio.current_page || 'index.html';
      // Verify current page still exists
      if (!fs.existsSync(path.join(DIST_DIR(), currentPage))) {
        currentPage = 'index.html';
      }
      return studio;
    } catch (e) {
      console.error('[studio] Failed to load .studio.json:', e.message);
    }
  }
  return null;
}

function saveStudio() {
  let studio;
  if (fs.existsSync(STUDIO_FILE())) {
    try { studio = JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')); } catch { studio = null; }
  }
  if (!studio) {
    studio = {
      version: 1,
      tag: TAG,
      created_at: new Date().toISOString(),
      session_count: 0,
      sessions: [],
    };
  }
  studio.updated_at = new Date().toISOString();
  studio.current_page = currentPage;
  fs.mkdirSync(SITE_DIR(), { recursive: true });
  fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2));
  return studio;
}

async function endSession(ws) {
  if (!fs.existsSync(STUDIO_FILE())) return;
  try {
    const studio = JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8'));
    // Update the most recent session
    if (studio.sessions && studio.sessions.length > 0) {
      const last = studio.sessions[studio.sessions.length - 1];
      if (!last.ended_at) {
        last.ended_at = new Date().toISOString();
        last.message_count = sessionMessageCount;
      }
    }
    studio.updated_at = new Date().toISOString();
    fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2));

    // Generate session summary before closing — await so it completes before disconnect
    if (sessionMessageCount >= 3 && loadSettings().auto_summary) {
      await generateSessionSummary(ws);
    }
  } catch (e) {
    console.error('[studio] Failed to save session end:', e.message);
  }
}

function startSession() {
  let studio;
  if (fs.existsSync(STUDIO_FILE())) {
    try { studio = JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')); } catch { studio = null; }
  }
  if (!studio) {
    studio = {
      version: 1,
      tag: TAG,
      created_at: new Date().toISOString(),
      session_count: 0,
      sessions: [],
    };
  }
  studio.session_count = (studio.session_count || 0) + 1;
  if (!studio.sessions) studio.sessions = [];
  studio.sessions.push({ session_id: studio.session_count, started_at: new Date().toISOString() });
  // Keep only last 20 sessions
  if (studio.sessions.length > 20) {
    studio.sessions = studio.sessions.slice(-20);
  }
  studio.updated_at = new Date().toISOString();
  studio.current_page = currentPage;
  fs.mkdirSync(SITE_DIR(), { recursive: true });
  fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2));
  sessionMessageCount = 0;
  sessionStartedAt = new Date().toISOString();
  return studio;
}

// Helper: list HTML pages in dist
function listPages() {
  if (!fs.existsSync(DIST_DIR())) return [];
  return fs.readdirSync(DIST_DIR())
    .filter(f => f.endsWith('.html') && !f.startsWith('_'))
    .sort((a, b) => {
      if (a === 'index.html') return -1;
      if (b === 'index.html') return 1;
      return a.localeCompare(b);
    });
}

// --- Express app ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// CSRF protection — reject cross-origin mutations
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  const origin = req.get('origin') || req.get('referer') || '';
  const allowed = [`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`];
  if (!allowed.some(a => origin.startsWith(a))) {
    return res.status(403).json({ error: 'Cross-origin request blocked' });
  }
  next();
});

// Serve spec.json
// Deploy & environment info (structured: local + staging + production)
app.get('/api/deploy-info', (req, res) => {
  try {
    const spec = readSpec();
    const envs = spec.environments || {};

    // Hub repo info (cached at startup — doesn't change at runtime)

    res.json({
      local: {
        url: `http://localhost:${PREVIEW_PORT}`,
        status: 'running',
        site_dir: SITE_DIR(),
        dist_dir: DIST_DIR(),
        spec_file: SPEC_FILE(),
      },
      staging: envs.staging ? {
        url: envs.staging.url || null,
        state: envs.staging.state || 'not deployed',
        deployed_at: envs.staging.deployed_at || null,
        provider: envs.staging.provider || null,
        site_id: envs.staging.site_id || null,
        custom_domain: envs.staging.custom_domain || null,
      } : null,
      production: envs.production ? {
        url: envs.production.url || null,
        state: envs.production.state || 'not deployed',
        deployed_at: envs.production.deployed_at || null,
        provider: envs.production.provider || null,
        site_id: envs.production.site_id || null,
        custom_domain: envs.production.custom_domain || null,
        repo: envs.production.repo || null,
      } : null,
      hub_repo: _hubRepoCache,
      site_repo: spec.site_repo || null,
      // Backward compat
      deployed: !!(envs.staging?.url || envs.production?.url),
      url: envs.production?.url || envs.staging?.url || null,
    });
  } catch {
    res.json({ local: {}, staging: null, production: null, repo: null, deployed: false });
  }
});

// Create production repo for the current site
app.post('/api/create-site-repo', (req, res) => {
  const client = [...wss.clients].find(c => c.readyState === 1);
  if (!client) return res.status(400).json({ error: 'No WebSocket client connected' });
  createSiteRepo(client);
  res.json({ success: true, message: 'Creating site repo...' });
});

// Manually set repo path/remote for an environment (for adopting existing repos)
// Set the site repo path/remote (for adopting existing repos)
app.put('/api/site-repo', (req, res) => {
  const { repoPath, remote } = req.body;
  if (!repoPath) return res.status(400).json({ error: 'repoPath required' });
  const resolvedPath = path.resolve(repoPath);
  const home = require('os').homedir();
  if (!resolvedPath.startsWith(home + path.sep) && resolvedPath !== home) {
    return res.status(400).json({ error: 'repoPath must be under home directory' });
  }

  const spec = readSpec();
  spec.site_repo = {
    path: resolvedPath,
    remote: remote || null,
  };
  writeSpec(spec);
  res.json({ success: true, site_repo: spec.site_repo });
});

app.get('/api/spec', (req, res) => {
  const spec = readSpec();
  if (Object.keys(spec).length > 0) {
    res.json(spec);
  } else {
    res.json({ error: 'No spec.json found' });
  }
});

// Alias used by client code: wraps spec in { spec } envelope
app.get('/api/site-info', (req, res) => {
  const spec = readSpec();
  res.json({ spec });
});

// Serve conversation history
app.get('/api/history', (req, res) => {
  if (!fs.existsSync(CONVO_FILE())) return res.json([]);
  const lines = fs.readFileSync(CONVO_FILE(), 'utf8').trim().split('\n').filter(Boolean);
  const messages = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  res.json(messages);
});

// List assets
app.get('/api/assets', (req, res) => {
  const assetsDir = path.join(DIST_DIR(), 'assets');
  if (!fs.existsSync(assetsDir)) return res.json([]);
  const files = fs.readdirSync(assetsDir).filter(f => /\.(svg|png|jpg|gif|ico)$/i.test(f));
  res.json(files.map(f => ({
    name: f,
    path: `/assets/${f}`,
    fullPath: path.join(assetsDir, f),
    type: path.extname(f).slice(1),
    size: fs.statSync(path.join(assetsDir, f)).size,
  })));
});

// Serve asset files directly
app.use('/site-assets', express.static(path.join(DIST_DIR(), 'assets')));

// Get site config
app.get('/api/config', (req, res) => {
  res.json({ tag: TAG, previewPort: PREVIEW_PORT, studioPort: PORT, sitesRoot: SITES_ROOT });
});

// Server info — session metadata, uptime, file status
app.get('/api/server-info', (req, res) => {
  const settings = loadSettings();
  const studio = loadStudio();
  let serverFileModified = null;
  try { serverFileModified = fs.statSync(path.join(__dirname, 'server.js')).mtime.toISOString(); } catch {}
  let indexFileModified = null;
  try { indexFileModified = fs.statSync(path.join(__dirname, 'public', 'index.html')).mtime.toISOString(); } catch {}
  res.json({
    tag: TAG,
    studioPort: PORT,
    previewPort: PREVIEW_PORT,
    model: settings.model || 'unknown',
    startedAt: serverStartedAt,
    uptime: Math.floor(process.uptime()),
    sessionId: studio?.session_count || 0,
    sessionStartedAt,
    messageCount: sessionMessageCount,
    currentPage,
    currentMode,
    buildInProgress,
    activeClients: activeClientCount,
    pages: listPages(),
    nodeVersion: process.version,
    serverFileModified,
    indexFileModified,
    heroFullWidth: settings.hero_full_width ?? true,
  });
});

// Restart server (requires wrapper script to auto-restart on exit 0)
app.post('/api/restart', (req, res) => {
  res.json({ success: true, message: 'Server restarting...' });
  // Notify all WS clients
  wss.clients.forEach(client => {
    try { client.send(JSON.stringify({ type: 'server-restarting' })); } catch {}
  });
  // Graceful exit — wrapper script restarts the process
  setTimeout(() => gracefulShutdown(), 500);
});

// List pages and current page
app.get('/api/pages', (req, res) => {
  res.json({ pages: listPages(), currentPage });
});

// Set current page
app.post('/api/pages/current', (req, res) => {
  const page = req.body.page;
  if (!page) return res.status(400).json({ error: 'page required' });
  if (!isValidPageName(page)) return res.status(400).json({ error: 'Invalid page name' });
  if (!fs.existsSync(path.join(DIST_DIR(), page))) {
    return res.status(404).json({ error: 'Page not found' });
  }
  currentPage = page;
  saveStudio();
  res.json({ currentPage });
});

// List available templates
app.get('/api/templates', (req, res) => {
  const templatesDir = path.join(HUB_ROOT, 'config', 'site-templates');
  if (!fs.existsSync(templatesDir)) return res.json([]);
  const templates = fs.readdirSync(templatesDir).filter(d =>
    fs.statSync(path.join(templatesDir, d)).isDirectory() &&
    fs.existsSync(path.join(templatesDir, d, 'index.html'))
  );
  res.json(templates);
});

// Studio state — brief, decisions, files, spec
app.get('/api/studio-state', (req, res) => {
  const spec = readSpec();
  const stateFile = path.join(SITE_DIR(), 'state.json');
  const state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, 'utf8')) : {};

  // Gather files
  const files = [];
  if (fs.existsSync(DIST_DIR())) {
    const walk = (dir, prefix) => {
      for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        const rel = prefix ? `${prefix}/${f}` : f;
        if (fs.statSync(full).isDirectory()) {
          walk(full, rel);
        } else {
          files.push({ name: rel, size: fs.statSync(full).size });
        }
      }
    };
    walk(DIST_DIR(), 'dist');
  }

  res.json({
    tag: TAG,
    lastUpdated: state.last_build || null,
    brief: spec.design_brief || null,
    decisions: (spec.design_decisions || []).filter(d => d.status === 'approved').slice(-10),
    files,
    spec,
    previewUrl: `http://localhost:${PREVIEW_PORT}`,
  });
});

// --- Upload endpoint ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Check upload limit
  const spec = readSpec();
  const existingUploads = spec.uploaded_assets || [];
  const uploadLimit = loadSettings().max_uploads_per_site || MAX_UPLOADS_PER_SITE;
  if (existingUploads.length >= uploadLimit) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: `Upload limit reached (max ${uploadLimit} per site). Delete unused uploads to make room.` });
  }

  // Sanitize SVGs
  if (/\.svg$/i.test(req.file.filename)) {
    const svgContent = fs.readFileSync(req.file.path, 'utf8');
    const sanitized = sanitizeSvg(svgContent);
    fs.writeFileSync(req.file.path, sanitized);
  }

  // Read role from form data (default to 'content')
  const role = req.body.role || 'content';
  const label = req.body.label || '';
  const notes = req.body.notes || '';

  // Determine type from extension
  const ext = path.extname(req.file.filename).toLowerCase();

  // Handle template imports
  if (role === 'template') {
    fs.mkdirSync(DIST_DIR(), { recursive: true });

    if (ext === '.html') {
      // Version existing index.html before overwriting
      versionFile('index.html', 'template_import');
      fs.copyFileSync(req.file.path, path.join(DIST_DIR(), 'index.html'));
      fs.unlinkSync(req.file.path); // clean up from uploads dir
      // Update spec
      spec.template_imported = true;
      spec.template_source = req.file.originalname;
      writeSpec(spec);
      return res.json({ success: true, message: `Template imported as index.html`, imported: 'index.html' });
    }

    if (ext === '.zip') {
      const { execSync } = require('child_process');
      const os = require('os');
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fam-zip-'));
      try {
        execSync(`unzip -o "${req.file.path}" -d "${tmpDir}"`, { stdio: 'pipe' });
        fs.unlinkSync(req.file.path);
        // Validate extracted paths — reject any traversal attempts
        const extractedFiles = [];
        const walk = (dir) => {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            const rel = path.relative(tmpDir, full);
            if (rel.startsWith('..') || path.isAbsolute(rel)) {
              throw new Error(`Path traversal detected in ZIP: ${rel}`);
            }
            if (entry.isDirectory()) walk(full);
            else extractedFiles.push(rel);
          }
        };
        walk(tmpDir);
        // Safe — copy validated files to dist
        fs.mkdirSync(DIST_DIR(), { recursive: true });
        for (const rel of extractedFiles) {
          const dest = path.join(DIST_DIR(), rel);
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.copyFileSync(path.join(tmpDir, rel), dest);
        }
        fs.rmSync(tmpDir, { recursive: true, force: true });
        spec.template_imported = true;
        spec.template_source = req.file.originalname;
        writeSpec(spec);
        const imported = extractedFiles.filter(f => f.endsWith('.html'));
        return res.json({ success: true, message: `Template extracted: ${imported.join(', ')}`, imported });
      } catch (e) {
        try { fs.unlinkSync(req.file.path); } catch {}
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        return res.status(400).json({ error: 'Failed to extract ZIP: ' + e.message });
      }
    }

    // Not a supported template format
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Templates must be .html or .zip files' });
  }

  let fileType = 'image';
  if (ext === '.svg') fileType = 'logo'; // default SVGs to logo, user can change

  // Store metadata in spec.json
  const asset = {
    filename: req.file.filename,
    type: fileType,
    role,
    label,
    notes,
    uploaded_at: new Date().toISOString(),
  };

  if (!spec.uploaded_assets) spec.uploaded_assets = [];
  spec.uploaded_assets.push(asset);
  writeSpec(spec);

  // If role is logo, copy to canonical assets/logo.{ext} and swap all data-logo-v elements
  if (role === 'logo') {
    const canonicalPath = path.join(DIST_DIR(), 'assets', `logo${ext}`);
    fs.mkdirSync(path.join(DIST_DIR(), 'assets'), { recursive: true });
    fs.copyFileSync(req.file.path, canonicalPath);
    applyLogoV(listPages());
  }

  res.json({
    success: true,
    asset,
    path: `/assets/uploads/${req.file.filename}`,
  });
});

// Update asset metadata (role, label, notes)
app.put('/api/upload/:filename', (req, res) => {
  const spec = readSpec();
  const assets = spec.uploaded_assets || [];
  const asset = assets.find(a => a.filename === req.params.filename);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (req.body.role) asset.role = req.body.role;
  if (req.body.label !== undefined) asset.label = req.body.label;
  if (req.body.notes !== undefined) asset.notes = req.body.notes;

  writeSpec(spec);
  res.json({ success: true, asset });
});

// Delete an uploaded asset — removes file from disk and from spec
app.delete('/api/upload/:filename', (req, res) => {
  const filename = req.params.filename;
  if (!/^[a-zA-Z0-9._\-]+$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Remove file from disk
  const filePath = path.join(UPLOADS_DIR(), filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Remove from spec.uploaded_assets
  const spec = readSpec();
  spec.uploaded_assets = (spec.uploaded_assets || []).filter(a => a.filename !== filename);
  writeSpec(spec);

  res.json({ success: true, filename });
});

// List uploaded assets
app.get('/api/uploads', (req, res) => {
  const spec = readSpec();
  const assets = (spec.uploaded_assets || []).map(a => ({
    ...a,
    url: `/assets/uploads/${a.filename}`,
    exists: fs.existsSync(path.join(UPLOADS_DIR(), a.filename)),
  }));
  res.json(assets);
});

// Serve uploaded files (images only — never execute)
app.use('/assets/uploads', express.static(UPLOADS_DIR(), {
  setHeaders: (res, filePath) => {
    res.set('X-Content-Type-Options', 'nosniff');
    // Force SVGs to be served as images, not executed
    if (filePath.endsWith('.svg')) {
      res.set('Content-Type', 'image/svg+xml');
    }
  },
}));

// --- Version History API ---
app.get('/api/versions', (req, res) => {
  const page = req.query.page || null;
  const versions = getVersions(page);
  res.json(versions.reverse()); // newest first
});

app.get('/api/versions/:page/:timestamp', (req, res) => {
  const page = req.params.page + '.html';
  if (!isValidPageName(page)) return res.status(400).json({ error: 'Invalid page name' });

  const versions = getVersions(page);
  const target = versions.find(v => v.timestamp === req.params.timestamp);
  if (!target) return res.status(404).json({ error: 'Version not found' });

  const versionPath = path.join(VERSIONS_DIR(), path.basename(target.file));
  if (!fs.existsSync(versionPath)) return res.status(404).json({ error: 'Version file missing' });

  const content = fs.readFileSync(versionPath, 'utf8');
  res.json({ ...target, content });
});

app.post('/api/rollback', (req, res) => {
  const { page, timestamp } = req.body;
  if (!page || !timestamp) return res.status(400).json({ error: 'page and timestamp required' });
  if (!isValidPageName(page)) return res.status(400).json({ error: 'Invalid page name' });

  const result = rollbackToVersion(page, timestamp);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// --- Brief Edit API ---
app.put('/api/brief', (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'JSON body required' });
  const spec = readSpec();
  if (!spec.design_brief) spec.design_brief = {};
  // Merge partial fields into existing brief — only allowed keys, with type checks
  const allowed = ['goal', 'audience', 'tone', 'visual_direction', 'content_priorities', 'must_have_sections', 'avoid'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      // Strings stay strings, arrays stay arrays, objects stay objects
      const val = req.body[key];
      if (typeof val === 'string' && val.length > 5000) return res.status(400).json({ error: `${key} exceeds max length` });
      spec.design_brief[key] = val;
    }
  }
  writeSpec(spec);
  // Broadcast to connected clients
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'spec-updated', spec }));
    }
  });
  res.json({ success: true, brief: spec.design_brief });
});

// --- Decisions CRUD API ---
app.put('/api/decisions', (req, res) => {
  const spec = readSpec();
  if (!spec.design_decisions) spec.design_decisions = [];
  const { action, index, decision } = req.body;

  switch (action) {
    case 'add': {
      if (!decision || !decision.category || !decision.decision) {
        return res.status(400).json({ error: 'category and decision text required' });
      }
      const validCategories = ['typography', 'layout', 'color', 'content', 'interaction', 'structure'];
      const validStatuses = ['approved', 'rejected', 'superseded'];
      if (!validCategories.includes(decision.category)) {
        return res.status(400).json({ error: `category must be one of: ${validCategories.join(', ')}` });
      }
      if (typeof decision.decision !== 'string' || decision.decision.length > 500) {
        return res.status(400).json({ error: 'decision text required and must be under 500 chars' });
      }
      if (decision.status && !validStatuses.includes(decision.status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
      }
      spec.design_decisions.push({
        timestamp: new Date().toISOString(),
        category: decision.category,
        decision: decision.decision,
        status: decision.status || 'approved',
      });
    }
      break;
    case 'update':
      if (index === undefined || index < 0 || index >= spec.design_decisions.length) {
        return res.status(400).json({ error: 'invalid index' });
      }
      if (decision.category) spec.design_decisions[index].category = decision.category;
      if (decision.decision) spec.design_decisions[index].decision = decision.decision;
      if (decision.status) spec.design_decisions[index].status = decision.status;
      break;
    case 'delete':
      if (index === undefined || index < 0 || index >= spec.design_decisions.length) {
        return res.status(400).json({ error: 'invalid index' });
      }
      spec.design_decisions.splice(index, 1);
      break;
    default:
      return res.status(400).json({ error: 'action must be add, update, or delete' });
  }

  writeSpec(spec);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'spec-updated', spec }));
    }
  });
  res.json({ success: true, decisions: spec.design_decisions });
});

// --- Sessions API ---
app.get('/api/sessions', (req, res) => {
  let studio;
  try {
    studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
  } catch { studio = {}; }

  const sessions = (studio.sessions || []).map((s, i) => {
    const entry = {
      index: i,
      session_id: s.session_id || i + 1,
      started_at: s.started_at,
      ended_at: s.ended_at || null,
      message_count: s.message_count || 0,
      summary_preview: null,
    };
    // Enrich with summary preview if exists
    const summaryFile = path.join(SUMMARIES_DIR(), `session-${String(entry.session_id).padStart(3, '0')}.md`);
    if (fs.existsSync(summaryFile)) {
      const content = fs.readFileSync(summaryFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#')).slice(0, 2);
      entry.summary_preview = lines.join(' ').substring(0, 120);
    }
    return entry;
  });

  res.json(sessions);
});

app.post('/api/sessions/load', (req, res) => {
  const { session_index } = req.body;
  let studio;
  try {
    studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
  } catch { studio = {}; }

  const sessions = studio.sessions || [];
  if (session_index === undefined || session_index < 0 || session_index >= sessions.length) {
    return res.status(400).json({ error: 'invalid session_index' });
  }

  const session = sessions[session_index];
  if (!session.started_at) {
    return res.status(400).json({ error: 'session has no start time' });
  }

  // Read conversation and filter by timestamp range
  if (!fs.existsSync(CONVO_FILE())) return res.json([]);
  const lines = fs.readFileSync(CONVO_FILE(), 'utf8').trim().split('\n').filter(Boolean);
  const startTime = new Date(session.started_at).getTime();
  const endTime = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();

  const messages = lines.map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean).filter(m => {
    // Filter by session_id if present, otherwise by timestamp
    if (m.session_id && session.session_id) {
      return m.session_id === session.session_id;
    }
    if (m.at) {
      const t = new Date(m.at).getTime();
      return t >= startTime && t <= endTime;
    }
    return false;
  });

  res.json({ session, messages });
});

// --- Retrofit Slot Attributes for Pre-Slot HTML ---
// Scans existing <img> tags in dist/ pages and adds data-slot-id, data-slot-role,
// data-slot-status attributes. Rebuilds media_specs from actual HTML reality.
// Only runs if pages have <img> tags but no data-slot-id attributes.
function retrofitSlotAttributes() {
  const pages = listPages();
  const distDir = DIST_DIR();
  let totalImgs = 0;
  let totalSlotted = 0;
  let hasAnySlots = false;

  // First pass: check if any page already has slot attributes
  for (const page of pages) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    if (html.match(/data-slot-id=/i)) { hasAnySlots = true; break; }
    totalImgs += (html.match(/<img[^>]*>/gi) || []).length;
  }

  // Skip if site already has slot attributes or has no images at all
  if (hasAnySlots || totalImgs === 0) return 0;

  console.log(`[retrofit] Site has ${totalImgs} <img> tag(s) but no slot attributes — retrofitting`);

  const newMediaSpecs = [];
  const usedIds = new Set();

  for (const page of pages) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    let pageCounter = 0;

    // Find all <img> tags
    const imgRegex = /<img([^>]*)>/gi;
    html = html.replace(imgRegex, (fullMatch, attrs) => {
      // Skip if already has slot attributes (shouldn't happen given check above)
      if (attrs.match(/data-slot-id=/i)) return fullMatch;

      pageCounter++;
      const pageName = page.replace('.html', '');

      // Infer role from context: alt text, src filename, class names, surrounding HTML
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      const srcMatch = attrs.match(/src=["']([^"']*)["']/i);
      const alt = (altMatch ? altMatch[1] : '').toLowerCase();
      const src = (srcMatch ? srcMatch[1] : '').toLowerCase();
      const combined = `${alt} ${src} ${attrs.toLowerCase()}`;

      let role = 'gallery'; // default
      if (combined.match(/hero|banner|jumbotron/)) role = 'hero';
      else if (combined.match(/logo|brand/)) role = 'logo';
      else if (combined.match(/team|staff|headshot|member/)) role = 'team';
      else if (combined.match(/testimonial|review|quote/)) role = 'testimonial';
      else if (combined.match(/service|feature|offering/)) role = 'service';
      else if (combined.match(/favicon/)) role = 'favicon';
      else if (combined.match(/gallery|portfolio|project|showcase/)) role = 'gallery';
      else if (combined.match(/about|story|company/)) role = 'service';

      // Generate unique slot_id
      let slotId = `${pageName}-${role}-${pageCounter}`;
      while (usedIds.has(slotId)) {
        pageCounter++;
        slotId = `${pageName}-${role}-${pageCounter}`;
      }
      usedIds.add(slotId);

      // Determine status from src
      let status = 'empty';
      if (src.match(/assets\/uploads\//)) status = 'uploaded';
      else if (src.match(/assets\/placeholders\//) || src.match(/assets\/stock\//)) status = 'stock';
      else if (src.match(/data:image\/gif/)) status = 'empty';
      else if (src && !src.match(/placeholder|picsum|via\.placeholder/)) status = 'uploaded';

      const dimensions = SLOT_DIMENSIONS[role] || '800x600';
      newMediaSpecs.push({ slot_id: slotId, role, dimensions, status, page });

      // Add slot attributes to the tag
      modified = true;
      totalSlotted++;
      return `<img data-slot-id="${slotId}" data-slot-role="${role}" data-slot-status="${status}"${attrs}>`;
    });

    if (modified) {
      fs.writeFileSync(filePath, html);
    }
  }

  // Replace media_specs entirely with what we found in HTML
  if (newMediaSpecs.length > 0) {
    const spec = readSpec();
    spec.media_specs = newMediaSpecs;
    writeSpec(spec);
    console.log(`[retrofit] Added slot attributes to ${totalSlotted} <img> tag(s), registered ${newMediaSpecs.length} slot(s)`);
  }

  return totalSlotted;
}

// --- Auto-Tag Missing Slots (Conditional Post-Processor) ---
// Runs only when verification detects images missing slot attributes.
// Adapted from retrofitSlotAttributes but works per-image (not all-or-nothing).
// Dynamic CRUD: creates slots for new images, idempotent, content-derived IDs.
function autoTagMissingSlots(pages) {
  const distDir = DIST_DIR();
  let totalFixed = 0;
  const usedIds = new Set();

  // Collect ALL existing slot IDs across the site to prevent collisions
  const allPages = listPages();
  for (const p of allPages) {
    const fp = path.join(distDir, p);
    if (!fs.existsSync(fp)) continue;
    const h = fs.readFileSync(fp, 'utf8');
    const idMatches = h.matchAll(/data-slot-id=["']([^"']+)["']/gi);
    for (const m of idMatches) usedIds.add(m[1]);
  }

  // Also collect existing slot_mappings src values for orphan prevention
  const spec = readSpec();
  const mappingsBySrc = new Map();
  if (spec.slot_mappings) {
    for (const [slotId, mapping] of Object.entries(spec.slot_mappings)) {
      if (mapping.src) mappingsBySrc.set(mapping.src, slotId);
    }
  }

  // Find logo anchor spans to exclude logo images
  const logoVRegex = /(<a[^>]*data-logo-v[^>]*>)([\s\S]*?)(<\/a>)/gi;

  for (const page of pages) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const pageName = page.replace('.html', '');

    // Find all logo anchor ranges to skip images inside them
    const logoRanges = [];
    let logoMatch;
    while ((logoMatch = logoVRegex.exec(html)) !== null) {
      logoRanges.push({ start: logoMatch.index, end: logoMatch.index + logoMatch[0].length });
    }
    logoVRegex.lastIndex = 0; // reset for next page

    const imgRegex = /<img([^>]*)>/gi;
    html = html.replace(imgRegex, (fullMatch, attrs, offset) => {
      // Skip if already has all three slot attributes
      const hasId = /data-slot-id=/i.test(attrs);
      const hasRole = /data-slot-role=/i.test(attrs);
      const hasStatus = /data-slot-status=/i.test(attrs);
      if (hasId && hasRole && hasStatus) return fullMatch;

      // Skip if inside a data-logo-v anchor
      const inLogo = logoRanges.some(r => offset >= r.start && offset < r.end);
      if (inLogo) return fullMatch;

      // Extract alt and src for inference
      const altMatch = attrs.match(/alt=["']([^"']*)["']/i);
      const srcMatch = attrs.match(/src=["']([^"']*)["']/i);
      const alt = (altMatch ? altMatch[1] : '');
      const src = (srcMatch ? srcMatch[1] : '');

      // Skip decorative: width/height=1 (tracking pixel)
      if (/\b(?:width|height)=["']1["']/i.test(attrs)) return fullMatch;

      // Skip decorative: empty alt (WCAG decorative signal) AND data URI (no real content)
      if (alt === '' && src.startsWith('data:image/') && !src.includes('R0lGODlhAQABAIAAAAAAAP')) return fullMatch;

      // Skip external SVGs not in uploads (likely icons/decorations)
      if (/\.svg/i.test(src) && !/assets\/uploads\//i.test(src) && !/assets\/logo/i.test(src)) return fullMatch;

      const combined = `${alt} ${src} ${attrs}`.toLowerCase();

      // Infer role from context
      let role = 'gallery'; // default matches retrofitSlotAttributes
      if (combined.match(/hero|banner|jumbotron/)) role = 'hero';
      else if (combined.match(/team|staff|headshot|member/)) role = 'team';
      else if (combined.match(/testimonial|review|quote/)) role = 'testimonial';
      else if (combined.match(/service|feature|offering/)) role = 'service';
      else if (combined.match(/gallery|portfolio|project|showcase/)) role = 'gallery';
      else if (combined.match(/about|story|company/)) role = 'service';
      else if (combined.match(/favicon/)) role = 'favicon';

      // Determine status from src
      let status = 'empty';
      if (/assets\/uploads\//i.test(src)) status = 'uploaded';
      else if (/assets\/stock\//i.test(src)) status = 'stock';
      else if (/^data:image\/gif/i.test(src)) status = 'empty';
      else if (/^https?:\/\//i.test(src)) status = 'stock';
      else if (src && !src.startsWith('data:')) status = 'stock';

      // Check if an existing slot_mapping matches this image's src (orphan prevention)
      const existingMappingId = mappingsBySrc.get(src);
      if (existingMappingId && !usedIds.has(existingMappingId)) {
        // Reuse the old slot ID to preserve the user's stock photo/upload mapping
        usedIds.add(existingMappingId);
        modified = true;
        totalFixed++;
        return `<img data-slot-id="${existingMappingId}" data-slot-role="${role}" data-slot-status="${status}"${attrs}>`;
      }

      // Generate content-derived ID: auto-{page}-{role}-{slug}
      const altSlug = alt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 20);
      const srcBasename = src.split('/').pop().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').substring(0, 20);
      const seed = altSlug || srcBasename || '';

      // If no meaningful seed at all, skip — unstable counter IDs are worse than no ID
      if (!seed && !altSlug && !srcBasename) {
        return fullMatch;
      }

      let slotId = `auto-${pageName}-${role}${seed ? '-' + seed : ''}`;
      let counter = 1;
      while (usedIds.has(slotId)) {
        counter++;
        slotId = `auto-${pageName}-${role}${seed ? '-' + seed : ''}-${counter}`;
      }
      usedIds.add(slotId);

      modified = true;
      totalFixed++;
      return `<img data-slot-id="${slotId}" data-slot-role="${role}" data-slot-status="${status}"${attrs}>`;
    });

    if (modified) {
      fs.writeFileSync(filePath, html);
    }
  }

  if (totalFixed > 0) {
    console.log(`[auto-tag] Tagged ${totalFixed} unattributed image(s) across ${pages.length} page(s)`);
  }
  return { totalFixed, pages };
}

// --- Brand Health Scanner ---
function scanBrandHealth() {
  // Auto-retrofit pre-slot sites on first brand health scan
  retrofitSlotAttributes();
  const spec = readSpec();
  const mediaSpecs = spec.media_specs || [];
  const pages = listPages();

  // Read combined HTML for font icons and social meta detection
  let combinedHtml = '';
  let indexHtml = '';
  for (const page of pages) {
    const p = path.join(DIST_DIR(), page);
    if (fs.existsSync(p)) {
      const html = fs.readFileSync(p, 'utf8');
      combinedHtml += html;
      if (page === 'index.html') indexHtml = html;
    }
  }

  // --- Slot-based image status (from media_specs — single source of truth) ---
  const totalSlots = mediaSpecs.length;
  const emptySlots = mediaSpecs.filter(s => s.status === 'empty');
  const stockSlots = mediaSpecs.filter(s => s.status === 'stock');
  const uploadedSlots = mediaSpecs.filter(s => s.status === 'uploaded');
  const finalSlots = mediaSpecs.filter(s => s.status === 'final');

  // Individual key slots
  const heroSlot = mediaSpecs.find(s => s.role === 'hero');
  const logoSlot = mediaSpecs.find(s => s.role === 'logo');
  const faviconSlot = mediaSpecs.find(s => s.role === 'favicon');

  // Aggregate sets
  const testimonialSlots = mediaSpecs.filter(s => s.role === 'testimonial');
  const gallerySlots = mediaSpecs.filter(s => s.role === 'gallery');
  const serviceSlots = mediaSpecs.filter(s => s.role === 'service');
  const teamSlots = mediaSpecs.filter(s => s.role === 'team');

  // --- Font Icons ---
  const fontAwesome = combinedHtml.match(/font-?awesome/i);
  const heroicons = combinedHtml.match(/heroicons/i);
  const materialIcons = combinedHtml.match(/material.*icons/i);
  const iconProviders = [];
  if (fontAwesome) iconProviders.push('Font Awesome');
  if (heroicons) iconProviders.push('Heroicons');
  if (materialIcons) iconProviders.push('Material Icons');

  // --- Social Meta ---
  const ogImage = !!indexHtml.match(/<meta[^>]*property=["']og:image["'][^>]*>/i);
  const twitterCard = !!indexHtml.match(/<meta[^>]*name=["']twitter:card["'][^>]*>/i);

  // --- SEO Checks ---
  const hasMetaDescription = !!indexHtml.match(/<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["'][^>]*>/i);
  const hasCanonical = !!indexHtml.match(/<link[^>]*rel=["']canonical["'][^>]*>/i);
  const hasSchemaOrg = !!indexHtml.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/i);
  const hasViewport = !!indexHtml.match(/<meta[^>]*name=["']viewport["'][^>]*>/i);
  const hasTitle = !!indexHtml.match(/<title>[^<]+<\/title>/i);
  const hasLang = !!indexHtml.match(/<html[^>]*lang=["'][a-z]{2}/i);

  // Check all pages for alt text on images
  const imgWithoutAlt = (combinedHtml.match(/<img(?![^>]*alt=["'][^"']+["'])[^>]*>/gi) || []).length;
  const totalImages = (combinedHtml.match(/<img[^>]*>/gi) || []).length;

  // --- Build health report ---
  const health = {
    slots: {
      total: totalSlots,
      empty: emptySlots.length,
      stock: stockSlots.length,
      uploaded: uploadedSlots.length,
      final: finalSlots.length,
    },
    hero: heroSlot ? { slot_id: heroSlot.slot_id, status: heroSlot.status } : { status: 'not_found' },
    logo: logoSlot ? { slot_id: logoSlot.slot_id, status: logoSlot.status } : { status: 'not_found' },
    favicon: faviconSlot ? { slot_id: faviconSlot.slot_id, status: faviconSlot.status } : { status: 'not_found' },
    sets: {
      testimonials: { total: testimonialSlots.length, filled: testimonialSlots.filter(s => s.status !== 'empty').length },
      gallery: { total: gallerySlots.length, filled: gallerySlots.filter(s => s.status !== 'empty').length },
      services: { total: serviceSlots.length, filled: serviceSlots.filter(s => s.status !== 'empty').length },
      team: { total: teamSlots.length, filled: teamSlots.filter(s => s.status !== 'empty').length },
    },
    font_icons: { using: iconProviders.length > 0, provider: iconProviders[0] || null, providers: iconProviders },
    social_meta: { og_image: ogImage, twitter_card: twitterCard },
    seo: {
      meta_description: hasMetaDescription,
      canonical_url: hasCanonical,
      schema_org: hasSchemaOrg,
      viewport: hasViewport,
      title: hasTitle,
      lang_attr: hasLang,
      images_without_alt: imgWithoutAlt,
      total_images: totalImages,
    },
  };

  const suggestions = [];
  if (emptySlots.length > 0) suggestions.push({ item: 'images', action: `Fill ${emptySlots.length} empty image slot(s) — say "add images" or use Upload` });
  if (heroSlot?.status === 'empty') suggestions.push({ item: 'hero', action: 'Upload or fill hero image' });
  if (logoSlot?.status === 'empty') suggestions.push({ item: 'logo', action: 'Upload or generate a logo' });
  if (!ogImage) suggestions.push({ item: 'og_image', action: 'Add OG image meta tag for social sharing' });
  if (!twitterCard) suggestions.push({ item: 'twitter_card', action: 'Add Twitter card meta for social previews' });
  // SEO suggestions
  if (!hasMetaDescription) suggestions.push({ item: 'meta_description', action: 'Add a meta description for search engine results' });
  if (!hasTitle) suggestions.push({ item: 'title', action: 'Add a <title> tag for search engine indexing' });
  if (!hasSchemaOrg) suggestions.push({ item: 'schema_org', action: 'Add Schema.org JSON-LD structured data (LocalBusiness, Organization, etc.)' });
  if (!hasLang) suggestions.push({ item: 'lang', action: 'Add lang attribute to <html> tag for accessibility and SEO' });
  if (imgWithoutAlt > 0) suggestions.push({ item: 'alt_text', action: `${imgWithoutAlt} image(s) missing alt text — impacts accessibility and SEO` });

  // Build slot list (replaces old placeholders array)
  const slotList = mediaSpecs.map(s => ({
    slot_id: s.slot_id,
    role: s.role,
    status: s.status,
    dimensions: s.dimensions,
    page: s.page,
  }));

  spec.brand_health = health;
  writeSpec(spec);

  return { health, suggestions, slots: slotList, placeholders: slotList, pages_scanned: pages.length };
}

// --- Placeholder SVG Generator ---
// Creates branded SVG placeholders (no Claude call — template-based, fast)
function generatePlaceholderSVG(label, section, brandColors) {
  const primary = brandColors.primary || '#1a5c2e';
  const accent = brandColors.accent || '#d4a843';
  const bg = brandColors.bg || '#f0f4f0';
  const width = 800;
  const height = 500;
  const displayLabel = label || section || 'Image';
  // Truncate label for display
  const shortLabel = displayLabel.length > 30 ? displayLabel.substring(0, 27) + '...' : displayLabel;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="${bg}" rx="8"/>
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="${primary}" stroke-width="2" stroke-dasharray="8 4" rx="6" opacity="0.3"/>
  <g transform="translate(${width / 2}, ${height / 2 - 30})">
    <rect x="-30" y="-25" width="60" height="50" rx="6" fill="${primary}" opacity="0.15"/>
    <circle cx="-10" cy="-8" r="7" fill="${accent}" opacity="0.6"/>
    <polygon points="-20,18 0,-5 20,18" fill="${primary}" opacity="0.3"/>
    <polygon points="5,18 18,-2 30,18" fill="${accent}" opacity="0.25"/>
  </g>
  <text x="${width / 2}" y="${height / 2 + 45}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="${primary}">${shortLabel}</text>
  <text x="${width / 2}" y="${height / 2 + 70}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${primary}" opacity="0.5">placeholder — replace with real image</text>
</svg>`;
}

// Extract brand colors from spec design brief
function extractBrandColors(spec) {
  const colors = { primary: '#1a5c2e', accent: '#d4a843', bg: '#f0f4f0' };
  const brief = spec?.design_brief;
  if (!brief) return colors;

  const colorText = brief.visual_direction?.color_usage || '';
  // Try to extract hex colors if present in spec
  const hexes = colorText.match(/#[0-9a-fA-F]{3,6}/g);
  if (hexes && hexes.length >= 2) {
    colors.primary = hexes[0];
    colors.accent = hexes[1];
  }
  return colors;
}

// Sanitize a label into a valid filename
function labelToFilename(label, section, page) {
  const base = (label || section || 'placeholder').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  const pagePrefix = page.replace('.html', '').replace(/[^a-z0-9]/g, '-');
  return `${pagePrefix}-${base}.svg`;
}

// --- Bulk Generate Placeholders ---
// Disabled — auto-placeholder generation removed.
// Users fill images via stock photos or upload.
function bulkGeneratePlaceholders(ws) {
  return { generated: 0, replaced: 0 };
}

// API endpoint for manual bulk generate trigger
app.post('/api/bulk-generate-placeholders', (req, res) => {
  const result = bulkGeneratePlaceholders(null);
  res.json(result);
});

// Extract nav from a page and sync to all others
app.post('/api/sync-nav', (req, res) => {
  const sourcePage = req.body.page || 'index.html';
  try {
    syncNavFromPage(null, sourcePage);
    const result = syncNavPartial(null);
    res.json({ success: true, source: sourcePage, synced: result.synced });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sync-footer', (req, res) => {
  const sourcePage = req.body.page || 'index.html';
  try {
    syncFooterFromPage(null, sourcePage);
    const result = syncFooterPartial(null);
    res.json({ success: true, source: sourcePage, synced: result.synced });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Replace a placeholder src with a new image src across all pages
app.post('/api/replace-placeholder', (req, res) => {
  const { oldSrc, newSrc } = req.body;
  if (!oldSrc || !newSrc) return res.status(400).json({ error: 'oldSrc and newSrc required' });

  const pages = listPages();
  let totalReplaced = 0;
  const modifiedPages = [];

  for (const page of pages) {
    const filePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');

    // Replace exact src match in img tags
    const pattern = new RegExp(`(src=["'])${oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(["'])`, 'g');
    const newHtml = html.replace(pattern, `$1${newSrc}$2`);

    if (newHtml !== html) {
      fs.writeFileSync(filePath, newHtml);
      totalReplaced++;
      modifiedPages.push(page);
      console.log(`[replace] ${page}: replaced ${oldSrc} → ${newSrc}`);
    }
  }

  res.json({ replaced: totalReplaced, pages: modifiedPages });
});

// Slot-based replacement — target by data-slot-id
app.post('/api/replace-slot', (req, res) => {
  const { slot_id, newSrc } = req.body;
  if (!slot_id || !newSrc) return res.status(400).json({ error: 'slot_id and newSrc required' });
  if (typeof slot_id !== 'string' || !/^[a-z0-9-]+$/i.test(slot_id)) return res.status(400).json({ error: 'Invalid slot_id' });
  if (typeof newSrc !== 'string' || newSrc.length > 1000) return res.status(400).json({ error: 'Invalid newSrc' });

  const pages = listPages();
  const distDir = DIST_DIR();
  let updated = false;
  let updatedPage = null;

  const escapedId = slot_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const page of pages) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');

    // Patch src + status regardless of attribute order in the img tag
    const patched = patchSlotImg(html, escapedId, { src: newSrc, status: 'uploaded' });
    if (patched.changed) {
      html = patched.html;
      fs.writeFileSync(filePath, html);
      updated = true;
      updatedPage = page;
      console.log(`[replace-slot] ${page}: slot ${slot_id} → ${newSrc}`);

      // Delete old stock photo if exists
      const oldStockPath = path.join(distDir, 'assets', 'stock', `${slot_id}.jpg`);
      if (fs.existsSync(oldStockPath)) {
        fs.unlinkSync(oldStockPath);
        console.log(`[replace-slot] Deleted old stock photo: ${oldStockPath}`);
      }
      break;
    }
  }

  // Update media_specs and store slot mapping for rebuild persistence
  if (updated) {
    const spec = readSpec();
    const ms = (spec.media_specs || []).find(s => s.slot_id === slot_id);
    if (ms) {
      ms.status = 'uploaded';
    }
    if (!spec.slot_mappings) spec.slot_mappings = {};
    spec.slot_mappings[slot_id] = { src: newSrc, alt: ms?.alt || slot_id.replace(/-/g, ' ') };
    writeSpec(spec);
  }

  res.json({ success: updated, slot_id, page: updatedPage });
});

// Clear a single slot mapping (used by QSF "Clear" button)
app.post('/api/clear-slot-mapping', (req, res) => {
  const { slot_id } = req.body;
  if (!slot_id || typeof slot_id !== 'string' || !/^[a-z0-9-]+$/i.test(slot_id)) {
    return res.status(400).json({ error: 'Invalid slot_id' });
  }
  const spec = readSpec();
  if (spec.slot_mappings && spec.slot_mappings[slot_id]) {
    delete spec.slot_mappings[slot_id];
    writeSpec(spec);
    console.log(`[clear-slot-mapping] Removed mapping for ${slot_id}`);
  }
  // Also update media_specs status back to empty
  const ms = (spec.media_specs || []).find(s => s.slot_id === slot_id);
  if (ms) ms.status = 'empty';
  writeSpec(spec);
  res.json({ success: true, slot_id });
});

app.get('/api/brand-health', (req, res) => {
  try {
    const result = scanBrandHealth();
    // Attach orphaned mapping count so the UI can surface it
    const spec = readSpec();
    const slotMappings = spec.slot_mappings || {};
    const distDir = DIST_DIR();
    const realSlotIds = new Set();
    for (const page of listPages()) {
      const fp = path.join(distDir, page);
      if (!fs.existsSync(fp)) continue;
      for (const m of fs.readFileSync(fp, 'utf8').matchAll(/data-slot-id=["']([^"']+)["']/gi)) {
        realSlotIds.add(m[1]);
      }
    }
    result.orphaned_mappings = Object.keys(slotMappings).filter(id => !realSlotIds.has(id)).length;
    result.upload_count = (spec.uploaded_assets || []).length;
    result.upload_limit = loadSettings().max_uploads_per_site || 100;
    res.json(result);
  } catch (e) {
    console.error('[brand-health] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- Visual Slot Mode ---
// Serves a page with interactive slot overlays injected — never modifies dist files
function buildSlotInspectorScript(safeSlotMetaJson) {
  return `<script id="slot-inspector">
(function() {
  var SLOT_META = ${safeSlotMetaJson};
  var STATUS_COLORS = {
    empty:    { border:'#ef4444', badge:'#ef4444', text:'#fff', icon:'\u25cb' },
    stock:    { border:'#eab308', badge:'#ca8a04', text:'#fff', icon:'\u25c8' },
    uploaded: { border:'#22c55e', badge:'#16a34a', text:'#fff', icon:'\u25cf' },
    final:    { border:'#22c55e', badge:'#16a34a', text:'#fff', icon:'\u2605' },
  };
  var DEFAULT_COLOR = { border:'#6b7280', badge:'#4b5563', text:'#fff', icon:'?' };

  function decorate() {
    var imgs = document.querySelectorAll('[data-slot-id]');
    imgs.forEach(function(img) {
      var slotId   = img.getAttribute('data-slot-id');
      var slotRole = img.getAttribute('data-slot-role') || '';
      var status   = (img.getAttribute('data-slot-status') || 'empty').toLowerCase();
      var meta     = SLOT_META[slotId] || {};
      var dims     = meta.dimensions || '?';
      var c        = STATUS_COLORS[status] || DEFAULT_COLOR;
      var parent   = img.parentElement;

      // Ensure positioning context
      var ps = window.getComputedStyle(parent).position;
      if (!['relative','absolute','fixed','sticky'].includes(ps)) {
        parent.style.position = 'relative';
      }

      // Border overlay (pointer-events:none — doesn't block site interactions)
      var ov = document.createElement('div');
      ov.style.cssText = 'position:absolute;inset:0;pointer-events:none;border:2.5px solid '
        + c.border + ';z-index:9000;box-sizing:border-box;transition:border-width .1s';
      var badge = document.createElement('div');
      badge.style.cssText = 'position:absolute;top:4px;left:4px;background:' + c.badge
        + ';color:' + c.text + ';font:700 9px/1 system-ui,sans-serif;padding:2px 6px;'
        + 'border-radius:3px;pointer-events:none;z-index:9001;white-space:nowrap;'
        + 'max-width:calc(100% - 12px);overflow:hidden;text-overflow:ellipsis';
      badge.textContent = c.icon + ' ' + slotId;
      ov.appendChild(badge);
      parent.appendChild(ov);

      // Click target (captures events above the image)
      var ct = document.createElement('div');
      ct.style.cssText = 'position:absolute;inset:0;z-index:9002;cursor:pointer';
      // Tooltip
      var tt = document.createElement('div');
      tt.style.cssText = 'display:none;position:absolute;bottom:6px;left:6px;'
        + 'background:rgba(15,23,42,.95);color:#e2e8f0;font:400 11px/1.5 system-ui,sans-serif;'
        + 'padding:6px 10px;border-radius:6px;border:1px solid #334155;'
        + 'white-space:nowrap;z-index:9003;pointer-events:none';
      tt.innerHTML = '<strong>' + slotId + '</strong><br>Role: '
        + (slotRole || meta.role || '-') + '<br>Dims: ' + dims + '<br>Status: ' + status;
      ct.appendChild(tt);
      ct.addEventListener('mouseenter', function() { tt.style.display='block'; ov.style.borderWidth='4px'; });
      ct.addEventListener('mouseleave', function() { tt.style.display='none';  ov.style.borderWidth='2.5px'; });
      ct.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        window.parent.postMessage({
          type:'slot-click', slotId:slotId,
          role:slotRole||meta.role||'', status:status, dimensions:dims
        }, '*');
      });
      parent.appendChild(ct);
    });

    // Intercept internal .html nav links — send page-switch to Studio instead
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (href && href.endsWith('.html')
          && !href.startsWith('http') && !href.startsWith('#')
          && !href.startsWith('mailto') && !href.startsWith('tel')) {
        e.preventDefault();
        window.parent.postMessage({ type:'slot-mode-navigate', page:href }, '*');
      }
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', decorate);
  } else {
    decorate();
  }
})();
<\/script>`;
}

app.get('/slot-preview/:page', (req, res) => {
  const page = req.params.page;
  if (!isValidPageName(page)) return res.status(400).send('Invalid page name');

  const filePath = path.join(DIST_DIR(), page);
  if (!fs.existsSync(filePath)) return res.status(404).send('Page not found');

  let html = fs.readFileSync(filePath, 'utf8');

  // Build slot metadata map for the injected script (avoids async fetch inside iframe)
  const spec = readSpec();
  const slotMeta = {};
  for (const s of (spec.media_specs || [])) {
    slotMeta[s.slot_id] = { dimensions: s.dimensions, role: s.role, status: s.status };
  }

  // Inject <base> tag so relative paths still resolve via the preview static server
  if (!html.includes('<base ')) {
    html = html.replace(/<head([^>]*)>/i,
      `<head$1>\n  <base href="http://localhost:${PREVIEW_PORT}/">`);
  }

  // Rewrite absolute /assets/ paths to fully-qualified preview server URLs
  // (base tag only helps relative paths; absolute /assets/... would hit studio port instead)
  const previewBase = `http://localhost:${PREVIEW_PORT}`;
  html = html.replace(/src="\/assets\//g,  `src="${previewBase}/assets/`);
  html = html.replace(/src='\/assets\//g,  `src='${previewBase}/assets/`);
  html = html.replace(/href="\/assets\//g, `href="${previewBase}/assets/`);
  html = html.replace(/href='\/assets\//g, `href='${previewBase}/assets/`);

  // Inject slot inspector before </body>
  html = html.replace(/<\/body>/i,
    buildSlotInspectorScript(JSON.stringify(slotMeta)) + '\n</body>');

  res.set('Content-Type', 'text/html');
  res.set('Cache-Control', 'no-store');
  res.send(html);
});

// --- Nav Partial Sync ---
// Keeps a single _nav.html partial as source of truth, injects into all pages
function syncNavPartial(ws, excludePages = []) {
  const distDir = DIST_DIR();
  const partialsDir = path.join(distDir, '_partials');
  const navPartialPath = path.join(partialsDir, '_nav.html');
  const pages = listPages();

  if (pages.length === 0) return { synced: 0 };

  // Ensure partial exists — extract from index.html (or first page)
  if (!fs.existsSync(navPartialPath)) {
    const sourcePage = pages.includes('index.html') ? 'index.html' : pages[0];
    const sourceHtml = fs.readFileSync(path.join(distDir, sourcePage), 'utf8');
    const navMatch = sourceHtml.match(/<nav[\s\S]*?<\/nav>/i);
    if (!navMatch) return { synced: 0 };

    fs.mkdirSync(partialsDir, { recursive: true });
    fs.writeFileSync(navPartialPath, navMatch[0]);
    if (ws) ws.send(JSON.stringify({ type: 'status', content: 'Extracted nav partial from ' + sourcePage }));
    console.log(`[nav-sync] Extracted nav partial from ${sourcePage}`);
  }

  // Ensure .netlifyignore excludes build artifacts
  const ignoreFile = path.join(distDir, '.netlifyignore');
  const ignoreEntries = ['_partials/', '_template.html', '.versions/', '.studio.json', 'conversation.jsonl'];
  const existing = fs.existsSync(ignoreFile) ? fs.readFileSync(ignoreFile, 'utf8') : '';
  const missing = ignoreEntries.filter(e => !existing.includes(e));
  if (missing.length) fs.appendFileSync(ignoreFile, missing.join('\n') + '\n');

  // Read canonical nav and inject into all pages
  const canonicalNav = fs.readFileSync(navPartialPath, 'utf8');
  let synced = 0;
  for (const page of pages) {
    if (excludePages.includes(page)) continue;
    const filePath = path.join(distDir, page);
    let html = fs.readFileSync(filePath, 'utf8');
    const navMatch = html.match(/<nav[\s\S]*?<\/nav>/i);
    if (!navMatch) continue;
    if (navMatch[0] === canonicalNav) continue; // already in sync

    html = html.replace(/<nav[\s\S]*?<\/nav>/i, canonicalNav);
    fs.writeFileSync(filePath, html);
    synced++;
    console.log(`[nav-sync] Synced nav in ${page}`);
  }

  if (synced > 0 && ws) {
    ws.send(JSON.stringify({ type: 'status', content: `Nav synced across ${synced} page(s)` }));
  }
  return { synced };
}

// When a single page is updated, check if its nav changed and propagate
function syncNavFromPage(ws, sourcePage) {
  const distDir = DIST_DIR();
  const partialsDir = path.join(distDir, '_partials');
  const navPartialPath = path.join(partialsDir, '_nav.html');

  const sourceFilePath = path.join(distDir, sourcePage);
  if (!fs.existsSync(sourceFilePath)) return;

  const sourceHtml = fs.readFileSync(sourceFilePath, 'utf8');
  const sourceNav = sourceHtml.match(/<nav[\s\S]*?<\/nav>/i);
  if (!sourceNav) return;

  if (fs.existsSync(navPartialPath)) {
    const existingPartial = fs.readFileSync(navPartialPath, 'utf8');
    if (sourceNav[0] !== existingPartial) {
      // Page has a new nav — update the partial
      fs.writeFileSync(navPartialPath, sourceNav[0]);
      console.log(`[nav-sync] Updated partial from ${sourcePage}`);
    }
  } else {
    fs.mkdirSync(partialsDir, { recursive: true });
    fs.writeFileSync(navPartialPath, sourceNav[0]);
  }

  // Sync all pages to match — but skip the source page so we don't clobber the edit
  syncNavPartial(ws, [sourcePage]);
}

// --- Footer Partial Sync ---
// Same pattern as nav sync — keeps a canonical _footer.html across all pages
function syncFooterPartial(ws, excludePages = []) {
  const distDir = DIST_DIR();
  const partialsDir = path.join(distDir, '_partials');
  const footerPartialPath = path.join(partialsDir, '_footer.html');
  const pages = listPages();

  if (pages.length === 0) return { synced: 0 };

  // Ensure partial exists — extract from index.html (or first page)
  if (!fs.existsSync(footerPartialPath)) {
    const sourcePage = pages.includes('index.html') ? 'index.html' : pages[0];
    const sourceHtml = fs.readFileSync(path.join(distDir, sourcePage), 'utf8');
    const footerMatch = sourceHtml.match(/<footer[\s\S]*?<\/footer>/i);
    if (!footerMatch) return { synced: 0 };

    fs.mkdirSync(partialsDir, { recursive: true });
    fs.writeFileSync(footerPartialPath, footerMatch[0]);
    if (ws) ws.send(JSON.stringify({ type: 'status', content: 'Extracted footer partial from ' + sourcePage }));
    console.log(`[footer-sync] Extracted footer partial from ${sourcePage}`);
  }

  const canonicalFooter = fs.readFileSync(footerPartialPath, 'utf8');
  let synced = 0;
  for (const page of pages) {
    if (excludePages.includes(page)) continue;
    const filePath = path.join(distDir, page);
    let html = fs.readFileSync(filePath, 'utf8');
    const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
    if (!footerMatch) continue;
    if (footerMatch[0] === canonicalFooter) continue;

    html = html.replace(/<footer[\s\S]*?<\/footer>/i, canonicalFooter);
    fs.writeFileSync(filePath, html);
    synced++;
    console.log(`[footer-sync] Synced footer in ${page}`);
  }

  if (synced > 0 && ws) {
    ws.send(JSON.stringify({ type: 'status', content: `Footer synced across ${synced} page(s)` }));
  }
  return { synced };
}

function syncFooterFromPage(ws, sourcePage) {
  const distDir = DIST_DIR();
  const partialsDir = path.join(distDir, '_partials');
  const footerPartialPath = path.join(partialsDir, '_footer.html');

  const sourceFilePath = path.join(distDir, sourcePage);
  if (!fs.existsSync(sourceFilePath)) return;

  const sourceHtml = fs.readFileSync(sourceFilePath, 'utf8');
  const sourceFooter = sourceHtml.match(/<footer[\s\S]*?<\/footer>/i);
  if (!sourceFooter) return;

  if (fs.existsSync(footerPartialPath)) {
    const existingPartial = fs.readFileSync(footerPartialPath, 'utf8');
    if (sourceFooter[0] !== existingPartial) {
      fs.writeFileSync(footerPartialPath, sourceFooter[0]);
      console.log(`[footer-sync] Updated partial from ${sourcePage}`);
    }
  } else {
    fs.mkdirSync(partialsDir, { recursive: true });
    fs.writeFileSync(footerPartialPath, sourceFooter[0]);
  }

  // Sync all pages — skip the source page so we don't clobber the edit
  syncFooterPartial(ws, [sourcePage]);
}

// --- Head Section Sync ---
// Syncs Tailwind CDN, Google Fonts, and custom <style> blocks across all pages
// Uses index.html as source of truth for <head> content
function syncHeadSection(ws) {
  const distDir = DIST_DIR();
  const pages = listPages();
  if (pages.length < 2) return { synced: 0 };

  const sourcePage = pages.includes('index.html') ? 'index.html' : pages[0];
  const sourceHtml = fs.readFileSync(path.join(distDir, sourcePage), 'utf8');
  const sourceHead = sourceHtml.match(/<head[\s\S]*?<\/head>/i);
  if (!sourceHead) return { synced: 0 };

  // Extract syncable elements from source <head>
  const extractSyncableHead = (headHtml) => {
    const elements = [];
    // Tailwind CDN
    const tailwind = headHtml.match(/<script[^>]*src=["'][^"']*tailwindcss[^"']*["'][^>]*><\/script>/gi);
    if (tailwind) elements.push(...tailwind);
    // Tailwind config
    const tailwindConfig = headHtml.match(/<script>\s*tailwind\.config[\s\S]*?<\/script>/gi);
    if (tailwindConfig) elements.push(...tailwindConfig);
    // Google Fonts
    const fonts = headHtml.match(/<link[^>]*href=["'][^"']*fonts\.googleapis[^"']*["'][^>]*\/?>/gi);
    if (fonts) elements.push(...fonts);
    const fontPreconnect = headHtml.match(/<link[^>]*href=["'][^"']*fonts\.gstatic[^"']*["'][^>]*\/?>/gi);
    if (fontPreconnect) elements.push(...fontPreconnect);
    // Custom style blocks (but not page-specific ones marked with data-page)
    const styles = headHtml.match(/<style(?![^>]*data-page)[^>]*>[\s\S]*?<\/style>/gi);
    if (styles) elements.push(...styles);
    // External stylesheet link (assets/styles.css)
    const cssLink = headHtml.match(/<link[^>]*href=["'][^"']*assets\/styles\.css["'][^>]*\/?>/gi);
    if (cssLink) elements.push(...cssLink);
    // Icon CDNs (Font Awesome, Material Icons, etc.)
    const iconCdns = headHtml.match(/<link[^>]*href=["'][^"']*(?:font-?awesome|material.*icons|heroicons)[^"']*["'][^>]*\/?>/gi);
    if (iconCdns) elements.push(...iconCdns);
    return elements;
  };

  const sourceElements = extractSyncableHead(sourceHead[0]);
  if (sourceElements.length === 0) return { synced: 0 };

  let synced = 0;
  for (const page of pages) {
    if (page === sourcePage) continue;
    const filePath = path.join(distDir, page);
    let html = fs.readFileSync(filePath, 'utf8');
    const pageHead = html.match(/<head[\s\S]*?<\/head>/i);
    if (!pageHead) continue;

    let headContent = pageHead[0];
    let changed = false;

    for (const element of sourceElements) {
      // Normalize for comparison — strip whitespace differences
      const normalized = element.replace(/\s+/g, ' ').trim();
      const headNormalized = headContent.replace(/\s+/g, ' ');

      // Use content hash for reliable matching instead of 80-char prefix
      const crypto = require('crypto');
      const elemHash = crypto.createHash('md5').update(normalized).digest('hex').substring(0, 12);
      const headHashes = headContent.replace(/\s+/g, ' ').match(/<(?:style|script|link)[^>]*(?:>[\s\S]*?<\/(?:style|script)>|\/>)/gi) || [];
      const existingHashes = headHashes.map(el => crypto.createHash('md5').update(el.replace(/\s+/g, ' ').trim()).digest('hex').substring(0, 12));
      if (!existingHashes.includes(elemHash) && !headNormalized.includes(normalized)) {
        // Element missing from this page's head — inject before </head>
        headContent = headContent.replace(/<\/head>/i, `  ${element}\n  </head>`);
        changed = true;
      }
    }

    if (changed) {
      html = html.replace(/<head[\s\S]*?<\/head>/i, headContent);
      fs.writeFileSync(filePath, html);
      synced++;
      console.log(`[head-sync] Synced head elements in ${page}`);
    }
  }

  if (synced > 0 && ws) {
    ws.send(JSON.stringify({ type: 'status', content: `Head section synced across ${synced} page(s)` }));
  }
  return { synced };
}

// --- Head Guardrail Post-Processor ---
// Ensures Tailwind CDN and Google Fonts are present in every page.
// This runs as a safety net after build — even if Claude omits them from the HTML,
// the site won't be completely unstyled.
function ensureHeadDependencies(ws) {
  const distDir = DIST_DIR();
  const pages = listPages();
  const spec = readSpec();
  const fontSerif = spec.fonts?.heading || 'Playfair Display';
  const fontSans = spec.fonts?.body || 'Inter';
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontSerif.replace(/\s+/g, '+').replace(/&/g, '&amp;')}:wght@400;500;600;700&family=${fontSans.replace(/\s+/g, '+').replace(/&/g, '&amp;')}:wght@300;400;500;600;700&display=swap`;

  const tailwindTag = '<script src="https://cdn.tailwindcss.com"></script>';
  const fontTags = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${fontUrl}" rel="stylesheet">`;

  let fixed = 0;
  for (const page of pages) {
    const filePath = path.join(distDir, page);
    let html = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    if (!html.includes('tailwindcss')) {
      html = html.replace(/<\/title>/i, `</title>\n    ${tailwindTag}`);
      changed = true;
    }
    if (!html.includes('fonts.googleapis')) {
      html = html.replace(/<\/title>/i, `</title>\n    ${fontTags}`);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, html);
      fixed++;
    }
  }

  if (fixed > 0) {
    console.log(`[head-guardrail] Injected missing Tailwind/Fonts into ${fixed} page(s)`);
    if (ws) ws.send(JSON.stringify({ type: 'status', content: `Head dependencies ensured in ${fixed} page(s)` }));
  }
  return { fixed };
}

// --- CSS Extraction Post-Processor ---
// Extracts shared <style> blocks from index.html into assets/styles.css,
// then replaces inline styles with a <link> in all pages.
// NOTE: Tailwind CDN runtime styles must NEVER be extracted — only explicit <style> blocks written by Claude.
function extractSharedCss(ws) {
  const distDir = DIST_DIR();
  const indexPath = path.join(distDir, 'index.html');
  if (!fs.existsSync(indexPath)) return { extracted: false };

  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Match shared <style> blocks (NOT data-page ones, NOT Tailwind config scripts)
  const sharedStyleRegex = /<style(?![^>]*data-page)[^>]*>([\s\S]*?)<\/style>/gi;
  const styleBlocks = [];
  let match;
  while ((match = sharedStyleRegex.exec(indexHtml)) !== null) {
    // Skip empty styles
    if (match[1].trim()) styleBlocks.push(match[1]);
  }

  if (styleBlocks.length === 0) return { extracted: false };

  // Write combined CSS to assets/styles.css
  const cssContent = styleBlocks.join('\n\n');
  const assetsDir = path.join(distDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.writeFileSync(path.join(assetsDir, 'styles.css'), cssContent);

  const linkTag = '<link rel="stylesheet" href="assets/styles.css">';
  const pages = listPages();
  let updated = 0;

  // Build a set of normalized extracted style contents for matching
  const extractedStyleSet = new Set(styleBlocks.map(s => s.trim().replace(/\s+/g, ' ')));

  for (const page of pages) {
    const filePath = path.join(distDir, page);
    let html = fs.readFileSync(filePath, 'utf8');

    // Only remove <style> blocks whose content matches what was extracted from index.html
    // This preserves page-specific styles that weren't in the shared set
    html = html.replace(/<style(?![^>]*data-page)[^>]*>([\s\S]*?)<\/style>/gi, (fullMatch, content) => {
      const normalized = content.trim().replace(/\s+/g, ' ');
      if (extractedStyleSet.has(normalized)) return ''; // shared style — remove
      return fullMatch; // page-specific style — keep
    });

    // Add <link> to styles.css if not already present
    if (!html.includes('assets/styles.css')) {
      html = html.replace(/<\/head>/i, `  ${linkTag}\n  </head>`);
    }

    fs.writeFileSync(filePath, html);
    updated++;
  }

  if (ws && updated > 0) {
    ws.send(JSON.stringify({ type: 'status', content: `Extracted shared CSS to assets/styles.css (${updated} pages updated)` }));
  }
  console.log(`[css-extract] Extracted ${styleBlocks.length} style block(s) to assets/styles.css, updated ${updated} pages`);
  return { extracted: true, pages: updated };
}

// --- Template-First Architecture ---
// Replaces the index-first CSS seed approach with a shared template.
// _template.html holds header/nav, footer, and shared CSS.
// Each page copies chrome verbatim and only generates <main> content.

function extractTemplateComponents(templateHtml) {
  const headMatch = templateHtml.match(/<head[\s\S]*?<\/head>/i);
  const headerMatch = templateHtml.match(/<header[^>]*data-template="header"[^>]*>[\s\S]*?<\/header>/i);
  const footerMatch = templateHtml.match(/<footer[^>]*data-template="footer"[^>]*>[\s\S]*?<\/footer>/i);
  const sharedStyleMatch = templateHtml.match(/<style[^>]*data-template="shared"[^>]*>([\s\S]*?)<\/style>/i);
  // Also extract <nav> from inside the header for _partials/_nav.html
  const headerHtml = headerMatch ? headerMatch[0] : '';
  const navMatch = headerHtml.match(/<nav[\s\S]*?<\/nav>/i);

  return {
    headBlock: headMatch ? headMatch[0] : '',
    headerHtml,
    footerHtml: footerMatch ? footerMatch[0] : '',
    sharedCss: sharedStyleMatch ? sharedStyleMatch[1] : '',
    navHtml: navMatch ? navMatch[0] : '',
  };
}

function writeTemplateArtifacts(ws) {
  const distDir = DIST_DIR();
  const templatePath = path.join(distDir, '_template.html');
  if (!fs.existsSync(templatePath)) return null;

  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const components = extractTemplateComponents(templateHtml);

  // Write _partials/_nav.html from template header's nav
  if (components.navHtml) {
    const partialsDir = path.join(distDir, '_partials');
    fs.mkdirSync(partialsDir, { recursive: true });
    fs.writeFileSync(path.join(partialsDir, '_nav.html'), components.navHtml);
  }

  // Write _partials/_footer.html from template footer
  if (components.footerHtml) {
    const partialsDir = path.join(distDir, '_partials');
    fs.mkdirSync(partialsDir, { recursive: true });
    fs.writeFileSync(path.join(partialsDir, '_footer.html'), components.footerHtml);
  }

  // Write assets/styles.css from template shared CSS
  if (components.sharedCss) {
    const assetsDir = path.join(distDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.writeFileSync(path.join(assetsDir, 'styles.css'), components.sharedCss.trim());
    if (ws) ws.send(JSON.stringify({ type: 'status', content: 'Wrote shared CSS from template to assets/styles.css' }));
  }

  console.log('[template] Wrote template artifacts (_partials, styles.css)');
  return components;
}

function applyTemplateToPages(ws, writtenPages) {
  const distDir = DIST_DIR();
  const pages = writtenPages && writtenPages.length > 0 ? writtenPages : listPages();
  let updated = 0;

  for (const page of pages) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');

    // Replace inline <style data-template="shared"> with <link> to external stylesheet
    let changed = false;
    const hadTemplateStyle = html.match(/<style[^>]*data-template="shared"[^>]*>[\s\S]*?<\/style>/i);
    if (hadTemplateStyle) {
      html = html.replace(/<style[^>]*data-template="shared"[^>]*>[\s\S]*?<\/style>/i, '');
      changed = true;
    }

    // Ensure <link rel="stylesheet" href="assets/styles.css"> exists — but only if the file was actually written
    const cssPath = path.join(distDir, 'assets', 'styles.css');
    if (!html.includes('assets/styles.css') && fs.existsSync(cssPath)) {
      html = html.replace(/<\/head>/i, `  <link rel="stylesheet" href="assets/styles.css">\n  </head>`);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, html);
      updated++;
    }
  }

  if (ws && updated > 0) {
    ws.send(JSON.stringify({ type: 'status', content: `Applied template styles to ${pages.length} pages` }));
  }
  console.log(`[template] Applied template to ${pages.length} pages (${updated} updated)`);
}

function loadTemplateContext() {
  const distDir = DIST_DIR();
  const templatePath = path.join(distDir, '_template.html');
  if (!fs.existsSync(templatePath)) return '';

  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const components = extractTemplateComponents(templateHtml);
  if (!components.headBlock && !components.headerHtml && !components.footerHtml) return '';

  // Strip <title> from head block so pages can set their own page-specific title
  const headBlockNoTitle = components.headBlock.replace(/<title[^>]*>[\s\S]*?<\/title>/i, '<!-- Page sets its own <title> -->');

  return `
SITE TEMPLATE (CRITICAL — copy header and footer VERBATIM into your output):

HEAD BLOCK (copy this <head> block, then add your own <title> and <style data-page="[pagename]"> block):
${headBlockNoTitle}

HEADER (copy this element VERBATIM — do NOT modify any classes, links, or attributes):
${components.headerHtml}

FOOTER (copy this element VERBATIM — do NOT change structure or content):
${components.footerHtml}

TEMPLATE RULES:
- The data-template attributes on header and footer MUST be preserved — the build system requires them
- Page-specific styles go in a single <style data-page="[pagename]"> block ONLY
- Do NOT repeat :root variables or shared utility classes — they are in the template <head>
- Do NOT modify the nav links, footer structure, or shared CSS in any way
`;
}

function buildTemplatePrompt(spec, pageFiles, briefContext, decisionsContext, assetsContext, systemRules, analyticsInstruction) {
  const fontSerif = spec.fonts?.heading || 'Playfair Display';
  const fontSans = spec.fonts?.body || 'Inter';
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontSerif.replace(/\s+/g, '+')}:wght@400;500;600;700&family=${fontSans.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;
  const allPageLinks = pageFiles.join(', ');

  // Detect logo file
  const distDir = DIST_DIR();
  const logoSvg = fs.existsSync(path.join(distDir, 'assets', 'logo.svg'));
  const logoPng = fs.existsSync(path.join(distDir, 'assets', 'logo.png'));
  const logoFile = logoSvg ? 'assets/logo.svg' : logoPng ? 'assets/logo.png' : null;
  const logoInstruction = logoFile
    ? `Use <a href="index.html" data-logo-v class="block"><img src="${logoFile}" alt="${spec.site_name || 'Logo'}" class="h-10 w-auto"></a> in the nav. Do NOT show site name text next to the logo image.`
    : `Use <a href="index.html" data-logo-v class="font-playfair text-2xl font-bold text-inherit hover:opacity-80 transition">${spec.site_name || ''}</a> as the logo in the nav. This will automatically swap to an image when a logo is uploaded.`;

  return `You are building the SHARED DESIGN TEMPLATE for a ${pageFiles.length}-page website.

IMPORTANT: Generate ONLY the shared chrome — header, nav, footer, and shared CSS.
Do NOT generate any page content — no hero sections, no service cards, no body copy, no images.

SITE: ${spec.site_name || 'Website'}
BUSINESS TYPE: ${spec.business_type || 'general'}

${briefContext}
${decisionsContext}

OUTPUT FORMAT — generate this EXACT structure:
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${spec.site_name || 'Website'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${fontUrl}" rel="stylesheet">
  <style data-template="shared">
    /* LAYOUT FOUNDATION — build system enforces these via post-processing */
    html, body { overflow-x: hidden; margin: 0; padding: 0; }
    /* Note: main { overflow-x: hidden } is injected by the build system — do not add here */
    *, *::before, *::after { box-sizing: border-box; min-width: 0; }
    img, video, table, iframe, embed, object { max-width: 100%; height: auto; }
    .container { width: 100%; max-width: 90rem; margin-left: auto; margin-right: auto; padding-left: 1.5rem; padding-right: 1.5rem; }
    /* END LAYOUT FOUNDATION */

    :root {
      --color-primary: ${spec.colors?.primary || '#1a5c2e'};
      --color-accent: ${spec.colors?.accent || '#d4a843'};
      --color-bg: ${spec.colors?.bg || '#f0f4f0'};
      --font-serif: '${fontSerif}', serif;
      --font-sans: '${fontSans}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    /* Add all shared utility classes here: .text-primary, .bg-accent, .btn-primary, .hover-lift, etc. */
    /* Add mobile nav toggle CSS */
    /* Add any animation keyframes needed across multiple pages */
  </style>
  ${analyticsInstruction || ''}
</head>
<body>
  <header data-template="header">
    <!-- Complete header with desktop + mobile nav -->
    <!-- Nav must link to ALL pages: ${allPageLinks} -->
    <!-- Use real file links (about.html) NOT anchors (#about) -->
  </header>
  <footer data-template="footer">
    <!-- Complete footer with business info, quick links, copyright -->
  </footer>
</body>
</html>

STYLE GUIDE:
- This template defines the ENTIRE visual identity of the site
- Every page will copy the header and footer VERBATIM — make them complete and polished
- The <style data-template="shared"> block should contain ALL styles shared across pages:
  - CSS custom properties in :root
  - Utility classes (.text-primary, .bg-accent, .hover-lift, .font-serif, etc.)
  - Mobile menu toggle (CSS-only checkbox pattern preferred)
  - Common component patterns (.btn-primary, .section-heading, .card, etc.)
  - Animation keyframes used on multiple pages
- Do NOT include page-specific styles — those go in per-page <style data-page="pagename"> blocks

LAYOUT RULES (build system enforces these — match them):
- main { overflow-x: hidden } is injected by the build system — page content that exceeds
  the template width is clipped inside main and CANNOT push header or footer wider
- header and footer: full-width outer element (for background bleeds), with all nav/content
  inside <div class="container"> — NEVER put nav items directly in the header element
- .container is defined in the shared CSS: max-width 90rem, margin: 0 auto — use it
  inside header, footer, and every section in main
- NEVER set a fixed pixel width on any flex/grid child that could cause the row to exceed 90rem

LOGO: ${logoInstruction}

NAVIGATION:
- Must link to ALL ${pageFiles.length} pages: ${allPageLinks}
- Include both desktop and responsive mobile nav
- Mobile menu should use a CSS-only toggle or minimal inline JS
- Active page highlighting will be handled per-page

FOOTER:
- Business name and tagline
- Quick links to all pages
- Contact information (phone, email, address if in brief)
- Copyright line: © ${new Date().getFullYear()} ${spec.site_name || 'Business Name'}

DESIGN DIRECTION:
${assetsContext || 'No specific assets referenced.'}

${systemRules}

OUTPUT: Respond with ONLY the complete HTML document. No explanation, no markdown fences.
The <body> should contain ONLY the <header> and <footer> — no other elements.`;
}

// --- SEO Meta Injection (post-processing) ---
function injectSeoMeta(ws) {
  const distDir = DIST_DIR();
  const pages = listPages();
  const spec = readSpec();
  const siteName = spec.site_name || 'Website';
  const brief = spec.design_brief || {};
  const goal = brief.goal || '';
  const audience = brief.audience || '';
  const businessType = spec.business_type || '';
  const tone = Array.isArray(brief.tone) ? brief.tone.join(', ') : (brief.tone || '');

  let injected = 0;

  for (const page of pages) {
    const filePath = path.join(distDir, page);
    let html = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Derive page name from filename
    const pageName = page === 'index.html' ? 'Home'
      : page.replace('.html', '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Build description from spec context
    const baseDesc = goal
      ? goal.substring(0, 155)
      : `${siteName} — ${pageName}. ${businessType ? businessType + '.' : ''} ${tone ? 'We are ' + tone + '.' : ''}`;
    const description = baseDesc.length > 160 ? baseDesc.substring(0, 157) + '...' : baseDesc;

    // Build keywords from spec
    const keywords = [
      siteName, businessType, pageName.toLowerCase(),
      ...(brief.content_priorities || []).slice(0, 3).map(p => p.split(' ').slice(0, 3).join(' ')),
      ...(Array.isArray(brief.tone) ? brief.tone : [])
    ].filter(Boolean).join(', ');

    // Ensure <html lang="en">
    if (!html.match(/<html[^>]*lang=/i)) {
      html = html.replace(/<html/i, '<html lang="en"');
      changed = true;
    }

    // Build the meta block — all tags that are missing
    const ogTitle = `${pageName} | ${siteName}`;
    const metaTags = [];
    if (!html.match(/<meta[^>]*name=["']description["']/i))
      metaTags.push(`    <meta name="description" content="${description.replace(/"/g, '&quot;')}">`);
    if (!html.match(/<meta[^>]*name=["']keywords["']/i))
      metaTags.push(`    <meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}">`);
    if (!html.match(/<meta[^>]*property=["']og:title["']/i))
      metaTags.push(`    <meta property="og:title" content="${ogTitle.replace(/"/g, '&quot;')}">`);
    if (!html.match(/<meta[^>]*property=["']og:description["']/i))
      metaTags.push(`    <meta property="og:description" content="${description.replace(/"/g, '&quot;')}">`);
    if (!html.match(/<meta[^>]*property=["']og:type["']/i))
      metaTags.push(`    <meta property="og:type" content="website">`);
    if (!html.match(/<meta[^>]*name=["']robots["']/i))
      metaTags.push(`    <meta name="robots" content="index, follow">`);

    // Inject as a block right after </title>
    if (metaTags.length > 0) {
      const metaBlock = '\n' + metaTags.join('\n');
      html = html.replace(/(<\/title>)/i, `$1${metaBlock}`);
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, html);
      injected++;
    }
  }

  if (injected > 0 && ws) {
    console.log(`[seo] Injected meta tags in ${injected} page(s)`);
    ws.send(JSON.stringify({ type: 'status', content: `SEO meta tags added to ${injected} page(s)` }));
  }
  return { injected };
}

// --- Auto Media Spec Scanner ---
// Scans HTML for image slots and auto-creates media specs for missing ones
// Dimension defaults by role
const SLOT_DIMENSIONS = {
  hero: '1920x1080',
  testimonial: '400x500',
  service: '800x600',
  team: '400x400',
  gallery: '800x600',
  logo: '400x200',
  favicon: '512x512',
};

// Extract slot data from a single HTML string, returns array of { slot_id, role, status, page }
function extractSlotsFromPage(html, page) {
  const slots = [];
  const imgRegex = /<img[^>]*data-slot-id=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const slotId = match[1];
    const roleMatch = tag.match(/data-slot-role=["']([^"']+)["']/i);
    const statusMatch = tag.match(/data-slot-status=["']([^"']+)["']/i);
    const role = roleMatch ? roleMatch[1] : 'unknown';
    const status = statusMatch ? statusMatch[1] : 'empty';
    const dimensions = SLOT_DIMENSIONS[role] || '800x600';
    slots.push({ slot_id: slotId, role, dimensions, status, page });
  }
  return slots;
}

// Scan all pages in dist and register slots in media_specs (spec.json)
function extractAndRegisterSlots(pages) {
  const spec = readSpec();
  const distDir = DIST_DIR();

  // Collect all slots from provided pages (or all pages if none specified)
  const pagesToScan = pages && pages.length > 0 ? pages : listPages();
  const allSlots = [];
  for (const page of pagesToScan) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    allSlots.push(...extractSlotsFromPage(html, page));
  }

  // Merge into media_specs — preserve status of existing slots (don't regress stock→empty)
  if (!spec.media_specs) spec.media_specs = [];
  const existingBySlotId = new Map(spec.media_specs.map(s => [s.slot_id, s]));

  for (const slot of allSlots) {
    const existing = existingBySlotId.get(slot.slot_id);
    if (existing) {
      // Update page/role/dimensions but preserve status if already upgraded
      existing.page = slot.page;
      existing.role = slot.role;
      existing.dimensions = slot.dimensions;
      // Don't regress: stock/uploaded/final should not go back to empty
    } else {
      spec.media_specs.push(slot);
      existingBySlotId.set(slot.slot_id, slot);
    }
  }

  // Remove specs for slots no longer in HTML (across scanned pages only)
  const scannedPages = new Set(pagesToScan);
  const currentSlotIds = new Set(allSlots.map(s => s.slot_id));
  spec.media_specs = spec.media_specs.filter(s =>
    !scannedPages.has(s.page) || currentSlotIds.has(s.slot_id)
  );

  writeSpec(spec);
  console.log(`[slots] Registered ${allSlots.length} slot(s) across ${pagesToScan.length} page(s)`);
  return allSlots.length;
}

// Legacy wrapper — kept for backward compatibility during transition
function autoDetectMediaSpecs(html) {
  // If HTML has data-slot-id attributes, use new slot extraction
  if (html.match(/data-slot-id=/i)) {
    // Single-page call — extract slots but don't register (caller should use extractAndRegisterSlots)
    return 0;
  }
  // Legacy fallback for pre-slot HTML — detect by heuristics
  const spec = readSpec();
  if (!spec.media_specs) spec.media_specs = [];
  const existing = new Set(spec.media_specs.map(s => s.slot_id || s.slot));
  let added = 0;

  if (html.match(/(?:hero|banner)[\s\S]{0,500}(?:background-image|<img)/i) && !existing.has('hero_image')) {
    spec.media_specs.push({ slot_id: 'hero-1', role: 'hero', dimensions: '1920x1080', status: 'empty', page: 'index.html' });
    added++;
  }
  if (html.match(/<img[^>]*(?:logo|brand)[^>]*>/i) && !existing.has('logo')) {
    spec.media_specs.push({ slot_id: 'logo-1', role: 'logo', dimensions: '400x200', status: 'empty', page: 'index.html' });
    added++;
  }
  if (html.match(/(?:gallery|portfolio|grid)[\s\S]{0,1000}(?:<img[^>]*>[\s\S]{0,200}){3,}/i) && !existing.has('gallery_images')) {
    spec.media_specs.push({ slot_id: 'gallery-1', role: 'gallery', dimensions: '800x600', status: 'empty', page: 'index.html' });
    added++;
  }
  if (html.match(/(?:team|about|staff)[\s\S]{0,500}<img/i) && !existing.has('team_photos')) {
    spec.media_specs.push({ slot_id: 'team-1', role: 'team', dimensions: '400x400', status: 'empty', page: 'index.html' });
    added++;
  }

  if (added > 0) {
    writeSpec(spec);
    console.log(`[media-specs] Legacy auto-detected ${added} new media spec(s)`);
  }
  return added;
}

// --- Project List & Switch APIs ---
app.get('/api/projects', (req, res) => {
  if (!fs.existsSync(SITES_ROOT)) return res.json([]);
  const dirs = fs.readdirSync(SITES_ROOT).filter(d => {
    return fs.statSync(path.join(SITES_ROOT, d)).isDirectory() &&
           fs.existsSync(path.join(SITES_ROOT, d, 'spec.json'));
  });

  const projects = dirs.map(d => {
    try {
      const spec = JSON.parse(fs.readFileSync(path.join(SITES_ROOT, d, 'spec.json'), 'utf8'));
      const hasHtml = fs.existsSync(path.join(SITES_ROOT, d, 'dist', 'index.html'));
      const pageCount = hasHtml ? fs.readdirSync(path.join(SITES_ROOT, d, 'dist')).filter(f => f.endsWith('.html')).length : 0;
      return {
        tag: d,
        name: spec.site_name || d,
        state: spec.state || 'unknown',
        business_type: spec.business_type || null,
        has_html: hasHtml,
        page_count: pageCount,
        deployed_url: spec.deployed_url || null,
        has_brief: !!spec.design_brief,
        is_current: d === TAG,
      };
    } catch {
      return { tag: d, name: d, state: 'error', is_current: d === TAG };
    }
  }).sort((a, b) => (b.is_current ? 1 : 0) - (a.is_current ? 1 : 0));

  res.json(projects);
});

app.delete('/api/projects/:tag', (req, res) => {
  const tag = req.params.tag;
  if (!tag || tag === TAG) {
    return res.status(400).json({ error: tag === TAG ? 'Cannot delete the active site — switch to another first' : 'tag required' });
  }
  const siteDir = path.join(SITES_ROOT, tag);
  if (!fs.existsSync(siteDir)) {
    return res.status(404).json({ error: `Site "${tag}" not found` });
  }
  // Move to trash directory instead of permanent delete
  const trashDir = path.join(SITES_ROOT, '.trash');
  fs.mkdirSync(trashDir, { recursive: true });
  const trashDest = path.join(trashDir, `${tag}-${Date.now()}`);
  fs.renameSync(siteDir, trashDest);
  console.log(`[studio] Moved site "${tag}" to trash: ${trashDest}`);
  res.json({ success: true, tag });
});

app.post('/api/switch-site', async (req, res) => {
  const newTag = req.body.tag;
  if (!newTag) return res.status(400).json({ error: 'tag required' });
  const newSiteDir = path.join(SITES_ROOT, newTag);
  if (!fs.existsSync(newSiteDir)) {
    return res.status(404).json({ error: `Site "${newTag}" not found` });
  }

  // End current session — must await so summary writes to the current site, not the new one
  await endSession();

  // Switch
  TAG = newTag;
  writeLastSite(TAG);
  invalidateSpecCache();
  currentPage = 'index.html';
  currentMode = 'build';
  sessionMessageCount = 0;
  sessionStartedAt = new Date().toISOString();

  // Load new site state
  const studio = loadStudio();
  startSession();

  // Notify all connected clients
  const pages = listPages();
  const spec = readSpec();
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'site-switched', tag: TAG, pages, currentPage }));
      client.send(JSON.stringify({ type: 'pages-updated', pages, currentPage }));
      client.send(JSON.stringify({ type: 'spec-updated', spec }));
    }
  });

  console.log(`[studio] Switched to site: ${TAG}`);
  res.json({ success: true, tag: TAG, pages, currentPage });
});

app.post('/api/new-site', async (req, res) => {
  let newTag = req.body.tag;
  if (!newTag) return res.status(400).json({ error: 'tag required' });
  // Sanitize: lowercase, replace spaces/special chars with hyphens
  newTag = newTag.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!newTag.startsWith('site-')) newTag = 'site-' + newTag;

  const newSiteDir = path.join(SITES_ROOT, newTag);
  if (fs.existsSync(newSiteDir)) {
    return res.status(400).json({ error: `Site "${newTag}" already exists` });
  }

  // Create minimal site structure
  const distDir = path.join(newSiteDir, 'dist');
  fs.mkdirSync(distDir, { recursive: true });

  const spec = {
    tag: newTag,
    site_name: req.body.name || newTag.replace('site-', '').replace(/-/g, ' '),
    business_type: req.body.business_type || '',
    state: 'new',
    created_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(newSiteDir, 'spec.json'), JSON.stringify(spec, null, 2));

  // Switch to the new site — await so summary writes to the old site directory
  await endSession();
  TAG = newTag;
  writeLastSite(TAG);
  invalidateSpecCache();
  currentPage = 'index.html';
  sessionMessageCount = 0;
  sessionStartedAt = new Date().toISOString();
  startSession();

  const pages = listPages();
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'site-switched', tag: TAG, pages, currentPage }));
    }
  });

  console.log(`[studio] Created and switched to new site: ${TAG}`);
  res.json({ success: true, tag: TAG });
});

// --- Media Specs API ---
app.put('/api/media-specs', (req, res) => {
  const spec = readSpec();
  if (!spec.media_specs) spec.media_specs = [];
  const { action, index, media_spec } = req.body;

  switch (action) {
    case 'add': {
      if (!media_spec || !(media_spec.slot_id || media_spec.slot)) {
        return res.status(400).json({ error: 'slot_id is required' });
      }
      const slotId = media_spec.slot_id || media_spec.slot;
      if (typeof slotId !== 'string' || slotId.length > 100 || !/^[a-z0-9-]+$/i.test(slotId)) {
        return res.status(400).json({ error: 'slot_id must be alphanumeric with hyphens' });
      }
      const validRoles = ['hero', 'testimonial', 'team', 'service', 'gallery', 'logo', 'favicon', 'unknown'];
      const role = media_spec.role || 'unknown';
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
      }
      const validSlotStatuses = ['empty', 'stock', 'uploaded', 'final'];
      const status = media_spec.status || 'empty';
      if (!validSlotStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validSlotStatuses.join(', ')}` });
      }
      spec.media_specs.push({
        slot_id: slotId,
        role,
        dimensions: media_spec.dimensions || '',
        status,
        page: media_spec.page || 'index.html',
      });
    }
      break;
    case 'update':
      if (index === undefined || index < 0 || index >= spec.media_specs.length) {
        return res.status(400).json({ error: 'invalid index' });
      }
      Object.assign(spec.media_specs[index], media_spec);
      break;
    case 'delete':
      if (index === undefined || index < 0 || index >= spec.media_specs.length) {
        return res.status(400).json({ error: 'invalid index' });
      }
      spec.media_specs.splice(index, 1);
      break;
    default:
      return res.status(400).json({ error: 'action must be add, update, or delete' });
  }

  writeSpec(spec);
  res.json({ success: true, media_specs: spec.media_specs });
});

// --- Rescan all pages: re-register slots + remove orphaned mappings ---
app.post('/api/rescan', (req, res) => {
  try {
    const pagesBefore = (readSpec().media_specs || []).length;
    extractAndRegisterSlots(listPages());
    const { removed } = reconcileSlotMappings();
    const pagesAfter = (readSpec().media_specs || []).length;
    const slots_registered = pagesAfter;
    const pages_scanned = listPages().length;
    console.log(`[rescan] ${pages_scanned} pages, ${slots_registered} slots, ${removed.length} orphans removed`);
    res.json({ success: true, slots_registered, orphans_removed: removed.length, pages_scanned, orphans: removed });
  } catch (err) {
    console.error('[rescan] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- AI Image Prompt Generator ---
app.post('/api/generate-image-prompt', (req, res) => {
  const { slot, context } = req.body;
  const spec = readSpec();
  const brief = spec.design_brief || {};

  // Look up slot-specific dimensions from media specs or infer from slot name
  const mediaSpecs = spec.media_specs || [];
  const slotLower = (slot || '').toLowerCase();
  const matchedSpec = mediaSpecs.find(s => slotLower.includes((s.slot_id || s.slot || '').toLowerCase()));

  // Infer dimensions based on slot type
  let suggestedDims = matchedSpec?.dimensions || '800x600'; // default: standard photo
  if (!matchedSpec) {
    if (slotLower.match(/logo|brand/)) suggestedDims = '400x100';
    else if (slotLower.match(/favicon|icon/)) suggestedDims = '512x512';
    else if (slotLower.match(/og|social|twitter|meta/)) suggestedDims = '1200x630';
    else if (slotLower.match(/hero|banner|full.?width|cover/)) suggestedDims = '1920x1080';
    else if (slotLower.match(/gallery|portfolio|project|before|after/)) suggestedDims = '800x600';
    else if (slotLower.match(/team|profile|headshot|member|avatar/)) suggestedDims = '400x400';
    else if (slotLower.match(/testimonial/)) suggestedDims = '200x200';
    else if (slotLower.match(/service|feature|benefit|why|choose|expertise|reliability|affordability/)) suggestedDims = '600x400';
    else if (slotLower.match(/story|about|company/)) suggestedDims = '800x600';
  }

  const prompt = `Generate a concise, effective image generation prompt for Midjourney or DALL-E.

CONTEXT:
- Image slot: ${slot || 'general'}
- Required dimensions: ${suggestedDims}
- Additional context: ${context || 'none'}
- Site goal: ${brief.goal || 'not specified'}
- Audience: ${brief.audience || 'not specified'}
- Tone: ${Array.isArray(brief.tone) ? brief.tone.join(', ') : brief.tone || 'not specified'}
- Visual direction: ${JSON.stringify(brief.visual_direction || {})}
- Colors: ${JSON.stringify(spec.colors || {})}

OUTPUT FORMAT (respond with ONLY this JSON, no other text):
{
  "prompt": "the image generation prompt text",
  "suggested_dimensions": "${suggestedDims}",
  "format": "jpg or png or svg"
}

Make the prompt specific, visual, and tailored to the brand. Include style keywords. Do NOT include text/words in the image prompt. Use the EXACT dimensions provided — do not default to 1920x1080.`;

  const child = spawnClaude(prompt);
  const imgTimeout = setTimeout(() => { console.error('[image-prompt] Timed out'); child.kill(); }, 120000);

  let response = '';
  child.stdout.on('data', (chunk) => { response += chunk.toString(); });
  child.stderr.on('data', (chunk) => { console.error('[image-prompt]', chunk.toString()); });

  child.on('close', (code) => {
    clearTimeout(imgTimeout);
    if (code !== 0 || !response.trim()) {
      return res.status(500).json({ error: 'Failed to generate image prompt' });
    }
    // Try to parse JSON from response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        // Force-override dimensions — don't trust Claude's output for this
        result.suggested_dimensions = suggestedDims;
        return res.json(result);
      }
    } catch {}
    // Fallback: return raw text as prompt
    res.json({ prompt: response.trim(), suggested_dimensions: suggestedDims, format: 'jpg' });
  });
});

// --- Multi-provider stock photo fetcher ---
// Returns up to `limit` results from one provider, or a fallback SVG placeholder.
// result: [{ url, thumb, credit, provider }]
async function fetchFromProvider(provider, query, width, height, limit = 6) {
  const config = loadSettings();
  const sp = config.stock_photo || {};
  const w = width || 800;
  const h = height || 600;

  if (provider === 'unsplash') {
    const key = sp.unsplash_api_key;
    if (!key) return [];
    try {
      const https = require('https');
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape&client_id=${key}`;
      const data = await new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Accept-Version': 'v1' } }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('parse error')); } });
        }).on('error', reject);
      });
      return (data.results || []).map(p => ({
        url: `${p.urls.raw}&w=${w}&h=${h}&fit=crop&auto=format`,
        thumb: p.urls.thumb,
        credit: p.user?.name || 'Unsplash',
        provider: 'unsplash',
      }));
    } catch { return []; }
  }

  if (provider === 'pexels') {
    const key = sp.pexels_api_key;
    if (!key) return [];
    try {
      const https = require('https');
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${limit}&orientation=landscape`;
      const data = await new Promise((resolve, reject) => {
        https.get(url, { headers: { 'Authorization': key } }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('parse error')); } });
        }).on('error', reject);
      });
      return (data.photos || []).map(p => ({
        url: p.src?.landscape || p.src?.original,
        thumb: p.src?.small,
        credit: p.photographer || 'Pexels',
        provider: 'pexels',
      }));
    } catch { return []; }
  }

  if (provider === 'placeholder') {
    // Zero-dependency SVG placeholder — always works
    const label = query.split(' ').slice(0, 3).join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#1e293b"/><text x="50%" y="50%" font-family="system-ui,sans-serif" font-size="18" fill="#64748b" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`;
    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return [{ url: dataUrl, thumb: dataUrl, credit: 'Placeholder', provider: 'placeholder' }];
  }

  return [];
}

// --- Stock photo search (preview grid for QSF) ---
app.get('/api/stock-search', async (req, res) => {
  const { query, width, height } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  const w = parseInt(width) || 800;
  const h = parseInt(height) || 600;

  const [unsplashResults, pexelsResults] = await Promise.all([
    fetchFromProvider('unsplash', query, w, h, 3),
    fetchFromProvider('pexels', query, w, h, 3),
  ]);

  const results = [...unsplashResults, ...pexelsResults];
  // Always pad with placeholder if we have < 2 real results
  if (results.length < 2) {
    results.push(...await fetchFromProvider('placeholder', query, w, h, 1));
  }

  res.json({ results, query });
});

// --- Stock Photo Fill ---
app.post('/api/stock-photo', async (req, res) => {
  const { slot_id, query, width, height } = req.body;
  if (!slot_id || !query) {
    return res.status(400).json({ error: 'slot_id and query required' });
  }

  let spec = readSpec();
  let mediaSpecs = spec.media_specs || [];
  let slotSpec = mediaSpecs.find(s => s.slot_id === slot_id);

  // Slot may exist in HTML but not yet registered — rescan and retry
  if (!slotSpec) {
    extractAndRegisterSlots(listPages());
    spec = readSpec();
    mediaSpecs = spec.media_specs || [];
    slotSpec = mediaSpecs.find(s => s.slot_id === slot_id);
  }
  // Still not found — create a minimal entry so the fill can proceed
  if (!slotSpec) {
    slotSpec = { slot_id, role: 'unknown', dimensions: `${width||800}x${height||600}`, status: 'empty', page: '' };
    spec.media_specs = [...mediaSpecs, slotSpec];
  }

  const w = width || parseInt((slotSpec.dimensions || '800x600').split('x')[0]) || 800;
  const h = height || parseInt((slotSpec.dimensions || '800x600').split('x')[1]) || 600;

  const distDir = DIST_DIR();
  const stockDir = path.join(distDir, 'assets', 'stock');
  fs.mkdirSync(stockDir, { recursive: true });
  const outputFile = path.join(stockDir, `${slot_id}.jpg`);

  try {
    // Build contextual query if caller just passed the role name
    const brief = spec.design_brief || {};
    const businessName = spec.site_name || brief.business_name || '';
    const industry = spec.business_type || brief.industry || brief.category || '';
    let finalQuery = query;
    if (query === slotSpec.role && (businessName || industry)) {
      finalQuery = [businessName, industry, query].filter(Boolean).join(' ');
    }

    // Load all provider API keys from config
    const config = loadSettings();
    const sp = config.stock_photo || {};
    const env = { ...process.env };
    if (sp.unsplash_api_key) env.UNSPLASH_API_KEY = sp.unsplash_api_key;
    if (sp.pexels_api_key) env.PEXELS_API_KEY = sp.pexels_api_key;
    if (sp.pixabay_api_key) env.PIXABAY_API_KEY = sp.pixabay_api_key;

    const scriptPath = path.join(__dirname, '..', 'scripts', 'stock-photo');
    const { execFileSync } = require('child_process');
    execFileSync(scriptPath, [finalQuery, String(w), String(h), outputFile], { env, timeout: 30000 });

    // Atomic update: set src in HTML + update status
    const pages = listPages();
    let updated = false;
    for (const page of pages) {
      const filePath = path.join(distDir, page);
      let html = fs.readFileSync(filePath, 'utf8');
      const escapedStockId = slot_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patched = patchSlotImg(html, escapedStockId, {
        src: `assets/stock/${slot_id}.jpg`,
        status: 'stock',
      });
      if (patched.changed) {
        fs.writeFileSync(filePath, patched.html);
        updated = true;
      }
    }

    // Update media_specs status
    slotSpec.status = 'stock';
    // Store query used so it's visible in slot detail / QSF
    if (!spec.slot_mappings) spec.slot_mappings = {};
    spec.slot_mappings[slot_id] = {
      src: `assets/stock/${slot_id}.jpg`,
      alt: slot_id.replace(/-/g, ' '),
      provider: 'stock',
      query: finalQuery,
    };
    writeSpec(spec);

    res.json({ success: true, slot_id, src: `assets/stock/${slot_id}.jpg`, query: finalQuery, updated });
  } catch (err) {
    console.error('[stock-photo]', err.message);
    res.status(500).json({ error: `Failed to fetch stock photo: ${err.message}` });
  }
});

// --- Apply a pre-selected stock photo URL to a slot ---
app.post('/api/stock-apply', async (req, res) => {
  const { slot_id, image_url, credit, provider, query, width, height } = req.body;
  if (!slot_id || !image_url) return res.status(400).json({ error: 'slot_id and image_url required' });

  // Validate URL
  let parsedUrl;
  try { parsedUrl = new URL(image_url); } catch { return res.status(400).json({ error: 'invalid image_url' }); }
  if (!['https:', 'http:'].includes(parsedUrl.protocol)) return res.status(400).json({ error: 'invalid protocol' });

  const distDir = DIST_DIR();
  const stockDir = path.join(distDir, 'assets', 'stock');
  fs.mkdirSync(stockDir, { recursive: true });
  const outputFile = path.join(stockDir, `${slot_id}.jpg`);

  try {
    // Download the image
    await new Promise((resolve, reject) => {
      const https = require('https');
      const http = require('http');
      const proto = parsedUrl.protocol === 'https:' ? https : http;
      const file = fs.createWriteStream(outputFile);
      proto.get(image_url, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Follow one redirect
          proto.get(response.headers.location, (r2) => { r2.pipe(file); file.on('finish', resolve); }).on('error', reject);
        } else {
          response.pipe(file);
          file.on('finish', resolve);
        }
      }).on('error', reject);
    });

    // Patch HTML slot
    const pages = listPages();
    let updated = false;
    for (const page of pages) {
      const filePath = path.join(distDir, page);
      let html = fs.readFileSync(filePath, 'utf8');
      const escaped = slot_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patched = patchSlotImg(html, escaped, { src: `assets/stock/${slot_id}.jpg`, status: 'stock' });
      if (patched.changed) { fs.writeFileSync(filePath, patched.html); updated = true; }
    }

    // Update spec
    let spec = readSpec();
    const slotSpec = (spec.media_specs || []).find(s => s.slot_id === slot_id);
    if (slotSpec) slotSpec.status = 'stock';
    if (!spec.slot_mappings) spec.slot_mappings = {};
    spec.slot_mappings[slot_id] = {
      src: `assets/stock/${slot_id}.jpg`,
      alt: slot_id.replace(/-/g, ' '),
      provider: provider || 'stock',
      credit: credit || '',
      query: query || '',
    };
    writeSpec(spec);

    res.json({ success: true, slot_id, src: `assets/stock/${slot_id}.jpg`, updated });
  } catch (err) {
    console.error('[stock-apply]', err.message);
    res.status(500).json({ error: `Failed to download image: ${err.message}` });
  }
});

// --- Share Site ---
app.post('/api/share', async (req, res) => {
  const { type, recipient, message, subject } = req.body;
  if (!type || !recipient || !message) {
    return res.status(400).json({ error: 'type, recipient, and message required' });
  }

  const config = loadSettings();
  const emailSubject = subject || 'Check out this website';

  if (type === 'email') {
    const emailConfig = config.email || {};
    if (!emailConfig.user || !emailConfig.app_password) {
      // Fallback to mailto URI
      return res.json({
        success: false,
        fallback: 'mailto',
        error: 'Email not configured. Add Gmail credentials in Settings → Notifications.',
        mailto: `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}`
      });
    }

    try {
      const providerMap = {
        gmail: { service: 'gmail', host: 'smtp.gmail.com', port: 587 },
        outlook: { service: 'hotmail', host: 'smtp-mail.outlook.com', port: 587 },
        sendgrid: { host: 'smtp.sendgrid.net', port: 587 },
        custom: { host: emailConfig.host, port: emailConfig.port || 587 },
      };
      const prov = providerMap[emailConfig.provider || 'gmail'] || providerMap.gmail;
      const transportOpts = {
        host: prov.host,
        port: prov.port,
        secure: false,
        auth: {
          user: emailConfig.provider === 'sendgrid' ? 'apikey' : emailConfig.user,
          pass: emailConfig.app_password,
        },
      };
      if (prov.service) transportOpts.service = prov.service;
      const transporter = nodemailer.createTransport(transportOpts);

      await transporter.sendMail({
        from: emailConfig.from_name ? `"${emailConfig.from_name}" <${emailConfig.user}>` : emailConfig.user,
        to: recipient,
        subject: emailSubject,
        text: message,
        html: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <p style="font-size:16px;color:#333;">${message.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#2563eb;text-decoration:underline;">$1</a>')}</p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="font-size:12px;color:#9ca3af;">Sent from FAMtastic Site Studio</p>
        </div>`,
      });

      console.log(`[share] Email sent to ${recipient}`);
      return res.json({ success: true });
    } catch (e) {
      console.error('[share] Email failed:', e.message);
      return res.json({ success: false, error: `Email failed: ${e.message}. Check your Gmail App Password in Settings.` });
    }
  } else if (type === 'text') {
    const smsConfig = config.sms || {};
    const smsProvider = smsConfig.provider || 'email_gateway';

    if (smsProvider === 'email_gateway') {
      // Send SMS via carrier email gateway — uses the email config
      const emailConfig = config.email || {};
      if (!emailConfig.user || !emailConfig.app_password) {
        return res.json({
          success: false,
          fallback: 'sms',
          error: 'Email not configured. Email gateway SMS requires email settings.',
          sms: `sms:${encodeURIComponent(recipient)}?body=${encodeURIComponent(message)}`
        });
      }
      const carrier = smsConfig.carrier || 'tmomail.net';
      // Strip non-digits from phone number
      const digits = recipient.replace(/\D/g, '').replace(/^1/, '');
      const gatewayAddr = `${digits}@${carrier}`;

      try {
        const providerMap = {
          gmail: { service: 'gmail', host: 'smtp.gmail.com', port: 587 },
          outlook: { service: 'hotmail', host: 'smtp-mail.outlook.com', port: 587 },
          sendgrid: { host: 'smtp.sendgrid.net', port: 587 },
          custom: { host: emailConfig.host, port: emailConfig.port || 587 },
        };
        const prov = providerMap[emailConfig.provider || 'gmail'] || providerMap.gmail;
        const transportOpts = {
          host: prov.host, port: prov.port, secure: false,
          auth: { user: emailConfig.provider === 'sendgrid' ? 'apikey' : emailConfig.user, pass: emailConfig.app_password },
        };
        if (prov.service) transportOpts.service = prov.service;
        const transporter = nodemailer.createTransport(transportOpts);

        await transporter.sendMail({
          from: emailConfig.from_name ? `"${emailConfig.from_name}" <${emailConfig.user}>` : emailConfig.user,
          to: gatewayAddr,
          subject: subject || 'Check out this site',
          text: message,
        });

        console.log(`[share] SMS via gateway sent to ${gatewayAddr}`);
        return res.json({ success: true });
      } catch (e) {
        console.error('[share] SMS gateway failed:', e.message);
        return res.json({ success: false, error: `SMS gateway failed: ${e.message}` });
      }
    }

    // Twilio / Vonage API path
    if (smsProvider === 'vonage') {
      if (!smsConfig.api_key || !smsConfig.api_secret || !smsConfig.from_number) {
        return res.json({
          success: false, fallback: 'sms',
          error: 'Vonage SMS not configured. Add api_key, api_secret, and from_number in Settings.',
          sms: `sms:${encodeURIComponent(recipient)}?body=${encodeURIComponent(message)}`
        });
      }
      try {
        const { Vonage } = require('@vonage/server-sdk');
        const vonage = new Vonage({ apiKey: smsConfig.api_key, apiSecret: smsConfig.api_secret });
        await vonage.sms.send({ to: recipient.replace(/\D/g, ''), from: smsConfig.from_number, text: message });
        console.log(`[share] SMS via Vonage sent to ${recipient}`);
        return res.json({ success: true });
      } catch (e) {
        console.error('[share] Vonage SMS failed:', e.message);
        return res.json({ success: false, error: `Vonage SMS failed: ${e.message}. Check credentials in Settings.` });
      }
    }

    // Twilio (default API provider)
    if (!smsConfig.account_sid || !smsConfig.auth_token || !smsConfig.from_number) {
      return res.json({
        success: false,
        fallback: 'sms',
        error: 'Twilio SMS not configured. Add account_sid, auth_token, and from_number in Settings.',
        sms: `sms:${encodeURIComponent(recipient)}?body=${encodeURIComponent(message)}`
      });
    }

    try {
      const twilio = require('twilio')(smsConfig.account_sid, smsConfig.auth_token);
      await twilio.messages.create({
        body: message,
        from: smsConfig.from_number,
        to: recipient,
      });

      console.log(`[share] SMS via Twilio sent to ${recipient}`);
      return res.json({ success: true });
    } catch (e) {
      console.error('[share] Twilio SMS failed:', e.message);
      return res.json({ success: false, error: `Twilio SMS failed: ${e.message}. Check credentials in Settings.` });
    }
  }

  res.status(400).json({ error: 'Unknown share type' });
});

// --- Session Summaries API ---
app.get('/api/summaries', (req, res) => {
  const summaries = loadSessionSummaries(10);
  res.json(summaries);
});

app.post('/api/summarize', (req, res) => {
  generateSessionSummary();
  res.json({ status: 'summary generation started' });
});

// --- Settings API ---
const SETTINGS_FILE = path.join(process.env.HOME || '~', '.config', 'famtastic', 'studio-config.json');

function loadSettings() {
  const defaults = {
    model: 'claude-haiku-4-5-20251001',
    deploy_target: 'netlify',
    deploy_team: 'fritz-medine',
    brainstorm_profile: 'balanced',
    preview_port: 3333,
    studio_port: 3334,
    max_upload_size_mb: 5,
    max_uploads_per_site: 100,
    auto_summary: true,
    auto_version: true,
    max_versions: 50,
    hero_full_width: true,
    prod_sites_base: path.join(require('os').homedir(), 'famtastic-sites'),
  };
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      return { ...defaults, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
    } catch { return defaults; }
  }
  return defaults;
}

function saveSettings(settings) {
  const dir = path.dirname(SETTINGS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

app.get('/api/blueprint', (req, res) => {
  const bp = readBlueprint();
  res.json(bp || { version: 1, pages: {}, global: {}, last_updated: null });
});

app.post('/api/blueprint', (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'JSON body required' });
  const bp = readBlueprint() || { version: 1, pages: {}, global: {}, last_updated: null };
  // Merge incoming changes
  if (req.body.pages) {
    for (const [page, entry] of Object.entries(req.body.pages)) {
      if (!isValidPageName(page)) continue;
      bp.pages[page] = {
        title: entry.title || bp.pages[page]?.title || page.replace('.html', ''),
        sections: Array.isArray(entry.sections) ? entry.sections : (bp.pages[page]?.sections || []),
        components: Array.isArray(entry.components) ? entry.components : (bp.pages[page]?.components || []),
        layout_notes: Array.isArray(entry.layout_notes) ? entry.layout_notes : (bp.pages[page]?.layout_notes || []),
      };
    }
  }
  if (req.body.global) bp.global = { ...bp.global, ...req.body.global };
  writeBlueprint(bp);
  res.json(bp);
});

app.get('/api/build-metrics', (req, res) => {
  const metricsFile = path.join(SITE_DIR(), 'build-metrics.jsonl');
  if (!fs.existsSync(metricsFile)) return res.json([]);
  try {
    const lines = fs.readFileSync(metricsFile, 'utf8').trim().split('\n').filter(Boolean);
    const metrics = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    res.json(metrics);
  } catch { res.json([]); }
});

// --- Verification API ---
app.get('/api/verify', (req, res) => {
  const spec = readSpec();
  res.json(spec.last_verification || null);
});

app.post('/api/verify', (req, res) => {
  const pages = listPages();
  if (pages.length === 0) return res.json({ status: 'failed', checks: [], issues: ['No pages found'], timestamp: new Date().toISOString() });
  const result = runBuildVerification(pages);
  try {
    const spec = readSpec();
    spec.last_verification = result;
    writeSpec(spec);
  } catch {}
  res.json(result);
});

app.post('/api/visual-verify', (req, res) => {
  const pages = listPages();
  res.json({
    ready: true,
    pages,
    previewUrl: 'http://localhost:3333',
    agents: [
      'famtastic-visual-layout',
      'famtastic-console-health',
      'famtastic-mobile-responsive',
      'famtastic-accessibility',
      'famtastic-performance'
    ],
    prompt: 'Run a full visual audit of the current FAMtastic site at http://localhost:3333'
  });
});

app.get('/api/settings', (req, res) => {
  const settings = loadSettings();
  // Redact sensitive values — only expose whether keys are configured
  const safe = JSON.parse(JSON.stringify(settings));
  const secretPaths = [
    ['stock_photo', 'unsplash_api_key'],
    ['stock_photo', 'pexels_api_key'],
    ['stock_photo', 'pixabay_api_key'],
    ['email', 'app_password'],
    ['sms', 'auth_token'],
    ['sms', 'api_key'],
    ['sms', 'api_secret'],
    ['sms', 'account_sid'],
  ];
  for (const [section, key] of secretPaths) {
    if (safe[section] && safe[section][key]) {
      safe[section][key + '_configured'] = true;
      delete safe[section][key];
    }
  }
  res.json(safe);
});

app.put('/api/settings', (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'JSON body required' });
  const allowedKeys = ['model', 'deploy_target', 'deploy_team', 'preview_port', 'studio_port',
    'max_upload_size_mb', 'max_uploads_per_site', 'auto_summary', 'auto_version', 'max_versions',
    'email', 'sms', 'stock_photo', 'analytics_provider', 'analytics_id', 'brainstorm_profile',
    'prod_sites_base'];
  const current = loadSettings();
  for (const key of Object.keys(req.body)) {
    if (allowedKeys.includes(key)) current[key] = req.body[key];
  }
  saveSettings(current);
  res.json(current);
});

// --- Request Classifier ---
// Classifies user intent. Returns one of:
// new_site, major_revision, restyle, layout_update, content_update, bug_fix, asset_import, build, deploy, query
function classifyRequest(message, spec) {
  const lower = message.toLowerCase();
  const hasBrief = spec && spec.design_brief && spec.design_brief.approved;
  const hasHtml = fs.existsSync(path.join(DIST_DIR(), 'index.html'));

  // Precedence: brainstorm > rollback > new_site > major_revision > restyle > layout_update > content_update > bug_fix > asset_import

  // Brief edit — update the design brief directly
  if (lower.match(/\b(edit\s+(?:the\s+)?brief|update\s+(?:the\s+)?brief|change\s+the\s+goal|fix\s+the\s+audience|modify\s+(?:the\s+)?brief)\b/)) return 'brief_edit';

  // Visual inspection — check rendered CSS, layout, images, responsive, console errors
  if (lower.match(/\b(check|measure|inspect|examine)\s+(?:the\s+)?(nav|header|footer|hero|layout|width|height|spacing|font|color|section|images?|slots?|structure)/)) return 'visual_inspect';
  // Page-specific inspection: "check the about page", "inspect the services page"
  if (lower.match(/\b(check|inspect|examine|look\s+at)\s+(?:the\s+)?(\w+)\s+page\b/) && !lower.match(/\b(contact|quote|cta)\b.*\b(form|button)\b/)) return 'visual_inspect';
  if (lower.match(/\b(overflow\w*|responsive\s+check|mobile\s+check|tablet\s+check|screenshot|any\s+(?:js\s+)?errors?|console\s+errors?|broken\s+images?|check\s+(?:on\s+)?mobile|check\s+(?:on\s+)?tablet|how\s+(?:does\s+it\s+)?look\s+on\s+mobile)\b/)) return 'visual_inspect';
  if (lower.match(/\bwhat\s+does\s+(?:the\s+)?(\w+)\s+(?:page\s+)?look\s+like\b/)) return 'visual_inspect';
  if (lower.match(/\b(what\s+(?:color|font|size)\s+is|how\s+(?:wide|tall|big)\s+is)\b/)) return 'visual_inspect';
  if (lower.match(/\b(how\s+many\s+(?:sections?|images?|links?|forms?|headings?|pages?)|what\s+(?:images?|sections?|links?|forms?|headings?|colors?|fonts?)\s+(?:are\s+(?:there|on)|does))\b/)) return 'visual_inspect';
  if (lower.match(/\bdoes\s+this\s+(?:page\s+)?have\s+(?:good\s+)?(?:seo|accessibility|a11y|good\s+structure|proper\s+headings?|heading\s+structure)\b/)) return 'visual_inspect';
  if (lower.match(/\b(check\s+everything|full\s+audit|run\s+all\s+(?:checks?|audits?)|audit\s+everything|inspect\s+everything|complete\s+audit)\b/)) return 'visual_inspect';
  if (lower.match(/\b(accessib\w*|a11y|aria\s+check|heading\s+hierarchy|seo\s+audit|check\s+seo|check\s+links|broken\s+links|dead\s+links|link\s+checker|form\s+validation|check\s+(?:the\s+)?(?:\w+\s+)?forms?|performance\s+check|page\s+size|how\s+heavy|nav\s+consistency|compare\s+nav|meta\s+tags?|og\s+tags?|canonical\s+(?:tag|url)|schema\s+(?:markup|org)|json.?ld)\b/)) return 'visual_inspect';
  if (lower.match(/\b(what\s+fonts?\s+(?:are\s+)?(?:used|does)|is\s+(?:it\s+)?responsive|check\s+(?:for\s+)?responsive\s+issues?|does\s+the\s+nav\s+match|nav\s+match(?:es)?\s+(?:on\s+)?all|is\s+there\s+a\s+form|check\s+the\s+logo|logo\s+check|what(?:'s|\s+is)\s+the\s+(?:page\s+)?title|page\s+title|check\s+required\s+fields?|required\s+fields?|are\s+(?:all\s+)?(?:nav\s+)?links?\s+working|working\s+links?|is\s+(?:the\s+)?canonical\s+(?:set|tag|url|configured)|canonical\s+(?:tag|url|set))\b/)) return 'visual_inspect';

  // Brand health check
  if (lower.match(/\b(check\s+brand|brand\s+health|what'?s?\s+missing|asset\s+checklist|brand\s+check|missing\s+assets)\b/)) return 'brand_health';

  // Brainstorm mode — explore ideas without generating HTML
  if (lower.match(/\b(brainstorm|let'?s?\s+(think|explore|plan\s+more|discuss|ideate)|think\s+about|explore\s+ideas|planning\s+mode)\b/)) return 'brainstorm';

  // Version rollback — require version/previous context near "restore" to avoid matching "restore the original colors"
  if (lower.match(/\b(rollback|roll\s+back|revert|undo|go\s+back\s+to|previous\s+version)\b/)) return 'rollback';
  if (lower.match(/\brestore\b/) && lower.match(/\b(version|previous|backup|earlier|last)\b/)) return 'rollback';

  // Version history — require "version" as anchor to avoid matching "what's the history of this font"
  if (lower.match(/\b(versions?|changelog|change\s+log)\b/) || lower.match(/\bversion\s+history\b/)) return 'version_history';

  // Summarize session
  if (lower.match(/\b(summarize|summary|wrap\s+up|save\s+progress)\b/)) return 'summarize';

  // Data model / database planning
  if (lower.match(/\b(data\s+model|database|schema|entities|what\s+data|need\s+a\s+db|cms|dynamic\s+content|user\s+accounts|e-?commerce|booking\s+system)\b/)) return 'data_model';

  // Tech stack advice
  if (lower.match(/\b(what\s+tech|tech\s+stack|which\s+platform|should\s+i\s+use|recommend.*(?:stack|tech|platform)|static\s+or\s+(?:cms|dynamic)|cms\s+or)\b/)) return 'tech_advice';

  // Template import
  if (lower.match(/\b(import|use|apply|start\s+from|start\s+with)\s+(?:this\s+|a\s+|the\s+)?(?:template|mockup|html\s+file)\b/)) return 'template_import';

  // Page navigation — switch to a different page for editing
  const pageMatch = lower.match(/\b(?:go\s+to|switch\s+to|edit|show|open)\s+(?:the\s+)?(\w+)\s+page\b/);
  if (pageMatch) {
    const pageName = pageMatch[1].toLowerCase();
    const pages = listPages();
    const targetPage = pages.find(p => p.replace('.html', '') === pageName || (pageName === 'home' && p === 'index.html'));
    if (targetPage) return 'page_switch';
  }

  // Git push — push repo to remote
  if (lower.match(/\b(push\s+studio\s+code|push\s+hub|sync\s+studio)\b/)) return 'hub_push';
  if (lower.match(/\b(push\s+to\s+(repo|git|github|remote)|git\s+push|sync\s+repo|update\s+repo)\b/)) return 'git_push';

  // Explicit commands first
  if (lower.match(/\bdeploy\b/) && !lower.match(/\bhow\s+to\s+deploy\b/)) return 'deploy';
  if (lower.match(/\b(build|rebuild)\s+(the\s+)?site\b/) || lower.match(/\b(generate|create|make)\s+(the\s+)?site\b/)) return 'build';
  if (lower.match(/\buse\s+(the\s+)?(event|business|portfolio|landing)\s+template\b/) || lower.match(/\bapply\s+(the\s+)?(event|business|portfolio|landing)\s+template\b/)) return 'build';
  if (lower.match(/\b(list|show|what)\s+(assets|templates|pages)\b/) || lower.includes('preview')) return 'query';

  // Asset generation
  if (lower.match(/(?:create|make|generate|design|draw)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(logo|icon|favicon|hero|banner|divider|illustration)/)) return 'asset_import';

  // Fill stock photos — bulk fill empty image slots
  if (lower.match(/\b(add|fill|insert|get|find|need)\s+(?:some\s+|all\s+)?(?:placeholder\s+)?(?:images?|photos?|stock\s+photos?|pictures?)\b/) ||
      lower.match(/\b(fill\s+(?:the\s+)?(?:image|photo)\s+slots?|stock\s+photos?)\b/) ||
      lower.match(/\bi\s+need\s+images?\b/)) return 'fill_stock_photos';

  // New site — no brief exists yet (HTML may exist from fallback template)
  if (!hasBrief) return 'new_site';

  // Brief approved but no HTML built yet — need to build first
  if (hasBrief && !hasHtml) return 'build';

  // Major revision signals
  if (lower.match(/\b(start\s+over|from\s+scratch|completely\s+different|total(ly)?\s+(re)?do|scrap\s+(it|this|everything))\b/)) return 'major_revision';
  if (lower.match(/\b(i('m|\s+am)\s+not\s+feeling|hate\s+(it|this)|this\s+(isn't|is\s+not)\s+what|wrong\s+direction)\b/)) return 'major_revision';

  // Restyle signals — about overall vibe, not specific elements
  if (lower.match(/\b(make\s+it\s+(more|less)\s+\w+|change\s+the\s+(whole|entire|overall)\s+(vibe|feel|look|style|aesthetic))\b/)) return 'restyle';
  if (lower.match(/\b(more\s+(premium|minimal|bold|elegant|modern|playful|professional|corporate|clean|edgy))\b/) && !lower.match(/\b(header|footer|button|section|nav|hero|card)\b/)) return 'restyle';

  // Bug fix signals
  if (lower.match(/\b(broken|bug|fix|doesn't\s+work|not\s+working|wrong|misaligned|overlapping|overflow)\b/)) return 'bug_fix';

  // Content update signals — text/copy changes without layout
  if (lower.match(/\b(change|update|replace|edit)\s+(the\s+)?(text|copy|phone|email|address|name|title|heading|paragraph|description|hours|price)\b/)) return 'content_update';

  // Layout update — structural changes to specific elements
  if (lower.match(/\b(add|remove|move|swap|rearrange|reorder)\s+(a\s+|the\s+)?(section|column|row|card|button|form|nav|header|footer|sidebar|testimonial|feature|grid)\b/)) return 'layout_update';
  if (lower.match(/\b(make\s+the\s+(header|footer|hero|nav|button|section)\s+\w+)\b/)) return 'layout_update';

  // Default: if classifier confidence is low, use least destructive path
  return 'layout_update';
}

// --- Curated Prompt Builder ---
function buildPromptContext(requestType, spec, userMessage) {
  const brief = spec.design_brief || null;
  const allDecisions = (spec.design_decisions || []).filter(d => d.status === 'approved');
  // Include all approved decisions (cap at 2000 chars to keep prompt lean)
  let decisionsText = allDecisions.map(d => `- [${d.category}] ${d.decision}`).join('\n');
  if (decisionsText.length > 2000) {
    // If too many, keep most recent with a note about truncation
    const truncated = allDecisions.slice(-15);
    decisionsText = `(${allDecisions.length - truncated.length} earlier decisions omitted)\n` +
      truncated.map(d => `- [${d.category}] ${d.decision}`).join('\n');
  }
  const decisions = allDecisions; // keep array for backward compat
  const pages = listPages();

  // Auto-detect if the user's message targets a different page than currentPage
  // e.g. "fix the popup on index.html" while viewing gallery.html
  // Auto-switch page: match "fix on about.html" or "fix the about page" or "changes to services"
  const pageRefMatch = userMessage.toLowerCase().match(/\b(?:on|in|for|to|update|fix|change|edit)\s+(?:the\s+)?(\w+)\.html\b/);
  const pageNameMatch = !pageRefMatch && userMessage.toLowerCase().match(/\b(?:on|in|for|to|update|fix|change|edit)\s+(?:the\s+)?(\w+)\s+page\b/);
  const matchedPageName = pageRefMatch ? pageRefMatch[1].toLowerCase() + '.html'
    : pageNameMatch ? pageNameMatch[1].toLowerCase() + '.html'
    : null;
  // Resolve which page to use — but don't mutate module-level currentPage here.
  // Return resolvedPage so the caller can update currentPage explicitly.
  let resolvedPage = currentPage;
  if (matchedPageName && requestType !== 'build' && requestType !== 'major_revision') {
    if (pages.includes(matchedPageName) && matchedPageName !== currentPage) {
      console.log(`[context] User references ${matchedPageName} (currently on ${currentPage}) — resolved for context`);
      resolvedPage = matchedPageName;
    }
  }

  const htmlPath = path.join(DIST_DIR(), resolvedPage);
  const currentHtml = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';

  // Build HTML context based on request type
  let htmlContext = '';
  if (requestType === 'build' || requestType === 'major_revision') {
    // For builds, just list existing pages — we'll generate fresh
    htmlContext = pages.length > 0
      ? `Existing pages: ${pages.join(', ')}`
      : '(no site generated yet)';
  } else if (requestType === 'bug_fix' || requestType === 'content_update') {
    // Full source needed for precise edits
    htmlContext = currentHtml;
  } else if (requestType === 'layout_update') {
    // Full source needed — layout changes must see existing content to preserve it
    htmlContext = currentHtml;
  } else if (requestType === 'restyle') {
    // Structural summary + key sections
    if (currentHtml.length > 3000) {
      htmlContext = summarizeHtml(currentHtml);
    } else {
      htmlContext = currentHtml;
    }
  } else {
    htmlContext = currentHtml ? summarizeHtml(currentHtml) : '(no site generated yet)';
  }

  // Add multi-page context for edit requests
  if (pages.length > 1 && requestType !== 'build' && requestType !== 'major_revision') {
    const otherPages = pages.filter(p => p !== currentPage);
    htmlContext += `\n\nCURRENT PAGE: ${currentPage}\nOther pages in this site: ${otherPages.join(', ')}`;
  }

  // Build brief context
  let briefContext = '';
  if (brief) {
    briefContext = `\nDESIGN BRIEF (approved):
- Goal: ${brief.goal || 'not set'}
- Audience: ${brief.audience || 'not set'}
- Tone: ${Array.isArray(brief.tone) ? brief.tone.join(', ') : brief.tone || 'not set'}
- Visual direction: ${JSON.stringify(brief.visual_direction || {}, null, 0)}
- Content priorities: ${(brief.content_priorities || []).join(', ') || 'not set'}
- Must-have sections: ${(brief.must_have_sections || []).join(', ') || 'not set'}
- AVOID: ${(brief.avoid || []).join('; ') || 'none specified'}`;
  }

  // Build decisions context
  let decisionsContext = '';
  if (decisions.length > 0) {
    decisionsContext = '\nACTIVE DESIGN DECISIONS:\n' + decisions.map(d =>
      `- [${d.category}] ${d.decision}`
    ).join('\n');
  }

  // Uploaded assets context
  let assetsContext = '';
  const uploadedAssets = spec.uploaded_assets || [];
  if (uploadedAssets.length > 0) {
    assetsContext = '\nUPLOADED ASSETS:\n' + uploadedAssets.map(a => {
      let desc = `- ${a.filename} [role: ${a.role}]`;
      if (a.label) desc += ` "${a.label}"`;
      if (a.notes) desc += ` (${a.notes})`;
      desc += ` → /assets/uploads/${a.filename}`;
      // Role-specific instruction
      if (a.role === 'brand_asset') {
        desc += ' — USE this file directly in the HTML (logo, favicon, brand element)';
      } else if (a.role === 'content' || a.role === 'site_image') {
        desc += ' — Place this image in the appropriate section';
      } else if (['reference', 'inspiration', 'layout_reference', 'style_reference'].includes(a.role)) {
        desc += ' — This shows the STYLE the user wants — match the aesthetic, do NOT use this file in the HTML';
      }
      return desc;
    }).join('\n');
  }

  // Cross-session context
  let sessionContext = '';
  const summaries = loadSessionSummaries(2);
  if (summaries.length > 0) {
    sessionContext = '\nPREVIOUS SESSION CONTEXT:\n' + summaries.map(s => s.content).join('\n---\n');
  }

  // Recent conversation history (intra-session continuity)
  let conversationHistory = '';
  const recentConvo = loadRecentConversation(RECENT_CONVO_COUNT);
  if (recentConvo) {
    console.log(`[convo-history] Injected ${recentConvo.length} chars (${recentConvo.split('\n').length} lines) into prompt`);
    conversationHistory = '\nRECENT CONVERSATION (for context — the user may reference these exchanges):\n' + recentConvo;
  }

  // Core anti-cookie-cutter rules
  const systemRules = `RULES:
- Never default to a generic business template layout
- Preserve approved design decisions unless the user explicitly changes them
- Interpret the site as a coherent brand system, not isolated sections
- Avoid filler copy and stock structure unless justified
- Every section should feel intentional for THIS specific business/project
- If the user's request conflicts with the brief, flag it — don't silently override`;

  // Blueprint context — prevents rebuild regression
  const blueprintContext = buildBlueprintContext(currentPage);

  // Slot mapping context — tell Claude about existing images so it preserves them
  let slotMappingContext = '';
  const slotMappings = spec.slot_mappings || {};
  const mappingEntries = Object.entries(slotMappings);
  if (mappingEntries.length > 0) {
    slotMappingContext = '\nEXISTING IMAGES (uploaded or stock — use these exact src values, do NOT replace with placeholders):\n' +
      mappingEntries.map(([slotId, mapping]) => {
        let line = `- ${slotId}: ${mapping.src}`;
        if (mapping.alt) line += ` (alt: "${mapping.alt}")`;
        return line;
      }).join('\n');
  }

  // Load template context for single-page edits (so Claude copies chrome from template)
  const templateContext = loadTemplateContext();

  return { htmlContext, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, conversationHistory, blueprintContext, slotMappingContext, templateContext, resolvedPage };
}

function summarizeHtml(html) {
  // Extract structural summary without dumping full HTML (that was a no-op before)
  const sections = [];
  const sectionMatch = html.match(/<(?:section|header|footer|nav|main|div)\s[^>]*(?:id|class)="[^"]*"/g) || [];
  sectionMatch.slice(0, 15).forEach(s => sections.push(s));

  const headings = html.match(/<h[1-6][^>]*>([^<]+)</g) || [];
  const headingText = headings.slice(0, 10).map(h => h.replace(/<h[1-6][^>]*>/, ''));

  // Extract slot IDs for reference
  const slots = html.match(/data-slot-id="([^"]+)"/g) || [];
  const slotIds = slots.map(s => s.match(/"([^"]+)"/)[1]);

  const lineCount = html.split('\n').length;

  return `[HTML SUMMARY: ${lineCount} lines]
Sections found: ${sections.length > 0 ? sections.join(', ') : 'none identified'}
Headings: ${headingText.length > 0 ? headingText.join(' | ') : 'none'}
Slots: ${slotIds.length > 0 ? slotIds.join(', ') : 'none'}`;
}

// --- Tech Stack Analysis ---
function analyzeTechStack(brief) {
  const goal = (brief.goal || '').toLowerCase();
  const sections = (brief.must_have_sections || []).map(s => s.toLowerCase());
  const allText = goal + ' ' + sections.join(' ');

  const recommendations = [];

  // Detect dynamic needs
  const hasDynamic = allText.match(/booking|e-?commerce|shop|store|cart|checkout|login|account|dashboard|payment|subscription/);
  const hasCMS = allText.match(/blog|news|articles|portfolio|gallery|updates|posts|magazine/);
  const hasForm = allText.match(/contact|form|inquiry|quote|booking/);

  if (hasDynamic) {
    recommendations.push({
      category: 'architecture',
      suggestion: 'Custom web application',
      reason: 'Dynamic features detected — needs server-side logic for ' + hasDynamic[0],
      stack: 'Next.js or Express + database',
    });
  } else if (hasCMS) {
    recommendations.push({
      category: 'architecture',
      suggestion: 'Static site with CMS',
      reason: 'Content-heavy site benefits from a CMS for easy updates',
      stack: 'Static HTML + headless CMS (or WordPress)',
    });
  } else {
    recommendations.push({
      category: 'architecture',
      suggestion: 'Static site',
      reason: 'Straightforward site — static HTML + Tailwind is the fastest path to launch',
      stack: 'HTML + Tailwind CSS (current setup)',
    });
  }

  // Hosting
  if (hasDynamic) {
    recommendations.push({
      category: 'hosting',
      suggestion: 'Vercel or Railway',
      reason: 'Needs server-side rendering or API routes',
    });
  } else {
    recommendations.push({
      category: 'hosting',
      suggestion: 'Netlify',
      reason: 'Already configured — free tier, CDN, instant deploys',
    });
  }

  // Forms
  if (hasForm && !hasDynamic) {
    recommendations.push({
      category: 'forms',
      suggestion: 'Netlify Forms or Formspree',
      reason: 'Contact forms on static sites need a form backend service',
    });
  }

  return recommendations;
}

// --- Data Model Planner (Database-driven sites, concept phase) ---
function handleDataModelPlanning(ws, userMessage, spec) {
  ws.send(JSON.stringify({ type: 'status', content: 'Analyzing data requirements...' }));

  const brief = spec.design_brief ? JSON.stringify(spec.design_brief, null, 2) : 'none';
  const techRecs = spec.tech_recommendations ? JSON.stringify(spec.tech_recommendations, null, 2) : 'none';

  const prompt = `You are a database architect for FAMtastic Site Studio.

The user is planning a site that may need dynamic data. Analyze their requirements and produce a DATA MODEL PLAN.

DESIGN BRIEF: ${brief}
TECH RECOMMENDATIONS: ${techRecs}
USER REQUEST: "${userMessage}"

Respond with a structured data model plan:

DATA_MODEL:
{
  "needs_database": true/false,
  "reason": "why or why not",
  "suggested_stack": "e.g., PostgreSQL + Prisma, or MongoDB, or 'none - static is fine'",
  "entities": [
    {
      "name": "EntityName",
      "description": "what this represents",
      "fields": [
        { "name": "field_name", "type": "string|number|boolean|date|reference", "required": true/false, "notes": "any special behavior" }
      ],
      "relationships": ["has_many: OtherEntity", "belongs_to: ParentEntity"]
    }
  ],
  "mock_approach": "how to represent this with static HTML for now (e.g., hardcoded JSON, static cards, placeholder content)",
  "migration_path": "how to move from static mock to real database later"
}

Be practical. If the site doesn't need a database, say so clearly. If it does, keep the model minimal — only include what's actually needed.`;

  const child = spawnClaude(prompt);
  ws.currentChild = child;
  const dmTimeout = setTimeout(() => { console.error('[data-model] Timed out'); child.kill(); }, 180000);

  let response = '';
  let firstChunk = true;
  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
    if (firstChunk) {
      ws.send(JSON.stringify({ type: 'status', content: 'Generating data model...' }));
      firstChunk = false;
    }
  });
  child.stderr.on('data', (chunk) => { console.error('[data-model]', chunk.toString()); });

  child.on('close', (code) => {
    clearTimeout(dmTimeout);
    ws.currentChild = null;
    if (code !== 0 || !response.trim()) {
      ws.send(JSON.stringify({ type: 'error', content: 'Data model planning failed. Try describing your data needs.' }));
      return;
    }

    response = response.trim();

    // Try to extract JSON data model
    const modelStart = response.indexOf('DATA_MODEL:');
    if (modelStart !== -1) {
      const jsonStr = response.substring(modelStart + 11).trim();
      const firstBrace = jsonStr.indexOf('{');
      if (firstBrace !== -1) {
        let depth = 0, end = firstBrace;
        for (let i = firstBrace; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') depth++;
          if (jsonStr[i] === '}') depth--;
          if (depth === 0) { end = i + 1; break; }
        }
        try {
          const dataModel = JSON.parse(jsonStr.substring(firstBrace, end));
          // Save to spec
          ws.send(JSON.stringify({ type: 'status', content: 'Saving data model to spec...' }));
          const currentSpec = readSpec();
          currentSpec.data_model = dataModel;
          writeSpec(currentSpec);

          // Format for display
          let display = `**Data Model Analysis**\n\n`;
          display += `Database needed: ${dataModel.needs_database ? 'Yes' : 'No'}\n`;
          display += `Reason: ${dataModel.reason}\n`;
          if (dataModel.suggested_stack) display += `Suggested stack: ${dataModel.suggested_stack}\n`;
          if (dataModel.entities && dataModel.entities.length > 0) {
            display += `\nEntities:\n`;
            dataModel.entities.forEach(e => {
              display += `- ${e.name}: ${e.description}\n`;
              e.fields.forEach(f => {
                display += `    ${f.name} (${f.type})${f.required ? ' *' : ''}\n`;
              });
            });
          }
          if (dataModel.mock_approach) display += `\nMock approach: ${dataModel.mock_approach}\n`;
          if (dataModel.migration_path) display += `Migration path: ${dataModel.migration_path}\n`;

          ws.send(JSON.stringify({ type: 'assistant', content: display }));
          appendConvo({ role: 'assistant', content: display, intent: 'data_model', at: new Date().toISOString() });
          return;
        } catch (e) {
          console.error('[data-model] Failed to parse JSON:', e.message);
        }
      }
    }

    // Fallback: show raw response
    ws.send(JSON.stringify({ type: 'assistant', content: response }));
    appendConvo({ role: 'assistant', content: response, intent: 'data_model', at: new Date().toISOString() });
  });
}

// --- Planning Handler ---
function handlePlanning(ws, userMessage, spec) {
  ws.send(JSON.stringify({ type: 'status', content: 'Analyzing your vision...' }));

  const existingBrief = spec.design_brief ? JSON.stringify(spec.design_brief, null, 2) : 'none';

  const prompt = `You are a design strategist for a website builder called FAMtastic Site Studio.

The user has described what they want. Your job is to create a structured design brief — NOT to generate HTML.

USER'S MESSAGE:
"${userMessage}"

EXISTING BRIEF (if any): ${existingBrief}
EXISTING SPEC: ${JSON.stringify({ site_name: spec.site_name, business_type: spec.business_type, colors: spec.colors, tone: spec.tone }, null, 2)}

Create a design brief with this EXACT format. Start your response with "BRIEF:" on the first line, then output valid JSON:

BRIEF:
{
  "goal": "What this site should accomplish",
  "audience": "Who it's for",
  "tone": ["adjective1", "adjective2", "adjective3"],
  "visual_direction": {
    "layout": "description of layout approach",
    "typography": "font style and hierarchy",
    "color_usage": "how colors should be applied",
    "motion": "animation/transition approach",
    "density": "content density — spacious, balanced, or dense"
  },
  "content_priorities": ["what must be emphasized first", "second priority"],
  "must_have_sections": ["hero", "about", etc.],
  "avoid": ["specific things NOT to do"],
  "open_questions": ["only questions that BLOCK a meaningful design decision — max 2, skip if you have enough signal"]
}

Be specific and opinionated. The avoid list is critical — name specific anti-patterns.
Do not generate HTML. Do not be vague. Extract real intent from what the user said.`;

  ws.send(JSON.stringify({ type: 'status', content: 'Creating design brief...' }));

  const child = spawnClaude(prompt);
  ws.currentChild = child;
  const planTimeout = setTimeout(() => { console.error('[planning] Timed out'); child.kill(); }, 180000);

  let response = '';

  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    console.error('[planning]', chunk.toString());
  });

  child.on('close', (code) => {
    clearTimeout(planTimeout);
    ws.currentChild = null;
    if (code !== 0 || !response.trim()) {
      ws.send(JSON.stringify({ type: 'error', content: 'Failed to create brief. Try describing your site again.' }));
      return;
    }

    response = response.trim();

    // Extract brief JSON from response
    let briefJson = null;
    const briefStart = response.indexOf('BRIEF:');
    if (briefStart !== -1) {
      const jsonStr = response.substring(briefStart + 6).trim();
      // Find the JSON object
      const firstBrace = jsonStr.indexOf('{');
      if (firstBrace !== -1) {
        let depth = 0;
        let end = firstBrace;
        for (let i = firstBrace; i < jsonStr.length; i++) {
          if (jsonStr[i] === '{') depth++;
          if (jsonStr[i] === '}') depth--;
          if (depth === 0) { end = i + 1; break; }
        }
        try {
          briefJson = JSON.parse(jsonStr.substring(firstBrace, end));
        } catch (e) {
          console.error('[planning] Failed to parse brief JSON:', e.message);
        }
      }
    }

    if (briefJson) {
      briefJson.approved = false;
      // Save brief to spec
      const currentSpec = readSpec();
      currentSpec.design_brief = briefJson;

      // Analyze tech stack
      const techRecommendations = analyzeTechStack(briefJson);
      currentSpec.tech_recommendations = techRecommendations;

      writeSpec(currentSpec);

      ws.send(JSON.stringify({ type: 'brief', brief: briefJson, techRecommendations }));
      appendConvo({ role: 'assistant', content: `Design brief created`, brief: briefJson, at: new Date().toISOString() });
    } else {
      // Couldn't parse — send raw response as text
      ws.send(JSON.stringify({ type: 'assistant', content: response }));
      appendConvo({ role: 'assistant', content: response, at: new Date().toISOString() });
    }
  });
}

// --- Brainstorm Handler ---
function handleBrainstorm(ws, userMessage, spec) {
  const brief = spec.design_brief ? JSON.stringify(spec.design_brief, null, 2) : 'none yet';
  const decisions = (spec.design_decisions || []).filter(d => d.status === 'approved');
  let decisionsText = decisions.length > 0
    ? decisions.map(d => `- [${d.category}] ${d.decision}`).join('\n')
    : 'none yet';
  if (decisionsText.length > 2000) {
    const truncated = decisions.slice(-15);
    decisionsText = `(${decisions.length - truncated.length} earlier decisions omitted)\n` +
      truncated.map(d => `- [${d.category}] ${d.decision}`).join('\n');
  }

  // Load session summaries for cross-session context
  const summaries = loadSessionSummaries(3);
  const summaryContext = summaries.length > 0
    ? '\nPREVIOUS SESSION SUMMARIES:\n' + summaries.map(s => s.content).join('\n---\n')
    : '';

  // Recent conversation history — so brainstorm can reference prior exchanges
  const recentConvo = loadRecentConversation(RECENT_CONVO_COUNT);
  const convoContext = recentConvo
    ? '\nRECENT CONVERSATION:\n' + recentConvo
    : '';

  const pages = listPages();

  // Profile-aware brainstorm style
  const profile = loadSettings().brainstorm_profile || 'balanced';
  const profileInstructions = {
    deep: 'Ask clarifying questions. Explore multiple directions. Challenge assumptions. Be thorough. Dig into trade-offs and edge cases.',
    balanced: 'Be a thoughtful creative partner. Explore ideas, ask questions when needed, suggest creative directions. Be opinionated but collaborative.',
    concise: 'Give 2-3 focused suggestions. No questions unless critical. Be direct and actionable. Keep responses short.',
  };
  const styleGuide = profileInstructions[profile] || profileInstructions.balanced;

  const prompt = `You are a creative design strategist for FAMtastic Site Studio. The user wants to BRAINSTORM — explore ideas, think through possibilities, discuss strategy.

DO NOT generate any HTML, CSS, or code. This is a THINKING conversation.

STYLE: ${styleGuide}

CURRENT PROJECT STATE:
- Site tag: ${TAG}
- Site name: ${spec.site_name || 'not set'}
- Business type: ${spec.business_type || 'not set'}
- Pages built: ${pages.length > 0 ? pages.join(', ') : 'none yet'}
- Design brief: ${brief}
- Active decisions: ${decisionsText}
${summaryContext}
${convoContext}

USER'S MESSAGE:
"${userMessage}"

Respond following the STYLE guidance above:
- Reference their existing decisions and brief
- Be opinionated but collaborative
- Keep it conversational, not formal

Do NOT output any HTML or suggest code changes. This is pure ideation.`;

  const child = spawnClaude(prompt);
  ws.currentChild = child;
  const bsTimeout = setTimeout(() => { console.error('[brainstorm] Timed out'); child.kill(); }, 180000);

  let response = '';
  child.stdout.on('data', (chunk) => { response += chunk.toString(); });
  child.stderr.on('data', (chunk) => { console.error('[brainstorm]', chunk.toString()); });

  child.on('close', (code) => {
    clearTimeout(bsTimeout);
    ws.currentChild = null;
    if (code !== 0 || !response.trim()) {
      ws.send(JSON.stringify({ type: 'error', content: 'Brainstorm failed. Try again.' }));
      return;
    }

    ws.send(JSON.stringify({ type: 'assistant', content: response.trim() }));
    ws.send(JSON.stringify({ type: 'brainstorm-actions' }));
    appendConvo({ role: 'assistant', content: response.trim(), intent: 'brainstorm', at: new Date().toISOString() });
  });
}

// --- Parallel Multi-Page Build ---
function parallelBuild(ws, spec, specPages, userMessage, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, conversationHistory, analyticsInstruction, slotMappingContext) {
  buildInProgress = true;
  const startTime = Date.now();

  // Detect logo file
  const logoSvg = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo.svg'));
  const logoPng = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo.png'));
  const logoFile = logoSvg ? 'assets/logo.svg' : logoPng ? 'assets/logo.png' : null;
  const logoInstruction = logoFile
    ? `\nLOGO: A logo file exists at "${logoFile}". Use <a href="index.html" data-logo-v class="block"><img src="${logoFile}" alt="${spec.site_name || 'Logo'}" class="h-10 w-auto"></a> for the logo. Do NOT show site name text next to the logo image.\n`
    : `\nLOGO: No logo image file exists. Use <a href="index.html" data-logo-v class="font-playfair text-2xl font-bold text-inherit hover:opacity-80 transition">${spec.site_name || ''}</a> as the logo. This element will automatically swap to an image when a logo is uploaded.\n`;

  // Normalize page names
  const pageFiles = specPages.map(p => {
    if (p === 'home' || p === 'hero') return 'index.html';
    return p.replace(/\s+/g, '-').toLowerCase().replace(/\.html$/, '') + '.html';
  });
  const allPageLinks = pageFiles.map(f => f).join(', ');

  const siteContext = `
SITE SPEC:
${JSON.stringify({ site_name: spec.site_name, business_type: spec.business_type, colors: spec.colors, tone: spec.tone, fonts: spec.fonts }, null, 2)}
${logoInstruction}
${briefContext}
${decisionsContext}
${assetsContext}
${sessionContext}
${conversationHistory}
${slotMappingContext || ''}

${systemRules}

USER REQUEST: "${userMessage}"

BEFORE YOU RESPOND — SEO CHECKLIST (verify the page has ALL of these):
□ <html lang="en">
□ <title>Page Name | ${spec.site_name || 'Business Name'}</title>
□ <meta name="description" content="..."> (unique, 150-160 chars)
□ <meta name="keywords" content="..."> (5-10 terms)
□ <meta property="og:title" content="...">
□ <meta property="og:description" content="...">
□ <meta property="og:type" content="website">
□ <meta name="robots" content="index, follow">
${analyticsInstruction}`;

  // Font configuration from spec
  const fontSerif = spec.fonts?.heading || 'Playfair Display';
  const fontSans = spec.fonts?.body || 'Inter';
  const fontUrl = `https://fonts.googleapis.com/css2?family=${fontSerif.replace(/\s+/g, '+')}:wght@400;500;600;700&family=${fontSans.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`;

  // Shared prompt rules for every page
  const sharedRules = `
HEAD REQUIREMENTS (CRITICAL — every page MUST include these in <head>):
- Tailwind CDN: <script src="https://cdn.tailwindcss.com"></script>
- Google Fonts: <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${fontUrl}" rel="stylesheet">

CSS THEMING (REQUIRED):
- Define brand colors as CSS custom properties in a <style> block inside <head>:
  :root { --color-primary: ${spec.colors?.primary || '#1a5c2e'}; --color-accent: ${spec.colors?.accent || '#d4a843'}; --color-bg: ${spec.colors?.bg || '#f0f4f0'}; --font-serif: '${fontSerif}', serif; --font-sans: '${fontSans}', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
- Use these variables throughout — reference var(--color-primary), var(--font-sans), etc.
- Put page-specific styles in a <style data-page="true"> block. Shared styles go in the main <style> block.

LOGO RULE (CRITICAL):
- The logo anchor MUST have data-logo-v attribute — this enables automatic logo swapping
- If a logo file exists: use <a href="index.html" data-logo-v class="block"><img src="..." class="h-10 w-auto"></a>
- If no logo file: use <a href="index.html" data-logo-v class="font-playfair text-2xl font-bold text-inherit hover:opacity-80 transition">Site Name</a>
- NEVER show both a logo image AND logo text — pick one
- NEVER use a placeholder image for the logo — logos are either a real file or styled text, nothing else
- Do NOT create an image slot (data-slot-id) for the logo — the logo is handled via data-logo-v

IMAGE SLOTS (CRITICAL):
Every <img> tag MUST have these data attributes:
- data-slot-id: unique role-based ID (e.g. "hero-1", "service-mowing")
- data-slot-status="empty"
- data-slot-role: one of: hero, testimonial, team, service, gallery, favicon
- src must be "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
- Do NOT use Unsplash URLs or placeholder.com

FORMS:
- All forms must use: method="POST" data-netlify="true"
- Add a hidden honeypot field for spam protection

NAVIGATION:
- Nav must link to ALL pages using real filenames: ${allPageLinks}
- Use real file links (about.html) NOT anchors (#about)

OUTPUT FORMAT:
Respond with ONLY the complete HTML document — from <!DOCTYPE html> to </html>.
No explanation, no markdown fences, no CHANGES summary. Just the HTML.`;

  const pageContentGuide = {
    'index.html': 'Hero section, value proposition, highlights from other pages, primary CTA, trust signals',
    'about.html': 'Company story, mission statement, team members, differentiators, why choose us',
    'services.html': 'Service cards with descriptions and icons/images, pricing hints, CTAs per service',
    'contact.html': 'Contact form (name/email/phone/message), address, phone, email, business hours, map placeholder',
    'gallery.html': 'Image grid with captions and hover overlays, categorization if relevant',
    'testimonials.html': 'Customer testimonials with names and star ratings, trust badges',
    'pricing.html': 'Pricing tiers with features and CTAs, comparison table',
    'faq.html': 'Frequently asked questions with expandable answers',
    'blog.html': 'Blog post previews with dates, categories, read-more links',
  };

  // Template-first build strategy:
  // Step 1 — Build _template.html (header/nav, footer, shared CSS) in one Claude call.
  // Step 2 — Extract template components, write artifacts (styles.css, _partials/).
  // Step 3 — Build ALL pages in true parallel, each receiving the template as context.
  // Fallback — If template fails, build pages without template (legacy mode).
  fs.mkdirSync(DIST_DIR(), { recursive: true });

  const writtenPages = [];

  function spawnPage(pageFile, templateContext) {
    const content = pageContentGuide[pageFile] || `Content appropriate for a "${pageFile.replace('.html', '').replace(/-/g, ' ')}" page`;

    // Build slot stability instruction for this page (fixes known bug — was missing from parallel builds)
    const currentPageSlots = (spec.media_specs || []).filter(s => s.page === pageFile);
    let slotStabilityBlock = '';
    if (currentPageSlots.length > 0) {
      slotStabilityBlock = `\nSLOT ID PRESERVATION (CRITICAL): This page has existing image slot assignments.\nYou MUST preserve these exact slot IDs — do not rename, renumber, or remove them:\n` +
        currentPageSlots.map(s => `  ${s.slot_id} (${s.role})`).join('\n') + '\n';
    }

    let pagePrompt;
    if (templateContext) {
      // Template-first build: page receives template components to copy verbatim
      pagePrompt = `You are a premium website builder. Generate the ${pageFile} page for a ${specPages.length}-page website.

PAGE TO BUILD: ${pageFile}
PAGE CONTENT: ${content}
All pages in this site: ${allPageLinks}
${buildBlueprintContext(pageFile)}
${slotStabilityBlock}
${templateContext}

YOUR OUTPUT STRUCTURE:
<!DOCTYPE html>
<html lang="en">
  <!-- Copy the <head> from the template above, then add: -->
  <!-- <title>Page Name | ${spec.site_name || 'Site'}</title> -->
  <!-- <meta name="description" content="..."> -->
  <!-- <style data-page="${pageFile.replace('.html', '')}"> for page-specific styles ONLY -->
<body>
  <!-- Copy the header from the template VERBATIM -->
  <main>
    <!-- YOUR PAGE CONTENT: ${content} -->
    <!-- All sections, images, text unique to this page go here -->
  </main>
  <!-- Copy the footer from the template VERBATIM -->
</body>
</html>

${siteContext}

IMAGE SLOTS (CRITICAL):
Every <img> tag MUST have these data attributes:
- data-slot-id: unique role-based ID (e.g. "hero-1", "service-mowing")
- data-slot-status="empty"
- data-slot-role: one of: hero, testimonial, team, service, gallery, favicon
- src must be "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"

FORMS:
- All forms must use: method="POST" data-netlify="true"
- Add a hidden honeypot field for spam protection

LAYOUT (non-negotiable — build system enforces these):
- The build system sets main { overflow-x: hidden; width: 100% } — all content must fit
  within the template max-width; wide content that escapes will be clipped inside main
- Wrap all section content in <div class="container"> (defined in shared CSS: max-width 90rem)
  Sections themselves can be full-width for background bleeds; only the inner .container is capped
- Never use fixed pixel widths on elements that could exceed their parent container
- Tables must have width: 100% and word-break: break-word
- All flex row children must have min-width: 0
- Do not use white-space: nowrap on any text that could be longer than ~20 characters

OUTPUT FORMAT:
Respond with ONLY the complete HTML document — from <!DOCTYPE html> to </html>.
No explanation, no markdown fences, no CHANGES summary. Just the HTML.`;
    } else {
      // Fallback: no template available — use legacy full-page generation
      pagePrompt = `You are a premium website builder. Generate the ${pageFile} page for a ${specPages.length}-page website.

PAGE TO BUILD: ${pageFile}
PAGE CONTENT: ${content}
All pages in this site: ${allPageLinks}
${buildBlueprintContext(pageFile)}
${slotStabilityBlock}
DESIGN CONSISTENCY: All pages share identical nav, footer, CSS custom properties, and layout style.
${siteContext}
${sharedRules}`;
    }

    const child = spawnClaude(pagePrompt);
    if (!ws.activeChildren) ws.activeChildren = [];
    ws.activeChildren.push(child);
    let pageResponse = '';
    return { child, getResponse: () => pageResponse, appendResponse: (c) => { pageResponse += c; } };
  }

  function spawnAllPages(templateContext) {
    if (pageFiles.length === 0) {
      finishParallelBuild(ws, writtenPages, startTime, spec);
      return;
    }

    ws.send(JSON.stringify({ type: 'status', content: `Spawning all ${pageFiles.length} pages in parallel...` }));
    let completed = 0;
    const total = pageFiles.length;
    const timedOutPages = new Set();

    for (const pageFile of pageFiles) {
      const { child, getResponse, appendResponse } = spawnPage(pageFile, templateContext);

      const pageTimeout = setTimeout(() => {
        console.error(`[parallel-build] ${pageFile} timed out after 5 minutes`);
        timedOutPages.add(pageFile);
        child.kill();
        ws.send(JSON.stringify({ type: 'error', content: `Build timed out for ${pageFile} — continuing with other pages.` }));
        // Don't increment here — the kill() will trigger the close event which handles completion
      }, 300000);

      child.stdout.on('data', (chunk) => { appendResponse(chunk.toString()); });
      child.stderr.on('data', (chunk) => { console.error(`[parallel-build:${pageFile}]`, chunk.toString()); });

      child.on('close', (code) => {
        clearTimeout(pageTimeout);
        ws.activeChildren = (ws.activeChildren || []).filter(c => c !== child);
        completed++;
        const response = getResponse().trim().replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');

        if (code === 0 && response.length > 50) {
          versionFile(pageFile, 'build');
          fs.writeFileSync(path.join(DIST_DIR(), pageFile), response);
          writtenPages.push(pageFile);
          console.log(`[parallel-build] ${pageFile} done (${response.length} bytes)`);
          ws.send(JSON.stringify({ type: 'status', content: `${pageFile} built (${completed}/${total} — ${Math.round((Date.now() - startTime) / 1000)}s)` }));
        } else {
          console.error(`[parallel-build] ${pageFile} failed (code ${code}, ${response.length} bytes)`);
          ws.send(JSON.stringify({ type: 'status', content: `${pageFile} failed — will retry on next build` }));
        }

        if (completed === total) {
          if (writtenPages.length === 0) {
            buildInProgress = false;
            ws.send(JSON.stringify({ type: 'error', content: 'All pages failed to build. Try again.' }));
          } else {
            finishParallelBuild(ws, writtenPages, startTime, spec);
          }
        }
      });
    }
  }

  // Template-first build strategy:
  // Step 1 — Build _template.html (header/nav, footer, shared CSS) in one Claude call.
  // Step 2 — Extract template components, write artifacts (styles.css, _partials/).
  // Step 3 — Build ALL pages in true parallel, each receiving the template as context.
  // Fallback — If template build fails, fall back to legacy no-seed parallel build.
  ws.send(JSON.stringify({ type: 'status', content: 'Building design template (header, nav, footer, shared CSS)...' }));

  const templatePrompt = buildTemplatePrompt(spec, pageFiles, briefContext, decisionsContext, assetsContext, systemRules, analyticsInstruction);
  const templateChild = spawnClaude(templatePrompt);
  ws.currentChild = templateChild;
  let templateResponse = '';
  let templateSpawned = false; // Guard against double-spawn from timeout + close race

  const templateTimeout = setTimeout(() => {
    if (templateSpawned) return;
    templateSpawned = true;
    console.error('[parallel-build] Template timed out after 3 minutes — falling back to legacy build');
    templateChild.kill();
    ws.send(JSON.stringify({ type: 'error', content: 'Template timed out — building pages without template (legacy mode).' }));
    spawnAllPages('');
  }, 180000); // 3 minute timeout for template (simpler than a full page)

  templateChild.stdout.on('data', (chunk) => { templateResponse += chunk.toString(); });
  templateChild.stderr.on('data', (chunk) => { console.error('[parallel-build:template]', chunk.toString()); });

  templateChild.on('close', (code) => {
    if (templateSpawned) return; // timeout already handled this
    templateSpawned = true;
    clearTimeout(templateTimeout);
    ws.currentChild = null;
    const templateHtml = templateResponse.trim().replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');

    if (code === 0 && templateHtml.length > 50) {
      // Write _template.html to dist
      fs.writeFileSync(path.join(DIST_DIR(), '_template.html'), templateHtml);
      ws.send(JSON.stringify({ type: 'status', content: `Template built (${Math.round((Date.now() - startTime) / 1000)}s) — writing artifacts...` }));

      // Extract components and write artifacts (styles.css, _partials/)
      const components = writeTemplateArtifacts(ws);

      if (components && (components.headBlock || components.headerHtml)) {
        // Build template context string for page prompts
        const templateContext = loadTemplateContext();
        ws.send(JSON.stringify({ type: 'status', content: `Template ready — launching all ${pageFiles.length} pages in parallel...` }));
        spawnAllPages(templateContext);
      } else {
        console.warn('[parallel-build] Template parsed but no usable components — falling back to legacy build');
        ws.send(JSON.stringify({ type: 'status', content: 'Template incomplete — building pages without template.' }));
        spawnAllPages('');
      }
    } else {
      console.error(`[parallel-build] Template failed (code ${code}, ${templateHtml.length} bytes) — falling back to legacy build`);
      ws.send(JSON.stringify({ type: 'status', content: 'Template failed — building pages without template (legacy mode).' }));
      spawnAllPages('');
    }
  });
}

// --- Unified Post-Processing Pipeline ---
// Replaces 3 inline pipelines with a single function
// --- Layout Overflow Fix ---
// Pins nav/footer width so page content can never affect it.
// html/body overflow-x:hidden is what actually prevents header stretching.
// main overflow-x:hidden adds a secondary clip layer inside main.
// Safe to run on any site — idempotent (strips old block before prepending new one).
function fixLayoutOverflow(ws) {
  const distDir = DIST_DIR();
  const cssPath = path.join(distDir, 'assets', 'styles.css');

  const settings = loadSettings();
  const FOUNDATION_START = '/* STUDIO LAYOUT FOUNDATION */';
  const FOUNDATION_END = '/* END STUDIO LAYOUT FOUNDATION */';

  // Hero full-width breakout: breaks first section out of main's 90% constraint
  const heroRule = settings.hero_full_width
    ? `\n/* Hero breakout: first section in main goes full viewport width */\nmain > section:first-of-type { width: 100vw; position: relative; left: 50%; margin-left: -50vw; }\n`
    : '';

  const FOUNDATION_BLOCK = `${FOUNDATION_START}
/* DO NOT REMOVE — keeps nav and footer width stable across all pages */
html, body { margin: 0; padding: 0; }
/* main: 90% width centered on desktop */
main { max-width: 90%; margin-left: auto; margin-right: auto; }
/* Shared container — consistent max-width inside header, sections, footer */
.container { width: 100%; max-width: 90rem; margin-left: auto; margin-right: auto; padding-left: 1.5rem; padding-right: 1.5rem; box-sizing: border-box; }
/* Prevent intrinsic overflow from flex/grid children */
*, *::before, *::after { box-sizing: border-box; min-width: 0; }
/* Media always contained */
img, video, table, iframe, embed, object { max-width: 100%; height: auto; }${heroRule}
${FOUNDATION_END}

`;

  const cssExists = fs.existsSync(cssPath);

  if (cssExists) {
    let css = fs.readFileSync(cssPath, 'utf8');
    // Strip any previous foundation block (idempotent)
    const blockRe = /\/\* STUDIO LAYOUT FOUNDATION \*\/[\s\S]*?\/\* END STUDIO LAYOUT FOUNDATION \*\/\s*/;
    css = css.replace(blockRe, '');
    // Also strip old LAYOUT FOUNDATION format from previous builds
    const oldBlockRe = /\/\* LAYOUT FOUNDATION \*\/[\s\S]*?\/\* END LAYOUT FOUNDATION \*\/\s*/;
    css = css.replace(oldBlockRe, '');
    fs.writeFileSync(cssPath, FOUNDATION_BLOCK + css);
    console.log('[post-process] Injected layout foundation into styles.css (nav containment active)');
  } else {
    console.log('[post-process] styles.css not found — skipping CSS injection, will patch HTML inline');
  }

  // Only patch inline <style> blocks when there is no external styles.css.
  // When styles.css exists, pages link to it and get the foundation that way.
  // Patching HTML when styles.css also exists would stack duplicate blocks on every build.
  if (cssExists) return;

  const pages = listPages();
  for (const page of pages) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) continue;
    let html = fs.readFileSync(filePath, 'utf8');
    if (html.includes('STUDIO LAYOUT FOUNDATION')) continue;
    // Prefix with newline so injection never concatenates onto an existing declaration
    const inlineFoundation = '\n    html,body{overflow-x:hidden;margin:0;padding:0} main{overflow-x:hidden;width:100%;max-width:100%} *,*::before,*::after{box-sizing:border-box;min-width:0} img,video,table,iframe,embed{max-width:100%;height:auto}';
    const styleMatch = html.match(/<style[^>]*>/);
    if (styleMatch) {
      html = html.replace(styleMatch[0], styleMatch[0] + `\n    /* STUDIO LAYOUT FOUNDATION */${inlineFoundation}\n    /* END STUDIO LAYOUT FOUNDATION */`);
    } else {
      html = html.replace('</head>', `  <style>/* STUDIO LAYOUT FOUNDATION */${inlineFoundation}\n  /* END STUDIO LAYOUT FOUNDATION */</style>\n</head>`);
    }
    fs.writeFileSync(filePath, html);
  }
}

function runPostProcessing(ws, writtenPages, options = {}) {
  const { isFullBuild = false, sourcePage = null } = options;

  // Step 1: Extract and register slots FIRST so mappings know about all slot IDs
  extractAndRegisterSlots(writtenPages);

  // Step 2: Reapply saved slot mappings (images survive rebuilds)
  reapplySlotMappings(writtenPages);

  // Step 3: Metadata
  updateBlueprint(writtenPages);
  injectSeoMeta(ws);

  // Step 4: Clean up orphaned slot mappings
  reconcileSlotMappings();

  // Step 5: Logo variant — swap data-logo-v content based on whether assets/logo.{ext} exists
  applyLogoV(writtenPages);

  if (isFullBuild) {
    // Template-first build: template artifacts (styles.css, _partials/) were already written
    // by writeTemplateArtifacts() during the build phase. Now just swap inline template styles
    // for <link> references in each page.
    const templatePath = path.join(DIST_DIR(), '_template.html');
    if (fs.existsSync(templatePath)) {
      // Template-first path: simple and deterministic
      applyTemplateToPages(ws, writtenPages);
    } else {
      // Legacy fallback (no template — old-style build): use sync-based post-processing
      const distDir = DIST_DIR();
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        const indexHtml = fs.readFileSync(indexPath, 'utf8');
        const navMatch = indexHtml.match(/<nav[\s\S]*?<\/nav>/i);
        if (navMatch) {
          const partialsDir = path.join(distDir, '_partials');
          fs.mkdirSync(partialsDir, { recursive: true });
          fs.writeFileSync(path.join(partialsDir, '_nav.html'), navMatch[0]);
        }
      }
      syncNavPartial(ws);
      syncFooterPartial(ws);
      ensureHeadDependencies(ws);
      syncHeadSection(ws);
      extractSharedCss(ws);
    }
  } else if (sourcePage) {
    // Single-page edit: template guarantees consistent nav/footer/head
    const templatePath = path.join(DIST_DIR(), '_template.html');
    if (fs.existsSync(templatePath)) {
      // Template-first: just swap inline template styles for <link>
      applyTemplateToPages(ws, writtenPages);
    } else {
      // Legacy fallback: propagate FROM edited page
      syncNavFromPage(ws, sourcePage);
      syncFooterFromPage(ws, sourcePage);
      ensureHeadDependencies(ws);
    }
    // NO extractSharedCss — don't strip inline styles on chat edits
    // NO syncHeadSection — don't mess with head on single edits
  }

  // Step 6: Fix layout overflow — ensures nav/footer stay viewport-width on all pages
  fixLayoutOverflow(ws);
}

// --- Build Verification System (Phase 1) ---
// Zero-token, zero-latency file-based verification that runs after every build.

function verifySlotAttributes(pages) {
  const issues = [];
  let totalSlots = 0;
  const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  for (const page of pages) {
    const filePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');

    // Find logo anchor ranges — images inside data-logo-v are managed by Logo-V system, not slots
    const logoRanges = [];
    const logoVRe = /<a[^>]*data-logo-v[^>]*>[\s\S]*?<\/a>/gi;
    let lm;
    while ((lm = logoVRe.exec(html)) !== null) {
      logoRanges.push({ start: lm.index, end: lm.index + lm[0].length });
    }

    const imgRegex = /<img[^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      const img = imgMatch[0];
      const imgOffset = imgMatch.index;

      // Skip images inside data-logo-v anchors
      if (logoRanges.some(r => imgOffset >= r.start && imgOffset < r.end)) continue;

      totalSlots++;
      const hasSlotId = /data-slot-id\s*=/.test(img);
      const hasSlotStatus = /data-slot-status\s*=/.test(img);
      const hasSlotRole = /data-slot-role\s*=/.test(img);

      if (!hasSlotId || !hasSlotStatus || !hasSlotRole) {
        const missing = [];
        if (!hasSlotId) missing.push('data-slot-id');
        if (!hasSlotStatus) missing.push('data-slot-status');
        if (!hasSlotRole) missing.push('data-slot-role');
        issues.push(`${page}: img missing ${missing.join(', ')}`);
      }

      const statusMatch = img.match(/data-slot-status\s*=\s*["']([^"']+)["']/);
      const srcMatch = img.match(/src\s*=\s*["']([^"']+)["']/);
      if (statusMatch && srcMatch) {
        const status = statusMatch[1];
        const src = srcMatch[1];
        if (status === 'empty' && src && !src.startsWith('data:image/')) {
          issues.push(`${page}: slot marked empty but has real src: ${src.substring(0, 60)}`);
        }
        if ((status === 'stock' || status === 'uploaded') && src && src.startsWith('data:image/')) {
          issues.push(`${page}: slot marked ${status} but src is a data URI (transparent pixel)`);
        }
      }
    }
  }

  const status = issues.length > 0 ? 'failed' : 'passed';
  return { check: 'slot-attributes', status, issues, slotsChecked: totalSlots };
}

function verifyCssCoherence() {
  const issues = [];
  const cssPath = path.join(DIST_DIR(), 'assets', 'styles.css');

  if (!fs.existsSync(cssPath)) {
    return { check: 'css-coherence', status: 'failed', issues: ['styles.css not found'] };
  }

  const css = fs.readFileSync(cssPath, 'utf8');
  const lines = css.split('\n');

  if (lines.length < 50) {
    issues.push(`styles.css is thin (${lines.length} lines)`);
  }

  const foundationCount = (css.match(/STUDIO LAYOUT FOUNDATION/g) || []).length;
  if (foundationCount === 0) {
    issues.push('layout foundation missing');
  } else if (foundationCount > 2) {
    // 2 is expected (start + end markers), more means duplication
    issues.push(`layout foundation duplicated (found ${foundationCount} marker occurrences)`);
  }

  if (!/:root\s*\{/.test(css)) {
    issues.push(':root block missing');
  } else {
    if (!css.includes('--color-primary')) issues.push('--color-primary missing from :root');
    if (!css.includes('--color-accent')) issues.push('--color-accent missing from :root');
    if (!css.includes('--color-bg')) issues.push('--color-bg missing from :root');
  }

  if (!/main\s*\{\s*[^}]*max-width:\s*90%/.test(css) && !/main\s*\{[^}]*max-width:\s*90%/.test(css)) {
    issues.push('main max-width 90% constraint missing');
  }

  const hasFailure = issues.some(i => !i.includes('thin') && !i.includes('missing from :root'));
  const status = issues.length === 0 ? 'passed' : hasFailure ? 'failed' : 'warned';
  return { check: 'css-coherence', status, issues };
}

function verifyCrossPageConsistency(pages) {
  const issues = [];
  if (pages.length <= 1) return { check: 'cross-page-consistency', status: 'passed', issues: [] };

  const navs = {};
  const footers = {};
  const fontUrls = {};

  for (const page of pages) {
    const filePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');

    const navMatch = html.match(/<nav[\s\S]*?<\/nav>/i);
    navs[page] = navMatch ? navMatch[0] : null;

    const footerMatch = html.match(/<footer[\s\S]*?<\/footer>/i);
    footers[page] = footerMatch ? footerMatch[0] : null;

    const fontMatch = html.match(/<link[^>]*href=["']([^"']*fonts\.googleapis\.com[^"']*)["'][^>]*>/i);
    fontUrls[page] = fontMatch ? fontMatch[1] : null;
  }

  const pageList = Object.keys(navs);
  const refPage = pageList[0];

  // Check nav consistency
  for (const page of pageList) {
    if (!navs[page]) {
      issues.push(`${page}: missing <nav> element`);
    } else if (navs[page] !== navs[refPage]) {
      issues.push(`${page}: nav differs from ${refPage}`);
    }
  }

  // Check footer consistency
  for (const page of pageList) {
    if (!footers[page]) {
      issues.push(`${page}: missing <footer> element`);
    } else if (footers[page] !== footers[refPage]) {
      issues.push(`${page}: footer differs from ${refPage}`);
    }
  }

  // Check font URL consistency
  const refFont = fontUrls[refPage];
  for (const page of pageList) {
    if (fontUrls[page] && refFont && fontUrls[page] !== refFont) {
      issues.push(`${page}: Google Fonts URL differs from ${refPage}`);
    }
  }

  const hasNavFooterIssue = issues.some(i => i.includes('missing <nav>') || i.includes('missing <footer>') || i.includes('differs from'));
  const hasFontOnly = issues.length > 0 && issues.every(i => i.includes('Google Fonts'));
  const status = issues.length === 0 ? 'passed' : hasFontOnly ? 'warned' : 'failed';
  return { check: 'cross-page-consistency', status, issues };
}

function verifyHeadDependencies(pages) {
  const issues = [];

  for (const page of pages) {
    const filePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');

    if (!html.includes('cdn.tailwindcss.com')) {
      issues.push(`${page}: missing Tailwind CDN script`);
    }
    if (!html.includes('assets/styles.css')) {
      issues.push(`${page}: missing assets/styles.css link`);
    }
    if (!html.includes('fonts.googleapis.com')) {
      issues.push(`${page}: missing Google Fonts link`);
    }
  }

  const status = issues.length === 0 ? 'passed' : 'failed';
  return { check: 'head-dependencies', status, issues };
}

function verifyLogoAndLayout(pages) {
  const issues = [];

  for (const page of pages) {
    const filePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');

    // Check header/nav area has data-logo-v (logo anchor lives in header, often outside <nav>)
    const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
    if (headerMatch && !/data-logo-v/.test(headerMatch[0])) {
      issues.push(`${page}: header missing data-logo-v attribute`);
    } else if (!headerMatch) {
      // fallback: check nav if no header element
      const navMatch = html.match(/<nav[\s\S]*?<\/nav>/i);
      if (navMatch && !/data-logo-v/.test(navMatch[0])) {
        issues.push(`${page}: nav missing data-logo-v attribute`);
      }
    }

    // Check for legacy placeholder paths
    if (/src=["'][^"']*assets\/placeholders\//.test(html)) {
      issues.push(`${page}: legacy placeholder path found (assets/placeholders/)`);
    }

    // Check <main> exists
    if (!/<main[\s>]/i.test(html)) {
      issues.push(`${page}: missing <main> element`);
    }
  }

  const hasFailure = issues.some(i => i.includes('missing <main>') || i.includes('data-logo-v') || i.includes('missing data-logo-v'));
  const hasWarnOnly = issues.length > 0 && issues.every(i => i.includes('placeholder'));
  const status = issues.length === 0 ? 'passed' : hasWarnOnly ? 'warned' : 'failed';
  return { check: 'logo-and-layout', status, issues };
}

function runBuildVerification(pages) {
  const checks = [
    verifySlotAttributes(pages),
    verifyCssCoherence(),
    verifyCrossPageConsistency(pages),
    verifyHeadDependencies(pages),
    verifyLogoAndLayout(pages)
  ];

  const overallStatus = checks.some(c => c.status === 'failed') ? 'failed'
    : checks.some(c => c.status === 'warned') ? 'warned'
    : 'passed';

  const allIssues = checks.flatMap(c => c.issues);

  return { status: overallStatus, checks, issues: allIssues, timestamp: new Date().toISOString() };
}

// --- Studio Visual Intelligence ---
// Two-tier site inspection: file-based (cheerio) for structure, Puppeteer for rendering.
// The server inspects, then feeds results into spawnClaude so Claude answers from real data.

function fileInspect(question, page) {
  const filePath = path.join(DIST_DIR(), page);
  if (!fs.existsSync(filePath)) return { tier: 'file', page, report: { error: `${page} not found` } };

  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  const cssPath = path.join(DIST_DIR(), 'assets', 'styles.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';

  const lower = question.toLowerCase();
  const report = {};

  // Full audit flag — triggers all inspection blocks
  const fullAudit = lower.match(/\b(check\s+everything|full\s+audit|run\s+all\s+(?:checks?|audits?)|audit\s+everything|inspect\s+everything|complete\s+audit)\b/);

  if (fullAudit || lower.match(/\b(nav|navigation|menu)\b/)) {
    report.nav = {
      links: $('nav a').map((i, el) => ({ text: $(el).text().trim(), href: $(el).attr('href') })).get(),
      classes: $('nav').attr('class') || '',
      parentTag: $('nav').parent().prop('tagName')?.toLowerCase(),
    };
  }

  if (fullAudit || lower.match(/\b(header|logo)\b/) || lower.match(/\bcheck\s+the\s+logo\b/)) {
    report.header = {
      classes: $('header').attr('class') || '',
      hasLogoV: $('[data-logo-v]').length > 0,
      logoSrc: $('[data-logo-v] img').attr('src') || null,
      childTags: $('header').children().map((i, el) => el.tagName.toLowerCase()).get(),
    };
  }

  if (fullAudit || lower.match(/\b(hero|first\s+section|banner)\b/)) {
    const hero = $('main > section:first-of-type');
    report.hero = {
      classes: hero.attr('class') || '',
      id: hero.attr('id') || null,
      images: hero.find('img').map((i, el) => ({
        src: $(el).attr('src')?.substring(0, 80),
        alt: $(el).attr('alt'),
        slotId: $(el).attr('data-slot-id'),
      })).get(),
      headings: hero.find('h1, h2').map((i, el) => $(el).text().trim()).get(),
    };
  }

  if (fullAudit || lower.match(/\b(footer)\b/)) {
    report.footer = {
      classes: $('footer').attr('class') || '',
      links: $('footer a').map((i, el) => ({ text: $(el).text().trim(), href: $(el).attr('href') })).get(),
      text: $('footer').text().trim().substring(0, 200),
    };
  }

  if (fullAudit || lower.match(/\b(colou?rs?|palette|primary|accent)\b/)) {
    const rootMatch = css.match(/:root\s*\{([^}]+)\}/);
    report.colors = rootMatch
      ? rootMatch[1].split(';').filter(l => l.includes('--color')).map(l => l.trim()).filter(Boolean)
      : ['no :root CSS variables found'];
  }

  if (fullAudit || lower.match(/\b(fonts?|typography|typeface)\b/) || lower.match(/\bwhat\s+fonts?\s+(?:are\s+)?(?:used|does)/)) {
    const fontLink = $('link[href*="fonts.googleapis.com"]').attr('href');
    report.fonts = {
      googleFonts: fontLink || 'none',
      cssVars: (css.match(/font-family[^;]+;/g) || []).slice(0, 5),
    };
  }

  if (fullAudit || lower.match(/\b(sections?|structure|layout)\b/)) {
    report.sections = $('main > section').map((i, el) => ({
      index: i + 1,
      id: $(el).attr('id') || null,
      classes: ($(el).attr('class') || '').substring(0, 80),
      heading: $(el).find('h1, h2, h3').first().text().trim() || '(no heading)',
      imageCount: $(el).find('img').length,
    })).get();
  }

  if (fullAudit || lower.match(/\b(images?|img|photos?|slots?)\b/)) {
    report.images = $('img').map((i, el) => ({
      src: $(el).attr('src')?.substring(0, 60),
      alt: $(el).attr('alt'),
      slotId: $(el).attr('data-slot-id'),
      slotStatus: $(el).attr('data-slot-status'),
      slotRole: $(el).attr('data-slot-role'),
    })).get();
  }

  // --- Accessibility Audit ---
  if (fullAudit || lower.match(/\b(accessib\w*|a11y|aria|heading\s+hierarchy|labels?|proper\s+headings?|heading\s+structure)\b/)) {
    const a11y = { issues: [], passed: [] };

    // Heading hierarchy
    const headings = [];
    $('h1, h2, h3, h4, h5, h6').each((i, el) => {
      headings.push({ level: parseInt(el.tagName[1]), text: $(el).text().trim().substring(0, 60) });
    });
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) a11y.issues.push('Missing <h1> — every page should have exactly one');
    else if (h1Count > 1) a11y.issues.push(`${h1Count} <h1> tags found — should be exactly one`);
    else a11y.passed.push('Single <h1> present');

    for (let i = 1; i < headings.length; i++) {
      if (headings[i].level > headings[i - 1].level + 1) {
        a11y.issues.push(`Heading skip: h${headings[i - 1].level} → h${headings[i].level} ("${headings[i].text}")`);
      }
    }
    if (!a11y.issues.some(i => i.includes('Heading skip'))) a11y.passed.push('Heading hierarchy is sequential');

    // Alt text quality
    const imgs = $('img').toArray();
    const noAlt = imgs.filter(el => !$(el).attr('alt') && $(el).attr('alt') !== '');
    const genericAlt = imgs.filter(el => {
      const alt = ($(el).attr('alt') || '').toLowerCase();
      return alt && /^(image|photo|picture|img|icon|logo)\s*\d*$/.test(alt);
    });
    if (noAlt.length > 0) a11y.issues.push(`${noAlt.length} image(s) missing alt attribute entirely`);
    else a11y.passed.push('All images have alt attributes');
    if (genericAlt.length > 0) a11y.issues.push(`${genericAlt.length} image(s) with generic alt text (e.g., "image 1")`);

    // Form labels
    $('input, select, textarea').each((i, el) => {
      const type = $(el).attr('type') || 'text';
      if (type === 'hidden' || type === 'submit' || type === 'button') return;
      const id = $(el).attr('id');
      const name = $(el).attr('name') || type;
      if (!id || $(`label[for="${id}"]`).length === 0) {
        const parent = $(el).parent('label');
        if (parent.length === 0) {
          a11y.issues.push(`Input "${name}" has no associated <label>`);
        }
      }
    });
    if (!a11y.issues.some(i => i.includes('no associated'))) a11y.passed.push('All form inputs have labels');

    // ARIA landmarks
    const landmarks = {
      main: $('main').length > 0,
      nav: $('nav').length > 0,
      header: $('header').length > 0,
      footer: $('footer').length > 0,
    };
    const missingLandmarks = Object.entries(landmarks).filter(([, v]) => !v).map(([k]) => k);
    if (missingLandmarks.length > 0) a11y.issues.push(`Missing landmarks: ${missingLandmarks.join(', ')}`);
    else a11y.passed.push('All ARIA landmarks present (header, nav, main, footer)');

    // Link text
    $('a').each((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      if (text === 'click here' || text === 'read more' || text === 'learn more' || text === '') {
        if (!$(el).attr('aria-label') && $(el).find('img').length === 0) {
          a11y.issues.push(`Link with poor text: "${text || '(empty)'}" → ${$(el).attr('href') || '(no href)'}`);
        }
      }
    });

    // Lang attribute
    const lang = $('html').attr('lang');
    if (!lang) a11y.issues.push('Missing lang attribute on <html>');
    else a11y.passed.push(`lang="${lang}" set on <html>`);

    a11y.headings = headings;
    report.accessibility = a11y;
  }

  // --- Performance Check (file-level) ---
  if (fullAudit || lower.match(/\b(performance|speed|asset\s+sizes?|page\s+size|how\s+heavy|weight)\b/)) {
    const perf = {};
    const htmlSize = Buffer.byteLength(html, 'utf8');
    perf.htmlSize = `${(htmlSize / 1024).toFixed(1)}KB`;

    // Inline CSS size
    let inlineCssSize = 0;
    $('style').each((i, el) => { inlineCssSize += $(el).text().length; });
    perf.inlineCssSize = `${(inlineCssSize / 1024).toFixed(1)}KB`;

    // External stylesheet
    const cssPath = path.join(DIST_DIR(), 'assets', 'styles.css');
    if (fs.existsSync(cssPath)) {
      perf.externalCssSize = `${(fs.statSync(cssPath).size / 1024).toFixed(1)}KB`;
    }

    // Script/resource counts
    perf.scripts = $('script[src]').length;
    perf.stylesheets = $('link[rel="stylesheet"]').length;
    perf.images = $('img').length;

    // Render-blocking scripts (no async/defer)
    const blockingScripts = [];
    $('script[src]').each((i, el) => {
      if (!$(el).attr('async') && !$(el).attr('defer')) {
        blockingScripts.push($(el).attr('src').substring(0, 60));
      }
    });
    perf.renderBlockingScripts = blockingScripts;

    // Image file sizes from disk
    const imgSizes = [];
    let totalImgBytes = 0;
    $('img').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (src.startsWith('data:')) return;
      const imgPath = path.join(DIST_DIR(), src.replace(/^\//, ''));
      if (fs.existsSync(imgPath)) {
        const size = fs.statSync(imgPath).size;
        totalImgBytes += size;
        if (size > 500 * 1024) { // flag images over 500KB
          imgSizes.push({ src: src.substring(0, 50), size: `${(size / 1024).toFixed(0)}KB` });
        }
      }
    });
    perf.totalImageSize = `${(totalImgBytes / 1024).toFixed(0)}KB`;
    perf.largeImages = imgSizes;

    report.performance = perf;
  }

  // --- Cross-Page Nav Consistency ---
  if (fullAudit || lower.match(/\b(nav\s+consistency|compare\s+nav|check\s+nav\s+across|nav\s+across\s+pages?|does\s+the\s+nav\s+match|nav\s+match(?:es)?\s+(?:on\s+)?all)\b/)) {
    const allPages = listPages();
    const navs = {};
    const footers = {};
    for (const p of allPages) {
      const fp = path.join(DIST_DIR(), p);
      if (!fs.existsSync(fp)) continue;
      const h = fs.readFileSync(fp, 'utf8');
      const navMatch = h.match(/<nav[\s\S]*?<\/nav>/i);
      navs[p] = navMatch ? navMatch[0] : null;
      const footerMatch = h.match(/<footer[\s\S]*?<\/footer>/i);
      footers[p] = footerMatch ? footerMatch[0] : null;
    }
    const refPage = allPages[0];
    const navIssues = [];
    const footerIssues = [];
    for (const p of allPages.slice(1)) {
      if (navs[p] !== navs[refPage]) navIssues.push(`${p} nav differs from ${refPage}`);
      if (footers[p] !== footers[refPage]) footerIssues.push(`${p} footer differs from ${refPage}`);
    }
    report.navConsistency = {
      pagesChecked: allPages.length,
      navMatch: navIssues.length === 0,
      navIssues,
      footerMatch: footerIssues.length === 0,
      footerIssues,
    };
  }

  // --- Form Validation ---
  if (fullAudit || lower.match(/\b(form\b|form\s+validation|contact\s+form|check\s+(?:the\s+)?(?:\w+\s+)?form|is\s+there\s+a\s+form|check\s+required\s+fields?|required\s+fields?)\b/)) {
    const forms = [];
    $('form').each((i, el) => {
      const form = $(el);
      const formInfo = {
        action: form.attr('action') || '(none)',
        method: form.attr('method') || 'GET',
        netlify: form.attr('data-netlify') === 'true' || form.attr('netlify') !== undefined,
        issues: [],
        passed: [],
      };

      // Check for action or Netlify
      if (!form.attr('action') && !formInfo.netlify) {
        formInfo.issues.push('No action attribute and no Netlify form detection');
      } else {
        formInfo.passed.push(formInfo.netlify ? 'Netlify Forms configured' : `Action: ${formInfo.action}`);
      }

      // Check inputs
      form.find('input, select, textarea').each((j, inp) => {
        const type = $(inp).attr('type') || 'text';
        if (type === 'hidden' || type === 'submit' || type === 'button') return;
        const name = $(inp).attr('name');
        if (!name) formInfo.issues.push(`Input (${type}) missing name attribute`);
      });

      // Email field type
      const emailInputs = form.find('input[name*="email"], input[placeholder*="email" i]');
      emailInputs.each((j, inp) => {
        if ($(inp).attr('type') !== 'email') {
          formInfo.issues.push(`Email field "${$(inp).attr('name') || 'unnamed'}" should have type="email"`);
        }
      });

      // Submit button
      if (form.find('button[type="submit"], input[type="submit"], button:not([type])').length === 0) {
        formInfo.issues.push('No submit button found');
      } else {
        formInfo.passed.push('Submit button present');
      }

      // Honeypot
      const hasHoneypot = form.find('input[name="bot-field"], [data-netlify-honeypot]').length > 0 ||
                          form.attr('data-netlify-honeypot');
      if (hasHoneypot) formInfo.passed.push('Honeypot spam protection');
      else formInfo.issues.push('No honeypot spam protection detected');

      // Required fields
      const requiredCount = form.find('[required]').length;
      formInfo.passed.push(`${requiredCount} required field(s)`);

      forms.push(formInfo);
    });
    report.forms = forms.length > 0 ? forms : [{ issues: ['No <form> elements found on this page'] }];
  }

  // --- Link Checker ---
  if (fullAudit || lower.match(/\b(check\s+links?|broken\s+links?|dead\s+links?|link\s+checker|what\s+links?|show\s+links?|list\s+links?|are\s+(?:all\s+)?(?:nav\s+)?links?\s+working|working\s+links?)\b/)) {
    const links = { internal: [], external: [], issues: [] };
    const allPages = listPages();
    const pageSet = new Set(allPages);

    $('a[href]').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim().substring(0, 40);

      if (!href || href === '#') {
        links.issues.push({ href: href || '(empty)', text, issue: 'Empty or placeholder href' });
        return;
      }
      if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('sms:')) {
        return; // skip protocol links
      }
      if (href.startsWith('http://') || href.startsWith('https://')) {
        links.external.push({ href: href.substring(0, 60), text });
        return;
      }
      // Internal link
      const targetFile = href.split('#')[0].split('?')[0];
      if (targetFile && !pageSet.has(targetFile)) {
        // Check if file exists in dist
        const targetPath = path.join(DIST_DIR(), targetFile);
        if (!fs.existsSync(targetPath)) {
          links.issues.push({ href, text, issue: `File not found: ${targetFile}` });
        }
      }
      links.internal.push({ href, text });

      // Check anchor targets
      if (href.includes('#')) {
        const anchor = href.split('#')[1];
        if (anchor) {
          const targetPage = targetFile || page;
          const targetHtml = targetPage === page ? html : (() => {
            const fp = path.join(DIST_DIR(), targetPage);
            return fs.existsSync(fp) ? fs.readFileSync(fp, 'utf8') : '';
          })();
          if (targetHtml && !new RegExp(`id=["']${anchor}["']`).test(targetHtml)) {
            links.issues.push({ href, text, issue: `Anchor #${anchor} not found in ${targetPage}` });
          }
        }
      }
    });

    links.summary = {
      internal: links.internal.length,
      external: links.external.length,
      issues: links.issues.length,
    };
    report.links = links;
  }

  // --- SEO Audit ---
  if (fullAudit || lower.match(/\b(seo|search\s+engine|meta\s+tags?|check\s+seo|og\s+tags?|canonical\s+(?:tag|url|set)|schema\s+(?:markup|org)|json.?ld|open\s+graph)\b/)) {
    const seo = { issues: [], passed: [] };

    // Title
    const title = $('title').text();
    if (!title) seo.issues.push('Missing <title> tag');
    else if (title.length < 30) seo.issues.push(`Title too short (${title.length} chars): "${title}" — aim for 30-60`);
    else if (title.length > 60) seo.issues.push(`Title too long (${title.length} chars) — aim for 30-60`);
    else seo.passed.push(`Title (${title.length} chars): "${title}"`);

    // Meta description
    const metaDesc = $('meta[name="description"]').attr('content');
    if (!metaDesc) seo.issues.push('Missing meta description');
    else if (metaDesc.length < 120) seo.issues.push(`Meta description too short (${metaDesc.length} chars) — aim for 120-160`);
    else if (metaDesc.length > 160) seo.issues.push(`Meta description too long (${metaDesc.length} chars) — aim for 120-160`);
    else seo.passed.push(`Meta description (${metaDesc.length} chars)`);

    // Heading hierarchy
    const h1s = $('h1');
    if (h1s.length === 0) seo.issues.push('No <h1> tag');
    else if (h1s.length > 1) seo.issues.push(`${h1s.length} <h1> tags — should be exactly 1`);
    else seo.passed.push(`H1: "${h1s.first().text().trim().substring(0, 60)}"`);

    // Canonical
    const canonical = $('link[rel="canonical"]').attr('href');
    if (!canonical) seo.issues.push('Missing canonical URL');
    else seo.passed.push(`Canonical: ${canonical}`);

    // OG tags
    const ogTags = ['og:title', 'og:description', 'og:image', 'og:type'];
    const missingOg = ogTags.filter(tag => $(`meta[property="${tag}"]`).length === 0);
    if (missingOg.length > 0) seo.issues.push(`Missing OG tags: ${missingOg.join(', ')}`);
    else seo.passed.push('All Open Graph tags present');

    // Schema.org
    const hasSchema = $('script[type="application/ld+json"]').length > 0;
    if (!hasSchema) seo.issues.push('No Schema.org JSON-LD structured data');
    else seo.passed.push('Schema.org JSON-LD present');

    // Viewport
    if ($('meta[name="viewport"]').length === 0) seo.issues.push('Missing viewport meta tag');
    else seo.passed.push('Viewport meta set');

    // Lang
    const lang = $('html').attr('lang');
    if (!lang) seo.issues.push('Missing lang attribute on <html>');
    else seo.passed.push(`Lang: ${lang}`);

    // Robots
    const robots = $('meta[name="robots"]').attr('content') || '';
    if (robots.includes('noindex')) seo.issues.push('Page has noindex — will not appear in search');

    // Alt text coverage
    const totalImgs = $('img').length;
    const withAlt = $('img[alt]').length;
    const altPct = totalImgs > 0 ? Math.round((withAlt / totalImgs) * 100) : 100;
    if (altPct < 100) seo.issues.push(`Alt text coverage: ${altPct}% (${withAlt}/${totalImgs} images)`);
    else seo.passed.push(`Alt text: 100% coverage (${totalImgs} images)`);

    // All pages reachable from nav
    const navLinks = $('nav a[href]').map((i, el) => $(el).attr('href')).get().filter(h => !h.startsWith('http'));
    const allPages = listPages();
    const unreachable = allPages.filter(p => !navLinks.includes(p) && p !== 'index.html' && !navLinks.includes(p.replace('.html', '')));
    if (unreachable.length > 0) seo.issues.push(`Pages not in nav: ${unreachable.join(', ')}`);
    else seo.passed.push('All pages reachable from nav');

    report.seo = seo;
  }

  // Always include page structure summary
  report.pageSummary = {
    title: $('title').text(),
    sections: $('main > section').length,
    images: $('img').length,
    links: $('a').length,
    forms: $('form').length,
    hasTailwind: $('script[src*="tailwindcss"]').length > 0,
    hasStylesheet: $('link[href*="styles.css"]').length > 0,
  };

  return { tier: 'file', page, report };
}

async function browserInspect(question, page) {
  const puppeteer = require('puppeteer');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  } catch (err) {
    return { tier: 'browser', page, report: { error: `Could not launch browser: ${err.message}` } };
  }

  const tab = await browser.newPage();
  const report = {};
  const lower = question.toLowerCase();

  try {
    // Set viewport based on question
    if (lower.match(/\bmobile\b/)) {
      await tab.setViewport({ width: 375, height: 812 });
      report.viewport = '375x812 (mobile)';
    } else if (lower.match(/\btablet\b/)) {
      await tab.setViewport({ width: 768, height: 1024 });
      report.viewport = '768x1024 (tablet)';
    } else {
      await tab.setViewport({ width: 1280, height: 800 });
      report.viewport = '1280x800 (desktop)';
    }

    const url = `http://localhost:${PREVIEW_PORT}/${page}`;
    await tab.goto(url, { waitUntil: 'networkidle0', timeout: 10000 });

    // Collect console errors
    const consoleErrors = [];
    tab.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

    // Check for overflow
    if (lower.match(/\b(overflow|scroll|responsive|mobile|tablet)\b/)) {
      report.overflow = await tab.evaluate(() => {
        const body = document.body;
        const hasHScroll = body.scrollWidth > document.documentElement.clientWidth;
        const overflowing = [...document.querySelectorAll('*')].filter(el =>
          el.scrollWidth > el.clientWidth + 2 && el.tagName !== 'HTML' && el.tagName !== 'BODY'
        ).map(el => ({
          tag: el.tagName.toLowerCase(),
          class: (el.className?.substring?.(0, 60)) || '',
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        })).slice(0, 10);
        return { hasHorizontalScroll: hasHScroll, bodyScrollWidth: body.scrollWidth, viewportWidth: document.documentElement.clientWidth, overflowingElements: overflowing };
      });
    }

    // Measure specific elements
    if (lower.match(/\b(width|height|size|dimension|measure|actual|pixel|spacing|padding|margin)\b/)) {
      const elName = lower.match(/\b(nav|header|footer|hero|main|section|body|container)\b/)?.[1] || 'header';
      const selector = elName === 'hero' ? 'main > section:first-of-type' : elName === 'container' ? '.container' : elName;
      report.measurements = await tab.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { error: `Element "${sel}" not found` };
        const rect = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        return {
          selector: sel,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          maxWidth: cs.maxWidth,
          padding: cs.padding,
          margin: cs.margin,
          display: cs.display,
          position: cs.position,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
        };
      }, selector);
    }

    // Screenshot
    if (lower.match(/\bscreenshot\b/)) {
      const ssDir = path.join(DIST_DIR(), 'assets');
      fs.mkdirSync(ssDir, { recursive: true });
      const ssFile = `inspect-${Date.now()}.png`;
      const ssPath = path.join(ssDir, ssFile);
      await tab.screenshot({ path: ssPath, fullPage: lower.includes('full') });
      report.screenshot = { path: `assets/${ssFile}`, fullPage: lower.includes('full') };
    }

    // Check images are actually rendering
    if (lower.match(/\b(image|images|broken|missing|visible|loading|render)\b/)) {
      report.imageHealth = await tab.evaluate(() => {
        return [...document.querySelectorAll('img')].map(img => ({
          src: img.src?.substring(0, 80),
          alt: img.alt,
          loaded: img.complete && img.naturalWidth > 0,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayedWidth: img.offsetWidth,
          displayedHeight: img.offsetHeight,
          visible: img.offsetWidth > 0 && img.offsetHeight > 0,
        }));
      });
    }

    // Console errors (always collected if asked)
    if (lower.match(/\b(error|console|js|javascript|debug)\b/)) {
      // Give the page a moment to produce errors
      await new Promise(r => setTimeout(r, 1000));
      report.consoleErrors = consoleErrors;
    }

    // Performance — network request analysis
    if (lower.match(/\b(performance|speed|load\s+time|network|requests)\b/)) {
      report.networkPerformance = await tab.evaluate(() => {
        const entries = performance.getEntriesByType('resource');
        const byType = {};
        let totalBytes = 0;
        for (const e of entries) {
          const type = e.initiatorType || 'other';
          if (!byType[type]) byType[type] = { count: 0, totalSize: 0 };
          byType[type].count++;
          byType[type].totalSize += e.transferSize || 0;
          totalBytes += e.transferSize || 0;
        }
        return {
          totalRequests: entries.length,
          totalTransferSize: `${(totalBytes / 1024).toFixed(0)}KB`,
          byType: Object.fromEntries(Object.entries(byType).map(([k, v]) => [k, { count: v.count, size: `${(v.totalSize / 1024).toFixed(0)}KB` }])),
          domContentLoaded: Math.round(performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart),
          loadComplete: Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart),
        };
      });
    }

  } finally {
    await browser.close();
  }

  return { tier: 'browser', page, report };
}

async function inspectSite(question, page) {
  const lower = question.toLowerCase();

  // Tier 2 triggers — needs actual browser rendering
  const needsBrowser = lower.match(
    /\b(overflow|responsive|mobile|tablet|screenshot|pixel|actual\s+width|computed|js\s+error|console|render|visible|hidden|broken\s+image|measure|dimension|display|how\s+(?:wide|tall|big|large)\s+is|is\s+it\s+responsive|check\s+(?:for\s+)?responsive)/
  );

  if (needsBrowser) {
    return await browserInspect(question, page);
  }
  return fileInspect(question, page);
}

function finishParallelBuild(ws, writtenPages, startTime, spec) {
  const elapsed = Math.round((Date.now() - startTime) / 1000);

  // Post-processing
  ws.send(JSON.stringify({ type: 'status', content: 'Post-processing...' }));
  runPostProcessing(ws, writtenPages, { isFullBuild: true });

  buildInProgress = false;

  // Save build metrics
  const buildMetrics = {
    timestamp: new Date().toISOString(),
    type: 'parallel_build',
    elapsed_seconds: elapsed,
    pages_built: writtenPages.length,
    pages: writtenPages,
    model: loadSettings().model || 'unknown'
  };
  try {
    const metricsFile = path.join(SITE_DIR(), 'build-metrics.jsonl');
    fs.appendFileSync(metricsFile, JSON.stringify(buildMetrics) + '\n');
  } catch {}

  // Run build verification
  ws.send(JSON.stringify({ type: 'status', content: 'Verifying build...' }));
  let verification = runBuildVerification(writtenPages);

  // Conditional auto-fix: tag images missing slot attributes (dynamic CRUD)
  const slotCheck = verification.checks.find(c => c.check === 'slot-attributes');
  if (slotCheck && slotCheck.status === 'failed') {
    const fixResult = autoTagMissingSlots(writtenPages);
    if (fixResult.totalFixed > 0) {
      ws.send(JSON.stringify({ type: 'status', content: `Auto-tagged ${fixResult.totalFixed} image(s) with slot attributes` }));
      // Re-register slots so media_specs picks up the new ones
      extractAndRegisterSlots(writtenPages);
      // Re-verify for accurate final result
      verification = runBuildVerification(writtenPages);
    }
  }

  // Save verification result AFTER conditional fix
  try {
    const vSpec = readSpec();
    vSpec.last_verification = verification;
    writeSpec(vSpec);
  } catch {}
  ws.send(JSON.stringify({ type: 'verification-result', ...verification }));

  // Notify chat only on failures
  if (verification.status === 'failed') {
    const issueCount = verification.issues.length;
    ws.send(JSON.stringify({ type: 'verification-warning', content: `Build complete — ${issueCount} verification issue${issueCount !== 1 ? 's' : ''} found. Check the Verify tab for details.` }));
  }

  const msg = `Site built! ${writtenPages.length} pages in ${elapsed}s: ${writtenPages.join(', ')}`;
  ws.send(JSON.stringify({ type: 'assistant', content: msg }));
  ws.send(JSON.stringify({ type: 'reload-preview' }));
  ws.send(JSON.stringify({ type: 'pages-updated', pages: writtenPages }));
  appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() });
  saveStudio();

  // Auto-create site repo on first successful build
  const currentSpec = readSpec();
  if (!currentSpec.site_repo?.path) {
    ws.send(JSON.stringify({ type: 'status', content: 'Creating site repo...' }));
    createSiteRepo(ws);
  }
}

// --- Deterministic Handlers (no AI needed) ---
// Simple CSS/HTML changes that can be executed directly without calling Claude.
// Returns true if handled, false if Claude should take over.
function tryDeterministicHandler(ws, userMessage, currentPage) {
  const lower = userMessage.toLowerCase();
  const cssPath = path.join(DIST_DIR(), 'assets', 'styles.css');
  if (!fs.existsSync(cssPath)) return false;
  let css = fs.readFileSync(cssPath, 'utf8');
  let handled = false;
  let description = '';

  // --- Spacing changes ---
  const spacingMatch = lower.match(/\b(?:add|increase|more)\s+(?:some\s+)?(?:space|spacing|gap|margin|padding)\s+(?:above|before|below|after|between)?\s*(?:the\s+)?(footer|header|nav|sections?|hero)/);
  if (spacingMatch) {
    const target = spacingMatch[1];
    const sizeMatch = lower.match(/(\d+)\s*(?:px|rem)/);
    const size = sizeMatch ? sizeMatch[0] : '2rem';

    if (target === 'footer') {
      const existingRule = css.match(/footer\s*\{\s*margin-top\s*:\s*([^;]+);/);
      if (existingRule) {
        css = css.replace(/footer\s*\{\s*margin-top\s*:\s*[^;]+;/, `footer { margin-top: ${size};`);
        description = `Updated footer margin-top to ${size} (was ${existingRule[1].trim()})`;
      } else {
        css = css.replace('/* END STUDIO LAYOUT FOUNDATION */', `/* Footer spacing */\nfooter { margin-top: ${size}; }\n\n/* END STUDIO LAYOUT FOUNDATION */`);
        description = `Added ${size} margin-top to footer`;
      }
      handled = true;
    } else if (target === 'header' || target === 'nav') {
      const existingRule = css.match(/header\s*\{\s*margin-bottom\s*:\s*([^;]+);/);
      if (existingRule) {
        css = css.replace(/header\s*\{\s*margin-bottom\s*:\s*[^;]+;/, `header { margin-bottom: ${size};`);
        description = `Updated header margin-bottom to ${size} (was ${existingRule[1].trim()})`;
      } else {
        css = css.replace('/* END STUDIO LAYOUT FOUNDATION */', `/* Header spacing */\nheader { margin-bottom: ${size}; }\n\n/* END STUDIO LAYOUT FOUNDATION */`);
        description = `Added ${size} margin-bottom to header`;
      }
      handled = true;
    } else if (target.startsWith('section')) {
      const existingRule = css.match(/main\s*>\s*section\s*\{\s*margin-bottom\s*:\s*([^;]+);/);
      if (existingRule) {
        css = css.replace(/main\s*>\s*section\s*\{\s*margin-bottom\s*:\s*[^;]+;/, `main > section { margin-bottom: ${size};`);
        description = `Updated section margin-bottom to ${size} (was ${existingRule[1].trim()})`;
      } else {
        css = css.replace('/* END STUDIO LAYOUT FOUNDATION */', `/* Section spacing */\nmain > section { margin-bottom: ${size}; }\nmain > section:last-child { margin-bottom: 0; }\n\n/* END STUDIO LAYOUT FOUNDATION */`);
        description = `Added ${size} margin-bottom between sections`;
      }
      handled = true;
    }
  }

  // --- Color changes ---
  const colorMatch = lower.match(/\b(?:change|set|make|update)\s+(?:the\s+)?(?:primary|accent|background)\s+colou?r\s+(?:to\s+)?([#\w]+)/);
  if (!handled && colorMatch) {
    const newColor = colorMatch[1];
    // Map user intent to CSS variable — check what actually exists in the CSS
    let varName = lower.includes('accent') ? '--color-accent' : lower.includes('background') ? '--color-bg' : '--color-primary';
    // Try exact match first, then common variants
    let varRegex = new RegExp(`(${varName.replace(/[-]/g, '\\-')}\\s*:\\s*)([^;]+)(;)`);
    if (!varRegex.test(css) && varName === '--color-bg') {
      // Fallback: try --color-bg-light which is common in generated sites
      varName = '--color-bg-light';
      varRegex = new RegExp(`(${varName.replace(/[-]/g, '\\-')}\\s*:\\s*)([^;]+)(;)`);
    }
    if (varRegex.test(css)) {
      css = css.replace(varRegex, `$1${newColor}$3`);
      description = `Changed ${varName} to ${newColor}`;
      handled = true;
    }
  }

  // --- Font size changes ---
  const fontSizeMatch = lower.match(/\bfont[\s-]+size\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(px|rem|em)/) ||
    lower.match(/\b(?:make|change|set|update)\s+(?:the\s+)?(?:body\s+|text\s+)?font\s+size\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*(px|rem|em)/) ||
    lower.match(/\b(?:text|font)\s+(?:size\s+)?(?:to\s+)?(\d+(?:\.\d+)?)\s*(px|rem|em)/);
  if (!handled && fontSizeMatch) {
    const size = `${fontSizeMatch[1]}${fontSizeMatch[2]}`;
    if (css.includes('body {')) {
      css = css.replace(/(body\s*\{[^}]*)(font-size\s*:[^;]+;)/, `$1font-size: ${size};`);
    } else {
      css = css.replace('/* END STUDIO LAYOUT FOUNDATION */', `body { font-size: ${size}; }\n\n/* END STUDIO LAYOUT FOUNDATION */`);
    }
    description = `Changed body font-size to ${size}`;
    handled = true;
  }

  // --- Simple text replacement in HTML ---
  // Match against lowered but extract values from ORIGINAL message to preserve case
  const textMatchLower = lower.match(/\b(?:change|update|replace)\s+(?:the\s+)?(?:heading|title|button\s+text|text)\s+(?:from\s+)?["']([^"']+)["']\s+(?:to|with)\s+["']([^"']+)["']/) ||
    lower.match(/\breplace\s+["']([^"']+)["']\s+(?:to|with)\s+["']([^"']+)["']/);
  if (!handled && textMatchLower) {
    // Re-extract from original message to preserve case
    const origMatch = userMessage.match(/["']([^"']+)["']\s+(?:to|with)\s+["']([^"']+)["']/);
    const oldText = origMatch ? origMatch[1] : textMatchLower[1];
    const newText = origMatch ? origMatch[2] : textMatchLower[2];
    const pagePath = path.join(DIST_DIR(), currentPage);
    if (fs.existsSync(pagePath)) {
      let html = fs.readFileSync(pagePath, 'utf8');
      // Try exact match first, then case-insensitive
      if (html.includes(oldText)) {
        html = html.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newText);
        fs.writeFileSync(pagePath, html);
        description = `Replaced "${oldText}" with "${newText}" on ${currentPage}`;
        handled = true;
      } else {
        // Case-insensitive fallback
        const ciRegex = new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        if (ciRegex.test(html)) {
          html = html.replace(ciRegex, newText);
          fs.writeFileSync(pagePath, html);
          description = `Replaced "${oldText}" with "${newText}" on ${currentPage} (case-insensitive)`;
          handled = true;
        } else {
          // Text not found — respond directly instead of falling through to Claude
          ws.send(JSON.stringify({ type: 'assistant', content: `Could not find "${oldText}" on ${currentPage}. The text may have already been changed, or it might be on a different page.` }));
          appendConvo({ role: 'assistant', content: `Text "${oldText}" not found on ${currentPage}`, at: new Date().toISOString() });
          return true; // handled — don't fall through to Claude
        }
      }
    }
  }

  if (handled) {
    if (description && !description.includes('Replaced')) {
      // CSS change — write it back
      fs.writeFileSync(cssPath, css);
    }
    ws.send(JSON.stringify({ type: 'assistant', content: `**Direct edit applied:** ${description}\n\nNo AI call needed — this was a deterministic CSS/HTML change.` }));
    ws.send(JSON.stringify({ type: 'reload-preview' }));
    appendConvo({ role: 'assistant', content: `Direct edit: ${description}`, at: new Date().toISOString() });
    saveStudio();
    console.log(`[deterministic] ${description}`);
    return true;
  }

  return false;
}

// --- Enhanced Chat Handler ---
function handleChatMessage(ws, userMessage, requestType, spec) {
  // Concurrent build guard — prevent parallel Claude calls
  if (buildInProgress) {
    ws.send(JSON.stringify({ type: 'chat', content: 'A build is already in progress. Please wait for it to finish before sending another request.' }));
    return;
  }

  // Try deterministic handler first — simple CSS/HTML changes without AI
  if (requestType === 'layout_update' || requestType === 'content_update' || requestType === 'bug_fix') {
    if (tryDeterministicHandler(ws, userMessage, currentPage)) {
      return; // Handled without Claude
    }
  }

  buildInProgress = true;

  ws.send(JSON.stringify({ type: 'status', content: 'Reading site spec...' }));

  const prevPage = currentPage;
  const { htmlContext, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, conversationHistory, blueprintContext, slotMappingContext, templateContext, resolvedPage } = buildPromptContext(requestType, spec, userMessage);

  // If buildPromptContext resolved a different page, update currentPage explicitly here
  if (resolvedPage !== prevPage) {
    currentPage = resolvedPage;
    ws.send(JSON.stringify({ type: 'page-changed', page: currentPage }));
    ws.send(JSON.stringify({ type: 'status', content: `Auto-switched to ${currentPage} (referenced in your message)` }));
  }

  ws.send(JSON.stringify({ type: 'status', content: `Classified as: ${requestType}` }));

  // Build mode-specific prompt
  let modeInstruction = '';
  const pages = listPages();
  const specPages = spec.pages || spec.design_brief?.must_have_sections || ['home'];
  const isMultiPage = specPages.length > 1 || (specPages.length === 1 && specPages[0] !== 'home');

  // Analytics snippet injection (before switch so parallel build can use it)
  const settings = loadSettings();
  let analyticsInstruction = '';
  if (settings.analytics_provider && settings.analytics_id) {
    if (settings.analytics_provider === 'ga4') {
      analyticsInstruction = `\nANALYTICS:\nInclude Google Analytics (GA4) in the <head> of every page:\n<script async src="https://www.googletagmanager.com/gtag/js?id=${settings.analytics_id}"></script>\n<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${settings.analytics_id}');</script>\n`;
    } else if (settings.analytics_provider === 'plausible') {
      analyticsInstruction = `\nANALYTICS:\nInclude Plausible Analytics in the <head> of every page:\n<script defer data-domain="${settings.analytics_id}" src="https://plausible.io/js/script.js"></script>\n`;
    }
  }

  switch (requestType) {
    case 'content_update':
      modeInstruction = `The user wants to change TEXT CONTENT only on ${currentPage}. Preserve all layout, styling, and structure. Only modify the specific text they mentioned.`;
      break;
    case 'layout_update':
      modeInstruction = `The user wants to change LAYOUT or add/remove SECTIONS on ${currentPage}. Preserve the overall design language and approved decisions. Make targeted structural changes.`;
      break;
    case 'bug_fix':
      modeInstruction = `The user is reporting a BUG or visual issue on ${currentPage}. Fix only the specific problem. Do not change design direction or content.`;
      break;
    // Note: 'restyle' is routed to handlePlanning() by the WS router upstream — it never reaches handleChatMessage
    case 'build':
      if (isMultiPage) {
        // Parallel build — handled separately
        ws.send(JSON.stringify({ type: 'status', content: `Parallel build: ${specPages.length} pages...` }));
        // Don't reset buildInProgress here — parallelBuild() already has it set to true
        // and will reset it when all pages complete. Resetting creates a race window.
        return parallelBuild(ws, spec, specPages, userMessage, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, conversationHistory, analyticsInstruction, slotMappingContext);
      } else {
        modeInstruction = 'Generate a complete single-page website.';
      }
      break;
    default:
      modeInstruction = 'Process the user request and update the site accordingly.';
  }

  // Detect logo for main prompt
  const _logoSvg = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo.svg'));
  const _logoPng = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo.png'));
  const _logoFile = _logoSvg ? 'assets/logo.svg' : _logoPng ? 'assets/logo.png' : null;
  const _logoInstruction = _logoFile
    ? `\nLOGO: A logo file exists at "${_logoFile}". Use <a href="index.html" data-logo-v class="block"><img src="${_logoFile}" alt="${spec.site_name || 'Logo'}" class="h-10 w-auto"></a> for the logo. Do NOT show site name text next to the logo image.\n`
    : `\nLOGO: No logo image file exists. Use <a href="index.html" data-logo-v class="font-playfair text-2xl font-bold text-inherit hover:opacity-80 transition">${spec.site_name || ''}</a> as the logo. This element will automatically swap to an image when a logo is uploaded.\n`;

  // Slot ID stability — inject current page's slot IDs to prevent drift on rebuilds
  const _currentPageSlots = (spec.media_specs || []).filter(s => s.page === currentPage);
  const _slotStabilityInstruction = _currentPageSlots.length > 0
    ? `\nSLOT ID PRESERVATION (CRITICAL): This page has existing image slot assignments. You MUST preserve these exact slot IDs — do not rename, renumber, or remove them:\n${_currentPageSlots.map(s => `  ${s.slot_id} (${s.role})`).join('\n')}\nOnly create NEW slot IDs for genuinely new images added in this edit.\n`
    : '';

  const prompt = `You are a premium website builder assistant for FAMtastic Site Studio.
You have NO tools and NO file access. Everything you need is provided below — the current page HTML, the design brief, assets, and conversation history. Do NOT ask to read files, request permissions, or say you need access. Just use what's here and respond with the updated HTML.

IMPORTANT — YOU ONLY SEE ONE PAGE AT A TIME. The system manages cross-page consistency automatically:
- After you output HTML, a post-processing pipeline syncs nav, footer, head section, and CSS across ALL pages.
- If the user asks for changes across all pages (nav width, footer update, etc.), just make the change on THIS page. The system will propagate it to every other page automatically via syncNavPartial, syncFooterPartial, and syncHeadSection.
- NEVER ask the user to provide other pages' HTML. NEVER say "I only have one page." Just fix the page you have — the rest is handled.

${systemRules}

REQUEST TYPE: ${requestType}
MODE: ${modeInstruction}
${_logoInstruction}
${_slotStabilityInstruction}
${briefContext}
${decisionsContext}
${assetsContext}
${sessionContext}
${conversationHistory}
${blueprintContext}
${slotMappingContext}
${templateContext || ''}

SITE SPEC:
${JSON.stringify({ site_name: spec.site_name, business_type: spec.business_type, colors: spec.colors, tone: spec.tone, fonts: spec.fonts }, null, 2)}

CURRENT PAGE HTML (this is the full source — do NOT ask to read files, you already have the content):
${htmlContext}

USER REQUEST: "${userMessage}"

BEFORE YOU RESPOND — SEO CHECKLIST (verify every page you output has ALL of these):
□ <html lang="en">
□ <title>Page Name | ${spec.site_name || 'Business Name'}</title>
□ <meta name="description" content="..."> (unique, 150-160 chars)
□ <meta name="keywords" content="..."> (5-10 terms)
□ <meta property="og:title" content="...">
□ <meta property="og:description" content="...">
□ <meta property="og:type" content="website">
□ <meta name="robots" content="index, follow">
If any are missing from the current HTML, ADD them. Never remove existing meta tags.

RESPOND WITH ONE OF THESE FORMATS:

1. To UPDATE a SINGLE page:
First line: HTML_UPDATE:
Then: the complete updated HTML file
Then on a new line: CHANGES:
Then: 2-4 bullet points explaining what changed and why

2. To CREATE MULTIPLE pages (for build/new site only):
First line must be exactly: MULTI_UPDATE:
Then each page separated by delimiter lines:
--- PAGE: index.html ---
(COMPLETE HTML document from <!DOCTYPE html> to </html>)
--- PAGE: about.html ---
(COMPLETE HTML document from <!DOCTYPE html> to </html>)
After ALL pages, on its own line: CHANGES:
Then: 2-4 bullet points

CRITICAL: Every page between delimiters MUST contain a full, complete HTML document with real content. Do NOT output empty pages.

3. To CREATE an SVG asset:
First line: SVG_ASSET:<filename>
Then: complete SVG code

4. To ask a question or respond conversationally:
Just respond as text. Use this ONLY when genuinely ambiguous. If the user asked for a change, DO the change — output HTML_UPDATE with the full updated page. Do NOT describe what you would do, ask for confirmation, or explain your plan. Act.

IMPORTANT:
- When outputting HTML, include the FULL complete file (not a diff)
- Use Tailwind CSS via CDN
- Keep it responsive and modern
- The CHANGES summary is required after every HTML_UPDATE or MULTI_UPDATE
- For multi-page sites: every page must have the SAME nav bar, footer, Tailwind config, and fonts
- Nav links must be real file links (about.html) NOT anchors (#about)

CSS THEMING (REQUIRED):
- Define brand colors as CSS custom properties in a <style> block inside <head>:
  :root { --color-primary: ${spec.colors?.primary || '#1a5c2e'}; --color-accent: ${spec.colors?.accent || '#d4a843'}; --color-bg: ${spec.colors?.bg || '#f0f4f0'}; }
- Use these variables throughout: style="color: var(--color-primary)" or in Tailwind arbitrary values like text-[var(--color-primary)]
- This enables one-place color changes across the entire site
- Also define font families if specified: :root { --font-heading: ...; --font-body: ...; }

LOGO RULE (CRITICAL):
- The logo anchor MUST have data-logo-v attribute — this enables automatic logo swapping
- If a logo file exists: use <a href="index.html" data-logo-v class="block"><img src="..." class="h-10 w-auto"></a>
- If no logo file: use <a href="index.html" data-logo-v class="font-playfair text-2xl font-bold text-inherit hover:opacity-80 transition">Site Name</a>
- NEVER show both a logo image AND logo text — pick one
- NEVER use a placeholder image for the logo — logos are either a real file or styled text, nothing else
- Do NOT create an image slot (data-slot-id) for the logo — the logo is handled via data-logo-v

IMAGE SLOTS (CRITICAL):
Every <img> tag MUST have these three data attributes:
- data-slot-id: unique role-based ID derived from context (e.g. "hero-1", "testimonial-1", "testimonial-2", "service-mowing", "team-1", "gallery-1")
- data-slot-status="empty" (always "empty" on initial generation)
- data-slot-role: semantic purpose — one of: hero, testimonial, team, service, gallery, favicon
- src must be "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" (transparent 1x1 pixel)
- Do NOT use Unsplash URLs, placeholder.com, or any external image URLs
- Do NOT use fake filenames like "hero.jpg" — always use the transparent data URI
- Each slot ID must be unique across the entire page
- For repeating elements (testimonials, gallery items, team members), number them: testimonial-1, testimonial-2, etc.
- For service-specific images, use descriptive slugs: service-mowing, service-landscaping

FORMS:
- If the site needs a contact form, booking form, or inquiry form, use Netlify Forms:
  <form name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field">
    <input type="hidden" name="form-name" value="contact">
    <p class="hidden"><label>Don't fill this out: <input name="bot-field"></label></p>
    <!-- form fields here -->
  </form>
- Always include: name, email, message fields at minimum
- Add a hidden honeypot field for spam protection
- Style the submit button to match the site's design
- For static sites this works out of the box on Netlify — no backend code needed
${analyticsInstruction}`;

  // Context-aware pre-build status
  const pagesList = spec.pages || spec.design_brief?.must_have_sections || ['index.html'];
  if (requestType === 'build' && pagesList.length > 1) {
    ws.send(JSON.stringify({ type: 'status', content: `Building ${pagesList.length}-page site...` }));
  } else if (requestType === 'build') {
    ws.send(JSON.stringify({ type: 'status', content: 'Building site...' }));
  } else {
    ws.send(JSON.stringify({ type: 'status', content: 'Sending to Claude...' }));
  }

  const buildStartTime = Date.now();
  const currentModel = loadSettings().model || 'claude-sonnet-4-5';
  let child = spawnClaude(prompt);
  ws.currentChild = child;
  let retriedWithHaiku = false;

  // 30s silence timeout — if no output arrives, fall back to Haiku
  let silenceTimeout = null;
  function resetSilenceTimeout() {
    if (silenceTimeout) clearTimeout(silenceTimeout);
    if (retriedWithHaiku) return; // don't retry twice
    silenceTimeout = setTimeout(() => {
      // Only retry if we got zero output (subscription concurrency issue)
      if (response.length === 0 && !retriedWithHaiku && currentModel !== 'claude-haiku-4-5-20251001') {
        console.warn('[claude] No output after 30s — falling back to Haiku');
        retriedWithHaiku = true;
        child.kill();
        try { ws.send(JSON.stringify({ type: 'status', content: 'Sonnet busy — retrying with Haiku...' })); } catch {}

        // Respawn with Haiku
        const env = { ...process.env };
        for (const key of Object.keys(env)) { if (key.startsWith('CLAUDE_') || key === 'CLAUDECODE') delete env[key]; }
        const claudeBin = process.env.CLAUDE_BIN || 'claude';
        child = spawn(claudeBin, ['--print', '--model', 'claude-haiku-4-5-20251001', '--tools', ''], {
          env, cwd: require('os').tmpdir(), stdio: ['pipe', 'pipe', 'pipe'],
        });
        ws.currentChild = child;
        child.stdin.write(prompt);
        child.stdin.end();
        response = '';
        firstChunk = true;

        child.stdout.on('data', (chunk) => {
          response += chunk.toString();
          if (firstChunk) {
            ws.send(JSON.stringify({ type: 'status', content: 'Haiku is generating...' }));
            firstChunk = false;
          }
        });
        child.on('close', onChildClose);
        child.on('error', (err) => {
          console.error('[claude-haiku-fallback] Error:', err.message);
          buildInProgress = false;
        });
      }
    }, 30000);
  }
  resetSilenceTimeout();

  // 5-minute hard timeout — kill even Haiku if it hangs
  const buildTimeout = setTimeout(() => {
    console.error('[claude] Build timed out after 5 minutes, killing process');
    child.kill();
    buildInProgress = false;
    if (silenceTimeout) clearTimeout(silenceTimeout);
    try { ws.send(JSON.stringify({ type: 'error', content: 'Build timed out after 5 minutes. The Claude CLI may be unresponsive. Try again or check your network.' })); } catch {}
  }, 300000);

  let response = '';
  let firstChunk = true;
  let pagesDetected = 0;

  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
    resetSilenceTimeout(); // got output, reset silence timer
    if (firstChunk) {
      ws.send(JSON.stringify({ type: 'status', content: 'Claude is generating...' }));
      firstChunk = false;
    }

    // Detect page delimiters in stream for real-time progress
    const pageMatches = response.match(/^---\s*PAGE:\s*(\S+)\s*---\s*$/gm);
    if (pageMatches && pageMatches.length > pagesDetected) {
      const newPage = pageMatches[pageMatches.length - 1].match(/PAGE:\s*(\S+)/)[1];
      pagesDetected = pageMatches.length;
      ws.send(JSON.stringify({
        type: 'status',
        content: `Generating page ${pagesDetected}: ${newPage}...`
      }));
    }

    ws.send(JSON.stringify({ type: 'stream', content: chunk.toString() }));
  });

  let stderrOutput = '';
  child.stderr.on('data', (chunk) => {
    stderrOutput += chunk.toString();
    console.error('[claude]', chunk.toString());
  });

  function onChildClose(code) {
    clearTimeout(buildTimeout);
    if (silenceTimeout) clearTimeout(silenceTimeout);
    buildInProgress = false;
    ws.currentChild = null;

    if (code !== 0 || !response.trim()) {
      console.error(`[claude] Build failed — exit code: ${code}, response length: ${response.length}, stderr: ${stderrOutput.substring(0, 500)}`);
      const fallback = "I couldn't process that request right now. Try being more specific about what you'd like to change, or say 'build the site' to regenerate.";
      ws.send(JSON.stringify({ type: 'assistant', content: fallback }));
      appendConvo({ role: 'assistant', content: fallback, at: new Date().toISOString() });
      return;
    }

    response = response.trim();

    // Detect multi-page output — either explicit MULTI_UPDATE prefix or PAGE delimiters anywhere
    const hasMultiPrefix = response.startsWith('MULTI_UPDATE:');
    const hasPageDelimiters = /^---\s*PAGE:\s*\S+\s*---\s*$/m.test(response);

    if (hasMultiPrefix || hasPageDelimiters) {
      ws.send(JSON.stringify({ type: 'status', content: 'Writing multiple pages...' }));

      // Strip MULTI_UPDATE prefix if present, also strip any preamble before first PAGE delimiter
      let body = hasMultiPrefix ? response.replace(/^MULTI_UPDATE:\s*/, '') : response;

      // Extract CHANGES summary from end
      let changeSummary = '';
      const changesIdx = body.lastIndexOf('CHANGES:');
      if (changesIdx !== -1) {
        // Only treat as CHANGES if it's after the last PAGE content
        const afterChanges = body.substring(changesIdx + 8).trim();
        if (afterChanges.includes('-') || afterChanges.includes('*')) {
          changeSummary = afterChanges;
          body = body.substring(0, changesIdx).trim();
        }
      }

      // Parse pages by --- PAGE: filename.html --- delimiter
      fs.mkdirSync(DIST_DIR(), { recursive: true });
      const pageParts = body.split(/^---\s*PAGE:\s*(\S+)\s*---\s*$/m);
      const writtenPages = [];
      const totalPages = Math.floor((pageParts.length - 1) / 2);
      for (let i = 1; i < pageParts.length; i += 2) {
        const filename = pageParts[i].trim();
        let html = (pageParts[i + 1] || '').trim();
        // Strip markdown fences wrapping individual pages
        html = html.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');
        if (filename && html.length > 20) {
          const pageNum = Math.ceil(i / 2);
          ws.send(JSON.stringify({ type: 'status', content: `Writing ${filename} (${pageNum} of ${totalPages})...` }));
          versionFile(filename, requestType);
          fs.writeFileSync(path.join(DIST_DIR(), filename), html);
          writtenPages.push(filename);
          console.log(`[multi-page] Wrote: ${filename} (${html.length} bytes)`);
        } else if (filename) {
          console.warn(`[multi-page] WARN: ${filename} was empty or too small (${html.length} bytes), skipped`);
        }
      }

      if (changeSummary) {
        ws.send(JSON.stringify({ type: 'status', content: 'Extracting design decisions...' }));
        extractDecisions(spec, changeSummary, requestType);
      }

      if (writtenPages.length > 0) {
        // Unified post-processing
        ws.send(JSON.stringify({ type: 'status', content: 'Post-processing...' }));
        runPostProcessing(ws, writtenPages, { isFullBuild: true });
        const slotMsg = '';

        const msg = changeSummary
          ? `Site built! ${writtenPages.length} pages created: ${writtenPages.join(', ')}\n\n${changeSummary}${slotMsg}`
          : `Site built! ${writtenPages.length} pages created: ${writtenPages.join(', ')}${slotMsg}`;
        ws.send(JSON.stringify({ type: 'assistant', content: msg }));
        ws.send(JSON.stringify({ type: 'reload-preview' }));
        ws.send(JSON.stringify({ type: 'pages-updated', pages: writtenPages }));
        appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() });
      } else {
        // Parsing failed — fall back to treating as single-page HTML_UPDATE
        console.warn('[multi-page] No pages parsed from response, falling back to single-page');
        const html = body.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');
        if (html.length > 20) {
          fs.writeFileSync(path.join(DIST_DIR(), 'index.html'), html);
          // Run post-processing even on fallback path
          runPostProcessing(ws, ['index.html'], { sourcePage: 'index.html' });
          ws.send(JSON.stringify({ type: 'assistant', content: 'Site updated! Check the preview.' }));
          ws.send(JSON.stringify({ type: 'reload-preview' }));
          appendConvo({ role: 'assistant', content: 'Site updated (single page fallback)', at: new Date().toISOString() });
        } else {
          ws.send(JSON.stringify({ type: 'error', content: 'Build produced empty output. Try again or be more specific.' }));
        }
      }
      saveStudio();
    } else if (response.startsWith('HTML_UPDATE:')) {
      ws.send(JSON.stringify({ type: 'status', content: `Writing updated ${currentPage}...` }));

      // Split HTML and change summary
      const afterPrefix = response.replace(/^HTML_UPDATE:\s*/, '');
      let html = afterPrefix;
      let changeSummary = '';

      const changesIdx = afterPrefix.lastIndexOf('CHANGES:');
      if (changesIdx !== -1) {
        html = afterPrefix.substring(0, changesIdx).trim();
        changeSummary = afterPrefix.substring(changesIdx + 8).trim();
      }

      // Strip markdown fences if present
      html = html.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');

      fs.mkdirSync(DIST_DIR(), { recursive: true });
      versionFile(currentPage, requestType);
      fs.writeFileSync(path.join(DIST_DIR(), currentPage), html);

      // Unified post-processing — single-page edit mode
      runPostProcessing(ws, [currentPage], { sourcePage: currentPage });

      // Auto-tag any images missing slot attributes (dynamic CRUD)
      autoTagMissingSlots([currentPage]);

      // Extract and log design decisions from change summary
      if (changeSummary) {
        ws.send(JSON.stringify({ type: 'status', content: 'Extracting design decisions...' }));
        extractDecisions(spec, changeSummary, requestType);
      }

      const buildElapsed = Math.round((Date.now() - buildStartTime) / 1000);
      // Save build metrics
      try {
        const metricsFile = path.join(SITE_DIR(), 'build-metrics.jsonl');
        fs.appendFileSync(metricsFile, JSON.stringify({
          timestamp: new Date().toISOString(),
          type: requestType,
          elapsed_seconds: buildElapsed,
          pages_built: 1,
          pages: [currentPage],
          model: loadSettings().model || 'unknown'
        }) + '\n');
      } catch {}

      const msg = changeSummary
        ? `${currentPage} updated! (${buildElapsed}s)\n\n${changeSummary}`
        : `${currentPage} updated! (${buildElapsed}s) Check the preview.`;
      ws.send(JSON.stringify({ type: 'assistant', content: msg }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() });
      saveStudio();
    } else if (response.startsWith('SVG_ASSET:')) {
      const firstNewline = response.indexOf('\n');
      const header = response.substring(0, firstNewline);
      const filename = header.replace('SVG_ASSET:', '').trim();
      let svg = response.substring(firstNewline + 1);
      // Strip markdown fences if present
      svg = svg.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```\s*$/, '');

      const assetPath = path.join(DIST_DIR(), 'assets', filename);
      fs.mkdirSync(path.join(DIST_DIR(), 'assets'), { recursive: true });
      fs.writeFileSync(assetPath, svg);
      ws.send(JSON.stringify({ type: 'assistant', content: `Created asset: ${filename}` }));
      ws.send(JSON.stringify({ type: 'asset-created', filename, path: `/assets/${filename}` }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: `Created SVG asset: ${filename}`, at: new Date().toISOString() });
    } else {
      ws.send(JSON.stringify({ type: 'assistant', content: response }));
      appendConvo({ role: 'assistant', content: response, at: new Date().toISOString() });
    }
  }
  child.on('close', onChildClose);
}

// --- Design Decisions Extraction ---
function extractDecisions(spec, changeSummary, requestType) {
  // Only log durable decisions from restyle, layout_update, and build
  if (!['restyle', 'layout_update', 'build', 'major_revision'].includes(requestType)) return;

  const currentSpec = readSpec();
  if (!currentSpec.design_decisions) currentSpec.design_decisions = [];

  // Parse bullet points from change summary as potential decisions
  const bullets = changeSummary.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('*'));
  const ts = new Date().toISOString();

  for (const bullet of bullets.slice(0, 3)) {
    const text = bullet.replace(/^[\s\-*]+/, '').trim();
    if (text.length < 10 || text.length > 200) continue;

    // Categorize based on keywords
    let category = 'structure';
    if (text.match(/\b(color|palette|accent|gradient|contrast)\b/i)) category = 'color';
    else if (text.match(/\b(font|typography|heading|text\s+size|weight)\b/i)) category = 'typography';
    else if (text.match(/\b(layout|grid|column|row|spacing|margin|padding|flex)\b/i)) category = 'layout';
    else if (text.match(/\b(copy|text|content|heading|title|description)\b/i)) category = 'content';
    else if (text.match(/\b(animation|transition|hover|motion|scroll)\b/i)) category = 'interaction';

    currentSpec.design_decisions.push({
      timestamp: ts,
      category,
      decision: text,
      status: 'approved',
    });
  }

  // Prune: keep last 20 approved + all superseded in file, but only show 10 active
  writeSpec(currentSpec);
}

// --- HTTP + WebSocket server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let activeClientCount = 0;

wss.on('connection', (ws) => {
  currentMode = 'build'; // reset ephemeral session state — must not survive reconnects
  activeClientCount++;
  console.log(`[studio] Client connected (${activeClientCount} active)`);

  // Send persistence state on connect
  const studioState = loadStudio();
  const pages = listPages();
  if (studioState && studioState.session_count > 0) {
    const spec = readSpec();
    const briefStatus = spec.design_brief?.approved ? 'approved' : (spec.design_brief ? 'draft' : 'none');
    let welcomeMsg = `Welcome back! Session #${studioState.session_count + 1} for ${TAG}.`;
    if (pages.length > 1) {
      welcomeMsg += `\nPages: ${pages.join(', ')} (viewing: ${currentPage})`;
    }
    if (briefStatus !== 'none') {
      welcomeMsg += `\nDesign brief: ${briefStatus}`;
    }
    ws.send(JSON.stringify({ type: 'assistant', content: welcomeMsg }));
    ws.send(JSON.stringify({ type: 'pages-updated', pages, currentPage }));
  }

  // Only start a new session if this is the first active connection
  // (prevents second tabs from resetting session counters)
  if (activeClientCount === 1) {
    startSession();
  }

  ws.on('close', async () => {
    activeClientCount = Math.max(0, activeClientCount - 1);
    console.log(`[studio] Client disconnected (${activeClientCount} active)`);
    // Kill any in-flight Claude subprocess to prevent zombie processes
    if (ws.currentChild) {
      try { ws.currentChild.kill(); } catch {}
      ws.currentChild = null;
    }
    if (ws.activeChildren && ws.activeChildren.length > 0) {
      for (const c of ws.activeChildren) { try { c.kill(); } catch {} }
      ws.activeChildren = [];
    }
    // Reset build lock if client disconnects mid-build to prevent permanent deadlock
    if (buildInProgress) {
      console.warn('[studio] Client disconnected during build — releasing buildInProgress lock');
      buildInProgress = false;
    }
    await endSession(ws);
  });

  ws.on('message', async (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    try {

    if (msg.type === 'chat') {
      const userMessage = msg.content;

      // Guard: reject oversized inputs before any processing or logging
      if (typeof userMessage !== 'string' || userMessage.length > 10000) {
        try { ws.send(JSON.stringify({ type: 'error', content: 'Message too long — please keep inputs under 10,000 characters.' })); } catch {}
        return;
      }

      const ts = new Date().toISOString();
      sessionMessageCount++;

      // Log user message
      appendConvo({ role: 'user', content: userMessage, at: ts });

      // Load spec
      const spec = readSpec();

      // Check persistent brainstorm mode before classifying
      if (currentMode === 'brainstorm') {
        const lower = userMessage.toLowerCase();
        // "Build this" patterns — exit brainstorm AND route into build with brainstorm context
        const buildPatterns = /\b(i'?m\s+ready\s+to\s+build|let'?s?\s+(implement|build|do\s+it|make\s+it|go)|build\s+this|start\s+building|do\s+it|ship\s+it|create\s+it|make\s+this\s+happen|looks?\s+good,?\s+build|i'?m\s+happy\s+with\s+this|ok\s+let'?s?\s+go)\b/;
        // "Exit only" patterns — just leave brainstorm, no build
        const exitPatterns = /\b(exit\s+brainstorm|done\s+brainstorming|stop\s+brainstorming|back\s+to\s+build|build\s+mode)\b/;

        if (buildPatterns.test(lower)) {
          // Exit brainstorm and route brainstorm ideas into build
          currentMode = 'build';
          console.log(`[mode] Exited brainstorm → building from brainstorm context`);
          ws.send(JSON.stringify({ type: 'mode-changed', mode: 'build' }));

          // Gather recent brainstorm messages as build context
          let brainstormContext = '';
          try {
            const lines = fs.readFileSync(CONVO_FILE(), 'utf8').trim().split('\n').filter(Boolean);
            const brainstormMsgs = [];
            // Walk backwards to find the brainstorm conversation
            for (let i = lines.length - 1; i >= 0 && brainstormMsgs.length < 20; i--) {
              const entry = JSON.parse(lines[i]);
              if (entry.intent === 'brainstorm' || (entry.role === 'user' && brainstormMsgs.length > 0)) {
                brainstormMsgs.unshift(entry);
              } else if (brainstormMsgs.length > 0) {
                break; // Hit non-brainstorm content, stop
              }
            }
            if (brainstormMsgs.length > 0) {
              brainstormContext = brainstormMsgs.map(m => `${m.role}: ${m.content}`).join('\n');
            }
          } catch {}

          // Detect target page from brainstorm context
          if (brainstormContext) {
            const contextLower = brainstormContext.toLowerCase();
            const pages = listPages();
            // Check for page references like "home page", "about page", "contact page"
            const pageRef = contextLower.match(/\b(home|index|about|contact|gallery|services|testimonials|why.choose.us|faq|pricing|blog)\s*page\b/);
            if (pageRef) {
              let targetName = pageRef[1].toLowerCase().replace(/\s+/g, '-');
              if (targetName === 'home') targetName = 'index';
              const targetPage = pages.find(p => p.replace('.html', '') === targetName);
              if (targetPage && targetPage !== currentPage) {
                currentPage = targetPage;
                console.log(`[mode] Brainstorm-to-build: switched to ${currentPage}`);
                ws.send(JSON.stringify({ type: 'page-changed', page: currentPage }));
              }
            }
          }

          // Write brainstorm ideas into blueprint before building
          if (brainstormContext) {
            const bp = readBlueprint() || { version: 1, pages: {}, global: {}, last_updated: null };
            if (!bp.pages[currentPage]) bp.pages[currentPage] = { title: currentPage.replace('.html', ''), sections: [], components: [], layout_notes: [] };
            const entry = bp.pages[currentPage];
            // Parse brainstorm context for structural elements
            const bsLower = brainstormContext.toLowerCase();
            const compTypes = ['popup', 'modal', 'slider', 'carousel', 'accordion', 'tabs', 'overlay', 'drawer', 'banner', 'countdown', 'form'];
            for (const ct of compTypes) {
              if (bsLower.includes(ct) && !entry.components.find(c => c.type === ct)) {
                entry.components.push({ type: ct, added: new Date().toISOString().split('T')[0], source: 'brainstorm' });
              }
            }
            // Add a layout note summarizing the brainstorm intent
            const summaryLine = brainstormContext.split('\n').filter(l => l.startsWith('assistant:')).pop();
            if (summaryLine) {
              const note = `Brainstorm: ${summaryLine.replace('assistant:', '').trim().substring(0, 200)}`;
              if (!entry.layout_notes.includes(note)) entry.layout_notes.push(note);
            }
            writeBlueprint(bp);
            console.log('[blueprint] Updated from brainstorm context');
          }

          // Build a synthesized instruction from the brainstorm
          const buildInstruction = brainstormContext
            ? `ADD the following ideas to the EXISTING ${currentPage} — do NOT remove or replace any existing content, sections, or functionality. Keep everything that's already on the page and ADD these new elements:\n\n${brainstormContext}\n\nIMPORTANT: This is an ADDITIVE change. The current page already has content that must be preserved. Only add what was discussed in the brainstorm.`
            : userMessage;

          appendConvo({ role: 'assistant', content: `Building from brainstorm ideas on ${currentPage}`, at: new Date().toISOString() });

          // Route directly as a layout_update — skip classifier since it would
          // re-match "brainstorm" from the conversation context
          ws.send(JSON.stringify({ type: 'status', content: `Building on ${currentPage}...` }));
          const requestType = 'layout_update';
          console.log(`[classify] brainstorm-to-build (${currentPage}) → ${requestType} (forced)`);
          handleChatMessage(ws, buildInstruction, requestType, spec);
          return;
        }

        if (exitPatterns.test(lower)) {
          currentMode = 'build';
          console.log(`[mode] Exited brainstorm mode`);
          ws.send(JSON.stringify({ type: 'mode-changed', mode: 'build' }));
          appendConvo({ role: 'assistant', content: 'Exited brainstorm mode', at: new Date().toISOString() });
          return;
        }

        // Page switch is a UI navigation command — must route correctly regardless of mode
        if (classifyRequest(userMessage, spec) === 'page_switch') {
          console.log(`[mode] Brainstorm mode: page_switch detected — routing normally`);
          // Fall through to the classifier routing block below
        } else {
          // Stay in brainstorm — skip classifier entirely
          console.log(`[mode] Brainstorm mode active — routing directly to handleBrainstorm`);
          handleBrainstorm(ws, userMessage, spec);
          return;
        }
      }

      // Classify request
      ws.send(JSON.stringify({ type: 'status', content: 'Classifying request...' }));
      const requestType = classifyRequest(userMessage, spec);
      console.log(`[classify] "${userMessage.substring(0, 60)}..." → ${requestType}`);

      // Route based on classification
      switch (requestType) {
        case 'page_switch': {
          const pageSwitchMatch = userMessage.toLowerCase().match(/\b(?:go\s+to|switch\s+to|edit|show|open)\s+(?:the\s+)?(\w+)\s+page\b/);
          if (pageSwitchMatch) {
            const pageName = pageSwitchMatch[1].toLowerCase();
            const allPages = listPages();
            const target = allPages.find(p => p.replace('.html', '') === pageName || (pageName === 'home' && p === 'index.html'));
            if (target) {
              currentPage = target;
              saveStudio();
              ws.send(JSON.stringify({ type: 'page-changed', page: currentPage }));
              ws.send(JSON.stringify({ type: 'assistant', content: `Switched to ${currentPage}. You can now edit this page.` }));
              appendConvo({ role: 'assistant', content: `Switched to ${currentPage}`, at: new Date().toISOString() });
            }
          }
          break;
        }

        case 'brief_edit':
          // Route to planning flow with existing brief pre-loaded
          handlePlanning(ws, userMessage, spec);
          break;

        case 'visual_inspect': {
          // Smart-routed inspection: file-based (cheerio) or browser (Puppeteer)
          ws.send(JSON.stringify({ type: 'status', content: 'Inspecting site...' }));
          // Allow page-specific inspection: "check the about page", "inspect services"
          const _lowerMsg = userMessage.toLowerCase();
          const _pageNameMatch = _lowerMsg.match(/\b(?:check|inspect|examine|look\s+at)\s+(?:the\s+)?(\w+)\s+page\b/);
          let inspectPage = currentPage || 'index.html';
          if (_pageNameMatch) {
            const _targetName = _pageNameMatch[1];
            const _pages = listPages();
            const _found = _pages.find(p => p.replace('.html', '') === _targetName || (_targetName === 'home' && p === 'index.html'));
            if (_found) inspectPage = _found;
          }

          (async () => {
            try {
              const inspectResult = await inspectSite(userMessage, inspectPage);

              // Format the report directly — no spawnClaude for Tier 1
              // This avoids Claude generating HTML_UPDATE responses to diagnostic questions
              let report = `**Site Inspection — ${inspectPage}** (${inspectResult.tier === 'browser' ? 'browser rendering' : 'file analysis'})\n\n`;

              const r = inspectResult.report;

              if (r.error) {
                report += `Error: ${r.error}\n`;
              }

              if (r.nav) {
                report += `**Navigation:**\n`;
                report += `- Classes: \`${r.nav.classes}\`\n`;
                report += `- Links: ${r.nav.links.map(l => `[${l.text}](${l.href})`).join(', ')}\n\n`;
              }

              if (r.header) {
                report += `**Header:**\n`;
                report += `- Classes: \`${r.header.classes}\`\n`;
                report += `- Logo-V: ${r.header.hasLogoV ? 'yes' : 'no'}${r.header.logoSrc ? ` (${r.header.logoSrc})` : ''}\n`;
                report += `- Children: ${r.header.childTags.join(', ')}\n\n`;
              }

              if (r.hero) {
                report += `**Hero Section:**\n`;
                report += `- ID: ${r.hero.id || '(none)'}, Classes: \`${r.hero.classes}\`\n`;
                report += `- Headings: ${r.hero.headings.join(', ') || '(none)'}\n`;
                report += `- Images: ${r.hero.images.length} — ${r.hero.images.map(i => `${i.slotId || 'unslotted'} (${i.alt || 'no alt'})`).join(', ')}\n\n`;
              }

              if (r.footer) {
                report += `**Footer:**\n`;
                report += `- Classes: \`${r.footer.classes}\`\n`;
                report += `- Links: ${r.footer.links.length}\n\n`;
              }

              if (r.colors) {
                report += `**Colors (CSS vars):**\n`;
                if (Array.isArray(r.colors)) {
                  r.colors.forEach(c => { report += `- ${c}\n`; });
                } else {
                  report += `- ${r.colors}\n`;
                }
                report += '\n';
              }

              if (r.fonts) {
                report += `**Typography:**\n`;
                report += `- Google Fonts: ${r.fonts.googleFonts}\n`;
                if (r.fonts.cssVars?.length) {
                  r.fonts.cssVars.forEach(f => { report += `- ${f}\n`; });
                }
                report += '\n';
              }

              if (r.sections) {
                report += `**Sections (${r.sections.length}):**\n`;
                r.sections.forEach(s => {
                  report += `- ${s.index}. ${s.heading} ${s.id ? `#${s.id}` : ''} (${s.imageCount} images)\n`;
                });
                report += '\n';
              }

              if (r.images) {
                report += `**Images (${r.images.length}):**\n`;
                r.images.forEach(img => {
                  const status = img.slotStatus ? `[${img.slotStatus}]` : '[unslotted]';
                  report += `- ${status} ${img.slotId || '?'} — ${img.alt || '(no alt)'} → ${img.src || '(no src)'}\n`;
                });
                report += '\n';
              }

              // Tier 2 browser-specific results
              if (r.viewport) {
                report += `**Viewport:** ${r.viewport}\n\n`;
              }

              if (r.overflow) {
                report += `**Overflow Check:**\n`;
                report += `- Horizontal scroll: ${r.overflow.hasHorizontalScroll ? 'YES — content wider than viewport' : 'none'}\n`;
                report += `- Body scroll width: ${r.overflow.bodyScrollWidth}px, Viewport: ${r.overflow.viewportWidth}px\n`;
                if (r.overflow.overflowingElements?.length > 0) {
                  report += `- Overflowing elements:\n`;
                  r.overflow.overflowingElements.forEach(el => {
                    report += `  - \`<${el.tag} class="${el.class}">\` scroll=${el.scrollWidth}px > client=${el.clientWidth}px\n`;
                  });
                }
                report += '\n';
              }

              if (r.measurements) {
                if (r.measurements.error) {
                  report += `**Measurement:** ${r.measurements.error}\n\n`;
                } else {
                  report += `**Measurements (${r.measurements.selector}):**\n`;
                  report += `- Width: ${r.measurements.width}px, Height: ${r.measurements.height}px\n`;
                  report += `- Max-width: ${r.measurements.maxWidth}, Display: ${r.measurements.display}\n`;
                  report += `- Padding: ${r.measurements.padding}, Margin: ${r.measurements.margin}\n`;
                  report += `- Overflow: ${r.measurements.overflow} (X: ${r.measurements.overflowX})\n\n`;
                }
              }

              if (r.imageHealth) {
                const broken = r.imageHealth.filter(i => !i.loaded);
                const hidden = r.imageHealth.filter(i => !i.visible && i.loaded);
                report += `**Image Health:** ${r.imageHealth.length} total, ${broken.length} broken, ${hidden.length} hidden\n`;
                if (broken.length > 0) {
                  report += `- Broken: ${broken.map(i => i.alt || i.src?.substring(0, 40)).join(', ')}\n`;
                }
                report += '\n';
              }

              if (r.consoleErrors?.length > 0) {
                report += `**Console Errors (${r.consoleErrors.length}):**\n`;
                r.consoleErrors.forEach(e => { report += `- ${e}\n`; });
                report += '\n';
              } else if (r.consoleErrors) {
                report += `**Console Errors:** none\n\n`;
              }

              if (r.screenshot) {
                report += `**Screenshot saved:** ${r.screenshot.path}${r.screenshot.fullPage ? ' (full page)' : ''}\n\n`;
              }

              // --- New audit report formatters ---

              if (r.accessibility) {
                const a = r.accessibility;
                report += `**Accessibility Audit:**\n`;
                if (a.passed.length > 0) a.passed.forEach(p => { report += `- ✅ ${p}\n`; });
                if (a.issues.length > 0) a.issues.forEach(i => { report += `- ❌ ${i}\n`; });
                else report += `- ✅ No accessibility issues found\n`;
                if (a.headings?.length > 0) {
                  report += `- Heading structure: ${a.headings.map(h => `h${h.level}`).join(' → ')}\n`;
                }
                report += '\n';
              }

              if (r.performance) {
                const p = r.performance;
                report += `**Performance (file analysis):**\n`;
                report += `- HTML size: ${p.htmlSize}\n`;
                report += `- Inline CSS: ${p.inlineCssSize}`;
                if (p.externalCssSize) report += `, External CSS: ${p.externalCssSize}`;
                report += '\n';
                report += `- Resources: ${p.scripts} scripts, ${p.stylesheets} stylesheets, ${p.images} images\n`;
                report += `- Total image data: ${p.totalImageSize}\n`;
                if (p.renderBlockingScripts.length > 0) {
                  report += `- ⚠️ Render-blocking scripts: ${p.renderBlockingScripts.join(', ')}\n`;
                } else {
                  report += `- ✅ No render-blocking scripts\n`;
                }
                if (p.largeImages.length > 0) {
                  report += `- ⚠️ Large images (>500KB): ${p.largeImages.map(i => `${i.src} (${i.size})`).join(', ')}\n`;
                }
                report += '\n';
              }

              if (r.networkPerformance) {
                const np = r.networkPerformance;
                report += `**Performance (browser):**\n`;
                report += `- Total requests: ${np.totalRequests}, Transfer size: ${np.totalTransferSize}\n`;
                report += `- DOM ready: ${np.domContentLoaded}ms, Full load: ${np.loadComplete}ms\n`;
                if (np.byType) {
                  Object.entries(np.byType).forEach(([type, data]) => {
                    report += `  - ${type}: ${data.count} requests (${data.size})\n`;
                  });
                }
                report += '\n';
              }

              if (r.navConsistency) {
                const nc = r.navConsistency;
                report += `**Nav Consistency (${nc.pagesChecked} pages):**\n`;
                report += `- Nav: ${nc.navMatch ? '✅ identical across all pages' : '❌ differences found'}\n`;
                if (nc.navIssues.length > 0) nc.navIssues.forEach(i => { report += `  - ${i}\n`; });
                report += `- Footer: ${nc.footerMatch ? '✅ identical across all pages' : '❌ differences found'}\n`;
                if (nc.footerIssues.length > 0) nc.footerIssues.forEach(i => { report += `  - ${i}\n`; });
                report += '\n';
              }

              if (r.forms) {
                report += `**Form Validation (${r.forms.length} form${r.forms.length !== 1 ? 's' : ''}):**\n`;
                r.forms.forEach((f, i) => {
                  if (f.action) report += `- Form ${i + 1}: ${f.netlify ? 'Netlify Forms' : f.action} (${f.method || 'GET'})\n`;
                  if (f.passed) f.passed.forEach(p => { report += `  - ✅ ${p}\n`; });
                  if (f.issues) f.issues.forEach(iss => { report += `  - ❌ ${iss}\n`; });
                });
                report += '\n';
              }

              if (r.links) {
                const l = r.links;
                report += `**Link Check:**\n`;
                report += `- ${l.summary.internal} internal, ${l.summary.external} external, ${l.summary.issues} issues\n`;
                if (l.issues.length > 0) {
                  l.issues.forEach(iss => { report += `  - ❌ ${iss.issue}: \`${iss.href}\` ("${iss.text}")\n`; });
                } else {
                  report += `- ✅ All links valid\n`;
                }
                report += '\n';
              }

              if (r.seo) {
                const s = r.seo;
                report += `**SEO Audit:**\n`;
                if (s.passed.length > 0) s.passed.forEach(p => { report += `- ✅ ${p}\n`; });
                if (s.issues.length > 0) s.issues.forEach(i => { report += `- ❌ ${i}\n`; });
                else report += `- ✅ All SEO checks passed\n`;
                report += '\n';
              }

              // Always show page summary
              if (r.pageSummary) {
                const s = r.pageSummary;
                report += `**Page Summary:** "${s.title}" — ${s.sections} sections, ${s.images} images, ${s.links} links, ${s.forms} forms`;
                report += ` | Tailwind: ${s.hasTailwind ? 'yes' : 'no'}, Stylesheet: ${s.hasStylesheet ? 'yes' : 'no'}\n`;
              }

              ws.send(JSON.stringify({ type: 'assistant', content: report.trim() }));
              appendConvo({ role: 'assistant', content: report.trim(), at: new Date().toISOString() });
              saveStudio();
            } catch (err) {
              ws.send(JSON.stringify({ type: 'assistant', content: `Inspection failed: ${err.message}` }));
            }
          })();
          break;
        }

        case 'brand_health': {
          ws.send(JSON.stringify({ type: 'status', content: 'Checking brand health...' }));
          const healthResult = scanBrandHealth();
          const h = healthResult.health;
          const slotIcon = (s) => s === 'empty' ? '🔴' : s === 'stock' ? '🟡' : s === 'uploaded' || s === 'final' ? '🟢' : '⚪';

          let report = '**Brand Health Report**\n\n';
          report += `**Image Slots:** ${h.slots.total} total — ${h.slots.empty} empty, ${h.slots.stock} stock, ${h.slots.uploaded} uploaded, ${h.slots.final} final\n\n`;

          // Key slots
          report += `${slotIcon(h.hero.status)} Hero: ${h.hero.status}${h.hero.slot_id ? ` (${h.hero.slot_id})` : ''}\n`;
          report += `${slotIcon(h.logo.status)} Logo: ${h.logo.status}${h.logo.slot_id ? ` (${h.logo.slot_id})` : ''}\n`;
          report += `${slotIcon(h.favicon.status)} Favicon: ${h.favicon.status}${h.favicon.slot_id ? ` (${h.favicon.slot_id})` : ''}\n`;

          // Sets
          const setReport = (name, set) => set.total > 0 ? `${set.filled === set.total ? '🟢' : '🟡'} ${name}: ${set.filled}/${set.total} filled\n` : '';
          report += setReport('Testimonials', h.sets.testimonials);
          report += setReport('Gallery', h.sets.gallery);
          report += setReport('Services', h.sets.services);
          report += setReport('Team', h.sets.team);

          // Other checks
          report += `\n${h.font_icons.using ? '🟢' : '⚪'} Font Icons: ${h.font_icons.using ? h.font_icons.provider : 'not detected'}\n`;
          report += `${h.social_meta.og_image ? '🟢' : '🔴'} OG Image: ${h.social_meta.og_image ? 'set' : 'missing'}\n`;
          report += `${h.social_meta.twitter_card ? '🟢' : '🔴'} Twitter Card: ${h.social_meta.twitter_card ? 'set' : 'missing'}\n`;

          if (healthResult.suggestions.length > 0) {
            report += '\n**Suggestions:**\n' + healthResult.suggestions.map(s => `- ${s.action}`).join('\n');
          }
          ws.send(JSON.stringify({ type: 'assistant', content: report }));
          appendConvo({ role: 'assistant', content: 'Brand health report generated', at: new Date().toISOString() });
          break;
        }

        case 'brainstorm':
          currentMode = 'brainstorm';
          console.log(`[mode] Entered brainstorm mode`);
          ws.send(JSON.stringify({ type: 'mode-changed', mode: 'brainstorm' }));
          handleBrainstorm(ws, userMessage, spec);
          break;

        case 'rollback': {
          // Find the most recent version of the current page to roll back to
          const versions = getVersions(currentPage);
          if (versions.length === 0) {
            ws.send(JSON.stringify({ type: 'assistant', content: 'No previous versions found for this page. There\'s nothing to roll back to.' }));
            appendConvo({ role: 'assistant', content: 'No versions to rollback', at: new Date().toISOString() });
          } else {
            // Roll back to the most recent version (second-to-last, since the last is the current state)
            const targetVersion = versions.length >= 2 ? versions[versions.length - 2] : versions[versions.length - 1];
            const result = rollbackToVersion(currentPage, targetVersion.timestamp);
            if (result.error) {
              ws.send(JSON.stringify({ type: 'error', content: `Rollback failed: ${result.error}` }));
            } else {
              ws.send(JSON.stringify({ type: 'assistant', content: `Rolled back ${currentPage} to version from ${new Date(result.restoredFrom).toLocaleString()}` }));
              ws.send(JSON.stringify({ type: 'reload-preview' }));
              appendConvo({ role: 'assistant', content: `Rolled back ${currentPage} to ${result.restoredFrom}`, at: new Date().toISOString() });
            }
          }
          break;
        }

        case 'version_history': {
          const versionList = getVersions(currentPage);
          if (versionList.length === 0) {
            ws.send(JSON.stringify({ type: 'assistant', content: 'No version history yet. Versions are saved automatically every time a page is updated.' }));
          } else {
            const lines = versionList.slice(-10).reverse().map((v, i) => {
              const date = new Date(v.timestamp).toLocaleString();
              const sizeKb = (v.size / 1024).toFixed(1);
              return `${i === 0 ? '  → ' : '    '}${date} — ${v.reason} (${sizeKb}KB)`;
            });
            ws.send(JSON.stringify({ type: 'assistant', content: `Version history for ${currentPage}:\n${lines.join('\n')}\n\nSay "rollback" to revert to the previous version, or use the Studio panel for more options.` }));
          }
          appendConvo({ role: 'assistant', content: 'Showed version history', at: new Date().toISOString() });
          break;
        }

        case 'summarize': {
          ws.send(JSON.stringify({ type: 'status', content: 'Generating session summary...' }));
          generateSessionSummary(ws);
          ws.send(JSON.stringify({ type: 'assistant', content: 'Session summary saved. This context will carry over to future sessions.' }));
          appendConvo({ role: 'assistant', content: 'Session summary generated', at: new Date().toISOString() });
          break;
        }

        case 'data_model':
          handleDataModelPlanning(ws, userMessage, spec);
          break;

        case 'tech_advice': {
          const brief = spec.design_brief || null;
          if (!brief) {
            ws.send(JSON.stringify({ type: 'assistant', content: 'Describe your site first so I can analyze what tech stack fits best. What kind of site are you building?' }));
          } else {
            const recs = analyzeTechStack(brief);
            const lines = recs.map(r => `- **${r.category}:** ${r.suggestion} — ${r.reason}${r.stack ? ` (${r.stack})` : ''}`);
            ws.send(JSON.stringify({ type: 'assistant', content: `Tech recommendations based on your brief:\n\n${lines.join('\n')}` }));
          }
          appendConvo({ role: 'assistant', content: 'Tech stack advice given', at: new Date().toISOString() });
          break;
        }

        case 'template_import':
          ws.send(JSON.stringify({ type: 'assistant', content: 'Upload an HTML file or ZIP using the image button (or drag-drop), then select the "Template" role. I\'ll use it as the starting point for your site.' }));
          appendConvo({ role: 'assistant', content: 'Template import instructions given', at: new Date().toISOString() });
          break;

        case 'new_site':
        case 'major_revision':
        case 'restyle':
          handlePlanning(ws, userMessage, spec);
          break;

        case 'deploy': {
          const lowerDeploy = userMessage.toLowerCase();
          const deployEnv = (lowerDeploy.includes('prod') || lowerDeploy.includes('production') || lowerDeploy.includes('live'))
            ? 'production' : 'staging';
          ws.send(JSON.stringify({ type: 'status', content: `Deploying to ${deployEnv}...` }));
          runDeploy(ws, deployEnv);
          break;
        }

        case 'git_push': {
          ws.send(JSON.stringify({ type: 'status', content: 'Pushing to site repo (dev)...' }));
          runGitPush(ws);
          break;
        }

        case 'hub_push': {
          ws.send(JSON.stringify({ type: 'status', content: 'Pushing Studio code...' }));
          pushHubRepo(ws);
          break;
        }

        case 'build': {
          const lowerMsg = userMessage.toLowerCase();
          const templateMatch = lowerMsg.match(/\b(event|business|portfolio|landing)\b/);
          const template = templateMatch ? templateMatch[1] : null;
          if (template) {
            // Template-based build uses the orchestrator script
            ws.send(JSON.stringify({ type: 'status', content: `Building with ${template} template...` }));
            runOrchestratorSite(ws, template);
          } else {
            // Brief-based build uses Claude directly via handleChatMessage
            const pagesList = (spec.pages || spec.design_brief?.must_have_sections || ['home']).join(', ');
            ws.send(JSON.stringify({ type: 'status', content: 'Building site from brief...' }));
            handleChatMessage(ws, `Build this site based on the design brief. Site name: ${spec.site_name || TAG}. Pages to generate: ${pagesList}`, 'build', spec);
          }
          break;
        }

        case 'asset_import': {
          const lowerMsg = userMessage.toLowerCase();
          const assetMatch = lowerMsg.match(/(?:create|make|generate|design|draw)\s+(?:a\s+|an\s+|the\s+)?(?:new\s+)?(logo|icon|favicon|hero|banner|divider|illustration)/);
          const assetType = assetMatch ? assetMatch[1] : 'logo';
          ws.send(JSON.stringify({ type: 'status', content: `Generating ${assetType}...` }));
          runAssetGenerate(ws, assetType, userMessage);
          break;
        }

        case 'fill_stock_photos': {
          ws.send(JSON.stringify({ type: 'status', content: 'Filling image slots with stock photos...' }));
          const fillSpec = readSpec();
          const emptySlots = (fillSpec.media_specs || []).filter(s => s.status === 'empty');

          if (emptySlots.length === 0) {
            ws.send(JSON.stringify({ type: 'assistant', content: 'All image slots are already filled. No empty slots to fill.' }));
            appendConvo({ role: 'assistant', content: 'No empty slots to fill', at: new Date().toISOString() });
            break;
          }

          // Check for any stock photo API keys (Unsplash, Pexels, Pixabay)
          const fillConfig = loadSettings();
          const sp = fillConfig.stock_photo || {};
          const hasAnyKey = !!(sp.unsplash_api_key || sp.pexels_api_key || sp.pixabay_api_key);

          if (!hasAnyKey) {
            const noKeyMsg = 'No stock photo API keys configured. Add them in Settings (gear icon) under Stock Photos — supports Unsplash, Pexels, and Pixabay.';
            ws.send(JSON.stringify({ type: 'assistant', content: noKeyMsg }));
            appendConvo({ role: 'assistant', content: noKeyMsg, at: new Date().toISOString() });
            break;
          }

          // Fill slots with real stock photos via 3-provider fallback
          const brief = fillSpec.design_brief || {};
          const industry = fillSpec.business_type || brief.audience || 'professional';
          const tone = Array.isArray(brief.tone) ? brief.tone.join(', ') : (brief.tone || 'professional');
          let filled = 0;
          let errors = 0;
          const providerLog = [];

          const env = {
            ...process.env,
            UNSPLASH_API_KEY: sp.unsplash_api_key || '',
            PEXELS_API_KEY: sp.pexels_api_key || '',
            PIXABAY_API_KEY: sp.pixabay_api_key || '',
          };

          for (const slot of emptySlots) {
            const queryMap = {
              hero: `${industry} ${tone} hero banner`,
              testimonial: `professional headshot portrait`,
              team: `professional team member portrait`,
              service: `${industry} ${slot.slot_id.replace(/^service-/, '').replace(/-/g, ' ')} service`,
              gallery: `${industry} project showcase`,
              logo: `${industry} brand logo minimal`,
              favicon: `${industry} icon minimal`,
            };
            const searchQuery = queryMap[slot.role] || `${industry} ${slot.role}`;
            ws.send(JSON.stringify({ type: 'status', content: `Filling ${slot.slot_id}...` }));

            try {
              const [w, h] = (slot.dimensions || '800x600').split('x').map(Number);
              const stockDir = path.join(DIST_DIR(), 'assets', 'stock');
              fs.mkdirSync(stockDir, { recursive: true });
              const outputFile = path.join(stockDir, `${slot.slot_id}.jpg`);

              const scriptPath = path.join(__dirname, '..', 'scripts', 'stock-photo');
              const { execFileSync } = require('child_process');
              const result = execFileSync(scriptPath, [searchQuery, String(w), String(h), outputFile], {
                env, timeout: 30000, encoding: 'utf8'
              }).trim();

              // Parse provider from script output (first line: provider=unsplash/pexels/pixabay)
              const providerMatch = result.match(/^provider=(\w+)/);
              const provider = providerMatch ? providerMatch[1] : 'unknown';

              // Update HTML — find slot and replace src
              const pages = listPages();
              for (const page of pages) {
                const filePath = path.join(DIST_DIR(), page);
                let html = fs.readFileSync(filePath, 'utf8');
                const escapedId = slot.slot_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const patched = patchSlotImg(html, escapedId, {
                  src: `assets/stock/${slot.slot_id}.jpg`,
                  status: 'stock',
                });
                if (patched.changed) {
                  fs.writeFileSync(filePath, patched.html);
                }
              }

              // Store slot mapping for rebuild persistence
              if (!fillSpec.slot_mappings) fillSpec.slot_mappings = {};
              fillSpec.slot_mappings[slot.slot_id] = {
                src: `assets/stock/${slot.slot_id}.jpg`,
                alt: slot.alt || slot.slot_id.replace(/-/g, ' '),
                provider,
              };

              slot.status = 'stock';
              filled++;
              providerLog.push(`${slot.slot_id} filled via ${provider}`);
              ws.send(JSON.stringify({ type: 'status', content: `${slot.slot_id} filled via ${provider}` }));
            } catch (err) {
              console.error(`[stock-photo] Failed to fill ${slot.slot_id}:`, err.message);
              ws.send(JSON.stringify({ type: 'status', content: `${slot.slot_id} failed — skipping` }));
              errors++;
            }
          }

          // Persist updated media_specs and slot_mappings
          writeSpec(fillSpec);

          const fillMsg = `Filled ${filled} of ${emptySlots.length} image slot(s) with real stock photos.${errors > 0 ? ` ${errors} failed.` : ''}\n\n${providerLog.join('\n')}`;
          ws.send(JSON.stringify({ type: 'assistant', content: fillMsg }));
          ws.send(JSON.stringify({ type: 'reload-preview' }));
          ws.send(JSON.stringify({ type: 'spec-updated' }));
          appendConvo({ role: 'assistant', content: fillMsg, at: new Date().toISOString() });
          break;
        }

        case 'query':
          handleQuery(ws, userMessage);
          break;

        default:
          // content_update, layout_update, bug_fix — go to enhanced chat
          handleChatMessage(ws, userMessage, requestType, spec);
          break;
      }
    }

    if (msg.type === 'approve-brief') {
      // User approved the brief — mark it and trigger build
      const spec = readSpec();
      if (spec.design_brief) {
        spec.design_brief.approved = true;
        writeSpec(spec);
        ws.send(JSON.stringify({ type: 'status', content: 'Brief approved! Building site...' }));
        appendConvo({ role: 'system', content: 'Design brief approved', at: new Date().toISOString() });
        // Build using the brief context — include pages from spec
        const pagesList = (spec.pages || ['home']).join(', ');
        handleChatMessage(ws, `Build this site based on the approved design brief. Follow it precisely. Site name: ${spec.site_name || TAG}. Pages to generate: ${pagesList}`, 'build', spec);
      }
    }

    if (msg.type === 'edit-brief') {
      // User wants to edit the brief
      ws.send(JSON.stringify({ type: 'assistant', content: 'Tell me what you\'d like to change about the brief. I\'ll update it.' }));
    }

    if (msg.type === 'skip-brief') {
      // User wants to skip planning and build directly
      const spec = readSpec();
      ws.send(JSON.stringify({ type: 'status', content: 'Skipping brief, building directly...' }));
      runOrchestratorSite(ws, null);
    }

    if (msg.type === 'upload-role-update') {
      // Update role/label for an uploaded asset
      const spec = readSpec();
      const asset = (spec.uploaded_assets || []).find(a => a.filename === msg.filename);
      if (asset) {
        if (msg.role) asset.role = msg.role;
        if (msg.label !== undefined) asset.label = msg.label;
        writeSpec(spec);
        ws.send(JSON.stringify({ type: 'assistant', content: `Updated ${msg.filename}: role → ${msg.role || asset.role}` }));
      }
    }

    if (msg.type === 'generate-asset') {
      const assetType = msg.assetType || 'logo';
      const description = msg.description || '';
      ws.send(JSON.stringify({ type: 'status', content: `Generating ${assetType}...` }));
      runAssetGenerate(ws, assetType, description);
    }

    if (msg.type === 'set-page') {
      const page = msg.page;
      if (page && fs.existsSync(path.join(DIST_DIR(), page))) {
        currentPage = page;
        saveStudio();
        ws.send(JSON.stringify({ type: 'page-changed', page: currentPage }));
      }
    }

    if (msg.type === 'update-spec') {
      try {
        // Whitelist allowed fields to prevent arbitrary spec overwrite
        const ALLOWED_SPEC_FIELDS = ['design_brief', 'design_decisions', 'site_name', 'business_type'];
        const filtered = {};
        for (const key of Object.keys(msg.updates || {})) {
          if (ALLOWED_SPEC_FIELDS.includes(key)) {
            filtered[key] = msg.updates[key];
          } else {
            console.warn(`[update-spec] Rejected non-whitelisted field: ${key}`);
          }
        }
        if (Object.keys(filtered).length === 0) {
          ws.send(JSON.stringify({ type: 'error', content: 'No valid fields to update.' }));
          return;
        }
        const currentSpec = readSpec();
        const updated = { ...currentSpec, ...filtered };
        writeSpec(updated);
        ws.send(JSON.stringify({ type: 'spec-updated', spec: updated }));
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', content: 'Failed to update spec: ' + e.message }));
      }
    }

    } catch (err) {
      console.error('[ws] Unhandled error in message handler:', err);
      try { ws.send(JSON.stringify({ type: 'error', content: 'An unexpected error occurred. Please try again.' })); } catch {}
    }
  });

});


// --- Query handler (list assets, templates, preview) ---
function handleQuery(ws, userMessage) {
  const lowerMsg = userMessage.toLowerCase();

  if (lowerMsg.match(/\b(list|show|what)\s+assets\b/)) {
    const assetsDir = path.join(DIST_DIR(), 'assets');
    if (fs.existsSync(assetsDir)) {
      const files = fs.readdirSync(assetsDir).filter(f => /\.(svg|png|jpg|gif)$/i.test(f));
      if (files.length) {
        ws.send(JSON.stringify({ type: 'assistant', content: `Current assets:\n${files.map(f => `  - ${f}`).join('\n')}` }));
      } else {
        ws.send(JSON.stringify({ type: 'assistant', content: 'No assets yet. Try "create a logo" or "make a favicon".' }));
      }
    } else {
      ws.send(JSON.stringify({ type: 'assistant', content: 'No assets directory yet. Generate something first!' }));
    }
    appendConvo({ role: 'assistant', content: 'Listed assets', at: new Date().toISOString() });
  } else if (lowerMsg.match(/\b(template|templates)\b/)) {
    const templatesDir = path.join(HUB_ROOT, 'config', 'site-templates');
    const templates = fs.existsSync(templatesDir)
      ? fs.readdirSync(templatesDir).filter(d => fs.statSync(path.join(templatesDir, d)).isDirectory())
      : [];
    const content = templates.length
      ? `Available templates:\n${templates.map(t => `  - ${t} — say "use ${t} template" to apply`).join('\n')}`
      : 'No templates available yet.';
    ws.send(JSON.stringify({ type: 'assistant', content }));
    appendConvo({ role: 'assistant', content, at: new Date().toISOString() });
  } else if (lowerMsg.match(/\b(list|show|what)\s+pages\b/)) {
    const pages = listPages();
    if (pages.length > 0) {
      const content = `Pages in this site:\n${pages.map(p => `  ${p === currentPage ? '→' : '-'} ${p}${p === currentPage ? ' (active)' : ''}`).join('\n')}\n\nSay "switch to <page> page" to edit a different page.`;
      ws.send(JSON.stringify({ type: 'assistant', content }));
      ws.send(JSON.stringify({ type: 'pages-updated', pages, currentPage }));
    } else {
      ws.send(JSON.stringify({ type: 'assistant', content: 'No pages generated yet. Describe your site to get started.' }));
    }
    appendConvo({ role: 'assistant', content: 'Listed pages', at: new Date().toISOString() });
  } else if (lowerMsg.includes('preview')) {
    ws.send(JSON.stringify({ type: 'assistant', content: `Preview is running at http://localhost:${PREVIEW_PORT}. Check the right panel.` }));
    appendConvo({ role: 'assistant', content: `Preview at http://localhost:${PREVIEW_PORT}`, at: new Date().toISOString() });
  }
}

// --- Run orchestrator-site ---
function runOrchestratorSite(ws, template) {
  const args = [path.join(HUB_ROOT, 'scripts', 'orchestrator-site'), TAG];
  if (template) { args.push('--template', template); }
  const child = spawn(args[0], args.slice(1), {
    env: process.env,
    cwd: HUB_ROOT,
  });

  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
    ws.send(JSON.stringify({ type: 'status', content: chunk.toString().trim() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[orchestrator]', chunk.toString());
  });

  child.on('close', (code) => {
    if (code === 0) {
      ws.send(JSON.stringify({ type: 'assistant', content: 'Site built successfully! Preview is updating.' }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: 'Site built via orchestrator-site', at: new Date().toISOString() });
    } else {
      ws.send(JSON.stringify({ type: 'error', content: 'Build failed. Check the logs.' }));
    }
  });
}

// --- Run site-deploy ---
// env: 'staging' | 'production'
let deployInProgress = false;
function runDeploy(ws, env) {
  if (deployInProgress) {
    try { ws.send(JSON.stringify({ type: 'status', content: 'Deploy already in progress.' })); } catch {}
    return;
  }
  deployInProgress = true;
  env = env || 'staging';
  const envLabel = env.charAt(0).toUpperCase() + env.slice(1);
  const args = [path.join(HUB_ROOT, 'scripts', 'site-deploy'), TAG, '--prod', '--env', env];
  const child = spawn(args[0], args.slice(1), {
    env: process.env,
    cwd: HUB_ROOT,
  });

  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
    ws.send(JSON.stringify({ type: 'status', content: chunk.toString().trim() }));
  });

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    console.error('[deploy]', text);
    if (text) ws.send(JSON.stringify({ type: 'status', content: text }));
  });

  child.on('close', (code) => {
    const urlMatch = output.match(/https:\/\/[^\s]+/);
    if (code === 0 && urlMatch) {
      // Invalidate cache — deploy script wrote to spec.json via jq
      invalidateSpecCache();
      // Update spec.environments (merge — preserve existing fields like repo, custom_domain)
      const spec = readSpec();
      if (!spec.environments) spec.environments = {};
      spec.environments[env] = {
        ...(spec.environments[env] || {}),
        provider: spec.deploy_provider || loadSettings().deploy_target || 'netlify',
        site_id: spec.environments?.[env]?.site_id || spec.netlify_site_id || null,
        url: urlMatch[0],
        deployed_at: new Date().toISOString(),
        state: 'deployed',
      };
      // Keep flat fields for backward compat
      spec.deployed_url = urlMatch[0];
      spec.deployed_at = spec.environments[env].deployed_at;
      spec.state = 'deployed';
      writeSpec(spec);

      ws.send(JSON.stringify({ type: 'assistant', content: `${envLabel} deploy complete!\n\nURL: ${urlMatch[0]}` }));
      // Notify client to refresh deploy info
      ws.send(JSON.stringify({ type: 'deploy-updated', env, url: urlMatch[0] }));
    } else if (code === 0) {
      ws.send(JSON.stringify({ type: 'assistant', content: `${envLabel} deploy completed. Check the output above for the URL.` }));
    } else {
      ws.send(JSON.stringify({ type: 'error', content: `${envLabel} deploy failed. You may need to run "netlify login" first.` }));
    }
    appendConvo({ role: 'assistant', content: `${envLabel} deploy ${code === 0 ? 'succeeded' : 'failed'}: ${urlMatch ? urlMatch[0] : 'see logs'}`, at: new Date().toISOString() });

    // Auto-sync site repo after successful deploy
    // staging → syncs dev then merges dev→staging
    // production → syncs dev then merges dev→staging→main
    if (code === 0) {
      const freshSpec = readSpec();
      if (freshSpec.site_repo?.path) {
        const targetBranch = env === 'production' ? 'main' : 'staging';
        ws.send(JSON.stringify({ type: 'status', content: `Syncing site repo (${targetBranch})...` }));
        syncSiteRepo(ws, freshSpec, targetBranch);
      }
    }
    deployInProgress = false;
  });
}

// --- Git Push — push to site repo (dev branch) ---
function runGitPush(ws, { silent = false } = {}) {
  const spec = readSpec();
  if (!spec.site_repo?.path) {
    if (!silent) {
      const msg = siteRepoInProgress
        ? 'Site repo is being created — please wait a moment.'
        : 'No site repo configured. Build the site first.';
      try { ws.send(JSON.stringify({ type: 'error', content: msg })); } catch {}
    }
    return;
  }
  syncSiteRepo(ws, spec, 'dev');
}

// --- Push Hub Repo (famtastic tooling) ---
// Separate from site pushes — only for Studio code changes
let hubPushInProgress = false;
function pushHubRepo(ws) {
  if (hubPushInProgress) {
    try { ws.send(JSON.stringify({ type: 'status', content: 'Hub push already in progress.' })); } catch {}
    return;
  }
  hubPushInProgress = true;
  const send = (type, content) => { try { ws.send(JSON.stringify({ type, content })); } catch {} };
  const finish = () => { hubPushInProgress = false; };
  send('status', 'Pushing Studio code...');

  const addChild = spawn('git', ['add', '-A'], { cwd: HUB_ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
  addChild.stderr.resume();
  addChild.on('close', (addCode) => {
    if (addCode !== 0) { send('error', 'Git add failed.'); finish(); return; }

    let statusOut = '';
    const statusChild = spawn('git', ['status', '--porcelain'], { cwd: HUB_ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
    statusChild.stdout.on('data', (chunk) => { statusOut += chunk.toString(); });
    statusChild.on('close', () => {
      if (!statusOut.trim()) {
        send('status', 'No Studio code changes to push.');
        // Still push in case there are unpushed commits
      }

      const doPush = () => {
        let branch = 'main';
        const branchChild = spawn('git', ['branch', '--show-current'], { cwd: HUB_ROOT, stdio: ['ignore', 'pipe', 'ignore'] });
        let branchOut = '';
        branchChild.stdout.on('data', (chunk) => { branchOut += chunk.toString(); });
        branchChild.on('close', () => {
          if (branchOut.trim()) branch = branchOut.trim();
          const pushChild = spawn('git', ['push', 'origin', branch], { cwd: HUB_ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
          pushChild.stderr.resume();
          pushChild.on('close', (pushCode) => {
            send(pushCode === 0 ? 'assistant' : 'error',
              pushCode === 0 ? `Studio code pushed to origin/${branch}.` : 'Studio push failed.');
            finish();
          });
        });
      };

      if (statusOut.trim()) {
        const timestamp = new Date().toISOString().split('T')[0];
        const commitChild = spawn('git', ['commit', '-m', `Studio: ${timestamp}`], { cwd: HUB_ROOT, stdio: ['ignore', 'ignore', 'pipe'] });
        commitChild.stderr.resume();
        commitChild.on('close', (commitCode) => {
          if (commitCode !== 0) { send('error', 'Hub commit failed.'); finish(); return; }
          doPush();
        });
      } else {
        doPush();
      }
    });
  });
}

// --- Per-Site Repo (dev/staging/main branches) ---
// Helper: try gh repo create on an existing local repo
function _tryGhRepoCreate(ws, spec, repoPath, siteName) {
  const send = (type, content) => {
    try { ws.send(JSON.stringify({ type, content })); } catch {}
  };
  send('status', 'Creating GitHub repository...');
  const ghName = TAG.replace(/^site-/, '');
  let ghErr = '';
  let ghOut = '';
  let ghChild;
  try {
    ghChild = spawn('gh', ['repo', 'create', ghName, '--private', '--source', '.', '--push'], {
      cwd: repoPath,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    send('error', `gh command not found: ${err.message}. Set the remote manually.`);
    // Still save the local repo path to spec
    spec.site_repo = { path: repoPath, remote: null };
    writeSpec(spec);
    siteRepoInProgress = false;
    return;
  }
  ghChild.stdout.on('data', (chunk) => { ghOut += chunk.toString(); });
  ghChild.stderr.on('data', (chunk) => { ghErr += chunk.toString(); });
  ghChild.on('close', (ghCode) => {
    let remote = null;
    if (ghCode === 0) {
      const urlMatch = ghOut.match(/https:\/\/github\.com\/[^\s]+/) || ghErr.match(/https:\/\/github\.com\/[^\s]+/);
      remote = urlMatch ? urlMatch[0] : null;
      if (!remote) {
        try {
          const { execSync } = require('child_process');
          remote = execSync('git remote get-url origin', { cwd: repoPath, encoding: 'utf8' }).trim();
        } catch {}
      }
      send('assistant', `Production repo created!\n\nPath: ${repoPath}\nGitHub: ${remote || 'check gh output'}`);
    } else {
      send('status', `gh repo create failed (${ghErr.trim() || 'gh CLI not available'}). You can set the remote manually.`);
      send('assistant', `Production repo created locally at ${repoPath}.\n\nTo add a remote:\n  cd ${repoPath}\n  git remote add origin <your-repo-url>\n  git push -u origin main`);
    }
    // Save to spec.site_repo
    spec.site_repo = {
      path: repoPath,
      remote: remote,
    };
    writeSpec(spec);
    try { ws.send(JSON.stringify({ type: 'deploy-updated', env: 'production' })); } catch {}
    appendConvo({ role: 'assistant', content: `Production repo created at ${repoPath}${remote ? ' — pushed to ' + remote : ''}`, at: new Date().toISOString() });
    siteRepoInProgress = false;
  });
}

// Creates a standalone git repo for production deploys containing only dist/ output
let siteRepoInProgress = false;
function createSiteRepo(ws) {
  if (siteRepoInProgress) {
    try { ws.send(JSON.stringify({ type: 'error', content: 'Production repo creation already in progress.' })); } catch {}
    return;
  }
  siteRepoInProgress = true;
  const send = (type, content) => {
    try { ws.send(JSON.stringify({ type, content })); } catch {}
  };

  const settings = loadSettings();
  const basePath = settings.prod_sites_base || path.join(require('os').homedir(), 'famtastic-sites');
  const repoPath = path.join(basePath, TAG);
  const distDir = DIST_DIR();
  const spec = readSpec();
  const siteName = spec.site_name || TAG;

  // Check if already fully set up (path + remote both exist)
  if (spec.site_repo?.path && spec.site_repo?.remote) {
    send('error', `Site repo already exists at ${spec.site_repo.path} → ${spec.site_repo.remote}`);
    siteRepoInProgress = false;
    return;
  }

  // Retry case: repo created locally but gh failed — skip to gh step
  const existingRepoPath = spec.site_repo?.path;
  if (existingRepoPath && fs.existsSync(path.join(existingRepoPath, '.git')) && !spec.site_repo?.remote) {
    send('status', 'Local repo exists but no remote — retrying GitHub setup...');
    _tryGhRepoCreate(ws, spec, existingRepoPath, spec.site_name || TAG);
    return;
  }

  if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
    send('error', 'No built site found. Build the site first.');
    siteRepoInProgress = false;
    return;
  }

  send('status', `Creating production repo at ${repoPath}...`);

  // Step 1: Create directory and copy dist
  try {
    fs.mkdirSync(repoPath, { recursive: true });
    // Copy dist/ but exclude internal build artifacts
    const distFilter = (src) => {
      const rel = path.relative(distDir, src);
      return !rel.startsWith('.versions') && rel !== '_template.html';
    };
    fs.cpSync(distDir, repoPath, { recursive: true, filter: distFilter });
    // Write .gitignore (include internal dirs in case they leak in)
    fs.writeFileSync(path.join(repoPath, '.gitignore'), 'node_modules/\n.DS_Store\n.env\n.versions/\n_template.html\n');

    // Scaffold: CLAUDE.md
    const pages = listPages();
    const pageNames = pages.map(p => p.replace('.html', ''));
    fs.writeFileSync(path.join(repoPath, 'CLAUDE.md'), [
      `# ${siteName} — Production Site`,
      '',
      'This repo contains the production build output for this site.',
      'It is managed by FAMtastic Site Studio.',
      '',
      '## What you can do here',
      '- Edit HTML/CSS directly for quick tweaks',
      '- Replace images in assets/',
      '- Update text content',
      '- Fix styling issues',
      '',
      '## What you should NOT do here',
      '- Do not restructure pages (use Studio for that)',
      '- Do not add new pages (use Studio)',
      '- Do not modify the build pipeline (it lives in the Studio repo)',
      '',
      '## For major changes',
      'Open FAMtastic Site Studio:',
      `  cd ~/famtastic && fam-hub site chat ${TAG}`,
      '',
      '## Conventions',
      '- Shared CSS: assets/styles.css (do not remove STUDIO LAYOUT FOUNDATION block)',
      '- Page-specific CSS: inline <style data-page="pagename"> blocks',
      '- Images use data-slot-id attributes for slot system tracking',
      '- Navigation and footer are shared across all pages',
    ].join('\n'));

    // Scaffold: SITE-LEARNINGS.md
    const brief = spec.design_brief || {};
    const colors = spec.colors || brief.colors || {};
    const fonts = spec.fonts || brief.fonts || {};
    const stagingUrl = spec.environments?.staging?.url || 'not deployed';
    fs.writeFileSync(path.join(repoPath, 'SITE-LEARNINGS.md'), [
      `# ${siteName} — Site Learnings`,
      '',
      '## Design Brief',
      `- Goal: ${brief.goal || 'not set'}`,
      `- Audience: ${brief.audience || 'not set'}`,
      `- Tone: ${(brief.tone || []).join(', ') || 'not set'}`,
      `- Sections: ${(brief.must_have_sections || []).join(', ') || 'not set'}`,
      `- Avoid: ${(brief.avoid || []).join(', ') || 'none'}`,
      '',
      '## Colors',
      `- Primary: ${colors.primary || 'not set'}`,
      `- Accent: ${colors.accent || 'not set'}`,
      `- Background: ${colors.bg || 'not set'}`,
      '',
      '## Fonts',
      `- Heading: ${fonts.heading || 'not set'}`,
      `- Body: ${fonts.body || 'not set'}`,
      '',
      '## Pages',
      ...pageNames.map(p => `- ${p}`),
      '',
      '## Deploy Info',
      `- Staging: ${stagingUrl}`,
      '- Production: not yet configured',
      '- Studio repo: ~/famtastic',
      `- Studio command: fam-hub site chat ${TAG}`,
    ].join('\n'));

    // Enhanced README
    fs.writeFileSync(path.join(repoPath, 'README.md'), [
      `# ${siteName}`,
      '',
      'Production site files. Managed by FAMtastic Site Studio.',
      '',
      `**Pages:** ${pageNames.join(', ')}`,
      `**Staging:** ${stagingUrl}`,
      `**Studio:** \`cd ~/famtastic && fam-hub site chat ${TAG}\``,
    ].join('\n'));
  } catch (err) {
    send('error', `Failed to create repo directory: ${err.message}`);
    siteRepoInProgress = false;
    return;
  }

  // Step 2: git init
  send('status', 'Initializing git repository...');
  const initChild = spawn('git', ['init'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
  initChild.stderr.resume();
  initChild.on('close', (initCode) => {
    if (initCode !== 0) { send('error', 'git init failed.'); siteRepoInProgress = false; return; }

    // Step 3: git add + commit
    send('status', 'Creating initial commit...');
    const addChild = spawn('git', ['add', '-A'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
    addChild.stderr.resume();
    addChild.on('close', (addCode) => {
      if (addCode !== 0) { send('error', 'git add failed in prod repo.'); siteRepoInProgress = false; return; }
      const commitChild = spawn('git', ['commit', '-m', `Initial production deploy: ${siteName}`], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
      commitChild.stderr.resume();
      commitChild.on('close', (commitCode) => {
        if (commitCode !== 0) { send('error', 'Initial commit failed.'); siteRepoInProgress = false; return; }

        // Step 4: Create staging and main branches from dev
        send('status', 'Creating branches (dev, staging, main)...');
        // Rename default branch to dev
        const renameChild = spawn('git', ['branch', '-M', 'dev'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
        renameChild.stderr.resume();
        renameChild.on('close', (rnCode) => {
          if (rnCode !== 0) { send('error', 'Failed to rename branch to dev.'); siteRepoInProgress = false; return; }
          // Create staging and main branches
          const stagingChild = spawn('git', ['branch', 'staging'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
          stagingChild.stderr.resume();
          stagingChild.on('close', (stCode) => {
            if (stCode !== 0) { send('error', 'Failed to create staging branch.'); siteRepoInProgress = false; return; }
            const mainChild = spawn('git', ['branch', 'main'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
            mainChild.stderr.resume();
            mainChild.on('close', (mnCode) => {
              if (mnCode !== 0) { send('error', 'Failed to create main branch.'); siteRepoInProgress = false; return; }
              // Step 5: Try gh repo create (uses shared helper)
              _tryGhRepoCreate(ws, spec, repoPath, siteName);
            });
          });
        });
      });
    });
  });
}

// Sync dist/ to site repo on a specific branch, optionally merge to target branch
// branch: 'dev' (push to repo), 'staging' (merge dev→staging), 'main' (merge staging→main)
let syncSiteRepoInProgress = false;
function syncSiteRepo(ws, spec, targetBranch, callback) {
  if (syncSiteRepoInProgress) {
    try { ws.send(JSON.stringify({ type: 'status', content: 'Site repo sync already in progress.' })); } catch {}
    return;
  }
  const repo = spec.site_repo;
  if (!repo || !repo.path) {
    try { ws.send(JSON.stringify({ type: 'status', content: 'No site repo configured.' })); } catch {}
    return;
  }
  if (!fs.existsSync(repo.path)) {
    try { ws.send(JSON.stringify({ type: 'status', content: 'Site repo path not found.' })); } catch {}
    return;
  }
  syncSiteRepoInProgress = true;
  const finish = () => { syncSiteRepoInProgress = false; if (callback) callback(); };
  const send = (type, content) => { try { ws.send(JSON.stringify({ type, content })); } catch {} };

  const distDir = DIST_DIR();
  const repoPath = repo.path;
  const timestamp = new Date().toISOString().split('T')[0];
  const SKIP = new Set(['.git', '.gitignore', 'README.md', 'CLAUDE.md', 'SITE-LEARNINGS.md']);
  const distFilter = (src) => {
    const rel = path.relative(distDir, src);
    return !rel.startsWith('.versions') && rel !== '_template.html';
  };

  // Step 1: checkout dev and sync dist/
  send('status', `Syncing to site repo (${targetBranch})...`);
  const checkoutDev = spawn('git', ['checkout', 'dev'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
  checkoutDev.stderr.resume();
  checkoutDev.on('close', (devCode) => {
    if (devCode !== 0) { send('error', 'Failed to checkout dev branch.'); finish(); return; }

    // Copy dist/ to repo (clear old files, keep scaffold)
    try {
      const entries = fs.readdirSync(repoPath);
      for (const entry of entries) {
        if (SKIP.has(entry)) continue;
        fs.rmSync(path.join(repoPath, entry), { recursive: true, force: true });
      }
      fs.cpSync(distDir, repoPath, { recursive: true, filter: distFilter });
    } catch (err) {
      send('error', `Failed to copy dist to site repo: ${err.message}`);
      finish(); return;
    }

    // Step 2: git add + commit on dev
    const addChild = spawn('git', ['add', '-A'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
    addChild.stderr.resume();
    addChild.on('close', (addCode) => {
      if (addCode !== 0) { send('error', 'git add failed in site repo.'); finish(); return; }

      let statusOut = '';
      const statusChild = spawn('git', ['status', '--porcelain'], { cwd: repoPath, stdio: ['ignore', 'pipe', 'ignore'] });
      statusChild.stdout.on('data', (chunk) => { statusOut += chunk.toString(); });
      statusChild.on('close', () => {
        const hasChanges = statusOut.trim().length > 0;

        const afterDevCommit = () => {
          // If target is just dev, push dev and done
          if (targetBranch === 'dev') {
            if (repo.remote) {
              const pushChild = spawn('git', ['push', 'origin', 'dev'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
              pushChild.stderr.resume();
              pushChild.on('close', (pushCode) => {
                send(pushCode === 0 ? 'status' : 'error',
                  pushCode === 0 ? 'Pushed to site repo (dev).' : 'Push to dev failed.');
                finish();
              });
            } else {
              send('status', 'Committed to dev (no remote — push manually).');
              finish();
            }
            return;
          }

          // Step 3: merge dev → staging
          send('status', 'Merging dev → staging...');
          const checkoutStaging = spawn('git', ['checkout', 'staging'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
          checkoutStaging.stderr.resume();
          checkoutStaging.on('close', (csCode) => {
            if (csCode !== 0) { send('error', 'Failed to checkout staging branch.'); finish(); return; }
            const mergeToStaging = spawn('git', ['merge', 'dev', '--no-edit'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
            mergeToStaging.stderr.resume();
            mergeToStaging.on('close', (mergeCode) => {
              if (mergeCode !== 0) {
                const abort = spawn('git', ['merge', '--abort'], { cwd: repoPath, stdio: 'ignore' });
                abort.on('close', () => { send('error', 'Merge dev → staging failed — aborted. Manual conflict resolution needed.'); finish(); });
                return;
              }

              // If target is staging, push staging and return to dev
              if (targetBranch === 'staging') {
                if (repo.remote) {
                  const pushChild = spawn('git', ['push', 'origin', 'staging'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
                  pushChild.stderr.resume();
                  pushChild.on('close', (pushCode) => {
                    send(pushCode === 0 ? 'status' : 'error',
                      pushCode === 0 ? 'Pushed to site repo (staging).' : 'Push to staging failed.');
                    // Return to dev branch
                    const backToDev = spawn('git', ['checkout', 'dev'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
                    backToDev.stderr.resume();
                    backToDev.on('close', () => finish());
                  });
                } else {
                  send('status', 'Merged to staging (no remote).');
                  const backToDev = spawn('git', ['checkout', 'dev'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
                  backToDev.stderr.resume();
                  backToDev.on('close', () => finish());
                }
                return;
              }

              // Step 4: merge staging → main (target is 'main')
              send('status', 'Merging staging → main...');
              const checkoutMain = spawn('git', ['checkout', 'main'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
              checkoutMain.stderr.resume();
              checkoutMain.on('close', (cmCode) => {
                if (cmCode !== 0) { send('error', 'Failed to checkout main branch.'); finish(); return; }
                const mergeToMain = spawn('git', ['merge', 'staging', '--no-edit'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
                mergeToMain.stderr.resume();
                mergeToMain.on('close', (mainMergeCode) => {
                  if (mainMergeCode !== 0) {
                    const abort = spawn('git', ['merge', '--abort'], { cwd: repoPath, stdio: 'ignore' });
                    abort.on('close', () => { send('error', 'Merge staging → main failed — aborted. Manual conflict resolution needed.'); finish(); });
                    return;
                  }
                  if (repo.remote) {
                    const pushChild = spawn('git', ['push', 'origin', 'main'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
                    pushChild.stderr.resume();
                    pushChild.on('close', (pushCode) => {
                      send(pushCode === 0 ? 'status' : 'error',
                        pushCode === 0 ? 'Pushed to site repo (main).' : 'Push to main failed.');
                      const backToDev = spawn('git', ['checkout', 'dev'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
                      backToDev.stderr.resume();
                      backToDev.on('close', () => finish());
                    });
                  } else {
                    send('status', 'Merged to main (no remote).');
                    const backToDev = spawn('git', ['checkout', 'dev'], { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
                    backToDev.stderr.resume();
                    backToDev.on('close', () => finish());
                  }
                });
              });
            });
          });
        };

        if (hasChanges) {
          const commitChild = spawn('git', ['commit', '-m', `${targetBranch === 'dev' ? 'WIP' : 'Deploy'}: ${TAG} — ${timestamp}`],
            { cwd: repoPath, stdio: ['ignore', 'ignore', 'pipe'] });
          commitChild.stderr.resume();
          commitChild.on('close', (commitCode) => {
            if (commitCode !== 0) { send('error', 'Commit failed in site repo.'); finish(); return; }
            afterDevCommit();
          });
        } else {
          send('status', 'No new changes to commit.');
          if (targetBranch === 'dev') { finish(); return; }
          afterDevCommit();
        }
      });
    });
  });
}

// --- Run asset-generate script ---
function runAssetGenerate(ws, assetType, description) {
  const scriptPath = path.join(HUB_ROOT, 'scripts', 'asset-generate');
  const args = [TAG, assetType];
  if (description) args.push(description);
  const child = spawn(scriptPath, args, {
    env: process.env,
    cwd: HUB_ROOT,
  });

  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
    ws.send(JSON.stringify({ type: 'status', content: chunk.toString().trim() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[asset]', chunk.toString());
  });

  child.on('close', (code) => {
    if (code === 0) {
      const filename = `${assetType}.svg`;
      ws.send(JSON.stringify({ type: 'assistant', content: `${assetType} generated! Check the preview.` }));
      ws.send(JSON.stringify({ type: 'asset-created', filename, path: `/assets/${filename}` }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: `Generated ${assetType} asset`, at: new Date().toISOString() });
    } else {
      ws.send(JSON.stringify({ type: 'error', content: `Failed to generate ${assetType}. Check logs.` }));
    }
  });
}

// --- Helpers ---
function appendConvo(entry) {
  fs.mkdirSync(SITE_DIR(), { recursive: true });
  // Include session_id from current studio state
  let sessionId = null;
  try {
    const studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
    sessionId = studio.session_count || null;
  } catch {}
  const line = JSON.stringify({ ...entry, tag: TAG, session_id: sessionId }) + '\n';
  fs.appendFileSync(CONVO_FILE(), line);

  // Rolling window — keep last 500 messages to prevent unbounded growth
  try {
    const content = fs.readFileSync(CONVO_FILE(), 'utf8');
    const lines = content.trim().split('\n').filter(Boolean);
    if (lines.length > 600) {
      fs.writeFileSync(CONVO_FILE(), lines.slice(-500).join('\n') + '\n');
    }
  } catch {}
}

// --- Conversation History Helpers ---
// Truncates assistant messages to keep token budget low.
// HTML responses (full page outputs) are replaced with their CHANGES: summary.
function truncateAssistantMessage(content) {
  if (!content) return '';

  // Detect HTML responses
  const isHtmlResponse = content.startsWith('HTML_UPDATE:') ||
                          content.startsWith('MULTI_UPDATE:') ||
                          content.includes('<!DOCTYPE html>');

  if (!isHtmlResponse) {
    // Non-HTML: keep full text but cap at 500 chars
    return content.length > 500 ? content.substring(0, 500) + '...' : content;
  }

  // HTML response: extract CHANGES: section if present
  const changesIdx = content.lastIndexOf('CHANGES:');
  if (changesIdx !== -1) {
    const changes = content.substring(changesIdx + 8).trim();
    return `[Generated HTML] Changes: ${changes.substring(0, 400)}`;
  }

  // Fallback: note which pages were generated
  const pageMatch = content.match(/--- PAGE: (\S+) ---/g);
  if (pageMatch) {
    const pages = pageMatch.map(m => m.replace(/--- PAGE: | ---/g, ''));
    return `[Generated HTML for: ${pages.join(', ')}]`;
  }

  return '[Generated/updated site HTML]';
}

// Loads the last N messages from conversation.jsonl for the current session.
// Drops the last user message (already in the prompt as USER REQUEST).
// Returns a formatted string or empty string if insufficient history.
function loadRecentConversation(count) {
  try {
    if (!fs.existsSync(CONVO_FILE())) return '';
    const lines = fs.readFileSync(CONVO_FILE(), 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length < 2) return '';

    // Get current session ID
    let currentSessionId = null;
    try {
      const studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
      currentSessionId = studio.session_count || null;
    } catch {}

    // Walk backwards, collect recent messages from current session
    const recent = [];
    for (let i = lines.length - 1; i >= 0 && recent.length < count; i--) {
      try {
        const entry = JSON.parse(lines[i]);
        // Only include current session messages
        if (currentSessionId && entry.session_id !== currentSessionId) break;
        if (entry.role === 'user' || entry.role === 'assistant') {
          recent.unshift(entry);
        }
      } catch {}
    }

    if (recent.length < 2) return ''; // Need at least one exchange

    // Skip the very last user message (it's the current request, already in the prompt)
    if (recent.length > 0 && recent[recent.length - 1].role === 'user') {
      recent.pop();
    }

    // Format with truncation for HTML responses
    const formatted = recent.map(m => {
      let content = m.content;
      if (m.role === 'assistant') {
        content = truncateAssistantMessage(content);
      }
      return `[${m.role}]: ${content}`;
    }).join('\n');

    return formatted;
  } catch {
    return '';
  }
}

// Safe Claude CLI spawn — pipes prompt via stdin instead of shell embedding
function spawnClaude(prompt) {
  const model = loadSettings().model || 'claude-sonnet-4-5';
  const env = { ...process.env };
  // Remove ALL Claude Code env vars to prevent nested-session detection.
  // Without this, `claude --print` refuses to run inside a Claude Code session.
  for (const key of Object.keys(env)) {
    if (key.startsWith('CLAUDE_') || key === 'CLAUDECODE') {
      delete env[key];
    }
  }
  // Call claude directly — bypass scripts/claude-cli wrapper which uses relative paths
  // that break when cwd is not HUB_ROOT.
  // Use os.tmpdir() as cwd so claude finds no CLAUDE.md and runs clean.
  const claudeBin = process.env.CLAUDE_BIN || 'claude';
  const child = spawn(claudeBin, ['--print', '--model', model, '--tools', ''], {
    env,
    cwd: require('os').tmpdir(),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.write(prompt);
  child.stdin.end();
  child.on('error', (err) => {
    console.error('[claude-spawn] Error:', err.message);
    // Reset build lock on spawn failure to prevent permanent deadlock
    if (buildInProgress) {
      console.warn('[claude-spawn] Resetting buildInProgress after spawn error');
      buildInProgress = false;
    }
  });
  child.on('close', (code) => {
    if (code !== 0) console.error(`[claude-spawn] Exited with code ${code}`);
  });
  return child;
}

// --- Built-in Preview Server (dynamic, follows site switches) ---
const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webp': 'image/webp',
};

let previewLastMod = Date.now();
function checkPreviewMod() {
  try {
    const dist = DIST_DIR();
    if (!fs.existsSync(dist)) return false;
    const files = fs.readdirSync(dist, { recursive: true });
    for (const f of files) {
      const fp = path.join(dist, String(f));
      try {
        const stat = fs.statSync(fp);
        if (stat.isFile() && stat.mtimeMs > previewLastMod) { previewLastMod = stat.mtimeMs; return true; }
      } catch {}
    }
  } catch {}
  return false;
}

const RELOAD_SCRIPT = `<script>
(function() {
  let last = 0;
  setInterval(async () => {
    try {
      const r = await fetch('/__reload');
      const d = await r.json();
      if (last && d.t > last) location.reload();
      last = d.t;
    } catch {}
  }, 1000);
})();
</` + 'script>';

const previewServer = http.createServer((req, res) => {
  if (req.url === '/__reload') {
    checkPreviewMod();
    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify({ t: previewLastMod }));
    return;
  }

  const dist = DIST_DIR();
  let filePath = path.join(dist, req.url === '/' ? 'index.html' : req.url);
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) filePath += '.html';
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');

  if (!fs.existsSync(filePath)) {
    if (!fs.existsSync(dist) || !fs.existsSync(path.join(dist, 'index.html'))) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!DOCTYPE html><html><body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#94a3b8"><div style="text-align:center"><h2>No pages yet</h2><p>Describe your site in the chat to get started.</p></div>' + RELOAD_SCRIPT + '</body></html>');
      return;
    }
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  let content = fs.readFileSync(filePath);

  if (ext === '.html') {
    content = content.toString().replace('</body>', RELOAD_SCRIPT + '</body>');
  }

  res.writeHead(200, { 'Content-Type': mime });
  res.end(content);
});

// --- Start ---
// Load persisted state
const initialStudio = loadStudio();
if (initialStudio) {
  console.log(`[site-studio] Loaded .studio.json — session #${(initialStudio.session_count || 0) + 1}, current page: ${currentPage}`);
} else {
  console.log('[site-studio] No .studio.json found — fresh project');
}

// Clean up session on process exit
async function gracefulShutdown() {
  await endSession();
  fileWatchers.forEach(w => { try { w.close(); } catch {} });
  wss.clients.forEach(client => {
    try { client.close(1001, 'Server shutting down'); } catch {}
  });
  process.exit(0);
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// --- Exports for testing ---
module.exports = {
  sanitizeSvg, isValidPageName, extractSlotsFromPage, classifyRequest,
  extractBrandColors, labelToFilename, generatePlaceholderSVG, SLOT_DIMENSIONS, retrofitSlotAttributes,
  readBlueprint, writeBlueprint, updateBlueprint, buildBlueprintContext, extractSharedCss, ensureHeadDependencies,
  truncateAssistantMessage, loadRecentConversation,
  extractTemplateComponents, loadTemplateContext, applyTemplateToPages, writeTemplateArtifacts,
  // Verification + auto-fix
  verifySlotAttributes, verifyCssCoherence, verifyCrossPageConsistency,
  verifyHeadDependencies, verifyLogoAndLayout, runBuildVerification,
  autoTagMissingSlots,
  // Visual intelligence
  fileInspect, browserInspect, inspectSite,
  // Expose internals for integration tests
  app, server, wss, readSpec, writeSpec, invalidateSpecCache,
};

// --- File change detection ---
// Watch server files for changes and notify clients when restart is needed
const fileWatchers = [];
function setupFileWatcher() {
  const filesToWatch = [
    path.join(__dirname, 'server.js'),
    path.join(__dirname, 'public', 'index.html'),
  ];
  for (const filePath of filesToWatch) {
    try {
      let debounceTimer = null;
      const watcher = fs.watch(filePath, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const fileName = path.basename(filePath);
          console.log(`[file-watch] ${fileName} changed — restart recommended`);
          wss.clients.forEach(client => {
            try {
              client.send(JSON.stringify({ type: 'restart-needed', file: fileName, timestamp: new Date().toISOString() }));
            } catch {}
          });
        }, 2000);
      });
      fileWatchers.push(watcher);
    } catch (err) {
      console.log(`[file-watch] Could not watch ${path.basename(filePath)}: ${err.message}`);
    }
  }
}

// Start servers only when run directly (not when imported by tests)
if (require.main === module) {
  previewServer.listen(PREVIEW_PORT, () => {
    console.log(`[preview] Live preview at http://localhost:${PREVIEW_PORT} (dynamic, follows site switches)`);
  });

  // Validate the restored TAG before listening — prevents requests hitting a non-existent site dir
  if (!fs.existsSync(path.join(SITES_ROOT, TAG))) {
    console.log(`[site-studio] Last site "${TAG}" not found, falling back to site-demo`);
    TAG = 'site-demo';
  }
  writeLastSite(TAG);

  server.listen(PORT, () => {
    console.log(`[site-studio] Chat UI at http://localhost:${PORT}`);
    console.log(`[site-studio] Site tag: ${TAG}`);
    console.log(`[site-studio] Preview at: http://localhost:${PREVIEW_PORT}`);
    const pages = listPages();
    if (pages.length > 0) {
      console.log(`[site-studio] Pages: ${pages.join(', ')}`);
    }
    setupFileWatcher();
  });
}
