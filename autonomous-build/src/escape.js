// Pure string helpers used across the engine. No dependencies.

/**
 * Escape a string for safe use inside an HTML attribute value.
 * Handles the five characters that can break out of a double-quoted attribute
 * or inject markup.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Escape text destined for SVG/HTML text content. Same as attribute escaping
 * minus the quote handling is still safe to include, so we reuse escapeAttr.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeText(value) {
  return escapeAttr(value);
}

/**
 * Collapse whitespace and trim. Useful before measuring/truncating.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSpace(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * Truncate to a maximum length, appending an ellipsis if cut. Never cuts a word
 * in half when avoidable: backs up to the previous space if the cut lands
 * mid-word and a space exists within the last 12 chars.
 * @param {unknown} value
 * @param {number} max
 * @returns {string}
 */
export function truncate(value, max) {
  const s = normalizeSpace(value);
  if (s.length <= max) return s;
  let cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > max - 13) cut = cut.slice(0, lastSpace);
  return cut.replace(/[\s,;:.!-]+$/, '') + '…';
}

/**
 * Turn an arbitrary string into a URL-safe slug.
 * @param {unknown} value
 * @returns {string}
 */
export function slugify(value) {
  return normalizeSpace(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Normalize a Twitter/X handle to the `@name` form, or '' if empty/invalid.
 * Accepts "name", "@name", or a full x.com/twitter.com URL.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeHandle(value) {
  let s = normalizeSpace(value);
  if (!s) return '';
  const urlMatch = s.match(/(?:x\.com|twitter\.com)\/(@?[A-Za-z0-9_]{1,15})/i);
  if (urlMatch) s = urlMatch[1];
  s = s.replace(/^@+/, '');
  if (!/^[A-Za-z0-9_]{1,15}$/.test(s)) return '';
  return '@' + s;
}

/**
 * Best-effort absolute-URL detection. Returns true only for http(s) URLs with
 * a host.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isAbsoluteUrl(value) {
  const s = normalizeSpace(value);
  try {
    const u = new URL(s);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.host;
  } catch {
    return false;
  }
}
