/**
 * font-registry.js — FAMtastic typography intelligence
 *
 * Curated Google Fonts pairings used by the build pipeline to pick an
 * appropriate heading/body combination per vertical. The Studio server
 * uses `pickPairingForVertical()` at build time to resolve a default
 * pairing, which is then injected into the build prompt so Claude
 * generates the correct <link> tag and CSS custom properties.
 *
 * Each pairing includes:
 *   - id            stable key used in spec.fonts.pairing
 *   - name          human-readable label
 *   - heading       Google Fonts family name
 *   - body          Google Fonts family name
 *   - personality   short descriptor (editorial, luxury, tech, etc.)
 *   - mood          adjectives describing the vibe
 *   - fallback      system font stack fallback
 *   - weights       comma-separated weight list for the Google Fonts URL
 *   - googleUrl     precomputed Google Fonts URL
 *
 * The vertical mapping is an intentionally loose map — the server
 * normalizes the vertical string (lowercases, strips punctuation) and
 * looks for substring matches before falling back to the default pair.
 */

'use strict';

const PAIRINGS = [
  {
    id: 'editorial-serif',
    name: 'Editorial Serif',
    heading: 'Playfair Display',
    body: 'Inter',
    personality: 'editorial, confident, magazine',
    mood: ['sophisticated', 'trusted', 'story-driven'],
    fallback_heading: `'Playfair Display', Georgia, 'Times New Roman', serif`,
    fallback_body: `'Inter', -apple-system, 'Segoe UI', sans-serif`,
    weights: { heading: '400;600;700;900', body: '300;400;500;600;700' },
  },
  {
    id: 'luxury-display',
    name: 'Luxury Display',
    heading: 'Cormorant Garamond',
    body: 'Lato',
    personality: 'luxury, refined, heritage',
    mood: ['timeless', 'premium', 'understated'],
    fallback_heading: `'Cormorant Garamond', 'Didot', Georgia, serif`,
    fallback_body: `'Lato', -apple-system, 'Helvetica Neue', sans-serif`,
    weights: { heading: '400;500;600;700', body: '300;400;700' },
  },
  {
    id: 'modern-geometric',
    name: 'Modern Geometric',
    heading: 'Montserrat',
    body: 'Open Sans',
    personality: 'modern, geometric, friendly',
    mood: ['clean', 'approachable', 'professional'],
    fallback_heading: `'Montserrat', 'Helvetica Neue', Arial, sans-serif`,
    fallback_body: `'Open Sans', -apple-system, 'Segoe UI', sans-serif`,
    weights: { heading: '500;600;700;800', body: '300;400;600;700' },
  },
  {
    id: 'tech-neutral',
    name: 'Tech Neutral',
    heading: 'Space Grotesk',
    body: 'Inter',
    personality: 'tech, neutral, engineered',
    mood: ['minimal', 'precise', 'product-focused'],
    fallback_heading: `'Space Grotesk', 'Inter', -apple-system, sans-serif`,
    fallback_body: `'Inter', -apple-system, 'Segoe UI', sans-serif`,
    weights: { heading: '400;500;600;700', body: '300;400;500;600;700' },
  },
  {
    id: 'bold-nightlife',
    name: 'Bold Nightlife',
    heading: 'Bebas Neue',
    body: 'Poppins',
    personality: 'bold, high-energy, nightlife',
    mood: ['loud', 'confident', 'event-driven'],
    fallback_heading: `'Bebas Neue', 'Oswald', 'Arial Narrow', sans-serif`,
    fallback_body: `'Poppins', -apple-system, 'Segoe UI', sans-serif`,
    weights: { heading: '400', body: '300;400;500;600;700' },
  },
];

// Loose keyword map. Keys are lowercased vertical fragments; values are
// pairing ids. Multiple keys can point to the same pairing.
const VERTICAL_MAP = {
  // Editorial Serif — legal, medical, non-profit, writing
  'law':            'editorial-serif',
  'legal':          'editorial-serif',
  'attorney':       'editorial-serif',
  'doctor':         'editorial-serif',
  'medical':        'editorial-serif',
  'health':         'editorial-serif',
  'therapist':      'editorial-serif',
  'nonprofit':      'editorial-serif',
  'non-profit':     'editorial-serif',
  'consultant':     'editorial-serif',
  'writer':         'editorial-serif',
  'author':         'editorial-serif',
  'coach':          'editorial-serif',

  // Luxury Display — wedding, spa, boutique, hotel, jewelry
  'wedding':        'luxury-display',
  'bridal':         'luxury-display',
  'spa':            'luxury-display',
  'boutique':       'luxury-display',
  'hotel':          'luxury-display',
  'resort':         'luxury-display',
  'jewelry':        'luxury-display',
  'florist':        'luxury-display',
  'catering':       'luxury-display',
  'luxury':         'luxury-display',

  // Modern Geometric — general business, real estate, restaurant
  'real estate':    'modern-geometric',
  'realtor':        'modern-geometric',
  'property':       'modern-geometric',
  'restaurant':     'modern-geometric',
  'cafe':           'modern-geometric',
  'bakery':         'modern-geometric',
  'dentist':        'modern-geometric',
  'accounting':     'modern-geometric',
  'insurance':      'modern-geometric',
  'general':        'modern-geometric',

  // Tech Neutral — software, SaaS, tech, agency
  'software':       'tech-neutral',
  'saas':           'tech-neutral',
  'tech':           'tech-neutral',
  'agency':         'tech-neutral',
  'studio':         'tech-neutral',
  'startup':        'tech-neutral',
  'app':            'tech-neutral',
  'platform':       'tech-neutral',

  // Bold Nightlife — DJ, music, nightclub, event entertainment, automotive
  'dj':             'bold-nightlife',
  'music':          'bold-nightlife',
  'band':           'bold-nightlife',
  'nightclub':      'bold-nightlife',
  'bar':            'bold-nightlife',
  'entertainment':  'bold-nightlife',
  'event':          'bold-nightlife',
  'automotive':     'bold-nightlife',
  'garage':         'bold-nightlife',
  'gym':            'bold-nightlife',
  'fitness':        'bold-nightlife',
  'vinyl':          'bold-nightlife',
  'record':         'bold-nightlife',
};

const DEFAULT_PAIRING_ID = 'modern-geometric';

function getPairing(id) {
  return PAIRINGS.find(p => p.id === id) || PAIRINGS.find(p => p.id === DEFAULT_PAIRING_ID);
}

function allPairings() {
  return PAIRINGS.map(p => ({ ...p, googleUrl: buildGoogleFontsUrl(p) }));
}

function buildGoogleFontsUrl(pair) {
  const heading = encodeURIComponent(pair.heading).replace(/%20/g, '+');
  const body    = encodeURIComponent(pair.body).replace(/%20/g, '+');
  const hw = pair.weights?.heading || '400;600;700';
  const bw = pair.weights?.body    || '400;500;600;700';
  // &amp; form for safe HTML embedding
  return `https://fonts.googleapis.com/css2?family=${heading}:wght@${hw}&family=${body}:wght@${bw}&display=swap`;
}

/**
 * Pick a pairing for a given vertical string. Returns a pairing object
 * enriched with a precomputed googleUrl.
 *
 * @param {string|null|undefined} vertical free-form vertical/business type
 * @returns {object} pairing object
 */
function pickPairingForVertical(vertical) {
  const key = (vertical || '').toLowerCase().trim();
  if (!key) return enrich(getPairing(DEFAULT_PAIRING_ID));

  // Exact match first
  if (VERTICAL_MAP[key]) return enrich(getPairing(VERTICAL_MAP[key]));

  // Substring match — take the longest keyword that appears in the vertical
  let bestMatch = null;
  let bestLen = 0;
  for (const kw of Object.keys(VERTICAL_MAP)) {
    if (key.includes(kw) && kw.length > bestLen) {
      bestMatch = VERTICAL_MAP[kw];
      bestLen = kw.length;
    }
  }
  if (bestMatch) return enrich(getPairing(bestMatch));

  return enrich(getPairing(DEFAULT_PAIRING_ID));
}

function enrich(pair) {
  return { ...pair, googleUrl: buildGoogleFontsUrl(pair) };
}

/**
 * Produce a prompt-ready instruction block describing the pairing so
 * Claude includes the correct Google Fonts <link> tag and typography
 * tokens in the HTML it generates.
 */
function buildFontPromptContext(pair) {
  if (!pair) return '';
  return `
TYPOGRAPHY (font pairing: ${pair.name} — ${pair.personality}):
- Heading font: ${pair.heading}
- Body font:    ${pair.body}
- Include this exact <link> tag in <head>:
    <link href="${pair.googleUrl}" rel="stylesheet">
- CSS custom properties (add to :root):
    --font-heading: ${pair.fallback_heading};
    --font-body:    ${pair.fallback_body};
- Apply: headings (h1–h6) use var(--font-heading); body/default uses var(--font-body).
- Do NOT swap in a different font family — this pairing was chosen to match the vertical mood: ${pair.mood.join(', ')}.
`;
}

module.exports = {
  PAIRINGS,
  VERTICAL_MAP,
  DEFAULT_PAIRING_ID,
  getPairing,
  allPairings,
  pickPairingForVertical,
  buildFontPromptContext,
  buildGoogleFontsUrl,
};
