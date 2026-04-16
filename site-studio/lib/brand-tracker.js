'use strict';

/**
 * brand-tracker.js — Extract and persist brand tokens after every build.
 * Detects color drift and flags it as an intelligence finding.
 */

const fs = require('fs');
const path = require('path');

function extractBrandTokens(stylesCSS, specJson = {}) {
  const tokens = {
    primary_color: null,
    accent_color: null,
    bg_color: null,
    heading_font: null,
    body_font: null,
    extracted_at: new Date().toISOString(),
    source: 'build',
  };

  if (stylesCSS) {
    const primaryMatch = stylesCSS.match(/--color-primary\s*:\s*([^;]+);/);
    if (primaryMatch) tokens.primary_color = primaryMatch[1].trim();

    const accentMatch = stylesCSS.match(/--color-accent\s*:\s*([^;]+);/);
    if (accentMatch) tokens.accent_color = accentMatch[1].trim();

    const bgMatch = stylesCSS.match(/--color-bg(?:-light)?\s*:\s*([^;]+);/);
    if (bgMatch) tokens.bg_color = bgMatch[1].trim();

    const headingFontMatch = stylesCSS.match(/--font-heading\s*:\s*['"]?([^'";,]+)['"]?/);
    if (headingFontMatch) tokens.heading_font = headingFontMatch[1].trim();

    const bodyFontMatch = stylesCSS.match(/--font-body\s*:\s*['"]?([^'";,]+)['"]?/);
    if (bodyFontMatch) tokens.body_font = bodyFontMatch[1].trim();
  }

  // Supplement from spec if CSS extraction was incomplete
  if (specJson.design_brief) {
    const db = specJson.design_brief;
    if (!tokens.primary_color && db.primary_color) tokens.primary_color = db.primary_color;
    if (!tokens.accent_color && db.accent_color) tokens.accent_color = db.accent_color;
    if (!tokens.heading_font && db.heading_font) tokens.heading_font = db.heading_font;
    if (!tokens.body_font && db.body_font) tokens.body_font = db.body_font;
  }

  return tokens;
}

function saveBrandTokens(siteDir, tokens) {
  const brandPath = path.join(siteDir, 'brand.json');
  fs.mkdirSync(siteDir, { recursive: true });
  fs.writeFileSync(brandPath, JSON.stringify(tokens, null, 2));
}

function loadBrandTokens(siteDir) {
  const brandPath = path.join(siteDir, 'brand.json');
  if (!fs.existsSync(brandPath)) return null;
  try { return JSON.parse(fs.readFileSync(brandPath, 'utf8')); } catch { return null; }
}

function detectDrift(previous, current) {
  if (!previous) return [];
  const drifts = [];
  const fields = ['primary_color', 'accent_color', 'bg_color', 'heading_font', 'body_font'];
  for (const field of fields) {
    if (previous[field] && current[field] && previous[field] !== current[field]) {
      drifts.push({ field, from: previous[field], to: current[field] });
    }
  }
  return drifts;
}

function extractAndSaveBrand(siteDir, distDir, specJson = {}) {
  const stylesPath = path.join(distDir, 'assets', 'styles.css');
  const stylesCSS = fs.existsSync(stylesPath) ? fs.readFileSync(stylesPath, 'utf8') : '';

  const previous = loadBrandTokens(siteDir);
  const current = extractBrandTokens(stylesCSS, specJson);
  const drifts = detectDrift(previous, current);

  saveBrandTokens(siteDir, current);

  if (drifts.length > 0) {
    console.warn('[brand-tracker] color/font drift detected:', drifts);
  }

  return { tokens: current, drifts };
}

module.exports = { extractAndSaveBrand, loadBrandTokens, extractBrandTokens, detectDrift };
