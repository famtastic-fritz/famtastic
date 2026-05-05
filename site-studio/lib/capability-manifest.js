'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const MANIFEST_PATH = path.join(process.env.HOME, '.local', 'share', 'famtastic', 'capability-manifest.json');
const REGISTRY_PATH = path.join(__dirname, '..', 'config', 'studio-capabilities.json');
const SETTINGS_PATH = path.join(process.env.HOME || '~', '.config', 'famtastic', 'studio-config.json');

function readStudioSettings() {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return {};
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function getConfiguredSecret(envKeys, settingsKeys) {
  const envList = Array.isArray(envKeys) ? envKeys : [envKeys];
  for (const key of envList) {
    if (key && process.env[key]) return process.env[key];
  }
  const settings = readStudioSettings();
  const settingsList = Array.isArray(settingsKeys) ? settingsKeys : [settingsKeys];
  for (const key of settingsList) {
    if (key && settings && settings[key]) return settings[key];
  }
  return '';
}

function resolveApiStatus(brainKey, envKey, settingsKey) {
  try {
    const verifier = require('./brain-verifier');
    if (verifier && typeof verifier.getBrainStatus === 'function') {
      const statuses = verifier.getBrainStatus();
      const s = statuses && statuses[brainKey];
      if (s && s.status === 'connected') return 'available';
      if (s && s.status === 'failed') return 'broken';
    }
  } catch {}
  return getConfiguredSecret(envKey, settingsKey || envKey) ? 'available' : 'unavailable';
}

/**
 * checkNetlify() — structured Netlify capability probe.
 *
 * Returns { ok, reason?, details? } where reason is one of:
 *   'cli_missing'         — Netlify CLI executable not found
 *   'credentials_missing' — CLI present but no auth token / config users
 *   'config_unreadable'   — config exists but JSON.parse failed
 *   'other'               — unexpected error during probe
 *
 * Probe order short-circuits on first failure encountered.
 */
async function checkNetlify() {
  // Layer 1: CLI presence
  try {
    execFileSync('netlify', ['--version'], { stdio: 'ignore', timeout: 3000 });
  } catch (cliErr) {
    return {
      ok: false,
      reason: 'cli_missing',
      details: 'Netlify CLI not found on PATH. Install with: npm install -g netlify-cli',
    };
  }

  // Layer 2: Env-var credentials
  if (process.env.NETLIFY_AUTH_TOKEN || process.env.NETLIFY_SITE_ID) {
    return { ok: true };
  }

  // Layer 3: Config file readability
  const cfgPath = path.join(process.env.HOME || '', '.netlify', 'config.json');
  if (fs.existsSync(cfgPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (cfg && cfg.users && Object.keys(cfg.users).length > 0) {
        return { ok: true };
      }
      return {
        ok: false,
        reason: 'credentials_missing',
        details: 'Netlify config exists but contains no users. Run: netlify login',
      };
    } catch (parseErr) {
      return {
        ok: false,
        reason: 'config_unreadable',
        details: `Could not parse Netlify config (${parseErr.message}). Run: netlify login`,
      };
    }
  }

  return {
    ok: false,
    reason: 'credentials_missing',
    details: 'No Netlify credentials found (no env vars, no config file). Run: netlify login',
  };
}

function readRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return { version: '2.0', providers: [] };
  }
}

function buildBaseCapabilities(netlify) {
  const claudeStatus = resolveApiStatus('claude', 'ANTHROPIC_API_KEY', 'anthropic_api_key');
  const geminiStatus = resolveApiStatus('gemini', ['GEMINI_API_KEY', 'GOOGLE_API_KEY'], ['gemini_api_key', 'google_api_key']);
  const openaiStatus = resolveApiStatus('openai', 'OPENAI_API_KEY', 'openai_api_key');

  return {
    claude_api: claudeStatus,
    gemini_api: geminiStatus,
    openai_api: openaiStatus,
    netlify: (netlify && netlify.ok) ? 'available' : 'unavailable',
    imagen: geminiStatus,
    pinecone: getConfiguredSecret('PINECONE_API_KEY', 'pinecone_api_key') ? 'available' : 'unavailable',
    leonardo_api: getConfiguredSecret('LEONARDO_API_KEY', 'leonardo_api_key') ? 'available' : 'unavailable',
    openrouter_api: getConfiguredSecret('OPENROUTER_API_KEY', 'openrouter_api_key') ? 'available' : 'unavailable',
    firefly_api: (getConfiguredSecret('FIREFLY_CLIENT_ID', 'firefly_client_id') && getConfiguredSecret('FIREFLY_CLIENT_SECRET', 'firefly_client_secret')) ? 'available' : 'unavailable',
    firefly_web: 'partial',
    adobe_photoshop_mcp: 'partial',
    adobe_premiere_mcp: 'partial',
    surgical_editor: 'available',
    revenue_brief: 'available',
    gap_logger: 'available',
    suggestion_logger: 'available',
    brand_tracker: 'available',
    mission_control: 'partial',
    shay_shay: 'available',
  };
}

function statusRank(state) {
  return ({
    wired: 5,
    available: 4,
    verified_available: 3,
    partial: 2,
    experimental: 1,
    broken: 0,
    unavailable: -1,
  })[state] ?? 0;
}

function authToCapabilityState(authStatus, declaredStatus) {
  if (authStatus === 'broken') return 'broken';
  if (authStatus === 'unavailable' && declaredStatus !== 'partial') return 'unavailable';
  if (declaredStatus === 'wired') return authStatus === 'available' ? 'wired' : 'partial';
  if (declaredStatus === 'verified_available') return authStatus === 'available' ? 'verified_available' : 'unavailable';
  return declaredStatus;
}

function enrichProviders(registry, baseCapabilities) {
  return (registry.providers || []).map((provider) => {
    const authStatus = baseCapabilities[provider.auth_key] || 'partial';
    const capabilities = (provider.capabilities || []).map((capability) => {
      const state = authToCapabilityState(authStatus, capability.status || 'unavailable');
      return {
        ...capability,
        state,
      };
    });
    const overall = capabilities.reduce((best, capability) => {
      return statusRank(capability.state) > statusRank(best) ? capability.state : best;
    }, authStatus);

    return {
      ...provider,
      auth_status: authStatus,
      state: overall,
      capabilities,
    };
  });
}

function buildTaskMatrix(providers) {
  const taskMatrix = {};
  providers.forEach((provider) => {
    (provider.capabilities || []).forEach((capability) => {
      const task = capability.task || capability.id;
      if (!taskMatrix[task]) taskMatrix[task] = [];
      taskMatrix[task].push({
        provider_id: provider.id,
        provider_label: provider.label,
        state: capability.state,
        entrypoint: capability.entrypoint || null,
        surface: provider.surface,
        notes: capability.notes || '',
      });
    });
  });

  Object.keys(taskMatrix).forEach((task) => {
    taskMatrix[task].sort((a, b) => statusRank(b.state) - statusRank(a.state));
  });

  return taskMatrix;
}

function buildWorkflowSummary(taskMatrix) {
  return {
    brand_character_pipeline: {
      create: taskMatrix.text_to_image || [],
      consistency: taskMatrix.character_consistency || taskMatrix.image_to_image || [],
      motion: taskMatrix.image_to_video || taskMatrix.text_to_video || [],
    },
    recommended_defaults: {
      create: firstProviderLabel(taskMatrix.text_to_image),
      vector: firstProviderLabel(taskMatrix.vector_asset),
      motion: firstProviderLabel(taskMatrix.image_to_video || taskMatrix.text_to_video),
    }
  };
}

function firstProviderLabel(entries) {
  return Array.isArray(entries) && entries[0] ? entries[0].provider_label : null;
}

async function buildCapabilityManifest() {
  const netlify = await checkNetlify();
  const registry = readRegistry();
  const capabilities = buildBaseCapabilities(netlify);
  const providers = enrichProviders(registry, capabilities);
  const task_matrix = buildTaskMatrix(providers);

  const manifest = {
    version: '2.0',
    generated_at: new Date().toISOString(),
    registry_version: registry.version || '2.0',
    capabilities,
    providers,
    task_matrix,
    workflow_summary: buildWorkflowSummary(task_matrix),
  };

  try {
    fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  } catch {}
  return manifest;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null;
  try {
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function diffStateVsManifest(manifest) {
  if (!manifest) return { broken: [], unavailable: [], available: [] };
  const broken = Object.entries(manifest.capabilities || {})
    .filter(([, value]) => value === 'broken')
    .map(([key]) => key);
  const unavailable = Object.entries(manifest.capabilities || {})
    .filter(([, value]) => value === 'unavailable')
    .map(([key]) => key);
  const available = Object.entries(manifest.capabilities || {})
    .filter(([, value]) => value === 'available')
    .map(([key]) => key);
  return { broken, unavailable, available };
}

module.exports = {
  buildCapabilityManifest,
  loadManifest,
  diffStateVsManifest,
  readRegistry,
  checkNetlify,
};
