/**
 * dev-with-overlay.mjs — Lightweight proxy that injects Shay chrome into
 * hermes-workspace dev server responses without modifying upstream _refs/.
 *
 * Usage: node dev-with-overlay.mjs
 *
 * This script:
 *   1. Starts the Vite dev server as a subprocess (port 3000)
 *   2. Waits for it to be ready
 *   3. Starts an HTTP proxy on port 3002 that:
 *      - Proxies everything to port 3000
 *      - Intercepts index.html and injects Shay script/css links at END of body
 *        (so React hydrates first, avoiding conflicts)
 *      - Serves Shay chrome assets from SHAY_CHROME_DIR
 */

import { spawn } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve, extname, basename } from 'node:path';
import { URL } from 'node:url';
import http from 'node:http';

const VITE_PORT = Number(process.env.VITE_PORT || 3000);
const PROXY_PORT = Number(process.env.PROXY_PORT || 3002);
const CHROME_DIR = process.env.SHAY_CHROME_DIR || resolve(import.meta.dirname, 'chrome');
const VITE_DIR = resolve(import.meta.dirname, '../../_refs/hermes-workspace-v2.3');

// Kill any leftover process on our proxy port before starting
import { execSync } from 'node:child_process';
try {
  const pids = execSync(`lsof -ti :${PROXY_PORT} 2>/dev/null`).toString().trim();
  if (pids) {
    execSync(`kill ${pids.split('\n').join(' ')} 2>/dev/null`);
    console.log(`[overlay] Killed stale process(es) on :${PROXY_PORT}`);
    // Brief pause to let OS reclaim the port
    await new Promise(r => setTimeout(r, 500));
  }
} catch { /* no process on port — good */ }
try {
  const pids = execSync(`lsof -ti :${VITE_PORT} 2>/dev/null`).toString().trim();
  if (pids) {
    execSync(`kill ${pids.split('\n').join(' ')} 2>/dev/null`);
    console.log(`[overlay] Killed stale process(es) on :${VITE_PORT}`);
    await new Promise(r => setTimeout(r, 500));
  }
} catch { /* no process on port — good */ }

// Inject after </head> with CSS link + inline script that dynamically loads chrome.js
// This avoids React hydration conflicts — CSS is safe in head, script loads asynchronously after hydration
const INJECT_HEAD = `<link id="shay-chrome-css" rel="stylesheet" href="/shay-chrome.css">
<script id="shay-chrome-inline-js">
(function(){
  var s = document.createElement('script');
  s.id = 'shay-chrome-js';
  s.src = '/shay-chrome.js';
  s.async = true;
  // Wait for SPA hydration before applying chrome
  try {
    if (document.readyState === 'complete') { document.body.appendChild(s); }
    else { window.addEventListener('load', function(){ document.body.appendChild(s); }); }
  } catch(e) {}
})();
</script>
`;

function injectIntoHTML(html) {
  // Inject after </head> with CSS + dynamic script loader
  const headIdx = html.indexOf('</head>');
  if (headIdx === -1) return html;
  return html.slice(0, headIdx) + INJECT_HEAD + html.slice(headIdx);
}

// Start Vite dev server
console.log('[overlay] Starting Vite dev server...');
const vite = spawn('npm', ['run', 'dev'], {
  cwd: VITE_DIR,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(VITE_PORT) },
  detached: false,
});

vite.stdout.on('data', (d) => {
  const line = d.toString().trim();
  if (line) console.log('[vite]', line);
});
vite.stderr.on('data', (d) => {
  const line = d.toString().trim();
  if (line) console.log('[vite]', line);
});

function waitForServer(port, timeout) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryConnect = () => {
      http.get({ hostname: '127.0.0.1', port: port, path: '/' }, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve();
        else setTimeout(tryConnect, 500);
      }).on('error', () => {
        if (Date.now() - start > timeout) reject(new Error('Vite took too long on port ' + port));
        else setTimeout(tryConnect, 500);
      });
    };
    tryConnect();
  });
}

async function main() {
  try {
    await waitForServer(VITE_PORT, 30000);
  } catch (err) {
    console.error('[overlay] Vite failed to start:', err.message);
    vite.kill();
    process.exit(1);
  }
  console.log('[overlay] Vite ready on :' + VITE_PORT);
  console.log('[overlay] Chrome assets: ' + (existsSync(CHROME_DIR) ? 'found' : 'NOT FOUND: ' + CHROME_DIR));
  console.log('[overlay] Proxy running on :' + PROXY_PORT);
  console.log('[overlay] Browse to http://127.0.0.1:' + PROXY_PORT);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1:' + PROXY_PORT);
    const pathname = url.pathname;

    // Serve Shay chrome assets from CHROME_DIR
    if (pathname === '/shay-chrome.css' || pathname === '/shay-chrome.js') {
      const ext = extname(pathname);
      const assetFile = join(CHROME_DIR, pathname);
      if (existsSync(assetFile)) {
        const extClean = ext.slice(1);
        const mimes = { css: 'text/css; charset=utf-8', js: 'application/javascript; charset=utf-8' };
        res.writeHead(200, { 'Content-Type': mimes[extClean] || 'text/plain', 'Cache-Control': 'no-store' });
        res.end(readFileSync(assetFile));
        return;
      }
    }

    // Serve asset files (svg, png, ico, webp) from CHROME_DIR
    const assetMatch = pathname.match(/\/(shay-[^/?]+)$/);
    if (assetMatch) {
      const assetFile = join(CHROME_DIR, assetMatch[1]);
      if (existsSync(assetFile) && statSync(assetFile).isFile()) {
        const extClean = extname(assetFile).slice(1);
        const mimes = {
          svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon',
          webp: 'image/webp', json: 'application/json'
        };
        const ct = mimes[extClean] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': ct, 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
        res.end(readFileSync(assetFile));
        return;
      }
    }

    // Proxy everything to Vite (support all HTTP methods, not just GET)
    const proxyOpts = {
      hostname: '127.0.0.1',
      port: VITE_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: '127.0.0.1:' + VITE_PORT },
    };
    const proxyReq = http.request(proxyOpts, (proxyRes) => {
      const isHTML = proxyRes.headers['content-type']?.includes('html');
      if (!isHTML) {
        // Stream non-HTML responses directly (no buffering)
        const headers = { ...proxyRes.headers };
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
        return;
      }
      // Buffer HTML to inject chrome
      const body = [];
      proxyRes.on('data', (chunk) => body.push(chunk));
      proxyRes.on('end', () => {
        let html = Buffer.concat(body).toString('utf-8');
        html = injectIntoHTML(html);
        const headers = { ...proxyRes.headers };
        delete headers['content-length'];
        res.writeHead(proxyRes.statusCode, headers);
        res.end(html);
      });
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        console.error('[proxy] Error:', err.message);
        res.writeHead(502);
        res.end('Proxy error');
      }
    });

    // Pipe request body for POST/PUT/PATCH
    req.pipe(proxyReq);
  });

  // WebSocket upgrade passthrough for Vite HMR
  server.on('upgrade', (req, socket, head) => {
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: VITE_PORT,
      path: req.url,
      method: 'GET',
      headers: req.headers,
    });
    proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        Object.entries(proxyRes.headers).map(([k,v]) => `${k}: ${v}`).join('\r\n') +
        '\r\n\r\n'
      );
      if (proxyHead.length) socket.write(proxyHead);
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });
    proxyReq.on('error', () => socket.destroy());
    proxyReq.end();
  });

  server.listen(PROXY_PORT, '127.0.0.1', () => {
    console.log('[overlay] HTTP proxy listening on 127.0.0.1:' + PROXY_PORT);
  });

  process.on('SIGINT', () => {
    console.log('[overlay] Shutting down...');
    vite.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    vite.kill('SIGTERM');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[overlay] Fatal:', err.message);
  vite.kill();
  process.exit(1);
});
