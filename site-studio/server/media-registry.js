'use strict';

// Media Registry — Lane D (V1, read-only contract)
//
// Asset contract:
//   {
//     id: string,
//     slot: string,
//     source: 'upload' | 'import' | 'generated' | 'pipeline',
//     provider: string,
//     prompt: string,
//     cost_usd: number (>= 0),
//     variants: array,
//     approval: 'auto' | 'pending' | 'approved' | 'deferred',
//     placement_pages: array,
//     created_at: string
//   }
//
// V1 is read-only: no writes. The registry file is loaded if present;
// otherwise an honest empty skeleton is returned.

const fs = require('fs');
const path = require('path');

const VALID_SOURCES = ['upload', 'import', 'generated', 'pipeline'];
// V1 approval values + Phase 1 extended status model (draft, rejected, used).
const VALID_APPROVALS = ['auto', 'pending', 'approved', 'deferred', 'draft', 'rejected', 'used'];
const REQUIRED_FIELDS = [
  'id',
  'slot',
  'source',
  'provider',
  'prompt',
  'cost_usd',
  'variants',
  'approval',
  'placement_pages',
  'created_at',
];

function emptyRegistry() {
  return { version: 1, assets: [] };
}

function readRegistry(siteDir) {
  if (!siteDir || typeof siteDir !== 'string') return null;
  const file = path.join(siteDir, 'media', 'registry.json');
  if (!fs.existsSync(file)) {
    return emptyRegistry();
  }
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return emptyRegistry();
    if (!Array.isArray(parsed.assets)) parsed.assets = [];
    if (typeof parsed.version !== 'number') parsed.version = 1;
    return parsed;
  } catch (_err) {
    return null;
  }
}

function validateAsset(asset) {
  const errors = [];
  if (!asset || typeof asset !== 'object') {
    return { valid: false, errors: ['asset must be an object'] };
  }
  for (const field of REQUIRED_FIELDS) {
    if (!(field in asset)) {
      errors.push(`missing required field: ${field}`);
    }
  }
  if ('id' in asset && (typeof asset.id !== 'string' || !asset.id.trim())) {
    errors.push('id must be a non-empty string');
  }
  if ('slot' in asset && (typeof asset.slot !== 'string' || !asset.slot.trim())) {
    errors.push('slot must be a non-empty string');
  }
  if ('source' in asset && !VALID_SOURCES.includes(asset.source)) {
    errors.push(`source must be one of: ${VALID_SOURCES.join(', ')}`);
  }
  if ('approval' in asset && !VALID_APPROVALS.includes(asset.approval)) {
    errors.push(`approval must be one of: ${VALID_APPROVALS.join(', ')}`);
  }
  if ('cost_usd' in asset) {
    if (typeof asset.cost_usd !== 'number' || Number.isNaN(asset.cost_usd) || asset.cost_usd < 0) {
      errors.push('cost_usd must be a number >= 0');
    }
  }
  if ('variants' in asset && !Array.isArray(asset.variants)) {
    errors.push('variants must be an array');
  }
  if ('placement_pages' in asset && !Array.isArray(asset.placement_pages)) {
    errors.push('placement_pages must be an array');
  }
  if ('created_at' in asset && typeof asset.created_at !== 'string') {
    errors.push('created_at must be a string');
  }
  if ('provider' in asset && typeof asset.provider !== 'string') {
    errors.push('provider must be a string');
  }
  if ('prompt' in asset && typeof asset.prompt !== 'string') {
    errors.push('prompt must be a string');
  }
  if ('used_by' in asset && !Array.isArray(asset.used_by)) {
    errors.push('used_by must be an array');
  }
  return { valid: errors.length === 0, errors };
}

function countByApproval(registry) {
  const out = { auto: 0, pending: 0, approved: 0, deferred: 0, draft: 0, rejected: 0, used: 0 };
  if (!registry || !Array.isArray(registry.assets)) return out;
  for (const asset of registry.assets) {
    if (asset && asset.approval && Object.prototype.hasOwnProperty.call(out, asset.approval)) {
      out[asset.approval] += 1;
    }
  }
  return out;
}

/**
 * appendAsset(siteDir, asset) — atomic write, dup-id rejection.
 *
 * Returns:
 *   { ok: true,  registry, summary }
 *   { ok: false, errors: string[] }
 */
function appendAsset(siteDir, asset) {
  // 1. Validate shape first.
  const validation = validateAsset(asset);
  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  // 2. Read current registry (or start fresh).
  const mediaDir = path.join(siteDir, 'media');
  const file = path.join(mediaDir, 'registry.json');
  let registry = readRegistry(siteDir);
  if (!registry) {
    // readRegistry only returns null on a JSON parse error of an existing file.
    registry = emptyRegistry();
  }

  // 3. Reject duplicate id.
  if (registry.assets.some((a) => a && a.id === asset.id)) {
    return { ok: false, errors: ['id already exists'] };
  }

  // 4. Append.
  registry.assets.push(asset);

  // 5. Atomic write: tmp → rename.
  try {
    fs.mkdirSync(mediaDir, { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(registry, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  } catch (err) {
    return { ok: false, errors: [`write failed: ${err.message}`] };
  }

  return { ok: true, registry, summary: countByApproval(registry) };
}

function updateAsset(siteDir, assetId, mutate) {
  const mediaDir = path.join(siteDir, 'media');
  const file = path.join(mediaDir, 'registry.json');
  let registry = readRegistry(siteDir);
  if (!registry) registry = emptyRegistry();
  const idx = registry.assets.findIndex((asset) => asset && (asset.id === assetId || asset.asset_id === assetId));
  if (idx === -1) return { ok: false, errors: ['asset not found'] };
  const next = mutate({ ...registry.assets[idx] });
  const validation = validateAsset(next);
  if (!validation.valid) return { ok: false, errors: validation.errors };
  registry.assets[idx] = next;
  try {
    fs.mkdirSync(mediaDir, { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(registry, null, 2), 'utf8');
    fs.renameSync(tmp, file);
  } catch (err) {
    return { ok: false, errors: [`write failed: ${err.message}`] };
  }
  return { ok: true, asset: next, registry, summary: countByApproval(registry) };
}

module.exports = {
  readRegistry,
  validateAsset,
  countByApproval,
  emptyRegistry,
  appendAsset,
  updateAsset,
  VALID_SOURCES,
  VALID_APPROVALS,
  REQUIRED_FIELDS,
};
