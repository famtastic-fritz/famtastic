'use strict';

/**
 * Per-site style fingerprint (P1.2 — Visual Distinctiveness).
 *
 * The fingerprint is a small bag of design tokens persisted on
 * `spec.style_fingerprint` and threaded into the build prompt. Its purpose
 * is to keep two sites in different verticals from collapsing onto the same
 * FAMtastic default palette while preserving FAMtastic-shape (bold,
 * attention-commanding) for Tier-B sites.
 *
 * Scope intentionally narrow: design tokens only — palette, typography roles,
 * mood. NOT IP-Adapter, NOT LoRA, NOT image-level style refs. Those are V2.
 *
 * GAP-1 relationship: GAP-1 pinned the FAMtastic default palette so Claude
 * couldn't drift mid-build to generic industry colors. P1.2 relaxes the pin
 * by giving each site its own locked palette, computed BEFORE the build
 * starts and persisted on the spec. The "lock at build start" property that
 * GAP-1 needed is preserved — once a fingerprint is on the spec, every prompt
 * call inside that build references the same tokens.
 *
 * The fingerprint generator is deterministic for known verticals (the
 * VERTICAL_PALETTES table below). Brief-extracted hex colors override the
 * vertical default. FAMtastic default palette is the LAST resort — only
 * used when the vertical is unknown and the brief has no color signal.
 *
 * Source field tells which path produced the fingerprint:
 *   - 'brief_extracted'    — the brief named explicit hex/style cues
 *   - 'vertical_default'   — vertical matched a known table entry
 *   - 'famtastic_default'  — fallback (vertical unknown, no brief cues)
 *   - 'operator_override'  — set by a future operator UI; smoke sentinel
 *                            allows duplicates across sites only when this
 *                            source is set
 */

const { FAMTASTIC_DEFAULT_PALETTE } = require('./famtastic-skeletons');

// Vertical → palette + typography + mood. Curated, not exhaustive.
// Each entry is a complete fingerprint sans `generated_at` and `source`.
// Add/refine via real builds rather than pre-imagining every vertical.
const VERTICAL_PALETTES = {
  church: {
    palette: { primary: '#3D2817', secondary: '#8B6F47', accent: '#D4A574', neutral: '#F5EFE7', background: '#FAF6F0' },
    typography: { heading_family: 'Cormorant Garamond', body_family: 'Lato', scale: 'classical' },
    mood: 'warm and reverent, earthy with stained-glass amber warmth',
  },
  transport: {
    palette: { primary: '#1B3A5C', secondary: '#3E5C76', accent: '#F2A33A', neutral: '#E5E7EB', background: '#F8FAFC' },
    typography: { heading_family: 'Oswald', body_family: 'Inter', scale: 'industrial' },
    mood: 'industrial and dependable, steel blues with a high-visibility accent',
  },
  shipping: 'transport',
  logistics: 'transport',
  freight: 'transport',
  florist: {
    palette: { primary: '#7A4E5F', secondary: '#C9A8B0', accent: '#E8B4A6', neutral: '#FAF5F1', background: '#FFFAF7' },
    typography: { heading_family: 'Playfair Display', body_family: 'Lora', scale: 'romantic' },
    mood: 'soft and serene, dusty rose with petal pinks and warm cream',
  },
  flower: 'florist',
  flowers: 'florist',
  barber: {
    palette: { primary: '#1A1A1A', secondary: '#3D3D3D', accent: '#C8A062', neutral: '#E8E4DD', background: '#FBF9F4' },
    typography: { heading_family: 'Bebas Neue', body_family: 'Source Sans Pro', scale: 'masculine' },
    mood: 'masculine and confident, deep tones with brass accents and clean lines',
  },
  barbershop: 'barber',
  bakery: {
    palette: { primary: '#8B4513', secondary: '#D2A679', accent: '#E89B5C', neutral: '#FFF4E6', background: '#FFFCF5' },
    typography: { heading_family: 'Caveat', body_family: 'Nunito', scale: 'handcrafted' },
    mood: 'warm and inviting, butter-and-toast tones with a hand-lettered touch',
  },
  cafe: {
    palette: { primary: '#3E2723', secondary: '#6D4C41', accent: '#C68642', neutral: '#EFEBE9', background: '#FAF5F0' },
    typography: { heading_family: 'Merriweather', body_family: 'Open Sans', scale: 'editorial' },
    mood: 'cozy and considered, dark roast browns with cream highlights',
  },
  coffee: 'cafe',
  coffeeshop: 'cafe',
  restaurant: {
    palette: { primary: '#7B2D26', secondary: '#A33B2A', accent: '#E8B931', neutral: '#F9F1E7', background: '#FFFBF5' },
    typography: { heading_family: 'Playfair Display', body_family: 'Source Sans Pro', scale: 'editorial' },
    mood: 'rich and appetising, deep wine with golden saffron warmth',
  },
  accounting: {
    palette: { primary: '#0F3057', secondary: '#1E5F8E', accent: '#3CB371', neutral: '#E8EEF5', background: '#FFFFFF' },
    typography: { heading_family: 'Montserrat', body_family: 'Inter', scale: 'professional' },
    mood: 'trustworthy and precise, navy with a measured forest-green accent',
  },
  accountant: 'accounting',
  cpa: 'accounting',
  finance: 'accounting',
  legal: {
    palette: { primary: '#2C2C54', secondary: '#474787', accent: '#AAA69D', neutral: '#F1F2F6', background: '#FFFFFF' },
    typography: { heading_family: 'Cormorant Garamond', body_family: 'Lato', scale: 'professional' },
    mood: 'authoritative and composed, deep indigo with stone neutrals',
  },
  lawyer: 'legal',
  attorney: 'legal',
  lawn: {
    palette: { primary: '#2D5016', secondary: '#5D7B3F', accent: '#F4A442', neutral: '#F1EDE3', background: '#FBF9F2' },
    typography: { heading_family: 'Roboto Slab', body_family: 'Roboto', scale: 'sturdy' },
    mood: 'fresh and grounded, deep grass-green with sun-warmed accents',
  },
  landscaping: 'lawn',
  landscape: 'lawn',
  fitness: {
    palette: { primary: '#0A0A0A', secondary: '#262626', accent: '#FF3B30', neutral: '#E5E5E5', background: '#FAFAFA' },
    typography: { heading_family: 'Bebas Neue', body_family: 'Inter', scale: 'athletic' },
    mood: 'high-energy and stark, blacks with a single hot accent',
  },
  gym: 'fitness',
  yoga: {
    palette: { primary: '#5C4D6B', secondary: '#9B8AA5', accent: '#E0BBE4', neutral: '#F4EFF6', background: '#FBF7FB' },
    typography: { heading_family: 'Cormorant Garamond', body_family: 'Lato', scale: 'serene' },
    mood: 'calm and centered, dusk lavender with breathing-room neutrals',
  },
  garage_sale: {
    palette: { primary: '#C73E1D', secondary: '#F18F01', accent: '#048BA8', neutral: '#FFF4E6', background: '#FFFBF5' },
    typography: { heading_family: 'Bebas Neue', body_family: 'Roboto', scale: 'bold' },
    mood: 'bold and joyful, garage-sale flag colors with a community-poster energy',
  },
  retail: {
    palette: { primary: '#2E294E', secondary: '#1B998B', accent: '#F46036', neutral: '#F4F4F8', background: '#FFFFFF' },
    typography: { heading_family: 'Poppins', body_family: 'Inter', scale: 'modern' },
    mood: 'modern and inviting, deep purple with teal and a warm pop',
  },
  shop: 'retail',
  store: 'retail',
  music: {
    palette: { primary: '#0B132B', secondary: '#1C2541', accent: '#5BC0BE', neutral: '#3A506B', background: '#0E1726' },
    typography: { heading_family: 'Anton', body_family: 'Inter', scale: 'editorial' },
    mood: 'nightlife dark with neon teal — stage-lit and energetic',
  },
  event: {
    palette: { primary: '#7209B7', secondary: '#B5179E', accent: '#F72585', neutral: '#F5F0F7', background: '#FFFFFF' },
    typography: { heading_family: 'Playfair Display', body_family: 'Inter', scale: 'editorial' },
    mood: 'festive and memorable, bold magentas and electric pinks',
  },
  events: 'event',
  reunion: 'event',
};

const FAMTASTIC_FALLBACK_FINGERPRINT = {
  palette: {
    primary:    FAMTASTIC_DEFAULT_PALETTE.primary,
    secondary:  FAMTASTIC_DEFAULT_PALETTE.navy,
    accent:     FAMTASTIC_DEFAULT_PALETTE.accent,
    neutral:    FAMTASTIC_DEFAULT_PALETTE.coral,
    background: FAMTASTIC_DEFAULT_PALETTE.background,
  },
  typography: { heading_family: 'Montserrat', body_family: 'Open Sans', scale: 'famtastic' },
  mood: 'bold and confidently different — the FAMtastic default',
};

// Walk a vertical alias chain to its canonical key + entry. Returns
// { key: canonical, entry } or null. Two sites that resolve to the same
// canonical key (e.g. "coffee" and "cafe") will store the same `vertical`
// value on their fingerprint — the sentinel relies on this to allow
// same-vertical duplicates.
function resolveVerticalEntry(verticalKey) {
  if (!verticalKey) return null;
  let key = verticalKey.toLowerCase().trim().replace(/[\s\-]+/g, '_');
  for (let i = 0; i < 4; i++) {
    const entry = VERTICAL_PALETTES[key];
    if (!entry) return null;
    if (typeof entry === 'string') { key = entry; continue; }
    return { entry, key };
  }
  return null;
}

// Match vertical from a free-form business_type / business_description string.
// First pass: exact key. Second pass: substring scan against canonical keys.
// Third pass: substring scan against alias keys.
function matchVertical(rawVertical, fallbackText) {
  const direct = resolveVerticalEntry(rawVertical);
  if (direct) return direct;
  const haystack = `${rawVertical || ''} ${fallbackText || ''}`.toLowerCase();
  const candidateKeys = Object.keys(VERTICAL_PALETTES);
  // Prefer longer keys first so 'barbershop' beats 'barber' for matching ties.
  candidateKeys.sort((a, b) => b.length - a.length);
  // Pass 2 — canonical keys
  for (const key of candidateKeys) {
    if (typeof VERTICAL_PALETTES[key] === 'string') continue;
    const pattern = new RegExp(`\\b${key.replace(/_/g, '[ -]?')}\\b`);
    if (pattern.test(haystack)) return { entry: VERTICAL_PALETTES[key], key };
  }
  // Pass 3 — alias keys, return canonical
  for (const [aliasKey, target] of Object.entries(VERTICAL_PALETTES)) {
    if (typeof target !== 'string') continue;
    const pattern = new RegExp(`\\b${aliasKey.replace(/_/g, '[ -]?')}\\b`);
    if (pattern.test(haystack)) {
      const resolved = resolveVerticalEntry(aliasKey);
      if (resolved) return resolved;
    }
  }
  return null;
}

// Pull explicit hex colors out of a brief blob. Uses labelled forms when present
// (e.g. "primary: #7B2D3B", "Heritage Burgundy (#7B2D3B)") and bare hex codes
// when not. Returns up to one explicit primary/accent/background.
function extractBriefHexColors(brief, userMessage) {
  const text = [
    brief && brief.style_notes,
    brief && JSON.stringify(brief.visual_direction || {}),
    brief && JSON.stringify(brief.client_brief || {}),
    userMessage || '',
  ].filter(Boolean).join(' ');

  const out = {};
  // Labelled forms first
  const labelled = text.matchAll(/(primary|accent|background|bg|secondary|neutral)\b[^#\n]{0,30}(#[0-9A-Fa-f]{6})\b/gi);
  for (const m of labelled) {
    const role = m[1].toLowerCase() === 'bg' ? 'background' : m[1].toLowerCase();
    if (!out[role]) out[role] = m[2];
  }
  // Fall back to bare hex if we still don't have a primary
  if (!out.primary) {
    const bare = text.match(/#[0-9A-Fa-f]{6}\b/);
    if (bare) out.primary = bare[0];
  }
  return out;
}

/**
 * Generate a style fingerprint for a site about to be built.
 *
 * @param {object} brief        — synthesized design brief or shay extraction
 * @param {object} options
 * @param {string} options.vertical    — spec.business_type or equivalent
 * @param {string} options.userMessage — original user message for hex scan
 * @param {object} options.brand       — existing sites/<tag>/brand.json (optional)
 * @returns {object} fingerprint with .palette/.typography/.mood/.source/.generated_at
 */
function generateStyleFingerprint(brief, options = {}) {
  const { vertical, userMessage, brand } = options;

  // 1. Brief-extracted explicit hex colors override everything when present.
  const briefColors = extractBriefHexColors(brief || {}, userMessage);

  // 2. Try to resolve a vertical entry from the supplied vertical or the brief.
  const briefHaystack = [
    brief && brief.business_description,
    brief && brief.goal,
    brief && brief.style_notes,
    (brief && brief.tone || []).join(' '),
  ].filter(Boolean).join(' ');
  const matched = matchVertical(vertical, briefHaystack);

  // 3. Brand.json may carry colors from a prior build — useful as a recovery
  //    source for legacy specs that lack a fingerprint but have a brand.json.
  const brandColors = brand && (brand.primary_color || brand.accent_color || brand.bg_color)
    ? { primary: brand.primary_color, accent: brand.accent_color, background: brand.bg_color }
    : null;

  // Decide source ordering: brief > vertical > brand > famtastic_default
  const hasBriefSignal = Object.keys(briefColors).length > 0;
  if (hasBriefSignal) {
    // Start from vertical if matched, else FAMtastic fallback, then overlay brief colors
    const base = matched ? matched.entry : FAMTASTIC_FALLBACK_FINGERPRINT;
    return finalize({
      palette:    { ...base.palette, ...briefColors },
      typography: { ...base.typography, ...((brand && brand.heading_font) ? { heading_family: brand.heading_font } : {}), ...((brand && brand.body_font) ? { body_family: brand.body_font } : {}) },
      mood:       base.mood,
      source:     'brief_extracted',
      vertical:   matched ? matched.key : null,
    });
  }

  if (matched) {
    return finalize({
      palette:    { ...matched.entry.palette },
      typography: { ...matched.entry.typography },
      mood:       matched.entry.mood,
      source:     'vertical_default',
      vertical:   matched.key,
    });
  }

  if (brandColors && brandColors.primary) {
    return finalize({
      palette:    { ...FAMTASTIC_FALLBACK_FINGERPRINT.palette, ...brandColors },
      typography: {
        ...FAMTASTIC_FALLBACK_FINGERPRINT.typography,
        ...((brand && brand.heading_font) ? { heading_family: brand.heading_font } : {}),
        ...((brand && brand.body_font) ? { body_family: brand.body_font } : {}),
      },
      mood:       FAMTASTIC_FALLBACK_FINGERPRINT.mood,
      source:     'brand_recovered',
      vertical:   null,
    });
  }

  return finalize({
    ...FAMTASTIC_FALLBACK_FINGERPRINT,
    source:   'famtastic_default',
    vertical: null,
  });
}

function finalize(fp) {
  return {
    palette: {
      primary:    fp.palette && fp.palette.primary    ? fp.palette.primary    : FAMTASTIC_FALLBACK_FINGERPRINT.palette.primary,
      secondary:  fp.palette && fp.palette.secondary  ? fp.palette.secondary  : FAMTASTIC_FALLBACK_FINGERPRINT.palette.secondary,
      accent:     fp.palette && fp.palette.accent     ? fp.palette.accent     : FAMTASTIC_FALLBACK_FINGERPRINT.palette.accent,
      neutral:    fp.palette && fp.palette.neutral    ? fp.palette.neutral    : FAMTASTIC_FALLBACK_FINGERPRINT.palette.neutral,
      background: fp.palette && fp.palette.background ? fp.palette.background : FAMTASTIC_FALLBACK_FINGERPRINT.palette.background,
    },
    typography: {
      heading_family: (fp.typography && fp.typography.heading_family) || FAMTASTIC_FALLBACK_FINGERPRINT.typography.heading_family,
      body_family:    (fp.typography && fp.typography.body_family)    || FAMTASTIC_FALLBACK_FINGERPRINT.typography.body_family,
      scale:          (fp.typography && fp.typography.scale)          || FAMTASTIC_FALLBACK_FINGERPRINT.typography.scale,
    },
    mood:         fp.mood || FAMTASTIC_FALLBACK_FINGERPRINT.mood,
    source:       fp.source || 'famtastic_default',
    vertical:     fp.vertical || null,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Build a prompt-ready block describing the fingerprint as binding constraints.
 * Injected into the build prompt's visual-requirements section.
 */
function buildFingerprintPromptBlock(fp) {
  if (!fp || !fp.palette) return '';
  const lines = [
    '\n\nLOCKED STYLE FINGERPRINT (per-site — DO NOT deviate, DO NOT substitute generic colors):',
    `  Palette source: ${fp.source}${fp.vertical ? ` (vertical: ${fp.vertical})` : ''}`,
    `  primary:    ${fp.palette.primary}`,
    `  secondary:  ${fp.palette.secondary}`,
    `  accent:     ${fp.palette.accent}`,
    `  neutral:    ${fp.palette.neutral}`,
    `  background: ${fp.palette.background}`,
    `  heading font: ${fp.typography.heading_family}`,
    `  body font:    ${fp.typography.body_family}`,
    `  mood: ${fp.mood}`,
    'Apply these EXACT hex values in :root CSS custom properties AND any Tailwind config.',
    'Using any other colors or fonts is a build failure.',
  ];
  return lines.join('\n');
}

/**
 * Validate fingerprint shape. Returns { valid, errors }.
 */
function validateFingerprintShape(fp) {
  const errors = [];
  if (!fp || typeof fp !== 'object') return { valid: false, errors: ['fingerprint not an object'] };
  if (!fp.palette || typeof fp.palette !== 'object') errors.push('palette missing');
  else {
    for (const key of ['primary', 'secondary', 'accent', 'neutral', 'background']) {
      const v = fp.palette[key];
      if (!v || typeof v !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(v)) {
        errors.push(`palette.${key} not a valid hex (#RRGGBB): ${JSON.stringify(v)}`);
      }
    }
  }
  if (!fp.typography || typeof fp.typography !== 'object') errors.push('typography missing');
  else {
    for (const key of ['heading_family', 'body_family', 'scale']) {
      if (!fp.typography[key] || typeof fp.typography[key] !== 'string') {
        errors.push(`typography.${key} missing or non-string`);
      }
    }
  }
  if (!fp.mood || typeof fp.mood !== 'string') errors.push('mood missing or non-string');
  if (!fp.source || typeof fp.source !== 'string') errors.push('source missing or non-string');
  const validSources = new Set(['brief_extracted', 'vertical_default', 'brand_recovered', 'famtastic_default', 'operator_override']);
  if (fp.source && !validSources.has(fp.source)) errors.push(`source has unexpected value: ${JSON.stringify(fp.source)}`);
  return { valid: errors.length === 0, errors };
}

module.exports = {
  generateStyleFingerprint,
  buildFingerprintPromptBlock,
  validateFingerprintShape,
  VERTICAL_PALETTES,
  FAMTASTIC_FALLBACK_FINGERPRINT,
  // Internal helpers exported for tests
  _matchVertical: matchVertical,
  _extractBriefHexColors: extractBriefHexColors,
};
