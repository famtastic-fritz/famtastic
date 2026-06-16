#!/usr/bin/env node
// Headless Puppeteer smoke for the Operator Workspace action layer.
// Talks to a Studio server already running at process.env.OP_SMOKE_URL
// (default http://127.0.0.1:3335). Reports JSON on stdout. Exits 0 on PASS.
//
// Checks performed:
//   1. typeof window.__operator
//   2. count of <script src="*operator-actions*">
//   3. count of #op-actions-toolbar buttons (after wait)
//   4. fetch /js/operator-actions.js → contains "selectRunInOperator"
//   5. Click "Start Refinement Run", auto-accept prompt with existing run
//      → assert pill text contains "already exists — opened."
//      → assert state.selectedRunId == that run id
//   6. Click again, fresh run id → assert pill "started — opened." + selected
//
// Cleanup: deletes any fresh run dir it created so the worktree stays clean.
//
// Usage:
//   node server/__smoke__/operator-action-browser.js [--keep] [--screenshots dir]

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const URL_BASE = process.env.OP_SMOKE_URL || 'http://127.0.0.1:3335';
const STUDIO_PORT = Number(process.env.STUDIO_PORT || 3335);
const SPAWN_SERVER = process.argv.includes('--spawn-server');
const SITES_ROOT = path.resolve(__dirname, '..', '..', '..', 'sites');
const TAG = process.env.OP_SMOKE_TAG || 'site-mbsh-reunion';
const EXISTING_RUN = process.env.OP_SMOKE_EXISTING_RUN || 'mbsh-v2-refinement-001';
const FRESH_RUN = process.env.OP_SMOKE_FRESH_RUN || `mbsh-v2-refinement-debug-${Date.now()}`;
const SCREENSHOT_DIR = (() => {
  const i = process.argv.indexOf('--screenshots');
  return i > 0 ? path.resolve(process.argv[i + 1]) : null;
})();
const KEEP_FRESH = process.argv.includes('--keep');

if (SCREENSHOT_DIR) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error(`server never became ready at ${url}`));
      setTimeout(tick, 400);
    };
    tick();
  });
}

(async () => {
  const puppeteer = require('puppeteer');
  const result = { pass: true, checks: {}, errors: [] };

  // Optionally spawn the studio server ourselves so a parent shell timeout
  // can't orphan the whole pipeline. The child is reaped on exit below.
  let serverProc = null;
  if (SPAWN_SERVER) {
    const repoStudioDir = path.resolve(__dirname, '..', '..');
    const logPath = path.join(SCREENSHOT_DIR || '/tmp', 'studio-server.log');
    const logFd = fs.openSync(logPath, 'w');
    serverProc = spawn(process.execPath, ['server.js'], {
      cwd: repoStudioDir,
      env: {
        ...process.env,
        STUDIO_PORT: String(STUDIO_PORT),
        PREVIEW_PORT: String(STUDIO_PORT + 1),
        SITE_TAG: TAG,
      },
      stdio: ['ignore', logFd, logFd],
      detached: false,
    });
    result.checks.server_spawn_pid = serverProc.pid;
    try {
      await waitForHttp(`${URL_BASE}/operator.html`, 25000);
      result.checks.server_ready = true;
    } catch (err) {
      result.pass = false;
      result.errors.push(`[server-not-ready] ${err.message}`);
      try { serverProc && serverProc.kill('SIGTERM'); } catch (_) {}
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exit(1);
    }
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'shell',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    const page = await browser.newPage();

    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error' || t === 'warning') result.errors.push(`[console.${t}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => result.errors.push(`[pageerror] ${err.message}`));
    page.on('requestfailed', (req) => {
      result.errors.push(`[requestfailed] ${req.url()} - ${req.failure() && req.failure().errorText}`);
    });

    // 1. Load operator.html with cache-bust query
    const target = `${URL_BASE}/operator.html?v=actions-debug-${Date.now()}`;
    const resp = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 15000 });
    result.checks.http_status = resp ? resp.status() : null;

    if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-loaded.png'), fullPage: true });

    // 2. Probes
    result.checks.window_operator_type = await page.evaluate(() => typeof window.__operator);
    result.checks.script_count = await page.evaluate(
      () => document.querySelectorAll('script[src*="operator-actions"]').length
    );

    // Wait up to 5s for toolbar to populate
    await page.waitForFunction(
      () => document.querySelectorAll('#op-actions-toolbar button').length > 0,
      { timeout: 5000 }
    ).catch(() => {});

    result.checks.button_count = await page.evaluate(
      () => document.querySelectorAll('#op-actions-toolbar button').length
    );
    result.checks.button_labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#op-actions-toolbar button')).map((b) => b.textContent.trim())
    );

    // 3. Fetch operator-actions.js content & verify patched markers
    const scriptText = await page.evaluate((base) =>
      fetch(`${base}/js/operator-actions.js?v=check`).then((r) => r.text()),
      URL_BASE
    );
    result.checks.has_selectRunInOperator = scriptText.includes('selectRunInOperator');
    result.checks.has_already_exists_phrase = /already exists\s+—\s+opened/.test(scriptText);

    // Force the active site to the one with our existing run
    await page.evaluate((tag) => {
      const sel = document.querySelector('#op-site-select');
      if (sel) {
        sel.value = tag;
        sel.dispatchEvent(new Event('change'));
      }
    }, TAG);
    await page.waitForFunction(
      (tag) => window.__operator && window.__operator.state && window.__operator.state.activeTag === tag,
      { timeout: 5000 },
      TAG
    ).catch(() => {});
    result.checks.active_tag = await page.evaluate(
      () => window.__operator && window.__operator.state && window.__operator.state.activeTag
    );

    // 4. Click Start Refinement Run with existing id (auto-accept prompt)
    page.once('dialog', async (d) => { await d.accept(EXISTING_RUN); });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('#op-actions-toolbar button'))
        .find((b) => /Start Refinement Run/i.test(b.textContent));
      if (btn) btn.click();
    });
    // Wait for status pill to settle (info -> ok|err) and refresh to complete
    await page.waitForFunction(
      () => {
        const s = document.querySelector('#op-actions-status');
        if (!s) return false;
        const k = s.dataset.kind;
        return k === 'ok' || k === 'err';
      },
      { timeout: 5000 }
    ).catch(() => {});

    if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-existing.png'), fullPage: true });

    result.checks.existing = await page.evaluate(() => {
      const s = document.querySelector('#op-actions-status');
      const op = window.__operator || {};
      return {
        pill_text: s ? s.textContent.trim() : null,
        pill_kind: s ? s.dataset.kind : null,
        selected_run_id: op.state ? op.state.selectedRunId : null,
        run_detail_present: !!(op.state && op.state.runDetail),
      };
    });

    // 5. Click again with fresh id
    page.once('dialog', async (d) => { await d.accept(FRESH_RUN); });
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('#op-actions-toolbar button'))
        .find((b) => /Start Refinement Run/i.test(b.textContent));
      if (btn) btn.click();
    });
    await page.waitForFunction(
      () => {
        const s = document.querySelector('#op-actions-status');
        if (!s) return false;
        const k = s.dataset.kind;
        return k === 'ok' || k === 'err';
      },
      { timeout: 5000 }
    ).catch(() => {});

    if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-fresh.png'), fullPage: true });

    result.checks.fresh = await page.evaluate(() => {
      const s = document.querySelector('#op-actions-status');
      const op = window.__operator || {};
      return {
        pill_text: s ? s.textContent.trim() : null,
        pill_kind: s ? s.dataset.kind : null,
        selected_run_id: op.state ? op.state.selectedRunId : null,
      };
    });
    result.checks.fresh_run_id = FRESH_RUN;

    // ── Assertions ──────────────────────────────────────────────
    const pass = (cond, label) => {
      result.checks[`assert_${label}`] = !!cond;
      if (!cond) result.pass = false;
    };

    pass(result.checks.http_status === 200, 'http_200');
    pass(result.checks.window_operator_type === 'object', 'window_operator_object');
    pass(result.checks.script_count >= 1, 'script_present');
    pass(result.checks.button_count === 4, 'four_buttons');
    pass(result.checks.has_selectRunInOperator, 'patched_marker_selectRun');
    pass(result.checks.has_already_exists_phrase, 'patched_marker_phrase');
    pass(/already exists\s+—\s+opened/i.test(result.checks.existing.pill_text || ''), 'existing_pill_text');
    pass(result.checks.existing.pill_kind === 'ok', 'existing_pill_kind_ok');
    pass(result.checks.existing.selected_run_id === EXISTING_RUN, 'existing_selected_run');
    pass(/started\s+—\s+opened/i.test(result.checks.fresh.pill_text || ''), 'fresh_pill_text');
    pass(result.checks.fresh.pill_kind === 'ok', 'fresh_pill_kind_ok');
    pass(result.checks.fresh.selected_run_id === FRESH_RUN, 'fresh_selected_run');
  } catch (err) {
    result.pass = false;
    result.errors.push(`[exception] ${err && err.stack ? err.stack : err}`);
  } finally {
    if (browser) try { await browser.close(); } catch (_) {}
    if (!KEEP_FRESH) {
      const dir = path.join(SITES_ROOT, TAG, 'intelligence', 'runs', FRESH_RUN);
      try { fs.rmSync(dir, { recursive: true, force: true }); } catch (_) {}
    }
    if (serverProc) {
      try { serverProc.kill('SIGTERM'); } catch (_) {}
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    setTimeout(() => process.exit(result.pass ? 0 : 1), 200);
  }
})();
