'use strict';

// Session-level spend tracking — in memory only, resets on server restart.
let _sessTokensIn  = 0;
let _sessTokensOut = 0;
let _buildsThisSess = 0;
let _warnedAt80 = false;
let _warnedAt100 = false;
let _broadcastFn = null;  // injected by server.js at startup

// Sonnet 4.6 list prices (USD per million tokens)
const PRICE_IN_PER_M  = 3.00;
const PRICE_OUT_PER_M = 15.00;

function getSpendLimit() {
  return parseFloat(process.env.STUDIO_SPEND_LIMIT_USD || '5.00');
}

function calcCost(tokensIn, tokensOut) {
  return (tokensIn / 1_000_000) * PRICE_IN_PER_M + (tokensOut / 1_000_000) * PRICE_OUT_PER_M;
}

function setBroadcast(fn) { _broadcastFn = fn; }

function trackUsage(inputTokens, outputTokens, isBuild = false) {
  _sessTokensIn  += (inputTokens  || 0);
  _sessTokensOut += (outputTokens || 0);
  if (isBuild) _buildsThisSess++;

  const spent   = calcCost(_sessTokensIn, _sessTokensOut);
  const limit   = getSpendLimit();
  const percent = (spent / limit) * 100;

  if (percent >= 100 && !_warnedAt100) {
    _warnedAt100 = true;
    const msg = { type: 'cost-warning', spent: spent.toFixed(4), limit: limit.toFixed(2), percent: Math.round(percent),
      message: `Session spend $${spent.toFixed(3)} reached your $${limit.toFixed(2)} limit. Builds continue — your call.` };
    if (_broadcastFn) try { _broadcastFn(msg); } catch {}
    console.warn(`[cost-monitor] 💸 Spend limit reached: $${spent.toFixed(3)} / $${limit.toFixed(2)}`);
  } else if (percent >= 80 && !_warnedAt80) {
    _warnedAt80 = true;
    const msg = { type: 'cost-warning', spent: spent.toFixed(4), limit: limit.toFixed(2), percent: Math.round(percent),
      message: `Session spend at ${Math.round(percent)}% of $${limit.toFixed(2)} limit ($${spent.toFixed(3)} so far).` };
    if (_broadcastFn) try { _broadcastFn(msg); } catch {}
    console.warn(`[cost-monitor] ⚠️  80% threshold: $${spent.toFixed(3)} / $${limit.toFixed(2)}`);
  }
}

function getSessionStats() {
  const spent = calcCost(_sessTokensIn, _sessTokensOut);
  return {
    session_tokens_in:   _sessTokensIn,
    session_tokens_out:  _sessTokensOut,
    session_cost_usd:    parseFloat(spent.toFixed(6)),
    builds_this_session: _buildsThisSess,
    spend_limit_usd:     getSpendLimit(),
    percent_of_limit:    parseFloat(((spent / getSpendLimit()) * 100).toFixed(1)),
  };
}

// ── Credential helpers (read from env — dotenv must have loaded first) ────────

function _configVal(key) {
  try {
    const fs = require('fs'), path = require('path');
    const cfgPath = path.join(process.env.HOME || '~', '.config', 'famtastic', 'studio-config.json');
    if (fs.existsSync(cfgPath)) return JSON.parse(fs.readFileSync(cfgPath, 'utf8')).stock_photo?.[key] || null;
  } catch {}
  return null;
}

function getLeonardoKey() { return process.env.LEONARDO_API_KEY || null; }
function getOpenAIKey()   { return process.env.OPENAI_API_KEY   || null; }
function getUnsplashKey() { return _configVal('unsplash_api_key'); }
function getPexelsKey()   { return _configVal('pexels_api_key');   }

// ── Fallback chains ────────────────────────────────────────────────────────────

const AI_FALLBACK_CHAIN = [
  { provider: 'anthropic-sdk',    check: () => !!(process.env.ANTHROPIC_API_KEY?.trim()) },
  { provider: 'claude-subprocess', check: () => true },
];

const IMAGE_FALLBACK_CHAIN = [
  { provider: 'imagen-4',   check: () => !!(process.env.GEMINI_API_KEY?.trim()) },
  { provider: 'leonardo',   check: () => !!getLeonardoKey() },
  { provider: 'dalle-3',    check: () => !!getOpenAIKey() },
  { provider: 'unsplash',   check: () => !!getUnsplashKey() },
  { provider: 'pexels',     check: () => !!getPexelsKey() },
  { provider: 'empty-slot', check: () => true },
];

function getActiveProvider(chain) {
  return (chain.find(p => p.check()) || chain[chain.length - 1]).provider;
}

function getFallbackList(chain) {
  const active = getActiveProvider(chain);
  return chain
    .filter(p => p.check() && p.provider !== active && p.provider !== 'empty-slot')
    .map(p => p.provider);
}

// ── Startup status banner ──────────────────────────────────────────────────────

function logStartupStatus() {
  // Key whitespace validation
  ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY', 'PINECONE_API_KEY'].forEach(k => {
    const v = process.env[k] || '';
    if (v && v !== v.trim()) console.warn(`[FAM] WARNING: ${k} has whitespace — check .env`);
  });

  const aiProvider  = getActiveProvider(AI_FALLBACK_CHAIN);
  const imgPrimary  = getActiveProvider(IMAGE_FALLBACK_CHAIN);
  const imgFallback = getFallbackList(IMAGE_FALLBACK_CHAIN).join(' → ') || 'empty-slot';
  const pinecone    = !!(process.env.PINECONE_API_KEY?.trim());
  const perplexity  = !!(process.env.PERPLEXITY_API_KEY?.trim());
  const limit       = getSpendLimit();

  const imgPrimaryLabel = imgPrimary === 'imagen-4' ? 'Imagen 4.0 (Google)' : imgPrimary;
  const aiLabel = aiProvider === 'anthropic-sdk' ? 'ACTIVE (Anthropic)' : 'SUBPROCESS (subscription)';

  console.log('[FAM] ═══════════════════════════════════════════════');
  console.log('[FAM] FAMtastic Studio — Credential Status');
  console.log(`[FAM] SDK path:       ${aiLabel}`);
  console.log(`[FAM] Image primary:  ${imgPrimaryLabel}`);
  console.log(`[FAM] Image fallback: ${imgFallback}`);
  console.log(`[FAM] Research:       ${pinecone ? 'Pinecone READY' : 'Pinecone NO KEY — research degraded'} | ${perplexity ? 'Perplexity ACTIVE' : 'Perplexity DISABLED'}`);
  console.log(`[FAM] Spend limit:    $${limit.toFixed(2)} / session`);
  console.log('[FAM] ═══════════════════════════════════════════════');
}

module.exports = {
  trackUsage,
  getSessionStats,
  setBroadcast,
  logStartupStatus,
  AI_FALLBACK_CHAIN,
  IMAGE_FALLBACK_CHAIN,
  getActiveProvider,
  getFallbackList,
};
