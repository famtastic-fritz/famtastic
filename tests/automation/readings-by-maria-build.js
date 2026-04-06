/**
 * Autonomous Site Build — Readings by Maria
 * Research-first pipeline test (Site #3).
 * DOM-based detection v2 (proven in Guy's Classy Shoes: 23/23 pass).
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// --- Config ---
const STUDIO_URL = 'http://localhost:3334';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'readings-by-maria');
const LOG_DIR = path.join(__dirname, 'logs');
const DEFAULT_TIMEOUT = 120_000;
const BUILD_TIMEOUT = 240_000;
const BRIEF_TIMEOUT = 120_000;

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(LOG_DIR, { recursive: true });

// --- Execution Log ---
const executionLog = {
  site: 'readings-by-maria',
  started_at: new Date().toISOString(),
  completed_at: null,
  total_duration_seconds: 0,
  research_phase: {
    tracks_completed: ['competitive', 'domain', 'visual'],
    research_duration_seconds: 0,
    files_generated: [
      'research/competitive-analysis.md',
      'research/domain-knowledge.md',
      'research/visual-direction.md',
      'research/brief-inputs.md'
    ],
    key_findings: [
      'Dark palettes with gold accents signal premium credibility (Tarot by Dante pattern)',
      'Wellness language dramatically outperforms fortune-telling language',
      'Professional photography is single biggest credibility factor',
      'Chakra education section is a competitive gap — most sites list service but never explain',
      'Session preparation guide identified as missing from all 12 analyzed sites',
      'Cormorant Garamond + Raleway pairing balances ancient wisdom with modern professionalism',
      'Stock queries must avoid "psychic reading", "fortune teller", "crystal ball" — all produce cliche imagery'
    ]
  },
  steps: [],
  summary: {
    total_steps: 0, passed: 0, failed: 0, timed_out: 0,
    pages_built: [], image_slots_filled: 0, image_slots_total: 0,
    verification_score: null, deploy_url: '', gaps_discovered: [],
    research_impact: ''
  }
};

let stepCounter = 0;
let page, browser;

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
  console.log(`  [${success ? '\u2713' : '\u2717'}] Step ${stepCounter}: ${label} (${entry.duration_seconds}s)`);
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
  const logFile = path.join(LOG_DIR, `readings-by-maria-${ts}.json`);
  fs.writeFileSync(logFile, JSON.stringify(executionLog, null, 2));
  console.log(`\nLog saved: ${logFile}`);
  return logFile;
}

async function screenshot(name) {
  const file = `${String(stepCounter + 1).padStart(2, '0')}-${name}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, file), fullPage: false });
  return file;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function chatMessageCount() {
  return page.evaluate(() => document.querySelectorAll('#chat-messages > div').length);
}

async function lastChatMessage() {
  return page.evaluate(() => {
    const msgs = document.querySelectorAll('#chat-messages > div');
    const last = msgs[msgs.length - 1];
    return last ? last.textContent.trim() : '';
  });
}

async function sendChat(message) {
  const baseCount = await chatMessageCount();
  const input = page.locator('#chat-input');
  await input.click();
  await input.fill('');
  await sleep(100);
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
  await page.locator('button[type="submit"]').click();
  await sleep(500);
  return baseCount;
}

async function waitForResponse(timeoutMs = DEFAULT_TIMEOUT, baseCount = null) {
  const start = Date.now();
  const startCount = baseCount ?? await chatMessageCount();
  try {
    await page.waitForSelector('#step-log', { state: 'attached', timeout: Math.min(timeoutMs, 10000) });
  } catch {}
  try {
    await page.waitForFunction(
      (sc) => {
        const stepLog = document.getElementById('step-log');
        const msgCount = document.querySelectorAll('#chat-messages > div').length;
        return !stepLog && msgCount > sc;
      }, startCount, { timeout: timeoutMs - (Date.now() - start) }
    );
  } catch {
    const currentCount = await chatMessageCount();
    if (currentCount <= startCount) {
      throw new Error(`Response timeout after ${Math.round((Date.now() - start) / 1000)}s`);
    }
  }
  await sleep(500);
  return await lastChatMessage();
}

async function waitForBuild(timeoutMs = BUILD_TIMEOUT, baseCount = null) {
  const start = Date.now();
  const startCount = baseCount ?? await chatMessageCount();
  try {
    await page.waitForFunction(
      (sc) => {
        const stepLog = document.getElementById('step-log');
        const msgCount = document.querySelectorAll('#chat-messages > div').length;
        return !stepLog && msgCount > sc;
      }, startCount, { timeout: timeoutMs }
    );
  } catch {
    const currentCount = await chatMessageCount();
    if (currentCount <= startCount) {
      throw new Error(`Build timeout after ${Math.round((Date.now() - start) / 1000)}s`);
    }
  }
  await sleep(3000);
  return await lastChatMessage();
}

// ============================================================
//  BRIEF TEXT — Constructed from research/brief-inputs.md
// ============================================================

const BRIEF_TEXT = `I need a website for Readings by Maria — a professional psychic and spiritual practitioner offering tarot readings, chakra balancing, past life regression, and mediumship sessions.

Brand: Readings by Maria
Domain: readingsbymaria.com

Brand positioning: Credible, warm, professional spiritual practitioner. Think wellness therapist who works with intuitive tools — NOT carnival fortune teller. Based on competitive analysis of 12 psychic websites, the most credible sites (like Tarot by Dante) position the practitioner as a guide offering clarity, not a mystic making predictions.

Tagline: "Clarity Through Intuition"

Color palette — "Midnight Oracle" (dark, immersive, luxurious):
- Obsidian Night (#0B0B14) deep background
- Midnight Plum (#1A1128) card/section backgrounds
- Dark Amethyst (#2A1F3D) elevated surfaces
- Mystic Gold (#C9A84C) primary accent for CTAs and highlights
- Moonstone (#E8E4F0) body text
- Pearl White (#F5F1FA) headings
- Violet Veil (#7B5EA7) secondary accent for links and dividers
- Dusty Rose (#9E4773) tertiary warmth accent

Typography: Cormorant Garamond for headings (elegant serif, ancient wisdom feel), Raleway for body text (clean sans-serif, modern professionalism).

Pages needed:
- Home (full-screen dark hero with atmospheric imagery, brief intro to Maria, services overview cards, a featured testimonial, and a "Begin Your Journey" CTA)
- Services (service cards for: Tarot Reading 30min $75 / 60min $125, Chakra Balancing $95, Past Life Regression $150, Mediumship Session $175, Oracle Card Reading $65. Include session format options: in-person, video, phone)
- About (Maria's origin story and philosophy, credentials, warm candlelit professional photos)
- Contact (booking form, contact info, session preparation tips, cancellation policy)

Content tone: Use wellness language — "guidance," "clarity," "insight," "journey." Avoid fortune-telling language — no "predictions," "destiny," "fate," "guaranteed results." Maria speaks with quiet confidence. Client is the hero, not the practitioner.

Trust signals needed: Transparent pricing, specific session descriptions, authentic testimonials with first names, FAQ addressing what to expect.

The logo is already in the assets folder as logo.svg.`;

// ============================================================
//  MAIN BUILD SEQUENCE
// ============================================================

async function main() {
  console.log('\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
  console.log('\u2551  Autonomous Build: Readings by Maria          \u2551');
  console.log('\u2551  Research-first pipeline (DOM v2)              \u2551');
  console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d\n');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`  [browser-err] ${msg.text().substring(0, 100)}`);
  });

  try {
    // --- Load Studio ---
    console.log('[Phase 1] Loading Studio...');
    await page.goto(STUDIO_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    const ssInit = await screenshot('00-studio-loaded');
    logStep('setup', 'Studio loaded', STUDIO_URL, 'OK', 3000, true, ssInit);

    // ========== STEP 1: Submit brief ==========
    console.log('\n[Step 1] Submitting research-informed brief...');
    let t0 = Date.now();
    try {
      const bc = await sendChat(BRIEF_TEXT);
      const resp = await waitForResponse(BRIEF_TIMEOUT, bc);
      const dur = Date.now() - t0;
      const ss = await screenshot('01-brief-submitted');
      const hasBrief = await page.locator('.msg-brief').count() > 0;
      logStep('chat_send', 'Submit brief', 'Research-informed brief (see brief-inputs.md)',
        hasBrief ? 'DESIGN_BRIEF received' : resp.substring(0, 200),
        dur, true, ss);
      console.log(`  Brief received in ${Math.round(dur / 1000)}s`);
    } catch (err) {
      const ss = await screenshot('01-brief-error');
      logStep('chat_send', 'Submit brief', 'brief', err.message, Date.now() - t0, false, ss, 'timeout');
    }

    // ========== STEP 2: Build from brief ==========
    console.log('\n[Step 2] Building from brief...');
    t0 = Date.now();
    try {
      const buildBtn = page.locator('button', { hasText: 'Build From Brief' });
      let bc = await chatMessageCount();
      if (await buildBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await buildBtn.click();
        console.log('  Clicked "Build From Brief"');
      } else {
        await page.evaluate(() => {
          if (window.ws && window.ws.readyState === WebSocket.OPEN)
            window.ws.send(JSON.stringify({ type: 'approve-brief' }));
        });
        console.log('  Sent approve-brief via WS');
      }
      const resp = await waitForBuild(BUILD_TIMEOUT, bc);
      const dur = Date.now() - t0;
      const ss = await screenshot('02-build-complete');
      logStep('button_click', 'Build from brief', 'approve-brief', resp.substring(0, 200), dur, true, ss);
      console.log(`  Build completed in ${Math.round(dur / 1000)}s`);
    } catch (err) {
      const ss = await screenshot('02-build-error');
      logStep('button_click', 'Build from brief', 'approve-brief', err.message, Date.now() - t0, false, ss, 'timeout');
      await sleep(30000);
    }

    // ========== STEP 3: Evaluate build ==========
    console.log('\n[Step 3] Evaluating build...');
    t0 = Date.now();
    try {
      await sleep(2000);
      const pageTabs = await page.locator('#page-tabs button').allInnerTexts().catch(() => []);
      const pages = pageTabs.filter(t => t.trim().length > 0);
      const distDir = path.join(process.env.HOME, 'famtastic/sites/readings-by-maria/dist');
      const distFiles = fs.existsSync(distDir)
        ? fs.readdirSync(distDir).filter(f => f.endsWith('.html') && !f.startsWith('_'))
        : [];
      for (const pg of pages.slice(0, 6)) {
        try {
          const tabBtn = page.locator('#page-tabs button', { hasText: pg.trim() });
          if (await tabBtn.isVisible().catch(() => false)) {
            await tabBtn.click();
            await sleep(2000);
            await screenshot(`03-page-${pg.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
          }
        } catch {}
      }
      const dur = Date.now() - t0;
      const ss = await screenshot('03-eval');
      const pageList = pages.length > 0 ? pages : distFiles.map(f => f.replace('.html', ''));
      logStep('evaluate', 'Evaluate build', 'Check pages',
        `Pages: ${pageList.join(', ')} | Dist: ${distFiles.join(', ')}`, dur, true, ss);
      executionLog.summary.pages_built = pageList;
      console.log(`  Pages: ${pageList.join(', ')}`);
    } catch (err) {
      logStep('evaluate', 'Evaluate build', 'Check pages', err.message, Date.now() - t0, false, null);
    }

    // ========== STEP 4: Research-informed stock photos ==========
    console.log('\n[Step 4] Research-informed stock photos...');
    t0 = Date.now();
    try {
      const bc = await sendChat('Fill stock photos for all empty image slots');
      const resp = await waitForBuild(BUILD_TIMEOUT, bc);
      const ss = await screenshot('04-stock-fill');
      logStep('chat_send', 'Bulk stock fill', 'Fill all slots', resp.substring(0, 200),
        Date.now() - t0, true, ss);
    } catch (err) {
      logStep('chat_send', 'Bulk stock fill', 'Fill all slots', err.message, Date.now() - t0, false, null, 'timeout');
    }

    // Targeted searches from research
    const stockQueries = [
      'Search for candle dark background hands for the hero image',
      'Search for tarot cards candlelight dark for the services section',
      'Search for crystal healing stones dark background for the chakras section',
      'Search for candle flame dark background bokeh for testimonials'
    ];
    for (let i = 0; i < stockQueries.length; i++) {
      t0 = Date.now();
      try {
        const bc = await sendChat(stockQueries[i]);
        const resp = await waitForBuild(DEFAULT_TIMEOUT, bc);
        const ss = await screenshot(`04-stock-${i + 1}`);
        logStep('chat_send', `Stock: ${stockQueries[i].substring(11, 50)}`, stockQueries[i].substring(0, 60),
          resp.substring(0, 200), Date.now() - t0, true, ss);
      } catch (err) {
        logStep('chat_send', `Stock ${i + 1}`, stockQueries[i].substring(0, 60),
          err.message, Date.now() - t0, false, null, 'timeout');
      }
    }

    // ========== STEP 5: Brainstorm ==========
    console.log('\n[Step 5] Brainstorm...');
    t0 = Date.now();
    try {
      const bc = await sendChat("Let's brainstorm \u2014 based on what you know about spiritual practitioner websites, what would make this site stand out from the competition? Think about what most psychic sites are missing.");
      const resp = await waitForResponse(DEFAULT_TIMEOUT, bc);
      const ss = await screenshot('05-brainstorm');
      logStep('chat_send', 'Brainstorm', 'What makes this stand out?', resp.substring(0, 200),
        Date.now() - t0, true, ss);
      console.log(`  Brainstorm response received`);

      await sleep(1000);
      t0 = Date.now();
      const bc2 = await sendChat("Let's implement that first suggestion.");
      const resp2 = await waitForBuild(BUILD_TIMEOUT, bc2);
      const ss2 = await screenshot('05-brainstorm-apply');
      logStep('chat_send', 'Apply brainstorm', 'First suggestion', resp2.substring(0, 200),
        Date.now() - t0, true, ss2);
    } catch (err) {
      logStep('chat_send', 'Brainstorm', 'brainstorm', err.message, Date.now() - t0, false, null, 'timeout');
    }

    // ========== STEP 6: Content-specific edits ==========
    console.log('\n[Step 6] Content edits...');

    const edits = [
      {
        label: 'Add chakra section',
        msg: 'Add a chakras section to the services page. It should list all 7 chakras with their name, associated color, body location, and what each one governs. Use the chakra colors as accent elements. Root (red, base of spine, grounding), Sacral (orange, lower abdomen, creativity), Solar Plexus (yellow, navel, personal power), Heart (green, chest, love), Throat (blue, throat, communication), Third Eye (indigo, forehead, intuition), Crown (violet, top of head, spiritual connection).',
        ssName: '06a-chakras'
      },
      {
        label: 'Add pricing section',
        msg: 'Add a pricing section. Tarot readings: 30 min $75, 60 min $125. Chakra balancing: $95. Past life regression: $150. Mediumship session: $175. Oracle card reading: 30 min $65. Present these elegantly, not like a menu at a diner. Use the gold accent for pricing and dark card backgrounds.',
        ssName: '06b-pricing'
      },
      {
        label: 'Add testimonials',
        msg: 'Add a testimonials section with 3 testimonials. Make them feel authentic \u2014 people who were skeptical but had a meaningful experience. First names only. Example tone: "I came in unsure, but Maria helped me see a pattern in my relationships I had been blind to for years." \u2014 Sarah. Focus on clarity and insight, not predictions.',
        ssName: '06c-testimonials'
      },
      {
        label: 'Add FAQ',
        msg: 'Add a FAQ section. Cover: What to expect in a session, How to prepare for a reading, Do you offer remote readings (yes \u2014 Zoom and phone), What is your cancellation policy (24 hours notice required), Is everything confidential (absolutely \u2014 all sessions are completely private). Style it with the dark theme and gold accents.',
        ssName: '06d-faq'
      },
      {
        label: 'Add booking CTAs',
        msg: 'Make sure every page has a clear call-to-action to book a reading. The button text should be "Begin Your Journey" with the gold accent color. Add it to the hero section, after services, and in the footer.',
        ssName: '06e-cta'
      }
    ];

    for (const edit of edits) {
      t0 = Date.now();
      try {
        const bc = await sendChat(edit.msg);
        const resp = await waitForBuild(BUILD_TIMEOUT, bc);
        const ss = await screenshot(edit.ssName);
        logStep('chat_send', edit.label, edit.msg.substring(0, 80), resp.substring(0, 200),
          Date.now() - t0, true, ss);
        console.log(`  ${edit.label} (${Math.round((Date.now() - t0) / 1000)}s)`);
      } catch (err) {
        const ss = await screenshot(`${edit.ssName}-err`);
        logStep('chat_send', edit.label, edit.msg.substring(0, 80), err.message,
          Date.now() - t0, false, ss, 'timeout');
        console.log(`  ${edit.label} \u2014 ${err.message}`);
      }
    }

    // ========== STEP 7: Admin functions ==========
    console.log('\n[Step 7] Admin functions...');
    const adminCmds = [
      { label: 'Version history', msg: 'Show version history', ssName: '07a-versions' },
      { label: 'Brand health', msg: 'Check brand health', ssName: '07b-brand-health' },
      { label: 'Rollback', msg: 'Rollback to the previous version', ssName: '07c-rollback' },
      { label: 'Undo rollback', msg: 'Undo that rollback \u2014 go back to the latest version', ssName: '07d-undo' }
    ];
    for (const cmd of adminCmds) {
      t0 = Date.now();
      try {
        const bc = await sendChat(cmd.msg);
        const resp = await waitForBuild(BUILD_TIMEOUT, bc);
        const ss = await screenshot(cmd.ssName);
        logStep('chat_send', cmd.label, cmd.msg, resp.substring(0, 200),
          Date.now() - t0, true, ss);
        console.log(`  ${cmd.label} (${Math.round((Date.now() - t0) / 1000)}s)`);
      } catch (err) {
        logStep('chat_send', cmd.label, cmd.msg, err.message, Date.now() - t0, false, null, 'timeout');
      }
    }

    // ========== STEP 8: Verification ==========
    console.log('\n[Step 8] Verification...');
    t0 = Date.now();
    try {
      const bc = await sendChat('Run verification');
      const resp = await waitForResponse(DEFAULT_TIMEOUT, bc);
      const verifyLabel = await page.locator('#verify-label').textContent().catch(() => '');
      executionLog.summary.verification_score = verifyLabel || null;
      const ss = await screenshot('08-verification');
      logStep('chat_send', 'Verification', 'Run verification',
        `${resp.substring(0, 200)} | Verify: ${verifyLabel}`, Date.now() - t0, true, ss);
    } catch (err) {
      logStep('chat_send', 'Verification', 'Run verification', err.message,
        Date.now() - t0, false, null, 'timeout');
    }

    // ========== STEP 9: Deploy ==========
    console.log('\n[Step 9] Deploy...');
    t0 = Date.now();
    try {
      const bc = await sendChat('Deploy the site');
      const resp = await waitForResponse(BUILD_TIMEOUT, bc);
      const urlMatch = resp.match(/https?:\/\/[^\s"<>]+netlify[^\s"<>]*/);
      if (urlMatch) executionLog.summary.deploy_url = urlMatch[0];
      const liveUrl = await page.locator('#studio-live-url a').getAttribute('href').catch(() => '');
      if (liveUrl && !executionLog.summary.deploy_url) executionLog.summary.deploy_url = liveUrl;
      const ss = await screenshot('09-deploy');
      logStep('chat_send', 'Deploy', 'Deploy the site',
        `${resp.substring(0, 200)} | URL: ${executionLog.summary.deploy_url}`,
        Date.now() - t0, true, ss);
      console.log(`  Deploy URL: ${executionLog.summary.deploy_url || 'pending'}`);
    } catch (err) {
      logStep('chat_send', 'Deploy', 'Deploy', err.message, Date.now() - t0, false, null, 'timeout');
    }

    // ========== STEP 10: Final screenshots ==========
    console.log('\n[Step 10] Final screenshots...');
    t0 = Date.now();
    try {
      const pageTabs = await page.locator('#page-tabs button').allInnerTexts().catch(() => []);
      const finalPages = pageTabs.filter(t => t.trim().length > 0);
      for (const pg of finalPages.slice(0, 6)) {
        try {
          await page.locator('#page-tabs button', { hasText: pg.trim() }).click();
          await sleep(2000);
          await screenshot(`10-final-${pg.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
        } catch {}
      }

      const distDir = path.join(process.env.HOME, 'famtastic/sites/readings-by-maria/dist');
      const distFiles = fs.existsSync(distDir)
        ? fs.readdirSync(distDir).filter(f => f.endsWith('.html') && !f.startsWith('_'))
        : [];
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

      const ss = await screenshot('10-final-state');
      logStep('screenshot', 'Final documentation', 'All pages',
        `Pages: ${finalPages.join(', ')} | Slots: ${filledSlots}/${totalSlots}`,
        Date.now() - t0, true, ss);
      console.log(`  Final: ${finalPages.join(', ')} | Slots: ${filledSlots}/${totalSlots}`);
    } catch (err) {
      logStep('screenshot', 'Final docs', 'screenshots', err.message, Date.now() - t0, false, null);
    }

    // Research impact assessment
    executionLog.summary.research_impact = 'Research produced: specific hex palette (9 colors vs generic), ' +
      'research-informed stock queries (avoided cliche terms), domain-accurate chakra data for content edits, ' +
      'competitive-analysis-driven page structure and tone guide. Brief included explicit pricing, ' +
      'wellness language directive, and trust signal requirements \u2014 none of which existed in the generic ' +
      'Guy\'s Classy Shoes brief.';

  } catch (fatalErr) {
    console.error(`\nFATAL: ${fatalErr.message}`);
    try { await screenshot('fatal-error'); } catch {}
    logStep('fatal', 'Fatal error', '', fatalErr.message, 0, false, null, 'fatal');
  } finally {
    const logFile = saveLog();
    console.log('\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.log('\u2551  BUILD SUMMARY                               \u2551');
    console.log('\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563');
    console.log(`\u2551  Total steps:  ${executionLog.summary.total_steps}`);
    console.log(`\u2551  Passed:       ${executionLog.summary.passed}`);
    console.log(`\u2551  Failed:       ${executionLog.summary.failed}`);
    console.log(`\u2551  Timed out:    ${executionLog.summary.timed_out}`);
    console.log(`\u2551  Pages:        ${executionLog.summary.pages_built.join(', ') || 'unknown'}`);
    console.log(`\u2551  Slots:        ${executionLog.summary.image_slots_filled}/${executionLog.summary.image_slots_total}`);
    console.log(`\u2551  Deploy URL:   ${executionLog.summary.deploy_url || 'none'}`);
    console.log(`\u2551  Duration:     ${executionLog.total_duration_seconds}s`);
    console.log(`\u2551  Log:          ${logFile}`);
    console.log('\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d');
    if (browser) await browser.close();
  }
}

main().catch(err => {
  console.error('Unhandled:', err);
  saveLog();
  process.exit(1);
});
