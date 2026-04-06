/**
 * Autonomous Site Build — Guy's Classy Shoes
 * Drives Site Studio via Playwright headless Chromium.
 * Uses DOM monitoring (not standalone WS) for response detection.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// --- Config ---
const STUDIO_URL = 'http://localhost:3334';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'guys-classy-shoes');
const LOG_DIR = path.join(__dirname, 'logs');
const DEFAULT_TIMEOUT = 120_000;
const BUILD_TIMEOUT = 240_000;   // 4 min for builds (multi-page can be slow)
const BRIEF_TIMEOUT = 120_000;

// Ensure directories exist
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

// --- Execution Log ---
const executionLog = {
  site: 'guys-classy-shoes',
  started_at: new Date().toISOString(),
  completed_at: null,
  total_duration_seconds: 0,
  steps: [],
  summary: {
    total_steps: 0, passed: 0, failed: 0, timed_out: 0,
    pages_built: [], image_slots_filled: 0, image_slots_total: 0,
    verification_score: null, deploy_url: '', gaps_discovered: []
  }
};

let stepCounter = 0;

function logStep(action, label, input, output, durationMs, success, screenshotFile, notes = '') {
  stepCounter++;
  const entry = {
    step: stepCounter, action, label,
    input: typeof input === 'string' && input.length > 300 ? input.substring(0, 300) + '...' : input,
    output: typeof output === 'string' && output.length > 500 ? output.substring(0, 500) + '...' : output,
    duration_seconds: Math.round(durationMs / 1000),
    success, screenshot: screenshotFile || null, notes
  };
  executionLog.steps.push(entry);
  console.log(`  [${success ? '✓' : '✗'}] Step ${stepCounter}: ${label} (${entry.duration_seconds}s)`);
  return entry;
}

function saveLog() {
  executionLog.completed_at = new Date().toISOString();
  const startMs = new Date(executionLog.started_at).getTime();
  const endMs = new Date(executionLog.completed_at).getTime();
  executionLog.total_duration_seconds = Math.round((endMs - startMs) / 1000);
  executionLog.summary.total_steps = executionLog.steps.length;
  executionLog.summary.passed = executionLog.steps.filter(s => s.success).length;
  executionLog.summary.failed = executionLog.steps.filter(s => !s.success && !s.notes.includes('timeout')).length;
  executionLog.summary.timed_out = executionLog.steps.filter(s => s.notes.includes('timeout')).length;

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const logFile = path.join(LOG_DIR, `guys-classy-shoes-${ts}.json`);
  fs.writeFileSync(logFile, JSON.stringify(executionLog, null, 2));
  console.log(`\nLog saved: ${logFile}`);
  return logFile;
}

// --- Playwright Helpers ---
let page, browser;

async function screenshot(name) {
  const file = `${String(stepCounter + 1).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, file), fullPage: false });
  return file;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Count chat messages currently in the DOM.
 */
async function chatMessageCount() {
  return page.evaluate(() => document.querySelectorAll('#chat-messages > div').length);
}

/**
 * Get the text of the last chat message.
 */
async function lastChatMessage() {
  return page.evaluate(() => {
    const msgs = document.querySelectorAll('#chat-messages > div');
    const last = msgs[msgs.length - 1];
    return last ? last.textContent.trim() : '';
  });
}

/**
 * Send a chat message by typing into the textarea and submitting.
 */
async function sendChat(message) {
  // Record baseline message count before sending
  const baseCount = await chatMessageCount();

  // Focus the textarea, clear it, type the message
  const input = page.locator('#chat-input');
  await input.click();
  await input.fill('');
  await sleep(100);

  // For long messages, use evaluate to set value directly (faster + avoids timeout)
  if (message.length > 200) {
    await page.evaluate((msg) => {
      const el = document.getElementById('chat-input');
      el.value = msg;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, message);
  } else {
    await input.fill(message);
  }
  await sleep(200);

  // Click send button
  await page.locator('button[type="submit"]').click();
  await sleep(500);

  return baseCount;
}

/**
 * Wait for the Studio to finish processing — watches DOM for:
 * 1. step-log to appear (processing started) then disappear (done)
 * 2. New messages appearing in chat-messages
 * 3. Brief card appearing (msg-brief class)
 */
async function waitForResponse(timeoutMs = DEFAULT_TIMEOUT, baseCount = null) {
  const start = Date.now();
  const startCount = baseCount ?? await chatMessageCount();

  // Phase 1: Wait for step-log to appear (indicates processing started)
  let stepLogSeen = false;
  const stepLogWait = Math.min(timeoutMs, 10000);
  try {
    await page.waitForSelector('#step-log', { state: 'attached', timeout: stepLogWait });
    stepLogSeen = true;
  } catch {
    // step-log may not appear for instant responses
  }

  // Phase 2: Wait for new content to appear
  // This means either: step-log disappears + new message, or new message directly
  try {
    await page.waitForFunction(
      (startCount) => {
        const stepLog = document.getElementById('step-log');
        const msgCount = document.querySelectorAll('#chat-messages > div').length;
        // Done when: no step-log AND more messages than we started with
        return !stepLog && msgCount > startCount;
      },
      startCount,
      { timeout: timeoutMs - (Date.now() - start) }
    );
  } catch {
    // If we time out, check if there are at least new messages
    const currentCount = await chatMessageCount();
    if (currentCount > startCount) {
      // Got messages even though step-log may still be present
    } else {
      throw new Error(`Response timeout after ${Math.round((Date.now() - start) / 1000)}s`);
    }
  }

  await sleep(500); // Let final DOM updates settle
  const lastMsg = await lastChatMessage();
  return lastMsg;
}

/**
 * Wait specifically for a build to complete — watches for reload-preview
 * which manifests as the preview iframe reloading.
 */
async function waitForBuild(timeoutMs = BUILD_TIMEOUT, baseCount = null) {
  const start = Date.now();
  const startCount = baseCount ?? await chatMessageCount();

  // Watch for: step-log disappears + new messages + no more processing
  // For builds, also give extra settling time
  try {
    await page.waitForFunction(
      (startCount) => {
        const stepLog = document.getElementById('step-log');
        const msgCount = document.querySelectorAll('#chat-messages > div').length;
        return !stepLog && msgCount > startCount;
      },
      startCount,
      { timeout: timeoutMs }
    );
  } catch {
    const currentCount = await chatMessageCount();
    if (currentCount <= startCount) {
      throw new Error(`Build timeout after ${Math.round((Date.now() - start) / 1000)}s`);
    }
  }

  // Extra settle time for builds (post-processing, preview reload)
  await sleep(3000);
  const lastMsg = await lastChatMessage();
  return lastMsg;
}

// ============================================================
//  MAIN BUILD SEQUENCE
// ============================================================

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Autonomous Build: Guy\'s Classy Shoes        ║');
  console.log('║  (DOM-based detection v2)                    ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();

  // Capture console messages for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`  [browser-error] ${msg.text().substring(0, 100)}`);
    }
  });

  try {
    // --- Navigate to Studio ---
    console.log('[Phase 1] Loading Studio...');
    await page.goto(STUDIO_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000); // Let WS connect and initial state load
    const ssInit = await screenshot('00-studio-loaded');
    logStep('setup', 'Studio loaded', STUDIO_URL, 'OK', 3000, true, ssInit);

    // ═══════════════════════════════════════════
    //  STEP 1: Submit the brief
    // ═══════════════════════════════════════════
    console.log('\n[Step 1] Submitting brief...');
    const briefText = `I need a website for Guy's Classy Shoes — a high-end men's leather shoe company specializing in luxury hardbottom dress shoes, including exotic leathers like alligator and crocodile.

Brand positioning: Restrained luxury. Think Berluti, John Lobb — not flashy, not streetwear. The kind of shoes a man wears when he wants to be taken seriously.

Tagline: "Distinguished from the sole up"

Color palette: Deep charcoal (#1A1A1A) primary, warm gold (#C9A96E) accent, cream (#FAF7F2) background, rich burgundy (#4A1A2C) secondary accent.

Typography: Georgia or Playfair Display for headings, Inter for body.

Pages needed:
- Home (hero with luxury shoe imagery, featured collections, testimonials, brand story teaser)
- Collections (product categories: Classic Oxfords, Exotic Leathers, Loafers & Slip-Ons, Boots)
- About (Guy's story, craftsmanship philosophy, materials sourcing)
- Contact (store location, inquiries form, appointment booking)

Tone: Confident but understated. Words like "crafted," "distinguished," "heritage," "bespoke."

The logo is already in the assets folder as logo.svg.`;

    let t0 = Date.now();
    try {
      const baseCount = await sendChat(briefText);
      // Wait for brief card or assistant response
      const resp = await waitForResponse(BRIEF_TIMEOUT, baseCount);
      const dur = Date.now() - t0;
      const ss = await screenshot('01-brief-submitted');

      // Check if a brief card appeared
      const hasBrief = await page.locator('.msg-brief').count() > 0;
      const hasBuildBtn = await page.locator('button', { hasText: 'Build From Brief' }).isVisible().catch(() => false);

      logStep('chat_send', 'Submit brief', briefText.substring(0, 100) + '...',
        hasBrief ? 'DESIGN_BRIEF received' : resp.substring(0, 200),
        dur, true, ss, hasBuildBtn ? 'Build From Brief button visible' : '');
      console.log(`  Brief ${hasBrief ? 'card' : 'response'} received in ${Math.round(dur / 1000)}s`);
    } catch (err) {
      const ss = await screenshot('01-brief-error');
      logStep('chat_send', 'Submit brief', 'brief text', err.message, Date.now() - t0, false, ss, 'timeout');
      // Even on timeout, check if the brief card appeared
      const hasBuildBtn = await page.locator('button', { hasText: 'Build From Brief' }).isVisible().catch(() => false);
      if (hasBuildBtn) console.log('  Brief card appeared despite timeout detection');
    }

    // ═══════════════════════════════════════════
    //  STEP 2: Approve and Build
    // ═══════════════════════════════════════════
    console.log('\n[Step 2] Building from brief...');
    t0 = Date.now();
    try {
      const buildBtn = page.locator('button', { hasText: 'Build From Brief' });
      const btnVisible = await buildBtn.isVisible({ timeout: 5000 }).catch(() => false);

      let baseCount = await chatMessageCount();

      if (btnVisible) {
        await buildBtn.click();
        console.log('  Clicked "Build From Brief"');
      } else {
        // Fallback: send approve-brief via page's WS
        console.log('  Button not found, sending approve-brief via page WS');
        await page.evaluate(() => {
          if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify({ type: 'approve-brief' }));
          }
        });
      }

      const resp = await waitForBuild(BUILD_TIMEOUT, baseCount);
      const dur = Date.now() - t0;
      const ss = await screenshot('02-build-complete');
      logStep('button_click', 'Build from brief', 'approve-brief', resp.substring(0, 200),
        dur, true, ss);
      console.log(`  Build completed in ${Math.round(dur / 1000)}s`);
    } catch (err) {
      const ss = await screenshot('02-build-error');
      logStep('button_click', 'Build from brief', 'approve-brief', err.message,
        Date.now() - t0, false, ss, 'timeout');
      // Wait a bit more — build may still be finishing in background
      console.log('  Build timed out, waiting 30s for background completion...');
      await sleep(30000);
      await screenshot('02-build-late');
    }

    // ═══════════════════════════════════════════
    //  STEP 3: Evaluate initial build
    // ═══════════════════════════════════════════
    console.log('\n[Step 3] Evaluating build...');
    t0 = Date.now();
    try {
      await sleep(2000);
      // Check page tabs
      const pageTabs = await page.locator('#page-tabs button').allInnerTexts().catch(() => []);
      const pages = pageTabs.filter(t => t.trim().length > 0);

      // Also check filesystem for built pages
      const distFiles = fs.readdirSync(path.join(process.env.HOME, 'famtastic/sites/site-guys-classy-shoes/dist'))
        .filter(f => f.endsWith('.html') && !f.startsWith('_'));

      // Screenshot each page
      for (const pg of pages.slice(0, 6)) {
        try {
          const tabBtn = page.locator('#page-tabs button', { hasText: pg.trim() });
          if (await tabBtn.isVisible().catch(() => false)) {
            await tabBtn.click();
            await sleep(2000);
            const safeName = pg.toLowerCase().replace(/[^a-z0-9]/g, '-');
            await screenshot(`03-page-${safeName}`);
          }
        } catch {}
      }

      const dur = Date.now() - t0;
      const ss = await screenshot('03-initial-eval');
      const pageList = pages.length > 0 ? pages : distFiles.map(f => f.replace('.html', ''));
      logStep('evaluate', 'Evaluate initial build', 'Check pages',
        `Pages: ${pageList.join(', ')} | Dist files: ${distFiles.join(', ')}`,
        dur, true, ss);
      executionLog.summary.pages_built = pageList;
      console.log(`  Pages: ${pageList.join(', ')}`);
    } catch (err) {
      const ss = await screenshot('03-eval-error');
      logStep('evaluate', 'Evaluate build', 'Check pages', err.message, Date.now() - t0, false, ss);
    }

    // ═══════════════════════════════════════════
    //  STEP 4: Fill stock photos
    // ═══════════════════════════════════════════
    console.log('\n[Step 4] Filling stock photos...');
    t0 = Date.now();
    try {
      const bc = await sendChat('Fill stock photos for all empty image slots');
      const resp = await waitForBuild(BUILD_TIMEOUT, bc);
      const dur = Date.now() - t0;
      const ss = await screenshot('04-stock-photos');
      logStep('chat_send', 'Fill stock photos', 'Fill all slots', resp.substring(0, 200),
        dur, true, ss);
      console.log(`  Stock fill done (${Math.round(dur / 1000)}s)`);
    } catch (err) {
      const ss = await screenshot('04-stock-error');
      logStep('chat_send', 'Fill stock photos', 'Fill all slots', err.message,
        Date.now() - t0, false, ss, 'timeout');
    }

    // Targeted stock searches
    const stockSearches = [
      'Search for luxury men\'s leather oxford shoes for the hero image',
      'Search for alligator leather close-up texture for the exotic collection',
      'Search for craftsman working on leather shoes for the about page',
      'Search for elegant men\'s loafers on dark background'
    ];

    for (let i = 0; i < stockSearches.length; i++) {
      const query = stockSearches[i];
      t0 = Date.now();
      try {
        const bc = await sendChat(query);
        const resp = await waitForBuild(DEFAULT_TIMEOUT, bc);
        const dur = Date.now() - t0;
        const ss = await screenshot(`04-stock-${i + 1}`);
        logStep('chat_send', `Stock search ${i + 1}`, query.substring(0, 60),
          resp.substring(0, 200), dur, true, ss);
      } catch (err) {
        const ss = await screenshot(`04-stock-${i + 1}-err`);
        logStep('chat_send', `Stock search ${i + 1}`, query.substring(0, 60),
          err.message, Date.now() - t0, false, ss, 'timeout');
      }
    }

    // ═══════════════════════════════════════════
    //  STEP 5: Brainstorm mode
    // ═══════════════════════════════════════════
    console.log('\n[Step 5] Brainstorm mode...');
    t0 = Date.now();
    try {
      const bc = await sendChat("Let's brainstorm — what would make this site feel more premium? Think about what luxury shoe brands do differently.");
      const resp = await waitForResponse(DEFAULT_TIMEOUT, bc);
      const dur = Date.now() - t0;
      const ss = await screenshot('05-brainstorm');
      logStep('chat_send', 'Brainstorm prompt', 'Brainstorm luxury ideas',
        resp.substring(0, 200), dur, true, ss);
      console.log(`  Brainstorm response (${Math.round(dur / 1000)}s)`);

      // Follow up
      await sleep(1000);
      t0 = Date.now();
      const bc2 = await sendChat("Those are good ideas. Let's go with the first suggestion.");
      const resp2 = await waitForBuild(BUILD_TIMEOUT, bc2);
      const dur2 = Date.now() - t0;
      const ss2 = await screenshot('05-brainstorm-apply');
      logStep('chat_send', 'Apply brainstorm suggestion', 'Go with first',
        resp2.substring(0, 200), dur2, true, ss2);
    } catch (err) {
      const ss = await screenshot('05-brainstorm-err');
      logStep('chat_send', 'Brainstorm', 'Brainstorm', err.message,
        Date.now() - t0, false, ss, 'timeout');
    }

    // ═══════════════════════════════════════════
    //  STEP 6: Post-build edits
    // ═══════════════════════════════════════════
    console.log('\n[Step 6] Post-build edits...');

    const edits = [
      { label: 'Add New Arrivals section', msg: 'Add a "New Arrivals" section to the home page between the hero and collections', ssName: '06a-new-arrivals' },
      { label: 'Change testimonials heading', msg: 'Change the testimonials heading to "What Gentlemen Are Saying"', ssName: '06b-testimonials' },
      { label: 'Switch to about page', msg: 'Switch to the about page', ssName: '06c-switch-about', quick: true },
      { label: 'Add leather sourcing', msg: 'Add a section about exotic leather sourcing — ethically sourced, hand-selected, each skin is unique. Include details about the tanning process.', ssName: '06c-leather-sourcing' },
      { label: 'Restyle footer', msg: 'Make the footer more elegant — use the gold accent color for the border and keep the text minimal', ssName: '06d-footer-restyle' }
    ];

    for (const edit of edits) {
      t0 = Date.now();
      try {
        const bc = await sendChat(edit.msg);
        const resp = edit.quick
          ? await waitForResponse(30000, bc)
          : await waitForBuild(BUILD_TIMEOUT, bc);
        const dur = Date.now() - t0;
        const ss = await screenshot(edit.ssName);
        logStep('chat_send', edit.label, edit.msg.substring(0, 80),
          resp.substring(0, 200), dur, true, ss);
        console.log(`  ${edit.label} (${Math.round(dur / 1000)}s)`);
      } catch (err) {
        const ss = await screenshot(`${edit.ssName}-err`);
        logStep('chat_send', edit.label, edit.msg.substring(0, 80), err.message,
          Date.now() - t0, false, ss, 'timeout');
        console.log(`  ${edit.label} — ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════
    //  STEP 7: Admin functions
    // ═══════════════════════════════════════════
    console.log('\n[Step 7] Admin functions...');

    const adminCmds = [
      { label: 'Version history', msg: 'Show version history', ssName: '07a-version-history' },
      { label: 'Brand health', msg: 'Check brand health', ssName: '07b-brand-health' },
      { label: 'Rollback', msg: 'Rollback to the previous version', ssName: '07c-rollback' },
      { label: 'Undo rollback', msg: 'Undo that rollback — go back to the latest version', ssName: '07d-undo-rollback' }
    ];

    for (const cmd of adminCmds) {
      t0 = Date.now();
      try {
        const bc = await sendChat(cmd.msg);
        const resp = await waitForBuild(BUILD_TIMEOUT, bc);
        const dur = Date.now() - t0;
        const ss = await screenshot(cmd.ssName);
        logStep('chat_send', cmd.label, cmd.msg, resp.substring(0, 200), dur, true, ss);
        console.log(`  ${cmd.label} (${Math.round(dur / 1000)}s)`);
      } catch (err) {
        const ss = await screenshot(`${cmd.ssName}-err`);
        logStep('chat_send', cmd.label, cmd.msg, err.message,
          Date.now() - t0, false, ss, 'timeout');
        console.log(`  ${cmd.label} — ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════
    //  STEP 8: Verification
    // ═══════════════════════════════════════════
    console.log('\n[Step 8] Verification...');
    t0 = Date.now();
    try {
      const bc = await sendChat('Run verification');
      const resp = await waitForResponse(DEFAULT_TIMEOUT, bc);
      const dur = Date.now() - t0;
      // Try to read verification indicator from DOM
      const verifyLabel = await page.locator('#verify-label').textContent().catch(() => '');
      executionLog.summary.verification_score = verifyLabel || null;
      const ss = await screenshot('08-verification');
      logStep('chat_send', 'Run verification', 'Run verification',
        `${resp.substring(0, 200)} | Verify: ${verifyLabel}`, dur, true, ss);
      console.log(`  Verification: ${verifyLabel}`);
    } catch (err) {
      const ss = await screenshot('08-verify-err');
      logStep('chat_send', 'Verification', 'Run verification', err.message,
        Date.now() - t0, false, ss, 'timeout');
    }

    // ═══════════════════════════════════════════
    //  STEP 9: Deploy
    // ═══════════════════════════════════════════
    console.log('\n[Step 9] Deploying...');
    t0 = Date.now();
    try {
      const bc = await sendChat('Deploy the site');
      const resp = await waitForResponse(BUILD_TIMEOUT, bc);
      const dur = Date.now() - t0;

      // Try to extract deploy URL from response or DOM
      const urlMatch = resp.match(/https?:\/\/[^\s"<>]+netlify[^\s"<>]*/);
      if (urlMatch) executionLog.summary.deploy_url = urlMatch[0];

      // Also check the studio panel for live URL
      const liveUrl = await page.locator('#studio-live-url a').getAttribute('href').catch(() => '');
      if (liveUrl && !executionLog.summary.deploy_url) executionLog.summary.deploy_url = liveUrl;

      const ss = await screenshot('09-deploy');
      logStep('chat_send', 'Deploy site', 'Deploy the site',
        `${resp.substring(0, 200)} | URL: ${executionLog.summary.deploy_url}`,
        dur, true, ss);
      console.log(`  Deploy URL: ${executionLog.summary.deploy_url || 'checking...'}`);
    } catch (err) {
      const ss = await screenshot('09-deploy-err');
      logStep('chat_send', 'Deploy', 'Deploy the site', err.message,
        Date.now() - t0, false, ss, 'timeout');
    }

    // ═══════════════════════════════════════════
    //  STEP 10: Final documentation
    // ═══════════════════════════════════════════
    console.log('\n[Step 10] Final screenshots...');
    t0 = Date.now();
    try {
      const pageTabs = await page.locator('#page-tabs button').allInnerTexts().catch(() => []);
      const finalPages = pageTabs.filter(t => t.trim().length > 0);

      for (const pg of finalPages.slice(0, 6)) {
        try {
          await page.locator('#page-tabs button', { hasText: pg.trim() }).click();
          await sleep(2000);
          const safeName = pg.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await screenshot(`10-final-${safeName}`);
        } catch {}
      }

      // Count image slots from dist files
      const distDir = path.join(process.env.HOME, 'famtastic/sites/site-guys-classy-shoes/dist');
      const distFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.html') && !f.startsWith('_'));
      let totalSlots = 0, filledSlots = 0;
      for (const f of distFiles) {
        const html = fs.readFileSync(path.join(distDir, f), 'utf8');
        const slotMatches = html.match(/data-slot-id/g);
        if (slotMatches) totalSlots += slotMatches.length;
        const imgSrcMatches = html.match(/src="assets\/(stock|uploads)\//g);
        if (imgSrcMatches) filledSlots += imgSrcMatches.length;
      }
      executionLog.summary.image_slots_total = totalSlots;
      executionLog.summary.image_slots_filled = filledSlots;

      if (finalPages.length > 0) executionLog.summary.pages_built = finalPages;

      const dur = Date.now() - t0;
      const ss = await screenshot('10-final-state');
      logStep('screenshot', 'Final documentation', 'Screenshot all pages',
        `Pages: ${finalPages.join(', ')} | Slots: ${filledSlots}/${totalSlots}`,
        dur, true, ss);
      console.log(`  Final: ${finalPages.join(', ')} | Slots: ${filledSlots}/${totalSlots}`);
    } catch (err) {
      logStep('screenshot', 'Final docs', 'screenshots', err.message,
        Date.now() - t0, false, null);
    }

  } catch (fatalErr) {
    console.error(`\nFATAL: ${fatalErr.message}`);
    try { await screenshot('fatal-error'); } catch {}
    logStep('fatal', 'Fatal error', '', fatalErr.message, 0, false, null, 'fatal');
  } finally {
    const logFile = saveLog();

    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║  BUILD SUMMARY                               ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  Total steps:  ${executionLog.summary.total_steps}`);
    console.log(`║  Passed:       ${executionLog.summary.passed}`);
    console.log(`║  Failed:       ${executionLog.summary.failed}`);
    console.log(`║  Timed out:    ${executionLog.summary.timed_out}`);
    console.log(`║  Pages:        ${executionLog.summary.pages_built.join(', ') || 'unknown'}`);
    console.log(`║  Slots:        ${executionLog.summary.image_slots_filled}/${executionLog.summary.image_slots_total}`);
    console.log(`║  Deploy URL:   ${executionLog.summary.deploy_url || 'none'}`);
    console.log(`║  Duration:     ${executionLog.total_duration_seconds}s`);
    console.log(`║  Log:          ${logFile}`);
    console.log('╚══════════════════════════════════════════════╝');

    if (browser) await browser.close();
  }
}

main().catch(err => {
  console.error('Unhandled:', err);
  saveLog();
  process.exit(1);
});
