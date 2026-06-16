#!/usr/bin/env node
// Minimal Express server for smoke testing the Operator Workspace action layer.
// Boots in <1s (avoids the full Studio init: brain-verifier, capability-manifest,
// Pinecone cache lookups, etc.). Mounts:
//   - public/ static files (operator.html, css, js)
//   - GET /api/intelligence/* (read-only)
//   - POST /api/intelligence/actions/* (writes)
//
// Default site dir resolves to sites/site-mbsh-reunion. Sites root is sites/.
// Listens on STUDIO_PORT (default 3335) on 127.0.0.1.

'use strict';

const path = require('path');
const express = require('express');

const REPO = path.resolve(__dirname, '..', '..', '..');
const STUDIO = path.join(REPO, 'site-studio');
const SITES_ROOT = path.join(REPO, 'sites');
const TAG = process.env.SITE_TAG || 'site-mbsh-reunion';
const PORT = Number(process.env.STUDIO_PORT || 3335);

const app = express();
app.use(express.static(path.join(STUDIO, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders(res, filePath) {
    if (/\.(?:html|js|css)$/i.test(filePath)) {
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
  },
}));

app.use('/api/intelligence', require('../intelligence-routes')
  .createIntelligenceRouter(() => path.join(SITES_ROOT, TAG), SITES_ROOT));

app.use('/api/intelligence/actions', require('../intelligence-actions')
  .createActionsRouter(() => path.join(SITES_ROOT, TAG), SITES_ROOT));

const server = app.listen(PORT, '127.0.0.1', () => {
  process.stdout.write(`[fast] listening on http://127.0.0.1:${PORT} (tag=${TAG})\n`);
  if (process.send) process.send({ ready: true, port: PORT });
});

['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => server.close(() => process.exit(0))));
