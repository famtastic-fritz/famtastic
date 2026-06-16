#!/usr/bin/env node
// Headless Playwright smoke for the new Unified Studio shell at /studio.html.
// Boots the fast operator server (operator-fast-server.js) which already
// serves public/* and the intelligence routers. Asserts:
//   - /studio.html 200, has #studio-root
//   - all 12 rail items render
//   - each of the 12 sections, when clicked, swaps the workspace title
//   - bottom memory strip renders
//   - right Shay/context panel renders for non-special sections
//   - recipe flow renders on Home with 6 nodes
//   - /index.html still renders (not broken by embedded mode)
//   - /operator.html still renders
//   - /operator.html?embedded=1 hides .op-topbar
//   - /index.html?embedded=1 hides .top-bar (no host chrome)
//
// Usage:
//   PW_REQUIRE_PATH=/tmp/pw-install/node_modules/playwright \
//   node server/__smoke__/studio-shell-smoke.js --spawn-server --screenshots /tmp/studio-shots

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const STUDIO_PORT = Number(process.env.STUDIO_PORT || 3335);
const URL_BASE = process.env.OP_SMOKE_URL || `http://127.0.0.1:${STUDIO_PORT}`;
const TAG = process.env.OP_SMOKE_TAG || 'site-mbsh-reunion';
const SPAWN_SERVER = process.argv.includes('--spawn-server');
const SCREENSHOT_DIR = (() => {
  const i = process.argv.indexOf('--screenshots');
  return i > 0 ? path.resolve(process.argv[i + 1]) : null;
})();
if (SCREENSHOT_DIR) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let chromium;
try { chromium = require('playwright').chromium; }
catch (_) { if (process.env.PW_REQUIRE_PATH) chromium = require(process.env.PW_REQUIRE_PATH).chromium; }
if (!chromium) { console.error('playwright missing'); process.exit(2); }

function waitHttp(url, ms) {
  const dl = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, r => { r.resume(); r.statusCode === 200 ? resolve() : retry(); });
      req.on('error', retry);
      req.setTimeout(2000, () => { req.destroy(); retry(); });
    };
    const retry = () => Date.now() > dl ? reject(new Error('not-ready: ' + url)) : setTimeout(tick, 400);
    tick();
  });
}

const SECTIONS = ['home','sites','builder','siteset','thinktank','research','components','media','library','shay','mission','settings'];
const TITLES = {
  home:        /Platform.{0,3}Home/i,
  sites:       /Your sites/i,
  builder:     /Site Builder/i,
  siteset:     /Site settings/i,
  thinktank:   /Think-Tank/i,
  research:    /Research Center/i,
  components:  /Library/i,            // Component Studio's library pane
  media:       /Variations/i,         // Media Studio header
  library:     /Media Library/i,
  shay:        /Knowledge sources/i,  // Right pane Eyebrow
  mission:     /Mission Control/i,
  settings:    /Models|Pick the brains/i,
};

(async () => {
  const result = { pass: true, sections: {}, errors: [] };
  let serverProc = null;

  if (SPAWN_SERVER) {
    const studioDir = path.resolve(__dirname, '..', '..');
    const fastServer = path.join(__dirname, 'operator-fast-server.js');
    const logPath = path.join(SCREENSHOT_DIR || '/tmp', 'studio-shell-server.log');
    const logFd = fs.openSync(logPath, 'w');
    serverProc = spawn(process.execPath, [fastServer], {
      env: { ...process.env, STUDIO_PORT: String(STUDIO_PORT), SITE_TAG: TAG },
      stdio: ['ignore', logFd, logFd],
    });
    try { await waitHttp(`${URL_BASE}/studio.html`, 8000); result.server_ready = true; }
    catch (e) {
      result.pass = false;
      result.errors.push('[server-not-ready] ' + e.message);
      try { serverProc.kill('SIGTERM'); } catch (_) {}
      process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      process.exit(1);
    }
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') result.errors.push(`[console.${t}] ${msg.text().slice(0,200)}`);
  });
  page.on('pageerror', err => result.errors.push('[pageerror] ' + err.message));

  try {
    // ── /studio.html basics ─────────────────────────────────
    const resp = await page.goto(`${URL_BASE}/studio.html`, { waitUntil: 'domcontentloaded', timeout: 12000 });
    result.studio_status = resp.status();
    await page.waitForFunction(() => document.querySelectorAll('.studio-shell .rail-item').length >= 12, null, { timeout: 6000 });

    result.rail_count = await page.evaluate(() => document.querySelectorAll('.studio-shell .rail-item').length);
    result.rail_labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.studio-shell .rail-item .rail-tooltip')).map(s => s.textContent)
    );

    if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-home.png'), fullPage: true });

    // Memory strip + Shay panel + RecipeFlow on Home
    result.has_strip = await page.evaluate(() => !!document.querySelector('.studio-shell .strip'));
    result.has_right_panel_on_home = await page.evaluate(() => !!document.querySelector('.studio-shell .right-panel'));
    result.recipe_node_count = await page.evaluate(() => document.querySelectorAll('.studio-shell .recipe-node').length);

    // ── Each of 12 sections ─────────────────────────────────
    for (const id of SECTIONS) {
      await page.goto(`${URL_BASE}/studio.html#${id}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
      // Wait for fade-up to indicate the workspace swapped
      await page.waitForFunction(
        sec => {
          const root = document.querySelector('.studio-shell');
          if (!root) return false;
          // Active rail item should match
          const active = root.querySelector('.rail-item.active .rail-tooltip');
          return !!active;
        },
        id,
        { timeout: 5000 },
      ).catch(() => {});

      const text = await page.evaluate(() => document.querySelector('.studio-shell .workspace')?.innerText || '');
      const ok = TITLES[id].test(text);
      result.sections[id] = { rendered: ok, sample: text.slice(0, 120).replace(/\s+/g, ' ') };
      if (!ok) result.pass = false;
      if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, `01-${id}.png`), fullPage: true });
    }

    // ── Embedded modes preserve legacy pages ────────────────
    {
      const r1 = await page.goto(`${URL_BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      result.legacy_index_status = r1.status();
      result.legacy_index_has_topbar = await page.evaluate(() => !!document.querySelector('.top-bar') || !!document.querySelector('.top-bar-logo-img'));
    }
    {
      const r2 = await page.goto(`${URL_BASE}/index.html?embedded=1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      result.legacy_index_embedded_status = r2.status();
      result.legacy_index_embedded_topbar_visible = await page.evaluate(() => {
        const el = document.querySelector('.top-bar');
        if (!el) return false;
        const cs = getComputedStyle(el);
        return cs.display !== 'none';
      });
    }
    {
      const r3 = await page.goto(`${URL_BASE}/operator.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      result.legacy_operator_status = r3.status();
      result.legacy_operator_has_topbar = await page.evaluate(() => !!document.querySelector('.op-topbar'));
    }
    {
      const r4 = await page.goto(`${URL_BASE}/operator.html?embedded=1`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      result.legacy_operator_embedded_status = r4.status();
      result.legacy_operator_embedded_topbar_visible = await page.evaluate(() => {
        const el = document.querySelector('.op-topbar');
        if (!el) return false;
        const cs = getComputedStyle(el);
        return cs.display !== 'none';
      });
    }

    // ── Pass/Fail ──────────────────────────────────────────
    const must = (cond, label) => { result['assert_' + label] = !!cond; if (!cond) result.pass = false; };
    must(result.studio_status === 200, 'studio_200');
    must(result.rail_count === 12, 'rail_12');
    must(result.has_strip, 'memory_strip');
    must(result.has_right_panel_on_home, 'right_panel_home');
    must(result.recipe_node_count === 6, 'recipe_6_nodes');
    must(result.legacy_index_status === 200, 'index_200');
    must(result.legacy_index_has_topbar === true, 'index_topbar_normal');
    must(result.legacy_index_embedded_topbar_visible === false, 'index_embedded_chrome_hidden');
    must(result.legacy_operator_status === 200, 'operator_200');
    must(result.legacy_operator_has_topbar === true, 'operator_topbar_normal');
    must(result.legacy_operator_embedded_topbar_visible === false, 'operator_embedded_chrome_hidden');
    for (const id of SECTIONS) must(result.sections[id]?.rendered, `section_${id}`);
  } catch (e) {
    result.pass = false;
    result.errors.push('[exception] ' + (e.stack || e.message || e));
  } finally {
    try { await browser.close(); } catch (_) {}
    if (serverProc) { try { serverProc.kill('SIGTERM'); } catch (_) {} }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    setTimeout(() => process.exit(result.pass ? 0 : 1), 200);
  }
})();
