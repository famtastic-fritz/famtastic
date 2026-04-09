'use strict';
/**
 * character-branding.js — FAMtastic character placement pipeline
 *
 * Tracks character (mascot) placements per site, provides HTML/CSS
 * generation for character positioning, and reads/writes placement
 * data to spec.json under spec.character_branding.
 *
 * Usage (in server.js):
 *   const characterBranding = require('./lib/character-branding');
 *   const placements = characterBranding.placementsForPage('index.html', spec);
 *   const html = characterBranding.renderPlacement(placement);
 *
 * Placement schema (stored in spec.character_branding[page]):
 *   {
 *     character: 'buddy',         // character name
 *     pose: 'buddy-wave-footer',  // image filename (no ext)
 *     position: 'footer-left',    // named position
 *     classes: 'w-32 absolute',   // tailwind/CSS classes
 *     inline_style: '',           // additional inline styles
 *     alt: 'Buddy waving goodbye',// alt text
 *     dark_section: false,        // whether on dark bg
 *   }
 */

/**
 * Named position presets — map to CSS positioning.
 * Each preset defines classes and inline style fragments.
 */
const POSITION_PRESETS = {
  'hero-right': {
    classes: 'absolute bottom-0 right-0 w-48 md:w-64 z-10 pointer-events-none',
    inline_style: '',
  },
  'hero-left': {
    classes: 'absolute bottom-0 left-0 w-48 md:w-64 z-10 pointer-events-none',
    inline_style: '',
  },
  'footer-left': {
    classes: 'absolute -top-20 left-8 w-32 z-10 pointer-events-none',
    inline_style: '',
  },
  'footer-right': {
    classes: 'absolute -top-20 right-8 w-32 z-10 pointer-events-none',
    inline_style: '',
  },
  'section-peek-right': {
    classes: 'absolute top-1/2 -translate-y-1/2 -right-16 w-40 z-10 pointer-events-none',
    inline_style: '',
  },
  'section-peek-left': {
    classes: 'absolute top-1/2 -translate-y-1/2 -left-16 w-40 z-10 pointer-events-none',
    inline_style: '',
  },
  'card-badge': {
    classes: 'absolute -top-6 -right-6 w-16 z-10 pointer-events-none',
    inline_style: '',
  },
  'floating': {
    classes: 'fixed bottom-6 right-6 w-24 z-50 pointer-events-none',
    inline_style: '',
  },
};

/**
 * Return all placements for a given page from spec.character_branding.
 * @param {string} page - page filename e.g. 'index.html'
 * @param {object} spec - spec.json object
 * @returns {Array} array of placement objects
 */
function placementsForPage(page, spec) {
  const cb = spec.character_branding || {};
  return cb[page] || [];
}

/**
 * Add or update a placement for a page.
 * @param {string} page
 * @param {object} placement
 * @param {object} spec - mutates spec.character_branding
 * @returns {object} updated spec
 */
function addPlacement(page, placement, spec) {
  if (!spec.character_branding) spec.character_branding = {};
  if (!spec.character_branding[page]) spec.character_branding[page] = [];

  const existing = spec.character_branding[page];
  const idx = existing.findIndex(p => p.position === placement.position && p.character === placement.character);
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...placement };
  } else {
    existing.push(placement);
  }
  return spec;
}

/**
 * Remove a placement by position and character.
 */
function removePlacement(page, position, character, spec) {
  if (!spec.character_branding || !spec.character_branding[page]) return spec;
  spec.character_branding[page] = spec.character_branding[page].filter(
    p => !(p.position === position && p.character === (character || p.character))
  );
  return spec;
}

/**
 * Render a placement as an HTML <img> tag with positioning classes.
 * @param {object} placement
 * @param {string} assetBase - base path to character assets e.g. 'assets/buddy'
 * @returns {string} HTML string
 */
function renderPlacement(placement, assetBase) {
  const base = assetBase || 'assets/buddy';
  const src = `${base}/${placement.pose}.png`;
  const preset = POSITION_PRESETS[placement.position] || {};
  const classes = placement.classes || preset.classes || 'absolute w-32 z-10 pointer-events-none';
  const style = placement.inline_style || preset.inline_style || '';
  const alt = placement.alt || `${placement.character} character`;
  const shadow = placement.dark_section
    ? 'filter:drop-shadow(2px 4px 12px rgba(255,255,255,0.15));'
    : 'filter:drop-shadow(2px 4px 8px rgba(0,0,0,0.25));';
  const inlineStyle = [style, shadow].filter(Boolean).join('');

  return `<img src="${src}" alt="${alt}" class="fam-knockout ${classes}"${inlineStyle ? ` style="${inlineStyle}"` : ''} loading="lazy">`;
}

/**
 * Generate a CSS snippet for a named position (useful for non-Tailwind contexts).
 */
function positionCss(positionName) {
  const map = {
    'hero-right':          'position:absolute;bottom:0;right:0;width:16rem;z-index:10;pointer-events:none;',
    'hero-left':           'position:absolute;bottom:0;left:0;width:16rem;z-index:10;pointer-events:none;',
    'footer-left':         'position:absolute;top:-5rem;left:2rem;width:8rem;z-index:10;pointer-events:none;',
    'footer-right':        'position:absolute;top:-5rem;right:2rem;width:8rem;z-index:10;pointer-events:none;',
    'section-peek-right':  'position:absolute;top:50%;transform:translateY(-50%);right:-4rem;width:10rem;z-index:10;pointer-events:none;',
    'section-peek-left':   'position:absolute;top:50%;transform:translateY(-50%);left:-4rem;width:10rem;z-index:10;pointer-events:none;',
    'card-badge':          'position:absolute;top:-1.5rem;right:-1.5rem;width:4rem;z-index:10;pointer-events:none;',
    'floating':            'position:fixed;bottom:1.5rem;right:1.5rem;width:6rem;z-index:50;pointer-events:none;',
  };
  return map[positionName] || 'position:absolute;z-index:10;pointer-events:none;';
}

/**
 * List all characters and poses registered for a site.
 */
function characterSummary(spec) {
  const cb = spec.character_branding || {};
  const summary = {};
  for (const [page, placements] of Object.entries(cb)) {
    for (const p of placements) {
      if (!summary[p.character]) summary[p.character] = { poses: new Set(), pages: new Set() };
      summary[p.character].poses.add(p.pose);
      summary[p.character].pages.add(page);
    }
  }
  // Convert Sets to arrays for JSON serialization
  for (const char of Object.values(summary)) {
    char.poses = [...char.poses];
    char.pages = [...char.pages];
  }
  return summary;
}

module.exports = {
  POSITION_PRESETS,
  placementsForPage,
  addPlacement,
  removePlacement,
  renderPlacement,
  positionCss,
  characterSummary,
};
