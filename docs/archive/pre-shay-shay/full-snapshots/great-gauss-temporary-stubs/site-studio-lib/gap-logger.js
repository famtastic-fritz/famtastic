'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Gap category taxonomy — covers both original Studio gaps and
 * build-orchestration-level fulfillment gaps from the build-trace plan.
 *
 * Each category maps to a recommended destination workspace so the
 * gap-routing logic can suggest where follow-up work belongs.
 */
const GAP_CATEGORIES = {
  // Original Studio gap types
  NOT_BUILT:     'not_built',
  NOT_CONNECTED: 'not_connected',
  BROKEN:        'broken',

  // Build-orchestration gap types (from build-trace plan)
  UNFULFILLED_REQUEST:    'unfulfilled_request',    // User asked for something not completed
  PLACEHOLDER_USED:       'placeholder_used',       // Temp asset or section used
  SPECIALIZED_ASSET_NEEDED: 'specialized_asset_needed', // Character, animation, audio, video
  COMPONENT_NEEDED:       'component_needed',       // Slideshow, assistant, booking, calc
  INTEGRATION_NEEDED:     'integration_needed',     // PayPal, CRM, email, calendar
  DESIGN_UNCERTAINTY:     'design_uncertainty',     // Prompt lacks brand/style direction
  PROVIDER_FAILURE:       'provider_failure',       // Image/API/deploy provider failed
  VERIFICATION_FAILURE:   'verification_failure',   // Nav/footer/SEO/accessibility failed
  AGENT_WEAKNESS:         'agent_weakness',         // Agent repeatedly fails a task type
  PROMPT_PATTERN:         'prompt_pattern',         // Prompt pattern improved or degraded output
  MISSING_CAPABILITY:     'missing_capability',     // Studio lacks needed workflow/tool
};

/**
 * Destination workspace routing per gap category.
 * Used by gap consumers to decide where to surface the gap.
 */
const GAP_DESTINATION = {
  not_built:                'Job Queue',
  not_connected:            'Platform',
  broken:                   'Site Editor',
  unfulfilled_request:      'Job Queue',
  placeholder_used:         'Job Queue',
  specialized_asset_needed: 'Media Studio',
  component_needed:         'Component Studio',
  integration_needed:       'Platform',
  design_uncertainty:       'Think Tank',
  provider_failure:         'Platform',
  verification_failure:     'Site Editor',
  agent_weakness:           'Think Tank',
  prompt_pattern:           'Think Tank',
  missing_capability:       'Platform',
};

const GAPS_PATH = path.join(process.env.HOME, '.local', 'share', 'famtastic', 'gaps.jsonl');
const PROMOTIONS_PATH = path.join(process.env.HOME, '.local', 'share', 'famtastic', 'intelligence-promotions.json');

const PROMOTION_THRESHOLD = 3;

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadGaps() {
  if (!fs.existsSync(GAPS_PATH)) return [];
  return fs.readFileSync(GAPS_PATH, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function logGap(tag, message, category, details = {}) {
  ensureDir(GAPS_PATH);
  const gaps = loadGaps();

  // Find existing gap for same capability_id
  const capId = details.capability_id || slugify(message.slice(0, 60));
  const existing = gaps.find(g => g.capability_id === capId);

  if (existing) {
    existing.frequency = (existing.frequency || 1) + 1;
    existing.last_seen = new Date().toISOString();
    rewriteGaps(gaps);
    if (existing.frequency >= PROMOTION_THRESHOLD) {
      promoteGap(existing);
    }
    return existing;
  }

  const entry = {
    id: `gap-${Date.now()}`,
    timestamp: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    site_tag: tag,
    message_preview: message.slice(0, 100),
    failure_category: category,
    capability_id: capId,
    destination: GAP_DESTINATION[category] || 'Job Queue',
    run_id: details.run_id || null,
    frequency: 1,
    status: 'open',
    ...details,
  };

  fs.appendFileSync(GAPS_PATH, JSON.stringify(entry) + '\n');
  return entry;
}

function rewriteGaps(gaps) {
  ensureDir(GAPS_PATH);
  fs.writeFileSync(GAPS_PATH, gaps.map(g => JSON.stringify(g)).join('\n') + '\n');
}

function promoteGap(gap) {
  ensureDir(PROMOTIONS_PATH);
  let promotions = [];
  if (fs.existsSync(PROMOTIONS_PATH)) {
    try { promotions = JSON.parse(fs.readFileSync(PROMOTIONS_PATH, 'utf8')); } catch {}
  }
  if (!Array.isArray(promotions)) promotions = [];

  const existing = promotions.find(p => p.gap_id === gap.id);
  if (existing) return; // already promoted

  promotions.push({
    id: `intel-gap-${Date.now()}`,
    type: 'capability_gap',
    gap_id: gap.id,
    capability_id: gap.capability_id,
    failure_category: gap.failure_category,
    frequency: gap.frequency,
    sites_affected: [gap.site_tag],
    message: `[capability_gap] "${gap.capability_id}" requested ${gap.frequency} times. Category: ${gap.failure_category}.`,
    severity: gap.frequency >= 5 ? 'major' : 'opportunity',
    dismissed: false,
    created_at: new Date().toISOString(),
  });

  fs.writeFileSync(PROMOTIONS_PATH, JSON.stringify(promotions, null, 2));
  console.log(`[gap-logger] promoted gap to intelligence: ${gap.capability_id} (freq: ${gap.frequency})`);
}

function resolveGap(capabilityId) {
  if (!fs.existsSync(GAPS_PATH)) return;
  const gaps = loadGaps().map(g => {
    if (g.capability_id === capabilityId) return { ...g, status: 'resolved', resolved_at: new Date().toISOString() };
    return g;
  });
  rewriteGaps(gaps);
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
}

module.exports = { logGap, resolveGap, loadGaps, GAP_CATEGORIES, GAP_DESTINATION };
