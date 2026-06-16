// site-studio/server/validators.js
//
// Slice 2 Phase 1 Step 1 extraction. Pure-function validators with no I/O,
// no express coupling, and no shared mutable state. Behavior preserved
// verbatim from site-studio/server.js (originally at lines 284, 416, 10976).
//
// Do not add new behavior here without a separate refactor pass.

'use strict';

// Validates that a page name is safe (no traversal, alphanumeric + hyphens only)
function isValidPageName(name) {
  return /^[a-z0-9][a-z0-9._-]*\.html$/i.test(name) && !name.includes('..');
}

// SVG sanitizer — strips scripts, event handlers, javascript:/data: URIs,
// foreignObject, external use refs, framing tags, and dangerous CSS.
function sanitizeSvg(svgContent) {
  let clean = svgContent;
  clean = clean.replace(/<\s*script[\s\S]*?<\s*\/\s*script\s*>/gi, '');
  clean = clean.replace(/<\s*script[^>]*\/\s*>/gi, '');
  clean = clean.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  clean = clean.replace(/((?:href|src|xlink:href|poster|data|action|formaction)\s*=\s*)(?:"(?:javascript|data\s*:)[^"]*"|'(?:javascript|data\s*:)[^']*')/gi, '$1"#"');
  clean = clean.replace(/<\s*foreignObject[\s\S]*?<\s*\/\s*foreignObject\s*>/gi, '');
  clean = clean.replace(/<\s*use[^>]*(?:href|xlink:href)\s*=\s*(?:"https?:[^"]*"|'https?:[^']*')[^>]*\/?\s*>(?:<\s*\/\s*use\s*>)?/gi, '');
  clean = clean.replace(/<\s*(?:iframe|embed|object|applet|base|form)[\s\S]*?(?:<\s*\/\s*(?:iframe|embed|object|applet|base|form)\s*>|\/\s*>)/gi, '');
  clean = clean.replace(/style\s*=\s*"[^"]*(?:expression|javascript|url\s*\(\s*['"]?\s*javascript)[^"]*"/gi, 'style=""');
  clean = clean.replace(/style\s*=\s*'[^']*(?:expression|javascript|url\s*\(\s*['"]?\s*javascript)[^']*'/gi, "style=''");
  return clean;
}

// Validates HTML output from any agent call.
// Returns { valid, score, issues[] } where score is 0–100.
// Used for silent failure detection — score < 40 triggers a fallback or warning.
function validateAgentHtml(html, page) {
  const issues = [];
  let score = 100;

  if (!html || html.length < 500) {
    return { valid: false, score: 0, issues: ['Output too short — likely empty or error message'] };
  }

  if (!html.includes('<!DOCTYPE') && !html.includes('<html')) {
    issues.push('Missing DOCTYPE or <html> tag'); score -= 20;
  }

  const fieldIdCount = (html.match(/data-field-id=/g) || []).length;
  if (fieldIdCount === 0) {
    issues.push('No data-field-id attributes — surgical editing will fail'); score -= 25;
  } else if (fieldIdCount < 3) {
    issues.push(`Only ${fieldIdCount} data-field-id attribute(s) — too few for surgical editing`); score -= 10;
  }

  const sectionIdCount = (html.match(/data-section-id=/g) || []).length;
  if (sectionIdCount === 0) {
    issues.push('No data-section-id attributes — component tracking will fail'); score -= 15;
  }

  if (!html.includes('<nav') && !html.includes('<header')) {
    issues.push('No navigation element found'); score -= 10;
  }

  if (!html.includes('<section') && !html.includes('<main')) {
    issues.push('No <section> or <main> element found'); score -= 10;
  }

  const errPatterns = [/error:/i, /traceback/i, /exception:/i, /undefined is not/i, /cannot read property/i];
  for (const p of errPatterns) {
    if (p.test(html.substring(0, 1000))) { issues.push('Possible error output in HTML'); score -= 30; break; }
  }

  const minLength = page === 'index.html' ? 3000 : 1500;
  if (html.length < minLength) {
    issues.push(`HTML is ${html.length} chars (expected ≥ ${minLength} for ${page})`); score -= 15;
  }

  score = Math.max(0, score);
  const valid = score >= 40;
  return { valid, score, issues };
}

module.exports = {
  isValidPageName,
  sanitizeSvg,
  validateAgentHtml,
};
