// Fork 3, made real and pluggable: "paste a URL, read its existing tags".
// The PARSER is pure and dependency-free (tested against static HTML). The
// FETCH wrapper is gated by config.urlCrawl and isolated so it can be swapped
// for a proxy/queue later without touching the parser.
import { normalizeSpace } from './escape.js';

/**
 * Extract the social-relevant meta from a raw HTML string. Pure, no network.
 * Regex-based (good enough for <head> meta); not a full HTML parser.
 * @param {string} html
 * @returns {{title:string, description:string, url:string, siteName:string,
 *            imageUrl:string, author:string, type:string, twitterCard:string}}
 */
export function parseMetaFromHtml(html = '') {
  const out = {
    title: '', description: '', url: '', siteName: '',
    imageUrl: '', author: '', type: '', twitterCard: '',
  };
  const src = String(html);

  const titleTag = src.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleTag) out.title = decodeEntities(normalizeSpace(titleTag[1]));

  const canonical = src.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
  if (canonical) {
    const href = canonical[0].match(/href=["']([^"']+)["']/i);
    if (href) out.url = href[1].trim();
  }

  // Walk every <meta> tag and map the ones we care about.
  const metaRe = /<meta\b[^>]*>/gi;
  let m;
  while ((m = metaRe.exec(src))) {
    const tag = m[0];
    const key = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase();
    const content = attr(tag, 'content');
    if (!key || content == null) continue;
    const val = decodeEntities(normalizeSpace(content));
    switch (key) {
      case 'description':
      case 'og:description':
        if (!out.description) out.description = val; break;
      case 'og:title':
        if (!out.title) out.title = val; break;
      case 'og:url':
        if (!out.url) out.url = val; break;
      case 'og:site_name':
        out.siteName = val; break;
      case 'og:image':
      case 'og:image:url':
        if (!out.imageUrl) out.imageUrl = val; break;
      case 'og:type':
        out.type = val; break;
      case 'twitter:card':
        out.twitterCard = val; break;
      case 'twitter:site':
      case 'twitter:creator':
        if (!out.author) out.author = val; break;
      case 'twitter:image':
        if (!out.imageUrl) out.imageUrl = val; break;
      default: break;
    }
  }
  return out;
}

/** Read one attribute value from a single tag string. */
function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? m[1] : null;
}

/** Decode the handful of HTML entities likely to appear in meta content. */
export function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'");
}

/**
 * Fetch a URL and parse its meta. Gated: throws unless the feature is enabled.
 * Uses the global fetch (Node 18+/browser). Network errors are surfaced.
 * @param {string} url
 * @param {object} opts
 * @param {boolean} opts.enabled  config.urlCrawl
 * @param {number} [opts.timeoutMs]
 * @param {typeof fetch} [opts.fetchImpl] inject for tests
 */
export async function crawlUrl(url, opts = {}) {
  if (!opts.enabled) {
    const err = new Error('URL crawl is disabled (set config.urlCrawl = true to enable).');
    err.code = 'FEATURE_DISABLED';
    throw err;
  }
  let parsed;
  try {
    parsed = new URL(normalizeSpace(url));
  } catch {
    const err = new Error('Provide an absolute http(s) URL to crawl.');
    err.code = 'BAD_URL';
    throw err;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    const err = new Error('Only http(s) URLs can be crawled.');
    err.code = 'BAD_URL';
    throw err;
  }
  const fetchImpl = opts.fetchImpl || globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 8000);
  try {
    const res = await fetchImpl(parsed.href, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MetaMintBot/1.0 (+https://metamint.app)' },
      redirect: 'follow',
    });
    const html = await res.text();
    return { source: parsed.href, status: res.status, meta: parseMetaFromHtml(html) };
  } finally {
    clearTimeout(timer);
  }
}
