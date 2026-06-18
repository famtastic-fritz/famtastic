// Deterministic preview model. Given input, produce exactly what each platform
// would show, so the client can render faithful preview cards from one source.
import { normalizeInput, serpForms } from './metatags.js';
import { truncate, normalizeSpace } from './escape.js';

/**
 * Extract a clean display host from a URL (no protocol, no www, no trailing /).
 * @param {string} url
 * @returns {string}
 */
export function displayHost(url) {
  const s = normalizeSpace(url);
  try {
    const u = new URL(s);
    return u.host.replace(/^www\./, '');
  } catch {
    return s.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

/**
 * Build the per-platform preview model.
 * @param {import('./metatags.js').MetaInput} input
 */
export function buildPreview(input) {
  const m = normalizeInput(input);
  const host = displayHost(m.url);
  const serp = serpForms(m);
  const hasImage = !!m.imageUrl;

  return {
    host,
    hasImage,
    imageUrl: m.imageUrl,
    google: {
      title: serp.title || '(no title)',
      url: m.url || `https://${host}`,
      breadcrumb: m.url ? googleBreadcrumb(m.url) : host,
      description: serp.description || '(no description)',
    },
    twitter: {
      // Large image card shows domain over the image, then title.
      card: m.twitterCard,
      title: truncate(m.title, 70) || '(no title)',
      description: truncate(m.description, 125),
      host,
      handle: m.author,
      hasImage,
    },
    facebook: {
      // FB/LinkedIn large card: image, then UPPERCASE host, title, description.
      host: host.toUpperCase(),
      title: truncate(m.title, 88) || '(no title)',
      description: truncate(m.description, 110),
      siteName: m.siteName,
      hasImage,
    },
    slack: {
      siteName: m.siteName || host,
      title: truncate(m.title, 75) || '(no title)',
      description: truncate(m.description, 140),
      hasImage,
    },
    imessage: {
      // iMessage rich link: big image with host bar underneath.
      host,
      title: truncate(m.title, 60) || host,
      hasImage,
    },
  };
}

/**
 * Render Google's breadcrumb-style URL (host › segment › segment).
 * @param {string} url
 * @returns {string}
 */
export function googleBreadcrumb(url) {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, '');
    const parts = u.pathname.split('/').filter(Boolean).slice(0, 3);
    return [host, ...parts].join(' › ');
  } catch {
    return displayHost(url);
  }
}
