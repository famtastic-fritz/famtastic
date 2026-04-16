'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MANIFEST_PATH = path.join(process.env.HOME, '.local', 'share', 'famtastic', 'capability-manifest.json');

async function checkAnthropicKey() {
  return !!(process.env.ANTHROPIC_API_KEY);
}

async function checkGeminiKey() {
  return !!(process.env.GEMINI_API_KEY);
}

async function checkNetlify() {
  try {
    execFileSync('netlify', ['--version'], { stdio: 'ignore', timeout: 3000 });
    return !!(process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_SITE_ID);
  } catch { return false; }
}

async function buildCapabilityManifest() {
  const [anthropicKey, geminiKey, netlify] = await Promise.all([
    checkAnthropicKey(),
    checkGeminiKey(),
    checkNetlify(),
  ]);

  const manifest = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    capabilities: {
      claude_api: anthropicKey ? 'available' : 'unavailable',
      gemini_api: geminiKey ? 'available' : 'unavailable',
      openai_api: process.env.OPENAI_API_KEY ? 'available' : 'unavailable',
      netlify: netlify ? 'available' : 'unavailable',
      imagen: geminiKey ? 'available' : 'unavailable',
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
