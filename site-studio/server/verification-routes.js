'use strict';
/**
 * server/verification-routes.js
 *
 * Operator V1 verification endpoints, ported from
 * feature/site-studio-runtime-vnext-closeout and adapted to main.
 *
 *   GET  /api/verify  -> spec.last_verification for an EXPLICIT siteTag
 *   POST /api/verify  -> run build verification against dist-vnext, persist
 *                        spec.last_verification atomically
 *
 * The V1 artifact is dist-vnext, and only dist-vnext. There is no silent
 * fallback to legacy dist: a site with no vNext build is answered 409
 * (no_vnext_build). Main's legacy /api/visual-verify is untouched.
 *
 * Only the two /verify endpoints are ported. The feature's validation-plan,
 * approve-site and revenue-card routes stay on the feature branch — they are
 * not part of the Operator V1 reconciliation scope.
 */

const fs = require('fs');
const express = require('express');
const { siteTagOr400 } = require('../lib/request-context');

function createVerificationRouter(options = {}) {
  const {
    readSpec,
    writeSpec,
    listPagesInDir,
    runBuildVerification,
    getDistVnextDir,
  } = options;

  if (
    typeof readSpec !== 'function' ||
    typeof writeSpec !== 'function' ||
    typeof listPagesInDir !== 'function' ||
    typeof runBuildVerification !== 'function' ||
    typeof getDistVnextDir !== 'function'
  ) {
    throw new Error('createVerificationRouter missing required dependencies');
  }

  const router = express.Router();

  router.get('/verify', (req, res) => {
    // Explicit site authority — V1 never reads the ambient operator site.
    const siteTag = siteTagOr400(req, res);
    if (!siteTag) return;
    const spec = readSpec(siteTag);
    return res.json(spec.last_verification || null);
  });

  router.post('/verify', (req, res) => {
    const siteTag = siteTagOr400(req, res);
    if (!siteTag) return;
    // The V1 artifact is dist-vnext, and only dist-vnext. No silent fallback to
    // legacy dist: a site with no vNext build is a 409 naming exactly that.
    const distVnextDir = getDistVnextDir(siteTag);
    if (!fs.existsSync(distVnextDir)) {
      return res.status(409).json({
        error: 'no_vnext_build',
        message: `Site ${siteTag} has no vNext build (dist-vnext is missing). Run POST /api/site-studio/build-vnext first.`,
      });
    }
    const pages = listPagesInDir(distVnextDir);
    if (pages.length === 0) {
      return res.json({ status: 'failed', checks: [], issues: ['No pages found'], timestamp: new Date().toISOString() });
    }
    const result = runBuildVerification(pages, distVnextDir, siteTag);
    try {
      const spec = readSpec(siteTag);
      spec.last_verification = result;
      // writeSpec is atomic (temp file + rename).
      writeSpec(spec, { siteTag, source: 'verify_api' });
    } catch {}
    return res.json(result);
  });

  return router;
}

module.exports = { createVerificationRouter };
