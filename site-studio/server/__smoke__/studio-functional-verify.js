#!/usr/bin/env node
// Lane G — Comprehensive functional verification of the Studio shell after
// the Functional Workspace Run. Mimics studio-shell-verify.js (Playwright
// headless against the fast smoke server) but adds:
//   - 12-section rail click + workspace + ContextPanel presence map
//   - ContextPanel collapse + persistence
//   - RecipeSelector switching (5 recipes)
//   - Memory strip honest state
//   - Live API surface checks for the 8 lane endpoints
//   - Drift trip-wires (Mission Control isolation)
//
// Usage:
//   PW_REQUIRE_PATH=/tmp/pw-install/node_modules/playwright \
//   node site-studio/server/__smoke__/studio-functional-verify.js --spawn-server

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const STUDIO_PORT = Number(process.env.STUDIO_PORT || 3335);
const URL_BASE = `http://127.0.0.1:${STUDIO_PORT}`;
const SPAWN = process.argv.includes('--spawn-server');
const TAG = 'site-mbsh-reunion';

let chromium;
try { chromium = require('playwright').chromium; }
catch (_) {
  if (process.env.PW_REQUIRE_PATH) {
    try { chromium = require(process.env.PW_REQUIRE_PATH).chromium; }
    catch (_) { /* fall through */ }
  }
}
if (!chromium) {
  process.stdout.write(JSON.stringify({
    pass: false,
    blocked: true,
    reason: 'playwright module not available in this sandbox',
  }, null, 2) + '\n');
  process.exit(2);
}

const SECTION_IDS = ['home','sites','builder','siteset','thinktank','research','components','media','library','shay','mission','settings'];
const EXPECT_LABEL = {
  home: 'Home', sites: 'Sites', builder: 'Site Builder', siteset: 'Site Settings',
  thinktank: 'Think-Tank', research: 'Research Center', components: 'Component Studio',
  media: 'Media Studio', library: 'Media Library', shay: 'Shay Shay',
  mission: 'Mission Control', settings: 'Settings',
};
// Per Lane E spec — these own their right pane and suppress the global ContextPanel
const NO_CONTEXT = new Set(['builder', 'components', 'media', 'shay', 'mission']);

function waitHttp(url, ms) {
  const dl = Date.now() + ms;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(url, r => { r.resume(); r.statusCode === 200 ? resolve() : retry(); });
      req.on('error', retry);
      req.setTimeout(2000, () => { req.destroy(); retry(); });
    };
    const retry = () => Date.now() > dl ? reject(new Error('not ready: ' + url)) : setTimeout(tick, 400);
    tick();
  });
}

const r = { pass: true, checks: {}, errors: [], assertions: [] };
function must(label, cond, detail) {
  r.assertions.push({ label, ok: !!cond, detail: detail || '' });
  if (!cond) r.pass = false;
}

(async () => {
  let serverProc = null;

  if (SPAWN) {
    const fastServer = path.join(__dirname, 'operator-fast-server.js');
    const logFd = fs.openSync('/tmp/studio-functional-verify-server.log', 'w');
    serverProc = spawn(process.execPath, [fastServer], {
      env: { ...process.env, STUDIO_PORT: String(STUDIO_PORT), SITE_TAG: TAG },
      stdio: ['ignore', logFd, logFd],
    });
    try {
      await waitHttp(`${URL_BASE}/studio.html`, 8000);
    } catch (e) {
      r.pass = false;
      r.errors.push('[server-not-ready] ' + e.message);
      try { serverProc.kill('SIGTERM'); } catch (_) {}
      process.stdout.write(JSON.stringify(r, null, 2) + '\n');
      process.exit(1);
    }
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', err => r.errors.push('[pageerror] ' + err.message));

  try {
    // ─── A. Page-load checks ────────────────────────────────────────
    {
      const resp = await page.goto(`${URL_BASE}/studio.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      must('A1 /studio.html status=200', resp.status() === 200, `status=${resp.status()}`);
      await page.waitForFunction(() => !!document.querySelector('#studio-root'), null, { timeout: 8000 });
      const mounted = await page.evaluate(() => !!document.querySelector('#studio-root'));
      must('A2 #studio-root mounts', mounted);
      await page.waitForFunction(() => document.querySelectorAll('.studio-shell .rail-item').length >= 12, null, { timeout: 8000 });
    }
    {
      const resp = await page.goto(`${URL_BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      must('A3 /index.html status=200', resp.status() === 200);
      const tbVisible = await page.evaluate(() => {
        const tb = document.getElementById('top-bar');
        return tb && getComputedStyle(tb).display !== 'none';
      });
      must('A4 standalone /index.html: #top-bar visible', tbVisible === true);
    }
    {
      const resp = await page.goto(`${URL_BASE}/index.html?embedded=1`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      must('A5 /index.html?embedded=1 status=200', resp.status() === 200);
      const tbHidden = await page.evaluate(() => {
        const tb = document.getElementById('top-bar');
        if (!tb) return null;
        return getComputedStyle(tb).display === 'none';
      });
      must('A6 embedded /index.html: #top-bar hidden', tbHidden === true);
    }
    {
      const resp = await page.goto(`${URL_BASE}/operator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      must('A7 /operator.html status=200', resp.status() === 200);
      const tbVisible = await page.evaluate(() => {
        const tb = document.querySelector('.op-topbar');
        return tb && getComputedStyle(tb).display !== 'none';
      });
      must('A8 standalone /operator.html: .op-topbar visible', tbVisible === true);
    }
    {
      const resp = await page.goto(`${URL_BASE}/operator.html?embedded=1`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      must('A9 /operator.html?embedded=1 status=200', resp.status() === 200);
      const tbHidden = await page.evaluate(() => {
        const tb = document.querySelector('.op-topbar');
        if (!tb) return null;
        return getComputedStyle(tb).display === 'none';
      });
      must('A10 embedded /operator.html: .op-topbar hidden', tbHidden === true);
    }

    // ─── B. Rail navigation across 12 sections ──────────────────────
    await page.goto(`${URL_BASE}/studio.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => document.querySelectorAll('.studio-shell .rail-item').length >= 12, null, { timeout: 8000 });
    r.checks.section_results = {};
    for (const id of SECTION_IDS) {
      await page.evaluate((label) => {
        const items = Array.from(document.querySelectorAll('.studio-shell .rail-item'));
        const t = items.find(el => el.getAttribute('aria-label') === label);
        if (t) t.click();
      }, EXPECT_LABEL[id]);
      await page.waitForFunction(
        (label) => {
          const a = document.querySelector('.studio-shell .rail-item.active .rail-tooltip');
          return a && a.textContent.trim() === label;
        },
        EXPECT_LABEL[id], { timeout: 4000 }
      ).catch(() => {});
      const railActive = await page.evaluate(() =>
        document.querySelector('.studio-shell .rail-item.active .rail-tooltip')?.textContent?.trim() || ''
      );
      const workspaceText = await page.evaluate(() =>
        document.querySelector('.studio-shell .workspace')?.innerText || ''
      );
      const hasRightPanel = await page.evaluate(() => !!document.querySelector('.studio-shell .right-panel'));
      r.checks.section_results[id] = {
        rail_active: railActive,
        workspace_nonempty: workspaceText.length > 30,
        right_panel: hasRightPanel,
        right_panel_expected: !NO_CONTEXT.has(id),
      };
      must(`B-${id}: rail active`, railActive === EXPECT_LABEL[id], `actual=${railActive}`);
      must(`B-${id}: workspace nonempty`, workspaceText.length > 30);
      must(`B-${id}: right-panel matches expected`,
        hasRightPanel === !NO_CONTEXT.has(id),
        `expected=${!NO_CONTEXT.has(id)} actual=${hasRightPanel}`);
    }

    // ─── C. ContextPanel collapse + persistence ─────────────────────
    await page.evaluate(() => { location.hash = 'home'; });
    await page.waitForTimeout(300);
    const beforeCols = await page.evaluate(() => {
      const b = document.querySelector('.studio-shell .body');
      return b ? getComputedStyle(b).gridTemplateColumns : null;
    });
    // Click whatever toggle was rendered for collapse — try common selectors
    const toggled = await page.evaluate(() => {
      const candidates = [
        '.studio-shell [data-collapse-toggle]',
        '.studio-shell .right-collapse',
        '.studio-shell button[aria-label*="ollapse"]',
        '.studio-shell .right-panel button',
      ];
      for (const sel of candidates) {
        const el = document.querySelector(sel);
        if (el) { el.click(); return sel; }
      }
      return null;
    });
    await page.waitForTimeout(300);
    const afterCols = await page.evaluate(() => {
      const b = document.querySelector('.studio-shell .body');
      return b ? getComputedStyle(b).gridTemplateColumns : null;
    });
    must('C1 collapse toggle clicked', !!toggled, 'no recognizable toggle selector');
    must('C2 grid changed after collapse', beforeCols !== afterCols, `before=${beforeCols} after=${afterCols}`);
    const lsPersisted = await page.evaluate(() => localStorage.getItem('studio.rightCollapsed'));
    must('C3 localStorage studio.rightCollapsed set', lsPersisted === '1', `value=${lsPersisted}`);

    // Reload and confirm
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const reloadCols = await page.evaluate(() => {
      const b = document.querySelector('.studio-shell .body');
      return b ? getComputedStyle(b).gridTemplateColumns : null;
    });
    must('C4 collapse persists across reload',
      reloadCols && reloadCols === afterCols,
      `reload=${reloadCols} afterCollapse=${afterCols}`);
    // Restore
    await page.evaluate(() => {
      const cs = ['.studio-shell [data-collapse-toggle]', '.studio-shell .right-collapse',
                  '.studio-shell button[aria-label*="xpand"]', '.studio-shell .right-panel button'];
      for (const s of cs) { const el = document.querySelector(s); if (el) { el.click(); return; } }
    });

    // ─── D. RecipeSelector — 5 recipes, switching works ────────────
    await page.evaluate(() => { location.hash = 'home'; });
    await page.waitForTimeout(300);
    await page.waitForFunction(() => document.querySelectorAll('.studio-shell .recipe-node').length > 0, null, { timeout: 4000 });
    const initialCount = await page.evaluate(() => document.querySelectorAll('.studio-shell .recipe-node').length);
    r.checks.initial_recipe_node_count = initialCount;
    must('D1 default recipe shows nodes', initialCount >= 6, `count=${initialCount}`);
    const eyebrowText = await page.evaluate(() => {
      const e = document.querySelector('.studio-shell .eyebrow');
      // Try multiple selectors
      const all = Array.from(document.querySelectorAll('.studio-shell *')).map(x => x.textContent || '');
      return all.find(t => /Visual workflow.*recipes/i.test(t)) || (e ? e.textContent : '');
    });
    must('D2 eyebrow says "Visual workflow ... recipes"',
      /Visual workflow.*recipes/i.test(eyebrowText || ''),
      `eyebrow=${(eyebrowText || '').slice(0, 80)}`);
    // Try to switch recipe via .seg button
    const switchOk = await page.evaluate(() => {
      const segs = Array.from(document.querySelectorAll('.studio-shell .seg button, .studio-shell .seg-item'));
      const inactive = segs.find(b => !b.classList.contains('active'));
      if (inactive) { inactive.click(); return true; }
      return false;
    });
    await page.waitForTimeout(300);
    const afterSwitchCount = await page.evaluate(() => document.querySelectorAll('.studio-shell .recipe-node').length);
    r.checks.after_switch_recipe_node_count = afterSwitchCount;
    must('D3 recipe switch interaction',
      switchOk && afterSwitchCount > 0,
      `switch=${switchOk} count=${afterSwitchCount}`);

    // ─── E. Memory strip ───────────────────────────────────────────
    const stripExists = await page.evaluate(() => !!document.querySelector('.studio-shell .strip'));
    const stripHasContent = await page.evaluate(() => {
      const s = document.querySelector('.studio-shell .strip');
      if (!s) return false;
      // Real items OR honest empty-state row both acceptable
      return s.children.length > 0 || (s.textContent || '').trim().length > 0;
    });
    must('E1 .strip exists', stripExists);
    must('E2 .strip has rendered content (rows or honest empty state)', stripHasContent);

    // ─── F. Live API endpoints ─────────────────────────────────────
    const apiEndpoints = [
      { url: '/api/intelligence/sites', validate: j => j && Array.isArray(j.sites) },
      { url: '/api/components', validate: j => j && Array.isArray(j.components) },
      { url: '/api/components/contract', validate: j => j && j.contract },
      { url: '/api/research/briefs', validate: j => j && Array.isArray(j.briefs) && j.briefs.length >= 4 },
      { url: '/api/think-tank/captures', validate: j => j && Array.isArray(j.captures) },
      { url: '/api/think-tank/contract', validate: j => j && j.contract },
      { url: `/api/media?tag=${TAG}`, validate: j => j && (j.registry !== undefined || j.summary !== undefined) },
      { url: '/api/media/contract', validate: j => j && j.contract && j.asset_shape },
    ];
    for (const ep of apiEndpoints) {
      let ok = false, detail = '';
      try {
        const json = await page.evaluate(async (u) => {
          const r = await fetch(u);
          const status = r.status;
          let body = null;
          try { body = await r.json(); } catch (_) {}
          return { status, body };
        }, ep.url);
        ok = json.status === 200 && ep.validate(json.body);
        detail = `status=${json.status}`;
      } catch (e) {
        detail = e.message;
      }
      must(`F GET ${ep.url}`, ok, detail);
    }

    // ─── G. Drift trip-wires (Mission Control isolation) ──────────
    await page.evaluate(() => { location.hash = 'mission'; });
    await page.waitForTimeout(800);
    const missionBodyHTML = await page.evaluate(() => {
      const w = document.querySelector('.studio-shell .workspace');
      return w ? w.innerHTML : '';
    });
    const hasRecipeIn = /class="[^"]*recipe-node/.test(missionBodyHTML) || /<RecipeSelector/.test(missionBodyHTML);
    must('G1 Mission Control: no RecipeSelector content in section', !hasRecipeIn);
    // Sites listing markers (from sites screen): typically a card grid with "open in builder"
    const hasSitesListing = /Open in Builder|sites-api|ScreenSites/.test(missionBodyHTML);
    must('G2 Mission Control: no Sites listing content', !hasSitesListing);

    // ─── H. Iframe re-test — Site Builder ─────────────────────────
    await page.evaluate(() => { location.hash = 'builder'; });
    await page.waitForSelector('.studio-shell iframe', { timeout: 5000 });
    await page.waitForTimeout(800);
    {
      const frames = page.frames();
      const builderFrame = frames.find(f => /\/index\.html\?embedded=1/.test(f.url()));
      must('H1 builder iframe URL ends with /index.html?embedded=1', !!builderFrame,
        `frames=${frames.map(f => f.url()).join('|')}`);
      if (builderFrame) {
        await builderFrame.waitForLoadState('domcontentloaded').catch(() => {});
        const hasEmbeddedClass = await builderFrame.evaluate(() => document.documentElement.classList.contains('studio-embedded'));
        must('H2 builder iframe documentElement has studio-embedded class', hasEmbeddedClass === true);
      }
    }

    // ─── I. Iframe re-test — Mission Control ──────────────────────
    await page.evaluate(() => { location.hash = 'mission'; });
    await page.waitForTimeout(1500);
    {
      const frames = page.frames();
      const opFrame = frames.find(f => /\/operator\.html\?embedded=1/.test(f.url()));
      must('I1 mission iframe URL ends with /operator.html?embedded=1', !!opFrame);
      if (opFrame) {
        await opFrame.waitForLoadState('domcontentloaded').catch(() => {});
        const hasEmbeddedClass = await opFrame.evaluate(() => document.documentElement.classList.contains('studio-embedded'));
        const hasOpShell = await opFrame.evaluate(() => !!document.querySelector('.op-shell'));
        const hasActionsToolbar = await opFrame.evaluate(() => !!document.querySelector('#op-actions-toolbar'));
        must('I2 mission iframe has studio-embedded class', hasEmbeddedClass === true);
        must('I3 mission iframe has .op-shell', hasOpShell);
        must('I4 mission iframe has #op-actions-toolbar', hasActionsToolbar);
      }
    }

  } catch (e) {
    r.pass = false;
    r.errors.push('[exception] ' + (e.stack || e.message || e));
  } finally {
    try { await browser.close(); } catch (_) {}
    if (serverProc) { try { serverProc.kill('SIGTERM'); } catch (_) {} }
    // Print summary
    const passed = r.assertions.filter(a => a.ok).length;
    const failed = r.assertions.filter(a => !a.ok).length;
    process.stdout.write(`\nBROWSER: ${passed} PASS / ${failed} FAIL  (total=${r.assertions.length})\n`);
    if (failed > 0) {
      process.stdout.write('\nFailures:\n');
      for (const a of r.assertions.filter(x => !x.ok)) {
        process.stdout.write(`  - ${a.label}${a.detail ? '  ' + a.detail : ''}\n`);
      }
    }
    if (r.errors.length) {
      process.stdout.write('\nErrors:\n');
      for (const e of r.errors) process.stdout.write(`  ${e}\n`);
    }
    process.stdout.write('\n' + JSON.stringify(r, null, 2) + '\n');
    setTimeout(() => process.exit(r.pass ? 0 : 1), 200);
  }
})();
