// Builds a complete, correctly-typed meta tag block from user input.
import { escapeAttr, normalizeSpace, normalizeHandle, truncate } from './escape.js';

/**
 * @typedef {Object} MetaInput
 * @property {string} title        Page title
 * @property {string} description  Page/share description
 * @property {string} url          Canonical absolute URL
 * @property {string} siteName     Brand / site name
 * @property {string} imageUrl     Absolute URL of the share image (1200x630)
 * @property {string} [author]     Twitter/X handle (any form)
 * @property {string} [themeColor] Hex color for theme-color tag
 * @property {string} [type]       og:type — 'website' | 'article' (default website)
 * @property {string} [twitterCard] 'summary_large_image' | 'summary'
 * @property {string} [locale]     e.g. 'en_US'
 */

const DEFAULTS = {
  type: 'website',
  twitterCard: 'summary_large_image',
  locale: 'en_US',
  themeColor: '',
};

/**
 * Normalize raw input into a clean, defaulted model. Pure.
 * @param {MetaInput} input
 */
export function normalizeInput(input = {}) {
  const i = { ...DEFAULTS, ...input };
  const type = i.type === 'article' ? 'article' : 'website';
  const twitterCard =
    i.twitterCard === 'summary' ? 'summary' : 'summary_large_image';
  return {
    title: normalizeSpace(i.title),
    description: normalizeSpace(i.description),
    url: normalizeSpace(i.url),
    siteName: normalizeSpace(i.siteName),
    imageUrl: normalizeSpace(i.imageUrl),
    author: normalizeHandle(i.author),
    themeColor: normalizeSpace(i.themeColor),
    type,
    twitterCard,
    locale: normalizeSpace(i.locale) || 'en_US',
  };
}

/**
 * Build an ordered list of tag descriptors. Each is one of:
 *   { kind: 'title', text }
 *   { kind: 'meta', name|property, content }
 *   { kind: 'link', rel, href }
 * Empty-value tags are omitted, so the output is always valid.
 * @param {MetaInput} input
 * @returns {Array<object>}
 */
export function buildTagList(input) {
  const m = normalizeInput(input);
  const tags = [];

  if (m.title) tags.push({ kind: 'title', text: m.title });
  if (m.description)
    tags.push({ kind: 'meta', name: 'description', content: m.description });
  if (m.url) tags.push({ kind: 'link', rel: 'canonical', href: m.url });
  if (m.themeColor)
    tags.push({ kind: 'meta', name: 'theme-color', content: m.themeColor });

  // Open Graph
  if (m.type) tags.push({ kind: 'meta', property: 'og:type', content: m.type });
  if (m.title)
    tags.push({ kind: 'meta', property: 'og:title', content: m.title });
  if (m.description)
    tags.push({ kind: 'meta', property: 'og:description', content: m.description });
  if (m.url) tags.push({ kind: 'meta', property: 'og:url', content: m.url });
  if (m.siteName)
    tags.push({ kind: 'meta', property: 'og:site_name', content: m.siteName });
  if (m.locale)
    tags.push({ kind: 'meta', property: 'og:locale', content: m.locale });
  if (m.imageUrl) {
    tags.push({ kind: 'meta', property: 'og:image', content: m.imageUrl });
    tags.push({ kind: 'meta', property: 'og:image:width', content: '1200' });
    tags.push({ kind: 'meta', property: 'og:image:height', content: '630' });
    tags.push({
      kind: 'meta',
      property: 'og:image:alt',
      content: m.title || m.siteName || 'Share preview',
    });
  }

  // Twitter / X
  tags.push({ kind: 'meta', name: 'twitter:card', content: m.twitterCard });
  if (m.author) {
    tags.push({ kind: 'meta', name: 'twitter:site', content: m.author });
    tags.push({ kind: 'meta', name: 'twitter:creator', content: m.author });
  }
  if (m.title)
    tags.push({ kind: 'meta', name: 'twitter:title', content: m.title });
  if (m.description)
    tags.push({ kind: 'meta', name: 'twitter:description', content: m.description });
  if (m.imageUrl) {
    tags.push({ kind: 'meta', name: 'twitter:image', content: m.imageUrl });
    tags.push({
      kind: 'meta',
      name: 'twitter:image:alt',
      content: m.title || m.siteName || 'Share preview',
    });
  }

  return tags;
}

/**
 * Render a single tag descriptor to an HTML string.
 * @param {object} tag
 * @returns {string}
 */
export function renderTag(tag) {
  if (tag.kind === 'title') {
    return `<title>${escapeAttr(tag.text)}</title>`;
  }
  if (tag.kind === 'link') {
    return `<link rel="${escapeAttr(tag.rel)}" href="${escapeAttr(tag.href)}">`;
  }
  // meta
  const key = tag.property ? 'property' : 'name';
  const keyVal = tag.property || tag.name;
  return `<meta ${key}="${escapeAttr(keyVal)}" content="${escapeAttr(
    tag.content,
  )}">`;
}

/**
 * Build the full HTML `<head>` snippet (newline-joined) for the given input.
 * @param {MetaInput} input
 * @returns {string}
 */
export function buildMetaHtml(input) {
  return buildTagList(input).map(renderTag).join('\n');
}

/**
 * Google's title pixel budget is roughly 600px ~= 60 chars; description ~155.
 * Expose the truncated SERP forms for previews.
 * @param {MetaInput} input
 */
export function serpForms(input) {
  const m = normalizeInput(input);
  return {
    title: truncate(m.title, 60),
    description: truncate(m.description, 155),
  };
}
