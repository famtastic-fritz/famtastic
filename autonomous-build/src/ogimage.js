// Generates a 1200x630 Open Graph share image as a self-contained SVG string.
// Deterministic, pure, zero-dependency. The client can rasterize to PNG via
// canvas; the SVG itself is directly usable as og:image on most platforms.
import { escapeText, normalizeSpace } from './escape.js';

const W = 1200;
const H = 630;

/** Clamp/validate a hex color, falling back to a default. */
export function safeColor(value, fallback = '#6d28d9') {
  const s = normalizeSpace(value);
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s;
  return fallback;
}

/**
 * Wrap text into lines that fit a target character budget per line.
 * Approximate (character-based) since we can't measure glyphs server-side,
 * tuned for the ~64px display size used below.
 * @param {string} text
 * @param {number} maxCharsPerLine
 * @param {number} maxLines
 * @returns {string[]}
 */
export function wrapText(text, maxCharsPerLine, maxLines) {
  const words = normalizeSpace(text).split(' ').filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? current + ' ' + word : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    } else {
      current = candidate;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  // If we ran out of room, ellipsize the last line.
  const used = words.join(' ');
  const shown = lines.join(' ');
  if (shown.length < used.length && lines.length) {
    let last = lines[lines.length - 1];
    if (last.length > maxCharsPerLine - 1) last = last.slice(0, maxCharsPerLine - 1);
    lines[lines.length - 1] = last.replace(/[\s.,;:!-]+$/, '') + '…';
  }
  return lines;
}

/** Derive a lighter accent from a base hex for the gradient stop. */
export function lighten(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  const r = Math.min(255, ((num >> 16) & 255) + 60);
  const g = Math.min(255, ((num >> 8) & 255) + 40);
  const b = Math.min(255, (num & 255) + 70);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate the OG image SVG.
 * @param {object} input
 * @param {string} input.title
 * @param {string} [input.siteName]
 * @param {string} [input.themeColor]
 * @param {string} [input.url]
 * @param {string} [input.eyebrow] optional small label above the title
 * @param {string|false} [input.watermark] watermark text, or false to hide it.
 *        Defaults to 'made with MetaMint' (free-tier behavior).
 * @returns {string} SVG markup (1200x630)
 */
export function generateOgImageSvg(input = {}) {
  const base = safeColor(input.themeColor);
  const accent = lighten(base);
  const title = input.title || 'Your headline goes here';
  const siteName = input.siteName || '';
  const eyebrow = input.eyebrow || (input.url ? hostOf(input.url) : '');
  // Watermark: explicit false hides it; undefined keeps the free-tier default.
  const watermark = input.watermark === false ? '' : (input.watermark || 'made with MetaMint');

  const titleLines = wrapText(title, 24, 4);
  const lineHeight = 86;
  const blockHeight = titleLines.length * lineHeight;
  const startY = H / 2 - blockHeight / 2 + 64;

  const titleTspans = titleLines
    .map(
      (line, idx) =>
        `<tspan x="90" y="${startY + idx * lineHeight}">${escapeText(line)}</tspan>`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeText(
    title,
  )}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${base}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <circle cx="1080" cy="120" r="220" fill="#ffffff" opacity="0.06"/>
  <circle cx="1140" cy="560" r="160" fill="#000000" opacity="0.08"/>
  <rect x="90" y="${startY - 116}" width="64" height="8" rx="4" fill="#ffffff" opacity="0.9"/>
  ${
    eyebrow
      ? `<text x="90" y="${startY - 70}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="30" letter-spacing="2" fill="#ffffff" opacity="0.85" font-weight="600">${escapeText(
          eyebrow.toUpperCase(),
        )}</text>`
      : ''
  }
  <text font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="72" font-weight="800" fill="#ffffff">${titleTspans}</text>
  ${
    siteName
      ? `<text x="90" y="560" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="32" fill="#ffffff" opacity="0.9" font-weight="600">${escapeText(
          siteName,
        )}</text>`
      : ''
  }
  ${
    watermark
      ? `<text x="${W - 90}" y="560" text-anchor="end" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="26" fill="#ffffff" opacity="0.7">${escapeText(
          watermark,
        )}</text>`
      : ''
  }
</svg>`;
}

/** Extract a clean host from a URL for the eyebrow label. */
function hostOf(url) {
  try {
    return new URL(normalizeSpace(url)).host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Build a data: URI for the SVG (base64) for direct <img> embedding. */
export function svgDataUri(svg) {
  const b64 = Buffer.from(svg, 'utf8').toString('base64');
  return `data:image/svg+xml;base64,${b64}`;
}

export const OG_WIDTH = W;
export const OG_HEIGHT = H;
