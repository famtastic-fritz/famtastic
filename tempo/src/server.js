// server.js — zero-dependency HTTP server for Tempo.
// Serves a JSON REST API under /api/* and static files from public/.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Store, ValidationError } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 1_000_000) { // 1MB guard
        reject(new ValidationError('request body too large'));
        req.destroy();
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new ValidationError('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (urlPath === '/') urlPath = '/index.html';
  // Prevent path traversal.
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return send(res, 403, { error: 'forbidden' });
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      return send(res, 404, { error: 'not found' });
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

// Build the request handler around a given Store (injectable for tests).
export function createApp(store = new Store()) {
  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const { pathname } = url;
    const method = req.method;

    if (!pathname.startsWith('/api/')) {
      if (method !== 'GET') return send(res, 405, { error: 'method not allowed' });
      return serveStatic(req, res);
    }

    try {
      // --- /api/health ---
      if (pathname === '/api/health' && method === 'GET') {
        return send(res, 200, { ok: true });
      }

      // --- /api/stats ---
      if (pathname === '/api/stats' && method === 'GET') {
        return send(res, 200, store.stats());
      }

      // --- /api/tasks ---
      if (pathname === '/api/tasks') {
        if (method === 'GET') return send(res, 200, { tasks: store.listTasks() });
        if (method === 'POST') {
          const body = await readBody(req);
          const task = store.createTask(body.title);
          return send(res, 201, task);
        }
        return send(res, 405, { error: 'method not allowed' });
      }

      // --- /api/tasks/:id  and  /api/tasks/:id/done ---
      const taskMatch = pathname.match(/^\/api\/tasks\/([^/]+)(\/done)?$/);
      if (taskMatch) {
        const id = taskMatch[1];
        const doneRoute = !!taskMatch[2];

        if (doneRoute && method === 'PUT') {
          const body = await readBody(req);
          const updated = store.setTaskDone(id, body.done !== false);
          if (!updated) return send(res, 404, { error: 'task not found' });
          return send(res, 200, updated);
        }

        if (!doneRoute && method === 'DELETE') {
          const ok = store.deleteTask(id);
          if (!ok) return send(res, 404, { error: 'task not found' });
          return send(res, 200, { deleted: id });
        }

        if (!doneRoute && method === 'GET') {
          const task = store.getTask(id);
          if (!task) return send(res, 404, { error: 'task not found' });
          return send(res, 200, task);
        }

        return send(res, 405, { error: 'method not allowed' });
      }

      // --- /api/sessions ---
      if (pathname === '/api/sessions') {
        if (method === 'GET') return send(res, 200, { sessions: store.listSessions() });
        if (method === 'POST') {
          const body = await readBody(req);
          const session = store.logSession(body);
          return send(res, 201, session);
        }
        return send(res, 405, { error: 'method not allowed' });
      }

      return send(res, 404, { error: 'not found' });
    } catch (err) {
      if (err instanceof ValidationError) {
        return send(res, 400, { error: err.message });
      }
      // eslint-disable-next-line no-console
      console.error('Unhandled error:', err);
      return send(res, 500, { error: 'internal server error' });
    }
  };
}

// Create an http.Server (used by both `npm start` and the test suite).
export function createServer(store) {
  return http.createServer(createApp(store));
}

// Start only when run directly (not when imported by tests).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT) || 4321;
  const server = createServer();
  server.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`\n  Tempo running →  http://localhost:${port}\n`);
  });
}
