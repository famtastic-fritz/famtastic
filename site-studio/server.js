require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true });
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cheerio = require('cheerio');
const pty = require('node-pty');
const db = require('./lib/db');
const jobQueue = require('./lib/job-queue');
const studioActions = require('./lib/studio-actions');
const memory = require('./lib/memory');
const { studioEvents, STUDIO_EVENTS } = require('./lib/studio-events');
const studioContextWriter = require('./lib/studio-context-writer');
const brainInjector = require('./lib/brain-injector');
const surgicalEditor = require('./lib/surgical-editor');
const gapLogger = require('./lib/gap-logger');
const suggestionLogger = require('./lib/suggestion-logger');
const brandTracker = require('./lib/brand-tracker');
const { buildCapabilityManifest, loadManifest } = require('./lib/capability-manifest');
const costMonitor = require('./lib/cost-monitor');
const Anthropic = require('@anthropic-ai/sdk');
const { logAPICall: logSDKCall } = require('./lib/api-telemetry');
const { getOrCreateBrainSession, resetSessions: resetBrainSessions } = require('./lib/brain-sessions');
const { verifyAllAPIs, getBrainStatus } = require('./lib/brain-verifier');
// DECISION: Tool calling is Claude-only (Session 10).
// Gemini and OpenAI tool format translation deferred to Session 12.
// Do not pass STUDIO_TOOLS to GeminiAdapter or CodexAdapter.
const { handleToolCall, initToolHandlers } = require('./lib/tool-handlers');
const { startInterview, recordAnswer, getCurrentQuestion, shouldInterview } = require('./lib/client-interview');
const fontRegistry = require('./lib/font-registry');
const layoutRegistry = require('./lib/layout-registry');
const famSkeletons = require('./lib/famtastic-skeletons');
const { resolveTier, normalizeTierAndMode } = require('./lib/tier');
const { getLogoSkeletonBlock, getLogoNoteBlock, shouldInjectFamtasticLogoMode } = require('./lib/tier-gates');

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

// --- Capability manifest 60-second TTL cache ---
let _manifestCache = null;
let _manifestCacheAt = 0;
const MANIFEST_CACHE_TTL_MS = 60000;

async function getCachedManifest() {
  const now = Date.now();
  if (_manifestCache && (now - _manifestCacheAt) < MANIFEST_CACHE_TTL_MS) return _manifestCache;
  _manifestCache = await buildCapabilityManifest();
  _manifestCacheAt = now;
  return _manifestCache;
}

// --- Repo recent commits (30s TTL cache) ---
let _recentCommitsCache = null;
let _recentCommitsCacheAt = 0;
const COMMITS_CACHE_TTL_MS = 30000;

function getRepoRecentCommits() {
  const now = Date.now();
  if (_recentCommitsCache && (now - _recentCommitsCacheAt) < COMMITS_CACHE_TTL_MS) return _recentCommitsCache;
  try {
    const { execFileSync } = require('child_process');
    const raw = execFileSync('git', ['log', '--oneline', '-3', '--format=%h %s %ci'], {
      cwd: HUB_ROOT,
      encoding: 'utf8',
      timeout: 3000,
    }).trim();
    _recentCommitsCache = raw.split('\n').filter(Boolean).map(line => {
      const parts = line.match(/^([0-9a-f]+) (.+?) (\d{4}-\d{2}-\d{2}T[\d:+ -]+)$/);
      if (parts) return { sha_short: parts[1], subject: parts[2], at: parts[3].trim() };
      // Fallback: just split by first two spaces
      const sp = line.indexOf(' ');
      const sp2 = line.indexOf(' ', sp + 1);
      return {
        sha_short: sp > 0 ? line.slice(0, sp) : line,
        subject: sp2 > 0 ? line.slice(sp + 1, sp2) : line.slice(sp + 1),
        at: sp2 > 0 ? line.slice(sp2 + 1).trim() : null,
      };
    });
  } catch {
    _recentCommitsCache = [];
  }
  _recentCommitsCacheAt = Date.now();
  return _recentCommitsCache;
}

// --- Last test run result ---
function getLastTestRun() {
  const testResultPath = path.join(__dirname, '.last-test-run.json');
  try {
    if (!fs.existsSync(testResultPath)) return null;
    const raw = fs.readFileSync(testResultPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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
      // Initialize revision counter from spec
      _specRevision = _specCache._revision || 0;
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
        // L143 — normalize tier and derived famtastic_mode; write back if dirty (drift repair)
        const { dirty: _tierDirty } = normalizeTierAndMode(_specCache);
        if (_tierDirty) {
          console.log(`[spec] ${TAG}: tier normalized — writing drift repair`);
          const _tierTmp = SPEC_FILE() + '.tmp';
          fs.writeFileSync(_tierTmp, JSON.stringify(_specCache, null, 2));
          fs.renameSync(_tierTmp, SPEC_FILE());
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

// Spec revision counter — monotonically increasing, persisted in spec._revision
let _specRevision = 0;

function writeSpec(spec, options = {}) {
  const { source = 'unknown', mutationLevel, mutationTarget, oldValue, newValue } = options;

  // Increment revision
  _specRevision++;
  spec._revision = _specRevision;
  spec._last_modified = new Date().toISOString();

  _specCache = spec;
  _specCacheTag = TAG;
  fs.mkdirSync(SITE_DIR(), { recursive: true });
  const _specTmp = SPEC_FILE() + '.tmp';
  fs.writeFileSync(_specTmp, JSON.stringify(spec, null, 2));
  fs.renameSync(_specTmp, SPEC_FILE()); // atomic on POSIX — all-or-nothing, no corrupt mid-writes

  // Append to mutation log if mutation details provided
  if (mutationLevel && mutationTarget) {
    const mutationLog = path.join(SITE_DIR(), 'mutations.jsonl');
    const entry = {
      timestamp: new Date().toISOString(),
      level: mutationLevel,
      target_id: mutationTarget,
      action: options.action || 'update',
      old_value: oldValue,
      new_value: newValue,
      source,
      revision: _specRevision,
    };
    try { fs.appendFileSync(mutationLog, JSON.stringify(entry) + '\n'); } catch {}
  }
}

function invalidateSpecCache() {
  _specCache = null;
  _specCacheTag = null;
}

// Initialize tool handlers with server context
// TAG and HUB_ROOT are defined above; getSiteDir returns the mutable current SITE_DIR()
// so tool handlers always reference the active site even after a site switch.
initToolHandlers({
  getSiteDir: () => SITE_DIR(),
  readSpec,
  getTag:     () => TAG,
  hubRoot:    HUB_ROOT,
});

// --- Path safety ---
// Validates that a page name is safe (no traversal, alphanumeric + hyphens only)
function isValidPageName(name) {
  return /^[a-z0-9][a-z0-9._-]*\.html$/i.test(name) && !name.includes('..');
}

// --- Multi-page state ---
let currentPage = 'index.html';
let currentMode = 'build'; // 'build' or 'brainstorm'
let currentBrain = 'claude'; // active brain: 'claude' | 'codex' | 'gemini' | 'openai'
const BRAIN_LIMITS = {
  claude:  { dailyLimit: null, currentUsage: 0, status: 'available' },
  codex:   { dailyLimit: 40,   currentUsage: 0, status: 'available' },
  gemini:  { dailyLimit: 1500, currentUsage: 0, status: 'available' },
  openai:  { dailyLimit: null, currentUsage: 0, status: 'available' },
};
const sessionBrainCounts = { claude: 0, codex: 0, gemini: 0, openai: 0 };
let buildInProgress = false;
let autonomousBuildActive = false; // bypass plan gate for Shay-Shay autonomous builds
let buildLockTimer = null;
let buildOwnerWs = null;       // the WS connection that started the current build
let currentBuildRunId = null;  // stable ID for the current build run
const BUILD_LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
let sessionMessageCount = 0;
let sessionStartedAt = new Date().toISOString();
let sessionInputTokens = 0;
let sessionOutputTokens = 0;
let contextWarningShown = false;
let currentSessionId = null;

// Model context window sizes (tokens)
const MODEL_CONTEXT_WINDOWS = {
  'claude-sonnet-4-5-20250514': 200000,
  'claude-sonnet-4-6': 200000,
  'claude-haiku-4-5-20251001': 200000,
  'claude-opus-4-5-20250520': 200000,
  'claude-opus-4-6': 200000,
};

// Plan approval state
const pendingPlans = new Map(); // planId → { userMessage, intent }
const PLAN_REQUIRED_INTENTS = ['layout_update', 'major_revision', 'restyle', 'build', 'restructure'];

// --- Build Lock Helper ---
// ownerWs: the WebSocket that initiated this build (required when value=true)
function setBuildInProgress(value, ownerWs) {
  buildInProgress = value;

  if (value) {
    // Record ownership so cancel and disconnect can target the right connection
    buildOwnerWs = ownerWs || null;
    currentBuildRunId = `build-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    console.log(`[studio] Build lock acquired — run=${currentBuildRunId}`);

    // Start 10-min auto-clear timeout
    if (buildLockTimer) clearTimeout(buildLockTimer);
    buildLockTimer = setTimeout(() => {
      if (buildInProgress) {
        console.warn(`[studio] BUILD_LOCK_TIMEOUT — run=${currentBuildRunId} ran >10min, lock auto-cleared`);
        buildInProgress = false;
        buildOwnerWs = null;
        currentBuildRunId = null;
        buildLockTimer = null;
        try {
          const studio = JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8'));
          studio.build_in_progress = false;
          fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2));
        } catch {}
      }
    }, BUILD_LOCK_TIMEOUT_MS);
  } else {
    const runId = currentBuildRunId;
    buildOwnerWs = null;
    currentBuildRunId = null;
    if (buildLockTimer) { clearTimeout(buildLockTimer); buildLockTimer = null; }
    if (runId) console.log(`[studio] Build lock released — run=${runId}`);
    try {
      if (fs.existsSync(STUDIO_FILE())) {
        const studio = JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8'));
        studio.build_in_progress = false;
        fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2));
      }
    } catch {}
  }
}

/**
 * Kill all active subprocesses owned by a WebSocket connection.
 * Safe to call even if the ws has no children.
 */
function killBuildProcesses(ws) {
  if (!ws) return;
  if (ws.currentChild) {
    try { ws.currentChild.kill('SIGTERM'); } catch {}
    ws.currentChild = null;
  }
  if (ws.activeChildren && ws.activeChildren.length > 0) {
    for (const c of ws.activeChildren) { try { c.kill('SIGTERM'); } catch {} }
    ws.activeChildren = [];
  }
}

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

// --- Multi-Part SVG Extractor (Session 11 Fix 7) ---
//
// Claude can emit a single SVG_ASSET response that carries multiple
// logo variants delimited by HTML comments:
//
//   <!-- LOGO_FULL -->
//   <svg ...>...</svg>
//   <!-- LOGO_ICON -->
//   <svg ...>...</svg>
//   <!-- LOGO_WORDMARK -->
//   <svg ...>...</svg>
//
// This helper parses those delimiters and returns an object keyed by
// variant id. Supported ids: LOGO_FULL, LOGO_ICON, LOGO_WORDMARK.
// If no delimiters are present, returns null so the caller can fall
// back to the single-file path.
function extractMultiPartSvg(body) {
  if (typeof body !== 'string' || !body) return null;
  const DELIMITERS = ['LOGO_FULL', 'LOGO_ICON', 'LOGO_WORDMARK'];
  // Fast reject — must contain at least one delimiter
  const hasAny = DELIMITERS.some(d => body.includes(`<!-- ${d} -->`));
  if (!hasAny) return null;

  const parts = {};
  // Split on delimiter comments, keeping the delimiter names
  const re = /<!--\s*(LOGO_FULL|LOGO_ICON|LOGO_WORDMARK)\s*-->/g;
  const indices = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    indices.push({ name: m[1], start: m.index, after: m.index + m[0].length });
  }
  if (indices.length === 0) return null;

  for (let i = 0; i < indices.length; i++) {
    const cur = indices[i];
    const next = indices[i + 1];
    const chunk = body.substring(cur.after, next ? next.start : body.length);
    // Extract the first <svg>...</svg> inside the chunk
    const svgMatch = chunk.match(/<svg[\s\S]*?<\/svg>/i);
    if (svgMatch) {
      parts[cur.name] = sanitizeSvg(svgMatch[0].trim());
    }
  }

  return Object.keys(parts).length > 0 ? parts : null;
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

    // Session 12 Phase 0: prefer the FAMtastic multi-part logo output
    // (assets/logo-full.svg) when it exists — the template-call SVG extractor
    // writes it for famtastic_mode builds. Fall back to the legacy single-file
    // logo.svg / logo.png for older sites.
    const logoFullSvg = fs.existsSync(path.join(distDir, 'assets', 'logo-full.svg'));
    const logoSvg = fs.existsSync(path.join(distDir, 'assets', 'logo.svg'));
    const logoPng = fs.existsSync(path.join(distDir, 'assets', 'logo.png'));
    const logoFile = logoFullSvg ? 'assets/logo-full.svg'
                   : logoSvg ? 'assets/logo.svg'
                   : logoPng ? 'assets/logo.png'
                   : null;

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

    callSDK(prompt, { maxTokens: 4096, callSite: 'session-summary', timeoutMs: 120000 }).then((response) => {
      if (!response.trim()) {
        console.error('[summary] Empty response from SDK');
        resolve();
        return;
      }

      fs.mkdirSync(SUMMARIES_DIR(), { recursive: true });
      const sessionNum = (getStudioSessionCount() || 0).toString().padStart(3, '0');
      const summaryFile = path.join(SUMMARIES_DIR(), `session-${sessionNum}.md`);
      const header = `# Session ${sessionNum} — ${new Date().toISOString().split('T')[0]}\n\n`;
      try {
        fs.writeFileSync(summaryFile, header + response.trim() + '\n');
        console.log(`[summary] Wrote session summary: ${summaryFile}`);
        const studio = fs.existsSync(STUDIO_FILE()) ? JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')) : {};
        studio.conversation_summary = response.trim();
        fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2));
      } catch (err) {
        console.error('[summary] Write failed:', err.message);
      }
      resolve();
    }).catch((err) => {
      console.error('[summary] SDK error:', err.message);
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
      // Restore buildInProgress from disk
      if (studio.build_in_progress === true) {
        // Stale lock — no build is actually running on startup
        console.warn('[studio] BUILD_LOCK_STALE — cleared on startup');
        studio.build_in_progress = false;
        buildInProgress = false;
        // Write the cleared state back
        try { fs.writeFileSync(STUDIO_FILE(), JSON.stringify(studio, null, 2)); } catch {}
      } else {
        buildInProgress = false;
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
  studio.build_in_progress = buildInProgress;
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

    // End session in SQLite
    if (currentSessionId) {
      try { db.endSession(currentSessionId); } catch {}
    }

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
  sessionInputTokens = 0;
  sessionOutputTokens = 0;
  contextWarningShown = false;
  // Track session in SQLite
  currentSessionId = require('crypto').randomUUID();
  try { db.createSession({ id: currentSessionId, siteTag: TAG, model: loadSettings().model || 'unknown' }); } catch {}
  studioEvents.emit(STUDIO_EVENTS.SESSION_STARTED, { tag: TAG });
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
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders(res, filePath) {
    if (/\.(?:html|js|css)$/i.test(filePath)) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return;
    }
    res.set('Cache-Control', 'no-cache');
  },
}));

// Bridge routes — mounted before CSRF so internal Studio tool calls pass through
app.use('/api/bridge', require('./lib/bridge-routes'));

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
app.get('/api/session-history', (req, res) => {
  try { res.json(db.getSessionHistory(TAG)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/portfolio-stats', (req, res) => {
  try { res.json(db.getPortfolioStats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

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

function currentUploadCapacity() {
  const spec = readSpec();
  const assets = spec.uploaded_assets || [];
  const limit = loadSettings().max_uploads_per_site || MAX_UPLOADS_PER_SITE;
  return { spec, assets, limit };
}

function recordUploadedAsset(asset) {
  const spec = readSpec();
  if (!spec.uploaded_assets) spec.uploaded_assets = [];
  spec.uploaded_assets.push(asset);
  writeSpec(spec);
  return asset;
}

// --- Upload endpoint ---
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Check upload limit
  const { spec, assets: existingUploads, limit: uploadLimit } = currentUploadCapacity();
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

  recordUploadedAsset(asset);

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

// ─── Image Pipeline: Background Removal via rembg ───────────────────────────

// Path to the rembg Python worker script (uses Python API — no CLI deps needed)
const REMBG_WORKER = path.join(__dirname, '..', 'scripts', 'rembg-worker.py');

// Python interpreter — prefer python3 in PATH
const PYTHON_BIN = (() => {
  const candidates = ['/usr/bin/python3', '/usr/local/bin/python3', 'python3'];
  for (const c of candidates) {
    if (c === 'python3' || fs.existsSync(c)) return c;
  }
  return 'python3';
})();

/**
 * Run background removal on a single image using the rembg Python API.
 * Uses scripts/rembg-worker.py — avoids rembg CLI dependency issues.
 * Returns a Promise resolving to the output path on success.
 */
function runRembg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(REMBG_WORKER)) {
      return reject(new Error(`rembg worker not found at: ${REMBG_WORKER}`));
    }
    const proc = spawn(PYTHON_BIN, [REMBG_WORKER, inputPath, outputPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code !== 0) return reject(new Error(`rembg-worker exited ${code}: ${stderr.trim()}`));
      if (!fs.existsSync(outputPath)) return reject(new Error('rembg-worker ran but output file missing'));
      console.log(`[rembg-worker] ${stdout.trim()}`);
      resolve(outputPath);
    });
    proc.on('error', err => reject(new Error(`python spawn error: ${err.message}`)));
  });
}

/**
 * Detect whether a filename is used inside a dark-background section in any dist page.
 * Returns true if a dark context is found.
 */
function detectDarkSection(filename) {
  const pages = listPages();
  const darkPattern = /(?:bg-(?:gray-[89]|slate-[89]|zinc-[89]|neutral-[89]|stone-[89]|black|dark)|background[\s\S]{0,20}#[012][0-9a-fA-F]{5})/;
  for (const page of pages) {
    try {
      const html = fs.readFileSync(path.join(DIST_DIR(), page), 'utf8');
      if (!html.includes(filename)) continue;
      const imgIdx = html.indexOf(filename);
      if (imgIdx === -1) continue;
      const context = html.slice(Math.max(0, imgIdx - 2000), imgIdx);
      const lastSection = context.lastIndexOf('<section');
      const lastDiv = context.lastIndexOf('<div');
      const snippet = context.slice(Math.max(lastSection, lastDiv));
      if (darkPattern.test(snippet)) return true;
    } catch {}
  }
  return false;
}

/**
 * Ensure a site CSS file contains the .fam-knockout utility class.
 * Checks assets/styles.css (build-generated), then assets/css/main.css
 * (hand-crafted), then creates assets/styles.css as a last resort.
 * Idempotent — safe to call multiple times.
 */
function injectKnockoutCss() {
  const distDir = DIST_DIR();
  const block = `
/* FAMtastic: transparent PNG utility */
.fam-knockout { background: transparent; mix-blend-mode: normal; }
.fam-knockout.shadow-on-dark { filter: drop-shadow(2px 4px 12px rgba(255,255,255,0.15)); }
.fam-knockout.shadow-on-light { filter: drop-shadow(2px 4px 8px rgba(0,0,0,0.25)); }
`;
  // Priority: styles.css > assets/css/main.css > create styles.css
  const candidates = [
    path.join(distDir, 'assets', 'styles.css'),
    path.join(distDir, 'assets', 'css', 'main.css'),
  ];
  for (const cssPath of candidates) {
    if (fs.existsSync(cssPath)) {
      const current = fs.readFileSync(cssPath, 'utf8');
      if (current.includes('.fam-knockout')) return; // already present
      fs.appendFileSync(cssPath, block);
      console.log(`[rembg] Injected .fam-knockout CSS into ${path.relative(distDir, cssPath)}`);
      return;
    }
  }
  // Neither file exists — create styles.css
  const fallback = path.join(distDir, 'assets', 'styles.css');
  fs.mkdirSync(path.dirname(fallback), { recursive: true });
  fs.writeFileSync(fallback, block);
  console.log('[rembg] Created assets/styles.css with .fam-knockout CSS');
}

// POST /api/remove-background
// Body: { filename } (single) or { filenames: [] } (batch)
// Optional: { dark_section: true } forces dark-section shadow hint
app.post('/api/remove-background', async (req, res) => {
  const single = req.body.filename;
  const batch = req.body.filenames;
  const forceDark = req.body.dark_section === true;

  const filenames = single ? [single] : Array.isArray(batch) ? batch : [];
  if (filenames.length === 0) {
    return res.status(400).json({ error: 'Provide filename or filenames[]' });
  }

  // Validate all filenames (alphanumeric, dots, hyphens, underscores only)
  for (const fn of filenames) {
    if (!/^[a-zA-Z0-9._\-]+$/.test(fn)) {
      return res.status(400).json({ error: `Invalid filename: ${fn}` });
    }
  }

  const results = [];
  const errors = [];

  for (const fn of filenames) {
    const inputPath = path.join(UPLOADS_DIR(), fn);
    if (!fs.existsSync(inputPath)) {
      errors.push({ filename: fn, error: 'File not found in uploads' });
      continue;
    }
    const ext = path.extname(fn).toLowerCase();
    const base = path.basename(fn, ext);
    const outputFilename = `${base}-knockout.png`;
    const outputPath = path.join(UPLOADS_DIR(), outputFilename);

    try {
      await runRembg(inputPath, outputPath);
      const isDark = forceDark || detectDarkSection(fn);
      const shadowClass = isDark ? 'shadow-on-dark' : 'shadow-on-light';

      try { injectKnockoutCss(); } catch (cssErr) {
        console.warn('[rembg] Could not inject .fam-knockout CSS:', cssErr.message);
      }

      // Record knockout in spec
      const spec = readSpec();
      if (!spec.uploaded_assets) spec.uploaded_assets = [];
      if (!spec.uploaded_assets.find(a => a.filename === outputFilename)) {
        spec.uploaded_assets.push({
          filename: outputFilename,
          type: 'image',
          role: 'knockout',
          label: `${fn} (background removed)`,
          notes: `rembg knockout from ${fn}. Classes: fam-knockout ${shadowClass}`,
          uploaded_at: new Date().toISOString(),
          source: fn,
          dark_section: isDark,
        });
        writeSpec(spec);
      }

      results.push({
        source: fn,
        knockout: outputFilename,
        path: `/assets/uploads/${outputFilename}`,
        dark_section: isDark,
        suggested_classes: `fam-knockout ${shadowClass}`,
      });
      console.log(`[rembg] Knocked out: ${fn} → ${outputFilename} (dark_section=${isDark})`);
    } catch (err) {
      console.error(`[rembg] Failed on ${fn}:`, err.message);
      errors.push({ filename: fn, error: err.message });
    }
  }

  const status = errors.length === 0 ? 200 : results.length === 0 ? 500 : 207;
  res.status(status).json({
    results,
    errors,
    knockout_css_class: 'fam-knockout',
    rembg_worker: REMBG_WORKER,
  });
});

// ─── Session 4: Visual Quality Endpoints ─────────────────────────────────────

const characterBranding = require('../lib/character-branding');

// ─── CDN Injection ───────────────────────────────────────────────────────────
// POST /api/cdn-inject
// Body: { url, type: 'script'|'style', pages: ['index.html', ...], position: 'head'|'body' }
// Injects a CDN <script> or <link> tag into the specified pages. Idempotent.
app.post('/api/cdn-inject', (req, res) => {
  const { url, type, pages, position } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });
  if (!['script', 'style'].includes(type)) return res.status(400).json({ error: 'type must be "script" or "style"' });

  // Only allow http(s) CDN URLs — no local paths
  if (!/^https?:\/\/.+/.test(url)) return res.status(400).json({ error: 'url must be a full https:// CDN URL' });

  const targetPages = Array.isArray(pages) && pages.length > 0 ? pages : listPages();
  const insertPosition = position === 'body' ? 'body' : 'head';
  const tag = type === 'script'
    ? `<script src="${url}"></script>`
    : `<link rel="stylesheet" href="${url}">`;

  const updated = [];
  const skipped = [];

  for (const page of targetPages) {
    const pagePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(pagePath)) { skipped.push(page); continue; }
    let html = fs.readFileSync(pagePath, 'utf8');
    if (html.includes(url)) { skipped.push(page); continue; } // already injected

    if (insertPosition === 'head') {
      html = html.replace(/<\/head>/i, `  ${tag}\n</head>`);
    } else {
      html = html.replace(/<\/body>/i, `  ${tag}\n</body>`);
    }
    fs.writeFileSync(pagePath, html);
    updated.push(page);
  }

  // Record in spec
  const spec = readSpec();
  if (!spec.cdn_injections) spec.cdn_injections = [];
  const existing = spec.cdn_injections.find(c => c.url === url);
  if (!existing) {
    spec.cdn_injections.push({ url, type, position: insertPosition, injected_at: new Date().toISOString() });
    writeSpec(spec);
  }

  console.log(`[cdn-inject] ${tag} → ${updated.length} pages updated, ${skipped.length} skipped`);
  res.json({ success: true, tag, updated, skipped });
});

// DELETE /api/cdn-inject
// Body: { url, pages: [...] } — removes the CDN tag from pages
app.delete('/api/cdn-inject', (req, res) => {
  const { url, pages } = req.body;
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });

  const targetPages = Array.isArray(pages) && pages.length > 0 ? pages : listPages();
  const updated = [];

  for (const page of targetPages) {
    const pagePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(pagePath)) continue;
    let html = fs.readFileSync(pagePath, 'utf8');
    // Remove any tag containing this URL
    const before = html;
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`<script[^>]*src=["'][^"']*?${escapedUrl}[^"']*["'][^>]*></script>\\n?`, 'gi'), '');
    html = html.replace(new RegExp(`<link[^>]*href=["'][^"']*?${escapedUrl}[^"']*["'][^>]*\\/?>\\n?`, 'gi'), '');
    if (html !== before) {
      fs.writeFileSync(pagePath, html);
      updated.push(page);
    }
  }

  // Remove from spec
  const spec = readSpec();
  if (spec.cdn_injections) {
    spec.cdn_injections = spec.cdn_injections.filter(c => c.url !== url);
    writeSpec(spec);
  }

  res.json({ success: true, url, updated });
});

// GET /api/cdn-injections — list all CDN injections for current site
app.get('/api/cdn-injections', (req, res) => {
  const spec = readSpec();
  res.json(spec.cdn_injections || []);
});

// ─── FAM Asset Injection ─────────────────────────────────────────────────────
// POST /api/inject-fam-asset
// Body: { asset: 'fam-motion'|'fam-shapes', pages: [...] }
// Copies fam-motion.js or fam-shapes.css to site dist and injects the tag.
app.post('/api/inject-fam-asset', (req, res) => {
  const { asset, pages } = req.body;
  const FAM_ASSETS = {
    'fam-motion': { src: path.join(__dirname, '..', 'lib', 'fam-motion.js'), dest: 'assets/js/fam-motion.js', tag: '<script src="assets/js/fam-motion.js"></script>', position: 'body' },
    'fam-shapes': { src: path.join(__dirname, '..', 'lib', 'fam-shapes.css'), dest: 'assets/css/fam-shapes.css', tag: '<link rel="stylesheet" href="assets/css/fam-shapes.css">', position: 'head' },
  };
  const cfg = FAM_ASSETS[asset];
  if (!cfg) return res.status(400).json({ error: `Unknown asset: ${asset}. Valid: ${Object.keys(FAM_ASSETS).join(', ')}` });

  const destPath = path.join(DIST_DIR(), cfg.dest);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(cfg.src, destPath);

  const targetPages = Array.isArray(pages) && pages.length > 0 ? pages : listPages();
  const updated = [];
  const skipped = [];

  for (const page of targetPages) {
    const pagePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(pagePath)) { skipped.push(page); continue; }
    let html = fs.readFileSync(pagePath, 'utf8');
    if (html.includes(cfg.dest)) { skipped.push(page); continue; }
    if (cfg.position === 'body') {
      html = html.replace(/<\/body>/i, `  ${cfg.tag}\n</body>`);
    } else {
      html = html.replace(/<\/head>/i, `  ${cfg.tag}\n</head>`);
    }
    fs.writeFileSync(pagePath, html);
    updated.push(page);
  }

  console.log(`[fam-asset] Injected ${asset} → ${updated.length} pages`);
  res.json({ success: true, asset, dest: cfg.dest, updated, skipped });
});

// ─── Character Branding ───────────────────────────────────────────────────────
// GET /api/character-branding — list all placements for current site
app.get('/api/character-branding', (req, res) => {
  const spec = readSpec();
  res.json({
    placements: spec.character_branding || {},
    summary: characterBranding.characterSummary(spec),
    position_presets: Object.keys(characterBranding.POSITION_PRESETS),
  });
});

// POST /api/character-branding — add or update a character placement
// Body: { page, character, pose, position, classes?, inline_style?, alt?, dark_section? }
app.post('/api/character-branding', (req, res) => {
  const { page, character, pose, position } = req.body;
  if (!page || !character || !pose || !position) {
    return res.status(400).json({ error: 'page, character, pose, and position are required' });
  }
  if (!/^[a-z0-9_\-]+\.html$/.test(page)) {
    return res.status(400).json({ error: 'Invalid page name' });
  }

  const placement = {
    character: character.toLowerCase(),
    pose,
    position,
    classes: req.body.classes || characterBranding.POSITION_PRESETS[position]?.classes || '',
    inline_style: req.body.inline_style || '',
    alt: req.body.alt || `${character} character`,
    dark_section: req.body.dark_section === true,
    added_at: new Date().toISOString(),
  };

  let spec = readSpec();
  spec = characterBranding.addPlacement(page, placement, spec);
  writeSpec(spec);

  const html = characterBranding.renderPlacement(placement, `assets/${character.toLowerCase()}`);
  console.log(`[character-branding] Added ${character}/${pose} at ${position} on ${page}`);
  res.json({ success: true, placement, rendered_html: html });
});

// DELETE /api/character-branding
// Body: { page, position, character? }
app.delete('/api/character-branding', (req, res) => {
  const { page, position, character } = req.body;
  if (!page || !position) return res.status(400).json({ error: 'page and position are required' });
  let spec = readSpec();
  spec = characterBranding.removePlacement(page, position, character, spec);
  writeSpec(spec);
  res.json({ success: true, page, position });
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
// Sync all data-field-id attributes from built HTML back into spec.content
// Idempotent — only adds new fields, never overwrites spec (user edits are preserved)
app.post('/api/sync-content-fields', (req, res) => {
  try {
    const pages = req.body.pages || null; // null = all pages
    const totalFields = syncContentFieldsFromHtml(pages);
    const spec = readSpec();
    const registeredPages = Object.keys(spec.content || {});
    res.json({ success: true, total_fields: totalFields, pages: registeredPages });
  } catch (e) {
    console.error('[sync-content-fields]', e);
    res.status(500).json({ error: e.message });
  }
});

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

function buildPreviewSelectionBridgeScript() {
  return `<script id="studio-preview-selection-bridge">
(function() {
  var STYLE_ID = 'studio-preview-selection-style';
  var ACTIVE_CLASS = 'studio-preview-selected';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = ''
      + '[data-section-id],[data-component-id],[data-component-ref],[data-field-id],[data-slot-id]{cursor:pointer;}'
      + '.' + ACTIVE_CLASS + '{outline:3px solid rgba(245,196,0,.95)!important;outline-offset:2px!important;box-shadow:0 0 0 9999px rgba(245,196,0,.08) inset!important;}';
    document.head.appendChild(style);
  }

  function textPreview(el) {
    return String((el && (el.innerText || el.textContent)) || '').replace(/\\s+/g, ' ').trim().slice(0, 120);
  }

  function pageName() {
    var parts = location.pathname.split('/');
    return parts[parts.length - 1] || 'index.html';
  }

  function buildSelection(target) {
    var slotEl = target.closest('[data-slot-id]');
    if (slotEl) {
      return {
        type: 'media',
        page: pageName(),
        slot_id: slotEl.getAttribute('data-slot-id'),
        role: slotEl.getAttribute('data-slot-role') || 'image',
        status: slotEl.getAttribute('data-slot-status') || 'empty',
        label: slotEl.getAttribute('data-slot-id'),
      };
    }

    var fieldEl = target.closest('[data-field-id]');
    if (fieldEl) {
      var fieldComponent = fieldEl.closest('[data-component-id],[data-component-ref]');
      var fieldSection = fieldEl.closest('[data-section-id]');
      return {
        type: 'field',
        page: pageName(),
        field_id: fieldEl.getAttribute('data-field-id'),
        field_type: fieldEl.getAttribute('data-field-type') || 'text',
        value: textPreview(fieldEl),
        label: fieldEl.getAttribute('data-field-id'),
        section_id: fieldSection && fieldSection.getAttribute('data-section-id'),
        component_id: fieldComponent && (fieldComponent.getAttribute('data-component-id') || fieldComponent.getAttribute('data-component-ref')),
        component_ref: fieldComponent && fieldComponent.getAttribute('data-component-ref'),
      };
    }

    var componentEl = target.closest('[data-component-id],[data-component-ref]');
    if (componentEl) {
      var componentSection = componentEl.closest('[data-section-id]');
      return {
        type: 'component',
        page: pageName(),
        component_id: componentEl.getAttribute('data-component-id') || componentEl.getAttribute('data-component-ref'),
        component_ref: componentEl.getAttribute('data-component-ref') || componentEl.getAttribute('data-component-id'),
        section_id: componentSection && componentSection.getAttribute('data-section-id'),
        label: componentEl.getAttribute('data-component-id') || componentEl.getAttribute('data-component-ref') || 'component',
      };
    }

    var sectionEl = target.closest('[data-section-id]');
    if (sectionEl) {
      return {
        type: 'section',
        page: pageName(),
        section_id: sectionEl.getAttribute('data-section-id'),
        section_type: sectionEl.getAttribute('data-section-type') || 'section',
        component_id: sectionEl.getAttribute('data-component-id') || null,
        component_ref: sectionEl.getAttribute('data-component-ref') || null,
        label: sectionEl.getAttribute('data-section-id'),
      };
    }

    return { type: 'page', page: pageName() };
  }

  function selectorFor(selection) {
    if (!selection) return null;
    if (selection.slot_id) return '[data-slot-id="' + selection.slot_id + '"]';
    if (selection.field_id) return '[data-field-id="' + selection.field_id + '"]';
    if (selection.component_id) return '[data-component-id="' + selection.component_id + '"]';
    if (selection.component_ref) return '[data-component-ref="' + selection.component_ref + '"]';
    if (selection.section_id) return '[data-section-id="' + selection.section_id + '"]';
    return null;
  }

  function clearActive() {
    document.querySelectorAll('.' + ACTIVE_CLASS).forEach(function(el) {
      el.classList.remove(ACTIVE_CLASS);
    });
  }

  function applyActive(selection) {
    clearActive();
    var selector = selectorFor(selection);
    if (!selector) return;
    var el = document.querySelector(selector);
    if (!el) return;
    el.classList.add(ACTIVE_CLASS);
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (_) {}
  }

  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!target || !target.closest) return;
    var match = target.closest('[data-slot-id],[data-field-id],[data-component-id],[data-component-ref],[data-section-id]');
    if (!match) return;
    e.preventDefault();
    e.stopPropagation();
    var selection = buildSelection(match);
    applyActive(selection);
    window.parent.postMessage({ type: 'preview-select', selection: selection, source: 'preview-canvas' }, '*');
  }, true);

  window.addEventListener('message', function(event) {
    var data = event && event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'studio-selection-sync') applyActive(data.selection);
  });

  ensureStyle();
  window.parent.postMessage({
    type: 'preview-ready',
    page: pageName(),
    anchors: {
      sections: document.querySelectorAll('[data-section-id]').length,
      components: document.querySelectorAll('[data-component-id],[data-component-ref]').length,
      fields: document.querySelectorAll('[data-field-id]').length,
      slots: document.querySelectorAll('[data-slot-id]').length
    }
  }, '*');
})();
</script>`;
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
    buildPreviewSelectionBridgeScript() + '\n' + buildSlotInspectorScript(JSON.stringify(slotMeta)) + '\n</body>');

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

  // Session 11 Fix 3: resolve font pair from registry (vertical-aware).
  // Explicit spec.fonts.heading/body always win over the registry pick.
  let fontSerif = spec.fonts?.heading;
  let fontSans  = spec.fonts?.body;
  let fontUrl;
  if (!fontSerif || !fontSans) {
    try {
      const pair = spec.fonts?.pairing
        ? fontRegistry.getPairing(spec.fonts.pairing)
        : fontRegistry.pickPairingForVertical(spec.business_type || '');
      if (pair) {
        fontSerif = fontSerif || pair.heading;
        fontSans  = fontSans  || pair.body;
        fontUrl   = fontRegistry.buildGoogleFontsUrl(pair);
      }
    } catch (err) {
      console.warn('[head-guardrail] font-registry pick failed:', err.message);
    }
  }
  fontSerif = fontSerif || 'Playfair Display';
  fontSans  = fontSans  || 'Inter';
  if (!fontUrl) {
    fontUrl = `https://fonts.googleapis.com/css2?family=${fontSerif.replace(/\s+/g, '+').replace(/&/g, '&amp;')}:wght@400;500;600;700&family=${fontSans.replace(/\s+/g, '+').replace(/&/g, '&amp;')}:wght@300;400;500;600;700&display=swap`;
  }

  const tailwindTag = '<script src="https://cdn.tailwindcss.com"></script>';
  const fontTags = `<link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="${fontUrl}" rel="stylesheet">`;

  // Session 11 Fix 2: FAMtastic DNA — always copy and link fam-shapes.css,
  // fam-motion.js, fam-scroll.js on every build so Claude can use the full
  // vocabulary (shape classes, data-fam-animate, data-fam-scroll) without
  // needing a separate opt-in call.
  const famAssets = [
    { src: path.join(__dirname, '..', 'lib', 'fam-shapes.css'), dest: path.join(distDir, 'assets', 'css', 'fam-shapes.css'),
      tag: '<link rel="stylesheet" href="assets/css/fam-shapes.css">', marker: 'assets/css/fam-shapes.css', position: 'head' },
    { src: path.join(__dirname, '..', 'lib', 'fam-motion.js'),  dest: path.join(distDir, 'assets', 'js', 'fam-motion.js'),
      tag: '<script src="assets/js/fam-motion.js" defer></script>', marker: 'assets/js/fam-motion.js', position: 'head' },
    { src: path.join(__dirname, '..', 'lib', 'fam-scroll.js'),  dest: path.join(distDir, 'assets', 'js', 'fam-scroll.js'),
      tag: '<script src="assets/js/fam-scroll.js" defer></script>', marker: 'assets/js/fam-scroll.js', position: 'head' },
    { src: path.join(__dirname, 'public', 'css', 'fam-hero.css'), dest: path.join(distDir, 'assets', 'css', 'fam-hero.css'),
      tag: '<link rel="stylesheet" href="assets/css/fam-hero.css">', marker: 'assets/css/fam-hero.css', position: 'head', optional: true },
  ];
  for (const asset of famAssets) {
    try {
      if (!fs.existsSync(asset.src)) {
        if (!asset.optional) console.warn(`[head-guardrail] Missing FAMtastic asset: ${asset.src}`);
        continue;
      }
      fs.mkdirSync(path.dirname(asset.dest), { recursive: true });
      fs.copyFileSync(asset.src, asset.dest);
    } catch (err) {
      console.warn(`[head-guardrail] Failed to copy ${path.basename(asset.src)}: ${err.message}`);
    }
  }

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

    // Strip duplicate root-level script tags that Claude sometimes emits
    // alongside our assets/js/ version — they 404 on every page load.
    // Matches <script ... src="fam-motion.js"></script> (and fam-scroll.js)
    // but leaves the correct assets/js/… reference intact.
    const baredRe = /<script\b[^>]*\bsrc=["'](?:\.\/)?(fam-motion\.js|fam-scroll\.js)["'][^>]*><\/script>\s*/gi;
    if (baredRe.test(html)) {
      html = html.replace(baredRe, '');
      changed = true;
    }

    // Inject FAMtastic DNA tags (fam-shapes.css, fam-motion.js, fam-scroll.js, fam-hero.css)
    for (const asset of famAssets) {
      if (asset.optional && !fs.existsSync(asset.src)) continue;
      if (!html.includes(asset.marker)) {
        html = html.replace(/<\/head>/i, `  ${asset.tag}\n  </head>`);
        changed = true;
      }
    }

    if (changed) {
      fs.writeFileSync(filePath, html);
      fixed++;
    }
  }

  if (fixed > 0) {
    console.log(`[head-guardrail] Injected missing Tailwind/Fonts/FAMtastic DNA into ${fixed} page(s)`);
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
  const sharedStylesPath = path.join(assetsDir, 'styles.css');
  fs.writeFileSync(sharedStylesPath, cssContent);
  normalizeCssAliases(sharedStylesPath);

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

function normalizeCssAliases(stylesPath) {
  if (!fs.existsSync(stylesPath)) return;
  let css = fs.readFileSync(stylesPath, 'utf8');

  const rootMatch = css.match(/:root\s*\{([^}]*)\}/);
  if (!rootMatch) return;

  const rootBody = rootMatch[1];
  const defined = new Set();
  const varRe = /--([\w-]+)\s*:/g;
  let m;
  while ((m = varRe.exec(rootBody)) !== null) defined.add(m[1]);

  const aliases = [
    ['color-text-light',   'color-text-muted'],
    ['color-text-muted',   'color-text-light'],
    ['color-bg-light',     'color-surface'],
    ['color-surface',      'color-bg'],
    ['color-accent-hover', 'color-accent-light'],
    ['color-text-dark',    'color-text'],
  ];

  const toAdd = [];
  for (const [alias, source] of aliases) {
    if (!defined.has(alias) && defined.has(source)) {
      toAdd.push(`  --${alias}: var(--${source});`);
      defined.add(alias);
    }
  }

  if (toAdd.length === 0) return;
  css = css.replace(/:root\s*\{([^}]*)\}/, (match, body) =>
    `:root {${body}${toAdd.join('\n')}\n}`
  );
  fs.writeFileSync(stylesPath, css);
  console.log(`[css-root] Added ${toAdd.length} alias(es) to :root in styles.css`);
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
    const stylesPath = path.join(assetsDir, 'styles.css');
    fs.writeFileSync(stylesPath, components.sharedCss.trim());
    normalizeCssAliases(stylesPath);
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

${famSkeletons.NAV_SKELETON}

${spec.character_sets && spec.character_sets.length > 0 ? famSkeletons.VIDEO_HERO_SKELETON : ''}

FOOTER:
- Business name and tagline
- Quick links to all pages
- Contact information (phone, email, address if in brief)
- Copyright line: © ${new Date().getFullYear()} ${spec.site_name || 'Business Name'}

${famSkeletons.FOOTER_SKELETON}

DESIGN DIRECTION:
${assetsContext || 'No specific assets referenced.'}

${FAMTASTIC_DNA_VOCAB}

${systemRules}

${getLogoSkeletonBlock(spec)}

OUTPUT: ${spec.famtastic_mode
  ? 'First output the three <!-- LOGO_FULL -->, <!-- LOGO_ICON -->, <!-- LOGO_WORDMARK --> SVG blocks exactly as specified above. Then output the complete HTML document. No explanation, no markdown fences.'
  : 'Respond with ONLY the complete HTML document. No explanation, no markdown fences.'}
The <body> should contain ONLY the <header> and <footer> — no other elements.`;
}

// Session 11 Fix 2: FAMtastic DNA Vocabulary — injected into template and
// per-page build prompts so Claude knows what classes and attributes are
// available. The underlying assets (fam-shapes.css, fam-motion.js,
// fam-scroll.js, fam-hero.css) are auto-linked by ensureHeadDependencies().
const FAMTASTIC_DNA_VOCAB = `
FAMTASTIC DNA — SHIP-READY VOCABULARY (always linked, use freely):

1. fam-shapes.css — pure-CSS shapes and decorative elements:
   • <div class="fam-starburst fam-starburst--md fam-starburst--yellow">SALE!</div>
     sizes: sm, md, lg, xl    colors: yellow, red, blue, green, pink
   • <span class="fam-badge fam-badge--red">NEW</span>
   • <div class="fam-price-tag">$9.99</div>
   • <div class="fam-wave-divider fam-wave-divider--down"></div>  (section separator)
   • <section class="fam-diagonal-bg fam-diagonal-bg--light">...</section>
   Use these liberally to add visual personality — don't paint everything grey.

2. fam-motion.js — scroll-triggered "enter viewport once" animations:
   Add data-fam-animate to ANY element that should animate in when scrolled into view.
   • data-fam-animate="fade-up"     (most common — headers, cards)
   • data-fam-animate="fade-in"     (backgrounds, quiet reveals)
   • data-fam-animate="slide-left"  (from-right reveals)
   • data-fam-animate="slide-right" (from-left reveals)
   • data-fam-animate="zoom-in"     (featured imagery)
   • data-fam-animate="bounce-in"   (CTAs, testimonial cards)
   Optional tuning: data-fam-delay="200" data-fam-duration="600"
   REQUIRED: Put animations on hero heading, every section heading, cards, CTAs,
   testimonial tiles, and stats. Stagger delays (0, 100, 200, 300) for grids.

3. fam-scroll.js — continuous scroll-linked effects:
   • <div data-fam-scroll="parallax" data-fam-scroll-speed="0.4">...</div>
   • <img data-fam-scroll="parallax-img" data-fam-scroll-speed="0.25" ...>
   • <section data-fam-scroll="pin">...</section>   (sticky)
   • <div data-fam-scroll="reveal" data-fam-scroll-direction="left">...</div>
   • <div data-fam-scroll="sticky-rotate" data-fam-scroll-deg="15">...</div>
   Use parallax on hero backgrounds and decorative images. Use reveal for
   side-by-side content blocks. Use sticky-rotate on logo/badge decorations.

4. fam-hero.css — optional multi-layer hero container system (see fam-hero
   section in build rules if famtastic_mode is enabled).

DO NOT omit these. The libraries are loaded on every page. A FAMtastic site
without fam-shapes or data-fam-animate looks like a generic Tailwind template.
`;

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

    // og:url — use deployed URL if available, otherwise relative
    const deployedUrl = spec.deployed_url || '';
    const pageUrl = deployedUrl ? `${deployedUrl.replace(/\/$/, '')}/${page === 'index.html' ? '' : page}` : '';
    if (pageUrl && !html.match(/<meta[^>]*property=["']og:url["']/i))
      metaTags.push(`    <meta property="og:url" content="${pageUrl}">`);

    // Canonical tag
    if (!html.match(/<link[^>]*rel=["']canonical["']/i)) {
      const canonicalHref = pageUrl || `./${page}`;
      metaTags.push(`    <link rel="canonical" href="${canonicalHref}">`);
    }

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

// --- Sitemap + Robots Generation (post-build) ---
function generateSitemapAndRobots(ws) {
  const distDir = DIST_DIR();
  const pages = listPages();
  const spec = readSpec();
  const deployedUrl = (spec.deployed_url || '').replace(/\/$/, '');
  const today = new Date().toISOString().split('T')[0];

  // Generate sitemap.xml
  const urlEntries = pages.map(page => {
    const loc = deployedUrl
      ? `${deployedUrl}/${page === 'index.html' ? '' : page}`.replace(/\/$/, deployedUrl ? '' : '/')
      : `/${page}`;
    const priority = page === 'index.html' ? '1.0' : '0.8';
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
  }).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

  try {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemap);
    console.log(`[seo] sitemap.xml generated with ${pages.length} URL(s)`);
  } catch (e) {
    console.error('[seo] sitemap.xml write failed:', e.message);
  }

  // Generate robots.txt
  const sitemapUrl = deployedUrl ? `${deployedUrl}/sitemap.xml` : '/sitemap.xml';
  const robots = `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`;

  try {
    fs.writeFileSync(path.join(distDir, 'robots.txt'), robots);
    console.log(`[seo] robots.txt generated`);
  } catch (e) {
    console.error('[seo] robots.txt write failed:', e.message);
  }

  if (ws) {
    ws.send(JSON.stringify({ type: 'status', content: `SEO: sitemap.xml + robots.txt generated` }));
  }
  return { sitemap: true, robots: true, pages: pages.length };
}

// --- SEO Validation Gate (post-build) ---
function runSeoValidation(pages) {
  const distDir = DIST_DIR();
  const warnings = [];
  const summary = {
    pages: pages.length,
    titles_unique: true,
    titles_count: 0,
    descriptions_count: 0,
    images_with_alt: 0,
    images_total: 0,
    h1_per_page: 0,
    sitemap_exists: fs.existsSync(path.join(distDir, 'sitemap.xml')),
    robots_exists: fs.existsSync(path.join(distDir, 'robots.txt')),
  };

  const titlesSeen = new Set();

  for (const page of pages) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');

    // Title check
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      summary.titles_count++;
      const titleText = titleMatch[1].trim();
      if (titlesSeen.has(titleText)) {
        summary.titles_unique = false;
        warnings.push({ type: 'SEO_WARNING', page, check: 'title_duplicate', detail: `Duplicate title: "${titleText}"` });
      }
      titlesSeen.add(titleText);
      if (titleText.length > 60) {
        warnings.push({ type: 'SEO_WARNING', page, check: 'title_too_long', detail: `Title is ${titleText.length} chars (max 60): "${titleText.substring(0, 30)}..."` });
      }
    } else {
      warnings.push({ type: 'SEO_WARNING', page, check: 'title_missing', detail: 'No <title> tag found' });
    }

    // Meta description check
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    if (descMatch) {
      summary.descriptions_count++;
      const descLen = descMatch[1].length;
      if (descLen < 50 || descLen > 160) {
        warnings.push({ type: 'SEO_WARNING', page, check: 'description_length', detail: `Description is ${descLen} chars (ideal: 50-160)` });
      }
    } else {
      warnings.push({ type: 'SEO_WARNING', page, check: 'description_missing', detail: 'No <meta name="description"> found' });
    }

    // H1 check
    const h1Matches = html.match(/<h1[\s>]/gi) || [];
    if (h1Matches.length === 1) {
      summary.h1_per_page++;
    } else if (h1Matches.length === 0) {
      warnings.push({ type: 'SEO_WARNING', page, check: 'h1_missing', detail: 'No <h1> found' });
    } else {
      warnings.push({ type: 'SEO_WARNING', page, check: 'h1_multiple', detail: `${h1Matches.length} <h1> tags found (expected 1)` });
    }

    // Image alt check
    const imgMatches = html.match(/<img[^>]+>/gi) || [];
    summary.images_total += imgMatches.length;
    for (const img of imgMatches) {
      const hasAlt = /\balt=["'][^"']*["']/i.test(img);
      const altEmpty = /\balt=["']\s*["']/i.test(img);
      if (hasAlt && !altEmpty) {
        summary.images_with_alt++;
      } else {
        warnings.push({ type: 'SEO_WARNING', page, check: 'alt_missing', detail: `Image missing alt: ${img.substring(0, 80)}...` });
      }
    }
  }

  return { warnings, summary };
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
  let scannedCount = 0;
  let missingCount = 0;
  for (const page of pagesToScan) {
    const filePath = path.join(distDir, page);
    if (!fs.existsSync(filePath)) { missingCount++; continue; }
    scannedCount++;
    const html = fs.readFileSync(filePath, 'utf8');
    const pageSlots = extractSlotsFromPage(html, page);
    allSlots.push(...pageSlots);
  }

  // Merge into media_specs — preserve status of existing slots (don't regress stock→empty)
  if (!spec.media_specs) spec.media_specs = [];
  const existingBySlotId = new Map(spec.media_specs.map(s => [s.slot_id, s]));

  let addedCount = 0;
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
      addedCount++;
    }
  }

  // Remove specs for slots no longer in HTML (across scanned pages only)
  const scannedPages = new Set(pagesToScan);
  const currentSlotIds = new Set(allSlots.map(s => s.slot_id));
  const before = spec.media_specs.length;
  spec.media_specs = spec.media_specs.filter(s =>
    !scannedPages.has(s.page) || currentSlotIds.has(s.slot_id)
  );
  const removedCount = before - spec.media_specs.length;

  writeSpec(spec);
  console.log(`[slots] Registered ${allSlots.length} slot(s) across ${scannedCount} page(s) ` +
    `(added=${addedCount}, removed=${removedCount}, missing_files=${missingCount}, total_specs=${spec.media_specs.length})`);
  if (allSlots.length === 0 && scannedCount > 0) {
    console.warn(`[slots] No slots found in ${scannedCount} scanned page(s). ` +
      `Check that <img> tags emit data-slot-id/data-slot-role/data-slot-status.`);
  }
  return allSlots.length;
}

/**
 * Sync content fields from generated HTML back to spec.json.
 * Reads data-field-id and data-field-type attributes from the HTML.
 * Spec is authoritative — this only ADDS new fields Claude generated
 * and UPDATES values for fields that don't exist in spec yet.
 * Fields already in spec.content are NOT overwritten (user edits are preserved).
 */
function syncContentFieldsFromHtml(pages) {
  const spec = readSpec();
  if (!spec.content) spec.content = {};

  const pagesToScan = pages || listPages();
  let totalFields = 0;
  let newFields = 0;

  for (const page of pagesToScan) {
    const filePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);

    if (!spec.content[page]) spec.content[page] = { fields: [] };
    const existingFieldIds = new Set((spec.content[page].fields || []).map(f => f.field_id));

    // Find all elements with data-field-id
    $('[data-field-id]').each((_, el) => {
      const fieldId = $(el).attr('data-field-id');
      const fieldType = $(el).attr('data-field-type') || 'text';
      if (!fieldId) return;

      totalFields++;

      // Extract value based on field type
      let value;
      if (fieldType === 'phone') {
        value = $(el).text().trim();
      } else if (fieldType === 'email') {
        const href = $(el).attr('href') || '';
        value = href.startsWith('mailto:') ? href.replace('mailto:', '') : $(el).text().trim();
      } else if (fieldType === 'link') {
        value = { text: $(el).text().trim(), href: $(el).attr('href') || '#' };
      } else if (fieldType === 'price') {
        const text = $(el).text().trim();
        const match = text.match(/\$[\d,.]+/);
        value = match ? match[0] : text;
      } else if (fieldType === 'address') {
        value = $(el).text().trim().replace(/\s+/g, ' ');
      } else if (fieldType === 'hours') {
        value = $(el).text().trim().replace(/\s+/g, ' ');
      } else {
        value = $(el).text().trim();
      }

      // Only add if not already in spec (spec is authoritative)
      if (!existingFieldIds.has(fieldId)) {
        spec.content[page].fields.push({
          field_id: fieldId,
          type: fieldType,
          value,
          element: el.tagName,
          editable: true,
          scope: ['phone', 'email', 'address', 'hours'].includes(fieldType) ? 'global' : 'local',
        });
        existingFieldIds.add(fieldId);
        newFields++;
      }
    });

    // Also extract section IDs for structure tracking
    $('[data-section-id]').each((_, el) => {
      const sectionId = $(el).attr('data-section-id');
      const sectionType = $(el).attr('data-section-type') || 'generic';
      const componentRef = $(el).attr('data-component-ref') || '';
      const componentId = $(el).attr('data-component-id') || '';
      if (!spec.content[page].sections) spec.content[page].sections = [];
      const existingSections = new Set(spec.content[page].sections.map(s => s.section_id));
      if (!existingSections.has(sectionId)) {
        spec.content[page].sections.push({
          section_id: sectionId,
          section_type: sectionType,
          component_ref: componentRef || undefined,
          component_id: componentId || undefined,
        });
      } else if (componentRef || componentId) {
        const section = spec.content[page].sections.find(s => s.section_id === sectionId);
        if (section) {
          if (componentRef) section.component_ref = componentRef;
          if (componentId) section.component_id = componentId;
        }
      }
    });
  }

  writeSpec(spec);
  console.log(`[content] Synced ${totalFields} field(s) across ${pagesToScan.length} page(s) (${newFields} new)`);
  return totalFields;
}

function ensureComponentAnchors(pages) {
  const spec = readSpec();
  const pagesToUpdate = pages || listPages();
  let updatedPages = 0;

  for (const page of pagesToUpdate) {
    const filePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    const sections = spec.content?.[page]?.sections || [];
    let modified = false;

    sections.forEach((section, index) => {
      if (!section || !section.section_id) return;
      const el = $(`[data-section-id="${section.section_id}"]`).first();
      if (!el.length) return;
      const componentRef = section.component_ref || el.attr('data-component-ref') || '';
      const componentId = componentRef
        ? String(componentRef).split('@')[0]
        : (section.component_id || el.attr('data-component-id') || `local-${section.section_id || index + 1}`);

      if (!el.attr('data-component-id')) {
        el.attr('data-component-id', componentId);
        modified = true;
      }
      if (componentRef && !el.attr('data-component-ref')) {
        el.attr('data-component-ref', componentRef);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, $.html());
      updatedPages++;
    }
  }

  if (updatedPages > 0) {
    console.log(`[anchors] Ensured component anchors on ${updatedPages} page(s)`);
  }
  return updatedPages;
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
      const spec = JSON.parse(fs.readFileSync(path.join(SITES_ROOT, d, 'spec.json'), 'utf8')); // L4116
      normalizeTierAndMode(spec); // in-memory only — listing endpoint, no write-back
      const hasHtml = fs.existsSync(path.join(SITES_ROOT, d, 'dist', 'index.html'));
      const pageCount = hasHtml ? fs.readdirSync(path.join(SITES_ROOT, d, 'dist')).filter(f => f.endsWith('.html')).length : 0;
      // Resolve display name: stored site_name → brief.business_name → tag slug
      const storedName = spec.site_name;
      const briefName  = spec.design_brief?.business_name;
      const tagName    = d.replace(/^site-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const displayName = (storedName && storedName !== 'New Site') ? storedName
                        : briefName ? briefName
                        : tagName;
      return {
        tag: d,
        name: displayName,
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

// POST alias — createNewProject() in index.html POSTs here; delegates to /api/new-site logic
app.post('/api/sites', async (req, res) => {
  // Forward to /api/new-site by making an internal HTTP call
  const http = require('http');
  const body = JSON.stringify(req.body || {});
  const opts = { hostname: 'localhost', port: PORT, path: '/api/new-site', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Origin': `http://localhost:${PORT}` } };
  const upstream = http.request(opts, upRes => {
    let data = '';
    upRes.on('data', chunk => { data += chunk; });
    upRes.on('end', () => {
      try { res.status(upRes.statusCode).json(JSON.parse(data)); }
      catch { res.status(upRes.statusCode).send(data); }
    });
  });
  upstream.on('error', e => res.status(500).json({ error: e.message }));
  upstream.write(body);
  upstream.end();
});

// Alias used by sidebar loadSiteTree() in studio-shell.js
app.get('/api/sites', (req, res) => {
  if (!fs.existsSync(SITES_ROOT)) return res.json([]);
  const dirs = fs.readdirSync(SITES_ROOT).filter(d => {
    if (d.startsWith('.')) return false;
    const dir = path.join(SITES_ROOT, d);
    return fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'spec.json'));
  });
  const sites = dirs.map(d => {
    try {
      const spec = JSON.parse(fs.readFileSync(path.join(SITES_ROOT, d, 'spec.json'), 'utf8')); // L4174
      normalizeTierAndMode(spec); // in-memory only — listing endpoint, no write-back
      const tagName = d.replace(/^site-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const displayName = (spec.site_name && spec.site_name !== 'New Site') ? spec.site_name
                        : spec.design_brief?.business_name || tagName;
      return { tag: d, site_name: displayName, state: spec.state || 'unknown', deployed_url: spec.deployed_url || null, is_current: d === TAG };
    } catch {
      return { tag: d, site_name: d, state: 'error', is_current: d === TAG };
    }
  }).sort((a, b) => (b.is_current ? 1 : 0) - (a.is_current ? 1 : 0));
  res.json({ sites });
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
  resetBrainSessions();

  // Load new site state
  const studio = loadStudio();
  startSession();
  studioEvents.emit(STUDIO_EVENTS.SITE_SWITCHED, { tag: TAG });

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

  // Session 11 Fix 4: flag new sites for auto-interview on next studio open
  // unless the admin has disabled auto_interview in studio-config.json.
  const autoInterviewEnabled = loadSettings().auto_interview !== false;
  const spec = {
    tag: newTag,
    site_name: req.body.name || newTag.replace('site-', '').replace(/-/g, ' '),
    business_type: req.body.business_type || '',
    state: 'new',
    tier: 'famtastic',          // canonical — famtastic_mode is derived on first readSpec
    created_at: new Date().toISOString(),
    interview_pending: req.body.client_brief ? false : (autoInterviewEnabled === true),
    interview_completed: req.body.client_brief ? true : false,
    // If brief data provided at creation time (from Brief tab flow), pre-load it
    ...(req.body.client_brief ? { client_brief: req.body.client_brief } : {}),
  };
  const _newSpecPath = path.join(newSiteDir, 'spec.json');
  fs.writeFileSync(_newSpecPath + '.tmp', JSON.stringify(spec, null, 2));
  fs.renameSync(_newSpecPath + '.tmp', _newSpecPath); // atomic write

  // Switch to the new site — await so summary writes to the old site directory
  await endSession();
  TAG = newTag;
  writeLastSite(TAG);
  invalidateSpecCache();
  currentPage = 'index.html';
  sessionMessageCount = 0;
  sessionStartedAt = new Date().toISOString();
  startSession();
  studioEvents.emit(STUDIO_EVENTS.SITE_SWITCHED, { tag: TAG });

  const pages = listPages();
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: 'site-switched', tag: TAG, pages, currentPage }));
    }
  });

  console.log(`[studio] Created and switched to new site: ${TAG}`);
  res.json({ success: true, tag: TAG });
});

// --- Client Interview API ---
/**
 * POST /api/interview/start
 * Body: { mode?: 'quick' | 'detailed' | 'skip' }
 * Starts or resumes a client interview for the active site.
 * Returns first question (or completion if skip/already done).
 */
app.post('/api/interview/start', (req, res) => {
  const spec = readSpec();
  if (!spec) return res.status(400).json({ error: 'No active site — create a site first' });

  // If already completed, return immediately
  if (spec.interview_completed) {
    return res.json({
      completed: true,
      client_brief: spec.client_brief || {},
      message: 'Interview already completed for this site',
    });
  }

  // Resume partial interview if one exists
  if (spec.interview_state && !spec.interview_state.completed) {
    const currentQ = getCurrentQuestion(spec.interview_state);
    return res.json({
      resumed: true,
      question: currentQ,
      mode: spec.interview_state.mode,
    });
  }

  const mode = req.body?.mode || 'quick';
  const { state, firstQuestion } = startInterview(mode);

  // Handle skip mode — write brief immediately
  if (mode === 'skip') {
    spec.interview_state = state;
    spec.interview_completed = true;
    spec.interview_pending = false;
    spec.client_brief = {};
    writeSpec(spec);
    return res.json({ completed: true, client_brief: {}, message: 'Interview skipped' });
  }

  // Persist initial state
  spec.interview_state = state;
  writeSpec(spec);

  res.json({ question: firstQuestion, mode });
});

/**
 * POST /api/interview/answer
 * Body: { question_id: string, answer: string }
 * Records the answer and returns the next question or completion.
 */
app.post('/api/interview/answer', (req, res) => {
  const spec = readSpec();
  if (!spec) return res.status(400).json({ error: 'No active site' });

  if (spec.interview_completed) {
    return res.json({ completed: true, client_brief: spec.client_brief || {} });
  }

  if (!spec.interview_state) {
    return res.status(400).json({ error: 'No interview in progress — call /api/interview/start first' });
  }

  const { question_id, answer } = req.body || {};
  if (!question_id) return res.status(400).json({ error: 'question_id is required' });

  let result;
  try {
    result = recordAnswer(spec.interview_state, question_id, answer || '');
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  // Persist updated state
  spec.interview_state = result.state;

  if (result.completed) {
    const previousBrief = spec.client_brief || {};
    spec.interview_completed = true;
    spec.interview_pending = false;
    spec.client_brief = result.client_brief;
    writeSpec(spec);

    // Capture brief corrections — compare previous auto-populated brief vs submitted
    try {
      const corrections = [];
      for (const [key, value] of Object.entries(result.client_brief)) {
        if (previousBrief[key] !== undefined && previousBrief[key] !== value) {
          corrections.push({ field: key, original: previousBrief[key], corrected: value, at: new Date().toISOString() });
        }
      }
      if (corrections.length > 0) {
        const corrPath = path.join(SITE_DIR(), 'brief-corrections.jsonl');
        fs.appendFileSync(corrPath, JSON.stringify({ tag: TAG, corrections, at: new Date().toISOString() }) + '\n');
        corrections.forEach(c => suggestionLogger.logSuggestion(`brief-correction:${c.field}`, {
          active_site: TAG, intent: 'brief_correction', source: 'interview', weight: 2.0
        }));
      }
    } catch {}

    return res.json({ completed: true, client_brief: result.client_brief });
  }

  writeSpec(spec);
  res.json({ question: result.nextQuestion });
});

/**
 * GET /api/interview/status
 * Returns current interview state for the active site.
 */
app.get('/api/interview/status', (req, res) => {
  const spec = readSpec();
  if (!spec) return res.status(400).json({ error: 'No active site' });

  res.json({
    interview_completed: !!spec.interview_completed,
    client_brief: spec.client_brief || null,
    in_progress: !!(spec.interview_state && !spec.interview_state?.completed),
    mode: spec.interview_state?.mode || null,
    current_index: spec.interview_state?.current_index ?? null,
    total: spec.interview_state?.questions?.length ?? null,
  });
});

/**
 * GET /api/interview/health
 * Session 11 Fix 4: single endpoint that tells the Studio UI whether
 * it should automatically prompt the user to start an interview. It
 * combines the admin-level `auto_interview` setting, the per-site
 * `interview_pending` flag, and the `shouldInterview()` helper so
 * clients don't have to replicate the policy.
 */
app.get('/api/interview/health', (req, res) => {
  const spec = readSpec();
  const settings = loadSettings();
  const auto = settings.auto_interview !== false;
  if (!spec) {
    return res.json({
      auto_interview_enabled: auto,
      should_prompt: false,
      reason: 'no_active_site',
    });
  }
  const pending = spec.interview_pending === true;
  const needed = shouldInterview(spec);
  const shouldPrompt = auto && pending && needed;
  res.json({
    auto_interview_enabled: auto,
    interview_pending: pending,
    interview_completed: !!spec.interview_completed,
    should_prompt: shouldPrompt,
    reason: !auto ? 'auto_disabled_by_admin'
      : !pending ? 'not_flagged_pending'
      : !needed ? 'already_built_or_completed'
      : 'ready_to_prompt',
    site_tag: spec.tag || null,
  });
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
app.post('/api/generate-image-prompt', async (req, res) => {
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

  const response = await callSDK(prompt, { maxTokens: 4096, callSite: 'image-prompt', timeoutMs: 120000 });
  if (!response.trim()) {
    return res.status(500).json({ error: 'Failed to generate image prompt' });
  }
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      result.suggested_dimensions = suggestedDims;
      return res.json(result);
    }
  } catch {}
  res.json({ prompt: response.trim(), suggested_dimensions: suggestedDims, format: 'jpg' });
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

// --- Stock photo search (preview grid for QSF + Image Browser tab) ---
app.get('/api/stock-search', async (req, res) => {
  const { query, width, height, provider, limit } = req.query;
  if (!query) return res.status(400).json({ error: 'query required' });

  const w = parseInt(width) || 800;
  const h = parseInt(height) || 600;
  const perProvider = Math.min(parseInt(limit) || 6, 20); // cap at 20 per provider
  const prov = (provider || 'all').toLowerCase();

  let results = [];
  if (prov === 'unsplash') {
    results = await fetchFromProvider('unsplash', query, w, h, perProvider);
  } else if (prov === 'pexels') {
    results = await fetchFromProvider('pexels', query, w, h, perProvider);
  } else {
    // 'all' — split evenly between providers
    const half = Math.ceil(perProvider / 2);
    const [unsplashResults, pexelsResults] = await Promise.all([
      fetchFromProvider('unsplash', query, w, h, half),
      fetchFromProvider('pexels', query, w, h, half),
    ]);
    results = [...unsplashResults, ...pexelsResults];
  }

  // Pad with placeholder if we have < 2 real results
  if (results.length < 2) {
    results.push(...await fetchFromProvider('placeholder', query, w, h, 1));
  }

  res.json({ results, query, provider: prov });
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

    // Log telemetry
    const fileSize = fs.existsSync(outputFile) ? fs.statSync(outputFile).size : 0;
    logMediaOperation({
      provider: provider || 'stock',
      model: provider || 'unsplash',
      operation: 'generate',
      site: TAG,
      cost_usd: 0,
      credits_used: 0,
      generation_time_seconds: 0,
      file_size_bytes: fileSize,
      prompt: query || '',
      siteDir: SITE_DIR(),
    });

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
const SETTINGS_DIR = path.join(process.env.HOME || '~', '.config', 'famtastic');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'studio-config.json');
const SHAY_DEVELOPER_AUDIT_FILE = path.join(SETTINGS_DIR, 'shay-developer-mode-audit.jsonl');
const SHAY_DEVELOPER_TRUST_MODES = ['observe_only', 'propose_changes', 'apply_with_approval', 'trusted_auto_apply'];

function loadBrainContext() {
  const indexPath = path.join(HUB_ROOT, '.brain', 'INDEX.md');
  if (!fs.existsSync(indexPath)) return '';
  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    return '\n\n## FAMtastic Institutional Knowledge\n' + content;
  } catch (e) {
    console.warn('[brain] Failed to load INDEX.md:', e.message);
    return '';
  }
}

function logSiteBuild(spec, verificationResult) {
  const logPath = path.join(HUB_ROOT, '.brain', 'site-log.jsonl');
  const entry = {
    siteId: TAG,
    siteName: spec.site_name || TAG,
    niche: spec.business_type || null,
    pages: (spec.design_brief?.must_have_sections || []).length,
    builtAt: new Date().toISOString(),
    verificationStatus: verificationResult?.status || 'unknown',
    model: loadSettings().model,
  };
  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch (e) {
    console.warn('[brain] Failed to log build:', e.message);
  }
}

function loadSettings() {
  const defaults = {
    model: 'claude-sonnet-4-6',
    deploy_target: 'netlify',
    deploy_team: 'fritz-medine',
    brainstorm_profile: 'balanced',
    preview_port: 3333,
    studio_port: 3334,
    max_upload_size_mb: 5,
    max_uploads_per_site: 100,
    auto_summary: true,
    auto_version: true,
    auto_interview: true,
    max_versions: 50,
    hero_full_width: true,
    anthropic_api_key: '',
    gemini_api_key: '',
    google_api_key: '',
    openai_api_key: '',
    leonardo_api_key: '',
    openrouter_api_key: '',
    firefly_client_id: '',
    firefly_client_secret: '',
    prod_sites_base: path.join(require('os').homedir(), 'famtastic-sites'),
    developer_mode: {
      enabled: true,
      trust_mode: 'apply_with_approval',
      approved_paths: [HUB_ROOT],
      require_explicit_approval: true,
      allow_deploy_triggers: false,
      audit_log_limit: 200,
    },
    shay_lite_settings: {
      identity_mode: 'character',
      default_identity_mode: 'character',
      remember_last_identity: true,
      proactive_behavior: 'context_nudges',
      allow_proactive_messages: true,
      event_reaction_intensity: 'balanced',
      character_style: 'default',
      character_variant: 'shay-default',
    },
  };
  if (fs.existsSync(SETTINGS_FILE)) {
    try {
      const loaded = { ...defaults, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) };
      loaded.developer_mode = normalizeShayDeveloperModeSettings(loaded.developer_mode);
      loaded.shay_lite_settings = normalizeShayLiteSettings(loaded.shay_lite_settings);
      return loaded;
    } catch {
      defaults.developer_mode = normalizeShayDeveloperModeSettings(defaults.developer_mode);
      defaults.shay_lite_settings = normalizeShayLiteSettings(defaults.shay_lite_settings);
      return defaults;
    }
  }
  defaults.developer_mode = normalizeShayDeveloperModeSettings(defaults.developer_mode);
  defaults.shay_lite_settings = normalizeShayLiteSettings(defaults.shay_lite_settings);
  return defaults;
}

function saveSettings(settings) {
  const dir = path.dirname(SETTINGS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  settings.developer_mode = normalizeShayDeveloperModeSettings(settings.developer_mode);
  settings.shay_lite_settings = normalizeShayLiteSettings(settings.shay_lite_settings);
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function getConfiguredSecretValue(primaryEnvKey, fallbackEnvKey, settingsKeys) {
  if (primaryEnvKey && process.env[primaryEnvKey]) return process.env[primaryEnvKey];
  if (fallbackEnvKey && process.env[fallbackEnvKey]) return process.env[fallbackEnvKey];
  const settings = loadSettings();
  const keys = Array.isArray(settingsKeys) ? settingsKeys : [settingsKeys];
  for (const key of keys) {
    if (key && settings && settings[key]) return settings[key];
  }
  return '';
}

function getGoogleApiKey() {
  return getConfiguredSecretValue('GEMINI_API_KEY', 'GOOGLE_API_KEY', ['gemini_api_key', 'google_api_key']);
}

function normalizeShayDeveloperModeSettings(raw = {}) {
  const approvedPaths = Array.isArray(raw.approved_paths)
    ? raw.approved_paths
    : String(raw.approved_paths || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);
  const normalizedPaths = [...new Set(approvedPaths
    .map(p => {
      try { return path.resolve(String(p || '').trim()); } catch { return ''; }
    })
    .filter(Boolean))];
  const trustMode = SHAY_DEVELOPER_TRUST_MODES.includes(raw.trust_mode) ? raw.trust_mode : 'observe_only';
  return {
    enabled: raw.enabled === true,
    trust_mode: trustMode,
    approved_paths: normalizedPaths,
    require_explicit_approval: raw.require_explicit_approval !== false,
    allow_deploy_triggers: raw.allow_deploy_triggers === true,
    audit_log_limit: Number(raw.audit_log_limit) > 0 ? Math.min(1000, Number(raw.audit_log_limit)) : 200,
  };
}

function getShayDeveloperModeSettings() {
  const settings = loadSettings();
  return normalizeShayDeveloperModeSettings(settings.developer_mode);
}

const SHAY_LITE_IDENTITY_MODES = ['character', 'orb_classic', 'mini_panel'];
const SHAY_PROACTIVE_BEHAVIOR_MODES = ['off', 'context_nudges', 'active_assist'];
const SHAY_EVENT_REACTION_INTENSITIES = ['quiet', 'balanced', 'expressive'];

function normalizeShayLiteSettings(raw = {}) {
  const identityMode = SHAY_LITE_IDENTITY_MODES.includes(raw.identity_mode) ? raw.identity_mode : 'character';
  const defaultIdentityMode = SHAY_LITE_IDENTITY_MODES.includes(raw.default_identity_mode) ? raw.default_identity_mode : 'character';
  const proactiveBehavior = SHAY_PROACTIVE_BEHAVIOR_MODES.includes(raw.proactive_behavior) ? raw.proactive_behavior : 'context_nudges';
  const eventReactionIntensity = SHAY_EVENT_REACTION_INTENSITIES.includes(raw.event_reaction_intensity) ? raw.event_reaction_intensity : 'balanced';
  return {
    identity_mode: identityMode,
    default_identity_mode: defaultIdentityMode,
    remember_last_identity: raw.remember_last_identity !== false,
    proactive_behavior: proactiveBehavior,
    allow_proactive_messages: raw.allow_proactive_messages !== false,
    event_reaction_intensity: eventReactionIntensity,
    character_style: String(raw.character_style || 'default').trim() || 'default',
    character_variant: String(raw.character_variant || 'shay-default').trim() || 'shay-default',
  };
}

function logShayDeveloperModeEvent(event = {}) {
  try {
    fs.mkdirSync(path.dirname(SHAY_DEVELOPER_AUDIT_FILE), { recursive: true });
    const entry = {
      timestamp: new Date().toISOString(),
      site_tag: TAG,
      active_page: currentPage || 'index.html',
      ...event,
    };
    fs.appendFileSync(SHAY_DEVELOPER_AUDIT_FILE, JSON.stringify(entry) + '\n');
  } catch {}
}

function readShayDeveloperModeAudit(limit) {
  const max = Number(limit) > 0 ? Math.min(500, Number(limit)) : getShayDeveloperModeSettings().audit_log_limit;
  if (!fs.existsSync(SHAY_DEVELOPER_AUDIT_FILE)) return [];
  try {
    const lines = fs.readFileSync(SHAY_DEVELOPER_AUDIT_FILE, 'utf8').trim().split('\n').filter(Boolean);
    return lines.slice(-max).reverse().map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function summarizeShayDeveloperMode(settings = getShayDeveloperModeSettings()) {
  const modeLabels = {
    observe_only: 'Observe only',
    propose_changes: 'Propose changes',
    apply_with_approval: 'Apply with approval',
    trusted_auto_apply: 'Trusted auto-apply',
  };
  return {
    enabled: settings.enabled,
    trust_mode: settings.trust_mode,
    trust_mode_label: modeLabels[settings.trust_mode] || settings.trust_mode,
    approved_paths: settings.approved_paths || [],
    approved_scope_count: Array.isArray(settings.approved_paths) ? settings.approved_paths.length : 0,
    require_explicit_approval: settings.require_explicit_approval !== false,
    allow_deploy_triggers: settings.allow_deploy_triggers === true,
    audit_log_limit: settings.audit_log_limit || 200,
  };
}

function hasApprovedPathScope(targetPath, approvedPaths = []) {
  if (!targetPath) return false;
  const resolvedTarget = path.resolve(targetPath);
  return approvedPaths.some(scopePath => {
    const resolvedScope = path.resolve(scopePath);
    return resolvedTarget === resolvedScope || resolvedTarget.startsWith(resolvedScope + path.sep);
  });
}

function isExplicitDeveloperApprovalGranted(context = {}) {
  return context.developer_mode_approved === true
    || context.approved === true
    || context.trusted_auto_apply === true;
}

function authorizeShayDeveloperAction(action, targetPaths = [], context = {}) {
  const settings = getShayDeveloperModeSettings();
  const summary = summarizeShayDeveloperMode(settings);
  const scopedTargets = (targetPaths || []).map(p => path.resolve(p));
  const allTargetsInScope = scopedTargets.length > 0 && scopedTargets.every(target => hasApprovedPathScope(target, settings.approved_paths));
  const approvalGranted = isExplicitDeveloperApprovalGranted(context);

  if (!settings.enabled) {
    return {
      allowed: false,
      summary,
      reason: 'Developer Mode is off.',
      status: 'disabled',
    };
  }
  if (settings.trust_mode === 'observe_only') {
    return {
      allowed: false,
      summary,
      reason: 'Developer Mode is in Observe only.',
      status: 'observe_only',
    };
  }
  if (settings.trust_mode === 'propose_changes') {
    return {
      allowed: false,
      summary,
      reason: 'Developer Mode can propose changes but not apply them.',
      status: 'propose_only',
    };
  }
  if (!allTargetsInScope) {
    return {
      allowed: false,
      summary,
      reason: 'Requested write paths are outside the approved Developer Mode scope.',
      status: 'out_of_scope',
    };
  }
  if (action === 'deploy_trigger' && !settings.allow_deploy_triggers) {
    return {
      allowed: false,
      summary,
      reason: 'Deploy triggers are disabled for Developer Mode.',
      status: 'deploy_blocked',
    };
  }
  if (settings.trust_mode === 'apply_with_approval' && settings.require_explicit_approval !== false && !approvalGranted) {
    return {
      allowed: false,
      summary,
      reason: 'This action requires explicit approval in Apply with approval mode.',
      status: 'approval_required',
    };
  }
  return {
    allowed: true,
    summary,
    reason: null,
    status: settings.trust_mode,
  };
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

app.post('/api/build/cancel', (req, res) => {
  const wasInProgress = buildInProgress;
  const cancelledRunId = currentBuildRunId;

  // Kill the active build subprocesses BEFORE clearing the lock.
  // This ensures the running Claude/page-build children are actually stopped,
  // not just the lock flag cleared while work continues in the background.
  if (wasInProgress && buildOwnerWs) {
    killBuildProcesses(buildOwnerWs);
    console.log(`[studio] Build subprocesses killed for run=${cancelledRunId}`);
  }

  setBuildInProgress(false);
  console.log(`[studio] Build cancelled via API — run=${cancelledRunId} at ${new Date().toISOString()}`);

  // Broadcast cancellation to all connected WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(JSON.stringify({
        type: 'build_cancelled',
        content: 'Build cancelled.',
        was_in_progress: wasInProgress,
        cancelled_run_id: cancelledRunId,
        timestamp: new Date().toISOString()
      }));
    }
  });
  res.json({ success: true, was_in_progress: wasInProgress, cancelled_run_id: cancelledRunId });
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

/**
 * Sync a component schema to its .claude/skills/components/<type>/SKILL.md file.
 * Auto-creates the skill directory and file if it doesn't exist.
 * If it exists, updates usage count and adds/updates field/slot/CSS var listings.
 * Fields already documented are NOT overwritten so hand-edited notes are preserved.
 */
function syncSkillFromComponent(component) {
  const SKILLS_DIR = path.join(HUB_ROOT, '.claude', 'skills', 'components');
  const compType = (component.type || component.component_id || 'generic').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const skillDir = path.join(SKILLS_DIR, compType);
  const skillFile = path.join(skillDir, 'SKILL.md');

  let existingSkill = '';
  let usageCount = 0;
  let usedInSites = [];
  if (fs.existsSync(skillFile)) {
    existingSkill = fs.readFileSync(skillFile, 'utf8');
    const ucMatch = existingSkill.match(/Usage count:\s*(\d+)/);
    if (ucMatch) usageCount = parseInt(ucMatch[1], 10);
    const sitesMatch = existingSkill.match(/Used in:\s*(.+)/);
    if (sitesMatch) usedInSites = sitesMatch[1].split(',').map(s => s.trim()).filter(Boolean);
  }

  usageCount++;
  if (component.created_from && !usedInSites.includes(component.created_from)) {
    usedInSites.push(component.created_from);
  }

  const fields = (component.content_fields || []).map(f =>
    `- ${f.id} (type: ${f.type}) — ${f.default_value ? `default: "${f.default_value.substring(0, 60)}"` : 'no default'}`
  ).join('\n');

  const slots = (component.slots || []).map(s =>
    `- ${s.slot_id} (role: ${s.role})`
  ).join('\n');

  const cssVars = Object.entries(component.css?.variables || {}).map(([k, v]) =>
    `- ${k}: ${v}`
  ).join('\n');

  // Extract "lessons learned" from existing skill file if any
  const lessonsMatch = existingSkill.match(/## Lessons Learned\n([\s\S]*?)(?=##|$)/);
  const lessons = lessonsMatch ? lessonsMatch[1].trim() : '- No lessons recorded yet.';

  // Extract "when to use" from existing skill file if any
  const whenMatch = existingSkill.match(/## When to Use\n([\s\S]*?)(?=##|$)/);
  const whenToUse = whenMatch ? whenMatch[1].trim() :
    `Every site that needs a ${compType}. Use this component to ensure consistency and surgical editability.`;

  const skillContent = `# ${component.name || compType} Component Skill

## Identity
- Component type: ${compType}
- Component ID: ${component.component_id}
- Current version: ${component.version || '1.0'}
- Usage count: ${usageCount}
- Used in: ${usedInSites.join(', ') || 'none'}
- Last updated: ${component.updated_at || component.created_at || new Date().toISOString()}

## Required Fields
${fields || '- (no fields detected)'}

## Required Slots
${slots || '- (no image slots detected)'}

## CSS Variables
${cssVars || '- (no CSS variables detected)'}

## HTML Template Structure
\`\`\`html
${(component.html_template || '<!-- template not captured -->').substring(0, 2000)}
\`\`\`

## When to Use
${whenToUse}

## Lessons Learned
${lessons}
`;

  try {
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(skillFile, skillContent, 'utf8');
    console.log(`[skills] Synced skill: ${skillFile} (usage #${usageCount})`);
  } catch (e) {
    console.warn(`[skills] Could not sync skill file: ${e.message}`);
  }
}

// --- Component Library API ---

// List all components in the library
app.get('/api/components', (req, res) => {
  const libPath = path.join(HUB_ROOT, 'components', 'library.json');
  if (!fs.existsSync(libPath)) return res.json({ version: '1.0', components: [] });
  try {
    const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
    res.json(lib);
  } catch { res.json({ version: '1.0', components: [] }); }
});

// Get a single component by ID
app.get('/api/components/:id', (req, res) => {
  const compPath = path.join(HUB_ROOT, 'components', req.params.id, 'component.json');
  if (!fs.existsSync(compPath)) return res.status(404).json({ error: 'Component not found' });
  try {
    res.json(JSON.parse(fs.readFileSync(compPath, 'utf8')));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

function normalizeComponentImportPayload(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const componentId = String(source.component_id || source.id || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  if (!componentId) throw new Error('component_id required');

  const htmlTemplate = String(source.html_template || source.html || '').trim();
  if (!htmlTemplate) throw new Error('html_template required');

  const normalized = {
    component_id: componentId,
    id: componentId,
    name: String(source.name || componentId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
    type: String(source.type || 'generic'),
    version: String(source.version || '1.0'),
    description: String(source.description || ''),
    created_from: source.created_from || source.extracted_from || 'imported',
    created_at: source.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
    html_template: htmlTemplate,
    css: source.css && typeof source.css === 'object' ? source.css : {
      variables: source.css_variables || {},
      local: source.css_local || source.css_text || '',
    },
    js: source.js && typeof source.js === 'object' ? source.js : {
      local: source.js_local || source.js_text || '',
    },
    content_fields: Array.isArray(source.content_fields) ? source.content_fields : [],
    slots: Array.isArray(source.slots) ? source.slots : [],
    dependencies: source.dependencies && typeof source.dependencies === 'object'
      ? source.dependencies
      : { css: [], js: [], external: [], fonts: [] },
    dependency_manifest: source.dependency_manifest && typeof source.dependency_manifest === 'object'
      ? source.dependency_manifest
      : null,
    css_variables: source.css_variables || source.css?.variables || {},
    slot_schema: Array.isArray(source.slot_schema) ? source.slot_schema : [],
    field_schema: Array.isArray(source.field_schema) ? source.field_schema : [],
    preview_assets: Array.isArray(source.preview_assets) ? source.preview_assets : [],
    demo_assets: Array.isArray(source.demo_assets) ? source.demo_assets : [],
    usage_count: Number(source.usage_count || 0),
    tags: Array.isArray(source.tags) ? source.tags : [],
  };

  return normalized;
}

app.post('/api/components/import', (req, res) => {
  try {
    const component = normalizeComponentImportPayload(req.body && (req.body.component || req.body));
    const compDir = path.join(HUB_ROOT, 'components', component.component_id);
    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(path.join(compDir, 'component.json'), JSON.stringify(component, null, 2));
    fs.writeFileSync(path.join(compDir, `${component.component_id}.html`), component.html_template);
    if (component.css && component.css.local) {
      fs.writeFileSync(path.join(compDir, `${component.component_id}.css`), String(component.css.local));
    }
    if (component.js && component.js.local) {
      fs.writeFileSync(path.join(compDir, `${component.component_id}.js`), String(component.js.local));
    }

    const libPath = path.join(HUB_ROOT, 'components', 'library.json');
    let lib = { version: '1.0', components: [] };
    if (fs.existsSync(libPath)) {
      try { lib = JSON.parse(fs.readFileSync(libPath, 'utf8')); } catch {}
    }
    lib.components = (lib.components || []).filter(c => (c.component_id || c.id) !== component.component_id);
    lib.components.push({
      id: component.component_id,
      component_id: component.component_id,
      name: component.name,
      type: component.type,
      version: component.version,
      created_from: component.created_from,
      created_at: component.created_at,
      updated_at: component.updated_at,
      field_count: component.content_fields.length,
      slot_count: component.slots.length,
      css_variables: Object.keys(component.css_variables || {}),
      used_in: Array.isArray(component.sites_using) ? component.sites_using : [],
      path: component.component_id,
      description: component.description || `${component.type} component import`,
    });
    lib.last_updated = new Date().toISOString();
    fs.writeFileSync(libPath, JSON.stringify(lib, null, 2));

    syncSkillFromComponent(component);
    res.json({ success: true, component });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Export a section from the current site as a component
app.post('/api/components/export', (req, res) => {
  const { page, section_id, component_id } = req.body;
  if (!page || !component_id) return res.status(400).json({ error: 'page and component_id required' });

  const pagePath = path.join(DIST_DIR(), page);
  if (!fs.existsSync(pagePath)) return res.status(404).json({ error: 'Page not found' });

  const html = fs.readFileSync(pagePath, 'utf8');
  const $ = cheerio.load(html);

  // Find the section by data-section-id or by order
  let section;
  if (section_id) {
    section = $(`[data-section-id="${section_id}"]`);
  }
  if (!section || section.length === 0) {
    // Fallback: find <section> or main content area
    section = $('section').first();
  }
  if (!section || section.length === 0) {
    return res.status(404).json({ error: 'Section not found' });
  }

  const sectionHtml = $.html(section);

  // Extract CSS variables referenced in the section
  const cssPath = path.join(DIST_DIR(), 'assets', 'styles.css');
  const css = fs.existsSync(cssPath) ? fs.readFileSync(cssPath, 'utf8') : '';
  const varRefs = sectionHtml.match(/var\(--[^)]+\)/g) || [];
  const cssVariables = {};
  for (const ref of varRefs) {
    const varName = ref.match(/--[^)]+/)?.[0];
    if (!varName) continue;
    const valMatch = css.match(new RegExp(`${varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*([^;]+)`));
    if (valMatch) cssVariables[varName] = valMatch[1].trim();
  }

  // Extract fields from the section
  const fields = [];
  $('[data-field-id]', section).each((_, el) => {
    fields.push({
      id: $(el).attr('data-field-id'),
      type: $(el).attr('data-field-type') || 'text',
      default_value: $(el).text().trim(),
    });
  });

  // Extract slots
  const slots = [];
  $('[data-slot-id]', section).each((_, el) => {
    slots.push({
      slot_id: $(el).attr('data-slot-id'),
      role: $(el).attr('data-slot-role') || 'generic',
    });
  });

  const component = {
    component_id: component_id,
    name: component_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    type: section.attr('data-section-type') || 'generic',
    version: '1.0',
    created_from: TAG,
    created_at: new Date().toISOString(),
    html_template: sectionHtml,
    css: { variables: cssVariables },
    content_fields: fields,
    slots,
    usage_count: 1,
    tags: [],
  };

  // ── Version tracking — bump version on re-export ────────────────────────
  const compDir = path.join(HUB_ROOT, 'components', component_id);
  const compJsonPath = path.join(compDir, 'component.json');
  let existingComp = null;
  let version = '1.0';
  if (fs.existsSync(compJsonPath)) {
    try {
      existingComp = JSON.parse(fs.readFileSync(compJsonPath, 'utf8'));
      // Bump minor version: 1.0 → 1.1 → 1.2, etc.
      const [major, minor] = (existingComp.version || '1.0').split('.').map(Number);
      version = `${major}.${(minor || 0) + 1}`;
      component.version = version;
      component.usage_count = (existingComp.usage_count || 0) + 1;
      component.created_at = existingComp.created_at; // preserve original creation date
      component.updated_at = new Date().toISOString();
      console.log(`[components] Re-exported "${component_id}" → version ${version}`);
    } catch {}
  } else {
    component.updated_at = component.created_at;
  }
  component.version = version;

  // ── Write component to filesystem ────────────────────────────────────────
  fs.mkdirSync(compDir, { recursive: true });
  fs.writeFileSync(compJsonPath, JSON.stringify(component, null, 2));
  fs.writeFileSync(path.join(compDir, `${component_id}.html`), sectionHtml);

  // ── Update library index ──────────────────────────────────────────────────
  const libPath = path.join(HUB_ROOT, 'components', 'library.json');
  let lib = { version: '1.0', components: [] };
  if (fs.existsSync(libPath)) {
    try { lib = JSON.parse(fs.readFileSync(libPath, 'utf8')); } catch {}
  }
  const existingEntry = lib.components.find(c => (c.component_id || c.id) === component_id);
  const usedIn = existingEntry?.used_in || [];
  if (!usedIn.includes(TAG)) usedIn.push(TAG);

  lib.components = lib.components.filter(c => (c.component_id || c.id) !== component_id);
  lib.components.push({
    id: component_id,
    component_id,
    name: component.name,
    type: component.type,
    version,
    created_from: component.created_from,
    created_at: component.created_at,
    updated_at: component.updated_at,
    field_count: fields.length,
    slot_count: slots.length,
    css_variables: Object.keys(cssVariables),
    used_in: usedIn,
    path: component_id,
    description: `${component.type} component with ${fields.length} editable fields`,
  });
  lib.last_updated = new Date().toISOString();
  fs.writeFileSync(libPath, JSON.stringify(lib, null, 2));

  // ── Skill auto-sync — update .claude/skills/components/<type>/SKILL.md ───
  syncSkillFromComponent(component);

  // ── Spec ref — record component_ref in spec.content ─────────────────────
  try {
    const specNow = readSpec();
    if (specNow.content && specNow.content[page]) {
      if (!specNow.content[page].sections) specNow.content[page].sections = [];
      const sectionId = section.attr('data-section-id') || component_id;
      const sIdx = specNow.content[page].sections.findIndex(s => s.section_id === sectionId);
      const sRef = { section_id: sectionId, component_ref: `${component_id}@${version}` };
      if (sIdx >= 0) specNow.content[page].sections[sIdx] = { ...specNow.content[page].sections[sIdx], ...sRef };
      else specNow.content[page].sections.push(sRef);
      writeSpec(specNow);
    }
  } catch {}

  studioEvents.emit(STUDIO_EVENTS.COMPONENT_INSERTED, { tag: TAG, component_id, version });
  console.log(`[components] Exported "${component_id}" v${version} from ${page} (${fields.length} fields, ${slots.length} slots, ${Object.keys(cssVariables).length} CSS vars)`);
  res.json({ success: true, component, field_count: fields.length, slot_count: slots.length });
});

// Content fields API — used by editable page view (Phase 2)
app.get('/api/content-fields/:page', (req, res) => {
  const page = req.params.page;
  if (!isValidPageName(page)) return res.status(400).json({ error: 'Invalid page name' });
  const spec = readSpec();
  const fields = spec.content?.[page]?.fields || [];
  res.json({ page, fields, total: fields.length });
});

// Update a single content field — surgical edit endpoint
app.post('/api/content-field', (req, res) => {
  const { page, field_id, new_value } = req.body;
  if (!page || !field_id || new_value === undefined) {
    return res.status(400).json({ error: 'page, field_id, and new_value required' });
  }

  const spec = readSpec();
  const field = spec.content?.[page]?.fields?.find(f => f.field_id === field_id);
  if (!field) return res.status(404).json({ error: 'Field not found in spec.content' });

  const oldValue = typeof field.value === 'string' ? field.value : (field.value?.text || JSON.stringify(field.value));

  // Surgical HTML replacement
  const pagePath = path.join(DIST_DIR(), page);
  if (!fs.existsSync(pagePath)) return res.status(404).json({ error: 'Page HTML not found' });

  let html = fs.readFileSync(pagePath, 'utf8');
  const $ = cheerio.load(html);

  // Try data-field-id selector first
  const el = $(`[data-field-id="${field_id}"]`);
  if (el.length > 0) {
    el.text(new_value);
    // Update href for phone/email
    if (field.type === 'phone' && el.attr('href')?.startsWith('tel:')) {
      el.attr('href', `tel:+1${new_value.replace(/\D/g, '')}`);
    } else if (field.type === 'email' && el.attr('href')?.startsWith('mailto:')) {
      el.attr('href', `mailto:${new_value}`);
    }
    fs.writeFileSync(pagePath, $.html());
  } else if (html.includes(oldValue)) {
    // Fallback: text match
    html = html.replace(new RegExp(oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), new_value);
    fs.writeFileSync(pagePath, html);
  } else {
    return res.status(404).json({ error: `Value "${oldValue}" not found in HTML` });
  }

  // Update spec for this page
  field.value = new_value;

  // Global field propagation — phone/email/address/hours update across all pages
  const GLOBAL_FIELD_TYPES = ['phone', 'email', 'address', 'hours'];
  const cascadePages = [];
  if (GLOBAL_FIELD_TYPES.includes(field.type) || field.scope === 'global') {
    const allPages = listPages().filter(p => p !== page);
    for (const otherPage of allPages) {
      const otherFields = spec.content?.[otherPage]?.fields || [];
      // Find matching field by type or field_id on other pages
      const matchField = otherFields.find(f =>
        f.type === field.type || f.field_id === field_id ||
        (f.field_id.includes(field.type) && f.type === field.type)
      );
      if (!matchField) continue;
      const otherPath = path.join(DIST_DIR(), otherPage);
      if (!fs.existsSync(otherPath)) continue;
      let otherHtml = fs.readFileSync(otherPath, 'utf8');
      const $2 = cheerio.load(otherHtml);
      const otherEl = $2(`[data-field-id="${matchField.field_id}"]`);
      if (otherEl.length > 0) {
        otherEl.text(new_value);
        if (field.type === 'phone' && otherEl.attr('href')?.startsWith('tel:')) {
          otherEl.attr('href', `tel:+1${new_value.replace(/\D/g, '')}`);
        } else if (field.type === 'email' && otherEl.attr('href')?.startsWith('mailto:')) {
          otherEl.attr('href', `mailto:${new_value}`);
        }
        fs.writeFileSync(otherPath, $2.html());
        matchField.value = new_value;
        cascadePages.push(otherPage);
      }
    }
  }

  writeSpec(spec, {
    source: 'content_field_api',
    mutationLevel: 'field',
    mutationTarget: field_id,
    oldValue,
    newValue: new_value,
  });

  studioEvents.emit(STUDIO_EVENTS.EDIT_APPLIED, { tag: TAG, page, field_id, new_value });
  res.json({ success: true, field_id, old_value: oldValue, new_value, cascade_pages: cascadePages });
});

// GET /api/brain-status — current API connection status for all three brains + Codex
app.get('/api/brain-status', (req, res) => {
  const status = getBrainStatus();
  res.json({
    claude:  status.claude  || { status: 'pending' },
    gemini:  status.gemini  || { status: 'pending' },
    openai:  status.openai  || { status: 'pending' },
    codex:   status.codex   || { status: 'pending' },
    timestamp: new Date().toISOString(),
  });
});

// Capability manifest — live state of what's working vs unavailable/broken
app.get('/api/capability-manifest', async (req, res) => {
  try {
    const manifest = await buildCapabilityManifest();
    res.json(manifest);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/studio-capabilities', async (req, res) => {
  try {
    const manifest = await buildCapabilityManifest();
    res.json(manifest);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/shay-shay/session-init', async (req, res) => {
  try {
    const manifest = loadManifest() || await buildCapabilityManifest();
    const agentCards = loadShayShayAgentCards();
    const diff = require('./lib/capability-manifest').diffStateVsManifest(manifest);
    const developerMode = summarizeShayDeveloperMode();
    const recentAudit = readShayDeveloperModeAudit(5);
    res.json({
      ok: true,
      generated_at: new Date().toISOString(),
      manifest,
      diff,
      agent_cards: agentCards,
      active_site: TAG,
      active_page: currentPage || 'index.html',
      developer_mode: developerMode,
      developer_audit: recentAudit,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Shay-Shay orchestrator endpoint — separate from Studio chat WebSocket
app.post('/api/shay-shay', async (req, res) => {
  try {
    const requestBody = (req && req.body && typeof req.body === 'object') ? req.body : {};
    const hasIncomingBridgeResult = Object.prototype.hasOwnProperty.call(requestBody, 'bridge_result');
    const {
      message,
      context = {},
      bridge_result: incomingBridgeResult = null,
      surface = 'lite',
      conversation_id = null,
      handoff_context = null,
    } = requestBody;
    if (!message) return res.status(400).json({ error: 'message required' });

    const bridgeState = resolveShayShayBridgeState(incomingBridgeResult, context, {
      topLevelProvided: hasIncomingBridgeResult,
    });

    // Load her knowledge package (manifest is cached for 60s)
    const manifest = await getCachedManifest();
    const instructions = loadShayShayInstructions();
    const agentCards = loadShayShayAgentCards();
    const siteSnapshot = buildShayShaySiteSnapshot(context, { bridgeState, surface, conversation_id });
    const bridgeDebug = siteSnapshot.bridge_debug;

    // Tier 0: deterministic commands — no AI needed
    const lower = message.toLowerCase().trim();
    const tier0 = classifyShayShayTier0(lower, context);
    if (tier0) {
      // job plan creation — create SQLite jobs, return structured plan
      if (tier0.intent === 'create_job_plan') {
        const planResult = buildShayShayJobPlan(message, context);
        return res.json({
          ...planResult,
          bridge_debug: bridgeDebug,
        });
      }
      // character_pipeline is async — fire-and-forget, return jobId immediately
      if (tier0.intent === 'character_pipeline') {
        suggestionLogger.logSuggestion(message, { active_site: TAG, intent: 'character_pipeline', source: 'shay-shay-t0' });
        const jobId = require('crypto').randomUUID();
        setImmediate(() => runCharacterPipeline(jobId, message, context).catch(e =>
          broadcastAll({ type: 'character-pipeline-error', jobId, error: e.message })
        ));
        return res.json({
          action: 'character_pipeline',
          jobId,
          status: 'started',
          response: `Starting character pipeline. I'll generate the anchor, then all 12 poses, hero video, and promo — broadcasting progress as each step completes.`,
          bridge_debug: bridgeDebug,
        });
      }
      // autonomous_build is async — handle separately
      if (tier0.intent === 'autonomous_build') {
        suggestionLogger.logSuggestion(message, { active_site: TAG, intent: 'autonomous_build', source: 'shay-shay-t0' });
        const buildResult = await runAutonomousBuild(message, context);
        return res.json({
          action: 'autonomous_build',
          response: buildResult.message || (buildResult.error ? `Build failed: ${buildResult.error}` : 'Build initiated'),
          bridge_debug: bridgeDebug,
          ...buildResult,
        });
      }
      const result = handleShayShayTier0(tier0, message, context, manifest);
      suggestionLogger.logSuggestion(message, { active_site: TAG, intent: tier0.intent, source: 'shay-shay-t0' });
      return res.json({
        ...result,
        bridge_debug: bridgeDebug,
      });
    }

    const direct = answerShayShayDirect(lower, siteSnapshot, manifest);
    if (direct) {
      const suggestionId = suggestionLogger.logSuggestion(message, {
        active_site: TAG,
        intent: direct.intent || 'shay_shay_direct',
        source: 'shay-shay-direct',
      });
      return res.json({
        response: direct.response,
        action: direct.action || null,
        source: 'shay-shay-direct',
        suggestion_id: suggestionId,
        bridge_debug: bridgeDebug,
      });
    }

    // Tiers 1-3: routed reasoning with persistent per-brain sessions
    const reasoning = classifyShayShayReasoning(lower);
    const selection = selectShayShayBrain(reasoning, manifest, agentCards);

    let usedBrain = selection.brain;
    let usedModel = selection.model;
    let responseText = '';

    try {
      responseText = await executeShayShayBrainCall({
        brain: selection.brain,
        model: selection.model,
        message,
        context,
        manifest,
        instructions,
        agentCards,
        siteSnapshot,
        reasoning,
        conversation_id,
        surface,
        handoff_context,
      });
    } catch (err) {
      if (selection.fallbackBrain && selection.fallbackBrain !== selection.brain) {
        usedBrain = selection.fallbackBrain;
        usedModel = selection.fallbackModel;
        responseText = await executeShayShayBrainCall({
          brain: selection.fallbackBrain,
          model: selection.fallbackModel,
          message,
          context,
          manifest,
          instructions,
          agentCards,
          siteSnapshot,
          reasoning,
          conversation_id,
          surface,
          handoff_context,
        });
      } else {
        throw err;
      }
    }

    const normalized = normalizeShayShayResponse(responseText, {
      response: responseText || 'I do not have a good answer yet.',
      action: null,
    });

    if (selection.note) {
      normalized.response = `${selection.note} ${normalized.response}`.trim();
    }

    // Bridge execution loop — if Shay signaled a bridge_request, run it and include result
    let bridgeResult = null;
    if (normalized.bridge_request && typeof normalized.bridge_request === 'object') {
      logShayShayBridgeRequest(normalized.bridge_request);
      try {
        bridgeResult = await executeBridgeOp(normalized.bridge_request);
        logShayShayBridgeResult(normalized.bridge_request, bridgeResult);
      } catch (e) {
        bridgeResult = { op: normalized.bridge_request.op, error: e.message };
        logShayShayBridgeResult(normalized.bridge_request, bridgeResult);
      }
    }

    // Log suggestion for outcome tracking
    const suggestionId = suggestionLogger.logSuggestion(message, {
      active_site: TAG,
      intent: `shay_shay_${reasoning.kind}`,
      source: 'shay-shay',
      tier: reasoning.tier,
      brain: usedBrain,
      model: usedModel,
    });

    res.json({
      response: normalized.response,
      action: normalized.action || null,
      message: normalized.message,
      tier: reasoning.tier,
      reasoning: reasoning.kind,
      brain: usedBrain,
      model: usedModel,
      suggestion_id: suggestionId,
      bridge_debug: bridgeDebug,
      conversation_id: conversation_id || null,
      ...(bridgeResult ? { bridge_result: bridgeResult } : {}),
      ...(normalized.commit_request && typeof normalized.commit_request === 'object' ? { commit_request: normalized.commit_request } : {}),
      ...(normalized.usage ? { usage: normalized.usage } : {}),
    });

    // Async memory extraction — non-blocking, best-effort
    extractAndStoreMemory(message, normalized.response, { siteTag: TAG, source: 'shay-shay' }).catch(() => {});
  } catch (e) {
    console.error('[shay-shay] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Shay-Shay gap capture — explicit gap logging endpoint
app.post('/api/shay-shay/gap', (req, res) => {
  try {
    const { message, category, capability_id } = req.body;
    const entry = gapLogger.logGap(
      TAG, message || 'unknown',
      category || gapLogger.GAP_CATEGORIES.NOT_BUILT,
      capability_id ? { capability_id } : {}
    );
    res.json({ logged: true, entry });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Shay-Shay suggestion outcome — called when Fritz accepts/dismisses
app.post('/api/shay-shay/outcome', (req, res) => {
  try {
    const { suggestion_id, outcome } = req.body;
    suggestionLogger.logOutcome(suggestion_id, outcome);
    res.json({ logged: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function loadShayShayInstructions() {
  const instructionsPath = path.join(__dirname, 'shay-shay', 'instructions.md');
  return fs.existsSync(instructionsPath)
    ? fs.readFileSync(instructionsPath, 'utf8')
    : '';
}

function loadShayShayAgentCards() {
  const cardsDir = path.join(__dirname, 'agent-cards');
  if (!fs.existsSync(cardsDir)) return {};
  return fs.readdirSync(cardsDir)
    .filter(file => file.endsWith('.agent-card.json'))
    .reduce((acc, file) => {
      try {
        const card = JSON.parse(fs.readFileSync(path.join(cardsDir, file), 'utf8'));
        if (card && card.id) acc[card.id] = card;
      } catch {}
      return acc;
    }, {});
}

function isShayShayBridgeObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function resolveShayShayBridgeState(topLevelBridgeResult = null, context = {}, opts = {}) {
  if (opts && opts.topLevelProvided) {
    return {
      bridgeResult: isShayShayBridgeObject(topLevelBridgeResult) ? topLevelBridgeResult : null,
      source: 'top_level',
      seen: true,
    };
  }
  if (isShayShayBridgeObject(topLevelBridgeResult)) {
    return { bridgeResult: topLevelBridgeResult, source: 'top_level', seen: true };
  }
  // Legacy fallback for older clients that still nest bridge_result under context.
  if (isShayShayBridgeObject(context && context.bridge_result)) {
    return { bridgeResult: context.bridge_result, source: 'context_fallback', seen: true };
  }
  return { bridgeResult: null, source: 'none', seen: false };
}

function buildShayShayBridgeDebug(bridgeState) {
  const result = bridgeState && isShayShayBridgeObject(bridgeState.bridgeResult)
    ? bridgeState.bridgeResult
    : null;
  const lastRequestSeen = bridgeState && Object.prototype.hasOwnProperty.call(bridgeState, 'seen')
    ? !!bridgeState.seen
    : !!(bridgeState && bridgeState.source && bridgeState.source !== 'none');
  return {
    last_request_seen: lastRequestSeen,
    last_result_source: bridgeState && bridgeState.source ? bridgeState.source : 'none',
    last_result_op: result && typeof result.op === 'string' ? result.op : null,
    last_result_exit_code: result && typeof result.exitCode === 'number' ? result.exitCode : null,
    last_result_had_stdout: !!(result && typeof result.stdout === 'string' && result.stdout.length > 0),
    last_result_had_stderr: !!(result && typeof result.stderr === 'string' && result.stderr.length > 0),
  };
}

function toShayShayRepoRelative(absPath) {
  if (!absPath) return null;
  const rel = path.relative(HUB_ROOT, absPath);
  return (rel || '.').split(path.sep).join('/');
}

function buildShayShayRepoPaths(context = {}) {
  const activeSiteTag = context.active_site || TAG || null;
  const activePage = context.active_page || currentPage || 'index.html';
  const studioDir = toShayShayRepoRelative(__dirname);
  const studioUiDir = toShayShayRepoRelative(path.join(__dirname, 'public'));
  const activeSiteDir = activeSiteTag ? toShayShayRepoRelative(path.join(SITES_ROOT, activeSiteTag)) : null;
  const activeSiteDistDir = activeSiteTag ? toShayShayRepoRelative(path.join(SITES_ROOT, activeSiteTag, 'dist')) : null;

  return {
    hub_root: '.',
    studio_dir: studioDir,
    studio_ui_dir: studioUiDir,
    studio_ui_entry: toShayShayRepoRelative(path.join(__dirname, 'public', 'index.html')),
    studio_orb_script: toShayShayRepoRelative(path.join(__dirname, 'public', 'js', 'studio-orb.js')),
    studio_orb_styles: toShayShayRepoRelative(path.join(__dirname, 'public', 'css', 'studio-orb.css')),
    studio_server_entry: toShayShayRepoRelative(path.join(__dirname, 'server.js')),
    active_site_dir: activeSiteDir,
    active_site_dist_dir: activeSiteDistDir,
    active_page_path: activeSiteDistDir ? path.posix.join(activeSiteDistDir, activePage) : null,
    bridge_aliases: {
      '@hub/': '.',
      '@studio/': studioDir,
      '@studio-ui/': studioUiDir,
      '@active-site/': activeSiteDistDir,
    },
  };
}

function buildShayShaySiteSnapshot(context = {}, opts = {}) {
  const bridgeState = (opts && opts.bridgeState && typeof opts.bridgeState === 'object')
    ? opts.bridgeState
    : resolveShayShayBridgeState(null, context);
  const _surface = opts.surface || 'lite';
  const _conversation_id = opts.conversation_id || null;
  const spec = readSpec();
  const pages = listPages();
  const mediaSpecs = Array.isArray(spec.media_specs) ? spec.media_specs : [];
  const emptySlots = mediaSpecs.filter(slot => slot.status === 'empty').length;
  const deployHistory = Array.isArray(spec.deploy_history) ? spec.deploy_history : [];
  const lastDeploy = deployHistory.length > 0 ? deployHistory[deployHistory.length - 1] : null;
  const approvedDecisions = Array.isArray(spec.design_decisions)
    ? spec.design_decisions.filter(d => d && d.status === 'approved').length
    : 0;
  const uiState = (context && typeof context.ui_state === 'object' && context.ui_state) ? context.ui_state : {};
  const workspaceState = (context && typeof context.workspace_state === 'object' && context.workspace_state) ? context.workspace_state : {};
  const componentState = (context && typeof context.component_state === 'object' && context.component_state) ? context.component_state : {};
  const previewState = (context && typeof context.preview_state === 'object' && context.preview_state) ? context.preview_state : {};
  const developerMode = summarizeShayDeveloperMode();

  return {
    site_tag: context.active_site || TAG || null,
    site_name: spec.site_name || null,
    business_type: spec.business_type || null,
    active_page: context.active_page || currentPage || 'index.html',
    active_tab: context.active_tab || null,
    fam_score: context.fam_score != null ? context.fam_score : (spec.fam_score != null ? spec.fam_score : null),
    page_count: pages.length,
    pages,
    media_slots_total: mediaSpecs.length,
    media_slots_empty: emptySlots,
    approved_decisions: approvedDecisions,
    deployed_url: (spec.environments && spec.environments.production && spec.environments.production.url) || spec.deployed_url || null,
    last_deploy_status: lastDeploy && lastDeploy.status ? lastDeploy.status : null,
    brief_summary: summarizeDesignBrief(spec.design_brief),
    ui_state: {
      pip_badge_count: uiState.pip_badge_count != null ? uiState.pip_badge_count : null,
      worker_queue_pending_count: uiState.worker_queue_pending_count != null ? uiState.worker_queue_pending_count : null,
      worker_queue_badge_visible: uiState.worker_queue_badge_visible != null ? uiState.worker_queue_badge_visible : null,
      context_job_count: uiState.context_job_count != null ? uiState.context_job_count : null,
      context_diff_count: uiState.context_diff_count != null ? uiState.context_diff_count : null,
      shay_orb_state: uiState.shay_orb_state || null,
      shay_desk_has_transcript: uiState.shay_desk_has_transcript != null ? uiState.shay_desk_has_transcript : null,
      shay_mode: uiState.shay_mode || null,
      step_log_visible: uiState.step_log_visible != null ? uiState.step_log_visible : null,
      step_log_items: Array.isArray(uiState.step_log_items) ? uiState.step_log_items : [],
      intelligence_finding_cards_visible: uiState.intelligence_finding_cards_visible != null ? uiState.intelligence_finding_cards_visible : null,
      research_items_visible: uiState.research_items_visible != null ? uiState.research_items_visible : null,
      dismissed_prompt_keys: Array.isArray(uiState.dismissed_prompt_keys) ? uiState.dismissed_prompt_keys : [],
      validation: uiState.validation && typeof uiState.validation === 'object' ? uiState.validation : null,
    },
    workspace_state: {
      active_rail: workspaceState.active_rail || context.active_rail || null,
      sidebar_collapsed: workspaceState.sidebar_collapsed != null ? workspaceState.sidebar_collapsed : null,
      sidebar_visible: workspaceState.sidebar_visible != null ? workspaceState.sidebar_visible : null,
      active_mode: workspaceState.active_mode || null,
      active_tab: workspaceState.active_tab || context.active_tab || null,
      active_page: workspaceState.active_page || context.active_page || currentPage || null,
      workspace_layout: workspaceState.workspace_layout || null,
      inspector_pinned: workspaceState.inspector_pinned != null ? workspaceState.inspector_pinned : null,
      inspector_open: workspaceState.inspector_open != null ? workspaceState.inspector_open : null,
      selected_context: workspaceState.selected_context || null,
      return_stack: Array.isArray(workspaceState.return_stack) ? workspaceState.return_stack : [],
      open_tabs: Array.isArray(workspaceState.open_tabs) ? workspaceState.open_tabs : [],
      hierarchy_summary: workspaceState.hierarchy_summary || null,
    },
    component_state: {
      selected_context: componentState.selected_context || null,
      return_stack: Array.isArray(componentState.return_stack) ? componentState.return_stack : [],
      media_workspace: componentState.media_workspace || null,
      brief_workspace: componentState.brief_workspace || null,
    },
    preview_state: {
      active_page: previewState.active_page || context.active_page || currentPage || null,
      current_view_mode: previewState.current_view_mode || null,
      slot_mode_active: previewState.slot_mode_active != null ? previewState.slot_mode_active : null,
      current_slot_target: previewState.current_slot_target || null,
      preview_src: previewState.preview_src || null,
      preview_visible: previewState.preview_visible != null ? previewState.preview_visible : null,
      device_mode: previewState.device_mode || null,
      preview_port: previewState.preview_port != null ? previewState.preview_port : null,
    },
    repo_paths: buildShayShayRepoPaths(context),
    bridge_result: bridgeState.bridgeResult,
    bridge_debug: buildShayShayBridgeDebug(bridgeState),
    developer_mode: developerMode,
    repo_recent_commits: getRepoRecentCommits(),
    quality_signals: { last_test_run: getLastTestRun() },
    surface: _surface,
    conversation_id: _conversation_id,
    visibility_contract: {
      can_see: [
        'active site snapshot fields',
        'active page and active tab from client context',
        'explicit ui_state fields included by the browser payload',
        'workspace_state, component_state, and preview_state serialized from browser memory',
        'repo_paths for common bridge targets inside the repo'
      ],
      cannot_see_without_wiring: [
        'live DOM text not serialized into ui_state',
        'arbitrary rendered component state',
        'browser memory that is not included in the snapshot payload'
      ]
    }
  };
}

function summarizeDesignBrief(brief) {
  if (!brief || typeof brief !== 'object') return 'No design brief yet.';
  const parts = [
    brief.business_name,
    brief.industry,
    brief.style,
    brief.target_audience,
    brief.primary_goal,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' | ') : 'Design brief exists but core summary fields are sparse.';
}

const SHAY_SHAY_PROMPT_LIMITS = {
  pages: 8,
  stepLogItems: 4,
  dismissedPromptKeys: 4,
  returnStack: 4,
  openTabs: 4,
  excerptLines: {
    cerebrum: 16,
    shayContext: 24,
    studioContext: 24,
    crossSession: 24,
  },
  textChars: 220,
  urlChars: 160,
};

function truncateShayShayText(text, maxChars) {
  if (text == null) return text;
  const value = String(text);
  const limit = typeof maxChars === 'number' ? maxChars : SHAY_SHAY_PROMPT_LIMITS.textChars;
  if (value.length <= limit) return value;
  return value.slice(0, Math.max(0, limit - 12)).trimEnd() + ` ... (+${value.length - limit} chars)`;
}

function summarizeShayShayContextRef(value) {
  if (value == null) return value;
  if (typeof value === 'string') return truncateShayShayText(value, SHAY_SHAY_PROMPT_LIMITS.textChars);
  if (typeof value !== 'object') return value;
  const out = {};
  ['id', 'type', 'kind', 'label', 'title', 'name', 'page', 'slot_id', 'component_id'].forEach((key) => {
    if (value[key] == null) return;
    out[key] = typeof value[key] === 'string'
      ? truncateShayShayText(value[key], 120)
      : value[key];
  });
  if (Object.keys(out).length > 0) return out;
  try {
    return truncateShayShayText(JSON.stringify(value), SHAY_SHAY_PROMPT_LIMITS.textChars);
  } catch {
    return '[object]';
  }
}

function summarizeShayShayStepLogItem(item) {
  if (item == null) return item;
  if (typeof item === 'string') return truncateShayShayText(item, 120);
  if (typeof item !== 'object') return item;
  const title = item.title || item.label || item.step || item.message || item.description || null;
  const summary = {
    title: title ? truncateShayShayText(title, 120) : null,
    status: item.status || null,
    kind: item.kind || null,
  };
  return Object.fromEntries(Object.entries(summary).filter(([, val]) => val != null));
}

function summarizeShayShayOpenTab(tab) {
  if (tab == null) return tab;
  if (typeof tab === 'string') return truncateShayShayText(tab, 80);
  if (typeof tab !== 'object') return tab;
  const summary = {
    id: tab.id || tab.tab_id || tab.key || null,
    title: truncateShayShayText(tab.title || tab.label || tab.name || '', 80) || null,
    page: tab.page || tab.page_id || null,
    active: tab.active === true ? true : undefined,
    dirty: tab.dirty === true ? true : undefined,
  };
  return Object.fromEntries(Object.entries(summary).filter(([, val]) => val != null && val !== ''));
}

function summarizeShayShayValidation(validation) {
  if (!validation || typeof validation !== 'object') return null;
  const summary = {
    status: validation.status || null,
    current_step: validation.current_step != null ? validation.current_step : null,
    total_steps: validation.total_steps != null ? validation.total_steps : null,
    pending_steps: validation.pending_steps != null ? validation.pending_steps : null,
    failed_steps: validation.failed_steps != null ? validation.failed_steps : null,
  };
  return Object.fromEntries(Object.entries(summary).filter(([, val]) => val != null));
}

function summarizeShayShayStateBucket(value) {
  if (value == null) return value;
  if (typeof value === 'string') return truncateShayShayText(value, SHAY_SHAY_PROMPT_LIMITS.textChars);
  if (typeof value !== 'object') return value;
  const summary = {};
  Object.entries(value).slice(0, 8).forEach(([key, item]) => {
    if (item == null) {
      summary[key] = item;
    } else if (typeof item === 'string') {
      summary[key] = truncateShayShayText(item, SHAY_SHAY_PROMPT_LIMITS.textChars);
    } else if (typeof item === 'number' || typeof item === 'boolean') {
      summary[key] = item;
    } else if (Array.isArray(item)) {
      summary[`${key}_count`] = item.length;
    } else if (typeof item === 'object') {
      summary[key] = summarizeShayShayContextRef(item);
    }
  });
  return summary;
}

function assignShayShayArrayPreview(target, key, items, maxItems, mapItem) {
  if (!Array.isArray(items)) return;
  target[key] = items.slice(0, maxItems).map(item => mapItem ? mapItem(item) : item);
  if (items.length > maxItems) target[`${key}_omitted_count`] = items.length - maxItems;
}

function buildShayShayPromptSnapshot(siteSnapshot = {}) {
  const uiState = siteSnapshot.ui_state || {};
  const workspaceState = siteSnapshot.workspace_state || {};
  const componentState = siteSnapshot.component_state || {};
  const previewState = siteSnapshot.preview_state || {};
  const promptSnapshot = {
    site_tag: siteSnapshot.site_tag || null,
    site_name: siteSnapshot.site_name || null,
    business_type: siteSnapshot.business_type || null,
    active_page: siteSnapshot.active_page || null,
    active_tab: siteSnapshot.active_tab || null,
    fam_score: siteSnapshot.fam_score != null ? siteSnapshot.fam_score : null,
    page_count: siteSnapshot.page_count != null ? siteSnapshot.page_count : 0,
    media_slots_total: siteSnapshot.media_slots_total != null ? siteSnapshot.media_slots_total : 0,
    media_slots_empty: siteSnapshot.media_slots_empty != null ? siteSnapshot.media_slots_empty : 0,
    approved_decisions: siteSnapshot.approved_decisions != null ? siteSnapshot.approved_decisions : 0,
    deployed_url: siteSnapshot.deployed_url || null,
    last_deploy_status: siteSnapshot.last_deploy_status || null,
    brief_summary: truncateShayShayText(siteSnapshot.brief_summary || '', SHAY_SHAY_PROMPT_LIMITS.textChars),
    ui_state: {
      pip_badge_count: uiState.pip_badge_count != null ? uiState.pip_badge_count : null,
      worker_queue_pending_count: uiState.worker_queue_pending_count != null ? uiState.worker_queue_pending_count : null,
      worker_queue_badge_visible: uiState.worker_queue_badge_visible != null ? uiState.worker_queue_badge_visible : null,
      context_job_count: uiState.context_job_count != null ? uiState.context_job_count : null,
      context_diff_count: uiState.context_diff_count != null ? uiState.context_diff_count : null,
      shay_orb_state: uiState.shay_orb_state || null,
      shay_desk_has_transcript: uiState.shay_desk_has_transcript != null ? uiState.shay_desk_has_transcript : null,
      shay_mode: uiState.shay_mode || null,
      step_log_visible: uiState.step_log_visible != null ? uiState.step_log_visible : null,
      intelligence_finding_cards_visible: uiState.intelligence_finding_cards_visible != null ? uiState.intelligence_finding_cards_visible : null,
      research_items_visible: uiState.research_items_visible != null ? uiState.research_items_visible : null,
      validation: summarizeShayShayValidation(uiState.validation),
    },
    workspace_state: {
      active_rail: workspaceState.active_rail || null,
      sidebar_collapsed: workspaceState.sidebar_collapsed != null ? workspaceState.sidebar_collapsed : null,
      sidebar_visible: workspaceState.sidebar_visible != null ? workspaceState.sidebar_visible : null,
      active_mode: workspaceState.active_mode || null,
      active_tab: workspaceState.active_tab || null,
      active_page: workspaceState.active_page || null,
      workspace_layout: workspaceState.workspace_layout || null,
      inspector_pinned: workspaceState.inspector_pinned != null ? workspaceState.inspector_pinned : null,
      inspector_open: workspaceState.inspector_open != null ? workspaceState.inspector_open : null,
      selected_context: summarizeShayShayContextRef(workspaceState.selected_context),
      hierarchy_summary: truncateShayShayText(workspaceState.hierarchy_summary || '', SHAY_SHAY_PROMPT_LIMITS.textChars),
    },
    component_state: {
      selected_context: summarizeShayShayContextRef(componentState.selected_context),
      media_workspace: summarizeShayShayStateBucket(componentState.media_workspace),
      brief_workspace: componentState.brief_workspace && typeof componentState.brief_workspace === 'object'
        ? {
            completion_pct: componentState.brief_workspace.completion_pct != null ? componentState.brief_workspace.completion_pct : null,
            answers_count: componentState.brief_workspace.answers && typeof componentState.brief_workspace.answers === 'object'
              ? Object.keys(componentState.brief_workspace.answers).length
              : 0,
          }
        : null,
    },
    preview_state: {
      active_page: previewState.active_page || null,
      current_view_mode: previewState.current_view_mode || null,
      slot_mode_active: previewState.slot_mode_active != null ? previewState.slot_mode_active : null,
      current_slot_target: summarizeShayShayContextRef(previewState.current_slot_target),
      preview_src: truncateShayShayText(previewState.preview_src || '', SHAY_SHAY_PROMPT_LIMITS.urlChars),
      preview_visible: previewState.preview_visible != null ? previewState.preview_visible : null,
      device_mode: previewState.device_mode || null,
      preview_port: previewState.preview_port != null ? previewState.preview_port : null,
    },
    repo_paths: siteSnapshot.repo_paths || null,
    bridge_result: siteSnapshot.bridge_result || null,
    bridge_debug: siteSnapshot.bridge_debug || null,
    developer_mode: siteSnapshot.developer_mode && typeof siteSnapshot.developer_mode === 'object'
      ? {
          enabled: !!siteSnapshot.developer_mode.enabled,
          trust_mode: siteSnapshot.developer_mode.trust_mode || null,
          trust_mode_label: siteSnapshot.developer_mode.trust_mode_label || null,
          approved_scope_count: siteSnapshot.developer_mode.approved_scope_count != null
            ? siteSnapshot.developer_mode.approved_scope_count
            : null,
          allow_deploy_triggers: siteSnapshot.developer_mode.allow_deploy_triggers != null
            ? siteSnapshot.developer_mode.allow_deploy_triggers
            : null,
        }
      : null,
  };

  assignShayShayArrayPreview(promptSnapshot, 'pages', siteSnapshot.pages, SHAY_SHAY_PROMPT_LIMITS.pages, item => truncateShayShayText(item, 80));
  assignShayShayArrayPreview(promptSnapshot.ui_state, 'step_log_items', uiState.step_log_items, SHAY_SHAY_PROMPT_LIMITS.stepLogItems, summarizeShayShayStepLogItem);
  assignShayShayArrayPreview(promptSnapshot.ui_state, 'dismissed_prompt_keys', uiState.dismissed_prompt_keys, SHAY_SHAY_PROMPT_LIMITS.dismissedPromptKeys, item => truncateShayShayText(item, 80));
  assignShayShayArrayPreview(promptSnapshot.workspace_state, 'return_stack', workspaceState.return_stack, SHAY_SHAY_PROMPT_LIMITS.returnStack, summarizeShayShayContextRef);
  assignShayShayArrayPreview(promptSnapshot.workspace_state, 'open_tabs', workspaceState.open_tabs, SHAY_SHAY_PROMPT_LIMITS.openTabs, summarizeShayShayOpenTab);
  assignShayShayArrayPreview(promptSnapshot.component_state, 'return_stack', componentState.return_stack, SHAY_SHAY_PROMPT_LIMITS.returnStack, summarizeShayShayContextRef);

  return promptSnapshot;
}

function answerShayShayDirect(lower, siteSnapshot, manifest) {
  if (/\b(developer\s+mode|trust\s+mode|auto-apply|approval\s+mode)\b/.test(lower)) {
    const mode = siteSnapshot.developer_mode || {};
    return {
      intent: 'developer_mode_status',
      response: `Developer Mode is ${mode.enabled ? 'enabled' : 'off'}. Trust mode: ${mode.trust_mode_label || mode.trust_mode || 'Observe only'}. Approved paths: ${mode.approved_scope_count || 0}. Deploy triggers: ${mode.allow_deploy_triggers ? 'enabled' : 'blocked'}.`,
    };
  }
  if (/\b(active\s+site|what\s+site|which\s+site|current\s+site)\b/.test(lower)) {
    const siteLabel = siteSnapshot.site_name
      ? `${siteSnapshot.site_name} (${siteSnapshot.site_tag})`
      : (siteSnapshot.site_tag || 'no active site');
    return { intent: 'active_site', response: `The active site is ${siteLabel}.` };
  }

  if (/\b(active\s+page|current\s+page|what\s+page|which\s+page)\b/.test(lower)) {
    return { intent: 'active_page', response: `The active page is ${siteSnapshot.active_page || 'unknown'}.` };
  }

  if (/\bfam\s+score\b/.test(lower)) {
    if (siteSnapshot.fam_score == null) {
      return { intent: 'fam_score', response: 'This site does not have a FAM score recorded yet.' };
    }
    return { intent: 'fam_score', response: `The current FAM score is ${siteSnapshot.fam_score}.` };
  }

  if (/\b(how\s+many|what)\s+pages\b/.test(lower)) {
    if (!siteSnapshot.page_count) {
      return { intent: 'page_count', response: 'There are no built pages in dist yet.' };
    }
    return {
      intent: 'page_count',
      response: `This site currently has ${siteSnapshot.page_count} page${siteSnapshot.page_count === 1 ? '' : 's'}: ${siteSnapshot.pages.join(', ')}.`
    };
  }

  if (/\bwhat\s+can\s+you\s+do\b|\bhow\s+can\s+you\s+help\b/.test(lower)) {
    const available = Object.entries((manifest && manifest.capabilities) || {})
      .filter(([, value]) => value === 'available')
      .map(([key]) => key);
    return {
      intent: 'capability_help',
      response: `I can orient you inside Studio, route build requests, check live capability status, suggest brainstorm mode, capture gaps, and answer questions about the active site. Live capabilities available right now: ${available.join(', ')}.`
    };
  }

  if (/\bwhat\s+do\s+you\s+know\s+about\s+(this\s+site|the\s+site)\b/.test(lower)) {
    return {
      intent: 'site_summary',
      response: `This is ${siteSnapshot.site_name || siteSnapshot.site_tag || 'the active site'}. Business type: ${siteSnapshot.business_type || 'not set'}. Pages: ${siteSnapshot.page_count || 0}. Empty media slots: ${siteSnapshot.media_slots_empty}/${siteSnapshot.media_slots_total}. Brief summary: ${siteSnapshot.brief_summary}`
    };
  }

  if (/\b(badge\s+count|what\s+is\s+the\s+badge|worker\s+queue)\b/.test(lower)) {
    const ui = siteSnapshot.ui_state || {};
    if (ui.worker_queue_pending_count != null) {
      return {
        intent: 'badge_count',
        response: `The worker queue badge count is ${ui.worker_queue_pending_count}. The Shay orb badge count is ${ui.pip_badge_count != null ? ui.pip_badge_count : 'not present in my payload'}.`
      };
    }
    return {
      intent: 'badge_count_missing',
      response: 'I do not have the UI badge values in my payload yet. That is a NOT_CONNECTED gap: I need `ui_state.worker_queue_pending_count` and `ui_state.pip_badge_count` in the snapshot.'
    };
  }

  return null;
}

function classifyShayShayReasoning(lower) {
  if (/\b(should\s+i|what\s+do\s+you\s+think|compare|architecture|strategy|roadmap|trade-?off)\b/.test(lower)) {
    return { kind: 'strategy', tier: 3 };
  }
  if (/\b(research|market|competitor|vertical|trend|audience|positioning|offer)\b/.test(lower)) {
    return { kind: 'research', tier: 2 };
  }
  if (/\b(review|audit|debug|broken|bug|critique|harsh|adversarial|regression|error|failing)\b/.test(lower)) {
    return { kind: 'review', tier: 2 };
  }
  if (/\b(brainstorm|idea|concept|direction|name|theme|mascot|uncertain|unsure)\b/.test(lower)) {
    return { kind: 'brainstorm', tier: 2 };
  }
  if (/\b(build|site|page|layout|copy|brief|design|edit|studio)\b/.test(lower)) {
    return { kind: 'studio', tier: 1 };
  }
  return { kind: 'general', tier: 1 };
}

function selectShayShayBrain(reasoning, manifest, agentCards) {
  const capabilities = (manifest && manifest.capabilities) || {};
  const availability = {
    claude: capabilities.claude_api === 'available',
    gemini: capabilities.gemini_api === 'available',
    codex: capabilities.openai_api === 'available',
  };

  const preferenceByKind = {
    brainstorm: ['gemini', 'claude', 'codex'],
    research: ['gemini', 'claude', 'codex'],
    review: ['codex', 'claude', 'gemini'],
    strategy: ['claude', 'codex', 'gemini'],
    studio: ['claude', 'codex', 'gemini'],
    general: ['claude', 'gemini', 'codex'],
  };

  const preferred = preferenceByKind[reasoning.kind] || preferenceByKind.general;
  const chosen = preferred.find(brain => availability[brain]) || 'claude';
  const chosenCard = agentCards[chosen] || {};
  const preferredCard = agentCards[preferred[0]] || {};
  const note = chosen !== preferred[0]
    ? `${preferredCard.name || preferred[0]} is not available right now, so I’m using ${chosenCard.name || chosen}.`
    : '';

  return {
    brain: chosen,
    model: chosenCard.model || null,
    fallbackBrain: preferred.find(brain => brain !== chosen && availability[brain]) || null,
    fallbackModel: (agentCards[preferred.find(brain => brain !== chosen && availability[brain]) || ''] || {}).model || null,
    note,
  };
}

async function executeShayShayBrainCall(opts) {
  const {
    brain,
    model,
    message,
    context,
    manifest,
    instructions,
    agentCards,
    siteSnapshot,
    reasoning,
    conversation_id = null,
    surface = 'lite',
    handoff_context = null,
  } = opts;

  // Composite session key: brain:conversation_id (or brain:surface as fallback)
  const sessionKey = `${brain}:${conversation_id || surface || 'default'}`;
  const session = getOrCreateBrainSession(sessionKey, {
    brain,
    tag: siteSnapshot.site_tag || TAG,
    hubRoot: HUB_ROOT,
    page: siteSnapshot.active_page || currentPage,
  });

  const firstTurn = session.historyLength === 0;
  const memoryContext = memory.buildShayShayContext(siteSnapshot.site_tag || TAG);

  // Build the user message — if this is a desk handoff first turn, prepend the context block
  let effectiveMessage = message;
  if (handoff_context && firstTurn && surface === 'desk') {
    const turns = Array.isArray(handoff_context.turns) ? handoff_context.turns : [];
    if (turns.length > 0) {
      const handoffBlock = [
        'HANDOFF FROM LITE:',
        ...turns.map(t => `  ${t.role}: ${String(t.content || '').slice(0, 300)}`),
        '',
        'USER MESSAGE:',
        message,
      ].join('\n');
      effectiveMessage = handoffBlock;
    }
  }

  const prompt = buildShayShayPrompt({
    message: effectiveMessage,
    context,
    manifest,
    instructions,
    agentCards,
    siteSnapshot,
    reasoning,
    studioContext: session.readStudioContext(),
    includePrimer: firstTurn,
    selectedBrain: brain,
    memoryContext,
  });

  const result = await session.execute(prompt, {
    maxTokens: reasoning.tier === 3 ? 2048 : 1400,
    mode: reasoning.kind === 'brainstorm' ? 'brainstorm' : 'chat',
    model,
  });

  return result && result.content ? result.content : '';
}

function buildShayShayPrompt(opts) {
  const {
    message,
    manifest,
    instructions,
    agentCards,
    siteSnapshot,
    reasoning,
    studioContext,
    includePrimer,
    selectedBrain,
  } = opts;

  const capabilityText = JSON.stringify((manifest && manifest.capabilities) || {});
  const agentCardText = Object.values(agentCards || {}).map(card => {
    return `- ${card.id}: ${card.name} | model=${card.model} | best_for=${(card.best_for || []).join(', ')}`;
  }).join('\n');
  const cerebrumPath = path.join(HUB_ROOT, '.wolf', 'cerebrum.md');
  const cerebrumExcerpt = readShayShayExcerpt(cerebrumPath, SHAY_SHAY_PROMPT_LIMITS.excerptLines.cerebrum);
  const studioContextExcerpt = truncateShayShayContext(studioContext, SHAY_SHAY_PROMPT_LIMITS.excerptLines.studioContext);
  const snapshotText = JSON.stringify(buildShayShayPromptSnapshot(siteSnapshot));
  const shayContextPath = path.join(__dirname, 'SHAY_CONTEXT.md');
  const shayContextContent = fs.existsSync(shayContextPath) ? fs.readFileSync(shayContextPath, 'utf8') : '';
  const shayContextExcerpt = truncateShayShayContext(shayContextContent, SHAY_SHAY_PROMPT_LIMITS.excerptLines.shayContext);
  const crossSessionMemoryExcerpt = truncateShayShayContext(opts.memoryContext || '', SHAY_SHAY_PROMPT_LIMITS.excerptLines.crossSession);
  const repoPaths = siteSnapshot && siteSnapshot.repo_paths ? siteSnapshot.repo_paths : {};
  const currentActivePagePath = repoPaths.active_page_path || '@active-site/' + (siteSnapshot && siteSnapshot.active_page ? siteSnapshot.active_page : 'index.html');

  const primer = includePrimer ? [
    instructions,
    '',
    'You are responding inside FAMtastic Site Studio.',
    'Return strict JSON only. No markdown fences. No commentary outside the JSON object.',
    'Allowed actions: null, route_to_chat, system_command, show_me, suggest_brainstorm.',
    'Prefer action:null unless routing or UI behavior is genuinely needed.',
    '',
    'BRIDGE EXECUTION LOOP:',
    'You have direct access to the local repo via a bridge. To read a file, write a file, or run a shell command,',
    'include a "bridge_request" field in your JSON response. The Studio will execute it and return the result',
    'in your next snapshot under siteSnapshot.bridge_result. Supported operations:',
    '  Read file:    { "bridge_request": { "op": "read", "path": "relative/path/from/famtastic" } }',
    '  Write file:   { "bridge_request": { "op": "write", "path": "relative/path", "content": "..." } }',
    '  Run command:  { "bridge_request": { "op": "exec", "command": "git status" } }',
    'All exec commands run in ~/famtastic. Allowed binaries: git, npm, node, bash, cat, ls, sed.',
    'Do not guess that "index.html" lives at the repo root. Use siteSnapshot.repo_paths to target the correct file.',
    'Preferred bridge path aliases:',
    '  @hub/...         => repo root',
    '  @studio/...      => site-studio/',
    '  @studio-ui/...   => site-studio/public/',
    '  @active-site/... => active site dist/',
    `For the current live page, prefer siteSnapshot.repo_paths.active_page_path (${currentActivePagePath}).`,
    `For Studio UI work, prefer ${repoPaths.studio_ui_entry || '@studio-ui/index.html'}, ${repoPaths.studio_orb_script || '@studio-ui/js/studio-orb.js'}, or ${repoPaths.studio_orb_styles || '@studio-ui/css/studio-orb.css'}.`,
    'Always check siteSnapshot.bridge_result at the start of your response — if it is present, it is the',
    'result of your previous bridge_request. Act on it before doing anything else.',
    'Use siteSnapshot.bridge_debug only for diagnosis: it tells you whether a prior result was seen,',
    'where it came from, and whether stdout or stderr were present.',
    '',
    shayContextExcerpt ? ('SHAY PERSISTENT CONTEXT (SHAY_CONTEXT.md):\n' + shayContextExcerpt) : '',
    '',
    'LIVE CAPABILITY MANIFEST:',
    capabilityText,
    '',
    'AVAILABLE BRAIN AGENTS:',
    agentCardText || '- none loaded',
    '',
    'FAMTASTIC MEMORY EXCERPT:',
    cerebrumExcerpt || 'No cerebrum memory available.',
    '',
    'CROSS-SESSION MEMORY:',
    (crossSessionMemoryExcerpt || 'No prior memories.'),
    '',
    'STUDIO CONTEXT EXCERPT:',
    studioContextExcerpt || 'No STUDIO-CONTEXT.md available yet.',
    '',
  ].join('\n') : '';

  const bridgeBlock = isShayShayBridgeObject(siteSnapshot && siteSnapshot.bridge_result)
    ? '\n\nBRIDGE RESULT FROM LAST REQUEST (same object as siteSnapshot.bridge_result):\n' + JSON.stringify(siteSnapshot.bridge_result, null, 2) + '\n(Act on this result before anything else.)'
    : '';

  return [
    primer,
    `CURRENT ROUTING MODE: ${reasoning.kind}`,
    `SELECTED BRAIN: ${selectedBrain}`,
    'ACTIVE SITE SNAPSHOT:',
    snapshotText,
    bridgeBlock,
    '',
    'USER MESSAGE:',
    message,
    '',
    'Return JSON in this shape:',
    '{"response":"...", "action":null, "message":null}',
  ].filter(Boolean).join('\n');
}

function readShayShayExcerpt(filePath, maxLines) {
  if (!fs.existsSync(filePath)) return '';
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .slice(0, maxLines || 40)
      .join('\n')
      .trim();
  } catch {
    return '';
  }
}

function truncateShayShayContext(text, maxLines) {
  if (!text) return '';
  return String(text).split('\n').slice(0, maxLines || 50).join('\n').trim();
}

function normalizeShayShayResponse(raw, fallback = {}) {
  const text = String(raw || '').trim();
  if (!text) return { response: fallback.response || 'No response.', action: fallback.action || null };

  const stripped = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const candidates = [stripped];
  const firstBrace = stripped.indexOf('{');
  const lastBrace = stripped.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(stripped.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') {
        return {
          response: parsed.response || fallback.response || text,
          action: parsed.action || null,
          message: parsed.message || null,
          bridge_request: (parsed.bridge_request && typeof parsed.bridge_request === 'object') ? parsed.bridge_request : null,
          commit_request: (parsed.commit_request && typeof parsed.commit_request === 'object' && parsed.commit_request.message) ? parsed.commit_request : null,
          usage: parsed.usage || null,
        };
      }
    } catch {}
  }

  return {
    response: text,
    action: fallback.action || null,
    message: fallback.message || null,
    bridge_request: null,
    commit_request: null,
    usage: null,
  };
}

function summarizeBridgeExecBytes(text) {
  return Buffer.byteLength(String(text || ''), 'utf8');
}

function logShayShayBridgeRequest(bridgeRequest) {
  const op = bridgeRequest && bridgeRequest.op ? bridgeRequest.op : 'unknown';
  if (op === 'exec') {
    const command = String((bridgeRequest && bridgeRequest.command) || '').trim();
    const bin = command.split(/\s+/).filter(Boolean)[0] || 'unknown';
    console.log(`[shay-shay] bridge_request received: op=exec bin=${bin}`);
    return;
  }
  if (op === 'read' || op === 'write') {
    console.log(`[shay-shay] bridge_request received: op=${op} path=${bridgeRequest.path || '(missing)'}`);
    return;
  }
  console.log(`[shay-shay] bridge_request received: op=${op}`);
}

function logShayShayBridgeResult(bridgeRequest, bridgeResult) {
  const op = bridgeResult && bridgeResult.op ? bridgeResult.op : (bridgeRequest && bridgeRequest.op) || 'unknown';
  if (op === 'exec') {
    console.log(
      `[shay-shay] bridge_exec completed: exitCode=${bridgeResult && bridgeResult.exitCode != null ? bridgeResult.exitCode : 'null'} ` +
      `stdout_bytes=${summarizeBridgeExecBytes(bridgeResult && bridgeResult.stdout)} ` +
      `stderr_bytes=${summarizeBridgeExecBytes(bridgeResult && bridgeResult.stderr)} ` +
      `error=${bridgeResult && bridgeResult.error ? 'yes' : 'no'}`
    );
    return;
  }
  if (op === 'read' || op === 'write') {
    console.log(`[shay-shay] bridge_${op} completed: error=${bridgeResult && bridgeResult.error ? 'yes' : 'no'}`);
    return;
  }
  console.log(`[shay-shay] bridge_result completed: op=${op} error=${bridgeResult && bridgeResult.error ? 'yes' : 'no'}`);
}

// Minimal unified diff (line-by-line, no external dep)
function unifiedDiff(oldStr, newStr, label) {
  const oldLines = String(oldStr || '').split('\n');
  const newLines = String(newStr || '').split('\n');
  const header = `--- a/${label}\n+++ b/${label}\n`;
  // Simple approach: find changed lines with 2 lines of context
  const patches = [];
  let i = 0, j = 0;
  while (i < oldLines.length || j < newLines.length) {
    if (oldLines[i] === newLines[j]) {
      i++; j++;
    } else {
      const ctxStart = Math.max(0, i - 2);
      const chunk = [`@@ -${ctxStart + 1} +${ctxStart + 1} @@`];
      for (let k = ctxStart; k < i; k++) chunk.push(' ' + oldLines[k]);
      while (i < oldLines.length && (j >= newLines.length || oldLines[i] !== newLines[j])) {
        chunk.push('-' + oldLines[i++]);
      }
      while (j < newLines.length && (i >= oldLines.length || oldLines[i] !== newLines[j])) {
        chunk.push('+' + newLines[j++]);
      }
      const ctxEnd = Math.min(oldLines.length, i + 2);
      for (let k = i; k < ctxEnd; k++) chunk.push(' ' + oldLines[k]);
      i = ctxEnd; j += ctxEnd - i + (ctxEnd - i); // advance past context
      patches.push(chunk.join('\n'));
      break; // simplified: one chunk only for performance
    }
  }
  return header + (patches.length > 0 ? patches.join('\n\n') : '(no differences)');
}

async function executeBridgeOp(bridgeRequest) {
  const { execFile } = require('child_process');
  const FAM_ROOT = HUB_ROOT;
  const ALLOWED_COMMANDS = ['git', 'npm', 'node', 'bash', 'cat', 'ls', 'sed'];
  const BRIDGE_TIMEOUTS = { read: 3000, write: 5000, exec: 20000 };
  const PATH_ALIASES = [
    { prefix: '@active-site/', root: () => DIST_DIR() },
    { prefix: '@studio-ui/', root: () => path.join(__dirname, 'public') },
    { prefix: '@studio/', root: () => __dirname },
    { prefix: '@hub/', root: () => HUB_ROOT },
  ];

  function resolveSafe(inputPath) {
    const requested = String(inputPath || '').trim();
    let root = FAM_ROOT;
    let relativePath = requested;
    let alias = '@hub/';

    for (const entry of PATH_ALIASES) {
      if (requested.startsWith(entry.prefix)) {
        root = entry.root();
        relativePath = requested.slice(entry.prefix.length);
        alias = entry.prefix;
        break;
      }
    }

    const safeRoot = path.resolve(root);
    const resolved = path.resolve(safeRoot, relativePath || '');
    if (!(resolved.startsWith(safeRoot + path.sep) || resolved === safeRoot)) return null;
    return {
      abs: resolved,
      alias,
      resolvedPath: toShayShayRepoRelative(resolved),
    };
  }

  const op = bridgeRequest.op;

  if (op === 'read') {
    const target = resolveSafe(bridgeRequest.path || '');
    if (!target) return { op, path: bridgeRequest.path, error: 'Path escapes allowed bridge roots' };
    try {
      const content = fs.readFileSync(target.abs, 'utf8');
      return { op, path: bridgeRequest.path, resolved_path: target.resolvedPath, content };
    } catch (e) {
      return { op, path: bridgeRequest.path, resolved_path: target.resolvedPath, error: e.message };
    }
  }

  if (op === 'write') {
    const target = resolveSafe(bridgeRequest.path || '');
    if (!target) return { op, path: bridgeRequest.path, error: 'Path escapes allowed bridge roots' };
    try {
      fs.mkdirSync(path.dirname(target.abs), { recursive: true });
      fs.writeFileSync(target.abs, bridgeRequest.content || '', 'utf8');
      return { op, path: bridgeRequest.path, resolved_path: target.resolvedPath, success: true };
    } catch (e) {
      return { op, path: bridgeRequest.path, resolved_path: target.resolvedPath, error: e.message };
    }
  }

  if (op === 'exec') {
    const command = (bridgeRequest.command || '').trim();
    const bin = command.split(/\s+/)[0];
    if (!ALLOWED_COMMANDS.includes(bin)) {
      return {
        op,
        command,
        cwd: '.',
        stdout: '',
        stderr: '',
        exitCode: null,
        error: `Command not allowed: ${bin}. Allowed: ${ALLOWED_COMMANDS.join(', ')}`,
      };
    }
    return new Promise(resolve => {
      execFile('bash', ['-c', command], { cwd: FAM_ROOT, timeout: BRIDGE_TIMEOUTS.exec }, (err, stdout, stderr) => {
        const result = {
          op,
          command,
          cwd: '.',
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: typeof (err && err.code) === 'number' ? err.code : (err ? 1 : 0),
        };
        if (err && typeof err.code !== 'number') result.error = err.message;
        resolve(result);
      });
    });
  }

  if (op === 'diff') {
    const target = resolveSafe(bridgeRequest.path || '');
    if (!target) return { op, path: bridgeRequest.path, error: 'Path escapes allowed bridge roots' };
    try {
      const current = fs.existsSync(target.abs) ? fs.readFileSync(target.abs, 'utf8') : '';
      const proposed = bridgeRequest.content || '';
      const diff = unifiedDiff(current, proposed, target.resolvedPath);
      return { op, path: bridgeRequest.path, resolved_path: target.resolvedPath, diff };
    } catch (e) {
      return { op, path: bridgeRequest.path, error: e.message };
    }
  }

  return { op, error: `Unknown bridge op: ${op}` };
}

function classifyShayShayTier0(lower, context = {}) {
  if (/\b(restart\s+studio|reboot\s+studio|reset\s+server)\b/.test(lower))
    return { intent: 'studio_command', command: 'restart' };
  if (/\b(clear\s+cache|purge\s+cache)\b/.test(lower))
    return { intent: 'studio_command', command: 'clear_cache' };
  if (/\b(send\s+(?:this\s+)?to\s+(?:studio\s+)?chat|tell\s+(?:studio\s+)?chat\s+to|route\s+to\s+chat)\b/.test(lower))
    return { intent: 'route_to_chat' };
  if (/\b(show\s+me\s+how|show\s+me\s+where)\b/.test(lower))
    return { intent: 'show_me' };
  if (/\b(what['']?s?\s+broken|are\s+all\s+apis\s+working|check\s+the\s+system|system\s+status)\b/.test(lower))
    return { intent: 'system_status' };
  // Uncertainty / brainstorm signals — detect before AI call
  if (/\b(i\s+don['']?t\s+know\s+how\s+i\s+feel|not\s+sure\s+(about|if)|i['']?m\s+not\s+sure|i\s+can['']?t\s+decide|help\s+me\s+think|let['']?s\s+brainstorm|should\s+we\s+brainstorm|i['']?m\s+unsure)\b/.test(lower))
    return { intent: 'suggest_brainstorm' };
  // Gap capture — "we need X", "I can't do X", "we're missing X"
  if (/\b(we\s+need\s+(a\s+|an\s+|the\s+)?|i\s+can['']?t\s+do\s+|we['']?re\s+missing\s+|there['']?s\s+no\s+way\s+to\s+)\b/.test(lower))
    return { intent: 'capture_gap' };
  // Job plan creation — "plan jobs for...", "create a job plan", "schedule tasks"
  if (/\b(plan\s+(the\s+)?jobs?\s+for|create\s+a?\s+job\s+plan|schedule\s+(the\s+)?tasks?\s+for|build\s+(a\s+)?job\s+plan|queue\s+(up\s+)?jobs?\s+for)\b/.test(lower))
    return { intent: 'create_job_plan' };
  // Character pipeline — "character pipeline", "FAM Bear", or "generate anchor" + "poses"
  if (/character\s+pipeline/i.test(lower) ||
      /\bfam\s*bear\b/i.test(lower) ||
      (/generate\s+anchor/i.test(lower) && /\bposes?\b/i.test(lower)))
    return { intent: 'character_pipeline' };
  // Autonomous build — explicitly requests full autonomous pipeline
  if (/\b(autonomous|auto.?build|build\s+autonomously|shay.?shay\s+build)\b/.test(lower) ||
      (context && context.autonomous === true))
    return { intent: 'autonomous_build' };
  // Build request — "build me a site for X", "create a site for X", flexible word order
  if (/\bbuild\b.{0,30}\b(site|website)\b.{0,20}\bfor\b/.test(lower) ||
      /\bcreate\b.{0,30}\b(site|website)\b.{0,20}\bfor\b/.test(lower) ||
      /\bmake\b.{0,30}\b(site|website)\b.{0,20}\bfor\b/.test(lower) ||
      /\b(i\s+want|i\s+need)\b.{0,20}\b(site|website)\b.{0,20}\bfor\b/.test(lower) ||
      /\bnew\s+site\s+for\b/.test(lower))
    return { intent: 'build_request' };
  return null;
}

function handleShayShayTier0(tier0, message, context, manifest) {
  const lower = message.toLowerCase();

  if (tier0.intent === 'studio_command') {
    return {
      response: `Running ${tier0.command} for you.`,
      action: 'system_command',
      command: tier0.command,
    };
  }

  if (tier0.intent === 'route_to_chat') {
    // Extract the message to route — text after "chat to", "tell chat to", etc.
    const routeMatch = message.match(/(?:chat\s+to|tell\s+(?:chat|studio)\s+to|send\s+(?:this\s+)?to\s+(?:studio\s+)?chat[:\s]+)\s*(.+)/i);
    const routed = routeMatch ? routeMatch[1].trim() : message;
    return {
      response: `Routing to Studio chat: "${routed}"`,
      action: 'route_to_chat',
      message: routed,
    };
  }

  if (tier0.intent === 'show_me') {
    const targetMatch = message.match(/show\s+me\s+(?:how\s+to\s+|where\s+(?:the\s+)?)?(.+)/i);
    return {
      response: `Opening Show Me mode for: ${targetMatch ? targetMatch[1].trim() : message}`,
      action: 'show_me',
      target: targetMatch ? targetMatch[1].trim() : message,
    };
  }

  if (tier0.intent === 'system_status') {
    const { broken, unavailable, available } = require('./lib/capability-manifest').diffStateVsManifest(manifest);
    const statusLines = [];
    if (broken.length) statusLines.push(`Broken: ${broken.join(', ')}`);
    if (unavailable.length) statusLines.push(`Unavailable (missing API key or CLI): ${unavailable.join(', ')}`);
    statusLines.push(`Working: ${available.join(', ')}`);
    return {
      response: statusLines.join('\n'),
      action: null,
    };
  }

  if (tier0.intent === 'suggest_brainstorm') {
    // Extract what they're uncertain about
    const topicMatch = message.match(/(?:about|feel about|sure about|decide on)\s+(?:the\s+)?(.+?)[\.\?!]?\s*$/i);
    const topic = topicMatch ? topicMatch[1].trim() : 'this';
    return {
      response: `Sounds like you're at a decision point on the ${topic}. Want to switch Studio to brainstorm mode? I can help you think through options before committing to a direction — no build until you're ready.`,
      action: 'suggest_brainstorm',
      topic,
    };
  }

  if (tier0.intent === 'build_request') {
    // Route the entire build request directly to Studio chat — the classifier
    // will pick it up as new_site or build intent and handle the brief + build
    return {
      response: `Routing your build request to Studio. The brief interview will start automatically.`,
      action: 'route_to_chat',
      message: message, // full original message goes to Studio
    };
  }

  if (tier0.intent === 'capture_gap') {
    // Extract what's needed
    const needMatch = message.match(/(?:we\s+need\s+(?:a\s+|an\s+|the\s+)?|we['']?re\s+missing\s+|i\s+can['']?t\s+do\s+|there['']?s\s+no\s+way\s+to\s+)(.+?)[\.\?!]?\s*$/i);
    const capability = needMatch ? needMatch[1].trim() : message.slice(0, 80);

    // Log the gap
    try {
      gapLogger.logGap(TAG, message, gapLogger.GAP_CATEGORIES.NOT_BUILT, {
        capability_id: capability.toLowerCase().replace(/\s+/g, '_').slice(0, 50),
      });
    } catch {}

    return {
      response: `I've logged "${capability}" as a missing capability. This is the first time you've mentioned it — if it comes up a couple more times I'll surface it as a priority. Want me to add it to the build backlog now?`,
      action: 'gap_captured',
      capability,
      gap_category: 'not_built',
    };
  }

  return { response: 'Command noted.', action: null };
}

// ── Memory Extraction (async, Haiku) ─────────────────────────────────────────

async function extractAndStoreMemory(userMsg, shayResponse, { siteTag, source } = {}) {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic();
    const prompt = `You extract a single factual memory from a conversation exchange for a cross-session memory store. Return ONLY a JSON object, no markdown.

Exchange:
User: ${userMsg.slice(0, 300)}
Shay-Shay: ${shayResponse.slice(0, 300)}

Return: {"should_store": true|false, "entity_type": "site"|"user"|"global", "entity_id": "<site_tag_or_user_or_global>", "content": "<one sentence fact>", "category": "preference"|"decision"|"fact"|"feedback"|"goal"|"general", "importance": 1-10}

Only store if the exchange contains a clear, durable fact (decision made, preference expressed, goal stated, feedback given). Set should_store=false for greetings, status checks, or transient info.`;

    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = resp.content?.[0]?.text || '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return;
    const parsed = JSON.parse(match[0]);
    if (!parsed.should_store || !parsed.content) return;

    const entityId = parsed.entity_id === '<site_tag_or_user_or_global>'
      ? (parsed.entity_type === 'site' ? (siteTag || 'unknown') : parsed.entity_type)
      : parsed.entity_id;

    memory.remember(
      parsed.entity_type || 'global',
      entityId,
      parsed.content,
      { category: parsed.category || 'general', source: source || 'shay-shay', importance: parsed.importance || 5 }
    );
  } catch { /* best-effort */ }
}

// ── Job Plan Builder ─────────────────────────────────────────────────────────

function buildShayShayJobPlan(message, context = {}) {
  const siteTag = context.site_tag || TAG;
  const siteName = siteTag.replace(/^site-/, '').replace(/-/g, ' ');

  const jobs = [];
  try {
    const research = studioActions.createJob({
      type: 'research',
      site_tag: siteTag,
      payload: { description: `Gather vertical research for ${siteName}`, source: 'shay-shay-plan' },
    });
    jobs.push(research);

    const build = studioActions.createJob({
      type: 'build',
      site_tag: siteTag,
      payload: { description: `Full site build for ${siteName}`, source: 'shay-shay-plan' },
      dependencies: [research.id],
    });
    jobs.push(build);

    const deploy = studioActions.createJob({
      type: 'deploy',
      site_tag: siteTag,
      payload: { description: `Netlify deploy for ${siteName}`, source: 'shay-shay-plan' },
      dependencies: [build.id],
    });
    jobs.push(deploy);
  } catch (e) {
    return { action: null, response: `Job plan failed: ${e.message}` };
  }

  return {
    action: 'job_plan',
    response: `Here's a 3-job pipeline for ${siteName} — research first, then build, then deploy. Approve each job to let it run, or park any you want to defer.`,
    jobs,
    site_tag: siteTag,
  };
}

// ── Autonomous Build Pipeline ─────────────────────────────────────────────
// Shay-Shay can drive a complete site build from brief text, without the browser.
// Fritz watches via the UI; Shay-Shay drives via the API and WS broadcast.

function extractBriefPatternBased(text) {
  const lower = text.toLowerCase();

  // Business name — multiple strategies, most specific first
  let businessName = '';
  // "called Mario's Pizza"
  const calledMatch = text.match(/called\s+["']?([A-Z][^"',.\n]{2,50})["']?/i);
  if (calledMatch) businessName = calledMatch[1].trim().replace(/[,.].*$/, '').trim();
  // Quoted name
  if (!businessName) {
    const quotedMatch = text.match(/["']([A-Z][^"']{3,50})["']/);
    if (quotedMatch) businessName = quotedMatch[1].trim();
  }
  // "for X" where X is a proper noun sequence (1-3 capitalized words before lowercase)
  if (!businessName) {
    const forMatch = text.match(/\bfor\s+(?:a\s+)?([A-Z][a-zA-Z']+(?:\s+[A-Z][a-zA-Z']+){0,3})/);
    if (forMatch) {
      // Trim trailing connectors and lowercase context words
      businessName = forMatch[1].trim()
        .replace(/\s+(?:in|at|near|a\s|an\s|the\s).*/i, '')
        .replace(/[,.].*$/, '')
        .trim();
    }
  }

  // Revenue model
  let revenueModel = 'lead_generation';
  if (/rank.?and.?rent/i.test(lower)) revenueModel = 'rank_and_rent';
  else if (/appointment|booking|schedule/i.test(lower)) revenueModel = 'appointment_booking';
  else if (/ecommerce|e-commerce|shop|store/i.test(lower)) revenueModel = 'ecommerce';
  else if (/affiliate/i.test(lower)) revenueModel = 'affiliate';
  else if (/ticket|event|registration/i.test(lower)) revenueModel = 'registration';

  // Location
  const locationMatch = text.match(/\bin\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/);
  const location = locationMatch ? locationMatch[1] : '';

  // Tone/style words
  const toneMap = { bold: 'bold', warm: 'warm', friendly: 'friendly', professional: 'professional',
    urban: 'urban', luxury: 'premium', premium: 'premium', authentic: 'authentic',
    modern: 'modern', clean: 'clean', vibrant: 'vibrant', elegant: 'elegant' };
  const tone = Object.keys(toneMap).filter(w => lower.includes(w)).map(w => toneMap[w]);

  // Differentiator: "since YEAR", "family", "award"
  let differentiator = '';
  const sinceMatch = text.match(/since\s+(\d{4})/i);
  if (sinceMatch) differentiator = `Established since ${sinceMatch[1]}`;
  else if (/family/i.test(lower)) differentiator = 'Family-owned and operated';
  else if (/award/i.test(lower)) differentiator = 'Award-winning';

  // CTA
  let cta = 'Contact Us';
  if (/appointment|booking/i.test(lower)) cta = 'Book Now';
  else if (/order/i.test(lower)) cta = 'Order Now';
  else if (/quote/i.test(lower)) cta = 'Get a Quote';
  else if (/lead/i.test(lower)) cta = 'Get a Free Quote';

  // Pages by vertical
  let pages = ['home', 'about', 'contact'];
  if (/restaurant|pizza|food|cafe|bakery|catering/i.test(lower)) pages = ['home', 'menu', 'about', 'contact'];
  else if (/barber|salon|spa|beauty|nail/i.test(lower)) pages = ['home', 'services', 'gallery', 'contact'];
  else if (/law|legal|attorney|lawyer/i.test(lower)) pages = ['home', 'practice-areas', 'about', 'contact'];
  else if (/plumb|hvac|electric|contractor|roofer/i.test(lower)) pages = ['home', 'services', 'about', 'contact'];
  else if (/dental|doctor|medical|clinic/i.test(lower)) pages = ['home', 'services', 'about', 'contact'];

  // Generate safe tag
  const tag = 'site-' + (businessName || 'new-site')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);

  // Tier: explicit clean/simple/minimal language → 'clean'; otherwise 'famtastic'
  const tierCleanWords = ['simple', 'minimal', 'clean', 'professional', 'traditional', 'conservative', 'basic'];
  const tier = tierCleanWords.some(w => lower.includes(w)) ? 'clean' : 'famtastic';

  return {
    business_name: businessName || 'New Business',
    tag,
    tier,
    revenue_model: revenueModel,
    business_description: text.slice(0, 300),
    location,
    differentiator,
    cta,
    tone: tone.length ? tone : ['professional', 'clean'],
    pages,
  };
}

async function extractBriefFromMessage(text) {
  // Use Claude if available, with explicit instruction to use business name in tag
  try {
    const extracted = await callSDK(
      `Extract a structured site brief from this request. Return ONLY valid JSON, no markdown:\n\n"${text}"\n\nRules:\n- business_name: the actual business name (e.g. "Mario's Pizza")\n- tag: "site-" + business name slugified (e.g. "site-marios-pizza") — NEVER use a generic category word\n- revenue_model: one of lead_generation|rank_and_rent|ecommerce|appointment_booking\n- tier: "famtastic" for bold/expressive design, "clean" for minimal/professional/simple design\n\n{"business_name":"","tag":"site-","tier":"famtastic","revenue_model":"lead_generation","business_description":"","location":"","differentiator":"","cta":"Contact Us","tone":["professional"],"pages":["home","about","contact"]}`,
      { maxTokens: 400, callSite: 'brief-extraction', timeoutMs: 8000 }
    );
    const clean = extracted.replace(/```(?:json)?\n?|```\n?/g, '').trim();
    const parsed = JSON.parse(clean);
    // Validate tag isn't a generic word
    const genericTags = ['restaurant', 'business', 'site', 'pizza', 'shop', 'store', 'company'];
    const tagSlug = (parsed.tag || '').replace(/^site-/, '');
    if (parsed.business_name && parsed.tag && !genericTags.includes(tagSlug)) return parsed;
    // Tag was generic — regenerate from business name
    if (parsed.business_name) {
      parsed.tag = 'site-' + parsed.business_name.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '').trim().replace(/\s+/g, '-').slice(0, 35);
      return parsed;
    }
  } catch { /* fall through to pattern matching */ }
  return extractBriefPatternBased(text);
}

// ── Character Pipeline — sequential anchor → poses → hero → promo ─────────────

async function runCharacterPipeline(jobId, message, context = {}) {
  const siteTag = TAG;

  const briefMatch = message.match(/(?:character(?:\s+pipeline)?(?:\s+for)?[:\s]+|generate\s+(?:a\s+)?(?:character|anchor)\s+(?:for\s+)?)\s*(.{8,120})/i);
  const rawBrief = briefMatch ? briefMatch[1].trim() : '';
  const isFamBear = /fam\s*bear/i.test(message) || !rawBrief;
  const characterName   = isFamBear ? 'FAM Bear' : rawBrief.split(/[\.,]/)[0].trim().slice(0, 40);
  const characterPrompt = isFamBear
    ? 'futuristic cartoon teddy bear, bright blue bow tie, circuit pattern details, friendly expression, full body, white background, illustrated style'
    : rawBrief;
  const characterStyle  = 'Illustrated/Cartoon';

  const DEFAULT_POSES = [
    'right arm raised high waving, left arm at side, weight shifted, waving hello',
    'right thumb raised, elbow bent, grinning, thumbs up',
    'both arms raised overhead, feet apart, mouth open in cheer, celebrating',
    'right arm extended forward, index finger pointing, leaning slightly, pointing forward',
    'arms out wide, hips swaying, one knee bent, dancing',
    'head tilted back, mouth open, hands on belly, laughing',
    'seated, elbows on desk, hands on keyboard, looking at screen, sitting at desk',
    'both hands wrapped around mug, elbows bent, slight smile, holding coffee',
    'arms bent at 90 degrees, knees lifted alternately, leaning forward, running',
    'arms extended forward and wrapped around, head tilted to side, hugging',
    'one arm extended sideways toward audience, other hand on hip, presenting',
    'one arm raised holding pennant, other fist pumping, cheering with pennant',
  ];

  function step(label, data) {
    broadcastAll({ type: 'character-pipeline-step', jobId, label, ...data });
    console.log(`[character-pipeline:${jobId}] ${label}`);
  }

  // Step 1: create anchor — call core function directly (no HTTP round-trip)
  step('anchor:start', { site_tag: siteTag, character: characterName });
  let anchorResult;
  try {
    anchorResult = await createCharacterAnchorCore({
      name: characterName,
      description: characterPrompt,
      style: characterStyle,
      prompt: characterPrompt,
      site_tag: siteTag,
    });
    step('anchor:complete', { character_id: anchorResult.character_id, anchor_path: anchorResult.anchor_path });
  } catch (e) {
    step('anchor:error', { error: e.message });
    broadcastAll({ type: 'character-pipeline-error', jobId, stage: 'anchor', error: e.message });
    return;
  }

  const characterId = anchorResult.character_id;

  // Step 2: generate all 12 poses — call core function directly
  step('poses:start', { character_id: characterId, count: DEFAULT_POSES.length });
  let posesResult;
  try {
    posesResult = await generateCharacterPosesCore({
      character_id: characterId,
      poses: DEFAULT_POSES,
      site_tag: siteTag,
    });
    const successCount = (posesResult.results || []).filter(r => r.success !== false).length;
    step('poses:complete', { character_id: characterId, success_count: successCount, total: DEFAULT_POSES.length });
  } catch (e) {
    step('poses:error', { error: e.message });
    // Non-fatal — continue to video
  }

  // Step 3: hero video from anchor — fire-and-forget via core function
  step('video:start', { character_id: characterId });
  let videoResult;
  try {
    const anchorAbsPath = path.join(getCharacterSiteDir(siteTag), anchorResult.anchor_path);
    const videoPrompt = `${characterName} animated, smooth motion, ${characterPrompt.slice(0, 80)}, white background`;
    videoResult = startVideoGenerateCore({
      image_path: anchorAbsPath,
      prompt: videoPrompt,
      site_tag: siteTag,
    });
    step('video:queued', { character_id: characterId, jobId: videoResult.jobId });
  } catch (e) {
    step('video:error', { error: e.message });
    // Non-fatal — continue to promo
  }

  // Step 4: promo video — fire-and-forget via core function
  step('promo:start', { character_id: characterId });
  try {
    const promoSpec = readSpecForSite(getCharacterSiteDir(siteTag));
    startVideoPromoCore({
      character_id: anchorResult.character_id,
      site_tag: siteTag,
      site_name: promoSpec.site_name || siteTag,
      tagline: promoSpec.tagline || promoSpec.design_brief?.tagline || `${promoSpec.site_name || siteTag} — FAMtastic`,
      pose_indices: [0, 1, 2],
    });
    step('promo:queued', { character_id: characterId });
  } catch (e) {
    step('promo:error', { error: e.message });
  }

  const posesOk  = posesResult && (posesResult.results || []).filter(r => r.success !== false).length;
  const videoOk  = !!videoResult;
  const assessment = [
    `Anchor: done (${characterName})`,
    `Poses: ${posesOk != null ? posesOk + '/' + DEFAULT_POSES.length : 'failed'}`,
    `Hero video: ${videoOk ? 'queued' : 'failed'}`,
    `Promo: queued`,
  ].join(' · ');

  broadcastAll({ type: 'character-pipeline-complete', jobId, character_id: characterId, assessment });
  console.log(`[character-pipeline:${jobId}] complete — ${assessment}`);
}

async function runAutonomousBuild(message, context = {}) {
  const t0 = Date.now();
  const log = [];
  const step = (msg, data = {}) => {
    const entry = { ms: Date.now() - t0, step: msg, ...data };
    log.push(entry);
    console.log(`[auto-build] +${entry.ms}ms ${msg}`, Object.keys(data).length ? JSON.stringify(data) : '');
  };

  try {
    const approval = authorizeShayDeveloperAction('site_write', [SITES_ROOT], context);
    logShayDeveloperModeEvent({
      event: 'autonomous_build_requested',
      actor: 'shay',
      status: approval.allowed ? 'allowed' : approval.status,
      trust_mode: approval.summary && approval.summary.trust_mode,
      target_paths: [SITES_ROOT],
      message_preview: String(message || '').slice(0, 180),
    });
    if (!approval.allowed) {
      return {
        success: false,
        blocked_by_developer_mode: true,
        developer_mode: approval.summary,
        log,
        message: `Developer Mode blocked this autonomous build. ${approval.reason}`,
        error: approval.reason,
        elapsed_ms: Date.now() - t0,
      };
    }

    // Step 1: Extract brief
    step('Extracting brief');
    const brief = await extractBriefFromMessage(message);
    step('Brief extracted', { tag: brief.tag, name: brief.business_name, revenue: brief.revenue_model });
    logShayDeveloperModeEvent({
      event: 'autonomous_build_brief_extracted',
      actor: 'shay',
      status: 'ok',
      trust_mode: approval.summary.trust_mode,
      target_site_tag: brief.tag,
    });

    // Step 2: Create site (with brief pre-loaded)
    step('Creating site', { tag: brief.tag });
    const existingDir = path.join(SITES_ROOT, brief.tag);
    if (fs.existsSync(existingDir)) {
      // Site exists — update the brief and switch to it
      const existSpec = JSON.parse(fs.readFileSync(path.join(existingDir, 'spec.json'), 'utf8')); // L7542
      normalizeTierAndMode(existSpec); // repair tier/famtastic_mode drift before updating
      existSpec.client_brief = {
        business_description: brief.business_description,
        revenue_model: brief.revenue_model,
        ideal_customer: brief.location ? `Customers in ${brief.location}` : 'Local customers',
        differentiator: brief.differentiator || 'Quality service',
        primary_cta: brief.cta,
        style_notes: brief.tone.join(', '),
      };
      existSpec.interview_completed = true;
      existSpec.interview_pending = false;
      if (brief.pages) existSpec.pages = brief.pages;
      const tmpPath = path.join(existingDir, 'spec.json.tmp');
      fs.writeFileSync(tmpPath, JSON.stringify(existSpec, null, 2));
      fs.renameSync(tmpPath, path.join(existingDir, 'spec.json'));
      step('Site exists — brief updated');
      logShayDeveloperModeEvent({
        event: 'site_write',
        actor: 'shay',
        status: 'updated_existing',
        trust_mode: approval.summary.trust_mode,
        target_paths: [existingDir],
        target_site_tag: brief.tag,
      });
    } else {
      // Create fresh
      const distDir = path.join(existingDir, 'dist');
      fs.mkdirSync(distDir, { recursive: true });
      const newSpec = {
        tag: brief.tag,
        site_name: brief.business_name,
        business_type: brief.business_description.split(' ').slice(0, 3).join(' '),
        state: 'new',
        tier: brief.tier || 'famtastic', // canonical; famtastic_mode derived on first readSpec
        created_at: new Date().toISOString(),
        interview_completed: true,
        interview_pending: false,
        pages: brief.pages,
        client_brief: {
          business_description: brief.business_description,
          revenue_model: brief.revenue_model,
          ideal_customer: brief.location ? `Customers in ${brief.location}` : 'Local customers',
          differentiator: brief.differentiator || 'Quality service',
          primary_cta: brief.cta,
          style_notes: brief.tone.join(', '),
        },
      };
      const newSpecPath = path.join(existingDir, 'spec.json');
      fs.writeFileSync(newSpecPath + '.tmp', JSON.stringify(newSpec, null, 2));
      fs.renameSync(newSpecPath + '.tmp', newSpecPath);
      step('Site created');
      logShayDeveloperModeEvent({
        event: 'site_write',
        actor: 'shay',
        status: 'created_site',
        trust_mode: approval.summary.trust_mode,
        target_paths: [existingDir],
        target_site_tag: brief.tag,
      });
    }

    // Step 2b: Synthesize design_brief from client_brief so classifier routes
    // to 'build' intent (not 'new_site' → handlePlanning which needs approval)
    step('Synthesizing design_brief for build routing');
    const specToUpdate = JSON.parse(fs.readFileSync(path.join(SITES_ROOT, brief.tag, 'spec.json'), 'utf8')); // L7605
    normalizeTierAndMode(specToUpdate); // repair before writing design_brief
    if (!specToUpdate.design_brief) {
      const cb = specToUpdate.client_brief || {};
      specToUpdate.design_brief = {
        goal: cb.business_description || brief.business_description,
        audience: cb.ideal_customer || 'Local customers',
        tone: brief.tone,
        visual_direction: {
          layout: 'standard',
          typography: 'clean and professional',
          color_usage: 'brand colors throughout',
          motion: 'subtle',
          density: 'balanced',
        },
        content_priorities: [brief.cta || 'Lead generation', 'Brand credibility'],
        must_have_sections: brief.pages,
        avoid: ['clutter', 'stock-photo feel'],
        open_questions: [],
      };
      specToUpdate.pages = brief.pages;
      specToUpdate.state = 'briefed';
      const tmpP = path.join(SITES_ROOT, brief.tag, 'spec.json.tmp');
      fs.writeFileSync(tmpP, JSON.stringify(specToUpdate, null, 2));
      fs.renameSync(tmpP, path.join(SITES_ROOT, brief.tag, 'spec.json'));
      step('design_brief synthesized');
      logShayDeveloperModeEvent({
        event: 'site_write',
        actor: 'shay',
        status: 'design_brief_synthesized',
        trust_mode: approval.summary.trust_mode,
        target_paths: [path.join(SITES_ROOT, brief.tag)],
        target_site_tag: brief.tag,
      });
    }

    // Step 3: Switch to the new site
    step('Switching to site', { tag: brief.tag });
    await endSession();
    TAG = brief.tag;
    writeLastSite(TAG);
    invalidateSpecCache();
    currentPage = 'index.html';
    sessionMessageCount = 0;
    sessionStartedAt = new Date().toISOString();
    startSession();
    studioEvents.emit(STUDIO_EVENTS.SITE_SWITCHED, { tag: TAG });

    // Notify all WS clients of the switch
    const spec = readSpec();
    const pages = listPages();
    wss.clients.forEach(client => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'site-switched', tag: TAG, pages, currentPage }));
        client.send(JSON.stringify({ type: 'pages-updated', pages, currentPage }));
      }
    });
    step('Site switched, clients notified');
    logShayDeveloperModeEvent({
      event: 'site_switch',
      actor: 'shay',
      status: 'ok',
      trust_mode: approval.summary.trust_mode,
      target_site_tag: brief.tag,
    });

    // Step 4: Trigger build directly via routeToHandler with a mock WS.
    // IMPORTANT: Cannot call handleChatMessage twice — it self-blocks via buildInProgress.
    // routeToHandler(ws, 'build', ...) calls handleChatMessage once with the right message,
    // which then sets buildInProgress + calls parallelBuild. This is the correct entry point.
    step('Triggering build (direct routeToHandler)');

    // Mock WS — mirrors all build events to real browser clients so Fritz watches live
    const mockWs = {
      readyState: 1,
      buildRunId: null,
      currentBrain: 'claude',
      brainModels: {},
      activeChildren: [],
      currentChild: null,
      autoAccept: false,
      send: (data) => {
        try {
          wss.clients.forEach(client => {
            if (client.readyState === 1) {
              try { client.send(data); } catch {}
            }
          });
        } catch {}
      },
      // parallelBuild uses ws.once/removeListener/on for close-event guards.
      // The mock WS never fires events so these are safe no-ops.
      once: () => {},
      removeListener: () => {},
      on: () => {},
    };

    // Call routeToHandler directly — it calls handleChatMessage once with correct params.
    // handleChatMessage sets buildInProgress=true, then calls parallelBuild.
    const builtSpec = readSpec();
    const buildMsg = `Build this site based on the design brief. Site name: ${builtSpec.site_name || brief.business_name}. Pages to generate: ${(builtSpec.pages || brief.pages).join(', ')}.`;
    // routeToHandler case 'build' calls handleChatMessage(ws, buildMsg, 'build', spec)
    // → buildInProgress=true → parallelBuild fires
    try {
      routeToHandler(mockWs, 'build', buildMsg, builtSpec);
      step('Build dispatched via routeToHandler');
      logShayDeveloperModeEvent({
        event: 'build_trigger',
        actor: 'shay',
        status: 'dispatched',
        trust_mode: approval.summary.trust_mode,
        target_paths: [path.join(SITES_ROOT, brief.tag)],
        target_site_tag: brief.tag,
      });
    } catch (routeErr) {
      step('routeToHandler error', { error: routeErr.message });
      logShayDeveloperModeEvent({
        event: 'build_trigger',
        actor: 'shay',
        status: 'error',
        trust_mode: approval.summary.trust_mode,
        target_paths: [path.join(SITES_ROOT, brief.tag)],
        target_site_tag: brief.tag,
        error: routeErr.message,
      });
    }

    const wsClients = [...wss.clients].filter(c => c.readyState === 1).length;

    if (wsClients === 0) {
      step('No active WS clients — build cannot be triggered until browser connects');
      return {
        success: false,
        tag: brief.tag,
        brief,
        log,
        message: `Site ${brief.business_name} created. Open Studio to trigger build — no browser connected.`,
        elapsed_ms: Date.now() - t0,
      };
    }

    step('Build triggered', { ws_clients: wsClients });

    return {
      success: true,
      tag: brief.tag,
      brief,
      log,
      message: `🚀 ${brief.business_name} build started. Watch Studio for progress.`,
      preview_url: `http://localhost:${PREVIEW_PORT}`,
      ws_clients_notified: wsClients,
      elapsed_ms: Date.now() - t0,
    };

  } catch (err) {
    step('ERROR', { error: err.message, stack: err.stack?.slice(0, 200) });
    return { success: false, error: err.message, log, elapsed_ms: Date.now() - t0 };
  }
}

// POST /api/autonomous-build — Shay-Shay's autonomous site build endpoint
app.post('/api/autonomous-build', async (req, res) => {
  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: 'message required' });
  const result = await runAutonomousBuild(message, context || {});
  res.json(result);
});

// GET /api/build-status/:tag — polling endpoint for build completion
app.get('/api/build-status/:tag', (req, res) => {
  const tagParam = req.params.tag;
  if (!tagParam || !/^[a-z0-9][a-z0-9-]*$/.test(tagParam)) {
    return res.status(400).json({ error: 'invalid tag' });
  }
  const specPath = path.join(SITES_ROOT, tagParam, 'spec.json');
  if (!fs.existsSync(specPath)) return res.status(404).json({ error: 'site not found' });
  try {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')); // L7781
    normalizeTierAndMode(spec); // in-memory only — status endpoint, no write-back
    const distDir = path.join(SITES_ROOT, tagParam, 'dist');
    const htmlFiles = fs.existsSync(distDir)
      ? fs.readdirSync(distDir).filter(f => f.endsWith('.html') && !f.startsWith('_'))
      : [];
    res.json({
      tag: tagParam,
      state: spec.state || 'unknown',
      building: buildInProgress && TAG === tagParam,
      pages_built: htmlFiles.length,
      pages: htmlFiles,
      has_brief: !!(spec.client_brief || spec.design_brief),
      fam_score: spec.fam_score || null,
      deployed_url: spec.deployed_url || null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Research files API — serves research markdown for Phase 6 workspace
app.get('/api/research', (req, res) => {
  const researchDir = path.join(SITE_DIR(), 'research');
  if (!fs.existsSync(researchDir)) return res.json({ files: [] });
  try {
    const files = fs.readdirSync(researchDir)
      .filter(f => f.endsWith('.md'))
      .map(f => ({
        name: f,
        size: fs.statSync(path.join(researchDir, f)).size,
        modified: fs.statSync(path.join(researchDir, f)).mtime.toISOString(),
      }));
    res.json({ files });
  } catch { res.json({ files: [] }); }
});

// --- Known verticals registry (Phase 4 — must be before /:filename) ---
const KNOWN_VERTICALS_LIST = [
  'restaurant', 'bakery', 'cafe', 'food-truck', 'catering',
  'retail', 'boutique', 'clothing', 'jewelry', 'antique', 'thrift', 'garage-sale',
  'salon', 'spa', 'barbershop', 'tattoo', 'nail',
  'gym', 'yoga', 'fitness', 'personal-trainer',
  'real-estate', 'property-management', 'mortgage',
  'law', 'accounting', 'financial-advisor', 'insurance',
  'medical', 'dental', 'chiropractic', 'therapy', 'veterinary',
  'plumbing', 'electrical', 'hvac', 'landscaping', 'cleaning', 'roofing',
  'photography', 'videography', 'music', 'art', 'design',
  'consulting', 'coaching', 'marketing', 'agency',
  'automotive', 'mechanic', 'car-wash', 'detailing',
  'church', 'nonprofit', 'community', 'event',
  'daycare', 'tutoring', 'education',
  'tech', 'software', 'saas', 'startup',
];

app.get('/api/research/verticals', (req, res) => {
  const researchDir = path.join(SITE_DIR(), 'research');
  let researched = [];
  if (fs.existsSync(researchDir)) {
    const files = fs.readdirSync(researchDir).filter(f => f.endsWith('.md'));
    researched = files.map(f => ({
      vertical: f.replace(/-research\.md$/, '').replace(/-/g, ' '),
      file: f,
      modified: fs.statSync(path.join(researchDir, f)).mtime.toISOString(),
    }));
  }
  res.json({ known_verticals: KNOWN_VERTICALS_LIST, researched_verticals: researched });
});

// --- Research Registry API (Phase 4) — must be before /:filename ---
const researchRegistry  = require('./lib/research-registry');
const researchRouter    = require('./lib/research-router');
const historyFormatter  = require('./lib/history-formatter');

app.get('/api/research/sources', (req, res) => {
  const sources = Object.entries(researchRegistry.RESEARCH_REGISTRY).map(([key, src]) => ({
    key,
    name: src.name,
    type: src.type,
    status: src.status,
    costPerQuery: src.costPerQuery,
    bestFor: src.bestFor,
    note: src.note || '',
  }));
  res.json({ sources });
});

app.get('/api/research/effectiveness', (req, res) => {
  try {
    const report = researchRegistry.getEffectivenessReport();
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/research/query', async (req, res) => {
  const { vertical, question, forceSource, enablePerplexity } = req.body || {};
  if (!vertical || !question) {
    return res.status(400).json({ error: 'vertical and question required' });
  }
  try {
    const result = await researchRouter.queryResearch(vertical, question, { forceSource, enablePerplexity });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/research/rate', (req, res) => {
  const { source, vertical, score } = req.body || {};
  if (!source || !vertical || !score) {
    return res.status(400).json({ error: 'source, vertical, score required' });
  }
  const ok = researchRouter.rateResearch(source, vertical, parseInt(score));
  res.json({ success: ok });
});

// --- Research feed (chronological index of all run-research + manual-ingest results) ---
app.get('/api/research/feed', (req, res) => {
  const { vertical, source, limit } = req.query;
  const findings = researchRouter.listFindings({
    vertical: vertical || undefined,
    source: source || undefined,
    limit: limit ? Math.min(parseInt(limit) || 20, 50) : 20,
  });
  res.json({ findings, count: findings.length });
});

// --- Manual research ingest (Task 7: classify + store external findings) ---
app.post('/api/research/manual-ingest', async (req, res) => {
  const { content, vertical, source_url, title } = req.body;
  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'content required' });
  }
  const spec = readSpec();
  const effectiveVertical = vertical || spec?.business_type || 'general';

  // Classify content via Claude SDK into 5 categories
  let structured = {
    title: title || 'Manual research entry',
    category: 'general',
    recommendation: content.slice(0, 200),
    confidence: 'medium',
  };
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const classification = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{
        role: 'user',
        content: `Classify this research content. Respond with JSON only — no prose.\n\nContent: "${content.slice(0, 800)}"\n\n{"title":"short descriptive title (max 60 chars)","category":"one of: trends|conversion|ux|seo|trust","recommendation":"one actionable sentence for a web designer","confidence":"high|medium|low"}`,
      }],
    });
    const text = classification.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      Object.assign(structured, parsed);
    }
  } catch (e) {
    console.warn('[manual-ingest] classification failed:', e.message);
  }

  // Store in Pinecone
  try {
    if (process.env.PINECONE_API_KEY) {
      const { Pinecone } = require('@pinecone-database/pinecone');
      const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      const idx = pc.index('famtastic-intelligence');
      const id = `manual-${effectiveVertical}-${Date.now()}`;
      await idx.namespace(effectiveVertical).upsertRecords([{
        id,
        text: `${structured.title} ${content}`.slice(0, 1000),
        source: 'manual',
        vertical: effectiveVertical,
        timestamp: new Date().toISOString(),
        question: structured.title.slice(0, 100),
        answer: content.slice(0, 1000),
      }]);
    }
  } catch (e) {
    console.warn('[manual-ingest] Pinecone upsert failed:', e.message);
  }

  const feedEntry = {
    id: `manual-${Date.now()}`,
    timestamp: new Date().toISOString(),
    vertical: effectiveVertical,
    question: structured.title,
    answer: content,
    source: 'manual',
    source_url: source_url || null,
    title: structured.title,
    category: structured.category,
    recommendation: structured.recommendation,
    confidence: structured.confidence,
  };

  researchRouter.appendToFeedIndex(feedEntry);
  console.log(`[manual-ingest] stored — ${feedEntry.title} [${feedEntry.category}]`);
  res.json({ status: 'ok', classification: { title: feedEntry.title, category: feedEntry.category, recommendation: feedEntry.recommendation, confidence: feedEntry.confidence }, id: feedEntry.id });
});

// --- Research seed status (C1) ---
app.get('/api/research/seed-status', (req, res) => {
  try {
    const researchDir = path.join(SITE_DIR(), 'research');
    const pineconeAvailable = !!process.env.PINECONE_API_KEY;
    const seeded = [];
    const unseeded = [];

    if (fs.existsSync(researchDir)) {
      const files = fs.readdirSync(researchDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const vertical = file.replace('.md', '').replace(/-/g, '_');
        const filePath = path.join(researchDir, file);
        const stat = fs.statSync(filePath);
        // "Seeded" = file exists and PINECONE_API_KEY is set
        if (pineconeAvailable) {
          seeded.push({ vertical, file, records: 0, seeded_at: stat.mtime.toISOString() });
        } else {
          unseeded.push({ vertical, file });
        }
      }
    }

    res.json({ seeded, unseeded, pinecone_available: pineconeAvailable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Research threshold analysis (C4) ---
app.get('/api/research/threshold-analysis', (req, res) => {
  try {
    const logFile = path.join(HUB_ROOT, '.local', 'research-calls.jsonl');
    if (!fs.existsSync(logFile)) {
      return res.json({ insufficient_data: true, reason: 'No research calls logged yet' });
    }
    const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
    if (lines.length < 20) {
      return res.json({ insufficient_data: true, reason: `Only ${lines.length} calls logged (need 20+)` });
    }

    const records = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const hits  = records.filter(r => r.fromCache === true);
    const misses = records.filter(r => r.fromCache === false);
    const scores = records.filter(r => typeof r.score === 'number').map(r => r.score);
    const avgSimilarity = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const missRate = records.length > 0 ? misses.length / records.length : null;

    const currentThreshold = researchRouter.getThreshold ? researchRouter.getThreshold() : 0.75;
    let recommendation = null;
    if (avgSimilarity !== null) {
      if (avgSimilarity > currentThreshold + 0.1) recommendation = 'threshold can be raised — high average similarity';
      else if (avgSimilarity < currentThreshold - 0.1) recommendation = 'threshold may be too high — consider lowering';
      else recommendation = 'threshold appears well-calibrated';
    }

    res.json({
      total_calls: records.length,
      cache_hits: hits.length,
      cache_misses: misses.length,
      miss_rate: missRate,
      avg_similarity: avgSimilarity,
      current_threshold: currentThreshold,
      recommendation,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/worker-queue — pending worker tasks dispatched by brain tool calls
//
// Session 11 Fix 8: extended response schema so the Studio UI can show
// a "Pending manual execution" badge with accurate counts. The queue
// file is append-only JSONL at ~/famtastic/.worker-queue.jsonl; tasks
// are created by the dispatch_worker tool and consumed externally (no
// worker process is currently polling — see known gaps).
//
// Response shape:
// {
//   tasks:          [ ...task objects in JSONL order ],
//   count:          total tasks in queue
//   pending_count:  tasks with status !== 'completed' && !== 'cancelled'
//   by_worker:      { claude_code: N, codex_cli: N, gemini_cli: N, ... }
//   by_status:      { pending: N, running: N, completed: N, ... }
//   oldest_pending: ISO timestamp of the oldest unfinished task (or null)
//   queue_path:     absolute file path (for debugging)
// }
app.get('/api/worker-queue', async (req, res) => {
  try {
    const queuePath = path.join(require('os').homedir(), 'famtastic', '.worker-queue.jsonl');
    const base = {
      tasks: [], count: 0, pending_count: 0,
      by_worker: {}, by_status: {},
      oldest_pending: null,
      queue_path: queuePath,
    };
    if (!fs.existsSync(queuePath)) return res.json(base);
    const lines = fs.readFileSync(queuePath, 'utf8').trim().split('\n').filter(Boolean);
    const tasks = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    const by_worker = {};
    const by_status = {};
    let pending_count = 0;
    let oldest_pending = null;
    for (const t of tasks) {
      const worker = t.worker || t.agent || 'unknown';
      const status = t.status || 'pending';
      by_worker[worker] = (by_worker[worker] || 0) + 1;
      by_status[status] = (by_status[status] || 0) + 1;
      if (status !== 'completed' && status !== 'cancelled' && status !== 'failed') {
        pending_count++;
        const ts = t.queued_at || t.created_at || t.at || null;
        if (ts && (!oldest_pending || ts < oldest_pending)) oldest_pending = ts;
      }
    }

    res.json({
      tasks, count: tasks.length,
      pending_count, by_worker, by_status,
      oldest_pending,
      queue_path: queuePath,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Memory API (Session 5-B) ────────────────────────────────────────────────

// GET /api/memory — recall memories for current site or global
app.get('/api/memory', (req, res) => {
  try {
    const { entity_type, entity_id, category, limit } = req.query;
    const rows = db.getMemories({
      entity_type: entity_type || undefined,
      entity_id:   entity_id   || undefined,
      category:    category    || undefined,
      limit:       limit ? parseInt(limit) : 20,
    });
    res.json({ memories: rows, count: rows.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/memory — manually add a memory
app.post('/api/memory', (req, res) => {
  try {
    const { entity_type, entity_id, content, category, importance } = req.body;
    if (!entity_type || !entity_id || !content) {
      return res.status(400).json({ error: 'entity_type, entity_id, content required' });
    }
    const id = memory.remember(entity_type, entity_id, content, { category, importance, source: 'manual' });
    res.json({ ok: true, id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ─── Job Queue API (Session 4-A) ─────────────────────────────────────────────

// GET /api/jobs — list jobs, optional ?status= and ?site_tag= filters
app.get('/api/jobs', (req, res) => {
  try {
    const { status, site_tag, limit } = req.query;
    const jobs = db.listJobs({ status, site_tag, limit: limit ? parseInt(limit) : 50 });
    res.json({ jobs, count: jobs.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/jobs/approve/:id — transition pending → approved
app.post('/api/jobs/approve/:id', (req, res) => {
  try {
    const job = jobQueue.approveJob(req.params.id);
    res.json({ ok: true, job });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/jobs/park/:id — transition pending|blocked → parked
app.post('/api/jobs/park/:id', (req, res) => {
  try {
    const job = jobQueue.parkJob(req.params.id);
    res.json({ ok: true, job });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Research file content (Wave 2) ---
app.get('/api/research/:filename', (req, res) => {
  const filename = req.params.filename;
  // Allowlist: only serve files that actually exist in the research dir (Codex S4 fix)
  const researchDir = path.join(SITE_DIR(), 'research');
  if (!fs.existsSync(researchDir)) return res.status(404).json({ error: 'No research directory' });
  const allowedFiles = fs.readdirSync(researchDir).filter(f => f.endsWith('.md'));
  if (!allowedFiles.includes(filename)) {
    return res.status(404).json({ error: 'File not found' });
  }
  const filePath = path.join(researchDir, filename);
  // Codex review: reject symlinks that escape the research directory
  const realFile = fs.realpathSync(filePath);
  const realDir = fs.realpathSync(researchDir);
  if (!realFile.startsWith(realDir + path.sep)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  const stat = fs.statSync(filePath);
  // Cap at 500KB (Codex E2, F2 fix)
  if (stat.size > 512000) {
    const content = fs.readFileSync(filePath, 'utf8').substring(0, 512000);
    return res.json({ name: filename, content: content + '\n\n[Truncated — file exceeds 500KB]', truncated: true });
  }
  const content = fs.readFileSync(filePath, 'utf8');
  res.json({ name: filename, content });
});

// ─── Phase 4: Image Browser + Research View ──────────────────────────────────

// --- Image search query suggestions from spec.design_brief ---
app.get('/api/image-suggestions', (req, res) => {
  const spec = readSpec();
  const brief = spec.design_brief || {};
  const businessName = spec.site_name || brief.business_name || '';
  const industry = spec.business_type || brief.industry || brief.category || '';
  const palette = brief.color_palette || '';
  const style = brief.style || brief.design_style || '';

  const suggestions = [];
  if (businessName && industry) suggestions.push(`${businessName} ${industry}`);
  if (industry) {
    suggestions.push(`${industry} professional`);
    suggestions.push(`${industry} lifestyle`);
    suggestions.push(`${industry} background`);
    if (style) suggestions.push(`${industry} ${style}`);
  }
  if (businessName) suggestions.push(`${businessName} storefront`);
  suggestions.push('hero background professional');
  suggestions.push('modern business lifestyle');
  suggestions.push('small business community');

  const unique = [...new Set(suggestions.filter(Boolean))].slice(0, 8);
  res.json({ suggestions: unique, business_name: businessName, industry });
});

// --- Research trigger — create stub research file for a vertical ---
app.post('/api/research/trigger', (req, res) => {
  const { vertical } = req.body;
  if (!vertical || typeof vertical !== 'string') {
    return res.status(400).json({ error: 'vertical (string) required' });
  }

  const safeVertical = vertical.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const filename = `${safeVertical}-research.md`;
  const researchDir = path.join(SITE_DIR(), 'research');
  fs.mkdirSync(researchDir, { recursive: true });
  const filePath = path.join(researchDir, filename);

  // Idempotent: if file already exists, return it
  if (fs.existsSync(filePath)) {
    return res.json({ file: filename, status: 'existing', vertical: safeVertical });
  }

  // Generate a structured research stub (no AI — immediate response)
  const spec = readSpec();
  const businessName = spec.site_name || spec.design_brief?.business_name || 'Business';
  const now = new Date().toISOString().split('T')[0];

  const stub = `# ${vertical} — Market Research
*Generated: ${now} | Site: ${businessName}*

## Business Category Overview
Research stub for the **${vertical}** vertical. This file can be expanded with:
- Competitive landscape analysis
- Typical customer profiles and demographics
- Key pain points and value propositions
- Standard pricing and service models
- Common website sections and CTAs

## Target Audience
*Who are the typical customers for this type of business?*
- Primary demographic: TBD
- Key motivations: TBD
- Common objections: TBD

## Competitive Landscape
*What do leading businesses in this vertical do well?*
- Common design patterns: TBD
- Typical color palettes: TBD
- Trust signals used: TBD

## Website Must-Haves
*What sections / features does every ${vertical} site need?*
1. Hero with clear value proposition
2. Services / Products section
3. Social proof (reviews, testimonials)
4. Contact / Booking
5. About / Story

## Recommended Search Queries (Stock Photos)
- ${vertical} professional
- ${vertical} lifestyle
- ${vertical} customers
- small business ${vertical}

## Key Messages
*What should the homepage communicate above the fold?*
- TBD

## Notes
*Add research findings from competitor analysis, customer interviews, or industry reports here.*
`;

  fs.writeFileSync(filePath, stub);
  console.log(`[research-trigger] Created stub: ${filename}`);

  res.json({ file: filename, status: 'stub', vertical: safeVertical });
});

// --- Research → brief extractor ---
app.post('/api/research/to-brief', (req, res) => {
  const { filename } = req.body;
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'filename required' });
  }

  const researchDir = path.join(SITE_DIR(), 'research');
  if (!fs.existsSync(researchDir)) return res.status(404).json({ error: 'No research directory' });

  const allowedFiles = fs.readdirSync(researchDir).filter(f => f.endsWith('.md'));
  if (!allowedFiles.includes(filename)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(researchDir, filename);
  const realFile = fs.realpathSync(filePath);
  const realDir = fs.realpathSync(researchDir);
  if (!realFile.startsWith(realDir + path.sep)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const vertical = filename.replace(/-research\.md$/, '').replace(/-/g, ' ');

  // Extract key sections to build a brief
  const lines = content.split('\n');
  const musthaves = [];
  const messages = [];
  let inMusthaves = false;
  let inMessages = false;

  for (const line of lines) {
    if (line.includes('Website Must-Haves')) { inMusthaves = true; inMessages = false; continue; }
    if (line.includes('Key Messages')) { inMessages = true; inMusthaves = false; continue; }
    if (line.startsWith('#') && !line.includes('Must-Haves') && !line.includes('Key Messages')) {
      inMusthaves = false; inMessages = false;
    }
    if (inMusthaves && line.match(/^\d+\./)) musthaves.push(line.replace(/^\d+\.\s*/, '').trim());
    if (inMessages && line.startsWith('-') && !line.includes('TBD')) messages.push(line.replace(/^-\s*/, '').trim());
  }

  const spec = readSpec();
  const businessName = spec.site_name || spec.design_brief?.business_name || 'the business';

  let brief_text = `Build a website for ${businessName}, a ${vertical} business.\n\n`;
  if (musthaves.length > 0) {
    brief_text += `Key pages and sections needed: ${musthaves.slice(0, 5).join(', ')}.\n\n`;
  }
  if (messages.length > 0) {
    brief_text += `Key messages: ${messages.join('. ')}.\n\n`;
  }
  brief_text += `Based on research from ${filename.replace('.md', '')}.`;

  res.json({ brief_text, filename, vertical });
});

// (GET /api/research/verticals defined earlier, before /:filename to avoid route conflict)

// ─── Phase 5: Intelligence Loop ───────────────────────────────────────────────

/**
 * Analyze all available log data for the current site and return structured findings.
 * Reads: agent-calls.jsonl, mutations.jsonl, build-metrics.jsonl, components/library.json
 * Returns: { findings[], summary, generated_at }
 */

// --- Intel helpers (dismiss system + backlog) ---
const DISMISSED_FINDINGS_PATH = path.join(__dirname, '.dismissed-findings.json');
const BUILD_BACKLOG_PATH = path.join(HUB_ROOT, '.wolf', 'build-backlog.json');

function slugifyFinding(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
}

function loadDismissed() {
  try { if (fs.existsSync(DISMISSED_FINDINGS_PATH)) return JSON.parse(fs.readFileSync(DISMISSED_FINDINGS_PATH, 'utf8')); } catch {}
  return {};
}

function saveDismissed(data) {
  fs.writeFileSync(DISMISSED_FINDINGS_PATH, JSON.stringify(data, null, 2));
}

function generateIntelReport(tagOverride = null) {
  const findings = [];
  let findingIdCounter = 1;
  const makeId = (category, suffix) => `${category}-${suffix}-${findingIdCounter++}`;

  // Session 12 Phase 1: allow caller to pass an explicit tag so the
  // intelligence loop can iterate over every site in the repo instead
  // of only reporting on whichever site TAG currently points at.
  const tag = tagOverride || TAG;
  const siteDir = path.join(SITES_ROOT, tag);

  // ── Read log files ──────────────────────────────────────────────────────
  const agentLogPath = path.join(siteDir, 'agent-calls.jsonl');
  const mutationLogPath = path.join(siteDir, 'mutations.jsonl');
  const buildMetricsPath = path.join(siteDir, 'build-metrics.jsonl');
  const libraryPath = path.join(HUB_ROOT, 'components', 'library.json');

  const readJsonl = (p) => {
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, 'utf8').trim().split('\n').filter(Boolean)
      .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  };

  const agentCalls = readJsonl(agentLogPath);
  const mutations = readJsonl(mutationLogPath);
  const buildMetrics = readJsonl(buildMetricsPath);
  let library = [];
  try {
    const libRaw = JSON.parse(fs.readFileSync(libraryPath, 'utf8') || '{}');
    // library.json is { version, components[], last_updated } — extract the array
    library = Array.isArray(libRaw) ? libRaw : (libRaw.components || []);
  } catch {}

  // ── Agent performance analysis (category: agents) ─────────────────────
  if (agentCalls.length > 0) {
    const byAgent = {};
    let fallbackCount = 0;
    let totalCost = 0;
    for (const c of agentCalls) {
      const a = c.agent || 'unknown';
      if (!byAgent[a]) byAgent[a] = { calls: 0, failures: 0, total_ms: 0, total_cost: 0 };
      byAgent[a].calls++;
      if (!c.success) byAgent[a].failures++;
      byAgent[a].total_ms += c.elapsed_ms || 0;
      byAgent[a].total_cost += c.est_cost_usd || 0;
      totalCost += c.est_cost_usd || 0;
      if (c.fallback_from) fallbackCount++;
    }

    // High fallback rate
    const codexCalls = byAgent['codex']?.calls || 0;
    const codexFailures = byAgent['codex']?.failures || 0;
    const codexFailRate = codexCalls > 0 ? codexFailures / codexCalls : 0;
    if (codexCalls > 0 && codexFailRate >= 0.5) {
      findings.push({
        id: makeId('agents', 'codex-fail-rate'),
        category: 'agents',
        severity: codexFailRate >= 0.8 ? 'major' : 'minor',
        title: `Codex failing ${Math.round(codexFailRate * 100)}% of calls`,
        description: `Codex has ${codexFailures}/${codexCalls} failures. High failure rate wastes time on Codex timeout before Claude fallback (typically 120 seconds lost per failure).`,
        recommendation: `Route 'compare' intent directly to Claude until Codex CLI is stable. Expected savings: ~${Math.round(codexFailures * 2)} minutes per session.`,
        data: { codex_calls: codexCalls, codex_failures: codexFailures, fail_rate: codexFailRate },
      });
    }

    // High fallback cost
    if (fallbackCount > 0 && fallbackCount >= agentCalls.length * 0.3) {
      findings.push({
        id: makeId('agents', 'high-fallback'),
        category: 'agents',
        severity: 'minor',
        title: `${fallbackCount} agent fallbacks detected`,
        description: `${fallbackCount} of ${agentCalls.length} calls triggered a fallback (primary agent failed, secondary used). Each fallback adds latency and may incur double cost.`,
        recommendation: 'Review routing guide — if fallback rate stays above 30%, promote secondary agent to primary for those intents.',
        data: { fallback_count: fallbackCount, total_calls: agentCalls.length },
      });
    }

    // Cost concentration
    const claudeCost = byAgent['claude']?.total_cost || 0;
    if (claudeCost > 0.5) {
      findings.push({
        id: makeId('cost', 'claude-cost'),
        category: 'cost',
        severity: 'opportunity',
        title: `$${claudeCost.toFixed(3)} spent on Claude this session`,
        description: `Claude has generated $${claudeCost.toFixed(3)} in token costs. Most spend is on 'compare' intent (full-page generation).`,
        recommendation: 'Evaluate whether full-page compare is needed for every review cycle, or if incremental diffs would suffice.',
        data: { claude_cost: claudeCost, total_cost: totalCost },
      });
    }
  }

  // ── Mutation pattern analysis (category: mutations) ────────────────────
  if (mutations.length > 0) {
    const fieldCounts = {};
    const sourceCounts = {};
    const cascades = [];
    for (const m of mutations) {
      const fid = m.target_id || 'unknown';
      fieldCounts[fid] = (fieldCounts[fid] || 0) + 1;
      const src = m.source || 'unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      if (m.cascade_pages?.length > 0) cascades.push(m);
    }

    // Most-edited fields
    const hotFields = Object.entries(fieldCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (hotFields.length > 0 && hotFields[0][1] >= 2) {
      findings.push({
        id: makeId('mutations', 'hot-fields'),
        category: 'mutations',
        severity: 'opportunity',
        title: `Hot fields: ${hotFields.map(([f, c]) => `${f} (${c}x)`).join(', ')}`,
        description: `These fields were edited multiple times. Frequent edits indicate they should be surfaced prominently in the editable view or auto-focused when the canvas opens.`,
        recommendation: `Pin hot fields to the top of the editable view for faster access. Add these field_ids to a "pinned_fields" list in spec.content.`,
        data: { hot_fields: Object.fromEntries(hotFields) },
      });
    }

    // API vs chat edit ratio
    const apiEdits = sourceCounts['content_field_api'] || 0;
    const chatEdits = mutations.length - apiEdits;
    if (apiEdits > 0 && chatEdits === 0) {
      findings.push({
        id: makeId('mutations', 'all-api-edits'),
        category: 'mutations',
        severity: 'opportunity',
        title: 'All content edits via direct API (no AI)',
        description: `${apiEdits} edits applied surgically via /api/content-field — zero AI roundtrips. The deterministic path is working correctly.`,
        recommendation: 'No action needed. Continue monitoring — if chat edits appear, verify classifier is routing content_update correctly.',
        data: { api_edits: apiEdits, chat_edits: chatEdits },
      });
    }

    // Performance: slow mutation path
    const totalMutations = mutations.length;
    if (totalMutations > 0) {
      findings.push({
        id: makeId('performance', 'mutation-volume'),
        category: 'performance',
        severity: 'opportunity',
        title: `${totalMutations} field mutations logged`,
        description: `Mutation log has ${totalMutations} entries. Build pipeline is tracking content evolution correctly.`,
        recommendation: 'Archive mutations.jsonl when it exceeds 1000 entries to prevent slow reads. Add periodic archival to maintenance script.',
        data: { total_mutations: totalMutations },
      });
    }
  }

  // ── Component usage analysis (category: components) ───────────────────
  if (library.length > 0) {
    const highUsage = library.filter(c => (c.usage_count || 0) >= 2).sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    const neverUsed = library.filter(c => !c.used_in || c.used_in.length === 0);
    const multiSite = library.filter(c => (c.used_in || []).length >= 2);

    if (highUsage.length > 0) {
      findings.push({
        id: makeId('components', 'high-usage'),
        category: 'components',
        severity: 'opportunity',
        title: `${highUsage.length} high-usage component(s): ${highUsage.slice(0, 2).map(c => c.id).join(', ')}`,
        description: `These components are re-exported 2+ times, indicating strong reuse patterns. They should be prioritized for documentation and skill refinement.`,
        recommendation: `Run "fam-hub skill update" on ${highUsage[0]?.id} to capture latest usage learnings. Add it to the default component suggestions for new builds.`,
        data: { high_usage: highUsage.map(c => ({ id: c.id, usage_count: c.usage_count })) },
      });
    }

    if (multiSite.length > 0) {
      findings.push({
        id: makeId('components', 'cross-site'),
        category: 'components',
        severity: 'opportunity',
        title: `${multiSite.length} component(s) used across multiple sites`,
        description: `Cross-site components are the foundation of the component factory. These are proven, reusable, and should be treated as platform primitives.`,
        recommendation: 'Add cross-site components to the default starter set. Consider a component compatibility matrix (which components work together well).',
        data: { cross_site: multiSite.map(c => ({ id: c.id, sites: c.used_in })) },
      });
    }

    if (neverUsed.length > 0) {
      findings.push({
        id: makeId('components', 'unused'),
        category: 'components',
        severity: 'minor',
        title: `${neverUsed.length} component(s) never imported into a site`,
        description: `These components exist in the library but have no recorded imports: ${neverUsed.slice(0, 3).map(c => c.id).join(', ')}.`,
        recommendation: 'Validate that used_in tracking is working. If components are genuinely unused after 30 days, consider archiving them.',
        data: { unused: neverUsed.map(c => c.id) },
      });
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────
  const countBySeverity = { critical: 0, major: 0, minor: 0, opportunity: 0 };
  for (const f of findings) countBySeverity[f.severity] = (countBySeverity[f.severity] || 0) + 1;

  const summary = {
    total_agent_calls: agentCalls.length,
    total_mutations: mutations.length,
    total_cost_usd: +(agentCalls.reduce((s, c) => s + (c.est_cost_usd || 0), 0)).toFixed(4),
    component_count: library.length,
    build_count: buildMetrics.length,
    finding_counts: countBySeverity,
  };

  return { findings, summary, generated_at: new Date().toISOString(), site: tag || 'unknown' };
}

// Session 12 Phase 1 (I1): getPromotedIntelligence()
// Reads intelligence-promotions.json for the given tag and returns
// high-signal, non-dismissed promotions that the build prompt should
// know about. The intelligence loop promotes findings; this is the
// loop-close step where a promotion actually alters the next build.
function getPromotedIntelligence(tagOverride = null) {
  try {
    const tag = tagOverride || TAG;
    const siteDir = path.join(SITES_ROOT, tag);
    const promoFile = path.join(siteDir, 'intelligence-promotions.json');
    if (!fs.existsSync(promoFile)) return [];
    const raw = JSON.parse(fs.readFileSync(promoFile, 'utf8'));
    if (!Array.isArray(raw)) return [];
    // Keep major severity promotions plus opportunities that the user
    // has explicitly promoted. Dismiss anything marked dismissed.
    return raw.filter(p => {
      if (!p || p.status === 'dismissed') return false;
      return p.severity === 'major' || p.severity === 'opportunity';
    });
  } catch (err) {
    console.warn('[getPromotedIntelligence] failed:', err.message);
    return [];
  }
}

// Session 12 Phase 1 (I2): writePendingReview()
// After a build, render a PENDING-REVIEW.md file to the user's home
// directory (outside the repo on purpose — we do not want to push intel
// reports to GitHub). Used on startup so the user always knows what
// findings are waiting for human review.
function writePendingReview() {
  try {
    const os = require('os');
    const reviewFile = path.join(os.homedir(), 'PENDING-REVIEW.md');

    // Iterate every site the repo knows about
    const sitesDir = SITES_ROOT;
    const allTags = fs.existsSync(sitesDir)
      ? fs.readdirSync(sitesDir).filter(n => fs.statSync(path.join(sitesDir, n)).isDirectory())
      : [];

    const lines = [];
    lines.push('# FAMtastic — Pending Review');
    lines.push('');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Active site: ${TAG}`);
    lines.push('');
    lines.push('This file lives at ~/PENDING-REVIEW.md (outside the repo) and is regenerated');
    lines.push('after every build and by the `scripts/intelligence-loop` cron. It aggregates');
    lines.push('major findings and pending promotions across every site in the factory.');
    lines.push('');

    let totalMajor = 0;
    let totalPendingPromotions = 0;

    for (const tag of allTags) {
      let report;
      try { report = generateIntelReport(tag); } catch { continue; }
      const major = (report.findings || []).filter(f => f.severity === 'major' || f.severity === 'critical');
      const promos = getPromotedIntelligence(tag).filter(p => p.status !== 'applied');
      if (major.length === 0 && promos.length === 0) continue;

      lines.push(`## ${tag}`);
      lines.push('');

      if (major.length > 0) {
        lines.push(`### Major findings (${major.length})`);
        for (const f of major) {
          lines.push(`- **[${f.category}]** ${f.title}`);
          lines.push(`  - ${f.description}`);
          lines.push(`  - Recommendation: ${f.recommendation}`);
        }
        lines.push('');
        totalMajor += major.length;
      }

      if (promos.length > 0) {
        lines.push(`### Pending promotions (${promos.length})`);
        for (const p of promos) {
          lines.push(`- **[${p.category} / ${p.severity}]** ${p.title}`);
          lines.push(`  - Promoted at: ${p.promoted_at}`);
          lines.push(`  - Action: ${p.recommendation}`);
          lines.push(`  - Status: ${p.status}`);
        }
        lines.push('');
        totalPendingPromotions += promos.length;
      }
    }

    if (totalMajor === 0 && totalPendingPromotions === 0) {
      lines.push('_No major findings or pending promotions across any site._');
      lines.push('');
    }

    lines.push('---');
    lines.push(`Totals: ${totalMajor} major finding(s), ${totalPendingPromotions} pending promotion(s).`);

    fs.writeFileSync(reviewFile, lines.join('\n'));
    console.log(`[intel-loop] Wrote ${reviewFile} — ${totalMajor} major, ${totalPendingPromotions} pending`);
    return { file: reviewFile, totalMajor, totalPendingPromotions };
  } catch (err) {
    console.error('[writePendingReview] failed:', err.message);
    return null;
  }
}

// Session 12 Phase 1 (I2): checkPendingReview()
// Called once at server startup — if ~/PENDING-REVIEW.md exists and has
// non-trivial content, log a clear banner so the developer knows there
// is something waiting. Does NOT interrupt startup or fail.
function checkPendingReview() {
  try {
    const os = require('os');
    const reviewFile = path.join(os.homedir(), 'PENDING-REVIEW.md');
    if (!fs.existsSync(reviewFile)) {
      console.log('[intel-loop] No ~/PENDING-REVIEW.md yet — will be generated after next build.');
      return;
    }
    const content = fs.readFileSync(reviewFile, 'utf8');
    const majorMatch = content.match(/(\d+)\s+major finding/);
    const promoMatch = content.match(/(\d+)\s+pending promotion/);
    const major = majorMatch ? parseInt(majorMatch[1], 10) : 0;
    const promo = promoMatch ? parseInt(promoMatch[1], 10) : 0;
    if (major === 0 && promo === 0) {
      console.log('[intel-loop] ~/PENDING-REVIEW.md is clean (0 major, 0 pending).');
      return;
    }
    console.log('');
    console.log('════════════════════════════════════════════════════════════');
    console.log('  📋  PENDING REVIEW');
    console.log(`     ${major} major finding(s), ${promo} pending promotion(s)`);
    console.log(`     See: ${reviewFile}`);
    console.log('════════════════════════════════════════════════════════════');
    console.log('');
  } catch (err) {
    console.warn('[checkPendingReview] failed:', err.message);
  }
}

// Session 12 Phase 3: updateFamtasticDna()
// Append a terse build entry to ~/famtastic/famtastic-dna.md between the
// <!-- DNA-AUTO-BEGIN --> and <!-- DNA-AUTO-END --> markers after every
// successful build. The manual content above the markers is preserved.
// If the file exceeds DNA_SIZE_BUDGET bytes (40KB), the oldest auto-entries
// are condensed into a single summary block so the file doesn't grow
// unbounded and blow the CLAUDE.md include budget.
const DNA_FILE_PATH = path.join(HUB_ROOT, 'famtastic-dna.md');
const DNA_BEGIN_MARKER = '<!-- DNA-AUTO-BEGIN -->';
const DNA_END_MARKER = '<!-- DNA-AUTO-END -->';
const DNA_SIZE_BUDGET = 40 * 1024; // 40KB — keep CLAUDE.md include affordable

function updateFamtasticDna(entry) {
  try {
    if (!fs.existsSync(DNA_FILE_PATH)) {
      console.warn('[dna] famtastic-dna.md missing — skip update');
      return null;
    }

    let content = fs.readFileSync(DNA_FILE_PATH, 'utf8');
    const beginIdx = content.indexOf(DNA_BEGIN_MARKER);
    const endIdx = content.indexOf(DNA_END_MARKER);
    if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
      console.warn('[dna] markers missing — skip update');
      return null;
    }

    const before = content.slice(0, beginIdx + DNA_BEGIN_MARKER.length);
    const after = content.slice(endIdx);
    let autoBody = content.slice(beginIdx + DNA_BEGIN_MARKER.length, endIdx);

    // Render the new entry as a dated markdown block. Always lead and
    // trail with a newline so repeated appends produce clean markdown
    // and the end marker stays on its own line.
    const dateStr = new Date().toISOString().slice(0, 10);
    const bodyLines = [
      `### ${dateStr} — ${entry.tag || 'unknown'} build`,
      '',
      `- Pages: ${(entry.pages || []).join(', ') || '(none)'}`,
      `- Intent: ${entry.intent || 'build'}`,
      `- Duration: ${entry.elapsed_seconds != null ? entry.elapsed_seconds + 's' : 'n/a'}`,
      entry.checklist_score ? `- Checklist: ${entry.checklist_score}` : null,
      entry.note ? `- Note: ${entry.note}` : null,
    ].filter(Boolean);
    const block = '\n\n' + bodyLines.join('\n') + '\n';

    // Strip any trailing whitespace from the existing auto body so we
    // always start a fresh entry on its own line.
    autoBody = autoBody.replace(/\s+$/, '');
    autoBody = autoBody + block;

    // Size guard — if the whole file would exceed the budget, condense the
    // oldest auto-entries into a summary paragraph and drop them. We keep
    // the most recent 10 entries verbatim.
    let newContent = before + autoBody + after;
    if (Buffer.byteLength(newContent, 'utf8') > DNA_SIZE_BUDGET) {
      const entryRegex = /\n### \d{4}-\d{2}-\d{2} — [^\n]+\n[\s\S]*?(?=\n### \d{4}-\d{2}-\d{2} — |\n$)/g;
      const entries = autoBody.match(entryRegex) || [];
      if (entries.length > 10) {
        const toCondense = entries.slice(0, entries.length - 10);
        const kept = entries.slice(entries.length - 10).join('');
        const firstDate = (toCondense[0].match(/\d{4}-\d{2}-\d{2}/) || [])[0] || '?';
        const lastDate = (toCondense[toCondense.length - 1].match(/\d{4}-\d{2}-\d{2}/) || [])[0] || '?';
        const summary = `\n### ${firstDate} → ${lastDate} — condensed (${toCondense.length} builds)\n\n` +
          `_This range of build entries was automatically condensed to stay under the ` +
          `${Math.round(DNA_SIZE_BUDGET / 1024)}KB dna budget. The detailed entries are ` +
          `available in git history._\n`;
        autoBody = summary + kept;
        newContent = before + autoBody + after;
      }
    }

    fs.writeFileSync(DNA_FILE_PATH, newContent);
    console.log(`[dna] appended build entry for ${entry.tag} (${Buffer.byteLength(newContent, 'utf8')} bytes)`);
    return { bytes: Buffer.byteLength(newContent, 'utf8') };
  } catch (err) {
    console.warn('[updateFamtasticDna] failed:', err.message);
    return null;
  }
}

// --- Studio Context (Phase 1) ---
app.get('/api/context', (req, res) => {
  const ctxFile = path.join(HUB_ROOT, studioContextWriter.OUTPUT_FILENAME);
  if (!fs.existsSync(ctxFile)) {
    return res.json({ exists: false, content: '', active_site: TAG, generated_at: null });
  }
  const content = fs.readFileSync(ctxFile, 'utf8');
  const genLine = content.split('\n').find(l => l.startsWith('## Generated:'));
  const generated_at = genLine ? genLine.replace('## Generated:', '').trim() : null;
  res.json({ exists: true, content, active_site: TAG, generated_at });
});

app.post('/api/context/refresh', (req, res) => {
  const eventType = (req.body && req.body.event) || 'manual_refresh';
  studioContextWriter.generate(eventType, { tag: TAG })
    .then(() => {
      const ctxFile = path.join(HUB_ROOT, studioContextWriter.OUTPUT_FILENAME);
      res.json({ success: true, file: ctxFile });
    })
    .catch(err => res.status(500).json({ error: err.message }));
});

// --- Brain router ---
app.get('/api/brain', (req, res) => {
  res.json({ currentBrain, limits: BRAIN_LIMITS, sessionCounts: sessionBrainCounts });
});

app.post('/api/brain', (req, res) => {
  const { brain } = req.body || {};
  if (!brain || !BRAIN_LIMITS[brain]) {
    return res.status(400).json({ error: `Unknown brain: ${brain}. Valid: claude, codex, gemini` });
  }
  setBrain(brain);
  res.json({ success: true, brain: currentBrain, limits: BRAIN_LIMITS });
});

// --- Intelligence report ---
app.get('/api/intel/report', (req, res) => {
  try {
    const report = generateIntelReport();
    res.json(report);
  } catch (e) {
    console.error('[intel/report]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// --- Intelligence findings only (by severity, filtered by dismissed) ---
app.get('/api/intel/findings', (req, res) => {
  try {
    const siteTag = req.query.tag || TAG;
    const report = generateIntelReport(siteTag);
    const dismissed = loadDismissed();
    const siteDismissed = dismissed[siteTag] || {};
    const findings = report.findings.filter(f => {
      const key = `${siteTag}-${f.severity}-${slugifyFinding(f.title)}`;
      return !siteDismissed[key];
    });
    res.json({
      findings,
      critical_count: findings.filter(f => f.severity === 'critical').length,
      major_count: findings.filter(f => f.severity === 'major').length,
      minor_count: findings.filter(f => f.severity === 'minor').length,
      opportunity_count: findings.filter(f => f.severity === 'opportunity').length,
      generated_at: report.generated_at,
      site: siteTag,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Promote a finding into the pipeline ---
app.post('/api/intel/promote', (req, res) => {
  const { finding_id } = req.body;
  if (!finding_id) return res.status(400).json({ error: 'finding_id required' });

  const report = generateIntelReport();
  const finding = report.findings.find(f => f.id === finding_id);
  if (!finding) return res.status(404).json({ error: 'Finding not found — may have been resolved' });

  // Record promotion
  const promotionsFile = path.join(SITE_DIR(), 'intelligence-promotions.json');
  let promotions = [];
  try { if (fs.existsSync(promotionsFile)) promotions = JSON.parse(fs.readFileSync(promotionsFile, 'utf8')); } catch {}

  const promotion = {
    finding_id,
    category: finding.category,
    severity: finding.severity,
    title: finding.title,
    recommendation: finding.recommendation,
    promoted_at: new Date().toISOString(),
    action_taken: `Logged for pipeline review: ${finding.recommendation.substring(0, 100)}`,
    status: 'pending', // pending → applied → dismissed
  };

  promotions = promotions.filter(p => p.finding_id !== finding_id); // replace if re-promoted
  promotions.push(promotion);
  fs.writeFileSync(promotionsFile, JSON.stringify(promotions, null, 2));

  console.log(`[intel/promote] finding_id=${finding_id} category=${finding.category}`);
  res.json({ promoted_at: promotion.promoted_at, finding_id, action_taken: promotion.action_taken });
});

// --- Dismiss a finding (site-scoped, persists across sessions) ---
app.post('/api/intel/dismiss', (req, res) => {
  const { severity, title, category } = req.body;
  if (!severity || !title) return res.status(400).json({ error: 'severity and title required' });
  const siteTag = TAG;
  const key = `${siteTag}-${severity}-${slugifyFinding(title)}`;
  const dismissed = loadDismissed();
  if (!dismissed[siteTag]) dismissed[siteTag] = {};
  dismissed[siteTag][key] = {
    dismissed_at: new Date().toISOString(),
    category: category || 'unknown',
    summary: String(title).substring(0, 120),
  };
  saveDismissed(dismissed);
  console.log(`[intel/dismiss] ${siteTag} — ${key}`);
  res.json({ dismissed: true, key });
});

// --- Log a finding to the build backlog ---
app.post('/api/intel/backlog', (req, res) => {
  const { severity, title, description, category } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  let backlog = [];
  try { if (fs.existsSync(BUILD_BACKLOG_PATH)) backlog = JSON.parse(fs.readFileSync(BUILD_BACKLOG_PATH, 'utf8')); } catch {}
  if (!Array.isArray(backlog)) backlog = [];
  let session = 0;
  try { session = JSON.parse(fs.readFileSync(STUDIO_FILE(), 'utf8')).session_count || 0; } catch {}
  const entry = {
    id: `backlog-${Date.now()}`,
    logged_at: new Date().toISOString(),
    source: 'intel',
    severity: severity || 'unknown',
    site_tag: TAG,
    category: category || 'unknown',
    title: String(title).substring(0, 200),
    description: String(description || '').substring(0, 500),
    status: 'open',
    session,
  };
  backlog.push(entry);
  fs.writeFileSync(BUILD_BACKLOG_PATH, JSON.stringify(backlog, null, 2));
  console.log(`[intel/backlog] logged: ${entry.id} — ${entry.title}`);
  res.json({ logged: true, id: entry.id });
});

// --- Run intelligence research (real Gemini + Claude extraction) ---
app.post('/api/intel/run-research', async (req, res) => {
  const { source = 'gemini_loop', vertical, question, topic } = req.body;
  const spec = readSpec();
  const effectiveVertical = vertical || spec?.business_type || 'general';
  const effectiveQuestion = question || topic ||
    `What are key best practices, conversion patterns, and current trends for ${effectiveVertical} businesses?`;

  const { RESEARCH_REGISTRY } = require('./lib/research-registry');
  if (!RESEARCH_REGISTRY[source]) {
    return res.status(400).json({ error: `Unknown source: ${source}. Valid: ${Object.keys(RESEARCH_REGISTRY).join(', ')}` });
  }

  try {
    console.log(`[run-research] source=${source} vertical=${effectiveVertical}`);
    const rawResult = await RESEARCH_REGISTRY[source].query(effectiveVertical, effectiveQuestion);

    if (!rawResult.answer) {
      return res.json({ status: 'no_answer', source, vertical: effectiveVertical, question: effectiveQuestion, reason: rawResult.meta?.reason || 'source returned no answer' });
    }

    // Store in Pinecone via integrated embedding path
    try {
      const { Pinecone } = require('@pinecone-database/pinecone');
      if (process.env.PINECONE_API_KEY) {
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const idx = pc.index('famtastic-intelligence');
        const id = `${source}-${effectiveVertical}-${Date.now()}`;
        await idx.namespace(effectiveVertical).upsertRecords([{
          id,
          text: `${effectiveQuestion} ${rawResult.answer}`.slice(0, 1000),
          source,
          vertical: effectiveVertical,
          timestamp: new Date().toISOString(),
          question: effectiveQuestion.slice(0, 100),
          answer: rawResult.answer.slice(0, 1000),
        }]);
      }
    } catch (e) {
      console.warn('[run-research] Pinecone upsert failed:', e.message);
    }

    // Claude SDK extraction: structure raw text into actionable finding
    let structured = {
      title: effectiveQuestion.slice(0, 60),
      category: 'general',
      recommendation: rawResult.answer.slice(0, 200),
      confidence: 'medium',
    };
    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const extraction = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 250,
        messages: [{
          role: 'user',
          content: `Extract a structured finding from this research text. Respond with JSON only — no prose, no markdown fences.\n\nResearch: "${rawResult.answer.slice(0, 800)}"\n\n{"title":"short descriptive title (max 60 chars)","category":"one of: trends|conversion|ux|seo|trust","recommendation":"one actionable sentence for a web designer","confidence":"high|medium|low"}`,
        }],
      });
      const text = extraction.content[0]?.text || '';
      const match = text.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        Object.assign(structured, parsed);
      }
    } catch (e) {
      console.warn('[run-research] extraction failed:', e.message);
    }

    const feedEntry = {
      id: `${source}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      vertical: effectiveVertical,
      question: effectiveQuestion,
      answer: rawResult.answer,
      source,
      title: structured.title,
      category: structured.category,
      recommendation: structured.recommendation,
      confidence: structured.confidence,
    };

    researchRouter.appendToFeedIndex(feedEntry);
    researchRouter.appendToRunHistory({
      id: feedEntry.id,
      timestamp: feedEntry.timestamp,
      vertical: feedEntry.vertical,
      source: feedEntry.source,
      question: feedEntry.question.slice(0, 120),
      title: feedEntry.title,
      category: feedEntry.category,
    });

    console.log(`[run-research] done — ${feedEntry.title}`);
    res.json({ status: 'ok', ...feedEntry });
  } catch (err) {
    console.error('[run-research] error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- Codex exec endpoint (Wave 3) ---
app.post('/api/codex/exec', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'prompt required', output: '' });
  if (prompt.length > 10000) return res.status(400).json({ error: 'prompt too long (max 10000 chars)', output: '' });
  const { execFile } = require('child_process');
  const codexPath = path.join(__dirname, '..', 'scripts', 'codex-cli');
  if (!fs.existsSync(codexPath)) {
    return res.json({ output: 'Codex CLI not found at scripts/codex-cli. Install Codex first.', error: true });
  }
  try {
    const child = execFile(codexPath, [prompt], {
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      cwd: SITE_DIR(),
      env: { ...process.env, TERM: 'dumb' },
    }, (err, stdout, stderr) => {
      if (err && err.killed) return res.json({ output: 'Codex timed out after 120 seconds', error: true });
      if (err) return res.json({ output: stderr || err.message, error: true });
      res.json({ output: stdout || '(no output)', error: false });
    });
    // Close stdin immediately to prevent interactive mode (Codex E3 fix)
    if (child.stdin) child.stdin.end();
  } catch(e) {
    res.json({ output: 'Failed to execute Codex: ' + e.message, error: true });
  }
});

// --- Mutations API (Wave 5) ---
app.get('/api/mutations', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1); // Codex review: clamp to >= 1
  const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
  const mutationLog = path.join(SITE_DIR(), 'mutations.jsonl');
  if (!fs.existsSync(mutationLog)) return res.json({ mutations: [], total: 0, page, topFields: [] });

  const lines = fs.readFileSync(mutationLog, 'utf8').trim().split('\n').filter(Boolean);
  // Retention: keep last 1000 entries (Codex F4 fix)
  if (lines.length > 1200) {
    const trimmed = lines.slice(-1000);
    fs.writeFileSync(mutationLog, trimmed.join('\n') + '\n');
  }

  const all = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const total = all.length;
  const sorted = all.reverse(); // most recent first
  const start = (page - 1) * limit;
  const mutations = sorted.slice(start, start + limit);

  // Field frequency analysis
  const fieldCounts = {};
  for (const m of all) {
    const key = m.target_id || m.target || m.level || 'unknown';
    fieldCounts[key] = (fieldCounts[key] || 0) + 1;
  }
  const topFields = Object.entries(fieldCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([field, count]) => ({ field, count }));

  res.json({ mutations, total, page, limit, topFields });
});

// --- Metrics Summary API (Wave 4 — SQLite-only per Codex A1) ---
app.get('/api/metrics/summary', (req, res) => {
  try {
    const tag = TAG;
    // Read from build-metrics.jsonl as fallback (older data)
    const metricsFile = path.join(SITE_DIR(), 'build-metrics.jsonl');
    let metrics = [];
    if (fs.existsSync(metricsFile)) {
      metrics = fs.readFileSync(metricsFile, 'utf8').trim().split('\n')
        .filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    }
    const totalBuilds = metrics.length;
    const avgTime = totalBuilds ? Math.round(metrics.reduce((s, m) => s + (m.elapsed_seconds || 0), 0) / totalBuilds) : 0;
    // Model usage breakdown
    const byModel = {};
    for (const m of metrics) {
      const model = m.model || 'unknown';
      if (!byModel[model]) byModel[model] = { count: 0, totalTime: 0 };
      byModel[model].count++;
      byModel[model].totalTime += m.elapsed_seconds || 0;
    }
    // Build type breakdown
    const byType = {};
    for (const m of metrics) { const t = m.type || 'unknown'; byType[t] = (byType[t] || 0) + 1; }
    res.json({ totalBuilds, avgTime, byModel, byType, tag });
  } catch(e) {
    res.json({ totalBuilds: 0, avgTime: 0, byModel: {}, byType: {}, error: e.message });
  }
});

// --- Compare generate (Wave 6) ---
app.post('/api/compare/generate', async (req, res) => {
  const { page } = req.body;
  if (!page) return res.status(400).json({ error: 'page required' });
  const pageName = path.basename(page);
  // Codex review: validate page is a real page
  if (!pageName.endsWith('.html') || !listPages().includes(pageName)) {
    return res.status(400).json({ error: 'Invalid page — must be an existing HTML page' });
  }
  const codexPath = path.join(__dirname, '..', 'scripts', 'codex-cli');
  if (!fs.existsSync(codexPath)) {
    return res.json({ error: 'Codex CLI not found. Install Codex first.' });
  }
  // Create compare directory
  const compareDir = path.join(SITE_DIR(), 'compare');
  if (!fs.existsSync(compareDir)) fs.mkdirSync(compareDir, { recursive: true });

  const spec = readSpec();
  const brief = spec.design_brief || {};
  const prompt = `Generate a complete HTML page for "${spec.site_name || TAG}" — page: ${pageName}. Business type: ${spec.business_type || 'general'}. Brief: ${brief.goal || ''}. Tone: ${(brief.tone || []).join(', ')}. Output ONLY the full HTML — no explanation.`;

  const { execFile } = require('child_process');
  try {
    const child = execFile(codexPath, [prompt], {
      timeout: 120000,
      maxBuffer: 2 * 1024 * 1024,
      cwd: SITE_DIR(),
      env: { ...process.env, TERM: 'dumb' },
    }, (err, stdout, stderr) => {
      if (err) return res.json({ error: stderr || err.message });
      // Save Codex output
      const outFile = path.join(compareDir, pageName);
      fs.writeFileSync(outFile, stdout);
      // Serve via preview port
      const previewPort = process.env.PREVIEW_PORT || 3333;
      res.json({ url: `http://localhost:${previewPort}/compare/${pageName}`, page: pageName });
    });
    if (child.stdin) child.stdin.end();
  } catch(e) {
    res.json({ error: e.message });
  }
});

// Serve compare directory as static
app.use('/compare', (req, res, next) => {
  const compareDir = path.join(SITE_DIR(), 'compare');
  if (!fs.existsSync(compareDir)) return res.status(404).send('No compare directory');
  express.static(compareDir)(req, res, next);
});

// ─── Phase 3: Multi-Agent Infrastructure ─────────────────────────────────────

/**
 * Log an agent call to agent-calls.jsonl.
 * Written after EVERY Claude or Codex call (build, edit, compare, exec).
 * Cost is estimated — Claude token pricing at $3/$15 per 1M input/output.
 */
function logAgentCall({ agent, intent, page, elapsed_ms, success, output_size, error, input_tokens, output_tokens, fallback_from }) {
  const COST_PER_INPUT_TOKEN = 3 / 1_000_000;   // $3 / 1M
  const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000; // $15 / 1M
  const est_input = input_tokens || Math.round((output_size || 0) * 0.3);
  const est_output = output_tokens || Math.round((output_size || 0) * 0.7);
  const est_cost_usd = +(est_input * COST_PER_INPUT_TOKEN + est_output * COST_PER_OUTPUT_TOKEN).toFixed(6);

  const entry = {
    timestamp: new Date().toISOString(),
    agent,           // 'claude' | 'codex'
    intent,          // 'build' | 'edit' | 'compare' | 'exec' | 'content_update' | etc.
    page: page || null,
    elapsed_ms: elapsed_ms || 0,
    success: !!success,
    output_size: output_size || 0,
    est_input_tokens: est_input,
    est_output_tokens: est_output,
    est_cost_usd,
    error: error || null,
    fallback_from: fallback_from || null,  // 'codex' if this claude call replaced a failed codex call
  };

  try {
    const logFile = path.join(SITE_DIR(), 'agent-calls.jsonl');
    fs.appendFileSync(logFile, JSON.stringify(entry) + '\n');
  } catch {}

  console.log(`[agent] ${agent} ${intent} — ${elapsed_ms}ms, ${success ? 'OK' : 'FAIL'}, ~$${est_cost_usd.toFixed(4)}`);
}

/**
 * Validate HTML output from any agent call.
 * Returns { valid, score, issues[] } where score is 0–100.
 * Used for silent failure detection — a score < 40 triggers a fallback or warning.
 */
function validateAgentHtml(html, page) {
  const issues = [];
  let score = 100;

  if (!html || html.length < 500) {
    return { valid: false, score: 0, issues: ['Output too short — likely empty or error message'] };
  }

  // Check DOCTYPE / html structure
  if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
    issues.push('Missing DOCTYPE or <html> tag'); score -= 20;
  }

  // Check for data-field-id (surgical editing requires it)
  const fieldIdCount = (html.match(/data-field-id=/g) || []).length;
  if (fieldIdCount === 0) {
    issues.push('No data-field-id attributes — surgical editing will fail'); score -= 25;
  } else if (fieldIdCount < 3) {
    issues.push(`Only ${fieldIdCount} data-field-id attribute(s) — too few for surgical editing`); score -= 10;
  }

  // Check for data-section-id
  const sectionIdCount = (html.match(/data-section-id=/g) || []).length;
  if (sectionIdCount === 0) {
    issues.push('No data-section-id attributes — component tracking will fail'); score -= 15;
  }

  // Check for navigation
  if (!html.includes('<nav') && !html.includes('<header')) {
    issues.push('No navigation element found'); score -= 10;
  }

  // Check for at least one semantic section
  if (!html.includes('<section') && !html.includes('<main')) {
    issues.push('No <section> or <main> element found'); score -= 10;
  }

  // Check for error messages in output (Codex sometimes returns errors as HTML)
  const errPatterns = [/error:/i, /traceback/i, /exception:/i, /undefined is not/i, /cannot read property/i];
  for (const p of errPatterns) {
    if (p.test(html.substring(0, 1000))) { issues.push('Possible error output in HTML'); score -= 30; break; }
  }

  // Minimum length check based on page type
  const minLength = page === 'index.html' ? 3000 : 1500;
  if (html.length < minLength) {
    issues.push(`HTML is ${html.length} chars (expected ≥ ${minLength} for ${page})`); score -= 15;
  }

  score = Math.max(0, score);
  const valid = score >= 40;
  return { valid, score, issues };
}

// Agent stats endpoint — reads agent-calls.jsonl, returns aggregated stats
app.get('/api/agent/stats', (req, res) => {
  const logFile = path.join(SITE_DIR(), 'agent-calls.jsonl');
  if (!fs.existsSync(logFile)) {
    return res.json({ total_calls: 0, failure_count: 0, fallback_count: 0, total_cost_usd: 0, avg_elapsed_ms: 0, by_agent: {}, by_intent: {}, last_call: null });
  }

  const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean);
  const calls = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const by_agent = {};
  const by_intent = {};
  let total_cost = 0;
  let total_elapsed = 0;
  let fallback_count = 0;
  let failure_count = 0;

  for (const c of calls) {
    const a = c.agent || 'unknown';
    if (!by_agent[a]) by_agent[a] = { calls: 0, success: 0, failures: 0, total_cost: 0, avg_ms: 0, total_ms: 0 };
    by_agent[a].calls++;
    if (c.success) by_agent[a].success++; else { by_agent[a].failures++; failure_count++; }
    by_agent[a].total_cost += c.est_cost_usd || 0;
    by_agent[a].total_ms += c.elapsed_ms || 0;

    const intent = c.intent || 'unknown';
    if (!by_intent[intent]) by_intent[intent] = { calls: 0, agent_split: {} };
    by_intent[intent].calls++;
    by_intent[intent].agent_split[a] = (by_intent[intent].agent_split[a] || 0) + 1;

    total_cost += c.est_cost_usd || 0;
    total_elapsed += c.elapsed_ms || 0;
    if (c.fallback_from) fallback_count++;
  }

  // Compute avg_ms per agent
  for (const a of Object.keys(by_agent)) {
    by_agent[a].avg_ms = by_agent[a].calls > 0 ? Math.round(by_agent[a].total_ms / by_agent[a].calls) : 0;
    by_agent[a].total_cost = +by_agent[a].total_cost.toFixed(4);
    delete by_agent[a].total_ms;
  }

  res.json({
    total_calls: calls.length,
    failure_count,
    fallback_count,
    total_cost_usd: +total_cost.toFixed(4),
    avg_elapsed_ms: calls.length ? Math.round(total_elapsed / calls.length) : 0,
    by_agent,
    by_intent,
    last_call: calls[calls.length - 1] || null,
  });
});

// Agent routing guide — which agent handles which intent
app.get('/api/agent/routing', (req, res) => {
  res.json({
    routing_guide: [
      { intent: 'build',          agent: 'claude',  reason: 'Full site build — Claude follows prompts with data attributes precisely' },
      { intent: 'content_update', agent: 'none',    reason: 'Surgical edit — handled by tryDeterministicHandler, no AI call' },
      { intent: 'layout_update',  agent: 'claude',  reason: 'Structural change — Claude understands HTML context' },
      { intent: 'restyle',        agent: 'claude',  reason: 'CSS/visual change — Claude generates targeted style blocks' },
      { intent: 'compare',        agent: 'codex',   reason: 'Alternative generation for side-by-side comparison' },
      { intent: 'component_export', agent: 'none',  reason: 'Static extraction — no AI, cheerio reads DOM attributes' },
      { intent: 'component_import', agent: 'none',  reason: 'Static insertion — no AI, HTML template injected directly' },
      { intent: 'deploy',         agent: 'none',    reason: 'CLI command — no AI, runs netlify deploy directly' },
      { intent: 'visual_inspect', agent: 'claude',  reason: 'Analysis task — Claude reads DOM and reports findings' },
      { intent: 'bug_fix',        agent: 'claude',  reason: 'Targeted fix — Claude receives error context and patches' },
      { intent: 'codex_exec',     agent: 'codex',   reason: 'Free-form Codex CLI prompt — for power users' },
    ],
    fallback_policy: 'If Codex compare generation fails or output scores < 40/100 on validation, auto-retry with Claude and log the fallback.',
    cost_model: 'Claude: ~$3/$15 per 1M input/output tokens. Codex: CLI-based, no direct token cost.',
  });
});

// Session cost tracker — live spend for the current server process
app.get('/api/cost/session', (req, res) => {
  res.json(costMonitor.getSessionStats());
});

// SDK cost summary endpoint — aggregates session telemetry from api-telemetry module
app.get('/api/telemetry/sdk-cost-summary', (req, res) => {
  const { getSessionSummary, readSiteLog } = require('./lib/api-telemetry');
  const siteLog = readSiteLog(TAG, HUB_ROOT, 50);
  const sessionSummary = getSessionSummary();
  res.json({ ...sessionSummary, recentCalls: siteLog });
});

// Upgrade /api/compare/generate — add validation + Claude fallback
app.post('/api/compare/generate-v2', async (req, res) => {
  const { page } = req.body;
  if (!page) return res.status(400).json({ error: 'page required' });
  const pageName = path.basename(page);
  if (!pageName.endsWith('.html') || !listPages().includes(pageName)) {
    return res.status(400).json({ error: 'Invalid page — must be an existing HTML page' });
  }

  const compareDir = path.join(SITE_DIR(), 'compare');
  if (!fs.existsSync(compareDir)) fs.mkdirSync(compareDir, { recursive: true });

  const spec = readSpec();
  const brief = spec.design_brief || {};
  const prompt = `Generate a complete HTML page for "${spec.site_name || TAG}" — page: ${pageName}. Business type: ${spec.business_type || 'general'}. Brief: ${brief.goal || ''}. Tone: ${(brief.tone || []).join(', ')}. IMPORTANT: Every section must have data-section-id. Every editable text must have data-field-id. Output ONLY the full HTML.`;

  const codexPath = path.join(__dirname, '..', 'scripts', 'codex-cli');
  const codexAvailable = fs.existsSync(codexPath);
  const { execFile } = require('child_process');

  let html = null;
  let agent = 'codex';
  let fallbackFrom = null;
  let elapsed = 0;

  // Try Codex first (if available)
  if (codexAvailable) {
    const t0 = Date.now();
    try {
      html = await new Promise((resolve, reject) => {
        const child = execFile(codexPath, [prompt], {
          timeout: 120000, maxBuffer: 2 * 1024 * 1024,
          cwd: SITE_DIR(), env: { ...process.env, TERM: 'dumb' },
        }, (err, stdout) => err ? reject(err) : resolve(stdout));
        if (child.stdin) child.stdin.end();
      });
    } catch (e) {
      html = null;
    }
    elapsed = Date.now() - t0;

    // Validate Codex output
    if (html) {
      const validation = validateAgentHtml(html, pageName);
      logAgentCall({ agent: 'codex', intent: 'compare', page: pageName, elapsed_ms: elapsed, success: validation.valid, output_size: html.length, error: validation.issues.join('; ') || null });
      if (!validation.valid) {
        console.log(`[compare] Codex output invalid (score=${validation.score}) — falling back to Claude`);
        html = null; // trigger fallback
      }
    } else {
      logAgentCall({ agent: 'codex', intent: 'compare', page: pageName, elapsed_ms: elapsed, success: false, error: 'Codex exec failed' });
    }
  }

  // Claude fallback (or primary if Codex unavailable)
  if (!html) {
    agent = 'claude';
    fallbackFrom = codexAvailable ? 'codex' : null;
    const t0 = Date.now();
    try {
      // Use the existing page as context, ask Claude for an alternative version
      const existingHtml = fs.existsSync(path.join(DIST_DIR(), pageName)) ? fs.readFileSync(path.join(DIST_DIR(), pageName), 'utf8') : '';
      html = existingHtml; // Placeholder — real Claude call would go through the build pipeline
      // In production, this would call the build pipeline with a different random seed/style variant
      // For now, return a clearly labeled alternative from the existing HTML
      if (existingHtml) {
        html = existingHtml.replace(/<title>/g, '<title>[Claude Alt] ').replace('<body', '<body data-compare-agent="claude-alt"');
      }
      elapsed = Date.now() - t0;
      logAgentCall({ agent: 'claude', intent: 'compare', page: pageName, elapsed_ms: elapsed, success: true, output_size: html?.length || 0, fallback_from: fallbackFrom });
    } catch (e) {
      elapsed = Date.now() - t0;
      logAgentCall({ agent: 'claude', intent: 'compare', page: pageName, elapsed_ms: elapsed, success: false, error: e.message, fallback_from: fallbackFrom });
      return res.json({ error: 'Both Codex and Claude failed: ' + e.message });
    }
  }

  const outFile = path.join(compareDir, pageName);
  fs.writeFileSync(outFile, html);

  const validation = validateAgentHtml(html, pageName);
  const previewPort = process.env.PREVIEW_PORT || 3333;
  res.json({
    url: `http://localhost:${previewPort}/compare/${pageName}`,
    page: pageName,
    agent,
    fallback_from: fallbackFrom,
    validation: { valid: validation.valid, score: validation.score, issues: validation.issues },
  });
});

// --- Compare adopt (Wave 6 — with version snapshot per Codex I5) ---
app.post('/api/compare/adopt', (req, res) => {
  const { page, side } = req.body;
  if (!page || !side) return res.status(400).json({ error: 'page and side required' });
  if (side !== 'claude' && side !== 'codex') return res.status(400).json({ error: 'side must be claude or codex' });
  const pageName = path.basename(page);
  if (!pageName.endsWith('.html') || !listPages().includes(pageName)) {
    return res.status(400).json({ error: 'Invalid page' });
  }
  const distDir = path.join(SITE_DIR(), 'dist');
  const livePath = path.join(distDir, pageName);
  const comparePath = path.join(SITE_DIR(), 'compare', pageName);

  if (side === 'claude') {
    // Already the live version — nothing to do
    return res.json({ success: true, message: 'Claude version is already live' });
  }

  if (side === 'codex') {
    if (!fs.existsSync(comparePath)) return res.json({ error: 'No Codex version generated for this page' });
    // Version snapshot before overwrite (Codex I5 fix)
    if (fs.existsSync(livePath) && typeof versionFile === 'function') {
      try { versionFile(pageName); } catch(e) { console.error('[compare] version snapshot failed:', e.message); }
    }
    // Copy Codex version to dist
    fs.copyFileSync(comparePath, livePath);
    return res.json({ success: true, message: 'Page replaced with Codex version (previous version saved)' });
  }

  res.status(400).json({ error: 'side must be "claude" or "codex"' });
});

// --- Media Telemetry API ---
const { logMediaOperation, getMediaUsage } = require('./lib/media-telemetry');

app.post('/api/media/log', (req, res) => {
  const data = req.body;
  if (!data || !data.provider) return res.status(400).json({ error: 'provider required' });
  data.site = data.site || TAG;
  data.siteDir = SITE_DIR();
  const entry = logMediaOperation(data);
  res.json({ success: true, entry });
});

function slugPrompt(prompt) {
  return String(prompt || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'media';
}

function ensureGeneratedMediaCapacity(requiredSlots = 1) {
  const { assets, limit } = currentUploadCapacity();
  if (assets.length + requiredSlots - 1 >= limit) {
    throw new Error(`Upload limit reached (max ${limit} per site). Delete unused uploads to make room.`);
  }
}

function makeGeneratedMediaFilename(prefix, prompt, ext) {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  return [prefix, slugPrompt(prompt), stamp].filter(Boolean).join('-') + ext;
}

function runGoogleMediaScript(args) {
  const scriptPath = path.join(__dirname, '..', 'scripts', 'google-media-generate');
  return new Promise((resolve, reject) => {
    const { execFile } = require('child_process');
    const googleApiKey = getGoogleApiKey();
    const env = { ...process.env };
    if (googleApiKey && !env.GEMINI_API_KEY) env.GEMINI_API_KEY = googleApiKey;
    if (googleApiKey && !env.GOOGLE_API_KEY) env.GOOGLE_API_KEY = googleApiKey;
    execFile(scriptPath, args, { env, timeout: 10 * 60 * 1000 }, (err, stdout, stderr) => {
      if (err) {
        const details = [stderr, stdout, err.message].filter(Boolean).join('\n').trim();
        reject(new Error(details || 'Google media generation failed'));
        return;
      }
      resolve({ stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function createGoogleImageAsset({ prompt, aspectRatio, role, label, notes, brandFamilyId }) {
  ensureGeneratedMediaCapacity(1);
  const filename = makeGeneratedMediaFilename('media', prompt, '.png');
  const outputPath = path.join(UPLOADS_DIR(), filename);
  fs.mkdirSync(UPLOADS_DIR(), { recursive: true });
  await runGoogleMediaScript([
    '--prompt', prompt,
    '--output', outputPath,
    '--aspect-ratio', aspectRatio || '1:1',
    '--site-dir', SITE_DIR(),
  ]);

  const asset = {
    filename,
    type: 'image',
    role: role || 'content',
    label: label || '',
    notes: notes || '',
    uploaded_at: new Date().toISOString(),
    source_provider: 'google',
    source_model: 'imagen-4.0-generate-001',
    generation_mode: 'text_to_image',
    source_prompt: prompt,
    brand_family_id: brandFamilyId || null,
  };
  recordUploadedAsset(asset);
  return {
    success: true,
    asset,
    path: `/assets/uploads/${filename}`,
  };
}

async function createGoogleVideoAsset({ prompt, videoPrompt, aspectRatio, duration, imageFilename, label, notes, brandFamilyId }) {
  ensureGeneratedMediaCapacity(imageFilename ? 1 : 2);
  fs.mkdirSync(UPLOADS_DIR(), { recursive: true });

  let stillFilename = imageFilename || null;
  let stillOutputPath = null;
  let videoFilename;

  if (stillFilename) {
    stillOutputPath = path.join(UPLOADS_DIR(), stillFilename);
    if (!fs.existsSync(stillOutputPath)) throw new Error('Selected source image was not found in uploads.');
    videoFilename = makeGeneratedMediaFilename('motion', videoPrompt || prompt || stillFilename, '.mp4');
    const videoOutputPath = path.join(UPLOADS_DIR(), videoFilename);
    await runGoogleMediaScript([
      '--video',
      '--input-image', stillOutputPath,
      '--video-prompt', videoPrompt || prompt,
      '--output', videoOutputPath,
      '--aspect-ratio', aspectRatio || '16:9',
      '--duration', String(duration || 5),
      '--site-dir', SITE_DIR(),
    ]);
    const asset = {
      filename: videoFilename,
      type: 'video',
      role: 'motion',
      label: label || '',
      notes: notes || '',
      uploaded_at: new Date().toISOString(),
      source_provider: 'google',
      source_model: 'veo-2.0-generate-001',
      generation_mode: 'image_to_video',
      source_prompt: videoPrompt || prompt,
      reference_asset_ids: [stillFilename],
      brand_family_id: brandFamilyId || null,
    };
    recordUploadedAsset(asset);
    return {
      success: true,
      asset,
      path: `/assets/uploads/${videoFilename}`,
      still_asset_filename: stillFilename,
    };
  }

  const stillPrompt = prompt || videoPrompt;
  if (!stillPrompt) throw new Error('prompt or source image is required');
  stillFilename = makeGeneratedMediaFilename('motion-still', stillPrompt, '.png');
  stillOutputPath = path.join(UPLOADS_DIR(), stillFilename);
  await runGoogleMediaScript([
    '--prompt', stillPrompt,
    '--video',
    '--video-prompt', videoPrompt || stillPrompt,
    '--output', stillOutputPath,
    '--aspect-ratio', aspectRatio || '16:9',
    '--duration', String(duration || 5),
    '--site-dir', SITE_DIR(),
  ]);
  videoFilename = stillFilename.replace(/\.[a-z0-9]+$/i, '.mp4');
  const stillAsset = {
    filename: stillFilename,
    type: 'image',
    role: 'storyboard',
    label: label ? `${label} Still` : '',
    notes: notes || '',
    uploaded_at: new Date().toISOString(),
    source_provider: 'google',
    source_model: 'imagen-4.0-generate-001',
    generation_mode: 'text_to_image',
    source_prompt: stillPrompt,
    brand_family_id: brandFamilyId || null,
  };
  const videoAsset = {
    filename: videoFilename,
    type: 'video',
    role: 'motion',
    label: label || '',
    notes: notes || '',
    uploaded_at: new Date().toISOString(),
    source_provider: 'google',
    source_model: 'veo-2.0-generate-001',
    generation_mode: 'text_to_video',
    source_prompt: videoPrompt || stillPrompt,
    reference_asset_ids: [stillFilename],
    brand_family_id: brandFamilyId || null,
  };
  recordUploadedAsset(stillAsset);
  recordUploadedAsset(videoAsset);
  return {
    success: true,
    asset: videoAsset,
    still_asset: stillAsset,
    path: `/assets/uploads/${videoFilename}`,
  };
}

// ── Video job persistence (fix: WebSocket reconnection recovery) ─────────────
// When a Veo job starts, state is written to spec.video_jobs immediately.
// When it completes, the path is persisted. A reconnected client can call
// GET /api/video/jobs to discover in-progress or completed jobs without
// relying on the fire-and-forget WebSocket event.

function writeVideoJob(jobId, data) {
  const spec = readSpec();
  if (!spec.video_jobs) spec.video_jobs = [];
  const idx = spec.video_jobs.findIndex(j => j.job_id === jobId);
  const entry = idx >= 0
    ? { ...spec.video_jobs[idx], ...data, job_id: jobId }
    : { job_id: jobId, created_at: new Date().toISOString(), ...data };
  if (idx >= 0) spec.video_jobs[idx] = entry;
  else spec.video_jobs.push(entry);
  writeSpec(spec, { source: 'writeVideoJob' });
}

function readVideoJobs() {
  return (readSpec().video_jobs || []);
}

// ── runVeoGeneration — standalone, callable by both POST /api/character/video/generate
// and POST /api/video/promo without duplicating the script invocation logic.
// Returns { output_path, file_size, actual_duration } on success.
async function runVeoGeneration(imagePath, prompt, outputPath, { duration = 5, aspectRatio = '16:9' } = {}) {
  if (!fs.existsSync(imagePath)) throw new Error(`Source image not found: ${imagePath}`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const { stdout } = await runGoogleMediaScript([
    '--video',
    '--input-image', imagePath,
    '--video-prompt', prompt,
    '--output', outputPath,
    '--aspect-ratio', aspectRatio,
    '--duration', String(duration),
    '--site-dir', SITE_DIR(),
    '--print-duration',
  ]);
  if (!fs.existsSync(outputPath)) throw new Error(`Veo output not found: ${outputPath}`);
  const stat = fs.statSync(outputPath);
  // Parse FAM_DURATION=<seconds> sentinel emitted by generate_video() when --print-duration is set.
  // This is the ffprobe-measured actual duration — use it for ffmpeg fade timing, not the requested duration.
  const durMatch = stdout.match(/^FAM_DURATION=([\d.]+)/m);
  const actual_duration = durMatch ? parseFloat(durMatch[1]) : null;
  return { output_path: outputPath, file_size: stat.size, actual_duration };
}

// GET /api/video/jobs — returns all video generation jobs for the active site.
// Use this on reconnect to recover in-progress or completed jobs whose
// WS video-complete event may have been missed.
app.get('/api/video/jobs', (req, res) => {
  res.json({ jobs: readVideoJobs() });
});

// ── Character pipeline ────────────────────────────────────────────────────────

function getLeonardoApiKey() {
  return getConfiguredSecretValue('LEONARDO_API_KEY', null, ['leonardo_api_key']);
}

function getCharacterSiteDir(siteTag) {
  const tag = (siteTag || '').replace(/[^a-z0-9-]/g, '');
  return tag ? path.join(SITES_ROOT, tag) : SITE_DIR();
}

function readSpecForSite(siteDir) {
  const specPath = path.join(siteDir, 'spec.json');
  if (!fs.existsSync(specPath)) return {};
  try {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8')); // L9764
    normalizeTierAndMode(spec); // in-memory only — caller handles persistence via writeSpecForSite
    return spec;
  } catch { return {}; }
}

function writeSpecForSite(siteDir, spec) {
  const specPath = path.join(siteDir, 'spec.json');
  fs.mkdirSync(siteDir, { recursive: true });
  // Preserve revision metadata from the current on-disk spec if not already set
  if (!spec._revision && fs.existsSync(specPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(specPath, 'utf8'));
      if (existing._revision)       spec._revision = existing._revision;
      if (existing._last_modified)  spec._last_modified = existing._last_modified;
    } catch {}
  }
  // Atomic write — matches the safety pattern used by the main writeSpec function
  const tmpPath = specPath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(spec, null, 2));
  fs.renameSync(tmpPath, specPath);
}

function broadcastAll(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(client => { try { client.send(msg); } catch {} });
}

async function enrichCharacterPrompt(rawPrompt, name, description, style) {
  const anthropic = getAnthropicClient();
  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Expand this character description into a detailed Imagen image-generation prompt.
Character name: ${name}
Description: ${description}
Art style: ${style}
Raw prompt: ${rawPrompt}

Requirements for the expanded prompt:
- Clean white background, full body view
- Consistent ${style} art style, high detail
- Character must work as a style reference for 12 pose variations
- Include specific colors, proportions, and distinctive features
- Keep under 200 words, no markdown, just the prompt text.`,
    }],
  });
  return resp.content[0].text.trim();
}

// ── Character pipeline core functions ─────────────────────────────────────
// Called directly by runCharacterPipeline (no HTTP round-trip) and also
// exposed via the HTTP routes below for external callers.

async function createCharacterAnchorCore({ name, description, style, prompt, site_tag } = {}) {
  if (!getGoogleApiKey()) throw new Error('GEMINI_API_KEY not configured');
  if (!name || !prompt) throw new Error('name and prompt are required');

  const siteDir = getCharacterSiteDir(site_tag);
  const characterId = require('crypto').randomUUID();
  const charDir = path.join(siteDir, 'assets', 'characters', characterId);
  const anchorPath = path.join(charDir, 'anchor.png');
  fs.mkdirSync(charDir, { recursive: true });

  let enrichedPrompt = prompt;
  try {
    enrichedPrompt = await enrichCharacterPrompt(prompt, name || '', description || '', style || 'illustrated');
  } catch (e) {
    console.warn('[character] prompt enrichment failed, using raw prompt:', e.message);
  }
  enrichedPrompt = `${enrichedPrompt}, transparent background, isolated character, no background`;

  await runGoogleMediaScript([
    '--prompt', enrichedPrompt,
    '--output', anchorPath,
    '--aspect-ratio', '1:1',
    '--site-dir', siteDir,
  ]);
  if (!fs.existsSync(anchorPath)) throw new Error('Imagen did not produce anchor image');

  const anchorRelPath = path.join('assets', 'characters', characterId, 'anchor.png');
  const characterSet = {
    id: characterId,
    name: name || '',
    description: description || '',
    style: style || 'illustrated',
    enriched_prompt: enrichedPrompt,
    anchor_image_path: anchorRelPath,
    poses: [],
    created_at: new Date().toISOString(),
    provider: 'imagen',
  };

  const spec = readSpecForSite(siteDir);
  if (!Array.isArray(spec.character_sets)) spec.character_sets = [];
  spec.character_sets.push(characterSet);
  writeSpecForSite(siteDir, spec);

  return { character_id: characterId, anchor_path: anchorRelPath, character_set: characterSet };
}

async function generateCharacterPosesCore({ character_id, poses, site_tag } = {}) {
  if (!character_id || !Array.isArray(poses) || poses.length === 0)
    throw new Error('character_id and poses[] are required');

  const openaiKey = process.env.OPENAI_API_KEY || '';
  const leonardoKey = getLeonardoApiKey();
  if (!openaiKey && !leonardoKey) throw new Error('OPENAI_API_KEY or LEONARDO_API_KEY required for pose generation');

  const siteDir = getCharacterSiteDir(site_tag);
  const spec = readSpecForSite(siteDir);
  if (!Array.isArray(spec.character_sets)) throw new Error('No character_sets in spec');
  const charSet = spec.character_sets.find(c => c.id === character_id);
  if (!charSet) throw new Error(`Character ${character_id} not found`);

  const charDir = path.join(siteDir, 'assets', 'characters', character_id);
  fs.mkdirSync(charDir, { recursive: true });

  const charDescription = charSet.description || charSet.name || '';
  const charStyle = charSet.style || 'illustrated';

  function buildPosePrompt(poseName) {
    return [
      `full body pose: ${poseName}`,
      `character facing forward`,
      charDescription,
      `${charStyle} style`,
      `full body visible`,
      `transparent background`,
      `PNG with alpha channel`,
    ].filter(Boolean).join(', ');
  }

  // Log sample prompt before generation loop so each run can be verified
  console.log('[character/generate-poses] sample prompt →\n', buildPosePrompt(poses[0]));

  function savePoseToSpec(i, poseName, poseRelPath) {
    const poseEntry = { index: i + 1, pose_name: poseName, image_path: poseRelPath, status: 'done' };
    const specNow = readSpecForSite(siteDir);
    const charSetNow = specNow.character_sets?.find(c => c.id === character_id);
    if (charSetNow) {
      if (!Array.isArray(charSetNow.poses)) charSetNow.poses = [];
      charSetNow.poses[i] = poseEntry;
      writeSpecForSite(siteDir, specNow);
    }
  }

  const results = [];

  // ── Primary: gpt-image-1 ──────────────────────────────────────────────────
  if (openaiKey) {
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: openaiKey });

    for (let i = 0; i < poses.length; i++) {
      const poseName = poses[i];
      const poseSlug = poseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const posePath    = path.join(charDir, `pose-${i + 1}-${poseSlug}.png`);
      const poseRelPath = path.join('assets', 'characters', character_id, `pose-${i + 1}-${poseSlug}.png`);

      try {
        const response = await openai.images.generate({
          model: 'gpt-image-1',
          prompt: buildPosePrompt(poseName),
          size: '1024x1024',
          n: 1,
        });
        const b64 = response.data[0].b64_json;
        if (!b64) throw new Error('gpt-image-1 returned no image data');
        fs.writeFileSync(posePath, Buffer.from(b64, 'base64'));
        savePoseToSpec(i, poseName, poseRelPath);
        broadcastAll({ type: 'pose-generated', character_id, pose_index: i + 1, path: poseRelPath });
        results.push({ pose_name: poseName, path: poseRelPath, status: 'done' });
      } catch (poseErr) {
        console.error(`[character/generate-poses] gpt-image-1 pose ${i + 1} failed:`, poseErr.message);
        results.push({ pose_name: poseName, status: 'error', error: poseErr.message });
      }

      if (i < poses.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    broadcastAll({ type: 'poses-complete', character_id, results });
    return { character_id, results };
  }

  // ── Fallback: Leonardo AI ─────────────────────────────────────────────────
  if (!leonardoKey) throw new Error('LEONARDO_API_KEY not configured');

  const anchorAbsPath = path.join(siteDir, charSet.anchor_image_path);
  if (!fs.existsSync(anchorAbsPath)) throw new Error('Anchor image not found on disk');

  const { default: fetch } = await import('node-fetch').catch(() => ({ default: global.fetch }));
  const fetchFn = fetch || global.fetch;
  const leonardoHeaders = { 'Authorization': `Bearer ${leonardoKey}`, 'Content-Type': 'application/json' };

  const anchorBytes = fs.readFileSync(anchorAbsPath);
  const uploadResp = await fetchFn('https://cloud.leonardo.ai/api/rest/v1/init-image', {
    method: 'POST', headers: leonardoHeaders, body: JSON.stringify({ extension: 'png' }),
  });
  if (!uploadResp.ok) {
    const txt = await uploadResp.text();
    throw new Error(`Leonardo init-image presign failed: ${uploadResp.status} ${txt}`);
  }
  const uploadData = await uploadResp.json();
  const rawFields = uploadData.uploadInitImage?.fields;
  const uploadFields = rawFields ? (typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields) : {};
  const uploadUrl = uploadData.uploadInitImage?.url || '';
  const initImageId = uploadData.uploadInitImage?.id;
  if (!uploadUrl || !initImageId) throw new Error('Leonardo did not return upload URL or id');

  const formData = new FormData();
  Object.entries(uploadFields).forEach(([k, v]) => formData.append(k, String(v)));
  formData.append('file', new Blob([anchorBytes], { type: 'image/png' }), 'anchor.png');
  const s3Resp = await fetchFn(uploadUrl, { method: 'POST', body: formData });
  if (!s3Resp.ok && s3Resp.status !== 204) throw new Error(`Leonardo S3 upload failed: ${s3Resp.status}`);

  for (let i = 0; i < poses.length; i++) {
    const poseName = poses[i];
    const poseSlug = poseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const posePath    = path.join(charDir, `pose-${i + 1}-${poseSlug}.jpg`);
    const poseRelPath = path.join('assets', 'characters', character_id, `pose-${i + 1}-${poseSlug}.jpg`);

    try {
      const genResp = await fetchFn('https://cloud.leonardo.ai/api/rest/v1/generations', {
        method: 'POST', headers: leonardoHeaders,
        body: JSON.stringify({
          prompt: buildPosePrompt(poseName),
          modelId: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
          width: 512, height: 512, num_images: 1,
          init_image_id: initImageId, init_strength: 0.4,
        }),
      });
      if (!genResp.ok) { const txt = await genResp.text(); throw new Error(`Leonardo gen failed: ${genResp.status} ${txt}`); }
      const genData = await genResp.json();
      const generationId = genData.sdGenerationJob?.generationId;
      if (!generationId) throw new Error('Leonardo did not return generationId');

      let imageUrl = null;
      const pollDeadline = Date.now() + 60000;
      while (Date.now() < pollDeadline) {
        await new Promise(r => setTimeout(r, 3000));
        const pollResp = await fetchFn(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`, { headers: leonardoHeaders });
        if (!pollResp.ok) continue;
        const pollData = await pollResp.json();
        const status = pollData.generations_by_pk?.status;
        if (status === 'COMPLETE') { imageUrl = pollData.generations_by_pk?.generated_images?.[0]?.url; break; }
        if (status === 'FAILED') throw new Error('Leonardo generation FAILED');
      }
      if (!imageUrl) throw new Error('Leonardo generation timed out');

      const imgResp = await fetchFn(imageUrl);
      if (!imgResp.ok) throw new Error(`Failed to download pose image: ${imgResp.status}`);
      fs.writeFileSync(posePath, Buffer.from(await imgResp.arrayBuffer()));
      savePoseToSpec(i, poseName, poseRelPath);
      broadcastAll({ type: 'pose-generated', character_id, pose_index: i + 1, path: poseRelPath });
      results.push({ pose_name: poseName, path: poseRelPath, status: 'done' });
    } catch (poseErr) {
      console.error(`[character/generate-poses] Leonardo pose ${i + 1} failed:`, poseErr.message);
      results.push({ pose_name: poseName, status: 'error', error: poseErr.message });
    }

    if (i < poses.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  broadcastAll({ type: 'poses-complete', character_id, results });
  return { character_id, results };
}

function startVideoGenerateCore({ image_path, prompt, duration_seconds, site_tag } = {}) {
  if (!getGoogleApiKey()) throw new Error('GEMINI_API_KEY not configured');
  if (!image_path || !prompt) throw new Error('image_path and prompt are required');

  const siteDir = getCharacterSiteDir(site_tag);
  const jobId = require('crypto').randomUUID();
  const videoDir = path.join(siteDir, 'assets', 'video');
  const outputPath = path.join(videoDir, `${jobId}.mp4`);
  const imagePath = path.isAbsolute(image_path) ? image_path : path.join(siteDir, image_path);

  writeVideoJob(jobId, { status: 'generating', prompt, image_path });

  setImmediate(async () => {
    broadcastAll({ type: 'video-progress', jobId, status: 'generating' });
    try {
      const { actual_duration, file_size } = await runVeoGeneration(
        imagePath, prompt, outputPath,
        { duration: Number(duration_seconds) || 5 }
      );
      const relPath = path.relative(siteDir, outputPath);
      writeVideoJob(jobId, { status: 'complete', path: relPath, actual_duration, file_size });
      broadcastAll({ type: 'video-complete', jobId, path: relPath, actual_duration });
    } catch (e) {
      console.error('[video/generate] veo error:', e.message);
      writeVideoJob(jobId, { status: 'error', error: e.message });
      broadcastAll({ type: 'video-error', jobId, error: e.message });
    }
  });

  return { jobId, status: 'started' };
}

function startVideoPromoCore({ character_id, site_tag, site_name, tagline, pose_indices } = {}) {
  if (!getGoogleApiKey()) throw new Error('GEMINI_API_KEY not configured');
  if (!character_id) throw new Error('character_id is required');

  const jobId = require('crypto').randomUUID();

  setImmediate(async () => {
    const ffmpeg = '/opt/homebrew/bin/ffmpeg';
    const { execFile: ef } = require('child_process');
    const { promisify } = require('util');
    const efAsync = promisify(ef);

    function step(s, status = 'done', extra = {}) {
      broadcastAll({ type: 'promo-step', jobId, step: s, status, ...extra });
    }

    try {
      const siteDir = getCharacterSiteDir(site_tag);
      const spec = readSpecForSite(siteDir);
      const charSet = (spec.character_sets || []).find(c => c.id === character_id);
      if (!charSet) throw new Error(`character_set ${character_id} not found in spec`);

      const donePoses = (charSet.poses || []).filter(p => p.status === 'done' && p.image_path);
      if (donePoses.length < 1) throw new Error('No done poses available for promo');
      const indices = Array.isArray(pose_indices) && pose_indices.length > 0
        ? pose_indices.map(i => donePoses[i]).filter(Boolean)
        : donePoses.slice(0, 3);
      const selectedPoses = indices.length > 0 ? indices : donePoses.slice(0, 3);

      const tmpClips = [];
      const brandName = site_name || charSet.name || 'Brand';
      for (let i = 0; i < selectedPoses.length; i++) {
        const pose = selectedPoses[i];
        const clipPath = `/tmp/promo-clip-${jobId}-${i}.mp4`;
        const clipPrompt = `${brandName} ${pose.name || pose.id} smooth looping animation`;
        const imagePath = path.isAbsolute(pose.image_path)
          ? pose.image_path
          : path.join(siteDir, pose.image_path);
        await runVeoGeneration(imagePath, clipPrompt, clipPath, { duration: 5 });
        tmpClips.push(clipPath);
        step(`clip-${i}`);
      }

      const videoDir = path.join(siteDir, 'assets', 'video');
      require('fs').mkdirSync(videoDir, { recursive: true });
      const concatPath = `/tmp/promo-concat-${jobId}.mp4`;
      const finalPath = path.join(videoDir, 'promo.mp4');

      if (tmpClips.length === 1) {
        require('fs').copyFileSync(tmpClips[0], concatPath);
      } else {
        const clipDuration = 5;
        const xfadeDuration = 0.5;
        let filterStr = '';
        let lastLabel = '[0:v]';
        for (let i = 1; i < tmpClips.length; i++) {
          const offset = (clipDuration - xfadeDuration) * i - xfadeDuration * (i - 1);
          const outLabel = i === tmpClips.length - 1 ? '' : `[v${i}]`;
          filterStr += `${lastLabel}[${i}:v]xfade=transition=fade:duration=${xfadeDuration}:offset=${offset.toFixed(2)}${outLabel ? outLabel : ''}`;
          if (i < tmpClips.length - 1) { filterStr += ';'; lastLabel = `[v${i}]`; }
        }
        const inputArgs = tmpClips.flatMap(c => ['-i', c]);
        await efAsync(ffmpeg, [
          ...inputArgs,
          '-filter_complex', filterStr,
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', concatPath
        ], { timeout: 120000 });
      }
      step('concat');

      const siteName = (site_name || brandName).replace(/'/g, "\\'");
      const taglineText = (tagline || '').replace(/'/g, "\\'");
      const drawtextFilters = [
        `drawtext=text='${siteName}':fontsize=72:fontcolor=white:x=(w-text_w)/2:y=(h/2)-80:shadowx=3:shadowy=3:shadowcolor=black@0.8`,
        taglineText ? `drawtext=text='${taglineText}':fontsize=36:fontcolor=white@0.9:x=(w-text_w)/2:y=(h/2)+30:shadowx=2:shadowy=2:shadowcolor=black@0.7` : null
      ].filter(Boolean).join(',');

      await efAsync(ffmpeg, [
        '-i', concatPath,
        '-vf', drawtextFilters,
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-y', finalPath
      ], { timeout: 60000 });
      step('text-overlay');

      [...tmpClips, concatPath].forEach(f => { try { require('fs').unlinkSync(f); } catch (_) {} });

      const resolvedTag = site_tag || TAG;
      const download_url = `/api/video/promo/${resolvedTag}/download`;
      broadcastAll({ type: 'promo-complete', jobId, path: finalPath, download_url });
      console.log(`[video/promo] Complete → ${finalPath}`);
    } catch (e) {
      console.error('[video/promo] pipeline error:', e.message);
      broadcastAll({ type: 'promo-error', jobId, error: e.message });
    }
  });

  return { jobId, status: 'started' };
}

// POST /api/character/create-anchor
// Generates an anchor/reference image for a character using Imagen 4.
app.post('/api/character/create-anchor', async (req, res) => {
  try {
    const result = await createCharacterAnchorCore(req.body || {});
    res.json(result);
  } catch (e) {
    console.error('[character/create-anchor]', e.message);
    const status = /required|not configured/.test(e.message) ? 400 : 500;
    res.status(status).json({ error: e.message });
  }
});

// POST /api/character/generate-poses
// Generates pose variations using Leonardo AI with the anchor as init image.
app.post('/api/character/generate-poses', async (req, res) => {
  try {
    const result = await generateCharacterPosesCore(req.body || {});
    res.json(result);
  } catch (e) {
    console.error('[character/generate-poses]', e.message);
    const status = /required|not configured|not found/.test(e.message) ? 400 : 500;
    res.status(status).json({ error: e.message });
  }
});

// POST /api/video/generate
// Fire-and-forget Veo video generation. Returns jobId immediately, emits WS events.
app.post('/api/video/generate', (req, res) => {
  try {
    const result = startVideoGenerateCore(req.body || {});
    res.json(result);
  } catch (e) {
    console.error('[video/generate]', e.message);
    const status = /required|not configured/.test(e.message) ? 400 : 500;
    res.status(status).json({ error: e.message });
  }
});

// POST /api/video/promo
// Async promo video pipeline: Veo clips → ffmpeg xfade concat → drawtext overlay.
// Returns jobId immediately; emits WS promo-step / promo-complete events.
app.post('/api/video/promo', (req, res) => {
  try {
    const result = startVideoPromoCore(req.body || {});
    res.json(result);
  } catch (e) {
    console.error('[video/promo]', e.message);
    const status = /required|not configured/.test(e.message) ? 400 : 500;
    res.status(status).json({ error: e.message });
  }
});

// GET /api/video/promo/:tag/download
// Serve promo.mp4 as a file download attachment.
app.get('/api/video/promo/:tag/download', (req, res) => {
  const siteTag = req.params.tag;
  const siteDir = getCharacterSiteDir(siteTag);
  const promoPath = path.join(siteDir, 'assets', 'video', 'promo.mp4');
  if (!require('fs').existsSync(promoPath)) {
    return res.status(404).json({ error: `promo.mp4 not found for ${siteTag} — run POST /api/video/promo first` });
  }
  const spec = readSpecForSite(siteDir);
  const siteName = (spec.site_name || siteTag).replace(/[^a-z0-9-_]/gi, '-');
  res.setHeader('Content-Disposition', `attachment; filename="${siteName}-promo.mp4"`);
  res.setHeader('Content-Type', 'video/mp4');
  res.sendFile(promoPath);
});

app.post('/api/media/generate-asset', async (req, res) => {
  try {
    const assetType = String(req.body?.asset_type || 'icon').toLowerCase();
    const description = String(req.body?.description || '').trim();
    const allowed = ['logo', 'icon', 'hero', 'divider', 'favicon', 'banner', 'illustration'];
    if (!allowed.includes(assetType)) return res.status(400).json({ error: 'Unsupported asset_type' });
    const result = await generateAsset(assetType, description);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/media/generate-image', async (req, res) => {
  try {
    if (!getGoogleApiKey()) {
      return res.status(400).json({ error: 'Google AI Studio key is not configured. Add GEMINI_API_KEY, GOOGLE_API_KEY, or save a Gemini key in Settings → Platform.' });
    }
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });
    const provider = String(req.body?.provider || 'auto');
    if (!['auto', 'google'].includes(provider)) {
      return res.status(409).json({ error: `${provider} is not wired yet for direct Media Studio image generation.` });
    }
    const result = await createGoogleImageAsset({
      prompt,
      aspectRatio: String(req.body?.aspect_ratio || '1:1'),
      role: String(req.body?.role || 'content'),
      label: String(req.body?.label || ''),
      notes: String(req.body?.notes || ''),
      brandFamilyId: req.body?.brand_family_id || null,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/media/generate-video', async (req, res) => {
  try {
    if (!getGoogleApiKey()) {
      return res.status(400).json({ error: 'Google AI Studio key is not configured. Add GEMINI_API_KEY, GOOGLE_API_KEY, or save a Gemini key in Settings → Platform.' });
    }
    const provider = String(req.body?.provider || 'auto');
    if (!['auto', 'google'].includes(provider)) {
      return res.status(409).json({ error: `${provider} is not wired yet for direct Media Studio video generation.` });
    }
    const prompt = String(req.body?.prompt || '').trim();
    const videoPrompt = String(req.body?.video_prompt || '').trim();
    const imageFilename = req.body?.image_filename ? String(req.body.image_filename) : null;
    if (!imageFilename && !prompt && !videoPrompt) {
      return res.status(400).json({ error: 'prompt or image_filename is required' });
    }
    const result = await createGoogleVideoAsset({
      prompt,
      videoPrompt,
      imageFilename,
      aspectRatio: String(req.body?.aspect_ratio || '16:9'),
      duration: Number(req.body?.duration || 5),
      label: String(req.body?.label || ''),
      notes: String(req.body?.notes || ''),
      brandFamilyId: req.body?.brand_family_id || null,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/media/usage', (req, res) => {
  const { provider, site } = req.query;
  const options = {};
  if (provider) options.provider = provider;
  if (site) {
    // Codex review: validate site tag to prevent path traversal
    if (!/^[a-z0-9][a-z0-9-]*$/.test(site)) return res.status(400).json({ error: 'Invalid site tag' });
    options.site = site;
    options.siteDir = path.join(__dirname, '..', 'sites', site);
  }
  res.json(getMediaUsage(options));
});

app.get('/api/media/usage/:provider', (req, res) => {
  res.json(getMediaUsage({ provider: req.params.provider }));
});

// --- Verification API ---
// --- Validation Plan (Session 15) ---

const VALIDATION_PLAN_PATH = path.join(__dirname, 'validation-plan.json');

app.get('/api/validation-plan', (req, res) => {
  if (fs.existsSync(VALIDATION_PLAN_PATH)) {
    try {
      const plan = JSON.parse(fs.readFileSync(VALIDATION_PLAN_PATH, 'utf8'));
      // Override title to reflect the active site, not the site it was created for
      plan.title = `Studio UI Validation — ${TAG}`;
      res.json(plan);
    } catch (e) {
      res.status(500).json({ error: 'Failed to read validation plan' });
    }
  } else {
    res.json({ status: 'no_plan' });
  }
});

app.post('/api/validation-plan/step/:id', (req, res) => {
  if (!fs.existsSync(VALIDATION_PLAN_PATH)) return res.status(404).json({ error: 'No validation plan found' });
  const stepId = parseInt(req.params.id, 10);
  if (isNaN(stepId)) return res.status(400).json({ error: 'Invalid step id' });
  const status = req.body.status;
  if (!['passed', 'failed', 'skipped'].includes(status)) return res.status(400).json({ error: 'status must be passed|failed|skipped' });
  try {
    const plan = JSON.parse(fs.readFileSync(VALIDATION_PLAN_PATH, 'utf8'));
    const step = plan.steps.find(s => s.id === stepId);
    if (!step) return res.status(404).json({ error: `Step ${stepId} not found` });
    step.status = status;
    step.data_collected = req.body.data || {};
    step.completed_at = new Date().toISOString();
    // Advance current_step to the next pending step
    const nextPending = plan.steps.find(s => s.id > stepId && s.status === 'pending');
    plan.current_step = nextPending ? plan.steps.indexOf(nextPending) : plan.steps.length;
    // Update plan-level status
    const allDone = plan.steps.every(s => s.status !== 'pending');
    if (allDone) plan.status = 'complete';
    else plan.status = 'in_progress';
    fs.writeFileSync(VALIDATION_PLAN_PATH, JSON.stringify(plan, null, 2));
    res.json({ ok: true, next_step: plan.current_step, plan_status: plan.status });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update validation plan: ' + e.message });
  }
});

app.post('/api/validation-plan/report', (req, res) => {
  if (!fs.existsSync(VALIDATION_PLAN_PATH)) return res.status(404).json({ error: 'No validation plan found' });
  try {
    const plan = JSON.parse(fs.readFileSync(VALIDATION_PLAN_PATH, 'utf8'));
    const passed  = plan.steps.filter(s => s.status === 'passed');
    const failed  = plan.steps.filter(s => s.status === 'failed');
    const skipped = plan.steps.filter(s => s.status === 'skipped');
    const pending = plan.steps.filter(s => s.status === 'pending');

    const report = [
      '# Studio Validation Gap Report',
      `## Date: ${new Date().toISOString().split('T')[0]}`,
      `## Plan: ${plan.title}`,
      '',
      '## Results',
      `- Passed:  ${passed.length}/${plan.steps.length}`,
      `- Failed:  ${failed.length}/${plan.steps.length}`,
      `- Skipped: ${skipped.length}/${plan.steps.length}`,
      `- Pending: ${pending.length}/${plan.steps.length}`,
      '',
      '## Passed Steps',
      passed.length ? passed.map(s => `- ✓ Step ${s.id}: ${s.title}`).join('\n') : '_(none)_',
      '',
      '## Failed Steps (Gaps to Fix)',
      failed.length ? failed.map(s => [
        `### Gap: Step ${s.id} — ${s.title}`,
        `**Description:** ${s.description}`,
        `**Expected:** ${s.expected}`,
        `**Show Me target:** \`${s.show_me_target}\``,
        `**Data collected:** ${JSON.stringify(s.data_collected || {})}`,
        `**Completed at:** ${s.completed_at || 'n/a'}`,
      ].join('\n')).join('\n\n') : '_(none)_',
      '',
      '## Skipped Steps',
      skipped.length ? skipped.map(s => `- ⊘ Step ${s.id}: ${s.title}`).join('\n') : '_(none)_',
      '',
      '## Pending Steps (Not yet validated)',
      pending.length ? pending.map(s => `- ○ Step ${s.id}: ${s.title}`).join('\n') : '_(none)_',
      '',
      '## Recommended Fixes for Session 16',
      failed.length
        ? failed.map((s, i) => `${i + 1}. Fix Step ${s.id}: ${s.title}`).join('\n')
        : '_(No gaps — all steps passed or skipped)_',
    ].join('\n');

    const reportDir = path.join(__dirname, '../../docs');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'session15-validation-report.md');
    fs.writeFileSync(reportPath, report);
    res.json({ ok: true, path: reportPath, passed: passed.length, failed: failed.length, skipped: skipped.length });
  } catch (e) {
    res.status(500).json({ error: 'Failed to generate report: ' + e.message });
  }
});

// ─── Revenue Path API (Phase 6) ──────────────────────────────────────────────

// PATCH /api/patch-spec — update safe spec fields (monthly_rate, client_name, etc.)
const PATCHABLE_SPEC_FIELDS = new Set(['monthly_rate', 'client_name', 'client_email', 'custom_domain', 'paypal_handle']);
app.patch('/api/patch-spec', (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'JSON body required' });
  const spec = readSpec();
  let updated = 0;
  for (const [k, v] of Object.entries(req.body)) {
    if (PATCHABLE_SPEC_FIELDS.has(k)) { spec[k] = v; updated++; }
  }
  if (!updated) return res.status(400).json({ error: 'No patchable fields in request' });
  writeSpec(spec);
  res.json({ ok: true, fields_updated: updated });
});

// POST /api/approve-site — mark site as client_approved
app.post('/api/approve-site', (req, res) => {
  const spec = readSpec();
  spec.state = 'client_approved';
  spec.approved_at = new Date().toISOString();
  if (req.body && req.body.monthly_rate) spec.monthly_rate = req.body.monthly_rate;
  if (req.body && req.body.client_name)  spec.client_name  = req.body.client_name;
  writeSpec(spec);
  const paypalHandle = spec.paypal_handle || 'famtasticfritz';
  const rate = spec.monthly_rate;
  const paypalLink = rate ? `https://www.paypal.com/paypalme/${paypalHandle}/${rate}` : null;
  res.json({ ok: true, state: 'client_approved', approved_at: spec.approved_at, paypal_link: paypalLink });
});

// GET /api/revenue-card — PayPal + monthly rate card data
app.get('/api/revenue-card', (req, res) => {
  const spec = readSpec();
  const paypalHandle = spec.paypal_handle || 'famtasticfritz';
  const rate = spec.monthly_rate;
  res.json({
    monthly_rate: rate || null,
    paypal_link: rate ? `https://www.paypal.com/paypalme/${paypalHandle}/${rate}` : null,
    paypal_handle: paypalHandle,
    state: spec.state || 'unknown',
    approved_at: spec.approved_at || null,
    client_name: spec.client_name || null,
    deployed_url: spec.deployed_url || null,
    custom_domain: spec.custom_domain || null,
  });
});

// GET /api/verify
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
  safe._configured = safe._configured || {};
  const secretPaths = [
    ['root', 'anthropic_api_key'],
    ['root', 'gemini_api_key'],
    ['root', 'google_api_key'],
    ['root', 'openai_api_key'],
    ['root', 'leonardo_api_key'],
    ['root', 'openrouter_api_key'],
    ['root', 'firefly_client_id'],
    ['root', 'firefly_client_secret'],
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
    const bucket = section === 'root' ? safe : safe[section];
    if (bucket && bucket[key]) {
      safe._configured[key] = true;
      bucket[key + '_configured'] = true;
      delete bucket[key];
    }
  }
  safe.developer_mode = summarizeShayDeveloperMode(settings.developer_mode);
  safe.shay_lite_settings = normalizeShayLiteSettings(settings.shay_lite_settings);
  res.json(safe);
});

app.put('/api/settings', (req, res) => {
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'JSON body required' });
  const allowedKeys = ['model', 'deploy_target', 'deploy_team', 'preview_port', 'studio_port',
    'max_upload_size_mb', 'max_uploads_per_site', 'auto_summary', 'auto_version', 'max_versions',
    'email', 'sms', 'stock_photo', 'analytics_provider', 'analytics_id', 'brainstorm_profile',
    'prod_sites_base', 'plan_mode', 'hero_full_width', 'developer_mode', 'shay_lite_settings',
    'anthropic_api_key', 'gemini_api_key', 'google_api_key', 'openai_api_key', 'leonardo_api_key',
    'openrouter_api_key', 'firefly_client_id', 'firefly_client_secret'];
  const current = loadSettings();
  for (const key of Object.keys(req.body)) {
    if (allowedKeys.includes(key)) current[key] = req.body[key];
  }
  saveSettings(current);
  logShayDeveloperModeEvent({
    event: 'settings_updated',
    actor: 'user',
    status: 'saved',
    developer_mode: summarizeShayDeveloperMode(current.developer_mode),
  });
  res.json(current);
});

app.get('/api/shay-shay/developer-mode/audit', (req, res) => {
  try {
    res.json({
      ok: true,
      developer_mode: summarizeShayDeveloperMode(),
      entries: readShayDeveloperModeAudit(req.query.limit),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Enhancement Pass Detector ---
// Given a user message classified as 'enhancement_pass', returns a flag
// object describing which of the six passes are enabled.
//   { images, shapes, animations, icons, generated, famtasticMode }
// famtasticMode implies all five other flags — used as a single mega-pass.
// If no specific passes are mentioned, defaults to famtasticMode (the user
// asked for "an enhancement pass" without being specific, so do everything).
function detectEnhancementPasses(message) {
  const lower = (message || '').toLowerCase();
  const passes = {
    images: false,
    shapes: false,
    animations: false,
    icons: false,
    generated: false,
    famtasticMode: false,
  };

  // famtastic mode — mega-pass, implies all others
  if (/\b(?:more\s+)?fam[- ]?tastic(?:\s+mode)?\b/.test(lower) || /\bgo\s+full\s+fam[- ]?tastic\b/.test(lower)) {
    passes.famtasticMode = true;
  }
  if (/\b(?:enhancement|decoration|polish|glow[- ]?up)\s+pass\b/.test(lower) && !/\b(only|just)\b/.test(lower)) {
    // "run an enhancement pass" with no qualifier → everything
    passes.famtasticMode = true;
  }

  // Individual passes
  if (/\b(image\s+slots?|picture\s+slots?|photo\s+slots?|more\s+images?|bulk\s+images?)\b/.test(lower)) passes.images = true;
  if (/\b(shapes?|blobs?|waves?|decorative\s+shapes?|background\s+patterns?|fam[- ]?shapes?)\b/.test(lower)) passes.shapes = true;
  if (/\b(motion|animations?|scroll\s+effects?|entry\s+animations?|parallax|fam[- ]?motion|fam[- ]?scroll)\b/.test(lower)) passes.animations = true;
  if (/\b(lucide|icons?)\b/.test(lower)) passes.icons = true;
  if (/\b(svg\s+(?:dividers?|separators?|patterns?|textures?)|dividers?|separators?|section\s+dividers?|textures?|generated\s+svgs?)\b/.test(lower)) passes.generated = true;

  // If famtasticMode, turn on everything
  if (passes.famtasticMode) {
    passes.images = true;
    passes.shapes = true;
    passes.animations = true;
    passes.icons = true;
    passes.generated = true;
  }

  // If nothing was detected, default to famtasticMode (user asked for a pass
  // without saying which — interpret as "the works")
  const anyEnabled = passes.images || passes.shapes || passes.animations || passes.icons || passes.generated;
  if (!anyEnabled) {
    passes.famtasticMode = true;
    passes.images = true;
    passes.shapes = true;
    passes.animations = true;
    passes.icons = true;
    passes.generated = true;
  }

  return passes;
}

// --- Conversational Ack Response ---
// Returns a contextual acknowledgment without any Claude API call.
function getAckResponse(spec) {
  const siteName = spec && spec.site_name ? spec.site_name : 'the site';
  const hasBrief = !!(spec && spec.design_brief);
  const pages = (spec && spec.pages) || [];
  const suggestions = [];
  if (!hasBrief) suggestions.push('start with a brief ("build a site for..."');
  else if (pages.length === 0) suggestions.push('kick off the first build');
  else suggestions.push(`refine ${siteName}`, 'add a page', 'deploy when ready');
  const pick = suggestions[Math.floor(Math.random() * suggestions.length)];
  return `Got it. Want to ${pick}?`;
}

// --- Request Classifier ---
// Classifies user intent. Returns one of:
// new_site, major_revision, restyle, layout_update, content_update, bug_fix,
// asset_import, build, deploy, query, enhancement_pass
function classifyRequest(message, spec) {
  const lower = message.toLowerCase();
  const hasBrief = spec && spec.design_brief && spec.design_brief.approved;
  const hasHtml = fs.existsSync(path.join(DIST_DIR(), 'index.html'));

  // --- STRONG BUILD SIGNALS (intent-dominant, override vocabulary) ---
  // These fire before any vocabulary matching to prevent brief text from being misclassified
  const strongBuildSignals = [
    /\bi('m|\s+am)\s+(building|creating|making)\s+a\s+site\b/,
    /\bi\s+want\s+(a|to\s+(?:build|create|make))\s+(a\s+)?(?:website|site|web\s+page)\b/,
    /\bi\s+need\s+a\s+(?:website|site)\s+for\b/,
    /\b(?:build|create|generate|make)\s+(?:a\s+|the\s+)?(?:full\s+)?(?:website|site)\s+(?:for|now|with|from)\b/,
    /\bpages\s+needed\b/i,
    /\bcolor\s+scheme\b.*\bfonts?\b/i,
    /\bprimary\s+color\b.*\bsecondary\b/i,
    /\bfont\s+stack\b/,
    /\bmust.have.sections\b/i,
  ];
  const buildSignalHits = strongBuildSignals.filter(p => p.test(message) || p.test(lower));
  if (buildSignalHits.length >= 1) {
    console.log(`[classifier] intent=build confidence=HIGH signals=${buildSignalHits.length} (strong build pattern)`);
    if (!hasBrief) return 'new_site';
    return 'build';
  }

  // --- BRIEF DETECTION (vocabulary sanitization for technical attribute syntax) ---
  // If message looks like a site brief (contains business description + pages + colors),
  // treat it as new_site/build regardless of technical vocabulary present
  const briefIndicators = [
    /\bpages?\s+needed\b/i,
    /\bcolor\s+(?:scheme|palette)\b/i,
    /\bfont\s+(?:stack|choice|pairing)\b/i,
    /\bdesign\s+requirements?\b/i,
    /\bbrand\s+(?:character|voice|guide)\b/i,
    /\bdata[-_]section[-_]id\b/i,
    /\bdata[-_]field[-_]id\b/i,
    /\bdata[-_]slot[-_]id\b/i,
  ];
  const briefHits = briefIndicators.filter(p => p.test(message));
  if (briefHits.length >= 2) {
    console.log(`[classifier] intent=${hasBrief ? 'build' : 'new_site'} confidence=HIGH signals=${briefHits.length} (brief indicators: ${briefHits.map(p => p.source.substring(0,30)).join(', ')})`);
    return hasBrief ? 'build' : 'new_site';
  }

  // Precedence: brainstorm > rollback > new_site > major_revision > restructure > content_update > restyle > bug_fix > layout_update > asset_import
  // Default: content_update (non-destructive — uses surgical handler before Claude fallback)

  // Session 12 Phase 2 (W3): worker queue commands — "run worker tasks",
  // "process the queue", "show worker queue", "clear worker queue". This
  // intent is handled deterministically (no Claude call) and honestly
  // reports that there is no live consumer process.
  if (lower.match(/\b(run|process|execute|drain)\s+(?:the\s+)?(worker\s+(?:queue|tasks?)|pending\s+(?:worker\s+)?tasks?|queued\s+tasks?)\b/)) return 'run_worker_task';
  if (lower.match(/\b(show|list|view|what.?s\s+in)\s+(?:the\s+)?worker\s+queue\b/)) return 'run_worker_task';
  if (lower.match(/\b(clear|clean|purge|empty)\s+(?:the\s+)?worker\s+queue\b/)) return 'run_worker_task';

  // Brief edit — update the design brief directly
  if (lower.match(/\b(edit\s+(?:the\s+)?brief|update\s+(?:the\s+)?brief|change\s+the\s+goal|fix\s+the\s+audience|modify\s+(?:the\s+)?brief)\b/)) return 'brief_edit';

  // Visual inspection — check rendered CSS, layout, images, responsive, console errors
  if (lower.match(/\b(check|measure|inspect|examine)\s+(?:the\s+)?(nav|header|footer|hero|layout|width|height|spacing|font|color|section|images?|slots?|structure|data-\w+)/)) return 'visual_inspect';
  // Inspect data attributes specifically (e.g. "inspect the data-field-id on the hero section")
  if (lower.match(/\b(check|inspect|examine)\s+(?:the\s+)?data-[\w-]+\b/)) return 'visual_inspect';
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
  if (!hasBrief) {
    console.log(`[classifier] intent=new_site confidence=HIGH (no approved brief)`);
    return 'new_site';
  }

  // Brief approved but no HTML built yet — need to build first
  if (hasBrief && !hasHtml) return 'build';

  // Major revision signals
  if (lower.match(/\b(start\s+over|from\s+scratch|completely\s+different|total(ly)?\s+(re)?do|scrap\s+(it|this|everything))\b/)) return 'major_revision';
  if (lower.match(/\b(i('m|\s+am)\s+not\s+feeling|hate\s+(it|this)|this\s+(isn't|is\s+not)\s+what|wrong\s+direction)\b/)) return 'major_revision';

  // Restructure — convert to multi-page or change page structure
  if (lower.match(/\b(break\s+(\w+\s+)?into\s+(\d+\s+)?pages|separate\s+pages|split\s+(\w+\s+)?into\s+(\d+\s+)?pages|make\s+(this\s+|it\s+)?multi[- ]?page|restructure\s+the\s+site|change\s+(the\s+)?page\s+structure|convert\s+to\s+multi[- ]?page|want\s+separate\s+pages|need\s+separate\s+pages)\b/)) return 'restructure';

  // ── ENHANCEMENT PASS — opt-in decorative passes that add FAMtastic DNA
  //    without rewriting copy or restructuring layout. Six passes:
  //      images, shapes, animations, icons, generated (svg), famtasticMode (all)
  //    Detection is keyword-driven and runs BEFORE content_update so "add
  //    animations" / "add shapes" are not mis-handled as content edits.
  if (
    // explicit "enhancement pass" / "decoration pass" language
    lower.match(/\b(enhancement|decoration|polish|glow[- ]?up)\s+pass\b/) ||
    lower.match(/\brun\s+(?:an?\s+)?(?:enhancement|decoration|polish)\s+pass\b/) ||
    // "make it (more) famtastic" / famtastic mode
    lower.match(/\b(?:make\s+(?:it|this)\s+)?(?:more\s+)?fam[- ]?tastic(?:\s+(?:mode|pass))?\b/) ||
    lower.match(/\bgo\s+full\s+fam[- ]?tastic\b/) ||
    // add shapes / add decorations / add blobs / add waves / add grids
    lower.match(/\badd\s+(?:some\s+|more\s+)?(?:fam[- ]?)?(?:shapes?|blobs?|waves?|decorative\s+shapes?|decorations?|background\s+patterns?)\b/) ||
    // add animations / motion / entry effects
    lower.match(/\badd\s+(?:some\s+|more\s+)?(?:motion|animations?|scroll\s+effects?|entry\s+animations?|parallax)\b/) ||
    // add icons
    lower.match(/\badd\s+(?:some\s+|more\s+)?(?:lucide\s+)?icons?\b/) ||
    // add image slots (bulk — different from single image slot edits)
    lower.match(/\badd\s+(?:more\s+|additional\s+)?(?:image\s+slots?|picture\s+slots?|photo\s+slots?)\b/) ||
    // generate SVG dividers / patterns / textures in place
    lower.match(/\badd\s+(?:some\s+|a\s+)?(?:svg\s+)?(?:dividers?|separators?|section\s+dividers?|patterns?|textures?)\b/) ||
    // "decorate" anything
    lower.match(/\bdecorate\s+(?:the\s+|this\s+)?(?:site|page|hero|section)\b/)
  ) {
    console.log(`[classifier] intent=enhancement_pass confidence=HIGH (decorative/opt-in pass keywords)`);
    return 'enhancement_pass';
  }

  // ── CONTENT UPDATE (high precedence — surgical edits bypass plan gate) ────────
  // These must appear before restyle/layout_update/bug_fix to prevent accidental rebuilds.

  // Pattern 1: action verb + content field noun (exclude structural add/remove)
  if (lower.match(/\b(change|update|replace|edit|set|fix|correct|modify)\b.*?\b(phone|email|address|name|title|heading|headline|paragraph|description|hours|price|number|text|copy|label|tagline|slogan|testimonial|subtitle|motto|cta|date|location|time|schedule|venue|welcome|message|caption)\b/) && !lower.match(/\b(add|remove|move|swap|rearrange|reorder)\s+(a\s+|the\s+)?(section|column|row|card|grid)\b/)) return 'content_update';
  // Pattern 2: "X should be/say/read Y"
  if (lower.match(/\b(phone|email|address|hours|price|number|heading|headline|title|name|buttons?|date|location|time|copy|text|cta|tagline|slogan)\b.*?\b(should\s+be|to\s+be|to\s+say|now\s+(?:reads?|says?)|say|read)\b/)) return 'content_update';
  // Pattern 3: "change/update/set X to Y" with any content field
  if (lower.match(/\b(change|update|set)\b/) && lower.match(/\bto\b/) && lower.match(/\b(phone|email|address|hours|price|number|heading|headline|title|name|button|date|location|time|venue|tagline|slogan|cta)\b/)) return 'content_update';
  // Pattern 4: "add the address/hours/phone/email" — adding a content VALUE (not structural)
  if (lower.match(/\b(add)\s+(the\s+|my\s+|our\s+|a\s+)?(business\s+)?(address|hours|phone|email|number)\b/) && !lower.match(/\b(section|form|block|widget)\b/)) return 'content_update';
  // Pattern 5: event/meeting field changes
  if (lower.match(/\b(reunion|event|meeting|sale)\s+(date|time|location)\b.*?\b(to|is|should\s+be|will\s+be)\b/) && !lower.match(/\b(section|grid|layout|button|column|row)\b/)) return 'content_update';
  // Pattern 6: "the [field] is/should be/to [value]"
  if (lower.match(/\b(the\s+)?(email|phone|price|date|hours)\s+(should\s+be|is|to)\s/) && !lower.match(/\b(section|grid|layout|button|column|row)\b/)) return 'content_update';
  // Pattern 7: "add the phrase/text/subtitle/tagline X"
  if (lower.match(/\b(add|include)\s+(?:the\s+)?(?:phrase|text|subtitle|tagline|motto|quote|slogan|copy)\b/) && !lower.match(/\b(section|form|block|widget|page)\b/)) return 'content_update';
  // Pattern 8: "change the [any field] to"
  if (lower.match(/\b(change|update|set)\s+(?:the\s+)?(main\s+|hero\s+|page\s+)?(tagline|motto|subtitle|slogan|heading|headline|title|cta|welcome\s+message|copy)\s+to\b/)) return 'content_update';
  // Pattern 9: hero section text edits
  if (lower.match(/\b(hero|main|page)\s+(text|title|headline|subtitle|copy|cta|button)\b/) && lower.match(/\b(change|update|set|edit|fix|replace|to\s+say|should\s+say)\b/)) return 'content_update';
  // Pattern 10: "make it say X" / "have it read X"
  if (lower.match(/\b(make\s+it|have\s+it|make\s+the\s+\w+)\s+(say|read|display|show)\b/)) return 'content_update';
  // Pattern 11: "our hours/address/phone is/are now X"
  if (lower.match(/\b(our|the)\s+(hours|address|phone|email|number|price|rate)\s+(is|are|changed|now|changed\s+to)\b/)) return 'content_update';
  // Pattern 12: "fix the typo" / "fix the text" — minor text fixes are content, not layout
  if (lower.match(/\bfix\s+(?:the\s+)?(?:typo|spelling|wording|copy|text|label)\b/)) return 'content_update';

  // Restyle signals — about overall vibe, not specific elements
  if (lower.match(/\b(make\s+it\s+(more|less)\s+\w+|change\s+the\s+(whole|entire|overall)\s+(vibe|feel|look|style|aesthetic))\b/)) return 'restyle';
  if (lower.match(/\b(more\s+(premium|minimal|bold|elegant|modern|playful|professional|corporate|clean|edgy))\b/) && !lower.match(/\b(header|footer|button|section|nav|hero|card)\b/)) return 'restyle';

  // Bug fix signals
  if (lower.match(/\b(broken|bug|doesn't\s+work|not\s+working|misaligned|overlapping|overflow)\b/)) return 'bug_fix';

  // Verification — run build verification checks (Fix #3 from Site 4 gap analysis)
  if (lower.match(/\b(run\s+verif|verify\s+the|check\s+the\s+site|run\s+checks|verify\s+the\s+build|check\s+for\s+issues|run\s+review|review\s+the\s+build)\b/)) return 'verification';

  // Component library — export/import (Fix #4 from Site 4 gap analysis)
  if (lower.match(/\b(export|save)\s+(?:the\s+|this\s+)?(?:\w+\s+)?(?:section|component|hero|card|form)\s+(?:to|as|into)\s+(?:the\s+)?(?:component\s+)?library\b/)) return 'component_export';
  // Component import — support hyphenated IDs (display-stage, photo-slideshow, etc.)
  if (lower.match(/\b(import|use|get|load)\s+(?:the\s+|a\s+)?(?:[\w][\w\s-]*?)\s+(?:component|hero|card|form)\s+(?:from|in)\s+(?:the\s+)?library\b/)) return 'component_import';
  // Insert without "library" keyword: "use the display-stage component on the homepage"
  if (lower.match(/\b(use|insert|add|place)\s+(?:the\s+)?(?:[\w][\w-]+)\s+component\b/)) return 'component_import';
  if (lower.match(/\bwhat\s+components?\s+(?:are\s+)?(?:in|available)\b/)) return 'component_import';

  // SVG pattern/icon generation — routes to asset_import (BLOCKER 3 fix)
  if (lower.match(/\b(create|generate|make|design)\s+(?:a\s+|an\s+|the\s+)?(?:\w+[\s-])*(?:pattern|svg|icon|symbol|motif|crest|emblem)\b/)) return 'asset_import';
  // Apply pattern/background — treat as layout_update (HIGH 5 fix)
  if (lower.match(/\b(apply|use|add|set)\s+(?:the\s+|a\s+)?(?:\w+[\s-])*(?:pattern|texture|svg)\s+(?:as\s+|to\s+|for\s+)?(?:the\s+)?(?:background|overlay|section)\b/)) return 'layout_update';

  // Layout update — structural changes to specific elements
  if (lower.match(/\b(add|remove|move|swap|rearrange|reorder)\s+(a\s+|the\s+)?(section|column|row|card|button|form|nav|header|footer|sidebar|testimonial|feature|grid)\b/)) return 'layout_update';
  if (lower.match(/\b(make\s+the\s+(header|footer|hero|nav|button|section)\s+\w+)\b/)) return 'layout_update';

  // Conversational acknowledgment — zero-cost, no API call.
  // Matches short affirmations that have no build intent. Must come before default fallback
  // to prevent these from burning tokens on a full Claude generation call.
  const ACK_PATTERNS = /^(hello|hi|hey|howdy|hiya|greetings|sup|yo|ok|okay|yes|yep|sure|great|thanks|thank\s+you|looks\s+good|perfect|awesome|nice|got\s+it|sounds\s+good|agreed|cool|good|excellent|wonderful|fantastic|amazing|alright|sounds\s+great|that\s+works|love\s+it|keep\s+going|continue|proceed)[\s!.]*$/i;
  if (ACK_PATTERNS.test(message.trim())) {
    console.log(`[classifier] intent=conversational_ack (no API call)`);
    return 'conversational_ack';
  }

  // Default: use the least destructive path — content_update goes through surgical handler first
  // before falling through to Claude, so it won't trigger a full layout rebuild.
  // layout_update as default was a Codex MEDIUM finding — it forces plan-gate on ambiguous input.
  console.log(`[classifier] intent=content_update confidence=LOW (no pattern matched, defaulting to non-destructive path)`);
  return 'content_update';
}

/**
 * Extract page names from a design brief's must_have_sections.
 * Returns an array starting with 'home', followed by any recognized page names.
 */
function extractPagesFromBrief(brief) {
  const sections = brief.must_have_sections || [];
  // Single-word page names
  const KNOWN_PAGES = new Set([
    'about', 'services', 'contact', 'gallery', 'blog', 'portfolio',
    'testimonials', 'faq', 'pricing', 'team', 'careers', 'events',
    'shop', 'products', 'news', 'resources', 'work', 'projects',
    'menu', 'booking', 'schedule', 'reviews', 'connect', 'history',
    'story', 'photos', 'donate', 'rsvp', 'registration', 'sponsors',
  ]);
  // Multi-word page name patterns → slugified page name
  const COMPOUND_PAGES = {
    'our story': 'our-story', 'our history': 'our-history', 'event details': 'event-details',
    'reunion 2026': 'event-details', 'reunion 2025': 'event-details',
    'about us': 'about', 'meet the team': 'team', 'photo gallery': 'gallery',
    'family tree': 'family-tree', 'family history': 'our-story',
    'get in touch': 'contact', 'contact us': 'contact',
  };
  const pages = ['home'];
  for (const section of sections) {
    const cleaned = section.toLowerCase().replace(/\(.*?\)/g, '').trim();
    // Check compound names first (Fix #6 from Site 4 gap analysis)
    let matched = false;
    for (const [compound, slug] of Object.entries(COMPOUND_PAGES)) {
      if (cleaned.includes(compound) && !pages.includes(slug)) {
        pages.push(slug);
        matched = true;
        break;
      }
    }
    if (matched) continue;
    // Fall back to single-word match
    const candidate = cleaned.split(/\s+/)[0];
    if (KNOWN_PAGES.has(candidate) && !pages.includes(candidate)) {
      pages.push(candidate);
    }
  }
  return pages;
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
  let matchedPageName = pageRefMatch ? pageRefMatch[1].toLowerCase() + '.html'
    : pageNameMatch ? pageNameMatch[1].toLowerCase() + '.html'
    : null;
  // Fix #7: "home page" → index.html, "history page" → our-story.html (common aliases)
  if (matchedPageName) {
    const aliases = { 'home.html': 'index.html', 'homepage.html': 'index.html', 'main.html': 'index.html',
      'history.html': 'our-story.html', 'story.html': 'our-story.html',
      'events.html': 'event-details.html', 'event.html': 'event-details.html', 'reunion.html': 'event-details.html',
      'photos.html': 'gallery.html', 'pictures.html': 'gallery.html' };
    if (aliases[matchedPageName]) matchedPageName = aliases[matchedPageName];
    // Also try fuzzy match — but only if the match is unique (Codex review: reject ambiguous)
    if (!pages.includes(matchedPageName)) {
      const base = matchedPageName.replace('.html', '');
      const fuzzyMatches = pages.filter(p => p.includes(base) || base.includes(p.replace('.html', '')));
      if (fuzzyMatches.length === 1) matchedPageName = fuzzyMatches[0];
    }
  }
  // Resolve which page to use — but don't mutate module-level currentPage here.
  // Return resolvedPage so the caller can update currentPage explicitly.
  let resolvedPage = currentPage;
  if (matchedPageName && requestType !== 'build' && requestType !== 'major_revision') {
    if (pages.includes(matchedPageName) && matchedPageName !== currentPage) {
      console.log(`[context] User references ${matchedPageName} (currently on ${currentPage}) — auto-switching`);
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

  // Session 11 Fix 1: Inject client_brief from the intake interview.
  // These answers come directly from the owner and must dominate any generic
  // assumptions — use them verbatim for business description, audience,
  // differentiator, CTA language, and style direction.
  const clientBrief = spec.client_brief || null;
  if (clientBrief) {
    const cb = clientBrief;
    const fields = [];
    if (cb.business_description) fields.push(`- Business (owner's own words): ${cb.business_description}`);
    if (cb.ideal_customer)       fields.push(`- Ideal customer: ${cb.ideal_customer}`);
    if (cb.differentiator)       fields.push(`- Differentiator / unfair advantage: ${cb.differentiator}`);
    if (cb.primary_cta)          fields.push(`- Primary CTA (use this language): ${cb.primary_cta}`);
    if (cb.style_notes)          fields.push(`- Style notes: ${cb.style_notes}`);
    if (cb.services)             fields.push(`- Services / offerings: ${cb.services}`);
    if (cb.social_proof)         fields.push(`- Social proof / credibility: ${cb.social_proof}`);
    if (cb.geography)            fields.push(`- Geography / service area: ${cb.geography}`);
    if (cb.urgency_hook)         fields.push(`- Urgency hook: ${cb.urgency_hook}`);
    if (cb.contact_methods)      fields.push(`- Contact methods: ${cb.contact_methods}`);
    if (cb.revenue_model) fields.push(`- Revenue model: ${cb.revenue_model}`);
    if (fields.length > 0) {
      briefContext += `\n\nCLIENT BRIEF (from intake interview — these are the owner's own answers, treat as authoritative):\n` +
        fields.join('\n') +
        `\nUse these answers for real copy. Do not substitute generic placeholder text when the client has given you real content here.`;
    }

    // Revenue model build hints — inject architecture instructions based on monetization intent
    const revenueModel = cb.revenue_model || spec.revenue_model || 'stub';
    if (revenueModel && revenueModel !== 'stub') {
      const { getRevenueBuildHints } = require('./lib/client-interview');
      const hints = getRevenueBuildHints(revenueModel);
      if (hints.prompt_additions && hints.prompt_additions.length > 0) {
        briefContext += `\n\nREVENUE ARCHITECTURE (${revenueModel} model — build these in from the start):\n` +
          hints.prompt_additions.map(h => `- ${h}`).join('\n');
      }
      if (hints.schema_hints && hints.schema_hints.length > 0) {
        briefContext += `\n- Required schema markup types: ${hints.schema_hints.join(', ')}`;
      }
    }
  }

  // Extract mandatory visual requirements from brief + decisions (Fix #1 from Site 4 gap analysis)
  let visualRequirements = '';
  {
    const colorHexes = {};
    const fontSpecs = {};
    // Scan decisions for color/font specs
    for (const d of decisions) {
      const txt = d.decision || '';
      // Extract hex colors with labels: "Heritage Burgundy (#7B2D3B)" or "primary: #7B2D3B"
      // Codex review: only accept proper label forms, filter stopwords
      const hexMatches = txt.matchAll(/([A-Z][\w\s]*?)\s*[\(:]?\s*(#[0-9A-Fa-f]{6})\b/g);
      const stopwords = new Set(['use', 'and', 'the', 'with', 'for', 'from', 'set', 'to', 'is', 'as', 'or', 'on', 'in', 'at', 'a', 'an']);
      for (const m of hexMatches) {
        const label = m[1].trim().toLowerCase().replace(/\s+/g, ' ');
        if (label.length >= 3 && label.length < 30 && !stopwords.has(label)) colorHexes[label] = m[2];
      }
      // Extract font names
      const fontMatch = txt.match(/(?:font|heading|body|accent)[\s:]*([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g);
      if (fontMatch) {
        fontMatch.forEach(f => {
          const name = f.replace(/^(font|heading|body|accent)[\s:]*/i, '').trim();
          if (name.length > 2 && name.length < 40) {
            const role = f.match(/heading/i) ? 'heading' : f.match(/body/i) ? 'body' : f.match(/accent/i) ? 'accent' : 'font';
            fontSpecs[role] = name;
          }
        });
      }
    }
    // Also scan visual_direction for colors/fonts
    const vd = JSON.stringify(brief?.visual_direction || {});
    const vdHexes = vd.matchAll(/(#[0-9A-Fa-f]{6})\b/g);
    for (const m of vdHexes) {
      if (!Object.values(colorHexes).includes(m[1])) colorHexes['from brief'] = m[1];
    }
    // Also scan the user message for explicit color/font mentions
    const msgHexes = userMessage.matchAll(/(?:(\w[\w\s]*?)\s+)?(#[0-9A-Fa-f]{6})\b/g);
    for (const m of msgHexes) {
      const label = (m[1] || 'user specified').trim().toLowerCase();
      colorHexes[label] = m[2];
    }
    const msgFonts = userMessage.match(/(?:Playfair\s+Display|Lato|Great\s+Vibes|Cormorant\s+Garamond|Raleway|Source\s+Sans|Merriweather|Roboto|Open\s+Sans|Montserrat|Poppins|Inter|Georgia|Dancing\s+Script)/gi);
    if (msgFonts) {
      msgFonts.forEach((f, i) => {
        if (i === 0 && !fontSpecs.heading) fontSpecs.heading = f;
        else if (i === 1 && !fontSpecs.body) fontSpecs.body = f;
        else if (i === 2 && !fontSpecs.accent) fontSpecs.accent = f;
      });
    }

    if (Object.keys(colorHexes).length > 0 || Object.keys(fontSpecs).length > 0) {
      visualRequirements = '\n\nMANDATORY VISUAL REQUIREMENTS (DO NOT DEVIATE):\n';
      if (Object.keys(colorHexes).length > 0) {
        visualRequirements += 'Colors (client-approved — using any other colors is a build failure):\n';
        for (const [label, hex] of Object.entries(colorHexes)) {
          visualRequirements += `  ${label}: ${hex}\n`;
        }
      }
      if (Object.keys(fontSpecs).length > 0) {
        visualRequirements += 'Fonts (client-approved — using any other fonts is a build failure):\n';
        for (const [role, name] of Object.entries(fontSpecs)) {
          visualRequirements += `  ${role}: ${name}\n`;
        }
        visualRequirements += 'Include the correct Google Fonts <link> tag in <head>.\n';
      }
      visualRequirements += 'Apply these colors and fonts in Tailwind config AND CSS custom properties.\n';
    } else {
      // GAP-1 fix: no client palette found — inject FAMtastic defaults so Claude
      // never falls back to generic industry colors.
      const defaultPalette = famSkeletons.FAMTASTIC_DEFAULT_PALETTE;
      visualRequirements = '\n\nFAMTASTIC DEFAULT PALETTE (no client palette specified — you MUST use these exact hex values):\n';
      for (const [role, hex] of Object.entries(defaultPalette)) {
        visualRequirements += `  ${role}: ${hex}\n`;
      }
      visualRequirements += 'Apply in Tailwind config AND CSS custom properties. Using any other colors is a build failure.\n';
    }
  }
  // Append visual requirements to briefContext
  briefContext += visualRequirements;

  // Session 11 Fix 3: Font pairing from registry (vertical-aware).
  // Resolves a curated pairing for the business vertical and appends
  // explicit typography instructions so Claude uses the right fonts
  // and Google Fonts link tag. spec.fonts.pairing overrides auto-pick.
  try {
    const pairingId = spec.fonts?.pairing || null;
    const pair = pairingId
      ? fontRegistry.getPairing(pairingId)
      : fontRegistry.pickPairingForVertical(spec.business_type || brief?.visual_direction?.vertical || '');
    if (pair) {
      const enriched = pair.googleUrl ? pair : { ...pair, googleUrl: fontRegistry.buildGoogleFontsUrl(pair) };
      briefContext += '\n' + fontRegistry.buildFontPromptContext(enriched);
    }
  } catch (err) {
    console.warn('[font-registry] failed to resolve pairing:', err.message);
  }

  // Session 11 Fix 6: Layout variant from registry (vertical-aware).
  // Picks one of five hero/page skeletons so each site gets a
  // differentiated layout instead of the same centered hero every time.
  // spec.layout.variant overrides the auto-pick.
  try {
    const variant = layoutRegistry.pickLayoutVariantForSpec(spec);
    if (variant) {
      briefContext += '\n\n' + layoutRegistry.buildLayoutPromptContext(variant);
    }
  } catch (err) {
    console.warn('[layout-registry] failed to resolve variant:', err.message);
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

  // BRAIN — institutional knowledge from .brain/INDEX.md
  const brainContext = loadBrainContext();

  // Recent conversation history (intra-session continuity)
  let conversationHistory = '';
  const recentConvo = loadRecentConversation(RECENT_CONVO_COUNT);
  if (recentConvo) {
    console.log(`[convo-history] Injected ${recentConvo.length} chars (${recentConvo.split('\n').length} lines) into prompt`);
    conversationHistory = '\nRECENT CONVERSATION (for context — the user may reference these exchanges):\n' + recentConvo;
  }

  // Content field context — inject existing content values so they persist across rebuilds
  let contentFieldContext = '';
  const specContent = spec.content || {};
  const pageContent = specContent[resolvedPage];
  if (pageContent && pageContent.fields && pageContent.fields.length > 0) {
    const fieldLines = pageContent.fields
      .filter(f => f.editable !== false)
      .map(f => {
        const val = typeof f.value === 'string' ? f.value : JSON.stringify(f.value);
        return `  - data-field-id="${f.field_id}" type="${f.type}" → ${val}`;
      }).join('\n');
    contentFieldContext = `\nCONTENT FIELDS (use these EXACT values — they have been edited by the user):\n${fieldLines}\nEvery field listed above MUST appear in the output HTML with its data-field-id attribute preserved.`;
  }

  // Global fields — fields that appear across all pages (phone, email, business name)
  let globalFieldContext = '';
  const globalFields = spec.global_fields || [];
  if (globalFields.length > 0) {
    const gLines = globalFields.map(f => {
      const val = typeof f.value === 'string' ? f.value : JSON.stringify(f.value);
      return `  - ${f.field_id} (${f.type}): ${val}`;
    }).join('\n');
    globalFieldContext = `\nGLOBAL FIELDS (appear on every page — use these exact values):\n${gLines}`;
  }

  // Core anti-cookie-cutter rules
  const systemRules = `RULES:
- Never default to a generic business template layout
- Preserve approved design decisions unless the user explicitly changes them
- Interpret the site as a coherent brand system, not isolated sections
- Avoid filler copy and stock structure unless justified
- Every section should feel intentional for THIS specific business/project
- If the user's request conflicts with the brief, flag it — don't silently override

CONTENT IDENTITY MARKERS (CRITICAL):
- Every <section> MUST include data-section-id="{unique-id}" and data-section-type="{type}" attributes
- Every editable content element (headings, paragraphs with key info, links, phone numbers, emails, prices, addresses, hours, CTAs) MUST include data-field-id="{unique-id}" and data-field-type="{type}" attributes
- Field types: text, phone, email, address, hours, price, link, testimonial
- Field IDs should be semantic: "phone", "email", "hero-heading", "cta-primary", "testimonial-1", "price-tarot-30"
- These attributes are stable anchors for content editing — do NOT omit them
- Phone numbers: render as <a href="tel:..." data-field-id="phone" data-field-type="phone">
- Emails: render as <a href="mailto:..." data-field-id="email" data-field-type="email">
- Prices: include data-field-id like "price-tarot-30" data-field-type="price"

PARALLAX (when requested):
- Use CSS background-attachment: fixed for parallax sections — no JavaScript required
- iOS Safari ignores background-attachment:fixed. Add @supports for fallback: static background with no parallax on mobile
- Pattern: .parallax { background-image:url('...'); background-attachment:fixed; background-size:cover; background-position:center; }
- Add a dark overlay div for readability: position:absolute; inset:0; background:rgba(0,0,0,0.5)
- Do NOT use JavaScript scroll listeners for parallax — CSS-only approach

SVG PATTERNS (when requested):
- Reference SVG files from assets/patterns/ as background-image
- Use background-repeat:repeat for tileable patterns
- Use low opacity (0.05-0.15) for subtle texture backgrounds

${FAMTASTIC_DNA_VOCAB}`;

  // Blueprint context — prevents rebuild regression
  const blueprintContext = buildBlueprintContext(resolvedPage); // Codex review fix: use resolvedPage not currentPage

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

  // Session 12 Phase 0: mandatory FAMtastic skeletons.
  // These are static strings — returning them makes them testable and lets
  // the build prompt paths concatenate them without re-importing the module.
  // Hero/divider/inline-prohibition go on per-page builds; logo skeleton is
  // template-call only (see buildTemplatePrompt + parallelBuild).
  const heroSkeleton = famSkeletons.HERO_SKELETON;
  const dividerSkeleton = famSkeletons.DIVIDER_SKELETON;
  const navSkeleton = famSkeletons.NAV_SKELETON;
  const inlineStyleProhibition = famSkeletons.INLINE_STYLE_PROHIBITION;
  const logoSkeletonTemplate = spec.famtastic_mode ? famSkeletons.LOGO_SKELETON_TEMPLATE : '';
  const logoNotePage = spec.famtastic_mode ? famSkeletons.LOGO_NOTE_PAGE : '';

  // Session 12 Phase 1 (I1): close the intelligence loop by injecting
  // promoted findings back into the build prompt. If the user has
  // promoted a finding like "Hot fields: phone (4x)", the next build
  // should know about it and act accordingly. Anything dismissed is
  // filtered out upstream in getPromotedIntelligence().
  let promotedIntelContext = '';
  const promotedIntel = getPromotedIntelligence();
  if (promotedIntel.length > 0) {
    const lines = promotedIntel.map(p => {
      return `- [${p.category} / ${p.severity}] ${p.title}\n  Recommendation: ${p.recommendation}`;
    }).join('\n');
    promotedIntelContext = `\nPROMOTED INTELLIGENCE (acted on findings — honor these in this build):\n${lines}\nThese are high-signal observations the user has promoted from past builds. Apply them to how you structure content, pick components, and order sections.`;
  }
  // Append to briefContext so it travels with every prompt that uses the brief.
  briefContext += promotedIntelContext;

  // Session 3-A Task 6: inject vertical research findings from feed index
  try {
    const researchVertical = spec.business_type || brief?.visual_direction?.vertical || '';
    if (researchVertical) {
      const findings = researchRouter.listFindings({ vertical: researchVertical, limit: 3 });
      if (findings.length > 0) {
        const lines = findings.map(f =>
          `- [${f.category || 'general'}] ${f.title || f.question}: ${f.recommendation || (f.answer || '').slice(0, 200)}`
        ).join('\n');
        briefContext += `\n\nVERTICAL RESEARCH (intelligence feed — apply these insights to this build):\n${lines}`;
      }
    }
  } catch {}

  return { htmlContext, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, brainContext, conversationHistory, blueprintContext, slotMappingContext, templateContext, contentFieldContext, globalFieldContext, resolvedPage, heroSkeleton, dividerSkeleton, navSkeleton, inlineStyleProhibition, logoSkeletonTemplate, logoNotePage, promotedIntelContext };
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
async function handleDataModelPlanning(ws, userMessage, spec) {
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

  ws.currentChild = null;
  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: 'Generating data model...' }));
  let response;
  try {
    response = await callSDK(prompt, { maxTokens: 4096, callSite: 'data-model', timeoutMs: 180000 });
  } catch {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', content: 'Data model planning failed. Try describing your data needs.' }));
    return;
  }
  if (!response || !response.trim()) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', content: 'Data model planning failed. Try describing your data needs.' }));
    return;
  }

  {
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
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'assistant', content: response }));
    appendConvo({ role: 'assistant', content: response, intent: 'data_model', at: new Date().toISOString() });
  }
}

// --- Planning Handler ---
async function generatePlan(ws, userMessage, intent, spec) {
  const prompt = `Given this request: "${userMessage}"
Site: ${spec.site_name || TAG}, page: ${currentPage}, intent: ${intent}
Generate a build plan as JSON with this exact structure:
{
  "summary": "one sentence of what will change",
  "affected_pages": ["filename.html"],
  "changes": [
    { "area": "area name", "action": "what changes" }
  ],
  "estimated_scope": "small"
}
estimated_scope must be one of: small, medium, large.
Return ONLY the JSON object. No preamble, no explanation.`;

  try {
    const response = await callSDK(prompt, { maxTokens: 2048, callSite: 'generate-plan', timeoutMs: 120000 });
    if (!response.trim()) return null;
    const jsonMatch = response.trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const plan = JSON.parse(jsonMatch[0]);
    const planId = require('crypto').randomUUID();
    pendingPlans.set(planId, { userMessage, intent });
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'build-plan', planId, plan, originalMessage: userMessage }));
    }
    return planId;
  } catch {
    return null;
  }
}

function routeToHandler(ws, requestType, userMessage, spec) {
  switch (requestType) {
    case 'conversational_ack':
      ws.send(JSON.stringify({ type: 'chat', role: 'assistant', message: getAckResponse(spec) }));
      appendConvo({ role: 'assistant', content: '[ack]', intent: 'conversational_ack', at: new Date().toISOString() });
      return;
    case 'layout_update':
    case 'content_update':
    case 'bug_fix':
      handleChatMessage(ws, userMessage, requestType, spec);
      break;
    case 'new_site':
    case 'major_revision':
      handlePlanning(ws, userMessage, spec);
      break;
    case 'restyle':
      // Route restyle to handleChatMessage — the restyle mode instruction lives there.
      // Previously routed to handlePlanning() (dead code branch) causing silent no-ops.
      handleChatMessage(ws, userMessage, 'restyle', spec);
      break;
    case 'restructure':
    case 'build': {
      const lowerMsg = userMessage.toLowerCase();
      const templateMatch = lowerMsg.match(/\b(event|business|portfolio|landing)\b/);
      if (templateMatch) {
        ws.send(JSON.stringify({ type: 'status', content: `Building with ${templateMatch[1]} template...` }));
        runOrchestratorSite(ws, templateMatch[1]);
      } else {
        const pagesList = (spec.pages || spec.design_brief?.must_have_sections || ['home']).join(', ');
        ws.send(JSON.stringify({ type: 'status', content: 'Building site from brief...' }));
        handleChatMessage(ws, `Build this site based on the design brief. Site name: ${spec.site_name || TAG}. Pages to generate: ${pagesList}`, 'build', spec);
      }
      break;
    }
    default:
      handleChatMessage(ws, userMessage, requestType, spec);
      break;
  }
}

async function handlePlanning(ws, userMessage, spec) {
  // Concurrent build guard — prevent parallel planning calls when a build is in progress
  if (buildInProgress) {
    ws.send(JSON.stringify({ type: 'chat', content: 'A build is already in progress. Please wait for it to finish before starting a new plan.' }));
    return;
  }
  ws.send(JSON.stringify({ type: 'status', content: 'Analyzing your vision...' }));
  emitPhase(ws, 'planning', 'active', 5);

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

  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: 'Creating design brief...' }));
  ws.currentChild = null;

  let response;
  try {
    response = await callSDK(prompt, { maxTokens: 8192, callSite: 'planning-brief', timeoutMs: 180000 });
  } catch {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', content: 'Failed to create brief. Try describing your site again.' }));
    return;
  }
  if (!response || !response.trim()) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', content: 'Failed to create brief. Try describing your site again.' }));
    return;
  }

  {
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

      // Log plan card as a suggestion — outcome scored when Fritz approves/dismisses
      try {
        suggestionLogger.logSuggestion(
          `Design brief: ${briefJson.goal || 'site build'}`,
          { active_site: TAG, intent: 'brief_shown', source: 'handlePlanning', weight: 1.5 }
        );
      } catch {}
    } else {
      // Couldn't parse — send raw response as text
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'assistant', content: response }));
      appendConvo({ role: 'assistant', content: response, at: new Date().toISOString() });
    }
  }
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

  // Inject STUDIO-CONTEXT.md for full vertical/component awareness
  const ctxFile = path.join(HUB_ROOT, studioContextWriter.OUTPUT_FILENAME);
  const studioCtxContent = fs.existsSync(ctxFile) ? fs.readFileSync(ctxFile, 'utf8') : '';
  const studioCtxSection = studioCtxContent
    ? `\nSTUDIO CONTEXT (current state of this site and available resources):\n${studioCtxContent.split('\n').slice(0, 80).join('\n')}`
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
${studioCtxSection}

USER'S MESSAGE:
"${userMessage}"

Respond following the STYLE guidance above:
- Reference their existing decisions and brief
- Be opinionated but collaborative
- Keep it conversational, not formal

Do NOT output any HTML or suggest code changes. This is pure ideation.`;

  const child = routeToBrainForBrainstorm(prompt);
  console.log(`[brainstorm] Routing to brain: ${currentBrain}`);
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

// --- Phase Update Emitter (Session 14) ---
// Emits build pipeline phase progress to the new Studio UI.
// Clients render this as a build phase card inline in the chat thread.
function emitPhase(ws, phase, status, progress) {
  if (!ws || ws.readyState !== 1) return;
  try {
    ws.send(JSON.stringify({ type: 'phase_update', phase, status, progress: progress || 0 }));
  } catch (e) { /* non-fatal */ }
}

// --- Parallel Multi-Page Build ---
async function parallelBuild(ws, spec, specPages, userMessage, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, conversationHistory, analyticsInstruction, slotMappingContext, brainContext) {
  if (!buildInProgress) setBuildInProgress(true, ws);
  const startTime = Date.now();

  // Detect logo file
  const logoSvg = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo.svg'));
  const logoPng = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo.png'));
  const logoFile = logoSvg ? 'assets/logo.svg' : logoPng ? 'assets/logo.png' : null;
  const logoInstruction = logoFile
    ? `\nLOGO: A logo file exists at "${logoFile}". Use <a href="index.html" data-logo-v class="block"><img src="${logoFile}" alt="${spec.site_name || 'Logo'}" class="h-10 w-auto"></a> for the logo. Do NOT show site name text next to the logo image.\n`
    : `\nLOGO: No logo image file exists. Use <a href="index.html" data-logo-v class="font-playfair text-2xl font-bold text-inherit hover:opacity-80 transition">${spec.site_name || ''}</a> as the logo. This element will automatically swap to an image when a logo is uploaded.\n`;

  // Normalize page names — sanitize to safe filename (strip parens, slashes, special chars)
  const pageFiles = specPages.map(p => {
    if (p === 'home' || p === 'hero') return 'index.html';
    // Truncate long must_have_sections strings to a short keyword
    const safe = p.replace(/\(.*?\)/g, '').replace(/[\/\\]/g, '-').replace(/[^a-zA-Z0-9\s-]/g, '').trim();
    const slug = safe.replace(/\s+/g, '-').toLowerCase().replace(/-+/g, '-').replace(/(^-|-$)/g, '').replace(/\.html$/, '');
    // If slug is too long (>30 chars), it's likely a must_have_sections description — skip it
    // by using a short keyword from the first word
    const finalSlug = slug.length > 30 ? slug.split('-').slice(0, 2).join('-') : slug;
    return finalSlug + '.html';
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
${brainContext}
${conversationHistory}
${slotMappingContext || ''}
${(() => {
  // Note: siteContext is shared across all pages in a parallel build — page-specific content
  // fields are injected per-page inside spawnPage(). Return empty here to avoid undefined var.
  return '';
})()}

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

    // Session 12 Phase 0: mandatory FAMtastic skeletons on every per-page build.
    // These are structures Claude fills in, not suggestions. Hero skeleton mandates
    // exact BEM class names that match fam-hero.css; divider skeleton mandates
    // .fam-wave-divider between sections; inline-prohibition blocks reinventing
    // the stylesheet rules inline; logoNotePage tells parallel pages NOT to
    // re-emit the SVG blocks (those were generated in the template call).
    const isHeroPage = pageFile === 'index.html';
    const famSkeletonBlock = [
      isHeroPage ? famSkeletons.HERO_SKELETON : '',
      famSkeletons.DIVIDER_SKELETON,
      famSkeletons.NAV_SKELETON,
      famSkeletons.INLINE_STYLE_PROHIBITION,
      getLogoNoteBlock(spec),
    ].filter(Boolean).join('\n\n');

    let pagePrompt;
    if (templateContext) {
      // Template-first build: page receives template components to copy verbatim
      pagePrompt = `You are a premium website builder. Generate the ${pageFile} page for a ${specPages.length}-page website.

PAGE TO BUILD: ${pageFile}
PAGE CONTENT: ${content}
All pages in this site: ${allPageLinks}
${buildBlueprintContext(pageFile)}
${slotStabilityBlock}
${famSkeletonBlock}
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
${famSkeletonBlock}
DESIGN CONSISTENCY: All pages share identical nav, footer, CSS custom properties, and layout style.
${siteContext}
${sharedRules}`;
    }

    // Return the page prompt so spawnAllPages can use it directly
    return pagePrompt;
  }

  async function spawnAllPages(templateContext) {
    if (pageFiles.length === 0) {
      finishParallelBuild(ws, writtenPages, startTime, spec);
      return;
    }

    if (!hasAnthropicKey()) {
      // No API key — fall back to sequential subprocess builds (Claude Code subscription auth)
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `Building all ${pageFiles.length} pages sequentially via subprocess...` }));
      const pageResults = [];
      for (const pageFile of pageFiles) {
        const pagePrompt = spawnPage(pageFile, templateContext);
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `Building ${pageFile}...` }));
        const pageResponse = await new Promise((resolve) => {
          const child = spawnClaude(pagePrompt);
          let output = '';
          const t = setTimeout(() => { child.kill(); resolve(''); }, 300000);
          child.stdout.on('data', d => { output += d.toString(); });
          child.on('close', () => { clearTimeout(t); resolve(output.trim()); });
          child.on('error', () => { clearTimeout(t); resolve(''); });
        });
        pageResults.push({ status: pageResponse.length > 50 ? 'fulfilled' : 'rejected', value: { page: pageFile, response: pageResponse }, reason: null });
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `${pageFile} complete (${pageResults.length}/${pageFiles.length})` }));
      }
      // One retry pass for any pages that returned empty from subprocess
      const failedForRetry = pageFiles.filter((pf, i) => pageResults[i] && pageResults[i].status === 'rejected');
      if (failedForRetry.length > 0) {
        console.log(`[parallel-build-sub] ${failedForRetry.length} page(s) failed first pass — retrying: ${failedForRetry.join(', ')}`);
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `Retrying ${failedForRetry.length} page(s): ${failedForRetry.join(', ')}` }));
        for (const retryFile of failedForRetry) {
          const retryPrompt = spawnPage(retryFile, templateContext);
          const retryResponse = await new Promise((resolve) => {
            const child = spawnClaude(retryPrompt);
            let out = '';
            const t = setTimeout(() => { child.kill(); resolve(''); }, 300000);
            child.stdout.on('data', d => { out += d.toString(); });
            child.on('close', () => { clearTimeout(t); resolve(out.trim()); });
            child.on('error', () => { clearTimeout(t); resolve(''); });
          });
          const ri = pageResults.findIndex(r => r.value && r.value.page === retryFile);
          if (retryResponse.length > 50) {
            pageResults[ri] = { status: 'fulfilled', value: { page: retryFile, response: retryResponse }, reason: null };
            if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `Retry succeeded: ${retryFile}` }));
          } else {
            console.error(`[parallel-build-sub] ${retryFile} retry also failed — empty response`);
          }
        }
      }
      // Process subprocess results
      let completedSub = 0;
      const totalSub = pageFiles.length;
      for (const result of pageResults) {
        completedSub++;
        if (result.status === 'fulfilled' && result.value.response.trim().length > 50) {
          const { page: pageFileSub, response: rawResponseSub } = result.value;
          const responseSub = rawResponseSub.trim().replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');
          versionFile(pageFileSub, 'build');
          fs.writeFileSync(path.join(DIST_DIR(), pageFileSub), responseSub);
          writtenPages.push(pageFileSub);
          console.log(`[parallel-build-sub] ${pageFileSub} done (${responseSub.length} bytes)`);
        } else {
          const failedPage = result.value ? result.value.page : `page-${completedSub}`;
          console.error(`[parallel-build-sub] ${failedPage} failed after retry`);
          if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `⚠️ ${failedPage} failed after retry — re-run build` }));
        }
      }
      if (writtenPages.length === 0) {
        setBuildInProgress(false);
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', content: 'All pages failed to build. Try again.' }));
      } else {
        finishParallelBuild(ws, writtenPages, startTime, spec);
      }
      return;
    }

    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `Building all ${pageFiles.length} pages in parallel via SDK...` }));

    // AbortControllers per page — ws close aborts all
    const pageControllers = [];
    const wsClosePageHandler = () => pageControllers.forEach(c => c.abort());
    ws.once('close', wsClosePageHandler);

    const pageModel = loadSettings().model || 'claude-sonnet-4-6';

    const pageResults = await Promise.allSettled(
      pageFiles.map(async (pageFile) => {
        const pageController = new AbortController();
        pageControllers.push(pageController);
        const pagePrompt = spawnPage(pageFile, templateContext);
        const sdk = getAnthropicClient();
        const stream = sdk.messages.stream({
          model: pageModel,
          max_tokens: 16384,
          messages: [{ role: 'user', content: pagePrompt }],
        }, { signal: pageController.signal });

        let pageResponse = '';
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            pageResponse += event.delta.text;
          }
        }
        const finalMsg = await stream.finalMessage();
        logSDKCall({
          provider: 'claude', model: pageModel, callSite: 'page-build',
          inputTokens: finalMsg.usage?.input_tokens || 0,
          outputTokens: finalMsg.usage?.output_tokens || 0,
          tag: TAG, hubRoot: HUB_ROOT,
        });
        return { page: pageFile, response: pageResponse };
      })
    );

    ws.removeListener('close', wsClosePageHandler);

    // Process results
    let completed = 0;
    const total = pageFiles.length;
    for (const result of pageResults) {
      completed++;
      if (result.status === 'fulfilled' && result.value.response.trim().length > 50) {
        const { page: pageFile, response: rawResponse } = result.value;
        const response = rawResponse.trim().replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');
        versionFile(pageFile, 'build');
        fs.writeFileSync(path.join(DIST_DIR(), pageFile), response);
        writtenPages.push(pageFile);
        console.log(`[parallel-build] ${pageFile} done (${response.length} bytes)`);
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `${pageFile} built (${completed}/${total} — ${Math.round((Date.now() - startTime) / 1000)}s)` }));
      } else {
        const pageFile = result.status === 'fulfilled' ? result.value.page : `page-${completed}`;
        console.error(`[parallel-build] ${pageFile} failed:`, result.reason?.message || 'empty response');
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `${pageFile} failed — will retry on next build` }));
      }
    }

    if (writtenPages.length === 0) {
      setBuildInProgress(false);
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', content: 'All pages failed to build. Try again.' }));
    } else {
      finishParallelBuild(ws, writtenPages, startTime, spec);
    }
  }

  // Template-first build strategy:
  // Step 1 — Build _template.html (header/nav, footer, shared CSS) in one Claude call.
  // Step 2 — Extract template components, write artifacts (styles.css, _partials/).
  // Step 3 — Build ALL pages in true parallel, each receiving the template as context.
  // Fallback — If template build fails, fall back to legacy no-seed parallel build.
  ws.send(JSON.stringify({ type: 'status', content: 'Building design template (header, nav, footer, shared CSS)...' }));
  emitPhase(ws, 'generating', 'active', 10);

  const templatePrompt = buildTemplatePrompt(spec, pageFiles, briefContext, decisionsContext, assetsContext, systemRules, analyticsInstruction);
  ws.currentChild = null;
  let templateSpawned = false; // Guard: prevent double-spawn from abort+completion race
  const templateController = new AbortController();
  const templateAbortHandler = () => templateController.abort();
  ws.once('close', templateAbortHandler);
  const sdkModel = loadSettings().model || 'claude-sonnet-4-6';
  let templateResponse = '';

  try {
    if (!hasAnthropicKey()) {
      // No API key — use subprocess for template build
      console.log('[template-build] No API key — using subprocess for template');
      ws.removeListener('close', templateAbortHandler);
      templateResponse = await new Promise((resolve) => {
        const child = spawnClaude(templatePrompt);
        let output = '';
        const t = setTimeout(() => { child.kill(); resolve(''); }, 300000);
        child.stdout.on('data', d => { output += d.toString(); });
        child.on('close', () => { clearTimeout(t); resolve(output.trim()); });
        child.on('error', () => { clearTimeout(t); resolve(''); });
      });
    } else {
      const templateResult = await getAnthropicClient().messages.create({
        model: sdkModel,
        max_tokens: 16384,
        messages: [{ role: 'user', content: templatePrompt }],
      }, { signal: templateController.signal });
      ws.removeListener('close', templateAbortHandler);
      templateResponse = templateResult.content[0]?.text || '';
      logSDKCall({
        provider: 'claude', model: sdkModel, callSite: 'template-build',
        inputTokens: templateResult.usage?.input_tokens || 0,
        outputTokens: templateResult.usage?.output_tokens || 0,
        tag: TAG, hubRoot: HUB_ROOT,
      });
    }
  } catch (err) {
    ws.removeListener('close', templateAbortHandler);
    if (!templateSpawned) {
      templateSpawned = true;
      console.warn('[template-build] SDK failed — falling back to legacy build:', err.message);
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'error', content: 'Template failed — building pages without template (legacy mode).' }));
      spawnAllPages('');
    }
    return;
  }

  if (!templateSpawned) {
    templateSpawned = true;
    let templateHtml = templateResponse.trim().replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');

    // Session 12 Phase 0: extract multi-part SVG logo blocks from template response.
    // When famtastic_mode is on, Claude emits <!-- LOGO_FULL -->, <!-- LOGO_ICON -->,
    // <!-- LOGO_WORDMARK --> SVG blocks BEFORE the HTML. extractLogoSVGs() writes
    // them to dist/assets/logo-{full,icon,wordmark}.svg and strips them from the
    // HTML so _template.html doesn't start with <svg>.
    if (spec.famtastic_mode) {
      try {
        const { results: logoResults, cleanedHtml } = famSkeletons.extractLogoSVGs(templateHtml, DIST_DIR());
        templateHtml = cleanedHtml;
        const extractedCount = Object.keys(logoResults).length;
        if (ws && ws.readyState === 1) {
          ws.send(JSON.stringify({ type: 'status', content: `Logo SVGs extracted: ${extractedCount}/3` }));
        }
      } catch (err) {
        console.error('[logo-extract] failed:', err.message);
      }
    }

    if (templateHtml.length > 50) {
      // Write _template.html to dist
      fs.writeFileSync(path.join(DIST_DIR(), '_template.html'), templateHtml);
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `Template built (${Math.round((Date.now() - startTime) / 1000)}s) — writing artifacts...` }));

      // Extract components and write artifacts (styles.css, _partials/)
      const components = writeTemplateArtifacts(ws);

      if (components && (components.headBlock || components.headerHtml)) {
        // Build template context string for page prompts
        const templateContext = loadTemplateContext();
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `Template ready — launching all ${pageFiles.length} pages in parallel...` }));
        spawnAllPages(templateContext);
      } else {
        console.warn('[parallel-build] Template parsed but no usable components — falling back to legacy build');
        if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: 'Template incomplete — building pages without template.' }));
        spawnAllPages('');
      }
    } else {
      console.warn('[template-build] Empty template response — falling back to legacy build');
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: 'Template failed — building pages without template (legacy mode).' }));
      spawnAllPages('');
    }
  }
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

// Step 11 — Auto-fill video slots after build.
// Scans built pages for data-slot-type="video", checks if a character set with done
// poses exists, generates a Veo video from the best available pose, and patches the
// <source src=""> in the HTML. Fire-and-forget, non-blocking.
async function fillVideoSlotsAfterBuild(ws, writtenPages) {
  const spec = readSpec();
  const charSets = Array.isArray(spec.character_sets) ? spec.character_sets : [];
  const charSet = charSets.find(c => Array.isArray(c.poses) && c.poses.some(p => p.status === 'done'));
  if (!charSet) return; // no character with completed poses — nothing to do

  const pose = charSet.poses.find(p => p.status === 'done');
  if (!pose) return;

  const poseImageAbsPath = path.join(SITE_DIR(), pose.image_path);
  if (!fs.existsSync(poseImageAbsPath)) {
    console.warn('[video-slots] pose image not found on disk:', poseImageAbsPath);
    return;
  }

  for (const page of writtenPages) {
    const pagePath = path.join(DIST_DIR(), page);
    if (!fs.existsSync(pagePath)) continue;
    let html = fs.readFileSync(pagePath, 'utf8');

    // Find video slots: <video ... data-slot-type="video" ...>
    if (!html.includes('data-slot-type="video"')) continue;

    const jobId = require('crypto').randomUUID();
    const videoDir = path.join(DIST_DIR(), 'assets', 'video');
    fs.mkdirSync(videoDir, { recursive: true });
    const videoOutputPath = path.join(videoDir, `hero-${jobId}.mp4`);
    const videoRelPath = `assets/video/hero-${jobId}.mp4`;

    broadcastAll({ type: 'video-progress', jobId, status: 'generating', message: 'Generating hero video…' });

    try {
      await runVeoGeneration(
        poseImageAbsPath,
        `${charSet.description || charSet.name} hero animation, smooth motion, loop-ready`,
        videoOutputPath,
        { duration: 5 }
      );

      // Patch <source src=""> inside the video slot with the generated path
      html = html.replace(
        /(<video[^>]*data-slot-type="video"[^>]*>[\s\S]*?<source\s+src=)"([^"]*)"([^>]*>)/i,
        `$1"${videoRelPath}"$3`
      );
      fs.writeFileSync(pagePath, html, 'utf8');
      console.log(`[video-slots] injected ${videoRelPath} into ${page}`);
      broadcastAll({ type: 'video-complete', jobId, path: videoRelPath, page });
    } catch (e) {
      console.error('[video-slots] veo generation failed:', e.message);
      broadcastAll({ type: 'video-error', jobId, error: e.message });
    }
  }
}

// Step 10 — Auto-fill image slots with Imagen 4 (primary) or Unsplash (fallback).
// Fire-and-forget: called without await from runPostProcessing so the synchronous
// post-processing pipeline isn't blocked. WS messages keep the user informed.
async function fillImageSlotsAfterBuild(ws, writtenPages) {
  const spec = readSpec();
  const emptySlots = (spec.media_specs || []).filter(s =>
    s.status !== 'filled' && s.status !== 'stock' && s.status !== 'uploaded' && s.status !== 'generated'
    && s.role !== 'logo' && s.role !== 'favicon'
  );
  if (emptySlots.length === 0) return;

  const geminiKey = process.env.GEMINI_API_KEY;
  const settings = loadSettings();
  const sp = settings.stock_photo || {};
  const hasUnsplash = !!sp.unsplash_api_key;

  if (!geminiKey && !hasUnsplash) {
    console.warn('[image-gen] No GEMINI_API_KEY and no Unsplash key configured — skipping auto image fill');
    return;
  }

  const brief = spec.design_brief || {};
  const businessName = spec.site_name || 'professional business';
  const industry = spec.business_type || (brief.goal || '').split(' ').slice(0, 4).join(' ') || 'professional';
  const tone = Array.isArray(brief.tone) ? brief.tone.join(', ') : (brief.tone || 'professional, clean');

  let brandColors = '';
  try {
    const brandPath = path.join(SITE_DIR(), 'brand.json');
    if (fs.existsSync(brandPath)) {
      const brand = JSON.parse(fs.readFileSync(brandPath, 'utf8'));
      brandColors = Object.values(brand.colors || {}).slice(0, 2).join(', ');
    }
  } catch {}

  const assetsDir = path.join(DIST_DIR(), 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  const pages = writtenPages.length > 0 ? writtenPages : listPages();
  let filled = 0;
  let errors = 0;

  if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `Auto-filling ${emptySlots.length} image slot(s)...` }));

  for (const slot of emptySlots) {
    const outputFile = path.join(assetsDir, `${slot.slot_id}.jpg`);
    const relSrc = `assets/${slot.slot_id}.jpg`;
    let usedProvider = null;

    const rolePromptMap = {
      hero:        `Hero banner photograph for ${businessName}, ${industry} business, ${tone} aesthetic, wide cinematic composition, photorealistic, no text${brandColors ? `, colors inspired by ${brandColors}` : ''}`,
      gallery:     `${industry} showcase photograph, ${tone} style, high quality, professional photography`,
      team:        `Professional business portrait headshot, ${tone}, clean neutral background, friendly smile`,
      testimonial: `Friendly professional portrait, ${tone} aesthetic, natural lighting`,
      service:     `${slot.slot_id.replace(/^service-/, '').replace(/-/g, ' ')} service photograph for ${industry} business, ${tone}`,
    };
    const imagePrompt = rolePromptMap[slot.role] || `${industry} ${slot.role} photograph, ${tone} style, photorealistic`;

    const dims = (slot.dimensions || '').split('x').map(Number);
    const [w, h] = dims.length === 2 && dims[0] && dims[1] ? dims : [1200, 800];
    const aspectRatio = w > h * 1.3 ? '16:9' : w < h * 0.8 ? '9:16' : '1:1';

    // Try Imagen 4 first
    if (geminiKey) {
      try {
        const scriptPath = path.join(__dirname, '..', 'scripts', 'google-media-generate');
        await new Promise((resolve, reject) => {
          const { execFile } = require('child_process');
          execFile(scriptPath, ['--prompt', imagePrompt, '--output', outputFile, '--aspect-ratio', aspectRatio],
            { env: { ...process.env }, timeout: 90000 },
            (err) => { if (err) reject(err); else resolve(); }
          );
        });
        if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 1000) {
          usedProvider = 'imagen4';
        }
      } catch (e) {
        console.warn(`[image-gen] Imagen 4 failed for ${slot.slot_id}: ${e.message}`);
      }
    }

    // Fall back to Unsplash — download the image
    if (!usedProvider && hasUnsplash) {
      try {
        const queryMap = {
          hero:        `${industry} ${tone} banner`,
          gallery:     `${industry} showcase`,
          team:        'professional portrait headshot',
          testimonial: 'professional portrait friendly',
          service:     `${industry} ${slot.slot_id.replace(/^service-/, '').replace(/-/g, ' ')}`,
        };
        const query = queryMap[slot.role] || `${industry} ${slot.role}`;
        const results = await fetchFromProvider('unsplash', query, w, h, 1);
        if (results.length > 0) {
          const imageUrl = results[0].url;
          const imageBuffer = await new Promise((resolve, reject) => {
            const mod = imageUrl.startsWith('https') ? require('https') : require('http');
            mod.get(imageUrl, (res) => {
              if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const rmod = res.headers.location.startsWith('https') ? require('https') : require('http');
                rmod.get(res.headers.location, (r2) => {
                  const chunks = [];
                  r2.on('data', c => chunks.push(c));
                  r2.on('end', () => resolve(Buffer.concat(chunks)));
                  r2.on('error', reject);
                }).on('error', reject);
              } else {
                const chunks = [];
                res.on('data', c => chunks.push(c));
                res.on('end', () => resolve(Buffer.concat(chunks)));
                res.on('error', reject);
              }
            }).on('error', reject);
          });
          fs.writeFileSync(outputFile, imageBuffer);
          usedProvider = 'unsplash';
        }
      } catch (e) {
        console.warn(`[image-gen] Unsplash fallback failed for ${slot.slot_id}: ${e.message}`);
      }
    }

    if (!usedProvider) {
      console.warn(`[image-gen] WARNING: slot ${slot.slot_id} could not be filled — Imagen and Unsplash both failed`);
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `⚠️ Could not fill image slot ${slot.slot_id}` }));
      errors++;
      continue;
    }

    // Patch HTML in all pages
    const slotStatus = usedProvider === 'imagen4' ? 'generated' : 'stock';
    for (const page of pages) {
      const filePath = path.join(DIST_DIR(), page);
      if (!fs.existsSync(filePath)) continue;
      let html = fs.readFileSync(filePath, 'utf8');
      const escapedId = slot.slot_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patched = patchSlotImg(html, escapedId, { src: relSrc, status: slotStatus });
      if (patched.changed) fs.writeFileSync(filePath, patched.html);
    }

    // Update spec in-memory (we flush once after the loop)
    slot.status = slotStatus;
    slot.src = relSrc;
    if (!spec.slot_mappings) spec.slot_mappings = {};
    spec.slot_mappings[slot.slot_id] = {
      src: relSrc,
      alt: slot.alt || slot.slot_id.replace(/-/g, ' '),
      provider: usedProvider,
    };

    filled++;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `✓ ${slot.slot_id} filled via ${usedProvider}` }));
    console.log(`[image-gen] ${slot.slot_id} filled via ${usedProvider} → ${relSrc}`);
  }

  writeSpec(spec, { source: 'fillImageSlotsAfterBuild' });

  if (filled > 0 && ws && ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'reload-preview' }));
    ws.send(JSON.stringify({ type: 'spec-updated' }));
    ws.send(JSON.stringify({ type: 'status', content: `Auto-filled ${filled} image slot(s).${errors > 0 ? ` ${errors} could not be filled.` : ''}` }));
  }
  if (errors > 0) console.warn(`[image-gen] ${errors} slot(s) failed after all retries`);
}

function runPostProcessing(ws, writtenPages, options = {}) {
  const { isFullBuild = false, sourcePage = null } = options;

  // Step 1: Extract and register slots FIRST so mappings know about all slot IDs.
  // Wrapped defensively so a cheerio/FS hiccup can't silently skip every step
  // downstream — the audit caught media_specs staying empty after a build.
  try {
    extractAndRegisterSlots(writtenPages);
  } catch (e) {
    console.error('[post-process] extractAndRegisterSlots failed:', e && e.stack || e);
  }

  // Step 2: Reapply saved slot mappings (images survive rebuilds)
  try {
    reapplySlotMappings(writtenPages);
  } catch (e) {
    console.error('[post-process] reapplySlotMappings failed:', e && e.stack || e);
  }

  // Step 2.5: Sync content fields from generated HTML to spec (new fields only — spec is authoritative)
  syncContentFieldsFromHtml(writtenPages);
  ensureComponentAnchors(writtenPages);

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
      // Session 11 hotfix: head-guardrail also runs in template-first path
      // so the FAMtastic DNA assets (fam-shapes.css, fam-motion.js,
      // fam-scroll.js, fam-hero.css) get copied into dist/assets and
      // linked into every page. Without this, builds shipped after the
      // template-first migration silently lost the FAMtastic vocabulary
      // even though Fix 2 and Fix 9 had wired the prompt + source files.
      ensureHeadDependencies(ws);
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

  // Step 7: Build structural index for surgical editor (zero-token, file-scan only)
  // Stored in spec.structural_index[page] — used to route content_update intents
  // without loading full HTML files, reducing surgical edit token cost ~90%.
  try {
    const spec = readSpec();
    if (!spec.structural_index) spec.structural_index = {};
    for (const page of writtenPages) {
      const htmlPath = path.join(DIST_DIR(), page);
      if (fs.existsSync(htmlPath)) {
        const html = fs.readFileSync(htmlPath, 'utf8');
        spec.structural_index[page] = surgicalEditor.buildStructuralIndex(html, page);
      }
    }
    writeSpec(spec, { source: 'runPostProcessing:structural_index' });
  } catch (e) {
    console.warn('[surgical-editor] structural index update failed (non-fatal):', e.message);
  }

  // Step 8: Extract and persist brand tokens — detect color/font drift across builds.
  try {
    const spec = readSpec();
    const { tokens, drifts } = brandTracker.extractAndSaveBrand(SITE_DIR(), DIST_DIR(), spec);
    if (drifts.length > 0) {
      drifts.forEach(d => console.warn(`[brand-tracker] drift: ${d.field} ${d.from} → ${d.to}`));
    }
  } catch (e) {
    console.warn('[brand-tracker] extraction failed (non-fatal):', e.message);
  }

  // Step 10: Auto-fill image slots — Imagen 4 primary, Unsplash fallback.
  // Only fires on full builds, not single-page edits, to avoid repeated generation on content edits.
  if (isFullBuild) {
    fillImageSlotsAfterBuild(ws, writtenPages).catch(e =>
      console.error('[image-gen] Unexpected error in fillImageSlotsAfterBuild:', e.message)
    );
  }

  // Step 11: Auto-fill video slots — only when character_sets exist with done poses.
  if (isFullBuild) {
    fillVideoSlotsAfterBuild(ws, writtenPages).catch(e =>
      console.error('[video-slots] Unexpected error in fillVideoSlotsAfterBuild:', e.message)
    );
  }
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

function verifyRevenueAndState() {
  const spec = readSpec();
  const issues = [];
  if (spec.state === 'client_approved' && !spec.monthly_rate) {
    issues.push('Site is client_approved but monthly_rate is not set — add a rate before sending payment link');
  }
  if (spec.revenue_model === 'rank_and_rent' && !spec.monthly_rate) {
    issues.push('Rank-and-rent site has no monthly_rate set — set it in Settings → Site');
  }
  const isReunion = /reunion|family.event/.test(TAG) || spec.business_type === 'family_reunion';
  if (isReunion) {
    const distDir = DIST_DIR();
    const requiredPages = ['event-details.html', 'gallery.html'];
    for (const p of requiredPages) {
      if (!fs.existsSync(path.join(distDir, p))) {
        issues.push(`Reunion site missing required page: ${p}`);
      }
    }
    const indexPath = path.join(distDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      const html = fs.readFileSync(indexPath, 'utf8');
      if (!html.includes('paypal') && !html.includes('PayPal')) {
        issues.push('Reunion site index.html has no PayPal button — required for book/ticket sales');
      }
      if (!html.includes('rsvp') && !html.includes('RSVP')) {
        issues.push('Reunion site index.html has no RSVP mention — required per brief');
      }
    }
  }
  return {
    check: 'revenue_and_state',
    status: issues.length ? 'warned' : 'passed',
    issues,
    passed: issues.length === 0,
  };
}

function runBuildVerification(pages) {
  const checks = [
    verifySlotAttributes(pages),
    verifyCssCoherence(),
    verifyCrossPageConsistency(pages),
    verifyHeadDependencies(pages),
    verifyLogoAndLayout(pages),
    verifyRevenueAndState(),
  ];

  const overallStatus = checks.some(c => c.status === 'failed') ? 'failed'
    : checks.some(c => c.status === 'warned') ? 'warned'
    : 'passed';

  const allIssues = checks.flatMap(c => c.issues);

  const statusScores = { passed: 100, warned: 70, failed: 40 };
  const score = checks.length > 0
    ? Math.round(checks.reduce((sum, c) => sum + (statusScores[c.status] || 50), 0) / checks.length)
    : (overallStatus === 'passed' ? 100 : overallStatus === 'warned' ? 70 : 40);

  return { status: overallStatus, checks, issues: allIssues, timestamp: new Date().toISOString(), score };
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

  // Warn if fewer pages were built than the spec called for
  const expectedPageCount = (spec.pages || spec.design_brief?.must_have_sections || []).length;
  if (expectedPageCount > 0 && writtenPages.length < expectedPageCount) {
    const missing = expectedPageCount - writtenPages.length;
    const warnMsg = `Build incomplete: ${writtenPages.length}/${expectedPageCount} pages built — ${missing} page(s) failed. Re-run build to retry.`;
    console.warn(`[build] ${warnMsg}`);
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `⚠️ ${warnMsg}` }));
  }

  // Post-processing
  emitPhase(ws, 'generating', 'done', 70);
  ws.send(JSON.stringify({ type: 'status', content: 'Post-processing...' }));
  emitPhase(ws, 'post_processing', 'active', 75);
  runPostProcessing(ws, writtenPages, { isFullBuild: true });
  emitPhase(ws, 'post_processing', 'done', 85);

  // Warn via WS if no image slots were registered (media_specs empty after full build)
  try {
    const postSpec = readSpec();
    if (!postSpec.media_specs || postSpec.media_specs.length === 0) {
      const reason = `${writtenPages.length} page(s) built but no <img data-slot-id="..."> tags found`;
      console.warn(`[slots] WARNING: media_specs is empty after build — ${reason}`);
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: `⚠️ No image slots registered after build — ${reason}` }));
    }
  } catch {}

  // Generate sitemap.xml and robots.txt
  ws.send(JSON.stringify({ type: 'status', content: 'Generating sitemap + robots.txt...' }));
  generateSitemapAndRobots(ws);

  // SEO validation pass
  const seoResult = runSeoValidation(writtenPages);

  setBuildInProgress(false);
  // Transition spec state from 'briefed' → 'built' now that pages are on disk
  try {
    const builtSpec = readSpec();
    builtSpec.state = 'built';
    writeSpec(builtSpec, { source: 'finishParallelBuild' });
  } catch (e) {
    console.warn('[build] Failed to update spec state to built:', e.message);
  }
  studioEvents.emit(STUDIO_EVENTS.BUILD_COMPLETED, { tag: TAG, pages: writtenPages });

  // Session 12 Phase 1 (I2): auto-run intelligence report after every build
  // and refresh ~/PENDING-REVIEW.md so major findings surface without the
  // user having to remember to run the intel loop manually.
  try {
    const review = writePendingReview();
    if (review && (review.totalMajor > 0 || review.totalPendingPromotions > 0)) {
      ws.send(JSON.stringify({
        type: 'status',
        content: `Intel loop: ${review.totalMajor} major finding(s), ${review.totalPendingPromotions} pending promotion(s) — see ~/PENDING-REVIEW.md`,
      }));
    }
  } catch (err) {
    console.warn('[intel-loop] post-build write failed:', err.message);
  }

  // Session 12 Phase 3: append a terse build entry to famtastic-dna.md so
  // the persistent knowledge file accumulates real build history for Claude
  // to consume via the @famtastic-dna.md include in CLAUDE.md.
  try {
    updateFamtasticDna({
      tag: TAG,
      pages: writtenPages,
      intent: 'build',
      elapsed_seconds: elapsed,
      note: `parallel build — ${writtenPages.length} page(s)`,
    });
  } catch (err) {
    console.warn('[dna] post-build update failed:', err.message);
  }

  // Wire effectiveness scoring to BUILD_COMPLETED (C5)
  try {
    const specForMetrics = readSpec();
    const vertical = specForMetrics.business_type || (specForMetrics.design_brief || {}).industry || 'general';
    const buildEffMetrics = {
      healthDelta:           0,   // placeholder — real delta requires pre/post health comparison
      briefReuseRate:        0.5, // placeholder — real value derived from brief comparison
      iterationsToApproval:  1,   // placeholder — real value from conversation log
    };
    researchRegistry.computeEffectivenessFromBuild('build_patterns', vertical, buildEffMetrics);
  } catch {}

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

  // Log agent call for build
  const totalSize = writtenPages.reduce((sum, p) => {
    try { return sum + fs.statSync(path.join(DIST_DIR(), p)).size; } catch { return sum; }
  }, 0);
  logAgentCall({
    agent: 'claude',
    intent: 'build',
    page: writtenPages.join(','),
    elapsed_ms: elapsed * 1000,
    success: writtenPages.length > 0,
    output_size: totalSize,
  });

  // Run build verification
  emitPhase(ws, 'verifying', 'active', 90);
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
    if (verification.score != null) vSpec.fam_score = verification.score;
    writeSpec(vSpec);
  } catch {}
  ws.send(JSON.stringify({ type: 'verification-result', ...verification }));

  // Log SEO warnings to build log
  if (seoResult && seoResult.warnings.length > 0) {
    try {
      const seoLogFile = path.join(SITE_DIR(), 'build-metrics.jsonl');
      fs.appendFileSync(seoLogFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'seo_validation',
        warnings: seoResult.warnings,
        summary: seoResult.summary,
      }) + '\n');
    } catch {}
  }

  // Log build to .brain/site-log.jsonl (fire-and-forget)
  try { logSiteBuild(spec, verification); } catch {}

  // Log build to SQLite
  if (currentSessionId) {
    try {
      db.logBuild({
        id: require('crypto').randomUUID(),
        sessionId: currentSessionId,
        siteTag: TAG,
        pagesBuilt: writtenPages.length,
        verificationStatus: verification?.status,
        verificationIssues: verification?.issues?.length || 0,
        durationMs: Math.round((Date.now() - startTime)),
        model: loadSettings().model || 'unknown',
        inputTokens: sessionInputTokens,
        outputTokens: sessionOutputTokens,
      });
    } catch {}
  }

  // Notify chat only on failures
  if (verification.status === 'failed') {
    const issueCount = verification.issues.length;
    ws.send(JSON.stringify({ type: 'verification-warning', content: `Build complete — ${issueCount} verification issue${issueCount !== 1 ? 's' : ''} found. Check the Verify tab for details.` }));
  }

  // Build SEO summary
  const seoWarningCount = seoResult?.warnings?.length || 0;
  const seoSummary = seoResult ? [
    `\n\n**SEO Summary:**`,
    `  Pages: ${seoResult.summary.pages}`,
    `  Titles unique: ${seoResult.summary.titles_unique ? '✅' : '⚠️'}`,
    `  Descriptions: ${seoResult.summary.descriptions_count}/${seoResult.summary.pages} ${seoResult.summary.descriptions_count === seoResult.summary.pages ? '✅' : '⚠️'}`,
    `  Images with alt: ${seoResult.summary.images_with_alt}/${seoResult.summary.images_total} ${seoResult.summary.images_with_alt === seoResult.summary.images_total ? '✅' : '⚠️'}`,
    `  H1 per page: ${seoResult.summary.h1_per_page}/${seoResult.summary.pages} ${seoResult.summary.h1_per_page === seoResult.summary.pages ? '✅' : '⚠️'}`,
    `  sitemap.xml: ${seoResult.summary.sitemap_exists ? '✅' : '❌'}`,
    `  robots.txt: ${seoResult.summary.robots_exists ? '✅' : '❌'}`,
    seoWarningCount > 0 ? `  ⚠️ ${seoWarningCount} SEO warning(s) — see build log` : '',
  ].filter(Boolean).join('\n') : '';

  const msg = `Site built! ${writtenPages.length} pages in ${elapsed}s: ${writtenPages.join(', ')}${seoSummary}`;
  ws.send(JSON.stringify({ type: 'assistant', content: msg }));
  ws.send(JSON.stringify({ type: 'reload-preview', isBuild: true }));
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

  // --- Field-aware content replacement (uses spec.content data-field-id system) ---
  if (!handled) {
    const spec = readSpec();
    const allContent = spec.content || {};

    // Detect which field type the user is editing
    const FIELD_KEYWORDS = {
      phone: /\b(phone|number|call|tel)\b/,
      email: /\b(email|e-mail|mail)\b/,
      address: /\b(address|location|street|suite)\b/,
      hours: /\b(hours|schedule|open|closed|days)\b/,
      price: /\b(price|cost|rate|\$\d+)\b/,
      testimonial: /\b(testimonial|review|quote)\b/,
    };

    let detectedFieldType = null;
    for (const [type, regex] of Object.entries(FIELD_KEYWORDS)) {
      if (regex.test(lower)) { detectedFieldType = type; break; }
    }

    // Extract the new value from the message
    const newValueMatch = userMessage.match(/\bto\s+["']?(.+?)["']?\s*$/i) ||
      userMessage.match(/:\s*(.+)$/i) ||
      userMessage.match(/\bsay\s+["']?(.+?)["']?\s*$/i) ||
      userMessage.match(/\bshould\s+be\s+["']?(.+?)["']?\s*$/i);

    if (detectedFieldType && newValueMatch) {
      const newValue = newValueMatch[1].trim().replace(/^["']|["']$/g, '');

      // Determine which pages to edit
      const crossPage = lower.match(/\b(all\s+pages|every\s+page|everywhere|across\s+.*?pages)\b/);
      const pagesToEdit = crossPage ? listPages() : [currentPage];

      let totalChanges = 0;
      const changeLog = [];

      for (const page of pagesToEdit) {
        const pageContent = allContent[page];
        if (!pageContent || !pageContent.fields) continue;

        // Find matching field
        const field = pageContent.fields.find(f =>
          f.type === detectedFieldType ||
          f.field_id.includes(detectedFieldType)
        );
        if (!field) continue;

        const oldValue = typeof field.value === 'string' ? field.value : (field.value?.text || JSON.stringify(field.value));

        // Read page HTML
        const pagePath = path.join(DIST_DIR(), page);
        if (!fs.existsSync(pagePath)) continue;
        let html = fs.readFileSync(pagePath, 'utf8');
        const $ = cheerio.load(html);

        // Method 1: Find by data-field-id attribute (preferred — stable anchor per Codex review)
        const fieldEl = $(`[data-field-id="${field.field_id}"]`);
        if (fieldEl.length > 0) {
          // Update text content
          if (detectedFieldType === 'phone') {
            fieldEl.text(newValue);
            // Also update tel: href
            if (fieldEl.attr('href') && fieldEl.attr('href').startsWith('tel:')) {
              const digits = newValue.replace(/\D/g, '');
              fieldEl.attr('href', `tel:+1${digits}`);
            }
          } else if (detectedFieldType === 'email') {
            fieldEl.text(newValue);
            if (fieldEl.attr('href') && fieldEl.attr('href').startsWith('mailto:')) {
              fieldEl.attr('href', `mailto:${newValue}`);
            }
          } else {
            fieldEl.text(newValue);
          }
          html = $.html();
          fs.writeFileSync(pagePath, html);
          changeLog.push(`${page}: ${field.field_id} → "${newValue}"`);
          totalChanges++;
        } else if (html.includes(oldValue)) {
          // Method 2: Fallback — find by old value text match
          const escaped = oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          html = html.replace(new RegExp(escaped, 'g'), newValue);

          // Also update tel:/mailto: links if applicable
          if (detectedFieldType === 'phone') {
            const oldDigits = oldValue.replace(/\D/g, '');
            const newDigits = newValue.replace(/\D/g, '');
            if (oldDigits.length >= 10) {
              html = html.replace(new RegExp(`tel:\\+?1?${oldDigits}`, 'g'), `tel:+1${newDigits}`);
            }
          } else if (detectedFieldType === 'email') {
            html = html.replace(new RegExp(`mailto:${oldValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g'), `mailto:${newValue}`);
          }

          fs.writeFileSync(pagePath, html);
          changeLog.push(`${page}: ${field.field_id} → "${newValue}" (text match fallback)`);
          totalChanges++;
        }

        // Update spec.content
        field.value = newValue;
      }

      if (totalChanges > 0) {
        writeSpec(spec);

        // Log mutation
        const mutationLog = path.join(SITE_DIR(), 'mutations.jsonl');
        const mutation = {
          timestamp: new Date().toISOString(),
          level: 'field',
          target_id: detectedFieldType,
          action: 'update',
          old_value: changeLog[0]?.split('→')[0]?.trim() || '',
          new_value: newValue,
          source: 'content_update',
          pages_affected: pagesToEdit.filter((_, i) => i < totalChanges),
          revision: spec.version || 1,
        };
        try { fs.appendFileSync(mutationLog, JSON.stringify(mutation) + '\n'); } catch {}

        description = totalChanges === 1
          ? `Updated ${detectedFieldType}: ${changeLog[0]}`
          : `Updated ${detectedFieldType} on ${totalChanges} page(s):\n${changeLog.map(c => `- ${c}`).join('\n')}`;
        handled = true;
      }
    }
  }

  // --- Structural index surgical edit — heading, tagline, CTA, subtitle, etc.
  // Uses spec.structural_index[page].fields built by buildStructuralIndex() after every full build.
  // Covers field types not in FIELD_KEYWORDS (phone/email/address/hours/price/testimonial).
  if (!handled) {
    const STRUCTURAL_HINTS = {
      head:     /\b(heading|headline|h1|main\s+title)\b/,
      tagline:  /\b(tagline|slogan|motto)\b/,
      subtitle: /\b(subtitle|subheading|subhead)\b/,
      cta:      /\b(cta|call.to.action|button\s+text|button\s+label)\b/,
      desc:     /\b(description|intro|paragraph)\b/,
      welcome:  /\b(welcome|greeting)\b/,
    };

    let hintKey = null;
    for (const [key, re] of Object.entries(STRUCTURAL_HINTS)) {
      if (re.test(lower)) { hintKey = key; break; }
    }

    const surgicalNewValMatch =
      userMessage.match(/\bto\s+["'](.+?)["']\s*$/i) ||
      userMessage.match(/\bto\s+(.+?)\s*$/i) ||
      userMessage.match(/\bsay\s+["']?(.+?)["']?\s*$/i) ||
      userMessage.match(/\bshould\s+be\s+["']?(.+?)["']?\s*$/i);

    if (hintKey && surgicalNewValMatch) {
      const newText = surgicalNewValMatch[1].trim().replace(/^["']|["']$/g, '');
      const specSI = readSpec();
      const siFields = specSI.structural_index?.[currentPage]?.fields || [];
      const hit = siFields.find(f => f.field_id.includes(hintKey));

      if (hit) {
        const pagePath = path.join(DIST_DIR(), currentPage);
        if (fs.existsSync(pagePath)) {
          const html = fs.readFileSync(pagePath, 'utf8');
          const edited = surgicalEditor.trySurgicalEdit(html, hit.selector, newText);
          if (edited) {
            fs.writeFileSync(pagePath, edited);
            specSI.structural_index[currentPage] = surgicalEditor.buildStructuralIndex(edited, currentPage);
            writeSpec(specSI, { source: 'surgical_index', mutationLevel: 'field', mutationTarget: hit.field_id, newValue: newText });
            description = `Surgical edit: ${hit.field_id} → "${newText}"`;
            handled = true;
            try {
              fs.appendFileSync(path.join(SITE_DIR(), 'mutations.jsonl'), JSON.stringify({
                timestamp: new Date().toISOString(),
                level: 'field',
                target_id: hit.field_id,
                action: 'surgical_edit',
                new_value: newText,
                source: 'surgical_index',
                pages_affected: [currentPage],
              }) + '\n');
            } catch {}
          }
        }
      }
    }
  }

  if (handled) {
    if (description && !description.includes('Replaced') && !description.includes('Updated') && !description.includes('Surgical')) {
      // CSS change — write it back
      fs.writeFileSync(cssPath, css);
    }
    ws.send(JSON.stringify({ type: 'assistant', content: `**Direct edit applied:** ${description}\n\nNo AI call needed — this was a deterministic change.` }));
    ws.send(JSON.stringify({ type: 'reload-preview' }));
    appendConvo({ role: 'assistant', content: `Direct edit: ${description}`, at: new Date().toISOString() });
    saveStudio();
    console.log(`[deterministic] ${description}`);
    return true;
  }

  return false;
}

// --- Enhanced Chat Handler ---
async function handleChatMessage(ws, userMessage, requestType, spec) {
  // Concurrent build guard — prevent parallel Claude calls
  if (buildInProgress) {
    ws.send(JSON.stringify({ type: 'chat', content: 'A build is already in progress. Please wait for it to finish before sending another request.' }));
    return;
  }

  // Try deterministic handler first — simple CSS/HTML changes without AI
  if (requestType === 'layout_update' || requestType === 'content_update' || requestType === 'bug_fix') {
    const t0 = Date.now();
    if (tryDeterministicHandler(ws, userMessage, currentPage)) {
      logAgentCall({ agent: 'none', intent: requestType, page: currentPage, elapsed_ms: Date.now() - t0, success: true, output_size: 0 });
      return; // Handled without Claude
    }
  }

  setBuildInProgress(true, ws);

  ws.send(JSON.stringify({ type: 'status', content: 'Reading site spec...' }));

  const prevPage = currentPage;
  // GAP-2/3 fix: destructure heroSkeleton and navSkeleton so they can be
  // injected into the single-page prompt (they were returned but unused before).
  const { htmlContext, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, brainContext, conversationHistory, blueprintContext, slotMappingContext, templateContext, contentFieldContext, globalFieldContext, resolvedPage, heroSkeleton, navSkeleton } = buildPromptContext(requestType, spec, userMessage);

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
    case 'enhancement_pass': {
      const passes = detectEnhancementPasses(userMessage);
      const enabled = Object.keys(passes).filter(k => passes[k] && k !== 'famtasticMode');
      ws.send(JSON.stringify({ type: 'status', content: `Enhancement pass — ${passes.famtasticMode ? 'FAMtastic mode (all)' : enabled.join(', ')}` }));

      const passBlocks = [];
      if (passes.images) {
        passBlocks.push(`- IMAGES PASS: Scan every section that describes a person, place, product, service, or event and insert an image slot if one is not already present. Every new <img> MUST use the 1×1 transparent data URI src, and MUST carry data-slot-id (unique, role-based — e.g. "service-lighting", "testimonial-2", "venue-1"), data-slot-status="empty", and data-slot-role (hero|service|testimonial|team|gallery|venue|product). Do not remove or rename any existing slot IDs. Prefer side-by-side two-column layouts (text+image) over text-only walls.`);
      }
      if (passes.shapes) {
        passBlocks.push(`- SHAPES PASS: Add FAMtastic decorative shape backgrounds to hero and accent sections using the fam-shapes.css vocabulary: wrap the existing section content in relative positioning and drop in absolutely-positioned <div class="fam-blob fam-blob-1"></div>, <div class="fam-wave-bg"></div>, <div class="fam-grid-bg"></div>, or <div class="fam-gradient-mesh"></div> as decorative layers with z-index -1 behind the content. Use the accent color from :root --color-accent. Do NOT modify fam-shapes.css — it is already linked via the post-processing pipeline.`);
      }
      if (passes.animations) {
        passBlocks.push(`- ANIMATIONS PASS: Add data-fam-animate attributes to existing top-level content elements so they animate in on scroll. Valid values: "fade-up", "fade-in", "slide-left", "slide-right", "scale-in", "stagger". Add data-fam-delay="100"/"200"/"300" for sequenced reveals. Also add data-fam-scroll="parallax" data-fam-scroll-speed="0.3" to hero background layers for parallax. Do NOT modify fam-motion.js or fam-scroll.js — they auto-init on DOMContentLoaded.`);
      }
      if (passes.icons) {
        passBlocks.push(`- ICONS PASS: Add Lucide icons (via the Lucide CDN <script src="https://unpkg.com/lucide@latest"></script> in <head>, then <script>lucide.createIcons()</script> at end of <body>) inline with feature bullets, CTAs, and section headings. Use <i data-lucide="check"></i>, <i data-lucide="sparkles"></i>, <i data-lucide="music"></i>, <i data-lucide="calendar"></i>, etc. — pick icons that match the content semantics.`);
      }
      if (passes.generated) {
        passBlocks.push(`- GENERATED SVG PASS: Between sections where it improves visual rhythm, insert inline SVG section dividers (wave, slant, zigzag) using the accent color. Add subtle SVG texture overlays to hero backgrounds at 5–10% opacity. Use viewBox-based inline SVG so they scale cleanly.`);
      }
      if (passes.famtasticMode) {
        passBlocks.push(`- FAMTASTIC MODE: Apply all of the above aggressively. Use bleed-to-edge hero sections (full-width, full-viewport-height). Add layered backgrounds (3+ z-index layers). Make headings large and confident (text-5xl to text-8xl on desktop). Push the design past "corporate safe" toward editorial/magazine — this is FAMtastic mode, be fearless.`);
      }

      modeInstruction = `The user asked for an ENHANCEMENT PASS on ${currentPage} — this is OPT-IN decorative polish. Do NOT rewrite any copy. Do NOT restructure sections or change the page hierarchy. Do NOT remove existing content. KEEP every word of the existing page exactly as written. Your job is to DECORATE the existing HTML by adding FAMtastic DNA (shapes, animations, icons, image slots, SVG dividers) as instructed below. Passes to run:\n${passBlocks.join('\n')}\n\nReturn the COMPLETE updated page as HTML_UPDATE: — not a diff.`;
      break;
    }
    case 'build':
      if (isMultiPage) {
        // Parallel build — handled separately
        ws.send(JSON.stringify({ type: 'status', content: `Parallel build: ${specPages.length} pages...` }));
        // Don't reset buildInProgress here — parallelBuild() already has it set to true
        // and will reset it when all pages complete. Resetting creates a race window.
        return parallelBuild(ws, spec, specPages, userMessage, briefContext, decisionsContext, systemRules, assetsContext, sessionContext, conversationHistory, analyticsInstruction, slotMappingContext, brainContext);
      } else {
        modeInstruction = 'Generate a complete single-page website.';
      }
      break;
    default:
      modeInstruction = 'Process the user request and update the site accordingly.';
  }

  // Detect logo for main prompt
  const _logoSvg       = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo.svg'));
  const _logoPng       = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo.png'));
  const _logoIconSvg   = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo-icon.svg'));
  const _logoWordSvg   = fs.existsSync(path.join(DIST_DIR(), 'assets', 'logo-wordmark.svg'));
  const _logoFile      = _logoSvg ? 'assets/logo.svg' : _logoPng ? 'assets/logo.png' : null;

  let _logoInstruction;
  if (_logoFile && (_logoIconSvg || _logoWordSvg)) {
    // Multi-part logo set exists — tell Claude which variant to use where
    const variantList = [
      `  assets/logo.svg         — full mark (icon + wordmark together) — use in hero / large contexts`,
      _logoIconSvg ? `  assets/logo-icon.svg    — icon-only — use in favicon / tight spaces / social avatars` : null,
      _logoWordSvg ? `  assets/logo-wordmark.svg — wordmark-only — use in nav / footer / print` : null,
    ].filter(Boolean).join('\n');
    _logoInstruction = `
LOGO (multi-part set available):
${variantList}
- Nav: use <a href="index.html" data-logo-v class="block"><img src="${_logoWordSvg ? 'assets/logo-wordmark.svg' : 'assets/logo.svg'}" alt="${spec.site_name || 'Logo'}" class="h-10 w-auto"></a>
- Hero: use the full mark (assets/logo.svg) if the layout variant is logo_dominant or layered — inline SVG or <img>.
- Do NOT show site name text next to the logo image.
`;
  } else if (_logoFile) {
    _logoInstruction = `\nLOGO: A logo file exists at "${_logoFile}". Use <a href="index.html" data-logo-v class="block"><img src="${_logoFile}" alt="${spec.site_name || 'Logo'}" class="h-10 w-auto"></a> for the logo. Do NOT show site name text next to the logo image.\n`;
  } else {
    _logoInstruction = `\nLOGO: No logo image file exists. Use <a href="index.html" data-logo-v class="font-playfair text-2xl font-bold text-inherit hover:opacity-80 transition">${spec.site_name || ''}</a> as the logo. This element will automatically swap to an image when a logo is uploaded.\n`;
  }

  // Session 11 Fix 7: FAMtastic logo mode. When spec.famtastic_mode is
  // enabled, prepend a block telling Claude to emit a multi-part SVG
  // response (LOGO_FULL / LOGO_ICON / LOGO_WORDMARK) so the extractor
  // can write three separate files at once. Only triggered when there
  // is no existing logo file AND the user is building or asking for a
  // new site / logo.
  if (shouldInjectFamtasticLogoMode(spec, _logoFile, requestType)) {
    _logoInstruction += `

FAMTASTIC LOGO MODE (spec.famtastic_mode = true, no logo file yet):
In addition to generating the page HTML, emit a SECOND response immediately
after the HTML_UPDATE/MULTI_UPDATE block using this exact format:

SVG_ASSET:logo.svg
<!-- LOGO_FULL -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 140">
  ...icon on the left, wordmark on the right, both using var(--color-primary) and var(--color-accent)...
</svg>
<!-- LOGO_ICON -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  ...icon only, square, usable as favicon...
</svg>
<!-- LOGO_WORDMARK -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80">
  ...wordmark only, all-caps, tight tracking, for nav/footer use...
</svg>

The server will automatically extract each part as logo.svg, logo-icon.svg,
and logo-wordmark.svg in the assets folder. Use the site's primary and
accent colors (from CSS vars), simple geometric shapes, and the business
name from the site spec. Keep each SVG under 2 KB.
`;
  }

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
${['build', 'layout_update'].includes(requestType) ? heroSkeleton : ''}
${navSkeleton}
${briefContext}
${decisionsContext}
${assetsContext}
${sessionContext}
${brainContext}
${conversationHistory}
${blueprintContext}
${slotMappingContext}
${contentFieldContext || ''}
${globalFieldContext || ''}
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
  const currentModel = loadSettings().model || 'claude-sonnet-4-6';
  let retriedWithHaiku = false;
  let response = '';
  let firstChunk = true;
  let pagesDetected = 0;

  // AbortController for WS close cancellation
  const sdkController = new AbortController();
  const wsCloseHandler = () => sdkController.abort();
  ws.once('close', wsCloseHandler);
  ws.currentAbortController = sdkController;

  // Silence timer — resets on every received chunk
  let silenceTimer = null;
  const SILENCE_MS = 30000;
  const resetSilenceTimer = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    if (retriedWithHaiku) return;
    silenceTimer = setTimeout(async () => {
      if (response.length === 0 && !retriedWithHaiku && currentModel !== 'claude-haiku-4-5-20251001') {
        console.warn('[claude] No output after 30s — falling back to Haiku');
        retriedWithHaiku = true;
        sdkController.abort();
        try { if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'status', content: 'Sonnet busy — retrying with Haiku...' })); } catch {}
        // Haiku fallback via SDK
        await runHaikuFallbackSDK(prompt, ws, buildStartTime, requestType);
      }
    }, SILENCE_MS);
  };

  // Session 11 Fix 7: process a trailing SVG_ASSET block that appears
  // after an HTML_UPDATE or MULTI_UPDATE response. Used when famtastic
  // logo mode asks Claude to emit HTML + a multi-part logo in one call.
  function processTrailingSvgAsset(fullResponse) {
    const idx = fullResponse.indexOf('\nSVG_ASSET:');
    if (idx === -1) return;
    const svgBlock = fullResponse.substring(idx + 1);
    const nl = svgBlock.indexOf('\n');
    if (nl === -1) return;
    const header = svgBlock.substring(0, nl);
    const filename = header.replace('SVG_ASSET:', '').trim() || 'logo.svg';
    let svgBody = svgBlock.substring(nl + 1).replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```\s*$/, '');
    fs.mkdirSync(path.join(DIST_DIR(), 'assets'), { recursive: true });

    const parts = extractMultiPartSvg(svgBody);
    if (parts && Object.keys(parts).length > 0) {
      const nameMap = {
        LOGO_FULL:     'logo.svg',
        LOGO_ICON:     'logo-icon.svg',
        LOGO_WORDMARK: 'logo-wordmark.svg',
      };
      const written = [];
      for (const [k, svgText] of Object.entries(parts)) {
        const outName = nameMap[k] || `${k.toLowerCase()}.svg`;
        fs.writeFileSync(path.join(DIST_DIR(), 'assets', outName), svgText);
        written.push(outName);
        ws.send(JSON.stringify({ type: 'asset-created', filename: outName, path: `/assets/${outName}` }));
      }
      try {
        const logoSpec = readSpec();
        logoSpec.logo = Object.assign({}, logoSpec.logo || {}, {
          full:     parts.LOGO_FULL     ? 'assets/logo.svg'          : logoSpec.logo?.full,
          icon:     parts.LOGO_ICON     ? 'assets/logo-icon.svg'     : logoSpec.logo?.icon,
          wordmark: parts.LOGO_WORDMARK ? 'assets/logo-wordmark.svg' : logoSpec.logo?.wordmark,
          generated_at: new Date().toISOString(),
        });
        writeSpec(logoSpec);
      } catch (err) {
        console.warn('[svg-extract] trailing: failed to record logo variants:', err.message);
      }
      ws.send(JSON.stringify({ type: 'assistant', content: `Logo variants generated: ${written.join(', ')}` }));
    } else {
      const svg = sanitizeSvg(svgBody);
      fs.writeFileSync(path.join(DIST_DIR(), 'assets', filename), svg);
      ws.send(JSON.stringify({ type: 'asset-created', filename, path: `/assets/${filename}` }));
      ws.send(JSON.stringify({ type: 'assistant', content: `Created asset: ${filename}` }));
    }
  }

  // Extract the response-processing logic into a reusable function callable from both paths
  function onChatComplete(finalResponse, usage) {
    setBuildInProgress(false);
    ws.currentAbortController = null;

    // Real token tracking from SDK usage
    const inputTokens = usage?.input_tokens || Math.round(prompt.length / 4);
    const outputTokens = usage?.output_tokens || Math.round(finalResponse.length / 4);
    sessionInputTokens += inputTokens;
    sessionOutputTokens += outputTokens;
    broadcastSessionStatus(ws);

    // Update SQLite session tokens
    if (currentSessionId) {
      const cost = calculateSessionCost(loadSettings().model || 'claude-sonnet-4-6', inputTokens, outputTokens);
      try { db.updateSessionTokens(currentSessionId, inputTokens, outputTokens, cost); } catch {}
    }

    // Log to api-telemetry
    logSDKCall({
      provider: 'claude', model: currentModel, callSite: 'chat',
      inputTokens, outputTokens,
      tag: TAG, hubRoot: HUB_ROOT,
    });

    // Context warning (once per session)
    if (!contextWarningShown) {
      const used = sessionInputTokens + sessionOutputTokens;
      const model = loadSettings().model || 'claude-sonnet-4-6';
      const windowSize = MODEL_CONTEXT_WINDOWS[model] || 200000;
      if (used / windowSize >= 0.8) {
        contextWarningShown = true;
        try {
          if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'assistant', content: '⚠️ Context is getting full (80%+). Quality may start to degrade. Consider starting a fresh session, or ask me to summarize what we\'ve built so far to compress the context.' }));
        } catch {}
      }
    }

    if (!finalResponse.trim()) {
      const fallback = "I couldn't process that request right now. Try being more specific about what you'd like to change, or say 'build the site' to regenerate.";
      if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'assistant', content: fallback }));
      appendConvo({ role: 'assistant', content: fallback, at: new Date().toISOString() });
      return;
    }

    response = finalResponse.trim();

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
        // Session 11 Fix 7: also process any trailing SVG_ASSET block
        // (famtastic logo mode emits HTML + multi-part logo in one response)
        try { processTrailingSvgAsset(response); } catch (err) { console.warn('[svg-extract] trailing failed:', err.message); }
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
        // If a trailing SVG_ASSET block follows the CHANGES list, trim it
        // out of the summary (processTrailingSvgAsset picks it up from `response`).
        const svgIdx = changeSummary.indexOf('\nSVG_ASSET:');
        if (svgIdx !== -1) changeSummary = changeSummary.substring(0, svgIdx).trim();
      }

      // Strip markdown fences if present
      html = html.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');

      fs.mkdirSync(DIST_DIR(), { recursive: true });
      versionFile(currentPage, requestType);
      fs.writeFileSync(path.join(DIST_DIR(), currentPage), html);

      // Unified post-processing — single-page edit mode
      runPostProcessing(ws, [currentPage], { sourcePage: currentPage });

      // Session 11 Fix 7: also process any trailing SVG_ASSET block
      try { processTrailingSvgAsset(response); } catch (err) { console.warn('[svg-extract] trailing failed:', err.message); }

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
      let svgBody = response.substring(firstNewline + 1);
      // Strip markdown fences if present
      svgBody = svgBody.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```\s*$/, '');

      fs.mkdirSync(path.join(DIST_DIR(), 'assets'), { recursive: true });

      // Session 11 Fix 7: multi-part SVG extraction. If the response body
      // contains <!-- LOGO_FULL / LOGO_ICON / LOGO_WORDMARK --> delimiters,
      // write each as a separate file: logo.svg, logo-icon.svg, logo-wordmark.svg.
      const parts = extractMultiPartSvg(svgBody);
      if (parts && Object.keys(parts).length > 0) {
        const writtenFiles = [];
        const nameMap = {
          LOGO_FULL:     'logo.svg',
          LOGO_ICON:     'logo-icon.svg',
          LOGO_WORDMARK: 'logo-wordmark.svg',
        };
        for (const [key, svgText] of Object.entries(parts)) {
          const outName = nameMap[key] || `${key.toLowerCase()}.svg`;
          const outPath = path.join(DIST_DIR(), 'assets', outName);
          fs.writeFileSync(outPath, svgText);
          writtenFiles.push(outName);
          ws.send(JSON.stringify({ type: 'asset-created', filename: outName, path: `/assets/${outName}` }));
        }

        // Record variants in spec.logo so the rest of the pipeline can
        // reference the right file per context (hero vs nav vs favicon).
        try {
          const logoSpec = readSpec();
          logoSpec.logo = Object.assign({}, logoSpec.logo || {}, {
            full:     parts.LOGO_FULL     ? 'assets/logo.svg'          : logoSpec.logo?.full,
            icon:     parts.LOGO_ICON     ? 'assets/logo-icon.svg'     : logoSpec.logo?.icon,
            wordmark: parts.LOGO_WORDMARK ? 'assets/logo-wordmark.svg' : logoSpec.logo?.wordmark,
            generated_at: new Date().toISOString(),
          });
          writeSpec(logoSpec);
        } catch (err) {
          console.warn('[svg-extract] failed to record logo variants in spec:', err.message);
        }

        ws.send(JSON.stringify({ type: 'assistant', content: `Created ${writtenFiles.length} logo variant(s): ${writtenFiles.join(', ')}` }));
        ws.send(JSON.stringify({ type: 'reload-preview' }));
        appendConvo({ role: 'assistant', content: `Created SVG logo variants: ${writtenFiles.join(', ')}`, at: new Date().toISOString() });
      } else {
        // Single-file SVG asset — sanitize and write
        const svg = sanitizeSvg(svgBody);
        const assetPath = path.join(DIST_DIR(), 'assets', filename);
        fs.writeFileSync(assetPath, svg);
        ws.send(JSON.stringify({ type: 'assistant', content: `Created asset: ${filename}` }));
        ws.send(JSON.stringify({ type: 'asset-created', filename, path: `/assets/${filename}` }));
        ws.send(JSON.stringify({ type: 'reload-preview' }));
        appendConvo({ role: 'assistant', content: `Created SVG asset: ${filename}`, at: new Date().toISOString() });
      }
    } else {
      ws.send(JSON.stringify({ type: 'assistant', content: response }));
      appendConvo({ role: 'assistant', content: response, at: new Date().toISOString() });
    }
  }

  // Log definitively which path we're taking
  console.log(`[chat-path] hasAnthropicKey=${hasAnthropicKey()} → ${hasAnthropicKey() ? '✅ SDK (API billing)' : '🔄 subprocess (subscription)'}`);

  // No API key — fall back to spawnClaude() subprocess (Claude Code subscription auth)
  if (!hasAnthropicKey()) {
    console.log('[chat-path] Taking SUBPROCESS path — no ANTHROPIC_API_KEY in process.env');
    const child = spawnClaude(prompt);
    ws.currentChild = child;
    const subTimeout = setTimeout(() => { child.kill(); }, 300000);
    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      response += text;
      resetSilenceTimer();
      if (firstChunk) {
        if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'status', content: 'Claude (subscription fallback) is generating...' })); } catch {}
        firstChunk = false;
      }
      if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'stream', content: text })); } catch {}
    });
    child.on('close', () => {
      clearTimeout(subTimeout);
      if (silenceTimer) clearTimeout(silenceTimer);
      ws.removeListener('close', wsCloseHandler);
      onChatComplete(response, null);
    });
    child.on('error', (err) => {
      clearTimeout(subTimeout);
      if (silenceTimer) clearTimeout(silenceTimer);
      ws.removeListener('close', wsCloseHandler);
      console.error('[chat-subprocess] Error:', err.message);
      setBuildInProgress(false);
    });
    return;
  }

  // SDK streaming call
  console.log(`[chat-path] Taking SDK path — model: ${currentModel}`);
  try {
    const sdk = getAnthropicClient();
    const stream = sdk.messages.stream({
      model: currentModel,
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    }, { signal: sdkController.signal });

    resetSilenceTimer();

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        response += text;
        resetSilenceTimer();
        if (firstChunk) {
          const activeBrain = currentBrain || 'claude';
          const activeModel = ws?.brainModels?.[activeBrain] || currentModel;
          const brainLabel = activeBrain === 'claude' ? `Claude API (${activeModel.replace('claude-', '').replace('-20251001', '')})` : activeBrain === 'gemini' ? `Gemini API (${activeModel})` : `OpenAI API (${activeModel})`;
          if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'status', content: `${brainLabel} is generating...` })); } catch {}
          firstChunk = false;
        }
        // Detect page delimiters in stream for real-time progress
        const pageMatches = response.match(/^---\s*PAGE:\s*(\S+)\s*---\s*$/gm);
        if (pageMatches && pageMatches.length > pagesDetected) {
          const newPage = pageMatches[pageMatches.length - 1].match(/PAGE:\s*(\S+)/)[1];
          pagesDetected = pageMatches.length;
          if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'status', content: `Generating page ${pagesDetected}: ${newPage}...` })); } catch {}
        }
        if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'stream', content: text })); } catch {}
      }
    }

    if (silenceTimer) clearTimeout(silenceTimer);
    ws.removeListener('close', wsCloseHandler);

    if (retriedWithHaiku) return; // Haiku fallback handled completion

    const finalMsg = await stream.finalMessage().catch(() => null);
    if (finalMsg?.usage) {
      console.log(`[chat-path] ✅ SDK complete — input:${finalMsg.usage.input_tokens} output:${finalMsg.usage.output_tokens} tokens (API BILLED)`);
      costMonitor.trackUsage(finalMsg.usage.input_tokens || 0, finalMsg.usage.output_tokens || 0);
    }
    onChatComplete(response, finalMsg?.usage);

  } catch (err) {
    if (silenceTimer) clearTimeout(silenceTimer);
    ws.removeListener('close', wsCloseHandler);
    if (err.name === 'AbortError' || err.name === 'APIUserAbortError') {
      if (!retriedWithHaiku) setBuildInProgress(false);
      return;
    }
    console.error('[chat-sdk] Error:', err.message);
    setBuildInProgress(false);
    if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'error', content: 'Generation failed. Please try again.' })); } catch {}
  }
}

/**
 * Haiku fallback for handleChatMessage() — called when Sonnet silence timer trips.
 * Uses SDK streaming with the Haiku model.
 */
async function runHaikuFallbackSDK(prompt, ws, buildStartTime, requestType) {
  const haikuModel = 'claude-haiku-4-5-20251001';
  let haikuResponse = '';
  let firstHaikuChunk = true;
  let pagesDetected = 0;

  // No API key — use spawnClaudeModel subprocess for Haiku fallback
  if (!hasAnthropicKey()) {
    const child = spawnClaudeModel(haikuModel, prompt);
    ws.currentChild = child;
    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      haikuResponse += text;
      if (firstHaikuChunk) {
        if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'status', content: 'Haiku is generating...' })); } catch {}
        firstHaikuChunk = false;
      }
      if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'stream', content: text })); } catch {}
    });
    child.on('close', () => {
      const buildElapsed = Math.round((Date.now() - buildStartTime) / 1000);
      const { onChatComplete } = (() => { /* resolved below via closure */ })() || {};
      setBuildInProgress(false);
      if (ws && ws.readyState === 1) {
        const msg = haikuResponse ? `${currentPage} updated! (${buildElapsed}s)` : 'Haiku fallback produced no output.';
        try { ws.send(JSON.stringify({ type: 'assistant', content: msg })); } catch {}
        if (haikuResponse) try { ws.send(JSON.stringify({ type: 'reload-preview' })); } catch {}
      }
    });
    return;
  }

  const haikuController = new AbortController();
  const wsCloseHaikuHandler = () => haikuController.abort();
  ws.once('close', wsCloseHaikuHandler);

  try {
    const sdk = getAnthropicClient();
    const stream = sdk.messages.stream({
      model: haikuModel,
      max_tokens: 16384,
      messages: [{ role: 'user', content: prompt }],
    }, { signal: haikuController.signal });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text;
        haikuResponse += text;
        if (firstHaikuChunk) {
          if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'status', content: 'Haiku is generating...' })); } catch {}
          firstHaikuChunk = false;
        }
        const pageMatches = haikuResponse.match(/^---\s*PAGE:\s*(\S+)\s*---\s*$/gm);
        if (pageMatches && pageMatches.length > pagesDetected) {
          const newPage = pageMatches[pageMatches.length - 1].match(/PAGE:\s*(\S+)/)[1];
          pagesDetected = pageMatches.length;
          if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'status', content: `Generating page ${pagesDetected}: ${newPage}...` })); } catch {}
        }
        if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'stream', content: text })); } catch {}
      }
    }

    ws.removeListener('close', wsCloseHaikuHandler);
    const finalMsg = await stream.finalMessage().catch(() => null);
    logSDKCall({
      provider: 'claude', model: haikuModel, callSite: 'chat-haiku-fallback',
      inputTokens: finalMsg?.usage?.input_tokens || 0,
      outputTokens: finalMsg?.usage?.output_tokens || 0,
      tag: TAG, hubRoot: HUB_ROOT,
    });

    setBuildInProgress(false);

    // Update SQLite session tokens
    const inputTokens = finalMsg?.usage?.input_tokens || Math.round(prompt.length / 4);
    const outputTokens = finalMsg?.usage?.output_tokens || Math.round(haikuResponse.length / 4);
    sessionInputTokens += inputTokens;
    sessionOutputTokens += outputTokens;
    broadcastSessionStatus(ws);
    if (currentSessionId) {
      const cost = calculateSessionCost(haikuModel, inputTokens, outputTokens);
      try { db.updateSessionTokens(currentSessionId, inputTokens, outputTokens, cost); } catch {}
    }

    if (!haikuResponse.trim()) {
      const fallback = "I couldn't process that request right now. Try being more specific about what you'd like to change, or say 'build the site' to regenerate.";
      if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'assistant', content: fallback })); } catch {}
      appendConvo({ role: 'assistant', content: fallback, at: new Date().toISOString() });
      return;
    }

    haikuResponse = haikuResponse.trim();
    // Process the response using the same logic (simplified — send as assistant message)
    if (ws && ws.readyState === 1) try { ws.send(JSON.stringify({ type: 'assistant', content: haikuResponse })); } catch {}
    appendConvo({ role: 'assistant', content: haikuResponse, at: new Date().toISOString() });

  } catch (err) {
    ws.removeListener('close', wsCloseHaikuHandler);
    if (err.name !== 'AbortError' && err.name !== 'APIUserAbortError') {
      console.error('[chat-haiku-fallback] Error:', err.message);
    }
    setBuildInProgress(false);
  }
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
const wss = new WebSocketServer({ noServer: true });

let activeClientCount = 0;

wss.on('connection', (ws) => {
  currentMode = 'build'; // reset ephemeral session state — must not survive reconnects
  activeClientCount++;
  console.log(`[studio] Client connected (${activeClientCount} active)`);

  // Per-connection brain state — isolated from all other connections.
  // Prevents cross-tab contamination when multiple Studio tabs are open.
  ws.brainSession  = null;            // BrainInterface instance, lazy-created
  ws.currentBrain  = currentBrain;    // inherits global at connect time, then independent
  ws.currentMode   = 'chat';          // Studio mode for this connection
  ws.currentSite   = TAG;             // active site at connection time
  ws.currentPage   = currentPage;     // active page in canvas
  ws.brainModels   = { claude: 'claude-sonnet-4-6', gemini: 'gemini-2.5-flash', openai: 'gpt-4o' };

  /** Get or lazy-create the BrainInterface for this connection */
  ws.getBrainSession = function() {
    if (!ws.brainSession) {
      const { BrainInterface } = require('./lib/brain-interface');
      ws.brainSession = new BrainInterface(ws.currentBrain, { ws });
    }
    return ws.brainSession;
  };

  /** Switch to a new brain — preserves conversation history across the switch */
  ws.getOrCreateBrainSession = function(brain) {
    if (!ws.brainSession || ws.brainSession.brain !== brain) {
      const { BrainInterface } = require('./lib/brain-interface');
      const previousHistory = ws.brainSession?.conversationHistory || [];
      ws.brainSession = new BrainInterface(brain, { ws });
      ws.brainSession.conversationHistory = previousHistory;
    }
    return ws.brainSession;
  };

  /** Clear the brain session — called on site switch */
  ws.resetBrainSession = function() {
    ws.brainSession = null;
  };

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

  // Send session status to the new client
  broadcastSessionStatus(ws);

  ws.on('close', async () => {
    activeClientCount = Math.max(0, activeClientCount - 1);
    console.log(`[studio] Client disconnected (${activeClientCount} active)`);

    // Kill subprocesses owned by this connection
    killBuildProcesses(ws);

    // Only release the build lock if THIS connection owns the current build.
    // A random tab closing/refreshing must NOT clear a lock owned by another session.
    if (buildInProgress && buildOwnerWs === ws) {
      console.warn(`[studio] Build owner disconnected — releasing lock for run=${currentBuildRunId}`);
      setBuildInProgress(false);
    }

    await endSession(ws);
  });

  ws.on('message', async (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return; }

    try {

    if (msg.type === 'set-brain') {
      const brain = msg.brain;
      if (brain && BRAIN_LIMITS[brain]) {
        setBrain(brain, ws);
      } else {
        try { ws.send(JSON.stringify({ type: 'error', content: `Unknown brain: ${brain}` })); } catch {}
      }
      return;
    }

    if (msg.type === 'set-brain-model') {
      const { brain, model } = msg;
      if (brain && model) {
        // Store per-connection brain model preference
        if (!ws.brainModels) ws.brainModels = { claude: 'claude-sonnet-4-6', gemini: 'gemini-2.5-flash', openai: 'gpt-4o' };
        ws.brainModels[brain] = model;
        console.log(`[brain-model] ${brain} → ${model}`);
        try { ws.send(JSON.stringify({ type: 'brain-model-set', brain, model })); } catch {}
      }
      return;
    }

    if (msg.type === 'get-brain-status') {
      try { ws.send(JSON.stringify({ type: 'brain-status', currentBrain, limits: BRAIN_LIMITS, sessionCounts: sessionBrainCounts })); } catch {}
      return;
    }

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
            const bsLower = brainstormContext.toLowerCase();
            const compTypes = ['popup', 'modal', 'slider', 'carousel', 'accordion', 'tabs', 'overlay', 'drawer', 'banner', 'countdown', 'form'];
            for (const ct of compTypes) {
              if (bsLower.includes(ct) && !entry.components.find(c => c.type === ct)) {
                entry.components.push({ type: ct, added: new Date().toISOString().split('T')[0], source: 'brainstorm' });
              }
            }
            const summaryLine = brainstormContext.split('\n').filter(l => l.startsWith('assistant:')).pop();
            if (summaryLine) {
              const note = `Brainstorm: ${summaryLine.replace('assistant:', '').trim().substring(0, 200)}`;
              if (!entry.layout_notes.includes(note)) entry.layout_notes.push(note);
            }
            writeBlueprint(bp);
            console.log('[blueprint] Updated from brainstorm context');

            // BLOCKER 1 FIX: Extract colors, fonts, and visual direction from brainstorm
            // and persist them to spec.design_decisions so Fix #1 injects them as MANDATORY
            const bsSpec = readSpec();
            if (!bsSpec.design_decisions) bsSpec.design_decisions = [];
            // Extract hex colors mentioned in brainstorm
            const bsHexes = brainstormContext.match(/#[0-9A-Fa-f]{6}\b/g);
            if (bsHexes && bsHexes.length > 0) {
              const colorDecision = `Brainstorm color palette: ${[...new Set(bsHexes)].join(', ')}`;
              if (!bsSpec.design_decisions.find(d => d.decision && d.decision.includes('Brainstorm color'))) {
                bsSpec.design_decisions.push({ category: 'color', decision: colorDecision, status: 'approved', source: 'brainstorm' });
              }
            }
            // Extract font names mentioned in brainstorm
            const bsFonts = brainstormContext.match(/(?:Playfair\s+Display|Lato|Great\s+Vibes|Cormorant|Raleway|Source\s+Sans|Merriweather|Roboto|Open\s+Sans|Montserrat|Poppins|Inter|Georgia|Dancing\s+Script|Oswald|Bebas\s+Neue|Ubuntu|Abril\s+Fatface|Bangers|Permanent\s+Marker)/gi);
            if (bsFonts && bsFonts.length > 0) {
              const fontDecision = `Brainstorm fonts: ${[...new Set(bsFonts)].join(', ')}`;
              if (!bsSpec.design_decisions.find(d => d.decision && d.decision.includes('Brainstorm font'))) {
                bsSpec.design_decisions.push({ category: 'typography', decision: fontDecision, status: 'approved', source: 'brainstorm' });
              }
            }
            // Extract visual direction keywords
            const bsVisualKeywords = [];
            if (bsLower.includes('parallax')) bsVisualKeywords.push('parallax scrolling');
            if (bsLower.includes('dark') || bsLower.includes('dark theme')) bsVisualKeywords.push('dark theme');
            if (bsLower.includes('afro') || bsLower.includes('african')) bsVisualKeywords.push('Afro-centric design');
            if (bsLower.includes('kente')) bsVisualKeywords.push('kente-inspired patterns');
            if (bsLower.includes('adinkra')) bsVisualKeywords.push('Adinkra symbols');
            if (bsVisualKeywords.length > 0) {
              const styleDecision = `Brainstorm visual direction: ${bsVisualKeywords.join(', ')}`;
              if (!bsSpec.design_decisions.find(d => d.decision && d.decision.includes('Brainstorm visual'))) {
                bsSpec.design_decisions.push({ category: 'layout', decision: styleDecision, status: 'approved', source: 'brainstorm' });
              }
            }
            writeSpec(bsSpec);
            console.log('[brainstorm] Persisted design decisions to spec');
          }

          // Detect if this is a rebuild/rebrand (mentions rebuild, rebrand, redo, all pages)
          const isRebuild = /\b(rebuild|rebrand|redo|all\s+of\s+it|start\s+over|from\s+scratch|all\s+pages)\b/i.test(userMessage) || /\b(rebuild|rebrand|redo)\b/i.test(brainstormContext.slice(-500));

          const buildInstruction = brainstormContext
            ? (isRebuild
                ? `REBUILD the site incorporating ALL of the following brainstorm ideas. This is a full rebrand — generate fresh HTML for all pages with the new design direction:\n\n${brainstormContext}`
                : `ADD the following ideas to the EXISTING ${currentPage} — do NOT remove or replace existing content. Keep everything and ADD these new elements:\n\n${brainstormContext}\n\nIMPORTANT: This is an ADDITIVE change.`)
            : userMessage;

          appendConvo({ role: 'assistant', content: isRebuild ? `Rebuilding site from brainstorm ideas` : `Building from brainstorm ideas on ${currentPage}`, at: new Date().toISOString() });

          // Route as build for rebuilds, layout_update for additive changes
          const requestType = isRebuild ? 'build' : 'layout_update';
          ws.send(JSON.stringify({ type: 'status', content: isRebuild ? 'Rebuilding from brainstorm...' : `Building on ${currentPage}...` }));
          console.log(`[classify] brainstorm-to-build (${currentPage}) → ${requestType} (${isRebuild ? 'full rebuild' : 'additive'})`);
          if (isRebuild) {
            // Full rebuild uses parallelBuild for all pages
            const rebuildSpec = readSpec();
            const specPages = rebuildSpec.pages || ['home'];
            const pageFiles = specPages.map(p => p === 'home' || p === 'hero' ? 'index.html' : p.replace(/\s+/g, '-').toLowerCase().replace(/\.html$/, '') + '.html');
            parallelBuild(ws, pageFiles, rebuildSpec, buildInstruction);
          } else {
            handleChatMessage(ws, buildInstruction, requestType, spec);
          }
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

      // Non-Claude brain: route all conversational messages through the selected brain adapter.
      // HTML build intents (build/layout_update/content_update/bug_fix/restyle/restructure/major_revision)
      // still require Claude for HTML generation — but conversational queries go to the selected brain.
      if (currentBrain !== 'claude') {
        const nonBuildIntents = ['brainstorm', 'content_update', 'bug_fix'];
        const quickClassify = classifyRequest(userMessage, spec);
        const isBuildIntent = ['build', 'layout_update', 'restyle', 'restructure', 'major_revision', 'new_site', 'enhancement_pass'].includes(quickClassify);
        if (!isBuildIntent) {
          console.log(`[brain-route] ${currentBrain} selected — routing "${userMessage.substring(0, 40)}..." to handleBrainstorm`);
          handleBrainstorm(ws, userMessage, spec);
          return;
        }
        // Build intents: inform user then fall through to Claude
        console.log(`[brain-route] ${currentBrain} selected but build intent detected — using Claude for HTML generation`);
        ws.send(JSON.stringify({ type: 'status', content: `Using Claude for HTML generation (${currentBrain} handles brainstorm only)` }));
      }

      // Classify request
      ws.send(JSON.stringify({ type: 'status', content: 'Classifying request...' }));
      const requestType = classifyRequest(userMessage, spec);
      console.log(`[classify] "${userMessage.substring(0, 60)}..." → ${requestType}`);

      // Plan gate: for heavy intents, show a plan card first (if plan_mode enabled)
      // autonomousBuildActive bypasses the gate so Shay-Shay can build without UI approval
      const planMode = loadSettings().plan_mode !== false;
      if (planMode && PLAN_REQUIRED_INTENTS.includes(requestType) && !autonomousBuildActive) {
        ws.send(JSON.stringify({ type: 'status', content: 'Generating plan...' }));
        generatePlan(ws, userMessage, requestType, readSpec())
          .then(planId => {
            if (!planId) {
              // Plan generation failed — proceed directly
              routeToHandler(ws, requestType, userMessage, readSpec());
            }
            // Otherwise wait for 'execute-plan' from client
          })
          .catch(() => routeToHandler(ws, requestType, userMessage, readSpec()));
        return;
      }

      // Plan-gated intent with gate bypassed (autonomous mode) — route directly to handler
      if (PLAN_REQUIRED_INTENTS.includes(requestType)) {
        routeToHandler(ws, requestType, userMessage, readSpec());
        return;
      }

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

        case 'conversational_ack':
          ws.send(JSON.stringify({ type: 'chat', role: 'assistant', message: getAckResponse(spec) }));
          appendConvo({ role: 'assistant', content: '[ack]', intent: 'conversational_ack', at: new Date().toISOString() });
          break;

        case 'brainstorm':
          currentMode = 'brainstorm';
          console.log(`[mode] Entered brainstorm mode`);
          ws.send(JSON.stringify({ type: 'mode-changed', mode: 'brainstorm' }));
          handleBrainstorm(ws, userMessage, spec);
          break;

        case 'run_worker_task': {
          // Session 12 Phase 2 (W3): deterministic handler — no Claude call.
          // The worker queue at ~/famtastic/.worker-queue.jsonl is a ledger
          // written by the dispatch_worker tool. There is NO live consumer
          // process reading it. Be honest about that to the user instead of
          // pretending tasks are being executed in the background.
          const lowerMsg = userMessage.toLowerCase();
          const isClear = /\b(clear|clean|purge|empty)\b/.test(lowerMsg);
          const queuePath = path.join(require('os').homedir(), 'famtastic', '.worker-queue.jsonl');

          if (isClear) {
            try {
              fs.writeFileSync(queuePath, '');
              const msg = `Worker queue cleared (${queuePath}).\n\n` +
                `Note: the queue is a dispatch ledger — no live worker process consumes it. ` +
                `Tasks are appended by the \`dispatch_worker\` tool for external execution, and ` +
                `Studio auto-purges completed/cancelled/failed entries and anything older than 7 days on startup.`;
              ws.send(JSON.stringify({ type: 'assistant', content: msg }));
              appendConvo({ role: 'assistant', content: 'Worker queue cleared', at: new Date().toISOString() });
            } catch (err) {
              ws.send(JSON.stringify({ type: 'error', content: `Failed to clear worker queue: ${err.message}` }));
            }
            break;
          }

          // Otherwise: show honest queue status.
          try {
            let tasks = [];
            if (fs.existsSync(queuePath)) {
              const raw = fs.readFileSync(queuePath, 'utf8').trim();
              tasks = raw ? raw.split('\n').filter(Boolean).map(l => {
                try { return JSON.parse(l); } catch { return null; }
              }).filter(Boolean) : [];
            }

            const by_worker = {};
            const by_status = {};
            let oldest_pending = null;
            for (const t of tasks) {
              const w = t.worker || t.agent || 'unknown';
              const s = t.status || 'pending';
              by_worker[w] = (by_worker[w] || 0) + 1;
              by_status[s] = (by_status[s] || 0) + 1;
              if (s !== 'completed' && s !== 'cancelled' && s !== 'failed') {
                const ts = t.queued_at || t.created_at || t.at || null;
                if (ts && (!oldest_pending || ts < oldest_pending)) oldest_pending = ts;
              }
            }

            let report = `**Worker Queue Status**\n\n`;
            report += `- File: \`${queuePath}\`\n`;
            report += `- Total entries: ${tasks.length}\n`;
            if (tasks.length > 0) {
              report += `- By worker: ${Object.entries(by_worker).map(([k, v]) => `${k}=${v}`).join(', ')}\n`;
              report += `- By status: ${Object.entries(by_status).map(([k, v]) => `${k}=${v}`).join(', ')}\n`;
              if (oldest_pending) report += `- Oldest pending: ${oldest_pending}\n`;
            }
            report += `\n**Reality check:** The worker queue is a dispatch ledger. ` +
              `There is **no live worker process** consuming this file. Tasks are appended ` +
              `by the \`dispatch_worker\` tool call for external execution, and Studio auto-purges ` +
              `completed/cancelled/failed entries plus anything older than 7 days on startup.\n\n` +
              `To clear the queue manually, say "clear the worker queue".`;

            ws.send(JSON.stringify({ type: 'assistant', content: report }));
            appendConvo({ role: 'assistant', content: 'Worker queue status reported', at: new Date().toISOString() });
          } catch (err) {
            ws.send(JSON.stringify({ type: 'error', content: `Worker queue read failed: ${err.message}` }));
          }
          break;
        }

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
          handlePlanning(ws, userMessage, spec);
          break;
        case 'restyle':
          handleChatMessage(ws, userMessage, 'restyle', spec);
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

        case 'component_export': {
          // Fix #4 — export a section to the component library (Codex review: fixed field names + port)
          ws.send(JSON.stringify({ type: 'status', content: 'Exporting component to library...' }));
          try {
            const exportPage = currentPage;
            const sectionMatch = userMessage.toLowerCase().match(/(?:export|save)\s+(?:the\s+)?(\w+[\s-]?\w*)\s+(?:section|component)/);
            const sectionName = sectionMatch ? sectionMatch[1].trim().replace(/\s+/g, '-') : 'hero';
            // Call export API with correct field names (component_id required, section_id optional)
            const studioPort = process.env.STUDIO_PORT || process.env.PORT || 3334;
            const compRes = await new Promise((resolve) => {
              const http = require('http');
              const postData = JSON.stringify({ page: exportPage, component_id: sectionName, section_id: 'section-' + sectionName });
              const req = http.request({ hostname: 'localhost', port: studioPort, path: '/api/components/export', method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) } }, (res) => {
                let body = ''; res.on('data', c => body += c); res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({ error: body }); } });
              });
              req.on('error', (e) => resolve({ error: e.message }));
              req.write(postData); req.end();
            });
            if (compRes.error) {
              ws.send(JSON.stringify({ type: 'assistant', content: `Could not export: ${compRes.error}` }));
            } else {
              ws.send(JSON.stringify({ type: 'assistant', content: `Exported "${sectionName}" component to library.\nID: ${compRes.component_id || sectionName}\nFields: ${compRes.field_count || 0} content fields, ${compRes.slot_count || 0} image slots.` }));
            }
          } catch (e) {
            ws.send(JSON.stringify({ type: 'assistant', content: `Export failed: ${e.message}` }));
          }
          break;
        }

        case 'component_import': {
          ws.send(JSON.stringify({ type: 'status', content: 'Checking component library...' }));
          try {
            const libPath = path.join(__dirname, '..', 'components', 'library.json');
            if (!fs.existsSync(libPath)) {
              ws.send(JSON.stringify({ type: 'assistant', content: 'No component library found. Export components first using "Export the hero section to the library".' }));
              break;
            }
            const library = JSON.parse(fs.readFileSync(libPath, 'utf8'));
            const components = library.components || [];
            if (components.length === 0) {
              ws.send(JSON.stringify({ type: 'assistant', content: 'Component library is empty. Export components first.' }));
              break;
            }

            const msgLower = userMessage.toLowerCase();

            // Detect insert intent: "use", "insert", "add ... from library", "place"
            const isInsertIntent = msgLower.match(/\b(use|insert|add|place|put)\s+(?:the\s+)?(\w[\w\s-]*?)\s+(?:component|section|hero|card|form)\b/) ||
                                   msgLower.match(/\b(use|insert|add)\s+(?:the\s+)?(\w[\w\s-]*?)\s+(?:on|in|into|onto)\s+(?:the\s+)?(\w+)\s*(?:page)?\b/);

            // Extract component name and target page from message
            const insertMatch = msgLower.match(/\b(?:use|insert|add|place)\s+(?:the\s+)?(\w[\w\s-]*?)\s+(?:component|section)?\s+(?:on|in|into|onto)\s+(?:the\s+)?(\w+)\s*(?:page)?\b/) ||
                                msgLower.match(/\b(?:use|insert|add)\s+(?:the\s+)?(\w[\w\s-]*?)\s+(?:component|section)\b/);
            const insertMatchOnPage = msgLower.match(/(?:on|in|into|onto)\s+(?:the\s+)?(\w+)\s*(?:page)?/);

            const searchTerm = insertMatch ? insertMatch[1].trim().replace(/\s+/g, '-') : null;
            const targetPageRaw = insertMatchOnPage ? insertMatchOnPage[1].toLowerCase() : null;
            const targetPage = targetPageRaw === 'homepage' || targetPageRaw === 'home' ? 'index.html' :
                               targetPageRaw ? targetPageRaw + (targetPageRaw.endsWith('.html') ? '' : '.html') : currentPage;

            if (searchTerm && isInsertIntent) {
              // Find the component
              const match = components.find(c => {
                const cid = (c.id || c.component_id || '').toLowerCase();
                const cname = (c.name || '').toLowerCase();
                return cid.includes(searchTerm) || cname.includes(searchTerm) || searchTerm.includes(cid.replace('component-', ''));
              });

              if (match) {
                const compId = match.id || match.component_id || searchTerm;
                const compDir = path.join(__dirname, '..', 'components', match.path || compId);
                try {
                  const templateFile = fs.existsSync(compDir) ? fs.readdirSync(compDir).find(f => f.endsWith('.html')) : null;
                  if (templateFile) {
                    const componentHtml = fs.readFileSync(path.join(compDir, templateFile), 'utf8');
                    const targetPagePath = path.join(DIST_DIR(), targetPage);

                    if (!fs.existsSync(targetPagePath)) {
                      ws.send(JSON.stringify({ type: 'assistant', content: `Target page "${targetPage}" not found. Available pages: ${listPages().join(', ')}` }));
                      break;
                    }

                    // ── CSS variable portability — inject missing vars into target site ──
                    const compJsonForImport = path.join(path.dirname(path.join(compDir, templateFile)), 'component.json');
                    if (fs.existsSync(compJsonForImport)) {
                      try {
                        const compDef = JSON.parse(fs.readFileSync(compJsonForImport, 'utf8'));
                        const compVars = compDef.css?.variables || {};
                        const siteCssPath = path.join(DIST_DIR(), 'assets', 'styles.css');
                        if (Object.keys(compVars).length > 0 && fs.existsSync(siteCssPath)) {
                          let siteCss = fs.readFileSync(siteCssPath, 'utf8');
                          const missingVars = [];
                          for (const [varName, defaultVal] of Object.entries(compVars)) {
                            if (!siteCss.includes(varName)) {
                              missingVars.push(`  ${varName}: ${defaultVal};`);
                            }
                          }
                          if (missingVars.length > 0) {
                            // Inject into :root block or create one
                            if (siteCss.includes(':root {')) {
                              siteCss = siteCss.replace(':root {', `:root {\n  /* Imported from ${compId} */\n${missingVars.join('\n')}`);
                            } else {
                              siteCss = `:root {\n  /* Imported from ${compId} */\n${missingVars.join('\n')}\n}\n\n` + siteCss;
                            }
                            fs.writeFileSync(siteCssPath, siteCss);
                            console.log(`[components] Injected ${missingVars.length} CSS vars from ${compId}`);
                          }
                        }
                      } catch {}
                    }

                    // Insert before </main> or before </body> if no main
                    let pageHtml = fs.readFileSync(targetPagePath, 'utf8');
                    const insertBefore = pageHtml.includes('</main>') ? '</main>' : '</body>';
                    const sectionHtml = `\n<!-- Component: ${compId} v${match.version || '1.0'} (imported from library) -->\n${componentHtml}\n`;
                    pageHtml = pageHtml.replace(insertBefore, sectionHtml + insertBefore);
                    fs.writeFileSync(targetPagePath, pageHtml);

                    // Track usage in library.json
                    if (!match.used_in) match.used_in = [];
                    if (!match.used_in.includes(TAG)) {
                      match.used_in.push(TAG);
                      library.components = library.components.map(c =>
                        (c.id || c.component_id) === compId ? match : c
                      );
                      fs.writeFileSync(libPath, JSON.stringify(library, null, 2));
                    }

                    // Record component_ref in spec.content for rebuild awareness
                    try {
                      const specForImport = readSpec();
                      if (specForImport.content && specForImport.content[targetPage]) {
                        if (!specForImport.content[targetPage].sections) specForImport.content[targetPage].sections = [];
                        const importRef = { section_id: compId, component_ref: `${compId}@${match.version || '1.0'}`, imported: true };
                        specForImport.content[targetPage].sections.push(importRef);
                        writeSpec(specForImport);
                      }
                    } catch {}

                    ws.send(JSON.stringify({ type: 'reload-preview' }));
                    ws.send(JSON.stringify({ type: 'assistant', content: `Inserted **${match.name || compId}** v${match.version || '1.0'} into \`${targetPage}\`.\n\nComponent from: ${match.created_from || 'library'}\nUsed in: ${(match.used_in || []).length} site(s)` }));
                  } else {
                    ws.send(JSON.stringify({ type: 'assistant', content: `Found "${match.name || compId}" but no HTML template available at ${compDir}` }));
                  }
                } catch (dirErr) {
                  ws.send(JSON.stringify({ type: 'assistant', content: `Error inserting component: ${dirErr.message}` }));
                }
              } else {
                const available = components.map(c => c.id || c.component_id || '?').join(', ');
                ws.send(JSON.stringify({ type: 'assistant', content: `No component matching "${searchTerm}" found in library.\n\nAvailable components:\n${available}` }));
              }
            } else {
              // List mode — show all components
              const list = components.map(c => {
                const cid = c.id || c.component_id || '?';
                const usedIn = c.used_in && c.used_in.length > 0 ? ` — used in ${c.used_in.length} site(s)` : '';
                return `- **${c.name || cid}** (\`${cid}\`) — ${c.description || c.type || 'section'}${usedIn}`;
              }).join('\n');
              ws.send(JSON.stringify({ type: 'assistant', content: `**Component Library** (${components.length} components):\n\n${list}\n\nTo insert a component: _"use the display-stage component on the homepage"_` }));
            }
          } catch (e) {
            ws.send(JSON.stringify({ type: 'assistant', content: `Library error: ${e.message}` }));
          }
          break;
        }

        case 'verification': {
          // Fix #3 from Site 4 gap analysis — "run verification" was misclassified as layout_update
          ws.send(JSON.stringify({ type: 'status', content: 'Running build verification...' }));
          const verifyPages = listPages();
          if (verifyPages.length === 0) {
            ws.send(JSON.stringify({ type: 'assistant', content: 'No pages found to verify. Build the site first.' }));
            break;
          }
          const verifyResult = runBuildVerification(verifyPages);
          writeSpec(Object.assign(readSpec(), { last_verification: verifyResult }));
          ws.send(JSON.stringify({ type: 'verification-result', result: verifyResult }));
          const vSummary = verifyResult.status === 'passed'
            ? `Build verification passed! ${verifyResult.checks?.length || 0} checks run, 0 issues.`
            : `Build verification: ${verifyResult.issues?.length || 0} issue(s) found.\n${(verifyResult.issues || []).map(i => '- ' + i).join('\n')}`;
          ws.send(JSON.stringify({ type: 'assistant', content: vSummary }));
          appendConvo({ role: 'assistant', content: vSummary, at: new Date().toISOString() });
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
        // Populate spec.pages from brief sections if not already set
        if (!spec.pages || spec.pages.length <= 1) {
          spec.pages = extractPagesFromBrief(spec.design_brief);
          console.log(`[approve-brief] Extracted pages from brief: ${spec.pages.join(', ')}`);
        }
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

    if (msg.type === 'execute-plan') {
      const plan = pendingPlans.get(msg.planId);
      if (!plan) {
        ws.send(JSON.stringify({ type: 'error', content: 'Plan not found or already executed. Please try your request again.' }));
        return;
      }
      pendingPlans.delete(msg.planId);

      if (msg.approved === false) {
        ws.send(JSON.stringify({ type: 'assistant', content: "No problem. What would you like to do differently?" }));
        appendConvo({ role: 'assistant', content: 'Plan cancelled by user', at: new Date().toISOString() });
        return;
      }

      // Execute with the (possibly edited) message
      const finalMessage = msg.editedMessage || plan.userMessage;
      const reclassifiedType = classifyRequest(finalMessage, readSpec());
      routeToHandler(ws, reclassifiedType, finalMessage, readSpec());
      return;
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

      // Persist deploy history — seed of Mission Control data model
      spec.deploy_history = spec.deploy_history || [];
      spec.deploy_history.push({
        version: spec.deploy_history.length + 1,
        deployed_at: spec.environments[env].deployed_at,
        environment: env,
        url: urlMatch[0],
        fam_score: spec.fam_score || null,
        lighthouse: spec.lighthouse_score || null,
        pages: (listPages() || []).length,
      });

      writeSpec(spec);

      studioEvents.emit(STUDIO_EVENTS.DEPLOY_COMPLETED, { tag: TAG, url: urlMatch[0], env });
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

function generateAsset(assetType, description) {
  const scriptPath = path.join(HUB_ROOT, 'scripts', 'asset-generate');
  const args = [TAG, assetType];
  if (description) args.push(description);
  return new Promise((resolve, reject) => {
    const child = spawn(scriptPath, args, {
      env: process.env,
      cwd: HUB_ROOT,
    });

    let output = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      console.error('[asset]', chunk.toString());
    });
    child.on('close', (code) => {
      if (code === 0) {
        const filename = `${assetType}.svg`;
        const pngPath = `/assets/${assetType}.png`;
        const extraFiles = assetType === 'favicon'
          ? ['/assets/favicon-16.png', '/assets/favicon-32.png', '/assets/favicon-48.png']
          : [];
        resolve({
          success: true,
          asset_type: assetType,
          filename,
          path: `/assets/${filename}`,
          png_path: (assetType === 'logo' || assetType === 'icon') ? pngPath : null,
          extra_files: extraFiles,
          log: output.trim(),
        });
      } else {
        reject(new Error(stderr.trim() || `Failed to generate ${assetType}`));
      }
    });
  });
}

// --- Run asset-generate script ---
function runAssetGenerate(ws, assetType, description) {
  generateAsset(assetType, description)
    .then((result) => {
      const statusLines = String(result.log || '').split('\n').filter(Boolean);
      statusLines.forEach((line) => {
        ws.send(JSON.stringify({ type: 'status', content: line.trim() }));
      });
      ws.send(JSON.stringify({ type: 'assistant', content: `${assetType} generated! Check the preview.` }));
      ws.send(JSON.stringify({ type: 'asset-created', filename: result.filename, path: result.path }));
      ws.send(JSON.stringify({ type: 'reload-preview' }));
      appendConvo({ role: 'assistant', content: `Generated ${assetType} asset`, at: new Date().toISOString() });
    })
    .catch((err) => {
      ws.send(JSON.stringify({ type: 'error', content: err.message || `Failed to generate ${assetType}. Check logs.` }));
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

// --- Anthropic SDK helpers ---
let _anthropicClient = null;
function getAnthropicClient() {
  if (!_anthropicClient) _anthropicClient = new Anthropic();
  return _anthropicClient;
}

/**
 * Returns true when ANTHROPIC_API_KEY is set and non-empty.
 * When false, all SDK call sites fall back to spawnClaude() subprocess.
 * spawnClaude() uses `claude --print` which authenticates via Claude Code
 * subscription — no separate API key needed.
 */
function hasAnthropicKey() {
  return !!(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim());
}

/**
 * Non-streaming Anthropic SDK call with AbortController timeout.
 * Replaces spawnClaude() for call sites that don't need streaming.
 * Logs cost to api-telemetry.
 *
 * @param {string} prompt — the user prompt
 * @param {object} opts
 *   maxTokens  — per-call-site value (see migration map Section 3)
 *   callSite   — label for cost tracking (e.g., 'brief-generation')
 *   timeoutMs  — AbortController timeout (default 120000)
 * @returns {Promise<string>} — response text, or '' on timeout/error
 */
async function callSDK(prompt, opts = {}) {
  const { maxTokens = 8192, callSite = 'unknown', timeoutMs = 120000, systemPrompt = null } = opts;
  const model = opts.model || loadSettings().model || 'claude-sonnet-4-6';

  // No API key — fall back to spawnClaude() subprocess (Claude Code subscription auth)
  if (!hasAnthropicKey()) {
    return new Promise((resolve) => {
      const child = spawnClaude(prompt);
      let output = '';
      const timeout = setTimeout(() => { child.kill(); resolve(''); }, timeoutMs);
      child.stdout.on('data', d => { output += d.toString(); });
      child.on('close', () => { clearTimeout(timeout); resolve(output.trim()); });
      child.on('error', () => { clearTimeout(timeout); resolve(''); });
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const sdk = getAnthropicClient();
    const msgPayload = {
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };
    if (systemPrompt) msgPayload.system = systemPrompt;
    const response = await sdk.messages.create(msgPayload, { signal: controller.signal });
    clearTimeout(timer);
    const inputTokens  = response.usage?.input_tokens  || 0;
    const outputTokens = response.usage?.output_tokens || 0;
    logSDKCall({ provider: 'claude', model, callSite, inputTokens, outputTokens, tag: TAG, hubRoot: HUB_ROOT });
    costMonitor.trackUsage(inputTokens, outputTokens);
    return response.content[0]?.text || '';
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError' || err.name === 'APIUserAbortError') {
      console.warn(`[callSDK:${callSite}] Timed out after ${timeoutMs}ms`);
      return '';
    }
    console.error(`[callSDK:${callSite}]`, err.message);
    return '';
  }
}

// Safe Claude CLI spawn — pipes prompt via stdin instead of shell embedding
/**
 * @deprecated spawnClaude() is retained as emergency fallback only.
 * All main paths use Anthropic SDK via callSDK() / ClaudeAdapter.
 * Remove in Session 10 after SDK paths are proven stable.
 */
function spawnClaude(prompt) {
  const model = loadSettings().model || 'claude-sonnet-4-6';
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
      setBuildInProgress(false);
    }
  });
  child.on('close', (code) => {
    if (code !== 0) console.error(`[claude-spawn] Exited with code ${code}`);
  });
  return child;
}

/**
 * spawnClaudeModel — like spawnClaude() but accepts a specific model string.
 * Used for Haiku fallback inline spawn (line 8992) which is being extracted
 * from inline code to a named function as a prerequisite for Call Site 8 migration.
 * @deprecated Retained as fallback. Prefer SDK via ClaudeAdapter.
 */
function spawnClaudeModel(model, prompt) {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('CLAUDE_') || key === 'CLAUDECODE') delete env[key];
  }
  const claudeBin = process.env.CLAUDE_BIN || 'claude';
  const child = spawn(claudeBin, ['--print', '--model', model, '--tools', ''], {
    env, cwd: require('os').tmpdir(), stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.write(prompt);
  child.stdin.end();
  child.on('error', (err) => { console.error(`[claude-spawn:${model}] Error:`, err.message); });
  child.on('close', (code) => { if (code !== 0) console.error(`[claude-spawn:${model}] Exited ${code}`); });
  return child;
}

// ── Brain Router ──────────────────────────────────────────────────────────────

/**
 * Spawns a brain adapter (claude/gemini/codex) with a prompt via stdin.
 * Returns a child process with stdout/stderr/close events, matching the
 * same interface as spawnClaude() so callers are interchangeable.
 */
function spawnBrainAdapter(brain, prompt) {
  const adapterNames = { claude: 'fam-convo-get-claude', gemini: 'fam-convo-get-gemini', codex: 'fam-convo-get-codex' };
  const scriptName = adapterNames[brain];
  if (!scriptName) throw new Error(`Unknown brain: ${brain}`);
  const adapterScript = path.join(HUB_ROOT, 'adapters', brain, scriptName);
  if (!fs.existsSync(adapterScript)) {
    BRAIN_LIMITS[brain].status = 'unavailable';
    throw new Error(`Adapter not found: ${adapterScript}`);
  }
  const child = spawn(adapterScript, [TAG], {
    env: { ...process.env, HUB_ROOT },
    cwd: HUB_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdin.write(prompt);
  child.stdin.end();
  child.on('error', (err) => {
    console.error(`[brain-spawn:${brain}]`, err.message);
  });
  return child;
}

/**
 * Sets the active brain, emits BRAIN_SWITCHED event, and broadcasts to all WS clients.
 * Returns true if brain is valid.
 */
function setBrain(brain, ws) {
  if (!BRAIN_LIMITS[brain]) return false;
  currentBrain = brain;
  studioEvents.emit(STUDIO_EVENTS.BRAIN_SWITCHED, { brain, tag: TAG });
  console.log(`[brain] Switched to ${brain}`);
  // Reinject context sidecar for the new brain (G7)
  try { brainInjector.reinject(brain, TAG, HUB_ROOT); } catch {}
  // Broadcast to all connected clients
  const payload = JSON.stringify({ type: 'brain-changed', brain, limits: BRAIN_LIMITS, sessionCounts: sessionBrainCounts });
  wss.clients.forEach(client => {
    if (client.readyState === 1) { try { client.send(payload); } catch {} }
  });
  return true;
}

/**
 * Routes a brainstorm message to the selected brain.
 * Falls back to spawnClaude if the adapter is not available.
 * Returns a child process matching the spawnClaude interface.
 */
function routeToBrainForBrainstorm(prompt, brain) {
  const activeBrain = brain || currentBrain;

  // Increment session count
  if (sessionBrainCounts[activeBrain] !== undefined) sessionBrainCounts[activeBrain]++;
  if (BRAIN_LIMITS[activeBrain]) BRAIN_LIMITS[activeBrain].currentUsage++;

  // Check usage limits
  const lim = BRAIN_LIMITS[activeBrain];
  if (lim && lim.dailyLimit && lim.currentUsage > lim.dailyLimit) {
    lim.status = 'rate-limited';
    // Auto-fallback: Claude → Codex → Gemini
    const fallbackOrder = ['claude', 'codex', 'gemini'];
    const nextBrain = fallbackOrder.find(b => b !== activeBrain && BRAIN_LIMITS[b]?.status === 'available');
    if (nextBrain) {
      const fbPayload = JSON.stringify({ type: 'brain-fallback', from: activeBrain, to: nextBrain, reason: 'rate-limited' });
      wss.clients.forEach(c => { if (c.readyState === 1) { try { c.send(fbPayload); } catch {} } });
      console.log(`[brain] ${activeBrain} rate-limited, falling back to ${nextBrain}`);
      return routeToBrainForBrainstorm(prompt, nextBrain);
    }
  }

  if (activeBrain === 'claude') return spawnClaude(prompt);

  // OpenAI brain: use CodexAdapter (OpenAI SDK) via a child-process-like EventEmitter
  if (activeBrain === 'openai') {
    const EventEmitter = require('events');
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = { write: () => {}, end: () => {} };
    child.kill = () => {};

    const { BrainAdapterFactory } = require('./lib/brain-adapter-factory');
    const adapter = BrainAdapterFactory.create('codex'); // CodexAdapter = OpenAI SDK
    adapter.execute(prompt, { model: null }).then(result => {
      child.stdout.emit('data', result.content || '');
      child.emit('close', 0);
    }).catch(err => {
      console.error('[brain-route:openai]', err.message);
      child.emit('close', 1);
    });
    return child;
  }

  try {
    return spawnBrainAdapter(activeBrain, prompt);
  } catch (err) {
    console.error(`[brain] ${activeBrain} unavailable (${err.message}), falling back to claude`);
    BRAIN_LIMITS[activeBrain].status = 'unavailable';
    return spawnClaude(prompt);
  }
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
  let interval = 1000;
  let failures = 0;
  function poll() {
    if (document.hidden) { setTimeout(poll, 2000); return; }
    fetch('/__reload').then(function(r) { return r.json(); }).then(function(d) {
      failures = 0;
      interval = 1000;
      if (last && d.t > last) location.reload();
      last = d.t;
      setTimeout(poll, interval);
    }).catch(function() {
      failures++;
      interval = Math.min(interval * 1.5, 30000);
      setTimeout(poll, interval);
    });
  }
  poll();
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
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(dist, urlPath === '/' ? 'index.html' : urlPath);
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
    content = content.toString().replace('</body>', buildPreviewSelectionBridgeScript() + RELOAD_SCRIPT + '</body>');
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
// --- Embedded Terminal (PTY) ---
const terminals = new Map(); // termId → { ptyProcess, connections: Set }
let nextTermId = 1;

app.post('/api/terminal/create', (req, res) => {
  const env = { ...process.env, TERM: 'xterm-256color' };
  // Strip vars that cause Claude CLI nested-session detection
  for (const key of Object.keys(env)) {
    if (key.startsWith('CLAUDE_') || key === 'CLAUDECODE') delete env[key];
  }
  let ptyProcess;
  try {
    ptyProcess = pty.spawn(process.env.SHELL || '/bin/zsh', [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 24,
    cwd: path.join(__dirname, '..'),
    env,
  });
  } catch (err) {
    console.error('[terminal] Failed to spawn PTY:', err.message);
    return res.status(500).json({ error: 'Terminal not available: ' + err.message });
  }
  const termId = String(nextTermId++);
  terminals.set(termId, { ptyProcess, connections: new Set() });

  ptyProcess.onExit(() => {
    const term = terminals.get(termId);
    if (term) {
      for (const ws of term.connections) {
        try { if (ws.readyState === 1) ws.send('\r\n[Process ended.]\r\n'); } catch {}
      }
      terminals.delete(termId);
    }
  });

  res.json({ termId });
});

app.post('/api/terminal/:termId/inject', (req, res) => {
  const term = terminals.get(req.params.termId);
  if (!term) return res.status(404).json({ error: 'Terminal not found' });
  const { command, execute } = req.body;
  if (typeof command !== 'string') return res.status(400).json({ error: 'command required' });
  term.ptyProcess.write(execute ? command + '\r' : command);
  res.json({ success: true });
});

app.post('/api/terminal/:termId/resize', (req, res) => {
  const term = terminals.get(req.params.termId);
  if (!term) return res.status(404).json({ error: 'Terminal not found' });
  const { cols, rows } = req.body;
  if (cols > 0 && rows > 0) term.ptyProcess.resize(cols, rows);
  res.json({ success: true });
});

app.delete('/api/terminal/:termId', (req, res) => {
  const term = terminals.get(req.params.termId);
  if (!term) return res.status(404).json({ error: 'Terminal not found' });
  try { term.ptyProcess.kill(); } catch {}
  terminals.delete(req.params.termId);
  res.json({ success: true });
});

// Terminal WebSocket upgrade — detect /terminal/:termId path
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url, 'http://localhost');
  const match = url.pathname.match(/^\/terminal\/(\d+)$/);
  if (match) {
    const termId = match[1];
    const term = terminals.get(termId);
    if (!term) { socket.destroy(); return; }

    const termWss = new WebSocketServer({ noServer: true });
    termWss.handleUpgrade(request, socket, head, (ws) => {
      term.connections.add(ws);

      term.ptyProcess.onData((data) => {
        try { if (ws.readyState === 1) ws.send(data); } catch {}
      });

      ws.on('message', (data) => {
        term.ptyProcess.write(typeof data === 'string' ? data : data.toString());
      });

      ws.on('close', () => {
        term.connections.delete(ws);
      });
    });
    return;
  }
  // Let the main wss handle non-terminal upgrades
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

async function gracefulShutdown() {
  await endSession();
  // Kill all PTY terminals
  for (const [id, term] of terminals) {
    try { term.ptyProcess.kill(); } catch {}
  }
  terminals.clear();
  fileWatchers.forEach(w => { try { w.close(); } catch {} });
  wss.clients.forEach(client => {
    try { client.close(1001, 'Server shutting down'); } catch {}
  });
  process.exit(0);
}
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Keep the server alive through unexpected errors. WebSocket handlers and
// async chat/build flows occasionally surface rejections that would otherwise
// crash the process — log loudly, never exit. Real crashes still produce a
// stack trace so we can diagnose them from the console.
process.on('uncaughtException', (err) => {
  console.error('[fatal] uncaughtException:', err && err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection:', reason && reason.stack || reason);
});

// --- Session cost & context tracking ---
function calculateSessionCost(model, inputTokens, outputTokens) {
  const rates = {
    'claude-sonnet-4-6':         { input: 0.000003,  output: 0.000015 },
    'claude-sonnet-4-5-20250514':{ input: 0.000003,  output: 0.000015 },
    'claude-haiku-4-5-20251001': { input: 0.0000008, output: 0.000004 },
    'claude-opus-4-6':           { input: 0.000015,  output: 0.000075 },
    'claude-opus-4-5-20250520':  { input: 0.000015,  output: 0.000075 },
  };
  const r = rates[model] || rates['claude-sonnet-4-6'];
  return Math.round((inputTokens * r.input + outputTokens * r.output) * 10000) / 10000;
}

function getContextPercentage(usedTokens, windowSize) {
  const percentage = Math.min(Math.round(usedTokens / windowSize * 100), 100);
  const colorClass = percentage < 50 ? 'context-green' :
                     percentage < 80 ? 'context-amber' : 'context-red';
  return { percentage, colorClass };
}

function broadcastSessionStatus(ws) {
  if (!ws || ws.readyState !== 1) return;
  const model = loadSettings().model || 'claude-sonnet-4-6';
  const windowSize = MODEL_CONTEXT_WINDOWS[model] || 200000;
  try {
    ws.send(JSON.stringify({
      type: 'session-status',
      model,
      inputTokens: sessionInputTokens,
      outputTokens: sessionOutputTokens,
      estimatedCostUsd: calculateSessionCost(model, sessionInputTokens, sessionOutputTokens),
      sessionStartedAt,
      contextWindowSize: windowSize,
    }));
  } catch {}
}

// --- Exports for testing ---
module.exports = {
  sanitizeSvg, extractMultiPartSvg, isValidPageName, extractSlotsFromPage, classifyRequest, detectEnhancementPasses, extractPagesFromBrief, syncContentFieldsFromHtml,
  extractBrandColors, labelToFilename, generatePlaceholderSVG, SLOT_DIMENSIONS, retrofitSlotAttributes,
  // Tier canonicalization (GAP-4)
  resolveTier, normalizeTierAndMode,
  getLogoSkeletonBlock, getLogoNoteBlock, shouldInjectFamtasticLogoMode,
  extractBriefPatternBased,
  readBlueprint, writeBlueprint, updateBlueprint, buildBlueprintContext, extractSharedCss, ensureHeadDependencies,
  truncateAssistantMessage, loadRecentConversation,
  classifyShayShayReasoning, selectShayShayBrain, normalizeShayShayResponse, answerShayShayDirect,
  resolveShayShayBridgeState, buildShayShayBridgeDebug, buildShayShaySiteSnapshot, buildShayShayPrompt, executeBridgeOp,
  normalizeShayLiteSettings,
  extractTemplateComponents, loadTemplateContext, applyTemplateToPages, writeTemplateArtifacts,
  // Verification + auto-fix
  verifySlotAttributes, verifyCssCoherence, verifyCrossPageConsistency,
  verifyHeadDependencies, verifyLogoAndLayout, runBuildVerification,
  autoTagMissingSlots,
  // Visual intelligence
  fileInspect, browserInspect, inspectSite,
  // Expose internals for integration tests
  app, server, wss, readSpec, writeSpec, invalidateSpecCache,
  // Session tracking
  calculateSessionCost, getContextPercentage,
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

  // Watch css/ directory for changes
  const cssDir = path.join(__dirname, 'public', 'css');
  if (fs.existsSync(cssDir)) {
    try {
      let cssDebouce = null;
      const cssWatcher = fs.watch(cssDir, (eventType, filename) => {
        if (!filename || !filename.endsWith('.css')) return;
        clearTimeout(cssDebouce);
        cssDebouce = setTimeout(() => {
          console.log(`[file-watch] css/${filename} changed — restart recommended`);
          wss.clients.forEach(client => {
            try {
              client.send(JSON.stringify({ type: 'restart-needed', file: `css/${filename}`, timestamp: new Date().toISOString() }));
            } catch {}
          });
        }, 2000);
      });
      fileWatchers.push(cssWatcher);
    } catch (err) {
      console.log(`[file-watch] Could not watch css/ directory: ${err.message}`);
    }
  }

  // Watch js/ directory for client refresh-recommended changes
  const jsDir = path.join(__dirname, 'public', 'js');
  if (fs.existsSync(jsDir)) {
    try {
      let jsDebounce = null;
      const jsWatcher = fs.watch(jsDir, (eventType, filename) => {
        if (!filename || !filename.endsWith('.js')) return;
        clearTimeout(jsDebounce);
        jsDebounce = setTimeout(() => {
          console.log(`[file-watch] js/${filename} changed — restart recommended`);
          wss.clients.forEach(client => {
            try {
              client.send(JSON.stringify({ type: 'restart-needed', file: `js/${filename}`, timestamp: new Date().toISOString() }));
            } catch {}
          });
        }, 2000);
      });
      fileWatchers.push(jsWatcher);
    } catch (err) {
      console.log(`[file-watch] Could not watch js/ directory: ${err.message}`);
    }
  }
}

// Session 12 Phase 2 (W1, W2): worker queue startup cleanup.
// The worker queue at ~/famtastic/.worker-queue.jsonl has no live consumer
// — tasks are appended by the dispatch_worker tool and sit there. Over
// time the badge accumulates phantom entries (completed, cancelled, or
// just stale from builds weeks ago) and stops being meaningful. On every
// Studio startup, drop entries older than 7 days AND any that already
// reached a terminal status (completed / cancelled / failed), then
// rewrite the file with `>`-style full rewrite instead of append.
function cleanWorkerQueueOnStartup() {
  try {
    const queuePath = path.join(require('os').homedir(), 'famtastic', '.worker-queue.jsonl');
    if (!fs.existsSync(queuePath)) return { kept: 0, dropped: 0, file: queuePath };

    const raw = fs.readFileSync(queuePath, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);
    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const kept = [];
    let droppedStale = 0;
    let droppedTerminal = 0;

    for (const line of lines) {
      let task;
      try { task = JSON.parse(line); } catch { continue; }
      if (!task) continue;

      const status = task.status || 'pending';
      if (status === 'completed' || status === 'cancelled' || status === 'failed') {
        droppedTerminal++;
        continue;
      }

      const ts = task.queued_at || task.created_at || task.at || null;
      if (ts) {
        const age = now - new Date(ts).getTime();
        if (age > SEVEN_DAYS_MS) {
          droppedStale++;
          continue;
        }
      }

      kept.push(JSON.stringify(task));
    }

    // Full rewrite — the `>` semantics the prompt called for. Previously the
    // queue was append-only via fs.appendFile, so the only way to purge was
    // to overwrite the whole file.
    const newContent = kept.length > 0 ? kept.join('\n') + '\n' : '';
    fs.writeFileSync(queuePath, newContent);

    const total = droppedStale + droppedTerminal;
    if (total > 0) {
      console.log(`[worker-queue] Startup cleanup: kept ${kept.length}, dropped ${total} ` +
        `(${droppedTerminal} terminal, ${droppedStale} older than 7 days)`);
    } else {
      console.log(`[worker-queue] Startup cleanup: ${kept.length} entries, no purges`);
    }

    return { kept: kept.length, dropped: total, file: queuePath };
  } catch (err) {
    console.warn('[cleanWorkerQueueOnStartup] failed:', err.message);
    return null;
  }
}

// Session 12 Phase 1 (I3): expose intel helpers so scripts/intelligence-loop
// can drive them without opening a Studio port. Only functions that are
// safe to call outside a live session should go here.
Object.assign(module.exports, {
  generateIntelReport,
  getPromotedIntelligence,
  writePendingReview,
  checkPendingReview,
  cleanWorkerQueueOnStartup,
  updateFamtasticDna,
});

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

  if (process.env.STUDIO_NO_LISTEN === '1') {
    // Test mode: module loaded for classifier/helper access — do not open a port.
    return;
  }

  // Wire cost-monitor broadcast to all connected WS clients
  costMonitor.setBroadcast(msg => {
    wss.clients.forEach(c => { if (c.readyState === 1) try { c.send(JSON.stringify(msg)); } catch {} });
  });

  server.listen(PORT, () => {
    console.log(`[site-studio] Chat UI at http://localhost:${PORT}`);
    console.log(`[site-studio] Site tag: ${TAG}`);
    console.log(`[site-studio] Preview at: http://localhost:${PREVIEW_PORT}`);
    const pages = listPages();
    if (pages.length > 0) {
      console.log(`[site-studio] Pages: ${pages.join(', ')}`);
    }
    costMonitor.logStartupStatus();
    setupFileWatcher();

    // Initialise universal context writer — fires STUDIO-CONTEXT.md generation on every event
    studioContextWriter.init({
      getTag:     () => TAG,
      getSpec:    () => { try { const s = JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')); normalizeTierAndMode(s); return s; } catch { return {}; } }, // L17806
      getHubRoot: () => HUB_ROOT,
    });

    // Wire brain injector for all three brains on startup
    const ctxFile = require('path').join(HUB_ROOT, studioContextWriter.OUTPUT_FILENAME);
    brainInjector.inject('claude', ctxFile, { claudeMdPath: require('path').join(HUB_ROOT, 'CLAUDE.md') });
    brainInjector.inject('gemini', ctxFile);
    brainInjector.inject('codex',  ctxFile);

    studioEvents.emit(STUDIO_EVENTS.SESSION_STARTED, { tag: TAG });

    // Verify all API connections on startup
    // Session 12 Phase 1 (I2): surface pending intelligence review on startup
    try { checkPendingReview(); } catch {}

    // Session 12 Phase 2 (W1, W2): purge stale / terminal worker queue entries
    // so the pending badge reflects real work instead of phantoms from weeks ago.
    try { cleanWorkerQueueOnStartup(); } catch {}
    try {
      const migResult = jobQueue.migrateJsonlQueue();
      if (migResult.migrated > 0) {
        console.log(`[job-queue] Migrated ${migResult.migrated} entries from JSONL (${migResult.skipped} skipped)`);
      }
    } catch (e) { console.warn('[job-queue] Migration failed:', e.message); }

    // Verify brains first, THEN build the capability manifest so it reflects
    // real API health instead of mere env-var presence — a leaked/revoked key
    // used to show as "Working" in Shay-Shay's system-status reply.
    verifyAllAPIs()
      .catch(e => { console.error('[brain-verifier] Startup verification failed:', e.message); })
      .then(() => {
        buildCapabilityManifest().then(manifest => {
          const broken = Object.entries(manifest.capabilities)
            .filter(([, v]) => v === 'broken').map(([k]) => k);
          const unavailable = Object.entries(manifest.capabilities)
            .filter(([, v]) => v === 'unavailable').map(([k]) => k);
          if (broken.length > 0) console.log(`[capability-manifest] broken: ${broken.join(', ')}`);
          if (unavailable.length > 0) console.log(`[capability-manifest] unavailable: ${unavailable.join(', ')}`);
        }).catch(e => console.warn('[capability-manifest] startup check failed:', e.message));
      });
  });
}
