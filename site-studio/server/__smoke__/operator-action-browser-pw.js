#!/usr/bin/env node
// Headless Playwright (chromium) smoke for the Operator Workspace action layer.
// Same checks/assertions as operator-action-browser.js, ported because the
// puppeteer-bundled Chrome download is x86_64 and won't run on linux-arm64.
//
// Usage:
//   node operator-action-browser-pw.js [--spawn-server] [--screenshots dir] [--keep]
//
// Requires `playwright` to be importable (the module path is supplied via
// PW_REQUIRE_PATH if not in the local node_modules).

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const URL_BASE = process.env.OP_SMOKE_URL || 'http://127.0.0.1:3335';
const STUDIO_PORT = Number(process.env.STUDIO_PORT || 3335);
const SITES_ROOT = path.resolve(__dirname, '..', '..', '..', 'sites');
const TAG = process.env.OP_SMOKE_TAG || 'site-mbsh-reunion';
const EXISTING_RUN = process.env.OP_SMOKE_EXISTING_RUN || 'mbsh-v2-refinement-001';
const FRESH_RUN = process.env.OP_SMOKE_FRESH_RUN || `mbsh-v2-refinement-debug-${Date.now()}`;
const SPAWN_SERVER = process.argv.includes('--spawn-server');
const KEEP_FRESH = process.argv.includes('--keep');
const SCREENSHOT_DIR = (() => {
  const i = process.argv.indexOf('--screenshots');
  return i > 0 ? path.resolve(process.argv[i + 1]) : null;
})();
if (SCREENSHOT_DIR) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (_) {
  if (process.env.PW_REQUIRE_PATH) chromium = require(process.env.PW_REQUIRE_PATH).chromium;
  else throw new Error('playwright not installed and PW_REQUIRE_PATH not set');
}

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
      if (Date.now() > deadline) return reject(new Error(`server never ready at ${url}`));
      setTimeout(tick, 400);
    };
    tick();
  });
}

(async () => {
  const result = { pass: true, checks: {}, errors: [] };
  let serverProc = null;

  if (SPAWN_SERVER) {
    const fastServer = path.join(__dirname, 'operator-fast-server.js');
    const logPath = path.join(SCREENSHOT_DIR || '/tmp', 'studio-server.log');
    const logFd = fs.openSync(logPath, 'w');
    serverProc = spawn(process.execPath, [fastServer], {
      env: { ...process.env, STUDIO_PORT: String(STUDIO_PORT), SITE_TAG: TAG },
      stdio: ['ignore', logFd, logFd],
    });
    result.checks.server_spawn_pid = serverProc.pid;
    try { await waitForHttp(`${URL_BASE}/operator.html`, 8000); result.checks.server_ready = true; }
    catch (err) {
      result.pass = false;
      result.errors.push(`[server-not-ready] ${err.message}`);
      try { serverProc.kill('SIGTERM'); } catch (_) {}
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exit(1);
    }
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    page.on('console', (msg) => {
      const t = msg.type();
      if (t === 'error' || t === 'warning') result.errors.push(`[console.${t}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => result.errors.push(`[pageerror] ${err.message}`));
    page.on('requestfailed', (req) => {
      result.errors.push(`[requestfailed] ${req.url()} - ${req.failure() && req.failure().errorText}`);
    });

    const target = `${URL_BASE}/operator.html?v=actions-debug-${Date.now()}`;
    const resp = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 12000 });
    result.checks.http_status = resp ? resp.status() : null;
    if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-loaded.png'), fullPage: true });

    result.checks.window_operator_type = await page.evaluate(() => typeof window.__operator);
    result.checks.script_count = await page.evaluate(
      () => document.querySelectorAll('script[src*="operator-actions"]').length
    );

    await page.waitForFunction(
      () => document.querySelectorAll('#op-actions-toolbar button').length > 0,
      null,
      { timeout: 5000 }
    ).catch(() => {});

    result.checks.button_count = await page.evaluate(
      () => document.querySelectorAll('#op-actions-toolbar button').length
    );
    result.checks.button_labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('#op-actions-toolbar button')).map((b) => b.textContent.trim())
    );

    const scriptText = await page.evaluate((base) =>
      fetch(`${base}/js/operator-actions.js?v=check`).then((r) => r.text()),
      URL_BASE
    );
    result.checks.has_selectRunInOperator = scriptText.includes('selectRunInOperator');
    result.checks.has_already_exists_phrase = /already exists\s+—\s+opened/.test(scriptText);

    await page.evaluate((tag) => {
      const sel = document.querySelector('#op-site-select');
      if (sel) { sel.value = tag; sel.dispatchEvent(new Event('change')); }
    }, TAG);
    await page.waitForFunction(
      (tag) => window.__operator && window.__operator.state && window.__operator.state.activeTag === tag,
      TAG,
      { timeout: 5000 }
    ).catch(() => {});
    result.checks.active_tag = await page.evaluate(
      () => window.__operator && window.__operator.state && window.__operator.state.activeTag
    );

    // — Existing run path —
    page.once('dialog', (d) => d.accept(EXISTING_RUN));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('#op-actions-toolbar button'))
        .find((b) => /Start Refinement Run/i.test(b.textContent));
      if (btn) btn.click();
    });
    await page.waitForFunction(
      () => {
        const s = document.querySelector('#op-actions-status');
        return s && (s.dataset.kind === 'ok' || s.dataset.kind === 'err');
      },
      null,
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

    // — Fresh run path —
    page.once('dialog', (d) => d.accept(FRESH_RUN));
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('#op-actions-toolbar button'))
        .find((b) => /Start Refinement Run/i.test(b.textContent));
      if (btn) btn.click();
    });
    await page.waitForFunction(
      () => {
        const s = document.querySelector('#op-actions-status');
        return s && (s.dataset.kind === 'ok' || s.dataset.kind === 'err');
      },
      null,
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
    if (serverProc) try { serverProc.kill('SIGTERM'); } catch (_) {}
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    setTimeout(() => process.exit(result.pass ? 0 : 1), 200);
  }
})();
