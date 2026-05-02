'use strict';

// lib/famtastic/recipes/index.js
// SHAY V2 (2026-05-02 iter 3): Recipe library — Fritz's "proven recipes" framing.
//
// Per Fritz: "ultimately building sites will be like Shay gets the request,
// pulls from a proven list of recipes, fully vetted, researched, tested,
// optimized and just builds. We will have special skills, sub-agents, and
// process."
//
// A recipe is a structured spec for building a specific kind of site or
// component. It bundles:
//   - intent (what kind of site / component this is for)
//   - vertical (rooftop bar, family reunion, lawn care, etc.)
//   - inputs (brief fields, brand inputs, must-have sections)
//   - components (which library components to use)
//   - skills_required (which Shay skills should run)
//   - sub_agents (which sub-agents are involved)
//   - process_steps (the build plan)
//   - validation (how we know the result is right)
//   - confidence (proven? experimental? deprecated?)
//
// API:
//   recipes.register({ id, name, vertical, ...spec })
//   recipes.list({ vertical, confidence })
//   recipes.find({ intent, vertical })
//   recipes.get(id)
//
// Status: SCAFFOLD with API + 1 example recipe.
// Iteration 5+ populates from existing successful builds (mining sites/<tag>/
// for proven patterns).

const fs = require('fs');
const path = require('path');

const FAM_ROOT = path.resolve(process.env.HOME || '/root', 'famtastic');
const RECIPES_DIR = path.join(FAM_ROOT, 'lib/famtastic/recipes/library');

const registry = new Map();

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function register(opts) {
  if (!opts || !opts.id) { console.error('[recipes] register: id required'); return false; }
  registry.set(opts.id, {
    id: opts.id,
    name: opts.name || opts.id,
    vertical: opts.vertical || 'unknown',
    intent: opts.intent || '',
    inputs: opts.inputs || {},
    components: Array.isArray(opts.components) ? opts.components : [],
    skills_required: Array.isArray(opts.skills_required) ? opts.skills_required : [],
    sub_agents: Array.isArray(opts.sub_agents) ? opts.sub_agents : [],
    process_steps: Array.isArray(opts.process_steps) ? opts.process_steps : [],
    validation: opts.validation || {},
    confidence: opts.confidence || 'experimental',  // experimental | tested | proven | deprecated
    used_by_sites: Array.isArray(opts.used_by_sites) ? opts.used_by_sites : [],
    created_at: opts.created_at || new Date().toISOString(),
    last_used_at: opts.last_used_at || null
  });
  return true;
}

function list(opts) {
  opts = opts || {};
  let items = Array.from(registry.values());
  if (opts.vertical) items = items.filter(r => r.vertical === opts.vertical);
  if (opts.confidence) items = items.filter(r => r.confidence === opts.confidence);
  return items;
}

function find(opts) {
  // Soft match: returns recipes whose intent or vertical contains the query terms.
  opts = opts || {};
  let items = Array.from(registry.values());
  if (opts.vertical) items = items.filter(r => r.vertical === opts.vertical);
  if (opts.intent) {
    const q = String(opts.intent).toLowerCase();
    items = items.filter(r => (r.intent || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q));
  }
  // Sort by confidence: proven > tested > experimental > deprecated
  const order = { proven: 4, tested: 3, experimental: 2, deprecated: 1 };
  items.sort((a, b) => (order[b.confidence] || 0) - (order[a.confidence] || 0));
  return items;
}

function get(id) { return registry.get(id) || null; }

function discoverFromLibrary() {
  ensureDir(RECIPES_DIR);
  const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json'));
  for (const f of files) {
    try {
      const recipe = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, f), 'utf8'));
      register(recipe);
    } catch (err) {
      console.warn('[recipes] failed to load ' + f + ':', err.message);
    }
  }
}

function summary() {
  const items = list();
  const byConfidence = {};
  const byVertical = {};
  for (const r of items) {
    byConfidence[r.confidence] = (byConfidence[r.confidence] || 0) + 1;
    byVertical[r.vertical] = (byVertical[r.vertical] || 0) + 1;
  }
  return { total: items.length, by_confidence: byConfidence, by_vertical: byVertical, library_dir: RECIPES_DIR };
}

// Self-register one example recipe so the library is non-empty and the schema
// is documented by example. Future: mine sites/<tag>/spec.json for proven patterns.
register({
  id: 'family-reunion-event-site',
  name: 'Family Reunion Event Site',
  vertical: 'family-reunion',
  intent: 'event site for a family reunion with RSVP, schedule, gallery, and connect surfaces',
  inputs: {
    required: ['family_name', 'event_date', 'venue', 'host_email'],
    optional: ['theme_color', 'accent_color', 'character_anchor', 'photo_set', 'rsvp_deadline']
  },
  components: ['hero-section', 'countdown-timer', 'photo-slideshow', 'rsvp-form'],
  skills_required: ['build_site', 'generate_brand_mark', 'generate_story_stills'],
  sub_agents: ['claude-build', 'gemini-research'],
  process_steps: [
    'capture_brief',
    'generate_brand_mark',
    'generate_story_stills',
    'build_template',
    'parallel_pages',
    'post_process_run',
    'verification',
    'deploy_staging'
  ],
  validation: { fam_score_min: 75, required_pages: ['index', 'rsvp', 'schedule', 'gallery', 'connect'] },
  confidence: 'tested',
  used_by_sites: ['site-mbsh96reunion', 'site-street-family-reunion']
});

discoverFromLibrary();

module.exports = { register, list, find, get, summary, discoverFromLibrary };
