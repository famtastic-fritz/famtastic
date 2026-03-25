const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');

// --- Config ---
const PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const PREVIEW_PORT = parseInt(process.env.PREVIEW_PORT || '3333', 10);
let TAG = process.env.SITE_TAG || 'site-demo';
const RECENT_CONVO_COUNT = 15; // Recent conversation turns to include in prompt context
const HUB_ROOT = path.resolve(__dirname, '..');
const SITES_ROOT = path.join(HUB_ROOT, 'sites');

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
            fs.writeFileSync(SPEC_FILE(), JSON.stringify(_specCache, null, 2));
          }
        }
        if (_specCache.design_decisions && !Array.isArray(_specCache.design_decisions)) {
          console.warn(`[spec] ${TAG}: design_decisions is not an array, resetting`);
          _specCache.design_decisions = [];
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

    // Extract sections — look for <section> with id or class
    const sections = [];
    const sectionMatches = html.matchAll(/<section[^>]*(?:id=["']([^"']+)["']|class=["']([^"']+)["'])[^>]*>/gi);
    for (const m of sectionMatches) {
      const id = m[1] || m[2]?.split(/\s+/)[0] || 'unnamed';
      if (!sections.includes(id)) sections.push(id);
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
  if (origin && !allowed.some(a => origin.startsWith(a))) {
    return res.status(403).json({ error: 'Cross-origin request blocked' });
  }
  next();
});

// Serve spec.json
// Deploy & environment info
app.get('/api/deploy-info', (req, res) => {
  try {
    const spec = readSpec();

    // Detect repo info
    let repo = null;
    try {
      const { execSync } = require('child_process');
      const remoteUrl = execSync('git remote get-url origin 2>/dev/null', { cwd: HUB_ROOT, encoding: 'utf8' }).trim();
      const branch = execSync('git branch --show-current 2>/dev/null', { cwd: HUB_ROOT, encoding: 'utf8' }).trim();
      repo = { url: remoteUrl, branch };
    } catch {}

    // Build environments list
    const environments = [];

    // Local / dev
    environments.push({
      name: 'Local',
      type: 'dev',
      status: 'running',
      url: `http://localhost:${PREVIEW_PORT}`,
      paths: {
        site_dir: SITE_DIR(),
        dist_dir: DIST_DIR(),
        spec_file: SPEC_FILE(),
      },
    });

    // Production (Netlify)
    if (spec.deployed_url) {
      environments.push({
        name: 'Production',
        type: 'production',
        status: spec.state === 'deployed' ? 'live' : 'draft',
        url: spec.deployed_url,
        provider: 'Netlify',
        site_id: spec.netlify_site_id || null,
        custom_domain: spec.custom_domain || null,
      });
    }

    res.json({
      deployed: !!spec.deployed_url,
      url: spec.deployed_url || null,
      site_id: spec.netlify_site_id || null,
      state: spec.state || (spec.deployed_url ? 'deployed' : 'draft'),
      custom_domain: spec.custom_domain || null,
      environments,
      repo,
      local: {
        site_dir: SITE_DIR(),
        dist_dir: DIST_DIR(),
        spec_file: SPEC_FILE(),
      },
    });
  } catch {
    res.json({ deployed: false, environments: [], repo: null, local: {} });
  }
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
  const ignoreEntries = ['_partials/', '.versions/', '.studio.json', 'conversation.jsonl'];
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

      if (!headNormalized.includes(normalized.substring(0, Math.min(80, normalized.length)))) {
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

  for (const page of pages) {
    const filePath = path.join(distDir, page);
    let html = fs.readFileSync(filePath, 'utf8');

    // Remove shared <style> blocks (keep data-page ones)
    html = html.replace(/<style(?![^>]*data-page)[^>]*>[\s\S]*?<\/style>/gi, '');

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

app.post('/api/switch-site', (req, res) => {
  const newTag = req.body.tag;
  if (!newTag) return res.status(400).json({ error: 'tag required' });
  const newSiteDir = path.join(SITES_ROOT, newTag);
  if (!fs.existsSync(newSiteDir)) {
    return res.status(404).json({ error: `Site "${newTag}" not found` });
  }

  // End current session
  endSession();

  // Switch
  TAG = newTag;
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

app.post('/api/new-site', (req, res) => {
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

  // Switch to the new site
  endSession();
  TAG = newTag;
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

app.get('/api/settings', (req, res) => {
  res.json(loadSettings());
});

app.put('/api/settings', (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'JSON body required' });
  const allowedKeys = ['model', 'deploy_target', 'deploy_team', 'preview_port', 'studio_port',
    'max_upload_size_mb', 'max_uploads_per_site', 'auto_summary', 'auto_version', 'max_versions',
    'email', 'sms', 'stock_photo', 'analytics_provider', 'analytics_id', 'brainstorm_profile'];
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

  // Brand health check
  if (lower.match(/\b(check\s+brand|brand\s+health|what'?s?\s+missing|asset\s+checklist|brand\s+check|missing\s+assets)\b/)) return 'brand_health';

  // Brainstorm mode — explore ideas without generating HTML
  if (lower.match(/\b(brainstorm|let'?s?\s+(think|explore|plan\s+more|discuss|ideate)|think\s+about|explore\s+ideas|planning\s+mode)\b/)) return 'brainstorm';

  // Version rollback
  if (lower.match(/\b(rollback|roll\s+back|revert|undo|go\s+back\s+to|restore|previous\s+version)\b/)) return 'rollback';

  // Version history
  if (lower.match(/\b(version|versions|history|changelog|change\s+log)\b/)) return 'version_history';

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
  const decisions = (spec.design_decisions || []).filter(d => d.status === 'approved').slice(-5);
  const pages = listPages();
  const htmlPath = path.join(DIST_DIR(), currentPage);
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

  return { htmlContext, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, conversationHistory, blueprintContext, slotMappingContext };
}

function summarizeHtml(html) {
  // Extract structural summary: sections, key elements, approximate layout
  const sections = [];
  const sectionMatch = html.match(/<(?:section|header|footer|nav|main|div)\s[^>]*(?:id|class)="[^"]*"/g) || [];
  sectionMatch.slice(0, 15).forEach(s => sections.push(s));

  const headings = html.match(/<h[1-6][^>]*>([^<]+)</g) || [];
  const headingText = headings.slice(0, 10).map(h => h.replace(/<h[1-6][^>]*>/, ''));

  const lineCount = html.split('\n').length;

  return `[HTML SUMMARY: ${lineCount} lines]
Sections found: ${sections.length > 0 ? sections.join(', ') : 'none identified'}
Headings: ${headingText.length > 0 ? headingText.join(' | ') : 'none'}
Full source available if needed for precise edits.

FULL HTML:
${html}`;
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
  const decisions = (spec.design_decisions || []).filter(d => d.status === 'approved').slice(-5);
  const decisionsText = decisions.length > 0
    ? decisions.map(d => `- [${d.category}] ${d.decision}`).join('\n')
    : 'none yet';

  // Load session summaries for cross-session context
  const summaries = loadSessionSummaries(3);
  const summaryContext = summaries.length > 0
    ? '\nPREVIOUS SESSION SUMMARIES:\n' + summaries.map(s => s.content).join('\n---\n')
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

USER'S MESSAGE:
"${userMessage}"

Respond following the STYLE guidance above:
- Reference their existing decisions and brief
- Be opinionated but collaborative
- Keep it conversational, not formal

Do NOT output any HTML or suggest code changes. This is pure ideation.`;

  const child = spawnClaude(prompt);
  const bsTimeout = setTimeout(() => { console.error('[brainstorm] Timed out'); child.kill(); }, 180000);

  let response = '';
  child.stdout.on('data', (chunk) => { response += chunk.toString(); });
  child.stderr.on('data', (chunk) => { console.error('[brainstorm]', chunk.toString()); });

  child.on('close', (code) => {
    clearTimeout(bsTimeout);
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

  // Hybrid build strategy:
  // Phase 1 — Build index.html alone to establish the CSS/design language seed.
  // Phase 2 — Extract the <head> styles and <nav> from index.html, inject into all
  //            inner page prompts so they match the design exactly, then launch all
  //            inner pages simultaneously.
  // This gives CSS+nav consistency without losing the parallel speedup for N-1 pages.
  fs.mkdirSync(DIST_DIR(), { recursive: true });

  const writtenPages = [];
  const innerPages = pageFiles.filter(f => f !== 'index.html');
  // If the site has no index.html (unusual), fall back to pure parallel
  const hasSeedPage = pageFiles.includes('index.html');

  function spawnPage(pageFile, extraSeedContext) {
    const content = pageContentGuide[pageFile] || `Content appropriate for a "${pageFile.replace('.html', '').replace(/-/g, ' ')}" page`;
    const pagePrompt = `You are a premium website builder. Generate the ${pageFile} page for a ${specPages.length}-page website.

PAGE TO BUILD: ${pageFile}
PAGE CONTENT: ${content}
All pages in this site: ${allPageLinks}
${buildBlueprintContext(pageFile)}
DESIGN CONSISTENCY: All pages in this site share an identical visual identity — the same nav structure linking to all pages, the same footer, the same CSS custom properties for colors and typography, and the same overall layout style. Build this page's nav and footer to match the design spec precisely. A post-build sync step will harmonize nav/footer across all pages.
${extraSeedContext || ''}
${siteContext}
${sharedRules}`;

    const child = spawnClaude(pagePrompt);
    let pageResponse = '';
    return { child, getResponse: () => pageResponse, appendResponse: (c) => { pageResponse += c; } };
  }

  function spawnInnerPages(seedContext) {
    const pagesLeft = hasSeedPage ? innerPages : pageFiles;
    if (pagesLeft.length === 0) {
      finishParallelBuild(ws, writtenPages, startTime, spec);
      return;
    }

    ws.send(JSON.stringify({ type: 'status', content: `Spawning ${pagesLeft.length} inner pages in parallel...` }));
    let innerCompleted = 0;
    const innerTotal = pagesLeft.length;

    for (const pageFile of pagesLeft) {
      const { child, getResponse, appendResponse } = spawnPage(pageFile, seedContext);

      const pageTimeout = setTimeout(() => {
        console.error(`[parallel-build] ${pageFile} timed out after 5 minutes`);
        child.kill();
        ws.send(JSON.stringify({ type: 'error', content: `Build timed out for ${pageFile} — continuing with other pages.` }));
        innerCompleted++;
        if (innerCompleted === innerTotal) {
          if (writtenPages.length === 0) {
            buildInProgress = false;
            ws.send(JSON.stringify({ type: 'error', content: 'All pages timed out. Check Claude CLI and try again.' }));
          } else {
            finishParallelBuild(ws, writtenPages, startTime, spec);
          }
        }
      }, 300000);

      child.stdout.on('data', (chunk) => { appendResponse(chunk.toString()); });
      child.stderr.on('data', (chunk) => { console.error(`[parallel-build:${pageFile}]`, chunk.toString()); });

      child.on('close', (code) => {
        clearTimeout(pageTimeout);
        innerCompleted++;
        const total = (hasSeedPage ? 1 : 0) + innerTotal;
        const overallCompleted = writtenPages.length + innerCompleted;
        const response = getResponse().trim().replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');

        if (code === 0 && response.length > 50) {
          versionFile(pageFile, 'build');
          fs.writeFileSync(path.join(DIST_DIR(), pageFile), response);
          writtenPages.push(pageFile);
          console.log(`[parallel-build] ${pageFile} done (${response.length} bytes)`);
          ws.send(JSON.stringify({ type: 'status', content: `${pageFile} built (${overallCompleted}/${total} — ${Math.round((Date.now() - startTime) / 1000)}s)` }));
        } else {
          console.error(`[parallel-build] ${pageFile} failed (code ${code}, ${response.length} bytes)`);
          ws.send(JSON.stringify({ type: 'status', content: `${pageFile} failed — will retry on next build` }));
        }

        if (innerCompleted === innerTotal) {
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

  if (!hasSeedPage) {
    // No index.html — pure parallel, no seed available
    ws.send(JSON.stringify({ type: 'status', content: `Spawning all ${pageFiles.length} pages in parallel...` }));
    spawnInnerPages('');
    return;
  }

  // Phase 1: Build index.html to establish CSS/design seed
  ws.send(JSON.stringify({ type: 'status', content: 'Building index.html to establish design language...' }));
  const { child: seedChild, getResponse: getSeedResponse, appendResponse: appendSeedResponse } = spawnPage('index.html', '');

  const seedTimeout = setTimeout(() => {
    console.error('[parallel-build] index.html (seed) timed out — falling back to no-seed parallel build');
    seedChild.kill();
    ws.send(JSON.stringify({ type: 'error', content: 'index.html timed out — building remaining pages without CSS seed.' }));
    spawnInnerPages('');
  }, 300000);

  seedChild.stdout.on('data', (chunk) => { appendSeedResponse(chunk.toString()); });
  seedChild.stderr.on('data', (chunk) => { console.error('[parallel-build:index.html]', chunk.toString()); });

  seedChild.on('close', (code) => {
    clearTimeout(seedTimeout);
    const seedHtml = getSeedResponse().trim().replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');

    if (code === 0 && seedHtml.length > 50) {
      versionFile('index.html', 'build');
      fs.writeFileSync(path.join(DIST_DIR(), 'index.html'), seedHtml);
      writtenPages.push('index.html');
      ws.send(JSON.stringify({ type: 'status', content: `index.html built (1/${pageFiles.length} — ${Math.round((Date.now() - startTime) / 1000)}s) — seeding inner pages...` }));

      // Extract CSS seed: shared <style> blocks and nav HTML from index.html
      const headMatch = seedHtml.match(/<head[\s\S]*?<\/head>/i);
      const navMatch = seedHtml.match(/<nav[\s\S]*?<\/nav>/i);

      let cssBlocks = '';
      if (headMatch) {
        const sharedStyles = headMatch[0].match(/<style(?![^>]*data-page)[^>]*>[\s\S]*?<\/style>/gi);
        if (sharedStyles) cssBlocks = sharedStyles.join('\n');
      }

      const navHtml = navMatch ? navMatch[0] : '';
      let seedContext = '';
      if (cssBlocks) {
        seedContext += `\nCSS SEED (copy these exact styles into your <head> — do not invent new color values or font stacks):\n${cssBlocks}\n`;
      }
      if (navHtml) {
        seedContext += `\nNAV SEED (use this exact nav HTML — preserve all class names, links, and structure):\n${navHtml}\n`;
      }

      // Phase 2: All inner pages in parallel with the CSS/nav seed
      spawnInnerPages(seedContext);
    } else {
      console.error(`[parallel-build] index.html failed (code ${code}) — building remaining pages without CSS seed`);
      ws.send(JSON.stringify({ type: 'status', content: 'index.html failed — building remaining pages without CSS seed.' }));
      spawnInnerPages('');
    }
  });
}

// --- Unified Post-Processing Pipeline ---
// Replaces 3 inline pipelines with a single function
function runPostProcessing(ws, writtenPages, options = {}) {
  const { isFullBuild = false, sourcePage = null } = options;

  // Always safe — metadata only
  updateBlueprint(writtenPages);
  injectSeoMeta(ws);

  // Slot mappings — always re-apply, then clean up orphans
  reapplySlotMappings(writtenPages);
  reconcileSlotMappings();

  // Logo variant — swap data-logo-v content based on whether assets/logo.{ext} exists
  applyLogoV(writtenPages);

  if (isFullBuild) {
    // Full build: extract slots, sync everything from index.html
    extractAndRegisterSlots(writtenPages);

    // Refresh nav partial from freshly built index.html before syncing
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
  } else if (sourcePage) {
    // Single-page edit: propagate FROM this page, skip overwriting it
    syncNavFromPage(ws, sourcePage);
    syncFooterFromPage(ws, sourcePage);
    // NO extractSharedCss — don't strip inline styles on chat edits
    // NO syncHeadSection — don't mess with head on single edits
    // Rescan the edited page so new slots (e.g. about-hero) get registered in media_specs
    extractAndRegisterSlots(writtenPages);
  }
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

  const msg = `Site built! ${writtenPages.length} pages in ${elapsed}s: ${writtenPages.join(', ')}`;
  ws.send(JSON.stringify({ type: 'assistant', content: msg }));
  ws.send(JSON.stringify({ type: 'reload-preview' }));
  ws.send(JSON.stringify({ type: 'pages-updated', pages: writtenPages }));
  appendConvo({ role: 'assistant', content: msg, at: new Date().toISOString() });
  saveStudio();
}

// --- Enhanced Chat Handler ---
function handleChatMessage(ws, userMessage, requestType, spec) {
  // Concurrent build guard — prevent parallel Claude calls
  if (buildInProgress) {
    ws.send(JSON.stringify({ type: 'chat', content: 'A build is already in progress. Please wait for it to finish before sending another request.' }));
    return;
  }
  buildInProgress = true;

  ws.send(JSON.stringify({ type: 'status', content: 'Reading site spec...' }));

  const { htmlContext, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, conversationHistory, blueprintContext, slotMappingContext } = buildPromptContext(requestType, spec, userMessage);

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
    case 'restyle':
      modeInstruction = 'The user wants a VISUAL RESTYLE. Change the aesthetic feel while preserving content and core structure. Update the design language holistically.';
      break;
    case 'build':
      if (isMultiPage) {
        // Parallel build — handled separately
        ws.send(JSON.stringify({ type: 'status', content: `Parallel build: ${specPages.length} pages...` }));
        buildInProgress = false; // Release guard — parallelBuild manages its own
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

SITE SPEC:
${JSON.stringify({ site_name: spec.site_name, business_type: spec.business_type, colors: spec.colors, tone: spec.tone, fonts: spec.fonts }, null, 2)}

CURRENT SITE:
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
Just respond as text.

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
  const child = spawnClaude(prompt);

  // 5-minute timeout — kill hung Claude CLI, reset build guard
  const buildTimeout = setTimeout(() => {
    console.error('[claude] Build timed out after 5 minutes, killing process');
    child.kill();
    buildInProgress = false;
    try { ws.send(JSON.stringify({ type: 'error', content: 'Build timed out after 5 minutes. The Claude CLI may be unresponsive. Try again or check your network.' })); } catch {}
  }, 300000);

  let response = '';
  let firstChunk = true;
  let pagesDetected = 0;

  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
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

  child.on('close', (code) => {
    clearTimeout(buildTimeout);
    buildInProgress = false;

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
  });
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

wss.on('connection', (ws) => {
  console.log('[studio] Client connected');

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

  // Start a new session
  startSession();

  ws.on('message', async (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    try {

    if (msg.type === 'chat') {
      const userMessage = msg.content;
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
        const buildPatterns = /\b(i'?m\s+ready\s+to\s+build|let'?s?\s+(implement|build|do\s+it|make\s+it)|build\s+this|start\s+building)\b/;
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

        // Stay in brainstorm — skip classifier entirely
        console.log(`[mode] Brainstorm mode active — routing directly to handleBrainstorm`);
        handleBrainstorm(ws, userMessage, spec);
        return;
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
          const isProd = userMessage.toLowerCase().includes('prod') || userMessage.toLowerCase().includes('production') || userMessage.toLowerCase().includes('live');
          ws.send(JSON.stringify({ type: 'status', content: `Deploying ${isProd ? '(production)' : '(draft)'}...` }));
          runDeploy(ws, isProd);
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
        const currentSpec = readSpec();
        const updated = { ...currentSpec, ...msg.updates };
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

  ws.on('close', async () => {
    console.log('[studio] Client disconnected');
    await endSession(ws);
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
function runDeploy(ws, isProd) {
  const args = [path.join(HUB_ROOT, 'scripts', 'site-deploy'), TAG];
  if (isProd) args.push('--prod');
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
      ws.send(JSON.stringify({ type: 'assistant', content: `Site deployed!\n\nURL: ${urlMatch[0]}\n\nUse "fam-hub site domain ${TAG} yourdomain.com" to connect a custom domain.` }));
    } else if (code === 0) {
      ws.send(JSON.stringify({ type: 'assistant', content: 'Deploy completed. Check the output above for the URL.' }));
    } else {
      ws.send(JSON.stringify({ type: 'error', content: 'Deploy failed. You may need to run "netlify login" first.' }));
    }
    appendConvo({ role: 'assistant', content: `Deploy ${code === 0 ? 'succeeded' : 'failed'}: ${urlMatch ? urlMatch[0] : 'see logs'}`, at: new Date().toISOString() });
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
  const env = { ...process.env, MODEL: loadSettings().model };
  // Ensure CLAUDECODE is unset to prevent nested-session guard
  delete env.CLAUDECODE;
  const child = spawn(path.join(HUB_ROOT, 'scripts', 'claude-cli'), [], {
    env,
    cwd: HUB_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.write(prompt);
  child.stdin.end();
  child.on('error', (err) => console.error('[claude-spawn] Error:', err.message));
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
  // Expose internals for integration tests
  app, server, wss, readSpec, writeSpec, invalidateSpecCache,
};

// Start servers only when run directly (not when imported by tests)
if (require.main === module) {
  previewServer.listen(PREVIEW_PORT, () => {
    console.log(`[preview] Live preview at http://localhost:${PREVIEW_PORT} (dynamic, follows site switches)`);
  });

  server.listen(PORT, () => {
    console.log(`[site-studio] Chat UI at http://localhost:${PORT}`);
    console.log(`[site-studio] Site tag: ${TAG}`);
    console.log(`[site-studio] Preview at: http://localhost:${PREVIEW_PORT}`);
    const pages = listPages();
    if (pages.length > 0) {
      console.log(`[site-studio] Pages: ${pages.join(', ')}`);
    }
  });
}
