// MetaMint — zero-dependency HTTP server (Node.js standard library only).
// Serves the static client and a small JSON API backed by the engine in src/.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generateAll, generateOgImageSvg, normalizeInput } from './src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = process.env.PORT || 4317;

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
  // Prevent path traversal: only serve from PUBLIC, no '..'.
  const safe = path.normalize(fileName).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(PUBLIC, safe);
  if (!full.startsWith(PUBLIC)) {
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
      return sendJson(res, 200, generateAll(input));
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
      return sendJson(res, 200, { ok: true, name: 'MetaMint', version: '1.0.0' });
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
    console.log(`\n  MetaMint running →  http://localhost:${PORT}\n`);
  });
}

export { server };
