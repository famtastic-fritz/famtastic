'use strict';

/**
 * surgical-editor.js — DOM-aware surgical HTML editor
 *
 * Purpose: reduce per-edit token cost by ~90% by sending only the targeted
 * section to Claude instead of the full HTML file (600-1,200 lines → 80-150 tokens).
 *
 * Three exports:
 *   buildStructuralIndex(html, page) → index object, stored in spec.structural_index[page]
 *   extractSection(html, selector)   → outer HTML of targeted node only
 *   surgicalEdit(html, selector, newContent) → full HTML with only the targeted node replaced
 *
 * All functions are pure (no side effects, no file I/O) — callers own persistence.
 */

const cheerio = require('cheerio');

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a stable CSS selector for a cheerio element.
 * Prefers: id > data-slot-id > data-section-id > data-fam-section > class chain.
 */
function getSelectorFor($el) {
  const id = $el.attr('id');
  if (id) return `#${CSS.escape ? CSS.escape(id) : id}`;

  const slotId = $el.attr('data-slot-id');
  if (slotId) return `[data-slot-id="${slotId}"]`;

  const sectionId = $el.attr('data-section-id');
  if (sectionId) return `[data-section-id="${sectionId}"]`;

  const famSection = $el.attr('data-fam-section');
  if (famSection) return `[data-fam-section="${famSection}"]`;

  const fieldId = $el.attr('data-field-id');
  if (fieldId) return `[data-field-id="${fieldId}"]`;

  // Fall back to tag + first class
  const tag = $el.prop('tagName') ? $el.prop('tagName').toLowerCase() : 'div';
  const cls = ($el.attr('class') || '').split(/\s+/).filter(Boolean)[0];
  return cls ? `${tag}.${cls}` : tag;
}

/**
 * Infer a human-readable role from element attributes and tag.
 */
function inferRole($el) {
  const role = $el.attr('data-role') || $el.attr('data-slot-role') || $el.attr('aria-label');
  if (role) return role;

  const sectionId = $el.attr('data-section-id');
  if (sectionId) return sectionId;

  const cls = $el.attr('class') || '';
  // Extract semantic FAMtastic class names
  const famMatch = cls.match(/\bfam-[a-z-]+\b/);
  if (famMatch) return famMatch[0];

  const tag = $el.prop('tagName') ? $el.prop('tagName').toLowerCase() : 'unknown';
  const id = $el.attr('id');
  return id ? `${tag}#${id}` : tag;
}

// ─────────────────────────────────────────────────────────────────────────────
// public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a structural index of an HTML page.
 * Scans for: sections with data-section-id, data-fam-section, fam-* classes,
 * elements with data-field-id, and elements with data-slot-id.
 *
 * Returns a lightweight descriptor stored in spec.structural_index[page].
 * Used to route surgical edits without loading the full HTML file.
 *
 * @param {string} html   Full HTML string of the page
 * @param {string} page   Page filename (e.g. 'index.html')
 * @returns {{ page, sections: Array, fields: Array, slots: Array, built_at: number }}
 */
function buildStructuralIndex(html, page) {
  if (!html || typeof html !== 'string') {
    return { page, sections: [], fields: [], slots: [], built_at: Date.now() };
  }

  const $ = cheerio.load(html);
  const sections = [];
  const fields = [];
  const slots = [];

  // Sections: any element with a structural landmark attribute or fam- class
  $('[data-section-id], [data-fam-section], section, main > div').each((i, el) => {
    const $el = $(el);
    // Skip deeply nested — only top-level sections
    const parentSection = $el.parents('[data-section-id], [data-fam-section], section').length;
    if (parentSection > 0) return;

    const innerHtml = $el.html() || '';
    const tokenEstimate = Math.ceil(innerHtml.length / 4);
    if (tokenEstimate < 10) return; // skip trivially small nodes

    sections.push({
      selector: getSelectorFor($el),
      role: inferRole($el),
      token_estimate: tokenEstimate,
      text_preview: ($el.text() || '').replace(/\s+/g, ' ').trim().slice(0, 80),
    });
  });

  // Named content fields
  $('[data-field-id]').each((i, el) => {
    const $el = $(el);
    fields.push({
      selector: `[data-field-id="${$el.attr('data-field-id')}"]`,
      field_id: $el.attr('data-field-id'),
      tag: ($el.prop('tagName') || 'div').toLowerCase(),
      text_preview: ($el.text() || '').replace(/\s+/g, ' ').trim().slice(0, 60),
    });
  });

  // Image slots
  $('[data-slot-id]').each((i, el) => {
    const $el = $(el);
    slots.push({
      selector: `[data-slot-id="${$el.attr('data-slot-id')}"]`,
      slot_id: $el.attr('data-slot-id'),
      role: $el.attr('data-slot-role') || 'unknown',
      status: $el.attr('data-slot-status') || 'empty',
    });
  });

  return {
    page,
    sections,
    fields,
    slots,
    built_at: Date.now(),
  };
}

/**
 * Extract only the targeted section's HTML.
 * Reduces Claude's context cost from ~800 tokens (full page) to ~80-150 tokens.
 *
 * @param {string} html      Full HTML string
 * @param {string} selector  CSS selector for the target node
 * @returns {string}         Outer HTML of the matched element
 * @throws {Error}           If the selector does not match
 */
function extractSection(html, selector) {
  if (!html || !selector) throw new Error('html and selector are required');
  const $ = cheerio.load(html);
  const target = $(selector);
  if (!target.length) throw new Error(`Selector not found: ${selector}`);
  return $.html(target.first());
}

/**
 * Perform a surgical DOM edit — replace only the targeted node's content.
 * Does NOT touch any surrounding nodes.
 *
 * @param {string} html          Full HTML string
 * @param {string} selector      CSS selector for the target node
 * @param {string} newContent    New inner HTML to set on the matched element
 * @returns {string}             Full HTML with only the targeted node updated
 * @throws {Error}               If the selector does not match
 */
function surgicalEdit(html, selector, newContent) {
  if (!html || !selector) throw new Error('html and selector are required');
  const $ = cheerio.load(html);
  const target = $(selector);
  if (!target.length) throw new Error(`Selector not found: ${selector}`);
  target.first().html(newContent);
  return $.html();
}

/**
 * Attempt a surgical edit; fall back to returning null on selector miss.
 * Callers should treat null as "fall back to full-page Claude generation."
 *
 * @param {string} html
 * @param {string} selector
 * @param {string} newContent
 * @returns {string|null}
 */
function trySurgicalEdit(html, selector, newContent) {
  try {
    return surgicalEdit(html, selector, newContent);
  } catch (e) {
    console.warn(`[surgical-editor] miss on selector "${selector}" — fallback to full-page: ${e.message}`);
    return null;
  }
}

module.exports = {
  buildStructuralIndex,
  extractSection,
  surgicalEdit,
  trySurgicalEdit,
};
