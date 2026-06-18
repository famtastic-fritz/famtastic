/*
 * NCS7 CMS — offline, no-build demo backend.
 *
 * Pure Node.js built-ins ONLY (http, fs, path, url). No express, no npm deps.
 * Run with:  PORT=4178 node server.js   (zero npm install required)
 *
 * Responsibilities:
 *   - Serve the React frontend statically from ../frontend
 *   - Serve /cad3d, /tutor, /admin static assets
 *   - REST API for site content, products, pages, templates, login, tutor
 *   - Seed cms/data/* from frontend/content.json on first run (idempotent)
 *
 * The frontend fetches GET /api/content and falls back to its own content.json,
 * so GET /api/content MUST mirror the shape of frontend/content.json (merged
 * with products.json).
 */

// NOTE: a parent package.json sets "type":"module", so this file is ESM.
// It still uses ONLY Node.js built-in modules (http, fs, path, url) — no deps.

import http from 'http';
import fs from 'fs';
import path from 'path';
import url, { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT, 10) || 4178;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const CMS_DIR = __dirname;
const ROOT = path.resolve(CMS_DIR, '..');            // assets/ncs7
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const CAD3D_DIR = path.join(ROOT, 'cad3d');
const TUTOR_DIR = path.join(ROOT, 'tutor');
const ADMIN_DIR = path.join(CMS_DIR, 'admin');
const DATA_DIR = path.join(CMS_DIR, 'data');

const FRONTEND_CONTENT = path.join(FRONTEND_DIR, 'content.json');
const TUTOR_KNOWLEDGE = path.join(TUTOR_DIR, 'knowledge.json');

const CONTENT_FILE = path.join(DATA_DIR, 'content.json');     // site-level blob (no products)
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');   // products[]
const PAGES_FILE = path.join(DATA_DIR, 'pages.json');         // pages[]
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json'); // templates[]

// ---------------------------------------------------------------------------
// Small filesystem helpers (all data IO funnels through these)
// ---------------------------------------------------------------------------
function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

function readJsonSafe(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJson(file, obj) {
  // Write to a temp file then rename for an atomic-ish swap.
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

function fileExists(file) {
  try {
    fs.accessSync(file);
    return true;
  } catch (_) {
    return false;
  }
}

function genId(prefix) {
  return (
    (prefix || 'id') +
    '-' +
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 7)
  );
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'page';
}

// ---------------------------------------------------------------------------
// Seeding (idempotent — never overwrites existing data files)
// ---------------------------------------------------------------------------
function seedData() {
  ensureDir(DATA_DIR);

  const canonical = readJsonSafe(FRONTEND_CONTENT, null) || {};

  // 1) Site-level content blob = everything except products.
  if (!fileExists(CONTENT_FILE)) {
    const site = Object.assign({}, canonical);
    delete site.products;
    writeJson(CONTENT_FILE, site);
    log('seed', 'content.json created from frontend/content.json');
  }

  // 2) Products.
  if (!fileExists(PRODUCTS_FILE)) {
    const products = Array.isArray(canonical.products) ? canonical.products : [];
    writeJson(PRODUCTS_FILE, products);
    log('seed', 'products.json created (' + products.length + ' products)');
  }

  // 3) Templates — at least two real ones.
  if (!fileExists(TEMPLATES_FILE)) {
    const templates = [
      {
        id: 'tpl-standard-content',
        name: 'Standard Content Page',
        description:
          'A simple content page: a heading, a body of rich text, an optional image, and a call to action. Good for documentation, policy, or informational pages.',
        blocks: [
          { type: 'heading', label: 'Page Heading', defaultValue: 'New Content Page' },
          {
            type: 'rich-text',
            label: 'Body',
            defaultValue:
              'Write the main content of this page here. This text supports multiple paragraphs and is editable by non-technical staff.',
          },
          { type: 'image', label: 'Feature Image URL', defaultValue: '' },
          { type: 'cta', label: 'Call To Action', defaultValue: 'Learn more #/contact' },
        ],
      },
      {
        id: 'tpl-landing',
        name: 'Landing Page',
        description:
          'A marketing landing page: a hero statement, a grid of feature highlights, and a closing call to action.',
        blocks: [
          { type: 'hero', label: 'Hero Statement', defaultValue: 'A bold, benefit-led headline.' },
          {
            type: 'feature-grid',
            label: 'Feature Grid (one feature per line)',
            defaultValue:
              'Consistent layering | A predictable, discipline-based layer system.\nUniform sheet sets | Reviewers always know where to look.\nBIM-ready | Aligns CAD conventions with modern BIM workflows.',
          },
          { type: 'cta', label: 'Closing Call To Action', defaultValue: 'Browse the Standards #/products' },
        ],
      },
    ];
    writeJson(TEMPLATES_FILE, templates);
    log('seed', 'templates.json created (' + templates.length + ' templates)');
  }

  // 4) Pages — one example page instantiated from a template.
  if (!fileExists(PAGES_FILE)) {
    const templates = readJsonSafe(TEMPLATES_FILE, []);
    const tpl = templates.find((t) => t.id === 'tpl-standard-content') || templates[0];
    const blocks = (tpl && Array.isArray(tpl.blocks) ? tpl.blocks : []).map((b) => ({
      type: b.type,
      label: b.label,
      value: b.defaultValue,
    }));
    const page = {
      id: 'page-welcome',
      slug: 'welcome',
      title: 'Welcome to the NCS7 CMS',
      templateId: tpl ? tpl.id : null,
      blocks,
      published: true,
      updatedAt: new Date().toISOString(),
    };
    // Tailor the example a little so it isn't pure boilerplate.
    if (page.blocks[0]) page.blocks[0].value = 'Welcome to the NCS7 CMS';
    if (page.blocks[1]) {
      page.blocks[1].value =
        'This example page was created automatically from the "Standard Content Page" template. ' +
        'Edit its blocks in the Pages section, or create new pages from any template — no code required.';
    }
    writeJson(PAGES_FILE, [page]);
    log('seed', 'pages.json created (1 example page)');
  }
}

// ---------------------------------------------------------------------------
// Data accessors
// ---------------------------------------------------------------------------
function getSite() {
  return readJsonSafe(CONTENT_FILE, {});
}
function saveSite(obj) {
  writeJson(CONTENT_FILE, obj);
}
function getProducts() {
  const p = readJsonSafe(PRODUCTS_FILE, []);
  return Array.isArray(p) ? p : [];
}
function saveProducts(arr) {
  writeJson(PRODUCTS_FILE, Array.isArray(arr) ? arr : []);
}
function getPages() {
  const p = readJsonSafe(PAGES_FILE, []);
  return Array.isArray(p) ? p : [];
}
function savePages(arr) {
  writeJson(PAGES_FILE, Array.isArray(arr) ? arr : []);
}
function getTemplates() {
  const t = readJsonSafe(TEMPLATES_FILE, []);
  return Array.isArray(t) ? t : [];
}
function saveTemplates(arr) {
  writeJson(TEMPLATES_FILE, Array.isArray(arr) ? arr : []);
}

// The merged object the frontend expects.
function getMergedContent() {
  const site = getSite();
  const merged = Object.assign({}, site);
  merged.products = getProducts();
  return merged;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function corsHeaders(extra) {
  return Object.assign(
    {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    extra || {}
  );
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(status, corsHeaders({ 'Content-Type': 'application/json; charset=utf-8' }));
  res.end(body);
}

function sendError(res, status, message, detail) {
  sendJson(res, status, { error: message, detail: detail || undefined });
}

function notFound(res, what) {
  sendJson(res, 404, { error: 'Not found', detail: what || undefined });
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    let tooBig = false;
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        tooBig = true;
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooBig) return resolve({ error: 'Body too large' });
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        resolve({ __parseError: true, error: 'Invalid JSON body' });
      }
    });
    req.on('error', () => resolve({ __parseError: true, error: 'Request error' }));
  });
}

// Serve a static file. Returns true if handled.
function serveStatic(res, absPath) {
  let target = absPath;
  try {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      target = path.join(target, 'index.html');
    }
  } catch (_) {
    return false;
  }
  if (!fileExists(target)) return false;
  let body;
  try {
    body = fs.readFileSync(target);
  } catch (_) {
    return false;
  }
  const ext = path.extname(target).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, corsHeaders({ 'Content-Type': type }));
  res.end(body);
  return true;
}

// Resolve a request path against a base dir while preventing traversal.
function safeJoin(baseDir, reqPath) {
  const decoded = decodeURIComponent(reqPath);
  const resolved = path.normalize(path.join(baseDir, decoded));
  if (resolved !== baseDir && !resolved.startsWith(baseDir + path.sep)) {
    return null; // traversal attempt
  }
  return resolved;
}

function log() {
  const args = Array.prototype.slice.call(arguments);
  console.log('[ncs7-cms]', args.join(' '));
}

// ---------------------------------------------------------------------------
// Tutor handler (offline retrieval; LLM-ready branch)
// ---------------------------------------------------------------------------
function loadTutorKnowledge() {
  const raw = readJsonSafe(TUTOR_KNOWLEDGE, null);
  if (!Array.isArray(raw)) return [];
  // Normalize both supported shapes into { q, a, keywords[] }.
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const q = entry.q || entry.question || '';
      const a = entry.a || entry.answer || '';
      let keywords = entry.keywords;
      if (!Array.isArray(keywords)) keywords = [];
      return { q: String(q), a: String(a), keywords: keywords.map((k) => String(k).toLowerCase()) };
    })
    .filter((e) => e && e.a);
}

function scoreEntry(entry, queryTokens) {
  let score = 0;
  const querySet = queryTokens;
  // Keyword hits are worth the most. Match on whole tokens, not substrings,
  // so "log" in a keyword doesn't spuriously match "logging"/"layer" queries.
  for (const kw of entry.keywords) {
    if (!kw) continue;
    const kwTokens = tokenize(kw);
    if (kwTokens.length && kwTokens.every((kt) => querySet.indexOf(kt) !== -1)) {
      score += 3;
    }
  }
  // Token overlap against the stored question.
  const qTokens = tokenize(entry.q);
  for (const t of queryTokens) {
    if (qTokens.indexOf(t) !== -1) score += 1;
  }
  return score;
}

const STOPWORDS = {
  the: 1, and: 1, for: 1, are: 1, you: 1, how: 1, can: 1, does: 1, did: 1,
  with: 1, what: 1, this: 1, that: 1, from: 1, into: 1, your: 1, his: 1,
  her: 1, our: 1, get: 1, got: 1, use: 1, used: 1, work: 1, works: 1,
  working: 1, system: 1, about: 1, when: 1, where: 1, who: 1, why: 1,
  was: 1, were: 1, has: 1, have: 1, will: 1, would: 1, should: 1, could: 1,
  there: 1, here: 1, they: 1, them: 1, then: 1, than: 1, some: 1, any: 1,
  all: 1, one: 1, two: 1, new: 1, just: 1, like: 1, very: 1, much: 1,
  more: 1, most: 1, also: 1, only: 1, out: 1, off: 1, its: 1, it: 1,
};

function tokenize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS[t]);
}

function offlineTutorAnswer(question) {
  const knowledge = loadTutorKnowledge();
  const queryTokens = tokenize(question);

  if (!knowledge.length) {
    return {
      answer:
        "I'm the NCS7 assistant. My offline knowledge base isn't loaded yet, but I can tell you the " +
        'National CAD Standard (NCS7) unifies how the design and construction industry organizes and ' +
        'presents construction documents — covering layer naming, sheet organization, plotting, symbols, ' +
        'and (new in V7) BIM implementation. Ask about a specific module and I can point you to the right one.',
      source: 'fallback',
      score: 0,
      matched: null,
    };
  }

  let best = null;
  let bestScore = -1;
  for (const entry of knowledge) {
    const s = scoreEntry(entry, queryTokens);
    if (s > bestScore) {
      bestScore = s;
      best = entry;
    }
  }

  // Require a meaningful match (a keyword hit, or solid token overlap). A weak
  // single-token-overlap match against a generic entry is treated as "no match"
  // so the user gets useful guidance instead of an off-topic answer.
  const MIN_SCORE = 2;
  if (!best || bestScore < MIN_SCORE) {
    return {
      answer:
        "I couldn't find a precise match in the NCS7 knowledge base. The standard is organized into six " +
        'modules — General Administration, the Uniform Drawing System, AIA CAD Layer Guidelines, Plotting ' +
        'Guidelines, BIM Implementation, and the Symbols & Notations Reference. Try asking about one of ' +
        'those, or about layer naming, sheet sets, or licensing.',
      source: 'retrieval',
      score: 0,
      matched: null,
    };
  }

  return {
    answer: best.a,
    source: 'retrieval',
    score: bestScore,
    matched: best.q || null,
  };
}

function tutorHandler(question) {
  // --- LLM-ready branch (intentionally never makes a network call here) -----
  // If an OpenRouter key is configured, a real deployment would call the LLM.
  // For this offline sales demo we DO NOT make any network request; we log the
  // intent and fall through to offline retrieval so the demo always works.
  if (process.env.OPENROUTER_API_KEY) {
    // Example of where a real call would go (left intentionally inert):
    //
    //   const payload = {
    //     model: 'anthropic/claude-3.5-sonnet',
    //     messages: [
    //       { role: 'system', content: 'You are the NCS7 standards assistant.' },
    //       { role: 'user', content: question },
    //     ],
    //   };
    //   const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    //     method: 'POST',
    //     headers: {
    //       Authorization: 'Bearer ' + process.env.OPENROUTER_API_KEY,
    //       'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(payload),
    //   });
    //   const data = await resp.json();
    //   return { answer: data.choices[0].message.content, source: 'llm', ... };
    //
    // Offline demo: never reaches the network. Fall through to retrieval.
    log('tutor', 'OPENROUTER_API_KEY present but offline mode active — using retrieval');
  }
  return offlineTutorAnswer(question);
}

// ---------------------------------------------------------------------------
// API router
// ---------------------------------------------------------------------------
async function handleApi(req, res, pathname, query) {
  const method = req.method;
  const parts = pathname.split('/').filter(Boolean); // e.g. ['api','products','x']
  // parts[0] === 'api'
  const resource = parts[1];
  const idOrAction = parts[2];

  // ----- /api/content -----
  if (resource === 'content' && !idOrAction) {
    if (method === 'GET') return sendJson(res, 200, getMergedContent());
    return sendError(res, 405, 'Method not allowed');
  }

  // ----- /api/site -----
  if (resource === 'site' && !idOrAction) {
    if (method === 'GET') return sendJson(res, 200, getSite());
    if (method === 'PUT') {
      const body = await readBody(req);
      if (body && body.__parseError) return sendError(res, 400, body.error);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return sendError(res, 400, 'Site content must be a JSON object');
      }
      saveSite(body);
      return sendJson(res, 200, getSite());
    }
    return sendError(res, 405, 'Method not allowed');
  }

  // ----- /api/products -----
  if (resource === 'products') {
    // Special sub-route handled elsewhere? none for products.
    if (!idOrAction) {
      if (method === 'GET') return sendJson(res, 200, getProducts());
      if (method === 'POST') {
        const body = await readBody(req);
        if (body && body.__parseError) return sendError(res, 400, body.error);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return sendError(res, 400, 'Product must be a JSON object');
        }
        const products = getProducts();
        if (!body.id) body.id = genId('prod');
        if (products.some((p) => p.id === body.id)) {
          return sendError(res, 409, 'Product id already exists', body.id);
        }
        products.push(body);
        saveProducts(products);
        return sendJson(res, 201, body);
      }
      return sendError(res, 405, 'Method not allowed');
    }
    // /api/products/:id
    const id = decodeURIComponent(idOrAction);
    const products = getProducts();
    const idx = products.findIndex((p) => p.id === id);
    if (method === 'GET') {
      if (idx === -1) return notFound(res, 'product ' + id);
      return sendJson(res, 200, products[idx]);
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      if (body && body.__parseError) return sendError(res, 400, body.error);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return sendError(res, 400, 'Product must be a JSON object');
      }
      body.id = id; // id in path wins
      if (idx === -1) {
        products.push(body);
        saveProducts(products);
        return sendJson(res, 201, body);
      }
      products[idx] = body;
      saveProducts(products);
      return sendJson(res, 200, body);
    }
    if (method === 'DELETE') {
      if (idx === -1) return notFound(res, 'product ' + id);
      const removed = products.splice(idx, 1)[0];
      saveProducts(products);
      return sendJson(res, 200, { ok: true, deleted: removed.id });
    }
    return sendError(res, 405, 'Method not allowed');
  }

  // ----- /api/pages/from-template (static, BEFORE :id) -----
  if (resource === 'pages' && idOrAction === 'from-template') {
    if (method !== 'POST') return sendError(res, 405, 'Method not allowed');
    const body = await readBody(req);
    if (body && body.__parseError) return sendError(res, 400, body.error);
    const templateId = body && body.templateId;
    if (!templateId) return sendError(res, 400, 'templateId is required');
    const templates = getTemplates();
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return notFound(res, 'template ' + templateId);
    const title = (body && body.title) || tpl.name || 'Untitled Page';
    const slug = slugify((body && body.slug) || title);
    const blocks = (Array.isArray(tpl.blocks) ? tpl.blocks : []).map((b) => ({
      type: b.type,
      label: b.label,
      value: b.defaultValue !== undefined ? b.defaultValue : '',
    }));
    const page = {
      id: genId('page'),
      slug,
      title,
      templateId: tpl.id,
      blocks,
      published: false,
      updatedAt: new Date().toISOString(),
    };
    const pages = getPages();
    pages.push(page);
    savePages(pages);
    return sendJson(res, 201, page);
  }

  // ----- /api/pages -----
  if (resource === 'pages') {
    if (!idOrAction) {
      if (method === 'GET') return sendJson(res, 200, getPages());
      if (method === 'POST') {
        const body = await readBody(req);
        if (body && body.__parseError) return sendError(res, 400, body.error);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return sendError(res, 400, 'Page must be a JSON object');
        }
        const pages = getPages();
        const page = {
          id: body.id || genId('page'),
          slug: slugify(body.slug || body.title || 'page'),
          title: body.title || 'Untitled Page',
          templateId: body.templateId || null,
          blocks: Array.isArray(body.blocks) ? body.blocks : [],
          published: !!body.published,
          updatedAt: new Date().toISOString(),
        };
        if (pages.some((p) => p.id === page.id)) {
          return sendError(res, 409, 'Page id already exists', page.id);
        }
        pages.push(page);
        savePages(pages);
        return sendJson(res, 201, page);
      }
      return sendError(res, 405, 'Method not allowed');
    }
    // /api/pages/:id
    const id = decodeURIComponent(idOrAction);
    const pages = getPages();
    const idx = pages.findIndex((p) => p.id === id);
    if (method === 'GET') {
      if (idx === -1) return notFound(res, 'page ' + id);
      return sendJson(res, 200, pages[idx]);
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      if (body && body.__parseError) return sendError(res, 400, body.error);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return sendError(res, 400, 'Page must be a JSON object');
      }
      const existing = idx === -1 ? {} : pages[idx];
      const page = {
        id,
        slug: slugify(body.slug || existing.slug || body.title || 'page'),
        title: body.title !== undefined ? body.title : existing.title || 'Untitled Page',
        templateId: body.templateId !== undefined ? body.templateId : existing.templateId || null,
        blocks: Array.isArray(body.blocks) ? body.blocks : existing.blocks || [],
        published: body.published !== undefined ? !!body.published : !!existing.published,
        updatedAt: new Date().toISOString(),
      };
      if (idx === -1) {
        pages.push(page);
        savePages(pages);
        return sendJson(res, 201, page);
      }
      pages[idx] = page;
      savePages(pages);
      return sendJson(res, 200, page);
    }
    if (method === 'DELETE') {
      if (idx === -1) return notFound(res, 'page ' + id);
      const removed = pages.splice(idx, 1)[0];
      savePages(pages);
      return sendJson(res, 200, { ok: true, deleted: removed.id });
    }
    return sendError(res, 405, 'Method not allowed');
  }

  // ----- /api/templates -----
  if (resource === 'templates') {
    if (!idOrAction) {
      if (method === 'GET') return sendJson(res, 200, getTemplates());
      if (method === 'POST') {
        const body = await readBody(req);
        if (body && body.__parseError) return sendError(res, 400, body.error);
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
          return sendError(res, 400, 'Template must be a JSON object');
        }
        const templates = getTemplates();
        const tpl = {
          id: body.id || genId('tpl'),
          name: body.name || 'Untitled Template',
          description: body.description || '',
          blocks: Array.isArray(body.blocks) ? body.blocks : [],
        };
        if (templates.some((t) => t.id === tpl.id)) {
          return sendError(res, 409, 'Template id already exists', tpl.id);
        }
        templates.push(tpl);
        saveTemplates(templates);
        return sendJson(res, 201, tpl);
      }
      return sendError(res, 405, 'Method not allowed');
    }
    // /api/templates/:id
    const id = decodeURIComponent(idOrAction);
    const templates = getTemplates();
    const idx = templates.findIndex((t) => t.id === id);
    if (method === 'GET') {
      if (idx === -1) return notFound(res, 'template ' + id);
      return sendJson(res, 200, templates[idx]);
    }
    if (method === 'PUT') {
      const body = await readBody(req);
      if (body && body.__parseError) return sendError(res, 400, body.error);
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return sendError(res, 400, 'Template must be a JSON object');
      }
      const existing = idx === -1 ? {} : templates[idx];
      const tpl = {
        id,
        name: body.name !== undefined ? body.name : existing.name || 'Untitled Template',
        description: body.description !== undefined ? body.description : existing.description || '',
        blocks: Array.isArray(body.blocks) ? body.blocks : existing.blocks || [],
      };
      if (idx === -1) {
        templates.push(tpl);
        saveTemplates(templates);
        return sendJson(res, 201, tpl);
      }
      templates[idx] = tpl;
      saveTemplates(templates);
      return sendJson(res, 200, tpl);
    }
    if (method === 'DELETE') {
      if (idx === -1) return notFound(res, 'template ' + id);
      const removed = templates.splice(idx, 1)[0];
      saveTemplates(templates);
      return sendJson(res, 200, { ok: true, deleted: removed.id });
    }
    return sendError(res, 405, 'Method not allowed');
  }

  // ----- /api/login (STUB) -----
  // NOTE: This is a DEMO STUB. It accepts ANY non-empty username/password and
  // returns a fixed demo token. There is no real auth, no password storage,
  // and the token is not validated by any endpoint. Do not ship to production.
  if (resource === 'login' && !idOrAction) {
    if (method !== 'POST') return sendError(res, 405, 'Method not allowed');
    const body = await readBody(req);
    if (body && body.__parseError) return sendError(res, 400, body.error);
    const username = body && body.username;
    const password = body && body.password;
    if (!username || !password) {
      return sendError(res, 401, 'Username and password are required');
    }
    return sendJson(res, 200, { ok: true, token: 'demo-token', stub: true });
  }

  // ----- /api/tutor -----
  if (resource === 'tutor' && !idOrAction) {
    if (method !== 'POST') return sendError(res, 405, 'Method not allowed');
    const body = await readBody(req);
    if (body && body.__parseError) return sendError(res, 400, body.error);
    const question = body && body.question;
    if (!question || !String(question).trim()) {
      return sendError(res, 400, 'A non-empty "question" is required');
    }
    const result = tutorHandler(String(question));
    return sendJson(res, 200, result);
  }

  return notFound(res, 'API route ' + pathname);
}

// ---------------------------------------------------------------------------
// Static routing
// ---------------------------------------------------------------------------
function handleStatic(req, res, pathname) {
  // /admin -> cms/admin/index.html ; /admin/* -> cms/admin/*
  if (pathname === '/admin' || pathname === '/admin/') {
    if (serveStatic(res, path.join(ADMIN_DIR, 'index.html'))) return;
    return notFound(res, 'admin index');
  }
  if (pathname.startsWith('/admin/')) {
    const rel = pathname.slice('/admin/'.length);
    const target = safeJoin(ADMIN_DIR, rel);
    if (target && serveStatic(res, target)) return;
    return notFound(res, pathname);
  }

  // /cad3d/* -> ../cad3d/*
  if (pathname === '/cad3d' || pathname === '/cad3d/') {
    if (serveStatic(res, path.join(CAD3D_DIR, 'index.html'))) return;
    return notFound(res, 'cad3d index');
  }
  if (pathname.startsWith('/cad3d/')) {
    const rel = pathname.slice('/cad3d/'.length);
    const target = safeJoin(CAD3D_DIR, rel);
    if (target && serveStatic(res, target)) return;
    return notFound(res, pathname);
  }

  // /tutor/* -> ../tutor/*
  if (pathname.startsWith('/tutor/')) {
    const rel = pathname.slice('/tutor/'.length);
    const target = safeJoin(TUTOR_DIR, rel);
    if (target && serveStatic(res, target)) return;
    return notFound(res, pathname);
  }

  // Root + everything else -> frontend
  let rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const target = safeJoin(FRONTEND_DIR, rel);
  if (target && serveStatic(res, target)) return;

  // SPA fallback: hash routing means the server only ever needs index.html for
  // unknown non-asset paths. Serve frontend index if it has no file extension.
  if (!path.extname(pathname)) {
    if (serveStatic(res, path.join(FRONTEND_DIR, 'index.html'))) return;
  }

  notFound(res, pathname);
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  try {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname || '/';

    // Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders());
      return res.end();
    }

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return await handleApi(req, res, pathname, parsed.query);
    }

    return handleStatic(req, res, pathname);
  } catch (err) {
    log('error', err && err.stack ? err.stack : String(err));
    if (!res.headersSent) {
      sendError(res, 500, 'Internal server error', err && err.message);
    } else {
      try {
        res.end();
      } catch (_) {}
    }
  }
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function start() {
  try {
    seedData();
  } catch (err) {
    log('seed-error', err && err.message ? err.message : String(err));
  }
  server.listen(PORT, () => {
    const base = 'http://localhost:' + PORT;
    log('NCS7 CMS running at ' + base);
    log('  Frontend:  ' + base + '/');
    log('  Admin:     ' + base + '/admin');
    log('  API:       ' + base + '/api/content');
  });
}

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    log('error', 'Port ' + PORT + ' is already in use. Set PORT to another value.');
    process.exit(1);
  }
  log('error', err && err.message ? err.message : String(err));
});

start();
