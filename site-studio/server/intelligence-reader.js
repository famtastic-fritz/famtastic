// site-studio/server/intelligence-reader.js
//
// Slice 3 implementation. Read-only access to per-site intelligence
// artifacts. Filesystem layout (per Slice 3 plan §2):
//
//   sites/<tag>/intelligence/
//     intelligence-brief.json
//     capability-truth.json
//     recipes/<recipeId>.json
//     runs/<runId>/ledger.json
//     runs/<runId>/proof-packet.json
//     runs/<runId>/learning-candidates.json
//
// Public API: readBrief, readCapabilityTruth, listRecipes, readRecipe,
// listRuns, readRunLedger, readProofPacket, readLearningCandidates.
//
// Validation is structural (presence of required keys). On shape mismatch
// we return null and log a single console warning — never throw to the
// route handler. JSON parse errors return null (not thrown).

'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED_KEYS = {
  brief: ['site_tag', 'title', 'vertical'],
  capability: ['site_tag', 'capabilities'],
  recipe: ['recipe_id'],
  ledger: ['run_id', 'status'],
  proof: ['run_id'],
  learning: ['candidates'],
};

function intelligenceDir(siteDir) {
  return path.join(siteDir, 'intelligence');
}

function readJson(filePath, requiredKeys, kind) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (requiredKeys && !requiredKeys.every(k => k in parsed)) {
      console.warn('[intelligence-reader] validation_failed', {
        kind,
        path: filePath,
        missing: requiredKeys.filter(k => !(k in parsed)),
      });
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('[intelligence-reader] read_failed', { path: filePath, error: err.message });
    return null;
  }
}

function readBrief(siteDir) {
  return readJson(path.join(intelligenceDir(siteDir), 'intelligence-brief.json'), REQUIRED_KEYS.brief, 'brief');
}

function readCapabilityTruth(siteDir) {
  return readJson(path.join(intelligenceDir(siteDir), 'capability-truth.json'), REQUIRED_KEYS.capability, 'capability');
}

function listRecipes(siteDir) {
  const dir = path.join(intelligenceDir(siteDir), 'recipes');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJson(path.join(dir, f), REQUIRED_KEYS.recipe, 'recipe'))
    .filter(Boolean);
}

function readRecipe(siteDir, recipeId) {
  if (!isSafeId(recipeId)) return null;
  return readJson(path.join(intelligenceDir(siteDir), 'recipes', `${recipeId}.json`), REQUIRED_KEYS.recipe, 'recipe');
}

function listRuns(siteDir) {
  const dir = path.join(intelligenceDir(siteDir), 'runs');
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory() && isSafeId(d.name));
  return entries
    .map(d => {
      const ledger = readJson(path.join(dir, d.name, 'ledger.json'), REQUIRED_KEYS.ledger, 'ledger');
      if (!ledger) return null;
      return {
        run_id: ledger.run_id,
        status: ledger.status,
        started_at: ledger.started_at || null,
        verdict: ledger.verdict || null,
        cost_usd: (ledger.cost && ledger.cost.usd) || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(b.started_at || '').localeCompare(String(a.started_at || '')));
}

function readRunLedger(siteDir, runId) {
  if (!isSafeId(runId)) return null;
  return readJson(path.join(intelligenceDir(siteDir), 'runs', runId, 'ledger.json'), REQUIRED_KEYS.ledger, 'ledger');
}

function readProofPacket(siteDir, runId) {
  if (!isSafeId(runId)) return null;
  return readJson(path.join(intelligenceDir(siteDir), 'runs', runId, 'proof-packet.json'), REQUIRED_KEYS.proof, 'proof');
}

function readLearningCandidates(siteDir, runId) {
  if (!isSafeId(runId)) return [];
  const file = path.join(intelligenceDir(siteDir), 'runs', runId, 'learning-candidates.json');
  const data = readJson(file, REQUIRED_KEYS.learning, 'learning');
  if (!data) return [];
  return Array.isArray(data.candidates) ? data.candidates : [];
}

function isSafeId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-]{2,80}$/i.test(id) && !id.includes('..');
}

function isSafeTag(tag) {
  return typeof tag === 'string' && /^site-[a-z0-9][a-z0-9-]{1,80}$/i.test(tag) && !tag.includes('..');
}

function listSites(sitesRoot) {
  if (!fs.existsSync(sitesRoot)) return [];
  return fs.readdirSync(sitesRoot, { withFileTypes: true })
    .filter(d => d.isDirectory() && isSafeTag(d.name))
    .map(d => {
      const tag = d.name;
      const siteDir = path.join(sitesRoot, tag);
      const intelDir = intelligenceDir(siteDir);
      const hasIntel = fs.existsSync(intelDir);
      const brief = hasIntel ? readBrief(siteDir) : null;
      let runCount = 0;
      const runsDir = path.join(intelDir, 'runs');
      if (fs.existsSync(runsDir)) {
        runCount = fs.readdirSync(runsDir, { withFileTypes: true }).filter(e => e.isDirectory()).length;
      }
      return {
        tag,
        title: brief ? brief.title : null,
        vertical: brief ? brief.vertical : null,
        has_intelligence: hasIntel,
        run_count: runCount,
      };
    })
    .sort((a, b) => Number(b.has_intelligence) - Number(a.has_intelligence) || a.tag.localeCompare(b.tag));
}

module.exports = {
  readBrief,
  readCapabilityTruth,
  listRecipes,
  readRecipe,
  listRuns,
  readRunLedger,
  readProofPacket,
  readLearningCandidates,
  listSites,
  intelligenceDir,
  isSafeId,
  isSafeTag,
};
