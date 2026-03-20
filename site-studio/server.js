const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

// --- Config ---
const PORT = parseInt(process.env.STUDIO_PORT || '3334', 10);
const PREVIEW_PORT = parseInt(process.env.PREVIEW_PORT || '3333', 10);
let TAG = process.env.SITE_TAG || 'site-demo';
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

// --- Multi-page state ---
let currentPage = 'index.html';
let sessionMessageCount = 0;
let sessionStartedAt = new Date().toISOString();
const ACCEPTED_TYPES = /\.(png|jpe?g|gif|svg|webp|html|zip)$/i;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_UPLOADS_PER_SITE = 20;

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
  // Whitelist approach: strip dangerous elements and attributes
  let clean = svgContent;
  // Remove <script> tags and content
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '');
  clean = clean.replace(/<script[^>]*\/>/gi, '');
  // Remove on* event attributes
  clean = clean.replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '');
  clean = clean.replace(/\s+on\w+\s*=\s*'[^']*'/gi, '');
  // Remove javascript: URIs
  clean = clean.replace(/href\s*=\s*"javascript:[^"]*"/gi, 'href="#"');
  clean = clean.replace(/href\s*=\s*'javascript:[^']*'/gi, "href='#'");
  clean = clean.replace(/xlink:href\s*=\s*"javascript:[^"]*"/gi, 'xlink:href="#"');
  // Remove <foreignObject> (can embed HTML)
  clean = clean.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  // Remove <use> with external references (can load remote content)
  clean = clean.replace(/<use[^>]*href\s*=\s*"https?:[^"]*"[^>]*\/?>(?:<\/use>)?/gi, '');
  return clean;
}

// --- Site Versioning ---
function versionFile(page, reason) {
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
  // Read recent conversation
  if (!fs.existsSync(CONVO_FILE())) return;
  const lines = fs.readFileSync(CONVO_FILE(), 'utf8').trim().split('\n').filter(Boolean);
  if (lines.length < 3) return; // Not enough to summarize

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

  const child = spawnClaude(prompt);

  let response = '';
  child.stdout.on('data', (chunk) => { response += chunk.toString(); });
  child.stderr.on('data', (chunk) => { console.error('[summary]', chunk.toString()); });

  child.on('close', (code) => {
    if (code !== 0 || !response.trim()) {
      console.error('[summary] Failed to generate session summary');
      return;
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

function endSession() {
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

    // Generate session summary if there was meaningful conversation
    if (sessionMessageCount >= 3) {
      generateSessionSummary();
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
    .filter(f => f.endsWith('.html'))
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

// Serve spec.json
app.get('/api/spec', (req, res) => {
  if (fs.existsSync(SPEC_FILE())) {
    res.json(JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')));
  } else {
    res.json({ error: 'No spec.json found' });
  }
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
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
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
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
  const existingUploads = spec.uploaded_assets || [];
  if (existingUploads.length >= MAX_UPLOADS_PER_SITE) {
    // Remove the uploaded file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: `Upload limit reached (max ${MAX_UPLOADS_PER_SITE} per site)` });
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
      fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
      return res.json({ success: true, message: `Template imported as index.html`, imported: 'index.html' });
    }

    if (ext === '.zip') {
      const { execSync } = require('child_process');
      try {
        execSync(`unzip -o "${req.file.path}" -d "${DIST_DIR()}"`, { stdio: 'pipe' });
        fs.unlinkSync(req.file.path); // clean up zip
        spec.template_imported = true;
        spec.template_source = req.file.originalname;
        fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
        const imported = fs.readdirSync(DIST_DIR()).filter(f => f.endsWith('.html'));
        return res.json({ success: true, message: `Template extracted: ${imported.join(', ')}`, imported });
      } catch (e) {
        fs.unlinkSync(req.file.path);
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
  fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));

  res.json({
    success: true,
    asset,
    path: `/assets/uploads/${req.file.filename}`,
  });
});

// Update asset metadata (role, label, notes)
app.put('/api/upload/:filename', (req, res) => {
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
  const assets = spec.uploaded_assets || [];
  const asset = assets.find(a => a.filename === req.params.filename);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  if (req.body.role) asset.role = req.body.role;
  if (req.body.label !== undefined) asset.label = req.body.label;
  if (req.body.notes !== undefined) asset.notes = req.body.notes;

  fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
  res.json({ success: true, asset });
});

// List uploaded assets
app.get('/api/uploads', (req, res) => {
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
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
  const versions = getVersions(page);
  const target = versions.find(v => v.timestamp === req.params.timestamp);
  if (!target) return res.status(404).json({ error: 'Version not found' });

  const versionPath = path.join(DIST_DIR(), target.file);
  if (!fs.existsSync(versionPath)) return res.status(404).json({ error: 'Version file missing' });

  const content = fs.readFileSync(versionPath, 'utf8');
  res.json({ ...target, content });
});

app.post('/api/rollback', (req, res) => {
  const { page, timestamp } = req.body;
  if (!page || !timestamp) return res.status(400).json({ error: 'page and timestamp required' });

  const result = rollbackToVersion(page, timestamp);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

// --- Brief Edit API ---
app.put('/api/brief', (req, res) => {
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
  if (!spec.design_brief) spec.design_brief = {};
  // Merge partial fields into existing brief
  const allowed = ['goal', 'audience', 'tone', 'visual_direction', 'content_priorities', 'must_have_sections', 'avoid'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      spec.design_brief[key] = req.body[key];
    }
  }
  fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
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
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
  if (!spec.design_decisions) spec.design_decisions = [];
  const { action, index, decision } = req.body;

  switch (action) {
    case 'add':
      if (!decision || !decision.category || !decision.decision) {
        return res.status(400).json({ error: 'category and decision text required' });
      }
      spec.design_decisions.push({
        timestamp: new Date().toISOString(),
        category: decision.category,
        decision: decision.decision,
        status: decision.status || 'approved',
      });
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

  fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
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

// --- Brand Health Scanner ---
function scanBrandHealth() {
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
  const uploads = spec.uploaded_assets || [];

  const htmlPath = path.join(DIST_DIR(), 'index.html');
  const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, 'utf8') : '';

  const logoUpload = uploads.find(a => a.role === 'brand_asset' || a.filename.match(/logo/i));
  const logoInHtml = html.match(/<img[^>]*(?:logo|brand)[^>]*>/i);
  const logoStatus = logoUpload ? 'uploaded' : (logoInHtml ? 'set_in_html' : 'missing');

  const faviconInHtml = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*>/i);
  const faviconUpload = uploads.find(a => a.filename.match(/favicon|ico/i));
  const faviconStatus = faviconUpload ? 'uploaded' : (faviconInHtml ? 'set_in_html' : 'missing');

  const heroUpload = uploads.find(a => a.filename.match(/hero/i) || a.label?.match(/hero/i));
  const heroInHtml = html.match(/hero/i) && html.match(/<img[^>]*>/i);
  const heroStatus = heroUpload ? 'uploaded' : (heroInHtml ? 'set_in_html' : 'missing');

  const fontAwesome = html.match(/font-?awesome/i);
  const heroicons = html.match(/heroicons/i);
  const materialIcons = html.match(/material.*icons/i);
  const usingFontIcons = !!(fontAwesome || heroicons || materialIcons);
  const fontIconProvider = fontAwesome ? 'Font Awesome' : heroicons ? 'Heroicons' : materialIcons ? 'Material Icons' : null;

  const ogImage = !!html.match(/<meta[^>]*property=["']og:image["'][^>]*>/i);
  const twitterCard = !!html.match(/<meta[^>]*name=["']twitter:card["'][^>]*>/i);

  const health = {
    logo: { status: logoStatus, filename: logoUpload?.filename || null },
    favicon: { status: faviconStatus, filename: faviconUpload?.filename || null },
    hero_image: { status: heroStatus, filename: heroUpload?.filename || null },
    font_icons: { using: usingFontIcons, provider: fontIconProvider },
    social_meta: { og_image: ogImage, twitter_card: twitterCard },
  };

  const suggestions = [];
  if (logoStatus === 'missing') suggestions.push({ item: 'logo', action: 'Upload your logo or say "create a logo" in chat' });
  if (faviconStatus === 'missing') suggestions.push({ item: 'favicon', action: 'Upload a favicon or say "create a favicon" in chat' });
  if (heroStatus === 'missing') suggestions.push({ item: 'hero_image', action: 'Upload a hero image or generate one with AI' });
  if (!ogImage) suggestions.push({ item: 'og_image', action: 'Add Open Graph image meta tag for social sharing' });
  if (!twitterCard) suggestions.push({ item: 'twitter_card', action: 'Add Twitter card meta for better social previews' });

  spec.brand_health = health;
  fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));

  return { health, suggestions };
}

app.get('/api/brand-health', (req, res) => {
  res.json(scanBrandHealth());
});

// --- Auto Media Spec Scanner ---
// Scans HTML for image slots and auto-creates media specs for missing ones
function autoDetectMediaSpecs(html) {
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
  if (!spec.media_specs) spec.media_specs = [];
  const existing = new Set(spec.media_specs.map(s => s.slot));
  let added = 0;

  // Detect hero images/backgrounds
  if (html.match(/(?:hero|banner)[\s\S]{0,500}(?:background-image|<img)/i) && !existing.has('hero_image')) {
    spec.media_specs.push({ slot: 'hero_image', dimensions: '1920x1080', format: 'jpg', purpose: 'Landing hero background', status: 'missing' });
    added++;
  }

  // Detect logo references
  if (html.match(/<img[^>]*(?:logo|brand)[^>]*>/i) && !existing.has('logo')) {
    spec.media_specs.push({ slot: 'logo', dimensions: '200x50', format: 'svg', purpose: 'Primary brand mark', status: 'missing' });
    added++;
  }

  // Detect favicon
  if (html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["']/i) && !existing.has('favicon')) {
    spec.media_specs.push({ slot: 'favicon', dimensions: '32x32', format: 'png', purpose: 'Browser tab icon', status: 'missing' });
    added++;
  }

  // Detect OG image meta
  if (html.match(/<meta[^>]*property=["']og:image["']/i) && !existing.has('og_image')) {
    spec.media_specs.push({ slot: 'og_image', dimensions: '1200x630', format: 'jpg', purpose: 'Social sharing preview image', status: 'missing' });
    added++;
  }

  // Detect gallery/portfolio images
  if (html.match(/(?:gallery|portfolio|grid)[\s\S]{0,1000}(?:<img[^>]*>[\s\S]{0,200}){3,}/i) && !existing.has('gallery_images')) {
    spec.media_specs.push({ slot: 'gallery_images', dimensions: '800x600', format: 'jpg', purpose: 'Gallery/portfolio photos', status: 'missing' });
    added++;
  }

  // Detect team/about section images
  if (html.match(/(?:team|about|staff)[\s\S]{0,500}<img/i) && !existing.has('team_photos')) {
    spec.media_specs.push({ slot: 'team_photos', dimensions: '400x400', format: 'jpg', purpose: 'Team member headshots', status: 'missing' });
    added++;
  }

  // Cross-reference uploaded assets — mark specs as uploaded if matching asset exists
  const uploads = spec.uploaded_assets || [];
  for (const ms of spec.media_specs) {
    if (ms.status === 'missing') {
      const match = uploads.find(a =>
        a.filename.match(new RegExp(ms.slot.replace('_', '[-_]?'), 'i')) ||
        a.label?.match(new RegExp(ms.slot.replace('_', '[ _-]?'), 'i'))
      );
      if (match) {
        ms.status = 'uploaded';
        ms.filename = match.filename;
      }
    }
  }

  if (added > 0) {
    fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
    console.log(`[media-specs] Auto-detected ${added} new media spec(s)`);
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
  currentPage = 'index.html';
  sessionMessageCount = 0;
  sessionStartedAt = new Date().toISOString();

  // Load new site state
  const studio = loadStudio();
  startSession();

  // Notify all connected clients
  const pages = listPages();
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
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
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
  if (!spec.media_specs) spec.media_specs = [];
  const { action, index, media_spec } = req.body;

  switch (action) {
    case 'add':
      if (!media_spec || !media_spec.slot) {
        return res.status(400).json({ error: 'slot is required' });
      }
      spec.media_specs.push({
        slot: media_spec.slot,
        dimensions: media_spec.dimensions || '',
        format: media_spec.format || '',
        purpose: media_spec.purpose || '',
        status: media_spec.status || 'missing',
        filename: media_spec.filename || null,
      });
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

  fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
  res.json({ success: true, media_specs: spec.media_specs });
});

// --- AI Image Prompt Generator ---
app.post('/api/generate-image-prompt', (req, res) => {
  const { slot, context } = req.body;
  const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
  const brief = spec.design_brief || {};

  const prompt = `Generate a concise, effective image generation prompt for Midjourney or DALL-E.

CONTEXT:
- Image slot: ${slot || 'general'}
- Additional context: ${context || 'none'}
- Site goal: ${brief.goal || 'not specified'}
- Audience: ${brief.audience || 'not specified'}
- Tone: ${Array.isArray(brief.tone) ? brief.tone.join(', ') : brief.tone || 'not specified'}
- Visual direction: ${JSON.stringify(brief.visual_direction || {})}
- Colors: ${JSON.stringify(spec.colors || {})}

OUTPUT FORMAT (respond with ONLY this JSON, no other text):
{
  "prompt": "the image generation prompt text",
  "suggested_dimensions": "e.g. 1920x1080",
  "format": "jpg or png or svg"
}

Make the prompt specific, visual, and tailored to the brand. Include style keywords. Do NOT include text/words in the image prompt.`;

  const child = spawnClaude(prompt);

  let response = '';
  child.stdout.on('data', (chunk) => { response += chunk.toString(); });
  child.stderr.on('data', (chunk) => { console.error('[image-prompt]', chunk.toString()); });

  child.on('close', (code) => {
    if (code !== 0 || !response.trim()) {
      return res.status(500).json({ error: 'Failed to generate image prompt' });
    }
    // Try to parse JSON from response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return res.json(result);
      }
    } catch {}
    // Fallback: return raw text as prompt
    res.json({ prompt: response.trim(), suggested_dimensions: '1920x1080', format: 'jpg' });
  });
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
    model: 'claude-sonnet-4-20250514',
    deploy_target: 'netlify',
    deploy_team: 'fritz-medine',
    preview_port: 3333,
    studio_port: 3334,
    max_upload_size_mb: 5,
    max_uploads_per_site: 20,
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

app.get('/api/settings', (req, res) => {
  res.json(loadSettings());
});

app.put('/api/settings', (req, res) => {
  const current = loadSettings();
  const updated = { ...current, ...req.body };
  saveSettings(updated);
  res.json(updated);
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
  } else if (requestType === 'layout_update' || requestType === 'restyle') {
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
      return desc;
    }).join('\n');
    assetsContext += '\nIMPORTANT: "inspiration" assets show the VIBE the user wants, not content to copy literally. "content" assets should be used directly. "brand_asset" assets (logos, etc.) should be referenced in the HTML.';
  }

  // Cross-session context
  let sessionContext = '';
  const summaries = loadSessionSummaries(2);
  if (summaries.length > 0) {
    sessionContext = '\nPREVIOUS SESSION CONTEXT:\n' + summaries.map(s => s.content).join('\n---\n');
  }

  // Core anti-cookie-cutter rules
  const systemRules = `RULES:
- Never default to a generic business template layout
- Preserve approved design decisions unless the user explicitly changes them
- Interpret the site as a coherent brand system, not isolated sections
- Avoid filler copy and stock structure unless justified
- Every section should feel intentional for THIS specific business/project
- If the user's request conflicts with the brief, flag it — don't silently override`;

  return { htmlContext, briefContext, decisionsContext, systemRules, assetsContext, sessionContext };
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

  let response = '';
  child.stdout.on('data', (chunk) => { response += chunk.toString(); });
  child.stderr.on('data', (chunk) => { console.error('[data-model]', chunk.toString()); });

  child.on('close', (code) => {
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
          const currentSpec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
          currentSpec.data_model = dataModel;
          fs.writeFileSync(SPEC_FILE(), JSON.stringify(currentSpec, null, 2));

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

  let response = '';

  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    console.error('[planning]', chunk.toString());
  });

  child.on('close', (code) => {
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
      const currentSpec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
      currentSpec.design_brief = briefJson;

      // Analyze tech stack
      const techRecommendations = analyzeTechStack(briefJson);
      currentSpec.tech_recommendations = techRecommendations;

      fs.writeFileSync(SPEC_FILE(), JSON.stringify(currentSpec, null, 2));

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
  ws.send(JSON.stringify({ type: 'status', content: 'Entering brainstorm mode...' }));

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

  const prompt = `You are a creative design strategist for FAMtastic Site Studio. The user wants to BRAINSTORM — explore ideas, think through possibilities, discuss strategy.

DO NOT generate any HTML, CSS, or code. This is a THINKING conversation.

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

Respond as a thoughtful creative partner:
- Explore the idea with them
- Ask clarifying questions if needed
- Suggest creative directions
- Reference their existing decisions and brief
- Be opinionated but collaborative
- Keep it conversational, not formal

Do NOT output any HTML or suggest code changes. This is pure ideation.`;

  const child = spawnClaude(prompt);

  let response = '';
  child.stdout.on('data', (chunk) => { response += chunk.toString(); });
  child.stderr.on('data', (chunk) => { console.error('[brainstorm]', chunk.toString()); });

  child.on('close', (code) => {
    if (code !== 0 || !response.trim()) {
      ws.send(JSON.stringify({ type: 'error', content: 'Brainstorm failed. Try again.' }));
      return;
    }

    ws.send(JSON.stringify({ type: 'assistant', content: response.trim() }));
    appendConvo({ role: 'assistant', content: response.trim(), intent: 'brainstorm', at: new Date().toISOString() });
  });
}

// --- Enhanced Chat Handler ---
function handleChatMessage(ws, userMessage, requestType, spec) {
  ws.send(JSON.stringify({ type: 'status', content: 'Reading site spec...' }));

  const { htmlContext, briefContext, decisionsContext, systemRules, assetsContext, sessionContext } = buildPromptContext(requestType, spec, userMessage);

  ws.send(JSON.stringify({ type: 'status', content: `Classified as: ${requestType}` }));

  // Build mode-specific prompt
  let modeInstruction = '';
  const pages = listPages();
  const specPages = spec.pages || ['home'];
  const isMultiPage = specPages.length > 1 || (specPages.length === 1 && specPages[0] !== 'home');

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
        modeInstruction = `Generate a MULTI-PAGE website with separate HTML files for EACH page: ${specPages.join(', ')}.

PAGE CONTENT — generate real content for each:
- home (index.html): Hero, value proposition, highlights, CTA
- about: Story, mission, team, differentiators
- services: Service cards with descriptions and icons
- contact: Contact form, address/phone/email, hours
- portfolio/gallery: Image grid with captions
- pricing: Pricing tiers with features and CTAs
- Any other page: Content that fits its name and business type

RULES:
- EVERY page MUST be a complete HTML document (<!DOCTYPE html> to </html>)
- EVERY page MUST have real, substantial body content — multiple sections, styled layout, real copy
- ALL pages share the SAME nav bar with links to ALL other pages using real filenames (about.html, NOT #about)
- ALL pages share the SAME footer, Tailwind config, fonts, colors
- Do NOT output empty pages or skeleton pages
- Page naming: 'home' → index.html, others → lowercase-hyphenated.html

Use the MULTI_UPDATE response format with --- PAGE: filename.html --- delimiters between each page.`;
      } else {
        modeInstruction = 'Generate a complete single-page website.';
      }
      break;
    default:
      modeInstruction = 'Process the user request and update the site accordingly.';
  }

  const prompt = `You are a premium website builder assistant for FAMtastic Site Studio.

${systemRules}

REQUEST TYPE: ${requestType}
MODE: ${modeInstruction}
${briefContext}
${decisionsContext}
${assetsContext}
${sessionContext}

SITE SPEC:
${JSON.stringify({ site_name: spec.site_name, business_type: spec.business_type, colors: spec.colors, tone: spec.tone, fonts: spec.fonts }, null, 2)}

CURRENT SITE:
${htmlContext}

USER REQUEST: "${userMessage}"

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
- Nav links must be real file links (about.html) NOT anchors (#about)`;

  ws.send(JSON.stringify({ type: 'status', content: 'Sending to Claude...' }));

  const child = spawnClaude(prompt);

  let response = '';
  let firstChunk = true;

  child.stdout.on('data', (chunk) => {
    response += chunk.toString();
    if (firstChunk) {
      ws.send(JSON.stringify({ type: 'status', content: 'Claude is generating...' }));
      firstChunk = false;
    }
    ws.send(JSON.stringify({ type: 'stream', content: chunk.toString() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[claude]', chunk.toString());
  });

  child.on('close', (code) => {
    if (code !== 0 || !response.trim()) {
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
      for (let i = 1; i < pageParts.length; i += 2) {
        const filename = pageParts[i].trim();
        let html = (pageParts[i + 1] || '').trim();
        // Strip markdown fences wrapping individual pages
        html = html.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/, '');
        if (filename && html.length > 20) {
          versionFile(filename, requestType);
          fs.writeFileSync(path.join(DIST_DIR(), filename), html);
          writtenPages.push(filename);
          console.log(`[multi-page] Wrote: ${filename} (${html.length} bytes)`);
        } else if (filename) {
          console.warn(`[multi-page] WARN: ${filename} was empty or too small (${html.length} bytes), skipped`);
        }
      }

      if (changeSummary) {
        extractDecisions(spec, changeSummary, requestType);
      }

      if (writtenPages.length > 0) {
        // Auto-detect media specs from first written page (usually index.html)
        const firstHtml = fs.readFileSync(path.join(DIST_DIR(), writtenPages[0]), 'utf8');
        autoDetectMediaSpecs(firstHtml);

        const msg = changeSummary
          ? `Site built! ${writtenPages.length} pages created: ${writtenPages.join(', ')}\n\n${changeSummary}`
          : `Site built! ${writtenPages.length} pages created: ${writtenPages.join(', ')}`;
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

      // Auto-detect media specs from updated HTML
      autoDetectMediaSpecs(html);

      // Extract and log design decisions from change summary
      if (changeSummary) {
        extractDecisions(spec, changeSummary, requestType);
      }

      const msg = changeSummary
        ? `${currentPage} updated!\n\n${changeSummary}`
        : `${currentPage} updated! Check the preview.`;
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

  const currentSpec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
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
  fs.writeFileSync(SPEC_FILE(), JSON.stringify(currentSpec, null, 2));
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
    const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
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

    if (msg.type === 'chat') {
      const userMessage = msg.content;
      const ts = new Date().toISOString();
      sessionMessageCount++;

      // Log user message
      appendConvo({ role: 'user', content: userMessage, at: ts });

      // Load spec
      const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};

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
          let report = '**Brand Health Report**\n\n';
          const h = healthResult.health;
          const icon = (s) => s === 'missing' ? '🔴' : s === 'uploaded' ? '🟢' : '🟡';
          report += `${icon(h.logo.status)} Logo: ${h.logo.status}${h.logo.filename ? ` (${h.logo.filename})` : ''}\n`;
          report += `${icon(h.favicon.status)} Favicon: ${h.favicon.status}${h.favicon.filename ? ` (${h.favicon.filename})` : ''}\n`;
          report += `${icon(h.hero_image.status)} Hero Image: ${h.hero_image.status}${h.hero_image.filename ? ` (${h.hero_image.filename})` : ''}\n`;
          report += `${h.font_icons.using ? '🟢' : '⚪'} Font Icons: ${h.font_icons.using ? h.font_icons.provider : 'not detected'}\n`;
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
          ws.send(JSON.stringify({ type: 'status', content: template ? `Building with ${template} template...` : 'Building site...' }));
          runOrchestratorSite(ws, template);
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
      const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
      if (spec.design_brief) {
        spec.design_brief.approved = true;
        fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
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
      const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
      ws.send(JSON.stringify({ type: 'status', content: 'Skipping brief, building directly...' }));
      runOrchestratorSite(ws, null);
    }

    if (msg.type === 'upload-role-update') {
      // Update role/label for an uploaded asset
      const spec = fs.existsSync(SPEC_FILE()) ? JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8')) : {};
      const asset = (spec.uploaded_assets || []).find(a => a.filename === msg.filename);
      if (asset) {
        if (msg.role) asset.role = msg.role;
        if (msg.label !== undefined) asset.label = msg.label;
        fs.writeFileSync(SPEC_FILE(), JSON.stringify(spec, null, 2));
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
        const currentSpec = JSON.parse(fs.readFileSync(SPEC_FILE(), 'utf8'));
        const updated = { ...currentSpec, ...msg.updates };
        fs.writeFileSync(SPEC_FILE(), JSON.stringify(updated, null, 2));
        ws.send(JSON.stringify({ type: 'spec-updated', spec: updated }));
      } catch (e) {
        ws.send(JSON.stringify({ type: 'error', content: 'Failed to update spec: ' + e.message }));
      }
    }
  });

  ws.on('close', () => {
    console.log('[studio] Client disconnected');
    endSession();
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
  const templateFlag = template ? ` --template ${template}` : '';
  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && ./scripts/orchestrator-site "${TAG}"${templateFlag}`], {
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
  const prodFlag = isProd ? '--prod' : '';
  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && ./scripts/site-deploy "${TAG}" ${prodFlag}`], {
    env: process.env,
    cwd: HUB_ROOT,
  });

  let output = '';

  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
    ws.send(JSON.stringify({ type: 'status', content: chunk.toString().trim() }));
  });

  child.stderr.on('data', (chunk) => {
    console.error('[deploy]', chunk.toString());
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
  const args = [`"${TAG}"`, `"${assetType}"`];
  if (description) args.push(`"${escapeForShell(description)}"`);

  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && ./scripts/asset-generate ${args.join(' ')}`], {
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
}

function escapeForShell(str) {
  return str.replace(/'/g, "'\\''").replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

// Safe Claude CLI spawn — pipes prompt via stdin instead of shell embedding
function spawnClaude(prompt) {
  const env = { ...process.env, MODEL: loadSettings().model };
  // Ensure CLAUDECODE is unset to prevent nested-session guard
  delete env.CLAUDECODE;
  const child = spawn('bash', ['-c', `cd "${HUB_ROOT}" && ./scripts/claude-cli`], {
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
process.on('SIGTERM', () => { endSession(); process.exit(0); });
process.on('SIGINT', () => { endSession(); process.exit(0); });

// Start preview server on PREVIEW_PORT
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
