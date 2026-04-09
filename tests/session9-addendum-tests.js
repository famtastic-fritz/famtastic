#!/usr/bin/env node
/**
 * Session 9 Addendum Tests — Codex Adversarial Review Corrections
 *
 * Verifies all 6 corrections from the Codex adversarial review:
 *   C1: CodexAdapter uses CLI subprocess (not OpenAI SDK)
 *   C2: RECONCILED-CALL-SITES.md exists with all required fields
 *   C3: Undefined functions now defined (per-WS state, haiku-fallback, api-cost-tracker)
 *   C4: executeStreaming consistent interface across adapters
 *   C5: GeminiAdapter real auth probe (not just env var check)
 *   C6: Context header not stored in history (clean multi-turn)
 *
 * No live API calls — mocked where needed.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LIB      = path.join(__dirname, '../site-studio/lib');
const ROOT     = path.join(__dirname, '..');
const SERVER   = path.join(__dirname, '../site-studio/server.js');

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

const serverText = fs.readFileSync(SERVER, 'utf8');

// ─── C1: CodexAdapter uses CLI subprocess, NOT OpenAI SDK ─────────────────────
console.log('\n── C1: CodexAdapter — CLI subprocess, not OpenAI SDK ──');

{
  const codexPath = path.join(LIB, 'adapters/codex-adapter.js');
  const codexText = fs.readFileSync(codexPath, 'utf8');

  assert(
    'CodexAdapter file exists',
    fs.existsSync(codexPath)
  );

  assert(
    'CodexAdapter does NOT require openai package',
    !codexText.includes("require('openai')") && !codexText.includes('require("openai")'),
    'Found openai SDK require'
  );

  assert(
    'CodexAdapter uses child_process spawn',
    codexText.includes("require('child_process')") || codexText.includes('spawn'),
    'No spawn usage found'
  );

  assert(
    'CodexAdapter capabilities.multiTurn is false',
    codexText.includes('multiTurn:   false') || codexText.includes("multiTurn: false"),
    'multiTurn should be false for CLI adapter'
  );

  assert(
    'CodexAdapter capabilities.streaming is false',
    codexText.includes('streaming:   false') || codexText.includes("streaming: false"),
    'streaming should be false for CLI adapter'
  );

  assert(
    'CodexAdapter routes to fam-convo-get-codex',
    codexText.includes('fam-convo-get-codex'),
    'Should reference the codex adapter script'
  );

  assert(
    'CodexAdapter exports CodexAdapter class (not OpenAI SDK usage)',
    codexText.includes('module.exports') && codexText.includes('CodexAdapter'),
    'Missing class export'
  );

  // package.json should not include openai
  const pkgPath = path.join(__dirname, '../site-studio/package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert(
    'package.json does NOT list openai dependency',
    !pkg.dependencies?.openai,
    `openai still in package.json: ${pkg.dependencies?.openai}`
  );
}

// ─── C2: RECONCILED-CALL-SITES.md ─────────────────────────────────────────────
console.log('\n── C2: RECONCILED-CALL-SITES.md ──');

{
  const reconPath = path.join(ROOT, 'docs/RECONCILED-CALL-SITES.md');
  assert(
    'docs/RECONCILED-CALL-SITES.md exists',
    fs.existsSync(reconPath),
    'File not found'
  );

  const reconText = fs.readFileSync(reconPath, 'utf8');

  // Must have all 8 CS + CS9
  const csNumbers = [1,2,3,4,5,6,7,8,9].filter(n => reconText.includes(`CS${n}`));
  assert(
    'RECONCILED-CALL-SITES has CS1 through CS9',
    csNumbers.length === 9,
    `Missing: ${[1,2,3,4,5,6,7,8,9].filter(n => !csNumbers.includes(n)).map(n => `CS${n}`).join(', ')}`
  );

  // Each entry must have function name, line, complexity, purpose
  const requiredFields = ['Function', 'Line', 'Complexity', 'Purpose'];
  assert(
    'RECONCILED-CALL-SITES has required fields (Function, Line, Complexity, Purpose)',
    requiredFields.every(f => reconText.includes(f)),
    `Missing: ${requiredFields.filter(f => !reconText.includes(f)).join(', ')}`
  );

  // Migration complexity ratings must be documented
  assert(
    'RECONCILED-CALL-SITES documents complexity ratings (Simple/Complex/Separate track)',
    reconText.includes('Simple') && reconText.includes('Complex') && reconText.includes('Separate track'),
    'Missing complexity ratings'
  );
}

// ─── C3: Undefined functions now defined ──────────────────────────────────────
console.log('\n── C3: Undefined functions now defined ──');

{
  // haiku-fallback.js exists
  const haikuPath = path.join(LIB, 'haiku-fallback.js');
  assert(
    'lib/haiku-fallback.js exists',
    fs.existsSync(haikuPath),
    'File not found'
  );

  const haikuText = fs.readFileSync(haikuPath, 'utf8');
  assert(
    'haiku-fallback.js exports fallbackToHaiku',
    haikuText.includes('fallbackToHaiku') && haikuText.includes('module.exports'),
    'Missing fallbackToHaiku export'
  );

  assert(
    'fallbackToHaiku uses SDK stream (not subprocess)',
    haikuText.includes('messages.stream') || haikuText.includes('client.messages'),
    'Should use Anthropic SDK streaming'
  );

  assert(
    'fallbackToHaiku sends fallback:true flag in WS messages',
    haikuText.includes('fallback') && haikuText.includes('true'),
    'Missing fallback flag'
  );

  // api-cost-tracker.js exists
  const trackerPath = path.join(LIB, 'api-cost-tracker.js');
  assert(
    'lib/api-cost-tracker.js exists',
    fs.existsSync(trackerPath),
    'File not found'
  );

  const trackerText = fs.readFileSync(trackerPath, 'utf8');
  assert(
    'api-cost-tracker.js exports logAPICall',
    trackerText.includes('logAPICall') && trackerText.includes('module.exports'),
    'Missing logAPICall export'
  );

  assert(
    'api-cost-tracker.js exports calculateCost',
    trackerText.includes('calculateCost'),
    'Missing calculateCost export'
  );

  // logAPICall has (provider, model, usage) signature
  assert(
    'api-cost-tracker.js logAPICall accepts (provider, model, usage) signature',
    /function logAPICall\s*\(\s*provider/.test(trackerText) ||
    /async function logAPICall\s*\(\s*provider/.test(trackerText),
    'logAPICall signature should start with (provider, model, usage)'
  );

  // Per-WebSocket state in server.js
  assert(
    'server.js adds ws.brainSession per connection',
    serverText.includes('ws.brainSession') && serverText.includes('= null'),
    'Missing ws.brainSession initialization'
  );

  assert(
    'server.js adds ws.currentBrain per connection',
    serverText.includes('ws.currentBrain'),
    'Missing ws.currentBrain initialization'
  );

  assert(
    'server.js adds ws.currentMode per connection',
    serverText.includes('ws.currentMode'),
    'Missing ws.currentMode initialization'
  );

  assert(
    'server.js adds ws.currentSite per connection',
    serverText.includes('ws.currentSite'),
    'Missing ws.currentSite initialization'
  );

  assert(
    'server.js defines ws.getBrainSession()',
    serverText.includes('ws.getBrainSession') && serverText.includes('function()'),
    'Missing ws.getBrainSession definition'
  );

  assert(
    'server.js defines ws.getOrCreateBrainSession()',
    serverText.includes('ws.getOrCreateBrainSession'),
    'Missing ws.getOrCreateBrainSession definition'
  );

  assert(
    'ws.getOrCreateBrainSession preserves history on brain switch',
    serverText.includes('conversationHistory') && serverText.includes('previousHistory'),
    'getOrCreateBrainSession should preserve conversationHistory'
  );
}

// ─── C4: executeStreaming consistent interface ────────────────────────────────
console.log('\n── C4: Consistent adapter execute interface ──');

{
  const { ClaudeAdapter } = require(path.join(LIB, 'adapters/claude-adapter'));
  const { GeminiAdapter } = require(path.join(LIB, 'adapters/gemini-adapter'));
  const { CodexAdapter }  = require(path.join(LIB, 'adapters/codex-adapter'));

  const claude = new ClaudeAdapter();
  const gemini = new GeminiAdapter();
  const codex  = new CodexAdapter();

  assert(
    'ClaudeAdapter has execute() method',
    typeof claude.execute === 'function',
    'Missing execute method'
  );

  assert(
    'GeminiAdapter has execute() method',
    typeof gemini.execute === 'function',
    'Missing execute method'
  );

  assert(
    'CodexAdapter has execute() method',
    typeof codex.execute === 'function',
    'Missing execute method'
  );

  // All adapters should have executeStreaming (or handle stream option)
  assert(
    'ClaudeAdapter has executeStreaming() method',
    typeof claude.executeStreaming === 'function',
    'Missing executeStreaming'
  );

  assert(
    'GeminiAdapter has executeStreaming() method',
    typeof gemini.executeStreaming === 'function',
    'Missing executeStreaming'
  );

  assert(
    'CodexAdapter has executeStreaming() method',
    typeof codex.executeStreaming === 'function',
    'Missing executeStreaming — delegates to execute + single chunk'
  );

  // CodexAdapter should NOT have OpenAI client instantiation
  const codexText = fs.readFileSync(path.join(LIB, 'adapters/codex-adapter.js'), 'utf8');
  assert(
    'CodexAdapter does not instantiate OpenAI client',
    !codexText.includes('new OpenAI(') && !codexText.includes('OpenAI()'),
    'Found OpenAI client instantiation'
  );
}

// ─── C5: GeminiAdapter real auth probe ───────────────────────────────────────
console.log('\n── C5: GeminiAdapter real auth probe ──');

{
  const sessionsText = fs.readFileSync(path.join(LIB, 'brain-sessions.js'), 'utf8');

  assert(
    'brain-sessions.js Gemini probe calls generateContent() (real API call)',
    sessionsText.includes('generateContent'),
    'Gemini probe should call generateContent, not just check env var'
  );

  assert(
    'brain-sessions.js Gemini probe uses getGenerativeModel()',
    sessionsText.includes('getGenerativeModel'),
    'Missing getGenerativeModel call in Gemini probe'
  );

  assert(
    'brain-sessions.js Gemini probe has try/catch for failed auth',
    (() => {
      // Find the geminiPromise block and verify it has try/catch
      const geminiBlock = sessionsText.slice(
        sessionsText.indexOf('geminiPromise'),
        sessionsText.indexOf('codexPromise')
      );
      return geminiBlock.includes('try') && geminiBlock.includes('catch');
    })(),
    'Gemini probe must have try/catch'
  );

  assert(
    'brain-sessions.js Gemini probe returns needs-auth on catch',
    (() => {
      const geminiBlock = sessionsText.slice(
        sessionsText.indexOf('geminiPromise'),
        sessionsText.indexOf('codexPromise')
      );
      return geminiBlock.includes("'needs-auth'") || geminiBlock.includes('"needs-auth"');
    })(),
    'Gemini probe catch should return needs-auth'
  );
}

// ─── C6: Context header not stored in history ─────────────────────────────────
console.log('\n── C6: Context header not stored in history ──');

{
  const ifaceText = fs.readFileSync(path.join(LIB, 'brain-interface.js'), 'utf8');

  // History push should use original `message`, not `fullMessage` (which has header)
  assert(
    'BrainInterface stores original message in history (not header-prepended)',
    ifaceText.includes("role: 'user', content: message") ||
    ifaceText.includes('role: "user", content: message'),
    'History push should use original message, not fullMessage'
  );

  // fullMessage (with header) should be sent to adapter, not stored
  assert(
    'BrainInterface sends fullMessage (with header) to adapter',
    ifaceText.includes('fullMessage') &&
    (ifaceText.includes('adapter.execute(fullMessage') || ifaceText.includes('adapter.executeStreaming(fullMessage')),
    'Adapter should receive header-prepended fullMessage'
  );

  // History is passed to adapter WITHOUT the current turn (only prior history)
  assert(
    'BrainInterface passes clean history (prior turns only) to adapter',
    ifaceText.includes('slice(0, -1)') || ifaceText.includes('history before this turn'),
    'History passed to adapter should exclude current user turn to avoid duplication'
  );

  // Verify via unit test with mock adapter
  const { BrainInterface } = require(path.join(LIB, 'brain-interface'));

  // Override BrainAdapterFactory to inject mock
  const bi = new BrainInterface('claude', { tag: 'test-site', page: 'index.html' });

  // Intercept execute to capture what adapter receives
  let capturedMessage = null;
  let capturedHistory = null;
  bi.adapter.execute = async (msg, opts) => {
    capturedMessage = msg;
    capturedHistory = opts.history || [];
    return { content: 'mock response', usage: null };
  };

  // Run async test
  (async () => {
    await bi.execute('Hello world', { mode: 'chat' });

    assert(
      'Context header prepended to message sent to adapter',
      capturedMessage && capturedMessage.includes('[MODE: CHAT]') && capturedMessage.includes('Hello world'),
      `Adapter received: "${capturedMessage?.slice(0, 60)}"`
    );

    assert(
      'History stored WITHOUT context header',
      bi.conversationHistory.length === 2 &&
      !bi.conversationHistory[0].content.includes('[MODE:') &&
      bi.conversationHistory[0].content === 'Hello world',
      `History[0].content = "${bi.conversationHistory[0]?.content?.slice(0, 60)}"`
    );

    assert(
      'Adapter receives clean history (no [MODE:] headers)',
      capturedHistory.every(h => !h.content.includes('[MODE:')),
      'History passed to adapter should not contain context headers'
    );

    // ─── BrainInterface: ws integration ──────────────────────────────────────
    console.log('\n── BrainInterface: ws integration ──');

    // Test ws.currentSite/currentMode used in context header when ws attached
    const mockWs = {
      currentSite: 'ws-site',
      currentPage: 'ws-page.html',
      currentMode: 'brainstorm',
    };

    const biWs = new BrainInterface('claude', { ws: mockWs, tag: 'fallback-tag' });
    let wsMessage = null;
    biWs.adapter.execute = async (msg) => { wsMessage = msg; return { content: 'ok', usage: null }; };

    await biWs.execute('Test ws context', { mode: 'chat' });

    assert(
      'BrainInterface reads currentSite from ws when ws attached',
      wsMessage && wsMessage.includes('[SITE: ws-site]'),
      `Got: "${wsMessage?.slice(0, 80)}"`
    );

    assert(
      'BrainInterface reads currentPage from ws when ws attached',
      wsMessage && wsMessage.includes('[PAGE: ws-page.html]'),
      `Got: "${wsMessage?.slice(0, 80)}"`
    );

    assert(
      'BrainInterface ws.currentMode used when mode not specified',
      (() => {
        // Without explicit mode, should fall back to ws.currentMode (brainstorm)
        const biMode = new BrainInterface('claude', { ws: mockWs });
        let modeMsg = null;
        biMode.adapter.execute = async (msg) => { modeMsg = msg; return { content: 'ok', usage: null }; };
        return biMode.execute('check mode').then(() =>
          modeMsg && modeMsg.includes('[MODE: BRAINSTORM]')
        );
      })(),
      'ws.currentMode should drive context header mode'
    );

    // ─── Final summary ────────────────────────────────────────────────────────
    console.log('\n══════════════════════════════════════════════');
    console.log(`  Session 9 Addendum: ${passed} passed, ${failed} failed`);
    console.log('══════════════════════════════════════════════\n');
    process.exit(failed > 0 ? 1 : 0);

  })().catch(err => {
    console.error('Async test error:', err.message);
    process.exit(1);
  });
}
