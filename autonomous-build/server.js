// MetaMint — zero-dependency HTTP server (Node.js standard library only).
// Serves the static client and a small JSON API backed by the engine in src/.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  generateAll, generateOgImageSvg, normalizeInput,
  resolveConfig, publicConfig, crawlUrl,
} from './src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const SRC = path.join(__dirname, 'src');

/**
 * Layer environment variables over the defaults. This is the only place env is
 * read, so the pure config core stays browser-safe and testable.
 *   METAMINT_MODE=static|server   METAMINT_PLAN=free|pro|agency
 *   METAMINT_URL_CRAWL=true       METAMINT_FEATURES=brandedTemplates,bulkCsv
 *   PORT=4317
 */
export function loadServerConfig(env = process.env, configPath = path.join(__dirname, 'metamint.config.json')) {
  // 1) Start from an optional on-disk config file (the discoverable surface).
  let fileConfig = {};
  const fromEnvPath = env.METAMINT_CONFIG || configPath;
  if (fromEnvPath && existsSync(fromEnvPath)) {
    try {
      fileConfig = JSON.parse(readFileSync(fromEnvPath, 'utf8'));
    } catch (e) {
      console.warn(`  [config] ignoring invalid ${fromEnvPath}: ${e.message}`);
    }
  }

  // 2) Env vars override the file (handy for CI / one-off boots).
  const featureOverrides = { ...(fileConfig.featureOverrides || {}) };
  if (env.METAMINT_FEATURES) {
    for (const f of env.METAMINT_FEATURES.split(',').map((s) => s.trim()).filter(Boolean)) {
      featureOverrides[f] = true;
    }
  }
  return resolveConfig({
    ...fileConfig,
    mode: env.METAMINT_MODE ?? fileConfig.mode,
    plan: env.METAMINT_PLAN ?? fileConfig.plan,
    urlCrawl: env.METAMINT_URL_CRAWL ? env.METAMINT_URL_CRAWL === 'true' : fileConfig.urlCrawl,
    port: env.PORT ?? fileConfig.port,
    featureOverrides,
  });
}

const CONFIG = loadServerConfig();
const PORT = CONFIG.port;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.ico': 'image/x-icon',
};

const ROUTES = {
  '/': 'index.html',
  '/app': 'index.html',
  '/landing': 'landing.html',
  '/pricing': 'pricing.html',
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

async function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function serveStatic(res, fileName) {
  return serveFrom(res, PUBLIC, fileName);
}

async function serveFrom(res, root, fileName) {
  // Prevent path traversal: only serve from `root`, no '..'.
  const safe = path.normalize(fileName).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, safe);
  if (!full.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const body = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': body.length,
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    // --- API: generate everything from posted input ---
    if (pathname === '/api/generate' && req.method === 'POST') {
      let input;
      try {
        input = JSON.parse((await readBody(req)) || '{}');
      } catch {
        return sendJson(res, 400, { error: 'invalid JSON body' });
      }
      return sendJson(res, 200, generateAll(input, CONFIG));
    }

    // --- API: expose the resolved public config (drives the client) ---
    if (pathname === '/api/config' && req.method === 'GET') {
      return sendJson(res, 200, publicConfig(CONFIG));
    }

    // --- API: URL crawl (Fork 3) — gated by config.urlCrawl ---
    if (pathname === '/api/crawl' && req.method === 'GET') {
      try {
        const result = await crawlUrl(url.searchParams.get('url') || '', {
          enabled: CONFIG.urlCrawl,
        });
        return sendJson(res, 200, result);
      } catch (err) {
        const status = err.code === 'FEATURE_DISABLED' ? 403 : err.code === 'BAD_URL' ? 400 : 502;
        return sendJson(res, status, { error: err.message, code: err.code || 'CRAWL_ERROR' });
      }
    }

    // --- API: raw OG image SVG (also usable directly as og:image) ---
    if (pathname === '/api/og.svg' && req.method === 'GET') {
      const m = normalizeInput({
        title: url.searchParams.get('title') || '',
        siteName: url.searchParams.get('siteName') || '',
        themeColor: url.searchParams.get('themeColor') || '',
        url: url.searchParams.get('url') || '',
      });
      const svg = generateOgImageSvg(m);
      res.writeHead(200, {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      return res.end(svg);
    }

    if (pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true, name: 'MetaMint', version: '1.0.0',
        mode: CONFIG.mode, plan: CONFIG.plan, urlCrawl: CONFIG.urlCrawl,
      });
    }

    // --- Engine modules (served so the client can run in `static` mode) ---
    if (pathname.startsWith('/engine/') && (req.method === 'GET' || req.method === 'HEAD')) {
      return serveFrom(res, SRC, pathname.slice('/engine/'.length));
    }

    // --- Static / page routes ---
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (ROUTES[pathname]) return serveStatic(res, ROUTES[pathname]);
      // direct file under /public
      return serveStatic(res, pathname.replace(/^\/+/, ''));
    }

    res.writeHead(405, { 'Content-Type': 'text/plain' }).end('Method not allowed');
  } catch (err) {
    sendJson(res, 500, { error: 'internal error', detail: String(err && err.message) });
  }
});

// Only listen when run directly, so tests can import without binding a port.
const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  server.listen(PORT, () => {
    console.log(`\n  MetaMint running →  http://localhost:${PORT}`);
    console.log(`  mode=${CONFIG.mode}  plan=${CONFIG.plan}  urlCrawl=${CONFIG.urlCrawl}\n`);
  });
}

export { server };
