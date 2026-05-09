// site-studio/server/visual-refinement-routes.js
//
// Lane F — Read-only Express router for the Visual Refinement surface.
// Mounted at /api/refinement. Contains NO write endpoints; tweaks are
// applied server-side from the QA agent later, never via HTTP.
//
// Routes:
//   GET /api/refinement/contract
//   GET /api/refinement/working-copies?tag=<safe-tag>

'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const refinement = require('./visual-refinement');

const SAFE_TAG = /^[a-z0-9][a-z0-9-_]{0,80}$/i;

function createRefinementRouter(resolveSiteDir, sitesRoot) {
  if (typeof resolveSiteDir !== 'function') {
    throw new Error('resolveSiteDir() function required');
  }

  const router = express.Router();

  router.get('/contract', (req, res) => {
    res.json({
      ok: true,
      contract: {
        allowed_var_prefixes: refinement.ALLOWED_VAR_PREFIXES,
        allowed_class_toggles: Array.from(refinement.ALLOWED_CLASS_TOGGLES),
        tweak_schema: {
          kind: ['css_var', 'class_toggle'],
          target: ['tokens.css', 'index.html'],
          name: 'string — must match an allowlist for its kind',
          value: 'string — required for css_var; rejected if it contains <script or javascript:',
        },
        guarantee: 'no production mutation — all tweaks land in sites/<tag>/.refinement/<runId>/',
      },
    });
  });

  router.get('/working-copies', (req, res) => {
    const tag = req.query && req.query.tag;
    let siteDir;
    if (tag) {
      if (!SAFE_TAG.test(tag) || !sitesRoot) {
        return res.status(400).json({ ok: false, error: 'invalid_tag' });
      }
      siteDir = path.join(sitesRoot, tag);
    } else {
      siteDir = resolveSiteDir(req);
    }
    const refDir = path.join(siteDir, '.refinement');
    if (!fs.existsSync(refDir)) {
      return res.json({ ok: true, working_copies: [] });
    }
    const entries = fs.readdirSync(refDir, { withFileTypes: true });
    const working_copies = entries
      .filter((e) => e.isDirectory())
      .map((e) => {
        const full = path.join(refDir, e.name);
        let files = 0;
        try {
          const stack = [full];
          while (stack.length) {
            const cur = stack.pop();
            const items = fs.readdirSync(cur, { withFileTypes: true });
            for (const it of items) {
              if (it.isDirectory()) stack.push(path.join(cur, it.name));
              else if (it.isFile()) files += 1;
            }
          }
        } catch (_) {
          files = 0;
        }
        return { runId: e.name, exists: true, files };
      });
    res.json({ ok: true, working_copies });
  });

  return router;
}

module.exports = { createRefinementRouter };
