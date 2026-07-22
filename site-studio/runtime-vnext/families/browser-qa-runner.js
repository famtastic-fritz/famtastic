'use strict';
const fs = require('fs');
const path = require('path');

// Browser QA — uses puppeteer if available. Degrades gracefully to structural-only if not.
class BrowserQaRunner {
  async execute(request, { runContext, stageAttempt, abortSignal }) {
    const start = process.hrtime.bigint();
    const outputsDir = path.join(runContext.workspace_root, 'outputs');
    const pageManifests = request.pageManifests || [];

    let puppeteer = null;
    try {
      puppeteer = require('puppeteer');
    } catch (_) {
      // Puppeteer not available — structural fallback
    }

    const skipBrowser = process.env.SKIP_BROWSER_QA === '1';

    if (!puppeteer || skipBrowser) {
      return {
        result: {
          qa_type: 'browser',
          status: 'deferred',
          provider: 'none',
          pages_checked: 0,
          issues: [],
          summary: 'Puppeteer not available — browser QA deferred. Install puppeteer to enable.',
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

    try {
      browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'], timeout: 15000 });
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      for (const pm of pageManifests) {
        const outPath = pm.output_path || (pm.page_id === 'home' ? 'index.html' : pm.page_id + '/index.html');
        const fullPath = path.join(outputsDir, outPath);
        if (!fs.existsSync(fullPath)) continue;

        const fileUrl = 'file://' + fullPath;
        try {
          await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

          // Screenshot
          const screenshotDir = path.join(runContext.workspace_root, 'qa-screenshots');
          fs.mkdirSync(screenshotDir, { recursive: true });
          const screenshotPath = path.join(screenshotDir, pm.page_id + '-desktop.png');
          await page.screenshot({ path: screenshotPath, fullPage: false });
          screenshots.push({ page_id: pm.page_id, viewport: 'desktop', path: screenshotPath });

          // Mobile
          await page.setViewport({ width: 375, height: 812 });
          const mobileScreenshotPath = path.join(screenshotDir, pm.page_id + '-mobile.png');
          await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
          screenshots.push({ page_id: pm.page_id, viewport: 'mobile', path: mobileScreenshotPath });
          await page.setViewport({ width: 1280, height: 800 });

          // Console errors
          const consoleErrors = [];
          page.on('console', msg => {
            if (msg.type() === 'error') consoleErrors.push(msg.text());
          });

          if (consoleErrors.length > 0) {
            issues.push({ severity: 'warning', code: 'CONSOLE_ERRORS', page_id: pm.page_id, detail: consoleErrors.join('; ') });
          }

          // Check body has content
          const bodyText = await page.evaluate(() => document.body ? document.body.innerText.trim().length : 0);
          if (bodyText < 20) {
            issues.push({ severity: 'error', code: 'BLANK_PAGE', page_id: pm.page_id });
          }
        } catch (pageErr) {
          issues.push({ severity: 'warning', code: 'PAGE_LOAD_ERROR', page_id: pm.page_id, detail: pageErr.message });
        }
      }
    } finally {
      if (browser) await browser.close().catch(() => {});
    }

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warnCount = issues.filter(i => i.severity === 'warning').length;
    const status = errorCount === 0 ? (warnCount === 0 ? 'green' : 'yellow') : 'red';

    return {
      result: {
        qa_type: 'browser',
        status,
        provider: 'puppeteer',
        pages_checked: pageManifests.length,
        screenshots,
        issues,
        summary: `Browser QA: ${screenshots.length} screenshots, ${errorCount} errors, ${warnCount} warnings`,
      },
      sideEffects: screenshots.map(s => ({ path: s.path, kind: 'write' })),
      artifactReferences: [],
      durationMs: Number(process.hrtime.bigint() - start) / 1e6,
      costUsd: 0,
    };
  }
}

module.exports = { BrowserQaRunner };
