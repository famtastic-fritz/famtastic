'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MANIFEST_PATH = path.join(process.env.HOME, '.local', 'share', 'famtastic', 'capability-manifest.json');

// Resolve live API health from brain-verifier when it has probed already.
// Env-var presence alone is misleading — a leaked/revoked key still has the
// env var set but every call fails. Prefer real probe results.
function resolveApiStatus(brainKey, envKey) {
  try {
    const verifier = require('./brain-verifier');
    if (verifier && typeof verifier.getBrainStatus === 'function') {
      const statuses = verifier.getBrainStatus();
      const s = statuses && statuses[brainKey];
      if (s && s.status === 'connected') return 'available';
      if (s && s.status === 'failed') return 'broken';
      // status === 'pending' — verifier hasn't run yet; fall through to env check
    }
  } catch { /* brain-verifier not loaded — fall through */ }
  return process.env[envKey] ? 'available' : 'unavailable';
}

async function checkNetlify() {
  try {
    execFileSync('netlify', ['--version'], { stdio: 'ignore', timeout: 3000 });
    return !!(process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_SITE_ID);
  } catch { return false; }
}

async function buildCapabilityManifest() {
  const netlify = await checkNetlify();

  const claudeStatus = resolveApiStatus('claude', 'ANTHROPIC_API_KEY');
  const geminiStatus = resolveApiStatus('gemini', 'GEMINI_API_KEY');
  const openaiStatus = resolveApiStatus('openai', 'OPENAI_API_KEY');

  const manifest = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    capabilities: {
      claude_api: claudeStatus,
      gemini_api: geminiStatus,
      openai_api: openaiStatus,
      netlify: netlify ? 'available' : 'unavailable',
      // Imagen piggybacks on the Gemini API — inherit its health so a leaked
      // Gemini key doesn't falsely advertise imagen as working.
      imagen: geminiStatus,
      pinecone: process.env.PINECONE_API_KEY ? 'available' : 'unavailable',
      surgical_editor: 'available',
      revenue_brief: 'available',
      gap_logger: 'available',
      suggestion_logger: 'available',
      brand_tracker: 'available',
      mission_control: 'partial',
      shay_shay: 'available',
    },
  };

  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  return manifest;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); } catch { return null; }
}

function diffStateVsManifest(manifest) {
  if (!manifest) return { broken: [], unavailable: [], available: [] };
  const broken = Object.entries(manifest.capabilities)
    .filter(([, v]) => v === 'broken').map(([k]) => k);
  const unavailable = Object.entries(manifest.capabilities)
    .filter(([, v]) => v === 'unavailable').map(([k]) => k);
  const available = Object.entries(manifest.capabilities)
    .filter(([, v]) => v === 'available').map(([k]) => k);
  return { broken, unavailable, available };
}

module.exports = { buildCapabilityManifest, loadManifest, diffStateVsManifest };
