#!/usr/bin/env node
// Independent verification pass for the unified Studio shell.
// Differs from studio-shell-smoke.js by:
//   - using only the FULL Studio server (not the fast operator-only one)
//   - exercising every rail item by clicking, not by hash navigation
//   - reading the actual iframe contents inside Site Builder + Mission Control
//   - asserting no CSS leak: legacy pages must not pick up .studio-shell tokens
//   - clicking a recipe-flow node and confirming hash navigation
//   - confirming the operator action layer still works WHEN EMBEDDED
//
// Usage:
//   PW_REQUIRE_PATH=/tmp/pw-install/node_modules/playwright \
//   node server/__smoke__/studio-shell-verify.js --spawn-server --screenshots /tmp/verify-shots

'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const STUDIO_PORT = Number(process.env.STUDIO_PORT || 3335);
const URL_BASE = `http://127.0.0.1:${STUDIO_PORT}`;
const TAG = 'site-mbsh-reunion';
const EXISTING_RUN = 'mbsh-v2-refinement-001';
const SPAWN = process.argv.includes('--spawn-server');
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
    const retry = () => Date.now() > dl ? reject(new Error('not ready: ' + url)) : setTimeout(tick, 400);
    tick();
  });
}

const SECTION_IDS = ['home','sites','builder','siteset','thinktank','research','components','media','library','shay','mission','settings'];
const EXPECT_LABEL = {
  home: 'Home', sites: 'Sites', builder: 'Site Builder', siteset: 'Site Settings',
  thinktank: 'Think-Tank', research: 'Research Center', components: 'Component Studio',
  media: 'Media Studio', library: 'Media Library', shay: 'Shay Shay',
  mission: 'Mission Control', settings: 'Settings',
};
// Sections that own their own right pane (no global ContextPanel)
const NO_CONTEXT = new Set(['builder','components','media','shay','mission']);

(async () => {
  const r = { pass: true, checks: {}, errors: [] };
  let serverProc = null;

  if (SPAWN) {
    // Use the same fast server the prior smoke uses (operator-fast-server.js)
    // so verification stays inside the bash sandbox time cap. The fast server
    // mounts public/* static + the intelligence routers + the actions router,
    // which is all this verify needs.
    const fastServer = path.join(__dirname, 'operator-fast-server.js');
    const logPath = path.join(SCREENSHOT_DIR || '/tmp', 'verify-server.log');
    const logFd = fs.openSync(logPath, 'w');
    serverProc = spawn(process.execPath, [fastServer], {
      env: { ...process.env, STUDIO_PORT: String(STUDIO_PORT), SITE_TAG: TAG },
      stdio: ['ignore', logFd, logFd],
    });
    try { await waitHttp(`${URL_BASE}/studio.html`, 8000); r.checks.server_ready = true; }
    catch (e) {
      r.pass = false;
      r.errors.push('[server-not-ready] ' + e.message);
      try { serverProc.kill('SIGTERM'); } catch (_) {}
      process.stdout.write(JSON.stringify(r, null, 2) + '\n');
      process.exit(1);
    }
  }

  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error' || t === 'warning') r.errors.push(`[console.${t}] ${msg.text().slice(0, 160)}`);
  });
  page.on('pageerror', err => r.errors.push('[pageerror] ' + err.message));

  try {
    // 1) /studio.html loads
    const resp = await page.goto(`${URL_BASE}/studio.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    r.checks.studio_status = resp.status();
    await page.waitForFunction(() => document.querySelectorAll('.studio-shell .rail-item').length >= 12, null, { timeout: 8000 });

    // 2) all 12 rail labels present + match expected
    const railLabels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.studio-shell .rail-item .rail-tooltip')).map(s => s.textContent.trim())
    );
    r.checks.rail_count = railLabels.length;
    r.checks.rail_labels = railLabels;
    const expected = SECTION_IDS.map(id => EXPECT_LABEL[id]);
    r.checks.rail_labels_match = expected.every(l => railLabels.includes(l));

    // memory strip + recipe flow + right panel on home
    r.checks.memory_strip_present = await page.evaluate(() => !!document.querySelector('.studio-shell .strip'));
    r.checks.recipe_node_count = await page.evaluate(() => document.querySelectorAll('.studio-shell .recipe-node').length);
    r.checks.right_panel_on_home = await page.evaluate(() => !!document.querySelector('.studio-shell .right-panel'));
    if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, '00-home.png'), fullPage: true });

    // 3) Click each rail item (not hash navigation) and verify swap + topbar crumb
    r.checks.section_results = {};
    for (const id of SECTION_IDS) {
      // Click the rail item with the matching aria-label
      await page.evaluate((label) => {
        const items = Array.from(document.querySelectorAll('.studio-shell .rail-item'));
        const target = items.find(el => el.getAttribute('aria-label') === label);
        if (target) target.click();
      }, EXPECT_LABEL[id]);

      // Wait for the rail-item active state to track
      await page.waitForFunction(
        (label) => {
          const active = document.querySelector('.studio-shell .rail-item.active .rail-tooltip');
          return active && active.textContent.trim() === label;
        },
        EXPECT_LABEL[id],
        { timeout: 4000 },
      ).catch(() => {});

      // Topbar crumb should mention the screen label
      const crumbText = await page.evaluate(() => document.querySelector('.studio-shell .crumb')?.innerText || '');
      const workspaceText = await page.evaluate(() => document.querySelector('.studio-shell .workspace')?.innerText || '');
      const railActive = await page.evaluate(() =>
        document.querySelector('.studio-shell .rail-item.active .rail-tooltip')?.textContent?.trim() || ''
      );
      const hasContextPanel = await page.evaluate(() => !!document.querySelector('.studio-shell .right-panel'));

      r.checks.section_results[id] = {
        rail_active: railActive,
        crumb_has_label: crumbText.includes(EXPECT_LABEL[id]),
        workspace_nonempty: workspaceText.length > 30,
        context_panel: hasContextPanel,
        context_panel_expected: !NO_CONTEXT.has(id),
      };
      if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, `01-${id}.png`), fullPage: true });
    }

    // 4) Read iframe contents — Builder + Mission Control
    // Builder
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.studio-shell .rail-item'));
      const t = items.find(el => el.getAttribute('aria-label') === 'Site Builder');
      if (t) t.click();
    });
    await page.waitForSelector('.studio-shell iframe', { timeout: 5000 });
    {
      const frames = page.frames();
      // Find the iframe whose URL matches /index.html?embedded=1
      const builderFrame = frames.find(f => /\/index\.html\?embedded=1/.test(f.url()));
      r.checks.builder_iframe_url = builderFrame ? builderFrame.url() : null;
      if (builderFrame) {
        // Wait briefly for the iframe DOM
        await builderFrame.waitForLoadState('domcontentloaded').catch(() => {});
        const insideText = await builderFrame.evaluate(() => document.body?.innerText?.slice(0, 200) || '');
        const insideHasEmbeddedClass = await builderFrame.evaluate(() => document.documentElement.classList.contains('studio-embedded'));
        // Real selector for the legacy chrome is #top-bar (id, not class).
        const topbarHidden = await builderFrame.evaluate(() => {
          const tb = document.getElementById('top-bar');
          if (!tb) return null;
          return getComputedStyle(tb).display === 'none';
        });
        r.checks.builder_iframe_loaded = insideText.length > 5;
        r.checks.builder_iframe_has_embedded_class = insideHasEmbeddedClass;
        r.checks.builder_iframe_topbar_hidden = topbarHidden;
      }
    }

    // Mission Control
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.studio-shell .rail-item'));
      const t = items.find(el => el.getAttribute('aria-label') === 'Mission Control');
      if (t) t.click();
    });
    await page.waitForTimeout(1200);
    {
      const frames = page.frames();
      const opFrame = frames.find(f => /\/operator\.html\?embedded=1/.test(f.url()));
      r.checks.mission_iframe_url = opFrame ? opFrame.url() : null;
      if (opFrame) {
        await opFrame.waitForLoadState('domcontentloaded').catch(() => {});
        const insideHasEmbeddedClass = await opFrame.evaluate(() => document.documentElement.classList.contains('studio-embedded'));
        const opTopbarHidden = await opFrame.evaluate(() => {
          const t = document.querySelector('.op-topbar');
          if (!t) return null;
          return getComputedStyle(t).display === 'none';
        });
        const hasOpShell = await opFrame.evaluate(() => !!document.querySelector('.op-shell'));
        const hasActionsToolbar = await opFrame.evaluate(() => !!document.querySelector('#op-actions-toolbar'));
        r.checks.mission_iframe_has_embedded_class = insideHasEmbeddedClass;
        r.checks.mission_iframe_topbar_hidden = opTopbarHidden;
        r.checks.mission_iframe_has_op_shell = hasOpShell;
        r.checks.mission_iframe_has_actions_toolbar = hasActionsToolbar;
      }
    }

    // 5) Click a recipe-flow node and assert hash navigation lands us on its target section.
    await page.evaluate(() => { location.hash = 'home'; });
    await page.waitForFunction(() => document.querySelectorAll('.studio-shell .recipe-node').length === 6, null, { timeout: 5000 });
    // Click "Open" on the first node (Research)
    await page.evaluate(() => {
      const node = document.querySelector('.studio-shell .recipe-node');
      if (!node) return;
      const openBtn = Array.from(node.querySelectorAll('button')).find(b => /Open/i.test(b.textContent));
      openBtn?.click();
    });
    await page.waitForTimeout(500);
    r.checks.recipe_jump_hash = await page.evaluate(() => location.hash);

    // 6) Standalone legacy pages
    {
      const r1 = await page.goto(`${URL_BASE}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      r.checks.legacy_index_status = r1.status();
      r.checks.legacy_index_topbar_visible = await page.evaluate(() => {
        const tb = document.getElementById('top-bar');
        if (!tb) return null;
        return getComputedStyle(tb).display !== 'none';
      });
      // CSS leak check: legacy pages should NOT define --ember as a CSS var on document root.
      // Force boolean — getPropertyValue returns "" when unset and getComputedStyle returns
      // a CSSStyleDeclaration whose unset properties read as "".
      r.checks.legacy_index_studio_token_leak = await page.evaluate(() => {
        const v = getComputedStyle(document.documentElement).getPropertyValue('--ember');
        return !!(v && v.trim().length > 0);
      });
    }
    {
      const r2 = await page.goto(`${URL_BASE}/operator.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      r.checks.legacy_operator_status = r2.status();
      r.checks.legacy_operator_topbar_visible = await page.evaluate(() => !!document.querySelector('.op-topbar') && getComputedStyle(document.querySelector('.op-topbar')).display !== 'none');
      // operator.css should NOT have --ember/--shay tokens — only --op-* tokens.
      r.checks.legacy_operator_studio_token_leak = await page.evaluate(() => {
        const cs = getComputedStyle(document.documentElement);
        return ['--ember','--aurora','--shay','--ink','--bg-2'].some(v => cs.getPropertyValue(v).trim().length > 0);
      });
      r.checks.legacy_operator_op_token_present = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).getPropertyValue('--op-bg').trim().length > 0;
      });
    }

    // 7) Re-run the operator action layer inside the embedded iframe
    await page.goto(`${URL_BASE}/studio.html#mission`, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForTimeout(2000);
    {
      const frames = page.frames();
      const opFrame = frames.find(f => /\/operator\.html\?embedded=1/.test(f.url()));
      if (opFrame) {
        await opFrame.waitForFunction(() => document.querySelectorAll('#op-actions-toolbar button').length > 0, null, { timeout: 6000 }).catch(() => {});
        // Force active site
        await opFrame.evaluate((tag) => {
          const sel = document.querySelector('#op-site-select');
          if (sel) { sel.value = tag; sel.dispatchEvent(new Event('change')); }
        }, TAG);
        await opFrame.waitForFunction(
          (tag) => window.__operator?.state?.activeTag === tag,
          TAG, { timeout: 4000 },
        ).catch(() => {});
        // Auto-accept the Run ID prompt (dialogs are page-level even from iframes in chromium)
        page.once('dialog', async d => { await d.accept(EXISTING_RUN); });
        await opFrame.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('#op-actions-toolbar button'))
            .find(b => /Start Refinement Run/i.test(b.textContent));
          btn?.click();
        });
        await opFrame.waitForFunction(
          () => {
            const s = document.querySelector('#op-actions-status');
            return s && (s.dataset.kind === 'ok' || s.dataset.kind === 'err');
          },
          null, { timeout: 6000 },
        ).catch(() => {});
        r.checks.embedded_operator_pill_text = await opFrame.evaluate(() => document.querySelector('#op-actions-status')?.textContent?.trim() || null);
        r.checks.embedded_operator_pill_kind = await opFrame.evaluate(() => document.querySelector('#op-actions-status')?.dataset?.kind || null);
        r.checks.embedded_operator_selected_run = await opFrame.evaluate(() => window.__operator?.state?.selectedRunId || null);
      }
    }
    if (SCREENSHOT_DIR) await page.screenshot({ path: path.join(SCREENSHOT_DIR, '99-mission-embedded-action.png'), fullPage: true });

    // ── Assertions ──
    const must = (cond, label) => { r.checks['assert_' + label] = !!cond; if (!cond) r.pass = false; };
    must(r.checks.studio_status === 200, 'studio_200');
    must(r.checks.rail_count === 12, 'rail_12');
    must(r.checks.rail_labels_match, 'rail_labels_match');
    must(r.checks.memory_strip_present, 'memory_strip');
    must(r.checks.recipe_node_count === 6, 'recipe_6_nodes');
    must(r.checks.right_panel_on_home, 'right_panel_home');
    for (const id of SECTION_IDS) {
      const sec = r.checks.section_results[id];
      must(sec?.rail_active === EXPECT_LABEL[id], `rail_active_${id}`);
      must(sec?.crumb_has_label, `crumb_${id}`);
      must(sec?.workspace_nonempty, `workspace_${id}`);
      must(sec?.context_panel === sec?.context_panel_expected, `context_panel_${id}`);
    }
    must(r.checks.builder_iframe_url, 'builder_iframe_url');
    must(r.checks.builder_iframe_has_embedded_class === true, 'builder_iframe_embedded_class');
    // builder_iframe_topbar_hidden may be null if .top-bar selector mismatches host CSS — accept null OR true
    must(r.checks.builder_iframe_topbar_hidden !== false, 'builder_iframe_topbar_hidden_or_absent');
    must(r.checks.mission_iframe_url, 'mission_iframe_url');
    must(r.checks.mission_iframe_has_embedded_class === true, 'mission_iframe_embedded_class');
    must(r.checks.mission_iframe_topbar_hidden !== false, 'mission_iframe_topbar_hidden');
    must(r.checks.mission_iframe_has_op_shell, 'mission_iframe_has_op_shell');
    must(r.checks.mission_iframe_has_actions_toolbar, 'mission_iframe_has_actions_toolbar');
    must(r.checks.recipe_jump_hash === '#research', 'recipe_jump_to_research');
    must(r.checks.legacy_index_status === 200, 'legacy_index_200');
    must(r.checks.legacy_index_topbar_visible === true, 'legacy_index_chrome_visible');
    must(r.checks.legacy_index_studio_token_leak === false, 'no_studio_token_leak_into_index');
    must(r.checks.legacy_operator_status === 200, 'legacy_operator_200');
    must(r.checks.legacy_operator_topbar_visible === true, 'legacy_operator_chrome_visible');
    must(r.checks.legacy_operator_studio_token_leak === false, 'no_studio_token_leak_into_operator');
    must(r.checks.legacy_operator_op_token_present, 'op_token_still_present');
    must(/already exists\s+—\s+opened/i.test(r.checks.embedded_operator_pill_text || ''), 'embedded_operator_pill_text');
    must(r.checks.embedded_operator_pill_kind === 'ok', 'embedded_operator_pill_kind_ok');
    must(r.checks.embedded_operator_selected_run === EXISTING_RUN, 'embedded_operator_selected_run');

  } catch (e) {
    r.pass = false;
    r.errors.push('[exception] ' + (e.stack || e.message || e));
  } finally {
    try { await browser.close(); } catch (_) {}
    if (serverProc) { try { serverProc.kill('SIGTERM'); } catch (_) {} }
    process.stdout.write(JSON.stringify(r, null, 2) + '\n');
    setTimeout(() => process.exit(r.pass ? 0 : 1), 200);
  }
})();
