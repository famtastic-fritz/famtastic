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
const VALID_APPROVALS = ['auto', 'pending', 'approved', 'deferred'];
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
  return { valid: errors.length === 0, errors };
}

function countByApproval(registry) {
  const out = { auto: 0, pending: 0, approved: 0, deferred: 0 };
  if (!registry || !Array.isArray(registry.assets)) return out;
  for (const asset of registry.assets) {
    if (asset && asset.approval && Object.prototype.hasOwnProperty.call(out, asset.approval)) {
      out[asset.approval] += 1;
    }
  }
  return out;
}

module.exports = {
  readRegistry,
  validateAsset,
  countByApproval,
  emptyRegistry,
  VALID_SOURCES,
  VALID_APPROVALS,
  REQUIRED_FIELDS,
};
