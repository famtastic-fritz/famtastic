'use strict';

/*
 * FAMtastic Skeletons — Session 12 Phase 0
 *
 * Mandatory HTML skeletons Claude fills in. These are NOT instructions Claude
 * interprets — they are structures with fill-in placeholders. The BEM class
 * names match fam-hero.css exactly so the shipped stylesheet and the
 * generated HTML actually connect.
 *
 * Session 11 rebuilds of Groove Theory and Drop The Beat both failed the
 * vocabulary fidelity test: GT ignored the layered hero entirely, DTB
 * reinvented it with kebab-case class names (fam-hero-layer-bg) that don't
 * match the BEM selectors (fam-hero-layer--bg) in fam-hero.css. This module
 * closes that gap.
 */

const fs = require('fs');
const path = require('path');

const HERO_SKELETON = `
MANDATORY HERO STRUCTURE — DO NOT CHANGE CLASS NAMES — FILL IN CONTENT ONLY:

Every page hero section MUST use exactly this HTML structure.
Replace [PLACEHOLDER] values. Do not add, remove, or rename any class.
Do not write inline CSS for fam-hero-* classes — fam-hero.css handles all positioning.

<section class="fam-hero-layered" data-fam-bg="parallax">

  <!-- Layer 1: Background — inline style for brand color ONLY -->
  <div class="fam-hero-layer fam-hero-layer--bg"
       style="background: [BRAND_COLOR_OR_GRADIENT]"></div>

  <!-- Layer 2: Visual effect — do not add or remove fam-fx-lights -->
  <div class="fam-hero-layer fam-hero-layer--fx fam-fx-lights"></div>

  <!-- Layer 3: Character/image — always include, leave slot empty if no character -->
  <div class="fam-hero-layer fam-hero-layer--character">
    <img data-slot-id="hero-character"
         data-slot-role="character"
         data-slot-status="empty"
         src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
         alt="[CHARACTER_ALT_OR_EMPTY]"
         class="fam-bleed-bottom" />
  </div>

  <!-- Layer 4: Content — logo, headline, subhead, CTAs -->
  <div class="fam-hero-layer fam-hero-layer--content">
    <div class="logo-slot"
         data-slot-id="hero-logo"
         data-slot-role="logo"
         data-slot-status="empty">
      [LOGO_WORDMARK_TEXT_OR_SVG_HERE]
    </div>
    <h1 data-fam-animate="fade-up">[HEADLINE]</h1>
    <p data-fam-animate="fade-up" data-fam-delay="200">[SUBHEADLINE]</p>
    <div class="hero-ctas" data-fam-animate="fade-up" data-fam-delay="400">
      <a href="[CTA_URL]" class="btn-primary">[PRIMARY_CTA_TEXT]</a>
      <a href="[CTA2_URL]" class="btn-secondary">[SECONDARY_CTA_TEXT]</a>
    </div>
  </div>

</section>

CRITICAL RULES:
- fam-hero-layered, fam-hero-layer, fam-hero-layer--bg, fam-hero-layer--fx,
  fam-hero-layer--character, fam-hero-layer--content are EXACT BEM class names.
- Do NOT use: fam-hero-layer-bg, fam-hero-bg, hero-layer-bg, or any variant.
- Do NOT write z-index, position, or overflow as inline styles on these elements.
- fam-hero.css handles all layout. Your job is filling in brand colors and content.
`.trim();

const DIVIDER_SKELETON = `
MANDATORY SECTION DIVIDERS:

Insert exactly one of these between every major section. Minimum 2 per page.

<!-- Wave divider (default) -->
<div class="fam-wave-divider" aria-hidden="true"></div>

<!-- Diagonal divider (use for strong directional transitions) -->
<div class="fam-diagonal" aria-hidden="true"></div>

CRITICAL RULES:
- These class names are defined in fam-shapes.css. Use them exactly.
- Do NOT write custom SVG wave shapes inline.
- Do NOT use <hr> or border-top as section dividers.
- Every page must have at least 2 dividers.
`.trim();

const LOGO_SKELETON_TEMPLATE = `
LOGO OUTPUT — TEMPLATE CALL ONLY:

Output these three SVG blocks BEFORE the HTML. Use exact comment delimiters.
The server extracts and saves them as separate files, then strips the blocks
from the HTML before writing the template file.

<!-- LOGO_FULL -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
  [COMPLETE LOGO — wordmark + icon + decorative elements — use the brand colors from the design brief]
</svg>

<!-- LOGO_ICON -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  [ICON ONLY — symbol without wordmark text]
</svg>

<!-- LOGO_WORDMARK -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 80">
  [WORDMARK TEXT ONLY — no icon]
</svg>

AFTER the three SVG blocks, output the full HTML template document as normal.

NAV LOGO WIRING (MANDATORY):
In the header/nav of the template, the brand link MUST reference the full
logo file, not plain text. Use exactly this structure:

<a href="index.html" class="logo-link" data-logo-v>
  <img src="assets/logo-full.svg" alt="[BRAND_NAME]" class="h-10 w-auto">
</a>

Do NOT put the brand name as plain text inside .logo-link. The server has
already written assets/logo-full.svg for you — reference it.
`.trim();

const LOGO_NOTE_PAGE = `
LOGO NOTE: Do NOT output <!-- LOGO_FULL -->, <!-- LOGO_ICON -->, or
<!-- LOGO_WORDMARK --> SVG blocks on this page. The logo was generated in
the template call and written to assets/logo-full.svg, assets/logo-icon.svg,
and assets/logo-wordmark.svg. Reference the full logo in the nav via:
<a href="index.html" data-logo-v class="block"><img src="assets/logo-full.svg" alt="[BRAND_NAME]" class="h-10 w-auto"></a>
`.trim();

const NAV_SKELETON = `
MANDATORY NAV CLASS NAMES — DO NOT INVENT ALTERNATIVES:

The shared stylesheet uses these EXACT class names to control desktop/mobile
nav visibility. Using ANY other names means the CSS selectors will not match
and both navs will render simultaneously on screen.

REQUIRED class names (copy these exactly — no variants, no kebab-case swaps):
  .nav-links         — the <ul> containing desktop navigation links
  .nav-cta           — the desktop call-to-action button
  .nav-toggle-label  — the hamburger toggle button (visible only on mobile)
  .nav-mobile-menu   — the dropdown panel (visible only on mobile)
  #nav-toggle        — the hidden checkbox that drives the CSS-only toggle

REQUIRED CSS pattern in the shared <style> block:
  #nav-toggle { display: none; }
  .nav-toggle-label { display: none; }
  .nav-links { display: flex; }
  .nav-mobile-menu { display: none; }

  @media (max-width: 768px) {
    .nav-toggle-label { display: flex; }
    .nav-links, .nav-cta { display: none; }
    #nav-toggle:checked ~ header .nav-mobile-menu { display: flex; }
  }

CRITICAL RULES:
- Do NOT use: desktop-nav, mobile-nav, nav-desktop, nav-mobile, hamburger,
  menu-toggle, mobile-menu-toggle, or any variant not listed above.
- #nav-toggle (type="checkbox") MUST have display:none — a visible checkbox
  on screen is a regression.
- Both .nav-links (desktop) and .nav-mobile-menu (mobile) must be present in
  the HTML. Do NOT merge them into a single collapsible element.
`.trim();

const INLINE_STYLE_PROHIBITION = `
INLINE STYLE PROHIBITION:

These CSS files are loaded on every page. Do NOT replicate their rules as inline styles:
- fam-hero.css: handles all z-index, position, overflow on fam-hero-* elements
- fam-shapes.css: handles all styling for fam-wave-divider, fam-diagonal, fam-starburst
- fam-motion.js: handles all data-fam-animate transitions
- fam-scroll.js: handles all data-fam-scroll behaviors

ALLOWED inline styles:
- background or background-color on .fam-hero-layer--bg ONLY
- Brand-specific color values not available as CSS variables

If you are writing z-index, position:absolute, or overflow:visible
on any fam-hero-* element — STOP. The stylesheet already handles it.
`.trim();

/**
 * Extract the three FAMtastic logo SVG blocks from a Claude template response.
 * Writes each to dist/assets/logo-{full,icon,wordmark}.svg.
 * Returns { results, cleanedHtml } where cleanedHtml has the SVG blocks
 * stripped so the HTML template file does not start with <svg>.
 *
 * @param {string} responseText - raw template response from Claude
 * @param {string} distDir - absolute path to the site's dist directory
 * @returns {{results: Record<string,string>, cleanedHtml: string}}
 */
function extractLogoSVGs(responseText, distDir) {
  const results = {};
  const delimiters = ['LOGO_FULL', 'LOGO_ICON', 'LOGO_WORDMARK'];
  const assetsDir = path.join(distDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });

  for (const delimiter of delimiters) {
    const pattern = new RegExp(
      '<!--\\s*' + delimiter + '\\s*-->\\s*(<svg[\\s\\S]*?<\\/svg>)',
      'i'
    );
    const match = responseText.match(pattern);

    if (match) {
      const svgContent = match[1];
      const filename = delimiter.toLowerCase().replace('_', '-') + '.svg';
      const outputPath = path.join(assetsDir, filename);
      try {
        fs.writeFileSync(outputPath, svgContent, 'utf8');
        results[delimiter] = outputPath;
        console.log(`LOGO_EXTRACTED — ${filename} written (${svgContent.length} bytes)`);
      } catch (err) {
        console.error(`LOGO_EXTRACT_ERROR — ${filename}:`, err.message);
      }
    } else {
      console.warn(`LOGO_MISSING — ${delimiter} delimiter not found in template response`);
    }
  }

  // Strip ALL logo SVG blocks from the HTML so index.html does not start with <svg>.
  // Also strip any leading whitespace/newlines before <!DOCTYPE so the file
  // is a valid HTML document.
  let cleanedHtml = responseText
    .replace(/<!--\s*LOGO_FULL\s*-->[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--\s*LOGO_ICON\s*-->[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--\s*LOGO_WORDMARK\s*-->[\s\S]*?<\/svg>/gi, '')
    .replace(/^\s+/, '');

  return { results, cleanedHtml };
}

module.exports = {
  HERO_SKELETON,
  DIVIDER_SKELETON,
  LOGO_SKELETON_TEMPLATE,
  LOGO_NOTE_PAGE,
  NAV_SKELETON,
  INLINE_STYLE_PROHIBITION,
  extractLogoSVGs,
};
