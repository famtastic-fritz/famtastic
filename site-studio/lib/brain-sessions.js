'use strict';
/**
 * brain-sessions.js — Brain authentication and session management.
 *
 * initBrainSessions() attempts to authenticate all three brains at Studio startup.
 * Returns { claude, gemini, codex } each with status 'authenticated' | 'needs-auth'.
 *
 * Results broadcast to Studio UI via studio events so the brain selector can
 * show Connect buttons for unauthenticated brains.
 *
 * Usage:
 *   const { initBrainSessions } = require('./brain-sessions');
 *   const results = await initBrainSessions(studioEvents, STUDIO_EVENTS);
 */

const Anthropic   = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Note: Codex probe uses only process.env.OPENAI_API_KEY — no OpenAI SDK needed.

// Per-session BrainInterface instances — one per active brain.
// Used by getBrainSession() / getOrCreateBrainSession() in server.js.
const _sessions = {};

/**
 * Initialize brain sessions at startup.
 * Tests each brain's authentication with a minimal probe call.
 * Never throws — always returns a result object.
 *
 * @param {EventEmitter} studioEvents — studio-events singleton
 * @param {object}       STUDIO_EVENTS — event name constants
 * @param {object}       opts
 *   timeout — ms per auth probe (default 8000)
 * @returns {Promise<{ claude, gemini, codex }>}
 *   Each value: 'authenticated' | 'needs-auth'
 */
async function initBrainSessions(studioEvents = null, STUDIO_EVENTS = {}, opts = {}) {
  const { timeout = 8000 } = opts;
  const results = { claude: 'needs-auth', gemini: 'needs-auth', codex: 'needs-auth' };

  // Claude — check ANTHROPIC_API_KEY or test a cheap API call
  const claudePromise = (async () => {
    try {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return 'needs-auth';
      // Attempt minimal test call to verify key is valid
      const client = new Anthropic({ apiKey: key });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      await client.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages:   [{ role: 'user', content: 'ping' }],
      }, { signal: controller.signal });
      clearTimeout(timer);
      return 'authenticated';
    } catch {
      // AbortError = timeout; AuthenticationError = bad key; both = needs-auth
      return 'needs-auth';
    }
  })();

  // Gemini — make a real test call to validate key (not just presence check)
  const geminiPromise = (async () => {
    try {
      const key = process.env.GEMINI_API_KEY;
      if (!key) return 'needs-auth';
      // Make a minimal probe call — validates the key actually works
      const genAI = new GoogleGenerativeAI(key);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      await model.generateContent('ping');
      clearTimeout(timer);
      return 'authenticated';
    } catch {
      // AuthError = bad key; timeout = slow network; both = needs-auth
      return 'needs-auth';
    }
  })();

  // Codex / OpenAI — check OPENAI_API_KEY
  const codexPromise = (async () => {
    try {
      const key = process.env.OPENAI_API_KEY;
      if (!key) return 'needs-auth';
      return 'authenticated';
    } catch {
      return 'needs-auth';
    }
  })();

  // Run all in parallel, collect results
  const [claudeStatus, geminiStatus, codexStatus] = await Promise.all([
    claudePromise,
    geminiPromise,
    codexPromise,
  ]);

  results.claude = claudeStatus;
  results.gemini = geminiStatus;
  results.codex  = codexStatus;

  console.log(`[brain-sessions] Auth check — claude:${claudeStatus} gemini:${geminiStatus} codex:${codexStatus}`);

  // Broadcast to Studio UI via studio events
  if (studioEvents && STUDIO_EVENTS.SESSION_STARTED) {
    studioEvents.emit(STUDIO_EVENTS.SESSION_STARTED, { brainStatus: results });
  }

  return results;
}

/**
 * Get or create a persistent BrainInterface session for the current Studio session.
 * Sessions are keyed by sessionKey (may be composite like "claude:conv-uuid" or plain brain name).
 * The actual brain adapter used is opts.brain || the sessionKey's brain prefix.
 * Call resetSessions() on site switch to clear history.
 *
 * @param {string} sessionKey — composite key: "brain:conversation_id" or plain brain name
 * @param {object} opts — { brain, tag, hubRoot, page }
 * @returns {BrainInterface}
 */
function getOrCreateBrainSession(sessionKey = 'claude', opts = {}) {
  // Support composite keys: use opts.brain as the actual brain adapter name
  const actualBrain = opts.brain || sessionKey.split(':')[0] || 'claude';
  if (!_sessions[sessionKey]) {
    const { BrainInterface } = require('./brain-interface');
    _sessions[sessionKey] = new BrainInterface(actualBrain, opts);
    console.log(`[brain-sessions] Created new session: key=${sessionKey} brain=${actualBrain}`);
  } else {
    // Update context in existing session
    if (opts.tag)     _sessions[sessionKey].tag     = opts.tag;
    if (opts.hubRoot) _sessions[sessionKey].hubRoot = opts.hubRoot;
    if (opts.page)    _sessions[sessionKey].page    = opts.page;
  }
  return _sessions[sessionKey];
}

/**
 * Reset all brain sessions (clears conversation history).
 * Call on site switch.
 */
function resetSessions() {
  for (const brain of Object.keys(_sessions)) {
    _sessions[brain].resetHistory();
  }
  console.log('[brain-sessions] All session histories reset');
}

/**
 * Get current brain session if it exists.
 * @param {string} sessionKey — composite key or plain brain name
 * Returns null if no session has been started for this key.
 */
function getBrainSession(sessionKey = 'claude') {
  return _sessions[sessionKey] || null;
}

module.exports = { initBrainSessions, getOrCreateBrainSession, getBrainSession, resetSessions };
