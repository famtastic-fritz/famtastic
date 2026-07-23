'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { outputPathForPage, urlPathForPage } = require('../lib/page-output-path');

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.xml': return 'application/xml; charset=utf-8';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.svg': return 'image/svg+xml';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

async function startStaticServer(rootDir) {
  const server = http.createServer((req, res) => {
    const reqPath = (req.url || '/').split('?')[0].split('#')[0] || '/';
    const normalized = reqPath === '/' ? '/index.html' : reqPath;
    const relativePath = normalized.replace(/^\/+/, '');
    const fullPath = path.resolve(rootDir, relativePath);

    if (!fullPath.startsWith(path.resolve(rootDir)) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }

    res.writeHead(200, { 'content-type': contentTypeFor(fullPath) });
    fs.createReadStream(fullPath).pipe(res);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  return {
    server,
    origin: `http://127.0.0.1:${address.port}`,
  };
}

class BrowserQaRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const outputsDir = path.join(runContext.workspace_root, 'outputs');
    const pageManifests = request.pageManifests || [];

    let playwright = null;
    try {
      playwright = require('playwright');
    } catch (_) {
      // Playwright unavailable — defer gracefully.
    }

    const skipBrowser = process.env.SKIP_BROWSER_QA === '1';

    if (!playwright || skipBrowser) {
      return {
        result: {
          qa_type: 'browser',
          status: 'deferred',
          provider: 'none',
          pages_checked: 0,
          issues: [],
          summary: skipBrowser
            ? 'Browser QA explicitly skipped by SKIP_BROWSER_QA=1.'
            : 'Playwright not available — browser QA deferred. Install playwright to enable.',
        },
        sideEffects: [],
        artifactReferences: [],
        durationMs: Number(process.hrtime.bigint() - start) / 1e6,
        costUsd: 0,
      };
    }

    const issues = [];
    const screenshots = [];
    let browser = null;
    let context = null;
    let staticServer = null;

    try {
      staticServer = await startStaticServer(outputsDir);
      browser = await playwright.chromium.launch({ headless: true });
      context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

      for (const pm of pageManifests) {
        const outPath = outputPathForPage(pm);
        const fullPath = path.join(outputsDir, outPath);
        if (!fs.existsSync(fullPath)) continue;

        const page = await context.newPage();
        const consoleErrors = [];
        const pageErrors = [];

        page.on('console', msg => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', err => {
          pageErrors.push(err.message || String(err));
        });

        const pageUrl = staticServer.origin + urlPathForPage(pm);

        try {
          const response = await page.goto(pageUrl, { waitUntil: 'load', timeout: 5000 });
          if (!response || !response.ok()) {
            issues.push({ severity: 'error', code: 'PAGE_LOAD_ERROR', page_id: pm.page_id, detail: `HTTP load failed for ${pageUrl}` });
            continue;
          }

          const screenshotDir = path.join(runContext.workspace_root, 'qa-screenshots');
          fs.mkdirSync(screenshotDir, { recursive: true });

          const screenshotPath = path.join(screenshotDir, pm.page_id + '-desktop.png');
          await page.screenshot({ path: screenshotPath, fullPage: false });
          screenshots.push({ page_id: pm.page_id, viewport: 'desktop', path: screenshotPath });

          await page.setViewportSize({ width: 375, height: 812 });
          const mobileScreenshotPath = path.join(screenshotDir, pm.page_id + '-mobile.png');
          await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
          screenshots.push({ page_id: pm.page_id, viewport: 'mobile', path: mobileScreenshotPath });
          await page.setViewportSize({ width: 1280, height: 800 });

          if (consoleErrors.length > 0) {
            issues.push({ severity: 'warning', code: 'CONSOLE_ERRORS', page_id: pm.page_id, detail: consoleErrors.join('; ') });
          }

          if (pageErrors.length > 0) {
            issues.push({ severity: 'warning', code: 'PAGE_ERRORS', page_id: pm.page_id, detail: pageErrors.join('; ') });
          }

          const bodyText = await page.evaluate(() => document.body ? document.body.innerText.trim().length : 0);
          if (bodyText < 20) {
            issues.push({ severity: 'error', code: 'BLANK_PAGE', page_id: pm.page_id });
          }
        } catch (pageErr) {
          issues.push({ severity: 'warning', code: 'PAGE_LOAD_ERROR', page_id: pm.page_id, detail: pageErr.message });
        } finally {
          await page.close().catch(() => {});
        }
      }
    } finally {
      if (context) await context.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});
      if (staticServer) await new Promise(resolve => staticServer.server.close(resolve));
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warnCount = issues.filter(i => i.severity === 'warning').length;
    const status = errorCount === 0 ? (warnCount === 0 ? 'green' : 'yellow') : 'red';

    return {
      result: {
        qa_type: 'browser',
        status,
        provider: 'playwright',
        pages_checked: pageManifests.length,
        screenshots,
        issues,
        summary: `Browser QA: ${screenshots.length} screenshots, ${errorCount} errors, ${warnCount} warnings`,
      },
      sideEffects: [],
      artifactReferences: screenshots.map(s => ({ kind: 'screenshot', path: s.path, page_id: s.page_id, viewport: s.viewport })),
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { BrowserQaRunner };
