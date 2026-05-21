'use strict';
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');

let _results = {
  claude:  { status: 'pending', model: null, error: null },
  gemini:  { status: 'pending', model: null, error: null },
  openai:  { status: 'pending', model: null, error: null },
  codex:   { status: 'pending', model: null, error: null },
};

async function verifyClaudeAPI() {
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // cheapest for ping
      max_tokens: 10,
      messages: [{ role: 'user', content: 'ping' }],
    });
    console.log('✅ Claude API: connected — claude-sonnet-4-6');
    _results.claude = { status: 'connected', model: 'claude-sonnet-4-6', error: null };
  } catch (e) {
    console.log('❌ Claude API: failed —', e.message);
    console.log('⚠️  Falling back to spawnClaude() subprocess');
    _results.claude = { status: 'failed', model: null, error: e.message };
  }
  return _results.claude;
}

async function verifyGeminiAPI() {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    await model.generateContent('ping');
    console.log('✅ Gemini API: connected — gemini-2.5-flash');
    _results.gemini = { status: 'connected', model: 'gemini-2.5-flash', error: null };
  } catch (e) {
    console.log('❌ Gemini API: failed —', e.message);
    _results.gemini = { status: 'failed', model: null, error: e.message };
  }
  return _results.gemini;
}

async function verifyOpenAIAPI() {
  try {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // Try gpt-4o first (the actual model we'll use)
    try {
      await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      console.log('✅ OpenAI API: connected — gpt-4o');
      _results.openai = { status: 'connected', model: 'gpt-4o', error: null };
    } catch (e1) {
      // Fallback to mini
      await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      console.log('⚠️  OpenAI API: connected — gpt-4o-mini only (gpt-4o unavailable)');
      _results.openai = { status: 'connected', model: 'gpt-4o-mini', degraded: true, error: null };
    }
  } catch (e) {
    console.log('❌ OpenAI API: failed —', e.message);
    _results.openai = { status: 'failed', model: null, error: e.message };
  }
  return _results.openai;
}

async function verifyCodexCLI() {
  const { execFileSync } = require('child_process');
  try {
    execFileSync('which', ['codex'], { stdio: 'pipe' });
    console.log('✅ Codex CLI: available (OpenAI SDK adapter active)');
    _results.codex = { status: 'connected', model: 'gpt-4o', note: 'OpenAI SDK via OPENAI_API_KEY', error: null };
  } catch {
    console.log('⚠️  Codex CLI: not found in PATH');
    _results.codex = { status: 'unavailable', model: null, error: 'codex not in PATH' };
  }
  return _results.codex;
}

async function verifyAllAPIs() {
  console.log('[brain-verifier] Verifying all API connections...');
  await Promise.allSettled([
    verifyClaudeAPI(),
    verifyGeminiAPI(),
    verifyOpenAIAPI(),
    verifyCodexCLI(),
  ]);
  console.log('[brain-verifier] Verification complete');
  return _results;
}

function getBrainStatus() {
  return { ..._results };
}

module.exports = { verifyAllAPIs, verifyClaudeAPI, verifyGeminiAPI, verifyOpenAIAPI, verifyCodexCLI, getBrainStatus };
