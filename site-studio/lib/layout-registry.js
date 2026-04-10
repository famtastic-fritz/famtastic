/**
 * layout-registry.js — FAMtastic layout variation intelligence
 *
 * Defines five hero/page layout variants so Claude can pick a
 * differentiated layout per site instead of always defaulting to the
 * same centered-hero-with-subhead template. The Studio server uses
 * `pickLayoutVariantForVertical()` + `pickLayoutVariantForSpec()` at
 * build time to resolve a default variant, which is then injected
 * into the build prompt so Claude generates hero markup matching that
 * variant's skeleton.
 *
 * Each variant includes:
 *   - id            stable key used in spec.layout.variant
 *   - name          human-readable label
 *   - description   short summary of the visual shape
 *   - hero_shape    concrete description of the hero section
 *   - grid          CSS grid/flex shape used in the hero
 *   - logo_role     how the logo participates (nav|centered|dominant|layered|split)
 *   - best_for      verticals / moods this variant is well-suited to
 *   - skeleton      prompt-ready skeleton instruction (Claude copies the structure)
 *
 * The vertical mapping is a loose substring map — the server normalizes
 * the vertical string and looks for substring matches before falling
 * back to the default variant ("standard").
 */

'use strict';

const LAYOUT_VARIANTS = [
  {
    id: 'standard',
    name: 'Standard Hero',
    description: 'Classic centered hero: logo in nav, H1 + subhead + CTA stacked on a solid or subtly-textured background.',
    hero_shape: 'Centered text column (max-w-4xl), H1 on top, subhead beneath, CTA button below. Single background layer.',
    grid: 'flex flex-col items-center justify-center text-center',
    logo_role: 'nav',
    best_for: ['general business', 'service', 'consultant', 'professional', 'law', 'medical'],
    skeleton: `HERO SKELETON (standard):
<section class="relative min-h-[70vh] flex items-center justify-center py-24 px-6 bg-[var(--color-bg)]">
  <div class="max-w-4xl mx-auto text-center">
    <h1 class="text-5xl md:text-7xl font-bold text-[var(--color-primary)]">{{HEADLINE}}</h1>
    <p class="mt-6 text-xl md:text-2xl text-[var(--color-primary)]/80">{{SUBHEAD}}</p>
    <a href="#contact" class="inline-block mt-10 px-8 py-4 bg-[var(--color-accent)] text-white font-semibold rounded-lg">{{CTA}}</a>
  </div>
</section>`,
  },
  {
    id: 'centered_hero',
    name: 'Centered Hero (Editorial)',
    description: 'Oversized editorial headline, centered, with a tagline above and a small CTA below. Magazine-style.',
    hero_shape: 'Large display H1 (text-6xl to text-9xl), small pre-title tag above, subtle CTA below. Generous vertical whitespace.',
    grid: 'flex flex-col items-center justify-center text-center',
    logo_role: 'nav',
    best_for: ['editorial', 'writer', 'author', 'publisher', 'magazine', 'luxury', 'boutique'],
    skeleton: `HERO SKELETON (centered_hero — editorial):
<section class="relative min-h-[85vh] flex items-center justify-center py-32 px-6">
  <div class="max-w-5xl mx-auto text-center">
    <p class="uppercase tracking-[0.3em] text-sm text-[var(--color-accent)] mb-6">{{PRE_TITLE}}</p>
    <h1 class="text-6xl md:text-8xl lg:text-9xl font-serif font-bold leading-[0.95] text-[var(--color-primary)]">{{HEADLINE}}</h1>
    <p class="mt-10 text-lg md:text-xl max-w-2xl mx-auto text-[var(--color-primary)]/70">{{SUBHEAD}}</p>
    <a href="#contact" class="inline-block mt-12 text-sm uppercase tracking-widest border-b-2 border-[var(--color-accent)] pb-1">{{CTA}}</a>
  </div>
</section>`,
  },
  {
    id: 'logo_dominant',
    name: 'Logo Dominant',
    description: 'Logo is the hero itself — large, centered, above the fold. Headline acts as a caption below the logo.',
    hero_shape: 'Giant centered logo (SVG or large image, 240–400px wide). Small headline caption beneath. Minimal text.',
    grid: 'flex flex-col items-center justify-center text-center',
    logo_role: 'dominant',
    best_for: ['brand-forward', 'boutique', 'jewelry', 'record', 'vinyl', 'coffee', 'bar', 'restaurant', 'studio'],
    skeleton: `HERO SKELETON (logo_dominant):
<section class="relative min-h-[80vh] flex items-center justify-center py-24 px-6 bg-[var(--color-bg)]">
  <div class="max-w-3xl mx-auto text-center">
    <div class="logo-hero mx-auto mb-8" style="max-width: 360px;">
      {{LOGO_FULL_SVG_OR_IMG}}
    </div>
    <h1 class="text-3xl md:text-4xl font-bold text-[var(--color-primary)]">{{HEADLINE_CAPTION}}</h1>
    <p class="mt-4 text-lg text-[var(--color-primary)]/70">{{SUBHEAD}}</p>
    <a href="#contact" class="inline-block mt-8 px-8 py-4 bg-[var(--color-accent)] text-white font-semibold rounded-full">{{CTA}}</a>
  </div>
</section>`,
  },
  {
    id: 'layered',
    name: 'Layered Hero',
    description: 'Multi-layer hero with a full-bleed background image/gradient, decorative shape overlays, and the headline floating above.',
    hero_shape: 'Full-bleed hero with 3+ z-index layers: background image, shape overlay (blob/wave/mesh), headline content. Fam-hero.css utilities.',
    grid: 'relative min-h-screen overflow-hidden',
    logo_role: 'layered',
    best_for: ['dj', 'music', 'nightclub', 'event', 'entertainment', 'bold', 'nightlife', 'automotive'],
    skeleton: `HERO SKELETON (layered):
<section class="fam-hero fam-hero-bleed relative min-h-screen flex items-center overflow-hidden">
  <!-- Layer 1: background -->
  <div class="fam-hero-layer fam-hero-layer-bg absolute inset-0" style="background: linear-gradient(135deg, var(--color-primary), var(--color-accent));"></div>
  <!-- Layer 2: shape overlay (blob/wave) -->
  <div class="fam-hero-layer fam-hero-layer-shape absolute inset-0 pointer-events-none">
    <div class="fam-blob fam-blob-1"></div>
    <div class="fam-wave-bg"></div>
  </div>
  <!-- Layer 3: sparkle/light effects -->
  <div class="fam-hero-layer fam-hero-layer-fx absolute inset-0 pointer-events-none fam-hero-sparkle"></div>
  <!-- Layer 4: content -->
  <div class="fam-hero-layer fam-hero-layer-content relative z-10 max-w-6xl mx-auto px-6 py-24">
    <h1 class="text-6xl md:text-8xl font-black text-white leading-none" data-fam-animate="fade-up">{{HEADLINE}}</h1>
    <p class="mt-8 text-xl md:text-2xl text-white/90 max-w-2xl" data-fam-animate="fade-up" data-fam-delay="200">{{SUBHEAD}}</p>
    <a href="#contact" class="inline-block mt-12 px-10 py-5 bg-white text-[var(--color-primary)] font-bold uppercase tracking-wider rounded-full" data-fam-animate="fade-up" data-fam-delay="400">{{CTA}}</a>
  </div>
</section>`,
  },
  {
    id: 'split_screen',
    name: 'Split Screen',
    description: 'Two-column hero: text on one side, image/visual on the other. 50/50 desktop, stacked mobile.',
    hero_shape: 'Two-column grid (lg:grid-cols-2). Left: headline + subhead + CTA. Right: hero image slot or decorative visual. Full viewport height.',
    grid: 'grid lg:grid-cols-2 min-h-screen',
    logo_role: 'nav',
    best_for: ['real estate', 'saas', 'tech', 'software', 'startup', 'agency', 'spa', 'wedding', 'hotel'],
    skeleton: `HERO SKELETON (split_screen):
<section class="relative min-h-screen grid lg:grid-cols-2">
  <!-- Text column -->
  <div class="flex items-center px-8 md:px-16 py-24 bg-[var(--color-bg)]">
    <div class="max-w-xl">
      <h1 class="text-5xl md:text-7xl font-bold text-[var(--color-primary)] leading-tight">{{HEADLINE}}</h1>
      <p class="mt-6 text-xl text-[var(--color-primary)]/80">{{SUBHEAD}}</p>
      <a href="#contact" class="inline-block mt-10 px-8 py-4 bg-[var(--color-accent)] text-white font-semibold rounded-lg">{{CTA}}</a>
    </div>
  </div>
  <!-- Visual column -->
  <div class="relative bg-[var(--color-primary)] flex items-center justify-center overflow-hidden">
    <img data-slot-id="hero-1" data-slot-status="empty" data-slot-role="hero"
         src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
         alt="Hero visual" class="absolute inset-0 w-full h-full object-cover">
  </div>
</section>`,
  },
];

// Loose keyword map — lowercased vertical fragments → variant id.
const VERTICAL_LAYOUT_MAP = {
  // logo_dominant — brand-forward verticals where the logo IS the brand
  'vinyl':       'logo_dominant',
  'record':      'logo_dominant',
  'jewelry':     'logo_dominant',
  'coffee':      'logo_dominant',
  'boutique':    'logo_dominant',
  'gallery':     'logo_dominant',

  // layered — bold, high-energy verticals
  'dj':            'layered',
  'music':         'layered',
  'band':          'layered',
  'nightclub':     'layered',
  'entertainment': 'layered',
  'event':         'layered',
  'nightlife':     'layered',
  'automotive':    'layered',
  'garage':        'layered',

  // centered_hero — editorial, luxury, timeless
  'writer':     'centered_hero',
  'author':     'centered_hero',
  'publisher':  'centered_hero',
  'magazine':   'centered_hero',
  'luxury':     'centered_hero',
  'wedding':    'centered_hero',
  'bridal':     'centered_hero',

  // split_screen — product + visual pairings
  'real estate': 'split_screen',
  'realtor':     'split_screen',
  'property':    'split_screen',
  'saas':        'split_screen',
  'software':    'split_screen',
  'tech':        'split_screen',
  'startup':     'split_screen',
  'agency':      'split_screen',
  'spa':         'split_screen',
  'hotel':       'split_screen',
  'resort':      'split_screen',

  // standard — the rest fall through to default
  'consultant':  'standard',
  'lawyer':      'standard',
  'legal':       'standard',
  'medical':     'standard',
  'doctor':      'standard',
  'accounting':  'standard',
  'insurance':   'standard',
  'general':     'standard',
};

const DEFAULT_VARIANT_ID = 'standard';

function getVariant(id) {
  return LAYOUT_VARIANTS.find(v => v.id === id) || LAYOUT_VARIANTS.find(v => v.id === DEFAULT_VARIANT_ID);
}

function allVariants() {
  return LAYOUT_VARIANTS.slice();
}

/**
 * Pick a layout variant for a given vertical string.
 * @param {string|null|undefined} vertical
 * @returns {object} variant object
 */
function pickLayoutVariantForVertical(vertical) {
  const key = (vertical || '').toLowerCase().trim();
  if (!key) return getVariant(DEFAULT_VARIANT_ID);

  if (VERTICAL_LAYOUT_MAP[key]) return getVariant(VERTICAL_LAYOUT_MAP[key]);

  // Longest substring match
  let bestMatch = null;
  let bestLen = 0;
  for (const kw of Object.keys(VERTICAL_LAYOUT_MAP)) {
    if (key.includes(kw) && kw.length > bestLen) {
      bestMatch = VERTICAL_LAYOUT_MAP[kw];
      bestLen = kw.length;
    }
  }
  if (bestMatch) return getVariant(bestMatch);

  return getVariant(DEFAULT_VARIANT_ID);
}

/**
 * Pick a layout variant from a full spec object. Honors an explicit
 * spec.layout.variant override if present, otherwise falls back to
 * vertical-based resolution.
 */
function pickLayoutVariantForSpec(spec) {
  if (!spec || typeof spec !== 'object') return getVariant(DEFAULT_VARIANT_ID);
  const explicit = spec?.layout?.variant;
  if (explicit) {
    const hit = LAYOUT_VARIANTS.find(v => v.id === explicit);
    if (hit) return hit;
  }
  const vertical = spec.business_type || spec.vertical || spec.design_brief?.business_type || '';
  return pickLayoutVariantForVertical(vertical);
}

/**
 * Build a prompt-ready instruction block describing the chosen variant
 * so Claude generates hero markup matching that skeleton. The output
 * is concatenated into systemRules / briefContext at build time.
 */
function buildLayoutPromptContext(variant) {
  if (!variant) return '';
  return `
LAYOUT VARIANT (hero shape — ${variant.name}):
- Description: ${variant.description}
- Hero shape: ${variant.hero_shape}
- Logo role: ${variant.logo_role}
- Best for: ${variant.best_for.join(', ')}

${variant.skeleton}

IMPORTANT: Use this skeleton as the STRUCTURE of the hero section. Replace
{{HEADLINE}}, {{SUBHEAD}}, {{CTA}}, {{PRE_TITLE}}, {{HEADLINE_CAPTION}}, and
{{LOGO_FULL_SVG_OR_IMG}} with real content drawn from the site spec and
client brief. Do NOT fall back to a generic centered hero unless this
variant IS "standard". The whole point of layout variation is for each
site to feel distinct — commit to the variant.
`.trim();
}

module.exports = {
  LAYOUT_VARIANTS,
  VERTICAL_LAYOUT_MAP,
  DEFAULT_VARIANT_ID,
  getVariant,
  allVariants,
  pickLayoutVariantForVertical,
  pickLayoutVariantForSpec,
  buildLayoutPromptContext,
};
